import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  ArrowLeft,
  LogOut,
  Calendar,
  User,
  Trophy,
  Bell,
  BellRing,
  Car,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Users,
  TrendingUp,
  PlusCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Award, Target } from "lucide-react";

const DEPT_CONFIG: Record<string, { label: string; color: string; icon: any; gradient: string }> = {
  vendas: { label: "Vendas", color: "text-red-400", icon: Car, gradient: "from-red-600/20 to-red-500/10 border-red-500/30" },
  pre_vendas: { label: "Pré-Vendas / SDR", color: "text-purple-400", icon: Phone, gradient: "from-purple-600/20 to-purple-500/10 border-purple-500/30" },
  fei: { label: "F&I", color: "text-amber-400", icon: DollarSign, gradient: "from-amber-600/20 to-amber-500/10 border-amber-500/30" },
  consignacao: { label: "Consignação", color: "text-cyan-400", icon: FileText, gradient: "from-cyan-600/20 to-cyan-500/10 border-cyan-500/30" },
  despachante: { label: "Despachante", color: "text-emerald-400", icon: FileText, gradient: "from-emerald-600/20 to-emerald-500/10 border-emerald-500/30" },
};

function formatDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

export default function MinhaArea() {
  const [, navigate] = useLocation();
  const params = useParams<{ sellerId: string }>();
  const sellerId = parseInt(params.sellerId || "0");

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const { data: seller } = trpc.sellers.getById.useQuery({ id: sellerId }, { enabled: sellerId > 0 });
  const { data: unreadCount } = trpc.notifications.unreadCountSeller.useQuery({ sellerId }, { enabled: sellerId > 0 });
  const { isSupported: pushSupported, isSubscribed, subscribe: subscribePush, permission } = usePushNotifications();

  const dept = sellerSession?.department || "vendas";
  const deptInfo = DEPT_CONFIG[dept] || DEPT_CONFIG.vendas;

  // Buscar dados específicos do setor
  const { data: appointments } = trpc.sdr.myAppointments.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && (dept === "vendas" || dept === "pre_vendas") }
  );
  const { data: mySales } = trpc.sales.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "vendas" }
  );
  const { data: myFei } = trpc.fei.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "fei" }
  );
  const { data: myConsignment } = trpc.consignment.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "consignacao" }
  );
  const { data: myDispatch } = trpc.dispatch.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "despachante" }
  );

  // Buscar metas individuais do vendedor logado (só retorna a dele por causa da proteção no backend)
  const now = useMemo(() => new Date(), []);
  const { data: myGoals } = trpc.goals.list.useQuery(
    { month: now.getMonth() + 1, year: now.getFullYear() },
    { enabled: sellerId > 0 }
  );
  const individualGoals = useMemo(() => (myGoals || []).filter((g: any) => g.type === 'individual' && g.sellerId === sellerId), [myGoals, sellerId]);

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
          <p className="text-red-400 mb-4">Você não tem permissão para acessar os dados deste colaborador.</p>
          <Button onClick={() => navigate(`/minha-area/${sellerSession.id}`)} className="bg-red-600 hover:bg-red-500">
            Ir para minha área
          </Button>
        </div>
      </div>
    );
  }

  // Stats por setor
  const activeAppointments = (appointments || []).filter((a: any) => a.status === 'approved' && a.attendanceStatus === 'pending');
  const pendingApproval = (appointments || []).filter((a: any) => a.attendanceStatus === 'attended');
  const totalAppointments = (appointments || []).length;

  const approvedSales = (mySales || []).filter((s: any) => s.status === 'approved');
  const pendingSales = (mySales || []).filter((s: any) => s.status === 'pending');

  const approvedFei = (myFei || []).filter((r: any) => r.status === 'approved');
  const pendingFei = (myFei || []).filter((r: any) => r.status === 'pending');

  const approvedConsignment = (myConsignment || []).filter((r: any) => r.status === 'approved');
  const pendingConsignment = (myConsignment || []).filter((r: any) => r.status === 'pending');
  const activeConsignment = (myConsignment || []).filter((r: any) => r.status === 'approved' && !r.exitDate);

  const approvedDispatch = (myDispatch || []).filter((r: any) => r.status === 'approved');
  const pendingDispatch = (myDispatch || []).filter((r: any) => r.status === 'pending');

  const DeptIcon = deptInfo.icon;

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
              <p className={`text-xs ${deptInfo.color}`}>{deptInfo.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pushSupported && !isSubscribed && permission !== "denied" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) toast.success("Notificações ativadas!");
                }}
                className="text-yellow-500 hover:text-yellow-400"
              >
                <Bell className="w-4 h-4" />
              </Button>
            )}
            {isSubscribed && <BellRing className="w-4 h-4 text-emerald-500" />}
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
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Stats Cards - variam por setor */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <DeptIcon className={`w-5 h-5 ${deptInfo.color} mx-auto mb-1`} />
            <p className="text-2xl font-black text-white">
              {dept === "vendas" ? approvedSales.length :
               dept === "fei" ? approvedFei.length :
               dept === "consignacao" ? approvedConsignment.length :
               dept === "despachante" ? approvedDispatch.length :
               totalAppointments}
            </p>
            <p className="text-xs text-gray-500">
              {dept === "vendas" ? "Vendas" :
               dept === "fei" ? "Fichas" :
               dept === "consignacao" ? "Consignações" :
               dept === "despachante" ? "Documentos" :
               "Agendamentos"}
            </p>
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

        {/* Meta Individual */}
        {individualGoals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" /> Minha Meta do Mês
            </h2>
            {individualGoals.map((goal: any) => {
              const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
              return (
                <div key={goal.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase font-semibold">{goal.category}</span>
                    {goal.achieved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                        <Award className="w-3 h-3" /> META BATIDA!
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <span className="font-bold text-3xl text-white">{goal.currentValue}</span>
                      <span className="text-gray-500 text-lg">/{goal.targetValue}</span>
                    </div>
                    <span className={`text-lg font-bold ${pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${goal.achieved ? 'bg-emerald-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {goal.bonusDescription && (
                    <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Bônus: {goal.bonusDescription}
                      {goal.bonusValue ? ` — R$ ${goal.bonusValue.toLocaleString('pt-BR')}` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pendentes */}
        {dept === "vendas" && pendingSales.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Vendas aguardando aprovação ({pendingSales.length})
            </h3>
            {pendingSales.slice(0, 5).map((s: any) => (
              <div key={s.id} className="text-sm text-gray-300 py-1 flex justify-between">
                <span>{s.vehicleModel}</span>
                <span className="text-gray-500">{formatCurrency(s.value)}</span>
              </div>
            ))}
          </div>
        )}

        {dept === "fei" && pendingFei.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Fichas F&I aguardando aprovação ({pendingFei.length})
            </h3>
            {pendingFei.slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-sm text-gray-300 py-1 flex justify-between">
                <span>{r.bankName} - {r.returnType}</span>
                <span className="text-gray-500">{formatCurrency(r.financedValue)}</span>
              </div>
            ))}
          </div>
        )}

        {dept === "consignacao" && pendingConsignment.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Consignações aguardando aprovação ({pendingConsignment.length})
            </h3>
            {pendingConsignment.slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-sm text-gray-300 py-1 flex justify-between">
                <span>{r.vehicleModel} - {r.vehiclePlate}</span>
                <span className="text-gray-500">{formatDate(r.entryDate)}</span>
              </div>
            ))}
          </div>
        )}

        {dept === "consignacao" && activeConsignment.length > 0 && (
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-cyan-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Car className="w-4 h-4" /> Veículos no pátio ({activeConsignment.length})
            </h3>
            {activeConsignment.map((r: any) => {
              const entryDate = new Date(r.entryDate);
              const daysSince = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysSince > 7;
              return (
                <div key={r.id} className="text-sm py-2 border-b border-gray-800 last:border-0">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">{r.vehicleModel}</span>
                    <span className={`text-xs font-bold ${isOverdue ? 'text-red-400' : 'text-cyan-400'}`}>
                      {daysSince} dias
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                    <span>Placa: {r.vehiclePlate || 'N/I'}</span>
                    <span>Entrada: {formatDate(r.entryDate)}</span>
                  </div>
                  {isOverdue && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Passou dos 7 dias!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dept === "despachante" && pendingDispatch.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Documentos aguardando aprovação ({pendingDispatch.length})
            </h3>
            {pendingDispatch.slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-sm text-gray-300 py-1 flex justify-between">
                <span>{r.documentType}</span>
                <span className="text-gray-500">{r.vehiclePlate || 'N/I'}</span>
              </div>
            ))}
          </div>
        )}

        {(dept === "vendas" || dept === "pre_vendas") && pendingApproval.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Comparecimento aguardando aprovação ({pendingApproval.length})
            </h3>
            {pendingApproval.map((apt: any) => (
              <div key={apt.id} className="text-sm text-gray-300 py-1">
                {apt.customerName} - {apt.ticketNumber}
              </div>
            ))}
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ações Rápidas</h2>

          {/* Agendamentos - para Vendas e Pré-Vendas */}
          {(dept === "vendas" || dept === "pre_vendas") && (
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
                    ? `${activeAppointments.length} ativo(s)`
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
          )}

          {/* Registrar - botão específico por setor */}
          <button
            onClick={() => navigate("/registrar-venda")}
            className={`w-full bg-gradient-to-r ${deptInfo.gradient} rounded-xl p-4 flex items-center gap-4 hover:opacity-80 transition-all`}
          >
            <div className={`w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center`}>
              <PlusCircle className={`w-6 h-6 ${deptInfo.color}`} />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">
                {dept === "vendas" ? "Registrar Venda" :
                 dept === "fei" ? "Registrar F&I" :
                 dept === "consignacao" ? "Registrar Consignação" :
                 dept === "despachante" ? "Registrar Documento" :
                 "Registrar Agendamento"}
              </p>
              <p className="text-gray-400 text-sm">Enviar para aprovação do gerente</p>
            </div>
          </button>

          {/* Ver Ranking */}
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

        {/* Histórico de registros aprovados */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Meu Histórico
          </h2>

          {dept === "vendas" && approvedSales.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
              {approvedSales.slice(0, 10).map((s: any) => (
                <div key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{s.vehicleModel}</p>
                    <p className="text-xs text-gray-500">{formatDate(s.createdAt)} {s.leadSource ? `• ${s.leadSource === 'lead_loja' ? 'Lead Loja' : 'Lead Vendedor'}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-400 font-bold">{formatCurrency(s.value)}</p>
                    <p className="text-xs text-yellow-500">+{s.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dept === "fei" && approvedFei.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
              {approvedFei.slice(0, 10).map((r: any) => (
                <div key={r.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{r.bankName}</p>
                    <p className="text-xs text-gray-500">{r.returnType} • {formatDate(r.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-400 font-bold">{formatCurrency(r.financedValue)}</p>
                    <p className="text-xs text-yellow-500">+{r.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dept === "consignacao" && approvedConsignment.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
              {approvedConsignment.slice(0, 10).map((r: any) => (
                <div key={r.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{r.vehicleModel}</p>
                    <p className="text-xs text-gray-500">Placa: {r.vehiclePlate || 'N/I'} • {formatDate(r.entryDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-yellow-500">+{r.points} pts</p>
                    {r.exitDate ? (
                      <p className="text-xs text-emerald-400">Saiu: {formatDate(r.exitDate)}</p>
                    ) : (
                      <p className="text-xs text-cyan-400">No pátio</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {dept === "despachante" && approvedDispatch.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
              {approvedDispatch.slice(0, 10).map((r: any) => (
                <div key={r.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{r.documentType}</p>
                    <p className="text-xs text-gray-500">Placa: {r.vehiclePlate || 'N/I'} • {formatDate(r.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-yellow-500">+{r.points + (r.bonusPoints || 0)} pts</p>
                    {r.customerPaid && <p className="text-xs text-emerald-400">Bônus!</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {dept === "pre_vendas" && (appointments || []).length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
              {(appointments || []).slice(0, 10).map((a: any) => (
                <div key={a.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{a.customerName}</p>
                    <p className="text-xs text-gray-500">{a.ticketNumber} • {formatDate(a.scheduledDate)}</p>
                  </div>
                  <div className="text-right">
                    {a.attendanceStatus === 'approved' ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Compareceu</span>
                    ) : a.attendanceStatus === 'no_show' ? (
                      <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Não veio</span>
                    ) : a.attendanceStatus === 'attended' ? (
                      <span className="text-xs text-orange-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Aguardando</span>
                    ) : (
                      <span className="text-xs text-gray-500">Agendado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mensagem quando não tem histórico */}
          {((dept === "vendas" && approvedSales.length === 0) ||
            (dept === "fei" && approvedFei.length === 0) ||
            (dept === "consignacao" && approvedConsignment.length === 0) ||
            (dept === "despachante" && approvedDispatch.length === 0) ||
            (dept === "pre_vendas" && (appointments || []).length === 0)) && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
              <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum registro ainda. Comece registrando!</p>
            </div>
          )}
        </div>

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
