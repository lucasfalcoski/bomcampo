import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fetchGeadaCalor, GeadaCalorRow, formatNumber } from "@/lib/reports/operacaoCalculations";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { Snowflake, Thermometer, Wind } from "lucide-react";

export default function GeadaEstresse() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GeadaCalorRow[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchGeadaCalor(newFilters);
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

  const eventosGeada = rows.filter(r => r.tipo_evento === 'geada').length;
  const eventosCalor = rows.filter(r => r.tipo_evento === 'calor').length;
  const acoesTomadas = rows.filter(r => r.acao_tomada).length;

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Geada e Estresse Térmico</h1>
        <p className="text-muted-foreground">
          Eventos extremos de temperatura e ações de proteção
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Eventos de Geada</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{eventosGeada}</div>
                <p className="text-xs text-muted-foreground mt-1">madrugadas com risco</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Estresse por Calor</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{eventosCalor}</div>
                <p className="text-xs text-muted-foreground mt-1">dias com T° excessiva</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ações de Proteção</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{acoesTomadas}</div>
                <p className="text-xs text-muted-foreground mt-1">intervenções realizadas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento de Eventos</CardTitle>
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
                      <TableHead>Tipo Evento</TableHead>
                      <TableHead>T° Mín (°C)</TableHead>
                      <TableHead>T° Máx (°C)</TableHead>
                      <TableHead>Vento (km/h)</TableHead>
                      <TableHead>Ação Tomada?</TableHead>
                      <TableHead>Tipo Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(row.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{row.talhao}</TableCell>
                        <TableCell>
                          {row.tipo_evento === 'geada' ? (
                            <Badge variant="destructive" className="gap-1">
                              <Snowflake className="h-3 w-3" />
                              Geada
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                              <Thermometer className="h-3 w-3" />
                              Calor
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.temp_min_c ? formatNumber(row.temp_min_c, 1) : '—'}</TableCell>
                        <TableCell>{row.temp_max_c ? formatNumber(row.temp_max_c, 1) : '—'}</TableCell>
                        <TableCell>{row.vento_kmh ? formatNumber(row.vento_kmh, 0) : '—'}</TableCell>
                        <TableCell>
                          {row.acao_tomada ? (
                            <Badge variant="default">Sim</Badge>
                          ) : (
                            <Badge variant="secondary">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.tipo_acao || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Critérios:</strong> Geada = T° mín {'<'} 2°C. 
                Estresse por calor = T° máx {'>'} 34°C. 
                Ações incluem irrigação de proteção, cobertura térmica e ventilação.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && rows.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum evento extremo encontrado no período selecionado
        </div>
      )}
    </div>
  );
}
