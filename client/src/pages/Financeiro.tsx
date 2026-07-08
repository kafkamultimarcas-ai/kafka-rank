import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  DollarSign, ArrowLeft, Wrench, Clock, ChevronDown, ChevronUp, Phone, Car, 
  User, AlertTriangle, MapPin, FileText, MessageCircle, PhoneCall, Search,
  Plus, CheckCircle, X, Calendar, Receipt, TrendingUp, TrendingDown, LogOut,
  Fuel, Mic, MicOff, Loader2, Shield, ShieldCheck, ShieldAlert, Edit2, Trash2,
  Download, Printer, BarChart3, PieChart, Filter, Check, XCircle, Eye,
  ChevronLeft, ChevronRight, CircleDollarSign, Banknote, CreditCard,
  FileSpreadsheet, ArrowUpDown, MoreVertical, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranding } from "@/contexts/TenantContext";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  aberto: { label: "Aberto", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40", emoji: "🔵" },
  agendado: { label: "Agendado", color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/40", emoji: "📅" },
  em_servico: { label: "Em Serviço", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/40", emoji: "🔧" },
  finalizado: { label: "Finalizado", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40", emoji: "✅" },
  entregue: { label: "Entregue", color: "text-gray-400", bg: "bg-gray-500/20", border: "border-gray-500/40", emoji: "🚗" },
};

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatDate(d: any) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function formatDateFull(d: any) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

type MainTab = "dashboard" | "contas" | "pos-venda" | "gasolina" | "relatorios";

export default function Financeiro() {
  const { logoUrl, name: brandName } = useBranding();
  const [, navigate] = useLocation();
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => navigate("/"),
  });

  const tabs: { key: MainTab; label: string; icon: any; color: string }[] = [
    { key: "dashboard", label: "Painel", icon: BarChart3, color: "cyan" },
    { key: "contas", label: "Contas", icon: Receipt, color: "emerald" },
    { key: "pos-venda", label: "Pós-Venda", icon: Wrench, color: "orange" },
    { key: "gasolina", label: "Gasolina", icon: Fuel, color: "yellow" },
    { key: "relatorios", label: "Relatórios", icon: FileSpreadsheet, color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-300">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img src={logoUrl} alt={brandName} className="h-7 w-7 rounded-lg object-contain border border-gray-800 bg-gray-900" />
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{brandName}</p>
              {sellerSession && (
                <p className="text-[10px] text-gray-500 truncate">Financeiro · {sellerSession.nickname || sellerSession.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => logoutMutation.mutate()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="border-b border-gray-800 bg-gray-950/80 overflow-x-auto">
        <div className="container flex px-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = mainTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMainTab(tab.key)}
                className={`flex-shrink-0 py-3 px-3 text-xs font-bold text-center border-b-2 transition-all ${
                  active
                    ? `border-${tab.color}-500 text-${tab.color}-400`
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
                style={active ? { borderColor: `var(--color-${tab.color}-500, currentColor)` } : {}}
              >
                <Icon className="h-4 w-4 inline mr-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {mainTab === "dashboard" && <DashboardTab />}
      {mainTab === "contas" && <ContasTab />}
      {mainTab === "pos-venda" && <PosVendaTab />}
      {mainTab === "gasolina" && <GasolinaTab />}
      {mainTab === "relatorios" && <RelatoriosTab />}
    </div>
  );
}

// ===== DASHBOARD TAB =====
function DashboardTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data: dashboard } = trpc.finTransactions.dashboard.useQuery({ month, year });
  const { data: alerts } = trpc.finTransactions.alerts.useQuery(undefined, { refetchInterval: 60000 });
  const { data: fuelDash } = trpc.fuel.dashboard.useQuery({ month, year });
  const { data: pvGastos } = trpc.pvGastos.list.useQuery({ chamadoId: 0 });
  const sendNotification = trpc.finTransactions.sendAlertNotification.useMutation({
    onSuccess: (data) => {
      if (data.sent) toast.success("Notificação de alerta enviada!");
      else toast.info("Nenhuma conta pendente para notificar");
    },
    onError: () => toast.error("Erro ao enviar notificação"),
  });
  const [dismissedAlerts, setDismissedAlerts] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const d = dashboard || { totalPayable: 0, totalPaid: 0, pendingPayable: 0, totalReceivable: 0, totalReceived: 0, pendingReceivable: 0, overdue: 0, upcomingDue: [] };
  const balance = d.totalReceivable - d.totalPayable;
  const pvTotal = useMemo(() => {
    if (!pvGastos || !Array.isArray(pvGastos)) return 0;
    return pvGastos.filter((g: any) => {
      const dt = new Date(g.createdAt);
      return dt.getMonth() + 1 === month && dt.getFullYear() === year;
    }).reduce((s: number, g: any) => s + Number(g.valor || 0), 0);
  }, [pvGastos, month, year]);

  const s = alerts?.summary || { overdueCount: 0, overdueTotal: 0, dueTodayCount: 0, dueTodayTotal: 0, dueTomorrowCount: 0, dueTomorrowTotal: 0, dueWeekCount: 0, dueWeekTotal: 0 };
  const totalAlerts = s.overdueCount + s.dueTodayCount + s.dueTomorrowCount;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getDaysOverdue = (dueDate: number) => {
    const diff = Date.now() - dueDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">

      {/* ========== ALERTAS FINANCEIROS ========== */}
      {totalAlerts > 0 && !dismissedAlerts && (
        <div className="rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-950/60 via-red-900/30 to-orange-950/40 p-4 relative overflow-hidden">
          {/* Pulse animation background */}
          <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
          
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {totalAlerts}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-red-400 text-sm">ALERTAS FINANCEIROS</p>
                  <p className="text-[10px] text-gray-400">{totalAlerts} conta(s) precisam de atenção</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => sendNotification.mutate()}
                  disabled={sendNotification.isPending}
                  className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                  title="Enviar notificação"
                >
                  {sendNotification.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setDismissedAlerts(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Alert Summary Cards */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {s.overdueCount > 0 && (
                <button onClick={() => toggleSection('overdue')} className={`rounded-xl p-2.5 border text-center transition-all ${expandedSection === 'overdue' ? 'bg-red-500/20 border-red-500/50 ring-1 ring-red-500/30' : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'}`}>
                  <div className="text-lg font-bold text-red-400">{s.overdueCount}</div>
                  <div className="text-[9px] text-red-300/80 font-bold uppercase">Atrasadas</div>
                  <div className="text-[10px] text-red-400/70 font-bold mt-0.5">{formatCurrency(s.overdueTotal)}</div>
                </button>
              )}
              {s.dueTodayCount > 0 && (
                <button onClick={() => toggleSection('today')} className={`rounded-xl p-2.5 border text-center transition-all ${expandedSection === 'today' ? 'bg-yellow-500/20 border-yellow-500/50 ring-1 ring-yellow-500/30' : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15'}`}>
                  <div className="text-lg font-bold text-yellow-400">{s.dueTodayCount}</div>
                  <div className="text-[9px] text-yellow-300/80 font-bold uppercase">Vence Hoje</div>
                  <div className="text-[10px] text-yellow-400/70 font-bold mt-0.5">{formatCurrency(s.dueTodayTotal)}</div>
                </button>
              )}
              {s.dueTomorrowCount > 0 && (
                <button onClick={() => toggleSection('tomorrow')} className={`rounded-xl p-2.5 border text-center transition-all ${expandedSection === 'tomorrow' ? 'bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-500/30' : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15'}`}>
                  <div className="text-lg font-bold text-orange-400">{s.dueTomorrowCount}</div>
                  <div className="text-[9px] text-orange-300/80 font-bold uppercase">Amanhã</div>
                  <div className="text-[10px] text-orange-400/70 font-bold mt-0.5">{formatCurrency(s.dueTomorrowTotal)}</div>
                </button>
              )}
            </div>

            {/* Expanded Details */}
            {expandedSection === 'overdue' && alerts?.overdue && alerts.overdue.length > 0 && (
              <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-red-300 font-bold uppercase tracking-wider">Contas Atrasadas</p>
                {alerts.overdue.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs bg-red-500/10 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 font-medium truncate">{t.description}</p>
                      <p className="text-[10px] text-red-300/70">
                        {t.supplier && `${t.supplier} • `}Venceu {formatDate(t.dueDate)} ({getDaysOverdue(t.dueDate)} dias)
                      </p>
                    </div>
                    <span className="text-red-400 font-bold ml-2 whitespace-nowrap">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {expandedSection === 'today' && alerts?.dueToday && alerts.dueToday.length > 0 && (
              <div className="rounded-xl bg-yellow-950/40 border border-yellow-500/20 p-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">Vencem Hoje</p>
                {alerts.dueToday.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs bg-yellow-500/10 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 font-medium truncate">{t.description}</p>
                      <p className="text-[10px] text-yellow-300/70">
                        {t.supplier && `${t.supplier} • `}{t.type === 'payable' ? 'A Pagar' : 'A Receber'}
                      </p>
                    </div>
                    <span className="text-yellow-400 font-bold ml-2 whitespace-nowrap">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {expandedSection === 'tomorrow' && alerts?.dueTomorrow && alerts.dueTomorrow.length > 0 && (
              <div className="rounded-xl bg-orange-950/40 border border-orange-500/20 p-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">Vencem Amanhã</p>
                {alerts.dueTomorrow.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs bg-orange-500/10 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 font-medium truncate">{t.description}</p>
                      <p className="text-[10px] text-orange-300/70">
                        {t.supplier && `${t.supplier} • `}{t.type === 'payable' ? 'A Pagar' : 'A Receber'}
                      </p>
                    </div>
                    <span className="text-orange-400 font-bold ml-2 whitespace-nowrap">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Week preview (always visible if there are items) */}
            {s.dueWeekCount > 0 && (
              <div className="mt-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300"><b>{s.dueWeekCount}</b> conta(s) vence esta semana</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold">{formatCurrency(s.dueWeekTotal)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dismissed alerts - small reminder bar */}
      {totalAlerts > 0 && dismissedAlerts && (
        <button
          onClick={() => setDismissedAlerts(false)}
          className="w-full rounded-xl bg-red-500/10 border border-red-500/20 p-2 flex items-center justify-center gap-2 hover:bg-red-500/15 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          <span className="text-[11px] text-red-300 font-medium">{totalAlerts} alerta(s) pendente(s) — toque para ver</span>
        </button>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-gray-900/80 border border-gray-800 rounded-xl p-3">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-lg">{MONTH_NAMES[month - 1]}</p>
          <p className="text-gray-500 text-xs">{year}</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Balance Card */}
      <div className={`rounded-2xl p-5 border-2 ${balance >= 0 ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5' : 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/5'}`}>
        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Balanço do Mês</p>
        <p className={`text-3xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(balance)}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total a Receber</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(d.totalReceivable)}</p>
            <p className="text-[10px] text-emerald-400/60">Recebido: {formatCurrency(d.totalReceived)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total a Pagar</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(d.totalPayable)}</p>
            <p className="text-[10px] text-red-400/60">Pago: {formatCurrency(d.totalPaid)}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 border text-center bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{s.overdueCount + s.dueTodayCount}</p>
          <p className="text-[9px] text-gray-500">Vencidas/Hoje</p>
        </div>
        <div className="rounded-xl p-3 border text-center bg-orange-500/10 border-orange-500/20">
          <Wrench className="h-5 w-5 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-orange-400">{formatCurrency(pvTotal)}</p>
          <p className="text-[9px] text-gray-500">Pós-Venda</p>
        </div>
        <div className="rounded-xl p-3 border text-center bg-yellow-500/10 border-yellow-500/20">
          <Fuel className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">{formatCurrency(fuelDash?.totalCost || 0)}</p>
          <p className="text-[9px] text-gray-500">Gasolina</p>
        </div>
      </div>
    </div>
  );
}

// ===== CONTAS TAB (Exclusivo Financeiro) =====
function ContasTab() {
  const { data: categories } = trpc.finCategories.list.useQuery();
  const utils = trpc.useUtils();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const startDate = useMemo(() => new Date(filterYear, filterMonth - 1, 1).getTime(), [filterMonth, filterYear]);
  const endDate = useMemo(() => new Date(filterYear, filterMonth, 0, 23, 59, 59).getTime(), [filterMonth, filterYear]);
  const { data: transactionsData, refetch } = trpc.finTransactions.list.useQuery({ startDate, endDate });
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue" | "approval">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "payable" | "receivable">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Form state
  const [txType, setTxType] = useState<"payable" | "receivable">("payable");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDueDate, setTxDueDate] = useState("");
  const [txSupplier, setTxSupplier] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txCategoryId, setTxCategoryId] = useState<number | null>(null);
  const [txNeedsApproval, setTxNeedsApproval] = useState(false);
  const [txRecurrence, setTxRecurrence] = useState("none");
  
  const createTransaction = trpc.finTransactions.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); resetForm(); toast.success("Conta lançada!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const updateTransaction = trpc.finTransactions.update.useMutation({
    onSuccess: () => { refetch(); setEditingTx(null); resetForm(); toast.success("Conta atualizada!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const deleteTransaction = trpc.finTransactions.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Conta excluída!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const markPaid = trpc.finTransactions.markPaid.useMutation({
    onSuccess: () => { refetch(); toast.success("Conta marcada como PAGA!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const approveTransaction = trpc.finTransactions.approveTransaction.useMutation({
    onSuccess: () => { refetch(); toast.success("Autorização processada!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  
  const resetForm = () => {
    setTxType("payable"); setTxDescription(""); setTxAmount("");
    setTxDueDate(""); setTxSupplier(""); setTxNotes("");
    setTxCategoryId(null); setTxNeedsApproval(false); setTxRecurrence("none");
  };

  const startEdit = (t: any) => {
    setEditingTx(t);
    setTxType(t.type);
    setTxDescription(t.description);
    setTxAmount(String(t.amount));
    setTxDueDate(t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "");
    setTxSupplier(t.supplier || "");
    setTxNotes(t.notes || "");
    setTxCategoryId(t.categoryId);
    setShowForm(true);
  };

  const allTransactions: any[] = (transactionsData as any)?.items || (Array.isArray(transactionsData) ? transactionsData : []);
  
  const filtered = useMemo(() => {
    let list = allTransactions;
    const now = Date.now();
    if (typeFilter !== "all") list = list.filter((t: any) => t.type === typeFilter);
    if (filter === "pending") list = list.filter((t: any) => t.status === "pending");
    else if (filter === "paid") list = list.filter((t: any) => t.status === "paid");
    else if (filter === "overdue") list = list.filter((t: any) => (t.status === "pending" || t.status === "overdue") && t.dueDate < now);
    else if (filter === "approval") list = list.filter((t: any) => t.approvalStatus === "pending_approval");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t: any) => t.description?.toLowerCase().includes(q) || t.supplier?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q));
    }
    return list.sort((a: any, b: any) => a.dueDate - b.dueDate);
  }, [allTransactions, filter, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const now = Date.now();
    const pending = allTransactions.filter((t: any) => t.status === "pending");
    const paid = allTransactions.filter((t: any) => t.status === "paid");
    const overdue = allTransactions.filter((t: any) => (t.status === "pending" || t.status === "overdue") && t.dueDate < now);
    const needApproval = allTransactions.filter((t: any) => t.approvalStatus === "pending_approval");
    const totalPayable = allTransactions.filter((t: any) => t.type === "payable").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalReceivable = allTransactions.filter((t: any) => t.type === "receivable").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalPaid = paid.filter((t: any) => t.type === "payable").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalReceived = paid.filter((t: any) => t.type === "receivable").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    return { pending: pending.length, paid: paid.length, overdue: overdue.length, needApproval: needApproval.length, totalPayable, totalReceivable, totalPaid, totalReceived };
  }, [allTransactions]);

  const getCategoryName = (catId: number) => {
    const cat = (categories || []).find((c: any) => c.id === catId);
    return cat?.name || "Sem categoria";
  };
  
  const handleAudioResult = (parsed: any) => {
    if (parsed.description) setTxDescription(parsed.description);
    if (parsed.amount) setTxAmount(String(parsed.amount));
    if (parsed.supplier) setTxSupplier(parsed.supplier);
    if (parsed.notes) setTxNotes(parsed.notes);
    if (parsed.type === "receivable") setTxType("receivable");
    if (parsed.dueDate) {
      try {
        const parts = parsed.dueDate.split("/");
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          setTxDueDate(d.toISOString().split("T")[0]);
        }
      } catch {}
    }
    setShowForm(true);
    toast.success("Dados preenchidos pelo áudio!");
  };

  const prevMonth = () => {
    if (filterMonth === 1) { setFilterMonth(12); setFilterYear(filterYear - 1); }
    else setFilterMonth(filterMonth - 1);
  };
  const nextMonth = () => {
    if (filterMonth === 12) { setFilterMonth(1); setFilterYear(filterYear + 1); }
    else setFilterMonth(filterMonth + 1);
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-gray-900/80 border border-gray-800 rounded-xl p-2">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-white font-bold text-sm">{MONTH_NAMES[filterMonth - 1]} {filterYear}</p>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 border bg-emerald-500/10 border-emerald-500/20">
          <p className="text-[9px] text-gray-500 uppercase font-bold">A Receber</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(stats.totalReceivable)}</p>
          <p className="text-[10px] text-emerald-400/60">Recebido: {formatCurrency(stats.totalReceived)}</p>
        </div>
        <div className="rounded-xl p-3 border bg-red-500/10 border-red-500/20">
          <p className="text-[9px] text-gray-500 uppercase font-bold">A Pagar</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(stats.totalPayable)}</p>
          <p className="text-[10px] text-red-400/60">Pago: {formatCurrency(stats.totalPaid)}</p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { key: "all" as const, label: "Todas", count: allTransactions.length, color: "gray" },
          { key: "overdue" as const, label: "Vencidas", count: stats.overdue, color: "red" },
          { key: "pending" as const, label: "Pendentes", count: stats.pending, color: "amber" },
          { key: "paid" as const, label: "Pagas", count: stats.paid, color: "emerald" },
          { key: "approval" as const, label: "Autorizar", count: stats.needApproval, color: "purple" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(filter === f.key ? "all" : f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              filter === f.key
                ? `bg-${f.color}-500/30 text-${f.color}-400 ring-1 ring-${f.color}-500/50`
                : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
            }`}
            style={filter === f.key ? { backgroundColor: `color-mix(in srgb, var(--color-${f.color}-500, #888) 20%, transparent)` } : {}}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex gap-1.5">
        {[
          { key: "all" as const, label: "Todos", icon: CircleDollarSign },
          { key: "payable" as const, label: "A Pagar", icon: TrendingDown },
          { key: "receivable" as const, label: "A Receber", icon: TrendingUp },
        ].map(f => (
          <button key={f.key} onClick={() => setTypeFilter(typeFilter === f.key ? "all" : f.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
              typeFilter === f.key ? "bg-gray-700 text-white" : "bg-gray-800/50 text-gray-500"
            }`}
          >
            <f.icon className="h-3 w-3" /> {f.label}
          </button>
        ))}
      </div>

      {/* Botão Nova Conta + Audio */}
      <div className="space-y-2">
        <button
          onClick={() => { setShowForm(!showForm); setEditingTx(null); if (showForm) resetForm(); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nova Conta"}
        </button>
        {!showForm && (
          <AudioLauncher onResult={handleAudioResult} context="conta_pagar" />
        )}
      </div>

      {/* Formulário de nova conta / edição */}
      {showForm && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-white">{editingTx ? "Editar Conta" : "Nova Conta"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Tipo *</label>
              <select value={txType} onChange={e => setTxType(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md text-white h-9 text-sm px-2">
                <option value="payable">A Pagar</option>
                <option value="receivable">A Receber</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Categoria</label>
              <select value={txCategoryId?.toString() || ""} onChange={e => setTxCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md text-white h-9 text-sm px-2">
                <option value="">Sem categoria</option>
                {(categories || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Descrição *</label>
            <Input value={txDescription} onChange={e => setTxDescription(e.target.value)}
              placeholder="Ex: Boleto energia, Aluguel loja..." className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Valor (R$) *</label>
              <Input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Vencimento *</label>
              <Input type="date" value={txDueDate} onChange={e => setTxDueDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Fornecedor</label>
            <Input value={txSupplier} onChange={e => setTxSupplier(e.target.value)}
              placeholder="Ex: CEMIG, Imobiliária..." className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          {!editingTx && (
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Recorrência</label>
              <select value={txRecurrence} onChange={e => setTxRecurrence(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md text-white h-9 text-sm px-2">
                <option value="none">Sem recorrência</option>
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Observações</label>
            <Input value={txNotes} onChange={e => setTxNotes(e.target.value)}
              placeholder="Notas adicionais..." className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          
          {!editingTx && (
            <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-xs font-bold text-purple-300">Precisa de Autorização</p>
                  <p className="text-[10px] text-gray-500">Envia notificação para o gestor aprovar</p>
                </div>
              </div>
              <button type="button" onClick={() => setTxNeedsApproval(!txNeedsApproval)}
                className={`w-11 h-6 rounded-full transition-all relative ${txNeedsApproval ? 'bg-purple-500' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all pointer-events-none ${txNeedsApproval ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
          )}
          
          {!editingTx && <AudioLauncher onResult={handleAudioResult} context={txType === "receivable" ? "conta_receber" : "conta_pagar"} />}
          
          <Button onClick={() => {
            if (!txDescription.trim() || !txAmount || !txDueDate) return toast.error("Preencha descrição, valor e vencimento");
            if (editingTx) {
              updateTransaction.mutate({
                id: editingTx.id,
                description: txDescription,
                amount: txAmount,
                dueDate: new Date(txDueDate + "T12:00:00").getTime(),
                categoryId: txCategoryId,
                supplier: txSupplier || undefined,
                notes: txNotes || undefined,
              });
            } else {
              createTransaction.mutate({
                type: txType,
                description: txDescription,
                amount: txAmount,
                dueDate: new Date(txDueDate + "T12:00:00").getTime(),
                categoryId: txCategoryId,
                supplier: txSupplier || undefined,
                notes: txNotes || undefined,
                recurrence: txRecurrence as any,
                needsApproval: txNeedsApproval,
                createdByName: sellerSession?.nickname || sellerSession?.name || "Financeiro",
              });
            }
          }} disabled={createTransaction.isPending || updateTransaction.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            {(createTransaction.isPending || updateTransaction.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 
              editingTx ? <><Edit2 className="h-4 w-4 mr-2" /> Salvar Alterações</> : <><Receipt className="h-4 w-4 mr-2" /> Lançar Conta</>}
          </Button>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por descrição, fornecedor..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none" />
      </div>

      {/* Lista de transações */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((t: any) => {
            const now = Date.now();
            const isOverdue = (t.status === "pending" || t.status === "overdue") && t.dueDate < now;
            const isPaid = t.status === "paid";
            const isPayable = t.type === "payable";
            const needsAuth = t.approvalStatus === "pending_approval";
            const isApproved = t.approvalStatus === "approved";
            const isRejected = t.approvalStatus === "rejected";
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className={`rounded-xl border transition-all ${
                needsAuth ? "bg-purple-500/10 border-purple-500/30" :
                isOverdue ? "bg-red-500/10 border-red-500/30" :
                isPaid ? "bg-emerald-500/10 border-emerald-500/20" :
                "bg-gray-900/60 border-gray-800"
              }`}>
                <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isPayable ? <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" /> : <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        <p className="text-sm font-bold text-white truncate">{t.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded">{getCategoryName(t.categoryId)}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(t.dueDate)}</span>
                        {t.supplier && <span className="text-gray-400">{t.supplier}</span>}
                        {isOverdue && <span className="text-red-400 font-bold animate-pulse">VENCIDA</span>}
                        {isPaid && <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> Paga {t.paidDate ? formatDate(t.paidDate) : ""}</span>}
                        {needsAuth && <span className="text-purple-400 font-bold flex items-center gap-0.5"><Shield className="h-3 w-3" /> Aguardando</span>}
                        {isApproved && <span className="text-green-400 flex items-center gap-0.5"><ShieldCheck className="h-3 w-3" /> Autorizada</span>}
                        {isRejected && <span className="text-red-400 flex items-center gap-0.5"><ShieldAlert className="h-3 w-3" /> Rejeitada</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <p className={`text-sm font-bold ${isPayable ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isPayable ? '-' : '+'}{formatCurrency(t.amount)}
                      </p>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-600" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-600" />}
                    </div>
                  </div>
                </button>
                
                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800/50 pt-3 space-y-3">
                    {t.notes && <p className="text-xs text-gray-400">{t.notes}</p>}
                    {t.createdByName && <p className="text-[10px] text-gray-600">Lançado por: {t.createdByName}</p>}
                    {t.receiptUrl && (
                      <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
                        <Eye className="h-3 w-3" /> Ver Comprovante
                      </a>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {/* MARCAR COMO PAGO */}
                      {!isPaid && t.status !== "cancelled" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markPaid.mutate({ id: t.id, paidDate: Date.now() }); }}
                          disabled={markPaid.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {markPaid.isPending ? "Processando..." : "Marcar como Pago"}
                        </button>
                      )}
                      
                      {/* EDITAR */}
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </button>
                      
                      {/* EXCLUIR */}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Excluir esta conta?")) deleteTransaction.mutate({ id: t.id }); }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                      
                      {/* AUTORIZAR/REJEITAR */}
                      {needsAuth && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); approveTransaction.mutate({ id: t.id, approved: true, approvedBy: sellerSession?.name || "Admin" }); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Autorizar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); approveTransaction.mutate({ id: t.id, approved: false, approvedBy: sellerSession?.name || "Admin" }); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" /> Rejeitar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-10 text-center">
          <Receipt className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma conta encontrada para {MONTH_NAMES[filterMonth - 1]} {filterYear}.</p>
        </div>
      )}
    </div>
  );
}

// ===== RELATÓRIOS TAB =====
function RelatoriosTab() {
  const { name: brandName } = useBranding();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const startDate = useMemo(() => new Date(year, month - 1, 1).getTime(), [month, year]);
  const endDate = useMemo(() => new Date(year, month, 0, 23, 59, 59).getTime(), [month, year]);
  const { data: transactionsData } = trpc.finTransactions.list.useQuery({ startDate, endDate, limit: 500 });
  const { data: categories } = trpc.finCategories.list.useQuery();
  const { data: fuelRecords } = trpc.fuel.list.useQuery({ month, year });
  const { data: pvGastos } = trpc.pvGastos.list.useQuery({ chamadoId: 0 });

  const allTx: any[] = (transactionsData as any)?.items || [];
  
  const getCategoryName = (catId: number) => {
    const cat = (categories || []).find((c: any) => c.id === catId);
    return cat?.name || "Sem categoria";
  };

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; payable: number; receivable: number; paid: number; count: number }> = {};
    allTx.forEach((t: any) => {
      const catName = getCategoryName(t.categoryId);
      if (!map[catName]) map[catName] = { name: catName, payable: 0, receivable: 0, paid: 0, count: 0 };
      map[catName].count++;
      if (t.type === "payable") map[catName].payable += Number(t.amount || 0);
      else map[catName].receivable += Number(t.amount || 0);
      if (t.status === "paid") map[catName].paid += Number(t.amount || 0);
    });
    return Object.values(map).sort((a, b) => (b.payable + b.receivable) - (a.payable + a.receivable));
  }, [allTx, categories]);

  // Pós-venda totals
  const pvMonthTotal = useMemo(() => {
    if (!pvGastos || !Array.isArray(pvGastos)) return { total: 0, count: 0, items: [] as any[] };
    const monthItems = pvGastos.filter((g: any) => {
      const dt = new Date(g.createdAt);
      return dt.getMonth() + 1 === month && dt.getFullYear() === year;
    });
    return {
      total: monthItems.reduce((s: number, g: any) => s + Number(g.valor || 0), 0),
      count: monthItems.length,
      items: monthItems,
    };
  }, [pvGastos, month, year]);

  // Fuel totals
  const fuelTotal = useMemo(() => {
    const records = fuelRecords || [];
    return {
      total: records.reduce((s: number, r: any) => s + Number(r.totalCost || 0), 0),
      liters: records.reduce((s: number, r: any) => s + Number(r.liters || 0), 0),
      count: records.length,
    };
  }, [fuelRecords]);

  // Summary
  const summary = useMemo(() => {
    const payable = allTx.filter((t: any) => t.type === "payable");
    const receivable = allTx.filter((t: any) => t.type === "receivable");
    const paid = allTx.filter((t: any) => t.status === "paid");
    const pending = allTx.filter((t: any) => t.status === "pending" || t.status === "overdue");
    return {
      totalPayable: payable.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      totalReceivable: receivable.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      totalPaid: paid.filter((t: any) => t.type === "payable").reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      totalReceived: paid.filter((t: any) => t.type === "receivable").reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      pendingCount: pending.length,
      paidCount: paid.length,
      totalCount: allTx.length,
    };
  }, [allTx]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

  // Generate printable report
  const handlePrint = () => {
    const printContent = `
      <html><head><title>Relatório Financeiro - ${MONTH_NAMES[month - 1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #444; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: bold; }
        .total { font-weight: bold; font-size: 14px; }
        .green { color: #16a34a; } .red { color: #dc2626; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .summary-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .summary-box h3 { margin: 0 0 5px; font-size: 12px; color: #888; text-transform: uppercase; }
        .summary-box p { margin: 0; font-size: 22px; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Relatório Financeiro — ${MONTH_NAMES[month - 1]} ${year}</h1>
      <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
      
      <div class="summary-grid">
        <div class="summary-box"><h3>Total a Receber</h3><p class="green">${formatCurrency(summary.totalReceivable)}</p></div>
        <div class="summary-box"><h3>Total a Pagar</h3><p class="red">${formatCurrency(summary.totalPayable)}</p></div>
        <div class="summary-box"><h3>Recebido</h3><p class="green">${formatCurrency(summary.totalReceived)}</p></div>
        <div class="summary-box"><h3>Pago</h3><p class="red">${formatCurrency(summary.totalPaid)}</p></div>
      </div>
      <p class="total">Balanço: <span class="${(summary.totalReceivable - summary.totalPayable) >= 0 ? 'green' : 'red'}">${formatCurrency(summary.totalReceivable - summary.totalPayable)}</span></p>
      
      <h2>Despesas por Categoria</h2>
      <table>
        <tr><th>Categoria</th><th>Qtd</th><th>A Pagar</th><th>A Receber</th><th>Pago</th></tr>
        ${categoryBreakdown.map(c => `<tr><td>${c.name}</td><td>${c.count}</td><td class="red">${formatCurrency(c.payable)}</td><td class="green">${formatCurrency(c.receivable)}</td><td>${formatCurrency(c.paid)}</td></tr>`).join("")}
      </table>
      
      <h2>Pós-Venda</h2>
      <p>Total de gastos: <strong class="red">${formatCurrency(pvMonthTotal.total)}</strong> (${pvMonthTotal.count} lançamentos)</p>
      
      <h2>Gasolina</h2>
      <p>Total gasto: <strong class="red">${formatCurrency(fuelTotal.total)}</strong> | ${fuelTotal.liters.toFixed(1)} litros | ${fuelTotal.count} abastecimentos</p>
      
      <h2>Todas as Transações</h2>
      <table>
        <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th>Valor</th><th>Status</th></tr>
        ${allTx.sort((a: any, b: any) => a.dueDate - b.dueDate).map((t: any) => `<tr>
          <td>${formatDateFull(t.dueDate)}</td>
          <td>${t.type === "payable" ? "Pagar" : "Receber"}</td>
          <td>${t.description}</td>
          <td>${t.supplier || "-"}</td>
          <td>${getCategoryName(t.categoryId)}</td>
          <td class="${t.type === "payable" ? "red" : "green"}">${formatCurrency(t.amount)}</td>
          <td>${t.status === "paid" ? "✅ Pago" : t.status === "overdue" ? "⚠️ Vencido" : "⏳ Pendente"}</td>
        </tr>`).join("")}
      </table>
      
      <p style="margin-top:40px;text-align:center;color:#999;font-size:11px;">${brandName} — Sistema de Gestão</p>
      </body></html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Data,Tipo,Descrição,Fornecedor,Categoria,Valor,Status\n";
    const rows = allTx.sort((a: any, b: any) => a.dueDate - b.dueDate).map((t: any) =>
      `${formatDateFull(t.dueDate)},${t.type === "payable" ? "A Pagar" : "A Receber"},"${t.description}","${t.supplier || ""}","${getCategoryName(t.categoryId)}",${t.amount},${t.status === "paid" ? "Pago" : t.status === "overdue" ? "Vencido" : "Pendente"}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${MONTH_NAMES[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-gray-900/80 border border-gray-800 rounded-xl p-2">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-white font-bold text-sm">{MONTH_NAMES[month - 1]} {year}</p>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all">
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
        <button onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-all">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-4 border bg-emerald-500/10 border-emerald-500/20 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-bold">Receitas</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.totalReceivable)}</p>
        </div>
        <div className="rounded-xl p-4 border bg-red-500/10 border-red-500/20 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-bold">Despesas</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(summary.totalPayable)}</p>
        </div>
      </div>
      <div className={`rounded-xl p-4 border text-center ${(summary.totalReceivable - summary.totalPayable) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <p className="text-[9px] text-gray-500 uppercase font-bold">Lucro / Prejuízo</p>
        <p className={`text-2xl font-bold ${(summary.totalReceivable - summary.totalPayable) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(summary.totalReceivable - summary.totalPayable)}
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-purple-400" /> Despesas por Categoria
        </h3>
        {categoryBreakdown.length > 0 ? (
          <div className="space-y-2">
            {categoryBreakdown.map((c, i) => {
              const total = c.payable + c.receivable;
              const maxTotal = Math.max(...categoryBreakdown.map(x => x.payable + x.receivable));
              const pct = maxTotal > 0 ? ((total / maxTotal) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-300">{c.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{c.count}x</span>
                      {c.payable > 0 && <span className="text-red-400">{formatCurrency(c.payable)}</span>}
                      {c.receivable > 0 && <span className="text-emerald-400">{formatCurrency(c.receivable)}</span>}
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-xs text-center py-4">Sem dados para este mês.</p>
        )}
      </div>

      {/* Pós-Venda Section */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
        <h3 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Gastos Pós-Venda
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total Gasto</p>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(pvMonthTotal.total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Lançamentos</p>
            <p className="text-lg font-bold text-orange-400">{pvMonthTotal.count}</p>
          </div>
        </div>
      </div>

      {/* Fuel Section */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
        <h3 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
          <Fuel className="h-4 w-4" /> Gasolina
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total</p>
            <p className="text-lg font-bold text-yellow-400">{formatCurrency(fuelTotal.total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Litros</p>
            <p className="text-lg font-bold text-yellow-400">{fuelTotal.liters.toFixed(1)}L</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Abastec.</p>
            <p className="text-lg font-bold text-yellow-400">{fuelTotal.count}</p>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-cyan-400" /> Planilha de Transações
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="px-3 py-2 text-left text-gray-400 font-bold">Data</th>
                <th className="px-3 py-2 text-left text-gray-400 font-bold">Descrição</th>
                <th className="px-3 py-2 text-right text-gray-400 font-bold">Valor</th>
                <th className="px-3 py-2 text-center text-gray-400 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {allTx.sort((a: any, b: any) => a.dueDate - b.dueDate).map((t: any) => (
                <tr key={t.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatDate(t.dueDate)}</td>
                  <td className="px-3 py-2 text-white truncate max-w-[150px]">{t.description}</td>
                  <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${t.type === "payable" ? "text-red-400" : "text-emerald-400"}`}>
                    {t.type === "payable" ? "-" : "+"}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {t.status === "paid" ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-400"><CheckCircle className="h-3 w-3" /></span>
                    ) : t.status === "overdue" || (t.status === "pending" && t.dueDate < Date.now()) ? (
                      <span className="inline-flex items-center gap-0.5 text-red-400"><AlertTriangle className="h-3 w-3" /></span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-400"><Clock className="h-3 w-3" /></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allTx.length === 0 && (
            <p className="text-center text-gray-500 text-xs py-6">Sem transações neste mês.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== PÓS-VENDA TAB =====
function PosVendaTab() {
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: chamados } = trpc.pvChamados.list.useQuery({});
  const [filter, setFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allChamados = chamados || [];
  const filtered = useMemo(() => {
    let list = allChamados;
    if (filter !== "todos") list = list.filter((c: any) => c.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) =>
        c.clienteNome?.toLowerCase().includes(q) ||
        c.carroModelo?.toLowerCase().includes(q) ||
        c.carroPlaca?.toLowerCase().includes(q) ||
        c.ticketNumber?.toString().includes(q)
      );
    }
    return list;
  }, [allChamados, filter, searchQuery]);

  const counts = useMemo(() => ({
    todos: allChamados.length,
    aberto: allChamados.filter((c: any) => c.status === "aberto").length,
    em_servico: allChamados.filter((c: any) => c.status === "em_servico").length,
    finalizado: allChamados.filter((c: any) => c.status === "finalizado").length,
  }), [allChamados]);

  const sellerName = (id: number) => {
    const s = (sellers || []).find((s: any) => s.id === id);
    return s?.nickname || s?.name || "—";
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "aberto", label: "Abertos", count: counts.aberto, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { key: "em_servico", label: "Em Serviço", count: counts.em_servico, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { key: "finalizado", label: "Finalizados", count: counts.finalizado, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map(c => (
          <button key={c.key} onClick={() => setFilter(f => f === c.key ? "todos" : c.key)} className={`rounded-xl p-3 border text-center transition-all ${c.bg} ${filter === c.key ? 'ring-2 ring-orange-500/50' : ''}`}>
            <p className={`text-xl font-bold ${c.color}`}>{c.count}</p>
            <p className="text-[10px] text-gray-500">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, carro, placa..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none" />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((c: any) => {
            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.aberto;
            const prazo = c.prazoEntrega ? new Date(c.prazoEntrega) : null;
            const isOverdue = prazo && prazo.getTime() < Date.now() && c.status !== "entregue" && c.status !== "finalizado";
            const isExpanded = expandedId === c.id;
            return (
              <div key={c.id} className={`rounded-xl border transition-all ${sc.bg} ${sc.border}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-gray-600">#{c.ticketNumber}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} font-semibold border ${sc.border}`}>
                          {sc.emoji} {sc.label}
                        </span>
                        {isOverdue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">ATRASADO</span>}
                      </div>
                      <p className="text-white font-bold text-sm mt-1">{c.clienteNome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{c.carroModelo} {c.carroPlaca ? `• ${c.carroPlaca}` : ""}</p>
                        {c.vendedorId && <span className="text-[10px] text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">{sellerName(c.vendedorId)}</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{c.problemaRelatado}</p>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800/50 pt-3 space-y-3">
                    <div className="text-xs space-y-1.5">
                      <p className="text-gray-400"><span className="text-gray-600">Problema:</span> {c.problemaRelatado}</p>
                      {c.observacoes && <p className="text-gray-400"><span className="text-gray-600">Obs:</span> {c.observacoes}</p>}
                      {c.servicoRealizado && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                          <p className="text-[10px] text-orange-400 uppercase font-bold mb-0.5"><Wrench className="h-3 w-3 inline" /> O que está sendo feito</p>
                          <p className="text-gray-300 text-xs">{c.servicoRealizado}</p>
                        </div>
                      )}
                      {c.clienteTelefone && <p className="text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {c.clienteTelefone}</p>}
                    </div>
                    {c.clienteTelefone && (
                      <div className="grid grid-cols-2 gap-2">
                        <a href={`https://wa.me/55${c.clienteTelefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                        <a href={`tel:${c.clienteTelefone}`} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"><PhoneCall className="w-4 h-4" /> Ligar</a>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 pt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(c.createdAt)}</span>
                      {prazo && <span className={isOverdue ? "text-red-400 font-bold" : ""}>Prazo: {formatDate(c.prazoEntrega)}</span>}
                      {c.oficinaNome && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.oficinaNome}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-10 text-center">
          <Wrench className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum chamado encontrado.</p>
        </div>
      )}
    </div>
  );
}


// ===== GASOLINA TAB =====
function GasolinaTab() {
  const { data: fuelRecords, refetch } = trpc.fuel.list.useQuery({});
  const { data: inventory } = trpc.crmInventory.list.useQuery();
  const createFuel = trpc.fuel.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); resetForm(); toast.success("Abastecimento registrado!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [fuelType, setFuelType] = useState("gasolina");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [gasStation, setGasStation] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const resetForm = () => {
    setVehiclePlate(""); setVehicleModel(""); setFuelType("gasolina");
    setLiters(""); setPricePerLiter(""); setTotalCost("");
    setOdometer(""); setGasStation(""); setNotes("");
  };

  const calcTotal = () => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    if (l > 0 && p > 0) setTotalCost((l * p).toFixed(2));
  };

  const handlePlateChange = (plate: string) => {
    setVehiclePlate(plate.toUpperCase());
    if (inventory && plate.length >= 7) {
      const match = inventory.find((v: any) => v.plate?.toUpperCase() === plate.toUpperCase());
      if (match) setVehicleModel(`${match.brand} ${match.model}`);
    }
  };

  const handleSubmit = () => {
    if (!vehiclePlate || !totalCost || !vehicleModel) {
      toast.error("Preencha pelo menos a placa, veículo e o valor total.");
      return;
    }
    createFuel.mutate({
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      fuelType: fuelType as "gasolina" | "etanol" | "diesel" | "gnv",
      liters: liters || "0",
      pricePerLiter: pricePerLiter || "0",
      totalCost: totalCost,
      odometer: odometer ? parseInt(odometer) : undefined,
      gasStation: gasStation || undefined,
      notes: notes || undefined,
      fuelDate: Date.now(),
    });
  };

  const allRecords: any[] = fuelRecords || [];
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const q = searchQuery.toLowerCase();
    return allRecords.filter((r: any) =>
      r.vehiclePlate?.toLowerCase().includes(q) ||
      r.vehicleModel?.toLowerCase().includes(q) ||
      r.gasStation?.toLowerCase().includes(q)
    );
  }, [allRecords, searchQuery]);

  const stats = useMemo(() => {
    const thisMonth = allRecords.filter((r: any) => {
      const d = new Date(r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalLiters = thisMonth.reduce((s: number, r: any) => s + Number(r.liters || 0), 0);
    const totalCost = thisMonth.reduce((s: number, r: any) => s + Number(r.totalCost || 0), 0);
    return { count: thisMonth.length, totalLiters, totalCost };
  }, [allRecords]);

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 border text-center bg-yellow-500/10 border-yellow-500/20">
          <p className="text-xl font-bold text-yellow-400">{stats.count}</p>
          <p className="text-[10px] text-gray-500">Abastec. mês</p>
        </div>
        <div className="rounded-xl p-3 border text-center bg-blue-500/10 border-blue-500/20">
          <p className="text-xl font-bold text-blue-400">{stats.totalLiters.toFixed(1)}L</p>
          <p className="text-[10px] text-gray-500">Litros mês</p>
        </div>
        <div className="rounded-xl p-3 border text-center bg-emerald-500/10 border-emerald-500/20">
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalCost)}</p>
          <p className="text-[10px] text-gray-500">Gasto mês</p>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-all">
        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showForm ? "Cancelar" : "Novo Abastecimento"}
      </button>

      {showForm && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Placa *</label>
              <Input value={vehiclePlate} onChange={e => handlePlateChange(e.target.value)}
                placeholder="ABC1D23" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" maxLength={7} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Veículo</label>
              <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)}
                placeholder="Marca / Modelo" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Combustível</label>
              <select value={fuelType} onChange={e => setFuelType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md text-white h-9 text-sm px-2">
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
                <option value="gnv">GNV</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Litros</label>
              <Input type="number" value={liters} onChange={e => setLiters(e.target.value)} onBlur={calcTotal}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">R$/Litro</label>
              <Input type="number" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} onBlur={calcTotal}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Total (R$) *</label>
              <Input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">KM</label>
              <Input type="number" value={odometer} onChange={e => setOdometer(e.target.value)}
                placeholder="Odômetro" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Posto</label>
            <Input value={gasStation} onChange={e => setGasStation(e.target.value)}
              placeholder="Nome do posto" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Observações</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Abastecimento para test drive" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          <AudioLauncher onResult={(parsed: any) => {
            if (parsed.vehiclePlate) setVehiclePlate(parsed.vehiclePlate);
            if (parsed.vehicleModel) setVehicleModel(parsed.vehicleModel);
            if (parsed.fuelType) setFuelType(parsed.fuelType);
            if (parsed.liters) setLiters(String(parsed.liters));
            if (parsed.pricePerLiter) setPricePerLiter(String(parsed.pricePerLiter));
            if (parsed.totalCost) setTotalCost(String(parsed.totalCost));
            if (parsed.odometer) setOdometer(String(parsed.odometer));
            if (parsed.gasStation) setGasStation(parsed.gasStation);
            if (parsed.notes) setNotes(parsed.notes);
            toast.success("Dados preenchidos pelo áudio!");
          }} context="gasolina" />
          <Button onClick={handleSubmit} disabled={createFuel.isPending}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold">
            {createFuel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Fuel className="h-4 w-4 mr-2" /> Registrar Abastecimento</>}
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por placa, veículo ou posto..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none" />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((r: any) => (
            <div key={r.id} className="rounded-xl border bg-gray-900/60 border-gray-800 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Fuel className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <p className="text-sm font-bold text-white">{r.vehiclePlate}</p>
                    {r.vehicleModel && <span className="text-xs text-gray-400">{r.vehicleModel}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                    <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">{r.fuelType}</span>
                    {r.liters && <span>{Number(r.liters).toFixed(1)}L</span>}
                    {r.pricePerLiter && <span>R${Number(r.pricePerLiter).toFixed(2)}/L</span>}
                    {r.odometer && <span>{r.odometer.toLocaleString("pt-BR")} km</span>}
                    {r.gasStation && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.gasStation}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(r.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-yellow-400 shrink-0 ml-2">{formatCurrency(Number(r.totalCost))}</p>
              </div>
              {r.notes && <p className="text-[11px] text-gray-500 mt-2">{r.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-10 text-center">
          <Fuel className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum abastecimento registrado.</p>
        </div>
      )}
    </div>
  );
}

// ===== AUDIO LAUNCHER (reusable) =====
function AudioLauncher({ onResult, context }: { onResult: (parsed: any) => void; context: "conta_pagar" | "conta_receber" | "gasolina" }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadMedia = trpc.crmChat.uploadMedia.useMutation();
  const parseAudio = trpc.finTransactions.parseAudio.useMutation({
    onSuccess: (data: any) => {
      onResult(data);
      setProcessing(false);
    },
    onError: (e: any) => {
      toast.error("Erro ao processar áudio: " + e.message);
      setProcessing(false);
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const { url } = await uploadMedia.mutateAsync({ base64, filename: "audio.webm", mimeType: "audio/webm" });
            parseAudio.mutate({ audioUrl: url, context });
          } catch (err: any) {
            toast.error("Erro no upload do áudio: " + err.message);
            setProcessing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      setRecording(true);
      toast.info("Gravando... Fale os dados do lançamento.");
    } catch { toast.error("Não foi possível acessar o microfone."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {processing ? (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 w-full">
          <Loader2 className="h-4 w-4 animate-spin" /> Processando áudio com IA...
        </div>
      ) : recording ? (
        <button onClick={stopRecording}
          className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 w-full animate-pulse">
          <MicOff className="h-4 w-4" /> Gravando... Toque para parar
        </button>
      ) : (
        <button onClick={startRecording}
          className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 w-full hover:bg-gray-700 hover:text-white transition-all">
          <Mic className="h-4 w-4" />
          {context === "gasolina" ? "Lançar por áudio" : "Lançar conta por áudio"}
        </button>
      )}
    </div>
  );
}
