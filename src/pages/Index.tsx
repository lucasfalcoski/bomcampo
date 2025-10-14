import { Cloud, Sun, Droplets, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActivityLog from "@/components/ActivityLog";
import logo from "@/assets/logo.png";

const Index = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Bom Campo Logo" className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bom Campo</h1>
                <p className="text-sm text-muted-foreground">Gestão Agrícola Inteligente</p>
              </div>
            </div>
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
          {/* Left Column - Activity Log */}
          <div className="lg:col-span-2">
            <ActivityLog />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
