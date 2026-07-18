import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Fuel,
  Loader2,
  MessageCircle,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MonthNavigator } from "@/features/financeiro/components/MonthNavigator";
import { MONTH_NAMES } from "@/features/financeiro/utils/constants";
import { formatCurrency, formatDate } from "@/features/financeiro/utils/formatters";

export function DashboardTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dismissedAlerts, setDismissedAlerts] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: dashboard } = trpc.finTransactions.dashboard.useQuery({ month, year });
  const { data: alerts } = trpc.finTransactions.alerts.useQuery(undefined, { refetchInterval: 60000 });
  const { data: fuelDash } = trpc.fuel.dashboard.useQuery({ month, year });
  const { data: pvGastos } = trpc.pvGastos.list.useQuery({ chamadoId: 0 });

  const sendNotification = trpc.finTransactions.sendAlertNotification.useMutation({
    onSuccess: (data) => {
      if (data.sent) {
        toast.success("Notificação de alerta enviada!");
        return;
      }
      toast.info("Nenhuma conta pendente para notificar");
    },
    onError: () => toast.error("Erro ao enviar notificação"),
  });

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
      return;
    }
    setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
      return;
    }
    setMonth(month + 1);
  };

  const dashboardSummary = dashboard || {
    totalPayable: 0,
    totalPaid: 0,
    pendingPayable: 0,
    totalReceivable: 0,
    totalReceived: 0,
    pendingReceivable: 0,
    overdue: 0,
    upcomingDue: [],
  };

  const balance = dashboardSummary.totalReceivable - dashboardSummary.totalPayable;

  const pvTotal = useMemo(() => {
    if (!Array.isArray(pvGastos)) return 0;
    return pvGastos
      .filter((gasto: any) => {
        const date = new Date(gasto.createdAt);
        return date.getMonth() + 1 === month && date.getFullYear() === year;
      })
      .reduce((sum: number, gasto: any) => sum + Number(gasto.valor || 0), 0);
  }, [month, pvGastos, year]);

  const alertsSummary = alerts?.summary || {
    overdueCount: 0,
    overdueTotal: 0,
    dueTodayCount: 0,
    dueTodayTotal: 0,
    dueTomorrowCount: 0,
    dueTomorrowTotal: 0,
    dueWeekCount: 0,
    dueWeekTotal: 0,
  };

  const totalAlerts =
    alertsSummary.overdueCount +
    alertsSummary.dueTodayCount +
    alertsSummary.dueTomorrowCount;

  const getDaysOverdue = (dueDate: number) => {
    const diff = Date.now() - dueDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const toggleSection = (section: string) => {
    setExpandedSection((currentSection) => (currentSection === section ? null : section));
  };

  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      {totalAlerts > 0 && !dismissedAlerts && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-950/60 via-red-900/30 to-orange-950/40 p-4">
          <div className="pointer-events-none absolute inset-0 animate-pulse bg-red-500/5" />

          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {totalAlerts}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">ALERTAS FINANCEIROS</p>
                  <p className="text-[10px] text-gray-400">
                    {totalAlerts} conta(s) precisam de atenção
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => sendNotification.mutate()}
                  disabled={sendNotification.isPending}
                  className="rounded-lg bg-red-500/20 p-1.5 text-red-400 transition-colors hover:bg-red-500/30"
                  title="Enviar notificação"
                >
                  {sendNotification.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setDismissedAlerts(true)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {alertsSummary.overdueCount > 0 && (
                <button
                  onClick={() => toggleSection("overdue")}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    expandedSection === "overdue"
                      ? "border-red-500/50 bg-red-500/20 ring-1 ring-red-500/30"
                      : "border-red-500/20 bg-red-500/10 hover:bg-red-500/15"
                  }`}
                >
                  <div className="text-lg font-bold text-red-400">{alertsSummary.overdueCount}</div>
                  <div className="text-[9px] font-bold uppercase text-red-300/80">Atrasadas</div>
                  <div className="mt-0.5 text-[10px] font-bold text-red-400/70">
                    {formatCurrency(alertsSummary.overdueTotal)}
                  </div>
                </button>
              )}
              {alertsSummary.dueTodayCount > 0 && (
                <button
                  onClick={() => toggleSection("today")}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    expandedSection === "today"
                      ? "border-yellow-500/50 bg-yellow-500/20 ring-1 ring-yellow-500/30"
                      : "border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/15"
                  }`}
                >
                  <div className="text-lg font-bold text-yellow-400">{alertsSummary.dueTodayCount}</div>
                  <div className="text-[9px] font-bold uppercase text-yellow-300/80">Vence Hoje</div>
                  <div className="mt-0.5 text-[10px] font-bold text-yellow-400/70">
                    {formatCurrency(alertsSummary.dueTodayTotal)}
                  </div>
                </button>
              )}
              {alertsSummary.dueTomorrowCount > 0 && (
                <button
                  onClick={() => toggleSection("tomorrow")}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    expandedSection === "tomorrow"
                      ? "border-orange-500/50 bg-orange-500/20 ring-1 ring-orange-500/30"
                      : "border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/15"
                  }`}
                >
                  <div className="text-lg font-bold text-orange-400">{alertsSummary.dueTomorrowCount}</div>
                  <div className="text-[9px] font-bold uppercase text-orange-300/80">Amanhã</div>
                  <div className="mt-0.5 text-[10px] font-bold text-orange-400/70">
                    {formatCurrency(alertsSummary.dueTomorrowTotal)}
                  </div>
                </button>
              )}
            </div>

            {expandedSection === "overdue" && (alerts?.overdue?.length ?? 0) > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-red-500/20 bg-red-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-300">Contas Atrasadas</p>
                {alerts?.overdue?.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-red-500/10 p-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-200">{transaction.description}</p>
                      <p className="text-[10px] text-red-300/70">
                        {transaction.supplier ? `${transaction.supplier} • ` : ""}
                        Venceu {formatDate(transaction.dueDate)} ({getDaysOverdue(transaction.dueDate)} dias)
                      </p>
                    </div>
                    <span className="ml-2 whitespace-nowrap font-bold text-red-400">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {expandedSection === "today" && (alerts?.dueToday?.length ?? 0) > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-yellow-500/20 bg-yellow-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">Vencem Hoje</p>
                {alerts?.dueToday?.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-200">{transaction.description}</p>
                      <p className="text-[10px] text-yellow-300/70">
                        {transaction.supplier ? `${transaction.supplier} • ` : ""}
                        {transaction.type === "payable" ? "A Pagar" : "A Receber"}
                      </p>
                    </div>
                    <span className="ml-2 whitespace-nowrap font-bold text-yellow-400">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {expandedSection === "tomorrow" && (alerts?.dueTomorrow?.length ?? 0) > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-orange-500/20 bg-orange-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Vencem Amanhã</p>
                {alerts?.dueTomorrow?.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-orange-500/10 p-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-200">{transaction.description}</p>
                      <p className="text-[10px] text-orange-300/70">
                        {transaction.supplier ? `${transaction.supplier} • ` : ""}
                        {transaction.type === "payable" ? "A Pagar" : "A Receber"}
                      </p>
                    </div>
                    <span className="ml-2 whitespace-nowrap font-bold text-orange-400">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {alertsSummary.dueWeekCount > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300">
                    <b>{alertsSummary.dueWeekCount}</b> conta(s) vencem esta semana
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">
                  {formatCurrency(alertsSummary.dueWeekTotal)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {totalAlerts > 0 && dismissedAlerts && (
        <button
          onClick={() => setDismissedAlerts(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 transition-colors hover:bg-red-500/15"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          <span className="text-[11px] font-medium text-red-300">
            {totalAlerts} alerta(s) pendente(s) — toque para ver
          </span>
        </button>
      )}

      <MonthNavigator
        label={`${MONTH_NAMES[month - 1]} ${year}`}
        onPrevious={prevMonth}
        onNext={nextMonth}
      />

      <div className={`rounded-2xl border-2 p-5 ${balance >= 0 ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5" : "border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/5"}`}>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Balanço do Mês</p>
        <p className={`text-3xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {formatCurrency(balance)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase text-gray-500">Total a Receber</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(dashboardSummary.totalReceivable)}</p>
            <p className="text-[10px] text-emerald-400/60">Recebido: {formatCurrency(dashboardSummary.totalReceived)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-500">Total a Pagar</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(dashboardSummary.totalPayable)}</p>
            <p className="text-[10px] text-red-400/60">Pago: {formatCurrency(dashboardSummary.totalPaid)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
          <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-red-400" />
          <p className="text-xl font-bold text-red-400">
            {alertsSummary.overdueCount + alertsSummary.dueTodayCount}
          </p>
          <p className="text-[9px] text-gray-500">Vencidas/Hoje</p>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-center">
          <Wrench className="mx-auto mb-1 h-5 w-5 text-orange-400" />
          <p className="text-xl font-bold text-orange-400">{formatCurrency(pvTotal)}</p>
          <p className="text-[9px] text-gray-500">Pós-Venda</p>
        </div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-center">
          <Fuel className="mx-auto mb-1 h-5 w-5 text-yellow-400" />
          <p className="text-xl font-bold text-yellow-400">{formatCurrency(fuelDash?.totalCost || 0)}</p>
          <p className="text-[9px] text-gray-500">Gasolina</p>
        </div>
      </div>
    </div>
  );
}
