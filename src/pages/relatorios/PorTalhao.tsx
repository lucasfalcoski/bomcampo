import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fetchPlotReport, formatCurrency, formatNumber } from "@/lib/reports/calculations";
import { exportPlotReportCSV } from "@/lib/reports/exports";
import { PlotReportRow, ReportFilters as ReportFiltersType } from "@/lib/reports/types";

export default function PorTalhao() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlotReportRow[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchPlotReport(newFilters);
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
    if (rows.length === 0) return;
    exportPlotReportCSV(rows, `por-talhao-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "CSV exportado com sucesso" });
  }

  function handleExportPDF() {
    toast({ title: "Exportação PDF", description: "Funcionalidade em desenvolvimento" });
  }

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Totais por Talhão</h1>
        <p className="text-muted-foreground">
          Análise de custos e custo por hectare por talhão
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} showPlotFilter={false} />

      {filters && rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalhamento por Talhão</CardTitle>
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
                    <TableHead>Talhão</TableHead>
                    <TableHead className="text-right">Área (ha)</TableHead>
                    <TableHead className="text-right">Estimado</TableHead>
                    <TableHead className="text-right">Real</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Est. (R$/ha)</TableHead>
                    <TableHead className="text-right">Real (R$/ha)</TableHead>
                    <TableHead className="text-right">% Execução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.plot_id}>
                      <TableCell className="font-medium">{row.talhao}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.area_ha)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.estimado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.real)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.diferenca > 0 ? "secondary" : "default"}>
                          {formatCurrency(row.diferenca)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.custo_ha_estimado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.custo_ha_real)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.percentual <= 100 ? "default" : "secondary"}>
                          {formatNumber(row.percentual)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <strong>Metodologia:</strong> Custo/ha = Total do talhão ÷ Área (ha). 
              Estimado considera apenas atividades não conciliadas. 
              Real considera transações vinculadas a atividades.
            </div>
          </CardContent>
        </Card>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado encontrado no período selecionado
        </div>
      )}
    </div>
  );
}
