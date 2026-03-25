import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import IAMFloatingButton from "@/components/IAMFloatingButton";
import {
  CalendarPlus,
  ArrowLeft,
  Phone,
  Mail,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Plus,
  Calendar,
  Hash,
  User,
  FileText,
  RotateCcw,
  MessageCircle,
  Timer,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/20", icon: Clock },
  approved: { label: "Ativo", color: "text-emerald-400 bg-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-400 bg-red-500/20", icon: XCircle },
};

const ATTENDANCE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Aguardando", color: "text-gray-400 bg-gray-500/20", icon: Clock },
  attended: { label: "Compareceu (aguardando gerente)", color: "text-blue-400 bg-blue-500/20", icon: UserCheck },
  approved: { label: "Comparecimento confirmado", color: "text-emerald-400 bg-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Comparecimento rejeitado", color: "text-red-400 bg-red-500/20", icon: XCircle },
  no_show: { label: "Não compareceu", color: "text-orange-400 bg-orange-500/20", icon: AlertCircle },
};

// Countdown hook
function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function formatCountdown(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((abs % (1000 * 60)) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min ${seconds}s`;
  return `${minutes}min ${seconds}s`;
}

type AppointmentStatus = "upcoming" | "arriving_soon" | "expected_now" | "overdue" | "no_show" | "rescue_48h" | "attended" | "confirmed" | "past";

function getAppointmentVisualStatus(apt: any, now: number): AppointmentStatus {
  // If already has a final attendance status
  if (apt.attendanceStatus === "approved") return "confirmed";
  if (apt.attendanceStatus === "attended") return "attended";
  if (apt.attendanceStatus === "no_show") return "no_show";

  if (!apt.scheduledDate) return "upcoming";
  const scheduled = Number(apt.scheduledDate);
  const diff = scheduled - now;
  const oneHour = 60 * 60 * 1000;
  const thirtyMin = 30 * 60 * 1000;

  if (diff > thirtyMin) return "upcoming"; // mais de 30min
  if (diff > 0) return "arriving_soon"; // menos de 30min, ainda não chegou
  if (diff > -oneHour) return "expected_now"; // horário passou, dentro de 1h
  const fortyEightHours = 48 * 60 * 60 * 1000;
  if (diff > -fortyEightHours) return "overdue"; // passou mais de 1h mas menos de 48h
  return "rescue_48h"; // passou mais de 48h → resgate urgente
}

const VISUAL_STATUS_CONFIG: Record<AppointmentStatus, { label: string; border: string; bg: string; textColor: string; pulse?: boolean }> = {
  upcoming: { label: "", border: "border-border", bg: "", textColor: "" },
  arriving_soon: { label: "CHEGANDO EM BREVE", border: "border-yellow-500", bg: "bg-yellow-500/10", textColor: "text-yellow-400", pulse: true },
  expected_now: { label: "CLIENTE ESPERADO AGORA", border: "border-amber-500 border-2", bg: "bg-amber-500/15", textColor: "text-amber-400", pulse: true },
  overdue: { label: "NÃO COMPARECEU", border: "border-red-500 border-2", bg: "bg-red-500/10", textColor: "text-red-400" },
  no_show: { label: "NÃO COMPARECEU - TENTE RESGATE", border: "border-orange-500 border-2", bg: "bg-orange-500/10", textColor: "text-orange-400" },
  rescue_48h: { label: "RESGATE URGENTE (48h+)", border: "border-red-600 border-2", bg: "bg-red-600/15", textColor: "text-red-400", pulse: true },
  attended: { label: "COMPARECEU - AGUARDANDO GERENTE", border: "border-blue-500", bg: "bg-blue-500/10", textColor: "text-blue-400" },
  confirmed: { label: "COMPARECIMENTO CONFIRMADO", border: "border-emerald-500", bg: "bg-emerald-500/10", textColor: "text-emerald-400" },
  past: { label: "", border: "border-border opacity-60", bg: "", textColor: "" },
};

export default function MeusAgendamentos() {
  const params = useParams<{ sellerId: string }>();
  const sellerId = parseInt(params.sellerId || "0");
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const now = useCountdown();

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: seller } = trpc.sellers.getById.useQuery({ id: sellerId }, { enabled: sellerId > 0 });
  const { data: appointments, isLoading } = trpc.sdr.myAppointments.useQuery({ sellerId }, { enabled: sellerId > 0, refetchInterval: 10000 });
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const utils = trpc.useUtils();

  const createAppointment = trpc.sdr.createAppointment.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.sdr.myAppointments.invalidate();
      resetForm();
      setShowForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const markAttendance = trpc.sdr.markAttendancePublic.useMutation({
    onSuccess: () => {
      toast.success("Comparecimento registrado! Aguardando aprovação do gerente.");
      utils.sdr.myAppointments.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reschedule = trpc.sdr.reschedule.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.sdr.myAppointments.invalidate();
      setRescheduleId(null);
      setRescheduleDate("");
      setRescheduleNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  const preVendasComp = useMemo(() => {
    return competitions?.find(c => c.category === "pre_vendas" && c.status === "active");
  }, [competitions]);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setVehicleInterest("");
    setScheduledDate("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    createAppointment.mutate({
      sellerId,
      competitionId: preVendasComp?.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      vehicleInterest: vehicleInterest.trim() || undefined,
      scheduledDate: scheduledDate ? new Date(scheduledDate).getTime() : undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleReschedule = (id: number) => {
    if (!rescheduleDate) {
      toast.error("Selecione a nova data/hora");
      return;
    }
    reschedule.mutate({
      id,
      sellerId,
      newDate: new Date(rescheduleDate).getTime(),
      notes: rescheduleNotes.trim() || undefined,
    });
  };

  // Separate and sort appointments
  const agendamentos = useMemo(() => {
    return (appointments || []).filter((a: any) => a.type === "agendamento");
  }, [appointments]);

  // Categorize appointments
  const categorized = useMemo(() => {
    const active: any[] = [];
    const noShow: any[] = [];
    const completed: any[] = [];

    agendamentos.forEach((apt: any) => {
      const vs = getAppointmentVisualStatus(apt, now);
      if (vs === "no_show" || vs === "overdue" || vs === "rescue_48h") {
        noShow.push(apt);
      } else if (vs === "confirmed") {
        completed.push(apt);
      } else if (apt.status === "rejected") {
        completed.push(apt);
      } else {
        active.push(apt);
      }
    });

    // Sort active: arriving_soon and expected_now first
    active.sort((a: any, b: any) => {
      const aDate = a.scheduledDate ? Number(a.scheduledDate) : Infinity;
      const bDate = b.scheduledDate ? Number(b.scheduledDate) : Infinity;
      return aDate - bDate;
    });

    return { active, noShow, completed };
  }, [agendamentos, now]);

  const stats = useMemo(() => {
    const total = agendamentos.length;
    const approved = agendamentos.filter((a: any) => a.status === "approved").length;
    const attendanceConfirmed = agendamentos.filter((a: any) => a.attendanceStatus === "approved").length;
    const noShowCount = categorized.noShow.length;
    const pending = agendamentos.filter((a: any) => a.status === "pending").length;
    return { total, approved, attendanceConfirmed, noShowCount, pending };
  }, [agendamentos, categorized]);

  if (!sellerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Vendedor não encontrado.</p>
      </div>
    );
  }

  const renderAppointmentCard = (apt: any) => {
    const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
    const attendCfg = ATTENDANCE_CONFIG[apt.attendanceStatus || "pending"] || ATTENDANCE_CONFIG.pending;
    const StatusIcon = statusCfg.icon;
    const AttendIcon = attendCfg.icon;
    const vs: string = getAppointmentVisualStatus(apt, now);
    const visualCfg = VISUAL_STATUS_CONFIG[vs as AppointmentStatus] || VISUAL_STATUS_CONFIG.upcoming;
    const canMarkAttendance = apt.status === "approved" && (apt.attendanceStatus === "pending");
    const isOverdue = vs === "overdue" || vs === "no_show" || vs === "rescue_48h";
    const isExpectedNow = vs === "expected_now";
    const isArrivingSoon = vs === "arriving_soon";
    const scheduled = apt.scheduledDate ? Number(apt.scheduledDate) : null;
    const diff = scheduled ? scheduled - now : null;
    const isRescheduling = rescheduleId === apt.id;

    return (
      <div
        key={apt.id}
        className={`racing-card p-4 space-y-3 border transition-all ${visualCfg.border} ${visualCfg.bg} ${visualCfg.pulse ? "animate-pulse-subtle" : ""}`}
      >
        {/* Visual Status Banner */}
        {visualCfg.label && (
          <div className={`flex items-center gap-2 text-xs font-bold ${visualCfg.textColor}`}>
            {isOverdue && <AlertTriangle className="h-4 w-4" />}
            {isExpectedNow && <Timer className="h-4 w-4 animate-bounce" />}
            {isArrivingSoon && <Clock className="h-4 w-4" />}
            {vs === "attended" && <UserCheck className="h-4 w-4" />}
            {vs === "confirmed" && <CheckCircle2 className="h-4 w-4" />}
            {visualCfg.label}
          </div>
        )}

        {/* Header: ticket + status + countdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {apt.ticketNumber && (
              <span className="flex items-center gap-1 text-xs font-mono font-bold text-primary">
                <Hash className="h-3 w-3" />
                {apt.ticketNumber}
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${statusCfg.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </span>
          </div>
          {/* Countdown Timer */}
          {scheduled && !isOverdue && vs !== "no_show" && vs !== "confirmed" && vs !== "attended" && (
            <div className={`flex items-center gap-1 text-xs font-mono font-bold ${
              isExpectedNow ? "text-amber-400" : isArrivingSoon ? "text-yellow-400" : "text-muted-foreground"
            }`}>
              <Timer className="h-3.5 w-3.5" />
              {diff && diff > 0 ? (
                <span>Faltam {formatCountdown(diff)}</span>
              ) : diff && diff > -(60 * 60 * 1000) ? (
                <span>Há {formatCountdown(Math.abs(diff))}</span>
              ) : null}
            </div>
          )}
          {!scheduled && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(apt.createdAt).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {/* Client Info */}
        <div>
          <p className="font-semibold text-foreground">{apt.customerName || "Cliente"}</p>
          <div className="flex flex-wrap gap-3 mt-1">
            {apt.customerPhone && (
              <a href={`tel:${apt.customerPhone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                <Phone className="h-3 w-3" /> {apt.customerPhone}
              </a>
            )}
            {apt.customerEmail && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {apt.customerEmail}
              </span>
            )}
            {apt.vehicleInterest && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Car className="h-3 w-3" /> {apt.vehicleInterest}
              </span>
            )}
          </div>
          {scheduled && (
            <p className={`flex items-center gap-1 text-xs mt-1 ${isOverdue ? "text-red-400" : "text-yellow-400"}`}>
              <Calendar className="h-3 w-3" />
              Agendado: {new Date(scheduled).toLocaleString("pt-BR")}
            </p>
          )}
          {apt.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{apt.notes}"</p>
          )}
        </div>

        {/* Action Buttons based on visual status */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          {/* Expected Now or Arriving Soon: show prominent "Confirmar Chegada" */}
          {(isExpectedNow || isArrivingSoon) && canMarkAttendance && (
            <Button
              size="sm"
              onClick={() => {
                if (confirm(`Confirmar que o cliente "${apt.customerName}" compareceu?`)) {
                  markAttendance.mutate({ id: apt.id, sellerId });
                }
              }}
              disabled={markAttendance.isPending}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-5 animate-pulse"
            >
              <UserCheck className="h-5 w-5" />
              CONFIRMAR CHEGADA DO CLIENTE
            </Button>
          )}

          {/* Normal pending: show regular button */}
          {vs === "upcoming" && canMarkAttendance && (
            <Button
              size="sm"
              onClick={() => {
                if (confirm(`Confirmar que o cliente "${apt.customerName}" compareceu?`)) {
                  markAttendance.mutate({ id: apt.id, sellerId });
                }
              }}
              disabled={markAttendance.isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Cliente Compareceu
            </Button>
          )}

          {/* Overdue / No Show: show rescue options */}
          {isOverdue && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Cliente não compareceu! Tente um resgate:
              </div>
              <div className="flex gap-2">
                {apt.customerPhone && (
                  <>
                    <a
                      href={`tel:${apt.customerPhone}`}
                      className="flex-1"
                    >
                      <Button size="sm" variant="outline" className="w-full gap-1.5 border-orange-500 text-orange-400 hover:bg-orange-500/20 text-xs">
                        <PhoneCall className="h-3.5 w-3.5" />
                        Ligar
                      </Button>
                    </a>
                    <a
                      href={`https://wa.me/55${apt.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button size="sm" variant="outline" className="w-full gap-1.5 border-green-500 text-green-400 hover:bg-green-500/20 text-xs">
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </a>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRescheduleId(isRescheduling ? null : apt.id)}
                  className="flex-1 gap-1.5 border-blue-500 text-blue-400 hover:bg-blue-500/20 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reagendar
                </Button>
              </div>
            </div>
          )}

          {/* No Show (already marked): show rescue options */}
          {vs === "no_show" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-orange-400 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Cliente não veio. Tente resgatar este cliente!
              </div>
              <div className="flex gap-2">
                {apt.customerPhone && (
                  <>
                    <a
                      href={`tel:${apt.customerPhone}`}
                      className="flex-1"
                    >
                      <Button size="sm" variant="outline" className="w-full gap-1.5 border-orange-500 text-orange-400 hover:bg-orange-500/20 text-xs">
                        <PhoneCall className="h-3.5 w-3.5" />
                        Ligar
                      </Button>
                    </a>
                    <a
                      href={`https://wa.me/55${apt.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button size="sm" variant="outline" className="w-full gap-1.5 border-green-500 text-green-400 hover:bg-green-500/20 text-xs">
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </a>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRescheduleId(isRescheduling ? null : apt.id)}
                  className="flex-1 gap-1.5 border-blue-500 text-blue-400 hover:bg-blue-500/20 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reagendar
                </Button>
              </div>
            </div>
          )}

          {/* Reschedule Form */}
          {isRescheduling && (
            <div className="space-y-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-xs font-semibold text-blue-400">Reagendar Cliente</p>
              <Input
                type="datetime-local"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="text-sm"
              />
              <Input
                value={rescheduleNotes}
                onChange={e => setRescheduleNotes(e.target.value)}
                placeholder="Observação do resgate..."
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReschedule(apt.id)}
                  disabled={reschedule.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  {reschedule.isPending ? "Reagendando..." : "Confirmar Reagendamento"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setRescheduleId(null); setRescheduleDate(""); setRescheduleNotes(""); }}
                  className="text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Attended: show waiting status */}
          {vs === "attended" && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${attendCfg.color}`}>
                <AttendIcon className="h-3 w-3" />
                {attendCfg.label}
              </span>
            </div>
          )}

          {/* Confirmed */}
          {vs === "confirmed" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 text-emerald-400 bg-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                Comparecimento confirmado pelo gerente
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={LOGO_URL} alt="Kafka Rank" className="h-7 w-7 rounded" />
            <span className="font-heading font-bold text-sm text-foreground">AGENDAMENTOS</span>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Seller Info */}
        {seller && (
          <div className="flex items-center gap-4">
            {seller.photoUrl ? (
              <img src={seller.photoUrl} alt={seller.name} className="w-12 h-12 rounded-full object-cover border-2 border-primary" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary">
                {seller.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">{seller.nickname || seller.name}</h1>
              <p className="text-sm text-muted-foreground">Meus Agendamentos</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Total</div>
          </div>
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-yellow-400">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Pendentes</div>
          </div>
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-emerald-400">{stats.attendanceConfirmed}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Compareceu</div>
          </div>
          <div className="racing-card p-3 text-center">
            <div className={`font-heading font-bold text-xl ${stats.noShowCount > 0 ? "text-red-400" : "text-muted-foreground"}`}>{stats.noShowCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Resgatar</div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="racing-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-foreground">Novo Agendamento</h3>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <User className="h-3 w-3" /> Nome do Cliente *
                </label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone
                  </label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Car className="h-3 w-3" /> Carro de Interesse
                  </label>
                  <Input value={vehicleInterest} onChange={e => setVehicleInterest(e.target.value)} placeholder="Ex: HB20, Onix..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Data/Hora *
                  </label>
                  <Input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Observações
                </label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre o cliente..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createAppointment.isPending} className="flex-1">
                {createAppointment.isPending ? "Criando..." : "Criar Agendamento"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Appointments List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : agendamentos.length === 0 ? (
          <div className="racing-card p-8 text-center">
            <CalendarPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum agendamento ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Novo" para criar seu primeiro agendamento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* No Show / Rescue Section */}
            {categorized.noShow.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 font-heading font-bold text-sm text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  RESGATAR CLIENTES ({categorized.noShow.length})
                </h2>
                <div className="space-y-3">
                  {categorized.noShow.map(renderAppointmentCard)}
                </div>
              </div>
            )}

            {/* Active Appointments */}
            {categorized.active.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 font-heading font-bold text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  AGENDAMENTOS ATIVOS ({categorized.active.length})
                </h2>
                <div className="space-y-3">
                  {categorized.active.map(renderAppointmentCard)}
                </div>
              </div>
            )}

            {/* Completed */}
            {categorized.completed.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 font-heading font-bold text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  CONCLUÍDOS ({categorized.completed.length})
                </h2>
                <div className="space-y-3">
                  {categorized.completed.map(renderAppointmentCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for subtle pulse animation */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
      <IAMFloatingButton sellerId={sellerId} />
    </div>
  );
}
