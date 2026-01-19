import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminUsers, useAdminWorkspaces, AdminUser } from '@/hooks/useAdminData';
import { Loader2, Users, RefreshCw, Shield, Building2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SuperadminUsers() {
  const { loading, users, assignToWorkspace, setSystemRole, refresh } = useAdminUsers();
  const { workspaces } = useAdminWorkspaces();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'workspace' | 'system'>('workspace');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);

  const openWorkspaceDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedWorkspace(user.workspace_id || '');
    setSelectedRole(user.workspace_role || 'viewer');
    setDialogType('workspace');
    setDialogOpen(true);
  };

  const openSystemRoleDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedRole(user.system_role || '');
    setDialogType('system');
    setDialogOpen(true);
  };

  const handleSaveWorkspace = async () => {
    if (!selectedUser || !selectedWorkspace) return;
    setSaving(true);
    await assignToWorkspace(selectedUser.id, selectedWorkspace, selectedRole);
    setSaving(false);
    setDialogOpen(false);
  };

  const handleSaveSystemRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    await setSystemRole(selectedUser.id, selectedRole || null);
    setSaving(false);
    setDialogOpen(false);
  };

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie usuários e suas permissões</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuários
            </CardTitle>
            <CardDescription>{users.length} usuários cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Role Workspace</TableHead>
                    <TableHead>Role Sistema</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.nome || '-'}</TableCell>
                      <TableCell>
                        {user.workspace_name ? (
                          <Badge variant="outline">{user.workspace_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.workspace_role ? (
                          <Badge variant="secondary">{user.workspace_role}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.system_role ? (
                          <Badge className="bg-primary/10 text-primary">
                            {user.system_role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openWorkspaceDialog(user)}
                            title="Atribuir Workspace"
                          >
                            <Building2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSystemRoleDialog(user)}
                            title="Role de Sistema"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
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
                {dialogType === 'workspace' ? 'Atribuir Workspace' : 'Role de Sistema'}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            {dialogType === 'workspace' ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Workspace</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name} ({ws.type.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Role no Workspace</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="agronomist">Agronomist</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Role de Sistema</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="ops">Ops</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Superadmin tem acesso total ao painel administrativo
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={dialogType === 'workspace' ? handleSaveWorkspace : handleSaveSystemRole}
                disabled={saving || (dialogType === 'workspace' && !selectedWorkspace)}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperadminRoute>
  );
}
