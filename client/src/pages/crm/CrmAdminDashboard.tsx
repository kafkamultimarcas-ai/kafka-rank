import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAdminAuth } from "./CrmAdminLogin";
import {
  LayoutDashboard, Users, SlidersHorizontal, Car, Megaphone, Settings,
  LogOut, Search, Flame, Thermometer, Snowflake, TrendingUp, UserPlus,
  BarChart3, MessageCircle, Phone, Calendar, Eye, ChevronRight, ChevronLeft,
  Package, DollarSign, Shield, Menu, X, Bell, Wallet, Receipt, Camera,
  AlertTriangle, Clock, Check, ArrowUpRight, ArrowDownRight, FileText,
  CircleDollarSign, CreditCard, Banknote, Upload, Trash2, Edit, Save,
  CheckCircle, XCircle, Filter, Plus
} from "lucide-react";

const DEPT_LABELS: Record<string, string> = {
  vendas: "Vendas", pre_vendas: "Pré-Vendas/SDR", consignacao: "Consignação",
  fei: "F&I", marketing: "Marketing", financeiro: "Financeiro",
};

const DEPT_ICONS: Record<string, any> = {
  vendas: Car, pre_vendas: Phone, consignacao: Package,
  fei: DollarSign, marketing: Megaphone, financeiro: BarChart3,
};

const DEPT_COLORS: Record<string, string> = {
  vendas: "from-red-500/20 to-red-600/10 border-red-500/30",
  pre_vendas: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  consignacao: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  fei: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  marketing: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  financeiro: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
};

type AdminView = "dashboard" | "leads" | "pipeline" | "inventory" | "campaigns" | "marketing" | "settings" | "financial";

export default function CrmAdminDashboard() {
  const [, navigate] = useLocation();
  const { admin, isLoading, isAuthenticated, logout } = useAdminAuth();
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/crm/admin/login");
    return null;
  }

  const menuItems = [
    { key: "dashboard" as const, icon: LayoutDashboard, label: "Painel Geral" },
    { key: "leads" as const, icon: Users, label: "Todos os Leads" },
    { key: "pipeline" as const, icon: SlidersHorizontal, label: "Pipeline" },
    { key: "inventory" as const, icon: Car, label: "Estoque" },
    { key: "financial" as const, icon: Wallet, label: "Financeiro" },
    { key: "campaigns" as const, icon: Megaphone, label: "Campanhas" },
    { key: "marketing" as const, icon: BarChart3, label: "Marketing" },
    { key: "settings" as const, icon: Settings, label: "Configurações" },
  ];

  // When clicking a department card, navigate to leads filtered by that dept
  const handleDeptClick = (dept: string) => {
    setSelectedDept(dept);
    setActiveView("leads");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-sm font-bold text-foreground">CRM Admin</h1>
              <p className="text-[10px] text-muted-foreground">{admin?.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {menuItems.map(item => (
            <button key={item.key} onClick={() => { setActiveView(item.key); setSelectedDept(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeView === item.key ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-foreground">CRM Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <nav className="flex-1 p-2 space-y-0.5">
              {menuItems.map(item => (
                <button key={item.key} onClick={() => { setActiveView(item.key); setSelectedDept(null); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeView === item.key ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-border">
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-accent rounded-lg">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-base font-bold text-foreground">
                {menuItems.find(m => m.key === activeView)?.label || "Painel"}
                {selectedDept && activeView === "leads" && (
                  <span className="text-primary ml-2 text-sm">• {DEPT_LABELS[selectedDept]}</span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedDept && activeView === "leads" && (
                <Button size="sm" variant="ghost" onClick={() => setSelectedDept(null)} className="h-8 text-xs">
                  <X className="w-3 h-3 mr-1" /> Limpar filtro
                </Button>
              )}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar lead..." className="pl-9 h-9 w-48 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {activeView === "dashboard" && <DashboardView onSelectDept={handleDeptClick} />}
          {activeView === "leads" && <AllLeadsView searchQuery={searchQuery} filterDept={selectedDept} />}
          {activeView === "inventory" && <InventoryView />}
          {activeView === "financial" && <FinancialView />}
          {activeView === "campaigns" && <CampaignsView />}
          {activeView === "marketing" && <MarketingView />}
          {activeView === "settings" && <SettingsView />}
          {activeView === "pipeline" && <AdminPipelineView />}
        </div>
      </main>
    </div>
  );
}

// ===== DASHBOARD VIEW =====
function DashboardView({ onSelectDept }: { onSelectDept: (d: string) => void }) {
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });
  const { data: inventory } = trpc.crmInventory.list.useQuery({});

  const stats = useMemo(() => {
    if (!allLeads) return { total: 0, hot: 0, warm: 0, cold: 0, byDept: {} as Record<string, number>, today: 0 };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    return {
      total: allLeads.length,
      hot: allLeads.filter(l => l.score === "hot").length,
      warm: allLeads.filter(l => l.score === "warm").length,
      cold: allLeads.filter(l => l.score === "cold").length,
      byDept: allLeads.reduce((acc, l) => { acc[l.department] = (acc[l.department] || 0) + 1; return acc; }, {} as Record<string, number>),
      today: allLeads.filter(l => l.createdAt && new Date(l.createdAt).getTime() >= todayTs).length,
    };
  }, [allLeads]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="TOTAL LEADS" value={stats.total} color="text-primary" />
        <KpiCard icon={Flame} label="QUENTES" value={stats.hot} color="text-red-400" />
        <KpiCard icon={Thermometer} label="MORNOS" value={stats.warm} color="text-amber-400" />
        <KpiCard icon={UserPlus} label="HOJE" value={stats.today} color="text-green-400" />
      </div>

      {/* Department cards - CLICKABLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(DEPT_LABELS).map(([key, label]) => {
          const Icon = DEPT_ICONS[key] || Users;
          const colors = DEPT_COLORS[key] || "";
          const count = stats.byDept[key] || 0;
          return (
            <button key={key} onClick={() => onSelectDept(key)}
              className={`p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.02] active:scale-[0.98] text-left ${colors} group`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-foreground/70" />
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">leads ativos • clique para ver</p>
            </button>
          );
        })}
      </div>

      {/* Inventory summary */}
      {inventory && inventory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" /> Estoque ({inventory.length} veículos)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {inventory.slice(0, 8).map(v => (
              <div key={v.id} className="p-2 rounded-lg bg-accent/50 border border-border">
                <p className="text-xs font-medium text-foreground truncate">{v.brand} {v.model}</p>
                <p className="text-[10px] text-muted-foreground">{v.year} - {v.color}</p>
                {v.price && <p className="text-[10px] text-primary font-bold">R$ {Number(v.price).toLocaleString("pt-BR")}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ===== ALL LEADS VIEW (with department filter) =====
function AllLeadsView({ searchQuery, filterDept }: { searchQuery: string; filterDept: string | null }) {
  const [, navigate] = useLocation();
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false, department: filterDept || undefined });
  const { data: searchResults } = trpc.crmLeads.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  const leads = searchQuery.length >= 2 ? searchResults : allLeads;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{leads?.length || 0} leads</span>
      </div>
      {/* Mobile-friendly cards */}
      <div className="space-y-2 sm:hidden">
        {leads?.map(lead => {
          const ScoreIcon = lead.score === "hot" ? Flame : lead.score === "cold" ? Snowflake : Thermometer;
          const scoreColor = lead.score === "hot" ? "text-red-400" : lead.score === "cold" ? "text-blue-400" : "text-amber-400";
          return (
            <div key={lead.id} onClick={() => navigate(`/crm/lead/${lead.id}`)}
              className="p-3 rounded-xl border border-border bg-card active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground">{lead.name}</span>
                <ScoreIcon className={`w-4 h-4 ${scoreColor}`} />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-accent border border-border">{DEPT_LABELS[lead.department] || lead.department}</span>
                <span>{lead.stage}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 mt-2">
                  <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-medium">
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </a>
                  <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-medium">
                    <Phone className="w-3 h-3" /> Ligar
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Nome</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Telefone</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Setor</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Etapa</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Score</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Veículo</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads?.map(lead => {
              const ScoreIcon = lead.score === "hot" ? Flame : lead.score === "cold" ? Snowflake : Thermometer;
              const scoreColor = lead.score === "hot" ? "text-red-400" : lead.score === "cold" ? "text-blue-400" : "text-amber-400";
              return (
                <tr key={lead.id} onClick={() => navigate(`/crm/lead/${lead.id}`)}
                  className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-all">
                  <td className="py-2 px-2 text-foreground font-medium">{lead.name}</td>
                  <td className="py-2 px-2 text-muted-foreground">{lead.phone || "--"}</td>
                  <td className="py-2 px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent border border-border">{DEPT_LABELS[lead.department] || lead.department}</span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{lead.stage}</td>
                  <td className="py-2 px-2"><ScoreIcon className={`w-4 h-4 ${scoreColor}`} /></td>
                  <td className="py-2 px-2 text-muted-foreground truncate max-w-[150px]">{lead.vehicleInterest || "--"}</td>
                  <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {lead.phone && (
                        <>
                          <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                            className="p-1 rounded hover:bg-green-500/20 text-green-400"><MessageCircle className="w-3.5 h-3.5" /></a>
                          <a href={`tel:${lead.phone}`}
                            className="p-1 rounded hover:bg-blue-500/20 text-blue-400"><Phone className="w-3.5 h-3.5" /></a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(!leads || leads.length === 0) && (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum lead encontrado</p>
        </div>
      )}
    </div>
  );
}

// ===== FINANCIAL VIEW =====
function FinancialView() {
  const [tab, setTab] = useState<"dashboard" | "payable" | "receivable" | "scan">("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"payable" | "receivable">("payable");

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {[
          { key: "dashboard" as const, icon: BarChart3, label: "Resumo" },
          { key: "payable" as const, icon: ArrowUpRight, label: "A Pagar" },
          { key: "receivable" as const, icon: ArrowDownRight, label: "A Receber" },
          { key: "scan" as const, icon: Camera, label: "Escanear" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${tab === t.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <FinDashboard />}
      {tab === "payable" && <FinTransactionList type="payable" />}
      {tab === "receivable" && <FinTransactionList type="receivable" />}
      {tab === "scan" && <FinScanDocument />}
    </div>
  );
}

function FinDashboard() {
  const { data: dashboard } = trpc.finTransactions.dashboard.useQuery({});

  if (!dashboard) return <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>;

  const saldo = dashboard.totalReceived - dashboard.totalPaid;

  return (
    <div className="space-y-4">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-muted-foreground uppercase">A Receber</span>
          </div>
          <p className="text-xl font-bold text-green-400">R$ {dashboard.totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Recebido: R$ {dashboard.totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-[10px] text-muted-foreground uppercase">A Pagar</span>
          </div>
          <p className="text-xl font-bold text-red-400">R$ {dashboard.totalPayable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Pago: R$ {dashboard.totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Saldo + Overdue */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Saldo do Mês</span>
          </div>
          <p className={`text-xl font-bold ${saldo >= 0 ? "text-green-400" : "text-red-400"}`}>
            R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${dashboard.overdue > 0 ? "text-red-400" : "text-green-400"}`} />
            <span className="text-[10px] text-muted-foreground uppercase">Vencidas</span>
          </div>
          <p className={`text-xl font-bold ${dashboard.overdue > 0 ? "text-red-400" : "text-green-400"}`}>{dashboard.overdue}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{dashboard.overdue > 0 ? "contas atrasadas!" : "tudo em dia"}</p>
        </div>
      </div>

      {/* Upcoming due */}
      {dashboard.upcomingDue.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Próximos Vencimentos
          </h3>
          <div className="space-y-2">
            {dashboard.upcomingDue.map((tx: any) => {
              const dueDate = new Date(Number(tx.dueDate));
              const isToday = new Date().toDateString() === dueDate.toDateString();
              return (
                <div key={tx.id} className={`flex items-center justify-between p-2 rounded-lg border ${isToday ? "border-amber-500/30 bg-amber-500/10" : "border-border bg-accent/30"}`}>
                  <div>
                    <p className="text-xs font-medium text-foreground">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground">{dueDate.toLocaleDateString("pt-BR")} {isToday && <span className="text-amber-400 font-bold">• HOJE</span>}</p>
                  </div>
                  <p className={`text-sm font-bold ${tx.type === "payable" ? "text-red-400" : "text-green-400"}`}>
                    R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FinTransactionList({ type }: { type: "payable" | "receivable" }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const utils = trpc.useUtils();

  const { data } = trpc.finTransactions.list.useQuery({
    type,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });
  const { data: categories } = trpc.finCategories.list.useQuery({ type: type === "payable" ? "expense" : "income" });

  const markPaid = trpc.finTransactions.markPaid.useMutation({
    onSuccess: () => { utils.finTransactions.list.invalidate(); utils.finTransactions.dashboard.invalidate(); toast.success(type === "payable" ? "Marcado como pago!" : "Marcado como recebido!"); },
  });
  const deleteTx = trpc.finTransactions.delete.useMutation({
    onSuccess: () => { utils.finTransactions.list.invalidate(); utils.finTransactions.dashboard.invalidate(); toast.success("Excluído!"); },
  });

  const [form, setForm] = useState({ description: "", amount: "", dueDate: "", categoryId: 0, supplier: "", notes: "" });
  const createTx = trpc.finTransactions.create.useMutation({
    onSuccess: () => { utils.finTransactions.list.invalidate(); utils.finTransactions.dashboard.invalidate(); setShowAdd(false); setForm({ description: "", amount: "", dueDate: "", categoryId: 0, supplier: "", notes: "" }); toast.success("Lançamento criado!"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {[
            { key: "all", label: "Todos" },
            { key: "pending", label: "Pendentes" },
            { key: "paid", label: type === "payable" ? "Pagos" : "Recebidos" },
            { key: "overdue", label: "Vencidos" },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${statusFilter === f.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="racing-gradient text-white h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <h4 className="text-sm font-bold text-foreground">{type === "payable" ? "Nova Conta a Pagar" : "Nova Conta a Receber"}</h4>
          <Input placeholder="Descrição *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-9 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Valor (R$) *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-9 text-sm" />
            <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
              className="h-9 text-sm rounded-md border border-border bg-background px-3 text-foreground">
              <option value={0}>Categoria</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder={type === "payable" ? "Fornecedor" : "Cliente"} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="h-9 text-sm" />
          </div>
          <Input placeholder="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-9 text-sm" />
          <Button size="sm" onClick={() => {
            if (!form.description || !form.amount || !form.dueDate) { toast.error("Preencha descrição, valor e data"); return; }
            createTx.mutate({
              type,
              description: form.description,
              amount: form.amount,
              dueDate: new Date(form.dueDate + "T12:00:00").getTime(),
              categoryId: form.categoryId || undefined,
              supplier: form.supplier || undefined,
              notes: form.notes || undefined,
            });
          }} disabled={createTx.isPending} className="w-full racing-gradient text-white">
            {createTx.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-2">
        {data?.items.map((tx: any) => {
          const dueDate = new Date(Number(tx.dueDate));
          const isOverdue = tx.status === "pending" && Number(tx.dueDate) < Date.now();
          const isPaid = tx.status === "paid";
          return (
            <div key={tx.id} className={`p-3 rounded-xl border bg-card transition-all ${isOverdue ? "border-red-500/30 bg-red-500/5" : isPaid ? "border-green-500/20 bg-green-500/5 opacity-70" : "border-border"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isPaid ? "text-muted-foreground line-through" : "text-foreground"}`}>{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{dueDate.toLocaleDateString("pt-BR")}</span>
                    {tx.supplier && <span className="text-[10px] text-muted-foreground">• {tx.supplier}</span>}
                    {isOverdue && <span className="text-[10px] text-red-400 font-bold">VENCIDO</span>}
                    {isPaid && <span className="text-[10px] text-green-400 font-bold">PAGO</span>}
                  </div>
                </div>
                <p className={`text-sm font-bold shrink-0 ml-2 ${type === "payable" ? "text-red-400" : "text-green-400"}`}>
                  R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {!isPaid && (
                <div className="flex items-center gap-1 mt-2">
                  <button onClick={() => markPaid.mutate({ id: tx.id })}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-medium hover:bg-green-500/30 transition-all">
                    <Check className="w-3 h-3" /> {type === "payable" ? "Pagar" : "Receber"}
                  </button>
                  <button onClick={() => { if (confirm("Excluir este lançamento?")) deleteTx.mutate({ id: tx.id }); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30 transition-all">
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {(!data?.items || data.items.length === 0) && (
          <div className="text-center py-8">
            <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SCAN DOCUMENT (OCR via Camera) =====
function FinScanDocument() {
  const [docType, setDocType] = useState<"boleto" | "nota_fiscal" | "conta">("boleto");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const utils = trpc.useUtils();

  const scanMutation = trpc.finTransactions.scanDocument.useMutation({
    onSuccess: (data) => {
      setScanResult(data);
      toast.success("Documento escaneado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const createTx = trpc.finTransactions.create.useMutation({
    onSuccess: () => {
      utils.finTransactions.list.invalidate();
      utils.finTransactions.dashboard.invalidate();
      setScanResult(null);
      setImagePreview(null);
      setImageBase64(null);
      toast.success("Lançamento criado a partir do scan!");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = result.split(",")[1];
      setImageBase64(base64);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = () => {
    if (!imageBase64) { toast.error("Tire uma foto ou selecione uma imagem primeiro"); return; }
    scanMutation.mutate({ imageBase64, docType });
  };

  const handleCreateFromScan = () => {
    if (!scanResult?.data) return;
    const d = scanResult.data;
    let amount = "0";
    if (d.valor) {
      amount = String(d.valor).replace(/[^\d.,]/g, "").replace(",", ".");
    }
    let dueDate = Date.now();
    if (d.vencimento) {
      const parts = d.vencimento.split("/");
      if (parts.length === 3) {
        dueDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime();
      }
    }
    const description = d.beneficiario || d.emitente || d.empresa || d.descricao || "Documento escaneado";
    createTx.mutate({
      type: "payable",
      description,
      amount,
      dueDate,
      supplier: d.beneficiario || d.emitente || d.empresa || undefined,
      barcode: d.codigoBarras || undefined,
      notes: d.descricao || d.referencia || undefined,
      receiptUrl: scanResult.imageUrl || undefined,
      receiptKey: scanResult.imageKey || undefined,
    });
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center">
        <Camera className="w-10 h-10 text-primary mx-auto mb-2" />
        <h3 className="text-sm font-bold text-foreground">Escanear Documento</h3>
        <p className="text-[10px] text-muted-foreground">Tire uma foto do boleto, nota fiscal ou conta e o sistema extrai os dados automaticamente</p>
      </div>

      {/* Document type selector */}
      <div className="flex gap-2 justify-center">
        {[
          { key: "boleto" as const, label: "Boleto", icon: CreditCard },
          { key: "nota_fiscal" as const, label: "Nota Fiscal", icon: FileText },
          { key: "conta" as const, label: "Conta", icon: Banknote },
        ].map(t => (
          <button key={t.key} onClick={() => setDocType(t.key)}
            className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all ${docType === t.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
            <t.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Camera/file input */}
      <div className="relative">
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain bg-black/50" />
            <button onClick={() => { setImagePreview(null); setImageBase64(null); setScanResult(null); }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-border bg-accent/30 cursor-pointer hover:bg-accent/50 transition-all">
            <Camera className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">Toque para tirar foto ou selecionar imagem</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>

      {/* Scan button */}
      {imageBase64 && !scanResult && (
        <Button onClick={handleScan} disabled={scanMutation.isPending} className="w-full racing-gradient text-white">
          {scanMutation.isPending ? (
            <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Analisando documento...</span>
          ) : (
            <span className="flex items-center gap-2"><Camera className="w-4 h-4" /> Escanear Documento</span>
          )}
        </Button>
      )}

      {/* Scan results */}
      {scanResult?.data && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" /> Dados Extraídos
          </h4>
          <div className="space-y-1">
            {Object.entries(scanResult.data).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-xs text-foreground font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleCreateFromScan} disabled={createTx.isPending} className="w-full racing-gradient text-white">
            {createTx.isPending ? "Criando..." : "Criar Lançamento com Estes Dados"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== INVENTORY VIEW =====
function InventoryView() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: inventory, refetch } = trpc.crmInventory.list.useQuery({});

  const addVehicle = trpc.crmInventory.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); toast.success("Veículo adicionado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({ brand: "", model: "", year: "", color: "", price: "", plate: "" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{inventory?.length || 0} veículos</span>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="racing-gradient text-white h-8 text-xs">
          <Car className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {showAdd && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Marca" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Modelo" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Ano" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Cor" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Preço" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="h-9 text-sm" type="number" />
            <Input placeholder="Placa" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} className="h-9 text-sm" />
          </div>
          <Button size="sm" onClick={() => {
            if (!form.brand || !form.model || !form.year) { toast.error("Marca, modelo e ano obrigatórios"); return; }
            addVehicle.mutate({ brand: form.brand, model: form.model, year: form.year || undefined, color: form.color || undefined, price: form.price ? parseFloat(form.price) : 0, plate: form.plate || undefined });
          }} disabled={addVehicle.isPending} className="w-full racing-gradient text-white">
            {addVehicle.isPending ? "Salvando..." : "Salvar Veículo"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {inventory?.map(v => (
          <div key={v.id} className="p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-foreground">{v.brand} {v.model}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${v.status === "available" ? "bg-green-500/20 text-green-400" : v.status === "reserved" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                {v.status === "available" ? "Disponível" : v.status === "reserved" ? "Reservado" : "Vendido"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{v.year} - {v.color || "N/A"}</p>
            {v.plate && <p className="text-[10px] text-muted-foreground">Placa: {v.plate}</p>}
            {v.price && <p className="text-sm text-primary font-bold mt-1">R$ {Number(v.price).toLocaleString("pt-BR")}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== CAMPAIGNS VIEW =====
function CampaignsView() {
  return (
    <div className="text-center py-12">
      <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="text-sm font-bold text-foreground mb-1">Campanhas de Disparo</h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Módulo de campanhas para feirão e disparos em massa via WhatsApp.
        Configure a integração com WhatsApp Business API para ativar.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={() => toast.info("Configure a API do WhatsApp nas configurações para ativar campanhas")}>
        Configurar WhatsApp API
      </Button>
    </div>
  );
}

// ===== MARKETING VIEW =====
function MarketingView() {
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });

  const sourceStats = useMemo(() => {
    if (!allLeads) return [];
    const map: Record<string, number> = {};
    for (const l of allLeads) {
      const src = l.source || "manual";
      map[src] = (map[src] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count, pct: Math.round((count / allLeads.length) * 100) }));
  }, [allLeads]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground">Origem dos Leads</h3>
      <div className="space-y-2">
        {sourceStats.map(s => (
          <div key={s.source} className="flex items-center gap-3">
            <span className="text-xs text-foreground w-24 shrink-0 capitalize">{s.source.replace("_", " ")}</span>
            <div className="flex-1 h-6 bg-accent/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 rounded-full transition-all" style={{ width: `${s.pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-16 text-right">{s.count} ({s.pct}%)</span>
          </div>
        ))}
        {sourceStats.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead cadastrado ainda</p>
        )}
      </div>
    </div>
  );
}

// ===== SETTINGS VIEW (with permissions) =====
function SettingsView() {
  const { data: admins, refetch } = trpc.adminAuth.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", username: "", password: "", role: "admin",
    permissions: {
      vendas: true, pre_vendas: false, consignacao: false, fei: false,
      marketing: false, financeiro: false, estoque: false, configuracoes: false, gerenciar_admins: false,
    }
  });

  const createAdmin = trpc.adminAuth.create.useMutation({
    onSuccess: () => {
      refetch(); setShowAdd(false);
      setForm({ name: "", username: "", password: "", role: "admin", permissions: { vendas: true, pre_vendas: false, consignacao: false, fei: false, marketing: false, financeiro: false, estoque: false, configuracoes: false, gerenciar_admins: false } });
      toast.success("Admin criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const PERM_LABELS: Record<string, string> = {
    vendas: "Vendas", pre_vendas: "Pré-Vendas/SDR", consignacao: "Consignação",
    fei: "F&I", marketing: "Marketing", financeiro: "Financeiro",
    estoque: "Estoque", configuracoes: "Configurações", gerenciar_admins: "Gerenciar Admins",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Administradores do CRM</h3>
        <div className="space-y-2">
          {admins?.map((a: any) => {
            let perms: Record<string, boolean> = {};
            try { perms = JSON.parse(a.permissions || "{}"); } catch {}
            const activePerms = Object.entries(perms).filter(([, v]) => v).map(([k]) => PERM_LABELS[k] || k);
            return (
              <div key={a.id} className="p-3 rounded-lg bg-accent/50 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">@{a.username} • {a.role === "owner" ? "Dono" : "Admin"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${a.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {a.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                {a.role !== "owner" && activePerms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activePerms.map(p => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{p}</span>
                    ))}
                  </div>
                )}
                {a.role === "owner" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20">Acesso Total</span>
                )}
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Novo Admin
        </Button>
        {showAdd && (
          <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-border space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Usuário" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Senha" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-9 text-sm" />

            {/* Permissions checkboxes */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Permissões de Acesso:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PERM_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input type="checkbox" checked={(form.permissions as any)[key] || false}
                      onChange={e => setForm({ ...form, permissions: { ...form.permissions, [key]: e.target.checked } })}
                      className="rounded border-border" />
                    <span className="text-[11px] text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button size="sm" onClick={() => {
              if (!form.name || !form.username || !form.password) { toast.error("Preencha todos os campos"); return; }
              createAdmin.mutate({
                name: form.name, username: form.username, password: form.password,
                role: form.role as any, permissions: JSON.stringify(form.permissions),
              });
            }} disabled={createAdmin.isPending} className="w-full racing-gradient text-white">
              {createAdmin.isPending ? "Criando..." : "Criar Admin"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Integrações</h3>
        <div className="space-y-2">
          <IntegrationItem name="WhatsApp Business API" status="pendente" description="Configure para disparos em massa e recepção automática de leads" />
          <IntegrationItem name="SIG Web" status="pendente" description="Integre com seu sistema de gestão para sincronizar vendas" />
          <IntegrationItem name="OLX / Webmotors" status="pendente" description="Receba leads automaticamente das plataformas de anúncio" />
        </div>
      </div>
    </div>
  );
}

function IntegrationItem({ name, status, description }: { name: string; status: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
      <div>
        <p className="text-sm text-foreground font-medium">{name}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${status === "ativo" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
        {status}
      </span>
    </div>
  );
}

// ===== ADMIN PIPELINE VIEW =====
function AdminPipelineView() {
  const [dept, setDept] = useState("vendas");
  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: dept });
  const { data: leads } = trpc.crmLeads.listAll.useQuery({ department: dept, archived: false });
  const [, navigate] = useLocation();

  const leadsByStage = useMemo(() => {
    if (!leads || !stages) return {};
    const map: Record<string, typeof leads> = {};
    for (const s of stages) map[s.name] = [];
    for (const l of leads) {
      if (map[l.stage]) map[l.stage].push(l);
    }
    return map;
  }, [leads, stages]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {Object.entries(DEPT_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setDept(key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${dept === key ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {stages?.map(s => {
          const stageLeads = leadsByStage[s.name] || [];
          return (
            <div key={s.id} className="shrink-0 w-64 rounded-xl border border-border bg-card">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-bold text-foreground">{s.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{stageLeads.length}</span>
              </div>
              <div className="p-2 space-y-1.5 max-h-96 overflow-y-auto">
                {stageLeads.map(l => (
                  <div key={l.id} onClick={() => navigate(`/crm/lead/${l.id}`)}
                    className="p-2 rounded-lg bg-accent/50 border border-border cursor-pointer hover:bg-accent transition-all">
                    <p className="text-xs font-medium text-foreground truncate">{l.name}</p>
                    {l.vehicleInterest && <p className="text-[10px] text-muted-foreground truncate">{l.vehicleInterest}</p>}
                    {l.phone && (
                      <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                        <a href={`https://wa.me/55${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                          className="text-green-400 hover:text-green-300"><MessageCircle className="w-3 h-3" /></a>
                        <a href={`tel:${l.phone}`} className="text-blue-400 hover:text-blue-300"><Phone className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
