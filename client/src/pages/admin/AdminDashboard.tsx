import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Users, Trophy, ShoppingCart, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { data: sellers } = trpc.sellers.list.useQuery({});
  const { data: competitions } = trpc.competitions.list.useQuery({});
  const { data: quote } = trpc.quotes.latest.useQuery();
  const utils = trpc.useUtils();

  const generateQuote = trpc.quotes.generate.useMutation({
    onSuccess: () => {
      utils.quotes.latest.invalidate();
      utils.quotes.list.invalidate();
      toast.success("Frase motivacional gerada!");
    },
    onError: () => toast.error("Erro ao gerar frase."),
  });

  const activeSellers = sellers?.filter(s => s.active) || [];
  const activeComps = competitions?.filter(c => c.status === "active") || [];
  const finishedComps = competitions?.filter(c => c.status === "finished") || [];
  const totalSales = sellers?.reduce((sum, s) => sum + s.totalSales, 0) || 0;
  const totalPoints = sellers?.reduce((sum, s) => sum + s.totalPoints, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral da competição de vendas</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="racing-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{activeSellers.length}</p>
            <p className="text-xs text-muted-foreground">Vendedores Ativos</p>
          </div>
          <div className="racing-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{activeComps.length}</p>
            <p className="text-xs text-muted-foreground">Competições Ativas</p>
          </div>
          <div className="racing-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{totalSales}</p>
            <p className="text-xs text-muted-foreground">Total de Vendas</p>
          </div>
          <div className="racing-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total de Pontos</p>
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="racing-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-sm text-foreground">FRASE MOTIVACIONAL</h2>
            </div>
            <Button
              size="sm"
              onClick={() => generateQuote.mutate()}
              disabled={generateQuote.isPending}
              className="racing-gradient text-white"
            >
              {generateQuote.isPending ? "Gerando..." : "Gerar Nova"}
            </Button>
          </div>
          {quote ? (
            <div>
              <p className="text-muted-foreground italic">"{quote.quote}"</p>
              {quote.author && <p className="text-xs text-primary mt-2">— {quote.author}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Clique em "Gerar Nova" para criar uma frase motivacional com IA.</p>
          )}
        </div>

        {/* Top Sellers */}
        <div className="racing-card p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-4">TOP VENDEDORES</h2>
          {activeSellers.length > 0 ? (
            <div className="space-y-3">
              {activeSellers.slice(0, 5).map((seller, idx) => (
                <div key={seller.id} className="flex items-center gap-3">
                  <span className="font-heading font-bold text-sm text-primary w-6">{idx + 1}</span>
                  {seller.photoUrl ? (
                    <img src={seller.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                      {seller.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller.totalSales} vendas</p>
                  </div>
                  <span className="font-heading font-bold text-sm text-primary">{seller.totalPoints} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum vendedor cadastrado.</p>
          )}
        </div>

        {/* Recent Competitions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="racing-card p-5">
            <h2 className="font-heading font-bold text-sm text-foreground mb-3">COMPETIÇÕES ATIVAS</h2>
            {activeComps.length > 0 ? (
              <div className="space-y-2">
                {activeComps.map(comp => (
                  <div key={comp.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                    <Trophy className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{comp.type === "individual" ? "Individual" : comp.type === "team" ? "Equipes" : "Grupos"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma competição ativa.</p>
            )}
          </div>
          <div className="racing-card p-5">
            <h2 className="font-heading font-bold text-sm text-foreground mb-3">COMPETIÇÕES ENCERRADAS</h2>
            {finishedComps.length > 0 ? (
              <div className="space-y-2">
                {finishedComps.slice(0, 5).map(comp => (
                  <div key={comp.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                    <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(comp.endDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma competição encerrada.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
