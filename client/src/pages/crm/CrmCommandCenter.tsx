import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Search, Phone, MessageCircle, Calendar, ChevronRight, Flame, Thermometer,
  Snowflake, Plus, ArrowLeft, Clock, AlertTriangle, User, Car,
  Mic, MicOff, LayoutGrid, List, Eye, TrendingUp, Target,
  Zap, Bell, Timer, CheckCircle, ArrowUpRight, BarChart3,
  MessageSquare, Send, X, ChevronDown, FileText, UserPlus, ArrowRightLeft
} from "lucide-react";

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  manual: { label: "Manual", color: "text-gray-400", bg: "bg-gray-500/20" },
  whatsapp: { label: "WhatsApp", color: "text-green-400", bg: "bg-green-500/20" },
  olx: { label: "OLX", color: "text-orange-400", bg: "bg-orange-500/20" },
  webmotors: { label: "Webmotors", color: "text-blue-400", bg: "bg-blue-500/20" },
  socarrao: { label: "SóCarrão", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  facebook: { label: "Facebook", color: "text-blue-500", bg: "bg-blue-600/20" },
  instagram: { label: "Instagram", color: "text-pink-400", bg: "bg-pink-500/20" },
  instagram_ads: { label: "Insta Ads", color: "text-pink-400", bg: "bg-pink-500/20" },
  facebook_ads: { label: "FB Ads", color: "text-blue-500", bg: "bg-blue-600/20" },
  google_ads: { label: "Google Ads", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  trafego_pago: { label: "Tráfego Pago", color: "text-purple-400", bg: "bg-purple-500/20" },
  indicacao: { label: "Indicação", color: "text-cyan-400", bg: "bg-cyan-500/20" },
  loja: { label: "Loja", color: "text-amber-400", bg: "bg-amber-500/20" },
  landing_page: { label: "Landing Page", color: "text-indigo-400", bg: "bg-indigo-500/20" },
  icarros: { label: "iCarros", color: "text-red-400", bg: "bg-red-500/20" },
  manychat: { label: "ManyChat", color: "text-blue-300", bg: "bg-blue-400/20" },
  webhook: { label: "API", color: "text-violet-400", bg: "bg-violet-500/20" },
};

const SCORE_CONFIG = {
  hot: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "bg-red-500/20 text-red-400 border-red-500/30", glow: "shadow-red-500/20" },
  warm: { label: "Morno", icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", glow: "shadow-amber-500/20" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", glow: "shadow-blue-500/20" },
};

function timeAgo(ts: number | null | undefined) {
  if (!ts) return "Sem contato";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days}d`;
}

function minutesSinceCreation(createdAt: any): number {
  if (!createdAt) return 999;
  const ts = typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime();
  return Math.floor((Date.now() - ts) / (1000 * 60));
}

type TabView = "dashboard" | "leads" | "pipeline" | "templates";
type AssignmentFilter = "all" | "unassigned" | "assigned";

export default function CrmCommandCenter() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [filterScore, setFilterScore] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>("leads");
  const [showTemplates, setShowTemplates] = useState<number | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const sellerId = sellerSession?.id || 0;
  const dept = sellerSession?.department || "vendas";
  const isSDR = dept === "pre_vendas";

  // SDRs see ALL leads via listForSDR, sellers see their own
  const { data: sellerLeads, refetch: refetchSellerLeads } = trpc.crmLeads.listBySeller.useQuery(
    { sellerId, archived: false }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: sdrLeads, refetch: refetchSDR } = trpc.crmLeads.listForSDR.useQuery(
    { archived: false }, { enabled: isSDR }
  );
  const leads = isSDR ? sdrLeads : sellerLeads;
  const refetchLeads = isSDR ? refetchSDR : refetchSellerLeads;

  // Sellers list for SDR assign dropdown
  const { data: allSellers } = trpc.sellers.list.useQuery({ activeOnly: true }, { enabled: isSDR });
  const vendorSellers = useMemo(() => {
    if (!allSellers) return [];
    return allSellers.filter((s: any) => s.department === "vendas" && s.active);
  }, [allSellers]);
  const sellerMap = useMemo(() => {
    if (!allSellers) return {} as Record<number, string>;
    return allSellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [allSellers]);

  const { data: followUps } = trpc.crmLeads.getFollowUps.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: dept });
  const { data: searchResults } = trpc.crmLeads.search.useQuery(
    { query: searchQuery, sellerId: isSDR ? undefined : sellerId }, { enabled: searchQuery.length >= 2 }
  );
  const { data: stats } = trpc.crmLeads.getStats.useQuery(
    { sellerId: isSDR ? undefined : sellerId }, { enabled: sellerId > 0 }
  );
  const { data: inventoryAlerts } = trpc.crmInventory.getAlerts.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: templates } = trpc.crmTemplates.list.useQuery({ department: dept });
  const { data: sellerDashboard } = trpc.crmSellerStats.getDashboard.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: overdueTasks } = trpc.crmFollowUp.listOverdue.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );

  // Assign lead mutation for SDR
  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => { refetchLeads(); toast.success("Lead atribuído com sucesso!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Leads with urgency alerts + assignment filter
  const { urgentLeads, warningLeads, normalLeads, filteredLeads, assignmentStats } = useMemo(() => {
    const displayLeads = searchQuery.length >= 2 ? searchResults : leads;
    if (!displayLeads) return { urgentLeads: [], warningLeads: [], normalLeads: [], filteredLeads: [], assignmentStats: { total: 0, unassigned: 0, assigned: 0 } };

    // Assignment stats
    const total = displayLeads.length;
    const unassigned = displayLeads.filter((l: any) => l.sellerId === 0).length;
    const assigned = total - unassigned;

    // Apply assignment filter for SDR
    let filtered = displayLeads;
    if (isSDR && assignmentFilter !== "all") {
      filtered = assignmentFilter === "unassigned"
        ? displayLeads.filter((l: any) => l.sellerId === 0)
        : displayLeads.filter((l: any) => l.sellerId > 0);
    }

    const urgent: any[] = [];
    const warning: any[] = [];
    const normal: any[] = [];

    filtered.forEach((lead: any) => {
      const mins = minutesSinceCreation(lead.createdAt);
      const lastContact = lead.lastContactDate ? Math.floor((Date.now() - lead.lastContactDate) / (1000 * 60)) : 999;
      if (lastContact === 999 && mins >= 20) {
        urgent.push({ ...lead, _alertType: "transfer" });
      } else if (lastContact === 999 && mins >= 5) {
        warning.push({ ...lead, _alertType: "priority" });
      } else {
        normal.push(lead);
      }
    });

    let all = [...urgent, ...warning, ...normal];
    if (filterScore) all = all.filter(l => l.score === filterScore);
    if (filterSource) all = all.filter(l => l.source === filterSource);

    return { urgentLeads: urgent, warningLeads: warning, normalLeads: normal, filteredLeads: all, assignmentStats: { total, unassigned, assigned } };
  }, [leads, searchResults, searchQuery, filterScore, filterSource, isSDR, assignmentFilter]);

  const moveStage = trpc.crmLeads.moveStage.useMutation({
    onSuccess: () => { refetchLeads(); toast.success("Etapa atualizada!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const addActivity = trpc.crmLeads.addActivity.useMutation({
    onSuccess: () => { refetchLeads(); },
  });
  const renderTemplateQuery = trpc.useUtils();

  const handleWhatsApp = useCallback((lead: any, customMsg?: string) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    const msg = customMsg || `Olá ${lead.name}! Tudo bem? Aqui é da Kafka Multimarcas.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "whatsapp", description: "WhatsApp enviado" });
  }, [sellerId, addActivity]);

  const handleCall = useCallback((lead: any) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`tel:+55${phone}`, "_self");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "ligacao", description: "Ligação realizada" });
  }, [sellerId, addActivity]);

  const handleTemplateSelect = async (lead: any, templateId: number) => {
    try {
      const result = await renderTemplateQuery.crmTemplates.render.fetch({ templateId, leadId: lead.id, sellerId });
      handleWhatsApp(lead, result.text);
      setShowTemplates(null);
    } catch {
      toast.error("Erro ao carregar template");
    }
  };

  const handleAssign = useCallback((leadId: number, newSellerId: number) => {
    assignLead.mutate({ leadId, newSellerId, currentSellerId: sellerId });
  }, [assignLead, sellerId]);

  if (!sellerSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Faça login para acessar o CRM</p>
          <Button onClick={() => navigate("/login-vendedor")} className="racing-gradient text-white">Fazer Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header fixo mobile */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="p-1.5 hover:bg-accent rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">{isSDR ? 'Pré-Vendas / SDR' : 'Meu CRM'}</h1>
              <p className="text-[10px] text-muted-foreground">{sellerSession.nickname || sellerSession.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(urgentLeads.length > 0 || warningLeads.length > 0) && (
              <div className="relative">
                <Bell className="w-5 h-5 text-red-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {urgentLeads.length + warningLeads.length}
                </span>
              </div>
            )}
            <Button size="sm" onClick={() => setShowNewLead(true)} className="racing-gradient text-white h-8 px-3 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Lead
            </Button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border">
          {[
            { key: "dashboard" as TabView, label: "Painel", icon: BarChart3 },
            { key: "leads" as TabView, label: "Leads", icon: User },
            { key: "pipeline" as TabView, label: "Pipeline", icon: Target },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* URGENT ALERTS - Always visible */}
      {urgentLeads.length > 0 && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-red-500/15 border-2 border-red-500/50 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-5 h-5 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
              URGENTE! {urgentLeads.length} lead(s) sem resposta há 20min+
            </span>
          </div>
          <p className="text-[10px] text-red-300/80 mb-2">Esses leads serão redistribuídos automaticamente. Responda AGORA!</p>
          {urgentLeads.slice(0, 3).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-red-500/20">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-foreground truncate block">{lead.name}</span>
                <span className="text-[10px] text-red-300">{minutesSinceCreation(lead.createdAt)}min sem resposta</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleWhatsApp(lead)} className="p-2 rounded-lg bg-green-500/30 hover:bg-green-500/40 active:scale-95">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </button>
                <button onClick={() => handleCall(lead)} className="p-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/40 active:scale-95">
                  <Phone className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WARNING ALERTS - 5min */}
      {warningLeads.length > 0 && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              PRIORIDADE! {warningLeads.length} lead(s) sem resposta há 5min+
            </span>
          </div>
          <p className="text-[10px] text-amber-300/70 mb-1">Conversão cai 80% após 5 minutos. Responda rápido!</p>
          {warningLeads.slice(0, 3).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-amber-500/20">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                <span className="text-[10px] text-amber-300">{minutesSinceCreation(lead.createdAt)}min aguardando</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleWhatsApp(lead)} className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button onClick={() => handleCall(lead)} className="p-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 active:scale-95">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === "dashboard" && (
        isSDR ? (
          <SDRDashboard
            stats={stats}
            assignmentStats={assignmentStats}
            leads={leads || []}
            sellerMap={sellerMap}
            vendorSellers={vendorSellers}
            onAssign={handleAssign}
            onWhatsApp={handleWhatsApp}
            onCall={handleCall}
          />
        ) : (
          <SellerDashboard
            dashboard={sellerDashboard}
            stats={stats}
            followUps={followUps}
            overdueTasks={overdueTasks}
            inventoryAlerts={inventoryAlerts}
            onWhatsApp={handleWhatsApp}
            onCall={handleCall}
            sellerId={sellerId}
          />
        )
      )}

      {activeTab === "leads" && (
        <div className="px-3 mt-3">
          {/* SDR Assignment filter */}
          {isSDR && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              <button onClick={() => setAssignmentFilter("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${assignmentFilter === "all" ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <LayoutGrid className="w-3 h-3" /> Todos ({assignmentStats.total})
              </button>
              <button onClick={() => setAssignmentFilter("unassigned")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${assignmentFilter === "unassigned" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <UserPlus className="w-3 h-3" /> Novos ({assignmentStats.unassigned})
              </button>
              <button onClick={() => setAssignmentFilter("assigned")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${assignmentFilter === "assigned" ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <CheckCircle className="w-3 h-3" /> Atribuídos ({assignmentStats.assigned})
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar nome, telefone, placa..." className="pl-9 h-9 text-sm bg-accent/50 border-border" />
          </div>

          {/* Source filters */}
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterSource(null)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${!filterSource ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              Todas origens
            </button>
            {Object.entries(SOURCE_LABELS).filter(([key]) => {
              if (!leads) return false;
              return leads.some((l: any) => l.source === key);
            }).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilterSource(filterSource === key ? null : key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${filterSource === key ? `${cfg.bg} ${cfg.color} border-current` : "bg-accent/50 border-border text-muted-foreground"}`}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Score filters */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterScore(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!filterScore ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              Todos {stats?.total || 0}
            </button>
            {(["hot", "warm", "cold"] as const).map(s => {
              const cfg = SCORE_CONFIG[s];
              const count = stats?.[s] || 0;
              return (
                <button key={s} onClick={() => setFilterScore(filterScore === s ? null : s)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${filterScore === s ? cfg.badge : "bg-accent/50 border-border text-muted-foreground"}`}>
                  <cfg.icon className="w-3 h-3" /> {cfg.label} {count}
                </button>
              );
            })}
          </div>

          {/* Lead list */}
          <div className="space-y-2">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead: any) => (
                <LeadCard key={lead.id} lead={lead} stages={stages || []} sellerId={sellerId}
                  templates={templates || []}
                  isSDR={isSDR}
                  vendorSellers={vendorSellers}
                  sellerMap={sellerMap}
                  onWhatsApp={() => handleWhatsApp(lead)} onCall={() => handleCall(lead)}
                  onMoveStage={(newStage) => moveStage.mutate({ id: lead.id, newStage, sellerId })}
                  onView={() => navigate(`/crm/lead/${lead.id}`)}
                  onTemplateSelect={(tId) => handleTemplateSelect(lead, tId)}
                  onAssign={(newSellerId) => handleAssign(lead.id, newSellerId)}
                  showTemplates={showTemplates === lead.id}
                  onToggleTemplates={() => setShowTemplates(showTemplates === lead.id ? null : lead.id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{searchQuery ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}</p>
                <Button size="sm" onClick={() => setShowNewLead(true)} variant="outline" className="mt-3">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Lead
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "pipeline" && (
        <PipelineView sellerId={sellerId} dept={dept} stages={stages || []} leads={filteredLeads || []}
          isSDR={isSDR} sellerMap={sellerMap}
          onMoveStage={(id, stage) => moveStage.mutate({ id, newStage: stage, sellerId })}
          onView={(id) => navigate(`/crm/lead/${id}`)} />
      )}

      {/* Modal novo lead */}
      {showNewLead && (
        <NewLeadModal sellerId={isSDR ? 0 : sellerId} department={dept}
          onClose={() => setShowNewLead(false)}
          onCreated={() => { setShowNewLead(false); refetchLeads(); }} />
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="flex justify-around py-2">
          <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <User className="w-5 h-5" /><span className="text-[10px]">Minha Área</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary">
            <LayoutGrid className="w-5 h-5" /><span className="text-[10px] font-bold">CRM</span>
          </button>
          <button onClick={() => navigate(`/agendamentos/${sellerId}`)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Calendar className="w-5 h-5" /><span className="text-[10px]">Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== SDR DASHBOARD =====
function SDRDashboard({ stats, assignmentStats, leads, sellerMap, vendorSellers, onAssign, onWhatsApp, onCall }: any) {
  const unassignedLeads = useMemo(() => leads.filter((l: any) => l.sellerId === 0), [leads]);
  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a: any, b: any) => {
        const aTime = a.lastContactDate || new Date(a.createdAt).getTime();
        const bTime = b.lastContactDate || new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [leads]);

  // Count leads per seller
  const sellerLeadCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    leads.forEach((l: any) => {
      if (l.sellerId > 0) {
        counts[l.sellerId] = (counts[l.sellerId] || 0) + 1;
      }
    });
    return counts;
  }, [leads]);

  return (
    <div className="px-3 mt-3 space-y-3">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Total</span>
          </div>
          <p className="text-xl font-bold text-foreground">{assignmentStats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Novos</span>
          </div>
          <p className="text-xl font-bold text-amber-400">{assignmentStats.unassigned}</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Atribuídos</span>
          </div>
          <p className="text-xl font-bold text-cyan-400">{assignmentStats.assigned}</p>
        </div>
      </div>

      {/* Unassigned leads needing attention */}
      {unassignedLeads.length > 0 && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{unassignedLeads.length} leads aguardando atribuição</span>
          </div>
          {unassignedLeads.slice(0, 5).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-2 border-t border-amber-500/15">
              <div className="flex-1 min-w-0 mr-2">
                <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                <span className="text-[10px] text-muted-foreground">{lead.phone || "Sem tel."} • {timeAgo(lead.lastContactDate || (typeof lead.createdAt === 'number' ? lead.createdAt : new Date(lead.createdAt).getTime()))}</span>
              </div>
              <div className="flex items-center gap-1">
                <select
                  defaultValue=""
                  onChange={e => { const v = parseInt(e.target.value); if (v) onAssign(lead.id, v); }}
                  className="h-7 px-2 text-[10px] rounded-lg border border-border bg-background text-foreground min-w-[100px]"
                >
                  <option value="">Atribuir →</option>
                  {vendorSellers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                  ))}
                </select>
                <button onClick={() => onWhatsApp(lead)} className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leads per seller */}
      {vendorSellers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-primary" /> Leads por Vendedor
          </h3>
          <div className="space-y-1.5">
            {vendorSellers.map((s: any) => {
              const count = sellerLeadCounts[s.id] || 0;
              const maxCount = Math.max(...Object.values(sellerLeadCounts), 1);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-foreground w-24 truncate">{s.nickname || s.name}</span>
                  <div className="flex-1 h-4 bg-accent/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/40 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentLeads.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Atividade Recente
          </h3>
          {recentLeads.map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-border/50">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-foreground truncate block">{lead.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {lead.sellerId > 0 ? sellerMap[lead.sellerId] || `#${lead.sellerId}` : "Sem vendedor"} • {timeAgo(lead.lastContactDate || (typeof lead.createdAt === 'number' ? lead.createdAt : new Date(lead.createdAt).getTime()))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SELLER DASHBOARD =====
function SellerDashboard({ dashboard, stats, followUps, overdueTasks, inventoryAlerts, onWhatsApp, onCall, sellerId }: any) {
  return (
    <div className="px-3 mt-3 space-y-3">
      {/* Performance cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Leads Ativos</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats?.total || 0}</p>
          <div className="flex gap-1 mt-1">
            <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">{stats?.hot || 0} quentes</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">{stats?.warm || 0} mornos</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Conversão</span>
          </div>
          <p className="text-xl font-bold text-foreground">{dashboard?.conversionRate || 0}%</p>
          <p className="text-[9px] text-muted-foreground">{dashboard?.closedThisMonth || 0} vendas este mês</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Follow-ups</span>
          </div>
          <p className="text-xl font-bold text-foreground">{dashboard?.pendingFollowUps || 0}</p>
          <p className="text-[9px] text-muted-foreground">pendentes hoje</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Tempo Resp.</span>
          </div>
          <p className="text-xl font-bold text-foreground">{dashboard?.avgResponseTime || "--"}</p>
          <p className="text-[9px] text-muted-foreground">média em minutos</p>
        </div>
      </div>

      {/* Follow-ups pendentes */}
      {followUps && followUps.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{followUps.length} leads sem contato há 48h+</span>
          </div>
          {followUps.slice(0, 4).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-amber-500/15">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                {lead.vehicleInterest && <span className="text-[10px] text-muted-foreground">{lead.vehicleInterest}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onWhatsApp(lead)} className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button onClick={() => onCall(lead)} className="p-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 active:scale-95">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overdue tasks */}
      {overdueTasks && overdueTasks.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400">{overdueTasks.length} tarefas atrasadas</span>
          </div>
          {overdueTasks.slice(0, 3).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between py-1.5 border-t border-red-500/15">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">{task.type}: {task.description || "Sem descrição"}</span>
                <span className="text-[10px] text-red-300">Venceu {timeAgo(task.dueDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory alerts */}
      {inventoryAlerts && inventoryAlerts.length > 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold text-green-400">Veículos novos para seus clientes!</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{inventoryAlerts.length} match(es) encontrados. Toque para ver.</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => {}} className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <Plus className="w-5 h-5 text-primary" />
          <span className="text-[10px] text-muted-foreground">Novo Lead</span>
        </button>
        <button onClick={() => {}} className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <Calendar className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] text-muted-foreground">Agendar</span>
        </button>
        <button onClick={() => {}} className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <FileText className="w-5 h-5 text-green-400" />
          <span className="text-[10px] text-muted-foreground">Templates</span>
        </button>
      </div>
    </div>
  );
}

// ===== PIPELINE VIEW =====
function PipelineView({ sellerId, dept, stages, leads, onMoveStage, onView, isSDR, sellerMap }: {
  sellerId: number; dept: string; stages: any[]; leads: any[];
  onMoveStage: (id: number, stage: string) => void; onView: (id: number) => void;
  isSDR?: boolean; sellerMap?: Record<number, string>;
}) {
  return (
    <div className="px-3 mt-3">
      <div className="space-y-4">
        {stages.map((stage: any) => {
          const stageLeads = leads.filter((l: any) => l.stage === stage.name);
          return (
            <div key={stage.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between"
                style={{ borderLeftWidth: 4, borderLeftColor: stage.color || "#666" }}>
                <span className="text-xs font-bold text-foreground">{stage.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{stageLeads.length}</span>
              </div>
              {stageLeads.length > 0 ? (
                <div className="divide-y divide-border">
                  {stageLeads.map((lead: any) => (
                    <button key={lead.id} onClick={() => onView(lead.id)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent/50 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                        <div className="flex items-center gap-1.5">
                          {lead.vehicleInterest && <span className="text-[10px] text-muted-foreground">{lead.vehicleInterest}</span>}
                          {isSDR && lead.sellerId > 0 && sellerMap && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">
                              {sellerMap[lead.sellerId] || `#${lead.sellerId}`}
                            </span>
                          )}
                          {isSDR && lead.sellerId === 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                              Novo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(lead.lastContactDate)}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-3 text-[10px] text-muted-foreground text-center">Nenhum lead nesta etapa</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== LEAD CARD =====
function LeadCard({ lead, stages, sellerId, templates, isSDR, vendorSellers, sellerMap, onWhatsApp, onCall, onMoveStage, onView, onTemplateSelect, onAssign, showTemplates, onToggleTemplates }: {
  lead: any; stages: any[]; sellerId: number; templates: any[];
  isSDR?: boolean; vendorSellers?: any[]; sellerMap?: Record<number, string>;
  onWhatsApp: () => void; onCall: () => void;
  onMoveStage: (stage: string) => void; onView: () => void;
  onTemplateSelect: (tId: number) => void;
  onAssign?: (newSellerId: number) => void;
  showTemplates: boolean; onToggleTemplates: () => void;
}) {
  const [showStages, setShowStages] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const scoreCfg = SCORE_CONFIG[lead.score as keyof typeof SCORE_CONFIG] || SCORE_CONFIG.warm;
  const ScoreIcon = scoreCfg.icon;
  const isUrgent = lead._alertType === "transfer";
  const isWarning = lead._alertType === "priority";
  const isUnassigned = lead.sellerId === 0;

  return (
    <div className={`rounded-xl border p-3 transition-all ${isUrgent ? "bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10 animate-pulse" : isWarning ? "bg-amber-500/10 border-amber-500/40" : scoreCfg.bg}`}>
      {/* Urgency badge */}
      {isUrgent && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg bg-red-500/20">
          <Timer className="w-3 h-3 text-red-400" />
          <span className="text-[10px] font-bold text-red-400">URGENTE - {minutesSinceCreation(lead.createdAt)}min sem resposta!</span>
        </div>
      )}
      {isWarning && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg bg-amber-500/20">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400">PRIORIDADE - {minutesSinceCreation(lead.createdAt)}min aguardando</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0" onClick={onView}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{lead.name}</h3>
            <ScoreIcon className={`w-3.5 h-3.5 shrink-0 ${scoreCfg.color}`} />
          </div>
          {lead.vehicleInterest && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Car className="w-3 h-3" /> {lead.vehicleInterest}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{lead.stage}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> {timeAgo(lead.lastContactDate)}
            </span>
            {lead.source && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(SOURCE_LABELS[lead.source]?.bg || 'bg-accent')} ${(SOURCE_LABELS[lead.source]?.color || 'text-muted-foreground')}`}>
                {SOURCE_LABELS[lead.source]?.label || lead.source}
              </span>
            )}
            {/* SDR: show assignment status */}
            {isSDR && isUnassigned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                NOVO
              </span>
            )}
            {isSDR && !isUnassigned && sellerMap && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                → {sellerMap[lead.sellerId] || `#${lead.sellerId}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-2">
        <button onClick={onWhatsApp}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-all active:scale-95">
          <MessageCircle className="w-4 h-4 text-green-400" />
          <span className="text-[10px] font-medium text-green-400">WhatsApp</span>
        </button>
        <button onClick={onToggleTemplates}
          className="flex items-center justify-center p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all active:scale-95">
          <MessageSquare className="w-4 h-4 text-green-300" />
        </button>
        <button onClick={onCall}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all active:scale-95">
          <Phone className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-medium text-blue-400">Ligar</span>
        </button>
        {/* SDR: Assign button */}
        {isSDR && (
          <button onClick={() => setShowAssign(!showAssign)}
            className={`flex items-center justify-center p-2 rounded-lg transition-all active:scale-95 ${showAssign ? "bg-cyan-500/30 border-cyan-500/40" : "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30"} border`}>
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          </button>
        )}
        <button onClick={() => setShowStages(!showStages)}
          className="flex items-center justify-center p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-all active:scale-95">
          <ChevronRight className={`w-4 h-4 text-purple-400 transition-transform ${showStages ? "rotate-90" : ""}`} />
        </button>
        <button onClick={onView}
          className="flex items-center justify-center p-2 rounded-lg bg-accent/50 hover:bg-accent border border-border transition-all active:scale-95">
          <Eye className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* SDR: Assign dropdown */}
      {isSDR && showAssign && vendorSellers && vendorSellers.length > 0 && (
        <div className="mt-2 p-2 rounded-lg bg-card border border-cyan-500/20 space-y-1">
          <p className="text-[10px] text-cyan-400 font-medium mb-1 flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> Atribuir a vendedor:
          </p>
          <div className="grid grid-cols-2 gap-1">
            {vendorSellers.map((s: any) => (
              <button key={s.id} onClick={() => { if (onAssign) onAssign(s.id); setShowAssign(false); }}
                className={`text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                  lead.sellerId === s.id
                    ? "bg-cyan-500/20 text-cyan-400 font-bold"
                    : "hover:bg-accent text-foreground"
                }`}>
                <User className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.nickname || s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Templates dropdown */}
      {showTemplates && templates.length > 0 && (
        <div className="mt-2 p-2 rounded-lg bg-card border border-border space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Enviar template:</p>
          {templates.map((t: any) => (
            <button key={t.id} onClick={() => onTemplateSelect(t.id)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent text-xs text-foreground flex items-center gap-2 transition-colors">
              <Send className="w-3 h-3 text-green-400 shrink-0" />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Stage selector */}
      {showStages && (
        <div className="mt-2 flex flex-wrap gap-1">
          {stages.map((s: any) => (
            <button key={s.id} onClick={() => { onMoveStage(s.name); setShowStages(false); }}
              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${lead.stage === s.name ? "bg-primary/30 border-primary/50 text-primary font-bold" : "bg-accent/50 border-border text-muted-foreground hover:bg-accent"}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== NEW LEAD MODAL =====
function NewLeadModal({ sellerId, department, onClose, onCreated }: {
  sellerId: number; department: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const createLead = trpc.crmLeads.create.useMutation({
    onSuccess: () => { toast.success("Lead cadastrado!"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    createLead.mutate({ sellerId, department, name: name.trim(), phone: phone.trim() || undefined, vehicleInterest: vehicleInterest.trim() || undefined, source, notes: notes.trim() || undefined });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setNotes(prev => prev + (prev ? "\n" : "") + "[Nota de voz gravada]");
        setIsRecording(false);
        toast.success("Nota de voz salva!");
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => { if (mediaRecorder.state === "recording") mediaRecorder.stop(); }, 30000);
      (window as any).__mediaRecorder = mediaRecorder;
    } catch { toast.error("Permissão de microfone negada"); }
  };

  const stopRecording = () => {
    const mr = (window as any).__mediaRecorder;
    if (mr && mr.state === "recording") mr.stop();
    setIsRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Novo Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" className="h-10" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(47) 99999-9999" className="h-10" type="tel" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Veículo de Interesse</label>
            <Input value={vehicleInterest} onChange={e => setVehicleInterest(e.target.value)} placeholder="Ex: HB20, Hilux, Civic..." className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm">
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="trafego_pago">Tráfego Pago</option>
              <option value="olx">OLX</option>
              <option value="webmotors">Webmotors</option>
              <option value="socarrao">SóCarrão</option>
              <option value="icarros">iCarros</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="instagram_ads">Instagram Ads</option>
              <option value="facebook_ads">Facebook Ads</option>
              <option value="google_ads">Google Ads</option>
              <option value="landing_page">Landing Page</option>
              <option value="indicacao">Indicação</option>
              <option value="loja">Loja (presencial)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-2">
              Observações
              <button type="button" onClick={isRecording ? stopRecording : startRecording}
                className={`p-1 rounded ${isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-accent text-muted-foreground hover:text-foreground"}`}>
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anotações sobre o cliente..."
              className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
          </div>
          <Button type="submit" disabled={createLead.isPending} className="w-full racing-gradient text-white font-bold h-11">
            {createLead.isPending ? "Salvando..." : "Cadastrar Lead"}
          </Button>
        </form>
      </div>
    </div>
  );
}
