import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  ShieldCheck, Trophy, CalendarCheck, DollarSign, FileText, Users, Wrench, 
  TrendingUp, Bot, BarChart3, BookOpen, Megaphone, Target, ArrowLeft, LogOut, 
  Loader2, Lock, Car, Package, MessageSquare, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Activity
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

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

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

export default function GerentePanel() {
  const [, setLocation] = useLocation();
  const { data: sellerSession, isLoading: sessionLoading } = trpc.sellers.me.useQuery();
  const { data: myPerms, isLoading: permsLoading } = trpc.managerPerms.myPermissions.useQuery();
  const { data: allSellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: allSales } = trpc.sales.list.useQuery({});
  // pendingSales from allSales (gerente doesn't have admin access to listPending)
  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => { setLocation("/"); },
  });

  // Calculate team stats
  const stats = useMemo(() => {
    if (!allSellers || !allSales) return null;
    const vendedores = allSellers.filter(s => (s.department || 'vendas') === 'vendas');
    const totalVendas = allSales.filter((s: any) => s.status === 'approved').length;
    const totalPendentes = allSales.filter((s: any) => s.status === 'pending').length;
    const totalVendedores = vendedores.length;
    
    // Top 5 vendedores by points
    const sorted = [...vendedores].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    const top5 = sorted.slice(0, 5);
    
    // Total revenue
    const totalRevenue = allSales
      .filter((s: any) => s.status === 'approved')
      .reduce((sum: number, s: any) => sum + (s.value || 0), 0);
    
    return { totalVendas, totalPendentes, totalVendedores, top5, totalRevenue };
  }, [allSellers, allSales]);

  if (sessionLoading || permsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sellerSession || sellerSession.sellerRole !== 'gerente') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="racing-card p-8 text-center max-w-md">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading text-xl text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">Esta área é exclusiva para gerentes.</p>
          <Button onClick={() => setLocation("/")} className="racing-gradient text-white">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const allowedModules = (myPerms || []).filter((p: any) => p.canView).map((p: any) => p.module);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={LOGO_URL} alt="Kafka" className="h-7 w-7 rounded-lg" />
            <div>
              <span className="font-heading font-bold text-sm text-foreground">PAINEL DO GERENTE</span>
              <p className="text-[10px] text-muted-foreground">{sellerSession.nickname || sellerSession.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/minha-area/${sellerSession.id}`)}
              className="gap-1.5 text-xs h-8"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Minha Área</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/estoque")}
              className="gap-1.5 text-xs h-8"
            >
              <Car className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Estoque</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              className="gap-1.5 text-xs h-8 border-red-600/50 text-red-400 hover:bg-red-600/10"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="racing-card p-4 border-l-4 border-l-green-500">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Vendas Aprovadas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalVendas}</p>
            </div>
            <div className="racing-card p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalPendentes}</p>
            </div>
            <div className="racing-card p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Vendedores</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalVendedores}</p>
            </div>
            <div className="racing-card p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Faturamento</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {stats.totalRevenue > 0 
                  ? `R$ ${(stats.totalRevenue / 1000).toFixed(0)}k` 
                  : "R$ 0"}
              </p>
            </div>
          </div>
        )}

        {/* Top 5 Ranking + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 5 */}
          {stats && stats.top5.length > 0 && (
            <div className="racing-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Top 5 Vendedores
                </h3>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/")}>
                  Ver Ranking <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="space-y-2">
                {stats.top5.map((seller, idx) => (
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
                        {(seller.nickname || seller.name).charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{seller.nickname || seller.name}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{seller.totalPoints ?? 0} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Actions */}
          <div className="racing-card p-4">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Ações Pendentes
            </h3>
            <div className="space-y-2">
              {(stats?.totalPendentes ?? 0) > 0 && (
                <button
                  onClick={() => setLocation("/admin/vendas")}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{stats?.totalPendentes} vendas aguardando aprovação</p>
                    <p className="text-xs text-muted-foreground">Clique para revisar</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setLocation("/crm/admin")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">CRM - Leads e Campanhas</p>
                  <p className="text-xs text-muted-foreground">Gerenciar leads e disparo em massa</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => setLocation("/estoque")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Car className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Estoque de Veículos</p>
                  <p className="text-xs text-muted-foreground">Ver veículos disponíveis</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {(stats?.totalPendentes ?? 0) === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-green-400">Nenhuma venda pendente!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div>
          <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Módulos Liberados
          </h3>
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
                    onClick={() => setLocation(config.path)}
                    className="racing-card p-4 text-left hover:scale-[1.02] transition-all hover:border-primary/30 group"
                  >
                    <div className={`p-2 rounded-lg ${config.color.split(' ').slice(0, 2).join(' ')} w-fit mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading font-bold text-xs text-foreground group-hover:text-primary transition-colors">{config.label}</h3>
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
        </div>
      </div>
    </div>
  );
}
