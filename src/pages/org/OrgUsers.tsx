import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Plus, Trash2, RefreshCw, ShieldX, MailPlus, Clock } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentWorkspace, useWorkspaceMembers, WorkspaceMember } from '@/hooks/useWorkspacePanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkspaceRole = Database['public']['Enums']['workspace_role'];

interface WorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  sent_at: string;
  last_resent_at: string | null;
}

export default function OrgUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { loading: loadingWs, workspace, isAdmin } = useCurrentWorkspace();
  const { loading, members, addMember, updateMemberRole, removeMember, refresh } = useWorkspaceMembers(workspace?.id);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('viewer');
  const [saving, setSaving] = useState(false);
  
  // Invites
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!workspace?.id) return;
    setLoadingInvites(true);

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('id, email, role, status, sent_at, last_resent_at')
        .eq('workspace_id', workspace.id)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (err) {
      console.error('[loadInvites] Error:', err);
    } finally {
      setLoadingInvites(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleAddMember = async () => {
    if (!workspace?.id || !user?.id) return;
    setSaving(true);

    try {
      // First try to add existing user
      const success = await addMember(email, role);
      
      if (!success) {
        // User doesn't exist, create invite
        const { error } = await supabase
          .from('workspace_invites')
          .insert({
            email,
            workspace_id: workspace.id,
            role,
            invited_by_user_id: user.id,
          });

        if (error) throw error;

        // Send magic link
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        toast({ 
          title: 'Convite enviado', 
          description: `E-mail de convite enviado para ${email}` 
        });
        loadInvites();
      }

      setDialogOpen(false);
      setEmail('');
      setRole('viewer');
    } catch (err: any) {
      toast({ 
        title: 'Erro ao convidar', 
        description: err.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (invite: WorkspaceInvite) => {
    try {
      await supabase
        .from('workspace_invites')
        .update({ last_resent_at: new Date().toISOString() })
        .eq('id', invite.id);

      await supabase.auth.signInWithOtp({
        email: invite.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      toast({ title: 'Convite reenviado' });
      loadInvites();
    } catch (err) {
      toast({ title: 'Erro ao reenviar convite', variant: 'destructive' });
    }
  };

  const handleCancelInvite = async (invite: WorkspaceInvite) => {
    if (!confirm(`Cancelar convite para ${invite.email}?`)) return;

    try {
      await supabase
        .from('workspace_invites')
        .update({ status: 'cancelled' })
        .eq('id', invite.id);

      toast({ title: 'Convite cancelado' });
      loadInvites();
    } catch (err) {
      toast({ title: 'Erro ao cancelar convite', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: WorkspaceRole) => {
    await updateMemberRole(userId, newRole);
  };

  const handleRemove = async (member: WorkspaceMember) => {
    if (confirm(`Remover ${member.email} do workspace?`)) {
      await removeMember(member.user_id);
    }
  };

  const getRoleBadge = (role: WorkspaceRole) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      operator: 'bg-green-100 text-green-700',
      agronomist: 'bg-orange-100 text-orange-700',
      viewer: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[role] || ''}>{role}</Badge>;
  };

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
          <h1 className="text-2xl font-bold">Membros do Workspace</h1>
          <p className="text-muted-foreground">Gerencie os usuários de {workspace.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refresh(); loadInvites(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Membros ({members.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="invites">
              <Clock className="h-4 w-4 mr-2" />
              Convites ({invites.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membros
              </CardTitle>
              <CardDescription>{members.length} membros no workspace</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && members.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Desde</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell className="font-medium">{member.email}</TableCell>
                        <TableCell>{member.nome || '-'}</TableCell>
                        <TableCell>
                          {isAdmin && member.role !== 'owner' ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleUpdateRole(member.user_id, value as WorkspaceRole)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="operator">Operator</SelectItem>
                                <SelectItem value="agronomist">Agronomist</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getRoleBadge(member.role)
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(member.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {member.role !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(member)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {members.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum membro encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
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
                        <TableHead>Role</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Último reenvio</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>{getRoleBadge(invite.role)}</TableCell>
                          <TableCell>
                            {new Date(invite.sent_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {invite.last_resent_at 
                              ? new Date(invite.last_resent_at).toLocaleDateString('pt-BR')
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
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Se o usuário já tiver conta, será adicionado diretamente. Caso contrário, receberá um convite por e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email do usuário</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="agronomist">Agronomist</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={saving || !email}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Convidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
