import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Fazendas from "./pages/Fazendas";
import Clima from "./pages/Clima";
import Talhoes from "./pages/Talhoes";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import AtividadesEstimadoReal from "./pages/relatorios/AtividadesEstimadoReal";
import PorTipo from "./pages/relatorios/PorTipo";
import PorTalhao from "./pages/relatorios/PorTalhao";
import ResumoClimatico from "./pages/relatorios/clima/ResumoClimatico";
import ConformidadePulverizacao from "./pages/relatorios/clima/ConformidadePulverizacao";
import RiscoDoencas from "./pages/relatorios/clima/RiscoDoencas";
import GeadaEstresse from "./pages/relatorios/clima/GeadaEstresse";
import PerformanceCultura from "./pages/relatorios/culturas/PerformanceCultura";
import PlanejadoExecutado from "./pages/relatorios/operacao/PlanejadoExecutado";
import HeatmapAtividades from "./pages/relatorios/operacao/HeatmapAtividades";
import Configuracoes from "./pages/Configuracoes";
import Precos from "./pages/Precos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fazendas"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Fazendas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clima"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Clima />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/talhoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Talhoes />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Financeiro />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Relatorios />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/atividades"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AtividadesEstimadoReal />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/tipo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PorTipo />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/talhao"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PorTalhao />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/clima/resumo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ResumoClimatico />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/clima/conformidade"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConformidadePulverizacao />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/clima/risco-doencas"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RiscoDoencas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/clima/geada-estresse"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <GeadaEstresse />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/culturas/performance"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PerformanceCultura />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/operacao/planejado-executado"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PlanejadoExecutado />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios/operacao/heatmap"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <HeatmapAtividades />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/precos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Precos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Configuracoes />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
