import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Loader2, MapPin } from 'lucide-react';

export default function Fazendas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [farmForm, setFarmForm] = useState({
    nome: '',
    area_ha: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
  });

  useEffect(() => {
    loadFarms();
  }, [user]);

  const loadFarms = async () => {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('nome');

    if (error) {
      toast({ title: 'Erro ao carregar fazendas', variant: 'destructive' });
      return;
    }

    setFarms(data || []);
  };

  const handleSaveFarm = async () => {
    if (!farmForm.nome.trim()) {
      toast({ title: 'Nome da fazenda é obrigatório', variant: 'destructive' });
      return;
    }

    if (farmForm.area_ha && parseFloat(farmForm.area_ha) <= 0) {
      toast({ title: 'Área deve ser maior que zero', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const data = {
      user_id: user?.id,
      nome: farmForm.nome,
      area_ha: farmForm.area_ha ? parseFloat(farmForm.area_ha) : null,
      cidade: farmForm.cidade || null,
      estado: farmForm.estado || null,
      pais: farmForm.pais || 'Brasil',
    };

    const { error } = editingFarm
      ? await supabase.from('farms').update(data).eq('id', editingFarm.id)
      : await supabase.from('farms').insert([data]);

    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao salvar fazenda', variant: 'destructive' });
      console.error(error);
      return;
    }

    toast({ title: editingFarm ? 'Fazenda atualizada' : 'Fazenda criada' });
    setDialogOpen(false);
    setEditingFarm(null);
    resetForm();
    loadFarms();
  };

  const handleDeleteFarm = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fazenda? Todos os talhões e dados relacionados serão perdidos.')) {
      return;
    }

    const { error } = await supabase.from('farms').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir fazenda', variant: 'destructive' });
      return;
    }

    toast({ title: 'Fazenda excluída' });
    loadFarms();
  };

  const resetForm = () => {
    setFarmForm({
      nome: '',
      area_ha: '',
      cidade: '',
      estado: '',
      pais: 'Brasil',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fazendas</h1>
        <p className="text-muted-foreground">Gerencie suas propriedades rurais</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setEditingFarm(null); resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Fazenda
        </Button>
      </div>

      {farms.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Nenhuma fazenda cadastrada</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Comece cadastrando sua primeira fazenda para gerenciar talhões, plantios e finanças.
              </p>
            </div>
            <Button onClick={() => { setEditingFarm(null); resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeira Fazenda
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {farms.map(farm => (
            <Card key={farm.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{farm.nome}</CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      {farm.area_ha && (
                        <div className="text-sm">
                          <span className="font-medium">Área:</span> {farm.area_ha.toLocaleString('pt-BR')} ha
                        </div>
                      )}
                      {farm.cidade && farm.estado && (
                        <div className="text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {farm.cidade}, {farm.estado}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingFarm(farm);
                        setFarmForm({
                          nome: farm.nome,
                          area_ha: farm.area_ha?.toString() || '',
                          cidade: farm.cidade || '',
                          estado: farm.estado || '',
                          pais: farm.pais || 'Brasil',
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFarm(farm.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Cadastrada em {new Date(farm.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para Criar/Editar Fazenda */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFarm ? 'Editar Fazenda' : 'Nova Fazenda'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da fazenda. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={farmForm.nome}
                onChange={e => setFarmForm({ ...farmForm, nome: e.target.value })}
                placeholder="Ex: Fazenda São João"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_ha">Área (hectares)</Label>
              <Input
                id="area_ha"
                type="number"
                step="0.01"
                min="0"
                value={farmForm.area_ha}
                onChange={e => setFarmForm({ ...farmForm, area_ha: e.target.value })}
                placeholder="Ex: 150.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={farmForm.cidade}
                  onChange={e => setFarmForm({ ...farmForm, cidade: e.target.value })}
                  placeholder="Ex: Campinas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF)</Label>
                <Input
                  id="estado"
                  value={farmForm.estado}
                  onChange={e => setFarmForm({ ...farmForm, estado: e.target.value.toUpperCase() })}
                  placeholder="Ex: SP"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={farmForm.pais}
                onChange={e => setFarmForm({ ...farmForm, pais: e.target.value })}
                placeholder="Brasil"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFarm} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingFarm ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
