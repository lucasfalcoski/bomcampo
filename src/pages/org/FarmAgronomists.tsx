import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Plus, Trash2, Star, ArrowLeft, ShieldX, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrentWorkspace, useFarmAgronomists } from '@/hooks/useWorkspacePanel';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export default function FarmAgronomists() {
  const { id: farmId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading: loadingWs, workspace, isAdmin } = useCurrentWorkspace();
  const { loading, agronomists, addAgronomist, removeAgronomist, setPrimary, refresh } = useFarmAgronomists(farmId);
  
  const [farmName, setFarmName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadFarmName() {
      if (!farmId) return;
      const { data } = await supabase
        .from('farms')
        .select('nome')
        .eq('id', farmId)
        .single();
      if (data) setFarmName(data.nome);
    }
    loadFarmName();
  }, [farmId]);

  const handleAdd = async () => {
    setSaving(true);
    const success = await addAgronomist(email, isPrimary);
    setSaving(false);
    if (success) {
      setDialogOpen(false);
      setEmail('');
      setIsPrimary(false);
    }
  };

  const handleRemove = async (userId: string, nome: string | null) => {
    if (confirm(`Remover ${nome || 'este agrônomo'} da fazenda?`)) {
      await removeAgronomist(userId);
    }
  };

  const handleSetPrimary = async (userId: string) => {
    await setPrimary(userId);
  };

  if (loadingWs) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace || !isAdmin) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">Sem acesso</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Apenas admins podem gerenciar agrônomos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/org/farms')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Agrônomos da Fazenda</h1>
          <p className="text-muted-foreground">{farmName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Vincular Agrônomo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agrônomos Vinculados
          </CardTitle>
          <CardDescription>
            O agrônomo primário recebe as escalações do chat IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && agronomists.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Canal Preferido</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agronomists.map((agro) => (
                  <TableRow key={agro.agronomist_user_id}>
                    <TableCell className="font-medium">{agro.email}</TableCell>
                    <TableCell>{agro.nome || '-'}</TableCell>
                    <TableCell>
                      {agro.is_primary ? (
                        <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
                          <Star className="h-3 w-3" />
                          Primário
                        </Badge>
                      ) : (
                        <Badge variant="outline">Secundário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{agro.channel_pref}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!agro.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(agro.agronomist_user_id)}
                            title="Definir como primário"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(agro.agronomist_user_id, agro.nome)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {agronomists.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum agrônomo vinculado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Agrônomo</DialogTitle>
            <DialogDescription>
              O usuário deve ter uma conta cadastrada no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email do agrônomo</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agronomo@email.com"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <Label htmlFor="primary" className="cursor-pointer">
                Definir como agrônomo primário
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={saving || !email}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
