import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, FileText, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' } as any);
};

export default function Relatorios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const [filters, setFilters] = useState({
    farm_id: '',
    plot_id: 'all',
    periodo: 'mes_atual',
    data_inicio: '',
    data_fim: '',
    tipo: 'financeiro' as 'financeiro' | 'operacional',
  });

  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (filters.farm_id) {
      loadPlots();
    }
  }, [filters.farm_id]);

  const loadFarms = async () => {
    const { data } = await supabase.from('farms').select('*').order('nome');
    setFarms(data || []);
    if (data && data.length > 0 && !filters.farm_id) {
      setFilters(prev => ({ ...prev, farm_id: data[0].id }));
    }
  };

  const loadPlots = async () => {
    const { data } = await supabase.from('plots').select('*').eq('farm_id', filters.farm_id).order('nome');
    setPlots(data || []);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (filters.periodo) {
      case 'mes_atual':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'ano_atual':
        return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
      case 'intervalo':
        return { start: filters.data_inicio, end: filters.data_fim };
      default:
        return { start: null, end: null };
    }
  };

  const handleGenerateReport = async () => {
    if (!filters.farm_id) {
      toast({ title: 'Selecione uma fazenda', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { start, end } = getDateRange();

    if (filters.tipo === 'financeiro') {
      await loadFinancialReport(start!, end!);
    } else {
      await loadOperationalReport(start!, end!);
    }

    setLoading(false);
  };

  const loadFinancialReport = async (start: string, end: string) => {
    let query = supabase.from('transactions').select('*').eq('farm_id', filters.farm_id);
    if (filters.plot_id !== 'all') query = query.eq('plot_id', filters.plot_id);
    query = query.gte('data', start).lte('data', end).order('data', { ascending: false });

    const { data: transactions } = await query;

    const custos = (transactions || []).filter(t => t.tipo === 'custo').reduce((sum, t) => sum + t.valor_brl, 0);
    const receitas = (transactions || []).filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor_brl, 0);

    const custosM = (transactions || []).filter(t => {
      const data = new Date(t.data);
      return t.tipo === 'custo' && data >= startOfMonth(new Date()) && data <= endOfMonth(new Date());
    }).reduce((sum, t) => sum + t.valor_brl, 0);

    const receitasM = (transactions || []).filter(t => {
      const data = new Date(t.data);
      return t.tipo === 'receita' && data >= startOfMonth(new Date()) && data <= endOfMonth(new Date());
    }).reduce((sum, t) => sum + t.valor_brl, 0);

    const porCategoria = (transactions || []).filter(t => t.tipo === 'custo').reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor_brl;
      return acc;
    }, {} as Record<string, number>);

    const topCategorias = Object.entries(porCategoria)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);

    setReportData({
      tipo: 'financeiro',
      periodo: { start, end },
      kpis: {
        custosMes: custosM,
        receitasMes: receitasM,
        resultadoMes: receitasM - custosM,
        custosYTD: custos,
        receitasYTD: receitas,
        resultadoYTD: receitas - custos,
      },
      transactions,
      topCategorias,
    });
  };

  const loadOperationalReport = async (start: string, end: string) => {
    const { data: plotsData } = await supabase
      .from('plots')
      .select('*')
      .eq('farm_id', filters.farm_id);

    const plotIds = (plotsData || []).map(p => p.id);

    const { data: plantings } = await supabase
      .from('plantings')
      .select('*, crop:crops(*)')
      .in('plot_id', plotIds)
      .eq('status', 'em_andamento');

    const areaCultivada = (plantings || []).reduce((sum, p) => {
      const plot = plotsData?.find(pl => pl.id === p.plot_id);
      return sum + (plot?.area_ha || 0);
    }, 0);

    const dapMedio = (plantings || []).reduce((sum, p) => {
      const days = Math.floor((Date.now() - new Date(p.data_plantio).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / ((plantings || []).length || 1);

    const producaoEsperada = (plantings || []).reduce((sum, p) => {
      const plot = plotsData?.find(pl => pl.id === p.plot_id);
      return sum + ((plot?.area_ha || 0) * (p.expectativa_sacas_ha || 0));
    }, 0);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .in('plot_id', plotIds)
      .eq('realizado', false)
      .gte('data', format(now, 'yyyy-MM-dd'))
      .lte('data', format(futureDate, 'yyyy-MM-dd'))
      .order('data');

    setReportData({
      tipo: 'operacional',
      periodo: { start, end },
      kpis: {
        areaCultivada,
        plantiosEmAndamento: (plantings || []).length,
        dapMedio: Math.round(dapMedio),
        producaoEsperada,
      },
      activities,
      plantings,
    });
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      toast({ title: 'Gere um relatório primeiro', variant: 'destructive' });
      return;
    }

    setGeneratingPDF(true);

    try {
      const farm = farms.find(f => f.id === filters.farm_id);
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: {
          reportData,
          farm: { nome: farm?.nome },
          filters,
        },
      });

      if (error) throw error;

      const blob = new Blob([new Uint8Array(data.pdf.data)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${filters.tipo}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Gere relatórios financeiros e operacionais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configure os parâmetros do relatório</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fazenda *</Label>
              <Select value={filters.farm_id} onValueChange={v => setFilters({ ...filters, farm_id: v, plot_id: 'all' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Talhão</Label>
              <Select value={filters.plot_id} onValueChange={v => setFilters({ ...filters, plot_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {plots.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={filters.tipo} onValueChange={(v: 'financeiro' | 'operacional') => setFilters({ ...filters, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filters.periodo} onValueChange={v => setFilters({ ...filters, periodo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="ano_atual">Ano Atual</SelectItem>
                  <SelectItem value="intervalo">Intervalo Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filters.periodo === 'intervalo' && (
              <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input type="date" value={filters.data_inicio} onChange={e => setFilters({ ...filters, data_inicio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={filters.data_fim} onChange={e => setFilters({ ...filters, data_fim: e.target.value })} />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleGenerateReport} disabled={loading || !filters.farm_id}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>

            {reportData && (
              <Button variant="outline" onClick={handleExportPDF} disabled={generatingPDF}>
                {generatingPDF && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>
              {reportData.tipo === 'financeiro' ? 'Relatório Financeiro' : 'Relatório Operacional'}
            </CardTitle>
            <CardDescription>
              Período: {format(new Date(reportData.periodo.start), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
              {format(new Date(reportData.periodo.end), 'dd/MM/yyyy', { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {reportData.tipo === 'financeiro' ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Custos (Mês / YTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {formatCurrency(reportData.kpis.custosMes)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ano: {formatCurrency(reportData.kpis.custosYTD)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Receitas (Mês / YTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">
                        {formatCurrency(reportData.kpis.receitasMes)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ano: {formatCurrency(reportData.kpis.receitasYTD)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Resultado (Mês / YTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${reportData.kpis.resultadoMes >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(reportData.kpis.resultadoMes)}
                      </div>
                      <p className={`text-xs ${reportData.kpis.resultadoYTD >= 0 ? 'text-success' : 'text-destructive'}`}>
                        Ano: {formatCurrency(reportData.kpis.resultadoYTD)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Top 5 Categorias de Custo</h3>
                  <div className="space-y-2">
                    {reportData.topCategorias.map(([cat, val]: [string, number]) => (
                      <div key={cat} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="capitalize">{cat.replace('_', ' ')}</span>
                        <span className="font-medium">{formatCurrency(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Área Cultivada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.kpis.areaCultivada.toFixed(2)} ha</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Plantios em Andamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.kpis.plantiosEmAndamento}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">DAP Médio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.kpis.dapMedio} dias</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Produção Esperada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.kpis.producaoEsperada.toFixed(0)} sacas</div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Atividades Futuras (Próximos 30 dias)</h3>
                  {reportData.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma atividade programada</p>
                  ) : (
                    <div className="space-y-2">
                      {reportData.activities.map((act: any) => (
                        <div key={act.id} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div>
                            <div className="font-medium">{act.tipo}</div>
                            <div className="text-sm text-muted-foreground">
                              {act.descricao} • {format(new Date(act.data), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </div>
                          {act.custo_estimado && (
                            <div className="font-medium">{formatCurrency(act.custo_estimado)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
