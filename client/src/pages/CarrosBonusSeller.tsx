import { trpc } from "@/lib/trpc";
import { ArrowLeft, Flame, Calendar, DollarSign, Clock, CheckCircle2, Trophy, Gift } from "lucide-react";
import { useLocation, useParams } from "wouter";

function formatCurrency(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function CarrosBonusSeller() {
  const [, navigate] = useLocation();
  const params = useParams<{ sellerId?: string }>();
  const sellerIdFromUrl = parseInt(params.sellerId || "0");

  // Carros bônus ativos
  const { data: bonusVehicles, isLoading: loadingVehicles } = trpc.sellerResults.listBonusVehicles.useQuery({});

  // Meus bônus (pendentes, aprovados, pagos)
  const sellerId = sellerIdFromUrl;
  const { data: myBonuses, isLoading: loadingBonuses } = trpc.sellerResults.listSellerBonuses.useQuery(
    { sellerId },
    { enabled: sellerId > 0 }
  );

  // Campanhas/competições ativas
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });

  const pendingBonuses = (myBonuses || []).filter((b: any) => b.status === 'pending');
  const approvedBonuses = (myBonuses || []).filter((b: any) => b.status === 'approved');
  const paidBonuses = (myBonuses || []).filter((b: any) => b.status === 'paid');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Flame className="w-5 h-5 text-yellow-400" />
        <h1 className="font-bold text-lg">Carros Bônus & Campanhas</h1>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">

        {/* === CARROS BÔNUS ATIVOS === */}
        <section>
          <h2 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4" /> Carros com Bônus Ativo
          </h2>

          {loadingVehicles ? (
            <div className="text-gray-500 text-sm">Carregando...</div>
          ) : !bonusVehicles?.length ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center text-gray-500">
              Nenhum carro bônus ativo no momento
            </div>
          ) : (
            <div className="space-y-3">
              {bonusVehicles.map((v: any) => (
                <div key={v.id} className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold text-base">🚗 {v.vehicleModel}</p>
                      {v.plate && <p className="text-gray-400 text-xs">Placa: {v.plate}</p>}
                      <p className="text-yellow-400 font-bold text-lg mt-1">
                        Bônus: {formatCurrency(v.bonusAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">
                        {v.campaignName}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(v.startDate)} até {formatDate(v.endDate)}
                    </span>
                  </div>
                  {v.campaignRules && (
                    <p className="mt-2 text-xs text-gray-500 italic">📋 {v.campaignRules}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* === CAMPANHAS / COMPETIÇÕES ATIVAS === */}
        <section>
          <h2 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Campanhas & Competições Ativas
          </h2>

          {!competitions?.length ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center text-gray-500">
              Nenhuma campanha ativa no momento
            </div>
          ) : (
            <div className="space-y-3">
              {competitions.filter((c: any) => c.status === 'active').map((c: any) => (
                <div key={c.id} className="bg-gradient-to-r from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold">{c.name}</p>
                      {c.description && <p className="text-gray-400 text-sm mt-1">{c.description}</p>}
                    </div>
                    <Trophy className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(c.startDate)} até {formatDate(c.endDate)}
                    </span>
                    {c.prize && (
                      <span className="flex items-center gap-1 text-green-400">
                        <Gift className="w-3 h-3" /> {c.prize}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* === MEUS BÔNUS === */}
        <section>
          <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Meus Bônus
          </h2>

          {loadingBonuses ? (
            <div className="text-gray-500 text-sm">Carregando...</div>
          ) : !myBonuses?.length ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center text-gray-500">
              Nenhum bônus registrado ainda. Venda um carro bônus para ganhar!
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pendentes */}
              {pendingBonuses.length > 0 && (
                <div>
                  <p className="text-yellow-400 text-xs font-bold mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Aguardando Aprovação ({pendingBonuses.length})
                  </p>
                  {pendingBonuses.map((b: any) => (
                    <div key={b.id} className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-3 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">{b.description || b.vehicleModel || 'Bônus'}</span>
                        <span className="text-yellow-400 font-bold">{formatCurrency(b.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Aprovados */}
              {approvedBonuses.length > 0 && (
                <div>
                  <p className="text-emerald-400 text-xs font-bold mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Aprovados ({approvedBonuses.length})
                  </p>
                  {approvedBonuses.map((b: any) => (
                    <div key={b.id} className="bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-3 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">{b.description || b.vehicleModel || 'Bônus'}</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(b.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagos */}
              {paidBonuses.length > 0 && (
                <div>
                  <p className="text-blue-400 text-xs font-bold mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Pagos ({paidBonuses.length})
                  </p>
                  {paidBonuses.map((b: any) => (
                    <div key={b.id} className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">{b.description || b.vehicleModel || 'Bônus'}</span>
                        <span className="text-blue-400 font-bold">{formatCurrency(b.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Resumo total */}
        {myBonuses && myBonuses.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Resumo de Bônus</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-yellow-400 font-bold text-lg">
                  {formatCurrency(pendingBonuses.reduce((s: number, b: any) => s + b.amount, 0))}
                </p>
                <p className="text-gray-500 text-xs">Pendente</p>
              </div>
              <div>
                <p className="text-emerald-400 font-bold text-lg">
                  {formatCurrency(approvedBonuses.reduce((s: number, b: any) => s + b.amount, 0))}
                </p>
                <p className="text-gray-500 text-xs">Aprovado</p>
              </div>
              <div>
                <p className="text-blue-400 font-bold text-lg">
                  {formatCurrency(paidBonuses.reduce((s: number, b: any) => s + b.amount, 0))}
                </p>
                <p className="text-gray-500 text-xs">Pago</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
