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
import Configuracoes from "./pages/Configuracoes";
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
