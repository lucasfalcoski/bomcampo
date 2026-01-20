import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { Plus, Search, MapPin, Edit } from "lucide-react";
import { useMarketPracas, useMarketPracaMutation, BRAZILIAN_STATES, type MarketPraca } from "@/hooks/useMarket";

export default function MarketPracas() {
  const [stateFilter, setStateFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPraca, setEditingPraca] = useState<MarketPraca | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formState, setFormState] = useState("");
  const [formActive, setFormActive] = useState(true);

  const { data: pracas, isLoading } = useMarketPracas(stateFilter || undefined, false);
  const { create, update } = useMarketPracaMutation();

  const filteredPracas = pracas?.filter(p => 
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleOpenDialog = (praca?: MarketPraca) => {
    if (praca) {
      setEditingPraca(praca);
      setFormName(praca.name);
      setFormState(praca.state);
      setFormActive(praca.is_active);
    } else {
      setEditingPraca(null);
      setFormName("");
      setFormState("");
      setFormActive(true);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formState) return;

    if (editingPraca) {
      await update.mutateAsync({
        id: editingPraca.id,
        name: formName.trim(),
        state: formState,
        is_active: formActive,
      });
    } else {
      await create.mutateAsync({
        name: formName.trim(),
        state: formState,
        country: "BR",
        is_active: formActive,
      });
    }
    
    setDialogOpen(false);
  };

  const handleToggleActive = async (praca: MarketPraca) => {
    await update.mutateAsync({
      id: praca.id,
      is_active: !praca.is_active,
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando praças..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Praças de Mercado
          </h1>
          <p className="text-muted-foreground">Gerencie as praças para cotações de commodities</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Praça
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPraca ? 'Editar Praça' : 'Nova Praça'}</DialogTitle>
              <DialogDescription>
                {editingPraca ? 'Edite os dados da praça' : 'Adicione uma nova praça de mercado'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Praça</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Ribeirão Preto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Select value={formState} onValueChange={setFormState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map(state => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label} ({state.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formActive}
                  onCheckedChange={setFormActive}
                />
                <Label htmlFor="active">Praça ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!formName.trim() || !formState || create.isPending || update.isPending}
              >
                {editingPraca ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre as praças por estado ou nome</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os estados</SelectItem>
                {BRAZILIAN_STATES.map(state => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Praças Cadastradas</CardTitle>
          <CardDescription>
            {filteredPracas.length} praça{filteredPracas.length !== 1 ? 's' : ''} encontrada{filteredPracas.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPracas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhuma praça encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPracas.map(praca => (
                    <TableRow key={praca.id}>
                      <TableCell className="font-medium">{praca.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{praca.state}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={praca.is_active}
                            onCheckedChange={() => handleToggleActive(praca)}
                          />
                          <span className={praca.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                            {praca.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(praca)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
