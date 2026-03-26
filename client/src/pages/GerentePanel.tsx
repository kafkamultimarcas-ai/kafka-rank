import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ShieldCheck, Trophy, CalendarCheck, DollarSign, FileText, Users, Wrench, TrendingUp, Bot, BarChart3, BookOpen, Megaphone, Target, ArrowLeft, LogOut, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const MODULE_CONFIG: Record<string, { label: string; icon: any; path: string; color: string; description: string }> = {
  ranking: { label: "Ranking de Vendas", icon: Trophy, path: "/", color: "bg-red-500/20 text-red-400 border-red-500/30", description: "Veja o ranking geral de vendas" },
  ranking_agendamentos: { label: "Ranking Agendamentos", icon: BarChart3, path: "/", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", description: "Ranking de agendamentos do mês" },
  vendas: { label: "Vendas", icon: TrendingUp, path: "/admin/vendas", color: "bg-green-500/20 text-green-400 border-green-500/30", description: "Gerenciar vendas registradas" },
  agendamentos: { label: "Agendamentos", icon: CalendarCheck, path: "/admin/agendamentos", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", description: "Gerenciar agendamentos" },
  consignacao: { label: "Consignação", icon: FileText, path: "/admin/consignacao", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", description: "Controle de consignação" },
  fei: { label: "F&I", icon: DollarSign, path: "/admin/fei", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", description: "Financiamento e seguros" },
  fichas: { label: "Mesa de Crédito", icon: FileText, path: "/admin/fichas", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", description: "Fichas de financiamento" },
  despachante: { label: "Despachante", icon: FileText, path: "/admin/despachante", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", description: "Documentação veicular" },
  documentos: { label: "Documentos", icon: FileText, path: "/admin/documentos", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", description: "Documentos de venda" },
  pos_venda: { label: "Pós-Venda", icon: Wrench, path: "/pos-venda", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", description: "Atendimento pós-venda" },
  financeiro: { label: "Financeiro", icon: DollarSign, path: "/admin/financeiro", color: "bg-green-500/20 text-green-400 border-green-500/30", description: "Contas a pagar e receber" },
  marketing: { label: "Marketing", icon: Megaphone, path: "/admin/crm", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", description: "Campanhas e marketing" },
  crm: { label: "CRM", icon: Users, path: "/admin/crm", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", description: "Gestão de leads e clientes" },
  metas: { label: "Metas", icon: Target, path: "/admin/metas", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", description: "Metas individuais e da loja" },
  treinamentos: { label: "Treinamentos", icon: BookOpen, path: "/treinamentos", color: "bg-sky-500/20 text-sky-400 border-sky-500/30", description: "Material de treinamento" },
  vendedores: { label: "Vendedores", icon: Users, path: "/admin/equipe", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", description: "Gestão da equipe" },
  iam: { label: "IAM (Agente IA)", icon: Bot, path: "/admin/iam", color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30", description: "Agente inteligente de atendimento" },
};

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

export default function GerentePanel() {
  const [, setLocation] = useLocation();
  const { data: sellerSession, isLoading: sessionLoading } = trpc.sellers.me.useQuery();
  const { data: myPerms, isLoading: permsLoading } = trpc.managerPerms.myPermissions.useQuery();
  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => { setLocation("/"); },
  });

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
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={LOGO_URL} alt="Kafka Rank" className="h-8 w-8 rounded-lg" />
            <div>
              <span className="font-heading font-bold text-sm text-foreground">PAINEL DO GERENTE</span>
              <p className="text-xs text-muted-foreground">{sellerSession.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/minha-area/${sellerSession.id}`)}
              className="gap-1.5 border-blue-600 text-blue-400 hover:bg-blue-600/10"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Minha Área</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              className="gap-1.5 border-red-600 text-red-400 hover:bg-red-600/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Welcome */}
        <div className="racing-card p-6 mb-8 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <h1 className="font-heading font-bold text-xl text-foreground">
              Olá, {sellerSession.nickname || sellerSession.name}!
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Você tem acesso de gerente. Abaixo estão os módulos liberados pelo administrador.
          </p>
        </div>

        {/* Modules Grid */}
        {allowedModules.length === 0 ? (
          <div className="racing-card p-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-lg text-foreground mb-2">Nenhum módulo liberado</h2>
            <p className="text-muted-foreground">O administrador ainda não liberou módulos para você. Entre em contato com o gerente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedModules.map((moduleKey: string) => {
              const config = MODULE_CONFIG[moduleKey];
              if (!config) return null;
              const Icon = config.icon;
              const perm = (myPerms || []).find((p: any) => p.module === moduleKey);
              return (
                <button
                  key={moduleKey}
                  onClick={() => setLocation(config.path)}
                  className={`racing-card p-5 text-left hover:scale-[1.02] transition-transform border-l-4 ${config.color.split(' ')[2] || 'border-l-primary'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-lg ${config.color.split(' ').slice(0, 2).join(' ')}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">{config.label}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">Visualizar</span>
                        {perm?.canEdit && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Editar</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
