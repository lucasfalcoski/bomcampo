import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivitiesReport, formatCurrency, formatNumber } from "@/lib/reports/calculations";
import { exportActivitiesCSV } from "@/lib/reports/exports";
import { ActivityReportRow, ReportKPIs, ReportFilters as ReportFiltersType } from "@/lib/reports/types";
import { Link } from "lucide-react";

export default function AtividadesEstimadoReal() {
  const [filters, setFilters] = useState<ReportFiltersType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ActivityReportRow[]>([]);
  const [kpis, setKPIs] = useState<ReportKPIs>({ total_estimado: 0, total_real: 0, diferenca: 0, percentual_execucao: 0 });
  const [conciliarActivity, setConciliarActivity] = useState<ActivityReportRow | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<string>("");
  const [newTxValue, setNewTxValue] = useState<string>("");
  const { toast } = useToast();

  async function handleFilterChange(newFilters: ReportFiltersType) {
    setFilters(newFilters);
    setLoading(true);
    try {
      const result = await fetchActivitiesReport(newFilters);
      setRows(result.rows);
      setKPIs(result.kpis);
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

  async function openConciliarDialog(activity: ActivityReportRow) {
    setConciliarActivity(activity);
    
    // Load transactions from same plot and period
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('tipo', 'custo')
      .eq('plot_id', activity.plot_id)
      .is('activity_id', null)
      .gte('data', new Date(activity.data).toISOString().split('T')[0])
      .lte('data', new Date(new Date(activity.data).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('data', { ascending: false });
    
    setTransactions(data || []);
    setSelectedTx("");
    setNewTxValue("");
  }

  async function handleConciliar() {
    if (!conciliarActivity) return;

    try {
      if (selectedTx) {
        // Link existing transaction
        await supabase
          .from('transactions')
          .update({ activity_id: conciliarActivity.activity_id })
          .eq('id', selectedTx);
      } else if (newTxValue) {
        // Create new transaction
        const { data: farmData } = await supabase
          .from('plots')
          .select('farm_id')
          .eq('id', conciliarActivity.plot_id)
          .single();

        if (!farmData?.farm_id) throw new Error('Farm not found');

        const { data: newTx, error: insertError } = await supabase
          .from('transactions')
          .insert([{
            farm_id: farmData.farm_id,
            plot_id: conciliarActivity.plot_id,
            tipo: 'custo' as const,
            categoria: 'operacional' as const,
            valor_brl: parseFloat(newTxValue),
            data: conciliarActivity.data,
            descricao: `Conciliação: ${conciliarActivity.descricao}`,
          }] as any)
          .select()
          .single();

        if (insertError) throw insertError;

        // Link to activity
        if (newTx) {
          await supabase
            .from('transactions')
            .update({ activity_id: conciliarActivity.activity_id })
            .eq('id', newTx.id);
        }
      }

      toast({
        title: "Conciliação realizada",
        description: "Atividade vinculada à transação com sucesso",
      });

      setConciliarActivity(null);
      if (filters) handleFilterChange(filters);
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleExportCSV() {
    if (rows.length === 0) return;
    exportActivitiesCSV(rows, kpis, `atividades-estimado-real-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "CSV exportado com sucesso" });
  }

  function handleExportPDF() {
    toast({ title: "Exportação PDF", description: "Funcionalidade em desenvolvimento" });
  }

  function getStatusBadge(status: ActivityReportRow['status']) {
    const variants = {
      planejada: "default",
      atrasada: "destructive",
      realizada: "default",
      sem_conciliacao: "secondary",
    };
    const labels = {
      planejada: "Planejada",
      atrasada: "Atrasada",
      realizada: "Realizada",
      sem_conciliacao: "Sem conciliação",
    };
    return <Badge variant={variants[status] as any}>{labels[status]}</Badge>;
  }

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Atividades: Estimado x Real</h1>
        <p className="text-muted-foreground">
          Compare custos estimados de atividades com valores reais das transações
        </p>
      </div>

      <ReportFilters onFilterChange={handleFilterChange} />

      {filters && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.total_estimado)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Real</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.total_real)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Diferença</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant={kpis.diferenca > 0 ? "secondary" : "default"}>
                    {formatCurrency(kpis.diferenca)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">% Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(kpis.percentual_execucao)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento</CardTitle>
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
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Estimado</TableHead>
                      <TableHead className="text-right">Real</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>{new Date(row.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{row.talhao}</TableCell>
                        <TableCell>{row.tipo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.descricao}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.estimado)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.real)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.diferenca > 0 ? "secondary" : "default"}>
                            {formatCurrency(row.diferenca)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        <TableCell>
                          {!row.has_transaction && row.status === 'realizada' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openConciliarDialog(row)}
                                >
                                  <Link className="h-4 w-4 mr-1" />
                                  Conciliar
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[85svh] overflow-y-auto [-webkit-overflow-scrolling:touch]">
                                <DialogHeader>
                                  <DialogTitle>Conciliar Atividade</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      Atividade: {row.descricao} ({new Date(row.data).toLocaleDateString('pt-BR')})
                                    </p>
                                  </div>

                                  <div>
                                    <Label>Vincular a transação existente</Label>
                                    <Select value={selectedTx} onValueChange={setSelectedTx}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {transactions.map(tx => (
                                          <SelectItem key={tx.id} value={tx.id}>
                                            {new Date(tx.data).toLocaleDateString('pt-BR')} - {tx.descricao} - {formatCurrency(tx.valor_brl)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="text-center text-sm text-muted-foreground">ou</div>

                                  <div>
                                    <Label>Criar nova transação (R$)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={newTxValue}
                                      onChange={e => setNewTxValue(e.target.value)}
                                      disabled={!!selectedTx}
                                    />
                                  </div>

                                  <div className="flex gap-2 justify-end pt-4">
                                    <Button
                                      variant="outline"
                                      onClick={() => setConciliarActivity(null)}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={handleConciliar}
                                      disabled={!selectedTx && !newTxValue}
                                    >
                                      Conciliar
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {rows.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma atividade encontrada no período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
