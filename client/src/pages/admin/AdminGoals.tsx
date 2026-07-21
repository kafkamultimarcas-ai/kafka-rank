import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Target, Plus, Trash2, TrendingUp, DollarSign, Trophy, Banknote, Pencil, Check, X, Flame, Star, CheckCircle, Clock, AlertTriangle, Bell, Send, Eye, Filter, Users, BarChart3, Gift, History, ChevronLeft, ChevronRight, Timer, Zap } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const CATEGORY_OPTIONS = [
  { value: "vendas", label: "Vendas", personLabel: "Vendedor" },
  { value: "fei", label: "F&I", personLabel: "Analista F&I" },
  { value: "consignacao", label: "Consignação", personLabel: "Consignador(a)" },
  { value: "despachante", label: "Despachante", personLabel: "Despachante" },
  { value: "feirao", label: "Feirão", personLabel: "Colaborador" },
  { value: "pre_vendas", label: "Pré-Vendas", personLabel: "Pré-Vendedor" },
];
const CATEGORY_COLORS: Record<string, string> = {
  vendas: "bg-red-500/20 text-red-400",
  fei: "bg-green-500/20 text-green-400",
  consignacao: "bg-blue-500/20 text-blue-400",
  despachante: "bg-purple-500/20 text-purple-400",
  feirao: "bg-orange-500/20 text-orange-400",
  pre_vendas: "bg-cyan-500/20 text-cyan-400",
};
const DEPT_COLORS: Record<string, string> = {
  vendas: "border-red-500/30 bg-red-500/5",
  fei: "border-green-500/30 bg-green-500/5",
  consignacao: "border-blue-500/30 bg-blue-500/5",
  despachante: "border-purple-500/30 bg-purple-500/5",
  feirao: "border-orange-500/30 bg-orange-500/5",
  pre_vendas: "border-cyan-500/30 bg-cyan-500/5",
};
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const FULL_MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatTimeRemaining(deadline: number): { text: string; expired: boolean; urgentClass: string } {
  const now = Date.now();
  const diff = deadline - now;
  if (diff <= 0) return { text: "Prazo expirado!", expired: true, urgentClass: "text-red-400" };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 6) return { text: `${hours}h ${mins}min restantes`, expired: false, urgentClass: "text-red-400 animate-pulse" };
  if (hours < 24) return { text: `${hours}h ${mins}min restantes`, expired: false, urgentClass: "text-amber-400" };
  return { text: `${hours}h restantes`, expired: false, urgentClass: "text-muted-foreground" };
}

export default function AdminGoals() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editBonus, setEditBonus] = useState("");
  const [editBonusValue, setEditBonusValue] = useState("");
  const [activeTab, setActiveTab] = useState<"goals" | "status" | "history">("goals");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "expired">("all");
  const [statusCategoryFilter, setStatusCategoryFilter] = useState<string>("all");
  const [historyYear, setHistoryYear] = useState(now.getFullYear());

  // Form state
  const [type, setType] = useState<"store" | "individual">("store");
  const [category, setCategory] = useState("vendas");
  const [targetValue, setTargetValue] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusValue, setBonusValue] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("48");

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: goals, isLoading } = trpc.goals.list.useQuery({ month, year });
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: pendingGoals } = trpc.goals.myPendingGoals.useQuery(undefined, { enabled: !isAdmin });

  // History: load all 12 months of the selected year
  const historyMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const historyQueries = historyMonths.map(m =>
    trpc.goals.list.useQuery({ month: m, year: historyYear }, { enabled: activeTab === "history" })
  );

  const acceptGoal = trpc.goals.accept.useMutation({
    onSuccess: () => {
      toast.success("Meta aceita! Vamos juntos! 🔥");
      utils.goals.list.invalidate();
      utils.goals.myPendingGoals.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resendNotification = trpc.goals.resendNotification.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "Notificação reenviada!");
      utils.goals.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast.success("Meta criada! Notificação enviada ao colaborador 🎯");
      utils.goals.list.invalidate();
      setShowForm(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      toast.success("Meta atualizada!");
      utils.goals.list.invalidate();
      setEditingGoalId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      toast.success("Meta excluída!");
      utils.goals.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setType("store");
    setCategory("vendas");
    setTargetValue("");
    setBonusDescription("");
    setBonusValue("");
    setSellerId("");
    setDeadlineHours("48");
  };

  const handleCreate = () => {
    if (!targetValue || parseInt(targetValue) <= 0) {
      toast.error("Informe o valor da meta");
      return;
    }
    if (type === "individual" && !sellerId) {
      toast.error("Selecione o colaborador");
      return;
    }
    createGoal.mutate({
      type,
      category,
      targetValue: parseInt(targetValue),
      month,
      year,
      bonusDescription: bonusDescription || undefined,
      bonusValue: bonusValue ? parseFloat(bonusValue) : undefined,
      sellerId: type === "individual" && sellerId ? parseInt(sellerId) : undefined,
      deadlineHours: parseInt(deadlineHours) || 48,
    });
  };

  const startEdit = (goal: any) => {
    setEditingGoalId(goal.id);
    setEditValue(String(goal.currentValue));
    setEditTarget(String(goal.targetValue));
    setEditBonus(goal.bonusDescription || "");
    setEditBonusValue(goal.bonusValue ? String(goal.bonusValue) : "");
  };

  const saveEdit = (goalId: number) => {
    const updates: any = {};
    if (editValue !== "") updates.currentValue = parseInt(editValue);
    if (editTarget !== "") updates.targetValue = parseInt(editTarget);
    if (editBonus !== undefined) updates.bonusDescription = editBonus;
    if (editBonusValue !== "") updates.bonusValue = parseFloat(editBonusValue);
    updateGoal.mutate({ id: goalId, ...updates });
  };

  const getPersonLabel = (cat: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === cat)?.personLabel || "Colaborador";
  };

  const filteredSellers = useMemo(() => {
    if (!sellers) return [];
    const categoryToDept: Record<string, string[]> = {
      vendas: ["vendas"],
      fei: ["fei"],
      consignacao: ["consignacao"],
      despachante: ["despachante"],
      feirao: ["vendas", "pre_vendas"],
      pre_vendas: ["pre_vendas"],
    };
    const depts = categoryToDept[category];
    if (!depts) return sellers;
    return sellers.filter(s => depts.includes(s.department || "vendas"));
  }, [sellers, category]);

  const monthTabs = useMemo(() => {
    const tabs = [];
    for (let i = -3; i <= 2; i++) {
      let m = now.getMonth() + 1 + i;
      let y = now.getFullYear();
      if (m < 1) { m += 12; y -= 1; }
      if (m > 12) { m -= 12; y += 1; }
      tabs.push({ month: m, year: y, label: `${MONTH_NAMES[m - 1]} ${y}` });
    }
    return tabs;
  }, []);

  // ===== STATUS PANEL DATA =====
  const individualGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter((g: any) => g.type === "individual");
  }, [goals]);

  const statusStats = useMemo(() => {
    const total = individualGoals.length;
    const accepted = individualGoals.filter((g: any) => g.accepted).length;
    const expired = individualGoals.filter((g: any) => !g.accepted && g.deadline && Date.now() > g.deadline).length;
    const pending = total - accepted;
    const pct = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const byCategory: Record<string, { total: number; accepted: number; pending: number; expired: number }> = {};
    individualGoals.forEach((g: any) => {
      if (!byCategory[g.category]) byCategory[g.category] = { total: 0, accepted: 0, pending: 0, expired: 0 };
      byCategory[g.category].total++;
      if (g.accepted) byCategory[g.category].accepted++;
      else {
        byCategory[g.category].pending++;
        if (g.deadline && Date.now() > g.deadline) byCategory[g.category].expired++;
      }
    });
    return { total, accepted, pending, expired, pct, byCategory };
  }, [individualGoals]);

  const filteredStatusGoals = useMemo(() => {
    let filtered = individualGoals;
    if (statusFilter === "pending") filtered = filtered.filter((g: any) => !g.accepted);
    if (statusFilter === "accepted") filtered = filtered.filter((g: any) => g.accepted);
    if (statusFilter === "expired") filtered = filtered.filter((g: any) => !g.accepted && g.deadline && Date.now() > g.deadline);
    if (statusCategoryFilter !== "all") filtered = filtered.filter((g: any) => g.category === statusCategoryFilter);
    return filtered;
  }, [individualGoals, statusFilter, statusCategoryFilter]);

  const activeCategories = useMemo(() => {
    const cats = new Set(individualGoals.map((g: any) => g.category));
    return CATEGORY_OPTIONS.filter(c => cats.has(c.value));
  }, [individualGoals]);

  // ===== HISTORY DATA =====
  const historyData = useMemo(() => {
    if (activeTab !== "history") return [];
    return historyMonths.map((m, i) => {
      const data = historyQueries[i]?.data;
      if (!data || data.length === 0) return null;
      const storeGoals = data.filter((g: any) => g.type === "store");
      const indGoals = data.filter((g: any) => g.type === "individual");
      const achievedCount = data.filter((g: any) => g.achieved || g.currentValue >= g.targetValue).length;
      return {
        month: m,
        monthName: FULL_MONTH_NAMES[m - 1],
        total: data.length,
        store: storeGoals.length,
        individual: indGoals.length,
        achieved: achievedCount,
        accepted: indGoals.filter((g: any) => g.accepted).length,
        goals: data,
      };
    }).filter(Boolean);
  }, [activeTab, historyQueries.map(q => q.data)]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="font-heading font-bold text-2xl text-foreground">Metas</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <Button
                  variant={activeTab === "goals" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("goals")}
                  className="gap-1.5"
                >
                  <Target className="h-3.5 w-3.5" /> Metas
                </Button>
                <Button
                  variant={activeTab === "status" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("status")}
                  className="gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> Status
                  {statusStats.pending > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {statusStats.pending}
                    </span>
                  )}
                </Button>
                <Button
                  variant={activeTab === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("history")}
                  className="gap-1.5"
                >
                  <History className="h-3.5 w-3.5" /> Histórico
                </Button>
              </>
            )}
            {!isAdmin && (
              <Button
                variant={activeTab === "history" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(activeTab === "history" ? "goals" : "history")}
                className="gap-1.5"
              >
                <History className="h-3.5 w-3.5" /> {activeTab === "history" ? "Voltar" : "Meu Histórico"}
              </Button>
            )}
            {isAdmin && activeTab === "goals" && (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Nova Meta
              </Button>
            )}
          </div>
        </div>

        {/* Month Tabs (only for goals and status tabs) */}
        {activeTab !== "history" && (
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
            {monthTabs.map((tab) => (
              <button
                key={`${tab.month}-${tab.year}`}
                onClick={() => { setMonth(tab.month); setYear(tab.year); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  month === tab.month && year === tab.year
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ===== PENDING GOALS BANNER (Non-admin collaborators) ===== */}
        {!isAdmin && pendingGoals && pendingGoals.length > 0 && activeTab !== "history" && (
          <div className="racing-card p-5 border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground">Novas Metas Para Você!</h3>
                <p className="text-sm text-muted-foreground">Aceite suas metas para começar a competir</p>
              </div>
            </div>
            <div className="space-y-3">
              {pendingGoals.map((pg: any) => {
                const deadlineInfo = pg.deadline ? formatTimeRemaining(pg.deadline) : null;
                return (
                  <div key={pg.id} className="p-4 rounded-xl bg-card border border-amber-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[pg.category] || ""}`}>
                        {CATEGORY_OPTIONS.find(c => c.value === pg.category)?.label || pg.category}
                      </span>
                      <span className="text-sm font-bold text-foreground">Meta: {pg.targetValue}</span>
                    </div>
                    {/* Deadline countdown */}
                    {deadlineInfo && (
                      <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${deadlineInfo.urgentClass}`}>
                        <Timer className="h-3.5 w-3.5" />
                        {deadlineInfo.text}
                      </div>
                    )}
                    {(pg.bonusDescription || pg.bonusValue) && (
                      <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold">Prêmio</p>
                        {pg.bonusValue && <p className="font-bold text-emerald-400">R$ {Number(pg.bonusValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                        {pg.bonusDescription && <p className="text-xs text-emerald-300/80">{pg.bonusDescription}</p>}
                      </div>
                    )}
                    <Button
                      onClick={() => acceptGoal.mutate({ id: pg.id })}
                      disabled={acceptGoal.isPending}
                      className="w-full gap-2 racing-gradient text-white"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {acceptGoal.isPending ? "Aceitando..." : "Aceitar Meta"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {activeTab === "history" && (
          <div className="space-y-5">
            {/* Year selector */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHistoryYear(y => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-heading font-bold text-xl text-foreground">{historyYear}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHistoryYear(y => y + 1)} disabled={historyYear >= now.getFullYear()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Year overview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {historyMonths.map((m, i) => {
                const monthData = historyData.find((d: any) => d?.month === m);
                const isCurrentMonth = m === now.getMonth() + 1 && historyYear === now.getFullYear();
                const isPast = historyYear < now.getFullYear() || (historyYear === now.getFullYear() && m < now.getMonth() + 1);
                const qLoading = historyQueries[i]?.isLoading;

                return (
                  <div
                    key={m}
                    className={`racing-card p-4 transition-all ${
                      isCurrentMonth ? "ring-2 ring-primary/50" : ""
                    } ${!monthData && !qLoading ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-heading font-bold text-sm ${isCurrentMonth ? "text-primary" : "text-foreground"}`}>
                        {FULL_MONTH_NAMES[m - 1]}
                      </span>
                      {isCurrentMonth && <Zap className="h-3.5 w-3.5 text-primary" />}
                    </div>

                    {qLoading ? (
                      <div className="h-16 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : monthData ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Total metas</span>
                          <span className="font-bold text-foreground">{(monthData as any).total}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Atingidas</span>
                          <span className="font-bold text-emerald-400">{(monthData as any).achieved}</span>
                        </div>
                        {(monthData as any).individual > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Individuais</span>
                            <span className="font-bold text-foreground">
                              {(monthData as any).accepted}/{(monthData as any).individual}
                              <span className="text-muted-foreground ml-1">aceitas</span>
                            </span>
                          </div>
                        )}
                        {/* Achievement rate bar */}
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${(monthData as any).total > 0 ? Math.round(((monthData as any).achieved / (monthData as any).total) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{isPast ? "Sem metas" : "—"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed history for months with data */}
            {historyData.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-heading font-bold text-sm text-muted-foreground uppercase flex items-center gap-2">
                  <History className="h-4 w-4" /> Detalhes por Mês
                </h3>
                {historyData.map((monthData: any) => (
                  <div key={monthData.month} className="racing-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-heading font-bold text-foreground">{monthData.monthName} {historyYear}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                          {monthData.achieved}/{monthData.total} atingidas
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {monthData.goals.map((goal: any) => {
                        const seller = sellers?.find((s: any) => s.id === goal.sellerId);
                        const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                        const isAchieved = goal.achieved || goal.currentValue >= goal.targetValue;
                        return (
                          <div key={goal.id} className={`p-3 rounded-lg border ${isAchieved ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              {seller && (
                                seller.photoUrl ? (
                                  <img src={seller.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                                    {seller.name?.charAt(0) || "?"}
                                  </div>
                                )
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || ""}`}>
                                {CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label || goal.category}
                              </span>
                              {goal.type === "individual" && seller && (
                                <span className="text-xs font-semibold text-foreground">{seller.nickname || seller.name}</span>
                              )}
                              {goal.type === "store" && <span className="text-xs font-semibold text-foreground">Loja</span>}
                              {isAchieved && <Trophy className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full ${isAchieved ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground">{goal.currentValue}/{goal.targetValue}</span>
                            </div>
                            {(goal.bonusDescription || goal.bonusValue) && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <Gift className="h-3 w-3 text-emerald-400" />
                                <span className="text-[10px] text-emerald-400">
                                  {goal.bonusValue ? `R$ ${Number(goal.bonusValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                                  {goal.bonusDescription ? ` ${goal.bonusDescription}` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {historyData.length === 0 && !historyQueries.some(q => q.isLoading) && (
              <div className="racing-card p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma meta registrada em {historyYear}.</p>
              </div>
            )}
          </div>
        )}

        {/* ===== ADMIN: STATUS ACEITAÇÃO TAB ===== */}
        {isAdmin && activeTab === "status" && (
          <div className="space-y-5">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="racing-card p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Send className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">Enviadas</span>
                </div>
                <p className="font-heading font-bold text-3xl text-foreground">{statusStats.total}</p>
              </div>
              <div className="racing-card p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">Aceitas</span>
                </div>
                <p className="font-heading font-bold text-3xl text-emerald-400">{statusStats.accepted}</p>
              </div>
              <div className="racing-card p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">Pendentes</span>
                </div>
                <p className="font-heading font-bold text-3xl text-amber-400">{statusStats.pending}</p>
              </div>
              <div className="racing-card p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">Expiradas</span>
                </div>
                <p className="font-heading font-bold text-3xl text-red-400">{statusStats.expired}</p>
              </div>
              <div className="racing-card p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">% Aceite</span>
                </div>
                <p className="font-heading font-bold text-3xl text-foreground">{statusStats.pct}%</p>
                <div className="w-full h-2 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${statusStats.pct}%` }} />
                </div>
              </div>
            </div>

            {/* Per-Category Summary */}
            {Object.keys(statusStats.byCategory).length > 0 && (
              <div className="racing-card p-4">
                <h3 className="font-heading font-bold text-sm text-muted-foreground mb-3 uppercase flex items-center gap-2">
                  <Users className="h-4 w-4" /> Aceitação por Setor
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(statusStats.byCategory).map(([cat, stats]) => {
                    const catInfo = CATEGORY_OPTIONS.find(c => c.value === cat);
                    const catPct = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;
                    return (
                      <div key={cat} className={`p-3 rounded-lg border ${DEPT_COLORS[cat] || "border-border"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${CATEGORY_COLORS[cat] || ""}`}>
                            {catInfo?.label || cat}
                          </span>
                          <span className="text-xs text-muted-foreground">{stats.accepted}/{stats.total}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${catPct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                            style={{ width: `${catPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-emerald-400">{stats.accepted} aceitas</span>
                          {stats.pending > 0 && <span className="text-[10px] text-amber-400">{stats.pending} pendentes</span>}
                          {stats.expired > 0 && <span className="text-[10px] text-red-400">{stats.expired} expiradas</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {[
                { key: "all" as const, label: `Todas (${statusStats.total})`, color: "bg-primary text-primary-foreground" },
                { key: "pending" as const, label: `Pendentes (${statusStats.pending})`, color: "bg-amber-500 text-white" },
                { key: "accepted" as const, label: `Aceitas (${statusStats.accepted})`, color: "bg-emerald-500 text-white" },
                { key: "expired" as const, label: `Expiradas (${statusStats.expired})`, color: "bg-red-500 text-white" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === f.key ? f.color : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-muted-foreground text-xs">|</span>
              <button
                onClick={() => setStatusCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusCategoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Todos Setores
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setStatusCategoryFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusCategoryFilter === cat.value
                      ? CATEGORY_COLORS[cat.value]?.replace("/20", "").replace("text-", "bg-").split(" ")[0] + " text-white"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Individual Goals Status List */}
            {filteredStatusGoals.length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {individualGoals.length === 0
                    ? `Nenhuma meta individual criada para ${MONTH_NAMES[month - 1]} ${year}.`
                    : "Nenhuma meta encontrada com os filtros selecionados."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStatusGoals.map((goal: any) => {
                  const seller = sellers?.find((s: any) => s.id === goal.sellerId);
                  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                  const isAchieved = goal.achieved || goal.currentValue >= goal.targetValue;
                  const deadlineInfo = goal.deadline ? formatTimeRemaining(goal.deadline) : null;
                  return (
                    <div
                      key={goal.id}
                      className={`racing-card p-4 border-l-4 ${
                        goal.accepted
                          ? "border-l-emerald-500"
                          : deadlineInfo?.expired
                            ? "border-l-red-500"
                            : "border-l-amber-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {seller?.photoUrl ? (
                            <img src={seller.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-border" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold ring-2 ring-border">
                              {seller?.name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{seller?.nickname || seller?.name || "Colaborador"}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || ""}`}>
                              {CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label || goal.category}
                            </span>
                            {isAchieved && <Trophy className="h-4 w-4 text-emerald-400" />}
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isAchieved ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                              {goal.currentValue}/{goal.targetValue} ({pct}%)
                            </span>
                          </div>

                          {/* Deadline info */}
                          {deadlineInfo && !goal.accepted && (
                            <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${deadlineInfo.urgentClass}`}>
                              <Timer className="h-3 w-3" />
                              {deadlineInfo.text}
                              {goal.reminderCount > 0 && (
                                <span className="text-muted-foreground font-normal">
                                  ({goal.reminderCount} lembrete{goal.reminderCount > 1 ? "s" : ""} enviado{goal.reminderCount > 1 ? "s" : ""})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bonus info */}
                          {(goal.bonusDescription || goal.bonusValue) && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Gift className="h-3 w-3 text-emerald-400" />
                              <span className="text-[11px] text-emerald-400">
                                {goal.bonusValue ? `R$ ${Number(goal.bonusValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                                {goal.bonusValue && goal.bonusDescription ? " — " : ""}
                                {goal.bonusDescription || ""}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status + Actions */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {goal.accepted ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-400">Aceita</span>
                            </div>
                          ) : deadlineInfo?.expired ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                              <span className="text-xs font-bold text-red-400">Expirada</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                              <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                              <span className="text-xs font-bold text-amber-400">Pendente</span>
                            </div>
                          )}
                          {goal.accepted && goal.acceptedAt && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(goal.acceptedAt).toLocaleDateString("pt-BR")} às {new Date(goal.acceptedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {!goal.accepted && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => resendNotification.mutate({ id: goal.id })}
                              disabled={resendNotification.isPending}
                            >
                              <Bell className="h-3 w-3" />
                              {resendNotification.isPending ? "Enviando..." : "Reenviar"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== GOALS TAB (Create + List) ===== */}
        {activeTab === "goals" && (
          <>
            {/* Create Form */}
            {showForm && isAdmin && (
              <div className="racing-card p-6 space-y-4">
                <h3 className="font-heading font-bold text-foreground">Criar Meta para {MONTH_NAMES[month - 1]} {year}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as "store" | "individual")}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="store">Meta da Loja (Geral)</option>
                      <option value="individual">Meta Individual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Valor da Meta</label>
                    <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="Ex: 50" />
                  </div>
                  {type === "individual" && (
                    <>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">{getPersonLabel(category)}</label>
                        <select
                          value={sellerId}
                          onChange={e => setSellerId(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Selecione o {getPersonLabel(category).toLowerCase()}...</option>
                          {filteredSellers.map(s => (
                            <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Prazo para Aceitar (horas)</label>
                        <select
                          value={deadlineHours}
                          onChange={e => setDeadlineHours(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="12">12 horas</option>
                          <option value="24">24 horas</option>
                          <option value="48">48 horas (padrão)</option>
                          <option value="72">72 horas</option>
                          <option value="168">1 semana</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Descrição do Prêmio (opcional)</label>
                    <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} placeholder="Ex: Almoço especial + bônus" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Valor do Prêmio R$ (opcional)</label>
                    <MoneyInput value={bonusValue} onChange={setBonusValue} placeholder="500,00" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} disabled={createGoal.isPending}>
                    {createGoal.isPending ? "Criando..." : "Criar Meta"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Goals List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !goals || goals.length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma meta para {MONTH_NAMES[month - 1]} {year}.</p>
                {isAdmin && <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Meta" para criar.</p>}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Store Goals */}
                {goals.filter((g: any) => g.type === "store").length > 0 && (
                  <div>
                    <h3 className="font-heading font-bold text-sm text-muted-foreground mb-3 uppercase flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Metas da Loja
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {goals.filter((g: any) => g.type === "store").map((goal: any) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          isAdmin={isAdmin}
                          isEditing={editingGoalId === goal.id}
                          editValue={editValue}
                          editTarget={editTarget}
                          editBonus={editBonus}
                          editBonusValue={editBonusValue}
                          setEditValue={setEditValue}
                          setEditTarget={setEditTarget}
                          setEditBonus={setEditBonus}
                          setEditBonusValue={setEditBonusValue}
                          onEdit={() => startEdit(goal)}
                          onSave={() => saveEdit(goal.id)}
                          onCancel={() => setEditingGoalId(null)}
                          onDelete={() => { if (confirm("Excluir esta meta?")) deleteGoal.mutate({ id: goal.id }); }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Goals */}
                {goals.filter((g: any) => g.type === "individual").length > 0 && (
                  <div>
                    <h3 className="font-heading font-bold text-sm text-muted-foreground mb-3 uppercase flex items-center gap-2">
                      <Star className="h-4 w-4" /> {isAdmin ? "Metas Individuais" : "Suas Metas e Bônus"}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {goals.filter((g: any) => g.type === "individual").map((goal: any) => {
                        const seller = sellers?.find((s: any) => s.id === goal.sellerId);
                        return (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            seller={seller}
                            isAdmin={isAdmin}
                            isEditing={editingGoalId === goal.id}
                            editValue={editValue}
                            editTarget={editTarget}
                            editBonus={editBonus}
                            editBonusValue={editBonusValue}
                            setEditValue={setEditValue}
                            setEditTarget={setEditTarget}
                            setEditBonus={setEditBonus}
                            setEditBonusValue={setEditBonusValue}
                            onEdit={() => startEdit(goal)}
                            onSave={() => saveEdit(goal.id)}
                            onCancel={() => setEditingGoalId(null)}
                            onDelete={() => { if (confirm("Excluir esta meta?")) deleteGoal.mutate({ id: goal.id }); }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// Goal Card Component
function GoalCard({ goal, seller, isAdmin, isEditing, editValue, editTarget, editBonus, editBonusValue,
  setEditValue, setEditTarget, setEditBonus, setEditBonusValue,
  onEdit, onSave, onCancel, onDelete }: {
  goal: any; seller?: any; isAdmin?: boolean; isEditing: boolean;
  editValue: string; editTarget: string; editBonus: string; editBonusValue: string;
  setEditValue: (v: string) => void; setEditTarget: (v: string) => void;
  setEditBonus: (v: string) => void; setEditBonusValue: (v: string) => void;
  onEdit: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void;
}) {
  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  const isAchieved = goal.achieved || goal.currentValue >= goal.targetValue;
  const deadlineInfo = goal.deadline ? formatTimeRemaining(goal.deadline) : null;

  return (
    <div className={`racing-card p-4 ${isAchieved ? "ring-1 ring-emerald-500/50" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {seller && (
            seller.photoUrl ? (
              <img src={seller.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                {seller.name?.charAt(0) || "?"}
              </div>
            )
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || ""}`}>
            {CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label || goal.category}
          </span>
          {seller && <span className="font-semibold text-sm text-foreground">{seller.nickname || seller.name}</span>}
        </div>
        <div className="flex items-center gap-1">
          {isAchieved && <Trophy className="h-4 w-4 text-emerald-400" />}
          {!isEditing && isAdmin && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>}
        </div>
      </div>

      {/* Progress */}
      {isEditing ? (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Atual</label>
              <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Meta</label>
              <Input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Prêmio</label>
            <Input value={editBonus} onChange={e => setEditBonus(e.target.value)} className="h-8 text-sm" placeholder="Descrição do prêmio" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Valor R$</label>
            <MoneyInput value={editBonusValue} onChange={setEditBonusValue} className="h-8 text-sm" placeholder="500,00" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={onSave}>
              <Check className="h-3 w-3" /> Salvar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-2">
            <span className="font-heading font-bold text-2xl text-foreground">{goal.currentValue}</span>
            <span className="text-sm text-muted-foreground">/ {goal.targetValue}</span>
            <span className={`text-sm font-bold ml-auto ${isAchieved ? "text-emerald-400" : "text-primary"}`}>{pct}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${isAchieved ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      {/* Accepted/Pending/Expired Status for individual goals */}
      {!isEditing && goal.type === 'individual' && (
        <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs font-semibold ${
          goal.accepted
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : deadlineInfo?.expired
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
        }`}>
          {goal.accepted ? (
            <><CheckCircle className="h-3.5 w-3.5" /> Meta aceita{goal.acceptedAt ? ` em ${new Date(goal.acceptedAt).toLocaleDateString('pt-BR')}` : ''}</>
          ) : deadlineInfo?.expired ? (
            <><AlertTriangle className="h-3.5 w-3.5" /> Prazo expirado!</>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 animate-pulse" /> Aguardando aceite
              {deadlineInfo && <span className={`ml-1 ${deadlineInfo.urgentClass}`}>({deadlineInfo.text})</span>}
            </>
          )}
        </div>
      )}

      {/* Prize Display */}
      {!isEditing && (goal.bonusDescription || goal.bonusValue) && (
        <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Banknote className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-wider">Prêmio</p>
              {goal.bonusValue ? (
                <p className="font-heading font-bold text-lg text-emerald-400">
                  R$ {Number(goal.bonusValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              ) : null}
              {goal.bonusDescription && (
                <p className="text-xs text-emerald-300/80 truncate">{goal.bonusDescription}</p>
              )}
            </div>
            <DollarSign className="h-6 w-6 text-emerald-500/30" />
          </div>
        </div>
      )}
    </div>
  );
}
