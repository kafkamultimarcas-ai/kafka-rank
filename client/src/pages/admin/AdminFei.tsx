import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Pencil,
  DollarSign,
  Filter,
  History,
  User,
  Calendar,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import MonthFilter, { filterByMonth } from "@/components/MonthFilter";

function formatDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatDateTime(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
        <CheckCircle2 className="w-3 h-3" /> Aprovado
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">
        <Clock className="w-3 h-3" /> Pendente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
      <XCircle className="w-3 h-3" /> Rejeitado
    </span>
  );
}

export default function AdminFei() {
  const { data: allFei, isLoading } = trpc.fei.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({});
  const utils = trpc.useUtils();

  const [statusFilter, setStatusFilter] = useState<"todos" | "approved" | "pending" | "rejected">("todos");
  const [sellerFilter, setSellerFilter] = useState<string>("todos");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editReason, setEditReason] = useState("");
  const [showAuditLog, setShowAuditLog] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    bankName: "",
    returnType: "",
    financedValue: "",
    vehiclePlate: "",
    customerCpf: "",
    customerName: "",
    status: "",
    notes: "",
    paymentDate: "",
  });

  // Audit log query
  const { data: auditLogs } = trpc.fei.auditLogs.useQuery(
    { feiRecordId: showAuditLog! },
    { enabled: showAuditLog !== null }
  );

  const approveFei = trpc.fei.approve.useMutation({
    onSuccess: () => { utils.fei.list.invalidate(); utils.sellers.list.invalidate(); toast.success("F&I aprovado!"); },
    onError: () => toast.error("Erro ao aprovar."),
  });

  const rejectFei = trpc.fei.reject.useMutation({
    onSuccess: () => { utils.fei.list.invalidate(); utils.sellers.list.invalidate(); toast.success("F&I rejeitado."); },
    onError: () => toast.error("Erro ao rejeitar."),
  });

  const deleteFei = trpc.fei.delete.useMutation({
    onSuccess: () => { utils.fei.list.invalidate(); utils.sellers.list.invalidate(); toast.success("Registro removido!"); },
    onError: () => toast.error("Erro ao remover."),
  });

  const updateFei = trpc.fei.update.useMutation({
    onSuccess: () => { utils.fei.list.invalidate(); toast.success("Registro atualizado!"); setEditDialog(false); setEditReason(""); },
    onError: (err) => toast.error(err.message || "Erro ao atualizar."),
  });

  function handleSaveEdit() {
    if (!editingRecord) return;
    const financedValueNum = editForm.financedValue ? Math.round(parseFloat(editForm.financedValue.replace(/\./g, '').replace(',', '.'))) : undefined;
    updateFei.mutate({
      id: editingRecord.id,
      bankName: editForm.bankName || undefined,
      returnType: editForm.returnType || undefined,
      financedValue: financedValueNum,
      vehiclePlate: editForm.vehiclePlate || undefined,
      customerCpf: editForm.customerCpf || undefined,
      customerName: editForm.customerName || undefined,
      notes: editForm.notes || undefined,
      paymentDate: editForm.paymentDate ? Number(editForm.paymentDate) : undefined,
      editReason: editReason || undefined,
    });
  }

  const getSeller = (id: number) => sellers?.find(s => s.id === id);

  // Filtros por mês
  const allRecords = allFei || [];
  const records = useMemo(() => {
    if (showAllMonths) return allRecords;
    return filterByMonth(allRecords, filterMonth, filterYear, 'createdAt' as any);
  }, [allRecords, filterMonth, filterYear, showAllMonths]);
  const approvedCount = records.filter((r: any) => r.status === "approved").length;
  const pendingCount = records.filter((r: any) => r.status === "pending").length;
  const rejectedCount = records.filter((r: any) => r.status === "rejected").length;

  const filteredRecords = useMemo(() => {
    let list = records;
    if (statusFilter !== "todos") list = list.filter((r: any) => r.status === statusFilter);
    if (sellerFilter !== "todos") list = list.filter((r: any) => String(r.sellerId) === sellerFilter);
    return list;
  }, [records, statusFilter, sellerFilter]);

  // Sellers que têm registros F&I
  const feiSellers = useMemo(() => {
    const ids = new Set(records.map((r: any) => r.sellerId));
    return (sellers || []).filter(s => ids.has(s.id));
  }, [records, sellers]);

  function openEdit(record: any) {
    setEditingRecord(record);
    setEditReason("");
    setEditForm({
      bankName: record.bankName || "",
      returnType: record.returnType || "",
      financedValue: record.financedValue ? record.financedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "",
      vehiclePlate: record.vehiclePlate || "",
      customerCpf: record.customerCpf || "",
      customerName: record.customerName || "",
      status: record.status || "pending",
      notes: record.notes || "",
      paymentDate: record.paymentDate ? String(record.paymentDate) : "",
    });
    setEditDialog(true);
  }

  function handleStatusChange(recordId: number, newStatus: string, currentStatus: string) {
    if (newStatus === "approved" && currentStatus !== "approved") {
      approveFei.mutate({ id: recordId });
    } else if (newStatus === "rejected" && currentStatus !== "rejected") {
      rejectFei.mutate({ id: recordId });
    }
  }

  // Valor total financiado por status
  const totalApproved = records.filter((r: any) => r.status === "approved").reduce((sum: number, r: any) => sum + (r.financedValue || 0), 0);
  const totalPending = records.filter((r: any) => r.status === "pending").reduce((sum: number, r: any) => sum + (r.financedValue || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
            <Banknote className="w-6 h-6 text-amber-400" /> F&I - Financiamento
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Todos os registros de F&I com status e detalhes</p>
        </div>

        {/* Stats - Clicáveis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => setStatusFilter("todos")} className={`racing-card p-4 text-center transition-all cursor-pointer ${statusFilter === 'todos' ? 'ring-2 ring-foreground/50' : 'hover:ring-1 hover:ring-foreground/30'}`}>
            <p className="text-2xl font-black text-foreground">{records.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </button>
          <button onClick={() => setStatusFilter("approved")} className={`racing-card p-4 text-center border-l-4 border-l-emerald-500 transition-all cursor-pointer ${statusFilter === 'approved' ? 'ring-2 ring-emerald-400' : 'hover:ring-1 hover:ring-emerald-400/50'}`}>
            <p className="text-2xl font-black text-emerald-400">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
            <p className="text-[10px] text-emerald-400/70">{formatCurrency(totalApproved)}</p>
          </button>
          <button onClick={() => setStatusFilter("pending")} className={`racing-card p-4 text-center border-l-4 border-l-yellow-500 transition-all cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-yellow-400' : 'hover:ring-1 hover:ring-yellow-400/50'}`}>
            <p className="text-2xl font-black text-yellow-400">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-[10px] text-yellow-400/70">{formatCurrency(totalPending)}</p>
          </button>
          <button onClick={() => setStatusFilter("rejected")} className={`racing-card p-4 text-center border-l-4 border-l-red-500 transition-all cursor-pointer ${statusFilter === 'rejected' ? 'ring-2 ring-red-400' : 'hover:ring-1 hover:ring-red-400/50'}`}>
            <p className="text-2xl font-black text-red-400">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
          </button>
        </div>

        {/* Filtro por mês */}
        <MonthFilter
          month={filterMonth}
          year={filterYear}
          onChange={(m, y) => { setFilterMonth(m); setFilterYear(y); setShowAllMonths(false); }}
          showAll
          isAll={showAllMonths}
          onToggleAll={() => setShowAllMonths(!showAllMonths)}
        />

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "todos" as const, label: "Todas", count: records.length },
              { key: "approved" as const, label: "Aprovadas", count: approvedCount },
              { key: "pending" as const, label: "Pendentes", count: pendingCount },
              { key: "rejected" as const, label: "Rejeitadas", count: rejectedCount },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? tab.key === "approved" ? "bg-emerald-600 text-white"
                    : tab.key === "pending" ? "bg-yellow-600 text-white"
                    : tab.key === "rejected" ? "bg-red-600 text-white"
                    : "bg-primary text-primary-foreground"
                    : "bg-accent/50 text-muted-foreground hover:bg-accent"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {feiSellers.length > 1 && (
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-48 h-8 text-xs bg-input border-border">
                <SelectValue placeholder="Filtrar por colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos colaboradores</SelectItem>
                {feiSellers.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.nickname || s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="racing-card p-4 h-24 animate-pulse" />)}
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="space-y-3">
            {filteredRecords.map((record: any) => {
              const seller = getSeller(record.sellerId);
              return (
                <div
                  key={record.id}
                  className={`racing-card p-4 border-l-4 transition-all ${
                    record.status === "approved"
                      ? "border-l-emerald-500"
                      : record.status === "pending"
                      ? "border-l-yellow-500"
                      : "border-l-red-500 opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {seller?.photoUrl ? (
                        <img src={seller.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                          {seller?.name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-foreground text-sm">{seller?.nickname || seller?.name || "Colaborador"}</span>
                        <StatusBadge status={record.status} />
                        <span className="text-[10px] text-muted-foreground">{formatDate(record.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-foreground font-semibold text-sm">{record.bankName}</span>
                        <span className="text-yellow-400 font-bold text-xs">{record.returnType}</span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {record.financedValue > 0 && (
                          <span className="text-emerald-400 font-bold">{formatCurrency(record.financedValue)}</span>
                        )}
                        {record.vehiclePlate && (
                          <span className="text-muted-foreground">Placa: <span className="text-foreground">{record.vehiclePlate}</span></span>
                        )}
                        {record.customerName && (
                          <span className="text-muted-foreground">Cliente: <span className="text-foreground font-medium">{record.customerName}</span></span>
                        )}
                        {record.customerCpf && (
                          <span className="text-muted-foreground">CPF: <span className="text-foreground">{record.customerCpf}</span></span>
                        )}
                        {record.paymentDate && (
                          <span className="text-muted-foreground">Pgto banco: <span className="text-blue-400 font-semibold">{formatDate(record.paymentDate)}</span></span>
                        )}
                        {!record.paymentDate && record.status === "approved" && (
                          <span className="text-orange-400 text-[10px] font-semibold">⚠ Sem data de pagamento</span>
                        )}
                        {record.status === "approved" && (
                          <span className="text-yellow-500 font-semibold">+{record.points} pts</span>
                        )}
                      </div>

                      {record.notes && (
                        <p className="text-muted-foreground text-xs mt-1 italic">"{record.notes}"</p>
                      )}

                      {/* Last edited info */}
                      {record.lastEditedBy && (
                        <p className="text-[10px] text-blue-400/70 mt-1 flex items-center gap-1">
                          <Pencil className="w-2.5 h-2.5" />
                          Editado por {record.lastEditedBy} em {formatDateTime(record.lastEditedAt)}
                          {record.editNotes && <span className="text-muted-foreground ml-1">— "{record.editNotes}"</span>}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {record.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => approveFei.mutate({ id: record.id })}
                            disabled={approveFei.isPending}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs"
                            onClick={() => rejectFei.mutate({ id: record.id })}
                            disabled={rejectFei.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                          </Button>
                        </>
                      )}
                      {record.status === "rejected" && (
                        <Button
                          size="sm"
                          className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={() => approveFei.mutate({ id: record.id })}
                          disabled={approveFei.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Re-aprovar
                        </Button>
                      )}
                      {record.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs"
                          onClick={() => rejectFei.mutate({ id: record.id })}
                          disabled={rejectFei.isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => openEdit(record)}
                        title="Editar registro"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        onClick={() => setShowAuditLog(showAuditLog === record.id ? null : record.id)}
                        title="Histórico de edições"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { if (confirm("Excluir este registro F&I?")) deleteFei.mutate({ id: record.id }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Audit Log inline */}
                  {showAuditLog === record.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                        <History className="w-3 h-3" /> Histórico de Alterações
                      </p>
                      {auditLogs && auditLogs.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {auditLogs.map((log: any) => (
                            <div key={log.id} className="flex items-start gap-2 text-[10px] bg-accent/30 rounded px-2 py-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <span className="text-foreground font-semibold">{log.editedBy}</span>
                                <span className="text-muted-foreground"> alterou </span>
                                <span className="text-blue-400 font-medium">{log.fieldChanged}</span>
                                {log.oldValue && (
                                  <span className="text-red-400/70"> de "{log.oldValue}"</span>
                                )}
                                <span className="text-emerald-400/70"> para "{log.newValue}"</span>
                                <span className="text-muted-foreground ml-1">— {formatDateTime(log.editedAt)}</span>
                                {log.reason && (
                                  <span className="text-yellow-400/70 ml-1">Motivo: {log.reason}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Nenhuma alteração registrada.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              {statusFilter === "todos" && sellerFilter === "todos"
                ? "Nenhum registro F&I encontrado."
                : "Nenhum registro encontrado com os filtros selecionados."}
            </p>
          </div>
        )}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-400" />
              Editar Registro F&I
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-foreground">Nome do Cliente *</Label>
              <Input
                value={editForm.customerName}
                onChange={(e) => setEditForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Nome completo do cliente"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Banco</Label>
                <Input
                  value={editForm.bankName}
                  onChange={(e) => setEditForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="Nome do banco"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Retorno</Label>
                <Select value={editForm.returnType} onValueChange={(v) => setEditForm(f => ({ ...f, returnType: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {["R0", "R1", "R2", "R3", "R4", "R5"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                value={editForm.financedValue}
                onChange={(e) => setEditForm(f => ({ ...f, financedValue: e.target.value }))}
                placeholder="0,00"
                className="h-9"
                type="text"
                inputMode="decimal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Placa</Label>
                <Input
                  value={editForm.vehiclePlate}
                  onChange={(e) => setEditForm(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))}
                  placeholder="ABC1D23"
                  className="h-9"
                  maxLength={7}
                />
              </div>
              <div>
                <Label className="text-xs">CPF</Label>
                <Input
                  value={editForm.customerCpf}
                  onChange={(e) => setEditForm(f => ({ ...f, customerCpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                Data Pagamento do Banco
              </Label>
              <Input
                type="date"
                value={editForm.paymentDate ? new Date(Number(editForm.paymentDate)).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const val = e.target.value ? new Date(e.target.value).getTime() : '';
                  setEditForm(f => ({ ...f, paymentDate: String(val) }));
                }}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Data que o banco efetivamente pagou a ficha</p>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <textarea
                value={editForm.notes || ''}
                onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observações..."
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm min-h-[60px] resize-none"
              />
            </div>
            {/* Motivo da edição */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
              <Label className="text-xs font-semibold text-yellow-400 flex items-center gap-1 mb-1">
                <History className="w-3 h-3" />
                Motivo da alteração
              </Label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Descreva o motivo da edição (ex: valor digitado errado, banco incorreto...)"
                className="w-full rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-sm min-h-[50px] resize-none placeholder:text-yellow-400/40"
              />
              <p className="text-[10px] text-yellow-400/60 mt-1">Todas as alterações ficam registradas no histórico</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateFei.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateFei.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
