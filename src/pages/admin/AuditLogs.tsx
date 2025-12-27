import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, FileText, Search, RefreshCw, User, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
};

const TARGET_ICONS: Record<string, React.ReactNode> = {
  partner: <Building2 className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is system_admin
  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'system_admin')
          .maybeSingle();

        setIsSystemAdmin(!!data);
      } catch (err) {
        console.error('Error checking access:', err);
        setIsSystemAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [user]);

  // Redirect if not system_admin
  useEffect(() => {
    if (!loading && !isSystemAdmin) {
      navigate('/');
    }
  }, [loading, isSystemAdmin, navigate]);

  // Load audit logs
  const loadLogs = async () => {
    if (!isSystemAdmin) return;

    setRefreshing(true);
    try {
      // Use type assertion for the new table
      const { data, error } = await (supabase.from('admin_audit_log') as unknown as {
        select: (columns: string) => {
          order: (column: string, options: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: AuditLog[] | null; error: unknown }>;
          };
        };
      }).select('*').order('created_at', { ascending: false }).limit(200);

      if (error) throw error;

      // Get admin emails for each log
      const logsWithEmails: AuditLog[] = [];
      const adminIds = [...new Set((data || []).map((l: AuditLog) => l.admin_user_id))];
      
      const emailMap: Record<string, string> = {};
      for (const adminId of adminIds) {
        try {
          const { data: email } = await supabase.rpc('get_user_email', { _user_id: adminId });
          if (email) emailMap[adminId] = email;
        } catch {
          // Ignore errors
        }
      }

      for (const log of data || []) {
        logsWithEmails.push({
          ...log,
          admin_email: emailMap[log.admin_user_id] || 'Desconhecido',
        });
      }

      setLogs(logsWithEmails);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSystemAdmin) {
      loadLogs();
    }
  }, [isSystemAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSystemAdmin) {
    return null;
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      searchTerm === '' ||
      log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Histórico de ações administrativas
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadLogs}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por e-mail, ação ou metadados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action]?.label || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, variant: 'secondary' as const };

                  return (
                    <Collapsible key={log.id} asChild open={isExpanded} onOpenChange={() => toggleRow(log.id)}>
                      <>
                        <TableRow className={hasMetadata ? 'cursor-pointer hover:bg-muted/50' : ''}>
                          <TableCell>
                            {hasMetadata && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.admin_email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={actionInfo.variant}>
                              {actionInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {TARGET_ICONS[log.target_type] || null}
                              <span className="text-sm capitalize">{log.target_type}</span>
                              {log.target_id && (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {log.target_id.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {hasMetadata && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={5} className="py-3">
                                <div className="pl-10">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Metadados:</p>
                                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
