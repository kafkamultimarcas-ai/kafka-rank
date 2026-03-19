import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  LogOut,
  Calendar,
  User,
  Trophy,
  Bell,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

export default function MinhaArea() {
  const [, navigate] = useLocation();
  const params = useParams<{ sellerId: string }>();
  const sellerId = parseInt(params.sellerId || "0");

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const { data: seller } = trpc.sellers.getById.useQuery({ id: sellerId }, { enabled: sellerId > 0 });
  const { data: appointments } = trpc.sdr.myAppointments.useQuery({ sellerId }, { enabled: sellerId > 0 });
  const { data: unreadCount } = trpc.notifications.unreadCountSeller.useQuery({ sellerId }, { enabled: sellerId > 0 });

  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => {
      toast.success("Logout realizado!");
      navigate("/login-vendedor");
    },
  });

  // Verificar se o vendedor logado é o mesmo do URL
  const isAuthorized = sellerSession && sellerSession.id === sellerId;

  if (!sellerSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Você precisa fazer login para acessar esta área.</p>
          <Button onClick={() => navigate("/login-vendedor")} className="bg-red-600 hover:bg-red-500">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Você não tem permissão para acessar os dados deste vendedor.</p>
          <Button onClick={() => navigate(`/minha-area/${sellerSession.id}`)} className="bg-red-600 hover:bg-red-500">
            Ir para minha área
          </Button>
        </div>
      </div>
    );
  }

  const activeAppointments = (appointments || []).filter((a: any) => a.status === 'approved' && a.attendanceStatus === 'pending');
  const pendingApproval = (appointments || []).filter((a: any) => a.attendanceStatus === 'attended');
  const totalAppointments = (appointments || []).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {seller?.photoUrl ? (
              <img src={seller.photoUrl} alt={seller.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center ring-2 ring-red-500">
                <User className="w-5 h-5 text-red-400" />
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm">{seller?.nickname || seller?.name}</p>
              <p className="text-gray-500 text-xs">Área do Vendedor</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            className="text-gray-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{totalAppointments}</p>
            <p className="text-xs text-gray-500">Agendamentos</p>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{seller?.totalPoints || 0}</p>
            <p className="text-xs text-gray-500">Pontos</p>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <Bell className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{unreadCount?.count || 0}</p>
            <p className="text-xs text-gray-500">Notificações</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ações Rápidas</h2>
          
          <button
            onClick={() => navigate(`/agendamentos/${sellerId}`)}
            className="w-full bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/60 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">Meus Agendamentos</p>
              <p className="text-gray-400 text-sm">
                {activeAppointments.length > 0
                  ? `${activeAppointments.length} agendamento(s) ativo(s)`
                  : "Ver e criar agendamentos"
                }
              </p>
            </div>
            {activeAppointments.length > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {activeAppointments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate(`/registrar-venda`)}
            className="w-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/60 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">Registrar Venda</p>
              <p className="text-gray-400 text-sm">Registrar venda, F&I, consignação...</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-yellow-500/60 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">Ver Ranking</p>
              <p className="text-gray-400 text-sm">Confira sua posição na competição</p>
            </div>
          </button>
        </div>

        {/* Pending Approval */}
        {pendingApproval.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2">
              Aguardando aprovação do gerente ({pendingApproval.length})
            </h3>
            {pendingApproval.map((apt: any) => (
              <div key={apt.id} className="text-sm text-gray-300 py-1">
                {apt.customerName} - {apt.ticketNumber}
              </div>
            ))}
          </div>
        )}

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mx-auto"
        >
          <ArrowLeft className="w-3 h-3" /> Voltar ao ranking
        </button>
      </div>
    </div>
  );
}
