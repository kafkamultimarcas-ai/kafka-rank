import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  CalendarClock, Search, Trash2, Edit2, Phone, Mail, Car, Clock,
  CheckCircle2, XCircle, AlertCircle, UserCheck, User, Hash,
  AlertTriangle, PhoneCall, RotateCcw, Save, X, Filter,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/20", icon: Clock },
  approved: { label: "Ativo", color: "text-emerald-400 bg-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-400 bg-red-500/20", icon: XCircle },
};

const ATTENDANCE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Aguardando", color: "text-gray-400 bg-gray-500/20", icon: Clock },
  attended: { label: "Compareceu (aguardando)", color: "text-blue-400 bg-blue-500/20", icon: UserCheck },
  approved: { label: "Confirmado", color: "text-emerald-400 bg-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-400 bg-red-500/20", icon: XCircle },
  no_show: { label: "Não compareceu", color: "text-orange-400 bg-orange-500/20", icon: AlertCircle },
};

type TabType = "todos" | "pendentes" | "resgate";

export default function AdminAgendamentos() {
  const [tab, setTab] = useState<TabType>("todos");
  const [search, setSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState<number | "all">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: allRecords, refetch } = trpc.sdr.list.useQuery({});
  const { data: sellersList } = trpc.sellers.list.useQuery({ activeOnly: false });
  const deleteMut = trpc.sdr.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Agendamento excluído"); } });
  const updateMut = trpc.sdr.update.useMutation({ onSuccess: () => { refetch(); setEditingId(null); toast.success("Agendamento atualizado"); } });
  const approveAttMut = trpc.sdr.approveAttendance.useMutation({ onSuccess: () => { refetch(); toast.success("Comparecimento aprovado"); } });
  const rejectAttMut = trpc.sdr.rejectAttendance.useMutation({ onSuccess: () => { refetch(); toast.success("Comparecimento rejeitado"); } });
  const markNoShowMut = trpc.sdr.markNoShow.useMutation({ onSuccess: () => { refetch(); toast.success("Marcado como não compareceu"); } });

  const now = Date.now();
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

  const sellerMap = useMemo(() => {
    const map = new Map<number, string>();
    sellersList?.forEach(s => map.set(s.id, s.nickname || s.name));
    return map;
  }, [sellersList]);

  const records = useMemo(() => {
    if (!allRecords) return [];
    let filtered = [...allRecords];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => {
        const sellerName = sellerMap.get(r.sellerId) || "";
        return (r.customerName || "").toLowerCase().includes(s) ||
          (r.customerPhone || "").toLowerCase().includes(s) ||
          (r.ticketNumber || "").toLowerCase().includes(s) ||
          sellerName.toLowerCase().includes(s);
      });
    }

    // Seller filter
    if (sellerFilter !== "all") {
      filtered = filtered.filter(r => r.sellerId === sellerFilter);
    }

    return filtered;
  }, [allRecords, search, sellerFilter, sellerMap]);

  // Categorize records
  const rescueRecords = useMemo(() => {
    return records.filter(r => {
      if (r.attendanceStatus === 'no_show') return true;
      if (r.attendanceStatus === 'pending' && r.scheduledDate) {
        const elapsed = now - r.scheduledDate;
        return elapsed > FORTY_EIGHT_HOURS;
      }
      return false;
    });
  }, [records, now]);

  const pendingAttendance = useMemo(() => {
    return records.filter(r => r.attendanceStatus === 'attended');
  }, [records]);

  const displayRecords = useMemo(() => {
    if (tab === "resgate") return rescueRecords;
    if (tab === "pendentes") return pendingAttendance;
    return records;
  }, [tab, records, rescueRecords, pendingAttendance]);

  function startEdit(record: any) {
    setEditingId(record.id);
    setEditData({
      customerName: record.customerName || "",
      customerPhone: record.customerPhone || "",
      customerEmail: record.customerEmail || "",
      vehicleInterest: record.vehicleInterest || "",
      notes: record.notes || "",
      scheduledDate: record.scheduledDate ? new Date(record.scheduledDate).toISOString().slice(0, 16) : "",
    });
  }

  function saveEdit() {
    if (!editingId) return;
    updateMut.mutate({
      id: editingId,
      customerName: editData.customerName || undefined,
      customerPhone: editData.customerPhone || undefined,
      customerEmail: editData.customerEmail || undefined,
      vehicleInterest: editData.vehicleInterest || undefined,
      notes: editData.notes || undefined,
      scheduledDate: editData.scheduledDate ? new Date(editData.scheduledDate).getTime() : undefined,
    });
  }

  function formatDate(ts: number | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function getTimeSince(ts: number) {
    const diff = now - ts;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h atrás`;
    return `${hours}h atrás`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold font-heading">Agendamentos</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-medium">
              {rescueRecords.length} para resgate
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-medium">
              {pendingAttendance.length} comparecimentos pendentes
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { key: "todos", label: "Todos", count: records.length },
            { key: "pendentes", label: "Comparecimentos", count: pendingAttendance.length },
            { key: "resgate", label: "Resgate (48h+)", count: rescueRecords.length },
          ] as { key: TabType; label: string; count: number }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? t.key === "resgate" ? "bg-orange-600 text-white" : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, vendedor, ticket..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={sellerFilter === "all" ? "all" : String(sellerFilter)}
            onChange={e => setSellerFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos os vendedores</option>
            {sellersList?.map(s => (
              <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
            ))}
          </select>
        </div>

        {/* Rescue banner */}
        {tab === "resgate" && rescueRecords.length > 0 && (
          <Card className="border-orange-500/30 bg-orange-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-300">Leads para Resgate</p>
                  <p className="text-sm text-orange-400/80">
                    Estes clientes agendaram mas não compareceram há mais de 48h. Oriente os vendedores a tentarem um resgate!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records list */}
        {displayRecords.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum agendamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayRecords.map(record => {
              const isEditing = editingId === record.id;
              const statusCfg = STATUS_LABELS[record.status] || STATUS_LABELS.pending;
              const attCfg = ATTENDANCE_LABELS[record.attendanceStatus || "pending"] || ATTENDANCE_LABELS.pending;
              const StatusIcon = statusCfg.icon;
              const AttIcon = attCfg.icon;
              const isRescue = tab === "resgate" || (record.attendanceStatus === 'no_show') ||
                (record.attendanceStatus === 'pending' && record.scheduledDate && (now - record.scheduledDate) > FORTY_EIGHT_HOURS);

              return (
                <Card key={record.id} className={`${isRescue ? "border-orange-500/40 bg-orange-950/10" : ""} ${record.attendanceStatus === 'attended' ? "border-blue-500/40 bg-blue-950/10" : ""}`}>
                  <CardContent className="py-4">
                    {isEditing ? (
                      /* Edit mode */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">{record.ticketNumber || `#${record.id}`}</span>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit} disabled={updateMut.isPending}>
                              <Save className="h-3 w-3 mr-1" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Cliente</label>
                            <Input value={editData.customerName} onChange={e => setEditData({ ...editData, customerName: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Telefone</label>
                            <Input value={editData.customerPhone} onChange={e => setEditData({ ...editData, customerPhone: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Email</label>
                            <Input value={editData.customerEmail} onChange={e => setEditData({ ...editData, customerEmail: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Veículo de Interesse</label>
                            <Input value={editData.vehicleInterest} onChange={e => setEditData({ ...editData, vehicleInterest: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Data Agendada</label>
                            <Input type="datetime-local" value={editData.scheduledDate} onChange={e => setEditData({ ...editData, scheduledDate: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Observações</label>
                            <Input value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-bold text-primary font-mono">{record.ticketNumber || `#${record.id}`}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${attCfg.color}`}>
                                <AttIcon className="h-3 w-3" /> {attCfg.label}
                              </span>
                              {isRescue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/30 text-orange-300">
                                  <AlertTriangle className="h-3 w-3" /> RESGATE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-semibold">{record.customerName || "Sem nome"}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">Vendedor: <strong>{sellerMap.get(record.sellerId) || "?"}</strong></span>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(record)} title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => { if (confirm("Excluir este agendamento?")) deleteMut.mutate({ id: record.id }); }}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {record.customerPhone && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {record.customerPhone}</span>
                          )}
                          {record.customerEmail && (
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {record.customerEmail}</span>
                          )}
                          {record.vehicleInterest && (
                            <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {record.vehicleInterest}</span>
                          )}
                          {record.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDate(record.scheduledDate)}
                              {isRescue && record.scheduledDate && (
                                <span className="text-orange-400 font-medium ml-1">({getTimeSince(record.scheduledDate)})</span>
                              )}
                            </span>
                          )}
                        </div>

                        {record.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 italic">{record.notes}</p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {record.attendanceStatus === 'attended' && (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveAttMut.mutate({ id: record.id })}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar Comparecimento
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => rejectAttMut.mutate({ id: record.id })}>
                                <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                              </Button>
                            </>
                          )}
                          {record.attendanceStatus === 'pending' && record.status === 'approved' && (
                            <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400" onClick={() => markNoShowMut.mutate({ id: record.id })}>
                              <AlertCircle className="h-3 w-3 mr-1" /> Marcar Não Compareceu
                            </Button>
                          )}
                          {isRescue && record.customerPhone && (
                            <>
                              <a href={`tel:${record.customerPhone}`}>
                                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400">
                                  <PhoneCall className="h-3 w-3 mr-1" /> Ligar
                                </Button>
                              </a>
                              <a href={`https://wa.me/55${record.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="border-green-500/30 text-green-400">
                                  <Phone className="h-3 w-3 mr-1" /> WhatsApp
                                </Button>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
