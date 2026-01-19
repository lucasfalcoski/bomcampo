import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminUsers, useAdminWorkspaces, AdminUser } from '@/hooks/useAdminData';
import { useUserManagement, WorkspaceInvite } from '@/hooks/useUserManagement';
import { useImpersonation } from '@/hooks/useImpersonation';
import { 
  Loader2, Users, RefreshCw, Shield, Building2, Plus, 
  Mail, MailPlus, UserX, UserCheck, Key, Eye, Trash2,
  Clock, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ExtendedAdminUser extends AdminUser {
  is_suspended?: boolean;
}

export default function SuperadminUsers() {
  const { loading, users, assignToWorkspace, setSystemRole, refresh } = useAdminUsers();
  const { workspaces } = useAdminWorkspaces();
  const { 
    loading: actionLoading, 
    invites, 
    loadingInvites,
    createUserInvite,
    resendInvite,
    cancelInvite,
    sendPasswordReset,
    toggleUserSuspension,
    removeFromWorkspace,
    loadInvites,
  } = useUserManagement();
  const { startImpersonation } = useImpersonation();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'workspace' | 'system' | 'create' | 'impersonate'>('workspace');
  const [selectedUser, setSelectedUser] = useState<ExtendedAdminUser | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Create user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserWorkspace, setNewUserWorkspace] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');
  
  // Impersonation
  const [impersonateReason, setImpersonateReason] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const openWorkspaceDialog = (user: ExtendedAdminUser) => {
    setSelectedUser(user);
    setSelectedWorkspace(user.workspace_id || '');
    setSelectedRole(user.workspace_role || 'viewer');
    setDialogType('workspace');
    setDialogOpen(true);
  };

  const openSystemRoleDialog = (user: ExtendedAdminUser) => {
    setSelectedUser(user);
    setSelectedRole(user.system_role || '');
    setDialogType('system');
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserWorkspace('');
    setNewUserRole('viewer');
    setDialogType('create');
    setDialogOpen(true);
  };

  const openImpersonateDialog = (user: ExtendedAdminUser) => {
    setSelectedUser(user);
    setImpersonateReason('');
    setDialogType('impersonate');
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

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserWorkspace) return;
    setSaving(true);
    const success = await createUserInvite(
      newUserEmail, 
      newUserWorkspace, 
      newUserRole as any,
      newUserName
    );
    setSaving(false);
    if (success) {
      setDialogOpen(false);
      refresh();
      loadInvites();
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const success = await startImpersonation(
      selectedUser.id, 
      selectedUser.email,
      impersonateReason || undefined
    );
    setSaving(false);
    if (success) {
      setDialogOpen(false);
      // Reload page to apply impersonation
      window.location.reload();
    }
  };

  const handleResendInvite = async (invite: WorkspaceInvite) => {
    await resendInvite(invite.id, invite.email);
    loadInvites();
  };

  const handleCancelInvite = async (invite: WorkspaceInvite) => {
    if (confirm(`Cancelar convite para ${invite.email}?`)) {
      await cancelInvite(invite.id);
      loadInvites();
    }
  };

  const handleSendPasswordReset = async (user: ExtendedAdminUser) => {
    await sendPasswordReset(user.email, user.id);
  };

  const handleToggleSuspension = async (user: ExtendedAdminUser) => {
    const action = user.is_suspended ? 'reativar' : 'suspender';
    if (confirm(`Deseja ${action} o usuário ${user.email}?`)) {
      await toggleUserSuspension(user.id, !user.is_suspended);
      refresh();
    }
  };

  const handleRemoveFromWorkspace = async (user: ExtendedAdminUser) => {
    if (!user.workspace_id) return;
    if (confirm(`Remover ${user.email} do workspace?`)) {
      await removeFromWorkspace(user.id, user.workspace_id);
      refresh();
    }
  };

  const getStatusBadge = (user: ExtendedAdminUser) => {
    if (user.is_suspended) {
      return <Badge variant="destructive">Suspenso</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>;
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.email.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !(user.nome || '').toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter === 'suspended' && !(user as ExtendedAdminUser).is_suspended) return false;
    if (statusFilter === 'active' && (user as ExtendedAdminUser).is_suspended) return false;
    return true;
  });

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie usuários e suas permissões</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refresh(); loadInvites(); }} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Usuário
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários ({users.length})
            </TabsTrigger>
            <TabsTrigger value="invites">
              <Clock className="h-4 w-4 mr-2" />
              Convites Pendentes ({invites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de Usuários
                </CardTitle>
                <CardDescription>{filteredUsers.length} usuários encontrados</CardDescription>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Role Workspace</TableHead>
                        <TableHead>Role Sistema</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.nome || '-'}</TableCell>
                          <TableCell>{getStatusBadge(user as ExtendedAdminUser)}</TableCell>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  •••
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openWorkspaceDialog(user)}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Atribuir Workspace
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openSystemRoleDialog(user)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Role de Sistema
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSendPasswordReset(user)}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Enviar Reset de Senha
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openImpersonateDialog(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Impersonar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleToggleSuspension(user as ExtendedAdminUser)}
                                >
                                  {(user as ExtendedAdminUser).is_suspended ? (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Reativar
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Suspender
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {user.workspace_id && (
                                  <DropdownMenuItem 
                                    onClick={() => handleRemoveFromWorkspace(user as ExtendedAdminUser)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remover do Workspace
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Convites Pendentes
                </CardTitle>
                <CardDescription>Convites aguardando aceitação</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInvites ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Último reenvio</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invite.workspace_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{invite.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(invite.sent_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {invite.last_resent_at 
                              ? new Date(invite.last_resent_at).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {invite.expires_at 
                              ? new Date(invite.expires_at).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvite(invite)}
                                title="Reenviar convite"
                              >
                                <MailPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvite(invite)}
                                title="Cancelar convite"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {invites.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum convite pendente
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogType === 'workspace' && 'Atribuir Workspace'}
                {dialogType === 'system' && 'Role de Sistema'}
                {dialogType === 'create' && 'Criar Usuário'}
                {dialogType === 'impersonate' && 'Impersonar Usuário'}
              </DialogTitle>
              <DialogDescription>
                {dialogType === 'impersonate' 
                  ? 'Visualize o sistema como este usuário. Todas as ações serão auditadas.'
                  : selectedUser?.email || 'Preencha os dados do novo usuário'}
              </DialogDescription>
            </DialogHeader>

            {dialogType === 'workspace' && (
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
            )}

            {dialogType === 'system' && (
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

            {dialogType === 'create' && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do usuário"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="usuario@email.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Workspace *</Label>
                  <Select value={newUserWorkspace} onValueChange={setNewUserWorkspace}>
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
                  <Label>Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
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

                <p className="text-xs text-muted-foreground">
                  Um convite será enviado para o e-mail informado.
                </p>
              </div>
            )}

            {dialogType === 'impersonate' && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    placeholder="Descreva o motivo da impersonação..."
                    value={impersonateReason}
                    onChange={(e) => setImpersonateReason(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Esta ação será registrada no log de auditoria.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={
                  dialogType === 'workspace' ? handleSaveWorkspace :
                  dialogType === 'system' ? handleSaveSystemRole :
                  dialogType === 'create' ? handleCreateUser :
                  handleImpersonate
                }
                disabled={
                  saving || 
                  (dialogType === 'workspace' && !selectedWorkspace) ||
                  (dialogType === 'create' && (!newUserEmail || !newUserWorkspace))
                }
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {dialogType === 'impersonate' ? 'Iniciar Impersonação' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperadminRoute>
  );
}
