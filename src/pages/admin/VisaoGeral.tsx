import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, UserCheck, FileText, Video, MessageSquare, Building2, HelpCircle } from 'lucide-react';

interface KPIData {
  // Users
  totalUsers: number;
  usersB2C: number;
  usersB2B: number;
  // Content
  totalContent: number;
  contentB2C: number;
  contentB2B: number;
  // Videos
  totalVideos: number;
  videosB2C: number;
  videosB2B: number;
  // Fala Agronomo
  totalConversations: number;
  openConversations: number;
  totalMessages: number;
  // Partners
  totalPartners: number;
  partnersWithAdmin: number;
  partnersWithProducers: number;
}

export default function VisaoGeral() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!user) return;
      
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'system_admin'
      });
      
      if (!data) {
        navigate('/');
        return;
      }
      
      setIsSystemAdmin(true);
      console.log('admin: Visão Geral opened');
      loadKPIs();
    }
    
    checkAccess();
  }, [user, navigate]);

  async function loadKPIs() {
    setLoading(true);
    try {
      // Fetch all KPIs in parallel
      const [
        profilesResult,
        contentResult,
        videosResult,
        conversationsResult,
        messagesResult,
        partnersResult,
        partnersWithAdminResult,
        partnersWithProducersResult
      ] = await Promise.all([
        // Users - count by origin
        supabase.from('profiles').select('id, partner_id', { count: 'exact' }),
        // Content - count active by partner_id
        supabase.from('agro_content').select('id, partner_id', { count: 'exact' }).eq('is_active', true),
        // Videos - count active by partner_id
        supabase.from('agro_video').select('id, partner_id', { count: 'exact' }).eq('is_active', true),
        // Conversations - count total and open
        supabase.from('fala_agronomo_conversation').select('id, status', { count: 'exact' }),
        // Messages - count total
        supabase.from('fala_agronomo_message').select('id', { count: 'exact' }),
        // Partners - count total
        supabase.from('partners').select('id', { count: 'exact' }),
        // Partners with at least one admin
        supabase.from('profiles').select('partner_id').not('partner_id', 'is', null),
        // For producers count per partner
        supabase.from('user_roles').select('user_id').eq('role', 'partner_admin')
      ]);

      const profiles = profilesResult.data || [];
      const content = contentResult.data || [];
      const videos = videosResult.data || [];
      const conversations = conversationsResult.data || [];
      const partnersData = partnersResult.data || [];
      const profilesWithPartner = partnersWithAdminResult.data || [];
      const partnerAdmins = partnersWithProducersResult.data || [];

      // Calculate KPIs
      const usersB2B = profiles.filter(p => p.partner_id !== null).length;
      const usersB2C = profiles.length - usersB2B;

      const contentB2B = content.filter(c => c.partner_id !== null).length;
      const contentB2C = content.length - contentB2B;

      const videosB2B = videos.filter(v => v.partner_id !== null).length;
      const videosB2C = videos.length - videosB2B;

      const openConversations = conversations.filter(c => c.status === 'open').length;

      // Get unique partner_ids that have users
      const uniquePartnerIds = [...new Set(profilesWithPartner.map(p => p.partner_id))];

      setKpis({
        totalUsers: profiles.length,
        usersB2C,
        usersB2B,
        totalContent: content.length,
        contentB2C,
        contentB2B,
        totalVideos: videos.length,
        videosB2C,
        videosB2B,
        totalConversations: conversations.length,
        openConversations,
        totalMessages: messagesResult.count || 0,
        totalPartners: partnersData.length,
        partnersWithAdmin: partnerAdmins.length,
        partnersWithProducers: uniquePartnerIds.length
      });
    } catch (error) {
      console.error('admin: Error loading KPIs', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isSystemAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Visão Geral</h1>
        <p className="text-muted-foreground">Indicadores-chave do produto</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 - Usuários */}
        <KPICard
          title="Usuários Cadastrados"
          icon={<Users className="h-5 w-5" />}
          tooltip="Total de usuários cadastrados na plataforma"
          loading={loading}
        >
          {kpis && (
            <div className="space-y-2">
              <div className="text-3xl font-bold">{kpis.totalUsers}</div>
              <div className="text-sm text-muted-foreground">
                B2C: {kpis.usersB2C} | B2B: {kpis.usersB2B}
              </div>
            </div>
          )}
        </KPICard>

        {/* Card 2 - Distribuição B2C x B2B */}
        <KPICard
          title="Produtores B2C / B2B"
          icon={<UserCheck className="h-5 w-5" />}
          tooltip="Distribuição de produtores entre canais diretos (B2C) e parceiros (B2B)"
          loading={loading}
        >
          {kpis && (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{kpis.usersB2C}</span>
                <span className="text-muted-foreground">B2C</span>
                <span className="text-xl text-muted-foreground mx-2">/</span>
                <span className="text-3xl font-bold">{kpis.usersB2B}</span>
                <span className="text-muted-foreground">B2B</span>
              </div>
              {kpis.totalUsers > 0 && (
                <div className="text-sm text-muted-foreground">
                  {Math.round((kpis.usersB2B / kpis.totalUsers) * 100)}% via parceiros
                </div>
              )}
            </div>
          )}
        </KPICard>

        {/* Card 3 - Conteúdo Ativo */}
        <KPICard
          title="Conteúdos Publicados"
          icon={<FileText className="h-5 w-5" />}
          tooltip="Total de artigos e conteúdos técnicos ativos"
          loading={loading}
        >
          {kpis && (
            <div className="space-y-2">
              <div className="text-3xl font-bold">{kpis.totalContent}</div>
              <div className="text-sm text-muted-foreground">
                B2C: {kpis.contentB2C} | B2B: {kpis.contentB2B}
              </div>
            </div>
          )}
        </KPICard>

        {/* Card 4 - Vídeos Técnicos */}
        <KPICard
          title="Vídeos Técnicos"
          icon={<Video className="h-5 w-5" />}
          tooltip="Total de vídeos técnicos ativos na plataforma"
          loading={loading}
        >
          {kpis && (
            <div className="space-y-2">
              <div className="text-3xl font-bold">{kpis.totalVideos}</div>
              <div className="text-sm text-muted-foreground">
                B2C: {kpis.videosB2C} | B2B: {kpis.videosB2B}
              </div>
            </div>
          )}
        </KPICard>

        {/* Card 5 - Fala Agrônomo */}
        <KPICard
          title="Interações no Fala Agrônomo"
          icon={<MessageSquare className="h-5 w-5" />}
          tooltip="Uso do canal de suporte técnico Fala Agrônomo"
          loading={loading}
        >
          {kpis && (
            <div className="space-y-2">
              <div className="text-3xl font-bold">{kpis.totalConversations}</div>
              <div className="text-sm text-muted-foreground">
                {kpis.openConversations} abertas | {kpis.totalMessages} msgs
              </div>
            </div>
          )}
        </KPICard>

        {/* Card 6 - Parceiros Ativos */}
        <KPICard
          title="Parceiros Ativos"
          icon={<Building2 className="h-5 w-5" />}
          tooltip="Parceiros cadastrados e com atividade"
          loading={loading}
        >
          {kpis && (
            <div className="space-y-2">
              <div className="text-3xl font-bold">{kpis.totalPartners}</div>
              <div className="text-sm text-muted-foreground">
                {kpis.partnersWithProducers} com produtores vinculados
              </div>
            </div>
          )}
        </KPICard>
      </div>

      {!loading && kpis && kpis.totalUsers === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Sem dados ainda. Os indicadores serão preenchidos conforme o uso da plataforma.
        </div>
      )}
    </div>
  );
}

interface KPICardProps {
  title: string;
  icon: React.ReactNode;
  tooltip: string;
  loading: boolean;
  children: React.ReactNode;
}

function KPICard({ title, icon, tooltip, loading, children }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
