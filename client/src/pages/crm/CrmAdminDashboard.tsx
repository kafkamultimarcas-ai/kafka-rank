import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import CrmChat, { PerformanceDashboard } from "./CrmChat";
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
  CheckCircle, XCircle, Filter, Plus, Zap, Power, Bot, Send, Volume2,
  Shuffle, ArrowRightLeft, Timer, Headphones, Target,
  ShieldBan, Lock, Unlock, Slash, ImageIcon, Video, RefreshCw
} from "lucide-react";
import { ChannelIcon, ChannelBadge } from "@/components/ChannelIcon";

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

type AdminView = "dashboard" | "leads" | "chat" | "performance" | "pipeline" | "inventory" | "campaigns" | "marketing" | "settings" | "financial" | "sdr" | "attendant" | "fichas" | "ai_metrics";

export default function CrmAdminDashboard() {
  const [, navigate] = useLocation();
  const { admin, isLoading, isAuthenticated, logout } = useAdminAuth();
  const [activeView, setActiveView] = useState<AdminView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Only navigate if not already on login page to prevent loops
      if (window.location.pathname !== "/crm/admin/login") {
        navigate("/crm/admin/login", { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    // --- Principal ---
    { key: "dashboard" as const, icon: LayoutDashboard, label: "Visão Geral", section: "Principal" },
    { key: "chat" as const, icon: MessageCircle, label: "Conversas", section: "Principal" },
    { key: "leads" as const, icon: Users, label: "Todos os Clientes", section: "Principal" },
    { key: "pipeline" as const, icon: SlidersHorizontal, label: "Etapas de Venda", section: "Principal" },
    // --- Vendas ---
    { key: "fichas" as const, icon: CreditCard, label: "Fichas de Crédito", section: "Vendas" },
    { key: "inventory" as const, icon: Car, label: "Estoque", section: "Vendas" },
    { key: "financial" as const, icon: Wallet, label: "Financeiro", section: "Vendas" },
    { key: "performance" as const, icon: TrendingUp, label: "Resultados", section: "Vendas" },
    // --- IA & Marketing ---
    { key: "attendant" as const, icon: Bot, label: "IA Atendente", section: "IA & Marketing" },
    { key: "ai_metrics" as const, icon: BarChart3, label: "Métricas IA", section: "IA & Marketing" },
    { key: "campaigns" as const, icon: Megaphone, label: "Campanhas", section: "IA & Marketing" },
    { key: "marketing" as const, icon: BarChart3, label: "Marketing", section: "IA & Marketing" },
    // --- Equipe ---
    { key: "sdr" as const, icon: Headphones, label: "Painel SDR", section: "Equipe" },
    { key: "settings" as const, icon: Settings, label: "Ajustes", section: "Equipe" },
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
              <h1 className="text-sm font-bold text-foreground">CRM Gerente</h1>
              <p className="text-[10px] text-muted-foreground">{admin?.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const showSection = idx === 0 || item.section !== menuItems[idx - 1].section;
            return (<div key={item.key}>
              {showSection && <div className={`px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 ${idx > 0 ? 'mt-2 border-t border-border/30 pt-3' : ''}`}>{item.section}</div>}
              <button onClick={() => { setActiveView(item.key); setSelectedDept(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeView === item.key ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            </div>);
          })}
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
                <span className="text-sm font-bold text-foreground">CRM Gerente</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {menuItems.map((item, idx) => {
                const showSection = idx === 0 || item.section !== menuItems[idx - 1].section;
                return (<div key={item.key}>
                  {showSection && <div className={`px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 ${idx > 0 ? 'mt-2 border-t border-border/30 pt-3' : ''}`}>{item.section}</div>}
                  <button onClick={() => { setActiveView(item.key); setSelectedDept(null); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeView === item.key ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </div>);
              })}
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

        {activeView === "chat" && <CrmChat isSdr={true} />}
        {activeView === "performance" && <PerformanceDashboard />}
        <div className="p-4">
          {activeView === "dashboard" && <DashboardView onSelectDept={handleDeptClick} />}
          {activeView === "leads" && <AllLeadsView searchQuery={searchQuery} filterDept={selectedDept} />}
          {activeView === "inventory" && <InventoryView />}
          {activeView === "financial" && <FinancialView />}
          {activeView === "campaigns" && <CampaignsView />}
          {activeView === "marketing" && <MarketingView />}
          {activeView === "settings" && <SettingsView />}
          {activeView === "pipeline" && <AdminPipelineView />}
          {activeView === "sdr" && <SDRManagementView />}
          {activeView === "attendant" && <AIAttendantView />}
          {activeView === "ai_metrics" && <AIMetricsDashboard />}
          {activeView === "fichas" && <CreditApplicationsView />}
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
const SOURCE_LABELS_CRM: Record<string, { label: string; color: string; bg: string }> = {
  manual: { label: "Manual", color: "text-gray-400", bg: "bg-gray-500/20" },
  whatsapp: { label: "WhatsApp", color: "text-green-400", bg: "bg-green-500/20" },
  olx: { label: "OLX", color: "text-orange-400", bg: "bg-orange-500/20" },
  webmotors: { label: "Webmotors", color: "text-blue-400", bg: "bg-blue-500/20" },
  socarrao: { label: "SoCarrao", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  facebook: { label: "Facebook", color: "text-blue-500", bg: "bg-blue-600/20" },
  instagram: { label: "Instagram", color: "text-pink-400", bg: "bg-pink-500/20" },
  instagram_ads: { label: "Insta Ads", color: "text-pink-400", bg: "bg-pink-500/20" },
  facebook_ads: { label: "FB Ads", color: "text-blue-500", bg: "bg-blue-600/20" },
  google_ads: { label: "Google Ads", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  trafego_pago: { label: "Trafego", color: "text-purple-400", bg: "bg-purple-500/20" },
  indicacao: { label: "Indicacao", color: "text-cyan-400", bg: "bg-cyan-500/20" },
  loja: { label: "Loja", color: "text-amber-400", bg: "bg-amber-500/20" },
  landing_page: { label: "Landing", color: "text-indigo-400", bg: "bg-indigo-500/20" },
  icarros: { label: "iCarros", color: "text-red-400", bg: "bg-red-500/20" },
  manychat: { label: "ManyChat", color: "text-blue-300", bg: "bg-blue-400/20" },
  webhook: { label: "API", color: "text-violet-400", bg: "bg-violet-500/20" },
};

const SCORE_CFG_CRM = {
  hot: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  warm: { label: "Morno", icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function crmTimeAgo(ts: number | string | Date | null | undefined) {
  if (!ts) return "Sem contato";
  const numTs = typeof ts === "number" ? ts : (ts instanceof Date ? ts.getTime() : new Date(ts).getTime());
  const diff = Date.now() - numTs;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atr\u00e1s`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days}d atr\u00e1s`;
}

function AllLeadsView({ searchQuery, filterDept }: { searchQuery: string; filterDept: string | null }) {
  const [, navigate] = useLocation();
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [assignSellerId, setAssignSellerId] = useState("");
  const [filterScore, setFilterScore] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const { data: allLeads, refetch } = trpc.crmLeads.listAll.useQuery({ archived: false, department: filterDept || undefined });
  const { data: unassignedLeads, refetch: refetchUnassigned } = trpc.crmLeads.listUnassigned.useQuery({});
  const { data: searchResults } = trpc.crmLeads.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  const { data: sellers } = trpc.sellers.list.useQuery();

  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => { refetch(); refetchUnassigned(); toast.success("Lead transferido!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkAssign = trpc.crmLeads.bulkAssign.useMutation({
    onSuccess: (r: any) => { refetch(); refetchUnassigned(); setSelectedLeads(new Set()); toast.success(`${r.assigned} leads distribu\u00eddos!`); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLead = (id: number) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedLeads(next);
  };

  const handleBulkAssign = () => {
    const sid = parseInt(assignSellerId);
    if (!sid || selectedLeads.size === 0) return toast.error("Selecione leads e vendedor");
    bulkAssign.mutate({ leadIds: Array.from(selectedLeads), newSellerId: sid, currentSellerId: 0 });
  };

  // Stats
  const stats = useMemo(() => {
    if (!allLeads) return { total: 0, hot: 0, warm: 0, cold: 0 };
    return {
      total: allLeads.length,
      hot: allLeads.filter(l => l.score === "hot").length,
      warm: allLeads.filter(l => l.score === "warm").length,
      cold: allLeads.filter(l => l.score === "cold").length,
    };
  }, [allLeads]);

  // Available sources
  const availableSources = useMemo(() => {
    if (!allLeads) return [];
    return Array.from(new Set(allLeads.map(l => l.source).filter(Boolean)));
  }, [allLeads]);

  // Seller name map
  const sellerMap = useMemo(() => {
    if (!sellers) return {} as Record<number, string>;
    return sellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [sellers]);

  // Color map for sellers
  const SELLER_COLORS_ADMIN = [
    "bg-cyan-500/15 text-cyan-400",
    "bg-violet-500/15 text-violet-400",
    "bg-pink-500/15 text-pink-400",
    "bg-teal-500/15 text-teal-400",
    "bg-orange-500/15 text-orange-400",
    "bg-lime-500/15 text-lime-400",
    "bg-sky-500/15 text-sky-400",
    "bg-rose-500/15 text-rose-400",
    "bg-indigo-500/15 text-indigo-400",
    "bg-emerald-500/15 text-emerald-400",
  ];
  const sellerColorMap = useMemo(() => {
    if (!sellers) return {} as Record<number, string>;
    return sellers.reduce((acc: Record<number, string>, s: any, i: number) => {
      acc[s.id] = SELLER_COLORS_ADMIN[i % SELLER_COLORS_ADMIN.length];
      return acc;
    }, {});
  }, [sellers]);

  // Apply filters
  const baseLeads = searchQuery.length >= 2 ? searchResults : (showUnassigned ? unassignedLeads : allLeads);
  const leads = useMemo(() => {
    if (!baseLeads) return [];
    return baseLeads.filter(l => {
      if (filterScore && l.score !== filterScore) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    });
  }, [baseLeads, filterScore, filterSource]);

  return (
    <div className="space-y-3">
      {/* Quick stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => setFilterScore(null)}
          className={`rounded-xl border p-2.5 text-center transition-all ${!filterScore ? "bg-primary/10 border-primary/40" : "bg-card border-border"}`}>
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </button>
        <button onClick={() => setFilterScore(filterScore === "hot" ? null : "hot")}
          className={`rounded-xl border p-2.5 text-center transition-all ${filterScore === "hot" ? "bg-red-500/15 border-red-500/40" : "bg-card border-border"}`}>
          <p className="text-lg font-bold text-red-400 flex items-center justify-center gap-1"><Flame className="w-4 h-4" />{stats.hot}</p>
          <p className="text-[10px] text-red-400/70">Quentes</p>
        </button>
        <button onClick={() => setFilterScore(filterScore === "warm" ? null : "warm")}
          className={`rounded-xl border p-2.5 text-center transition-all ${filterScore === "warm" ? "bg-amber-500/15 border-amber-500/40" : "bg-card border-border"}`}>
          <p className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1"><Thermometer className="w-4 h-4" />{stats.warm}</p>
          <p className="text-[10px] text-amber-400/70">Mornos</p>
        </button>
        <button onClick={() => setFilterScore(filterScore === "cold" ? null : "cold")}
          className={`rounded-xl border p-2.5 text-center transition-all ${filterScore === "cold" ? "bg-blue-500/15 border-blue-500/40" : "bg-card border-border"}`}>
          <p className="text-lg font-bold text-blue-400 flex items-center justify-center gap-1"><Snowflake className="w-4 h-4" />{stats.cold}</p>
          <p className="text-[10px] text-blue-400/70">Frios</p>
        </button>
      </div>

      {/* Source filter chips */}
      {availableSources.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => setFilterSource(null)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${!filterSource ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
            Todas origens
          </button>
          {availableSources.map(src => {
            const cfg = SOURCE_LABELS_CRM[src] || { label: src, color: "text-gray-400", bg: "bg-gray-500/20" };
            return (
              <button key={src} onClick={() => setFilterSource(filterSource === src ? null : src)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1.5 ${filterSource === src ? `${cfg.bg} ${cfg.color} border-current` : "bg-accent/50 border-border text-muted-foreground"}`}>
                <ChannelIcon source={src} size={13} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* SDR Controls - Leads sem vendedor */}
      {(unassignedLeads?.length || 0) > 0 && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-amber-400">{unassignedLeads?.length} leads novos</span>
                <p className="text-[10px] text-amber-400/70">Aguardando distribui\u00e7\u00e3o para vendedores</p>
              </div>
            </div>
            <Button size="sm" variant={showUnassigned ? "default" : "outline"} className="h-8 text-xs" onClick={() => setShowUnassigned(!showUnassigned)}>
              {showUnassigned ? "Ver Todos" : "Ver Novos"}
            </Button>
          </div>
          {showUnassigned && selectedLeads.size > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-500/20">
              <span className="text-xs text-foreground shrink-0 font-medium">{selectedLeads.size} selecionados</span>
              <select value={assignSellerId} onChange={e => setAssignSellerId(e.target.value)}
                className="flex-1 bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                <option value="">Escolher vendedor...</option>
                {sellers?.map((s: any) => <option key={s.id} value={s.id}>{s.nickname || s.name}</option>)}
              </select>
              <Button size="sm" className="h-8 text-xs font-bold" disabled={!assignSellerId || bulkAssign.isPending}
                onClick={handleBulkAssign}>
                {bulkAssign.isPending ? "..." : "Distribuir"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{leads?.length || 0} leads{filterScore ? ` (${SCORE_CFG_CRM[filterScore as keyof typeof SCORE_CFG_CRM]?.label})` : ""}{filterSource ? ` - ${SOURCE_LABELS_CRM[filterSource]?.label || filterSource}` : ""}</span>
      </div>

      {/* Lead cards - mobile optimized */}
      <div className="space-y-2 sm:hidden">
        {leads?.map(lead => {
          const scoreCfg = SCORE_CFG_CRM[lead.score as keyof typeof SCORE_CFG_CRM] || SCORE_CFG_CRM.warm;
          const ScoreIcon = scoreCfg.icon;
          const sourceCfg = SOURCE_LABELS_CRM[lead.source] || { label: lead.source || "--", color: "text-gray-400", bg: "bg-gray-500/20" };
          const sellerName = lead.sellerId && lead.sellerId > 0 ? sellerMap[lead.sellerId] : null;
          return (
            <div key={lead.id}
              className={`rounded-xl border p-3 transition-all active:scale-[0.98] ${showUnassigned && selectedLeads.has(lead.id) ? "border-primary bg-primary/5" : scoreCfg.bg}`}>
              {/* Header: name + score + checkbox */}
              <div className="flex items-start justify-between mb-1.5" onClick={() => showUnassigned ? toggleLead(lead.id) : navigate(`/crm/lead/${lead.id}`)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {showUnassigned && (
                    <input type="checkbox" checked={selectedLeads.has(lead.id)} readOnly className="rounded border-border mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground truncate">{lead.name}</span>
                      <ScoreIcon className={`w-4 h-4 shrink-0 ${scoreCfg.color}`} />
                    </div>
                    {lead.vehicleInterest && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">\ud83d\ude97 {lead.vehicleInterest}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info badges */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <ChannelBadge source={lead.source} size={12} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{lead.stage}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {crmTimeAgo(lead.lastContactDate || lead.createdAt)}
                </span>
                {sellerName && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sellerColorMap[lead.sellerId] || 'bg-cyan-500/15 text-cyan-400'}`}>👤 {sellerName}</span>
                )}
                {!sellerName && lead.sellerId === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Sem vendedor</span>
                )}
              </div>

              {/* Action buttons - bigger and more visible */}
              {lead.phone && (
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-all active:scale-95">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-400">WhatsApp</span>
                  </a>
                  <a href={`tel:${lead.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all active:scale-95">
                    <Phone className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">Ligar</span>
                  </a>
                  <button onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-accent/50 hover:bg-accent border border-border transition-all active:scale-95">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
              {!lead.phone && (
                <button onClick={() => navigate(`/crm/lead/${lead.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/50 hover:bg-accent border border-border transition-all text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" /> Ver detalhes
                </button>
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
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Origem</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Etapa</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Score</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Vendedor</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Tempo</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">A\u00e7\u00f5es</th>
            </tr>
          </thead>
          <tbody>
            {leads?.map(lead => {
              const scoreCfg = SCORE_CFG_CRM[lead.score as keyof typeof SCORE_CFG_CRM] || SCORE_CFG_CRM.warm;
              const ScoreIcon = scoreCfg.icon;
              const sourceCfg = SOURCE_LABELS_CRM[lead.source] || { label: lead.source || "--", color: "text-gray-400", bg: "bg-gray-500/20" };
              const sellerName = lead.sellerId && lead.sellerId > 0 ? sellerMap[lead.sellerId] : null;
              return (
                <tr key={lead.id} onClick={() => navigate(`/crm/lead/${lead.id}`)}
                  className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-all">
                  <td className="py-2 px-2">
                    <span className="text-foreground font-medium">{lead.name}</span>
                    {lead.vehicleInterest && <span className="block text-[10px] text-muted-foreground">{lead.vehicleInterest}</span>}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{lead.phone || "--"}</td>
                  <td className="py-2 px-2">
                    <ChannelBadge source={lead.source} size={12} />
                  </td>
                  <td className="py-2 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{lead.stage}</span></td>
                  <td className="py-2 px-2"><ScoreIcon className={`w-4 h-4 ${scoreCfg.color}`} /></td>
                  <td className="py-2 px-2 text-muted-foreground text-xs">{sellerName || <span className="text-amber-400">Sem vendedor</span>}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs">{crmTimeAgo(lead.lastContactDate || lead.createdAt)}</td>
                  <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {lead.phone && (
                        <>
                          <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                            className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400"><MessageCircle className="w-4 h-4" /></a>
                          <a href={`tel:${lead.phone}`}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Phone className="w-4 h-4" /></a>
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
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum lead encontrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Leads do WhatsApp aparecer\u00e3o aqui automaticamente</p>
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
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const { data: inventory } = trpc.crmInventory.list.useQuery({
    status: statusFilter || undefined,
    search: searchQ || undefined,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">{inventory?.length || 0} veículos</span>
        <div className="flex-1" />
        <Input placeholder="Buscar..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="h-8 text-xs w-40" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs rounded-lg border border-border bg-card text-foreground px-2">
          <option value="available">Disponíveis</option>
          <option value="">Todos</option>
          <option value="reserved">Reservados</option>
          <option value="sold">Vendidos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {inventory?.map(v => (
          <div key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {v.photoUrl && (
              <div className="h-32 bg-accent/30 overflow-hidden">
                <img src={v.photoUrl} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground truncate">{v.brand} {v.model}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${v.status === "available" ? "bg-green-500/20 text-green-400" : v.status === "reserved" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                  {v.status === "available" ? "Disponível" : v.status === "reserved" ? "Reservado" : "Vendido"}
                </span>
              </div>
              {(v as any).version && <p className="text-[10px] text-muted-foreground truncate">{(v as any).version}</p>}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                {v.year && <span>{v.year}</span>}
                {v.color && <><span>•</span><span>{v.color}</span></>}
                {v.mileage != null && v.mileage > 0 && <><span>•</span><span>{Number(v.mileage).toLocaleString("pt-BR")} km</span></>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-primary font-bold">R$ {Number(v.price).toLocaleString("pt-BR")}</p>
                {(v as any).fipePrice > 0 && Number(v.price) < (v as any).fipePrice && (
                  <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Abaixo FIPE</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {inventory?.length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-muted-foreground">Nenhum veículo encontrado</div>
        )}
      </div>
    </div>
  );
}

// ===== CAMPAIGNS VIEW =====
function CampaignsView() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "responses" | "import">("campaigns");
  const [showCreate, setShowCreate] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);

  // Campaign form state
  const [campName, setCampName] = useState("");
  const [campMessage, setCampMessage] = useState("");
  const [campMediaUrl, setCampMediaUrl] = useState<string | null>(null);
  const [campMediaType, setCampMediaType] = useState<string | null>(null);
  const [campMediaFileName, setCampMediaFileName] = useState<string | null>(null);
  const [campFilterSource, setCampFilterSource] = useState("all");
  const [campFilterDept, setCampFilterDept] = useState("all");
  const [campFilterScore, setCampFilterScore] = useState("all");
  const [campFilterStage, setCampFilterStage] = useState("all");
  const [campFilterInactiveDays, setCampFilterInactiveDays] = useState<number | null>(null);
  const [campMaxRecipients, setCampMaxRecipients] = useState<number>(80);
  const [campIntervalSec, setCampIntervalSec] = useState(45);
  const [campMaxPerDay, setCampMaxPerDay] = useState(80);
  const [campStartHour, setCampStartHour] = useState(8);
  const [campEndHour, setCampEndHour] = useState(20);
  const [isUploading, setIsUploading] = useState(false);

  const { data: campaigns, refetch: refetchCampaigns } = trpc.crmCampaigns.list.useQuery();
  const { data: zapiStatus } = trpc.whatsapp.status.useQuery();
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });
  const { data: campaignResponses, refetch: refetchResponses } = trpc.crmCampaigns.getCampaignResponses.useQuery();
  const { data: antiBanDefaults } = trpc.crmCampaigns.getAntiBanDefaults.useQuery();

  const importContacts = trpc.whatsapp.importContacts.useMutation({
    onSuccess: (r: any) => { toast.success(r.message); },
    onError: (e: any) => toast.error(e.message),
  });
  const importChats = trpc.whatsapp.importChats.useMutation({
    onSuccess: (r: any) => { toast.success(r.message); },
    onError: (e: any) => toast.error(e.message),
  });

  const buildFilterConfig = () => {
    const f: any = {};
    if (campFilterSource !== "all") f.source = campFilterSource;
    if (campFilterDept !== "all") f.department = campFilterDept;
    if (campFilterScore !== "all") f.score = campFilterScore;
    if (campFilterStage !== "all") f.stage = campFilterStage;
    if (campFilterInactiveDays) f.inactiveDays = campFilterInactiveDays;
    return Object.keys(f).length > 0 ? JSON.stringify(f) : null;
  };

  const { data: preview } = trpc.crmCampaigns.preview.useQuery({
    filterType: "custom",
    filterConfig: buildFilterConfig(),
  });

  const createCampaign = trpc.crmCampaigns.create.useMutation({
    onSuccess: () => { toast.success("Campanha criada!"); setShowCreate(false); resetForm(); refetchCampaigns(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCampaign = trpc.crmCampaigns.delete.useMutation({
    onSuccess: () => { toast.success("Campanha excluída"); refetchCampaigns(); },
    onError: (e: any) => toast.error(e.message),
  });
  const startDispatch = trpc.crmCampaigns.startDispatch.useMutation({
    onSuccess: (r: any) => { toast.success(r.message); refetchCampaigns(); },
    onError: (e: any) => toast.error(e.message),
  });
  const cancelDispatch = trpc.crmCampaigns.cancelDispatch.useMutation({
    onSuccess: () => { toast.success("Disparo cancelado"); refetchCampaigns(); },
    onError: (e: any) => toast.error(e.message),
  });
  const uploadMedia = trpc.crmCampaigns.uploadMedia.useMutation({
    onSuccess: (r: any) => {
      setCampMediaUrl(r.url);
      setCampMediaFileName(r.fileName);
      const mime = r.mimeType || '';
      if (mime.startsWith('image/')) setCampMediaType('image');
      else if (mime.startsWith('video/')) setCampMediaType('video');
      else setCampMediaType('document');
      setIsUploading(false);
      toast.success("Mídia carregada!");
    },
    onError: (e: any) => { setIsUploading(false); toast.error(e.message); },
  });
  const markResponseHandled = trpc.crmCampaigns.markResponseHandled.useMutation({
    onSuccess: () => { refetchResponses(); toast.success("Resposta tratada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const uniqueSources = useMemo(() => {
    if (!allLeads) return [];
    return Array.from(new Set(allLeads.map(l => l.source).filter(Boolean)));
  }, [allLeads]);

  const resetForm = () => {
    setCampName(""); setCampMessage(""); setCampMediaUrl(null); setCampMediaType(null);
    setCampMediaFileName(null); setCampFilterSource("all"); setCampFilterDept("all");
    setCampFilterScore("all"); setCampFilterStage("all"); setCampFilterInactiveDays(null);
    setCampMaxRecipients(80); setCampIntervalSec(45); setCampMaxPerDay(80);
    setCampStartHour(8); setCampEndHour(20);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 16MB)"); return; }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadMedia.mutate({ fileName: file.name, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCampaign = () => {
    if (!campName.trim()) return toast.error("Nome da campanha obrigatório");
    if (!campMessage.trim()) return toast.error("Mensagem obrigatória");
    createCampaign.mutate({
      name: campName.trim(),
      message: campMessage.trim(),
      mediaUrl: campMediaUrl,
      mediaType: campMediaType,
      mediaFileName: campMediaFileName,
      filterType: "custom",
      filterConfig: buildFilterConfig(),
      antiBanIntervalSec: campIntervalSec,
      antiBanMaxPerDay: campMaxPerDay,
      antiBanStartHour: campStartHour,
      antiBanEndHour: campEndHour,
    });
  };

  const templates = [
    { name: "Feirão", text: "\u{1F525} *FEIR\u00c3O KAFKA MULTIMARCAS* \u{1F525}\n\nOportunidades imperd\u00edveis em ve\u00edculos seminovos!\n\n\u2705 Entrada facilitada\n\u2705 Financiamento na hora\n\u2705 Troca com troco\n\nVenha conferir! Estamos te esperando.\n\u{1F4CD} Kafka Multimarcas" },
    { name: "Retorno", text: "Ol\u00e1 {nome}! Tudo bem? \u{1F60A}\n\nVi que voc\u00ea demonstrou interesse em um de nossos ve\u00edculos.\n\nTemos condi\u00e7\u00f5es especiais essa semana! Posso te ajudar a encontrar o carro ideal?\n\n\u{1F697} Kafka Multimarcas" },
    { name: "Promo\u00e7\u00e3o", text: "\u{1F389} *PROMO\u00c7\u00c3O ESPECIAL* \u{1F389}\n\nSomente esta semana:\n\n\u{1F4B0} Desconto especial \u00e0 vista\n\u{1F4CB} Aprova\u00e7\u00e3o de cr\u00e9dito em 30 min\n\u{1F504} Aceitamos seu usado como entrada\n\nAgende sua visita!\n\u{1F4DE} Kafka Multimarcas" },
  ];

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    sending: "bg-blue-500/20 text-blue-400",
    sent: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  const statusLabels: Record<string, string> = {
    draft: "Rascunho", sending: "Enviando...", sent: "Enviada", cancelled: "Cancelada",
  };

  return (
    <div className="space-y-4">
      {/* Z-API Status */}
      <div className={`rounded-xl border p-3 flex items-center justify-between ${zapiStatus?.connected ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${zapiStatus?.connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs font-medium text-foreground">WhatsApp {zapiStatus?.connected ? "Conectado" : "Desconectado"}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{allLeads?.filter(l => l.phone).length || 0} leads com telefone</span>
      </div>

      {/* Anti-ban info banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">Prote\u00e7\u00e3o Anti-Ban Ativa</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Intervalo de {campIntervalSec}s entre msgs \u2022 M\u00e1x {campMaxPerDay}/dia \u2022 Hor\u00e1rio {campStartHour}h-{campEndHour}h \u2022 Exclui p\u00f3s-venda automaticamente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-accent/50 rounded-lg p-1">
        {(["campaigns", "responses", "import"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all relative ${
              activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}>
            {tab === "campaigns" ? "Campanhas" : tab === "responses" ? "Respostas" : "Importar"}
            {tab === "responses" && (campaignResponses?.length || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{campaignResponses?.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* CAMPAIGNS TAB */}
      {activeTab === "campaigns" && !showCreate && !viewingCampaign && (
        <div className="space-y-3">
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="w-full gap-2" disabled={!zapiStatus?.connected}>
            <Plus className="w-4 h-4" /> Nova Campanha
          </Button>
          {!zapiStatus?.connected && <p className="text-[10px] text-red-400 text-center">Conecte o WhatsApp para criar campanhas</p>}

          {campaigns && campaigns.length > 0 ? campaigns.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-foreground">{c.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || statusColors.draft}`}>
                  {statusLabels[c.status] || c.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.message}</p>
              {c.mediaUrl && (
                <div className="flex items-center gap-2 mb-3">
                  {c.mediaType === 'image' && <ImageIcon className="w-3 h-3 text-blue-400" />}
                  {c.mediaType === 'video' && <Video className="w-3 h-3 text-purple-400" />}
                  {c.mediaType === 'document' && <FileText className="w-3 h-3 text-amber-400" />}
                  <span className="text-[10px] text-muted-foreground">{c.mediaFileName || 'M\u00eddia anexada'}</span>
                </div>
              )}
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-accent/50">
                  <p className="text-sm font-bold text-foreground">{c.totalRecipients}</p>
                  <p className="text-[9px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-500/10">
                  <p className="text-sm font-bold text-green-400">{c.totalSent}</p>
                  <p className="text-[9px] text-muted-foreground">Enviados</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-500/10">
                  <p className="text-sm font-bold text-blue-400">{c.totalResponded}</p>
                  <p className="text-[9px] text-muted-foreground">Responderam</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-500/10">
                  <p className="text-sm font-bold text-red-400">{c.totalFailed}</p>
                  <p className="text-[9px] text-muted-foreground">Falhas</p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                {c.status === 'draft' && (
                  <>
                    <Button size="sm" className="flex-1 gap-1 text-xs h-8" onClick={() => {
                      if (confirm(`Iniciar disparo para at\u00e9 ${campMaxRecipients} destinat\u00e1rios?`)) {
                        startDispatch.mutate({ campaignId: c.id, maxRecipients: campMaxRecipients });
                      }
                    }} disabled={startDispatch.isPending || !zapiStatus?.connected}>
                      <Send className="w-3 h-3" /> Disparar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setViewingCampaign(c)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8 text-red-400 hover:text-red-300" onClick={() => {
                      if (confirm("Excluir campanha?")) deleteCampaign.mutate({ id: c.id });
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {c.status === 'sending' && (
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8 text-red-400" onClick={() => cancelDispatch.mutate({ campaignId: c.id })}>
                    <XCircle className="w-3 h-3" /> Cancelar Envio
                  </Button>
                )}
                {(c.status === 'sent' || c.status === 'cancelled') && (
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8" onClick={() => setViewingCampaign(c)}>
                    <Eye className="w-3 h-3" /> Ver Detalhes
                  </Button>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">
                Criada em {new Date(c.createdAt).toLocaleString('pt-BR')}
                {c.createdByName && ` por ${c.createdByName}`}
              </p>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma campanha criada ainda</p>
          )}
        </div>
      )}

      {/* CREATE CAMPAIGN FORM */}
      {activeTab === "campaigns" && showCreate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Nova Campanha</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
          </div>

          {/* Name */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-foreground block mb-2">Nome da Campanha</label>
            <Input value={campName} onChange={e => setCampName(e.target.value)} placeholder="Ex: Feir\u00e3o Abril 2026" className="text-sm" />
          </div>

          {/* Templates */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-foreground block mb-2">Templates R\u00e1pidos</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map(t => (
                <button key={t.name} onClick={() => setCampMessage(t.text)}
                  className="shrink-0 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-all">
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-foreground block mb-2">Mensagem</label>
            <textarea value={campMessage} onChange={e => setCampMessage(e.target.value)}
              placeholder="Digite sua mensagem... Use {nome} para personalizar"
              className="w-full h-32 bg-accent/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            <p className="text-[10px] text-muted-foreground mt-1">{campMessage.length} caracteres \u2022 Use {'{'+'nome'+'}'} para nome do cliente</p>
          </div>

          {/* Media Upload */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-foreground block mb-2">M\u00eddia (opcional)</label>
            {campMediaUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                {campMediaType === 'image' && <ImageIcon className="w-5 h-5 text-blue-400" />}
                {campMediaType === 'video' && <Video className="w-5 h-5 text-purple-400" />}
                {campMediaType === 'document' && <FileText className="w-5 h-5 text-amber-400" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{campMediaFileName}</p>
                  <p className="text-[10px] text-muted-foreground">{campMediaType}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setCampMediaUrl(null); setCampMediaType(null); setCampMediaFileName(null); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-all">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <><Upload className="w-5 h-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Clique para enviar foto, v\u00eddeo ou documento (m\u00e1x 16MB)</span></>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-foreground block mb-3">Filtrar P\u00fablico</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Origem</label>
                <select value={campFilterSource} onChange={e => setCampFilterSource(e.target.value)}
                  className="w-full bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                  <option value="all">Todas</option>
                  {uniqueSources.map(s => <option key={s} value={s!}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Setor</label>
                <select value={campFilterDept} onChange={e => setCampFilterDept(e.target.value)}
                  className="w-full bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                  <option value="all">Todos</option>
                  <option value="vendas">Vendas</option>
                  <option value="pre_vendas">Pr\u00e9-Vendas</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Score</label>
                <select value={campFilterScore} onChange={e => setCampFilterScore(e.target.value)}
                  className="w-full bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                  <option value="all">Todos</option>
                  <option value="hot">Quente</option>
                  <option value="warm">Morno</option>
                  <option value="cold">Frio</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Inativos h\u00e1 (dias)</label>
                <Input type="number" min={0} max={365} value={campFilterInactiveDays || ''}
                  onChange={e => setCampFilterInactiveDays(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 30" className="text-xs h-8" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-medium">{preview?.count || 0} destinat\u00e1rios encontrados</p>
              <p className="text-[10px] text-muted-foreground">Clientes p\u00f3s-venda s\u00e3o exclu\u00eddos automaticamente</p>
            </div>
          </div>

          {/* Max recipients */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-foreground block mb-2">Quantidade de Destinat\u00e1rios</label>
            <div className="flex items-center gap-3">
              <Input type="number" min={1} max={500} value={campMaxRecipients}
                onChange={e => setCampMaxRecipients(parseInt(e.target.value) || 80)}
                className="w-24 text-sm text-center" />
              <p className="text-[10px] text-muted-foreground">M\u00e1ximo de {Math.min(campMaxRecipients, preview?.count || 0)} ser\u00e3o enviados</p>
            </div>
          </div>

          {/* Anti-ban Config */}
          <div className="rounded-xl border border-amber-500/30 bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-400" />
              <label className="text-xs font-bold text-amber-400">Configura\u00e7\u00f5es Anti-Ban</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Intervalo entre msgs (seg)</label>
                <Input type="number" min={10} max={300} value={campIntervalSec}
                  onChange={e => setCampIntervalSec(parseInt(e.target.value) || 45)}
                  className="text-xs h-8" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">M\u00e1x por dia</label>
                <Input type="number" min={1} max={500} value={campMaxPerDay}
                  onChange={e => setCampMaxPerDay(parseInt(e.target.value) || 80)}
                  className="text-xs h-8" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Hora in\u00edcio</label>
                <Input type="number" min={0} max={23} value={campStartHour}
                  onChange={e => setCampStartHour(parseInt(e.target.value) || 8)}
                  className="text-xs h-8" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Hora fim</label>
                <Input type="number" min={1} max={24} value={campEndHour}
                  onChange={e => setCampEndHour(parseInt(e.target.value) || 20)}
                  className="text-xs h-8" />
              </div>
            </div>
            {antiBanDefaults?.tips && (
              <div className="mt-3 space-y-1">
                {antiBanDefaults.tips.map((tip: string, i: number) => (
                  <p key={i} className="text-[9px] text-amber-400/70">\u2022 {tip}</p>
                ))}
              </div>
            )}
          </div>

          {/* Create Button */}
          <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending || !campName.trim() || !campMessage.trim()}
            className="w-full h-12 text-sm font-bold gap-2">
            {createCampaign.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Megaphone className="w-4 h-4" /> Criar Campanha</>
            )}
          </Button>
        </div>
      )}

      {/* VIEW CAMPAIGN DETAILS */}
      {activeTab === "campaigns" && viewingCampaign && (
        <CampaignDetailView campaign={viewingCampaign} onBack={() => { setViewingCampaign(null); refetchCampaigns(); }} />
      )}

      {/* RESPONSES TAB */}
      {activeTab === "responses" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Respostas de Campanhas</h3>
            <Button size="sm" variant="ghost" onClick={() => refetchResponses()} className="text-xs"><RefreshCw className="w-3 h-3" /></Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Clientes que responderam a disparos de campanha. Essas conversas ficam separadas dos leads ativos.</p>
          {campaignResponses && campaignResponses.length > 0 ? campaignResponses.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-blue-500/20 bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{r.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{r.phone}</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Campanha: {r.campaignName || `#${r.campaignId}`}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-3">
                <span>Enviado: {r.campaignSentAt ? new Date(r.campaignSentAt).toLocaleString('pt-BR') : 'N/A'}</span>
                <span>Respondeu: {r.lastMessageAt ? new Date(r.lastMessageAt).toLocaleString('pt-BR') : 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1" onClick={() => {
                  // Open chat with this lead
                  window.dispatchEvent(new CustomEvent('openLeadChat', { detail: { leadId: r.id } }));
                }}>
                  <MessageCircle className="w-3 h-3" /> Abrir Conversa
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => markResponseHandled.mutate({ leadId: r.id })}>
                  <CheckCircle className="w-3 h-3" /> Tratado
                </Button>
              </div>
            </div>
          )) : (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma resposta de campanha ainda</p>
              <p className="text-[10px] text-muted-foreground">Quando clientes responderem a disparos, aparecer\u00e3o aqui separados</p>
            </div>
          )}
        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === "import" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-bold text-foreground mb-2">Importar do WhatsApp Business</h4>
            <p className="text-xs text-muted-foreground mb-4">Importe contatos e conversas recentes do seu WhatsApp Business para o banco de leads do CRM.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => importContacts.mutate()} disabled={importContacts.isPending || !zapiStatus?.connected} className="h-20 flex-col gap-2">
                {importContacts.isPending ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Users className="w-6 h-6 text-primary" />}
                <span className="text-xs">Importar Contatos</span>
              </Button>
              <Button variant="outline" onClick={() => importChats.mutate()} disabled={importChats.isPending || !zapiStatus?.connected} className="h-20 flex-col gap-2">
                {importChats.isPending ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <MessageCircle className="w-6 h-6 text-green-400" />}
                <span className="text-xs">Importar Chats</span>
              </Button>
            </div>
            {!zapiStatus?.connected && <p className="text-[10px] text-red-400 text-center mt-3">WhatsApp desconectado. Conecte o Z-API primeiro.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Campaign Detail View - shows recipients and status
function CampaignDetailView({ campaign, onBack }: { campaign: any; onBack: () => void }) {
  const { data: recipients } = trpc.crmCampaigns.getRecipients.useQuery({ campaignId: campaign.id });
  const { data: status, refetch: refetchStatus } = trpc.crmCampaigns.getStatus.useQuery({ campaignId: campaign.id });

  useEffect(() => {
    if (status?.isActive) {
      const interval = setInterval(() => refetchStatus(), 5000);
      return () => clearInterval(interval);
    }
  }, [status?.isActive]);

  const statusColors: Record<string, string> = {
    pending: "text-gray-400", sent: "text-green-400", failed: "text-red-400",
    responded: "text-blue-400", daily_limit: "text-amber-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}><ChevronLeft className="w-4 h-4" /></Button>
        <h3 className="text-sm font-bold text-foreground">{campaign.name}</h3>
      </div>

      {/* Live status */}
      {status?.isActive && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-xs font-bold text-blue-400">Enviando...</span>
          </div>
          <div className="w-full bg-accent/50 rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${status.stats ? (status.stats.totalSent / Math.max(status.stats.totalRecipients, 1)) * 100 : 0}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {status.stats?.totalSent || 0} de {status.stats?.totalRecipients || 0} enviados
            {status.stats?.totalFailed ? ` \u2022 ${status.stats.totalFailed} falhas` : ''}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-3 rounded-xl border border-border bg-card">
          <p className="text-lg font-bold text-foreground">{status?.stats?.totalRecipients || campaign.totalRecipients}</p>
          <p className="text-[9px] text-muted-foreground">Total</p>
        </div>
        <div className="text-center p-3 rounded-xl border border-green-500/20 bg-green-500/5">
          <p className="text-lg font-bold text-green-400">{status?.stats?.totalSent || campaign.totalSent}</p>
          <p className="text-[9px] text-muted-foreground">Enviados</p>
        </div>
        <div className="text-center p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <p className="text-lg font-bold text-blue-400">{status?.stats?.totalResponded || campaign.totalResponded}</p>
          <p className="text-[9px] text-muted-foreground">Responderam</p>
        </div>
        <div className="text-center p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-lg font-bold text-red-400">{status?.stats?.totalFailed || campaign.totalFailed}</p>
          <p className="text-[9px] text-muted-foreground">Falhas</p>
        </div>
      </div>

      {/* Message preview */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-bold text-foreground mb-2">Mensagem</h4>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{campaign.message}</p>
        {campaign.mediaUrl && (
          <div className="mt-2 flex items-center gap-2">
            {campaign.mediaType === 'image' && <img src={campaign.mediaUrl} alt="" className="w-20 h-20 rounded-lg object-cover" />}
            {campaign.mediaType !== 'image' && <span className="text-[10px] text-muted-foreground">{campaign.mediaFileName || 'M\u00eddia'}</span>}
          </div>
        )}
      </div>

      {/* Recipients list */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-bold text-foreground mb-3">Destinat\u00e1rios ({recipients?.length || 0})</h4>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {recipients?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{r.name || r.phone}</p>
                <p className="text-[10px] text-muted-foreground">{r.phone}</p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-medium ${statusColors[r.status] || 'text-gray-400'}`}>
                  {r.status === 'pending' ? 'Pendente' : r.status === 'sent' ? 'Enviado' : r.status === 'failed' ? 'Falhou' : r.status === 'responded' ? 'Respondeu' : r.status === 'daily_limit' ? 'Limite' : r.status}
                </span>
                {r.sentAt && <p className="text-[9px] text-muted-foreground">{new Date(r.sentAt).toLocaleTimeString('pt-BR')}</p>}
              </div>
            </div>
          ))}
          {(!recipients || recipients.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum destinat\u00e1rio ainda</p>
          )}
        </div>
      </div>
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
            <span className="text-xs text-foreground w-28 shrink-0 flex items-center gap-1.5">
              <ChannelIcon source={s.source} size={14} />
              <span className="capitalize truncate">{s.source.replace("_", " ")}</span>
            </span>
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
function getAdminRoleLabel(admin: any): { label: string; color: string } {
  if (admin.role === 'owner') return { label: 'Dono', color: 'bg-amber-500/20 text-amber-400 border-amber-500/20' };
  // Check permissions to determine specific role
  let perms: Record<string, boolean> = {};
  try { perms = JSON.parse(admin.permissions || '{}'); } catch {}
  const activeKeys = Object.entries(perms).filter(([, v]) => v).map(([k]) => k);
  if (activeKeys.length === 1 && activeKeys[0] === 'pre_vendas') return { label: 'SDR', color: 'bg-purple-500/20 text-purple-400 border-purple-500/20' };
  if (activeKeys.length === 1 && activeKeys[0] === 'fei') return { label: 'F&I', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20' };
  if (activeKeys.length === 1 && activeKeys[0] === 'financeiro') return { label: 'Financeiro', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' };
  if (activeKeys.length === 1 && activeKeys[0] === 'marketing') return { label: 'Marketing', color: 'bg-pink-500/20 text-pink-400 border-pink-500/20' };
  return { label: 'Admin', color: 'bg-blue-500/20 text-blue-400 border-blue-500/20' };
}

function SettingsView() {
  const { data: admins, refetch } = trpc.adminAuth.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", username: "", password: "", email: "", phone: "", role: "admin",
    permissions: {
      vendas: true, pre_vendas: false, consignacao: false, fei: false,
      marketing: false, financeiro: false, estoque: false, configuracoes: false, gerenciar_admins: false,
    }
  });
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showChangeMyPassword, setShowChangeMyPassword] = useState(false);
  const [myOldPassword, setMyOldPassword] = useState("");
  const [myNewPassword, setMyNewPassword] = useState("");
  const [myConfirmPassword, setMyConfirmPassword] = useState("");
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const updateAdmin = trpc.adminAuth.update.useMutation({
    onSuccess: () => {
      refetch(); setEditingAdminId(null);
      toast.success("Admin atualizado com sucesso!");
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const { data: zapiStatus } = trpc.whatsapp.status.useQuery();
  const enableSentByMe = trpc.whatsapp.enableSentByMe.useMutation({
    onSuccess: () => toast.success("Captura de mensagens enviadas ativada!"),
    onError: (e: any) => toast.error(e.message),
  });
  const configureWebhook = trpc.whatsapp.configureWebhook.useMutation({
    onSuccess: () => toast.success("Webhook configurado com sucesso!"),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAdmin = trpc.adminAuth.update.useMutation({
    onSuccess: (_, vars) => {
      refetch();
      toast.success(vars.active ? 'Usuário ativado!' : 'Usuário desativado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const createAdmin = trpc.adminAuth.create.useMutation({
    onSuccess: () => {
      refetch(); setShowAdd(false);
      setForm({ name: "", username: "", password: "", email: "", phone: "", role: "admin", permissions: { vendas: true, pre_vendas: false, consignacao: false, fei: false, marketing: false, financeiro: false, estoque: false, configuracoes: false, gerenciar_admins: false } });
      toast.success("Admin criado com sucesso! Senha temporária definida.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetAdminPassword = trpc.adminAuth.resetAdminPassword.useMutation({
    onSuccess: () => {
      refetch(); setResetPasswordId(null); setResetPasswordValue("");
      toast.success("Senha resetada! O admin precisará trocar no próximo login.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeMyPassword = trpc.adminAuth.changePassword.useMutation({
    onSuccess: () => {
      setShowChangeMyPassword(false); setMyOldPassword(""); setMyNewPassword(""); setMyConfirmPassword("");
      toast.success("Sua senha foi alterada com sucesso!");
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
            const roleInfo = getAdminRoleLabel(a);
            return (
              <div key={a.id} className={`p-3 rounded-lg bg-accent/50 border border-border ${!a.active ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">@{a.username} • <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${roleInfo.color}`}>{roleInfo.label}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.email && <span className="text-[9px] text-muted-foreground">{a.email}</span>}
                    {a.role !== 'owner' && (
                      <button
                        onClick={() => { toggleAdmin.mutate({ id: a.id, active: !a.active }); }}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${a.active ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                        title={a.active ? 'Desativar' : 'Ativar'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${a.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded ${a.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {a.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                {/* Actions Row */}
                {a.role !== "owner" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resetPasswordId === a.id ? (
                      <div className="flex gap-2 items-center w-full">
                        <Input placeholder="Nova senha" type="password" value={resetPasswordValue}
                          onChange={e => setResetPasswordValue(e.target.value)} className="h-7 text-xs flex-1" />
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                          if (resetPasswordValue.length < 4) { toast.error("Mínimo 4 caracteres"); return; }
                          resetAdminPassword.mutate({ adminId: a.id, newPassword: resetPasswordValue });
                        }} disabled={resetAdminPassword.isPending}>
                          {resetAdminPassword.isPending ? "..." : "Salvar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { setResetPasswordId(null); setResetPasswordValue(""); }}>✕</Button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => setResetPasswordId(a.id)} className="text-[10px] text-amber-400 hover:text-amber-300 font-medium">
                          🔑 Resetar Senha
                        </button>
                        <button onClick={() => {
                          setEditingAdminId(editingAdminId === a.id ? null : a.id);
                          setEditName(a.name || '');
                          setEditEmail(a.email || '');
                          setEditPhone(a.phone || '');
                          try { setEditPerms(JSON.parse(a.permissions || '{}')); } catch { setEditPerms({}); }
                        }} className="text-[10px] text-primary hover:text-primary/80 font-medium">
                          <Edit className="w-3 h-3 inline mr-0.5" /> Editar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Edit Form */}
                {editingAdminId === a.id && a.role !== 'owner' && (
                  <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-primary/30 space-y-3">
                    <p className="text-xs font-bold text-primary">Editando: {a.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input placeholder="Nome" value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-xs" />
                      <Input placeholder="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-xs" />
                      <Input placeholder="Telefone" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-foreground mb-2">Permissões:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {Object.entries(PERM_LABELS).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 cursor-pointer">
                            <input type="checkbox" checked={editPerms[key] || false}
                              onChange={e => setEditPerms({ ...editPerms, [key]: e.target.checked })}
                              className="rounded border-border" />
                            <span className="text-[11px] text-foreground">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 racing-gradient text-white text-xs" disabled={updateAdmin.isPending}
                        onClick={() => updateAdmin.mutate({
                          id: a.id,
                          name: editName || undefined,
                          email: editEmail || undefined,
                          phone: editPhone || undefined,
                          permissions: JSON.stringify(editPerms),
                        })}>
                        <Save className="w-3 h-3 mr-1" /> {updateAdmin.isPending ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingAdminId(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {/* Permissions badges */}
                {editingAdminId !== a.id && a.role !== "owner" && activePerms.length > 0 && (
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
            <Input placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Usuário de login" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Senha temporária (admin troca no 1º acesso)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Email (opcional)" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Telefone (opcional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" />
            <p className="text-[10px] text-amber-400">⚠️ O admin será obrigado a trocar a senha no primeiro login</p>

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
                email: form.email || undefined, phone: form.phone || undefined,
                role: form.role as any, permissions: JSON.stringify(form.permissions),
                mustChangePassword: true,
              });
            }} disabled={createAdmin.isPending} className="w-full racing-gradient text-white">
              {createAdmin.isPending ? "Criando..." : "Criar Admin"}
            </Button>
          </div>
        )}
      </div>

      {/* Change My Password */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Minha Senha</h3>
          <Button size="sm" variant="outline" onClick={() => setShowChangeMyPassword(!showChangeMyPassword)}>
            🔐 Trocar Senha
          </Button>
        </div>
        {showChangeMyPassword && (
          <div className="mt-3 space-y-3">
            <Input placeholder="Nova senha" type="password" value={myNewPassword}
              onChange={e => setMyNewPassword(e.target.value)} className="h-9 text-sm" />
            <Input placeholder="Confirmar nova senha" type="password" value={myConfirmPassword}
              onChange={e => setMyConfirmPassword(e.target.value)} className="h-9 text-sm" />
            {myConfirmPassword && myNewPassword !== myConfirmPassword && (
              <p className="text-xs text-red-400">As senhas não coincidem</p>
            )}
            <Button size="sm" className="w-full" disabled={changeMyPassword.isPending || myNewPassword.length < 4 || myNewPassword !== myConfirmPassword}
              onClick={() => {
                const token = localStorage.getItem("crm_admin_token");
                if (!token) { toast.error("Faça login novamente"); return; }
                changeMyPassword.mutate({ token, newPassword: myNewPassword });
              }}>
              {changeMyPassword.isPending ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </div>
        )}
      </div>

      {/* SECURITY: Reset All Seller Passwords */}
      <ResetAllPasswordsSection />

      {/* Tenant Settings (Dados da Loja + Z-API) */}
      <TenantSettingsPanel />

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Integrações</h3>
        <div className="space-y-2">
          <IntegrationItem name="WhatsApp Business API" status={zapiStatus?.connected ? "ativo" : "desconectado"} description="Envio/recepção de mensagens e disparos em massa" />
          {zapiStatus?.connected && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => configureWebhook.mutate()} disabled={configureWebhook.isPending}>
                {configureWebhook.isPending ? "Configurando..." : "Reconfigurar Webhook"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => enableSentByMe.mutate()} disabled={enableSentByMe.isPending}>
                {enableSentByMe.isPending ? "Ativando..." : "Ativar Captura Outbound"}
              </Button>
            </div>
          )}
          <IntegrationItem name="SIG Web" status="pendente" description="Integre com seu sistema de gestão para sincronizar vendas" />
          <IntegrationItem name="OLX / Webmotors" status="pendente" description="Receba leads automaticamente das plataformas de anúncio" />
        </div>
      </div>
    </div>
  );
}

// ===== RESET ALL PASSWORDS SECTION =====
function ResetAllPasswordsSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const resetAll = trpc.sellers.resetAllPasswords.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.resetCount} senhas resetadas! Todos os vendedores precisarão fazer o primeiro acesso novamente.`);
      setShowConfirm(false);
      setConfirmText("");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
      <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4" /> Segurança - Resetar Senhas
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Reseta TODAS as senhas dos vendedores. Cada um precisará fazer o primeiro acesso novamente.
        Use em caso de problema de segurança.
      </p>
      {!showConfirm ? (
        <Button size="sm" variant="destructive" className="text-xs" onClick={() => setShowConfirm(true)}>
          Resetar Todas as Senhas
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-red-300 font-bold">Digite RESETAR para confirmar:</p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESETAR"
            className="h-8 text-sm border-red-500/50"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="text-xs"
              disabled={confirmText !== "RESETAR" || resetAll.isPending}
              onClick={() => resetAll.mutate()}>
              {resetAll.isPending ? "Resetando..." : "Confirmar Reset"}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowConfirm(false); setConfirmText(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// AiModeConfig removed - now integrated into AIAttendantView

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

// ===== TENANT SETTINGS PANEL (Dados da Loja + Z-API) =====
function TenantSettingsPanel() {
  const { data: settings, refetch } = trpc.crmPerformance.getTenantSettings.useQuery();
  const updateSettings = trpc.crmPerformance.updateTenantSettings.useMutation({
    onSuccess: () => { toast.success("Configurações da loja salvas!"); refetch(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const testZapi = trpc.crmPerformance.testZapiConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(`WhatsApp conectado! ${data.phone ? `Tel: ${data.phone}` : ''}`);
      else toast.error(data.error || "Falha na conexão");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const [showZapi, setShowZapi] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [zapiForm, setZapiForm] = useState({ zapiInstanceId: '', zapiToken: '', zapiClientToken: '' });
  const [storeForm, setStoreForm] = useState({ name: '', phone: '', email: '', city: '', state: '', address: '', primaryColor: '', secondaryColor: '', inventoryUrl: '' });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setZapiForm({
      zapiInstanceId: settings.zapiInstanceId || '',
      zapiToken: '',
      zapiClientToken: '',
    });
    setStoreForm({
      name: settings.name || '',
      phone: settings.phone || '',
      email: settings.email || '',
      city: settings.city || '',
      state: settings.state || '',
      address: settings.address || '',
      primaryColor: settings.primaryColor || '#DC2626',
      secondaryColor: settings.secondaryColor || '#1F2937',
      inventoryUrl: settings.inventoryUrl || '',
    });
    setInitialized(true);
  }

  return (
    <div className="space-y-4">
      {/* Z-API WhatsApp Configuration */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button onClick={() => setShowZapi(!showZapi)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings?.hasZapi ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
              <MessageCircle className={`w-5 h-5 ${settings?.hasZapi ? 'text-green-400' : 'text-amber-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">WhatsApp (Z-API)</h3>
              <p className="text-[10px] text-muted-foreground">
                {settings?.hasZapi ? 'Credenciais configuradas' : 'Configure suas credenciais Z-API para enviar mensagens'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded ${settings?.hasZapi ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {settings?.hasZapi ? 'Configurado' : 'Pendente'}
            </span>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showZapi ? 'rotate-90' : ''}`} />
          </div>
        </button>
        {showZapi && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-[11px] text-blue-300 leading-relaxed">
                <strong>Como obter:</strong> Acesse <a href="https://z-api.io" target="_blank" rel="noopener" className="underline">z-api.io</a>, crie uma instância e copie as credenciais abaixo. Cada loja precisa de sua própria instância Z-API.
              </p>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Instance ID</label>
              <Input placeholder="Ex: 3C7A1B2D3E4F..." value={zapiForm.zapiInstanceId}
                onChange={e => setZapiForm({ ...zapiForm, zapiInstanceId: e.target.value })} className="h-9 text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Token</label>
              <Input placeholder={settings?.zapiToken ? '***já configurado*** (deixe vazio para manter)' : 'Cole o token aqui'}
                value={zapiForm.zapiToken} type="password"
                onChange={e => setZapiForm({ ...zapiForm, zapiToken: e.target.value })} className="h-9 text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Client Token</label>
              <Input placeholder={settings?.zapiClientToken ? '***já configurado*** (deixe vazio para manter)' : 'Cole o client token aqui'}
                value={zapiForm.zapiClientToken} type="password"
                onChange={e => setZapiForm({ ...zapiForm, zapiClientToken: e.target.value })} className="h-9 text-sm font-mono" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => {
                const updates: any = {};
                if (zapiForm.zapiInstanceId) updates.zapiInstanceId = zapiForm.zapiInstanceId;
                if (zapiForm.zapiToken) updates.zapiToken = zapiForm.zapiToken;
                if (zapiForm.zapiClientToken) updates.zapiClientToken = zapiForm.zapiClientToken;
                if (Object.keys(updates).length === 0) { toast.error("Preencha pelo menos um campo"); return; }
                updateSettings.mutate(updates);
              }} disabled={updateSettings.isPending}>
                <Save className="w-3.5 h-3.5 mr-1" />
                {updateSettings.isPending ? 'Salvando...' : 'Salvar Credenciais'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => testZapi.mutate()} disabled={testZapi.isPending || !settings?.hasZapi}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                {testZapi.isPending ? 'Testando...' : 'Testar Conexão'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Store Data Configuration */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button onClick={() => setShowStore(!showStore)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Dados da Loja</h3>
              <p className="text-[10px] text-muted-foreground">Nome, contato, endereço e personalização visual</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showStore ? 'rotate-90' : ''}`} />
        </button>
        {showStore && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Nome da Loja</label>
                <Input value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Telefone</label>
                <Input value={storeForm.phone} onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })} className="h-9 text-sm" placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Email</label>
                <Input value={storeForm.email} onChange={e => setStoreForm({ ...storeForm, email: e.target.value })} className="h-9 text-sm" type="email" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Cidade</label>
                <Input value={storeForm.city} onChange={e => setStoreForm({ ...storeForm, city: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Estado (UF)</label>
                <Input value={storeForm.state} onChange={e => setStoreForm({ ...storeForm, state: e.target.value })} className="h-9 text-sm" maxLength={2} placeholder="SP" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">URL do Estoque</label>
                <Input value={storeForm.inventoryUrl} onChange={e => setStoreForm({ ...storeForm, inventoryUrl: e.target.value })} className="h-9 text-sm" placeholder="https://seusite.com.br/estoque" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Endereço Completo</label>
              <Input value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} className="h-9 text-sm" placeholder="Rua, Número, Bairro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Cor Principal</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={storeForm.primaryColor} onChange={e => setStoreForm({ ...storeForm, primaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
                  <Input value={storeForm.primaryColor} onChange={e => setStoreForm({ ...storeForm, primaryColor: e.target.value })} className="h-9 text-sm font-mono flex-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Cor Secundária</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={storeForm.secondaryColor} onChange={e => setStoreForm({ ...storeForm, secondaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
                  <Input value={storeForm.secondaryColor} onChange={e => setStoreForm({ ...storeForm, secondaryColor: e.target.value })} className="h-9 text-sm font-mono flex-1" />
                </div>
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={() => {
              const updates: any = {};
              for (const [k, v] of Object.entries(storeForm)) {
                if (v) updates[k] = v;
              }
              updateSettings.mutate(updates);
            }} disabled={updateSettings.isPending}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {updateSettings.isPending ? 'Salvando...' : 'Salvar Dados da Loja'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// AdvancedAiConfig removed - now integrated into AIAttendantView

// ===== ADMIN PIPELINE VIEW =====
function AdminPipelineView() {
  const [dept, setDept] = useState("vendas");
  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: dept });
  const { data: leads, refetch } = trpc.crmLeads.listAll.useQuery({ department: dept, archived: false }, { refetchInterval: 5000 });
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const [, navigate] = useLocation();
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const moveStage = trpc.crmLeads.moveStage.useMutation({
    onSuccess: () => { refetch(); toast.success("Lead movido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const leadsByStage = useMemo(() => {
    if (!leads || !stages) return {};
    const map: Record<string, typeof leads> = {};
    for (const s of stages) map[s.name] = [];
    for (const l of leads) {
      if (map[l.stage]) map[l.stage].push(l);
    }
    return map;
  }, [leads, stages]);

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(leadId));
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      setTimeout(() => { (e.currentTarget as HTMLElement).style.opacity = "0.4"; }, 0);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    setDragOverStage(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageName);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = parseInt(e.dataTransfer.getData("text/plain"));
    if (!leadId || !leads) return;
    const lead = leads.find((l: any) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;
    moveStage.mutate({ id: leadId, newStage: targetStage, sellerId: sellerSession?.id || 0 });
  };

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
          const isOver = dragOverStage === s.name;
          return (
            <div key={s.id}
              onDragOver={(e) => handleDragOver(e, s.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, s.name)}
              className={`shrink-0 w-64 rounded-xl border-2 bg-card transition-all duration-200 ${
                isOver ? "border-primary/60 bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10" : "border-border"
              }`}>
              <div className="p-3 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-bold text-foreground">{s.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{stageLeads.length}</span>
              </div>
              <div className={`p-2 space-y-1.5 max-h-96 overflow-y-auto min-h-[60px] ${
                isOver && stageLeads.length === 0 ? "flex items-center justify-center" : ""
              }`}>
                {stageLeads.map(l => (
                  <div key={l.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, l.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/crm/lead/${l.id}`)}
                    className={`p-2 rounded-lg bg-accent/50 border border-border cursor-grab hover:bg-accent transition-all active:cursor-grabbing ${
                      draggedLeadId === l.id ? "opacity-40 ring-2 ring-primary" : ""
                    }`}>
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
                  <p className={`text-[10px] text-muted-foreground text-center py-4 ${
                    isOver ? "text-primary font-medium" : ""
                  }`}>{isOver ? "Soltar aqui" : "Vazio"}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ===== SDR MANAGEMENT VIEW =====
function SDRManagementView() {
  const [showCreateSDR, setShowCreateSDR] = useState(false);
  const { data: aiStats } = trpc.crmAi.getAttendantStats.useQuery(undefined, { refetchInterval: 15000 });
  const { data: aiConfig } = trpc.crmAi.getAttendantConfig.useQuery();
  const [sdrForm, setSdrForm] = useState({ name: "", nickname: "", phone: "", email: "" });
  const [selectedSDR, setSelectedSDR] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [assignTarget, setAssignTarget] = useState("");
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);
  const [banSellerId, setBanSellerId] = useState<number | null>(null);
  const [banDays, setBanDays] = useState(3);
  const [banReason, setBanReason] = useState("");
  const [editThreshold, setEditThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(10);
  const UNASSIGNED_PAGE_SIZE = 20;

  // Fetch SDR sellers (department = pre_vendas)
  const { data: allSellers } = trpc.sellers.list.useQuery();
  const sdrSellers = useMemo(() => (allSellers || []).filter((s: any) => s.department === "pre_vendas" && s.active), [allSellers]);
  const vendorSellers = useMemo(() => (allSellers || []).filter((s: any) => (s.department === "vendas" || !s.department) && s.active), [allSellers]);

  // Fetch all leads and unassigned leads
  const { data: allLeads, refetch: refetchLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });
  const { data: unassignedLeads, refetch: refetchUnassigned } = trpc.crmLeads.listUnassigned.useQuery({});

  // Distribution config
  const { data: distConfig, refetch: refetchConfig } = trpc.crmDistribution.getConfig.useQuery();
  const updateConfigMut = trpc.crmDistribution.updateConfig.useMutation({
    onSuccess: () => { refetchConfig(); toast.success("Configuração atualizada!"); },
    onError: (e) => toast.error(e.message),
  });
  const autoDistributeMut = trpc.crmDistribution.autoDistributeToSellers.useMutation({
    onSuccess: (data) => {
      refetchLeads(); refetchUnassigned();
      if (data.distributed > 0) toast.success(`${data.distributed} leads distribuídos!`);
      else toast.info("Nenhum lead para distribuir.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Create SDR seller
  const createSeller = trpc.sellers.create.useMutation({
    onSuccess: () => {
      toast.success("SDR criado com sucesso!");
      setSdrForm({ name: "", nickname: "", phone: "", email: "" });
      setShowCreateSDR(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Assign lead
  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => { refetchLeads(); refetchUnassigned(); toast.success("Lead transferido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Bulk assign
  const bulkAssign = trpc.crmLeads.bulkAssign.useMutation({
    onSuccess: (r: any) => {
      refetchLeads(); refetchUnassigned(); setSelectedLeads(new Set()); setBulkMode(false);
      toast.success(`${r.assigned} leads distribuídos!`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const vendasConfig = useMemo(() => distConfig?.find((c: any) => c.department === "vendas"), [distConfig]);
  const isAutoEnabled = vendasConfig?.enabled ?? false;
  const transferThreshold = vendasConfig?.transferThresholdMinutes ?? 10;

  // Block/Ban mutations
  const toggleBlockMut = trpc.sellers.toggleLeadBlock.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const banMut = trpc.sellers.banFromLeads.useMutation({
    onSuccess: () => { toast.success("Vendedor banido de leads!"); setBanSellerId(null); setBanReason(""); },
    onError: (e) => toast.error(e.message),
  });
  const removeBanMut = trpc.sellers.removeBan.useMutation({
    onSuccess: () => { toast.success("Ban removido!"); },
    onError: (e) => toast.error(e.message),
  });

  // Stats
  const stats = useMemo(() => {
    if (!allLeads) return { total: 0, unassigned: 0, assigned: 0, hot: 0, waiting5min: 0, waiting10min: 0 };
    const now = Date.now();
    return {
      total: allLeads.length,
      unassigned: allLeads.filter(l => l.sellerId === 0).length,
      assigned: allLeads.filter(l => l.sellerId > 0).length,
      hot: allLeads.filter(l => l.score === "hot").length,
      waiting5min: allLeads.filter(l => {
        const created = typeof l.createdAt === 'number' ? l.createdAt : new Date(l.createdAt!).getTime();
        return l.sellerId === 0 && (now - created) > 5 * 60000;
      }).length,
      waiting10min: allLeads.filter(l => {
        const created = typeof l.createdAt === 'number' ? l.createdAt : new Date(l.createdAt!).getTime();
        return l.sellerId > 0 && (now - created) > 10 * 60000;
      }).length,
    };
  }, [allLeads]);

  // Leads per seller
  const sellerLeadCounts = useMemo(() => {
    if (!allLeads) return {} as Record<number, number>;
    return allLeads.reduce((acc, l) => { if (l.sellerId > 0) acc[l.sellerId] = (acc[l.sellerId] || 0) + 1; return acc; }, {} as Record<number, number>);
  }, [allLeads]);

  // Leads per SDR
  const sdrLeadCounts = useMemo(() => {
    if (!allLeads) return {} as Record<number, number>;
    // SDRs are tracked by who created the activity
    return {};
  }, [allLeads]);

  const sellerMap = useMemo(() => {
    if (!allSellers) return {} as Record<number, string>;
    return allSellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [allSellers]);

  const toggleLead = (id: number) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAssign = () => {
    if (!assignTarget || selectedLeads.size === 0) return;
    bulkAssign.mutate({
      leadIds: Array.from(selectedLeads),
      newSellerId: parseInt(assignTarget),
      currentSellerId: 0,
    });
  };

  const crmTimeAgo = (ts: number | string | Date | null | undefined) => {
    if (!ts) return "—";
    const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
    const diff = Date.now() - ms;
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Headphones className="w-5 h-5 text-purple-400" /> Painel SDR
          </h2>
          <p className="text-xs text-muted-foreground">Gerencie SDRs, distribua leads e monitore tempos de resposta</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateSDR(!showCreateSDR)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo SDR
        </Button>
      </div>

      {/* AI Attendant Status Banner */}
      {aiConfig && (
        <div className={`p-3 rounded-xl border-2 flex items-center justify-between ${aiConfig.attendantEnabled ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card'}`}>
          <div className="flex items-center gap-3">
            <Bot className={`w-5 h-5 ${aiConfig.attendantEnabled ? 'text-green-400' : 'text-muted-foreground'}`} />
            <div>
              <span className={`text-sm font-bold ${aiConfig.attendantEnabled ? 'text-green-400' : 'text-muted-foreground'}`}>
                IA Atendente {aiConfig.attendantEnabled ? 'ATIVA' : 'DESATIVADA'}
              </span>
              {aiConfig.attendantEnabled && aiStats && (
                <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                  <span>{aiStats.totalLeadsHandled} leads atendidos</span>
                  <span className="text-amber-400">{aiStats.fichasPending} fichas pendentes</span>
                  <span className="text-blue-400">{aiStats.appointmentsToday} agendamentos hoje</span>
                </div>
              )}
            </div>
          </div>
          {aiConfig.attendantEnabled && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total Leads</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
          <UserPlus className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-amber-400">{stats.unassigned}</p>
          <p className="text-[10px] text-amber-400/70">Sem Vendedor</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
          <CheckCircle className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-cyan-400">{stats.assigned}</p>
          <p className="text-[10px] text-cyan-400/70">Com Vendedor</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-center">
          <Flame className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{stats.hot}</p>
          <p className="text-[10px] text-red-400/70">Quentes</p>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-center">
          <Timer className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-orange-400">{stats.waiting5min}</p>
          <p className="text-[10px] text-orange-400/70">5min+ sem SDR</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-center">
          <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{stats.waiting10min}</p>
          <p className="text-[10px] text-red-400/70">10min+ sem resposta</p>
        </div>
      </div>

      {/* Distribution Controls */}
      <div className="rounded-xl border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-purple-400" /> Distribuição de Leads
          </h3>
          <button
            onClick={() => updateConfigMut.mutate({ department: "vendas", enabled: !isAutoEnabled })}
            disabled={updateConfigMut.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              isAutoEnabled
                ? "bg-green-500/20 text-green-400 border-2 border-green-500/40 shadow-lg shadow-green-500/10"
                : "bg-gray-500/20 text-gray-400 border-2 border-gray-500/30"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isAutoEnabled ? "AUTOMÁTICO ATIVO" : "MANUAL"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <p className="text-xs font-medium text-foreground mb-1">Modo Automático</p>
            <p className="text-[10px] text-muted-foreground">Leads novos são distribuídos automaticamente por round-robin entre os vendedores ativos. Se não responderem em 10 minutos, o lead é transferido.</p>
          </div>
          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <p className="text-xs font-medium text-foreground mb-1">Modo Manual</p>
            <p className="text-[10px] text-muted-foreground">Você escolhe para qual vendedor enviar cada lead. Use os botões abaixo para distribuir individualmente ou em lote.</p>
          </div>
        </div>
        {(unassignedLeads?.length || 0) > 0 && (
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => autoDistributeMut.mutate({ department: "vendas", sdrSellerId: sdrSellers[0]?.id || 0 })}
              disabled={autoDistributeMut.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              {autoDistributeMut.isPending ? "Distribuindo..." : `Distribuir ${unassignedLeads?.length} leads automaticamente`}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setBulkMode(!bulkMode); setSelectedLeads(new Set()); }}
              className="border-purple-500/30 text-purple-400"
            >
              <ArrowRightLeft className="w-4 h-4 mr-1" /> Manual
            </Button>
          </div>
        )}
      </div>

      {/* SDR Team */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-purple-400" /> Equipe SDR ({sdrSellers.length})
        </h3>
        {sdrSellers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sdrSellers.map((sdr: any) => (
              <div key={sdr.id} className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{sdr.nickname || sdr.name}</p>
                    <p className="text-[10px] text-muted-foreground">{sdr.phone || sdr.email || "SDR"}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Headphones className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum SDR cadastrado</p>
            <p className="text-xs text-muted-foreground/60 mb-3">Crie SDRs para gerenciar a distribuição de leads</p>
            <Button size="sm" onClick={() => setShowCreateSDR(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" /> Criar Primeiro SDR
            </Button>
          </div>
        )}
      </div>

      {/* Create SDR Form */}
      {showCreateSDR && (
        <div className="rounded-xl border-2 border-purple-500/30 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-400" /> Novo SDR
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <Input value={sdrForm.name} onChange={e => setSdrForm({...sdrForm, name: e.target.value})} placeholder="Nome completo" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Apelido</label>
              <Input value={sdrForm.nickname} onChange={e => setSdrForm({...sdrForm, nickname: e.target.value})} placeholder="Apelido (opcional)" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <Input value={sdrForm.phone} onChange={e => setSdrForm({...sdrForm, phone: e.target.value})} placeholder="(47) 99999-9999" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input value={sdrForm.email} onChange={e => setSdrForm({...sdrForm, email: e.target.value})} placeholder="email@exemplo.com" className="h-9" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => {
                if (!sdrForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
                createSeller.mutate({ name: sdrForm.name, nickname: sdrForm.nickname || undefined, phone: sdrForm.phone || undefined, email: sdrForm.email || undefined, department: "pre_vendas" });
              }}
              disabled={createSeller.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {createSeller.isPending ? "Criando..." : "Criar SDR"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateSDR(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Leads por Vendedor + Bloqueio/Ban */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Leads por Vendedor
        </h3>
        {vendorSellers.length > 0 ? (
          <div className="space-y-3">
            {vendorSellers.map((s: any) => {
              const count = sellerLeadCounts[s.id] || 0;
              const maxCount = Math.max(...Object.values(sellerLeadCounts), 1);
              const isBlocked = s.leadReceiveBlocked;
              const isBanned = s.leadBanUntil && s.leadBanUntil > Date.now();
              const banExpiry = isBanned ? new Date(s.leadBanUntil).toLocaleDateString('pt-BR') : null;
              return (
                <div key={s.id} className={`p-3 rounded-lg border transition-all ${
                  isBlocked ? 'border-red-500/40 bg-red-500/5' :
                  isBanned ? 'border-orange-500/40 bg-orange-500/5' :
                  'border-border bg-card/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isBlocked ? 'bg-red-500/20' : isBanned ? 'bg-orange-500/20' : 'bg-primary/10'
                    }`}>
                      <span className={`text-[10px] font-bold ${
                        isBlocked ? 'text-red-400' : isBanned ? 'text-orange-400' : 'text-primary'
                      }`}>{(s.nickname || s.name || "?").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground font-medium truncate">{s.nickname || s.name}</span>
                        {isBlocked && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold shrink-0">BLOQUEADO</span>}
                        {isBanned && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold shrink-0">BAN até {banExpiry}</span>}
                      </div>
                      <div className="flex-1 h-5 bg-accent/30 rounded-full overflow-hidden relative mt-1">
                        <div className={`h-full rounded-full transition-all duration-700 ${
                          isBlocked || isBanned ? 'bg-gradient-to-r from-gray-500/40 to-gray-500/20' : 'bg-gradient-to-r from-primary/60 to-primary/30'
                        }`} style={{ width: `${Math.max((count / maxCount) * 100, 2)}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{count} leads</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleBlockMut.mutate({ sellerId: s.id, blocked: !isBlocked })}
                        title={isBlocked ? 'Desbloquear leads' : 'Bloquear leads'}
                        className={`p-1.5 rounded-lg transition-all ${
                          isBlocked ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                        }`}
                      >
                        {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                      {isBanned ? (
                        <button
                          onClick={() => removeBanMut.mutate({ sellerId: s.id })}
                          title="Remover ban"
                          className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBanSellerId(s.id); setBanDays(3); setBanReason(''); }}
                          title="Aplicar ban temporário"
                          className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all"
                        >
                          <ShieldBan className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {s.leadBanReason && isBanned && (
                    <p className="text-[10px] text-orange-400/70 mt-1 ml-11">Motivo: {s.leadBanReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum vendedor ativo</p>
        )}
      </div>

      {/* Ban Dialog */}
      {banSellerId && (
        <div className="rounded-xl border-2 border-orange-500/40 bg-orange-500/5 p-4">
          <h3 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
            <ShieldBan className="w-4 h-4" /> Aplicar Ban — {allSellers?.find((s: any) => s.id === banSellerId)?.nickname || allSellers?.find((s: any) => s.id === banSellerId)?.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dias de ban *</label>
              <div className="flex gap-2">
                {[1, 3, 7, 14, 30].map(d => (
                  <button key={d} onClick={() => setBanDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      banDays === d ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                    }`}>{d}d</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Motivo (opcional)</label>
              <Input value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="Ex: Não respondeu 5 leads seguidos" className="h-9" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => banMut.mutate({ sellerId: banSellerId, days: banDays, reason: banReason || undefined })}
              disabled={banMut.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
              {banMut.isPending ? 'Aplicando...' : `Banir por ${banDays} dia(s)`}
            </Button>
            <Button variant="outline" onClick={() => setBanSellerId(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Unassigned Leads - Manual Distribution */}
      {(unassignedLeads?.length || 0) > 0 && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {unassignedLeads?.length} Leads Aguardando Distribuição
            </h3>
            {bulkMode && selectedLeads.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground font-medium">{selectedLeads.size} selecionados</span>
                <select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground">
                  <option value="">Vendedor...</option>
                  {vendorSellers.map((s: any) => <option key={s.id} value={s.id}>{s.nickname || s.name}</option>)}
                </select>
                <Button size="sm" onClick={handleBulkAssign} disabled={!assignTarget || bulkAssign.isPending}
                  className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  {bulkAssign.isPending ? "..." : "Distribuir"}
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {(showAllUnassigned ? unassignedLeads : unassignedLeads?.slice(0, UNASSIGNED_PAGE_SIZE))?.map((lead: any) => {
              const created = typeof lead.createdAt === 'number' ? lead.createdAt : new Date(lead.createdAt).getTime();
              const waitMinutes = Math.floor((Date.now() - created) / 60000);
              const isUrgent = waitMinutes >= 10;
              const isWarning = waitMinutes >= 5 && waitMinutes < 10;
              return (
                <div key={lead.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isUrgent ? "border-red-500/50 bg-red-500/10" :
                  isWarning ? "border-amber-500/40 bg-amber-500/10" :
                  "border-border bg-card"
                } ${bulkMode && selectedLeads.has(lead.id) ? "ring-2 ring-purple-500/50" : ""}`}>
                  {bulkMode && (
                    <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleLead(lead.id)} className="rounded border-border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">{lead.name}</span>
                      {isUrgent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">
                          {waitMinutes}min!
                        </span>
                      )}
                      {isWarning && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-400 font-bold">
                          {waitMinutes}min
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.vehicleInterest && <span>• {lead.vehicleInterest}</span>}
                      {lead.source && <span className="flex items-center gap-1">• <ChannelIcon source={lead.source} size={12} showLabel /></span>}
                    </div>
                  </div>
                  {!bulkMode && (
                    <div className="flex items-center gap-1.5">
                      <select
                        defaultValue=""
                        onChange={e => {
                          const v = parseInt(e.target.value);
                          if (v) assignLead.mutate({ leadId: lead.id, newSellerId: v, currentSellerId: 0 });
                        }}
                        className="h-8 px-2 text-[10px] rounded-lg border border-border bg-background text-foreground min-w-[110px]"
                      >
                        <option value="">Enviar para →</option>
                        {vendorSellers.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                        ))}
                      </select>
                      {lead.phone && (
                        <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                          className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                          <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(unassignedLeads?.length || 0) > UNASSIGNED_PAGE_SIZE && !showAllUnassigned && (
            <button onClick={() => setShowAllUnassigned(true)}
              className="w-full mt-3 py-2 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 rounded-lg transition-all">
              Ver todos os {unassignedLeads?.length} leads ({(unassignedLeads?.length || 0) - UNASSIGNED_PAGE_SIZE} restantes)
            </button>
          )}
          {showAllUnassigned && (unassignedLeads?.length || 0) > UNASSIGNED_PAGE_SIZE && (
            <button onClick={() => setShowAllUnassigned(false)}
              className="w-full mt-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-accent/30 hover:bg-accent/50 rounded-lg transition-all">
              Mostrar menos
            </button>
          )}
        </div>
      )}

      {/* Alert Configuration - Configurable */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" /> Regras de Alerta Automático
          </h3>
          {!editThreshold ? (
            <button onClick={() => { setEditThreshold(true); setThresholdValue(transferThreshold); }}
              className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              <Edit className="w-3 h-3" /> Editar tempos
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Transferência após:</span>
              <Input type="number" min={3} max={120} value={thresholdValue}
                onChange={e => setThresholdValue(parseInt(e.target.value) || 10)}
                className="h-7 w-16 text-xs text-center" />
              <span className="text-[10px] text-muted-foreground">min</span>
              <Button size="sm" className="h-7 text-xs bg-primary" onClick={() => {
                updateConfigMut.mutate({ department: 'vendas', enabled: isAutoEnabled, transferThresholdMinutes: thresholdValue });
                setEditThreshold(false);
              }}>Salvar</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditThreshold(false)}>X</Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">5 minutos</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Lead sem SDR é distribuído automaticamente para o próximo vendedor (round-robin)</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{Math.max(1, transferThreshold - 2)} minutos</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Vendedor recebe aviso: "Lead será transferido em 2 minutos se não responder!"</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400">{transferThreshold} minutos</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Lead é transferido automaticamente para outro vendedor. Vendedor anterior é notificado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ===== AI ATTENDANT VIEW (UNIFIED - all AI config in one place) =====
function AIAttendantView() {
  const { data: config, refetch: refetchConfig } = trpc.crmAi.getAttendantConfig.useQuery();
  const { data: stats } = trpc.crmAi.getAttendantStats.useQuery(undefined, { refetchInterval: 15000 });
  const setConfig = trpc.crmAi.setAttendantConfig.useMutation({
    onSuccess: () => { refetchConfig(); toast.success("Configuração salva!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Global AI config (mode, feirao, advanced)
  const { data: globalConfig, refetch: refetchGlobal } = trpc.crmAi.getGlobalAiConfig.useQuery();
  const { data: dispatchStats, refetch: refetchDispatchStats } = trpc.crmAi.getInactiveDispatchStats.useQuery();
  const setGlobalConfig = trpc.crmAi.setGlobalAiConfig.useMutation({
    onSuccess: () => { toast.success("Modo da IA salvo!"); refetchGlobal(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const setAdvanced = trpc.crmAi.setAdvancedAiConfig.useMutation({
    onSuccess: () => { toast.success("Configuração avançada salva!"); refetchGlobal(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const triggerDispatch = trpc.crmAi.triggerInactiveDispatch.useMutation({
    onSuccess: (data) => { toast.success(`Disparo concluído: ${data.sent} enviados, ${data.skipped} ignorados`); refetchDispatchStats(); },
    onError: (e: any) => toast.error("Erro no disparo: " + e.message),
  });

  const [localPrompt, setLocalPrompt] = useState("");
  const [localMaxMsg, setLocalMaxMsg] = useState(0);
  const [activeTab, setActiveTab] = useState<'geral' | 'modo' | 'horario' | 'disparo' | 'instrucoes' | 'historico'>('geral');

  // AI config log
  const { data: aiConfigLog } = trpc.crmAi.getAiConfigLog.useQuery();
  // Feirão schedule
  const { data: feiraoSchedule, refetch: refetchFeiraoSchedule } = trpc.crmAi.getFeiraoSchedule.useQuery();
  const setFeiraoSchedule = trpc.crmAi.setFeiraoSchedule.useMutation({
    onSuccess: () => { toast.success("Agendamento do Feirão salvo!"); refetchFeiraoSchedule(); },
    onError: (e: any) => toast.error(e.message),
  });
  const [feiraoAutoSchedule, setFeiraoAutoSchedule] = useState(false);
  const [feiraoStartDate, setFeiraoStartDate] = useState('');
  const [feiraoEndDate, setFeiraoEndDate] = useState('');
  const [feiraoScheduleInit, setFeiraoScheduleInit] = useState(false);

  // Feirao state
  const [aiMode, setAiMode] = useState<'normal' | 'feirao'>('normal');
  const [feiraoForm, setFeiraoForm] = useState({ beneficios: '', promocoes: '', objetivo: '', instrucoes: '' });
  const [normalForm, setNormalForm] = useState({ instrucoes: '' });

  // Advanced state
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState(8);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(20);
  const [maxMsgEnabled, setMaxMsgEnabled] = useState(false);
  const [maxMsgPerLead, setMaxMsgPerLead] = useState(10);
  const [personality, setPersonality] = useState('amigavel');
  const [inactiveEnabled, setInactiveEnabled] = useState(false);
  const [inactiveHours, setInactiveHours] = useState(1);
  const [inactiveMsg, setInactiveMsg] = useState('');
  const [inactiveMaxPerDay, setInactiveMaxPerDay] = useState(1);
  const [globalInitialized, setGlobalInitialized] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalPrompt(config.attendantPrompt || "");
      setLocalMaxMsg(config.attendantMaxMessages ?? 0);
    }
  }, [config]);

  // Init global config
  if (globalConfig && !globalInitialized) {
    setAiMode(globalConfig.aiMode as 'normal' | 'feirao');
    if (globalConfig.feiraoConfig) {
      setFeiraoForm({
        beneficios: globalConfig.feiraoConfig.beneficios || '',
        promocoes: globalConfig.feiraoConfig.promocoes || '',
        objetivo: globalConfig.feiraoConfig.objetivo || '',
        instrucoes: globalConfig.feiraoConfig.instrucoes || '',
      });
    }
    if (globalConfig.normalConfig) {
      setNormalForm({ instrucoes: globalConfig.normalConfig.instrucoes || '' });
    }
    setWorkingHoursEnabled(globalConfig.workingHoursEnabled);
    setWorkingHoursStart(globalConfig.workingHoursStart);
    setWorkingHoursEnd(globalConfig.workingHoursEnd);
    setMaxMsgEnabled(globalConfig.maxMessagesEnabled);
    setMaxMsgPerLead(globalConfig.maxMessagesPerLead);
    setPersonality(globalConfig.personality);
    setInactiveEnabled(globalConfig.inactiveDispatchEnabled);
    setInactiveHours(globalConfig.inactiveDispatchHours);
    setInactiveMsg(globalConfig.inactiveDispatchMessage);
    setInactiveMaxPerDay(globalConfig.inactiveDispatchMaxPerDay);
    setGlobalInitialized(true);
  }

  if (!config) return <div className="text-center text-muted-foreground py-8">Carregando...</div>;

  const isActive = config.attendantEnabled;

  const AIToggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
      <div className="flex-1 mr-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const handleSaveAdvanced = () => {
    setAdvanced.mutate({
      autoReplyEnabled: isActive,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      maxMessagesEnabled: maxMsgEnabled,
      maxMessagesPerLead: maxMsgPerLead,
      personality: personality as 'amigavel' | 'profissional' | 'agressivo',
      inactiveDispatchEnabled: inactiveEnabled,
      inactiveDispatchHours: inactiveHours,
      inactiveDispatchMessage: inactiveMsg,
      inactiveDispatchMaxPerDay: inactiveMaxPerDay,
    });
  };

  // Init feirão schedule
  if (feiraoSchedule && !feiraoScheduleInit) {
    setFeiraoAutoSchedule(feiraoSchedule.feiraoAutoSchedule);
    if (feiraoSchedule.feiraoScheduleStart) setFeiraoStartDate(new Date(feiraoSchedule.feiraoScheduleStart).toISOString().slice(0, 16));
    if (feiraoSchedule.feiraoScheduleEnd) setFeiraoEndDate(new Date(feiraoSchedule.feiraoScheduleEnd).toISOString().slice(0, 16));
    setFeiraoScheduleInit(true);
  }

  const tabs = [
    { key: 'geral' as const, label: 'Geral', icon: Bot },
    { key: 'modo' as const, label: 'Modo / Feirão', icon: Flame },
    { key: 'horario' as const, label: 'Horário e Limites', icon: Clock },
    { key: 'disparo' as const, label: 'Disparo de Msgs', icon: Send },
    { key: 'instrucoes' as const, label: 'Instruções', icon: Edit },
    { key: 'historico' as const, label: 'Histórico', icon: Clock },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header with big toggle */}
      <div className={`p-6 rounded-2xl border-2 transition-all ${isActive ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-card'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-500/20' : 'bg-muted'}`}>
              <Bot className={`w-7 h-7 ${isActive ? 'text-green-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">IA Atendente Automática</h2>
              <p className="text-xs text-muted-foreground">Todas as configurações da IA em um único lugar</p>
            </div>
          </div>
          <button
            onClick={() => setConfig.mutate({ attendantEnabled: !isActive })}
            className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isActive ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 ${isActive ? 'left-9' : 'left-1'}`} />
          </button>
        </div>

        {isActive ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 font-medium">IA Ativa</span>
            <span className="text-muted-foreground">— Respondendo clientes automaticamente</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Power className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">IA Desativada</span>
            <span className="text-muted-foreground">— Nenhuma resposta automática</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-2xl font-bold text-foreground">{stats.totalLeadsHandled}</div>
            <div className="text-[10px] text-muted-foreground">Leads Atendidos</div>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-2xl font-bold text-amber-400">{stats.fichasPending}</div>
            <div className="text-[10px] text-muted-foreground">Fichas Pendentes</div>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-2xl font-bold text-green-400">{stats.fichasApproved}</div>
            <div className="text-[10px] text-muted-foreground">Fichas Aprovadas</div>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-2xl font-bold text-blue-400">{stats.appointmentsPending}</div>
            <div className="text-[10px] text-muted-foreground">Agendamentos Pendentes</div>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-2xl font-bold text-purple-400">{stats.appointmentsToday}</div>
            <div className="text-[10px] text-muted-foreground">Agendamentos Hoje</div>
          </div>
        </div>
      )}

      {/* Sub-tabs for all AI config */}
      <div className="flex gap-1 p-1 rounded-xl bg-card border border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: GERAL ===== */}
      {activeTab === 'geral' && (
        <>
          {/* Mode Selection */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Modo de Funcionamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'off_hours', label: 'Fora do Horário', desc: 'Ativa quando a loja fecha', icon: '🌙' },
                { value: 'always', label: 'Sempre Ativa', desc: 'Responde 24 horas', icon: '⚡' },
                { value: 'holidays', label: 'Feriados/Especial', desc: 'Apenas em datas específicas', icon: '📅' },
              ].map(mode => (
                <button key={mode.value}
                  onClick={() => setConfig.mutate({ attendantMode: mode.value as any })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${config.attendantMode === mode.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className="text-xl mb-1">{mode.icon}</div>
                  <div className="text-sm font-bold text-foreground">{mode.label}</div>
                  <div className="text-[10px] text-muted-foreground">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Features Toggles */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Funcionalidades Automáticas
            </h3>
            <div className="space-y-3">
              {[
                { key: 'attendantCollectData', label: 'Coletar Dados do Cliente', desc: 'Nome, CPF, renda, endereço automaticamente', icon: FileText },
                { key: 'attendantAutoSchedule', label: 'Agendar Visitas', desc: 'Marca agendamento na loja automaticamente', icon: Calendar },
                { key: 'attendantAutoFicha', label: 'Enviar Ficha para F&I', desc: 'Cria ficha de crédito automática quando cliente quer financiar', icon: CreditCard },
                { key: 'attendantAutoDistribute', label: 'Distribuir para Vendedor', desc: 'Distribui o lead para vendedor disponível', icon: Shuffle },
                { key: 'attendantTankPromo', label: 'Promoção Tanque Cheio', desc: 'Menciona tanque cheio ao agendar visita', icon: Zap },
              ].map(feature => {
                const isOn = (config as any)[feature.key];
                return (
                  <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <feature.icon className={`w-4 h-4 ${isOn ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{feature.label}</div>
                        <div className="text-[10px] text-muted-foreground">{feature.desc}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfig.mutate({ [feature.key]: !isOn } as any)}
                      className={`relative w-11 h-6 rounded-full transition-all ${isOn ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personality */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" /> Personalidade da IA
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'amigavel', label: 'Amigável', icon: '😊', desc: 'Informal e simpática' },
                { key: 'profissional', label: 'Profissional', icon: '👔', desc: 'Educada e direta' },
                { key: 'agressivo', label: 'Agressivo', icon: '🔥', desc: 'Persuasiva e urgente' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => { setPersonality(p.key); handleSaveAdvanced(); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    personality === p.key
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-accent/30 hover:bg-accent/50'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <p className={`text-sm font-bold mt-1 ${personality === p.key ? 'text-primary' : 'text-foreground'}`}>{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Max Messages - HARD LIMIT */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Limite de Mensagens por Lead
            </h3>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">Limite HARD Ativo: 5 mensagens</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                A IA envia no máximo 5 mensagens por lead. Na 5ª mensagem, transfere automaticamente para um consultor humano.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Limite configurável (sobrescreve o HARD de 5 se for menor):</p>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <button
                  onClick={() => { setLocalMaxMsg(0); setConfig.mutate({ attendantMaxMessages: 0 }); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${localMaxMsg === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-muted text-muted-foreground border border-border hover:border-primary/30'}`}
                >
                  Padrão (5 msgs)
                </button>
                {[3, 5, 7, 10].map(n => (
                  <button key={n}
                    onClick={() => { setLocalMaxMsg(n); setConfig.mutate({ attendantMaxMessages: n }); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${localMaxMsg === n ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-muted text-muted-foreground border border-border hover:border-primary/30'}`}
                  >
                    {n} msgs
                  </button>
                ))}
              </div>
              {localMaxMsg > 0 && (
                <div className="flex items-center gap-4">
                  <input type="range" min={3} max={20} value={localMaxMsg}
                    onChange={e => setLocalMaxMsg(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="text-lg font-bold text-foreground w-12 text-center">{localMaxMsg}</span>
                  <Button size="sm" onClick={() => setConfig.mutate({ attendantMaxMessages: localMaxMsg })}>
                    <Save className="w-3 h-3 mr-1" /> Salvar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== TAB: MODO / FEIRÃO ===== */}
      {activeTab === 'modo' && (
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" /> Modo da IA (Normal / Feirão)
          </h3>
          <p className="text-xs text-muted-foreground">Escolha o modo de operação da IA. No modo Feirão, a IA foca em promover o evento com urgência.</p>

          <div className="flex gap-3">
            <button
              onClick={() => setAiMode('normal')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                aiMode === 'normal' ? 'border-primary bg-primary/10' : 'border-border bg-accent/30 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className={`w-5 h-5 ${aiMode === 'normal' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${aiMode === 'normal' ? 'text-primary' : 'text-foreground'}`}>Normal</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Respostas padrão de vendas, foco em agendamento e conversão</p>
            </button>
            <button
              onClick={() => setAiMode('feirao')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                aiMode === 'feirao' ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-accent/30 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Flame className={`w-5 h-5 ${aiMode === 'feirao' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${aiMode === 'feirao' ? 'text-amber-500' : 'text-foreground'}`}>Feirão</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Modo evento especial com promoções e urgência</p>
            </button>
          </div>

          {aiMode === 'normal' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Instruções extras para modo Normal (opcional)</label>
                <textarea
                  value={normalForm.instrucoes}
                  onChange={e => setNormalForm({ instrucoes: e.target.value })}
                  placeholder="Ex: Sempre mencione que temos financiamento facilitado. Foque em agendar visitas presenciais."
                  className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={3}
                />
              </div>
            </div>
          )}

          {aiMode === 'feirao' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-400 font-medium">Modo Feirão: A IA vai focar em promover o evento, mencionar benefícios e criar urgência para agendar visitas!</p>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Benefícios do Feirão *</label>
                <textarea value={feiraoForm.beneficios} onChange={e => setFeiraoForm({ ...feiraoForm, beneficios: e.target.value })}
                  placeholder="Ex: Entrada facilitada, taxa 0% no primeiro ano, bônus de R$2.000 na troca"
                  className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Promoções Específicas</label>
                <textarea value={feiraoForm.promocoes} onChange={e => setFeiraoForm({ ...feiraoForm, promocoes: e.target.value })}
                  placeholder="Ex: HB20 a partir de R$49.900, Onix com IPVA grátis, SUVs com 15% de desconto"
                  className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Objetivo Principal</label>
                <textarea value={feiraoForm.objetivo} onChange={e => setFeiraoForm({ ...feiraoForm, objetivo: e.target.value })}
                  placeholder="Ex: Agendar o máximo de visitas para sábado dia 15/03"
                  className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Instruções Adicionais</label>
                <textarea value={feiraoForm.instrucoes} onChange={e => setFeiraoForm({ ...feiraoForm, instrucoes: e.target.value })}
                  placeholder="Ex: Mencionar que as condições são válidas apenas durante o feirão."
                  className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30" rows={2} />
              </div>
            </div>
          )}

          <Button
            onClick={() => setGlobalConfig.mutate({
              aiMode: aiMode,
              feiraoConfig: aiMode === 'feirao' ? feiraoForm : undefined,
              normalConfig: aiMode === 'normal' ? normalForm : undefined,
            })}
            disabled={setGlobalConfig.isPending}
            className="w-full racing-gradient text-white font-bold"
          >
            {setGlobalConfig.isPending ? 'Salvando...' : `Salvar Modo ${aiMode === 'feirao' ? 'Feirão' : 'Normal'}`}
          </Button>

          {globalConfig && (
            <div className="p-2 rounded-lg bg-accent/30 border border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Modo atual: <span className={`font-bold ${globalConfig.aiMode === 'feirao' ? 'text-amber-400' : 'text-primary'}`}>
                  {globalConfig.aiMode === 'feirao' ? 'Feirão' : 'Normal'}
                </span>
              </p>
            </div>
          )}

          {/* Feirão Schedule */}
          <div className="p-5 rounded-xl bg-card border border-amber-500/20 space-y-4 mt-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Agendamento Automático do Feirão
            </h3>
            <p className="text-xs text-muted-foreground">Programe datas de início e fim para ativar/desativar o modo Feirão automaticamente.</p>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Ativar Agendamento</p>
                <p className="text-[10px] text-muted-foreground">Feirão liga/desliga automaticamente nas datas</p>
              </div>
              <button onClick={() => setFeiraoAutoSchedule(!feiraoAutoSchedule)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${feiraoAutoSchedule ? 'bg-amber-500' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${feiraoAutoSchedule ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {feiraoAutoSchedule && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Início do Feirão</label>
                  <input type="datetime-local" value={feiraoStartDate} onChange={e => setFeiraoStartDate(e.target.value)}
                    className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Fim do Feirão</label>
                  <input type="datetime-local" value={feiraoEndDate} onChange={e => setFeiraoEndDate(e.target.value)}
                    className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                </div>
              </div>
            )}

            <Button onClick={() => setFeiraoSchedule.mutate({
              feiraoAutoSchedule: feiraoAutoSchedule,
              feiraoScheduleStart: feiraoStartDate ? new Date(feiraoStartDate).getTime() : null,
              feiraoScheduleEnd: feiraoEndDate ? new Date(feiraoEndDate).getTime() : null,
            })} disabled={setFeiraoSchedule.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold">
              {setFeiraoSchedule.isPending ? 'Salvando...' : 'Salvar Agendamento'}
            </Button>

            {feiraoSchedule && feiraoSchedule.feiraoAutoSchedule && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400">
                  Agendado: {feiraoSchedule.feiraoScheduleStart ? new Date(feiraoSchedule.feiraoScheduleStart).toLocaleString('pt-BR') : 'N/A'}
                  {' '}→{' '}
                  {feiraoSchedule.feiraoScheduleEnd ? new Date(feiraoSchedule.feiraoScheduleEnd).toLocaleString('pt-BR') : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: HORÁRIO E LIMITES ===== */}
      {activeTab === 'horario' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Horário de Funcionamento da IA
            </h3>
            <AIToggle
              checked={workingHoursEnabled}
              onChange={setWorkingHoursEnabled}
              label="Horário de Funcionamento"
              desc="IA só responde dentro do horário definido"
            />
            {workingHoursEnabled && (
              <div className="flex items-center gap-2 px-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <select value={workingHoursStart} onChange={e => setWorkingHoursStart(Number(e.target.value))} className="bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                </select>
                <span className="text-xs text-muted-foreground">até</span>
                <select value={workingHoursEnd} onChange={e => setWorkingHoursEnd(Number(e.target.value))} className="bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" /> Limite de Mensagens (Global)
            </h3>
            <AIToggle
              checked={maxMsgEnabled}
              onChange={setMaxMsgEnabled}
              label="Limite de Mensagens por Lead"
              desc="Limita quantas mensagens a IA pode enviar para cada lead"
            />
            {maxMsgEnabled && (
              <div className="flex items-center gap-2 px-3">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Máximo:</span>
                <input type="number" min={1} max={100} value={maxMsgPerLead}
                  onChange={e => setMaxMsgPerLead(Number(e.target.value))}
                  className="w-16 bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground text-center" />
                <span className="text-xs text-muted-foreground">mensagens</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveAdvanced}
            disabled={setAdvanced.isPending}
            className="w-full racing-gradient text-white font-bold"
          >
            {setAdvanced.isPending ? 'Salvando...' : 'Salvar Horário e Limites'}
          </Button>
        </div>
      )}

      {/* ===== TAB: DISPARO DE MSGS ===== */}
      {activeTab === 'disparo' && (
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-400" /> Disparo para Clientes Inativos
          </h3>
          <p className="text-xs text-muted-foreground">Configure o disparo automático de mensagens para leads que pararam de responder.</p>

          <AIToggle
            checked={inactiveEnabled}
            onChange={setInactiveEnabled}
            label="Reativar Clientes Inativos"
            desc="Envia mensagem para leads que não responderam há X horas"
          />

          {inactiveEnabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Após</span>
                <input type="number" min={1} max={72} value={inactiveHours}
                  onChange={e => setInactiveHours(Number(e.target.value))}
                  className="w-14 bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground text-center" />
                <span className="text-xs text-muted-foreground">horas sem resposta</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Máx.</span>
                <input type="number" min={1} max={5} value={inactiveMaxPerDay}
                  onChange={e => setInactiveMaxPerDay(Number(e.target.value))}
                  className="w-14 bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground text-center" />
                <span className="text-xs text-muted-foreground">disparo(s) por dia/lead</span>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Mensagem personalizada (opcional - se vazio, IA gera automaticamente)</label>
                <textarea value={inactiveMsg} onChange={e => setInactiveMsg(e.target.value)}
                  placeholder="Oi {nome}! Ainda tem interesse no {veiculo}? Posso te ajudar com algo?"
                  className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" rows={2} />
                <p className="text-[9px] text-muted-foreground mt-1">Use {'{nome}'}, {'{veiculo}'}, {'{nome_completo}'} como variáveis</p>
              </div>
              {dispatchStats && (
                <div className="p-2 rounded-lg bg-accent/30 border border-border">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Enviados hoje: <strong className="text-foreground">{dispatchStats.todayCount}</strong></span>
                    <span>Total: <strong className="text-foreground">{dispatchStats.totalCount}</strong></span>
                  </div>
                  {dispatchStats.lastRun && (
                    <p className="text-[9px] text-muted-foreground mt-1">Último disparo: {new Date(dispatchStats.lastRun).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              )}
              <Button size="sm" variant="outline" className="w-full text-xs gap-1"
                onClick={() => triggerDispatch.mutate()} disabled={triggerDispatch.isPending}>
                <Send className="w-3 h-3" />
                {triggerDispatch.isPending ? 'Disparando...' : 'Disparar Agora (Manual)'}
              </Button>
            </div>
          )}

          <Button
            onClick={handleSaveAdvanced}
            disabled={setAdvanced.isPending}
            className="w-full racing-gradient text-white font-bold"
          >
            {setAdvanced.isPending ? 'Salvando...' : 'Salvar Configurações de Disparo'}
          </Button>
        </div>
      )}

      {/* ===== TAB: HISTÓRICO ===== */}
      {activeTab === 'historico' && (
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Histórico de Alterações da IA
          </h3>
          <p className="text-xs text-muted-foreground">Registro de todas as alterações feitas nas configurações da IA.</p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {aiConfigLog && aiConfigLog.length > 0 ? aiConfigLog.map((log: any) => (
              <div key={log.id} className="p-3 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{log.action}</span>
                  <span className="text-[9px] text-muted-foreground">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{log.details}</p>
                {log.changedBy && <p className="text-[9px] text-primary mt-1">Por: {log.changedBy}</p>}
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma alteração registrada ainda</p>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: INSTRUÇÕES ===== */}
      {activeTab === 'instrucoes' && (
        <>
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Edit className="w-4 h-4 text-primary" /> Instruções Personalizadas
            </h3>
            <p className="text-xs text-muted-foreground">Adicione instruções extras para a IA. Ex: "Não mencione preços", "Foque em SUVs", "Mencione a promoção de Páscoa".</p>
            <textarea
              value={localPrompt}
              onChange={e => setLocalPrompt(e.target.value)}
              placeholder="Ex: Estamos com promoção especial de Páscoa, mencione isso nas conversas..."
              className="w-full h-32 p-3 rounded-lg bg-background border border-border text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button onClick={() => setConfig.mutate({ attendantPrompt: localPrompt })}>
              <Save className="w-3 h-3 mr-1" /> Salvar Instruções
            </Button>
          </div>

          {/* How it works */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground">Como Funciona</h3>
            <div className="space-y-2">
              {[
                { step: "1", text: "Cliente manda mensagem no WhatsApp fora do horário" },
                { step: "2", text: "IA responde de forma humanizada, como um vendedor real" },
                { step: "3", text: "IA coleta dados: nome, CPF, renda, veículo de interesse" },
                { step: "4", text: "Se cliente quer financiar, IA cria ficha de crédito automática" },
                { step: "5", text: "IA agenda visita presencial e menciona promoção do tanque cheio" },
                { step: "6", text: "Lead é distribuído para vendedor com alerta de agendamento" },
                { step: "7", text: "Ficha vai para fila de aprovação do F&I automaticamente" },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{item.step}</div>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===== CREDIT APPLICATIONS VIEW (Fichas de Crédito) =====
function CreditApplicationsView() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [viewTab, setViewTab] = useState<'fichas' | 'dados_ia'>('fichas');
  const { data: applications, refetch } = trpc.crmAi.listCreditApplications.useQuery({ status: statusFilter as any });
  const { data: leadsWithAiData, refetch: refetchAiData } = trpc.crmAi.listLeadsWithAiData.useQuery();
  const updateApp = trpc.crmAi.updateCreditApplication.useMutation({
    onSuccess: () => { refetch(); toast.success("Ficha atualizada!"); setEditingId(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const convertToFicha = trpc.crmAi.convertAiDataToFicha.useMutation({
    onSuccess: (data) => { 
      refetch(); refetchAiData();
      if (data.alreadyExists) toast.info("Ficha já existe para este lead");
      else toast.success("Ficha criada com sucesso! Vá para aba Fichas de Crédito.");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const dedup = trpc.crmAi.deduplicateFichas.useMutation({
    onSuccess: (data) => { refetch(); toast.success(`${data.removed} fichas duplicadas removidas`); },
    onError: (e: any) => toast.error(e.message),
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [, navigate] = useLocation();

  const statusColors: Record<string, string> = {
    pending: "text-amber-400 bg-amber-500/10",
    analyzing: "text-blue-400 bg-blue-500/10",
    approved: "text-green-400 bg-green-500/10",
    rejected: "text-red-400 bg-red-500/10",
    cancelled: "text-muted-foreground bg-muted",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pendente", analyzing: "Em Análise", approved: "Aprovada",
    rejected: "Rejeitada", cancelled: "Cancelada",
  };

  const startEdit = (app: any) => {
    setEditingId(app.id);
    setEditForm({
      customerName: app.customerName || '',
      customerCpf: app.customerCpf || '',
      customerRg: app.customerRg || '',
      customerBirthDate: app.customerBirthDate || '',
      customerPhone: app.customerPhone || app.leadPhone || '',
      customerEmail: app.customerEmail || '',
      customerAddress: app.customerAddress || '',
      customerIncome: app.customerIncome || '',
      customerEmployer: app.customerEmployer || '',
      customerEmploymentTime: app.customerEmploymentTime || '',
      vehicleInterest: app.vehicleInterest || '',
      downPayment: app.downPayment || '',
      tradeInVehicle: app.tradeInVehicle || '',
      tradeInPlate: app.tradeInPlate || '',
      tradeInKm: app.tradeInKm || '',
      financingTerm: app.financingTerm || '',
      bankPreference: app.bankPreference || '',
    });
  };

  const saveEdit = (appId: number) => {
    const payload: any = { id: appId };
    if (editForm.customerName) payload.customerName = editForm.customerName;
    if (editForm.customerCpf) payload.customerCpf = editForm.customerCpf;
    if (editForm.customerRg) payload.customerRg = editForm.customerRg;
    if (editForm.customerBirthDate) payload.customerBirthDate = editForm.customerBirthDate;
    if (editForm.customerPhone) payload.customerPhone = editForm.customerPhone;
    if (editForm.customerEmail) payload.customerEmail = editForm.customerEmail;
    if (editForm.customerAddress) payload.customerAddress = editForm.customerAddress;
    if (editForm.customerIncome) payload.customerIncome = Number(editForm.customerIncome) || undefined;
    if (editForm.customerEmployer) payload.customerEmployer = editForm.customerEmployer;
    if (editForm.customerEmploymentTime) payload.customerEmploymentTime = editForm.customerEmploymentTime;
    if (editForm.vehicleInterest) payload.vehicleInterest = editForm.vehicleInterest;
    if (editForm.downPayment) payload.downPayment = Number(editForm.downPayment) || undefined;
    if (editForm.tradeInVehicle) payload.tradeInVehicle = editForm.tradeInVehicle;
    if (editForm.tradeInPlate) payload.tradeInPlate = editForm.tradeInPlate;
    if (editForm.tradeInKm) payload.tradeInKm = Number(editForm.tradeInKm) || undefined;
    if (editForm.financingTerm) payload.financingTerm = Number(editForm.financingTerm) || undefined;
    if (editForm.bankPreference) payload.bankPreference = editForm.bankPreference;
    if (notes) payload.feiNotes = notes;
    updateApp.mutate(payload);
  };

  const EditField = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => (
    <div>
      <label className="text-[10px] text-muted-foreground block mb-0.5">{label}</label>
      <input type={type} value={editForm[field] || ''}
        onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}
        className="w-full px-2 py-1.5 rounded-md bg-background border border-border text-xs text-foreground" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Fichas & Simulações</h2>
            <p className="text-xs text-muted-foreground">Fila de aprovação de crédito + dados coletados pela IA</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => dedup.mutate()} disabled={dedup.isPending}>
          <Trash2 className="w-3 h-3 mr-1" /> Limpar Duplicadas
        </Button>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
        <button onClick={() => setViewTab('fichas')}
          className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${viewTab === 'fichas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <CreditCard className="w-4 h-4 inline mr-2" />Fichas de Crédito ({applications?.length || 0})
        </button>
        <button onClick={() => setViewTab('dados_ia')}
          className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${viewTab === 'dados_ia' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Zap className="w-4 h-4 inline mr-2" />Dados IA p/ Simulação ({leadsWithAiData?.length || 0})
        </button>
      </div>

      {viewTab === 'fichas' && (<>
      <div className="flex gap-2 flex-wrap">
        {['pending', 'analyzing', 'approved', 'rejected', 'all'].map(status => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {status === 'all' ? 'Todas' : statusLabels[status] || status}
          </button>
        ))}
      </div>

      {!applications || applications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma ficha {statusLabels[statusFilter]?.toLowerCase() || ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app: any) => (
            <div key={app.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => { setExpandedId(expandedId === app.id ? null : app.id); setEditingId(null); setNotes(''); }}
                className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(app.customerName || app.leadName || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-foreground">{app.customerName || app.leadName || 'Sem nome'}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {app.vehicleInterest || 'Veículo não informado'} • {app.customerCpf || 'CPF não informado'}
                      {app.sellerName && <span className="ml-2 text-blue-400">• {app.sellerName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[app.status] || ''}`}>
                    {statusLabels[app.status] || app.status}
                  </span>
                  {app.aiCollected && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-purple-400 bg-purple-500/10">IA</span>}
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === app.id ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {expandedId === app.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* EDIT MODE */}
                  {editingId === app.id ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-400">Editando Ficha</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <EditField label="Nome" field="customerName" />
                        <EditField label="CPF" field="customerCpf" />
                        <EditField label="RG" field="customerRg" />
                        <EditField label="Nascimento" field="customerBirthDate" />
                        <EditField label="Telefone" field="customerPhone" />
                        <EditField label="Email" field="customerEmail" type="email" />
                        <EditField label="Endereço" field="customerAddress" />
                        <EditField label="Renda (R$)" field="customerIncome" type="number" />
                        <EditField label="Empregador" field="customerEmployer" />
                        <EditField label="Tempo de Emprego" field="customerEmploymentTime" />
                        <EditField label="Veículo Interesse" field="vehicleInterest" />
                        <EditField label="Entrada (R$)" field="downPayment" type="number" />
                        <EditField label="Veículo Troca" field="tradeInVehicle" />
                        <EditField label="Placa Troca" field="tradeInPlate" />
                        <EditField label="KM Troca" field="tradeInKm" type="number" />
                        <EditField label="Prazo (meses)" field="financingTerm" type="number" />
                        <EditField label="Banco Preferência" field="bankPreference" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Observações F&I</label>
                        <textarea value={notes || app.feiNotes || ''} onChange={e => setNotes(e.target.value)}
                          placeholder="Observações..." className="w-full h-20 p-2 rounded-lg bg-background border border-border text-xs text-foreground resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => saveEdit(app.id)} disabled={updateApp.isPending}>
                          <Save className="w-3 h-3 mr-1" /> Salvar Alterações
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* VIEW MODE */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <DetailField label="Nome" value={app.customerName} />
                        <DetailField label="CPF" value={app.customerCpf} />
                        <DetailField label="RG" value={app.customerRg} />
                        <DetailField label="Nascimento" value={app.customerBirthDate} />
                        <DetailField label="Telefone" value={app.customerPhone || app.leadPhone} />
                        <DetailField label="Email" value={app.customerEmail} />
                        <DetailField label="Endereço" value={app.customerAddress} />
                        <DetailField label="Renda" value={app.customerIncome ? `R$ ${Number(app.customerIncome).toLocaleString('pt-BR')}` : null} />
                        <DetailField label="Empregador" value={app.customerEmployer} />
                        <DetailField label="Tempo de Emprego" value={app.customerEmploymentTime} />
                        <DetailField label="Veículo Interesse" value={app.vehicleInterest} />
                        <DetailField label="Entrada" value={app.downPayment ? `R$ ${Number(app.downPayment).toLocaleString('pt-BR')}` : null} />
                        <DetailField label="Veículo Troca" value={app.tradeInVehicle} />
                        <DetailField label="Placa Troca" value={app.tradeInPlate} />
                        <DetailField label="KM Troca" value={app.tradeInKm ? `${Number(app.tradeInKm).toLocaleString('pt-BR')} km` : null} />
                        <DetailField label="Prazo" value={app.financingTerm ? `${app.financingTerm} meses` : null} />
                        <DetailField label="Banco" value={app.bankPreference} />
                        <DetailField label="Origem" value={app.leadSource} />
                        <DetailField label="Criado em" value={app.createdAt ? new Date(Number(app.createdAt)).toLocaleString('pt-BR') : null} />
                      </div>

                      {app.feiNotes && (
                        <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <div className="text-[10px] text-blue-400 font-medium">Observações F&I:</div>
                          <div className="text-xs text-foreground">{app.feiNotes}</div>
                        </div>
                      )}

                      {app.sellerName && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-blue-400 font-medium">Vendedor: {app.sellerName}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30" onClick={() => startEdit(app)}>
                          <Edit className="w-3 h-3 mr-1" /> Editar Ficha
                        </Button>
                        {app.status === 'pending' && (
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30"
                            onClick={() => updateApp.mutate({ id: app.id, status: 'analyzing' })}>
                            <Eye className="w-3 h-3 mr-1" /> Iniciar Análise
                          </Button>
                        )}
                        {(app.status === 'pending' || app.status === 'analyzing') && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => updateApp.mutate({ id: app.id, status: 'approved' })}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Aprovar
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => updateApp.mutate({ id: app.id, status: 'rejected' })}>
                              <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* DADOS IA TAB */}
      {viewTab === 'dados_ia' && (
        <>
          {(leadsWithAiData?.length || 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum lead com dados coletados pela IA</p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">Quando a IA coletar CPF, entrada, nascimento, etc. aparecerá aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leadsWithAiData?.map((lead: any) => {
                const ai = lead.aiData || {};
                const hasCpf = !!ai.cpf;
                const hasBirth = !!ai.birthDate;
                const readyToSimulate = hasCpf && hasBirth;
                return (
                  <div key={lead.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${readyToSimulate ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                          {readyToSimulate ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-foreground">{lead.name || 'Sem nome'}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {lead.vehicleInterest || ai.vehicleInterest || 'Veículo não informado'}
                            {lead.sellerName && <span className="ml-2 text-blue-400">• {lead.sellerName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${readyToSimulate ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                          {readyToSimulate ? 'Pronto p/ Simular' : 'Coletando...'}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedLeadId === lead.id ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    {expandedLeadId === lead.id && (
                      <div className="border-t border-border p-4 space-y-4">
                        {lead.sellerName && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-blue-400 font-medium">Vendedor: {lead.sellerName}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <DetailField label="CPF" value={ai.cpf} />
                          <DetailField label="Nascimento" value={ai.birthDate} />
                          <DetailField label="Telefone" value={lead.phone} />
                          <DetailField label="Renda" value={ai.monthlyIncome ? `R$ ${ai.monthlyIncome}` : null} />
                          <DetailField label="Entrada" value={ai.downPayment ? `R$ ${ai.downPayment}` : null} />
                          <DetailField label="Forma Pgto" value={ai.paymentMethod} />
                          <DetailField label="Troca" value={ai.hasTradeIn ? 'Sim' : ai.hasTradeIn === false ? 'Não' : null} />
                          <DetailField label="Veículo Troca" value={ai.tradeInVehicle} />
                          <DetailField label="KM Troca" value={ai.tradeInKm} />
                          <DetailField label="Cidade" value={ai.customerCity} />
                          <DetailField label="Empregador" value={ai.employer} />
                          <DetailField label="Origem" value={lead.source} />
                        </div>
                        {ai.tradeInDetails && (
                          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <div className="text-[10px] text-amber-400 font-medium">Pré-Avaliação Troca:</div>
                            <div className="text-xs text-foreground">{ai.tradeInDetails}</div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => convertToFicha.mutate({ leadId: lead.id })} disabled={convertToFicha.isPending}>
                            <CreditCard className="w-3 h-3 mr-1" /> {convertToFicha.isPending ? 'Criando...' : 'Enviar p/ F&I (Criar Ficha)'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/crm/lead/${lead.id}`)}>
                            <Eye className="w-3 h-3 mr-1" /> Ver Lead
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-purple-400">
                          <Zap className="w-3 h-3" /> Dados coletados automaticamente pela IA
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium text-foreground">{value || <span className="text-muted-foreground/50">—</span>}</div>
    </div>
  );
}


// ===== AI METRICS DASHBOARD =====
function AIMetricsDashboard() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState<string>('');
  const [tempFilter, setTempFilter] = useState<string>('');
  
  const { data: metrics } = trpc.aiMetrics.getDashboardMetrics.useQuery({ period }, { refetchInterval: 30000 });
  const { data: trend } = trpc.aiMetrics.getDailyTrend.useQuery({ days: period === 'today' ? 1 : period === 'week' ? 7 : 30 });
  const { data: logsData } = trpc.aiMetrics.getConversationLogs.useQuery({ 
    page: logPage, limit: 15,
    stopReason: logFilter || undefined,
    temperature: tempFilter || undefined,
  }, { refetchInterval: 30000 });
  
  const reenableAi = trpc.aiMetrics.reenableAiForLead.useMutation({
    onSuccess: () => toast.success("IA reativada para este lead!"),
    onError: (e: any) => toast.error(e.message),
  });
  const resetCount = trpc.aiMetrics.resetAiMessageCount.useMutation({
    onSuccess: () => toast.success("Contador de mensagens resetado!"),
    onError: (e: any) => toast.error(e.message),
  });

  const stopReasonLabels: Record<string, { label: string; color: string; icon: any }> = {
    'limit_reached': { label: 'Limite Atingido', color: 'text-amber-400', icon: Timer },
    'limit_exceeded': { label: 'Limite Excedido', color: 'text-amber-500', icon: Timer },
    'transfer_to_seller': { label: 'Transferido p/ Vendedor', color: 'text-blue-400', icon: ArrowRightLeft },
    'human_takeover_crm': { label: 'Humano via CRM', color: 'text-green-400', icon: Users },
    'human_takeover_whatsapp': { label: 'Humano via WhatsApp', color: 'text-green-500', icon: Phone },
    'human_takeover_fromme': { label: 'Humano (fromMe)', color: 'text-green-600', icon: Send },
    'ai_disabled': { label: 'IA Desabilitada', color: 'text-red-400', icon: Power },
    'duplicate_blocked': { label: 'Duplicata Bloqueada', color: 'text-orange-400', icon: Shield },
    'error': { label: 'Erro', color: 'text-red-500', icon: AlertTriangle },
  };

  const tempLabels: Record<string, { label: string; color: string; icon: any }> = {
    'hot': { label: 'Quente', color: 'text-red-400', icon: Flame },
    'warm': { label: 'Morno', color: 'text-amber-400', icon: Thermometer },
    'cold': { label: 'Frio', color: 'text-blue-400', icon: Snowflake },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Métricas da IA Atendente</h2>
            <p className="text-xs text-muted-foreground">Análise de performance e resultados da IA SDR</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : p === 'month' ? '30 dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-3xl font-bold text-foreground">{metrics.totalConversations}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Total Conversas</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-3xl font-bold text-primary">{metrics.avgMessagesPerConversation}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Msgs/Conversa (Média)</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-3xl font-bold text-amber-400">{metrics.avgFieldsCollected}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Dados Coletados (Média)</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-3xl font-bold text-red-400">{metrics.conversionRate}%</div>
            <div className="text-[10px] text-muted-foreground mt-1">Leads Quentes</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-3xl font-bold text-green-400">{metrics.qualificationRate}%</div>
            <div className="text-[10px] text-muted-foreground mt-1">Taxa Qualificação (3+ dados)</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-3xl font-bold text-blue-400">{metrics.avgDurationSeconds > 60 ? `${Math.round(metrics.avgDurationSeconds / 60)}m` : `${metrics.avgDurationSeconds}s`}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Duração Média</div>
          </div>
        </div>
      )}

      {/* Stop Reason + Temperature Breakdown */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stop Reason Breakdown */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Motivo de Parada
            </h3>
            <div className="space-y-2">
              {Object.entries(metrics.stopReasonBreakdown).map(([reason, count]) => {
                const info = stopReasonLabels[reason] || { label: reason, color: 'text-muted-foreground', icon: AlertTriangle };
                const pct = metrics.totalConversations > 0 ? Math.round((count / metrics.totalConversations) * 100) : 0;
                return (
                  <div key={reason} className="flex items-center gap-3">
                    <info.icon className={`w-4 h-4 ${info.color} shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{info.label}</span>
                        <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full bg-primary/60`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(metrics.stopReasonBreakdown).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado ainda</p>
              )}
            </div>
          </div>

          {/* Temperature Breakdown */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-primary" /> Temperatura dos Leads
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.temperatureBreakdown).map(([temp, count]) => {
                const info = tempLabels[temp] || { label: temp, color: 'text-muted-foreground', icon: Thermometer };
                const pct = metrics.totalConversations > 0 ? Math.round((count / metrics.totalConversations) * 100) : 0;
                return (
                  <div key={temp} className="flex items-center gap-3">
                    <info.icon className={`w-5 h-5 ${info.color} shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground">{info.label}</span>
                        <span className="text-sm font-bold text-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${temp === 'hot' ? 'bg-red-500' : temp === 'warm' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(metrics.temperatureBreakdown).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado ainda</p>
              )}
            </div>

            {/* Actions Summary */}
            <div className="pt-3 border-t border-border grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-lg font-bold text-foreground">{metrics.totalPhotosSent}</div>
                  <div className="text-[10px] text-muted-foreground">Fotos Enviadas</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-lg font-bold text-foreground">{metrics.totalFichasCreated}</div>
                  <div className="text-[10px] text-muted-foreground">Fichas Criadas</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-lg font-bold text-foreground">{metrics.totalAppointmentsCreated}</div>
                  <div className="text-[10px] text-muted-foreground">Agendamentos</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-lg font-bold text-foreground">{metrics.totalDistributed}</div>
                  <div className="text-[10px] text-muted-foreground">Distribuídos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collected Fields Breakdown */}
      {metrics && Object.keys(metrics.topCollectedFields).length > 0 && (
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Dados Coletados pela IA
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(metrics.topCollectedFields).map(([field, count]) => {
              const pct = metrics.totalConversations > 0 ? Math.round((count / metrics.totalConversations) * 100) : 0;
              return (
                <div key={field} className="text-center p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-2xl font-bold text-foreground">{pct}%</div>
                  <div className="text-[10px] text-muted-foreground">{field}</div>
                  <div className="text-[9px] text-muted-foreground/70">{count} leads</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation Logs Table */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" /> Log de Conversas da IA
          </h3>
          <div className="flex gap-2">
            <select value={logFilter} onChange={e => { setLogFilter(e.target.value); setLogPage(1); }}
              className="px-2 py-1 rounded-lg bg-background border border-border text-xs text-foreground">
              <option value="">Todos motivos</option>
              <option value="limit_reached">Limite Atingido</option>
              <option value="transfer_to_seller">Transferido</option>
              <option value="human_takeover_crm">Humano CRM</option>
              <option value="human_takeover_whatsapp">Humano WhatsApp</option>
              <option value="human_takeover_fromme">Humano fromMe</option>
            </select>
            <select value={tempFilter} onChange={e => { setTempFilter(e.target.value); setLogPage(1); }}
              className="px-2 py-1 rounded-lg bg-background border border-border text-xs text-foreground">
              <option value="">Todas temperaturas</option>
              <option value="hot">Quente</option>
              <option value="warm">Morno</option>
              <option value="cold">Frio</option>
            </select>
          </div>
        </div>

        {logsData && logsData.logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Lead</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Msgs IA</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Dados</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Temp.</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Motivo Parada</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Data</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData.logs.map((log: any) => {
                    const reasonInfo = stopReasonLabels[log.stopReason] || { label: log.stopReason, color: 'text-muted-foreground', icon: AlertTriangle };
                    const tempInfo = tempLabels[log.leadTemperature] || { label: log.leadTemperature || '—', color: 'text-muted-foreground', icon: Thermometer };
                    return (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2">
                          <div className="font-medium text-foreground">{log.leadName || `Lead #${log.leadId}`}</div>
                          <div className="text-[10px] text-muted-foreground">{log.leadPhone}</div>
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-bold text-foreground">{log.totalAiMessages}</span>
                          <span className="text-muted-foreground">/{log.messageLimit}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`font-bold ${log.totalFieldsCollected >= 3 ? 'text-green-400' : log.totalFieldsCollected >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                            {log.totalFieldsCollected}
                          </span>
                          <span className="text-muted-foreground">/12</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`flex items-center gap-1 ${tempInfo.color}`}>
                            <tempInfo.icon className="w-3 h-3" />
                            {tempInfo.label}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`flex items-center gap-1 ${reasonInfo.color}`}>
                            <reasonInfo.icon className="w-3 h-3" />
                            {reasonInfo.label}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <button onClick={() => reenableAi.mutate({ leadId: log.leadId })}
                              title="Reativar IA para este lead"
                              className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors">
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => resetCount.mutate({ leadId: log.leadId })}
                              title="Resetar contador de mensagens"
                              className="p-1 rounded hover:bg-blue-500/20 text-blue-400 transition-colors">
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsData.total > 15 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Mostrando {((logPage - 1) * 15) + 1}-{Math.min(logPage * 15, logsData.total)} de {logsData.total}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage <= 1}
                    className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="px-3 py-1 text-xs text-foreground">{logPage}</span>
                  <button onClick={() => setLogPage(p => p + 1)} disabled={logPage * 15 >= logsData.total}
                    className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma conversa registrada ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Os logs aparecem automaticamente quando a IA atende leads</p>
          </div>
        )}
      </div>
    </div>
  );
}
