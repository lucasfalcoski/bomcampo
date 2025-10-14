import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { fetchClimaResumo, formatNumber, ClimaResumo, ClimaDiario } from "@/lib/reports/climaCalculations";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { CloudRain, Thermometer, Droplets, Wind } from "lucide-react";

export default function ResumoClimatico() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<ClimaResumo | null>(null);
  const [diarios, setDiarios] = useState<ClimaDiario[]>([]);
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchClimaResumo(newFilters);
      setResumo(result.resumo);
      setDiarios(result.diarios);
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

  const chartData = diarios.map(d => ({
    data: new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    "Chuva (mm)": d.chuva_mm,
    "T° Mín": d.temp_min_c,
    "T° Máx": d.temp_max_c,
    VPD: d.vpd_kpa,
  }));

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Resumo Climático do Período</h1>
        <p className="text-muted-foreground">
          Análise completa de dados climáticos: chuva, temperatura, VPD e janelas de aplicação
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && resumo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CloudRain className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Chuva Acumulada</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(resumo.chuva_acumulada_mm)} mm</div>
                <p className="text-xs text-muted-foreground mt-1">{resumo.dias_com_chuva} dias com chuva</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Temperatura</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(resumo.temp_media_c, 1)}°C</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mín: {formatNumber(resumo.temp_min_c, 1)}°C | Máx: {formatNumber(resumo.temp_max_c, 1)}°C
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-cyan-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">VPD Médio</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(resumo.vpd_medio_kpa)} kPa</div>
                <p className="text-xs text-muted-foreground mt-1">Déficit de Pressão de Vapor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Janela Seca</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resumo.horas_janela_seca}h</div>
                <p className="text-xs text-muted-foreground mt-1">Horas favoráveis</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Chuva e Temperatura Diária</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer
                    config={{
                      "Chuva (mm)": { label: "Chuva (mm)", color: "hsl(var(--chart-1))" },
                      "T° Mín": { label: "T° Mín (°C)", color: "hsl(var(--chart-2))" },
                      "T° Máx": { label: "T° Máx (°C)", color: "hsl(var(--chart-3))" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="Chuva (mm)" stroke="var(--color-Chuva (mm))" />
                        <Line type="monotone" dataKey="T° Mín" stroke="var(--color-T° Mín)" />
                        <Line type="monotone" dataKey="T° Máx" stroke="var(--color-T° Máx)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>VPD Diário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer
                    config={{
                      VPD: { label: "VPD (kPa)", color: "hsl(var(--chart-4))" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="VPD" fill="var(--color-VPD)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alertas de Eventos Extremos</CardTitle>
              <ExportButtons
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Alertas de Geada</span>
                    <span className="text-2xl font-bold text-blue-600">{resumo.alertas_geada}</span>
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Alertas de Calor Excessivo</span>
                    <span className="text-2xl font-bold text-orange-600">{resumo.alertas_calor}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <strong>Metodologia:</strong> Dados extraídos de snapshots climáticos registrados nas atividades. 
                VPD = Déficit de Pressão de Vapor (ideal: 0.8-1.2 kPa). 
                Janela Seca = períodos com baixa probabilidade de chuva nas próximas 6h.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filters && !resumo && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado climático encontrado no período selecionado
        </div>
      )}
    </div>
  );
}
