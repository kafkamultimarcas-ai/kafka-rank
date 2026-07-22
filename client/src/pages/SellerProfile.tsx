import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { ArrowLeft, TrendingUp, ShoppingCart, Target, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SellerProfile() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const goBack = useGoBack("/admin");
  const sellerId = parseInt(params.id || "0");

  const { data: seller } = trpc.sellers.getById.useQuery({ id: sellerId });
  const { data: salesList } = trpc.sales.list.useQuery({ sellerId });
  const { data: plans } = trpc.actionPlans.list.useQuery({ sellerId });

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">Perfil do Piloto</h1>
        </div>
      </header>

      <div className="container py-6 sm:py-8">
        {/* Profile Header */}
        <div className="racing-card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {seller.photoUrl ? (
              <img src={seller.photoUrl} alt={seller.name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-primary shadow-lg glow-orange" />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-primary-foreground border-4 border-primary shadow-lg">
                {seller.name.charAt(0)}
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="font-heading font-bold text-2xl text-foreground">{seller.name}</h2>
              {seller.nickname && <p className="text-muted-foreground">"{seller.nickname}"</p>}
              {(!seller.department || seller.department === 'vendas' || seller.department === 'pre_vendas') && (
                <div className="flex items-center gap-6 mt-4 justify-center sm:justify-start">
                  <div className="text-center">
                    <p className="font-heading font-bold text-2xl text-primary">{seller.totalSales}</p>
                    <p className="text-xs text-muted-foreground">Vendas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-heading font-bold text-2xl text-primary">{seller.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">Pontos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Sales */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-foreground">VENDAS RECENTES</h3>
            </div>
            {salesList && salesList.filter((s: any) => s.status === 'approved').length > 0 ? (
              <div className="space-y-2">
                {salesList.filter((s: any) => s.status === 'approved').slice(0, 10).map((sale: any) => (
                  <div key={sale.id} className="racing-card p-3 flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{sale.vehicleModel || sale.description || "Venda"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {sale.value ? <p className="text-sm font-semibold text-foreground">R$ {sale.value.toLocaleString("pt-BR")}</p> : null}
                      <p className="text-xs font-heading text-primary">+{sale.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="racing-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhuma venda registrada.</p>
              </div>
            )}
          </div>

          {/* Action Plans */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-foreground">PLANOS DE AÇÃO</h3>
            </div>
            {plans && plans.length > 0 ? (
              <div className="space-y-2">
                {plans.map(plan => (
                  <div key={plan.id} className="racing-card p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Flag className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">{plan.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          plan.status === "completed" ? "bg-green-500/20 text-green-400" :
                          plan.status === "in_progress" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {plan.status === "completed" ? "Concluído" : plan.status === "in_progress" ? "Em andamento" : "Pendente"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 ml-6">{plan.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="racing-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhum plano de ação.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
