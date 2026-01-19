import { useParams, useNavigate } from 'react-router-dom';
import { usePopDetail } from '@/hooks/usePops';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  'Aplicação': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Monitoramento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Irrigação': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Equipamentos': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Colheita': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Clima': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'Segurança': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'Gestão': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function PopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pop, loading, error } = usePopDetail(id);

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full mt-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate('/pops')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pop) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate('/pops')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">POP não encontrado</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/pops')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para POPs
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <Badge 
              variant="secondary" 
              className={CATEGORY_COLORS[pop.category] || ''}
            >
              {pop.category}
            </Badge>
            {pop.workspace_id === null && (
              <Badge variant="outline" className="text-xs">
                Global
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl mt-2">{pop.title}</CardTitle>
          {pop.summary && (
            <CardDescription className="text-base mt-2">
              {pop.summary}
            </CardDescription>
          )}
          {pop.keywords && pop.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {pop.keywords.map((kw) => (
                <Badge key={kw} variant="outline">
                  {kw}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Steps */}
      {pop.steps && pop.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Passos do Procedimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-6">
              {pop.steps.map((step, index) => (
                <li key={step.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    {step.step_title && (
                      <h4 className="font-medium text-foreground mb-1">
                        {step.step_title}
                      </h4>
                    )}
                    <p className="text-muted-foreground">
                      {step.step_text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Empty Steps */}
      {(!pop.steps || pop.steps.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum passo cadastrado para este POP</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
