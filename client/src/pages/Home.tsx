import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Flag, Trophy, Users, TrendingUp, ChevronRight, Zap, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const { data: allCompetitions } = trpc.competitions.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: quote } = trpc.quotes.latest.useQuery();

  const activeComps = competitions || [];
  const finishedComps = useMemo(() => (allCompetitions || []).filter(c => c.status === "finished"), [allCompetitions]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Flag className="h-7 w-7 text-primary" />
            <span className="font-heading font-bold text-lg tracking-tight text-foreground">KAFKA MULTIMARCAS</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" onClick={() => setLocation("/admin")} className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
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
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Acompanhe a corrida de vendas da Kafka Multimarcas em tempo real. Cada venda te coloca mais perto da linha de chegada!
            </p>
            {quote && (
              <div className="racing-card p-4 max-w-lg mx-auto mb-8">
                <p className="text-sm italic text-muted-foreground">"{quote.quote}"</p>
                {quote.author && <p className="text-xs text-primary mt-2">— {quote.author}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-y border-border bg-card/50">
        <div className="container">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-primary">{sellers?.length || 0}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Pilotos</div>
            </div>
            <div className="text-center">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-primary">{activeComps.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Corridas Ativas</div>
            </div>
            <div className="text-center">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-primary">{finishedComps.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Corridas Finalizadas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Competitions */}
      <section className="py-12 sm:py-16">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">CORRIDAS ATIVAS</h2>
          </div>
          {activeComps.length === 0 ? (
            <div className="racing-card p-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma corrida ativa no momento.</p>
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
                    <div className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium uppercase text-primary">
                        {comp.type === "individual" ? "Individual" : comp.type === "team" ? "Equipes" : "Grupos"}
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
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">PILOTOS</h2>
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
              <Flag className="h-6 w-6 text-muted-foreground" />
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">CORRIDAS ENCERRADAS</h2>
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
            <Flag className="h-4 w-4 text-primary" />
            <span className="font-heading text-sm font-bold text-foreground">KAFKA MULTIMARCAS</span>
          </div>
          <p className="text-xs text-muted-foreground">Competição de Vendas — Acelere seus resultados</p>
        </div>
      </footer>
    </div>
  );
}
