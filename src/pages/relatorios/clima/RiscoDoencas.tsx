import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fetchRiscoDoencas, RiscoDoencaRow, formatNumber } from "@/lib/reports/climaCalculations";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { AlertTriangle, CheckCircle2, Activity } from "lucide-react";

export default function RiscoDoencas() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RiscoDoencaRow[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchRiscoDoencas(newFilters);
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

  const alertasAlto = rows.filter(r => r.nivel_risco === 'alto').length;
  const acoesTomadas = rows.filter(r => r.acao_tomada).length;
  const taxaResposta = alertasAlto > 0 ? (acoesTomadas / alertasAlto) * 100 : 0;

  function getRiscoBadge(nivel: 'alto' | 'medio' | 'baixo') {
    const variants = {
      alto: "destructive",
      medio: "secondary",
      baixo: "default",
    };
    const labels = {
      alto: "Alto Risco",
      medio: "Médio Risco",
      baixo: "Baixo Risco",
    };
    return <Badge variant={variants[nivel] as any}>{labels[nivel]}</Badge>;
  }

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Risco de Doenças → Ação</h1>
        <p className="text-muted-foreground">
          Taxa de resposta a alertas de risco climático de doenças
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Alto Risco</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{alertasAlto}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  de {rows.length} dias analisados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ações Tomadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{acoesTomadas}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  monitoramento ou aplicações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Resposta</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(taxaResposta, 0)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ações após alertas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento de Riscos e Ações</CardTitle>
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
                      <TableHead>Nível de Risco</TableHead>
                      <TableHead>Temp (°C)</TableHead>
                      <TableHead>UR (%)</TableHead>
                      <TableHead>Chuva 24h (mm)</TableHead>
                      <TableHead>Ação Tomada?</TableHead>
                      <TableHead>Tipo de Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(row.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{row.talhao}</TableCell>
                        <TableCell>{getRiscoBadge(row.nivel_risco)}</TableCell>
                        <TableCell>{formatNumber(row.temperatura_c, 1)}</TableCell>
                        <TableCell>{formatNumber(row.umidade_pct, 0)}</TableCell>
                        <TableCell>{formatNumber(row.chuva_24h_mm, 1)}</TableCell>
                        <TableCell>
                          {row.acao_tomada ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.tipo_acao || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Critérios de Risco de Doença:</strong> Alto risco quando UR ≥ 80%, T entre 15-26°C e chuva {'>'} 5mm/24h. 
                Médio risco quando UR ≥ 70% e T entre 15-28°C. 
                Ações incluem monitoramento fitossanitário e aplicações preventivas/curativas.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado de risco encontrado no período selecionado
        </div>
      )}
    </div>
  );
}
