import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { AddActivityDialog } from './AddActivityDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  tipo: string;
  descricao: string | null;
  data: string;
  custo_estimado: number | null;
  realizado: boolean | null;
  observacoes: string | null;
}

interface ActivityLogComponentProps {
  plotId: string;
  activities: Activity[];
  onUpdate: () => void;
}

const ACTIVITY_TYPES = {
  pulverizacao: 'Pulverização',
  irrigacao: 'Irrigação',
  adubacao: 'Adubação',
  manejo_fitossanitario: 'Manejo Fitossanitário',
  colheita: 'Colheita',
  outro: 'Outro',
};

export function ActivityLogComponent({ plotId, activities, onUpdate }: ActivityLogComponentProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('activities').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir atividade', variant: 'destructive' });
      return;
    }

    toast({ title: 'Atividade excluída' });
    onUpdate();
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingActivity(null);
  };

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Atividades</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma atividade registrada
          </p>
        ) : (
          <div className="space-y-4">
            {sortedActivities.map((activity) => (
              <div
                key={activity.id}
                className="border rounded-lg p-4 space-y-2 hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {ACTIVITY_TYPES[activity.tipo as keyof typeof ACTIVITY_TYPES]}
                      </span>
                      <Badge variant={activity.realizado ? 'default' : 'secondary'}>
                        {activity.realizado ? 'Realizado' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.data), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    {activity.descricao && (
                      <p className="text-sm mt-2">{activity.descricao}</p>
                    )}
                    {activity.custo_estimado && (
                      <p className="text-sm font-medium mt-2">
                        Custo estimado:{' '}
                        {activity.custo_estimado.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    )}
                    {activity.observacoes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.observacoes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(activity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(activity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AddActivityDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          plotId={plotId}
          activity={editingActivity}
          onSuccess={() => {
            onUpdate();
            handleDialogClose();
          }}
        />
      </CardContent>
    </Card>
  );
}
