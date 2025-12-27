import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Users, Building2, ArrowLeft } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const PARTNER_TYPES = [
  { value: 'industria', label: 'Indústria' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'outro', label: 'Outro' },
];

const ROLE_LABELS: Record<string, string> = {
  partner_admin: 'Administrador',
  partner_agronomist: 'Agrônomo',
};

export default function Parceiros() {
  const navigate = useNavigate();
  const {
    loading,
    isSystemAdmin,
    partners,
    selectedPartner,
    partnerUsers,
    loadingUsers,
    createPartner,
    selectPartner,
    setSelectedPartner,
    addUserToPartner,
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

    setAddingUser(true);
    const success = await addUserToPartner(newUserEmail.trim(), newUserRole);
    setAddingUser(false);

    if (success) {
      setNewUserEmail('');
      setNewUserRole('partner_agronomist');
      setShowAddUserDialog(false);
    }
  };

  // Partner management view
  if (selectedPartner) {
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedPartner.name}
                </CardTitle>
                <CardDescription>
                  Gerencie os usuários deste parceiro
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
                    <DialogTitle>Adicionar Usuário</DialogTitle>
                    <DialogDescription>
                      Adicione um usuário existente ao parceiro.
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
            ) : partnerUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum usuário vinculado a este parceiro.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Funções</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles
                            .filter(r => r === 'partner_admin' || r === 'partner_agronomist')
                            .map((role) => (
                              <Badge key={role} variant="secondary">
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeUserFromPartner(user.user_id)}
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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
          {partners.map((partner) => (
            <Card key={partner.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium">{partner.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {PARTNER_TYPES.find(t => t.value === partner.type)?.label || partner.type || 'Não especificado'}
                  </p>
                </div>
                <Button variant="outline" onClick={() => selectPartner(partner)}>
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
