import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AccessGate from "./components/AccessGate";
import Home from "./pages/Home";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminCompetitions from "./pages/admin/AdminCompetitions";
import AdminSales from "./pages/admin/AdminSales";
import AdminTrainings from "./pages/admin/AdminTrainings";
import AdminActionPlans from "./pages/admin/AdminActionPlans";
import AdminSettings from "./pages/admin/AdminSettings";
import CompetitionView from "./pages/CompetitionView";
import SellerProfile from "./pages/SellerProfile";
import TrainingsList from "./pages/TrainingsList";
import RaceTrack from "./pages/RaceTrack";
import RegisterSale from "./pages/RegisterSale";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminGoals from "./pages/admin/AdminGoals";
import AdminSorteio from "./pages/admin/AdminSorteio";
import AdminAgendamentos from "./pages/admin/AdminAgendamentos";
import TVMode from "./pages/TVMode";
import MeusAgendamentos from "./pages/MeusAgendamentos";
import LiveAlerts from "./components/LiveAlerts";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/corrida/:id" component={RaceTrack} />
      <Route path="/competicao/:id" component={CompetitionView} />
      <Route path="/vendedor/:id" component={SellerProfile} />
      <Route path="/treinamentos" component={TrainingsList} />
      <Route path="/registrar-venda" component={RegisterSale} />
      <Route path="/tv" component={TVMode} />
      <Route path="/agendamentos/:sellerId" component={MeusAgendamentos} />
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
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
