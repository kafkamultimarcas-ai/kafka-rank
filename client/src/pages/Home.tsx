import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Trophy, Users, TrendingUp, ChevronRight, Zap, Settings, PlusCircle, LogIn, Shield, Bell, BellRing, BookOpen, Tv, Target, Award, CalendarPlus } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { getLoginUrl } from "@/const";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

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
  const { isSupported: pushSupported, isSubscribed, subscribe: subscribePush, permission } = usePushNotifications();
  const [, setLocation] = useLocation();
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const { data: allCompetitions } = trpc.competitions.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: quote } = trpc.quotes.latest.useQuery();
  const now = new Date();
  const { data: goals } = trpc.goals.list.useQuery({ month: now.getMonth() + 1, year: now.getFullYear() });

  const activeComps = competitions || [];
  const finishedComps = useMemo(() => (allCompetitions || []).filter(c => c.status === "finished"), [allCompetitions]);
  const storeGoals = useMemo(() => (goals || []).filter(g => g.type === "store"), [goals]);

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
            <Button size="sm" variant="outline" onClick={() => setLocation("/treinamentos")} className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Treinar</span>
            </Button>
            <Button size="sm" onClick={() => setLocation("/registrar-venda")} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Registrar</span>
              <span className="sm:hidden">+</span>
            </Button>
            {user?.role === "admin" ? (
              <Button size="sm" onClick={() => setLocation("/admin")} className="gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            ) : !user && !authLoading ? (
              <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl()} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <LogIn className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

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
                  <Trophy className="h-4 w-4" /> Ver Pista
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setLocation("/tv")} className="gap-2">
                <Tv className="h-4 w-4" /> Modo TV
              </Button>
            </div>

            {/* Agendamentos - Seção destacada */}
            {sellers && sellers.length > 0 && (
              <div className="mt-8 max-w-md mx-auto">
                <div className="racing-card p-5 border-2 border-primary/40 bg-primary/5">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CalendarPlus className="h-6 w-6 text-primary" />
                    <h3 className="font-heading font-bold text-lg text-foreground">MEUS AGENDAMENTOS</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 text-center">Gerencie seus agendamentos, acompanhe clientes e confirme comparecimentos</p>
                  <select
                    onChange={e => { if (e.target.value) setLocation(`/agendamentos/${e.target.value}`); }}
                    defaultValue=""
                    className="w-full rounded-lg border-2 border-primary/30 bg-background px-4 py-3 text-sm text-foreground font-medium mb-3 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>Selecione seu nome para acessar...</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
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
                  <div key={goal.id} className="racing-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.vendas}`}>
                        {CATEGORY_LABELS[goal.category] || goal.category}
                      </span>
                      {goal.achieved && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <Award className="h-3 w-3" /> META BATIDA!
                        </span>
                      )}
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

      {/* Top Sellers */}
      {sellers && sellers.length > 0 && (
        <section className="py-12 sm:py-16 border-t border-border">
          <div className="container">
            <div className="flex items-center gap-3 mb-8">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">PARTICIPANTES</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sellers.map((seller, idx) => (
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
