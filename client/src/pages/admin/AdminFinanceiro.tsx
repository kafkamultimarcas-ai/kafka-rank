import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { SupplierCombobox } from "@/components/SupplierCombobox";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatCurrencyVal(val: string): string {
  const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(num)) return val;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseCurrencyStr(val: string): string {
  const cleaned = val.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return cleaned || "0";
}
function FinCurrencyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const handleBlur = () => { if (value && value.trim()) onChange(formatCurrencyVal(value)); };
  return <Input value={value} onChange={e => onChange(e.target.value)} onBlur={handleBlur} placeholder={placeholder || "Ex: 50.000,00"} />;
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DollarSign, Plus, Search, Calendar, CheckCircle, AlertTriangle,
  Clock, Trash2, Edit2, Eye, Receipt, Tag, Folder, X, ChevronLeft, ChevronRight,
  TrendingDown, TrendingUp, Banknote, CreditCard
} from "lucide-react";

type TabView = "all" | "category";

const ICONS = [
  { value: "receipt", label: "Recibo" },
  { value: "home", label: "Casa" },
  { value: "zap", label: "Energia" },
  { value: "droplets", label: "Água" },
  { value: "wifi", label: "Internet" },
  { value: "phone", label: "Telefone" },
  { value: "car", label: "Veículo" },
  { value: "wrench", label: "Manutenção" },
  { value: "shopping-bag", label: "Compras" },
  { value: "credit-card", label: "Cartão" },
  { value: "building", label: "Aluguel" },
  { value: "users", label: "Funcionários" },
  { value: "truck", label: "Frete" },
  { value: "file-text", label: "Documento" },
];

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6",
];

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("pt-BR");
}

function getStatusInfo(status: string, dueDate: number) {
  const now = Date.now();
  if (status === "paid") return { label: "Pago", color: "bg-green-500/20 text-green-400", icon: CheckCircle };
  if (status === "cancelled") return { label: "Cancelado", color: "bg-gray-500/20 text-gray-400", icon: X };
  if (status === "overdue" || (status === "pending" && dueDate < now)) return { label: "Vencido", color: "bg-red-500/20 text-red-400", icon: AlertTriangle };
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (dueDate - now < threeDays) return { label: "Vence em breve", color: "bg-yellow-500/20 text-yellow-400", icon: Clock };
  return { label: "Pendente", color: "bg-blue-500/20 text-blue-400", icon: Clock };
}

export default function AdminFinanceiro() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<TabView>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Dialogs
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Form states
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catIcon, setCatIcon] = useState("receipt");
  const [catColor, setCatColor] = useState("#3b82f6");

  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDueDate, setTxDueDate] = useState("");
  const [txType, setTxType] = useState<"payable" | "receivable">("payable");
  const [txCategoryId, setTxCategoryId] = useState<number | null>(null);
  const [txSupplier, setTxSupplier] = useState("");
  const [txBarcode, setTxBarcode] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txRecurrence, setTxRecurrence] = useState<"none" | "monthly" | "weekly" | "yearly">("none");

  // Month range
  const startOfMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getTime(), [selectedMonth]);
  const endOfMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999).getTime(), [selectedMonth]);

  // Queries
  const categoriesQuery = trpc.finCategories.list.useQuery(undefined);
  const transactionsQuery = trpc.finTransactions.list.useQuery({
    startDate: startOfMonth,
    endDate: endOfMonth,
    ...(activeCategoryId && activeTab === "category" ? { categoryId: activeCategoryId } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
    ...(typeFilter !== "all" ? { type: typeFilter as any } : {}),
    limit: 200,
  });
  const dashboardQuery = trpc.finTransactions.dashboard.useQuery({
    month: selectedMonth.getMonth() + 1,
    year: selectedMonth.getFullYear(),
  });
  const overdueQuery = trpc.finTransactions.overdue.useQuery();

  const utils = trpc.useUtils();

  // Mutations
  const createCategory = trpc.finCategories.create.useMutation({
    onSuccess: () => {
      utils.finCategories.list.invalidate();
      setShowNewCategory(false);
      resetCategoryForm();
      toast.success("Categoria criada!");
    },
  });
  const updateCategory = trpc.finCategories.update.useMutation({
    onSuccess: () => {
      utils.finCategories.list.invalidate();
      setEditingCategory(null);
      toast.success("Categoria atualizada!");
    },
  });
  const deleteCategory = trpc.finCategories.delete.useMutation({
    onSuccess: () => {
      utils.finCategories.list.invalidate();
      toast.success("Categoria removida!");
    },
  });

  const createTransaction = trpc.finTransactions.create.useMutation({
    onSuccess: () => {
      utils.finTransactions.list.invalidate();
      utils.finTransactions.dashboard.invalidate();
      utils.finTransactions.overdue.invalidate();
      setShowNewTransaction(false);
      resetTransactionForm();
      toast.success("Conta cadastrada!");
    },
  });
  const updateTransaction = trpc.finTransactions.update.useMutation({
    onSuccess: () => {
      utils.finTransactions.list.invalidate();
      utils.finTransactions.dashboard.invalidate();
      utils.finTransactions.overdue.invalidate();
      setShowEditTransaction(false);
      toast.success("Conta atualizada!");
    },
  });
  const deleteTransaction = trpc.finTransactions.delete.useMutation({
    onSuccess: () => {
      utils.finTransactions.list.invalidate();
      utils.finTransactions.dashboard.invalidate();
      utils.finTransactions.overdue.invalidate();
      toast.success("Conta excluída!");
    },
  });
  const markPaid = trpc.finTransactions.markPaid.useMutation({
    onSuccess: () => {
      utils.finTransactions.list.invalidate();
      utils.finTransactions.dashboard.invalidate();
      utils.finTransactions.overdue.invalidate();
      setShowDetails(false);
      toast.success("Marcado como pago!");
    },
  });
  const approveTx = trpc.finTransactions.approveTransaction.useMutation({
    onSuccess: (_, vars) => {
      utils.finTransactions.list.invalidate();
      utils.finTransactions.dashboard.invalidate();
      toast.success(vars.approved ? "Pagamento autorizado!" : "Pagamento rejeitado!");
      setShowDetails(false);
    },
  });

  const categories = categoriesQuery.data || [];
  const transactions = transactionsQuery.data?.items || [];
  const dashboard = dashboardQuery.data;
  const overdueCount = overdueQuery.data?.length || 0;

  // Filter by search
  const filteredTransactions = useMemo(() => {
    let list = transactions;
    // Client-side filter for pending_approval since backend only filters by status field
    if (statusFilter === "pending_approval") {
      list = list.filter((t: any) => (t as any).approvalStatus === "pending_approval");
    }
    if (!searchText.trim()) return list;
    const q = searchText.toLowerCase();
    return list.filter((t: any) =>
      t.description?.toLowerCase().includes(q) ||
      t.supplier?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  }, [transactions, searchText, statusFilter]);

  function resetCategoryForm() {
    setCatName("");
    setCatType("expense");
    setCatIcon("receipt");
    setCatColor("#3b82f6");
  }

  function resetTransactionForm() {
    setTxDescription("");
    setTxAmount("");
    setTxDueDate("");
    setTxType("payable");
    setTxCategoryId(null);
    setTxSupplier("");
    setTxBarcode("");
    setTxNotes("");
    setTxRecurrence("none");
  }

  function openEditTransaction(tx: any) {
    setEditingTransaction(tx);
    setTxDescription(tx.description);
    setTxAmount(tx.amount);
    setTxDueDate(new Date(tx.dueDate).toISOString().split("T")[0]);
    setTxType(tx.type);
    setTxCategoryId(tx.categoryId);
    setTxSupplier(tx.supplier || "");
    setTxBarcode(tx.barcode || "");
    setTxNotes(tx.notes || "");
    setTxRecurrence(tx.recurrence || "none");
    setShowEditTransaction(true);
  }

  function openEditCategory(cat: any) {
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon(cat.icon || "receipt");
    setCatColor(cat.color || "#3b82f6");
    setEditingCategory(cat);
  }

  function prevMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function nextMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  const monthLabel = selectedMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="w-7 h-7 text-green-400" />
              Financeiro
            </h1>
            <p className="text-muted-foreground text-sm">Controle de contas a pagar e receber</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewCategory(true)}>
              <Tag className="w-4 h-4 mr-1" /> Nova Categoria
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { resetTransactionForm(); setShowNewTransaction(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Nova Conta
            </Button>
          </div>
        </div>

        {/* Dashboard Cards - Clicáveis */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card onClick={() => { setTypeFilter('payable'); setStatusFilter('pending'); }} className={`bg-card/50 border-red-500/20 cursor-pointer transition-all ${typeFilter === 'payable' && statusFilter === 'pending' ? 'ring-2 ring-red-400' : 'hover:ring-1 hover:ring-red-400/50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" /> A Pagar
              </div>
              <div className="text-xl font-bold text-red-400">{formatCurrency(dashboard?.pendingPayable || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Total: {formatCurrency(dashboard?.totalPayable || 0)}</div>
            </CardContent>
          </Card>
          <Card onClick={() => { setTypeFilter('all'); setStatusFilter('paid'); }} className={`bg-card/50 border-green-500/20 cursor-pointer transition-all ${statusFilter === 'paid' ? 'ring-2 ring-green-400' : 'hover:ring-1 hover:ring-green-400/50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" /> Pago
              </div>
              <div className="text-xl font-bold text-green-400">{formatCurrency(dashboard?.totalPaid || 0)}</div>
            </CardContent>
          </Card>
          <Card onClick={() => { setTypeFilter('receivable'); setStatusFilter('pending'); }} className={`bg-card/50 border-blue-500/20 cursor-pointer transition-all ${typeFilter === 'receivable' && statusFilter === 'pending' ? 'ring-2 ring-blue-400' : 'hover:ring-1 hover:ring-blue-400/50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-blue-400" /> A Receber
              </div>
              <div className="text-xl font-bold text-blue-400">{formatCurrency(dashboard?.pendingReceivable || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Total: {formatCurrency(dashboard?.totalReceivable || 0)}</div>
            </CardContent>
          </Card>
          <Card onClick={() => { setTypeFilter('all'); setStatusFilter('overdue'); }} className={`bg-card/50 border-yellow-500/20 cursor-pointer transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-yellow-400' : 'hover:ring-1 hover:ring-yellow-400/50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-400" /> Vencidas
              </div>
              <div className="text-xl font-bold text-yellow-400">{overdueCount}</div>
              <div className="text-xs text-muted-foreground mt-1">{dashboard?.overdue || 0} este mês</div>
            </CardContent>
          </Card>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-semibold capitalize min-w-[140px] text-center">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveTab("all"); setActiveCategoryId(null); }}
            className="shrink-0"
          >
            <Folder className="w-4 h-4 mr-1" /> Todas
          </Button>
          {categories.map((cat: any) => (
            <Button
              key={cat.id}
              variant={activeTab === "category" && activeCategoryId === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveTab("category"); setActiveCategoryId(cat.id); }}
              className="shrink-0 group relative"
              style={activeTab === "category" && activeCategoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            >
              <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: cat.color || undefined }} />
              {cat.name}
              <span
                role="button"
                tabIndex={0}
                className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); openEditCategory(cat); } }}
              >
                <Edit2 className="w-3 h-3" />
              </span>
            </Button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, fornecedor..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="pending_approval">Aguardando Autoriza\u00e7\u00e3o</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="payable">A Pagar</SelectItem>
              <SelectItem value="receivable">A Receber</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <Card className="bg-card/30">
              <CardContent className="p-8 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhuma conta encontrada.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Crie uma nova conta para começar.</p>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((tx: any) => {
              const statusInfo = getStatusInfo(tx.status, tx.dueDate);
              const StatusIcon = statusInfo.icon;
              const cat = categories.find((c: any) => c.id === tx.categoryId);
              return (
                <Card key={tx.id} className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer" onClick={() => { setSelectedTransaction(tx); setShowDetails(true); }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "payable" ? "bg-red-500/20" : "bg-green-500/20"}`}>
                          {tx.type === "payable" ? <TrendingDown className="w-5 h-5 text-red-400" /> : <TrendingUp className="w-5 h-5 text-green-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{tx.description}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Vence: {formatDate(tx.dueDate)}</span>
                            {cat && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || undefined }} />
                                <span>{cat.name}</span>
                              </>
                            )}
                            {tx.supplier && <span>| {tx.supplier}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {(tx as any).approvalStatus === "pending_approval" && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-0 animate-pulse">
                            Autorizar
                          </Badge>
                        )}
                        {(tx as any).approvalStatus === "approved" && (
                          <Badge className="bg-green-500/20 text-green-400 border-0">
                            Autorizada
                          </Badge>
                        )}
                        <Badge className={statusInfo.color + " border-0"}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <span className={`font-bold text-lg ${tx.type === "payable" ? "text-red-400" : "text-green-400"}`}>
                          {tx.type === "payable" ? "-" : "+"}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ===== DIALOGS ===== */}

        {/* New/Edit Category Dialog */}
        <Dialog open={showNewCategory || !!editingCategory} onOpenChange={(open) => { if (!open) { setShowNewCategory(false); setEditingCategory(null); resetCategoryForm(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input placeholder="Ex: Despesas Loja, Boletos, Aluguel..." value={catName} onChange={(e) => setCatName(e.target.value)} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={catType} onValueChange={(v: any) => setCatType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa (a pagar)</SelectItem>
                    <SelectItem value="income">Receita (a receber)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${catColor === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setCatColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              {editingCategory && (
                <Button variant="destructive" size="sm" onClick={() => { deleteCategory.mutate({ id: editingCategory.id }); setEditingCategory(null); resetCategoryForm(); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              )}
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (!catName.trim()) return toast.error("Nome obrigatório");
                  if (editingCategory) {
                    updateCategory.mutate({ id: editingCategory.id, name: catName, icon: catIcon, color: catColor });
                  } else {
                    createCategory.mutate({ name: catName, type: catType, icon: catIcon, color: catColor });
                  }
                }}
              >
                {editingCategory ? "Salvar" : "Criar Categoria"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Transaction Dialog */}
        <Dialog open={showNewTransaction} onOpenChange={setShowNewTransaction}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={txType} onValueChange={(v: any) => setTxType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payable">A Pagar</SelectItem>
                      <SelectItem value="receivable">A Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={txCategoryId?.toString() || "none"} onValueChange={(v) => setTxCategoryId(v === "none" ? null : Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição *</Label>
                <Input placeholder="Ex: Boleto energia março, Aluguel loja..." value={txDescription} onChange={(e) => setTxDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$) *</Label>
                  <FinCurrencyInput value={txAmount} onChange={setTxAmount} placeholder="Ex: 1.500,00" />
                </div>
                <div>
                  <Label>Vencimento *</Label>
                  <Input type="date" value={txDueDate} onChange={(e) => setTxDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Fornecedor / Empresa</Label>
                <SupplierCombobox value={txSupplier} onChange={setTxSupplier} />
              </div>
              <div>
                <Label>Código de Barras</Label>
                <Input placeholder="Código do boleto (opcional)" value={txBarcode} onChange={(e) => setTxBarcode(e.target.value)} />
              </div>
              <div>
                <Label>Recorrência</Label>
                <Select value={txRecurrence} onValueChange={(v: any) => setTxRecurrence(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrência</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea placeholder="Notas adicionais..." value={txNotes} onChange={(e) => setTxNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (!txDescription.trim() || !txAmount || !txDueDate) return toast.error("Preencha descrição, valor e vencimento");
                  createTransaction.mutate({
                    type: txType,
                    description: txDescription,
                    amount: parseCurrencyStr(txAmount),
                    dueDate: new Date(txDueDate + "T12:00:00").getTime(),
                    categoryId: txCategoryId,
                    supplier: txSupplier || undefined,
                    barcode: txBarcode || undefined,
                    notes: txNotes || undefined,
                    recurrence: txRecurrence,
                  });
                }}
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending ? "Salvando..." : "Cadastrar Conta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Transaction Dialog */}
        <Dialog open={showEditTransaction} onOpenChange={setShowEditTransaction}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={txType} onValueChange={(v: any) => setTxType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payable">A Pagar</SelectItem>
                      <SelectItem value="receivable">A Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={txCategoryId?.toString() || "none"} onValueChange={(v) => setTxCategoryId(v === "none" ? null : Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição *</Label>
                <Input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$) *</Label>
                  <FinCurrencyInput value={txAmount} onChange={setTxAmount} placeholder="Ex: 1.500,00" />
                </div>
                <div>
                  <Label>Vencimento *</Label>
                  <Input type="date" value={txDueDate} onChange={(e) => setTxDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <SupplierCombobox value={txSupplier} onChange={setTxSupplier} />
              </div>
              <div>
                <Label>Código de Barras</Label>
                <Input value={txBarcode} onChange={(e) => setTxBarcode(e.target.value)} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={txNotes} onChange={(e) => setTxNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (!editingTransaction) return;
                  updateTransaction.mutate({
                    id: editingTransaction.id,
                    description: txDescription,
                    amount: parseCurrencyStr(txAmount),
                    dueDate: new Date(txDueDate + "T12:00:00").getTime(),
                    categoryId: txCategoryId || undefined,
                    supplier: txSupplier || undefined,
                    barcode: txBarcode || undefined,
                    notes: txNotes || undefined,
                  });
                }}
                disabled={updateTransaction.isPending}
              >
                {updateTransaction.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes da Conta</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (() => {
              const tx = selectedTransaction;
              const statusInfo = getStatusInfo(tx.status, tx.dueDate);
              const StatusIcon = statusInfo.icon;
              const cat = categories.find((c: any) => c.id === tx.categoryId);
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={statusInfo.color + " border-0"}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    <span className={`font-bold text-2xl ${tx.type === "payable" ? "text-red-400" : "text-green-400"}`}>
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Descrição</span><span className="font-medium">{tx.description}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{tx.type === "payable" ? "A Pagar" : "A Receber"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span>{formatDate(tx.dueDate)}</span></div>
                    {tx.paidDate && <div className="flex justify-between"><span className="text-muted-foreground">Data Pagamento</span><span>{formatDate(tx.paidDate)}</span></div>}
                    {cat && <div className="flex justify-between"><span className="text-muted-foreground">Categoria</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || undefined }} />{cat.name}</span></div>}
                    {tx.supplier && <div className="flex justify-between"><span className="text-muted-foreground">Fornecedor</span><span>{tx.supplier}</span></div>}
                    {tx.barcode && <div className="flex justify-between"><span className="text-muted-foreground">Código Barras</span><span className="text-xs font-mono truncate max-w-[200px]">{tx.barcode}</span></div>}
                    {tx.recurrence && tx.recurrence !== "none" && <div className="flex justify-between"><span className="text-muted-foreground">Recorrência</span><span className="capitalize">{tx.recurrence === "monthly" ? "Mensal" : tx.recurrence === "weekly" ? "Semanal" : "Anual"}</span></div>}
                    {tx.notes && <div><span className="text-muted-foreground">Observa\u00e7\u00f5es:</span><p className="mt-1 text-xs bg-muted/30 p-2 rounded">{tx.notes}</p></div>}
                    {(tx as any).createdByName && <div className="flex justify-between"><span className="text-muted-foreground">Lan\u00e7ado por</span><span>{(tx as any).createdByName}</span></div>}
                    {(tx as any).approvalStatus && (tx as any).approvalStatus !== "none" && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Autoriza\u00e7\u00e3o</span>
                        <span className={`font-bold text-xs px-2 py-0.5 rounded ${(tx as any).approvalStatus === "pending_approval" ? "bg-purple-500/20 text-purple-400" : (tx as any).approvalStatus === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {(tx as any).approvalStatus === "pending_approval" ? "Aguardando" : (tx as any).approvalStatus === "approved" ? "Autorizada" : "Rejeitada"}
                        </span>
                      </div>
                    )}
                    {(tx as any).approvedBy && <div className="flex justify-between"><span className="text-muted-foreground">Autorizado por</span><span>{(tx as any).approvedBy}</span></div>}
                  </div>
                  {/* Approval buttons */}
                  {(tx as any).approvalStatus === "pending_approval" && (
                    <div className="flex gap-2 pt-2 border-t border-purple-500/20">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => approveTx.mutate({ id: tx.id, approved: true, approvedBy: "Gerente" })} disabled={approveTx.isPending}>
                        Autorizar Pagamento
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => approveTx.mutate({ id: tx.id, approved: false, approvedBy: "Gerente" })} disabled={approveTx.isPending}>
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {tx.status !== "paid" && (
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => markPaid.mutate({ id: tx.id })} disabled={markPaid.isPending}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Marcar como Pago
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => { setShowDetails(false); openEditTransaction(tx); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => { if (confirm("Excluir esta conta?")) { deleteTransaction.mutate({ id: tx.id }); setShowDetails(false); } }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
