import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Car, Clock, AlertCircle, Loader2 } from "lucide-react";

export default function AdminApprovals() {
  const { data: pendingSales, isLoading, refetch } = trpc.sales.listPending.useQuery();
  const { data: sellers } = trpc.sellers.list.useQuery();
  const { data: competitions } = trpc.competitions.list.useQuery();
  const approveMutation = trpc.sales.approve.useMutation();
  const rejectMutation = trpc.sales.reject.useMutation();

  const getSeller = (id: number) => sellers?.find(s => s.id === id);
  const getCompetition = (id: number | null) => id ? competitions?.find(c => c.id === id) : null;

  const handleApprove = async (saleId: number) => {
    try {
      await approveMutation.mutateAsync({ id: saleId });
      toast.success("Venda aprovada! Ranking atualizado.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar");
    }
  };

  const handleReject = async (saleId: number) => {
    try {
      await rejectMutation.mutateAsync({ id: saleId });
      toast.info("Venda rejeitada.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-racing tracking-wider">APROVAR VENDAS</h1>
          <p className="text-gray-400 text-sm mt-1">Vendas registradas pelos vendedores aguardando sua aprovação</p>
        </div>
        {pendingSales && pendingSales.length > 0 && (
          <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {pendingSales.length} pendente{pendingSales.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {!pendingSales || pendingSales.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Tudo aprovado!</h3>
            <p className="text-gray-400">Não há vendas pendentes de aprovação no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingSales.map(sale => {
            const seller = getSeller(sale.sellerId);
            const competition = getCompetition(sale.competitionId);
            return (
              <Card key={sale.id} className="bg-gray-900/80 border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Foto do vendedor */}
                    <div className="flex-shrink-0">
                      {seller?.photoUrl ? (
                        <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-yellow-500/50" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-xl">
                          {seller?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info da venda */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{seller?.name || 'Vendedor'}</span>
                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300 mb-1">
                        <Car className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold">{sale.vehicleModel || 'Veículo'}</span>
                      </div>
                      {sale.value && sale.value > 0 && (
                        <p className="text-green-400 font-bold text-lg">
                          R$ {sale.value.toLocaleString("pt-BR")}
                        </p>
                      )}
                      {sale.description && (
                        <p className="text-gray-500 text-sm mt-1">{sale.description}</p>
                      )}
                      {competition && (
                        <p className="text-gray-500 text-xs mt-1">Competição: {competition.name}</p>
                      )}
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(sale.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(sale.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(sale.id)}
                        disabled={rejectMutation.isPending}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
