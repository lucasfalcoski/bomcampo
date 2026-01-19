import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, ShieldX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentWorkspace, useWorkspaceAIUsage } from '@/hooks/useWorkspacePanel';

export default function OrgUsage() {
  const { loading: loadingWs, workspace } = useCurrentWorkspace();
  const { loading, usage, totalRequests } = useWorkspaceAIUsage(workspace?.id, 30);

  if (loadingWs) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">Sem acesso</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlanQuota = (plan: string) => {
    const quotas: Record<string, number> = {
      free: 5,
      premium: 50,
      enterprise: 500,
    };
    return quotas[plan] || 5;
  };

  const dailyQuota = getPlanQuota(workspace.plan);

  // Aggregate by day
  const aggregatedUsage = usage.reduce((acc, item) => {
    const existing = acc.find(a => a.day === item.day);
    if (existing) {
      existing.requests += item.requests;
      existing.tokens_in += item.tokens_in;
      existing.tokens_out += item.tokens_out;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as typeof usage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consumo de IA</h1>
        <p className="text-muted-foreground">Histórico de uso do workspace {workspace.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="text-lg px-3 py-1">{workspace.plan.toUpperCase()}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cota Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyQuota}</div>
            <p className="text-xs text-muted-foreground">consultas por dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">consultas realizadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Histórico Diário
          </CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Consultas</TableHead>
                  <TableHead>Tokens Entrada</TableHead>
                  <TableHead>Tokens Saída</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedUsage.map((item) => (
                  <TableRow key={item.day}>
                    <TableCell className="font-medium">
                      {new Date(item.day + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.requests >= dailyQuota ? 'destructive' : 'secondary'}
                      >
                        {item.requests} / {dailyQuota}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.tokens_in.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{item.tokens_out.toLocaleString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
                {aggregatedUsage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum uso registrado nos últimos 30 dias
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
