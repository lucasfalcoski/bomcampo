import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Users, Building2, ArrowLeft, Copy, Check, UserPlus, UserMinus, ArrowUpDown, MessageSquare, Sparkles } from 'lucide-react';
import { usePartnersAdmin } from '@/hooks/usePartnersAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const PARTNER_TYPES = [
  { value: 'industria', label: 'Indústria' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'outro', label: 'Outro' },
];

const ROLE_LABELS: Record<string, string> = {
  partner_admin: 'Administrador',
  partner_agronomist: 'Agrônomo',
  produtor: 'Produtor',
};

export default function Parceiros() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    loading,
    isSystemAdmin,
    partners,
    partnerMetrics,
    selectedPartner,
    partnerUsers,
    loadingUsers,
    createPartner,
    selectPartner,
    setSelectedPartner,
    addUserToPartner,
    linkProducerToPartner,
    unlinkProducerFromPartner,
    updateUserRole,
    removeUserFromPartner,
  } = usePartnersAdmin();

  // Form state for new partner
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerType, setNewPartnerType] = useState('');
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [showNewPartnerDialog, setShowNewPartnerDialog] = useState(false);

  // Form state for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'partner_admin' | 'partner_agronomist'>('partner_agronomist');
  const [addingUser, setAddingUser] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  // Form state for link/unlink producer
  const [producerEmail, setProducerEmail] = useState('');
  const [linkingProducer, setLinkingProducer] = useState(false);
  const [showLinkProducerDialog, setShowLinkProducerDialog] = useState(false);
  const [unlinkProducerEmail, setUnlinkProducerEmail] = useState('');
  const [unlinkingProducer, setUnlinkingProducer] = useState(false);
  const [showUnlinkProducerDialog, setShowUnlinkProducerDialog] = useState(false);

  // Confirmation dialogs
  const [userToRemove, setUserToRemove] = useState<{ id: string; email: string; roles: string[] } | null>(null);
  const [removingUser, setRemovingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Copy states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedOnboarding, setCopiedOnboarding] = useState(false);

  // Redirect if not system_admin
  useEffect(() => {
    if (!loading && !isSystemAdmin) {
      navigate('/');
    }
  }, [loading, isSystemAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSystemAdmin) {
    return null;
  }

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast({
      title: 'ID copiado',
      description: 'O ID do parceiro foi copiado para a área de transferência.',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyOnboardingText = async () => {
    if (!selectedPartner) return;
    
    const text = `Olá! Para participar do programa da ${selectedPartner.name} no Bom Campo:

1. Baixe/abra o Bom Campo e crie sua conta com seu e-mail.
2. Envie seu e-mail para nosso time para vinculação ao programa.
3. Após vinculado, você verá o "Canal Técnico da ${selectedPartner.name}" no menu Fala Agrônomo.

Qualquer dúvida, responda esta mensagem.`;

    await navigator.clipboard.writeText(text);
    setCopiedOnboarding(true);
    toast({
      title: 'Texto copiado',
      description: 'Texto de onboarding copiado para a área de transferência.',
    });
    setTimeout(() => setCopiedOnboarding(false), 2000);
  };

  const handleCreatePartner = async () => {
    if (!newPartnerName.trim() || !newPartnerType) return;
    
    setCreatingPartner(true);
    const success = await createPartner(newPartnerName.trim(), newPartnerType);
    setCreatingPartner(false);

    if (success) {
      setNewPartnerName('');
      setNewPartnerType('');
      setShowNewPartnerDialog(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserRole) return;

    // Security: Only allow partner_admin or partner_agronomist
    if (newUserRole !== 'partner_admin' && newUserRole !== 'partner_agronomist') {
      toast({
        title: 'Ação não permitida',
        description: 'Só é possível adicionar usuários como Administrador ou Agrônomo do parceiro.',
        variant: 'destructive',
      });
      return;
    }

    setAddingUser(true);
    const success = await addUserToPartner(newUserEmail.trim(), newUserRole);
    setAddingUser(false);

    if (success) {
      setNewUserEmail('');
      setNewUserRole('partner_agronomist');
      setShowAddUserDialog(false);
    }
  };

  const handleLinkProducer = async () => {
    if (!producerEmail.trim()) return;

    setLinkingProducer(true);
    const success = await linkProducerToPartner(producerEmail.trim());
    setLinkingProducer(false);

    if (success) {
      setProducerEmail('');
      setShowLinkProducerDialog(false);
    }
  };

  const handleUnlinkProducer = async () => {
    if (!unlinkProducerEmail.trim()) return;

    setUnlinkingProducer(true);
    const success = await unlinkProducerFromPartner(unlinkProducerEmail.trim());
    setUnlinkingProducer(false);

    if (success) {
      setUnlinkProducerEmail('');
      setShowUnlinkProducerDialog(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    setRemovingUser(true);
    const result = await removeUserFromPartner(userToRemove.id, userToRemove.roles);
    setRemovingUser(false);
    
    if (result.success) {
      setUserToRemove(null);
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: 'partner_admin' | 'partner_agronomist') => {
    const newRole = currentRole === 'partner_admin' ? 'partner_agronomist' : 'partner_admin';
    setUpdatingRole(userId);
    await updateUserRole(userId, currentRole, newRole);
    setUpdatingRole(null);
  };

  const truncateId = (id: string) => `${id.slice(0, 8)}...`;

  // Partner management view
  if (selectedPartner) {
    const metrics = partnerMetrics[selectedPartner.id];

    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setSelectedPartner(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Kit Piloto Card */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Kit Piloto</CardTitle>
            </div>
            <CardDescription>
              Informações e ferramentas para onboarding de produtores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Partner info */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome do Parceiro</p>
                  <p className="font-semibold text-lg">{selectedPartner.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Partner ID</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {selectedPartner.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyId(selectedPartner.id)}
                    >
                      {copiedId === selectedPartner.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {metrics && (
                  <div className="flex gap-6">
                    <div>
                      <p className="text-2xl font-bold">{metrics.producer_count}</p>
                      <p className="text-sm text-muted-foreground">Produtores vinculados</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{metrics.partner_admin_count + metrics.partner_agronomist_count}</p>
                      <p className="text-sm text-muted-foreground">Usuários internos</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Onboarding text */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Texto de Onboarding</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                  <p>Olá! Para participar do programa da <strong>{selectedPartner.name}</strong> no Bom Campo:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Baixe/abra o Bom Campo e crie sua conta</li>
                    <li>Envie seu e-mail para vinculação</li>
                    <li>Acesse o "Canal Técnico" no menu</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyOnboardingText}
                >
                  {copiedOnboarding ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar texto de onboarding
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Users Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Usuários do Parceiro</CardTitle>
                <CardDescription>
                  Administradores e agrônomos vinculados
                </CardDescription>
              </div>
              <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Usuário ao Parceiro</DialogTitle>
                    <DialogDescription>
                      Adicione um usuário existente como administrador ou agrônomo do parceiro.
                      O usuário precisa estar cadastrado no sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail do usuário</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@exemplo.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Função</Label>
                      <Select
                        value={newUserRole}
                        onValueChange={(v) => setNewUserRole(v as 'partner_admin' | 'partner_agronomist')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="partner_admin">Administrador do Parceiro</SelectItem>
                          <SelectItem value="partner_agronomist">Agrônomo do Parceiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddUser}
                      disabled={addingUser || !newUserEmail.trim()}
                    >
                      {addingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : partnerUsers.filter(u => u.roles.includes('partner_admin') || u.roles.includes('partner_agronomist')).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum usuário vinculado como admin/agrônomo.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="w-[180px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerUsers
                    .filter(u => u.roles.includes('partner_admin') || u.roles.includes('partner_agronomist'))
                    .map((user) => {
                      const partnerRole = user.roles.find(r => r === 'partner_admin' || r === 'partner_agronomist') as 'partner_admin' | 'partner_agronomist' | undefined;
                      
                      return (
                        <TableRow key={user.user_id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {ROLE_LABELS[partnerRole || ''] || partnerRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {partnerRole && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateRole(user.user_id, partnerRole)}
                                  disabled={updatingRole === user.user_id}
                                  title={partnerRole === 'partner_admin' ? 'Rebaixar para Agrônomo' : 'Promover para Admin'}
                                >
                                  {updatingRole === user.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setUserToRemove({ id: user.user_id, email: user.email, roles: user.roles })}
                              >
                                Remover
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Link/Unlink Producer Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Link Producer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Vincular Produtor
              </CardTitle>
              <CardDescription>
                Vincule um produtor existente para que ele veja o conteúdo do parceiro.
                A função dele permanecerá como Produtor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showLinkProducerDialog} onOpenChange={setShowLinkProducerDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Vincular Produtor por E-mail
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vincular Produtor ao Parceiro</DialogTitle>
                    <DialogDescription>
                      O produtor passará a ver o conteúdo exclusivo deste parceiro.
                      A função dele permanece como Produtor.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="producer-email">E-mail do produtor</Label>
                      <Input
                        id="producer-email"
                        type="email"
                        placeholder="produtor@exemplo.com"
                        value={producerEmail}
                        onChange={(e) => setProducerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleLinkProducer}
                      disabled={linkingProducer || !producerEmail.trim()}
                    >
                      {linkingProducer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Vincular
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Unlink Producer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Desvincular Produtor
              </CardTitle>
              <CardDescription>
                Remova o vínculo de um produtor com este parceiro.
                Ele voltará a ver apenas conteúdo B2C.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showUnlinkProducerDialog} onOpenChange={setShowUnlinkProducerDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <UserMinus className="h-4 w-4 mr-2" />
                    Desvincular Produtor por E-mail
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Desvincular Produtor</DialogTitle>
                    <DialogDescription>
                      O produtor deixará de ver o conteúdo exclusivo do parceiro.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="unlink-email">E-mail do produtor</Label>
                      <Input
                        id="unlink-email"
                        type="email"
                        placeholder="produtor@exemplo.com"
                        value={unlinkProducerEmail}
                        onChange={(e) => setUnlinkProducerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleUnlinkProducer}
                      disabled={unlinkingProducer || !unlinkProducerEmail.trim()}
                    >
                      {unlinkingProducer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Desvincular
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Remove User Confirmation Dialog */}
        <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover <strong>{userToRemove?.email}</strong> do parceiro?
                O usuário perderá acesso aos recursos do parceiro e sua função será alterada para Produtor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removingUser}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveUser}
                disabled={removingUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Partners list view
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Parceiros</h1>
          <p className="text-muted-foreground">
            Crie e gerencie parceiros e seus usuários
          </p>
        </div>
        <Dialog open={showNewPartnerDialog} onOpenChange={setShowNewPartnerDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Parceiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Parceiro</DialogTitle>
              <DialogDescription>
                Adicione um novo parceiro ao sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Parceiro</Label>
                <Input
                  id="name"
                  placeholder="Nome da empresa"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={newPartnerType} onValueChange={setNewPartnerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreatePartner}
                disabled={creatingPartner || !newPartnerName.trim() || !newPartnerType}
              >
                {creatingPartner && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Parceiro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {partners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum parceiro cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {partners.map((partner) => {
            const metrics = partnerMetrics[partner.id];
            
            return (
              <Card key={partner.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{partner.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {PARTNER_TYPES.find(t => t.value === partner.type)?.label || partner.type || 'Não especificado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {truncateId(partner.id)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyId(partner.id)}
                        >
                          {copiedId === partner.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {metrics && (
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          <span>{metrics.total_users} usuários</span>
                          <span>•</span>
                          <span>{metrics.partner_admin_count} admins</span>
                          <span>•</span>
                          <span>{metrics.partner_agronomist_count} agrônomos</span>
                          <span>•</span>
                          <span>{metrics.producer_count} produtores</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => selectPartner(partner)}>
                      <Users className="h-4 w-4 mr-2" />
                      Gerenciar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
