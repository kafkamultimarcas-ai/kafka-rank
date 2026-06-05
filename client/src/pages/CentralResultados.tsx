import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Trophy, Target, Calculator, Banknote, DollarSign, Gift, Car, Calendar, ChevronRight, Star, Crown, Medal, Award } from "lucide-react";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR');
}

export default function CentralResultados() {
  const [, navigate] = useLocation();
  const params = useParams<{ sellerId: string }>();
  const sellerId = parseInt(params.sellerId || "0");
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const { data: dashboard, isLoading } = trpc.sellerResults.getDashboard.useQuery(
    { sellerId },
    { enabled: sellerId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <DollarSign className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
          <p className="text-gray-400">Carregando seus resultados...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Não foi possível carregar os resultados.</p>
          <Button onClick={() => navigate(`/minha-area/${sellerId}`)} variant="outline">Voltar</Button>
        </div>
      </div>
    );
  }

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Central de Resultados</h1>
            <p className="text-xs text-gray-500">{monthNames[(dashboard.month || 1) - 1]} / {dashboard.year}</p>
          </div>
          {/* Badges */}
          <div className="flex gap-1">
            {dashboard.badges?.map((b: any) => (
              <span key={b.level} className="text-lg" title={b.title}>{b.icon}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* CARD 1 - GANHO PREVISTO (destaque principal) */}
        <div className="bg-gradient-to-br from-emerald-950/80 to-emerald-900/40 border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-emerald-300">GANHO PREVISTO</h2>
          </div>
          <p className="text-3xl font-black text-emerald-400 mb-3">
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
                <span>(-) Vales/Adiantamentos</span>
                <span className="text-red-400">-{formatCurrency(dashboard.earnings.totalAdvances)}</span>
              </div>
            )}
            <div className="border-t border-emerald-500/20 pt-1.5 flex justify-between font-bold text-white">
              <span>Líquido previsto</span>
              <span className="text-emerald-400">{formatCurrency(dashboard.earnings.netEarnings)}</span>
            </div>
          </div>
        </div>

        {/* CARD 2 - PERFORMANCE + META */}
        <div className="bg-gradient-to-br from-blue-950/60 to-blue-900/30 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-400" />
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
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Meta: {dashboard.performance.goalTarget}</span>
                  <span>{dashboard.performance.goalProgress}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, dashboard.performance.goalProgress)}%` }}
                  />
                </div>
                {dashboard.performance.remaining > 0 && (
                  <p className="text-[10px] text-blue-400 mt-1">Faltam {dashboard.performance.remaining} para bater a meta!</p>
                )}
              </div>
            )}
          </div>
          {/* Próxima medalha */}
          {dashboard.nextBadge && (
            <div className="mt-3 bg-gray-800/50 rounded-lg p-2 flex items-center gap-2">
              <span className="text-lg opacity-50">{dashboard.nextBadge.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400">Próxima conquista</p>
                <p className="text-xs text-white font-medium">{dashboard.nextBadge.title}</p>
              </div>
              <span className="text-xs text-blue-400 font-bold">{dashboard.nextBadge.threshold - dashboard.salesCount} vendas</span>
            </div>
          )}
        </div>

        {/* CARD 3 - RANKING */}
        <div className="bg-gradient-to-br from-amber-950/60 to-yellow-900/30 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-amber-300">RANKING</h2>
            <span className="ml-auto text-2xl font-black text-amber-400">#{dashboard.ranking.myPosition}</span>
          </div>
          {dashboard.ranking.gapToLeader > 0 && (
            <p className="text-xs text-gray-400 mb-2">
              {dashboard.ranking.gapToLeader} venda(s) atrás do líder ({dashboard.ranking.leader?.name})
            </p>
          )}
          {dashboard.ranking.myPosition === 1 && (
            <p className="text-xs text-amber-400 font-bold mb-2">Você é o líder! Mantenha o ritmo!</p>
          )}
          <div className="space-y-1.5">
            {dashboard.ranking.top5?.map((r: any) => (
              <div key={r.sellerId} className={`flex items-center gap-2 text-xs p-1.5 rounded-lg ${r.sellerId === sellerId ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
                <span className={`w-5 text-center font-bold ${r.position === 1 ? 'text-amber-400' : r.position === 2 ? 'text-gray-300' : r.position === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                  {r.position <= 3 ? ['🥇', '🥈', '🥉'][r.position - 1] : `${r.position}º`}
                </span>
                <span className={`flex-1 ${r.sellerId === sellerId ? 'text-white font-bold' : 'text-gray-300'}`}>
                  {r.name} {r.sellerId === sellerId && '(você)'}
                </span>
                <span className="font-bold text-white">{r.salesCount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 4 - SIMULADOR */}
        <div className="bg-gradient-to-br from-purple-950/60 to-violet-900/30 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-purple-300">SIMULADOR</h2>
          </div>
          <p className="text-xs text-gray-400 mb-3">Se você vender mais...</p>
          <div className="space-y-2">
            {dashboard.simulations?.map((sim: any) => (
              <div key={sim.extraSales} className={`flex items-center gap-3 p-2.5 rounded-lg ${sim.newTier ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-gray-800/50'}`}>
                <div className="text-center">
                  <p className="text-lg font-black text-white">+{sim.extraSales}</p>
                  <p className="text-[9px] text-gray-500">venda{sim.extraSales > 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(sim.netEarnings)}</p>
                  {sim.newTier && <p className="text-[10px] text-purple-400 font-medium">Nova faixa de comissão!</p>}
                  {sim.bonus > 0 && <p className="text-[10px] text-yellow-400">{sim.bonusDescription}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            ))}
          </div>
          {/* Bônus desbloqueáveis */}
          {dashboard.unlockableBonuses?.length > 0 && (
            <div className="mt-3 border-t border-purple-500/20 pt-3">
              <p className="text-[10px] text-purple-400 font-semibold mb-2">BÔNUS DESBLOQUEÁVEIS</p>
              {dashboard.unlockableBonuses.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                  <Gift className="w-3 h-3 text-yellow-400" />
                  <span>+{b.remaining} vendas → {formatCurrency(b.bonus)}</span>
                  {b.description && <span className="text-gray-500">({b.description})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 5 - CAMPANHAS ATIVAS & CARROS BÔNUS */}
        {(dashboard.activeCampaigns?.length > 0 || (dashboard.sellerBonuses?.all?.length || 0) > 0) && (
          <div className="bg-gradient-to-br from-orange-950/60 to-red-900/30 border border-orange-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Car className="w-4 h-4 text-orange-400" />
              </div>
              <h2 className="text-sm font-semibold text-orange-300">CAMPANHAS & BÔNUS</h2>
            </div>

            {/* Campanhas ativas */}
            {dashboard.activeCampaigns?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-orange-400 font-semibold mb-2">CARROS BÔNUS ATIVOS</p>
                <div className="space-y-2">
                  {dashboard.activeCampaigns.map((c: any) => (
                    <div key={c.id} className="bg-gray-800/50 rounded-lg p-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{c.vehicleModel}</p>
                          {c.plate && <p className="text-[10px] text-gray-500">Placa: {c.plate}</p>}
                        </div>
                        <span className="text-sm font-black text-emerald-400">{formatCurrency(c.bonusAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{c.campaignName}</span>
                        <span className="text-[10px] text-gray-500">até {formatDate(c.endDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meus bônus */}
            {(dashboard.sellerBonuses?.all?.length || 0) > 0 && (
              <div>
                <p className="text-[10px] text-orange-400 font-semibold mb-2">MEUS BÔNUS</p>
                <div className="space-y-1.5">
                  {dashboard.sellerBonuses.all.map((b: any) => {
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      pending: { label: 'Aguardando', color: 'text-yellow-400 bg-yellow-500/10' },
                      approved: { label: 'Aprovado', color: 'text-emerald-400 bg-emerald-500/10' },
                      rejected: { label: 'Recusado', color: 'text-red-400 bg-red-500/10' },
                      paid: { label: 'Pago', color: 'text-blue-400 bg-blue-500/10' },
                    };
                    const st = statusConfig[b.status] || statusConfig.pending;
                    return (
                      <div key={b.id} className="flex items-center gap-2 text-xs bg-gray-800/30 rounded-lg p-2">
                        <Gift className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate">{b.description}</p>
                        </div>
                        <span className="font-bold text-emerald-400 shrink-0">{formatCurrency(b.amount)}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${st.color} shrink-0`}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARD 6 - VALES/ADIANTAMENTOS */}
        {dashboard.advances.total > 0 && (
          <div className="bg-gradient-to-br from-red-950/60 to-red-900/30 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-red-300">VALES & ADIANTAMENTOS</h2>
              <span className="ml-auto text-sm font-bold text-red-400">{formatCurrency(dashboard.advances.total)}</span>
            </div>
            <div className="space-y-1.5">
              {dashboard.advances.items?.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-xs bg-gray-800/30 rounded-lg p-2">
                  <div>
                    <p className="text-white">{a.description || 'Vale'}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(a.date)}</p>
                  </div>
                  <span className="text-red-400 font-bold">-{formatCurrency(a.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CARD RESUMO FINAL */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/60 border border-gray-600/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-600/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gray-300" />
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
            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-lg">
              <span className="text-white">TOTAL</span>
              <span className="text-emerald-400">{formatCurrency(dashboard.earnings.netEarnings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
