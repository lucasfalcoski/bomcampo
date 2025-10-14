import { BookOpen, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const notes = [
  {
    id: 1,
    area: "Talhão A - Soja",
    location: "Setor Norte",
    activity: "Aplicação de Herbicida",
    date: "15/10/2025",
    status: "completed"
  },
  {
    id: 2,
    area: "Talhão B - Milho",
    location: "Setor Sul",
    activity: "Adubação de Cobertura",
    date: "14/10/2025",
    status: "completed"
  },
  {
    id: 3,
    area: "Talhão C - Trigo",
    location: "Setor Leste",
    activity: "Monitoramento de Pragas",
    date: "13/10/2025",
    status: "pending"
  }
];

const FieldNotes = () => {
  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Caderno de Campo
        </CardTitle>
        <CardDescription>
          Registros recentes de atividades nas áreas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm mb-1">{note.area}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{note.location}</span>
                  </div>
                </div>
                <Badge variant={note.status === 'completed' ? 'default' : 'secondary'}>
                  {note.status === 'completed' ? 'Concluído' : 'Pendente'}
                </Badge>
              </div>
              <p className="text-sm text-foreground mb-2">{note.activity}</p>
              <span className="text-xs text-muted-foreground">{note.date}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FieldNotes;
