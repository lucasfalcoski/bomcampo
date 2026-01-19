import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Users, MapPin, BarChart3, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentWorkspace, useWorkspaceMembers, useWorkspaceFarms, useWorkspaceAIUsage } from '@/hooks/useWorkspacePanel';

export default function OrgHome() {
  const navigate = useNavigate();
  const { loading, workspace, role, isAdmin } = useCurrentWorkspace();
  const { members } = useWorkspaceMembers(workspace?.id);
  const { farms } = useWorkspaceFarms(workspace?.id);
  const { totalRequests } = useWorkspaceAIUsage(workspace?.id);

  if (loading) {
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
            <h2 className="text-lg font-medium">Sem workspace</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Você não está vinculado a nenhum workspace B2B.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      premium: 'bg-blue-100 text-blue-700',
      enterprise: 'bg-purple-100 text-purple-700',
    };
    return <Badge className={colors[plan] || ''}>{plan.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {getPlanBadge(workspace.plan)}
                <Badge variant="outline">{workspace.type.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground">
                  Sua role: <strong>{role}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/org/users')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              usuários no workspace
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/org/farms')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fazendas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farms.length}</div>
            <p className="text-xs text-muted-foreground">
              propriedades cadastradas
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/org/usage')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso de IA</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              consultas nos últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Gerenciamento do workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/org/users')}>
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Membros
            </Button>
            <Button variant="outline" onClick={() => navigate('/org/farms')}>
              <MapPin className="h-4 w-4 mr-2" />
              Gerenciar Fazendas
            </Button>
            <Button variant="outline" onClick={() => navigate('/org/usage')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Consumo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
