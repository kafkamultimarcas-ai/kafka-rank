import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAdminAuth } from "./CrmAdminLogin";
import {
  LayoutDashboard, Users, SlidersHorizontal, Car, Megaphone, Settings,
  LogOut, Search, Flame, Thermometer, Snowflake, TrendingUp, UserPlus,
  BarChart3, MessageCircle, Phone, Calendar, Eye, ChevronRight,
  Package, DollarSign, Shield, Menu, X, Bell
} from "lucide-react";

const DEPT_LABELS: Record<string, string> = {
  vendas: "Vendas", pre_vendas: "Pre-Vendas/SDR", consignacao: "Consignacao",
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

type AdminView = "dashboard" | "leads" | "pipeline" | "inventory" | "campaigns" | "marketing" | "settings";

export default function CrmAdminDashboard() {
  const [, navigate] = useLocation();
  const { admin, isLoading, isAuthenticated, logout } = useAdminAuth();
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // Redirect to login if not authenticated
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
    { key: "campaigns" as const, icon: Megaphone, label: "Campanhas" },
    { key: "marketing" as const, icon: BarChart3, label: "Marketing" },
    { key: "settings" as const, icon: Settings, label: "Configuracoes" },
  ];

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
            <button key={item.key} onClick={() => setActiveView(item.key)}
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
                <button key={item.key} onClick={() => { setActiveView(item.key); setSidebarOpen(false); }}
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
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-accent rounded-lg">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-base font-bold text-foreground">
                {menuItems.find(m => m.key === activeView)?.label || "Painel"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar lead..." className="pl-9 h-9 w-48 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {activeView === "dashboard" && <DashboardView selectedDept={selectedDept} onSelectDept={setSelectedDept} />}
          {activeView === "leads" && <AllLeadsView searchQuery={searchQuery} />}
          {activeView === "inventory" && <InventoryView />}
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
function DashboardView({ selectedDept, onSelectDept }: { selectedDept: string | null; onSelectDept: (d: string | null) => void }) {
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
        <KpiCard icon={Users} label="Total Leads" value={stats.total} color="text-primary" />
        <KpiCard icon={Flame} label="Quentes" value={stats.hot} color="text-red-400" />
        <KpiCard icon={Thermometer} label="Mornos" value={stats.warm} color="text-amber-400" />
        <KpiCard icon={UserPlus} label="Hoje" value={stats.today} color="text-green-400" />
      </div>

      {/* Department cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(DEPT_LABELS).map(([key, label]) => {
          const Icon = DEPT_ICONS[key] || Users;
          const colors = DEPT_COLORS[key] || "";
          const count = stats.byDept[key] || 0;
          return (
            <button key={key} onClick={() => onSelectDept(selectedDept === key ? null : key)}
              className={`p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.02] active:scale-[0.98] text-left ${colors} ${selectedDept === key ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-foreground/70" />
                <span className="text-2xl font-bold text-foreground">{count}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">leads ativos</p>
            </button>
          );
        })}
      </div>

      {/* Inventory summary */}
      {inventory && inventory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" /> Estoque ({inventory.length} veiculos)
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

// ===== ALL LEADS VIEW =====
function AllLeadsView({ searchQuery }: { searchQuery: string }) {
  const [, navigate] = useLocation();
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Nome</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Telefone</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Setor</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Etapa</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Score</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Veiculo</th>
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
                  <td className="py-2 px-2 text-muted-foreground hidden sm:table-cell">{lead.phone || "--"}</td>
                  <td className="py-2 px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent border border-border">{DEPT_LABELS[lead.department] || lead.department}</span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground hidden md:table-cell">{lead.stage}</td>
                  <td className="py-2 px-2"><ScoreIcon className={`w-4 h-4 ${scoreColor}`} /></td>
                  <td className="py-2 px-2 text-muted-foreground hidden lg:table-cell truncate max-w-[150px]">{lead.vehicleInterest || "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== INVENTORY VIEW =====
function InventoryView() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: inventory, refetch } = trpc.crmInventory.list.useQuery({});

  const addVehicle = trpc.crmInventory.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); toast.success("Veiculo adicionado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({ brand: "", model: "", year: "", color: "", price: "", plate: "" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{inventory?.length || 0} veiculos</span>
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
            <Input placeholder="Preco" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="h-9 text-sm" type="number" />
            <Input placeholder="Placa" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} className="h-9 text-sm" />
          </div>
          <Button size="sm" onClick={() => {
            if (!form.brand || !form.model || !form.year) { toast.error("Marca, modelo e ano obrigatorios"); return; }
            addVehicle.mutate({ brand: form.brand, model: form.model, year: form.year || undefined, color: form.color || undefined, price: form.price ? parseFloat(form.price) : 0, plate: form.plate || undefined });
          }} disabled={addVehicle.isPending} className="w-full racing-gradient text-white">
            {addVehicle.isPending ? "Salvando..." : "Salvar Veiculo"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {inventory?.map(v => (
          <div key={v.id} className="p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-foreground">{v.brand} {v.model}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${v.status === "available" ? "bg-green-500/20 text-green-400" : v.status === "reserved" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                {v.status}
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
        Modulo de campanhas para feirao e disparos em massa via WhatsApp.
        Configure a integracao com WhatsApp Business API para ativar.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={() => toast.info("Configure a API do WhatsApp nas configuracoes para ativar campanhas")}>
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
      </div>
    </div>
  );
}

// ===== SETTINGS VIEW =====
function SettingsView() {
  const { data: admins, refetch } = trpc.adminAuth.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "admin" });

  const createAdmin = trpc.adminAuth.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); setForm({ name: "", username: "", password: "", role: "admin" }); toast.success("Admin criado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Administradores do CRM</h3>
        <div className="space-y-2">
          {admins?.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div>
                <p className="text-sm text-foreground font-medium">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">@{a.username} - {a.role}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${a.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {a.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Novo Admin
        </Button>
        {showAdd && (
          <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-border space-y-2">
            <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Usuario" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Senha" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-9 text-sm" />
            <Button size="sm" onClick={() => {
              if (!form.name || !form.username || !form.password) { toast.error("Preencha todos os campos"); return; }
              createAdmin.mutate({ name: form.name, username: form.username, password: form.password, role: form.role as any });
            }} disabled={createAdmin.isPending} className="w-full racing-gradient text-white">
              {createAdmin.isPending ? "Criando..." : "Criar Admin"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Integracoes</h3>
        <div className="space-y-2">
          <IntegrationItem name="WhatsApp Business API" status="pendente" description="Configure para disparos em massa e recepcao automatica de leads" />
          <IntegrationItem name="SIG Web" status="pendente" description="Integre com seu sistema de gestao para sincronizar vendas" />
          <IntegrationItem name="OLX / Webmotors" status="pendente" description="Receba leads automaticamente das plataformas de anuncio" />
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
                  <div key={l.id} className="p-2 rounded-lg bg-accent/50 border border-border">
                    <p className="text-xs font-medium text-foreground truncate">{l.name}</p>
                    {l.vehicleInterest && <p className="text-[10px] text-muted-foreground truncate">{l.vehicleInterest}</p>}
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
