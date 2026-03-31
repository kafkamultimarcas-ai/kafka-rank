import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Trophy, Users, User, TrendingUp, ChevronRight, Zap, Settings, PlusCircle, LogIn, Shield, Bell, BellRing, BookOpen, Tv, Target, Award, CalendarPlus, Wrench, AlertTriangle, Bot, Sparkles, MessageCircle, Camera, Lightbulb, DollarSign, Calculator, FileText, Flame, Car, LayoutGrid } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { getLoginUrl } from "@/const";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import NotificationCenter from "@/components/NotificationCenter";
import NewLeadAlert from "@/components/NewLeadAlert";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

const CATEGORY_LABELS: Record<string, string> = {
  vendas: "Vendas",
  fei: "F&I",
  consignacao: "Consignação",
  despachante: "Despachante",
  feirao: "Feirão",
  pre_vendas: "Pré-Vendas",
};

const CATEGORY_COLORS: Record<string, string> = {
  vendas: "bg-red-500/20 text-red-400",
  fei: "bg-green-500/20 text-green-400",
  consignacao: "bg-blue-500/20 text-blue-400",
  despachante: "bg-purple-500/20 text-purple-400",
  feirao: "bg-orange-500/20 text-orange-400",
  pre_vendas: "bg-cyan-500/20 text-cyan-400",
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const { isSupported: pushSupported, isSubscribed, subscribe: subscribePush, permission } = usePushNotifications(sellerSession?.id);
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const { data: allCompetitions } = trpc.competitions.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: quote } = trpc.quotes.latest.useQuery();
  const [now] = useState(() => new Date());
  const { data: goals } = trpc.goals.list.useQuery({ month: now.getMonth() + 1, year: now.getFullYear() });

  const activeComps = competitions || [];
  const finishedComps = useMemo(() => (allCompetitions || []).filter(c => c.status === "finished"), [allCompetitions]);
  const storeGoals = useMemo(() => (goals || []).filter(g => g.type === "store"), [goals]);

  // Simulador de Financiamento
  const { data: iamConfig } = trpc.iamConfig.get.useQuery();
  const [simValor, setSimValor] = useState("");
  const [simEntrada, setSimEntrada] = useState("");
  const [simPrazo, setSimPrazo] = useState(48);
  const simTaxa = iamConfig?.financingRate ? parseFloat(iamConfig.financingRate) : 2.2;
  const simFinanciado = Math.max(0, (parseFloat(simValor.replace(/\D/g, "")) || 0) - (parseFloat(simEntrada.replace(/\D/g, "")) || 0));
  const simParcela = simFinanciado > 0 && simTaxa > 0 ? simFinanciado * (simTaxa / 100) / (1 - Math.pow(1 + simTaxa / 100, -simPrazo)) : 0;
  const simTotal = simParcela * simPrazo;
  const simJuros = simTotal - simFinanciado;

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const handleMoneyInput = (value: string, setter: (v: string) => void) => {
    const nums = value.replace(/\D/g, "");
    if (!nums) { setter(""); return; }
    const n = parseInt(nums);
    setter(n.toLocaleString("pt-BR"));
  };

  // Ranking mensal de vendas
  const [showMonthlyRanking, setShowMonthlyRanking] = useState<string | null>(null);
  const { data: monthlyRanking } = trpc.goals.monthlyRanking.useQuery(
    { month: now.getMonth() + 1, year: now.getFullYear(), category: showMonthlyRanking || undefined },
    { enabled: showMonthlyRanking !== null }
  );

  // Ranking de agendamentos
  const [showAppointmentRanking, setShowAppointmentRanking] = useState(false);
  const { data: appointmentRanking } = trpc.goals.appointmentRanking.useQuery(
    { month: now.getMonth() + 1, year: now.getFullYear() },
    { enabled: showAppointmentRanking }
  );

  // Filtrar apenas vendedores (department = vendas) para o ranking principal
  const vendedores = useMemo(() => {
    if (!sellers) return [];
    return sellers.filter(s => !s.department || s.department === 'vendas');
  }, [sellers]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Kafka Rank" className="h-9 w-9 rounded-lg" />
            <span className="font-heading font-bold text-lg tracking-tight text-foreground">KAFKA RANK</span>
          </div>
          <div className="flex items-center gap-2">
            {pushSupported && !isSubscribed && permission !== "denied" && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) toast.success("Notificações ativadas!");
                  else if (permission === "denied") toast.error("Notificações bloqueadas. Ative nas configurações do navegador.");
                }}
                className="gap-1.5 border-yellow-600 text-yellow-500 hover:bg-yellow-600/10"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alertas</span>
              </Button>
            )}
            {isSubscribed && (
              <div className="flex items-center gap-1 text-xs text-emerald-500 px-1">
                <BellRing className="h-3.5 w-3.5" />
              </div>
            )}
            <NotificationCenter isAdmin={user?.role === 'admin'} sellerId={sellerSession?.id} />
            <Button size="sm" variant="outline" onClick={() => setLocation("/treinamentos")} className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Treinar</span>
            </Button>
            <Button size="sm" onClick={() => setLocation("/registrar-venda")} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Registrar</span>
              <span className="sm:hidden">+</span>
            </Button>
            {sellerSession ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setLocation(`/minha-area/${sellerSession.id}`)} className="gap-1.5 border-blue-600 text-blue-400 hover:bg-blue-600/10">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{sellerSession.nickname || sellerSession.name}</span>
                </Button>
                {(sellerSession as any).sellerRole === 'gerente' && (
                  <Button size="sm" onClick={() => setLocation("/gerente")} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Gerente</span>
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setLocation("/login-vendedor")} className="gap-1.5 border-blue-600 text-blue-400 hover:bg-blue-600/10">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Minha Área</span>
              </Button>
            )}
            {user?.role === "admin" ? (
              <Button size="sm" onClick={() => setLocation("/admin")} className="gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Gerência</span>
              </Button>
            ) : !user && !authLoading ? (
              <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl()} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <LogIn className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* New Lead Alert - big visual alert for sellers */}
      {sellerSession && <NewLeadAlert sellerId={sellerSession.id} />}

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-20">
        <div className="absolute inset-0 opacity-5 checkered-flag" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Competição de Vendas</span>
            </div>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
              ACELERE SUAS <span className="text-primary">VENDAS</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
              Acompanhe a competição em tempo real. Cada venda te coloca mais perto da linha de chegada!
            </p>
            {quote && (
              <div className="racing-card p-4 max-w-lg mx-auto mb-6">
                <p className="text-sm italic text-muted-foreground">"{quote.quote}"</p>
                {quote.author && <p className="text-xs text-primary mt-2">— {quote.author}</p>}
              </div>
            )}
            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setLocation("/treinamentos")} className="gap-2">
                <BookOpen className="h-4 w-4" /> Treinamentos
              </Button>
              {activeComps.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setLocation(`/corrida/${activeComps[0].id}`)} className="gap-2">
                  <Trophy className="h-4 w-4" /> Ranking
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setLocation("/tv")} className="gap-2">
                <Tv className="h-4 w-4" /> Tela TV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/pos-venda")} className="gap-2 border-orange-600 text-orange-400 hover:bg-orange-600/10">
                <Wrench className="h-4 w-4" /> Pós-Venda
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/feirao")} className="gap-2 border-red-600 text-red-400 hover:bg-red-600/10">
                <Flame className="h-4 w-4" /> Feirão
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/estoque")} className="gap-2 border-cyan-600 text-cyan-400 hover:bg-cyan-600/10">
                <Car className="h-4 w-4" /> Estoque
              </Button>
              {sellerSession ? (
                <Button variant="outline" size="sm" onClick={() => setLocation("/crm")} className="gap-2 border-green-600 text-green-400 hover:bg-green-600/10">
                  <LayoutGrid className="h-4 w-4" /> Meus Clientes
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setLocation("/login-vendedor")} className="gap-2 border-green-600 text-green-400 hover:bg-green-600/10">
                  <LayoutGrid className="h-4 w-4" /> Meus Clientes
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setLocation("/ficha-financiamento")} className="gap-2 border-blue-600 text-blue-400 hover:bg-blue-600/10">
                <DollarSign className="h-4 w-4" /> Financiamento
              </Button>
              {sellerSession ? (
                <Button variant="outline" size="sm" onClick={() => setLocation(`/minha-area/${sellerSession.id}`)} className="gap-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/10">
                  <FileText className="h-4 w-4" /> Meus Docs
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setLocation("/login-vendedor")} className="gap-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/10">
                  <FileText className="h-4 w-4" /> Meus Docs
                </Button>
              )}
            </div>

            {/* SIMULADOR DE FINANCIAMENTO */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="racing-card p-5 border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-green-950/40">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calculator className="h-6 w-6 text-emerald-400" />
                  <h3 className="font-heading font-bold text-lg text-foreground">SIMULADOR DE FINANCIAMENTO</h3>
                </div>
                <p className="text-[10px] text-emerald-400/70 text-center mb-4">Simulação ilustrativa • Taxa: {simTaxa}% a.m.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Valor do Veículo (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 45.000"
                      value={simValor}
                      onChange={e => handleMoneyInput(e.target.value, setSimValor)}
                      className="w-full rounded-lg border-2 border-emerald-500/30 bg-background px-4 py-3 text-sm text-foreground font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Entrada (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 10.000"
                      value={simEntrada}
                      onChange={e => handleMoneyInput(e.target.value, setSimEntrada)}
                      className="w-full rounded-lg border-2 border-emerald-500/30 bg-background px-4 py-3 text-sm text-foreground font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Prazo: {simPrazo}x</label>
                    <div className="flex gap-2 flex-wrap">
                      {[12, 24, 36, 48, 60].map(p => (
                        <button
                          key={p}
                          onClick={() => setSimPrazo(p)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            simPrazo === p
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                              : "bg-muted text-muted-foreground hover:bg-emerald-500/20"
                          }`}
                        >
                          {p}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {simParcela > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-500/20">
                    <div className="text-center mb-3">
                      <p className="text-xs text-muted-foreground">Parcela estimada</p>
                      <p className="font-heading font-bold text-3xl text-emerald-400">{formatCurrency(simParcela)}</p>
                      <p className="text-xs text-muted-foreground">{simPrazo}x de {formatCurrency(simParcela)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Financiado</p>
                        <p className="text-xs font-bold text-foreground">{formatCurrency(simFinanciado)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="text-xs font-bold text-foreground">{formatCurrency(simTotal)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Juros</p>
                        <p className="text-xs font-bold text-yellow-400">{formatCurrency(simJuros)}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-300 text-center">💡 Argumento: "Por apenas <strong>{formatCurrency(simParcela)}/mês</strong>, você sai de carro hoje!"</p>
                    </div>
                  </div>
                )}
                <p className="text-[8px] text-muted-foreground/50 text-center mt-3">⚠️ Valores meramente ilustrativos. Consulte condições reais com financeira.</p>
              </div>
            </div>

            {/* Pós-Venda - Acesso Rápido */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="racing-card p-5 border-2 border-orange-500/40 bg-orange-500/5">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wrench className="h-6 w-6 text-orange-400" />
                  <h3 className="font-heading font-bold text-lg text-foreground">PÓS-VENDA</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 text-center">Abra chamados para o setor de pós-venda resolver problemas de clientes</p>
                <Button
                  onClick={() => setLocation("/pos-venda")}
                  className="w-full gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  <Wrench className="h-4 w-4" /> Acessar Pós-Venda
                </Button>
              </div>
            </div>

            {/* Agendamentos - Seção destacada */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="racing-card p-5 border-2 border-primary/40 bg-primary/5">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CalendarPlus className="h-6 w-6 text-primary" />
                  <h3 className="font-heading font-bold text-lg text-foreground">MEUS AGENDAMENTOS</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 text-center">Gerencie seus agendamentos, acompanhe clientes e confirme comparecimentos</p>
                {sellerSession ? (
                  <Button
                    onClick={() => setLocation(`/agendamentos/${sellerSession.id}`)}
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  >
                    <CalendarPlus className="h-4 w-4" /> Meus Agendamentos
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">Faça login para acessar seus agendamentos</p>
                )}
              </div>
            </div>

            {/* IAM - Assistente de Vendas IA */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="relative overflow-hidden racing-card p-5 border-2 border-violet-500/40 bg-gradient-to-br from-violet-950/50 to-purple-950/50">
                {/* Glow effect */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                
                <div className="relative">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-pulse">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-1.5">
                        IAM <Sparkles className="h-4 w-4 text-yellow-400" />
                      </h3>
                      <p className="text-[10px] text-violet-400 -mt-0.5">Inteligência Artificial de Mercado</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Seu assistente pessoal de vendas! Tire dúvidas, peça scripts, quebre objeções, crie conteúdo e muito mais.
                  </p>

                  {/* Quick features */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 bg-violet-900/20 rounded-lg px-3 py-2 border border-violet-500/10">
                      <MessageCircle className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                      <span className="text-[11px] text-violet-300">Quebrar objeções</span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-900/20 rounded-lg px-3 py-2 border border-violet-500/10">
                      <Camera className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                      <span className="text-[11px] text-violet-300">Analisar conversa</span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-900/20 rounded-lg px-3 py-2 border border-violet-500/10">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                      <span className="text-[11px] text-violet-300">Ideias de conteúdo</span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-900/20 rounded-lg px-3 py-2 border border-violet-500/10">
                      <Target className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                      <span className="text-[11px] text-violet-300">Scripts de venda</span>
                    </div>
                  </div>

                  {sellerSession ? (
                    <Button
                      onClick={() => setLocation(`/ia-vendedor/${sellerSession.id}`)}
                      className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-violet-500/20"
                    >
                      <Bot className="h-4 w-4" /> Acessar IAM
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Faça login para acessar o IAM</p>
                  )}
                  <p className="text-[10px] text-violet-400/60 text-center mt-1">Disponível 24h para ajudar você a vender mais</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Store Goals (Metas da Loja) */}
      {storeGoals.length > 0 && (
        <section className="py-8 border-y border-border bg-card/50">
          <div className="container">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-lg text-foreground">METAS DA LOJA</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storeGoals.map(goal => {
                const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                return (
                  <div key={goal.id}>
                    <div
                      className="racing-card p-4 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
                      onClick={() => setShowMonthlyRanking(showMonthlyRanking === goal.category ? null : goal.category)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.vendas}`}>
                          {CATEGORY_LABELS[goal.category] || goal.category}
                        </span>
                        <div className="flex items-center gap-2">
                          {goal.achieved && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                              <Award className="h-3 w-3" /> META BATIDA!
                            </span>
                          )}
                          <Trophy className={`h-4 w-4 transition-colors ${showMonthlyRanking === goal.category ? 'text-yellow-400' : 'text-muted-foreground/50'}`} />
                        </div>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <span className="font-heading font-bold text-2xl text-foreground">{goal.currentValue}</span>
                          <span className="text-muted-foreground text-sm">/{goal.targetValue}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{pct}%</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${goal.achieved ? "bg-emerald-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {goal.bonusDescription && (
                        <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Bônus: {goal.bonusDescription}
                          {goal.bonusValue ? ` — R$ ${goal.bonusValue.toLocaleString("pt-BR")}` : ""}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        {showMonthlyRanking === goal.category ? '▲ Fechar ranking' : '▼ Toque para ver ranking do mês'}
                      </p>
                    </div>
                    {/* Ranking Mensal Expandido */}
                    {showMonthlyRanking === goal.category && monthlyRanking && (
                      <div className="mt-2 racing-card p-4 border-t-2 border-primary/30">
                        <div className="flex items-center gap-2 mb-4">
                          <Trophy className="h-5 w-5 text-yellow-400" />
                          <h3 className="font-heading font-bold text-sm text-foreground">
                            RANKING {(CATEGORY_LABELS[goal.category] || goal.category).toUpperCase()} — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                          </h3>
                        </div>
                        {/* Pódio top 3 */}
                        {monthlyRanking.length >= 3 && (
                          <div className="flex items-end justify-center gap-3 mb-4">
                            {/* 2° lugar */}
                            <div className="text-center">
                              {monthlyRanking[1]?.seller?.photoUrl ? (
                                <img src={monthlyRanking[1].seller.photoUrl} className="w-10 h-10 rounded-full mx-auto ring-2 ring-gray-400 object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full mx-auto bg-gray-700 ring-2 ring-gray-400 flex items-center justify-center text-xs font-bold text-gray-300">2</div>
                              )}
                              <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[70px]">{monthlyRanking[1]?.seller?.nickname || monthlyRanking[1]?.seller?.name}</p>
                              <p className="text-[10px] text-primary font-bold">{monthlyRanking[1]?.salesCount} vendas</p>
                            </div>
                            {/* 1° lugar */}
                            <div className="text-center -mt-2">
                              <div className="text-yellow-400 text-lg mb-0.5">🏆</div>
                              {monthlyRanking[0]?.seller?.photoUrl ? (
                                <img src={monthlyRanking[0].seller.photoUrl} className="w-14 h-14 rounded-full mx-auto ring-2 ring-yellow-400 object-cover" />
                              ) : (
                                <div className="w-14 h-14 rounded-full mx-auto bg-yellow-900/30 ring-2 ring-yellow-400 flex items-center justify-center text-lg font-bold text-yellow-400">1</div>
                              )}
                              <p className="text-sm font-bold text-foreground mt-1 truncate max-w-[80px]">{monthlyRanking[0]?.seller?.nickname || monthlyRanking[0]?.seller?.name}</p>
                              <p className="text-xs text-yellow-400 font-bold">{monthlyRanking[0]?.salesCount} vendas</p>
                            </div>
                            {/* 3° lugar */}
                            <div className="text-center">
                              {monthlyRanking[2]?.seller?.photoUrl ? (
                                <img src={monthlyRanking[2].seller.photoUrl} className="w-10 h-10 rounded-full mx-auto ring-2 ring-amber-600 object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full mx-auto bg-amber-900/30 ring-2 ring-amber-600 flex items-center justify-center text-xs font-bold text-amber-400">3</div>
                              )}
                              <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[70px]">{monthlyRanking[2]?.seller?.nickname || monthlyRanking[2]?.seller?.name}</p>
                              <p className="text-[10px] text-amber-400 font-bold">{monthlyRanking[2]?.salesCount} vendas</p>
                            </div>
                          </div>
                        )}
                        {/* Lista completa */}
                        <div className="space-y-1.5">
                          {monthlyRanking.map((entry: any, idx: number) => (
                            <div key={entry.seller?.id || idx} className={`flex items-center gap-3 p-2 rounded-lg ${idx < 3 ? 'bg-primary/5' : 'bg-muted/30'}`}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                idx === 2 ? 'bg-amber-600/20 text-amber-400' :
                                'bg-muted text-muted-foreground'
                              }`}>{idx + 1}</span>
                              {entry.seller?.photoUrl ? (
                                <img src={entry.seller.photoUrl} className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="w-3 h-3 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{entry.seller?.nickname || entry.seller?.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-primary">{entry.salesCount}</p>
                                <p className="text-[9px] text-muted-foreground">vendas</p>
                              </div>
                              {entry.totalValue > 0 && (
                                <div className="text-right">
                                  <p className="text-[10px] text-emerald-400 font-semibold">R$ {(entry.totalValue / 1000).toFixed(0)}k</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {monthlyRanking.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-4">Nenhuma venda registrada neste mês ainda.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-8 border-b border-border bg-card/30">
        <div className="container">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-primary">{sellers?.length || 0}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Participantes</div>
            </div>
            <div className="text-center">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-primary">{activeComps.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Competições Ativas</div>
            </div>
            <div className="text-center">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-primary">{finishedComps.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Encerradas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Competitions */}
      <section className="py-12 sm:py-16">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">COMPETIÇÕES ATIVAS</h2>
          </div>
          {activeComps.length === 0 ? (
            <div className="racing-card p-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma competição ativa no momento.</p>
              <p className="text-sm text-muted-foreground mt-1">Aguarde o administrador criar uma nova competição.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeComps.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setLocation(`/corrida/${comp.id}`)}
                  className="racing-card p-5 text-left hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Trophy className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium uppercase text-primary">
                        {comp.type === "individual" ? "Individual" : comp.type === "team" ? "Equipes" : "Grupos"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[comp.category || "vendas"]}`}>
                        {CATEGORY_LABELS[comp.category || "vendas"]}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground mb-2">{comp.name}</h3>
                  {comp.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{comp.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{new Date(comp.startDate).toLocaleDateString("pt-BR")}</span>
                    <span>→</span>
                    <span>{new Date(comp.endDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Top Vendedores - apenas department vendas */}
      {vendedores.length > 0 && (
        <section className="py-12 sm:py-16 border-t border-border">
          <div className="container">
            <div className="flex items-center gap-3 mb-8">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">TOP EQUIPE</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vendedores.map((seller, idx) => (
                <button
                  key={seller.id}
                  onClick={() => setLocation(`/vendedor/${seller.id}`)}
                  className="racing-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left"
                >
                  <div className="relative shrink-0">
                    <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground z-10">
                      {idx + 1}
                    </div>
                    {seller.photoUrl ? (
                      <img src={seller.photoUrl} alt={seller.name} className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground border-2 border-border">
                        {seller.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{seller.nickname || seller.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{seller.totalSales} vendas</span>
                      <span className="text-xs font-medium text-primary">{seller.totalPoints} pts</span>
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ranking de Agendamentos */}
      <section className="py-12 sm:py-16 border-t border-border">
        <div className="container">
          <button
            onClick={() => setShowAppointmentRanking(!showAppointmentRanking)}
            className="flex items-center gap-3 mb-6 w-full text-left"
          >
            <CalendarPlus className="h-6 w-6 text-cyan-400" />
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">RANKING DE AGENDAMENTOS</h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {showAppointmentRanking ? '▲ Fechar' : '▼ Ver ranking'}
            </span>
          </button>
          {!showAppointmentRanking && (
            <p className="text-sm text-muted-foreground">Toque acima para ver quem mais agendou e quem teve mais comparecimentos no mês.</p>
          )}
          {showAppointmentRanking && (
            <div className="racing-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarPlus className="h-5 w-5 text-cyan-400" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  AGENDAMENTOS — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </h3>
              </div>
              {!appointmentRanking || appointmentRanking.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">Nenhum agendamento aprovado neste mês.</p>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-semibold px-2 pb-1 border-b border-border">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Vendedor</div>
                    <div className="col-span-2 text-center">Agendou</div>
                    <div className="col-span-2 text-center">Compareceu</div>
                    <div className="col-span-2 text-center">Taxa</div>
                  </div>
                  {appointmentRanking.map((entry: any, idx: number) => (
                    <div key={entry.seller?.id || idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${
                      idx === 0 ? 'bg-cyan-500/10 border border-cyan-500/20' :
                      idx < 3 ? 'bg-primary/5' : 'bg-muted/30'
                    }`}>
                      <span className={`col-span-1 text-xs font-bold ${
                        idx === 0 ? 'text-cyan-400' : idx < 3 ? 'text-primary' : 'text-muted-foreground'
                      }`}>{idx + 1}</span>
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        {entry.seller?.photoUrl ? (
                          <img src={entry.seller.photoUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Users className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-xs font-semibold text-foreground truncate">{entry.seller?.nickname || entry.seller?.name}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-bold text-cyan-400">{entry.scheduledCount}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-bold text-emerald-400">{entry.attendedCount}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`text-xs font-bold ${
                          entry.conversionRate >= 80 ? 'text-emerald-400' :
                          entry.conversionRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{entry.conversionRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Finished Competitions */}
      {finishedComps.length > 0 && (
        <section className="py-12 sm:py-16 border-t border-border">
          <div className="container">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="h-6 w-6 text-muted-foreground" />
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">COMPETIÇÕES ENCERRADAS</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {finishedComps.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setLocation(`/competicao/${comp.id}`)}
                  className="racing-card p-5 text-left hover:border-primary/50 transition-all opacity-80 hover:opacity-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Encerrada</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[comp.category || "vendas"]}`}>
                      {CATEGORY_LABELS[comp.category || "vendas"]}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-foreground mb-1">{comp.name}</h3>
                  <div className="text-xs text-muted-foreground">
                    {new Date(comp.startDate).toLocaleDateString("pt-BR")} — {new Date(comp.endDate).toLocaleDateString("pt-BR")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-8">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={LOGO_URL} alt="Kafka Rank" className="h-5 w-5 rounded" />
            <span className="font-heading text-sm font-bold text-foreground">KAFKA RANK</span>
          </div>
          <p className="text-xs text-muted-foreground">Competição de Vendas — Acelere seus resultados</p>
          <p className="text-xs text-muted-foreground/50 mt-1">v2.0</p>
          {!user && !authLoading && (
            <button
              onClick={() => window.location.href = getLoginUrl()}
              className="mt-4 text-xs text-muted-foreground/50 hover:text-primary transition-colors"
            >
              Área do Gerente
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
