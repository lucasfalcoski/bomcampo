import { Home, Cloud, Sprout, DollarSign, Settings, LogOut, MapPin, FileText, TrendingUp, MessageSquare, Users, ClipboardList, LayoutDashboard, Flag, Megaphone, Plug, Building2, Bot, Inbox } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  visibility?: 'all' | 'b2b_admin' | 'agronomist' | 'ai_enabled';
};

const menuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Fazendas', url: '/fazendas', icon: MapPin },
  { title: 'Clima', url: '/clima', icon: Cloud },
  { title: 'Talhões & Plantio', url: '/talhoes', icon: Sprout },
  { title: 'Preços', url: '/precos', icon: TrendingUp },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
  { title: 'Fala IAgrônomo', url: '/ai', icon: Bot, visibility: 'ai_enabled' },
  { title: 'Fala Agrônomo', url: '/fala-agronomo', icon: MessageSquare },
  { title: 'Painel', url: '/org', icon: Building2, visibility: 'b2b_admin' },
  { title: 'Caixa do Agrônomo', url: '/agronomist/inbox', icon: Inbox, visibility: 'agronomist' },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

const adminItems: MenuItem[] = [
  { title: 'Visão Geral', url: '/admin', icon: LayoutDashboard },
  { title: 'Workspaces', url: '/admin/workspaces', icon: Building2 },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Feature Flags', url: '/admin/flags', icon: Flag },
  { title: 'Campanhas', url: '/admin/campaigns', icon: Megaphone },
  { title: 'Integrações', url: '/admin/integrations', icon: Plug },
  { title: 'Auditoria', url: '/admin/audit', icon: ClipboardList },
];

interface UserPermissions {
  isSuperadmin: boolean;
  isB2BAdmin: boolean; // owner/manager in a b2b workspace
  isAgronomist: boolean; // has agronomist role or linked to farms
  aiEnabled: boolean;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const collapsed = state === 'collapsed';
  const [permissions, setPermissions] = useState<UserPermissions>({
    isSuperadmin: false,
    isB2BAdmin: false,
    isAgronomist: false,
    aiEnabled: true, // default to true, can be controlled by flags
  });

  useEffect(() => {
    async function checkPermissions() {
      if (!user) return;

      try {
        // Check if superadmin
        const { data: isSuperadmin } = await supabase.rpc('is_superadmin', {
          _user_id: user.id
        });

        // Check workspace membership
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('role, workspace_id')
          .eq('user_id', user.id)
          .maybeSingle();

        let isB2BAdmin = false;
        if (membership) {
          // Check if workspace is b2b
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('type')
            .eq('id', membership.workspace_id)
            .single();

          isB2BAdmin = 
            workspace?.type === 'b2b' && 
            (membership.role === 'owner' || membership.role === 'manager');
        }

        // Check if agronomist (either by role or linked to farms)
        const { data: isLinkedAgronomist } = await supabase
          .from('farm_agronomists')
          .select('farm_id')
          .eq('agronomist_user_id', user.id)
          .limit(1);

        const { data: hasAgronomistRole } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'agronomist')
          .limit(1);

        const isAgronomist = 
          (isLinkedAgronomist && isLinkedAgronomist.length > 0) ||
          (hasAgronomistRole && hasAgronomistRole.length > 0);

        // Check if AI is enabled via feature flags (global or workspace)
        let aiEnabled = true;
        const { data: globalFlag } = await supabase
          .from('feature_flags_global')
          .select('value_json')
          .eq('key', 'ai_chat_enabled')
          .maybeSingle();

        if (globalFlag?.value_json !== undefined) {
          aiEnabled = globalFlag.value_json === true || 
                     (typeof globalFlag.value_json === 'object' && (globalFlag.value_json as any).enabled === true);
        }

        // Workspace-specific override
        if (membership?.workspace_id) {
          const { data: wsFlag } = await supabase
            .from('feature_flags_workspace')
            .select('value_json')
            .eq('workspace_id', membership.workspace_id)
            .eq('key', 'ai_chat_enabled')
            .maybeSingle();

          if (wsFlag?.value_json !== undefined) {
            aiEnabled = wsFlag.value_json === true || 
                       (typeof wsFlag.value_json === 'object' && (wsFlag.value_json as any).enabled === true);
          }
        }

        setPermissions({
          isSuperadmin: !!isSuperadmin,
          isB2BAdmin: isB2BAdmin || !!isSuperadmin, // superadmin sees all
          isAgronomist: !!isAgronomist || !!isSuperadmin,
          aiEnabled,
        });
      } catch (err) {
        console.error('[AppSidebar] Error checking permissions:', err);
      }
    }

    checkPermissions();
  }, [user]);

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.visibility) return true; // no restriction

      switch (item.visibility) {
        case 'b2b_admin':
          return permissions.isB2BAdmin;
        case 'agronomist':
          return permissions.isAgronomist;
        case 'ai_enabled':
          return permissions.aiEnabled;
        default:
          return true;
      }
    });
  }, [permissions]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Sprout className="h-6 w-6 text-primary" />
          </div>
          {!collapsed && <span className="font-bold text-lg">Bom Campo</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {permissions.isSuperadmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button variant="ghost" onClick={signOut} className="w-full justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
