import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { Plus, TrendingUp, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useMarketPrices, 
  useMarketPracas, 
  useMarketPriceMutation,
  useBestPrice,
  MARKET_CROPS,
  BRAZILIAN_STATES,
  type MarketPraca 
} from "@/hooks/useMarket";

export default function MarketPrices() {
  const [cropFilter, setCropFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [pracaFilter, setPracaFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [formCrop, setFormCrop] = useState("");
  const [formPraca, setFormPraca] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formNote, setFormNote] = useState("");

  const { data: prices, isLoading } = useMarketPrices(cropFilter || undefined, pracaFilter || undefined, 200);
  const { data: allPracas } = useMarketPracas(stateFilter || undefined, true);
  const { create, remove } = useMarketPriceMutation();
  
  // Para preview do preço
  const { data: bestPrice, isLoading: isLoadingBestPrice } = useBestPrice(
    formCrop || null, 
    formPraca || null
  );

  const handleOpenDialog = () => {
    setFormCrop("");
    setFormPraca("");
    setFormPrice("");
    setFormNote("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCrop || !formPraca || !formPrice) return;

    const price = parseFloat(formPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) return;

    await create.mutateAsync({
      crop: formCrop,
      praca_id: formPraca,
      price,
      source: 'manual_admin',
      note: formNote.trim() || undefined,
    });
    
    setDialogOpen(false);
  };

  const handleDelete = async (priceId: string) => {
    if (!confirm('Tem certeza que deseja remover este preço?')) return;
    await remove.mutateAsync(priceId);
  };

  const isExpired = (validUntil: string) => isPast(new Date(validUntil));

  if (isLoading) {
    return <LoadingSpinner message="Carregando preços..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Preços de Mercado
          </h1>
          <p className="text-muted-foreground">Registre e acompanhe preços de commodities por praça</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Preço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Novo Preço</DialogTitle>
              <DialogDescription>
                Informe o preço atual para a commodity e praça selecionada
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="crop">Cultura</Label>
                <Select value={formCrop} onValueChange={setFormCrop}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cultura" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_CROPS.map(crop => (
                      <SelectItem key={crop.value} value={crop.value}>
                        {crop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">Estado (filtro)</Label>
                <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setFormPraca(""); }}>
                  <SelectTrigger>
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
              
              <div className="space-y-2">
                <Label htmlFor="praca">Praça</Label>
                <Select value={formPraca} onValueChange={setFormPraca}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a praça" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPracas?.map((praca: MarketPraca) => (
                      <SelectItem key={praca.id} value={praca.id}>
                        {praca.name}/{praca.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview do preço atual */}
              {formCrop && formPraca && (
                <div className="rounded-md border p-3 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Preço atual desta praça:</p>
                  {isLoadingBestPrice ? (
                    <p className="text-sm">Carregando...</p>
                  ) : bestPrice?.status === 'indisponivel' ? (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Sem preço registrado
                    </p>
                  ) : (
                    <p className="text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      R$ {bestPrice?.price?.toFixed(2)} / {bestPrice?.unit}
                      <Badge variant={bestPrice?.status === 'atualizado' ? 'default' : 'secondary'} className="ml-2">
                        {bestPrice?.status === 'atualizado' ? 'Atualizado' : 'Referência'}
                      </Badge>
                    </p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$ / saca)</Label>
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Ex: 145.50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="note">Observação (opcional)</Label>
                <Textarea
                  id="note"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ex: Fonte: cooperativa X, qualidade padrão"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!formCrop || !formPraca || !formPrice || create.isPending}
              >
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={cropFilter} onValueChange={setCropFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todas as culturas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as culturas</SelectItem>
                {MARKET_CROPS.map(crop => (
                  <SelectItem key={crop.value} value={crop.value}>
                    {crop.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={pracaFilter} onValueChange={setPracaFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Todas as praças" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as praças</SelectItem>
                {allPracas?.map((praca: MarketPraca) => (
                  <SelectItem key={praca.id} value={praca.id}>
                    {praca.name}/{praca.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Preços</CardTitle>
          <CardDescription>
            {prices?.length || 0} registro{(prices?.length || 0) !== 1 ? 's' : ''} encontrado{(prices?.length || 0) !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cultura</TableHead>
                  <TableHead>Praça</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Capturado em</TableHead>
                  <TableHead>Válido até</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!prices || prices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum preço registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  prices.map(price => (
                    <TableRow key={price.id} className={isExpired(price.valid_until) ? 'opacity-60' : ''}>
                      <TableCell>
                        <Badge variant="outline">
                          {MARKET_CROPS.find(c => c.value === price.crop)?.label || price.crop}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {price.praca ? `${price.praca.name}/${price.praca.state}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        R$ {Number(price.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(price.captured_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isExpired(price.valid_until) ? (
                          <span className="text-destructive">Expirado</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(price.valid_until), { addSuffix: true, locale: ptBR })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired(price.valid_until) ? (
                          <Badge variant="secondary">Referência</Badge>
                        ) : (
                          <Badge variant="default">Atualizado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {price.source}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(price.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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
