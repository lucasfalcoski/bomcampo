import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, Thermometer, AlertTriangle, History, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-state';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  alerts: string[];
}

interface WeatherHistoryProps {
  latitude: number;
  longitude: number;
}

// Cache simples (1h por coordenada + período)
const historyCache = new Map<string, { data: HistoryDay[]; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

export function WeatherHistory({ latitude, longitude }: WeatherHistoryProps) {
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(7);
  const [expanded, setExpanded] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!latitude || !longitude) return;

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${days}`;
    const cached = historyCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setHistory(cached.data);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${latitude}&longitude=${longitude}` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
        `&timezone=America/Sao_Paulo`
      );

      if (!response.ok) throw new Error('Erro ao buscar histórico');

      const data = await response.json();
      
      if (!data.daily?.time) {
        setHistory([]);
        return;
      }

      const historyData: HistoryDay[] = data.daily.time.map((date: string, i: number) => {
        const tempMax = data.daily.temperature_2m_max[i];
        const tempMin = data.daily.temperature_2m_min[i];
        const precipitation = data.daily.precipitation_sum[i] || 0;

        // Gerar alertas baseado nos dados
        const alerts: string[] = [];
        
        if (tempMin !== null && tempMin <= 2) {
          alerts.push('Geada');
        }
        if (tempMax !== null && tempMax >= 35) {
          alerts.push('Calor intenso');
        }
        if (precipitation >= 30) {
          alerts.push('Chuva forte');
        } else if (precipitation >= 10) {
          alerts.push('Chuva moderada');
        }

        return {
          date,
          tempMax: tempMax ?? 0,
          tempMin: tempMin ?? 0,
          precipitation,
          alerts,
        };
      }).reverse(); // Mais recente primeiro

      setHistory(historyData);
      historyCache.set(cacheKey, { data: historyData, timestamp: Date.now() });
    } catch (err) {
      console.error('Erro ao carregar histórico climático:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, days]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const togglePeriod = () => {
    setDays(prev => prev === 7 ? 30 : 7);
  };

  if (!latitude || !longitude) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Histórico Climático</CardTitle>
              <CardDescription>Últimos {days} dias</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={togglePeriod}
              disabled={loading}
            >
              {days === 7 ? 'Ver 30 dias' : 'Ver 7 dias'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {loading ? (
            <LoadingSpinner message="Carregando histórico..." className="py-4" />
          ) : error ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar o histórico.
              </p>
              <Button variant="link" size="sm" onClick={loadHistory}>
                Tentar novamente
              </Button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-6">
              <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Sem registros ainda</p>
              <p className="text-xs text-muted-foreground">
                O histórico climático será exibido aqui quando disponível.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {history.map((day) => (
                <div 
                  key={day.date} 
                  className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium">
                      {format(new Date(day.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {format(new Date(day.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 min-w-[80px]">
                      <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-orange-600">{day.tempMax.toFixed(0)}°</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-blue-600">{day.tempMin.toFixed(0)}°</span>
                    </div>

                    <div className="flex items-center gap-1 min-w-[60px]">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <span className={day.precipitation > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                        {day.precipitation.toFixed(1)}mm
                      </span>
                    </div>

                    <div className="flex items-center gap-1 min-w-[100px] justify-end">
                      {day.alerts.length > 0 ? (
                        <div className="flex gap-1 flex-wrap justify-end">
                          {day.alerts.slice(0, 2).map((alert, i) => (
                            <Badge 
                              key={i} 
                              variant={alert.includes('Geada') ? 'destructive' : 'secondary'}
                              className="text-xs px-1.5 py-0"
                            >
                              {alert}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumo do período */}
          {!loading && !error && history.length > 0 && (
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Chuva total</p>
                <p className="text-lg font-semibold text-blue-600">
                  {history.reduce((sum, d) => sum + d.precipitation, 0).toFixed(1)}mm
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Temp. máxima</p>
                <p className="text-lg font-semibold text-orange-600">
                  {Math.max(...history.map(d => d.tempMax)).toFixed(0)}°C
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Temp. mínima</p>
                <p className="text-lg font-semibold text-blue-600">
                  {Math.min(...history.map(d => d.tempMin)).toFixed(0)}°C
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
