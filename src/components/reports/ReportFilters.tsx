import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReportFilters as ReportFiltersType } from "@/lib/reports/types";

interface Props {
  onFilterChange: (filters: ReportFiltersType) => void;
  showPlotFilter?: boolean;
  showPlantingFilter?: boolean;
  showGranularidade?: boolean;
}

export function ReportFilters({ 
  onFilterChange, 
  showPlotFilter = true,
  showPlantingFilter = false,
  showGranularidade = false,
}: Props) {
  const [farms, setFarms] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [selectedPlot, setSelectedPlot] = useState<string>("all");
  const [selectedPlanting, setSelectedPlanting] = useState<string>("all");
  const [periodo, setPeriodo] = useState<'mes' | 'ano' | 'intervalo'>('mes');
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [granularidade, setGranularidade] = useState<'dia' | 'semana' | 'mes'>('mes');

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      loadPlots(selectedFarm);
      if (showPlantingFilter) {
        loadPlantings(selectedFarm);
      }
    }
  }, [selectedFarm]);

  useEffect(() => {
    // Auto-set dates based on period
    const today = new Date();
    if (periodo === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDataInicio(firstDay.toISOString().split('T')[0]);
      setDataFim(lastDay.toISOString().split('T')[0]);
    } else if (periodo === 'ano') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      setDataInicio(firstDay.toISOString().split('T')[0]);
      setDataFim(lastDay.toISOString().split('T')[0]);
    }
  }, [periodo]);

  async function loadFarms() {
    const { data } = await supabase
      .from('farms')
      .select('id, nome')
      .order('nome');
    setFarms(data || []);
    if (data && data.length > 0) {
      setSelectedFarm(data[0].id);
    }
  }

  async function loadPlots(farmId: string) {
    const { data } = await supabase
      .from('plots')
      .select('id, nome')
      .eq('farm_id', farmId)
      .order('nome');
    setPlots(data || []);
  }

  async function loadPlantings(farmId: string) {
    const { data } = await supabase
      .from('plantings')
      .select(`
        id,
        data_plantio,
        plots!inner(farm_id, nome),
        crops(nome)
      `)
      .eq('plots.farm_id', farmId)
      .order('data_plantio', { ascending: false });
    setPlantings(data || []);
  }

  function handleApply() {
    if (!selectedFarm || !dataInicio || !dataFim) return;

    onFilterChange({
      farm_id: selectedFarm,
      plot_id: selectedPlot !== "all" ? selectedPlot : undefined,
      planting_id: selectedPlanting !== "all" ? selectedPlanting : undefined,
      periodo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      granularidade: showGranularidade ? granularidade : undefined,
    });
  }

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Filtros</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="farm">Fazenda *</Label>
          <Select value={selectedFarm} onValueChange={setSelectedFarm}>
            <SelectTrigger id="farm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {farms.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showPlotFilter && (
          <div>
            <Label htmlFor="plot">Talhão</Label>
            <Select value={selectedPlot} onValueChange={setSelectedPlot}>
              <SelectTrigger id="plot">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {plots.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showPlantingFilter && (
          <div>
            <Label htmlFor="planting">Plantio</Label>
            <Select value={selectedPlanting} onValueChange={setSelectedPlanting}>
              <SelectTrigger id="planting">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {plantings.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p.crops as any)?.nome} - {new Date(p.data_plantio).toLocaleDateString('pt-BR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="periodo">Período</Label>
          <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
            <SelectTrigger id="periodo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês atual</SelectItem>
              <SelectItem value="ano">Ano atual</SelectItem>
              <SelectItem value="intervalo">Intervalo personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {periodo === 'intervalo' && (
          <>
            <div>
              <Label htmlFor="data_inicio">Data Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data_fim">Data Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
              />
            </div>
          </>
        )}

        {showGranularidade && (
          <div>
            <Label htmlFor="granularidade">Granularidade</Label>
            <Select value={granularidade} onValueChange={(v: any) => setGranularidade(v)}>
              <SelectTrigger id="granularidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Dia</SelectItem>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={handleApply} disabled={!selectedFarm || !dataInicio || !dataFim}>
          Aplicar Filtros
        </Button>
      </div>
    </Card>
  );
}
