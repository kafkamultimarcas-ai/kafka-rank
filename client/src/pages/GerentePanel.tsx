import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ShieldCheck, Trophy, CalendarCheck, DollarSign, FileText, Users, Wrench,
  TrendingUp, Bot, BarChart3, BookOpen, Megaphone, Target, ArrowLeft, LogOut,
  Loader2, Lock, Car, Package, MessageSquare, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Activity, Brain, Zap, Bell, CircleDot, Send, RefreshCw,
  Flame, Eye, UserCheck, XCircle, ChevronDown, ChevronUp, Sparkles,
  MessageCircle, Phone, TrendingDown, Award, Timer, Shield
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import { useBranding } from "@/contexts/TenantContext";
import { buildTenantPath, getCurrentTenantSlug, getTenantLoginPath } from "@/lib/tenant";

const MODULE_CONFIG: Record<string, { label: string; icon: any; path: string; color: string; description: string }> = {
  ranking: { label: "Ranking de Vendas", icon: Trophy, path: "/", color: "bg-red-500/20 text-red-400 border-red-500/30", description: "Ranking geral de vendas" },
  ranking_agendamentos: { label: "Ranking Agendamentos", icon: BarChart3, path: "/", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", description: "Ranking de agendamentos" },
  vendas: { label: "Vendas", icon: TrendingUp, path: "/admin/vendas", color: "bg-green-500/20 text-green-400 border-green-500/30", description: "Vendas registradas" },
  agendamentos: { label: "Agendamentos", icon: CalendarCheck, path: "/admin/agendamentos", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", description: "Agendamentos" },
  consignacao: { label: "Consignação", icon: FileText, path: "/admin/consignacao", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", description: "Controle de consignação" },
  fei: { label: "F&I", icon: DollarSign, path: "/admin/fei", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", description: "Financiamento e seguros" },
  fichas: { label: "Mesa de Crédito", icon: FileText, path: "/admin/fichas", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", description: "Fichas de financiamento" },
  despachante: { label: "Despachante", icon: FileText, path: "/admin/despachante", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", description: "Documentação veicular" },
  documentos: { label: "Documentos", icon: FileText, path: "/admin/documentos", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", description: "Documentos de venda" },
  pos_venda: { label: "Pós-Venda", icon: Wrench, path: "/pos-venda", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", description: "Atendimento pós-venda" },
  financeiro: { label: "Financeiro", icon: DollarSign, path: "/admin/financeiro", color: "bg-green-500/20 text-green-400 border-green-500/30", description: "Contas a pagar e receber" },
  marketing: { label: "Marketing", icon: Megaphone, path: "/admin/crm", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", description: "Campanhas e marketing" },
  crm: { label: "CRM", icon: Users, path: "/crm/admin", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", description: "Gestão de leads e clientes" },
  metas: { label: "Metas", icon: Target, path: "/admin/metas", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", description: "Metas individuais e da loja" },
  treinamentos: { label: "Treinamentos", icon: BookOpen, path: "/treinamentos", color: "bg-sky-500/20 text-sky-400 border-sky-500/30", description: "Material de treinamento" },
  vendedores: { label: "Vendedores", icon: Users, path: "/admin/equipe", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", description: "Gestão da equipe" },
  iam: { label: "IAM (Agente IA)", icon: Bot, path: "/admin/iam", color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30", description: "Agente inteligente" },
};

// Severity/priority color helpers
function severityColor(s: string) {
  switch (s) {
    case "critical": return "bg-red-500/15 border-red-500/30 text-red-400";
    case "high": return "bg-orange-500/15 border-orange-500/30 text-orange-400";
    case "warning": return "bg-amber-500/15 border-amber-500/30 text-amber-400";
    case "success": return "bg-green-500/15 border-green-500/30 text-green-400";
    case "info": return "bg-blue-500/15 border-blue-500/30 text-blue-400";
    default: return "bg-muted/50 border-border text-muted-foreground";
  }
}
function priorityColor(p: string) {
  switch (p) {
    case "critical": return "bg-red-500/20 text-red-400";
    case "high": return "bg-orange-500/20 text-orange-400";
    case "medium": return "bg-blue-500/20 text-blue-400";
    case "low": return "bg-gray-500/20 text-gray-400";
    default: return "bg-muted text-muted-foreground";
  }
}
function priorityIcon(p: string) {
  switch (p) {
    case "critical": return <Flame className="h-3.5 w-3.5" />;
    case "high": return <Zap className="h-3.5 w-3.5" />;
    case "medium": return <CircleDot className="h-3.5 w-3.5" />;
    default: return <Clock className="h-3.5 w-3.5" />;
  }
}

export default function GerentePanel() {
  const { logoUrl, name: brandName } = useBranding();
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const { data: sellerSession, isLoading: sellerSessionLoading } = trpc.sellers.me.useQuery();
  // Legacy backward compat: managers.me now also resolves as seller-gerente
  const { data: managerSession, isLoading: managerSessionLoading } = trpc.managers.me.useQuery();
  const { data: myPerms, isLoading: permsLoading } = trpc.managerPerms.myPermissions.useQuery();

  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "modules">("overview");
  const [expandedSeller, setExpandedSeller] = useState<number | null>(null);

  const isSellerGerente = !!sellerSession && sellerSession.sellerRole === "gerente";
  // Legacy: managerSession now returns seller-gerente data too
  const isManagerTableUser = !!managerSession && !isSellerGerente;
  const managerId = isSellerGerente
    ? sellerSession.id
    : isManagerTableUser
      ? managerSession.id
      : 0;
  const managerDisplayName = sellerSession?.nickname || sellerSession?.name || managerSession?.name || "Gerente";

  // Data queries
  const { data: teamData, isLoading: teamLoading, refetch: refetchTeam } = trpc.managerMentor.getTeamAnalytics.useQuery(
    { managerId, period },
    { enabled: !!managerId && managerId > 0 }
  );
  const { data: tasks, refetch: refetchTasks } = trpc.managerMentor.getTasks.useQuery(
    { managerId },
    { enabled: !!managerId && managerId > 0 }
  );
  const { data: alerts, refetch: refetchAlerts } = trpc.managerMentor.getAlerts.useQuery(
    { managerId },
    { enabled: !!managerId && managerId > 0 }
  );
  const { data: mentorMessages, refetch: refetchMessages } = trpc.managerMentor.getMentorMessages.useQuery(
    { managerId, limit: 3 },
    { enabled: !!managerId && managerId > 0 }
  );

  // Mutations
  const generateInsights = trpc.managerMentor.generateDailyInsights.useMutation({
    onSuccess: (data) => {
      if (data.alreadyGenerated) {
        toast.info("Insights do dia já foram gerados!");
      } else {
        toast.success(`Mentor IA gerou ${data.tasks} tarefas e ${data.alerts} alertas!`);
      }
      refetchTasks();
      refetchAlerts();
      refetchMessages();
    },
    onError: (e) => toast.error("Erro ao gerar insights: " + e.message),
  });

  const completeTask = trpc.managerMentor.completeTask.useMutation({
    onSuccess: () => { toast.success("Tarefa concluída!"); refetchTasks(); },
  });
  const dismissAlert = trpc.managerMentor.dismissAlert.useMutation({
    onSuccess: () => { refetchAlerts(); },
  });
  const markRead = trpc.managerMentor.markMessageRead.useMutation({
    onSuccess: () => { refetchMessages(); },
  });

  const sellerLogoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => { setLocation(getTenantLoginPath(tenantSlug)); },
  });
  // Legacy: managers.logout clears both cookies
  const managerLogoutMutation = trpc.managers.logout.useMutation({
    onSuccess: () => { setLocation(getTenantLoginPath(tenantSlug)); },
  });

  // Auto-generate insights on first load
  useEffect(() => {
    if (managerId > 0 && !mentorMessages?.length) {
      generateInsights.mutate({ managerId });
    }
  }, [managerId]);

  if (sellerSessionLoading || managerSessionLoading || permsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSellerGerente && !isManagerTableUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="racing-card p-8 text-center max-w-md">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading text-xl text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">Esta área é exclusiva para gerentes.</p>
          <Button onClick={() => setLocation(buildTenantPath(tenantSlug, "/"))} className="racing-gradient text-white">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const allowedModules = (myPerms || []).filter((p: any) => p.canView).map((p: any) => p.module);
  const team = teamData?.team;
  const sellersList = teamData?.sellers || [];
  const pendingTasks = (tasks || []).filter((t: any) => !t.completed);
  const criticalAlerts = (alerts || []).filter((a: any) => a.severity === "critical");
  const latestMentorMsg = (mentorMessages || [])[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation(buildTenantPath(tenantSlug, "/"))} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={logoUrl} alt={brandName} className="h-7 w-7 rounded-lg object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm text-foreground">{brandName}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">MENTOR IA</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Painel do Gerente · {managerDisplayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSellerGerente && sellerSession && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(buildTenantPath(tenantSlug, `/minha-area/${sellerSession.id}`))}
                className="gap-1.5 text-xs h-8"
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Minha Área</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(buildTenantPath(tenantSlug, "/estoque"))}
              className="gap-1.5 text-xs h-8"
            >
              <Car className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Estoque</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Unified logout: always use seller logout (clears seller_session)
                sellerLogoutMutation.mutate();
              }}
              className="gap-1.5 text-xs h-8 border-red-600/50 text-red-400 hover:bg-red-600/10"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-background/80 sticky top-14 z-40">
        <div className="container flex gap-1 py-1">
          {[
            { key: "overview", label: "Visão Geral", icon: Brain },
            { key: "team", label: "Equipe", icon: Users },
            { key: "modules", label: "Módulos", icon: Activity },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.key === "overview" && criticalAlerts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {criticalAlerts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-4 space-y-4">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <>
            {/* Mentor IA Message */}
            {latestMentorMsg && (
              <div className="racing-card p-4 border-l-4 border-l-purple-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start gap-3 relative">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold text-sm text-purple-400">Mentor IA</h3>
                      <span className="text-[9px] text-muted-foreground">{latestMentorMsg.icon}</span>
                    </div>
                    <p className="text-xs font-medium text-foreground mb-1">{latestMentorMsg.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{latestMentorMsg.content}</p>
                  </div>
                  {!latestMentorMsg.read && (
                    <button
                      onClick={() => markRead.mutate({ messageId: latestMentorMsg.id, managerId })}
                      className="text-[9px] text-purple-400 hover:text-purple-300 shrink-0"
                    >
                      Marcar lido
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Generate / Refresh button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-sm text-foreground">Resumo do Dia</h2>
                {/* Period selector */}
                <div className="flex bg-muted/50 rounded-lg p-0.5">
                  {(["today", "week", "month"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                        period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p === "today" ? "Hoje" : p === "week" ? "Semana" : "Mês"}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  generateInsights.mutate({ managerId });
                  refetchTeam();
                }}
                disabled={generateInsights.isPending}
                className="gap-1.5 text-xs h-7"
              >
                {generateInsights.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Atualizar IA
              </Button>
            </div>

            {/* Stats Cards */}
            {team && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="racing-card p-3 border-l-4 border-l-green-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-[10px] text-muted-foreground">Vendas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{team.totalSales}</p>
                  {team.storeGoalTarget > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
                        <span>Meta: {team.storeGoalTarget}</span>
                        <span>{Math.round((team.storeGoalProgress / team.storeGoalTarget) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(100, (team.storeGoalProgress / team.storeGoalTarget) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="racing-card p-3 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground">Faturamento</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {team.totalRevenue > 0 ? `R$ ${(team.totalRevenue / 1000).toFixed(0)}k` : "R$ 0"}
                  </p>
                </div>
                <div className="racing-card p-3 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">Leads</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{team.totalLeads}</p>
                  {team.totalUnresponded > 0 && (
                    <p className="text-[10px] text-red-400 mt-0.5">{team.totalUnresponded} sem resposta</p>
                  )}
                </div>
                <div className="racing-card p-3 border-l-4 border-l-amber-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Timer className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] text-muted-foreground">Tempo Resp.</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{team.avgTeamResponse}<span className="text-sm text-muted-foreground">min</span></p>
                </div>
              </div>
            )}

            {/* Two columns: Tasks + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Tasks from Mentor IA */}
              <div className="racing-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    Tarefas do Mentor
                    {pendingTasks.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">
                        {pendingTasks.length}
                      </span>
                    )}
                  </h3>
                </div>
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Todas as tarefas concluídas!</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateInsights.mutate({ managerId })}
                      className="mt-2 text-xs text-purple-400"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Gerar novas tarefas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {pendingTasks.map((task: any) => (
                      <div key={task.id} className={`p-3 rounded-lg border ${severityColor(task.priority)}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${priorityColor(task.priority)}`}>
                            {priorityIcon(task.priority)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{task.title}</p>
                            {task.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{task.type}</span>
                              {task.actionType && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{task.actionType}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => completeTask.mutate({ taskId: task.id, managerId })}
                            className="shrink-0 w-6 h-6 rounded-full border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alerts */}
              <div className="racing-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-400" />
                    Alertas
                    {(alerts || []).length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                        {(alerts || []).length}
                      </span>
                    )}
                  </h3>
                </div>
                {(alerts || []).length === 0 ? (
                  <div className="text-center py-6">
                    <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum alerta no momento!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {(alerts || []).map((alert: any) => (
                      <div key={alert.id} className={`p-3 rounded-lg border ${severityColor(alert.severity)}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            alert.severity === "critical" ? "bg-red-500/20" : "bg-amber-500/20"
                          }`}>
                            {alert.severity === "critical"
                              ? <Flame className="h-3.5 w-3.5 text-red-400" />
                              : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{alert.title}</p>
                            {alert.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => dismissAlert.mutate({ alertId: alert.id, managerId })}
                            className="shrink-0"
                          >
                            <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="racing-card p-4">
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-amber-400" />
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setLocation(buildTenantPath(tenantSlug, "/admin/vendas"))}
                  className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors text-left"
                >
                  <TrendingUp className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-xs font-medium text-foreground">Aprovar Vendas</span>
                </button>
                <button
                  onClick={() => setLocation(buildTenantPath(tenantSlug, "/crm/admin"))}
                  className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors text-left"
                >
                  <MessageSquare className="h-4 w-4 text-violet-400 shrink-0" />
                  <span className="text-xs font-medium text-foreground">CRM / Leads</span>
                </button>
                <button
                  onClick={() => setLocation(buildTenantPath(tenantSlug, "/"))}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-left"
                >
                  <Trophy className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-xs font-medium text-foreground">Ranking</span>
                </button>
                <button
                  onClick={() => setLocation(buildTenantPath(tenantSlug, "/estoque"))}
                  className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-left"
                >
                  <Car className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-medium text-foreground">Estoque</span>
                </button>
              </div>
            </div>

            {/* Top 5 Quick View */}
            {sellersList.length > 0 && (
              <div className="racing-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    Top Vendedores
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab("team")}>
                    Ver Todos <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {sellersList.slice(0, 5).map((seller: any, idx: number) => (
                    <div key={seller.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                        idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                        idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      {seller.photoUrl ? (
                        <img src={seller.photoUrl} alt={seller.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {seller.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">{seller.name}</p>
                          <span className={`w-2 h-2 rounded-full ${seller.status === "online" ? "bg-green-400" : "bg-gray-500"}`} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{seller.totalLeads} leads</span>
                          <span>{seller.avgResponseMin}min resp.</span>
                          {seller.unrespondedLeads > 0 && (
                            <span className="text-red-400">{seller.unrespondedLeads} pendentes</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">{seller.totalSales}</span>
                        <p className="text-[9px] text-muted-foreground">vendas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== TEAM TAB ===== */}
        {activeTab === "team" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-sm text-foreground">Performance da Equipe</h2>
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                {(["today", "week", "month"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "today" ? "Hoje" : p === "week" ? "Semana" : "Mês"}
                  </button>
                ))}
              </div>
            </div>

            {teamLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {sellersList.map((seller: any, idx: number) => (
                  <div key={seller.id} className="racing-card overflow-hidden">
                    <button
                      onClick={() => setExpandedSeller(expandedSeller === seller.id ? null : seller.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                          idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                          idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </span>
                        {seller.photoUrl ? (
                          <img src={seller.photoUrl} alt={seller.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {seller.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground truncate">{seller.name}</p>
                            <span className={`w-2 h-2 rounded-full ${seller.status === "online" ? "bg-green-400" : "bg-gray-500"}`} />
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-green-400 font-bold">{seller.totalSales} vendas</span>
                            <span className="text-xs text-muted-foreground">{seller.totalLeads} leads</span>
                            <span className={`text-xs ${seller.avgResponseMin > 30 ? "text-red-400" : seller.avgResponseMin > 10 ? "text-amber-400" : "text-green-400"}`}>
                              {seller.avgResponseMin}min
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {seller.unrespondedLeads > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
                              {seller.unrespondedLeads} sem resp.
                            </span>
                          )}
                          {expandedSeller === seller.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {expandedSeller === seller.id && (
                      <div className="px-4 pb-4 border-t border-border/50 pt-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <p className="text-[9px] text-muted-foreground">Vendas</p>
                            <p className="text-lg font-bold text-green-400">{seller.totalSales}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <p className="text-[9px] text-muted-foreground">Leads</p>
                            <p className="text-lg font-bold text-blue-400">{seller.totalLeads}</p>
                          </div>
                          <div className={`p-2 rounded-lg ${seller.avgResponseMin > 30 ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                            <p className="text-[9px] text-muted-foreground">Tempo Resp.</p>
                            <p className={`text-lg font-bold ${seller.avgResponseMin > 30 ? "text-red-400" : "text-amber-400"}`}>{seller.avgResponseMin}min</p>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <p className="text-[9px] text-muted-foreground">Conversão</p>
                            <p className="text-lg font-bold text-purple-400">{seller.conversionRate}%</p>
                          </div>
                        </div>

                        {/* Goal progress */}
                        {seller.goalTarget > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Meta Individual: {seller.goalTarget}</span>
                              <span>{Math.round((seller.goalProgress / seller.goalTarget) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (seller.goalProgress / seller.goalTarget) >= 1 ? "bg-green-500" :
                                  (seller.goalProgress / seller.goalTarget) >= 0.5 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(100, (seller.goalProgress / seller.goalTarget) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-foreground">{seller.totalPoints} pts total</span>
                          {seller.salesValue > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              R$ {(seller.salesValue / 1000).toFixed(0)}k faturado
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== MODULES TAB ===== */}
        {activeTab === "modules" && (
          <>
            <h2 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Módulos Liberados
            </h2>
            {allowedModules.length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-heading text-base text-foreground mb-1">Nenhum módulo liberado</h2>
                <p className="text-sm text-muted-foreground">O administrador ainda não liberou módulos para você.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allowedModules.map((moduleKey: string) => {
                  const config = MODULE_CONFIG[moduleKey];
                  if (!config) return null;
                  const Icon = config.icon;
                  const perm = (myPerms || []).find((p: any) => p.module === moduleKey);
                  return (
                    <button
                      key={moduleKey}
                      onClick={() => setLocation(buildTenantPath(tenantSlug, config.path))}
                      className="racing-card p-4 text-left hover:scale-[1.02] transition-all hover:border-primary/30 group"
                    >
                      <div className={`p-2 rounded-lg ${config.color.split(' ').slice(0, 2).join(' ')} w-fit mb-2`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-heading font-bold text-xs text-foreground group-hover:text-primary transition-colors">{config.label}</h3>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{config.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {perm?.canEdit && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">Editar</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
