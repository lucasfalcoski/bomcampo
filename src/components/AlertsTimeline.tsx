import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Wind, 
  Droplets, 
  Thermometer, 
  Sprout,
  Clock,
  ChevronRight,
  Calendar,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AlertEvent {
  id: string;
  tipo: 'pulverizacao' | 'doencas' | 'geada' | 'calor' | 'irrigacao' | 'uv' | 'chuva';
  status: string;
  data: string;
  hora?: string;
  area: string;
  plotId: string;
  farmId: string;
  acao?: string;
  razoes?: string[];
  activityId?: string;
  activityTipo?: string;
  activityData?: string;
}

interface AlertsTimelineProps {
  farmId?: string;
  plotId?: string;
}

const ICON_MAP = {
  pulverizacao: Wind,
  doencas: Droplets,
  geada: Thermometer,
  calor: Thermometer,
  irrigacao: Droplets,
  uv: Sprout,
  chuva: Droplets
};

const TIPO_LABEL = {
  pulverizacao: 'Pulverização',
  doencas: 'Risco de Doenças',
  geada: 'Risco de Geada',
  calor: 'Estresse Térmico',
  irrigacao: 'Irrigação',
  uv: 'Índice UV',
  chuva: 'Alerta de Chuva'
};

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  favoravel: 'default',
  desfavoravel: 'destructive',
  alto: 'destructive',
  baixo: 'secondary',
  risco: 'destructive'
};

export function AlertsTimeline({ farmId, plotId }: AlertsTimelineProps) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [relatedActivity, setRelatedActivity] = useState<any | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [farmId, plotId]);

  const loadAlerts = async () => {
    setLoading(true);
    
    try {
      // Carregar alertas do log de notificações (últimos 30 dias)
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      let query = supabase
        .from('notifications_log')
        .select('*, user_id')
        .gte('referencia_data', thirtyDaysAgo)
        .order('referencia_data', { ascending: false });

      const { data: notifications, error: notifError } = await query;
      
      if (notifError) throw notifError;

      // Carregar atividades com weather_snapshot (indicam alertas)
      let activitiesQuery = supabase
        .from('activities')
        .select(`
          id, tipo, data, plot_id, weather_snapshot, clima_conforme,
          plots!inner(id, nome, farm_id, farms!inner(id, nome))
        `)
        .not('weather_snapshot', 'is', null)
        .gte('data', thirtyDaysAgo)
        .order('data', { ascending: false });

      if (farmId) {
        activitiesQuery = activitiesQuery.eq('plots.farm_id', farmId);
      }
      if (plotId) {
        activitiesQuery = activitiesQuery.eq('plot_id', plotId);
      }

      const { data: activities, error: actError } = await activitiesQuery;
      
      // Combinar alertas de diferentes fontes
      const combinedAlerts: AlertEvent[] = [];

      // Processar notificações
      (notifications || []).forEach((notif: any, idx: number) => {
        combinedAlerts.push({
          id: notif.id || `notif-${idx}`,
          tipo: notif.tipo === 'alerta_chuva' ? 'chuva' : 'pulverizacao',
          status: 'risco',
          data: notif.referencia_data,
          area: 'Todas as áreas',
          plotId: '',
          farmId: '',
          acao: notif.tipo === 'alerta_chuva' 
            ? 'Verificar proteção das culturas' 
            : 'Verificar condições de campo'
        });
      });

      // Processar atividades com snapshot climático
      (activities || []).forEach((act: any) => {
        const snapshot = act.weather_snapshot as any;
        if (!snapshot) return;

        const plot = act.plots as any;
        const areaName = `${plot?.nome || 'Talhão'} - ${plot?.farms?.nome || 'Fazenda'}`;

        // Criar alerta baseado no clima conforme
        combinedAlerts.push({
          id: `activity-${act.id}`,
          tipo: act.tipo?.includes('pulv') ? 'pulverizacao' : 'doencas',
          status: act.clima_conforme ? 'favoravel' : 'desfavoravel',
          data: act.data,
          area: areaName,
          plotId: act.plot_id,
          farmId: plot?.farm_id || '',
          acao: act.clima_conforme 
            ? 'Atividade realizada em condições adequadas'
            : 'Atividade realizada em condições desfavoráveis',
          razoes: snapshot.conditions ? [snapshot.conditions] : [],
          activityId: act.id,
          activityTipo: act.tipo,
          activityData: act.data
        });
      });

      // Ordenar por data (mais recente primeiro)
      combinedAlerts.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );

      setAlerts(combinedAlerts);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClick = async (alert: AlertEvent) => {
    setSelectedAlert(alert);
    setRelatedActivity(null);

    if (alert.activityId) {
      setLoadingActivity(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            plots(nome, farms(nome)),
            activity_items(*)
          `)
          .eq('id', alert.activityId)
          .maybeSingle();

        if (!error && data) {
          setRelatedActivity(data);
        }
      } catch (e) {
        console.error('Erro ao carregar atividade:', e);
      } finally {
        setLoadingActivity(false);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "dd 'de' MMM, yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const groupAlertsByDate = (alerts: AlertEvent[]) => {
    const groups: Record<string, AlertEvent[]> = {};
    
    alerts.forEach(alert => {
      const dateKey = alert.data;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(alert);
    });

    return groups;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Linha do Tempo de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Linha do Tempo de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={AlertTriangle}
            title="Sem alertas recentes"
            description="Nenhum alerta climático foi registrado nos últimos 30 dias."
          />
        </CardContent>
      </Card>
    );
  }

  const groupedAlerts = groupAlertsByDate(alerts);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Linha do Tempo de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {Object.entries(groupedAlerts).map(([date, dateAlerts]) => (
                <div key={date} className="relative">
                  {/* Data como header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center z-10">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatDate(date)}
                    </span>
                  </div>

                  {/* Alertas do dia */}
                  <div className="ml-11 space-y-2">
                    {dateAlerts.map((alert) => {
                      const Icon = ICON_MAP[alert.tipo] || AlertTriangle;
                      const variant = STATUS_VARIANT[alert.status] || 'secondary';

                      return (
                        <Button
                          key={alert.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-3 hover:bg-muted/50 text-left"
                          onClick={() => handleAlertClick(alert)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className={`p-2 rounded-full ${
                              variant === 'destructive' 
                                ? 'bg-destructive/10 text-destructive' 
                                : 'bg-primary/10 text-primary'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {TIPO_LABEL[alert.tipo]}
                                </span>
                                <Badge variant={variant} className="text-xs">
                                  {alert.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {alert.area}
                              </p>
                              {alert.activityId && (
                                <p className="text-xs text-primary mt-1">
                                  Atividade vinculada →
                                </p>
                              )}
                            </div>

                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && (
                <>
                  {(() => {
                    const Icon = ICON_MAP[selectedAlert.tipo] || AlertTriangle;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {TIPO_LABEL[selectedAlert?.tipo || 'pulverizacao']}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[selectedAlert.status]}>
                  {selectedAlert.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedAlert.data)}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Área:</strong> {selectedAlert.area}
                </p>
                {selectedAlert.acao && (
                  <p className="text-sm">
                    <strong>Ação:</strong> {selectedAlert.acao}
                  </p>
                )}
                {selectedAlert.razoes && selectedAlert.razoes.length > 0 && (
                  <div className="text-sm">
                    <strong>Razões:</strong>
                    <ul className="list-disc list-inside mt-1 text-muted-foreground">
                      {selectedAlert.razoes.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Atividade relacionada */}
              {loadingActivity && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {relatedActivity && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm font-medium mb-2">
                    Atividade Vinculada
                  </p>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Tipo:</strong> {relatedActivity.tipo}
                    </p>
                    <p>
                      <strong>Data:</strong> {formatDate(relatedActivity.data)}
                    </p>
                    {relatedActivity.descricao && (
                      <p>
                        <strong>Descrição:</strong> {relatedActivity.descricao}
                      </p>
                    )}
                    {relatedActivity.responsavel && (
                      <p>
                        <strong>Responsável:</strong> {relatedActivity.responsavel}
                      </p>
                    )}
                    <Badge variant={relatedActivity.realizado ? 'default' : 'secondary'}>
                      {relatedActivity.realizado ? 'Realizada' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              )}

              {selectedAlert.activityId && !relatedActivity && !loadingActivity && (
                <p className="text-sm text-muted-foreground italic">
                  Atividade não encontrada.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
