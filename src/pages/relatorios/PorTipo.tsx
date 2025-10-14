import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { fetchTypeReport, formatCurrency, formatNumber } from "@/lib/reports/calculations";
import { exportTypeReportCSV } from "@/lib/reports/exports";
import { TypeReportRow, ReportFilters as ReportFiltersType } from "@/lib/reports/types";

export default function PorTipo() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TypeReportRow[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchTypeReport(newFilters);
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
    exportTypeReportCSV(rows, `por-tipo-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "CSV exportado com sucesso" });
  }

  function handleExportPDF() {
    toast({ title: "Exportação PDF", description: "Funcionalidade em desenvolvimento" });
  }

  const chartData = rows.map(r => ({
    tipo: r.tipo,
    Estimado: r.estimado,
    Real: r.real,
  }));

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Totais por Tipo de Atividade</h1>
        <p className="text-muted-foreground">
          Análise de custos agrupados por tipo de atividade
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && rows.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Comparação: Estimado x Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer
                  config={{
                    Estimado: { label: "Estimado", color: "hsl(var(--chart-1))" },
                    Real: { label: "Real", color: "hsl(var(--chart-2))" },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="Estimado" fill="var(--color-Estimado)" />
                      <Bar dataKey="Real" fill="var(--color-Real)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento por Tipo</CardTitle>
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
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Estimado</TableHead>
                      <TableHead className="text-right">Real</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-right">% Execução</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.tipo}>
                        <TableCell className="font-medium">{row.tipo}</TableCell>
                        <TableCell className="text-right">{row.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.estimado)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.real)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.diferenca > 0 ? "secondary" : "default"}>
                            {formatCurrency(row.diferenca)}
                          </Badge>
                        </TableCell>
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
            </CardContent>
          </Card>
        </>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado encontrado no período selecionado
        </div>
      )}
    </div>
  );
}
