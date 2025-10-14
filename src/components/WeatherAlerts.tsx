import { AlertTriangle, CloudRain, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const alerts = [
  {
    id: 1,
    type: "warning",
    icon: AlertTriangle,
    title: "Alerta de Geada",
    description: "Temperatura pode cair abaixo de 5°C nas próximas 48h",
    time: "Hoje, 14:30",
    severity: "high"
  },
  {
    id: 2,
    type: "info",
    icon: CloudRain,
    title: "Previsão de Chuva",
    description: "40mm de precipitação esperada para amanhã à tarde",
    time: "Hoje, 12:15",
    severity: "medium"
  },
  {
    id: 3,
    type: "success",
    icon: Sun,
    title: "Condições Ideais",
    description: "Próximos 3 dias favoráveis para aplicação de defensivos",
    time: "Ontem, 18:20",
    severity: "low"
  }
];

const WeatherAlerts = () => {
  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Alertas Climáticos
        </CardTitle>
        <CardDescription>
          Acompanhe as condições meteorológicas importantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className="flex gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors border border-border"
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${alert.severity === 'high' ? 'bg-warning/10' : ''}
                ${alert.severity === 'medium' ? 'bg-accent/10' : ''}
                ${alert.severity === 'low' ? 'bg-success/10' : ''}
              `}>
                <Icon className={`w-5 h-5 
                  ${alert.severity === 'high' ? 'text-warning' : ''}
                  ${alert.severity === 'medium' ? 'text-accent' : ''}
                  ${alert.severity === 'low' ? 'text-success' : ''}
                `} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{alert.title}</h3>
                  <Badge variant={
                    alert.severity === 'high' ? 'destructive' : 
                    alert.severity === 'medium' ? 'default' : 
                    'secondary'
                  } className="text-xs">
                    {alert.severity === 'high' ? 'Alta' : 
                     alert.severity === 'medium' ? 'Média' : 
                     'Baixa'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                <span className="text-xs text-muted-foreground">{alert.time}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WeatherAlerts;
