import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  CalendarClock, Search, Trash2, Edit2, Phone, Mail, Car, Clock,
  CheckCircle2, XCircle, AlertCircle, UserCheck, User,
  AlertTriangle, PhoneCall, Save, X, Bell, CalendarPlus,
  Timer, Siren, Flame, Printer, Bot, ArrowRightLeft, RotateCcw,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/20", icon: Clock },
  approved: { label: "Ativo", color: "text-emerald-400 bg-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-400 bg-red-500/20", icon: XCircle },
};

const ATTENDANCE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Aguardando", color: "text-gray-400 bg-gray-500/20", icon: Clock },
  attended: { label: "Cliente Aguardando", color: "text-cyan-400 bg-cyan-500/20 animate-pulse", icon: UserCheck },
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
  const [now, setNow] = useState(Date.now());
  const [transferId, setTransferId] = useState<number | null>(null);
  const [transferSellerId, setTransferSellerId] = useState<number>(0);
  const [rescueSendingId, setRescueSendingId] = useState<number | null>(null);

  // Live clock for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: allRecords, refetch } = trpc.sdr.list.useQuery({});
  const { data: sellersList } = trpc.sellers.list.useQuery({ activeOnly: false });
  const deleteMut = trpc.sdr.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Agendamento excluído"); } });
  const updateMut = trpc.sdr.update.useMutation({ onSuccess: () => { refetch(); setEditingId(null); toast.success("Agendamento atualizado"); } });
  const approveAttMut = trpc.sdr.approveAttendance.useMutation({ onSuccess: () => { refetch(); toast.success("Comparecimento aprovado"); } });
  const rejectAttMut = trpc.sdr.rejectAttendance.useMutation({ onSuccess: () => { refetch(); toast.success("Comparecimento rejeitado"); } });
  const markNoShowMut = trpc.sdr.markNoShow.useMutation({ onSuccess: () => { refetch(); toast.success("Marcado como não compareceu"); } });
  const transferMut = trpc.sdr.transferAppointment.useMutation({
    onSuccess: () => { refetch(); setTransferId(null); setTransferSellerId(0); toast.success("Agendamento transferido!"); },
    onError: (e: any) => toast.error(e.message || "Erro ao transferir"),
  });
  const aiRescueMut = trpc.sdr.aiRescueWhatsApp.useMutation({
    onSuccess: (data: any) => { setRescueSendingId(null); toast.success(data?.message || "Mensagem de resgate enviada!"); },
    onError: (e: any) => { setRescueSendingId(null); toast.error(e.message || "Erro ao enviar resgate"); },
  });

  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;

  const sellerMap = useMemo(() => {
    const map = new Map<number, string>();
    sellersList?.forEach(s => map.set(s.id, s.nickname || s.name));
    return map;
  }, [sellersList]);

  const records = useMemo(() => {
    if (!allRecords) return [];
    let filtered = [...allRecords];
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
    if (sellerFilter !== "all") {
      filtered = filtered.filter(r => r.sellerId === sellerFilter);
    }
    return filtered;
  }, [allRecords, search, sellerFilter, sellerMap]);

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

  // Play alert sound when there are rescue leads
  useEffect(() => {
    if (rescueRecords.length > 0 && tab === "resgate") {
      // Visual notification via toast
      toast.warning(`${rescueRecords.length} lead(s) para resgate urgente!`, {
        duration: 5000,
        icon: <Siren className="h-5 w-5 text-orange-400" />,
      });
    }
  }, [tab]);

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

function formatDateShort(ts: number | string | Date | null) {
    if (!ts) return "\u2014";
    const d = ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function getTimeSince(ts: number) {
    const diff = now - ts;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h atrás`;
    if (hours > 0) return `${hours}h ${minutes % 60}min atrás`;
    return `${minutes}min atrás`;
  }

  function getTimeUntil(ts: number) {
    const diff = ts - now;
    if (diff <= 0) return null;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `em ${days}d ${hours % 24}h`;
    if (hours > 0) return `em ${hours}h ${minutes % 60}min`;
    return `em ${minutes}min`;
  }

  function getRecordVisualStatus(record: any) {
    if (record.attendanceStatus === 'attended') return 'client_waiting';
    if (record.attendanceStatus === 'approved') return 'confirmed';
    if (record.attendanceStatus === 'no_show') return 'rescue';
    if (record.scheduledDate) {
      const diff = now - record.scheduledDate;
      if (diff > FORTY_EIGHT_HOURS) return 'rescue';
      if (diff > ONE_HOUR) return 'overdue';
      if (diff > 0) return 'expected_now';
      if (diff > -30 * 60 * 1000) return 'arriving_soon';
    }
    return 'normal';
  }

  function handleExportPdf() {
    const rescueAndActive = (allRecords || []).filter(r => {
      if (r.attendanceStatus === 'no_show') return true;
      if (r.status === 'approved' && r.attendanceStatus === 'pending') return true;
      return false;
    });
    if (rescueAndActive.length === 0) { toast.info("Nenhum agendamento para imprimir"); return; }
    let html = `<html><head><meta charset="utf-8"><title>Agendamentos</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{font-size:18px;border-bottom:2px solid #e74c3c;padding-bottom:8px}h2{font-size:14px;margin-top:20px;color:#e74c3c}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th{background:#2c3e50;color:white;padding:8px;text-align:left}td{padding:6px 8px;border-bottom:1px solid #ddd}.rescue{background:#fff3cd}.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold}.rescue-badge{background:#e74c3c;color:white}.active-badge{background:#27ae60;color:white}@media print{body{padding:0}}</style></head><body>`;
    html += `<h1>Agendamentos - ${new Date().toLocaleDateString('pt-BR')}</h1>`;
    const rescues = rescueAndActive.filter(r => r.attendanceStatus === 'no_show' || (r.scheduledDate && now - r.scheduledDate > FORTY_EIGHT_HOURS));
    const actives = rescueAndActive.filter(r => !rescues.includes(r));
    if (rescues.length > 0) {
      html += `<h2>RESGATES (${rescues.length})</h2><table><tr><th>Ticket</th><th>Cliente</th><th>Telefone</th><th>Ve\u00edculo</th><th>Vendedor</th><th>Agendado</th><th>Obs</th></tr>`;
      rescues.forEach(r => {
        html += `<tr class="rescue"><td>${r.ticketNumber || '#' + r.id}</td><td>${r.customerName || '-'}</td><td>${r.customerPhone || '-'}</td><td>${r.vehicleInterest || '-'}</td><td>${sellerMap.get(r.sellerId) || '?'}</td><td>${r.scheduledDate ? formatDate(r.scheduledDate) : '-'}</td><td>${r.notes || '-'}</td></tr>`;
      });
      html += '</table>';
    }
    if (actives.length > 0) {
      html += `<h2>ATIVOS (${actives.length})</h2><table><tr><th>Ticket</th><th>Cliente</th><th>Telefone</th><th>Ve\u00edculo</th><th>Vendedor</th><th>Agendado</th><th>Obs</th></tr>`;
      actives.forEach(r => {
        html += `<tr><td>${r.ticketNumber || '#' + r.id}</td><td>${r.customerName || '-'}</td><td>${r.customerPhone || '-'}</td><td>${r.vehicleInterest || '-'}</td><td>${sellerMap.get(r.sellerId) || '?'}</td><td>${r.scheduledDate ? formatDate(r.scheduledDate) : '-'}</td><td>${r.notes || '-'}</td></tr>`;
      });
      html += '</table>';
    }
    html += '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) { printWindow.onload = () => { printWindow.print(); }; }
  }

  function handleTransfer(recordId: number) {
    if (!transferSellerId) { toast.error("Selecione um vendedor"); return; }
    const record = (allRecords || []).find(r => r.id === recordId);
    if (!record) return;
    transferMut.mutate({ id: recordId, sellerId: record.sellerId, newSellerId: transferSellerId });
  }

  function handleAiRescue(record: any) {
    if (!record.customerPhone) { toast.error("Cliente sem telefone"); return; }
    setRescueSendingId(record.id);
    aiRescueMut.mutate({ id: record.id, sellerId: record.sellerId });
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
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Button size="sm" variant="outline" onClick={handleExportPdf} className="gap-1.5 border-orange-500 text-orange-400 hover:bg-orange-500/20">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </Button>
            {rescueRecords.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-bold animate-pulse flex items-center gap-1.5">
                <Siren className="h-4 w-4" />
                {rescueRecords.length} RESGATE URGENTE
              </span>
            )}
            {pendingAttendance.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-bold animate-pulse flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" />
                {pendingAttendance.length} CLIENTE AGUARDANDO
              </span>
            )}
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                tab === t.key
                  ? t.key === "resgate" ? "bg-red-600 text-white" : t.key === "pendentes" ? "bg-cyan-600 text-white" : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.label} ({t.count})
              {t.key === "resgate" && t.count > 0 && tab !== t.key && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
              )}
              {t.key === "pendentes" && t.count > 0 && tab !== t.key && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-cyan-500 rounded-full animate-ping" />
              )}
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
          <Card className="border-red-500/50 bg-red-950/30 shadow-lg shadow-red-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Siren className="h-8 w-8 text-red-400" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <div>
                  <p className="font-bold text-red-300 text-lg">ALERTA DE RESGATE</p>
                  <p className="text-sm text-red-400/80">
                    {rescueRecords.length} lead(s) agendaram mas não compareceram há mais de 48h. Oriente os vendedores a tentarem um resgate urgente!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client waiting banner */}
        {pendingAttendance.length > 0 && tab !== "pendentes" && (
          <Card className="border-cyan-500/50 bg-cyan-950/30 cursor-pointer hover:bg-cyan-950/40 transition-colors" onClick={() => setTab("pendentes")}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <UserCheck className="h-6 w-6 text-cyan-400 animate-pulse" />
                <p className="text-sm text-cyan-300 font-medium">
                  {pendingAttendance.length} cliente(s) aguardando confirmação de comparecimento — clique para ver
                </p>
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
              const vs = getRecordVisualStatus(record);
              const isRescue = vs === 'rescue';
              const isClientWaiting = vs === 'client_waiting';
              const isArrivingSoon = vs === 'arriving_soon';
              const isExpectedNow = vs === 'expected_now';

              const borderClass = isRescue ? "border-red-500/50 bg-red-950/15" :
                isClientWaiting ? "border-cyan-500/50 bg-cyan-950/15 shadow-lg shadow-cyan-500/5" :
                isExpectedNow ? "border-amber-500/50 bg-amber-950/15" :
                isArrivingSoon ? "border-yellow-500/30 bg-yellow-950/10" : "";

              return (
                <Card key={record.id} className={borderClass}>
                  <CardContent className="py-4">
                    {isEditing ? (
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
                      <div className="space-y-3">
                        {/* Top row: ticket, status badges, actions */}
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
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/30 text-red-300 animate-pulse">
                                  <Siren className="h-3 w-3" /> RESGATE
                                </span>
                              )}
                              {record.isFeirão && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                  <Flame className="h-3 w-3" /> Feirão
                                </span>
                              )}
                              {isClientWaiting && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/30 text-cyan-300 animate-pulse">
                                  <Bell className="h-3 w-3" /> CLIENTE AGUARDANDO
                                </span>
                              )}
                              {isArrivingSoon && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/30 text-yellow-300">
                                  <Timer className="h-3 w-3" /> CHEGANDO EM BREVE
                                </span>
                              )}
                              {isExpectedNow && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/30 text-amber-300 animate-pulse">
                                  <AlertTriangle className="h-3 w-3" /> ESPERADO AGORA
                                </span>
                              )}
                            </div>
                            {/* Customer name and seller */}
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

                        {/* Details row with dates prominently shown */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          {record.customerPhone && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {record.customerPhone}</span>
                          )}
                          {record.vehicleInterest && (
                            <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {record.vehicleInterest}</span>
                          )}
                        </div>

                        {/* Date section - prominent */}
                        <div className="flex flex-wrap gap-3 text-xs">
                          {/* Created date */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50">
                            <CalendarPlus className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-muted-foreground">Criado:</span>
                            <span className="font-medium text-foreground">{formatDateShort(record.createdAt)}</span>
                          </div>
                          {/* Scheduled date */}
                          {record.scheduledDate && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${
                              isRescue ? "bg-red-500/10 border-red-500/30" :
                              isExpectedNow ? "bg-amber-500/10 border-amber-500/30" :
                              isArrivingSoon ? "bg-yellow-500/10 border-yellow-500/30" :
                              "bg-muted/40 border-border/50"
                            }`}>
                              <Clock className={`h-3.5 w-3.5 ${isRescue ? "text-red-400" : isExpectedNow ? "text-amber-400" : isArrivingSoon ? "text-yellow-400" : "text-emerald-400"}`} />
                              <span className="text-muted-foreground">Agendado:</span>
                              <span className={`font-bold ${isRescue ? "text-red-300" : isExpectedNow ? "text-amber-300" : isArrivingSoon ? "text-yellow-300" : "text-foreground"}`}>
                                {formatDate(record.scheduledDate)}
                              </span>
                              {/* Time context */}
                              {record.scheduledDate < now ? (
                                <span className={`font-medium ml-1 ${isRescue ? "text-red-400" : "text-orange-400"}`}>
                                  ({getTimeSince(record.scheduledDate)})
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-medium ml-1">
                                  ({getTimeUntil(record.scheduledDate)})
                                </span>
                              )}
                            </div>
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
                          {/* AI Rescue button */}
                          {record.customerPhone && (isRescue || record.attendanceStatus === 'no_show') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAiRescue(record)}
                              disabled={rescueSendingId === record.id}
                              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                            >
                              <Bot className="h-3 w-3 mr-1" />
                              {rescueSendingId === record.id ? 'Enviando...' : 'IA Resgate'}
                            </Button>
                          )}
                          {/* Transfer button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTransferId(transferId === record.id ? null : record.id)}
                            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" /> Transferir
                          </Button>
                        </div>
                        {/* Transfer dropdown */}
                        {transferId === record.id && (
                          <div className="flex gap-2 items-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 mt-2">
                            <select
                              value={transferSellerId}
                              onChange={e => setTransferSellerId(Number(e.target.value))}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
                            >
                              <option value={0}>Selecione vendedor...</option>
                              {(sellersList || []).filter(s => s.id !== record.sellerId && s.active).map(s => (
                                <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                              ))}
                            </select>
                            <Button size="sm" onClick={() => handleTransfer(record.id)} disabled={transferMut.isPending} className="text-xs h-7">
                              {transferMut.isPending ? '...' : 'OK'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setTransferId(null)} className="text-xs h-7">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
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
