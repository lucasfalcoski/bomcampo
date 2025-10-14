import { Clock, Sprout, Droplets, Bug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const activities = [
  {
    id: 1,
    icon: Sprout,
    title: "Plantio de Soja",
    area: "Talhão A",
    time: "2 horas atrás",
    color: "text-success"
  },
  {
    id: 2,
    icon: Droplets,
    title: "Irrigação",
    area: "Talhão B",
    time: "5 horas atrás",
    color: "text-accent"
  },
  {
    id: 3,
    icon: Bug,
    title: "Controle de Pragas",
    area: "Talhão C",
    time: "1 dia atrás",
    color: "text-warning"
  },
  {
    id: 4,
    icon: Sprout,
    title: "Adubação",
    area: "Talhão A",
    time: "2 dias atrás",
    color: "text-success"
  }
];

const ActivityLog = () => {
  return (
    <Card className="shadow-medium h-fit sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Atividades Recentes
        </CardTitle>
        <CardDescription>
          Últimas ações registradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="relative">
                {index !== activities.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                )}
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.area}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
