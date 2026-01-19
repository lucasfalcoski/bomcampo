import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminAudit } from '@/hooks/useAdminData';
import { Loader2, ClipboardList, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export default function SuperadminAudit() {
  const { loading, logs, hasMore, loadMore, refresh } = useAdminAudit();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-500/10 text-green-600',
      update: 'bg-blue-500/10 text-blue-600',
      delete: 'bg-red-500/10 text-red-600',
      toggle: 'bg-yellow-500/10 text-yellow-600',
      assign_workspace: 'bg-purple-500/10 text-purple-600',
      set_system_role: 'bg-orange-500/10 text-orange-600',
      update_flag: 'bg-cyan-500/10 text-cyan-600',
      delete_flag: 'bg-red-500/10 text-red-600',
      test_connection: 'bg-gray-500/10 text-gray-600',
    };
    return <Badge className={colors[action] || ''}>{action}</Badge>;
  };

  const getEntityBadge = (entity: string) => {
    return <Badge variant="outline">{entity}</Badge>;
  };

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Log de Auditoria</h1>
            <p className="text-muted-foreground">Histórico de ações administrativas</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Registros de Auditoria
            </CardTitle>
            <CardDescription>{logs.length} registros carregados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Alvo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <>
                        <TableRow key={log.id}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(log.id)}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  expandedRows.has(log.id) ? 'rotate-180' : ''
                                }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell>
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.admin_email || log.admin_user_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>{getEntityBadge(log.target_type)}</TableCell>
                          <TableCell>
                            {log.target_id ? (
                              <code className="text-xs">{log.target_id.slice(0, 8)}...</code>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(log.id) && (
                          <TableRow key={`${log.id}-details`}>
                            <TableCell colSpan={6} className="bg-muted/50">
                              <div className="p-4 space-y-4">
                                {log.metadata?.before && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Antes:</h4>
                                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(log.metadata.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.metadata?.after && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Depois:</h4>
                                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(log.metadata.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {!log.metadata?.before && !log.metadata?.after && (
                                  <p className="text-sm text-muted-foreground">
                                    Sem detalhes adicionais
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum registro de auditoria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {hasMore && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={loadMore} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Carregar mais
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperadminRoute>
  );
}
