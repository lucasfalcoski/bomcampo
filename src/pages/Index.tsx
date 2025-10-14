import { useState } from "react";
import { Cloud, Sun, Droplets, Wind, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WeatherAlerts from "@/components/WeatherAlerts";
import FieldNotes from "@/components/FieldNotes";
import ActivityLog from "@/components/ActivityLog";
import AddActivityDialog from "@/components/AddActivityDialog";

const Index = () => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Cloud className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bom Tempo App</h1>
                <p className="text-sm text-muted-foreground">Gestão Agrícola Inteligente</p>
              </div>
            </div>
            <Button onClick={() => setIsAddActivityOpen(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nova Atividade
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Weather Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sun className="w-4 h-4 text-warning" />
                Temperatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28°C</div>
              <p className="text-xs text-muted-foreground mt-1">Máx: 32°C • Min: 18°C</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Droplets className="w-4 h-4 text-accent" />
                Umidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">65%</div>
              <p className="text-xs text-muted-foreground mt-1">Ideal para plantio</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wind className="w-4 h-4 text-primary" />
                Vento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12 km/h</div>
              <p className="text-xs text-muted-foreground mt-1">Direção: NE</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cloud className="w-4 h-4 text-muted-foreground" />
                Previsão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Parcial</div>
              <p className="text-xs text-muted-foreground mt-1">Chuva amanhã</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts and Notes */}
          <div className="lg:col-span-2 space-y-6">
            <WeatherAlerts />
            <FieldNotes />
          </div>

          {/* Right Column - Activity Log */}
          <div>
            <ActivityLog />
          </div>
        </div>
      </main>

      <AddActivityDialog 
        open={isAddActivityOpen} 
        onOpenChange={setIsAddActivityOpen} 
      />
    </div>
  );
};

export default Index;
