import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type SeriesRow = { date: string; price: number; unit: string; source: string };

const PRODUCTS = [
  { id: "soja", label: "Soja" },
  { id: "milho", label: "Milho" },
  { id: "boi", label: "Boi Gordo" },
];

const MARKETS = [
  { id: "CBOT", label: "CBOT (ref. int.)" },
  { id: "MT", label: "Mato Grosso (CONAB)" },
  { id: "PR", label: "Paraná (CONAB)" },
  { id: "SP", label: "São Paulo (CONAB)" },
];

export default function PrecosPage() {
  const [product, setProduct] = useState("soja");
  const [market, setMarket] = useState("CBOT");
  const [days, setDays] = useState(90);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .rpc("get_prices_series", { p_product: product, p_market: market, p_days: days });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar dados de preços");
      return;
    }
    setSeries(data || []);
  };

  useEffect(() => {
    load();
  }, [product, market, days]);

  const last = series[series.length - 1];
  const avg30 = series.slice(-30).reduce((s, r) => s + Number(r.price || 0), 0) / Math.max(1, Math.min(30, series.length));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Preços de Culturas</h1>
        <p className="text-muted-foreground">Acompanhe a evolução dos preços das principais commodities agrícolas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o produto, mercado e período desejado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger>
                <SelectValue placeholder="Mercado" />
              </SelectTrigger>
              <SelectContent>
                {MARKETS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={load} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Atualizar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Preço Atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {last ? `${Number(last.price).toFixed(2)} ${last.unit}` : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Média 30 Dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Number.isFinite(avg30) ? `${avg30.toFixed(2)} ${last?.unit || ""}` : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fonte dos Dados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{last?.source || "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução de Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PriceMiniChart data={series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Preços</CardTitle>
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
                {series.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  series.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(r.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{Number(r.price).toFixed(2)}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell>{r.source}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertCreator product={product} market={market} />
    </div>
  );
}

function PriceMiniChart({ data }: { data: SeriesRow[] }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  const w = 640;
  const h = 200;
  const pad = 24;
  const xs = data.map(d => new Date(d.date).getTime());
  const ys = data.map(d => Number(d.price));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const normX = (t: number) => pad + (t - minX) / Math.max(1, (maxX - minX)) * (w - pad * 2);
  const normY = (v: number) => h - pad - (v - minY) / Math.max(1, (maxY - minY)) * (h - pad * 2);
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${normX(new Date(d.date).getTime())} ${normY(Number(d.price))}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
    </svg>
  );
}

function AlertCreator({ product, market }: { product: string; market: string }) {
  const { user } = useAuth();
  const [condition, setCondition] = useState(">=");
  const [threshold, setThreshold] = useState<number>(0);

  const save = async () => {
    if (!user) {
      toast.error("Você precisa estar autenticado para criar alertas");
      return;
    }

    const { error } = await supabase.from("price_alerts").insert({
      user_id: user.id,
      product,
      market,
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

          <Button onClick={save}>
            Salvar Alerta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
