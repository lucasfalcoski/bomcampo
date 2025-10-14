import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User, Cloud, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [profile, setProfile] = useState({
    nome: '',
    email: '',
  });

  const [weatherPrefs, setWeatherPrefs] = useState({
    fonte_api: 'open-meteo',
    unidade_temp: 'C' as 'C' | 'F',
    alerta_chuva_limite_mm: 10,
    notif_alerta_chuva: true,
    notif_lembretes_atividades: true,
  });

  const [areaUnit, setAreaUnit] = useState<'ha' | 'alq'>('ha');
  const [areaValue, setAreaValue] = useState('1');

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    setLoadingData(true);
    
    // Carregar perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (profileData) {
      setProfile({
        nome: profileData.nome || '',
        email: user?.email || '',
      });
    }

    // Carregar preferências de clima
    const { data: weatherData } = await supabase
      .from('weather_prefs')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (weatherData) {
      setWeatherPrefs({
        fonte_api: weatherData.fonte_api || 'open-meteo',
        unidade_temp: (weatherData.unidade_temp as 'C' | 'F') || 'C',
        alerta_chuva_limite_mm: weatherData.alerta_chuva_limite_mm || 10,
        notif_alerta_chuva: weatherData.notif_alerta_chuva ?? true,
        notif_lembretes_atividades: weatherData.notif_lembretes_atividades ?? true,
      });
    }

    setLoadingData(false);
  };

  const handleSaveProfile = async () => {
    if (!profile.nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ nome: profile.nome })
      .eq('id', user?.id);

    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao salvar perfil', variant: 'destructive' });
      return;
    }

    toast({ title: 'Perfil atualizado com sucesso' });
  };

  const handleSaveWeatherPrefs = async () => {
    if (weatherPrefs.alerta_chuva_limite_mm < 0 || weatherPrefs.alerta_chuva_limite_mm > 1000) {
      toast({ title: 'Limite de chuva deve estar entre 0 e 1000mm', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('weather_prefs')
      .upsert({
        user_id: user?.id,
        fonte_api: weatherPrefs.fonte_api,
        unidade_temp: weatherPrefs.unidade_temp,
        alerta_chuva_limite_mm: weatherPrefs.alerta_chuva_limite_mm,
        notif_alerta_chuva: weatherPrefs.notif_alerta_chuva,
        notif_lembretes_atividades: weatherPrefs.notif_lembretes_atividades,
      });

    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao salvar preferências', variant: 'destructive' });
      return;
    }

    toast({ title: 'Preferências de clima atualizadas' });
  };

  const convertArea = (value: number, from: 'ha' | 'alq', to: 'ha' | 'alq') => {
    if (from === to) return value;
    // 1 alqueire paulista ≈ 2,42 ha
    if (from === 'ha' && to === 'alq') return value / 2.42;
    return value * 2.42;
  };

  const handleAreaUnitChange = (newUnit: 'ha' | 'alq') => {
    const numValue = parseFloat(areaValue) || 0;
    const converted = convertArea(numValue, areaUnit, newUnit);
    setAreaUnit(newUnit);
    setAreaValue(converted.toFixed(2));
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e dados pessoais</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="clima">
            <Cloud className="h-4 w-4 mr-2" />
            Clima
          </TabsTrigger>
          <TabsTrigger value="geral">
            <Settings2 className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={profile.nome}
                  onChange={e => setProfile({ ...profile, nome: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado aqui. Entre em contato com o suporte se necessário.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uid">ID do Usuário (UID)</Label>
                <Input
                  id="uid"
                  value={user?.id || ''}
                  disabled
                  className="bg-muted cursor-not-allowed font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único para referência técnica
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Salvar Perfil
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clima */}
        <TabsContent value="clima" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Clima</CardTitle>
              <CardDescription>Configure como os dados meteorológicos são exibidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fonte_api">Fonte de Dados</Label>
                <Input
                  id="fonte_api"
                  value={weatherPrefs.fonte_api}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Atualmente usando Open-Meteo API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade_temp">Unidade de Temperatura</Label>
                <Select
                  value={weatherPrefs.unidade_temp}
                  onValueChange={(v: 'C' | 'F') => setWeatherPrefs({ ...weatherPrefs, unidade_temp: v })}
                >
                  <SelectTrigger id="unidade_temp">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Celsius (°C)</SelectItem>
                    <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alerta_chuva">Limite de Alerta de Chuva (mm)</Label>
                <Input
                  id="alerta_chuva"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  value={weatherPrefs.alerta_chuva_limite_mm}
                  onChange={e => setWeatherPrefs({
                    ...weatherPrefs,
                    alerta_chuva_limite_mm: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Você será alertado quando a precipitação prevista exceder este valor (0-1000mm)
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Notificações por E-mail</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alerta de Chuva</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas quando houver previsão de chuva acima do limite
                    </p>
                  </div>
                  <Switch
                    checked={weatherPrefs.notif_alerta_chuva}
                    onCheckedChange={(checked) => 
                      setWeatherPrefs({ ...weatherPrefs, notif_alerta_chuva: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Atividades</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber lembretes diários às 18:00 sobre atividades do dia seguinte
                    </p>
                  </div>
                  <Switch
                    checked={weatherPrefs.notif_lembretes_atividades}
                    onCheckedChange={(checked) => 
                      setWeatherPrefs({ ...weatherPrefs, notif_lembretes_atividades: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveWeatherPrefs} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geral */}
        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências Regionais</CardTitle>
              <CardDescription>Configurações de moeda, idioma e unidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Input value="BRL - Real Brasileiro (R$)" disabled className="bg-muted cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">
                  Sistema configurado para Real Brasileiro
                </p>
              </div>

              <div className="space-y-2">
                <Label>Locale / Idioma</Label>
                <Input value="pt-BR - Português (Brasil)" disabled className="bg-muted cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">
                  Formatação de datas, números e separadores
                </p>
              </div>

              <div className="space-y-2">
                <Label>Unidade de Área</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={areaValue}
                    onChange={e => setAreaValue(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={areaUnit} onValueChange={(v: 'ha' | 'alq') => handleAreaUnitChange(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ha">Hectares (ha)</SelectItem>
                      <SelectItem value="alq">Alqueires (alq)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Conversor: 1 alqueire paulista ≈ 2,42 ha
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={toggleTheme}>
                    Alternar Tema Claro/Escuro
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mantém a paleta terrosa (areia, argila, marrom, floresta) em ambos os modos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
