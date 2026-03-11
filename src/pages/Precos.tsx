import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { 
  useBestPrice, 
  usePriceHistory,
  usePracasWithPrices,
  MARKET_CROPS,
  type MarketPraca 
} from "@/hooks/useMarket";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PERIOD_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

export default function PrecosPage() {
  const [crop, setCrop] = useState("soja");
  const [pracaId, setPracaId] = useState<string>("");
  const [periodDays, setPeriodDays] = useState(90);
  const [pracaSearch, setPracaSearch] = useState("");
  const [pracaPopoverOpen, setPracaPopoverOpen] = useState(false);

  // Fetch pracas that have prices for the selected crop
  const { data: allPracas, isLoading: loadingPracas } = usePracasWithPrices(crop);

  // Auto-select first praça when crop changes or praças load
  useEffect(() => {
    if (!allPracas || allPracas.length === 0) {
      setPracaId("");
      return;
    }
    // If current praça is not in the list, select the first one
    const currentExists = allPracas.some(p => p.id === pracaId);
    if (!currentExists) {
      setPracaId(allPracas[0].id);
    }
  }, [allPracas]);
  
  // Fetch best price
  const { data: bestPrice, isLoading: loadingPrice, refetch: refetchPrice } = useBestPrice(
    crop, 
    pracaId || null
  );
  
  // Fetch price history
  const { data: priceHistory, isLoading: loadingHistory, refetch: refetchHistory } = usePriceHistory(
    crop,
    pracaId || null,
    periodDays
  );

  // Filter pracas based on search
  const filteredPracas = useMemo(() => {
    if (!allPracas) return [];
    if (!pracaSearch) return allPracas;
    
    const search = pracaSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return allPracas.filter(p => {
      const name = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const state = p.state.toLowerCase();
      return name.includes(search) || state.includes(search);
    });
  }, [allPracas, pracaSearch]);

  // Find selected praca
  const selectedPraca = useMemo(() => {
    return allPracas?.find(p => p.id === pracaId);
  }, [allPracas, pracaId]);

  // Get crop label
  const cropLabel = MARKET_CROPS.find(c => c.value === crop)?.label || crop;

  const handleRefresh = () => {
    refetchPrice();
    refetchHistory();
    toast.success("Dados atualizados");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Preços de Culturas</h1>
        <p className="text-muted-foreground">Acompanhe os preços das principais commodities agrícolas por praça</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione a cultura, praça e período desejado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Crop selector */}
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger>
                <SelectValue placeholder="Cultura" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_CROPS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Praça selector with search */}
            <Popover open={pracaPopoverOpen} onOpenChange={setPracaPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="justify-between font-normal"
                  disabled={loadingPracas}
                >
                  {loadingPracas ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedPraca ? (
                    `${selectedPraca.name}/${selectedPraca.state}`
                  ) : (
                    <span className="text-muted-foreground">Selecione a praça</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar praça..." 
                    value={pracaSearch}
                    onValueChange={setPracaSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhuma praça encontrada</CommandEmpty>
                    <CommandGroup>
                      {filteredPracas.slice(0, 20).map((praca: MarketPraca) => (
                        <CommandItem
                          key={praca.id}
                          value={`${praca.name}/${praca.state}`}
                          onSelect={() => {
                            setPracaId(praca.id);
                            setPracaPopoverOpen(false);
                            setPracaSearch("");
                          }}
                        >
                          {praca.name}/{praca.state}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Period selector */}
            <Select value={periodDays.toString()} onValueChange={(v) => setPeriodDays(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleRefresh} disabled={loadingPrice || loadingHistory || !pracaId}>
              {(loadingPrice || loadingHistory) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Preço Atual</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPrice ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : bestPrice && bestPrice.status !== 'indisponivel' && bestPrice.price ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">
                  R$ {Number(bestPrice.price).toFixed(2)}/{bestPrice.unit?.replace('R$/', '') || 'saca'}
                </div>
                <Badge variant={bestPrice.status === 'atualizado' ? 'default' : 'secondary'}>
                  {bestPrice.status === 'atualizado' ? 'Atualizado' : 'Referência'}
                </Badge>
                {bestPrice.captured_at && (
                  <p className="text-xs text-muted-foreground">
                    Capturado em: {new Date(bestPrice.captured_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">
                {pracaId ? "Sem dados disponíveis" : "Selecione uma praça"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Média do Período</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : priceHistory && priceHistory.length > 0 ? (
              <div className="text-2xl font-bold text-foreground">
                R$ {(priceHistory.reduce((sum, p) => sum + Number(p.price), 0) / priceHistory.length).toFixed(2)}/saca
              </div>
            ) : (
              <div className="text-muted-foreground">
                {pracaId ? "Sem histórico" : "—"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fonte dos Dados</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPrice ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : bestPrice && bestPrice.source ? (
              <div className="text-2xl font-bold text-foreground">
                {formatSource(bestPrice.source)}
              </div>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução de Preços
            {selectedPraca && (
              <span className="font-normal text-muted-foreground text-base">
                — {cropLabel} em {selectedPraca.name}/{selectedPraca.state}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PriceMiniChart data={priceHistory || []} />
          )}
        </CardContent>
      </Card>

      {/* Price history table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Preços</CardTitle>
          {priceHistory && priceHistory.length > 0 && (
            <CardDescription>
              {priceHistory.length} registro{priceHistory.length !== 1 ? 's' : ''} nos últimos {periodDays} dias
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!priceHistory || priceHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {pracaId ? "Nenhum dado disponível para o período selecionado" : "Selecione uma praça para ver o histórico"}
                    </TableCell>
                  </TableRow>
                ) : (
                  priceHistory.slice().reverse().slice(0, 50).map((r, i) => (
                    <TableRow key={`${r.captured_at}-${i}`}>
                      <TableCell>
                        {new Date(r.captured_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>R$ {Number(r.price).toFixed(2)}</TableCell>
                      <TableCell>{r.unit || 'R$/saca'}</TableCell>
                      <TableCell>{formatSource(r.source)}</TableCell>
                    </TableRow>
                  ))
                )}
                {priceHistory && priceHistory.length > 50 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-2">
                      Mostrando os últimos 50 registros de {priceHistory.length} total
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertCreator crop={crop} pracaId={pracaId} pracaName={selectedPraca ? `${selectedPraca.name}/${selectedPraca.state}` : ''} />
    </div>
  );
}

function formatSource(source: string): string {
  const sourceMap: Record<string, string> = {
    'manual_admin': 'Manual (Admin)',
    'referencia_media': 'Média Referência',
    'api_externa': 'API Externa',
    'importacao': 'Importação',
  };
  return sourceMap[source] || source;
}

type PriceHistoryRow = { captured_at: string; price: number; source: string; unit: string };

function PriceMiniChart({ data }: { data: PriceHistoryRow[] }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        Sem dados para exibir no período selecionado
      </div>
    );
  }

  // Optimize: reduce chart points for performance
  const maxPoints = 100;
  const step = Math.ceil(data.length / maxPoints);
  const sampledData = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  const w = 640;
  const h = 200;
  const pad = 32;
  const xs = sampledData.map(d => new Date(d.captured_at).getTime());
  const ys = sampledData.map(d => Number(d.price));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys) * 0.98;
  const maxY = Math.max(...ys) * 1.02;
  const normX = (t: number) => pad + (t - minX) / Math.max(1, (maxX - minX)) * (w - pad * 2);
  const normY = (v: number) => h - pad - (v - minY) / Math.max(1, (maxY - minY)) * (h - pad * 2);
  const path = sampledData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${normX(new Date(d.captured_at).getTime())} ${normY(Number(d.price))}`).join(" ");

  // Show min/max labels
  const minPrice = Math.min(...ys);
  const maxPrice = Math.max(...ys);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ willChange: 'auto' }}>
        {/* Grid lines */}
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="hsl(var(--border))" strokeWidth={1} />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="hsl(var(--border))" strokeWidth={1} />
        
        {/* Price line */}
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        
        {/* Points for single data */}
        {data.length === 1 && (
          <circle cx={normX(xs[0])} cy={normY(ys[0])} r={6} fill="hsl(var(--primary))" />
        )}
        
        {/* Min/Max labels */}
        <text x={pad - 4} y={normY(maxPrice)} fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="end" dominantBaseline="middle">
          R$ {maxPrice.toFixed(0)}
        </text>
        <text x={pad - 4} y={normY(minPrice)} fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="end" dominantBaseline="middle">
          R$ {minPrice.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}

function AlertCreator({ crop, pracaId, pracaName }: { crop: string; pracaId: string; pracaName: string }) {
  const { user } = useAuth();
  const [condition, setCondition] = useState(">=");
  const [threshold, setThreshold] = useState<number>(0);

  const save = async () => {
    if (!user) {
      toast.error("Você precisa estar autenticado para criar alertas");
      return;
    }

    if (!pracaId) {
      toast.error("Selecione uma praça primeiro");
      return;
    }

    const { error } = await supabase.from("price_alerts").insert({
      user_id: user.id,
      product: crop,
      market: pracaId,
      condition,
      threshold
    });

    if (error) {
      console.error(error);
      toast.error("Erro ao salvar alerta");
      return;
    }

    toast.success("Alerta criado com sucesso!");
    setThreshold(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Alerta de Preço</CardTitle>
        <CardDescription>
          Receba notificações quando o preço atingir um determinado valor (funcionalidade em desenvolvimento)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger>
              <SelectValue placeholder="Condição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=">=">Maior ou igual</SelectItem>
              <SelectItem value="<=">Menor ou igual</SelectItem>
              <SelectItem value="pct_up">Variação % acima</SelectItem>
              <SelectItem value="pct_down">Variação % abaixo</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            step="0.01"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            placeholder="Valor/Percentual"
          />

          <Button onClick={save} disabled={!pracaId}>
            Salvar Alerta
          </Button>
        </div>
        {pracaName && (
          <p className="text-sm text-muted-foreground mt-2">
            Alerta para: {MARKET_CROPS.find(c => c.value === crop)?.label || crop} em {pracaName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}