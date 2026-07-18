import { ChevronRight } from "lucide-react";
import { CONTAS_DESKTOP_PANEL_OPTIONS } from "@/features/financeiro/utils/constants";
import { formatCurrency } from "@/features/financeiro/utils/formatters";
import type { ContasFilter, ContasTypeFilter } from "@/features/financeiro/contas/useContasState";

interface ContasSummaryDesktopProps {
  panelType: "receivable" | "payable";
  typedStats: {
    payable: { total: number; pending: number; overdue: number; dueToday: number; paid: number; approval: number };
    receivable: { total: number; pending: number; overdue: number; dueToday: number; paid: number; approval: number };
  };
  stats: {
    totalPayable: number;
    totalReceivable: number;
    totalPaid: number;
    totalReceived: number;
  };
  filter: ContasFilter;
  typeFilter: ContasTypeFilter;
  onFilterChange: (filter: ContasFilter) => void;
  onTypeFilterChange: (filter: ContasTypeFilter) => void;
}

export function ContasSummaryDesktop({
  panelType,
  typedStats,
  stats,
  filter,
  typeFilter,
  onFilterChange,
  onTypeFilterChange,
}: ContasSummaryDesktopProps) {
  const isReceivable = panelType === "receivable";
  const panelStats = isReceivable ? typedStats.receivable : typedStats.payable;
  const totalAmount = isReceivable ? stats.totalReceivable : stats.totalPayable;
  const settledAmount = isReceivable ? stats.totalReceived : stats.totalPaid;
  const accentClass = isReceivable ? "emerald" : "red";

  return (
    <section className={`rounded-[28px] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] ${isReceivable ? "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(6,78,59,0.30),rgba(3,10,20,0.92))]" : "border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(10,4,14,0.94))]"}`}>
      <div className="mb-6 flex items-center gap-4">
        <div className={`flex h-20 w-20 items-center justify-center rounded-full border ${isReceivable ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          {isReceivable ? (
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 19L19 5" />
              <path d="M9 5h10v10" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l14 14" />
              <path d="M19 9V19H9" />
            </svg>
          )}
        </div>
        <div>
          <p className={`text-sm font-black uppercase tracking-[0.18em] ${isReceivable ? "text-emerald-300" : "text-red-300"}`}>
            {isReceivable ? "A Receber" : "A Pagar"}
          </p>
          <p className={`text-4xl font-black ${isReceivable ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(totalAmount)}
          </p>
          <p className={`mt-1 text-sm ${isReceivable ? "text-emerald-200/70" : "text-red-200/70"}`}>
            {isReceivable ? "Recebido" : "Pago"}: {formatCurrency(settledAmount)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {CONTAS_DESKTOP_PANEL_OPTIONS.map((option) => {
          const Icon = option.icon;
          const count =
            option.key === "all"
              ? panelStats.total
              : option.key === "pending"
                ? panelStats.pending
                : option.key === "overdue"
                  ? panelStats.overdue
                  : option.key === "due_today"
                    ? panelStats.dueToday ?? 0
                    : option.key === "paid"
                      ? panelStats.paid
                      : panelStats.approval;
          const active = typeFilter === panelType && filter === option.key;

          return (
            <button
              key={`${panelType}-${option.key}`}
              onClick={() => {
                onTypeFilterChange(panelType);
                onFilterChange(option.key as ContasFilter);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                active
                  ? panelType === "receivable"
                    ? "border-emerald-400/60 bg-emerald-400/15 text-white"
                    : "border-red-400/60 bg-red-400/15 text-white"
                  : panelType === "receivable"
                    ? "border-emerald-500/15 bg-black/15 text-emerald-50/85 hover:border-emerald-400/30 hover:bg-emerald-400/10"
                    : "border-red-500/15 bg-black/15 text-red-50/85 hover:border-red-400/30 hover:bg-red-400/10"
              }`}
            >
              <span className="flex items-center gap-3 font-bold">
                <Icon className={`h-4 w-4 ${accentClass === "emerald" ? "text-emerald-300" : "text-red-300"}`} />
                {option.label} ({count})
              </span>
              <ChevronRight className={`h-4 w-4 ${accentClass === "emerald" ? "text-emerald-300/70" : "text-red-300/70"}`} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
