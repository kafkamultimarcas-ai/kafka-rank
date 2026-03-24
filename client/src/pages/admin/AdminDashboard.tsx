import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Users, Trophy, ShoppingCart, TrendingUp, Sparkles, Wrench, Banknote, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import MonthFilter, { filterByMonth } from "@/components/MonthFilter";

export default function AdminDashboard() {
  const { data: sellers } = trpc.sellers.list.useQuery({});
  const { data: competitions } = trpc.competitions.list.useQuery({});
  const { data: quote } = trpc.quotes.latest.useQuery();
  const { data: allSales } = trpc.sales.list.useQuery({});
  const { data: allFei } = trpc.fei.list.useQuery({});
  const pvChamados = trpc.pvChamados.list.useQuery({});
  const pvGastosResumo = trpc.pvGastos.resumo.useQuery();
  const utils = trpc.useUtils();

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

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
  const vendedores = activeSellers.filter(s => !s.department || s.department === 'vendas');

  // Filtrar dados por mês
  const salesThisMonth = useMemo(() => {
    return filterByMonth(allSales || [], filterMonth, filterYear, 'createdAt' as any);
  }, [allSales, filterMonth, filterYear]);

  const feiThisMonth = useMemo(() => {
    return filterByMonth(allFei || [], filterMonth, filterYear, 'createdAt' as any);
  }, [allFei, filterMonth, filterYear]);

  const pvThisMonth = useMemo(() => {
    return filterByMonth(pvChamados.data || [], filterMonth, filterYear, 'createdAt' as any);
  }, [pvChamados.data, filterMonth, filterYear]);

  const salesApproved = salesThisMonth.filter((s: any) => s.status === "approved").length;
  const salesPending = salesThisMonth.filter((s: any) => s.status === "pending").length;
  const feiApproved = feiThisMonth.filter((f: any) => f.status === "approved").length;
  const feiPending = feiThisMonth.filter((f: any) => f.status === "pending").length;
  const pvAbertos = pvThisMonth.filter((c: any) => c.status === "aberto").length;
  const pvEmServico = pvThisMonth.filter((c: any) => c.status === "em_servico").length;
  const pvFinalizados = pvThisMonth.filter((c: any) => c.status === "finalizado" || c.status === "entregue").length;

  const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral — {MONTH_NAMES[filterMonth]} {filterYear}</p>
          </div>
          <MonthFilter
            month={filterMonth}
            year={filterYear}
            onChange={(m, y) => { setFilterMonth(m); setFilterYear(y); }}
          />
        </div>

        {/* Stats Grid - Resumo do Mês */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="racing-card p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              <span className="text-xs text-muted-foreground font-medium">VENDAS</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{salesApproved}</p>
            <p className="text-xs text-muted-foreground">aprovadas no mês</p>
            {salesPending > 0 && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {salesPending} pendentes
              </p>
            )}
          </div>
          <div className="racing-card p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-5 w-5 text-amber-400" />
              <span className="text-xs text-muted-foreground font-medium">F&I</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{feiApproved}</p>
            <p className="text-xs text-muted-foreground">aprovados no mês</p>
            {feiPending > 0 && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {feiPending} pendentes
              </p>
            )}
          </div>
          <div className="racing-card p-4 border-l-4 border-l-orange-500">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-orange-400" />
              <span className="text-xs text-muted-foreground font-medium">PÓS-VENDA</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{pvThisMonth.length}</p>
            <p className="text-xs text-muted-foreground">chamados no mês</p>
            {pvAbertos > 0 && (
              <p className="text-xs text-blue-400 mt-1">{pvAbertos} abertos | {pvEmServico} em serviço</p>
            )}
          </div>
          <div className="racing-card p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-emerald-400" />
              <span className="text-xs text-muted-foreground font-medium">EQUIPE</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{vendedores.length}</p>
            <p className="text-xs text-muted-foreground">colaboradores ativos</p>
            <p className="text-xs text-emerald-400 mt-1">{activeSellers.length} total na equipe</p>
          </div>
        </div>

        {/* Competições */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="racing-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-sm text-foreground">COMPETIÇÕES ATIVAS</h2>
            </div>
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
        </div>

        {/* Top Sellers do Mês */}
        <div className="racing-card p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-4">TOP EQUIPE — {MONTH_NAMES[filterMonth].toUpperCase()}</h2>
          {vendedores.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                // Contar vendas aprovadas por vendedor no mês selecionado
                const salesByVendedor: Record<number, number> = {};
                salesThisMonth.filter((s: any) => s.status === "approved").forEach((s: any) => {
                  salesByVendedor[s.sellerId] = (salesByVendedor[s.sellerId] || 0) + 1;
                });
                return [...vendedores]
                  .map(v => ({ ...v, monthSales: salesByVendedor[v.id] || 0 }))
                  .sort((a, b) => b.monthSales - a.monthSales)
                  .slice(0, 5)
                  .map((seller, idx) => (
                    <div key={seller.id} className="flex items-center gap-3">
                      <span className={`font-heading font-bold text-sm w-6 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>{idx + 1}</span>
                      {seller.photoUrl ? (
                        <img src={seller.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                          {seller.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{seller.nickname || seller.name}</p>
                        <p className="text-xs text-muted-foreground">{seller.monthSales} vendas no mês</p>
                      </div>
                      <span className="font-heading font-bold text-sm text-primary">{seller.monthSales}</span>
                    </div>
                  ));
              })()}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum vendedor cadastrado.</p>
          )}
        </div>

        {/* Competições Encerradas */}
        {finishedComps.length > 0 && (
          <div className="racing-card p-5">
            <h2 className="font-heading font-bold text-sm text-foreground mb-3">COMPETIÇÕES ENCERRADAS</h2>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
