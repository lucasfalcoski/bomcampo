import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Migracao() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const executarMigracao = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-data');

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast({
          title: "Migração concluída!",
          description: "Todos os dados foram transferidos com sucesso.",
        });
      }
    } catch (error: any) {
      console.error('Erro na migração:', error);
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Migração de Dados</CardTitle>
          <CardDescription>
            Transferir dados do projeto antigo (mjlyamxdvxgniykicuij) para o projeto atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta operação irá migrar as seguintes tabelas: farms, plots, activities, 
              weather_prefs, notifications_log, activity_types, profiles
            </AlertDescription>
          </Alert>

          <Button 
            onClick={executarMigracao} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando dados...
              </>
            ) : (
              'Executar Migração'
            )}
          </Button>

          {result && (
            <div className="mt-6 space-y-4">
              {result.success ? (
                <>
                  <Alert className="border-green-500">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700">
                      {result.message}
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resultados da Migração</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(result.results.migrated).map(([table, count]) => (
                          <div key={table} className="flex justify-between items-center p-2 bg-secondary rounded">
                            <span className="font-medium">{table}</span>
                            <span className="text-sm text-muted-foreground">
                              {count as number} registros
                            </span>
                          </div>
                        ))}
                      </div>

                      {Object.keys(result.results.errors).length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="font-semibold text-destructive">Erros:</h4>
                          {Object.entries(result.results.errors).map(([table, error]) => (
                            <Alert key={table} variant="destructive">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>{table}:</strong> {error as string}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.error || 'Erro desconhecido na migração'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
