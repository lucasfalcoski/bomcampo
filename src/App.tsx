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
import Mais from "./pages/Mais";
import FalaAgronomo from "./pages/FalaAgronomo";
import IAgronomoChat from "./pages/IAgronomoChat";
import AgronomistPanel from "./pages/partner/AgronomistPanel";
import ConversationDetail from "./pages/partner/ConversationDetail";
import OrgHome from "./pages/org/OrgHome";
import OrgUsers from "./pages/org/OrgUsers";
import OrgFarms from "./pages/org/OrgFarms";
import FarmAgronomists from "./pages/org/FarmAgronomists";
import OrgUsage from "./pages/org/OrgUsage";
import AgronomistInbox from "./pages/agronomist/AgronomistInbox";
import Parceiros from "./pages/admin/Parceiros";
import Auditoria from "./pages/admin/Auditoria";
import VisaoGeral from "./pages/admin/VisaoGeral";
import Conteudo from "./pages/admin/Conteudo";
import Videos from "./pages/admin/Videos";
import FalaAgronomoAdmin from "./pages/admin/FalaAgronomoAdmin";
import Alertas from "./pages/admin/Alertas";
import SuperadminDashboard from "./pages/superadmin/Dashboard";
import SuperadminWorkspaces from "./pages/superadmin/Workspaces";
import SuperadminUsers from "./pages/superadmin/Users";
import SuperadminFlags from "./pages/superadmin/Flags";
import SuperadminCampaigns from "./pages/superadmin/Campaigns";
import SuperadminIntegrations from "./pages/superadmin/Integrations";
import SuperadminAudit from "./pages/superadmin/Audit";
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
              path="/mais"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Mais />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fala-agronomo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FalaAgronomo />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <IAgronomoChat />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <OrgHome />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <OrgUsers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/farms"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <OrgFarms />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/farms/:id/agronomists"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FarmAgronomists />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/usage"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <OrgUsage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agronomist/inbox"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AgronomistInbox />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/agronomo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AgronomistPanel />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/agronomo/:conversationId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConversationDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/workspaces"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminWorkspaces />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminUsers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/flags"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminFlags />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/campaigns"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminCampaigns />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/integrations"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminIntegrations />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperadminAudit />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/visao-geral"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <VisaoGeral />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parceiros"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Parceiros />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/conteudo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Conteudo />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/videos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Videos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/fala-agronomo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FalaAgronomoAdmin />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/auditoria"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Auditoria />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/alertas"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Alertas />
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
