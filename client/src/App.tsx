import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AccessGate from "./components/AccessGate";
import LiveAlerts from "./components/LiveAlerts";
import { lazy, Suspense } from "react";
import { Flag } from "lucide-react";

// Eagerly loaded (always needed)
import Home from "./pages/Home";
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
const AdminSorteio = lazy(() => import("./pages/admin/AdminSorteio"));
const AdminAgendamentos = lazy(() => import("./pages/admin/AdminAgendamentos"));
const AdminGerentes = lazy(() => import("./pages/admin/AdminGerentes"));
const AdminFei = lazy(() => import("./pages/admin/AdminFei"));
const AdminPosVenda = lazy(() => import("./pages/admin/AdminPosVenda"));
const AdminPvFinanceiro = lazy(() => import("./pages/admin/AdminPvFinanceiro"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));

const CompetitionView = lazy(() => import("./pages/CompetitionView"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const TrainingsList = lazy(() => import("./pages/TrainingsList"));
const RaceTrack = lazy(() => import("./pages/RaceTrack"));
const RegisterSale = lazy(() => import("./pages/RegisterSale"));
const TVMode = lazy(() => import("./pages/TVMode"));
const MeusAgendamentos = lazy(() => import("./pages/MeusAgendamentos"));
const SellerLogin = lazy(() => import("./pages/SellerLogin"));
const MinhaArea = lazy(() => import("./pages/MinhaArea"));
const ConsignmentControl = lazy(() => import("./pages/ConsignmentControl"));
const PosVenda = lazy(() => import("./pages/PosVenda"));

const CrmCommandCenter = lazy(() => import("./pages/crm/CrmCommandCenter"));
const CrmLeadDetail = lazy(() => import("./pages/crm/CrmLeadDetail"));
const CrmPipeline = lazy(() => import("./pages/crm/CrmPipeline"));
const CrmAdminLogin = lazy(() => import("./pages/crm/CrmAdminLogin"));
const CrmAdminDashboard = lazy(() => import("./pages/crm/CrmAdminDashboard"));
const IntegrationDocs = lazy(() => import("./pages/crm/IntegrationDocs"));

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
        <Route path="/" component={Home} />
        <Route path="/corrida/:id" component={RaceTrack} />
        <Route path="/competicao/:id" component={CompetitionView} />
        <Route path="/vendedor/:id" component={SellerProfile} />
        <Route path="/treinamentos" component={TrainingsList} />
        <Route path="/registrar-venda" component={RegisterSale} />
        <Route path="/tv" component={TVMode} />
        <Route path="/agendamentos/:sellerId" component={MeusAgendamentos} />
        <Route path="/login-vendedor" component={SellerLogin} />
        <Route path="/minha-area/:sellerId" component={MinhaArea} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/vendedores" component={AdminSellers} />
        <Route path="/admin/competicoes" component={AdminCompetitions} />
        <Route path="/admin/vendas" component={AdminSales} />
        <Route path="/admin/treinamentos" component={AdminTrainings} />
        <Route path="/admin/planos" component={AdminActionPlans} />
        <Route path="/admin/configuracoes" component={AdminSettings} />
        <Route path="/admin/aprovacoes" component={AdminApprovals} />
        <Route path="/admin/metas" component={AdminGoals} />
        <Route path="/admin/agendamentos" component={AdminAgendamentos} />
        <Route path="/admin/sorteio" component={AdminSorteio} />
        <Route path="/admin/gerentes" component={AdminGerentes} />
        <Route path="/admin/fei" component={AdminFei} />
        <Route path="/admin/pos-venda" component={AdminPosVenda} />
        <Route path="/admin/pv-financeiro" component={AdminPvFinanceiro} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        {/* CRM Routes */}
        <Route path="/crm" component={CrmCommandCenter} />
        <Route path="/crm/lead/:id" component={CrmLeadDetail} />
        <Route path="/crm/pipeline" component={CrmPipeline} />
        <Route path="/crm/admin/login" component={CrmAdminLogin} />
        <Route path="/crm/admin" component={CrmAdminDashboard} />
        <Route path="/crm/integracoes" component={IntegrationDocs} />
        <Route path="/pos-venda" component={PosVenda} />
        <Route path="/controle-patio" component={ConsignmentControl} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AccessGate>
            <LiveAlerts />
            <Router />
          </AccessGate>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
