import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Loader2, AlertTriangle, Map, Sprout, Calendar } from 'lucide-react';
import { FieldNotes } from '@/components/FieldNotes';
import { ActivityLogComponent } from '@/components/ActivityLogComponent';
import { WeatherAlerts } from '@/components/WeatherAlerts';
import { SuggestedActivities } from '@/components/SuggestedActivities';
import { useAgroRecommendations } from '@/hooks/useAgroRecommendations';
import { gerarSugestoesAtividades, ActivitySuggestion } from '@/lib/agro/activitySuggestions';
import { LatLonHintDialog, shouldShowLatLonHint } from '@/components/LatLonHintDialog';
import { AddActivityDialog } from '@/components/AddActivityDialog';
import { canAddPlot, getRemainingPlots, PLAN_LIMITS } from '@/lib/planLimits';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingGrid } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

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
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [loadingPlantings, setLoadingPlantings] = useState(false);
  const [errorPlots, setErrorPlots] = useState(false);
  const [showLatLonHint, setShowLatLonHint] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [suggestedActivity, setSuggestedActivity] = useState<ActivitySuggestion | null>(null);
  
  // Hook para recomendações agrícolas
  const { recommendations, loading: loadingRecs } = useAgroRecommendations({
    farmId: selectedFarm,
    plotId: selectedPlot
  });

  // Gerar sugestões de atividades baseadas no clima
  const activitySuggestions = gerarSugestoesAtividades(recommendations);
  
  const [plotForm, setPlotForm] = useState({
    farm_id: '',
    nome: '',
    area_ha: '',
    solo_tipo: '',
    latitude: '',
    longitude: '',
    municipality_name: '',
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
    setLoadingPlots(true);
    setErrorPlots(false);
    const { data, error } = await supabase.from('plots').select('*').eq('farm_id', selectedFarm).order('nome');
    setLoadingPlots(false);
    if (error) {
      setErrorPlots(true);
      return;
    }
    setPlots(data || []);
  };

  const loadCrops = async () => {
    const { data } = await supabase.from('crops').select('*').order('nome');
    setCrops(data || []);
  };

  const loadPlantings = async () => {
    setLoadingPlantings(true);
    const { data } = await supabase
      .from('plantings')
      .select('*, crop:crops(*)')
      .eq('plot_id', selectedPlot!)
      .order('data_plantio', { ascending: false });
    setLoadingPlantings(false);
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

  const handleAddSuggestedActivity = (suggestion: ActivitySuggestion) => {
    setSuggestedActivity(suggestion);
    setActivityDialogOpen(true);
  };

  const handleActivityDialogClose = () => {
    setActivityDialogOpen(false);
    setSuggestedActivity(null);
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
      municipality_name: plotForm.municipality_name || null,
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

    // Show hint dialog if lat/lon missing and not editing
    if (!editingPlot && !data.latitude && !data.longitude && shouldShowLatLonHint()) {
      setShowLatLonHint(true);
    }
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
    setPlotForm({ farm_id: selectedFarm, nome: '', area_ha: '', solo_tipo: '', latitude: '', longitude: '', municipality_name: '' });
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
        <TabsList className="w-full overflow-x-auto flex-nowrap">
          <TabsTrigger value="talhoes" className="min-h-[44px] flex-1">Talhões</TabsTrigger>
          <TabsTrigger value="plantios" disabled={!selectedPlot} className="min-h-[44px] flex-1">Plantios</TabsTrigger>
          <TabsTrigger value="atividades" disabled={!selectedPlot} className="min-h-[44px] flex-1">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="talhoes" className="space-y-4">
          {/* Plan limit warning */}
          {!canAddPlot(plots.length) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você atingiu o limite de {PLAN_LIMITS.produtor_free.maxPlots} áreas do plano gratuito. 
                Entre em contato para fazer upgrade.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {plots.length} de {PLAN_LIMITS.produtor_free.maxPlots} áreas utilizadas
            </div>
            <Button 
              onClick={() => { setEditingPlot(null); resetPlotForm(); setPlotDialogOpen(true); }}
              disabled={!selectedFarm || !canAddPlot(plots.length)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Talhão
            </Button>
          </div>

          {loadingPlots ? (
            <LoadingGrid count={3} />
          ) : errorPlots ? (
            <ErrorState onRetry={loadPlots} />
          ) : plots.length === 0 ? (
            <EmptyState
              icon={Map}
              title="Nenhum talhão cadastrado"
              description="Cadastre seu primeiro talhão para registrar plantios e receber alertas climáticos."
              action={canAddPlot(0) ? {
                label: "Cadastrar Primeiro Talhão",
                onClick: () => { setEditingPlot(null); resetPlotForm(); setPlotDialogOpen(true); }
              } : undefined}
            />
          ) : (
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
                              municipality_name: plot.municipality_name || '',
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
          )}
        </TabsContent>

        <TabsContent value="plantios" className="space-y-4">
          {selectedPlot && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldNotes plot={currentPlot!} planting={currentPlanting} />
                {currentPlot?.latitude && currentPlot?.longitude && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recomendações Agrícolas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingRecs ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <WeatherAlerts recommendations={recommendations} />
                      )}
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

              {loadingPlantings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : plantings.length === 0 ? (
                <EmptyState
                  icon={Sprout}
                  title="Nenhum plantio registrado"
                  description="Registre seu primeiro plantio para acompanhar a cultura e receber recomendações."
                  action={{
                    label: "Novo Plantio",
                    onClick: () => { setEditingPlanting(null); resetPlantingForm(); setPlantingDialogOpen(true); }
                  }}
                  className="border-dashed"
                />
              ) : (
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
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="atividades" className="space-y-4">
          {selectedPlot && (
            <>
              {activitySuggestions.length > 0 && currentPlot?.latitude && currentPlot?.longitude && (
                <SuggestedActivities
                  suggestions={activitySuggestions}
                  onAddActivity={handleAddSuggestedActivity}
                />
              )}
              <ActivityLogComponent
                plotId={selectedPlot}
                plantingId={currentPlanting?.id}
                activities={activities}
                onUpdate={loadActivities}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Plot Dialog */}
      <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90svh] overflow-y-auto [-webkit-overflow-scrolling:touch]">
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
            <div className="space-y-2">
              <Label htmlFor="municipality_name">Município/UF (opcional)</Label>
              <Input
                id="municipality_name"
                value={plotForm.municipality_name}
                onChange={e => setPlotForm({ ...plotForm, municipality_name: e.target.value })}
                placeholder="Ex: São Paulo, SP"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude (opcional)</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={plotForm.latitude}
                  onChange={e => setPlotForm({ ...plotForm, latitude: e.target.value })}
                  placeholder="-23.5505"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude (opcional)</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={plotForm.longitude}
                  onChange={e => setPlotForm({ ...plotForm, longitude: e.target.value })}
                  placeholder="-46.6333"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Coordenadas melhoram a precisão do clima.
            </p>
            <div className="sticky bottom-0 bg-background pt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPlotDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button onClick={handleSavePlot} disabled={loading || !plotForm.nome} className="min-h-[44px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPlot ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planting Dialog */}
      <Dialog open={plantingDialogOpen} onOpenChange={setPlantingDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90svh] overflow-y-auto [-webkit-overflow-scrolling:touch]">
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
            <div className="sticky bottom-0 bg-background pt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPlantingDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button onClick={handleSavePlanting} disabled={loading || !plantingForm.crop_id} className="min-h-[44px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPlanting ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lat/Lon Hint Dialog */}
      <LatLonHintDialog
        open={showLatLonHint}
        onOpenChange={setShowLatLonHint}
        onAddNow={() => {
          // Reopen the last created plot for editing
          const lastPlot = plots[plots.length - 1];
          if (lastPlot) {
            setEditingPlot(lastPlot);
            setPlotForm({
              farm_id: selectedFarm,
              nome: lastPlot.nome,
              area_ha: lastPlot.area_ha?.toString() || '',
              solo_tipo: lastPlot.solo_tipo || '',
              latitude: lastPlot.latitude?.toString() || '',
              longitude: lastPlot.longitude?.toString() || '',
              municipality_name: lastPlot.municipality_name || '',
            });
            setPlotDialogOpen(true);
          }
        }}
      />

      {/* Suggested Activity Dialog */}
      {selectedPlot && (
        <AddActivityDialog
          open={activityDialogOpen}
          onOpenChange={handleActivityDialogClose}
          plotId={selectedPlot}
          plantingId={currentPlanting?.id}
          suggestedType={suggestedActivity?.code}
          suggestedReason={suggestedActivity?.reason}
          onSuccess={() => {
            loadActivities();
            handleActivityDialogClose();
          }}
        />
      )}
    </div>
  );
}
