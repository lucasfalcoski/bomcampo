import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface WeatherAlertsProps {
  windSpeed: number;
  precipProb: number;
  humidity: number;
  precipitation: number;
}

export function WeatherAlerts({ windSpeed, precipProb, humidity, precipitation }: WeatherAlertsProps) {
  const canSpray = windSpeed < 15 && precipProb < 30;
  const diseaseRisk = humidity > 80 && precipitation > 5;

  return (
    <div className="space-y-3">
      <Alert variant={canSpray ? 'default' : 'destructive'}>
        {canSpray ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertDescription>
          <strong>Janela de Pulverização:</strong>{' '}
          {canSpray
            ? 'Condições favoráveis (vento baixo e baixa probabilidade de chuva)'
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
            ? 'Alto risco (umidade elevada + chuva). Monitorar culturas.'
            : 'Risco baixo. Condições não favorecem doenças.'}
        </AlertDescription>
      </Alert>
    </div>
  );
}
