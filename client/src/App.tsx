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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/corrida/:id" component={RaceTrack} />
      <Route path="/competicao/:id" component={CompetitionView} />
      <Route path="/vendedor/:id" component={SellerProfile} />
      <Route path="/treinamentos" component={TrainingsList} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/vendedores" component={AdminSellers} />
      <Route path="/admin/competicoes" component={AdminCompetitions} />
      <Route path="/admin/vendas" component={AdminSales} />
      <Route path="/admin/treinamentos" component={AdminTrainings} />
      <Route path="/admin/planos" component={AdminActionPlans} />
      <Route path="/admin/configuracoes" component={AdminSettings} />
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
            <Router />
          </AccessGate>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
