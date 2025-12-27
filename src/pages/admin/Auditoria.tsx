import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, FileText, Search, RefreshCw, User, Building2, Calendar, Filter, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_email?: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  create_partner: { label: 'Criar Parceiro', variant: 'default' },
  create_partner_user: { label: 'Adicionar Usuário', variant: 'default' },
  update_partner_user_role: { label: 'Alterar Função', variant: 'secondary' },
  link_producer_to_partner: { label: 'Vincular Produtor', variant: 'outline' },
  unlink_producer_from_partner: { label: 'Desvincular', variant: 'destructive' },
  remove_partner_user: { label: 'Remover Usuário', variant: 'destructive' },
};

const TARGET_ICONS: Record<string, React.ReactNode> = {
  partner: <Building2 className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

export default function Auditoria() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('30');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'system_admin').maybeSingle();
      setIsSystemAdmin(!!data);
      setLoading(false);
    }
    checkAccess();
  }, [user]);

  useEffect(() => { if (!loading && !isSystemAdmin) navigate('/'); }, [loading, isSystemAdmin, navigate]);

  const loadLogs = async () => {
    if (!isSystemAdmin) return;
    console.log('admin: loading audit logs');
    setRefreshing(true);
    try {
      const { data } = await (supabase.from('admin_audit_log') as unknown as { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: AuditLog[] | null }> } } }).select('*').order('created_at', { ascending: false }).limit(500);
      const adminIds = [...new Set((data || []).map(l => l.admin_user_id))];
      const emailMap: Record<string, string> = {};
      for (const id of adminIds) { try { const { data: email } = await supabase.rpc('get_user_email', { _user_id: id }); if (email) emailMap[id] = email; } catch {} }
      setLogs((data || []).map(l => ({ ...l, admin_email: emailMap[l.admin_user_id] || 'Desconhecido' })));
    } finally { setRefreshing(false); }
  };

  const loadPartners = async () => { const { data } = await supabase.from('partners').select('id, name').order('name'); setPartners(data || []); };

  useEffect(() => { if (isSystemAdmin) { loadLogs(); loadPartners(); } }, [isSystemAdmin]);

  const filteredLogs = useMemo(() => logs.filter(log => {
    const matchesSearch = !searchTerm || log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) || JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesPartner = partnerFilter === 'all' || (log.metadata as Record<string, unknown>)?.partner_id === partnerFilter;
    let matchesPeriod = true;
    const logDate = new Date(log.created_at);
    if (periodFilter === 'custom' && customStartDate && customEndDate) matchesPeriod = isWithinInterval(logDate, { start: startOfDay(customStartDate), end: endOfDay(customEndDate) });
    else if (periodFilter !== 'custom') matchesPeriod = logDate >= subDays(new Date(), parseInt(periodFilter));
    return matchesSearch && matchesAction && matchesPartner && matchesPeriod;
  }), [logs, searchTerm, actionFilter, partnerFilter, periodFilter, customStartDate, customEndDate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isSystemAdmin) return null;

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Auditoria</h1><p className="text-muted-foreground">Histórico de ações administrativas</p></div>
        <Button variant="outline" onClick={loadLogs} disabled={refreshing}>{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="ml-2">Atualizar</span></Button>
      </div>
      <Card className="mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" />Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label>Período</Label><Select value={periodFilter} onValueChange={setPeriodFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="custom">Personalizado</SelectItem></SelectContent></Select></div>
            {periodFilter === 'custom' && (<><div className="space-y-2"><Label>Início</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start", !customStartDate && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Selecione"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-popover"><CalendarComponent mode="single" selected={customStartDate} onSelect={setCustomStartDate} /></PopoverContent></Popover></div><div className="space-y-2"><Label>Fim</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start", !customEndDate && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Selecione"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-popover"><CalendarComponent mode="single" selected={customEndDate} onSelect={setCustomEndDate} /></PopoverContent></Popover></div></>)}
            <div className="space-y-2"><Label>Parceiro</Label><Select value={partnerFilter} onValueChange={setPartnerFilter}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Ação</Label><Select value={actionFilter} onValueChange={setActionFilter}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{[...new Set(logs.map(l => l.action))].map(a => <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label || a}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2 lg:col-span-4"><Label>Busca</Label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" /></div></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Registros</CardTitle><CardDescription>{filteredLogs.length} registros</CardDescription></CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? <div className="text-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Nenhum registro encontrado.</p></div> : (
            <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Admin</TableHead><TableHead>Ação</TableHead><TableHead>Alvo</TableHead><TableHead>Parceiro</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>{filteredLogs.map(log => (<TableRow key={log.id}><TableCell className="whitespace-nowrap">{format(new Date(log.created_at), "dd/MM/yy HH:mm")}</TableCell><TableCell className="max-w-[150px] truncate">{log.admin_email}</TableCell><TableCell><Badge variant={ACTION_LABELS[log.action]?.variant || 'secondary'}>{ACTION_LABELS[log.action]?.label || log.action}</Badge></TableCell><TableCell><div className="flex items-center gap-1">{TARGET_ICONS[log.target_type]}<span className="text-sm">{log.target_type}</span></div></TableCell><TableCell>{(log.metadata as Record<string, unknown>)?.partner_name as string || '-'}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}><Eye className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detalhes</DialogTitle><DialogDescription>Log de auditoria completo</DialogDescription></DialogHeader>
          {selectedLog && <div className="space-y-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Data</p><p className="font-medium">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p></div><div><p className="text-muted-foreground">Admin</p><p className="font-medium">{selectedLog.admin_email}</p></div><div><p className="text-muted-foreground">Ação</p><Badge>{ACTION_LABELS[selectedLog.action]?.label || selectedLog.action}</Badge></div><div><p className="text-muted-foreground">Alvo</p><p className="font-medium">{selectedLog.target_type} {selectedLog.target_id?.slice(0,8)}...</p></div></div><div><p className="text-muted-foreground text-sm mb-2">Metadados</p><pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-[200px]">{JSON.stringify(selectedLog.metadata, null, 2)}</pre></div></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
