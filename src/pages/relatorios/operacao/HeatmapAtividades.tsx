import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { useToast } from "@/hooks/use-toast";
import { fetchHeatmap, HeatmapCell } from "@/lib/reports/operacaoCalculations";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { Activity } from "lucide-react";

export default function HeatmapAtividades() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HeatmapCell[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchHeatmap(newFilters);
      setData(result);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    toast({ title: "Export CSV", description: "Funcionalidade em desenvolvimento" });
  }

  function handleExportPDF() {
    toast({ title: "Export PDF", description: "Funcionalidade em desenvolvimento" });
  }

  // Organizar dados em matriz
  const talhoes = Array.from(new Set(data.map(d => d.talhao))).sort();
  const semanas = Array.from(new Set(data.map(d => d.semana))).sort();
  
  const matrix = new Map<string, number>();
  data.forEach(cell => {
    matrix.set(`${cell.talhao}_${cell.semana}`, cell.atividades);
  });

  function getIntensity(count: number): string {
    if (count === 0) return 'bg-muted/20';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900';
    if (count <= 5) return 'bg-yellow-200 dark:bg-yellow-900';
    if (count <= 10) return 'bg-orange-300 dark:bg-orange-800';
    return 'bg-red-400 dark:bg-red-900';
  }

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mapa de Calor de Atividades</h1>
        <p className="text-muted-foreground">
          Intensidade de atividades por talhão e semana
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} showPlotFilter={false} />

      {filters && data.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Mapa de Calor: Talhões × Semanas</CardTitle>
              </div>
              <ExportButtons
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <div className="min-w-max">
                  {/* Header */}
                  <div className="flex gap-1 mb-2">
                    <div className="w-32 font-medium text-sm">Talhão</div>
                    {semanas.map(semana => (
                      <div key={semana} className="w-16 text-center text-xs font-medium">
                        {semana}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {talhoes.map(talhao => (
                    <div key={talhao} className="flex gap-1 mb-1">
                      <div className="w-32 text-sm truncate">{talhao}</div>
                      {semanas.map(semana => {
                        const count = matrix.get(`${talhao}_${semana}`) || 0;
                        return (
                          <div
                            key={semana}
                            className={`w-16 h-10 flex items-center justify-center rounded ${getIntensity(count)} text-xs font-medium`}
                            title={`${talhao} - ${semana}: ${count} atividades`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legenda */}
              <div className="mt-6 flex gap-4 flex-wrap items-center text-sm">
                <span className="font-medium">Intensidade:</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-muted/20 rounded border"></div>
                  <span className="text-xs text-muted-foreground">0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-200 dark:bg-green-900 rounded"></div>
                  <span className="text-xs text-muted-foreground">1-2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-200 dark:bg-yellow-900 rounded"></div>
                  <span className="text-xs text-muted-foreground">3-5</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-300 dark:bg-orange-800 rounded"></div>
                  <span className="text-xs text-muted-foreground">6-10</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-400 dark:bg-red-900 rounded"></div>
                  <span className="text-xs text-muted-foreground">10+</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Como usar:</strong> O mapa de calor mostra a concentração de atividades por talhão ao longo das semanas. 
                Cores mais intensas indicam maior volume de operações. 
                Útil para identificar gargalos operacionais e otimizar recursos.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && data.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma atividade encontrada no período selecionado
        </div>
      )}
    </div>
  );
}
