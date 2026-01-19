import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminIntegrations } from '@/hooks/useAdminData';
import { Loader2, Plug, RefreshCw, CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SuperadminIntegrations() {
  const { loading, integrations, toggleIntegration, testConnection, refresh } = useAdminIntegrations();

  const getStatusIcon = (integration: typeof integrations[0]) => {
    if (!integration.is_enabled) {
      return <Badge variant="outline">Desativado</Badge>;
    }
    if (integration.last_error) {
      return (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">Erro</span>
        </div>
      );
    }
    if (integration.last_ok_at) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">OK</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Não testado</span>
      </div>
    );
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      respondeagro: 'RespondeAgro',
      agritec: 'Agritec (Embrapa)',
      satveg: 'SatVeg (INPE)',
    };
    return names[provider] || provider;
  };

  const getProviderDescription = (provider: string) => {
    const descriptions: Record<string, string> = {
      openai: 'API de IA para chat e análise',
      respondeagro: 'Consultoria agronômica',
      agritec: 'Dados climáticos e agrícolas',
      satveg: 'Imagens de satélite',
    };
    return descriptions[provider] || '';
  };

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">Status e configuração dos providers externos</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Providers Configurados
            </CardTitle>
            <CardDescription>Gerencie as integrações externas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && integrations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Verificação</TableHead>
                    <TableHead>Latência</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((integration) => (
                    <TableRow key={integration.provider}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getProviderName(integration.provider)}</div>
                          <div className="text-xs text-muted-foreground">
                            {getProviderDescription(integration.provider)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusIcon(integration)}</TableCell>
                      <TableCell>
                        {integration.last_ok_at
                          ? new Date(integration.last_ok_at).toLocaleString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {integration.latency_ms ? (
                          <Badge variant="secondary">{integration.latency_ms}ms</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {integration.last_error ? (
                          <span className="text-xs text-destructive max-w-xs truncate block">
                            {integration.last_error}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={integration.is_enabled}
                          onCheckedChange={(v) => toggleIntegration(integration.provider, v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(integration.provider)}
                          disabled={!integration.is_enabled}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Testar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {integrations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma integração configurada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperadminRoute>
  );
}
