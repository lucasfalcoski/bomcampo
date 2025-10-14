import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { FieldNotes } from '@/components/FieldNotes';
import { ActivityLogComponent } from '@/components/ActivityLogComponent';
import { WeatherAlerts } from '@/components/WeatherAlerts';

export default function Talhoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [plantingDialogOpen, setPlantingDialogOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState<any>(null);
  const [editingPlanting, setEditingPlanting] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  
  const [plotForm, setPlotForm] = useState({
    farm_id: '',
    nome: '',
    area_ha: '',
    solo_tipo: '',
    latitude: '',
    longitude: '',
  });

  const [plantingForm, setPlantingForm] = useState({
    crop_id: '',
    data_plantio: new Date().toISOString().split('T')[0],
    data_prev_colheita: '',
    densidade: '',
    expectativa_sacas_ha: '',
    status: 'planejado' as 'planejado' | 'em_andamento' | 'colhido',
  });

  useEffect(() => {
    loadFarms();
    loadCrops();
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      loadPlots();
    }
  }, [selectedFarm]);

  useEffect(() => {
    if (selectedPlot) {
      loadPlantings();
      loadActivities();
      loadWeather();
    }
  }, [selectedPlot]);

  const loadFarms = async () => {
    const { data } = await supabase.from('farms').select('*').order('nome');
    setFarms(data || []);
    if (data && data.length > 0 && !selectedFarm) {
      setSelectedFarm(data[0].id);
    }
  };

  const loadPlots = async () => {
    const { data } = await supabase.from('plots').select('*').eq('farm_id', selectedFarm).order('nome');
    setPlots(data || []);
  };

  const loadCrops = async () => {
    const { data } = await supabase.from('crops').select('*').order('nome');
    setCrops(data || []);
  };

  const loadPlantings = async () => {
    const { data } = await supabase
      .from('plantings')
      .select('*, crop:crops(*)')
      .eq('plot_id', selectedPlot!)
      .order('data_plantio', { ascending: false });
    setPlantings(data || []);
  };

  const loadActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('plot_id', selectedPlot!)
      .order('data', { ascending: false });
    setActivities(data || []);
  };

  const loadWeather = async () => {
    const plot = plots.find(p => p.id === selectedPlot);
    if (!plot?.latitude || !plot?.longitude) return;

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${plot.latitude}&longitude=${plot.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=precipitation_probability_max&timezone=America/Sao_Paulo&forecast_days=1`
      );
      const data = await response.json();
      setWeather({
        windSpeed: data.current.wind_speed_10m,
        precipProb: data.daily.precipitation_probability_max[0],
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
      });
    } catch (error) {
      console.error('Erro ao carregar clima:', error);
    }
  };

  const handleSavePlot = async () => {
    if (!selectedFarm) {
      toast({ title: 'Selecione uma fazenda primeiro', variant: 'destructive' });
      return;
    }

    if (!plotForm.nome.trim()) {
      toast({ title: 'Nome do talhão é obrigatório', variant: 'destructive' });
      return;
    }

    if (plotForm.area_ha && parseFloat(plotForm.area_ha) <= 0) {
      toast({ title: 'Área deve ser maior que zero', variant: 'destructive' });
      return;
    }

    if (plotForm.latitude && (parseFloat(plotForm.latitude) < -90 || parseFloat(plotForm.latitude) > 90)) {
      toast({ title: 'Latitude deve estar entre -90 e 90', variant: 'destructive' });
      return;
    }

    if (plotForm.longitude && (parseFloat(plotForm.longitude) < -180 || parseFloat(plotForm.longitude) > 180)) {
      toast({ title: 'Longitude deve estar entre -180 e 180', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const data = {
      farm_id: selectedFarm,
      nome: plotForm.nome,
      area_ha: plotForm.area_ha ? parseFloat(plotForm.area_ha) : null,
      solo_tipo: plotForm.solo_tipo || null,
      latitude: plotForm.latitude ? parseFloat(plotForm.latitude) : null,
      longitude: plotForm.longitude ? parseFloat(plotForm.longitude) : null,
    };

    const { error } = editingPlot
      ? await supabase.from('plots').update(data).eq('id', editingPlot.id)
      : await supabase.from('plots').insert([data]);

    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao salvar talhão', variant: 'destructive' });
      return;
    }

    toast({ title: editingPlot ? 'Talhão atualizado' : 'Talhão criado' });
    setPlotDialogOpen(false);
    setEditingPlot(null);
    resetPlotForm();
    loadPlots();
  };

  const handleDeletePlot = async (id: string) => {
    const { error } = await supabase.from('plots').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir talhão', variant: 'destructive' });
      return;
    }
    toast({ title: 'Talhão excluído' });
    loadPlots();
  };

  const handleSavePlanting = async () => {
    setLoading(true);
    const data = {
      plot_id: selectedPlot,
      crop_id: plantingForm.crop_id,
      data_plantio: plantingForm.data_plantio,
      data_prev_colheita: plantingForm.data_prev_colheita || null,
      densidade: plantingForm.densidade ? parseFloat(plantingForm.densidade) : null,
      expectativa_sacas_ha: plantingForm.expectativa_sacas_ha ? parseFloat(plantingForm.expectativa_sacas_ha) : null,
      status: plantingForm.status,
    };

    const { error } = editingPlanting
      ? await supabase.from('plantings').update(data).eq('id', editingPlanting.id)
      : await supabase.from('plantings').insert([data]);

    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao salvar plantio', variant: 'destructive' });
      return;
    }

    toast({ title: editingPlanting ? 'Plantio atualizado' : 'Plantio criado' });
    setPlantingDialogOpen(false);
    setEditingPlanting(null);
    resetPlantingForm();
    loadPlantings();
  };

  const handleDeletePlanting = async (id: string) => {
    const { error } = await supabase.from('plantings').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir plantio', variant: 'destructive' });
      return;
    }
    toast({ title: 'Plantio excluído' });
    loadPlantings();
  };

  const resetPlotForm = () => {
    setPlotForm({ farm_id: selectedFarm, nome: '', area_ha: '', solo_tipo: '', latitude: '', longitude: '' });
  };

  const resetPlantingForm = () => {
    setPlantingForm({
      crop_id: '',
      data_plantio: new Date().toISOString().split('T')[0],
      data_prev_colheita: '',
      densidade: '',
      expectativa_sacas_ha: '',
      status: 'planejado',
    });
  };

  const currentPlot = plots.find(p => p.id === selectedPlot);
  const currentPlanting = plantings.find(p => p.status !== 'colhido');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Talhões & Plantio</h1>
        <p className="text-muted-foreground">Gerencie suas áreas de cultivo</p>
      </div>

      <div className="space-y-2">
        <Label>Fazenda</Label>
        {farms.length === 0 ? (
          <Card className="p-4 bg-muted">
            <p className="text-sm text-muted-foreground text-center">
              Você ainda não possui fazendas cadastradas. Por favor, cadastre uma fazenda primeiro na página de Fazendas.
            </p>
          </Card>
        ) : (
          <Select value={selectedFarm} onValueChange={setSelectedFarm}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma fazenda" />
            </SelectTrigger>
            <SelectContent>
              {farms.map(farm => (
                <SelectItem key={farm.id} value={farm.id}>{farm.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="talhoes" className="w-full">
        <TabsList>
          <TabsTrigger value="talhoes">Talhões</TabsTrigger>
          <TabsTrigger value="plantios" disabled={!selectedPlot}>Plantios</TabsTrigger>
          <TabsTrigger value="atividades" disabled={!selectedPlot}>Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="talhoes" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => { setEditingPlot(null); resetPlotForm(); setPlotDialogOpen(true); }}
              disabled={!selectedFarm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Talhão
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plots.map(plot => (
              <Card
                key={plot.id}
                className={`cursor-pointer transition-all ${selectedPlot === plot.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedPlot(plot.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{plot.nome}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlot(plot);
                          setPlotForm({
                            farm_id: selectedFarm,
                            nome: plot.nome,
                            area_ha: plot.area_ha?.toString() || '',
                            solo_tipo: plot.solo_tipo || '',
                            latitude: plot.latitude?.toString() || '',
                            longitude: plot.longitude?.toString() || '',
                          });
                          setPlotDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlot(plot.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {plot.area_ha ? `${plot.area_ha} ha` : 'Área não definida'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {plot.solo_tipo && <p>Solo: {plot.solo_tipo}</p>}
                    {plot.latitude && plot.longitude && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="plantios" className="space-y-4">
          {selectedPlot && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldNotes plot={currentPlot!} planting={currentPlanting} />
                {weather && currentPlot?.latitude && currentPlot?.longitude && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Condições para Pulverização</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <WeatherAlerts
                        windSpeed={weather.windSpeed}
                        precipProb={weather.precipProb}
                        humidity={weather.humidity}
                        precipitation={weather.precipitation}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => { setEditingPlanting(null); resetPlantingForm(); setPlantingDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plantio
                </Button>
              </div>

              <div className="space-y-3">
                {plantings.map(planting => (
                  <Card key={planting.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{planting.crop.nome}</CardTitle>
                          <CardDescription>
                            {planting.crop.variedade && `${planting.crop.variedade} • `}
                            Plantado em {new Date(planting.data_plantio).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              planting.status === 'colhido'
                                ? 'secondary'
                                : planting.status === 'em_andamento'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {planting.status === 'planejado' ? 'Planejado' : planting.status === 'em_andamento' ? 'Em Andamento' : 'Colhido'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingPlanting(planting);
                              setPlantingForm({
                                crop_id: planting.crop_id,
                                data_plantio: planting.data_plantio,
                                data_prev_colheita: planting.data_prev_colheita || '',
                                densidade: planting.densidade?.toString() || '',
                                expectativa_sacas_ha: planting.expectativa_sacas_ha?.toString() || '',
                                status: planting.status,
                              });
                              setPlantingDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePlanting(planting.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {planting.densidade && (
                          <div>
                            <p className="text-muted-foreground">Densidade</p>
                            <p className="font-medium">{planting.densidade} pl/ha</p>
                          </div>
                        )}
                        {planting.expectativa_sacas_ha && (
                          <div>
                            <p className="text-muted-foreground">Expectativa</p>
                            <p className="font-medium">{planting.expectativa_sacas_ha} sc/ha</p>
                          </div>
                        )}
                        {planting.data_prev_colheita && (
                          <div>
                            <p className="text-muted-foreground">Prev. Colheita</p>
                            <p className="font-medium">{new Date(planting.data_prev_colheita).toLocaleDateString('pt-BR')}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="atividades">
          {selectedPlot && (
            <ActivityLogComponent
              plotId={selectedPlot}
              activities={activities}
              onUpdate={loadActivities}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Plot Dialog */}
      <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlot ? 'Editar' : 'Novo'} Talhão</DialogTitle>
            <DialogDescription>Preencha os dados do talhão</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={plotForm.nome}
                onChange={e => setPlotForm({ ...plotForm, nome: e.target.value })}
                placeholder="Ex: Talhão A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area_ha">Área (ha)</Label>
              <Input
                id="area_ha"
                type="number"
                step="0.01"
                min="0"
                value={plotForm.area_ha}
                onChange={e => setPlotForm({ ...plotForm, area_ha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solo_tipo">Tipo de Solo</Label>
              <Input
                id="solo_tipo"
                value={plotForm.solo_tipo}
                onChange={e => setPlotForm({ ...plotForm, solo_tipo: e.target.value })}
                placeholder="Ex: Argiloso"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={plotForm.latitude}
                  onChange={e => setPlotForm({ ...plotForm, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={plotForm.longitude}
                  onChange={e => setPlotForm({ ...plotForm, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPlotDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePlot} disabled={loading || !plotForm.nome}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPlot ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planting Dialog */}
      <Dialog open={plantingDialogOpen} onOpenChange={setPlantingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlanting ? 'Editar' : 'Novo'} Plantio</DialogTitle>
            <DialogDescription>Preencha os dados do plantio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crop_id">Cultura *</Label>
              <Select value={plantingForm.crop_id} onValueChange={value => setPlantingForm({ ...plantingForm, crop_id: value })}>
                <SelectTrigger id="crop_id">
                  <SelectValue placeholder="Selecione a cultura" />
                </SelectTrigger>
                <SelectContent>
                  {crops.map(crop => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {crop.nome} {crop.variedade && `- ${crop.variedade}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_plantio">Data de Plantio *</Label>
              <Input
                id="data_plantio"
                type="date"
                value={plantingForm.data_plantio}
                onChange={e => setPlantingForm({ ...plantingForm, data_plantio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_prev_colheita">Previsão de Colheita</Label>
              <Input
                id="data_prev_colheita"
                type="date"
                value={plantingForm.data_prev_colheita}
                onChange={e => setPlantingForm({ ...plantingForm, data_prev_colheita: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="densidade">Densidade (pl/ha)</Label>
                <Input
                  id="densidade"
                  type="number"
                  step="0.01"
                  min="0"
                  value={plantingForm.densidade}
                  onChange={e => setPlantingForm({ ...plantingForm, densidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectativa_sacas_ha">Expectativa (sc/ha)</Label>
                <Input
                  id="expectativa_sacas_ha"
                  type="number"
                  step="0.01"
                  min="0"
                  value={plantingForm.expectativa_sacas_ha}
                  onChange={e => setPlantingForm({ ...plantingForm, expectativa_sacas_ha: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={plantingForm.status} onValueChange={(value: any) => setPlantingForm({ ...plantingForm, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="colhido">Colhido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPlantingDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePlanting} disabled={loading || !plantingForm.crop_id}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPlanting ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
