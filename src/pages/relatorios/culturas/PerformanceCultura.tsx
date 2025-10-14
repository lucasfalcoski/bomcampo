import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { fetchPerformanceCultura, PerformanceCulturaRow, formatNumber } from "@/lib/reports/operacaoCalculations";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { formatCurrency } from "@/lib/reports/calculations";
import { Sprout, Map as MapIcon, TrendingUp } from "lucide-react";

export default function PerformanceCultura() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PerformanceCulturaRow[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchPerformanceCultura(newFilters);
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

  const totalPlantios = rows.reduce((sum, r) => sum + r.plantios_ativos, 0);
  const totalArea = rows.reduce((sum, r) => sum + r.area_ha, 0);

  const chartData = rows.map(r => ({
    cultura: r.cultura,
    "Real (R$/ha)": r.custo_real_ha,
    "Estimado (R$/ha)": r.custo_estimado_ha,
  }));

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Performance por Cultura/Plantio</h1>
        <p className="text-muted-foreground">
          Análise de custos e áreas cultivadas por cultura
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} showPlotFilter={false} />

      {filters && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Plantios</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalPlantios}</div>
                <p className="text-xs text-muted-foreground mt-1">ativos no sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Área Total</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(totalArea)} ha</div>
                <p className="text-xs text-muted-foreground mt-1">em cultivo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Culturas Ativas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rows.length}</div>
                <p className="text-xs text-muted-foreground mt-1">diferentes culturas</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Custo por Hectare: Real x Estimado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ChartContainer
                  config={{
                    "Real (R$/ha)": { label: "Real (R$/ha)", color: "hsl(var(--chart-2))" },
                    "Estimado (R$/ha)": { label: "Estimado (R$/ha)", color: "hsl(var(--chart-1))" },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cultura" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="Real (R$/ha)" fill="var(--color-Real (R$/ha))" />
                      <Bar dataKey="Estimado (R$/ha)" fill="var(--color-Estimado (R$/ha))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento por Cultura</CardTitle>
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
                      <TableHead>Cultura</TableHead>
                      <TableHead className="text-right">Plantios Ativos</TableHead>
                      <TableHead className="text-right">Área (ha)</TableHead>
                      <TableHead>Estágio Dominante</TableHead>
                      <TableHead className="text-right">Real (R$/ha)</TableHead>
                      <TableHead className="text-right">Estimado (R$/ha)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.cultura}</TableCell>
                        <TableCell className="text-right">{row.plantios_ativos}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.area_ha)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.estagio_dominante}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_real_ha)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_estimado_ha)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Metodologia:</strong> Custo Real/ha = transações vinculadas ÷ área. 
                Custo Estimado/ha = atividades não conciliadas ÷ área. 
                Estágio dominante = estágio mais frequente entre plantios ativos da cultura.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum plantio ativo encontrado
        </div>
      )}
    </div>
  );
}
