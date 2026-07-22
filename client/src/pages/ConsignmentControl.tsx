import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Warehouse, Car, Clock, CheckCircle2, LogOut, AlertTriangle, ArrowLeft, Calendar, Search, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Phone, DollarSign, FileText, ShieldCheck, Tag, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MonthFilter, { filterByMonth } from "@/components/MonthFilter";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ListSkeleton } from "@/components/ListSkeleton";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskPhone } from "@/lib/masks";
import { isValidBrazilianPhone } from "@shared/validators";

type Tab = "patio" | "completed" | "history";

export default function ConsignmentControl() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("patio");
  const [now] = useState(() => new Date());
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitRecordId, setExitRecordId] = useState<number | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dados
  const { data: yardVehicles, isLoading: loadingYard, refetch: refetchYard } = trpc.consignment.yard.useQuery();
  const { data: completed7Days, isLoading: loadingCompleted, refetch: refetchCompleted } = trpc.consignment.completed7Days.useQuery(
    { month: filterMonth + 1, year: filterYear }
  );
  const { data: exitedVehicles, isLoading: loadingExited, refetch: refetchExited } = trpc.consignment.exited.useQuery(
    { month: filterMonth + 1, year: filterYear }
  );

  // Filtro de busca
  const filterVehicles = (list: any[] | undefined) => {
    if (!list) return [];
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((v: any) =>
      v.vehiclePlate?.toLowerCase().includes(q) ||
      v.vehicleModel?.toLowerCase().includes(q) ||
      v.ownerName?.toLowerCase().includes(q) ||
      getSellerName(v.sellerId)?.toLowerCase().includes(q)
    );
  };
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: false });

  // Paginação da aba ativa (client-side: as 3 listas já são carregadas para os
  // contadores das abas, então server-side não reduziria carga aqui).
  const pagination = usePagination({ initialPageSize: 20, resetDeps: [activeTab, searchTerm, filterMonth, filterYear] });
  const activeIsLoading = activeTab === "patio" ? loadingYard : activeTab === "completed" ? loadingCompleted : loadingExited;
  const activeRaw = activeTab === "patio" ? yardVehicles : activeTab === "completed" ? completed7Days : exitedVehicles;
  const activeFilteredTotal = filterVehicles(activeRaw).length;
  const activeTotalPages = Math.max(1, Math.ceil(activeFilteredTotal / pagination.pageSize));
  const pagedFilter = (list: any[] | undefined) => filterVehicles(list).slice(pagination.offset, pagination.offset + pagination.limit);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);

  const updateExit = trpc.consignment.updateExit.useMutation({
    onSuccess: () => {
      toast.success("Saída registrada com sucesso!");
      refetchYard();
      refetchCompleted();
      refetchExited();
      setExitDialogOpen(false);
      setExitRecordId(null);
      setExitDate("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateConsignment = trpc.consignment.update.useMutation({
    onSuccess: () => {
      toast.success("Consignação atualizada!");
      refetchYard(); refetchCompleted(); refetchExited();
      setEditDialogOpen(false);
      setEditRecord(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteConsignment = trpc.consignment.delete.useMutation({
    onSuccess: () => {
      toast.success("Consignação excluída!");
      refetchYard(); refetchCompleted(); refetchExited();
      setDeleteDialogOpen(false);
      setDeleteRecordId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const isAdmin = user?.role === 'admin';
  const isConsignacao = (user?.role as string) === 'consignacao' || user?.role === 'admin' || (user?.role as string) === 'manager';

  const openEdit = (v: any) => {
    setEditRecord({ ...v });
    setEditDialogOpen(true);
  };

  const openDelete = (id: number) => {
    setDeleteRecordId(id);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editRecord) return;
    if (editRecord.ownerPhone && !isValidBrazilianPhone(editRecord.ownerPhone)) {
      toast.error("Telefone do proprietário inválido");
      return;
    }
    updateConsignment.mutate({
      id: editRecord.id,
      vehiclePlate: editRecord.vehiclePlate || undefined,
      vehicleModel: editRecord.vehicleModel || undefined,
      ownerName: editRecord.ownerName || undefined,
      ownerPhone: editRecord.ownerPhone || undefined,
      entryDate: editRecord.entryDate || undefined,
      hasAuction: editRecord.hasAuction,
      vehicleStatus: editRecord.vehicleStatus || undefined,
      costValue: editRecord.costValue || undefined,
      notes: editRecord.notes || undefined,
    });
  };

  const getSellerName = (sellerId: number) => {
    const seller = sellers?.find(s => s.id === sellerId);
    return seller?.nickname || seller?.name || "Desconhecido";
  };

  const getDaysInYard = (entryDate: number, exitDate?: number | null) => {
    const end = exitDate || Date.now();
    return Math.floor((end - entryDate) / (1000 * 60 * 60 * 24));
  };

  const handleExitClick = (recordId: number) => {
    setExitRecordId(recordId);
    setExitDate(new Date().toISOString().split('T')[0]);
    setExitDialogOpen(true);
  };

  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const handleConfirmExit = () => {
    if (!exitRecordId || !exitDate || !exitReason) return;
    setConfirmExitOpen(true);
  };

  const handleFinalConfirmExit = () => {
    if (!exitRecordId || !exitDate || !exitReason) return;
    updateExit.mutate({ id: exitRecordId, exitDate: new Date(exitDate).getTime(), exitReason });
    setConfirmExitOpen(false);
  };

  // Exportar CSV
  const exportCSV = () => {
    const allVehicles = [
      ...(yardVehicles || []).map((v: any) => ({ ...v, _status: "No Pátio" })),
      ...(exitedVehicles || []).map((v: any) => ({ ...v, _status: v.exitReason ? `Saída: ${v.exitReason}` : "Com Saída" })),
    ];
    if (!allVehicles.length) { toast.error("Nenhum veículo para exportar"); return; }
    const headers = ["Placa", "Modelo", "Proprietário", "Telefone", "Data Entrada", "Data Saída", "Status", "Motivo Saída", "Custo", "Dias no Pátio", "Vendedor"];
    const rows = allVehicles.map((v: any) => [
      v.vehiclePlate || "",
      v.vehicleModel || "",
      v.ownerName || "",
      v.ownerPhone || "",
      v.entryDate ? new Date(v.entryDate).toLocaleDateString("pt-BR") : "",
      v.exitDate ? new Date(v.exitDate).toLocaleDateString("pt-BR") : "",
      v._status,
      v.exitReason || "",
      v.costValue ? `R$ ${v.costValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "",
      getDaysInYard(v.entryDate, v.exitDate).toString(),
      getSellerName(v.sellerId),
    ]);
    // Linha de resumo
    const totalVehicles = allVehicles.length;
    const totalCost = allVehicles.reduce((sum: number, v: any) => sum + (v.costValue || 0), 0);
    const summaryRow = ["", "", "", "", "", "", "", `TOTAL: ${totalVehicles} veículos`, `R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "", ""];
    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";")), "", summaryRow.join(";")].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consignacao_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "—";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Detail panel component
  const VehicleDetails = ({ v }: { v: any }) => (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Car className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <span className="text-muted-foreground">Modelo:</span>
          <span className="text-foreground font-medium truncate">{v.vehicleModel || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-cyan-400 flex-shrink-0" />
          <span className="text-muted-foreground">Placa:</span>
          <span className="text-foreground font-mono font-medium">{v.vehiclePlate || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-green-400 flex-shrink-0" />
          <span className="text-muted-foreground">Tel Dono:</span>
          <span className="text-foreground">{v.ownerPhone || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-yellow-400 flex-shrink-0" />
          <span className="text-muted-foreground">Custo:</span>
          <span className="text-foreground font-medium">{formatCurrency(v.costValue)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-purple-400 flex-shrink-0" />
          <span className="text-muted-foreground">Status:</span>
          <span className={`font-medium ${v.vehicleStatus === 'financiado' ? 'text-orange-400' : 'text-emerald-400'}`}>
            {v.vehicleStatus === 'financiado' ? 'Financiado' : 'Quitado'}
          </span>
        </div>
        {v.vehicleStatus === 'financiado' && v.payoffValue && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-orange-400 flex-shrink-0" />
            <span className="text-muted-foreground">Quitação:</span>
            <span className="text-orange-400 font-medium">{formatCurrency(v.payoffValue)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <span className="text-muted-foreground">Leilão:</span>
          <span className={v.hasAuction ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
            {v.hasAuction ? 'SIM' : 'Não'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <span className="text-muted-foreground">Entrada:</span>
          <span className="text-foreground">{new Date(v.entryDate).toLocaleDateString('pt-BR')}</span>
        </div>
        {v.exitDate && (
          <div className="flex items-center gap-1.5">
            <LogOut className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="text-muted-foreground">Saída:</span>
            <span className="text-foreground">{new Date(v.exitDate).toLocaleDateString('pt-BR')}{v.exitReason ? ` (${v.exitReason})` : ''}</span>
          </div>
        )}
      </div>
      {v.notes && (
        <div className="flex items-start gap-1.5 text-xs">
          <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span className="text-muted-foreground">Obs:</span>
          <span className="text-foreground">{v.notes}</span>
        </div>
      )}
      {v.soldVia && (
        <div className="flex items-center gap-1.5 text-xs bg-green-500/10 rounded px-2 py-1.5 border border-green-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400 font-semibold">VENDIDO</span>
          {v.soldAt && (
            <span className="text-green-400/70 text-[10px]">em {new Date(v.soldAt).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      )}
    </div>
  );

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "patio", label: "No Pátio", icon: Car, count: yardVehicles?.length || 0 },
    { key: "completed", label: "7 Dias ✓", icon: CheckCircle2, count: completed7Days?.length || 0 },
    { key: "history", label: "Histórico", icon: Clock, count: exitedVehicles?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Warehouse className="w-5 h-5 text-cyan-400" />
            <h1 className="font-heading font-bold text-lg text-foreground">CONSIGNAÇÃO</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[53px] z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="container flex gap-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-blue-500/30 text-blue-300' : 'bg-muted text-muted-foreground'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-4 space-y-3">
        {/* Filtro por mês */}
        <MonthFilter
          month={filterMonth}
          year={filterYear}
          onChange={(m, y) => { setFilterMonth(m); setFilterYear(y); }}
        />

        {/* Busca + Exportar */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, modelo, proprietário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="flex items-center gap-1.5 whitespace-nowrap">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {activeIsLoading && <ListSkeleton rows={6} />}

        {/* VEÍCULOS NO PÁTIO */}
        {activeTab === "patio" && !activeIsLoading && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-blue-400" />
              <h2 className="font-heading font-bold text-sm text-foreground">
                VEÍCULOS NO PÁTIO — {yardVehicles?.length || 0} veículos
              </h2>
            </div>
            {filterVehicles(yardVehicles).length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum veículo no pátio no momento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagedFilter(yardVehicles).map((v: any) => {
                  const days = getDaysInYard(v.entryDate);
                  const isNear7 = days >= 5 && days < 7;
                  const isOver7 = days >= 7;
                  const isExpanded = expandedId === v.id;
                  return (
                    <div key={v.id} className={`racing-card p-3 cursor-pointer transition-all ${
                      isOver7 ? 'border-emerald-500/30 bg-emerald-500/5' :
                      isNear7 ? 'border-yellow-500/30 bg-yellow-500/5' : ''
                    } ${isExpanded ? 'ring-1 ring-blue-500/40' : ''}`}>
                      <div className="flex items-start justify-between gap-2" onClick={() => toggleExpand(v.id)}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {v.vehiclePlate || '---'}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.vehicleModel}</span>
                            {v.soldVia && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">VENDIDO</span>
                            )}
                            {v.hasAuction && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">LEILÃO</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>Dono: <strong className="text-foreground">{v.ownerName}</strong></span>
                            {v.ownerPhone && <span>Tel: {v.ownerPhone}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Entrada: {new Date(v.entryDate).toLocaleDateString('pt-BR')}</span>
                            <span>Vendedor: {getSellerName(v.sellerId)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end">
                          <div className={`text-lg font-bold font-heading ${
                            isOver7 ? 'text-emerald-400' : isNear7 ? 'text-yellow-400' : 'text-foreground'
                          }`}>
                            {days}d
                          </div>
                          <div className="text-[10px] text-muted-foreground">no pátio</div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-400 mt-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                          )}
                        </div>
                      </div>
                      {isOver7 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completou 7 dias — conta para meta!
                        </div>
                      )}
                      {isNear7 && !isOver7 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-yellow-400 bg-yellow-500/10 rounded px-2 py-1">
                          <AlertTriangle className="w-3 h-3" />
                          Faltam {7 - days} dia(s) para completar 7 dias
                        </div>
                      )}
                      {/* Expanded details */}
                      {isExpanded && <VehicleDetails v={v} />}
                      <div className="mt-2 flex justify-end gap-2">
                        {isConsignacao && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                              onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                                onClick={(e) => { e.stopPropagation(); openDelete(v.id); }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Excluir
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={(e) => { e.stopPropagation(); handleExitClick(v.id); }}
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          Dar Saída
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* COMPLETARAM 7 DIAS */}
        {activeTab === "completed" && !activeIsLoading && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="font-heading font-bold text-sm text-foreground">
                COMPLETARAM 7 DIAS — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h2>
            </div>
            <div className="racing-card p-3 mb-3 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold text-emerald-400">{completed7Days?.length || 0} veículos</p>
                  <p className="text-[10px] text-muted-foreground">completaram 7 dias no pátio este mês</p>
                </div>
              </div>
            </div>
            {filterVehicles(completed7Days).length === 0 ? (
              <div className="racing-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhum veículo completou 7 dias este mês.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagedFilter(completed7Days).map((v: any) => {
                  const days = getDaysInYard(v.entryDate, v.exitDate);
                  const isExpanded = expandedId === v.id;
                  return (
                    <div key={v.id} className={`racing-card p-3 border-emerald-500/20 cursor-pointer transition-all ${isExpanded ? 'ring-1 ring-blue-500/40' : ''}`}
                      onClick={() => toggleExpand(v.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {v.vehiclePlate || '---'}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.vehicleModel}</span>
                            {v.soldVia && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">VENDIDO</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Dono: {v.ownerName} | Vendedor: {getSellerName(v.sellerId)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Entrada: {new Date(v.entryDate).toLocaleDateString('pt-BR')}
                            {v.exitDate && ` → Saída: ${new Date(v.exitDate).toLocaleDateString('pt-BR')}`}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end">
                          <div className="text-lg font-bold text-emerald-400">{days}d</div>
                          <div className="text-[10px] text-emerald-400/60">✓ válido</div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-400 mt-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                          )}
                        </div>
                      </div>
                      {isExpanded && <VehicleDetails v={v} />}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* HISTÓRICO (SAÍRAM) */}
        {activeTab === "history" && !activeIsLoading && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-bold text-sm text-foreground">
                HISTÓRICO DE SAÍDAS — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h2>
            </div>
            {filterVehicles(exitedVehicles).length === 0 ? (
              <div className="racing-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhum veículo saiu do pátio este mês.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagedFilter(exitedVehicles).map((v: any) => {
                  const days = getDaysInYard(v.entryDate, v.exitDate);
                  const isExpanded = expandedId === v.id;
                  return (
                    <div key={v.id} className={`racing-card p-3 cursor-pointer transition-all ${v.isValid ? 'border-emerald-500/20' : 'border-red-500/20'} ${isExpanded ? 'ring-1 ring-blue-500/40' : ''}`}
                      onClick={() => toggleExpand(v.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {v.vehiclePlate || '---'}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.vehicleModel}</span>
                            {v.isValid ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">7d ✓</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">&lt;7d</span>
                            )}
                            {v.soldVia && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">VENDIDO</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Dono: {v.ownerName} | Vendedor: {getSellerName(v.sellerId)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(v.entryDate).toLocaleDateString('pt-BR')} → {v.exitDate ? new Date(v.exitDate).toLocaleDateString('pt-BR') : '—'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end">
                          <div className={`text-lg font-bold ${v.isValid ? 'text-emerald-400' : 'text-red-400'}`}>{days}d</div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-400 mt-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                          )}
                        </div>
                      </div>
                      {isExpanded && <VehicleDetails v={v} />}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!activeIsLoading && activeFilteredTotal > 0 && (
          <PaginationControls
            page={pagination.page}
            totalPages={activeTotalPages}
            total={activeFilteredTotal}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            className="border-t border-border pt-5"
          />
        )}
      </div>

      {/* Dialog de Saída */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar Saída do Pátio</DialogTitle>
            <DialogDescription>
              O veículo será marcado como retirado. O registro permanece no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-foreground">Motivo da saída *</Label>
              <select
                value={exitReason}
                onChange={e => setExitReason(e.target.value)}
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-foreground text-sm"
              >
                <option value="">Selecione o motivo...</option>
                <option value="vendido">Vendido</option>
                <option value="devolvido">Devolvido ao proprietário</option>
                <option value="transferido">Transferido</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Data de saída</Label>
              <Input
                type="date"
                value={exitDate}
                onChange={e => setExitDate(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExitDialogOpen(false); setExitReason(""); }}>Cancelar</Button>
            <Button
              onClick={handleConfirmExit}
              disabled={!exitDate || !exitReason || updateExit.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {updateExit.isPending ? "Registrando..." : "Confirmar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação Final */}
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída do veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação registrará a saída definitiva do veículo do pátio. Motivo: <strong>{exitReason === "vendido" ? "Vendido" : exitReason === "devolvido" ? "Devolvido ao proprietário" : exitReason === "transferido" ? "Transferido" : "Outro"}</strong>. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalConfirmExit} className="bg-red-600 hover:bg-red-700 text-white">
              Sim, confirmar saída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Editar Consignação (Admin) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Consignação</DialogTitle>
            <DialogDescription>Corrija os dados da consignação lançada incorretamente.</DialogDescription>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Placa</Label>
                  <Input value={editRecord.vehiclePlate || ''} onChange={e => setEditRecord({...editRecord, vehiclePlate: e.target.value.toUpperCase()})} className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Modelo</Label>
                  <Input value={editRecord.vehicleModel || ''} onChange={e => setEditRecord({...editRecord, vehicleModel: e.target.value})} className="bg-muted border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Dono</Label>
                  <Input value={editRecord.ownerName || ''} onChange={e => setEditRecord({...editRecord, ownerName: e.target.value})} className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Telefone</Label>
                  <Input value={editRecord.ownerPhone || ''} onChange={e => setEditRecord({...editRecord, ownerPhone: maskPhone(e.target.value)})} className="bg-muted border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Data de Entrada</Label>
                  <Input type="date" value={editRecord.entryDate ? new Date(editRecord.entryDate).toISOString().split('T')[0] : ''} disabled className="bg-muted border-border text-foreground opacity-60 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Valor Custo (R$)</Label>
                  <MoneyInput
                    value={editRecord.costValueDisplay || (editRecord.costValue ? editRecord.costValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')}
                    onChange={v => {
                      const raw = v.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
                      const num = parseFloat(raw) || 0;
                      setEditRecord({...editRecord, costValue: Math.round(num), costValueDisplay: v});
                    }}
                    placeholder="50.000,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Status</Label>
                  <select value={editRecord.vehicleStatus || 'quitado'} onChange={e => setEditRecord({...editRecord, vehicleStatus: e.target.value})} className="w-full h-9 rounded-md border border-border bg-muted text-foreground text-sm px-3">
                    <option value="quitado">Quitado</option>
                    <option value="financiado">Financiado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Leilão?</Label>
                  <select value={editRecord.hasAuction ? 'sim' : 'nao'} onChange={e => setEditRecord({...editRecord, hasAuction: e.target.value === 'sim'})} className="w-full h-9 rounded-md border border-border bg-muted text-foreground text-sm px-3">
                    <option value="nao">Sem Leilão</option>
                    <option value="sim">Com Leilão</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Observações</Label>
                <Textarea value={editRecord.notes || ''} onChange={e => setEditRecord({...editRecord, notes: e.target.value})} className="bg-muted border-border text-foreground min-h-[60px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateConsignment.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {updateConsignment.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Excluir Consignação (Admin) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-red-400">Excluir Consignação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta consignação? Se já estava aprovada e válida, os pontos serão revertidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => deleteRecordId && deleteConsignment.mutate({ id: deleteRecordId })} disabled={deleteConsignment.isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteConsignment.isPending ? "Excluindo..." : "Excluir Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
