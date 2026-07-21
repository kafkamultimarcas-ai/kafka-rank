import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

function formatCurrencyPV(val: string): string {
  const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(num)) return val;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";
import MonthFilter, { filterByMonth } from "@/components/MonthFilter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Plus, Search, Wrench, Clock, Truck, CheckCircle2, AlertTriangle,
  Car, Phone, User, FileText, Calendar, Building2, DollarSign,
  ChevronRight, Trash2, Edit, Eye, X, ImagePlus, History,
  MessageCircle, PhoneCall, Edit3, ChevronsUpDown, Check, Info
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  aberto: { label: "Aberto", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: FileText },
  agendado: { label: "Agendado", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: Calendar },
  em_servico: { label: "Em Serviço", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: Wrench },
  finalizado: { label: "Finalizado", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle2 },
  entregue: { label: "Entregue", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: Truck },
  cancelado: { label: "Cancelado", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: X },
};

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "R$ 0,00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPosVenda() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChamado, setShowNewChamado] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showAllMonths, setShowAllMonths] = useState(true); // Pós-venda mostra todos por padrão

  const chamadosQuery = trpc.pvChamados.list.useQuery({ status: statusFilter !== "todos" ? statusFilter : undefined });
  const countsQuery = trpc.pvChamados.counts.useQuery();
  const sellersQuery = trpc.sellers.list.useQuery();
  const oficinasQuery = trpc.pvOficinas.list.useQuery();
  const alertasQuery = trpc.pvChamados.alertas.useQuery();

  const allChamados = chamadosQuery.data || [];
  const counts = countsQuery.data || { aberto: 0, agendado: 0, em_servico: 0, finalizado: 0, entregue: 0, total: 0 };

  const chamados = useMemo(() => {
    if (showAllMonths) return allChamados;
    return filterByMonth(allChamados, filterMonth, filterYear, 'createdAt' as any);
  }, [allChamados, filterMonth, filterYear, showAllMonths]);

  const filtered = useMemo(() => {
    if (!searchTerm) return chamados;
    const s = searchTerm.toLowerCase();
    return chamados.filter((c: any) =>
      c.clienteNome?.toLowerCase().includes(s) ||
      c.carroPlaca?.toLowerCase().includes(s) ||
      c.carroModelo?.toLowerCase().includes(s) ||
      c.ticketNumber?.toLowerCase().includes(s)
    );
  }, [chamados, searchTerm]);

  const pagination = usePagination({
    initialPageSize: 10,
    total: filtered.length,
    resetDeps: [statusFilter, searchTerm, filterMonth, filterYear, showAllMonths],
  });
  const pagedChamados = useMemo(
    () => filtered.slice(pagination.offset, pagination.offset + pagination.limit),
    [filtered, pagination.offset, pagination.limit],
  );

  const alertas = alertasQuery.data || { vencendo: [], vencidos: [] };
  const totalAlertas = alertas.vencendo.length + alertas.vencidos.length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6 text-orange-500" />
              Pós-Venda
            </h1>
            <p className="text-muted-foreground text-sm">Controle de chamados e serviços</p>
          </div>
          <Button onClick={() => setShowNewChamado(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" /> Abrir Chamado
          </Button>
        </div>

        {/* Alertas de prazo */}
        {totalAlertas > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                <AlertTriangle className="h-5 w-5" />
                {totalAlertas} alerta{totalAlertas > 1 ? "s" : ""} de prazo
              </div>
              <div className="space-y-1 text-sm">
                {alertas.vencidos.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-red-300">
                    <span className="font-mono">{c.ticketNumber}</span>
                    <span>{c.clienteNome} - {c.carroModelo}</span>
                    <span className="ml-auto font-semibold text-red-400">PRAZO VENCIDO</span>
                  </div>
                ))}
                {alertas.vencendo.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-yellow-300">
                    <span className="font-mono">{c.ticketNumber}</span>
                    <span>{c.clienteNome} - {c.carroModelo}</span>
                    <span className="ml-auto font-semibold text-yellow-400">Vence hoje/amanhã</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contadores por status */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { key: "todos", label: "Todos", count: counts.total, color: "text-white" },
            { key: "aberto", label: "Abertos", count: counts.aberto, color: "text-blue-400" },
            { key: "agendado", label: "Agendados", count: counts.agendado, color: "text-yellow-400" },
            { key: "em_servico", label: "Em Serviço", count: counts.em_servico, color: "text-orange-400" },
            { key: "finalizado", label: "Finalizados", count: counts.finalizado, color: "text-green-400" },
            { key: "entregue", label: "Entregues", count: counts.entregue, color: "text-emerald-400" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`rounded-lg p-3 text-center transition-all ${
                statusFilter === s.key ? "ring-2 ring-orange-500 bg-card" : "bg-card/50 hover:bg-card"
              }`}
            >
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </button>
          ))}
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

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, placa, modelo ou ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de chamados - cards visuais */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum chamado encontrado</p>
            </div>
          )}
          {pagedChamados.map((chamado: any) => {
            const cfg = STATUS_CONFIG[chamado.status] || STATUS_CONFIG.aberto;
            const StatusIcon = cfg.icon;
            const isOverdue = chamado.prazoEntrega && chamado.prazoEntrega < Date.now() && !["entregue", "cancelado"].includes(chamado.status);
            return (
              <Card
                key={chamado.id}
                className={`cursor-pointer hover:ring-1 hover:ring-orange-500/50 transition-all ${cfg.border} border-l-4 ${isOverdue ? "ring-1 ring-red-500/50" : ""}`}
                onClick={() => { setSelectedChamado(chamado); setShowDetail(true); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                      <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{chamado.ticketNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-medium`}>
                          {cfg.label}
                        </span>
                        {isOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium animate-pulse">
                            ATRASADO
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold mt-1 truncate">{chamado.clienteNome}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Car className="h-3.5 w-3.5" />
                          {chamado.carroModelo}
                        </span>
                        {chamado.carroPlaca && (
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                            {chamado.carroPlaca}
                          </span>
                        )}
                        {chamado.oficinaNome && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1 text-orange-400 cursor-help">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {chamado.oficinaNome}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-semibold">{chamado.oficinaNome}</p>
                                {(() => {
                                  const of_ = (oficinasQuery.data || []).find((o: any) => o.id === chamado.oficinaId);
                                  if (!of_) return <p className="text-xs text-muted-foreground">Sem detalhes</p>;
                                  return (
                                    <div className="text-xs space-y-0.5 mt-1">
                                      {of_.phone && <p><Phone className="h-3 w-3 inline mr-1" />{of_.phone}</p>}
                                      {of_.address && <p>{of_.address}</p>}
                                    </div>
                                  );
                                })()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {chamado.prazoEntrega && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Prazo: {formatDate(chamado.prazoEntrega)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{chamado.problemaRelatado}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length > 0 && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={filtered.length}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              className="border-t border-border pt-5"
            />
          )}
        </div>

        {/* Modal: Novo Chamado */}
        <NovoChamadoModal
          open={showNewChamado}
          onClose={() => setShowNewChamado(false)}
          sellers={sellersQuery.data || []}
          onSuccess={() => {
            chamadosQuery.refetch();
            countsQuery.refetch();
          }}
        />

        {/* Modal: Detalhe do Chamado */}
        {selectedChamado && (
          <DetalheChamadoModal
            open={showDetail}
            onClose={() => { setShowDetail(false); setSelectedChamado(null); }}
            chamado={selectedChamado}
            sellers={sellersQuery.data || []}
            oficinas={oficinasQuery.data || []}
            onUpdate={() => {
              chamadosQuery.refetch();
              countsQuery.refetch();
              alertasQuery.refetch();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ===== MODAL: NOVO CHAMADO (super simples) =====
function NovoChamadoModal({ open, onClose, sellers, onSuccess }: any) {
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [carroModelo, setCarroModelo] = useState("");
  const [carroPlaca, setCarroPlaca] = useState("");
  const [problemaRelatado, setProblemaRelatado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [vendedorId, setVendedorId] = useState("");

  const createMutation = trpc.pvChamados.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setClienteNome(""); setClienteTelefone(""); setCarroModelo("");
    setCarroPlaca(""); setProblemaRelatado(""); setObservacoes(""); setVendedorId("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-orange-500" />
            Abrir Chamado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <User className="h-3.5 w-3.5" /> Nome do Cliente *
            </label>
            <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Phone className="h-3.5 w-3.5" /> Telefone
            </label>
            <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Car className="h-3.5 w-3.5" /> Carro (modelo) *
            </label>
            <Input value={carroModelo} onChange={(e) => setCarroModelo(e.target.value)} placeholder="Ex: Onix 2022" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Car className="h-3.5 w-3.5" /> Placa
            </label>
            <Input value={carroPlaca} onChange={(e) => setCarroPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" className="font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <FileText className="h-3.5 w-3.5" /> Problema Relatado *
            </label>
            <Textarea value={problemaRelatado} onChange={(e) => setProblemaRelatado(e.target.value)} placeholder="Ex: barulho na suspensão dianteira" rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <FileText className="h-3.5 w-3.5" /> Observações
            </label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Anotações extras..." rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Vendedor que abriu</label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger><SelectValue placeholder="Selecionar vendedor" /></SelectTrigger>
              <SelectContent>
                {(sellers || []).filter((s: any) => s.active && (s.department === "vendas" || !s.department)).map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.nickname || s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            disabled={!clienteNome || !carroModelo || !problemaRelatado || !vendedorId || createMutation.isPending}
            onClick={() => createMutation.mutate({
              clienteNome, clienteTelefone, carroModelo, carroPlaca,
              problemaRelatado, observacoes, vendedorId: Number(vendedorId),
            })}
          >
            {createMutation.isPending ? "Salvando..." : "Salvar Atendimento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== MODAL: DETALHE DO CHAMADO =====
function DetalheChamadoModal({ open, onClose, chamado, sellers, oficinas, onUpdate }: any) {
  const [tab, setTab] = useState<"info" | "gastos" | "orcamentos" | "historico">("info");
  const orcamentosQuery = trpc.pvOrcamentos.list.useQuery({ chamadoId: chamado.id });
  const orcamentos = orcamentosQuery.data || [];
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const gastosQuery = trpc.pvGastos.list.useQuery({ chamadoId: chamado.id });
  const historicoQuery = trpc.pvChamados.historico.useQuery({ chamadoId: chamado.id });
  const updateMutation = trpc.pvChamados.update.useMutation({
    onSuccess: () => { toast.success("Chamado atualizado!"); onUpdate(); setEditing(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.pvChamados.delete.useMutation({
    onSuccess: () => { toast.success("Chamado excluído!"); onUpdate(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const gastos = gastosQuery.data || [];
  const historico = historicoQuery.data || [];
  const cfg = STATUS_CONFIG[chamado.status] || STATUS_CONFIG.aberto;
  const vendedor = sellers.find((s: any) => s.id === chamado.vendedorId);
  const totalGastos = gastos.reduce((sum: number, g: any) => sum + parseFloat(g.valor || "0"), 0);
  const totalAutorizado = gastos.filter((g: any) => g.statusAprovacao === "autorizado" || g.statusAprovacao === "pago").reduce((sum: number, g: any) => sum + parseFloat(g.valor || "0"), 0);

  function handleStatusChange(newStatus: string) {
    const data: any = { id: chamado.id, status: newStatus };
    if (newStatus === "entregue") data.dataEntregaReal = Date.now();
    if (newStatus === "em_servico" && !chamado.dataEntradaReal) data.dataEntradaReal = Date.now();
    updateMutation.mutate(data);
  }

  function handleSaveEdit() {
    updateMutation.mutate({ id: chamado.id, ...editData });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{chamado.ticketNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-1">
          {[
            { key: "info", label: "Detalhes", icon: FileText },
            { key: "orcamentos", label: `Orçamentos (${orcamentos.length})`, icon: FileText },
            { key: "gastos", label: `Gastos (${gastos.length})`, icon: DollarSign },
            { key: "historico", label: "Histórico", icon: History },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-t-lg transition-colors ${
                tab === t.key ? "bg-orange-500/10 text-orange-400 font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === "info" && (
          <div className="space-y-4">
            {!editing ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow icon={User} label="Cliente" value={chamado.clienteNome} />
                  <InfoRow icon={Phone} label="Telefone" value={chamado.clienteTelefone} />
                  <InfoRow icon={Car} label="Carro" value={chamado.carroModelo} />
                  <InfoRow icon={Car} label="Placa" value={chamado.carroPlaca} mono />
                  <div className="col-span-2">
                    <InfoRow icon={FileText} label="Problema" value={chamado.problemaRelatado} />
                  </div>
                  {chamado.observacoes && (
                    <div className="col-span-2">
                      <InfoRow icon={FileText} label="Observações" value={chamado.observacoes} />
                    </div>
                  )}
                  <InfoRow icon={User} label="Vendedor" value={vendedor?.nickname || vendedor?.name || "—"} />
                  <InfoRow icon={User} label="Responsável PV" value={(() => {
                    if (!chamado.responsavelPvId) return "—";
                    const r = sellers.find((s: any) => s.id === chamado.responsavelPvId);
                    return r ? (r.nickname || r.name) : `ID ${chamado.responsavelPvId}`;
                  })()} />
                  <InfoRow icon={Building2} label="Oficina" value={chamado.oficinaNome || "—"} />
                  <InfoRow icon={Calendar} label="Entrada Agendada" value={formatDate(chamado.dataEntradaAgendada)} />
                  <InfoRow icon={Calendar} label="Entrada Real" value={formatDate(chamado.dataEntradaReal)} />
                  <InfoRow icon={Calendar} label="Prazo Entrega" value={formatDate(chamado.prazoEntrega)} />
                  <InfoRow icon={Calendar} label="Entrega Real" value={formatDate(chamado.dataEntregaReal)} />
                </div>

                {/* Botões WhatsApp e Ligação */}
                {chamado.clienteTelefone && (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`https://wa.me/55${chamado.clienteTelefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${chamado.clienteTelefone}`}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Ligar
                    </a>
                  </div>
                )}

                {/* Serviço Realizado / O que está sendo feito */}
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                  <p className="text-xs text-orange-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> O que está sendo feito
                  </p>
                  {chamado.servicoRealizado ? (
                    <p className="text-sm">{chamado.servicoRealizado}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhuma anotação ainda.</p>
                  )}
                </div>

                {/* Gasto total do carro */}
                <Card className="border-orange-500/30 bg-orange-500/5">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Gasto total neste veículo</span>
                    <span className="text-lg font-bold text-orange-400">{formatCurrency(totalGastos)}</span>
                  </CardContent>
                </Card>

                {/* Ações de status */}
                <div className="flex flex-wrap gap-2">
                  {chamado.status === "aberto" && (
                    <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-400" onClick={() => handleStatusChange("agendado")}>
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Agendar
                    </Button>
                  )}
                  {(chamado.status === "aberto" || chamado.status === "agendado") && (
                    <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-400" onClick={() => handleStatusChange("em_servico")}>
                      <Wrench className="h-3.5 w-3.5 mr-1" /> Em Serviço
                    </Button>
                  )}
                  {chamado.status === "em_servico" && (
                    <Button size="sm" variant="outline" className="border-green-500/50 text-green-400" onClick={() => handleStatusChange("finalizado")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Finalizar
                    </Button>
                  )}
                  {chamado.status === "finalizado" && (
                    <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-400" onClick={() => handleStatusChange("entregue")}>
                      <Truck className="h-3.5 w-3.5 mr-1" /> Entregar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setEditing(true); setEditData({}); }}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400" onClick={() => {
                    if (confirm("Excluir este chamado?")) deleteMutation.mutate({ id: chamado.id });
                  }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                  </Button>
                </div>
              </>
            ) : (
              <EditChamadoForm
                chamado={chamado}
                oficinas={oficinas}
                sellers={sellers}
                editData={editData}
                setEditData={setEditData}
                onSave={handleSaveEdit}
                onCancel={() => setEditing(false)}
                isPending={updateMutation.isPending}
              />
            )}
          </div>
        )}

        {/* Tab: Orçamentos */}
        {tab === "orcamentos" && (
          <AdminOrcamentosTab chamadoId={chamado.id} orcamentos={orcamentos} onRefresh={() => orcamentosQuery.refetch()} />
        )}

        {/* Tab: Gastos */}
        {tab === "gastos" && (
          <GastosTab chamadoId={chamado.id} gastos={gastos} onRefresh={() => gastosQuery.refetch()} />
        )}

        {/* Tab: Histórico */}
        {tab === "historico" && (
          <div className="space-y-2">
            {historico.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>}
            {historico.map((h: any) => (
              <div key={h.id} className="flex items-start gap-2 text-sm border-l-2 border-orange-500/30 pl-3 py-1">
                <div>
                  <p className="text-foreground">{h.descricao}</p>
                  <p className="text-xs text-muted-foreground">{h.usuario} - {new Date(h.createdAt).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</span>
      <span className={`font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

// ===== FORM: Editar Chamado =====
function EditChamadoForm({ chamado, oficinas, sellers, editData, setEditData, onSave, onCancel, isPending }: any) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Cliente</label>
          <Input defaultValue={chamado.clienteNome} onChange={(e) => setEditData((d: any) => ({ ...d, clienteNome: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Telefone</label>
          <Input defaultValue={chamado.clienteTelefone} onChange={(e) => setEditData((d: any) => ({ ...d, clienteTelefone: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Carro</label>
          <Input defaultValue={chamado.carroModelo} onChange={(e) => setEditData((d: any) => ({ ...d, carroModelo: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Placa</label>
          <Input defaultValue={chamado.carroPlaca} onChange={(e) => setEditData((d: any) => ({ ...d, carroPlaca: e.target.value.toUpperCase() }))} className="font-mono" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Problema</label>
        <Textarea defaultValue={chamado.problemaRelatado} onChange={(e) => setEditData((d: any) => ({ ...d, problemaRelatado: e.target.value }))} rows={2} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Observações</label>
        <Textarea defaultValue={chamado.observacoes} onChange={(e) => setEditData((d: any) => ({ ...d, observacoes: e.target.value }))} rows={2} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3 text-orange-400" /> O que está sendo feito (Serviço)</label>
        <Textarea defaultValue={chamado.servicoRealizado} onChange={(e) => setEditData((d: any) => ({ ...d, servicoRealizado: e.target.value }))} rows={2} placeholder="Descreva o que está sendo feito no veículo..." />
      </div>
      <OficinaCombobox
        oficinas={oficinas}
        selectedId={editData.oficinaId ?? chamado.oficinaId}
        onSelect={(id, name) => setEditData((d: any) => ({ ...d, oficinaId: id, oficinaNome: name }))}
      />
      <div>
        <label className="text-xs text-muted-foreground">Status</label>
        <Select defaultValue={chamado.status} onValueChange={(v) => setEditData((d: any) => ({ ...d, status: v }))}>
          <SelectTrigger><SelectValue placeholder="Selecionar status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="em_servico">Em Serviço</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Data Entrada Agendada</label>
          <Input type="date" defaultValue={chamado.dataEntradaAgendada ? new Date(chamado.dataEntradaAgendada).toISOString().split("T")[0] : ""} onChange={(e) => setEditData((d: any) => ({ ...d, dataEntradaAgendada: e.target.value ? new Date(e.target.value).getTime() : undefined }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Prazo Entrega</label>
          <Input type="date" defaultValue={chamado.prazoEntrega ? new Date(chamado.prazoEntrega).toISOString().split("T")[0] : ""} onChange={(e) => setEditData((d: any) => ({ ...d, prazoEntrega: e.target.value ? new Date(e.target.value).getTime() : undefined }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={isPending} className="bg-orange-600 hover:bg-orange-700 flex-1">
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ===== TAB: GASTOS =====
function GastosTab({ chamadoId, gastos, onRefresh }: { chamadoId: number; gastos: any[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const createMutation = trpc.pvGastos.create.useMutation({
    onSuccess: () => { toast.success("Gasto registrado!"); onRefresh(); setShowAdd(false); setDescricao(""); setValor(""); setFotoFile(null); },
    onError: (err) => toast.error(err.message),
  });
  const uploadMutation = trpc.pvGastos.uploadNota.useMutation();
  const statusMutation = trpc.pvGastos.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  async function handleAddGasto() {
    let fotoNotaUrl: string | undefined;
    let fotoNotaKey: string | undefined;
    if (fotoFile) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(fotoFile);
      });
      const result = await uploadMutation.mutateAsync({ fileName: fotoFile.name, fileBase64: base64, contentType: fotoFile.type });
      fotoNotaUrl = result.url;
      fotoNotaKey = result.key;
    }
    createMutation.mutate({ chamadoId, descricao, valor, fotoNotaUrl, fotoNotaKey });
  }

  const totalGeral = gastos.reduce((s: number, g: any) => s + parseFloat(g.valor || "0"), 0);

  const STATUS_GASTO: Record<string, { label: string; color: string }> = {
    pendente: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/10" },
    autorizado: { label: "Autorizado", color: "text-green-400 bg-green-500/10" },
    recusado: { label: "Recusado", color: "text-red-400 bg-red-500/10" },
    pago: { label: "Pago", color: "text-emerald-400 bg-emerald-500/10" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total: <span className="text-orange-400 font-bold">{formatCurrency(totalGeral)}</span></span>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo Gasto
        </Button>
      </div>

      {showAdd && (
        <Card className="border-orange-500/30">
          <CardContent className="p-3 space-y-2">
            <Input placeholder="Descrição (ex: troca amortecedor)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <Input placeholder="Ex: 1.500,00" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={() => { if (valor.trim()) setValor(formatCurrencyPV(valor)); }} />
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <ImagePlus className="h-3 w-3" /> Foto da nota (opcional)
              </label>
              <Input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files?.[0] || null)} />
            </div>
            <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700" disabled={!descricao || !valor || createMutation.isPending || uploadMutation.isPending} onClick={handleAddGasto}>
              {createMutation.isPending || uploadMutation.isPending ? "Salvando..." : "Registrar Gasto"}
            </Button>
          </CardContent>
        </Card>
      )}

      {gastos.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum gasto registrado</p>
      )}

      {gastos.map((g: any) => {
        const st = STATUS_GASTO[g.statusAprovacao] || STATUS_GASTO.pendente;
        return (
          <Card key={g.id} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{g.descricao}</p>
                  <p className="text-lg font-bold text-orange-400">{formatCurrency(g.valor)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  {g.autorizadoPor && <span className="text-xs text-muted-foreground ml-2">por {g.autorizadoPor}</span>}
                  {g.fotoNotaUrl && (
                    <a href={g.fotoNotaUrl} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:underline ml-2">Ver nota</a>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {g.statusAprovacao === "pendente" && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs border-green-500/50 text-green-400 h-7" onClick={() => statusMutation.mutate({ id: g.id, statusAprovacao: "autorizado" })}>
                        Autorizar
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-red-500/50 text-red-400 h-7" onClick={() => statusMutation.mutate({ id: g.id, statusAprovacao: "recusado" })}>
                        Recusar
                      </Button>
                    </>
                  )}
                  {g.statusAprovacao === "autorizado" && (
                    <Button size="sm" variant="outline" className="text-xs border-emerald-500/50 text-emerald-400 h-7" onClick={() => statusMutation.mutate({ id: g.id, statusAprovacao: "pago" })}>
                      Marcar Pago
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


// ===== TAB: ORÇAMENTOS (dentro do detalhe do chamado) =====
function AdminOrcamentosTab({ chamadoId, orcamentos, onRefresh }: { chamadoId: number; orcamentos: any[]; onRefresh: () => void }) {
  const [expandedOrc, setExpandedOrc] = useState<number | null>(null);
  const updateStatusMutation = trpc.pvOrcamentos.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); onRefresh(); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.pvOrcamentos.delete.useMutation({
    onSuccess: () => { toast.success("Orçamento excluído!"); onRefresh(); },
    onError: (err: any) => toast.error(err.message),
  });
  const [motivoReprovacao, setMotivoReprovacao] = useState("");
  const [showMotivoFor, setShowMotivoFor] = useState<number | null>(null);

  const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    pendente: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pendente" },
    aprovado: { bg: "bg-green-500/10", text: "text-green-400", label: "Aprovado" },
    reprovado: { bg: "bg-red-500/10", text: "text-red-400", label: "Reprovado" },
    pago: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Pago" },
  };

  const totalGeral = orcamentos.reduce((s: number, o: any) => s + parseFloat(o.valorTotal || "0"), 0);
  const totalAprovado = orcamentos.filter((o: any) => o.statusAprovacao === "aprovado" || o.statusAprovacao === "pago").reduce((s: number, o: any) => s + parseFloat(o.valorTotal || "0"), 0);

  if (orcamentos.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhum orçamento lançado</p>;
  }

  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total Orçado</p>
            <p className="text-sm font-bold text-purple-400">{formatCurrency(totalGeral)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total Aprovado</p>
            <p className="text-sm font-bold text-green-400">{formatCurrency(totalAprovado)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de orçamentos */}
      {orcamentos.map((orc: any) => {
        const st = STATUS_COLORS[orc.statusAprovacao] || STATUS_COLORS.pendente;
        const isExpanded = expandedOrc === orc.id;
        return (
          <Card key={orc.id} className={`border-${orc.statusAprovacao === 'pendente' ? 'yellow' : orc.statusAprovacao === 'aprovado' ? 'green' : orc.statusAprovacao === 'reprovado' ? 'red' : 'emerald'}-500/30`}>
            <CardContent className="p-3">
              <button onClick={() => setExpandedOrc(isExpanded ? null : orc.id)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{orc.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(orc.valorTotal)} · {orc.criadoPor} · {formatDate(orc.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.bg} ${st.text} ml-2`}>
                    {st.label}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {orc.descricao && <p className="text-xs text-muted-foreground">{orc.descricao}</p>}

                  {/* Foto do orçamento */}
                  {orc.fotoUrl && (
                    <a href={orc.fotoUrl} target="_blank" rel="noopener noreferrer">
                      <img src={orc.fotoUrl} alt="Orçamento" className="rounded-lg max-h-48 object-contain border border-border hover:border-purple-500 transition-all" />
                      <p className="text-[10px] text-purple-400 mt-1">Clique para ampliar</p>
                    </a>
                  )}

                  {/* Itens do orçamento */}
                  <OrcamentoItensView orcamentoId={orc.id} />

                  {/* Ações de aprovação */}
                  {orc.statusAprovacao === "pendente" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-500 flex-1" onClick={() => {
                        updateStatusMutation.mutate({ id: orc.id, statusAprovacao: "aprovado" });
                      }}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 flex-1" onClick={() => {
                        setShowMotivoFor(orc.id);
                      }}>
                        <X className="h-3.5 w-3.5 mr-1" /> Reprovar
                      </Button>
                    </div>
                  )}

                  {orc.statusAprovacao === "aprovado" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 w-full" onClick={() => {
                      updateStatusMutation.mutate({ id: orc.id, statusAprovacao: "pago" });
                    }}>
                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Marcar como Pago
                    </Button>
                  )}

                  {/* Modal de motivo de reprovação */}
                  {showMotivoFor === orc.id && (
                    <div className="space-y-2 bg-red-500/5 border border-red-500/30 rounded-lg p-3">
                      <p className="text-xs text-red-400 font-bold">Motivo da Reprovação</p>
                      <Textarea
                        value={motivoReprovacao}
                        onChange={(e) => setMotivoReprovacao(e.target.value)}
                        placeholder="Descreva o motivo..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-red-600 hover:bg-red-500 flex-1" onClick={() => {
                          updateStatusMutation.mutate({
                            id: orc.id,
                            statusAprovacao: "reprovado",
                            motivoReprovacao: motivoReprovacao || undefined,
                          });
                          setShowMotivoFor(null);
                          setMotivoReprovacao("");
                        }}>
                          Confirmar Reprovação
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowMotivoFor(null); setMotivoReprovacao(""); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Info de aprovação */}
                  {orc.aprovadoPor && (
                    <p className="text-[10px] text-muted-foreground">
                      {orc.statusAprovacao === 'aprovado' ? 'Aprovado' : orc.statusAprovacao === 'reprovado' ? 'Reprovado' : 'Pago'} por {orc.aprovadoPor}
                      {orc.aprovadoEm && ` em ${new Date(orc.aprovadoEm).toLocaleDateString('pt-BR')}`}
                    </p>
                  )}
                  {orc.motivoReprovacao && (
                    <p className="text-[10px] text-red-400 italic">Motivo: {orc.motivoReprovacao}</p>
                  )}

                  {/* Excluir */}
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 w-full" onClick={() => {
                    if (confirm("Excluir este orçamento e todos os itens?")) deleteMutation.mutate({ id: orc.id });
                  }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir Orçamento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ===== COMPONENTE: Itens do orçamento (view) =====
function OrcamentoItensView({ orcamentoId }: { orcamentoId: number }) {
  const itensQuery = trpc.pvOrcamentos.itens.useQuery({ orcamentoId });
  const itens = itensQuery.data || [];

  if (itens.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase font-bold">Itens</p>
      {itens.map((item: any) => (
        <div key={item.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            item.tipo === 'peca' ? 'bg-blue-500/20 text-blue-400' :
            item.tipo === 'servico' ? 'bg-orange-500/20 text-orange-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {item.tipo === 'peca' ? 'PEÇA' : item.tipo === 'servico' ? 'SERVIÇO' : 'OUTRO'}
          </span>
          <span className="flex-1 truncate">{item.descricao}</span>
          <span className="text-muted-foreground">{item.quantidade}x</span>
          <span className="text-green-400 font-mono">{formatCurrency(item.valorTotal)}</span>
        </div>
      ))}
    </div>
  );
}


// ===== OFICINA COMBOBOX WITH SEARCH + QUICK ADD =====
function OficinaCombobox({ oficinas, selectedId, onSelect }: { oficinas: any[]; selectedId?: number; onSelect: (id: number, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const utils = trpc.useUtils();
  const createMutation = trpc.pvOficinas.create.useMutation({
    onSuccess: (data) => {
      toast.success("Oficina cadastrada!");
      utils.pvOficinas.list.invalidate();
      onSelect(data.id, newName);
      setShowQuickAdd(false);
      setNewName("");
      setNewPhone("");
    },
    onError: (err) => toast.error(err.message),
  });

  const selected = oficinas.find((o: any) => o.id === selectedId);

  return (
    <div>
      <label className="text-xs text-muted-foreground">Oficina</label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between font-normal">
              {selected ? selected.name : "Selecionar oficina..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar oficina..." />
              <CommandList>
                <CommandEmpty>Nenhuma oficina encontrada.</CommandEmpty>
                <CommandGroup>
                  {oficinas.map((o: any) => (
                    <CommandItem
                      key={o.id}
                      value={o.name}
                      onSelect={() => {
                        onSelect(o.id, o.name);
                        setOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${selectedId === o.id ? "opacity-100" : "opacity-0"}`} />
                      <div className="flex-1">
                        <span>{o.name}</span>
                        {o.phone && <span className="ml-2 text-xs text-muted-foreground">{o.phone}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setShowQuickAdd(true)} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cadastrar nova oficina</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Quick Add Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Cadastro Rápido de Oficina
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da oficina" />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input value={newPhone} onChange={(e) => setNewPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
            </div>
            <Button
              onClick={() => createMutation.mutate({ name: newName, phone: newPhone || undefined })}
              disabled={!newName.trim() || createMutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {createMutation.isPending ? "Cadastrando..." : "Cadastrar e Selecionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
