import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ShoppingCart, TrendingUp, Trash2, Clock, CheckCircle2, XCircle, Pencil, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import MonthFilter from "@/components/MonthFilter";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ListSkeleton } from "@/components/ListSkeleton";

function formatCurrency(val: string): string {
  const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(num)) return val;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseCurrencyToNumber(val: string): number {
  const cleaned = val.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return parseFloat(cleaned) || 0;
}
function CurrencyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const handleBlur = () => { if (value && value.trim()) onChange(formatCurrency(value)); };
  return <Input value={value} onChange={e => onChange(e.target.value)} onBlur={handleBlur} placeholder={placeholder || "Ex: 50.000,00"} className="bg-input border-border text-foreground" />;
}

export default function AdminSales() {
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [form, setForm] = useState({
    sellerId: "", competitionId: "", description: "", vehicleModel: "", value: "", points: "1",
  });
  const [editForm, setEditForm] = useState({
    vehicleModel: "", value: "", sellerId: "", status: "", leadSource: "", saleDate: "",
  });
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSellerId, setFilterSellerId] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const pagination = usePagination({
    initialPageSize: 20,
    resetDeps: [filterMonth, filterYear, showAll, statusFilter, filterSellerId, searchTerm],
  });
  const salesQuery = trpc.sales.listPaged.useQuery({
    month: filterMonth,
    year: filterYear,
    showAll,
    status: statusFilter,
    sellerId: filterSellerId !== "todos" ? Number(filterSellerId) : undefined,
    search: searchTerm || undefined,
    offset: pagination.offset,
    limit: pagination.pageSize,
  });
  const sales = salesQuery.data?.items ?? [];
  const total = salesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const counts = salesQuery.data?.counts ?? { total: 0, approved: 0, pending: 0, rejected: 0 };
  const isLoading = salesQuery.isLoading;
  const isFetching = salesQuery.isFetching;

  const createSale = trpc.sales.create.useMutation({
    onSuccess: () => {
      utils.sales.invalidate();
      utils.sellers.list.invalidate();
      utils.participants.list.invalidate();
      utils.competitions.ranking.invalidate();
      setDialogOpen(false);
      setForm({ sellerId: "", competitionId: "", description: "", vehicleModel: "", value: "", points: "1" });
      toast.success("Venda registrada!");
    },
    onError: () => toast.error("Erro ao registrar venda."),
  });

  const editSale = trpc.sales.edit.useMutation({
    onSuccess: () => {
      utils.sales.invalidate();
      utils.sellers.list.invalidate();
      utils.participants.list.invalidate();
      utils.competitions.ranking.invalidate();
      utils.goals.monthlyRanking.invalidate();
      setEditDialogOpen(false);
      setEditingSale(null);
      toast.success("Venda atualizada com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Erro ao editar venda."),
  });

  const deleteSale = trpc.sales.delete.useMutation({
    onSuccess: () => {
      utils.sales.invalidate();
      utils.sellers.list.invalidate();
      utils.participants.list.invalidate();
      utils.competitions.ranking.invalidate();
      toast.success("Venda excluída! Pontos revertidos.");
    },
    onError: () => toast.error("Erro ao excluir venda."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sellerId) { toast.error("Selecione um vendedor"); return; }
    createSale.mutate({
      sellerId: parseInt(form.sellerId),
      competitionId: form.competitionId ? parseInt(form.competitionId) : undefined,
      description: form.description || undefined,
      vehicleModel: form.vehicleModel || undefined,
      value: form.value ? Math.round(parseCurrencyToNumber(form.value)) : undefined,
      points: parseInt(form.points) || 1,
    });
  }

  function openEditDialog(sale: any) {
    setEditingSale(sale);
    setEditForm({
      vehicleModel: sale.vehicleModel || "",
      value: sale.value ? sale.value.toString() : "",
      sellerId: sale.sellerId.toString(),
      status: sale.status || "approved",
      leadSource: sale.leadSource || "",
      saleDate: sale.createdAt ? new Date(sale.createdAt).toISOString().slice(0, 16) : "",
    });
    setEditDialogOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSale) return;
    const data: any = { id: editingSale.id };
    if (editForm.vehicleModel !== (editingSale.vehicleModel || "")) data.vehicleModel = editForm.vehicleModel;
    if (editForm.value !== (editingSale.value ? editingSale.value.toString() : "")) data.value = editForm.value ? Math.round(parseCurrencyToNumber(editForm.value)) : 0;
    if (editForm.sellerId !== editingSale.sellerId.toString()) data.sellerId = parseInt(editForm.sellerId);
    if (editForm.status !== (editingSale.status || "approved")) data.status = editForm.status;
    if (editForm.leadSource !== (editingSale.leadSource || "")) data.leadSource = editForm.leadSource;
    // Se alterou a data
    if (editForm.saleDate) {
      const newDate = new Date(editForm.saleDate).getTime();
      const oldDate = editingSale.createdAt ? new Date(editingSale.createdAt).getTime() : 0;
      if (Math.abs(newDate - oldDate) > 60000) data.createdAt = newDate;
    }
    // Sempre enviar pelo menos o id
    editSale.mutate(data);
  }

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'approved') return "Aprovada";
    if (status === 'pending') return "Pendente";
    return "Rejeitada";
  };

  const statusBg = (status: string) => {
    if (status === 'approved') return "";
    if (status === 'pending') return "border-l-4 border-l-yellow-500/50";
    return "border-l-4 border-l-red-500/50 opacity-70";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Vendas</h1>
            <p className="text-muted-foreground text-sm mt-1">Registre, edite, acompanhe e exclua vendas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Registrar Venda</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">Registrar Venda</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">Vendedor *</Label>
                  <Select value={form.sellerId} onValueChange={v => setForm({ ...form, sellerId: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                    <SelectContent>
                      {sellers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Competição (opcional)</Label>
                  <Select value={form.competitionId} onValueChange={v => setForm({ ...form, competitionId: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Sem competição" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem competição</SelectItem>
                      {competitions?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Modelo do Veículo</Label>
                  <Input value={form.vehicleModel} onChange={e => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Ex: Honda Civic 2024" className="bg-input border-border text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Valor (R$)</Label>
                    <CurrencyInput value={form.value} onChange={v => setForm({ ...form, value: v })} placeholder="Ex: 50.000,00" />
                  </div>
                  <div>
                    <Label className="text-foreground">Pontos</Label>
                    <Input type="number" min={1} value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground">Descrição</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Observações" className="bg-input border-border text-foreground" />
                </div>
                <Button type="submit" className="w-full racing-gradient text-white" disabled={createSale.isPending}>
                  {createSale.isPending ? "Registrando..." : "Registrar Venda"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Sale Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-foreground">Editar Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label className="text-foreground">Vendedor</Label>
                <Select value={editForm.sellerId} onValueChange={v => setEditForm({ ...editForm, sellerId: v })}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                  <SelectContent>
                    {sellers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Modelo do Veículo</Label>
                <Input value={editForm.vehicleModel} onChange={e => setEditForm({ ...editForm, vehicleModel: e.target.value })} placeholder="Ex: Honda Civic 2024" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">Valor (R$)</Label>
                   <CurrencyInput value={editForm.value} onChange={v => setEditForm({ ...editForm, value: v })} placeholder="Ex: 50.000,00" />
                </div>
                <div>
                  <Label className="text-foreground">Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Aprovada</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="rejected">Rejeitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-foreground">Origem do Lead</Label>
                <Select value={editForm.leadSource || "none"} onValueChange={v => setEditForm({ ...editForm, leadSource: v === "none" ? "" : v })}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem origem</SelectItem>
                    <SelectItem value="lead_loja">Lead Loja</SelectItem>
                    <SelectItem value="lead_vendedor">Lead Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Data da Venda</Label>
                <Input type="datetime-local" value={editForm.saleDate || ""} onChange={e => setEditForm({ ...editForm, saleDate: e.target.value })} className="bg-input border-border text-foreground" />
                <p className="text-xs text-muted-foreground mt-1">Altere a data para mover a venda para o mês correto</p>
              </div>
              {editingSale && editForm.status !== (editingSale.status || "approved") && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">
                    {editForm.status === 'approved' && editingSale.status !== 'approved' && (
                      <>Ao aprovar esta venda, os pontos serão adicionados ao vendedor e ao ranking.</>
                    )}
                    {editForm.status !== 'approved' && editingSale.status === 'approved' && (
                      <>Ao mudar o status, os pontos serão revertidos do vendedor e do ranking.</>
                    )}
                    {editForm.status === 'rejected' && editingSale.status === 'pending' && (
                      <>A venda será marcada como rejeitada.</>
                    )}
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full racing-gradient text-white" disabled={editSale.isPending}>
                {editSale.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stats - Clicáveis */}
        {(() => {
          const totalCount = counts.total;
          const approvedCount = counts.approved;
          const pendingCount = counts.pending;
          const rejectedCount = counts.rejected;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => setStatusFilter('todos')} className={`racing-card p-4 text-center transition-all cursor-pointer ${statusFilter === 'todos' ? 'ring-2 ring-foreground/50' : 'hover:ring-1 hover:ring-foreground/30'}`}>
                <p className="text-2xl font-black text-foreground">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </button>
              <button onClick={() => setStatusFilter('approved')} className={`racing-card p-4 text-center border-l-4 border-l-emerald-500 transition-all cursor-pointer ${statusFilter === 'approved' ? 'ring-2 ring-emerald-400' : 'hover:ring-1 hover:ring-emerald-400/50'}`}>
                <p className="text-2xl font-black text-emerald-400">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </button>
              <button onClick={() => setStatusFilter('pending')} className={`racing-card p-4 text-center border-l-4 border-l-yellow-500 transition-all cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-yellow-400' : 'hover:ring-1 hover:ring-yellow-400/50'}`}>
                <p className="text-2xl font-black text-yellow-400">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </button>
              <button onClick={() => setStatusFilter('rejected')} className={`racing-card p-4 text-center border-l-4 border-l-red-500 transition-all cursor-pointer ${statusFilter === 'rejected' ? 'ring-2 ring-red-400' : 'hover:ring-1 hover:ring-red-400/50'}`}>
                <p className="text-2xl font-black text-red-400">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejeitadas</p>
              </button>
            </div>
          );
        })()}

        {/* Month Filter */}
        <MonthFilter
          month={filterMonth}
          year={filterYear}
          onChange={(m, y) => { setFilterMonth(m); setFilterYear(y); setShowAll(false); }}
          showAll
          isAll={showAll}
          onToggleAll={() => setShowAll(!showAll)}
        />

        {/* Busca e Filtro por Vendedor */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por vendedor, modelo, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border text-foreground"
            />
          </div>
          <Select value={filterSellerId} onValueChange={setFilterSellerId}>
            <SelectTrigger className="w-full sm:w-[200px] bg-input border-border text-foreground">
              <SelectValue placeholder="Filtrar vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {sellers?.filter((s: any) => s.department === 'vendas' || !s.department).map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nickname || s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sales List */}
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : sales.length > 0 ? (
          <>
          <div className="space-y-2">
            {sales.map(sale => {
              const seller = sellers?.find(s => s.id === sale.sellerId);
              return (
                <div key={sale.id} className={`racing-card p-4 flex items-center gap-4 ${statusBg(sale.status || 'approved')}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{seller?.name || `Vendedor #${sale.sellerId}`}</p>
                      <span className="flex items-center gap-1 text-xs">
                        {statusIcon(sale.status || 'approved')}
                        <span className="text-muted-foreground">{statusLabel(sale.status || 'approved')}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {sale.vehicleModel || sale.description || "Venda registrada"}
                      {" — "}
                      {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    {sale.leadSource && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${sale.leadSource === 'lead_loja' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                        {sale.leadSource === 'lead_loja' ? 'Lead Loja' : 'Lead Vendedor'}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      {sale.value ? <p className="text-sm font-semibold text-foreground">R$ {sale.value.toLocaleString("pt-BR")}</p> : null}
                      <div className="flex items-center gap-1 justify-end">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-xs font-heading text-primary">+{sale.points} pts</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 w-8"
                      onClick={() => openEditDialog(sale)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Excluir venda?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta venda de <strong>{seller?.name}</strong>?
                            {sale.status === 'approved' && " Os pontos serão revertidos do ranking."}
                            {" "}Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSale.mutate({ id: sale.id })}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationControls
            page={pagination.page}
            totalPages={totalPages}
            total={total}
            pageSize={pagination.pageSize}
            isLoading={isFetching}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            className="border-t border-border pt-5"
          />
          </>
        ) : (
          <div className="racing-card p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{showAll ? "Nenhuma venda registrada." : "Nenhuma venda neste mês."}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
