import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cloud, Droplets, Wind, Thermometer, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WeatherAlerts } from '@/components/WeatherAlerts';
import { useAgroRecommendations } from '@/hooks/useAgroRecommendations';
import { Badge } from '@/components/ui/badge';

export default function Clima() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [selectedPlot, setSelectedPlot] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const { recommendations, loading } = useAgroRecommendations({
    farmId: selectedFarm || null,
    plotId: selectedPlot || null
  });

  useEffect(() => {
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      loadPlots(selectedFarm);
    }
  }, [selectedFarm]);

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
  };

  const handleSendEmail = async () => {
    if (!recommendations.length || !user?.email) {
      toast({ title: 'Não há recomendações para enviar', variant: 'destructive' });
      return;
    }

    setSendingEmail(true);
    try {
      const farm = farms.find(f => f.id === selectedFarm);
      const plot = plots.find(p => p.id === selectedPlot);

      let emailBody = `
        <h1>Relatório Climático - Recomendações Agrícolas</h1>
        <p><strong>Fazenda:</strong> ${farm?.nome}</p>
        <p><strong>Talhão:</strong> ${plot?.nome}</p>
        
        <h2>Recomendações</h2>
      `;

      recommendations.forEach(rec => {
        emailBody += `
          <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${
            rec.status === 'favoravel' || rec.status === 'baixo' ? '#22c55e' : '#ef4444'
          }; background: #f9f9f9;">
            <h3 style="margin: 0 0 10px 0;">${rec.tipo.toUpperCase()} - ${rec.status.toUpperCase()}</h3>
            <p><strong>Por quê:</strong></p>
            <ul>
              ${rec.por_que.map(reason => `<li>${reason}</li>`).join('')}
            </ul>
            <p><strong>Ação:</strong> ${rec.acao}</p>
          </div>
        `;
      });

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: `Relatório Climático - ${farm?.nome} - ${plot?.nome}`,
          html: emailBody,
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
          <p className="text-muted-foreground">Recomendações agrícolas baseadas em clima e cultura</p>
        </div>
        {recommendations.length > 0 && (
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

      {!loading && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recomendações Agrícolas</CardTitle>
          </CardHeader>
          <CardContent>
            <WeatherAlerts recommendations={recommendations} />
          </CardContent>
        </Card>
      )}

      {!loading && !selectedPlot && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione uma fazenda e um talhão para visualizar recomendações
          </CardContent>
        </Card>
      )}
    </div>
  );
}
