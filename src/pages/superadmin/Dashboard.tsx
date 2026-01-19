import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminDashboard } from '@/hooks/useAdminData';
import { Loader2, Building2, Users, Cpu, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperadminDashboard() {
  const { loading, stats, refresh } = useAdminDashboard();

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel do Superadmin</h1>
            <p className="text-muted-foreground">Visão geral do sistema</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workspaces Ativos</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.workspacesActive || 0}</div>
                <p className="text-xs text-muted-foreground">B2C e B2B combinados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consumo IA Hoje</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.aiUsageToday || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.aiUsageMonth || 0} este mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Integrações</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${(stats?.integrationErrors || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(stats?.integrationErrors || 0) > 0 ? 'text-destructive' : ''}`}>
                  {stats?.integrationErrors || 0}
                </div>
                <p className="text-xs text-muted-foreground">Providers com erro</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
              <CardDescription>Gerenciamento do sistema</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <a href="/admin/workspaces">
                  <Building2 className="mr-2 h-4 w-4" />
                  Gerenciar Workspaces
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="/admin/users">
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Usuários
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="/admin/flags">
                  <Cpu className="mr-2 h-4 w-4" />
                  Feature Flags
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
              <CardDescription>Integrações e campanhas</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <a href="/admin/integrations">
                  <Cpu className="mr-2 h-4 w-4" />
                  Status das Integrações
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="/admin/campaigns">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Campanhas Ativas
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="/admin/audit">
                  <Users className="mr-2 h-4 w-4" />
                  Log de Auditoria
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperadminRoute>
  );
}
