import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { fetchConformidadeReport } from "@/lib/reports/calculations";
import { ConformidadeRow, ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function ConformidadePulverizacao() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConformidadeRow[]>([]);
  const [percentual, setPercentual] = useState(0);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchConformidadeReport(newFilters);
      setRows(result.rows);
      setPercentual(result.percentual_conforme);
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

  const conformes = rows.filter(r => r.conforme === true).length;
  const naoConformes = rows.filter(r => r.conforme === false).length;

  const pieData = [
    { name: "Conforme", value: conformes, color: "hsl(var(--chart-2))" },
    { name: "Não Conforme", value: naoConformes, color: "hsl(var(--chart-1))" },
  ];

  // Contar motivos de não conformidade
  const motivosMap = new Map<string, number>();
  rows.filter(r => !r.conforme && r.motivo).forEach(r => {
    const motivos = r.motivo.split(',').map(m => m.trim());
    motivos.forEach(m => {
      motivosMap.set(m, (motivosMap.get(m) || 0) + 1);
    });
  });

  const barData = Array.from(motivosMap.entries()).map(([motivo, count]) => ({
    motivo,
    count,
  }));

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Conformidade de Pulverização</h1>
        <p className="text-muted-foreground">
          Análise de pulverizações realizadas em condições climáticas favoráveis
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && rows.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Índice de Conformidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{percentual.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {conformes} de {rows.length} pulverizações em janela favorável
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição: Conforme x Não Conforme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Causas de Não Conformidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer
                    config={{
                      count: { label: "Ocorrências", color: "hsl(var(--chart-1))" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="motivo" type="category" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento por Pulverização</CardTitle>
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
                      <TableHead>Data</TableHead>
                      <TableHead>Talhão</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(row.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{row.talhao}</TableCell>
                        <TableCell className="text-xs">{row.tipo}</TableCell>
                        <TableCell>
                          {row.conforme === true && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Conforme
                            </Badge>
                          )}
                          {row.conforme === false && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Não Conforme
                            </Badge>
                          )}
                          {row.conforme === null && (
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Sem Dados
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.motivo || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Critérios de Conformidade:</strong> Pulverização é considerada conforme quando realizada com 
                vento {'<'} 15 km/h, sem chuva prevista nas próximas 6h, e Delta-T entre 2-10. 
                Dados extraídos de weather_snapshot das atividades.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma pulverização encontrada no período selecionado
        </div>
      )}
    </div>
  );
}
