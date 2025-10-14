import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fetchPlanejadoExecutado, PlanejadoExecutadoRow, formatNumber } from "@/lib/reports/operacaoCalculations";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function PlanejadoExecutado() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlanejadoExecutadoRow[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchPlanejadoExecutado(newFilters);
      setRows(result);
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

  const totalPlanejadas = rows.reduce((sum, r) => sum + r.planejadas, 0);
  const totalRealizadas = rows.reduce((sum, r) => sum + r.realizadas, 0);
  const totalAtrasadas = rows.reduce((sum, r) => sum + r.atrasadas, 0);
  const percentualGeral = totalPlanejadas > 0 ? (totalRealizadas / totalPlanejadas) * 100 : 0;

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Planejado x Executado (Operacional)</h1>
        <p className="text-muted-foreground">
          Acompanhamento de execução de atividades planejadas
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Planejadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalPlanejadas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalRealizadas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalAtrasadas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">% Execução</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(percentualGeral, 0)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento por Tipo de Atividade</CardTitle>
              <ExportButtons
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Planejadas</TableHead>
                      <TableHead className="text-right">Realizadas</TableHead>
                      <TableHead className="text-right">Atrasadas</TableHead>
                      <TableHead className="text-right">% Execução</TableHead>
                      <TableHead className="text-right">Lead Time (dias)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.tipo}</TableCell>
                        <TableCell className="text-right">{row.planejadas}</TableCell>
                        <TableCell className="text-right">{row.realizadas}</TableCell>
                        <TableCell className="text-right">
                          {row.atrasadas > 0 ? (
                            <Badge variant="destructive">{row.atrasadas}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.percentual >= 80 ? "default" : "secondary"}>
                            {formatNumber(row.percentual, 0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(row.lead_time_dias, 1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Metodologia:</strong> Planejadas = total de atividades no período. 
                Realizadas = marcadas como realizado=true. 
                Atrasadas = não realizadas com data {'<'} hoje. 
                Lead time = tempo médio entre planejamento e execução.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma atividade encontrada no período selecionado
        </div>
      )}
    </div>
  );
}
