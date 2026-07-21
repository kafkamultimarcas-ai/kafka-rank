import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { TenantProvider } from "./contexts/TenantContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AccessGate from "./components/AccessGate";
import LiveAlerts from "./components/LiveAlerts";
import TrialExpiredGate from "./components/TrialExpiredGate";
import { lazy, Suspense } from "react";
import { Flag } from "lucide-react";

import NotFound from "@/pages/NotFound";

// Lazy loaded pages - code split into separate chunks
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminCompetitions = lazy(() => import("./pages/admin/AdminCompetitions"));
const AdminSales = lazy(() => import("./pages/admin/AdminSales"));
const AdminTrainings = lazy(() => import("./pages/admin/AdminTrainings"));
const AdminActionPlans = lazy(() => import("./pages/admin/AdminActionPlans"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminGoals = lazy(() => import("./pages/admin/AdminGoals"));
const AdminAgendamentos = lazy(() => import("./pages/admin/AdminAgendamentos"));
// AdminGerentes removed - gerentes are now managed via AdminSellers (Equipe)
const AdminFei = lazy(() => import("./pages/admin/AdminFei"));
const AdminPosVenda = lazy(() => import("./pages/admin/AdminPosVenda"));
const AdminOficinas = lazy(() => import("./pages/admin/AdminOficinas"));
const AdminPvFinanceiro = lazy(() => import("./pages/admin/AdminPvFinanceiro"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminFinanceiro = lazy(() => import("./pages/admin/AdminFinanceiro"));
const AdminMetaIntegration = lazy(() => import("./pages/admin/AdminMetaIntegration"));
const AdminIAM = lazy(() => import("./pages/admin/AdminIAM"));
const AdminDocumentos = lazy(() => import("./pages/admin/AdminDocumentos"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminInventoryCreate = lazy(() => import("./pages/admin/AdminInventoryCreate"));
const AdminInventoryEdit = lazy(() => import("./pages/admin/AdminInventoryEdit"));
const AdminInventoryPreview = lazy(() => import("./pages/admin/AdminInventoryPreview"));
const AdminMonthTurnover = lazy(() => import("./pages/admin/AdminMonthTurnover"));
const AdminVehicleCosts = lazy(() => import("./pages/admin/AdminVehicleCosts"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Aniversariantes = lazy(() => import("./pages/admin/Aniversariantes"));

const CompetitionView = lazy(() => import("./pages/CompetitionView"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const TrainingsList = lazy(() => import("./pages/TrainingsList"));
const RaceTrack = lazy(() => import("./pages/RaceTrack"));
const RegisterSale = lazy(() => import("./pages/RegisterSale"));
const TVMode = lazy(() => import("./pages/TVMode"));
const MeusAgendamentos = lazy(() => import("./pages/MeusAgendamentos"));
const UnifiedLogin = lazy(() => import("./pages/UnifiedLogin"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const MinhaArea = lazy(() => import("./pages/MinhaArea"));
const ConsignmentControl = lazy(() => import("./pages/ConsignmentControl"));
const PosVenda = lazy(() => import("./pages/PosVenda"));
const IAVendedor = lazy(() => import("./pages/IAVendedor"));
const SimuladorFinanciamento = lazy(() => import("./pages/SimuladorFinanciamento"));
const FichaFinanciamento = lazy(() => import("./pages/FichaFinanciamento"));
const MesaCredito = lazy(() => import("./pages/MesaCredito"));
const GerentePanel = lazy(() => import("./pages/GerentePanel"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Estoque = lazy(() => import("./pages/Estoque"));
const FinanceiroPage = lazy(() => import("./pages/Financeiro"));
const AssinaturaPage = lazy(() => import("./pages/Assinatura"));
const CentralResultados = lazy(() => import("./pages/CentralResultados"));
const AdminBonusVehicles = lazy(() => import("./pages/admin/AdminBonusVehicles"));
const FinanceiroVendedores = lazy(() => import("./pages/admin/FinanceiroVendedores"));
const RankingFeirao = lazy(() => import("./pages/RankingFeirao"));
const CarrosBonusSeller = lazy(() => import("./pages/CarrosBonusSeller"));
const VehicleSearch = lazy(() => import("./pages/VehicleSearch"));

const CrmCommandCenter = lazy(() => import("./pages/crm/CrmCommandCenter"));
const CrmLeadDetail = lazy(() => import("./pages/crm/CrmLeadDetail"));
const CrmPipeline = lazy(() => import("./pages/crm/CrmPipeline"));
const CrmAdminDashboard = lazy(() => import("./pages/crm/CrmAdminDashboard"));
const IntegrationDocs = lazy(() => import("./pages/crm/IntegrationDocs"));
const ComercialHome = lazy(() => import("./pages/public/ComercialHome"));
const ComercialCadastro = lazy(() => import("./pages/public/ComercialCadastro"));
const ComercialTermos = lazy(() => import("./pages/public/ComercialLegal").then(m => ({ default: m.ComercialTermos })));
const ComercialPrivacidade = lazy(() => import("./pages/public/ComercialLegal").then(m => ({ default: m.ComercialPrivacidade })));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin text-primary">
        <Flag className="h-8 w-8" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={ComercialHome} />
        <Route path="/corrida/:id" component={RaceTrack} />
        <Route path="/t/:slug/corrida/:id" component={RaceTrack} />
        <Route path="/competicao/:id" component={CompetitionView} />
        <Route path="/t/:slug/competicao/:id" component={CompetitionView} />
        <Route path="/vendedor/:id" component={SellerProfile} />
        <Route path="/t/:slug/vendedor/:id" component={SellerProfile} />
        <Route path="/treinamentos" component={TrainingsList} />
        <Route path="/t/:slug/treinamentos" component={TrainingsList} />
        <Route path="/registrar-venda" component={RegisterSale} />
        <Route path="/t/:slug/registrar-venda" component={RegisterSale} />
        <Route path="/tv" component={TVMode} />
        <Route path="/t/:slug/tv" component={TVMode} />
        <Route path="/agendamentos/:sellerId" component={MeusAgendamentos} />
        <Route path="/t/:slug/agendamentos/:sellerId" component={MeusAgendamentos} />
        <Route path="/login" component={UnifiedLogin} />
        <Route path="/t/:slug/login" component={UnifiedLogin} />
        <Route path="/esqueci-senha" component={EsqueciSenha} />
        <Route path="/t/:slug/esqueci-senha" component={EsqueciSenha} />
        <Route path="/redefinir-senha" component={RedefinirSenha} />
        <Route path="/t/:slug/redefinir-senha" component={RedefinirSenha} />
        <Route path="/minha-area/:sellerId" component={MinhaArea} />
        <Route path="/t/:slug/minha-area/:sellerId" component={MinhaArea} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/t/:slug/admin" component={AdminDashboard} />
        <Route path="/admin/vendedores" component={AdminSellers} />
        <Route path="/t/:slug/admin/vendedores" component={AdminSellers} />
        <Route path="/admin/competicoes" component={AdminCompetitions} />
        <Route path="/t/:slug/admin/competicoes" component={AdminCompetitions} />
        <Route path="/admin/vendas" component={AdminSales} />
        <Route path="/t/:slug/admin/vendas" component={AdminSales} />
        <Route path="/admin/treinamentos" component={AdminTrainings} />
        <Route path="/t/:slug/admin/treinamentos" component={AdminTrainings} />
        <Route path="/admin/planos" component={AdminActionPlans} />
        <Route path="/t/:slug/admin/planos" component={AdminActionPlans} />
        <Route path="/admin/configuracoes" component={AdminSettings} />
        <Route path="/t/:slug/admin/configuracoes" component={AdminSettings} />
        <Route path="/admin/aprovacoes" component={AdminApprovals} />
        <Route path="/t/:slug/admin/aprovacoes" component={AdminApprovals} />
        <Route path="/admin/metas" component={AdminGoals} />
        <Route path="/t/:slug/admin/metas" component={AdminGoals} />
        <Route path="/admin/agendamentos" component={AdminAgendamentos} />
        <Route path="/t/:slug/admin/agendamentos" component={AdminAgendamentos} />
        <Route path="/admin/gerentes" component={AdminSellers} />
        <Route path="/t/:slug/admin/gerentes" component={AdminSellers} />
        <Route path="/admin/fei" component={AdminFei} />
        <Route path="/t/:slug/admin/fei" component={AdminFei} />
        <Route path="/admin/pos-venda" component={AdminPosVenda} />
        <Route path="/t/:slug/admin/pos-venda" component={AdminPosVenda} />
        <Route path="/admin/oficinas" component={AdminOficinas} />
        <Route path="/t/:slug/admin/oficinas" component={AdminOficinas} />
        <Route path="/admin/pv-financeiro" component={AdminPvFinanceiro} />
        <Route path="/t/:slug/admin/pv-financeiro" component={AdminPvFinanceiro} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        <Route path="/t/:slug/admin/marketing" component={AdminMarketing} />
        <Route path="/admin/financeiro" component={AdminFinanceiro} />
        <Route path="/t/:slug/admin/financeiro" component={AdminFinanceiro} />
        <Route path="/admin/fornecedores" component={Fornecedores} />
        <Route path="/t/:slug/admin/fornecedores" component={Fornecedores} />
        <Route path="/admin/meta-integration" component={AdminMetaIntegration} />
        <Route path="/t/:slug/admin/meta-integration" component={AdminMetaIntegration} />
        <Route path="/admin/iam" component={AdminIAM} />
        <Route path="/t/:slug/admin/iam" component={AdminIAM} />
        <Route path="/admin/documentos" component={AdminDocumentos} />
        <Route path="/t/:slug/admin/documentos" component={AdminDocumentos} />
        <Route path="/admin/estoque/cadastrar" component={AdminInventoryCreate} />
        <Route path="/t/:slug/admin/estoque/cadastrar" component={AdminInventoryCreate} />
        <Route path="/admin/estoque/:id/editar" component={AdminInventoryEdit} />
        <Route path="/t/:slug/admin/estoque/:id/editar" component={AdminInventoryEdit} />
        <Route path="/admin/estoque/:id/preview" component={AdminInventoryPreview} />
        <Route path="/t/:slug/admin/estoque/:id/preview" component={AdminInventoryPreview} />
        <Route path="/admin/estoque" component={AdminInventory} />
        <Route path="/t/:slug/admin/estoque" component={AdminInventory} />
        <Route path="/admin/virada-mes" component={AdminMonthTurnover} />
        <Route path="/t/:slug/admin/virada-mes" component={AdminMonthTurnover} />
        <Route path="/admin/custo-veiculo" component={AdminVehicleCosts} />
        <Route path="/t/:slug/admin/custo-veiculo" component={AdminVehicleCosts} />
        <Route path="/admin/custo-veiculo/:id" component={AdminVehicleCosts} />
        <Route path="/t/:slug/admin/custo-veiculo/:id" component={AdminVehicleCosts} />
        <Route path="/admin/aniversariantes" component={Aniversariantes} />
        <Route path="/t/:slug/admin/aniversariantes" component={Aniversariantes} />
        <Route path="/admin/bonus-veiculos" component={AdminBonusVehicles} />
        <Route path="/t/:slug/admin/bonus-veiculos" component={AdminBonusVehicles} />
        <Route path="/admin/financeiro-vendedores" component={FinanceiroVendedores} />
        <Route path="/t/:slug/admin/financeiro-vendedores" component={FinanceiroVendedores} />
        {/* CRM Routes */}
        <Route path="/crm" component={CrmCommandCenter} />
        <Route path="/t/:slug/crm" component={CrmCommandCenter} />
        <Route path="/crm/lead/:id" component={CrmLeadDetail} />
        <Route path="/t/:slug/crm/lead/:id" component={CrmLeadDetail} />
        <Route path="/crm/pipeline" component={CrmPipeline} />
        <Route path="/t/:slug/crm/pipeline" component={CrmPipeline} />
        <Route path="/crm/admin" component={CrmAdminDashboard} />
        <Route path="/t/:slug/crm/admin" component={CrmAdminDashboard} />
        <Route path="/crm/integracoes" component={IntegrationDocs} />
        <Route path="/t/:slug/crm/integracoes" component={IntegrationDocs} />
        <Route path="/comercial" component={ComercialHome} />
        <Route path="/comercial/cadastro" component={ComercialCadastro} />
        <Route path="/comercial/termos" component={ComercialTermos} />
        <Route path="/comercial/privacidade" component={ComercialPrivacidade} />
        <Route path="/pos-venda" component={PosVenda} />
        <Route path="/t/:slug/pos-venda" component={PosVenda} />
        <Route path="/controle-patio" component={ConsignmentControl} />
        <Route path="/t/:slug/controle-patio" component={ConsignmentControl} />
        <Route path="/ia-vendedor/:sellerId" component={IAVendedor} />
        <Route path="/t/:slug/ia-vendedor/:sellerId" component={IAVendedor} />
        <Route path="/simulador-financiamento/:sellerId" component={SimuladorFinanciamento} />
        <Route path="/t/:slug/simulador-financiamento/:sellerId" component={SimuladorFinanciamento} />
        <Route path="/simulador-financiamento" component={SimuladorFinanciamento} />
        <Route path="/t/:slug/simulador-financiamento" component={SimuladorFinanciamento} />
        <Route path="/ficha-financiamento" component={FichaFinanciamento} />
        <Route path="/t/:slug/ficha-financiamento" component={FichaFinanciamento} />
        <Route path="/mesa-credito" component={MesaCredito} />
        <Route path="/t/:slug/mesa-credito" component={MesaCredito} />
        <Route path="/estoque" component={Estoque} />
        <Route path="/t/:slug/estoque" component={Estoque} />
        <Route path="/financeiro" component={FinanceiroPage} />
        <Route path="/t/:slug/financeiro" component={FinanceiroPage} />
        <Route path="/fornecedores" component={Fornecedores} />
        <Route path="/t/:slug/fornecedores" component={Fornecedores} />
        <Route path="/assinatura" component={AssinaturaPage} />
        <Route path="/t/:slug/assinatura" component={AssinaturaPage} />
        <Route path="/feirao" component={RankingFeirao} />
        <Route path="/t/:slug/feirao" component={RankingFeirao} />
        <Route path="/meus-resultados/:sellerId" component={CentralResultados} />
        <Route path="/t/:slug/meus-resultados/:sellerId" component={CentralResultados} />
        <Route path="/carros-bonus/:sellerId?" component={CarrosBonusSeller} />
        <Route path="/t/:slug/carros-bonus/:sellerId?" component={CarrosBonusSeller} />
        <Route path="/busca-veiculo" component={VehicleSearch} />
        <Route path="/t/:slug/busca-veiculo" component={VehicleSearch} />
        <Route path="/gerente" component={GerentePanel} />
        <Route path="/t/:slug/gerente" component={GerentePanel} />
        <Route path="/super-admin" component={SuperAdmin} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster position="top-right" duration={3000} closeButton richColors toastOptions={{ style: { zIndex: 99999 } }} />
            <AccessGate>
              <LiveAlerts />
              <Router />
            </AccessGate>
            <TrialExpiredGate />
          </TooltipProvider>
        </ThemeProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
}

export default App;
