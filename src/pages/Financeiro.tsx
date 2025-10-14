import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' } as any);
};

const CATEGORIES = [
  { value: 'insumo', label: 'Insumo' },
  { value: 'mao_obra', label: 'Mão de Obra' },
  { value: 'maquinas', label: 'Máquinas' },
  { value: 'energia', label: 'Energia' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'venda', label: 'Venda' },
  { value: 'outros', label: 'Outros' },
];

const TRANSACTION_TYPES = [
  { value: 'custo', label: 'Custo' },
  { value: 'receita', label: 'Receita' },
];

export default function Financeiro() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    farm_id: '',
    plot_id: 'all',
    categoria: 'all',
    tipo: 'all',
    periodo: 'mes_atual',
    data_inicio: '',
    data_fim: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    farm_id: '',
    plot_id: '',
    tipo: 'custo' as 'custo' | 'receita',
    categoria: '',
    descricao: '',
    valor_brl: '',
    data: new Date().toISOString().split('T')[0],
    origem: '',
  });

  useEffect(() => {
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (filters.farm_id) {
      loadPlots();
      loadTransactions();
    }
  }, [filters]);

  const loadFarms = async () => {
    const { data } = await supabase.from('farms').select('*').order('nome');
    setFarms(data || []);
    if (data && data.length > 0 && !filters.farm_id) {
      setFilters(prev => ({ ...prev, farm_id: data[0].id }));
    }
  };

  const loadPlots = async () => {
    const { data } = await supabase.from('plots').select('*').eq('farm_id', filters.farm_id).order('nome');
    setPlots(data || []);
  };

  const loadTransactions = async () => {
    let query = supabase.from('transactions').select('*').eq('farm_id', filters.farm_id);

    if (filters.plot_id && filters.plot_id !== 'all') query = query.eq('plot_id', filters.plot_id);
    if (filters.categoria && filters.categoria !== 'all') query = query.eq('categoria', filters.categoria as any);
    if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo', filters.tipo as any);

    const { start, end } = getDateRange();
    if (start && end) {
      query = query.gte('data', start).lte('data', end);
    }

    const { data } = await query.order('data', { ascending: false });
    setTransactions(data || []);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (filters.periodo) {
      case 'mes_atual':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'ano_atual':
        return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
      case 'intervalo':
        return { start: filters.data_inicio, end: filters.data_fim };
      default:
        return { start: null, end: null };
    }
  };

  const handleSaveTransaction = async () => {
    if (!transactionForm.farm_id || !transactionForm.valor_brl || parseFloat(transactionForm.valor_brl) <= 0) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const data = {
      farm_id: transactionForm.farm_id,
      plot_id: transactionForm.plot_id || null,
      tipo: transactionForm.tipo as 'custo' | 'receita',
      categoria: transactionForm.categoria as 'insumo' | 'mao_obra' | 'maquinas' | 'energia' | 'transporte' | 'venda' | 'outros',
      descricao: transactionForm.descricao,
      valor_brl: parseFloat(transactionForm.valor_brl),
      data: transactionForm.data,
      origem: transactionForm.origem || null,
    };

    const { error } = editingTransaction
      ? await supabase.from('transactions').update(data).eq('id', editingTransaction.id)
      : await supabase.from('transactions').insert([data]);

    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao salvar transação', variant: 'destructive' });
      return;
    }

    toast({ title: editingTransaction ? 'Transação atualizada' : 'Transação criada' });
    setDialogOpen(false);
    setEditingTransaction(null);
    resetForm();
    loadTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir transação', variant: 'destructive' });
      return;
    }
    toast({ title: 'Transação excluída' });
    loadTransactions();
  };

  const resetForm = () => {
    setTransactionForm({
      farm_id: filters.farm_id,
      plot_id: '',
      tipo: 'custo',
      categoria: '',
      descricao: '',
      valor_brl: '',
      data: new Date().toISOString().split('T')[0],
      origem: '',
    });
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Origem'];
    const rows = transactions.map(t => [
      format(new Date(t.data), 'dd/MM/yyyy'),
      t.tipo === 'custo' ? 'Custo' : 'Receita',
      CATEGORIES.find(c => c.value === t.categoria)?.label || t.categoria,
      t.descricao,
      t.valor_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      t.origem || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const summary = useMemo(() => {
    const now = new Date();
    const mesAtual = { start: startOfMonth(now), end: endOfMonth(now) };
    const anoAtual = { start: startOfYear(now), end: endOfYear(now) };

    const calcular = (inicio: Date, fim: Date) => {
      const filtradas = transactions.filter(t => {
        const data = new Date(t.data);
        return data >= inicio && data <= fim;
      });
      const custos = filtradas.filter(t => t.tipo === 'custo').reduce((sum, t) => sum + t.valor_brl, 0);
      const receitas = filtradas.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor_brl, 0);
      return { custos, receitas, resultado: receitas - custos };
    };

    return {
      mes: calcular(mesAtual.start, mesAtual.end),
      ano: calcular(anoAtual.start, anoAtual.end),
    };
  }, [transactions]);

  const custosPorCategoria = useMemo(() => {
    const custos = transactions.filter(t => t.tipo === 'custo');
    const grouped = custos.reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor_brl;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([categoria, valor]) => ({
      categoria: CATEGORIES.find(c => c.value === categoria)?.label || categoria,
      valor: valor as number,
    }));
  }, [transactions]);

  const receitaCustoPorMes = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const meses = Array.from({ length: 12 }, (_, i) => i);
    return meses.map(mes => {
      const inicio = new Date(anoAtual, mes, 1);
      const fim = endOfMonth(inicio);
      const filtradas = transactions.filter(t => {
        const data = new Date(t.data);
        return data >= inicio && data <= fim;
      });
      const custos = filtradas.filter(t => t.tipo === 'custo').reduce((sum, t) => sum + t.valor_brl, 0);
      const receitas = filtradas.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor_brl, 0);
      return {
        mes: format(inicio, 'MMM', { locale: ptBR }),
        custos,
        receitas,
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Controle de custos e receitas</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Fazenda *</Label>
              <Select value={filters.farm_id} onValueChange={v => setFilters({ ...filters, farm_id: v, plot_id: 'all' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Talhão</Label>
              <Select value={filters.plot_id} onValueChange={v => setFilters({ ...filters, plot_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {plots.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filters.tipo} onValueChange={v => setFilters({ ...filters, tipo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TRANSACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={filters.categoria} onValueChange={v => setFilters({ ...filters, categoria: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filters.periodo} onValueChange={v => setFilters({ ...filters, periodo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="ano_atual">Ano Atual</SelectItem>
                  <SelectItem value="intervalo">Intervalo Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filters.periodo === 'intervalo' && (
              <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input type="date" value={filters.data_inicio} onChange={e => setFilters({ ...filters, data_inicio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={filters.data_fim} onChange={e => setFilters({ ...filters, data_fim: e.target.value })} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos MTD / YTD</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.mes.custos)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ano: {formatCurrency(summary.ano.custos)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas MTD / YTD</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary.mes.receitas)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ano: {formatCurrency(summary.ano.receitas)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado MTD / YTD</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.mes.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(summary.mes.resultado)}
            </div>
            <p className={`text-xs ${summary.ano.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
              Ano: {formatCurrency(summary.ano.resultado)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Custos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {custosPorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo registrado</p>
            ) : (
              <div className="space-y-2">
                {custosPorCategoria.map(item => (
                  <div key={item.categoria} className="flex items-center justify-between">
                    <span className="text-sm">{item.categoria}</span>
                    <span className="font-medium">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita vs Custo por Mês ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {receitaCustoPorMes.map(item => (
                <div key={item.mes} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.mes}</span>
                    <div className="flex gap-4">
                      <span className="text-success">R$ {item.receitas.toFixed(0)}</span>
                      <span className="text-destructive">R$ {item.custos.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-success"
                      style={{ width: `${item.receitas / (item.receitas + item.custos || 1) * 100}%` }}
                    />
                    <div
                      className="bg-destructive"
                      style={{ width: `${item.custos / (item.receitas + item.custos || 1) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} disabled={transactions.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={() => { setEditingTransaction(null); resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={t.tipo === 'receita' ? 'default' : 'destructive'}>
                        {t.tipo === 'receita' ? 'Receita' : 'Custo'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {CATEGORIES.find(c => c.value === t.categoria)?.label}
                      </span>
                    </div>
                    <p className="font-medium">{t.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {t.origem && ` • ${t.origem}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${t.tipo === 'receita' ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(t.valor_brl)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTransaction(t);
                          setTransactionForm({
                            farm_id: t.farm_id,
                            plot_id: t.plot_id || '',
                            tipo: t.tipo,
                            categoria: t.categoria,
                            descricao: t.descricao,
                            valor_brl: t.valor_brl.toString(),
                            data: t.data,
                            origem: t.origem || '',
                          });
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Transação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar' : 'Nova'} Transação</DialogTitle>
            <DialogDescription>Preencha os dados da transação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={transactionForm.tipo} onValueChange={(v: any) => setTransactionForm({ ...transactionForm, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={transactionForm.categoria} onValueChange={v => setTransactionForm({ ...transactionForm, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={transactionForm.descricao}
                onChange={e => setTransactionForm({ ...transactionForm, descricao: e.target.value })}
                placeholder="Ex: Compra de fertilizante"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionForm.valor_brl}
                  onChange={e => setTransactionForm({ ...transactionForm, valor_brl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={transactionForm.data}
                  onChange={e => setTransactionForm({ ...transactionForm, data: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fazenda *</Label>
              <Select value={transactionForm.farm_id} onValueChange={v => setTransactionForm({ ...transactionForm, farm_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Talhão</Label>
              <Select value={transactionForm.plot_id} onValueChange={v => setTransactionForm({ ...transactionForm, plot_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {plots.filter(p => p.farm_id === transactionForm.farm_id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Input
                value={transactionForm.origem}
                onChange={e => setTransactionForm({ ...transactionForm, origem: e.target.value })}
                placeholder="Ex: Fornecedor XYZ"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveTransaction} disabled={loading}>
                {loading ? 'Salvando...' : editingTransaction ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
