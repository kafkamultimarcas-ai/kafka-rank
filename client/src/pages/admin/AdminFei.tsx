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
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import MonthFilter, { filterByMonth } from "@/components/MonthFilter";

function formatDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
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
  const [editForm, setEditForm] = useState({
    bankName: "",
    returnType: "",
    financedValue: "",
    vehiclePlate: "",
    customerCpf: "",
    status: "",
  });

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
    setEditForm({
      bankName: record.bankName || "",
      returnType: record.returnType || "",
      financedValue: record.financedValue ? String(record.financedValue / 100) : "",
      vehiclePlate: record.vehiclePlate || "",
      customerCpf: record.customerCpf || "",
      status: record.status || "pending",
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="racing-card p-4 text-center">
            <p className="text-2xl font-black text-foreground">{records.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="racing-card p-4 text-center border-l-4 border-l-emerald-500">
            <p className="text-2xl font-black text-emerald-400">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
            <p className="text-[10px] text-emerald-400/70">{formatCurrency(totalApproved)}</p>
          </div>
          <div className="racing-card p-4 text-center border-l-4 border-l-yellow-500">
            <p className="text-2xl font-black text-yellow-400">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-[10px] text-yellow-400/70">{formatCurrency(totalPending)}</p>
          </div>
          <div className="racing-card p-4 text-center border-l-4 border-l-red-500">
            <p className="text-2xl font-black text-red-400">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
          </div>
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
                        {record.customerCpf && (
                          <span className="text-muted-foreground">CPF: <span className="text-foreground">{record.customerCpf}</span></span>
                        )}
                        {record.paymentDate && (
                          <span className="text-muted-foreground">Pgto: <span className="text-foreground">{formatDate(record.paymentDate)}</span></span>
                        )}
                        {record.status === "approved" && (
                          <span className="text-yellow-500 font-semibold">+{record.points} pts</span>
                        )}
                      </div>

                      {record.notes && (
                        <p className="text-muted-foreground text-xs mt-1 italic">"{record.notes}"</p>
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
                        className="h-7 w-7"
                        onClick={() => { if (confirm("Excluir este registro F&I?")) deleteFei.mutate({ id: record.id }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
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
    </DashboardLayout>
  );
}
