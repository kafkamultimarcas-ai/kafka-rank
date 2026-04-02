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
  Shuffle, ArrowRightLeft, Timer, Headphones, Target
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

type AdminView = "dashboard" | "leads" | "chat" | "performance" | "pipeline" | "inventory" | "campaigns" | "marketing" | "settings" | "financial" | "sdr";

export default function CrmAdminDashboard() {
  const [, navigate] = useLocation();
  const { admin, isLoading, isAuthenticated, logout } = useAdminAuth();
  const [activeView, setActiveView] = useState<AdminView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/crm/admin/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

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
    { key: "chat" as const, icon: MessageCircle, label: "Conversas" },
    { key: "performance" as const, icon: TrendingUp, label: "Resultados" },
    { key: "dashboard" as const, icon: LayoutDashboard, label: "Visão Geral" },
    { key: "leads" as const, icon: Users, label: "Todos os Clientes" },
    { key: "pipeline" as const, icon: SlidersHorizontal, label: "Etapas de Venda" },
    { key: "inventory" as const, icon: Car, label: "Estoque" },
    { key: "financial" as const, icon: Wallet, label: "Financeiro" },
    { key: "campaigns" as const, icon: Megaphone, label: "Campanhas" },
    { key: "marketing" as const, icon: BarChart3, label: "Marketing" },
    { key: "sdr" as const, icon: Headphones, label: "Painel SDR" },
    { key: "settings" as const, icon: Settings, label: "Ajustes" },
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
                <span className="text-sm font-bold text-foreground">CRM Gerente</span>
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
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${filterSource === src ? `${cfg.bg} ${cfg.color} border-current` : "bg-accent/50 border-border text-muted-foreground"}`}>
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
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sourceCfg.bg} ${sourceCfg.color}`}>{sourceCfg.label}</span>
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sourceCfg.bg} ${sourceCfg.color}`}>{sourceCfg.label}</span>
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
  const [message, setMessage] = useState("");
  const [filterScore, setFilterScore] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"compose" | "import" | "history">("compose");

  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });
  const { data: zapiStatus } = trpc.whatsapp.status.useQuery();
  const { data: bulkHistory, refetch: refetchHistory } = trpc.whatsapp.bulkHistory.useQuery();

  const importContacts = trpc.whatsapp.importContacts.useMutation({
    onSuccess: (r: any) => { toast.success(r.message); },
    onError: (e: any) => toast.error(e.message),
  });
  const importChats = trpc.whatsapp.importChats.useMutation({
    onSuccess: (r: any) => { toast.success(r.message); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendBulk = trpc.whatsapp.sendBulk.useMutation({
    onSuccess: (r: any) => {
      setSendResult({ sent: r.sent, failed: r.failed });
      setIsSending(false);
      refetchHistory();
      toast.success(`Disparo concluído: ${r.sent} enviados, ${r.failed} falharam`);
    },
    onError: (e: any) => { setIsSending(false); toast.error(e.message); },
  });

  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter(l => {
      if (!l.phone) return false;
      if (filterScore !== "all" && l.score !== filterScore) return false;
      if (filterSource !== "all" && l.source !== filterSource) return false;
      if (filterDept !== "all" && l.department !== filterDept) return false;
      return true;
    });
  }, [allLeads, filterScore, filterSource, filterDept]);

  const uniqueSources = useMemo(() => {
    if (!allLeads) return [];
    return Array.from(new Set(allLeads.map(l => l.source).filter(Boolean)));
  }, [allLeads]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(filteredLeads.map(l => l.phone!).filter(Boolean)));
    }
    setSelectAll(!selectAll);
  };

  const togglePhone = (phone: string) => {
    const next = new Set(selectedPhones);
    if (next.has(phone)) next.delete(phone); else next.add(phone);
    setSelectedPhones(next);
  };

  const handleSend = () => {
    if (!message.trim()) return toast.error("Digite a mensagem");
    if (selectedPhones.size === 0) return toast.error("Selecione pelo menos 1 destinatário");
    if (selectedPhones.size > 500) return toast.error("Máximo 500 por disparo");
    setIsSending(true);
    setSendResult(null);
    sendBulk.mutate({ phones: Array.from(selectedPhones), message: message.trim() });
  };

  // Templates de mensagem para feirão
  const templates = [
    { name: "Feirão Geral", text: "🔥 *FEIRÃO KAFKA MULTIMARCAS* 🔥\n\nOportunidades imperdíveis em veículos seminovos!\n\n✅ Entrada facilitada\n✅ Financiamento na hora\n✅ Troca com troco\n\nVenha conferir! Estamos te esperando.\n📍 Kafka Multimarcas" },
    { name: "Retorno Lead", text: "Olá! Tudo bem? 😊\n\nVi que você demonstrou interesse em um de nossos veículos.\n\nTemos condições especiais essa semana! Posso te ajudar a encontrar o carro ideal?\n\n🚗 Kafka Multimarcas" },
    { name: "Promoção Especial", text: "🎉 *PROMOÇÃO ESPECIAL* 🎉\n\nSomente esta semana:\n\n💰 Desconto especial à vista\n📋 Aprovação de crédito em 30 min\n🔄 Aceitamos seu usado como entrada\n\nAgende sua visita!\n📞 Kafka Multimarcas" },
  ];

  return (
    <div className="space-y-4">
      {/* Z-API Status */}
      <div className={`rounded-xl border p-3 flex items-center justify-between ${
        zapiStatus?.connected ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${zapiStatus?.connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs font-medium text-foreground">
            WhatsApp {zapiStatus?.connected ? "Conectado" : "Desconectado"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {allLeads?.filter(l => l.phone).length || 0} leads com telefone
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-accent/50 rounded-lg p-1">
        {(["compose", "import", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}>
            {tab === "compose" ? "Disparo" : tab === "import" ? "Importar Leads" : "Histórico"}
          </button>
        ))}
      </div>

      {activeTab === "compose" && (
        <div className="space-y-4">
          {/* Templates */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold text-foreground mb-3">Templates Rápidos</h4>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map(t => (
                <button key={t.name} onClick={() => setMessage(t.text)}
                  className="shrink-0 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-all">
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Message Editor */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold text-foreground mb-2">Mensagem</h4>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui... Use *texto* para negrito"
              className="w-full h-32 bg-accent/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{message.length} caracteres</p>
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold text-foreground mb-3">Filtrar Destinatários</h4>
            <div className="grid grid-cols-3 gap-2">
              <select value={filterScore} onChange={e => setFilterScore(e.target.value)}
                className="bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                <option value="all">Todos Scores</option>
                <option value="hot">🔥 Quente</option>
                <option value="warm">🌡️ Morno</option>
                <option value="cold">❄️ Frio</option>
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                className="bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                <option value="all">Todas Origens</option>
                {uniqueSources.map(s => <option key={s} value={s!}>{s}</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                <option value="all">Todos Setores</option>
                <option value="vendas">Vendas</option>
                <option value="pre_vendas">Pré-Vendas</option>
              </select>
            </div>
          </div>

          {/* Recipients */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-foreground">
                Destinatários ({filteredLeads.length})
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-primary font-medium">{selectedPhones.size} selecionados</span>
                <button onClick={handleSelectAll}
                  className="text-[10px] text-primary underline">
                  {selectAll ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredLeads.slice(0, 200).map(l => (
                <label key={l.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <input type="checkbox" checked={selectedPhones.has(l.phone!)} onChange={() => togglePhone(l.phone!)}
                    className="rounded border-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{l.name}</p>
                    <p className="text-[10px] text-muted-foreground">{l.phone}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    l.score === "hot" ? "bg-red-500/20 text-red-400" :
                    l.score === "warm" ? "bg-amber-500/20 text-amber-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>{l.score === "hot" ? "Quente" : l.score === "warm" ? "Morno" : "Frio"}</span>
                </label>
              ))}
              {filteredLeads.length > 200 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  Mostrando 200 de {filteredLeads.length}. Todos serão incluídos no disparo.
                </p>
              )}
              {filteredLeads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead com telefone encontrado</p>
              )}
            </div>
          </div>

          {/* Send Result */}
          {sendResult && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h4 className="text-sm font-bold text-foreground">Disparo Concluído</h4>
              </div>
              <div className="flex gap-4">
                <div><p className="text-lg font-bold text-green-400">{sendResult.sent}</p><p className="text-[10px] text-muted-foreground">Enviados</p></div>
                <div><p className="text-lg font-bold text-red-400">{sendResult.failed}</p><p className="text-[10px] text-muted-foreground">Falharam</p></div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim() || selectedPhones.size === 0 || !zapiStatus?.connected}
            className="w-full h-12 text-sm font-bold gap-2"
          >
            {isSending ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando... (pode levar alguns minutos)</>
            ) : (
              <><Megaphone className="w-4 h-4" /> Disparar para {selectedPhones.size} contatos</>
            )}
          </Button>
          {!zapiStatus?.connected && (
            <p className="text-[10px] text-red-400 text-center">WhatsApp desconectado. Conecte o Z-API para disparar.</p>
          )}
        </div>
      )}

      {activeTab === "import" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-bold text-foreground mb-2">Importar do WhatsApp Business</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Importe contatos e conversas recentes do seu WhatsApp Business para o banco de leads do CRM.
              Leads já existentes (mesmo telefone) não serão duplicados.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => importContacts.mutate()}
                disabled={importContacts.isPending || !zapiStatus?.connected}
                className="h-20 flex-col gap-2"
              >
                {importContacts.isPending ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Users className="w-6 h-6 text-primary" />
                )}
                <span className="text-xs">Importar Contatos</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => importChats.mutate()}
                disabled={importChats.isPending || !zapiStatus?.connected}
                className="h-20 flex-col gap-2"
              >
                {importChats.isPending ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <MessageCircle className="w-6 h-6 text-green-400" />
                )}
                <span className="text-xs">Importar Chats</span>
              </Button>
            </div>
            {!zapiStatus?.connected && (
              <p className="text-[10px] text-red-400 text-center mt-3">WhatsApp desconectado. Conecte o Z-API primeiro.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground">Histórico de Disparos</h4>
          {bulkHistory && bulkHistory.length > 0 ? bulkHistory.map((h: any) => (
            <div key={h.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">
                  {h.createdAt ? new Date(h.createdAt).toLocaleString("pt-BR") : ""}
                </span>
                <div className="flex gap-2">
                  <span className="text-[10px] text-green-400">{h.sent} enviados</span>
                  {h.failed > 0 && <span className="text-[10px] text-red-400">{h.failed} falharam</span>}
                </div>
              </div>
              <p className="text-xs text-foreground line-clamp-2">{h.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{h.totalRecipients} destinatários</p>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum disparo realizado ainda</p>
          )}
        </div>
      )}
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

  const { data: zapiStatus } = trpc.whatsapp.status.useQuery();
  const enableSentByMe = trpc.whatsapp.enableSentByMe.useMutation({
    onSuccess: () => toast.success("Captura de mensagens enviadas ativada!"),
    onError: (e: any) => toast.error(e.message),
  });
  const configureWebhook = trpc.whatsapp.configureWebhook.useMutation({
    onSuccess: () => toast.success("Webhook configurado com sucesso!"),
    onError: (e: any) => toast.error(e.message),
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

      {/* AI Mode Configuration */}
      <AiModeConfig />

      {/* Advanced AI Configuration */}
      <AdvancedAiConfig />

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

function AiModeConfig() {
  const { data: config, refetch } = trpc.crmAi.getGlobalAiConfig.useQuery();
  const setConfig = trpc.crmAi.setGlobalAiConfig.useMutation({
    onSuccess: () => { toast.success("Configuração de IA salva!"); refetch(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const [mode, setMode] = useState<'normal' | 'feirao'>('normal');
  const [feiraoForm, setFeiraoForm] = useState({
    beneficios: '', promocoes: '', objetivo: '', instrucoes: '',
  });
  const [normalForm, setNormalForm] = useState({ instrucoes: '' });
  const [initialized, setInitialized] = useState(false);

  // Load config when data arrives
  if (config && !initialized) {
    setMode(config.aiMode as 'normal' | 'feirao');
    if (config.feiraoConfig) {
      setFeiraoForm({
        beneficios: config.feiraoConfig.beneficios || '',
        promocoes: config.feiraoConfig.promocoes || '',
        objetivo: config.feiraoConfig.objetivo || '',
        instrucoes: config.feiraoConfig.instrucoes || '',
      });
    }
    if (config.normalConfig) {
      setNormalForm({ instrucoes: config.normalConfig.instrucoes || '' });
    }
    setInitialized(true);
  }

  const handleSave = () => {
    setConfig.mutate({
      aiMode: mode,
      feiraoConfig: mode === 'feirao' ? feiraoForm : undefined,
      normalConfig: mode === 'normal' ? normalForm : undefined,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Modo da IA</h3>
          <p className="text-[10px] text-muted-foreground">Configure como a IA responde automaticamente</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('normal')}
          className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${
            mode === 'normal'
              ? 'border-primary bg-primary/10'
              : 'border-border bg-accent/30 hover:bg-accent/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className={`w-4 h-4 ${mode === 'normal' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-bold ${mode === 'normal' ? 'text-primary' : 'text-foreground'}`}>Normal</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Respostas padrão de vendas, foco em agendamento e conversão</p>
        </button>
        <button
          onClick={() => setMode('feirao')}
          className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${
            mode === 'feirao'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-border bg-accent/30 hover:bg-accent/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className={`w-4 h-4 ${mode === 'feirao' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-bold ${mode === 'feirao' ? 'text-amber-500' : 'text-foreground'}`}>Feirão</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Modo evento especial com promoções e urgência</p>
        </button>
      </div>

      {/* Mode-specific config */}
      {mode === 'normal' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Instruções extras para a IA (opcional)</label>
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

      {mode === 'feirao' && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-400 font-medium">🔥 Modo Feirão: A IA vai focar em promover o evento, mencionar benefícios e criar urgência para agendar visitas!</p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Benefícios do Feirão *</label>
            <textarea
              value={feiraoForm.beneficios}
              onChange={e => setFeiraoForm({ ...feiraoForm, beneficios: e.target.value })}
              placeholder="Ex: Entrada facilitada, taxa 0% no primeiro ano, bônus de R$2.000 na troca"
              className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Promoções Específicas</label>
            <textarea
              value={feiraoForm.promocoes}
              onChange={e => setFeiraoForm({ ...feiraoForm, promocoes: e.target.value })}
              placeholder="Ex: HB20 a partir de R$49.900, Onix com IPVA grátis, SUVs com 15% de desconto"
              className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Objetivo Principal</label>
            <textarea
              value={feiraoForm.objetivo}
              onChange={e => setFeiraoForm({ ...feiraoForm, objetivo: e.target.value })}
              placeholder="Ex: Agendar o máximo de visitas para sábado dia 15/03"
              className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Instruções Adicionais</label>
            <textarea
              value={feiraoForm.instrucoes}
              onChange={e => setFeiraoForm({ ...feiraoForm, instrucoes: e.target.value })}
              placeholder="Ex: Mencionar que as condições são válidas apenas durante o feirão. Criar senso de urgência."
              className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              rows={2}
            />
          </div>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={setConfig.isPending}
        className="w-full mt-4 racing-gradient text-white font-bold"
      >
        {setConfig.isPending ? "Salvando..." : `Salvar Modo ${mode === 'feirao' ? 'Feirão' : 'Normal'}`}
      </Button>

      {/* Current status */}
      {config && (
        <div className="mt-3 p-2 rounded-lg bg-accent/30 border border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            Modo atual: <span className={`font-bold ${config.aiMode === 'feirao' ? 'text-amber-400' : 'text-primary'}`}>
              {config.aiMode === 'feirao' ? '🔥 Feirão' : '💬 Normal'}
            </span>
          </p>
        </div>
      )}
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

// ===== ADVANCED AI CONFIGURATION =====
function AdvancedAiConfig() {
  const { data: config, refetch } = trpc.crmAi.getGlobalAiConfig.useQuery();
  const { data: stats, refetch: refetchStats } = trpc.crmAi.getInactiveDispatchStats.useQuery();
  const setAdvanced = trpc.crmAi.setAdvancedAiConfig.useMutation({
    onSuccess: () => { toast.success("Configuração avançada salva!"); refetch(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const triggerDispatch = trpc.crmAi.triggerInactiveDispatch.useMutation({
    onSuccess: (data) => { toast.success(`Disparo concluído: ${data.sent} enviados, ${data.skipped} ignorados`); refetchStats(); },
    onError: (e: any) => toast.error("Erro no disparo: " + e.message),
  });

  const [autoReply, setAutoReply] = useState(false);
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
  const [initialized, setInitialized] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (config && !initialized) {
    setAutoReply(config.autoReplyEnabled);
    setWorkingHoursEnabled(config.workingHoursEnabled);
    setWorkingHoursStart(config.workingHoursStart);
    setWorkingHoursEnd(config.workingHoursEnd);
    setMaxMsgEnabled(config.maxMessagesEnabled);
    setMaxMsgPerLead(config.maxMessagesPerLead);
    setPersonality(config.personality);
    setInactiveEnabled(config.inactiveDispatchEnabled);
    setInactiveHours(config.inactiveDispatchHours);
    setInactiveMsg(config.inactiveDispatchMessage);
    setInactiveMaxPerDay(config.inactiveDispatchMaxPerDay);
    setInitialized(true);
  }

  const handleSave = () => {
    setAdvanced.mutate({
      autoReplyEnabled: autoReply,
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

  const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
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

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Controle da IA</h3>
          <p className="text-[10px] text-muted-foreground">Ative/desative e configure o comportamento</p>
        </div>
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-primary underline">
          {showAdvanced ? 'Menos' : 'Avançado'}
        </button>
      </div>

      {/* Main toggle - always visible */}
      <div className="space-y-2">
        <Toggle
          checked={autoReply}
          onChange={setAutoReply}
          label="IA Responder Sozinha"
          desc="Quando LIGADO, a IA responde automaticamente os leads que tiverem IA ativada individualmente"
        />

        {/* Status indicator */}
        <div className={`p-2 rounded-lg border text-center text-xs font-bold ${autoReply ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {autoReply ? <><Power className="w-3 h-3 inline mr-1" /> IA ATIVA - respondendo leads automaticamente</> : <><Power className="w-3 h-3 inline mr-1" /> IA DESATIVADA - nenhuma resposta automática</>}
        </div>
      </div>

      {showAdvanced && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {/* Personality */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Personalidade da IA</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'amigavel', label: 'Amigável', icon: '😊', desc: 'Informal e simpática' },
                { key: 'profissional', label: 'Profissional', icon: '👔', desc: 'Educada e direta' },
                { key: 'agressivo', label: 'Agressivo', icon: '🔥', desc: 'Persuasiva e urgente' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setPersonality(p.key)}
                  className={`p-2 rounded-lg border-2 text-center transition-all ${
                    personality === p.key
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-accent/30 hover:bg-accent/50'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <p className={`text-[11px] font-bold mt-1 ${personality === p.key ? 'text-primary' : 'text-foreground'}`}>{p.label}</p>
                  <p className="text-[9px] text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Working Hours */}
          <Toggle
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

          {/* Message Limit */}
          <Toggle
            checked={maxMsgEnabled}
            onChange={setMaxMsgEnabled}
            label="Limite de Mensagens por Lead"
            desc="Limita quantas mensagens a IA pode enviar para cada lead"
          />
          {maxMsgEnabled && (
            <div className="flex items-center gap-2 px-3">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Máximo:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMsgPerLead}
                onChange={e => setMaxMsgPerLead(Number(e.target.value))}
                className="w-16 bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground text-center"
              />
              <span className="text-xs text-muted-foreground">mensagens</span>
            </div>
          )}

          {/* Inactive Dispatch */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-foreground">Disparo para Inativos</h4>
            </div>
            <Toggle
              checked={inactiveEnabled}
              onChange={setInactiveEnabled}
              label="Reativar Clientes Inativos"
              desc="Envia mensagem para leads que não responderam há X horas"
            />
            {inactiveEnabled && (
              <div className="mt-2 space-y-2 px-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Após</span>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={inactiveHours}
                    onChange={e => setInactiveHours(Number(e.target.value))}
                    className="w-14 bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground text-center"
                  />
                  <span className="text-xs text-muted-foreground">horas sem resposta</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Máx.</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={inactiveMaxPerDay}
                    onChange={e => setInactiveMaxPerDay(Number(e.target.value))}
                    className="w-14 bg-accent/30 border border-border rounded px-2 py-1 text-sm text-foreground text-center"
                  />
                  <span className="text-xs text-muted-foreground">disparo(s) por dia/lead</span>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Mensagem personalizada (opcional - se vazio, IA gera automaticamente)</label>
                  <textarea
                    value={inactiveMsg}
                    onChange={e => setInactiveMsg(e.target.value)}
                    placeholder="Oi {nome}! Ainda tem interesse no {veiculo}? Posso te ajudar com algo?"
                    className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    rows={2}
                  />
                  <p className="text-[9px] text-muted-foreground mt-1">Use {'{nome}'}, {'{veiculo}'}, {'{nome_completo}'} como variáveis</p>
                </div>
                {stats && (
                  <div className="p-2 rounded-lg bg-accent/30 border border-border">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Enviados hoje: <strong className="text-foreground">{stats.todayCount}</strong></span>
                      <span>Total: <strong className="text-foreground">{stats.totalCount}</strong></span>
                    </div>
                    {stats.lastRun && (
                      <p className="text-[9px] text-muted-foreground mt-1">Último disparo: {new Date(stats.lastRun).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-1"
                  onClick={() => triggerDispatch.mutate()}
                  disabled={triggerDispatch.isPending}
                >
                  <Send className="w-3 h-3" />
                  {triggerDispatch.isPending ? 'Disparando...' : 'Disparar Agora (Manual)'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={setAdvanced.isPending}
        className="w-full mt-4 racing-gradient text-white font-bold"
      >
        {setAdvanced.isPending ? 'Salvando...' : 'Salvar Configurações da IA'}
      </Button>
    </div>
  );
}

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
  const [sdrForm, setSdrForm] = useState({ name: "", nickname: "", phone: "", email: "" });
  const [selectedSDR, setSelectedSDR] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [assignTarget, setAssignTarget] = useState("");
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);
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

      {/* Leads per Seller Distribution */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Leads por Vendedor
        </h3>
        {vendorSellers.length > 0 ? (
          <div className="space-y-2">
            {vendorSellers.map((s: any) => {
              const count = sellerLeadCounts[s.id] || 0;
              const maxCount = Math.max(...Object.values(sellerLeadCounts), 1);
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">{(s.nickname || s.name || "?").charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-xs text-foreground w-28 truncate font-medium">{s.nickname || s.name}</span>
                  <div className="flex-1 h-6 bg-accent/30 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-primary/60 to-primary/30 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max((count / maxCount) * 100, 2)}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{count} leads</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum vendedor ativo</p>
        )}
      </div>

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
                      {lead.source && <span>• {lead.source}</span>}
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

      {/* Alert Configuration Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" /> Regras de Alerta Automático
        </h3>
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
              <span className="text-xs font-bold text-orange-400">8 minutos</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Vendedor recebe aviso: "Lead será transferido em 2 minutos se não responder!"</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400">10 minutos</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Lead é transferido automaticamente para outro vendedor. Vendedor anterior é notificado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
