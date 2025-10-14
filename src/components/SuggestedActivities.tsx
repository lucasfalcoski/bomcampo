import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus } from 'lucide-react';
import { ActivitySuggestion } from '@/lib/agro/activitySuggestions';

interface SuggestedActivitiesProps {
  suggestions: ActivitySuggestion[];
  onAddActivity: (suggestion: ActivitySuggestion) => void;
}

const PRIORITY_COLORS = {
  alta: 'destructive',
  média: 'default',
  baixa: 'secondary',
} as const;

export function SuggestedActivities({ suggestions, onAddActivity }: SuggestedActivitiesProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Atividades Sugeridas pelo Clima</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.code}-${index}`}
              className="border rounded-lg p-3 bg-background hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{suggestion.display_name}</span>
                    <Badge variant={PRIORITY_COLORS[suggestion.priority]} className="text-xs">
                      {suggestion.priority === 'alta' ? 'Alta prioridade' : 
                       suggestion.priority === 'média' ? 'Média prioridade' : 
                       'Baixa prioridade'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                  {suggestion.recommended_date && (
                    <p className="text-xs font-medium text-primary">
                      Recomendado para: {new Date(suggestion.recommended_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddActivity(suggestion)}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
