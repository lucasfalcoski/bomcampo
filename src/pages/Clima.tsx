import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, CheckCircle, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WeatherData {
  current: {
    temperature: number;
    windSpeed: number;
    humidity: number;
    precipitation: number;
  };
  daily: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    precipProb: number;
  }>;
}

export default function Clima() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [selectedPlot, setSelectedPlot] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      loadPlots(selectedFarm);
    }
  }, [selectedFarm]);

  useEffect(() => {
    if (selectedPlot) {
      loadWeather();
    }
  }, [selectedPlot]);

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

  const loadPlots = async (farmId: string) => {
    const { data, error } = await supabase
      .from('plots')
      .select('*')
      .eq('farm_id', farmId)
      .order('nome');

    if (error) {
      toast({ title: 'Erro ao carregar talhões', variant: 'destructive' });
      return;
    }

    setPlots(data || []);
    setSelectedPlot('');
    setWeather(null);
  };

  const loadWeather = async () => {
    const plot = plots.find(p => p.id === selectedPlot);
    if (!plot?.latitude || !plot?.longitude) {
      toast({ 
        title: 'Coordenadas ausentes',
        description: 'Este talhão não possui coordenadas cadastradas.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${plot.latitude}&longitude=${plot.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=America/Sao_Paulo&forecast_days=7`
      );

      if (!response.ok) throw new Error('Erro ao buscar dados climáticos');

      const data = await response.json();

      setWeather({
        current: {
          temperature: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
        },
        daily: data.daily.time.map((date: string, i: number) => ({
          date,
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          precipitation: data.daily.precipitation_sum[i],
          precipProb: data.daily.precipitation_probability_max[i],
        })),
      });
    } catch (error) {
      toast({ 
        title: 'Erro ao carregar clima',
        description: 'Não foi possível obter os dados meteorológicos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const canSpray = weather ? weather.current.windSpeed < 15 && weather.daily[0].precipProb < 30 : null;
  const diseaseRisk = weather ? weather.current.humidity > 80 && weather.daily[0].precipitation > 5 : null;

  const handleSendEmail = async () => {
    if (!weather || !user?.email) {
      toast({ title: 'Não foi possível enviar o email', variant: 'destructive' });
      return;
    }

    setSendingEmail(true);
    try {
      const farm = farms.find(f => f.id === selectedFarm);
      const plot = plots.find(p => p.id === selectedPlot);

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: `Relatório Climático - ${farm?.nome} - ${plot?.nome}`,
          html: `
            <h1>Relatório Climático</h1>
            <p><strong>Fazenda:</strong> ${farm?.nome}</p>
            <p><strong>Talhão:</strong> ${plot?.nome}</p>
            
            <h2>Condições Atuais</h2>
            <ul>
              <li>Temperatura: ${weather.current.temperature.toFixed(1)}°C</li>
              <li>Vento: ${weather.current.windSpeed.toFixed(1)} km/h</li>
              <li>Umidade: ${weather.current.humidity}%</li>
              <li>Probabilidade de Chuva: ${weather.daily[0].precipProb}%</li>
            </ul>

            <h2>Recomendações</h2>
            <p><strong>Janela de Pulverização:</strong> ${
              canSpray
                ? 'Condições favoráveis (vento baixo e baixa probabilidade de chuva)'
                : 'Condições desfavoráveis (vento alto ou chuva prevista)'
            }</p>
            <p><strong>Risco de Doenças:</strong> ${
              diseaseRisk
                ? 'Alto risco (umidade elevada + chuva)'
                : 'Risco baixo'
            }</p>

            <h2>Previsão 7 Dias</h2>
            <table border="1" cellpadding="5" style="border-collapse: collapse;">
              <tr>
                <th>Dia</th>
                <th>Máx</th>
                <th>Mín</th>
                <th>Chuva</th>
              </tr>
              ${weather.daily.map((day, i) => `
                <tr>
                  <td>${i === 0 ? 'Hoje' : new Date(day.date).toLocaleDateString('pt-BR')}</td>
                  <td>${day.tempMax.toFixed(0)}°C</td>
                  <td>${day.tempMin.toFixed(0)}°C</td>
                  <td>${day.precipitation.toFixed(1)}mm (${day.precipProb}%)</td>
                </tr>
              `).join('')}
            </table>
          `,
        },
      });

      if (error) throw error;

      toast({ title: 'Email enviado com sucesso!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao enviar email', variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clima</h1>
          <p className="text-muted-foreground">Condições meteorológicas e recomendações</p>
        </div>
        {weather && (
          <Button onClick={handleSendEmail} disabled={sendingEmail}>
            {sendingEmail ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Enviar por Email
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Fazenda</label>
          <Select value={selectedFarm} onValueChange={setSelectedFarm}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma fazenda" />
            </SelectTrigger>
            <SelectContent>
              {farms.map(farm => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Talhão</label>
          <Select value={selectedPlot} onValueChange={setSelectedPlot} disabled={!selectedFarm}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um talhão" />
            </SelectTrigger>
            <SelectContent>
              {plots.map(plot => (
                <SelectItem key={plot.id} value={plot.id}>
                  {plot.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && weather && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temperatura</CardTitle>
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{weather.current.temperature.toFixed(1)}°C</div>
                <p className="text-xs text-muted-foreground">
                  Máx: {weather.daily[0].tempMax.toFixed(1)}°C / Mín: {weather.daily[0].tempMin.toFixed(1)}°C
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vento</CardTitle>
                <Wind className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{weather.current.windSpeed.toFixed(1)} km/h</div>
                <p className="text-xs text-muted-foreground">velocidade atual</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Umidade</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{weather.current.humidity}%</div>
                <p className="text-xs text-muted-foreground">umidade relativa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chuva</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{weather.daily[0].precipProb}%</div>
                <p className="text-xs text-muted-foreground">prob. hoje</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recomendações Agrícolas</CardTitle>
              <CardDescription>Análise das condições atuais para atividades de campo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant={canSpray ? 'default' : 'destructive'}>
                {canSpray ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <strong>Janela de Pulverização:</strong>{' '}
                  {canSpray
                    ? 'Condições favoráveis para pulverização (vento baixo e baixa probabilidade de chuva)'
                    : 'Condições desfavoráveis (vento alto ou chuva prevista)'}
                </AlertDescription>
              </Alert>

              <Alert variant={diseaseRisk ? 'destructive' : 'default'}>
                {diseaseRisk ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <strong>Risco de Doenças:</strong>{' '}
                  {diseaseRisk
                    ? 'Alto risco (umidade elevada + chuva). Monitorar culturas e considerar fungicidas preventivos.'
                    : 'Risco baixo. Condições climáticas não favorecem o desenvolvimento de doenças.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previsão 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weather.daily.map((day, i) => (
                  <div key={day.date} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="font-medium">
                      {i === 0 ? 'Hoje' : new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>↑ {day.tempMax.toFixed(0)}°C</span>
                      <span>↓ {day.tempMin.toFixed(0)}°C</span>
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" />
                        {day.precipitation.toFixed(1)}mm ({day.precipProb}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !weather && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione uma fazenda e um talhão para visualizar as condições climáticas
          </CardContent>
        </Card>
      )}
    </div>
  );
}
