import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CONTAS_STATUS_OPTIONS, CONTAS_TYPE_OPTIONS, MONTH_NAMES } from "@/features/financeiro/utils/constants";
import { currencyInputToNumberString, isPositiveNumberString } from "@/features/financeiro/utils/form";
import type { FinCategory, FinTransaction, ParseAudioResult, Seller, SellerSession } from "@/features/financeiro/types";

export type ContasFilter = "all" | "pending" | "paid" | "overdue" | "due_today" | "approval";
export type ContasTypeFilter = "all" | "payable" | "receivable";
export type ContaFormType = "payable" | "receivable" | "paid";

export function useContasState(initialContaId?: number | null) {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filter, setFilter] = useState<ContasFilter>("all");
  const [typeFilter, setTypeFilter] = useState<ContasTypeFilter>("all");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<FinTransaction | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(initialContaId ?? null);

  const [txType, setTxType] = useState<ContaFormType>("payable");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDueDate, setTxDueDate] = useState("");
  const [txSupplier, setTxSupplier] = useState("");
  const [txVehicle, setTxVehicle] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txCategoryId, setTxCategoryId] = useState<number | null>(null);
  const [txNeedsApproval, setTxNeedsApproval] = useState(false);
  const [txRecurrence, setTxRecurrence] = useState("none");
  const [txRecurrenceMonths, setTxRecurrenceMonths] = useState(2);
  const [txIsVale, setTxIsVale] = useState(false);
  const [txSellerId, setTxSellerId] = useState<number | null>(null);

  const startDate = useMemo(() => new Date(filterYear, filterMonth - 1, 1).getTime(), [filterMonth, filterYear]);
  const endDate = useMemo(() => new Date(filterYear, filterMonth, 0, 23, 59, 59).getTime(), [filterMonth, filterYear]);

  // Debounce da busca (server-side): evita uma query por tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: categories } = trpc.finCategories.list.useQuery();
  // Lista paginada no servidor, com todos os filtros aplicados (tipo, status/aprovação, veículo, busca, período).
  const { data: transactionsData, refetch, isFetching: isTransactionsFetching } = trpc.finTransactions.list.useQuery({
    startDate,
    endDate,
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
    ...(filter === "pending" ? { status: "pending" as const } : {}),
    ...(filter === "paid" ? { status: "paid" as const } : {}),
    ...(filter === "overdue" ? { overdueOnly: true } : {}),
    ...(filter === "due_today" ? { dueTodayOnly: true } : {}),
    ...(filter === "approval" ? { approvalStatus: "pending_approval" as const } : {}),
    ...(filterVehicle ? { vehicle: filterVehicle } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });
  // Contadores dos chips (todo o mês) e somas dos cards — via agregados, independentes da página.
  const { data: summaryData } = trpc.finTransactions.summary.useQuery({ startDate, endDate });
  const { data: dashboardData } = trpc.finTransactions.dashboard.useQuery({ month: filterMonth, year: filterYear });
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const { data: sellersList } = trpc.sellers.list.useQuery({ activeOnly: true });

  const sellerNameById = useMemo(() => {
    const map: Record<number, string> = {};
    (sellersList || []).forEach((seller: Seller) => {
      map[seller.id] = seller.nickname || seller.name;
    });
    return map;
  }, [sellersList]);

  const resetForm = () => {
    setTxType("payable");
    setTxDescription("");
    setTxAmount("");
    setTxDueDate("");
    setTxSupplier("");
    setTxVehicle("");
    setTxNotes("");
    setTxCategoryId(null);
    setTxNeedsApproval(false);
    setTxRecurrence("none");
    setTxRecurrenceMonths(2);
    setTxIsVale(false);
    setTxSellerId(null);
  };

  const createTransaction = trpc.finTransactions.create.useMutation({
    onSuccess: (_data, variables: any) => {
      // Garante que a conta recém-criada apareça na lista: pula para o mês do
      // vencimento e limpa os filtros de status/tipo/busca (senão o novo item
      // pode ficar fora do período/filtro exibido e parecer que "não salvou").
      const due = new Date(Number(variables?.dueDate));
      if (!Number.isNaN(due.getTime())) {
        setFilterMonth(due.getMonth() + 1);
        setFilterYear(due.getFullYear());
      }
      setFilter("all");
      setTypeFilter("all");
      setSearchQuery("");
      setPage(1);
      refetch();
      setShowForm(false);
      resetForm();
      toast.success("Conta lançada!");
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const updateTransaction = trpc.finTransactions.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTx(null);
      resetForm();
      toast.success("Conta atualizada!");
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const deleteTransaction = trpc.finTransactions.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Conta excluída!");
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const markPaid = trpc.finTransactions.markPaid.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Conta marcada como paga!");
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const approveTransaction = trpc.finTransactions.approveTransaction.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Autorização processada!");
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const startEdit = (transaction: FinTransaction) => {
    setEditingTx(transaction);
    setTxType(transaction.status === "paid" && transaction.type === "payable" ? "paid" : transaction.type);
    setTxDescription(transaction.description);
    setTxAmount(String(transaction.amount));
    setTxDueDate(transaction.dueDate ? new Date(transaction.dueDate).toISOString().split("T")[0] : "");
    setTxSupplier(transaction.supplier || "");
    setTxVehicle((transaction as any).vehicle || "");
    setTxNotes(transaction.notes || "");
    setTxCategoryId(transaction.categoryId);
    setTxIsVale(!!transaction.sellerId);
    setTxSellerId(transaction.sellerId ?? null);
    setShowForm(true);
  };

  const allTransactions: FinTransaction[] = transactionsData?.items || [];

  // A lista já vem filtrada e paginada do servidor; a "página" é o próprio resultado.
  const totalRecords = transactionsData?.total ?? 0;
  const totalPages = Math.max(1, transactionsData?.totalPages ?? 1);
  const filteredTransactions = allTransactions;
  const paginatedTransactions = allTransactions;

  // Contadores/somas do mês inteiro vêm dos agregados do servidor (summary + dashboard),
  // independentes da página atual.
  const emptySummary = { total: 0, pending: 0, paid: 0, overdue: 0, dueToday: 0, approval: 0 };
  const sumAll = summaryData?.all ?? emptySummary;
  const sumPayable = summaryData?.payable ?? emptySummary;
  const sumReceivable = summaryData?.receivable ?? emptySummary;

  const stats = {
    pending: sumAll.pending,
    paid: sumAll.paid,
    overdue: sumAll.overdue,
    dueToday: sumAll.dueToday,
    needApproval: sumAll.approval,
    totalPayable: Number(dashboardData?.totalPayable ?? 0),
    totalReceivable: Number(dashboardData?.totalReceivable ?? 0),
    totalPaid: Number(dashboardData?.totalPaid ?? 0),
    totalReceived: Number(dashboardData?.totalReceived ?? 0),
  };

  const typedStats = {
    payable: {
      total: sumPayable.total,
      pending: sumPayable.pending,
      overdue: sumPayable.overdue,
      dueToday: sumPayable.dueToday,
      paid: sumPayable.paid,
      approval: sumPayable.approval,
    },
    receivable: {
      total: sumReceivable.total,
      pending: sumReceivable.pending,
      overdue: sumReceivable.overdue,
      dueToday: sumReceivable.dueToday,
      paid: sumReceivable.paid,
      approval: sumReceivable.approval,
    },
  };

  // Reset para a página 1 quando filtros/período/busca mudam.
  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterYear, filter, typeFilter, filterVehicle, debouncedSearch, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const getCategoryName = (categoryId: number) => {
    const category = (categories || []).find((item: FinCategory) => item.id === categoryId);
    return category?.name || "Sem categoria";
  };

  const handleAudioResult = (parsed: ParseAudioResult) => {
    if (parsed.description) setTxDescription(parsed.description);
    if (parsed.amount) setTxAmount(String(parsed.amount));
    if (parsed.supplier) setTxSupplier(parsed.supplier);
    if (parsed.notes) setTxNotes(parsed.notes);
    if (parsed.type === "receivable") setTxType("receivable");
    if (parsed.dueDate) {
      try {
        const parts = parsed.dueDate.split("/");
        if (parts.length === 3) {
          const parsedDate = new Date(
            parseInt(parts[2], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[0], 10)
          );
          setTxDueDate(parsedDate.toISOString().split("T")[0]);
        }
      } catch {
        // noop
      }
    }
    setShowForm(true);
    toast.success("Dados preenchidos pelo áudio!");
  };

  const prevMonth = () => {
    if (filterMonth === 1) {
      setFilterMonth(12);
      setFilterYear(filterYear - 1);
      return;
    }
    setFilterMonth(filterMonth - 1);
  };

  const nextMonth = () => {
    if (filterMonth === 12) {
      setFilterMonth(1);
      setFilterYear(filterYear + 1);
      return;
    }
    setFilterMonth(filterMonth + 1);
  };

  const submitForm = () => {
    if (!txDescription.trim() || !txAmount || !txDueDate) {
      toast.error("Preencha descrição, valor e vencimento.");
      return;
    }

    if (txIsVale && !txSellerId) {
      toast.error("Selecione o colaborador do vale.");
      return;
    }

    if (!isPositiveNumberString(txAmount)) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    const dueDate = new Date(`${txDueDate}T12:00:00`);
    if (Number.isNaN(dueDate.getTime())) {
      toast.error("Informe uma data de vencimento válida.");
      return;
    }

    const normalizedAmount = currencyInputToNumberString(txAmount);
    const normalizedDueDate = dueDate.getTime();
    const persistedType = txType === "paid" ? "payable" : txType;
    const persistedStatus = txType === "paid" ? "paid" : undefined;
    const persistedPaidDate = txType === "paid" ? normalizedDueDate : undefined;

    if (editingTx) {
      updateTransaction.mutate({
        id: editingTx.id,
        description: txDescription,
        amount: normalizedAmount,
        dueDate: normalizedDueDate,
        categoryId: txCategoryId,
        supplier: txSupplier || undefined,
        vehicle: txVehicle || undefined,
        notes: txNotes || undefined,
        status: persistedStatus,
        paidDate: persistedPaidDate,
      } as any);
      return;
    }

    createTransaction.mutate({
      type: persistedType,
      description: txDescription,
      amount: normalizedAmount,
      dueDate: normalizedDueDate,
      status: persistedStatus,
      paidDate: persistedPaidDate,
      categoryId: txCategoryId,
      supplier: txSupplier || undefined,
      vehicle: txVehicle || undefined,
      notes: txNotes || undefined,
      recurrence: txRecurrence as "none" | "monthly" | "weekly" | "yearly",
      recurrenceMonths: txRecurrence === "monthly" ? Math.max(1, Number(txRecurrenceMonths) || 1) : undefined,
      needsApproval: txNeedsApproval,
      createdByName: sellerSession?.nickname || sellerSession?.name || "Financeiro",
      sellerId: txIsVale && txSellerId ? txSellerId : undefined,
    } as any);
  };

  const statusOptions = CONTAS_STATUS_OPTIONS.map((option) => ({
    ...option,
    count:
      option.key === "all"
        ? sumAll.total
        : option.key === "pending"
          ? stats.pending
          : option.key === "paid"
            ? stats.paid
            : option.key === "overdue"
              ? stats.overdue
              : option.key === "due_today"
                ? stats.dueToday
                : stats.needApproval,
  }));

  const typeOptions = CONTAS_TYPE_OPTIONS;

  return {
    categories: (categories || []) as FinCategory[],
    sellersList: (sellersList || []) as Seller[],
    sellerSession: sellerSession as SellerSession,
    sellerNameById,
    allTransactions,
    filteredTransactions,
    paginatedTransactions,
    totalRecords,
    totalPages,
    isTransactionsFetching,
    page,
    setPage,
    pageSize,
    setPageSize,
    showForm,
    setShowForm,
    editingTx,
    setEditingTx,
    expandedId,
    setExpandedId,
    filter,
    setFilter,
    typeFilter,
    setTypeFilter,
    filterVehicle,
    setFilterVehicle,
    searchQuery,
    setSearchQuery,
    stats,
    typedStats,
    statusOptions,
    typeOptions,
    txType,
    setTxType,
    txDescription,
    setTxDescription,
    txAmount,
    setTxAmount,
    txDueDate,
    setTxDueDate,
    txSupplier,
    setTxSupplier,
    txVehicle,
    setTxVehicle,
    txNotes,
    setTxNotes,
    txCategoryId,
    setTxCategoryId,
    txNeedsApproval,
    setTxNeedsApproval,
    txRecurrence,
    setTxRecurrence,
    txRecurrenceMonths,
    setTxRecurrenceMonths,
    txIsVale,
    setTxIsVale,
    txSellerId,
    setTxSellerId,
    resetForm,
    submitForm,
    startEdit,
    handleAudioResult,
    getCategoryName,
    prevMonth,
    nextMonth,
    monthLabel: `${MONTH_NAMES[filterMonth - 1]} ${filterYear}`,
    emptyMessage: `Nenhuma conta encontrada para ${MONTH_NAMES[filterMonth - 1]} ${filterYear}.`,
    isSubmitting: createTransaction.isPending || updateTransaction.isPending,
    markPaid,
    deleteTransaction,
    approveTransaction,
  };
}
