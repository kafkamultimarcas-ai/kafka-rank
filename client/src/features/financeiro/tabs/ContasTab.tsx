import { useState } from "react";
import { CheckCircle, Clock, Download, Layers, Plus, Receipt, X, XCircle } from "lucide-react";
import { AudioLauncher } from "@/features/financeiro/components/AudioLauncher";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/features/financeiro/utils/formatters";
import { MonthNavigator } from "@/features/financeiro/components/MonthNavigator";
import { ContaForm } from "@/features/financeiro/contas/ContaForm";
import { ContaList } from "@/features/financeiro/contas/ContaList";
import { ContasFilters } from "@/features/financeiro/contas/ContasFilters";
import { ContasSummaryDesktop } from "@/features/financeiro/contas/ContasSummaryDesktop";
import { useContasState } from "@/features/financeiro/contas/useContasState";

interface ContasTabProps {
  initialContaId?: number | null;
}

export function ContasTab({ initialContaId }: ContasTabProps = {}) {
  const state = useContasState(initialContaId);
  const [installmentGroupId, setInstallmentGroupId] = useState<string | null>(null);
  const { data: installmentItems } = trpc.finTransactions.listGroup.useQuery(
    { groupId: installmentGroupId! },
    { enabled: !!installmentGroupId }
  );

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
    txPaymentMethod: state.txPaymentMethod,
    setTxPaymentMethod: state.setTxPaymentMethod,
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
          onDeleteGroup={(transaction) => {
            if (confirm(`Excluir todas as parcelas não pagas deste lançamento (${transaction.installmentTotal} parcelas)?`)) {
              state.deleteGroup.mutate({ groupId: transaction.installmentGroupId });
            }
          }}
          onViewInstallments={(transaction) => {
            if (transaction.installmentGroupId) {
              setInstallmentGroupId(transaction.installmentGroupId);
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

      {/* Modal de Parcelas */}
      {installmentGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setInstallmentGroupId(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Parcelas do Lançamento</h3>
                </div>
                <button onClick={() => setInstallmentGroupId(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {installmentItems && installmentItems.length > 0 && (() => {
                const totalAmount = installmentItems.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
                const paidAmount = installmentItems.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
                const pctPaid = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
                return (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">Progresso de pagamento</span>
                      <span className="font-bold text-emerald-400">{pctPaid}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${pctPaid}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{formatCurrency(paidAmount)} de {formatCurrency(totalAmount)} pago</p>
                  </div>
                );
              })()}
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              {!installmentItems ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-800" />
                  ))}
                </div>
              ) : installmentItems.length === 0 ? (
                <p className="text-center text-sm text-gray-500">Nenhuma parcela encontrada.</p>
              ) : (
                <div className="space-y-2">
                  {installmentItems.map((item: any, idx: number) => {
                    const isPaid = item.status === "paid";
                    const isOverdue = !isPaid && item.dueDate < Date.now();
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                          isPaid ? "border-emerald-500/20 bg-emerald-500/10" :
                          isOverdue ? "border-red-500/20 bg-red-500/10" :
                          "border-gray-800 bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            isPaid ? "bg-emerald-500/20 text-emerald-400" :
                            isOverdue ? "bg-red-500/20 text-red-400" :
                            "bg-gray-700 text-gray-300"
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              Parcela {item.installmentNumber || idx + 1}/{item.installmentTotal || installmentItems.length}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(item.dueDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`text-sm font-bold ${
                            isPaid ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-white"
                          }`}>
                            {formatCurrency(item.amount)}
                          </p>
                          {isPaid ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                          ) : isOverdue ? (
                            <XCircle className="h-4 w-4 text-red-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {installmentItems && installmentItems.length > 0 && (
              <div className="border-t border-gray-800 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total ({installmentItems.length} parcelas)</p>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency(installmentItems.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0))}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {installmentItems.filter((i: any) => i.status === "paid").length} pagas
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Clock className="h-3.5 w-3.5" />
                      {installmentItems.filter((i: any) => i.status === "pending").length} pendentes
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      {installmentItems.filter((i: any) => i.status !== "paid" && i.dueDate < Date.now()).length} vencidas
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!installmentItems) return;
                    const totalAmt = installmentItems.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
                    const paidAmt = installmentItems.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
                    let html = `<html><head><meta charset="utf-8"><title>Parcelas</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:bold}.paid{color:#16a34a}.overdue{color:#dc2626}.pending{color:#ca8a04}.footer{margin-top:16px;font-size:14px;font-weight:bold}</style></head><body>`;
                    html += `<h1>Parcelas do Lan\u00e7amento</h1>`;
                    html += `<p style="font-size:13px;color:#666">Gerado em ${new Date().toLocaleDateString("pt-BR")} \u00e0s ${new Date().toLocaleTimeString("pt-BR")}</p>`;
                    html += `<table><thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>`;
                    installmentItems.forEach((item: any, idx: number) => {
                      const isPd = item.status === "paid";
                      const isOv = !isPd && item.dueDate < Date.now();
                      const statusLabel = isPd ? "Paga" : isOv ? "Vencida" : "Pendente";
                      const cls = isPd ? "paid" : isOv ? "overdue" : "pending";
                      html += `<tr><td>${idx + 1}</td><td>${formatDate(item.dueDate)}</td><td>${formatCurrency(item.amount)}</td><td class="${cls}">${statusLabel}</td></tr>`;
                    });
                    html += `</tbody></table>`;
                    html += `<p class="footer">Total: ${formatCurrency(totalAmt)} | Pago: ${formatCurrency(paidAmt)} | Restante: ${formatCurrency(totalAmt - paidAmt)}</p>`;
                    html += `</body></html>`;
                    const blob = new Blob([html], { type: "application/pdf" });
                    const url = URL.createObjectURL(blob);
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(html);
                      printWindow.document.close();
                      setTimeout(() => { printWindow.print(); }, 300);
                    }
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
