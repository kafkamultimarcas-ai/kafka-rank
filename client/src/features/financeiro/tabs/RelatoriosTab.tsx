import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Fuel,
  PieChart,
  Printer,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/features/financeiro/components/EmptyState";
import { MonthNavigator } from "@/features/financeiro/components/MonthNavigator";
import { MONTH_NAMES } from "@/features/financeiro/utils/constants";
import { formatCurrency, formatDate, formatDateFull } from "@/features/financeiro/utils/formatters";
import { useBranding } from "@/contexts/TenantContext";

export function RelatoriosTab() {
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

  const allTransactions: any[] = (transactionsData as any)?.items || [];

  const getCategoryName = (categoryId: number) => {
    const category = (categories || []).find((item: any) => item.id === categoryId);
    return category?.name || "Sem categoria";
  };

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; payable: number; receivable: number; paid: number; count: number }> = {};

    allTransactions.forEach((transaction: any) => {
      const categoryName = getCategoryName(transaction.categoryId);
      if (!map[categoryName]) {
        map[categoryName] = { name: categoryName, payable: 0, receivable: 0, paid: 0, count: 0 };
      }

      map[categoryName].count += 1;
      if (transaction.type === "payable") {
        map[categoryName].payable += Number(transaction.amount || 0);
      } else {
        map[categoryName].receivable += Number(transaction.amount || 0);
      }
      if (transaction.status === "paid") {
        map[categoryName].paid += Number(transaction.amount || 0);
      }
    });

    return Object.values(map).sort((a, b) => b.payable + b.receivable - (a.payable + a.receivable));
  }, [allTransactions, categories]);

  const posVendaTotals = useMemo(() => {
    if (!Array.isArray(pvGastos)) {
      return { total: 0, count: 0, items: [] as any[] };
    }

    const monthItems = pvGastos.filter((gasto: any) => {
      const date = new Date(gasto.createdAt);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });

    return {
      total: monthItems.reduce((sum: number, gasto: any) => sum + Number(gasto.valor || 0), 0),
      count: monthItems.length,
      items: monthItems,
    };
  }, [month, pvGastos, year]);

  const fuelTotals = useMemo(() => {
    const records = fuelRecords || [];
    return {
      total: records.reduce((sum: number, record: any) => sum + Number(record.totalCost || 0), 0),
      liters: records.reduce((sum: number, record: any) => sum + Number(record.liters || 0), 0),
      count: records.length,
    };
  }, [fuelRecords]);

  const summary = useMemo(() => {
    const payable = allTransactions.filter((transaction: any) => transaction.type === "payable");
    const receivable = allTransactions.filter((transaction: any) => transaction.type === "receivable");
    const paid = allTransactions.filter((transaction: any) => transaction.status === "paid");
    const pending = allTransactions.filter(
      (transaction: any) => transaction.status === "pending" || transaction.status === "overdue"
    );

    return {
      totalPayable: payable.reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0),
      totalReceivable: receivable.reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0),
      totalPaid: paid
        .filter((transaction: any) => transaction.type === "payable")
        .reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0),
      totalReceived: paid
        .filter((transaction: any) => transaction.type === "receivable")
        .reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0),
      pendingCount: pending.length,
      paidCount: paid.length,
      totalCount: allTransactions.length,
    };
  }, [allTransactions]);

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

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Relatório Financeiro - ${MONTH_NAMES[month - 1]} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #444; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f5f5f5; font-weight: bold; }
            .total { font-weight: bold; font-size: 14px; }
            .green { color: #16a34a; }
            .red { color: #dc2626; }
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .summary-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .summary-box h3 { margin: 0 0 5px; font-size: 12px; color: #888; text-transform: uppercase; }
            .summary-box p { margin: 0; font-size: 22px; font-weight: bold; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Relatório Financeiro — ${MONTH_NAMES[month - 1]} ${year}</h1>
          <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
          <div class="summary-grid">
            <div class="summary-box"><h3>Total a Receber</h3><p class="green">${formatCurrency(summary.totalReceivable)}</p></div>
            <div class="summary-box"><h3>Total a Pagar</h3><p class="red">${formatCurrency(summary.totalPayable)}</p></div>
            <div class="summary-box"><h3>Recebido</h3><p class="green">${formatCurrency(summary.totalReceived)}</p></div>
            <div class="summary-box"><h3>Pago</h3><p class="red">${formatCurrency(summary.totalPaid)}</p></div>
          </div>
          <p class="total">Balanço: <span class="${summary.totalReceivable - summary.totalPayable >= 0 ? "green" : "red"}">${formatCurrency(summary.totalReceivable - summary.totalPayable)}</span></p>
          <h2>Despesas por Categoria</h2>
          <table>
            <tr><th>Categoria</th><th>Qtd</th><th>A Pagar</th><th>A Receber</th><th>Pago</th></tr>
            ${categoryBreakdown.map((item) => `<tr><td>${item.name}</td><td>${item.count}</td><td class="red">${formatCurrency(item.payable)}</td><td class="green">${formatCurrency(item.receivable)}</td><td>${formatCurrency(item.paid)}</td></tr>`).join("")}
          </table>
          <h2>Pós-Venda</h2>
          <p>Total de gastos: <strong class="red">${formatCurrency(posVendaTotals.total)}</strong> (${posVendaTotals.count} lançamentos)</p>
          <h2>Gasolina</h2>
          <p>Total gasto: <strong class="red">${formatCurrency(fuelTotals.total)}</strong> | ${fuelTotals.liters.toFixed(1)} litros | ${fuelTotals.count} abastecimentos</p>
          <h2>Todas as Transações</h2>
          <table>
            <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th>Valor</th><th>Status</th></tr>
            ${[...allTransactions].sort((a: any, b: any) => a.dueDate - b.dueDate).map((transaction: any) => `
              <tr>
                <td>${formatDateFull(transaction.dueDate)}</td>
                <td>${transaction.type === "payable" ? "Pagar" : "Receber"}</td>
                <td>${transaction.description}</td>
                <td>${transaction.supplier || "-"}</td>
                <td>${getCategoryName(transaction.categoryId)}</td>
                <td class="${transaction.type === "payable" ? "red" : "green"}">${formatCurrency(transaction.amount)}</td>
                <td>${transaction.status === "paid" ? "Pago" : transaction.status === "overdue" ? "Vencido" : "Pendente"}</td>
              </tr>
            `).join("")}
          </table>
          <p style="margin-top:40px;text-align:center;color:#999;font-size:11px;">${brandName} — Sistema de Gestão</p>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleExportCSV = () => {
    const headers = "Data,Tipo,Descrição,Fornecedor,Categoria,Valor,Status\n";
    const rows = [...allTransactions]
      .sort((a: any, b: any) => a.dueDate - b.dueDate)
      .map((transaction: any) =>
        `${formatDateFull(transaction.dueDate)},${transaction.type === "payable" ? "A Pagar" : "A Receber"},"${transaction.description}","${transaction.supplier || ""}","${getCategoryName(transaction.categoryId)}",${transaction.amount},${transaction.status === "paid" ? "Pago" : transaction.status === "overdue" ? "Vencido" : "Pendente"}`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-financeiro-${MONTH_NAMES[month - 1]}-${year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      <MonthNavigator
        label={`${MONTH_NAMES[month - 1]} ${year}`}
        onPrevious={prevMonth}
        onNext={nextMonth}
        compact
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition-all hover:bg-purple-500"
        >
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white transition-all hover:bg-cyan-500"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
          <p className="text-[9px] font-bold uppercase text-gray-500">Receitas</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.totalReceivable)}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
          <p className="text-[9px] font-bold uppercase text-gray-500">Despesas</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(summary.totalPayable)}</p>
        </div>
      </div>

      <div className={`rounded-xl border p-4 text-center ${summary.totalReceivable - summary.totalPayable >= 0 ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"}`}>
        <p className="text-[9px] font-bold uppercase text-gray-500">Lucro / Prejuízo</p>
        <p className={`text-2xl font-bold ${summary.totalReceivable - summary.totalPayable >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {formatCurrency(summary.totalReceivable - summary.totalPayable)}
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <PieChart className="h-4 w-4 text-purple-400" /> Despesas por Categoria
        </h3>
        {categoryBreakdown.length > 0 ? (
          <div className="space-y-2">
            {categoryBreakdown.map((item, index) => {
              const total = item.payable + item.receivable;
              const maxTotal = Math.max(...categoryBreakdown.map((category) => category.payable + category.receivable));
              const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

              return (
                <div key={`${item.name}-${index}`}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-300">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{item.count}x</span>
                      {item.payable > 0 && <span className="text-red-400">{formatCurrency(item.payable)}</span>}
                      {item.receivable > 0 && <span className="text-emerald-400">{formatCurrency(item.receivable)}</span>}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-gray-500">Sem dados para este mês.</p>
        )}
      </div>

      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-400">
          <Wrench className="h-4 w-4" /> Gastos Pós-Venda
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase text-gray-500">Total Gasto</p>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(posVendaTotals.total)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-500">Lançamentos</p>
            <p className="text-lg font-bold text-orange-400">{posVendaTotals.count}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-400">
          <Fuel className="h-4 w-4" /> Gasolina
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] uppercase text-gray-500">Total</p>
            <p className="text-lg font-bold text-yellow-400">{formatCurrency(fuelTotals.total)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-500">Litros</p>
            <p className="text-lg font-bold text-yellow-400">{fuelTotals.liters.toFixed(1)}L</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-500">Abastec.</p>
            <p className="text-lg font-bold text-yellow-400">{fuelTotals.count}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
        <div className="border-b border-gray-800 p-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <FileSpreadsheet className="h-4 w-4 text-cyan-400" /> Planilha de Transações
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="px-3 py-2 text-left font-bold text-gray-400">Data</th>
                <th className="px-3 py-2 text-left font-bold text-gray-400">Descrição</th>
                <th className="px-3 py-2 text-right font-bold text-gray-400">Valor</th>
                <th className="px-3 py-2 text-center font-bold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...allTransactions].sort((a: any, b: any) => a.dueDate - b.dueDate).map((transaction: any) => (
                <tr key={transaction.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-400">{formatDate(transaction.dueDate)}</td>
                  <td className="max-w-[150px] truncate px-3 py-2 text-white">{transaction.description}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right font-bold ${transaction.type === "payable" ? "text-red-400" : "text-emerald-400"}`}>
                    {transaction.type === "payable" ? "-" : "+"}{formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {transaction.status === "paid" ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                      </span>
                    ) : transaction.status === "overdue" || (transaction.status === "pending" && transaction.dueDate < Date.now()) ? (
                      <span className="inline-flex items-center gap-0.5 text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-400">
                        <Clock className="h-3 w-3" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {allTransactions.length === 0 && (
            <div className="p-4">
              <EmptyState icon={FileSpreadsheet} message="Sem transações neste mês." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
