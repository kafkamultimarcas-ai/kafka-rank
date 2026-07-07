import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Banknote,
  Calculator,
  Car,
  ChevronRight,
  DollarSign,
  Gift,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("pt-BR");
}

export default function CentralResultados() {
  const [, navigate] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const params = useParams<{ sellerId: string }>();
  const sellerId = parseInt(params.sellerId || "0", 10);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const { data: dashboard, isLoading } = trpc.sellerResults.getDashboard.useQuery(
    { sellerId },
    { enabled: sellerId > 0 },
  );

  // Vendedor logado só pode ver os próprios resultados (gerente vê de qualquer um, igual no backend)
  if (sellerSession && sellerSession.id !== sellerId && sellerSession.sellerRole !== "gerente") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
        <div className="text-center">
          <p className="mb-4 text-red-400">Você não tem permissão para acessar os resultados deste colaborador.</p>
          <Button onClick={() => navigate(buildTenantPath(tenantSlug, `/meus-resultados/${sellerSession.id}`))} variant="outline">
            Ir para meus resultados
          </Button>
        </div>
      </div>
    );
  }

  const monthNames = useMemo(() => ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"], []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="animate-pulse text-center">
          <DollarSign className="mx-auto mb-3 h-12 w-12 animate-bounce text-emerald-400" />
          <p className="text-gray-400">Carregando seus resultados...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
        <div className="text-center">
          <p className="mb-4 text-gray-400">Não foi possível carregar os resultados.</p>
          <Button onClick={() => navigate(buildTenantPath(tenantSlug, `/minha-area/${sellerId}`))} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const topPositionIcons = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pb-8">
      <div className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(buildTenantPath(tenantSlug, `/minha-area/${sellerId}`))}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Central de Resultados</h1>
            <p className="text-xs text-gray-500">
              {monthNames[(dashboard.month || 1) - 1]} / {dashboard.year}
            </p>
          </div>
          <div className="flex gap-1">
            {dashboard.badges?.map((badge: any) => (
              <span key={badge.level} className="text-lg" title={badge.title}>
                {badge.icon}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 to-emerald-900/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-emerald-300">GANHO PREVISTO</h2>
          </div>
          <p className="mb-3 text-3xl font-black text-emerald-400">
            {formatCurrency(dashboard.earnings.netEarnings)}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Ajuda de custo</span>
              <span className="text-emerald-400">{formatCurrency(dashboard.earnings.helpAllowance)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Comissão ({dashboard.salesCount}x {formatCurrency(dashboard.earnings.commissionPerSale)})</span>
              <span className="text-emerald-400">{formatCurrency(dashboard.earnings.totalCommission)}</span>
            </div>
            {dashboard.earnings.bonus > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Bônus meta ({dashboard.earnings.bonusDescription})</span>
                <span className="text-yellow-400">{formatCurrency(dashboard.earnings.bonus)}</span>
              </div>
            )}
            {(dashboard.sellerBonuses?.totalApproved || 0) > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Bônus carros/campanhas</span>
                <span className="text-yellow-400">{formatCurrency(dashboard.sellerBonuses.totalApproved)}</span>
              </div>
            )}
            {dashboard.earnings.totalAdvances > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>(-) Vales/adiantamentos</span>
                <span className="text-red-400">-{formatCurrency(dashboard.earnings.totalAdvances)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-emerald-500/20 pt-1.5 font-bold text-white">
              <span>Líquido previsto</span>
              <span className="text-emerald-400">{formatCurrency(dashboard.earnings.netEarnings)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/60 to-blue-900/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-blue-300">PERFORMANCE</h2>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-4xl font-black text-white">{dashboard.salesCount}</p>
              <p className="text-xs text-gray-400">vendas no mês</p>
            </div>
            {dashboard.performance.goalTarget > 0 && (
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Meta: {dashboard.performance.goalTarget}</span>
                  <span>{dashboard.performance.goalProgress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                    style={{ width: `${Math.min(100, dashboard.performance.goalProgress)}%` }}
                  />
                </div>
                {dashboard.performance.remaining > 0 && (
                  <p className="mt-1 text-[10px] text-blue-400">
                    Faltam {dashboard.performance.remaining} para bater a meta!
                  </p>
                )}
              </div>
            )}
          </div>
          {dashboard.nextBadge && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-800/50 p-2">
              <span className="text-lg opacity-50">{dashboard.nextBadge.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400">Próxima conquista</p>
                <p className="text-xs font-medium text-white">{dashboard.nextBadge.title}</p>
              </div>
              <span className="text-xs font-bold text-blue-400">
                {dashboard.nextBadge.threshold - dashboard.salesCount} vendas
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/60 to-yellow-900/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-amber-300">RANKING</h2>
            <span className="ml-auto text-2xl font-black text-amber-400">#{dashboard.ranking.myPosition}</span>
          </div>
          {dashboard.ranking.gapToLeader > 0 && (
            <p className="mb-2 text-xs text-gray-400">
              {dashboard.ranking.gapToLeader} venda(s) atrás do líder ({dashboard.ranking.leader?.name})
            </p>
          )}
          {dashboard.ranking.myPosition === 1 && (
            <p className="mb-2 text-xs font-bold text-amber-400">Você é o líder! Mantenha o ritmo!</p>
          )}
          <div className="space-y-1.5">
            {dashboard.ranking.top5?.map((entry: any) => (
              <div
                key={entry.sellerId}
                className={`flex items-center gap-2 rounded-lg p-1.5 text-xs ${
                  entry.sellerId === sellerId ? "border border-amber-500/30 bg-amber-500/10" : ""
                }`}
              >
                <span className={`w-5 text-center font-bold ${
                  entry.position === 1 ? "text-amber-400" :
                  entry.position === 2 ? "text-gray-300" :
                  entry.position === 3 ? "text-orange-400" : "text-gray-500"
                }`}>
                  {entry.position <= 3 ? topPositionIcons[entry.position - 1] : `${entry.position}º`}
                </span>
                <span className={`flex-1 ${entry.sellerId === sellerId ? "font-bold text-white" : "text-gray-300"}`}>
                  {entry.name} {entry.sellerId === sellerId && "(você)"}
                </span>
                <span className="font-bold text-white">{entry.salesCount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 to-violet-900/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
              <Calculator className="h-4 w-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-purple-300">SIMULADOR</h2>
          </div>
          <p className="mb-3 text-xs text-gray-400">Se você vender mais...</p>
          <div className="space-y-2">
            {dashboard.simulations?.map((simulation: any) => (
              <div
                key={simulation.extraSales}
                className={`flex items-center gap-3 rounded-lg p-2.5 ${
                  simulation.newTier ? "border border-purple-500/30 bg-purple-500/10" : "bg-gray-800/50"
                }`}
              >
                <div className="text-center">
                  <p className="text-lg font-black text-white">+{simulation.extraSales}</p>
                  <p className="text-[9px] text-gray-500">venda{simulation.extraSales > 1 ? "s" : ""}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(simulation.netEarnings)}</p>
                  {simulation.newTier && <p className="text-[10px] font-medium text-purple-400">Nova faixa de comissão!</p>}
                  {simulation.bonus > 0 && <p className="text-[10px] text-yellow-400">{simulation.bonusDescription}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </div>
            ))}
          </div>
          {dashboard.unlockableBonuses?.length > 0 && (
            <div className="mt-3 border-t border-purple-500/20 pt-3">
              <p className="mb-2 text-[10px] font-semibold text-purple-400">BÔNUS DESBLOQUEÁVEIS</p>
              {dashboard.unlockableBonuses.map((bonus: any, index: number) => (
                <div key={index} className="mb-1 flex items-center gap-2 text-xs text-gray-300">
                  <Gift className="h-3 w-3 text-yellow-400" />
                  <span>+{bonus.remaining} vendas → {formatCurrency(bonus.bonus)}</span>
                  {bonus.description && <span className="text-gray-500">({bonus.description})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {(dashboard.activeCampaigns?.length > 0 || (dashboard.sellerBonuses?.all?.length || 0) > 0) && (
          <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-950/60 to-red-900/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
                <Car className="h-4 w-4 text-orange-400" />
              </div>
              <h2 className="text-sm font-semibold text-orange-300">CAMPANHAS & BÔNUS</h2>
            </div>

            {dashboard.activeCampaigns?.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-[10px] font-semibold text-orange-400">CARROS BÔNUS ATIVOS</p>
                <div className="space-y-2">
                  {dashboard.activeCampaigns.map((campaign: any) => (
                    <div key={campaign.id} className="rounded-lg bg-gray-800/50 p-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{campaign.vehicleModel}</p>
                          {campaign.plate && <p className="text-[10px] text-gray-500">Placa: {campaign.plate}</p>}
                        </div>
                        <span className="text-sm font-black text-emerald-400">{formatCurrency(campaign.bonusAmount)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-400">
                          {campaign.campaignName}
                        </span>
                        <span className="text-[10px] text-gray-500">até {formatDate(campaign.endDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(dashboard.sellerBonuses?.all?.length || 0) > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold text-orange-400">MEUS BÔNUS</p>
                <div className="space-y-1.5">
                  {dashboard.sellerBonuses.all.map((bonus: any) => {
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      pending: { label: "Aguardando", color: "bg-yellow-500/10 text-yellow-400" },
                      approved: { label: "Aprovado", color: "bg-emerald-500/10 text-emerald-400" },
                      rejected: { label: "Recusado", color: "bg-red-500/10 text-red-400" },
                      paid: { label: "Pago", color: "bg-blue-500/10 text-blue-400" },
                    };
                    const status = statusConfig[bonus.status] || statusConfig.pending;

                    return (
                      <div key={bonus.id} className="flex items-center gap-2 rounded-lg bg-gray-800/30 p-2 text-xs">
                        <Gift className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-white">{bonus.description}</p>
                        </div>
                        <span className="flex-shrink-0 font-bold text-emerald-400">{formatCurrency(bonus.amount)}</span>
                        <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] ${status.color}`}>{status.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {dashboard.advances.total > 0 && (
          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/60 to-red-900/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                <Banknote className="h-4 w-4 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-red-300">VALES & ADIANTAMENTOS</h2>
              <span className="ml-auto text-sm font-bold text-red-400">{formatCurrency(dashboard.advances.total)}</span>
            </div>
            <div className="space-y-1.5">
              {dashboard.advances.items?.map((advance: any) => (
                <div key={advance.id} className="flex items-center justify-between rounded-lg bg-gray-800/30 p-2 text-xs">
                  <div>
                    <p className="text-white">{advance.description || "Vale"}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(advance.date)}</p>
                  </div>
                  <span className="font-bold text-red-400">-{formatCurrency(advance.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-600/30 bg-gradient-to-br from-gray-800/80 to-gray-900/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600/20">
              <TrendingUp className="h-4 w-4 text-gray-300" />
            </div>
            <h2 className="text-sm font-semibold text-gray-300">RESUMO FINANCEIRO</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Ajuda de custo</span>
              <span className="text-white">{formatCurrency(dashboard.summary.helpAllowance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Comissão total</span>
              <span className="text-white">{formatCurrency(dashboard.summary.totalCommission)}</span>
            </div>
            {dashboard.summary.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Bônus meta</span>
                <span className="text-yellow-400">{formatCurrency(dashboard.summary.bonus)}</span>
              </div>
            )}
            {(dashboard.sellerBonuses?.totalApproved || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Bônus carros/campanhas</span>
                <span className="text-yellow-400">{formatCurrency(dashboard.sellerBonuses.totalApproved)}</span>
              </div>
            )}
            {dashboard.summary.totalAdvances > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">(-) Vales</span>
                <span className="text-red-400">-{formatCurrency(dashboard.summary.totalAdvances)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-700 pt-2 text-lg font-bold">
              <span className="text-white">TOTAL</span>
              <span className="text-emerald-400">{formatCurrency(dashboard.earnings.netEarnings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
