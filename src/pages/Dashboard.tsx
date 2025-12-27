import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, TrendingUp, DollarSign, Cloud, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard } from '@/components/OnboardingWizard';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' } as any);
};

export default function Dashboard() {
  const { user } = useAuth();
  const {
    hasCompletedOnboarding,
    hasFarms,
    hasPlots,
    pushEnabled,
    loading: onboardingLoading,
    requestPushPermission,
    completeOnboarding,
    checkOnboardingStatus,
  } = useOnboarding();

  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [periodo, setPeriodo] = useState<'mes_atual' | 'ano_atual'>('mes_atual');
  const [plots, setPlots] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      loadData();
    }
  }, [selectedFarm, periodo]);

  const loadFarms = async () => {
    const { data } = await supabase.from('farms').select('*').order('nome');
    setFarms(data || []);
    if (data && data.length > 0 && !selectedFarm) {
      setSelectedFarm(data[0].id);
    }
  };

  const loadData = async () => {
    await Promise.all([
      loadPlots(),
      loadPlantings(),
      loadTransactions(),
      loadActivities(),
      loadWeather(),
    ]);
  };

  const loadPlots = async () => {
    const { data } = await supabase.from('plots').select('*').eq('farm_id', selectedFarm);
    setPlots(data || []);
  };

  const loadPlantings = async () => {
    const { data } = await supabase
      .from('plantings')
      .select('*, crop:crops(*), plot:plots(*)')
      .eq('plot.farm_id', selectedFarm)
      .in('status', ['planejado', 'em_andamento']);
    setPlantings(data || []);
  };

  const loadTransactions = async () => {
    const { start, end } = getDateRange();
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('farm_id', selectedFarm)
      .gte('data', start)
      .lte('data', end);
    setTransactions(data || []);
  };

  const loadActivities = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: plotsData } = await supabase.from('plots').select('id').eq('farm_id', selectedFarm);
    
    if (plotsData && plotsData.length > 0) {
      const plotIds = plotsData.map(p => p.id);
      const { data } = await supabase
        .from('activities')
        .select('*, plot:plots(nome)')
        .in('plot_id', plotIds)
        .eq('realizado', false)
        .gte('data', today)
        .order('data')
        .limit(10);
      setActivities(data || []);
    }
  };

  const loadWeather = async () => {
    const farm = farms.find(f => f.id === selectedFarm);
    const firstPlot = plots.find(p => p.latitude && p.longitude);
    
    if (!firstPlot?.latitude || !firstPlot?.longitude) return;

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${firstPlot.latitude}&longitude=${firstPlot.longitude}&daily=precipitation_sum,precipitation_probability_max&timezone=America/Sao_Paulo&forecast_days=7`
      );
      const data = await response.json();
      
      const precipTotal = data.daily.precipitation_sum.slice(0, 7).reduce((a: number, b: number) => a + b, 0);
      const precipProb3Days = Math.max(...data.daily.precipitation_probability_max.slice(0, 3));
      
      setWeather({
        precipitacao7Dias: precipTotal,
        riscoChuva3Dias: precipProb3Days > 60 ? 'alto' : precipProb3Days > 30 ? 'médio' : 'baixo',
      });
    } catch (error) {
      console.error('Erro ao carregar clima:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    if (periodo === 'mes_atual') {
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
    return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
  };

  const kpis = useMemo(() => {
    const areaCultivada = plantings.reduce((sum, p) => sum + (p.plot?.area_ha || 0), 0);
    
    const custos = transactions.filter(t => t.tipo === 'custo').reduce((sum, t) => sum + t.valor_brl, 0);
    const receitas = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor_brl, 0);
    const resultado = receitas - custos;

    return { areaCultivada, resultado };
  }, [plantings, transactions]);

  const receitaCustoYTD = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const meses = Array.from({ length: 12 }, (_, i) => i);
    
    return meses.map(mes => {
      const inicio = new Date(anoAtual, mes, 1);
      const fim = endOfMonth(inicio);
      const filtradas = transactions.filter(t => {
        const data = new Date(t.data);
        return data >= inicio && data <= fim;
      });
      const custos = filtradas.filter(t => t.tipo === 'custo').reduce((sum, t) => sum + t.valor_brl, 0);
      const receitas = filtradas.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor_brl, 0);
      return {
        mes: format(inicio, 'MMM', { locale: ptBR }),
        custos,
        receitas,
      };
    });
  }, [transactions]);

  const producaoEsperada = useMemo(() => {
    return plantings.map(p => ({
      nome: p.plot?.nome || 'Talhão',
      cultura: p.crop?.nome || 'Desconhecida',
      sacas: (p.plot?.area_ha || 0) * (p.expectativa_sacas_ha || 0),
    })).filter(p => p.sacas > 0).slice(0, 5);
  }, [plantings]);

  const ACTIVITY_TYPES = {
    pulverizacao: 'Pulverização',
    irrigacao: 'Irrigação',
    adubacao: 'Adubação',
    manejo_fitossanitario: 'Manejo Fitossanitário',
    colheita: 'Colheita',
    outro: 'Outro',
  };

  // Handle onboarding completion and refresh
  const handleOnboardingComplete = () => {
    completeOnboarding();
    loadFarms();
    checkOnboardingStatus();
  };

  // Show onboarding wizard for first-time users
  if (!onboardingLoading && !hasCompletedOnboarding) {
    return (
      <OnboardingWizard
        hasFarms={hasFarms}
        hasPlots={hasPlots}
        pushEnabled={pushEnabled}
        onRequestPush={requestPushPermission}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua propriedade</p>
      </div>

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Fazenda</Label>
          <Select value={selectedFarm} onValueChange={setSelectedFarm}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma fazenda" />
            </SelectTrigger>
            <SelectContent>
              {farms.map(farm => (
                <SelectItem key={farm.id} value={farm.id}>{farm.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Mês Atual</SelectItem>
              <SelectItem value="ano_atual">Ano Atual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fazendas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farms.length}</div>
            <p className="text-xs text-muted-foreground">propriedades cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Área Cultivada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.areaCultivada.toFixed(1)} ha</div>
            <p className="text-xs text-muted-foreground">em produção</p>
          </CardContent>
        </Card>

        {weather && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Precipitação 7 dias</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{weather.precipitacao7Dias.toFixed(1)} mm</div>
                <p className="text-xs text-muted-foreground">previsão acumulada</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risco de Chuva</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    weather.riscoChuva3Dias === 'alto'
                      ? 'destructive'
                      : weather.riscoChuva3Dias === 'médio'
                      ? 'secondary'
                      : 'default'
                  }
                >
                  {weather.riscoChuva3Dias.toUpperCase()}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">próximos 3 dias</p>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado {periodo === 'mes_atual' ? 'MTD' : 'YTD'}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(kpis.resultado)}
            </div>
            <p className="text-xs text-muted-foreground">receitas - custos</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximas Atividades */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Próximas Atividades</CardTitle>
          </div>
          <CardDescription>Atividades pendentes nos próximos dias</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma atividade pendente
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">
                      {ACTIVITY_TYPES[activity.tipo as keyof typeof ACTIVITY_TYPES]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.plot?.nome} • {format(new Date(activity.data), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    {activity.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">{activity.descricao}</p>
                    )}
                  </div>
                  {activity.custo_estimado && (
                    <span className="text-sm font-medium">
                      {formatCurrency(activity.custo_estimado)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita vs Custo YTD</CardTitle>
            <CardDescription>Comparativo mensal do ano atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {receitaCustoYTD.map(item => (
                <div key={item.mes} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.mes}</span>
                    <div className="flex gap-4">
                      <span className="text-success">R$ {item.receitas.toFixed(0)}</span>
                      <span className="text-destructive">R$ {item.custos.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-success"
                      style={{ width: `${item.receitas / (item.receitas + item.custos || 1) * 100}%` }}
                    />
                    <div
                      className="bg-destructive"
                      style={{ width: `${item.custos / (item.receitas + item.custos || 1) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produção Esperada</CardTitle>
            <CardDescription>Por talhão e cultura (em andamento)</CardDescription>
          </CardHeader>
          <CardContent>
            {producaoEsperada.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum plantio em andamento
              </p>
            ) : (
              <div className="space-y-3">
                {producaoEsperada.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {item.nome} - {item.cultura}
                      </span>
                      <span className="text-muted-foreground">{item.sacas.toFixed(1)} sc</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(item.sacas / Math.max(...producaoEsperada.map(p => p.sacas))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
