import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminWorkspaces, Workspace } from '@/hooks/useAdminData';
import { Loader2, Plus, Pencil, Building2, RefreshCw } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SuperadminWorkspaces() {
  const { loading, workspaces, createWorkspace, updateWorkspace, refresh } = useAdminWorkspaces();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'b2c' as 'b2c' | 'b2b',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    plan: 'free' as 'free' | 'premium' | 'enterprise',
  });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingWorkspace(null);
    setFormData({ name: '', type: 'b2c', status: 'active', plan: 'free' });
    setDialogOpen(true);
  };

  const openEdit = (ws: Workspace) => {
    setEditingWorkspace(ws);
    setFormData({
      name: ws.name,
      type: ws.type,
      status: ws.status,
      plan: ws.plan,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editingWorkspace) {
      await updateWorkspace(editingWorkspace.id, formData);
    } else {
      await createWorkspace(formData);
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      free: 'outline',
      premium: 'secondary',
      enterprise: 'default',
    };
    return <Badge variant={variants[plan] || 'outline'}>{plan}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-600',
      inactive: 'bg-gray-500/10 text-gray-600',
      suspended: 'bg-red-500/10 text-red-600',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground">Gerencie os workspaces B2C e B2B</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Workspace
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lista de Workspaces
            </CardTitle>
            <CardDescription>{workspaces.length} workspaces cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && workspaces.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Membros</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">{ws.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ws.type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{getPlanBadge(ws.plan)}</TableCell>
                      <TableCell>{getStatusBadge(ws.status)}</TableCell>
                      <TableCell>{ws.member_count || 0}</TableCell>
                      <TableCell>
                        {new Date(ws.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(ws)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workspaces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum workspace cadastrado
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
              <DialogTitle>
                {editingWorkspace ? 'Editar Workspace' : 'Novo Workspace'}
              </DialogTitle>
              <DialogDescription>
                {editingWorkspace
                  ? 'Atualize as informações do workspace'
                  : 'Preencha os dados para criar um novo workspace'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do workspace"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as 'b2c' | 'b2b' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2c">B2C</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(v) => setFormData({ ...formData, plan: v as 'free' | 'premium' | 'enterprise' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'inactive' | 'suspended' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingWorkspace ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperadminRoute>
  );
}
