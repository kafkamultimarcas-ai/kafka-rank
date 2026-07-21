import { Plus, Receipt, X } from "lucide-react";
import { AudioLauncher } from "@/features/financeiro/components/AudioLauncher";
import { MonthNavigator } from "@/features/financeiro/components/MonthNavigator";
import { ContaForm } from "@/features/financeiro/contas/ContaForm";
import { ContaList } from "@/features/financeiro/contas/ContaList";
import { ContasFilters } from "@/features/financeiro/contas/ContasFilters";
import { ContasSummaryDesktop } from "@/features/financeiro/contas/ContasSummaryDesktop";
import { useContasState } from "@/features/financeiro/contas/useContasState";
import { formatCurrency } from "@/features/financeiro/utils/formatters";

interface ContasTabProps {
  initialContaId?: number | null;
}

export function ContasTab({ initialContaId }: ContasTabProps = {}) {
  const state = useContasState(initialContaId);

  const formProps = {
    categories: state.categories,
    sellersList: state.sellersList,
    sellerNameById: state.sellerNameById,
    editingTx: state.editingTx,
    txType: state.txType,
    setTxType: state.setTxType,
    txDescription: state.txDescription,
    setTxDescription: state.setTxDescription,
    txAmount: state.txAmount,
    setTxAmount: state.setTxAmount,
    txDueDate: state.txDueDate,
    setTxDueDate: state.setTxDueDate,
    txSupplier: state.txSupplier,
    setTxSupplier: state.setTxSupplier,
    txVehicle: state.txVehicle,
    setTxVehicle: state.setTxVehicle,
    txNotes: state.txNotes,
    setTxNotes: state.setTxNotes,
    txCategoryId: state.txCategoryId,
    setTxCategoryId: state.setTxCategoryId,
    txNeedsApproval: state.txNeedsApproval,
    setTxNeedsApproval: state.setTxNeedsApproval,
    txRecurrence: state.txRecurrence,
    setTxRecurrence: state.setTxRecurrence,
    txRecurrenceMonths: state.txRecurrenceMonths,
    setTxRecurrenceMonths: state.setTxRecurrenceMonths,
    txIsVale: state.txIsVale,
    setTxIsVale: state.setTxIsVale,
    txSellerId: state.txSellerId,
    setTxSellerId: state.setTxSellerId,
    onAudioResult: state.handleAudioResult,
    onSubmit: state.submitForm,
    isSubmitting: state.isSubmitting,
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-4">
      <div className="space-y-4 lg:hidden">
        <MonthNavigator
          label={state.monthLabel}
          onPrevious={state.prevMonth}
          onNext={state.nextMonth}
          compact
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-[9px] font-bold uppercase text-gray-500">A Receber</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(state.stats.totalReceivable)}</p>
            <p className="text-[10px] text-emerald-400/60">Recebido: {formatCurrency(state.stats.totalReceived)}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[9px] font-bold uppercase text-gray-500">A Pagar</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(state.stats.totalPayable)}</p>
            <p className="text-[10px] text-red-400/60">Pago: {formatCurrency(state.stats.totalPaid)}</p>
          </div>
        </div>

        <ContasFilters
          statusOptions={state.statusOptions}
          typeOptions={state.typeOptions}
          filter={state.filter}
          onFilterChange={state.setFilter}
          typeFilter={state.typeFilter}
          onTypeFilterChange={state.setTypeFilter}
          searchQuery={state.searchQuery}
          onSearchChange={state.setSearchQuery}
          filterVehicle={state.filterVehicle}
          onVehicleFilterChange={state.setFilterVehicle}
        />

        <div className="space-y-2">
          <button
            onClick={() => {
              state.setShowForm(!state.showForm);
              state.setEditingTx(null);
              if (state.showForm) {
                state.resetForm();
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500"
          >
            {state.showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {state.showForm ? "Cancelar" : "Nova Conta"}
          </button>
          {!state.showForm && <AudioLauncher onResult={state.handleAudioResult} context="conta_pagar" />}
        </div>

        {state.showForm && (
          <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/80 p-4">
            <p className="text-sm font-bold text-white">{state.editingTx ? "Editar Conta" : "Nova Conta"}</p>
            <ContaForm {...formProps} />
          </div>
        )}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[minmax(260px,1fr)_minmax(420px,1.15fr)_minmax(260px,1fr)] lg:gap-5">
        <ContasSummaryDesktop
          panelType="receivable"
          typedStats={state.typedStats}
          stats={state.stats}
          filter={state.filter}
          typeFilter={state.typeFilter}
          onFilterChange={state.setFilter}
          onTypeFilterChange={state.setTypeFilter}
        />

        <section className="space-y-5">
          <div className="relative overflow-hidden rounded-[30px] border border-gray-700/70 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.9),rgba(8,11,24,0.98))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px border-t border-dashed border-gray-500/40" />
            <div className="pointer-events-none absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/20 bg-slate-900 shadow-[0_10px_30px_rgba(34,211,238,0.15)]">
              <Receipt className="h-7 w-7 text-cyan-300" />
            </div>
            <div className="rounded-[24px] border border-gray-700/70 bg-slate-950/45 p-5 pt-10">
              <div className="mb-5 text-center">
                <p className="text-2xl font-black uppercase tracking-[0.2em] text-white">
                  {state.editingTx ? "Editar Conta" : "Nova Conta"}
                </p>
              </div>
              <div className="space-y-3">
                <ContaForm {...formProps} />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-800 bg-gray-950/70 p-2">
            <MonthNavigator
              label={state.monthLabel}
              onPrevious={state.prevMonth}
              onNext={state.nextMonth}
              compact
            />
          </div>
        </section>

        <ContasSummaryDesktop
          panelType="payable"
          typedStats={state.typedStats}
          stats={state.stats}
          filter={state.filter}
          typeFilter={state.typeFilter}
          onFilterChange={state.setFilter}
          onTypeFilterChange={state.setTypeFilter}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <ContasFilters
              statusOptions={state.statusOptions}
              typeOptions={state.typeOptions}
              filter={state.filter}
              onFilterChange={state.setFilter}
              typeFilter={state.typeFilter}
              onTypeFilterChange={state.setTypeFilter}
              searchQuery={state.searchQuery}
              onSearchChange={state.setSearchQuery}
              filterVehicle={state.filterVehicle}
              onVehicleFilterChange={state.setFilterVehicle}
              showSearchOnly
            />
          </div>
        </div>

        <ContaList
          transactions={state.paginatedTransactions}
          filteredTotal={state.totalRecords}
          emptyMessage={state.emptyMessage}
          expandedId={state.expandedId}
          onToggleExpand={(id) => state.setExpandedId(state.expandedId === id ? null : id)}
          onEdit={state.startEdit}
          onDelete={(transaction) => {
            if (confirm("Excluir esta conta?")) {
              state.deleteTransaction.mutate({ id: transaction.id });
            }
          }}
          onMarkPaid={(transaction) => state.markPaid.mutate({ id: transaction.id, paidDate: Date.now() })}
          onApprove={(transaction, approved) =>
            state.approveTransaction.mutate({
              id: transaction.id,
              approved,
              approvedBy: state.sellerSession?.name || "Admin",
            })
          }
          getCategoryName={state.getCategoryName}
          sellerNameById={state.sellerNameById}
          isMarkingPaid={state.markPaid.isPending}
          page={state.page}
          totalPages={state.totalPages}
          pageSize={state.pageSize}
          isLoadingPage={state.isTransactionsFetching}
          onPageChange={state.setPage}
          onPageSizeChange={state.setPageSize}
        />
      </div>
    </div>
  );
}
