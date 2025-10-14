import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Droplets, Thermometer, Wind, Sprout } from 'lucide-react';
import type { Recommendation } from '@/lib/agro/types';
import { Badge } from '@/components/ui/badge';

interface WeatherAlertsProps {
  recommendations: Recommendation[];
}

const ICON_MAP = {
  pulverizacao: Wind,
  doencas: Droplets,
  geada: Thermometer,
  calor: Thermometer,
  irrigacao: Droplets,
  uv: Sprout
};

const STATUS_VARIANT = {
  favoravel: 'default' as const,
  desfavoravel: 'destructive' as const,
  alto: 'destructive' as const,
  baixo: 'default' as const,
  risco: 'destructive' as const
};

const STATUS_LABEL = {
  favoravel: 'Favorável',
  desfavoravel: 'Desfavorável',
  alto: 'Alto',
  baixo: 'Baixo',
  risco: 'Risco'
};

const TIPO_LABEL = {
  pulverizacao: 'Janela de Pulverização',
  doencas: 'Risco de Doenças',
  geada: 'Risco de Geada',
  calor: 'Estresse Térmico',
  irrigacao: 'Necessidade de Irrigação',
  uv: 'Índice UV'
};

export function WeatherAlerts({ recommendations }: WeatherAlertsProps) {
  if (recommendations.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Nenhuma recomendação disponível no momento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, idx) => {
        const Icon = ICON_MAP[rec.tipo] || CheckCircle;
        const variant = STATUS_VARIANT[rec.status];
        const isGood = rec.status === 'favoravel' || rec.status === 'baixo';

        return (
          <Alert key={idx} variant={variant} className="relative">
            <Icon className="h-4 w-4" />
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2 mb-2">
                {TIPO_LABEL[rec.tipo]}
                <Badge 
                  variant={isGood ? 'default' : 'destructive'}
                  className="ml-auto"
                >
                  {STATUS_LABEL[rec.status]}
                </Badge>
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <div className="text-xs opacity-80">
                  <strong>Por quê:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {rec.por_que.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-sm font-medium border-t border-border/50 pt-2 mt-2">
                  💡 {rec.acao}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        );
      })}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Baseado nas suas regras de fazenda/cultura/estágio
      </p>
    </div>
  );
}
