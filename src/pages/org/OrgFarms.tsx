import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Users, RefreshCw, ShieldX, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentWorkspace, useWorkspaceFarms } from '@/hooks/useWorkspacePanel';

export default function OrgFarms() {
  const navigate = useNavigate();
  const { loading: loadingWs, workspace, isAdmin } = useCurrentWorkspace();
  const { loading, farms, refresh } = useWorkspaceFarms(workspace?.id);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fazendas do Workspace</h1>
          <p className="text-muted-foreground">Fazendas vinculadas a {workspace.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Fazendas
          </CardTitle>
          <CardDescription>{farms.length} fazendas no workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && farms.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Área (ha)</TableHead>
                  <TableHead>Agrônomos</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="font-medium">{farm.nome}</TableCell>
                    <TableCell>
                      {farm.cidade && farm.estado 
                        ? `${farm.cidade}, ${farm.estado}` 
                        : farm.estado || '-'}
                    </TableCell>
                    <TableCell>
                      {farm.area_ha 
                        ? farm.area_ha.toLocaleString('pt-BR') 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Users className="h-3 w-3" />
                        {farm.agronomist_count}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/org/farms/${farm.id}/agronomists`)}
                        >
                          Agrônomos
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {farms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma fazenda vinculada ao workspace
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
