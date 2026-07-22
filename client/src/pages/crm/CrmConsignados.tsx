import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Car, Calendar, User, Phone, GripVertical, Search, MessageCircle,
  Package, Handshake, CheckCircle2, RotateCcw, Clock, MapPin, CircleDot, Filter, Users, Lock
} from "lucide-react";

// CRM Status columns configuration
const CRM_COLUMNS = [
  { key: "cadastro", label: "Cadastro", color: "#f59e0b", icon: Package, description: "Aguardando aprovação" },
  { key: "em_estoque", label: "Em Estoque", color: "#3b82f6", icon: MapPin, description: "No pátio" },
  { key: "em_negociacao", label: "Em Negociação", color: "#8b5cf6", icon: Handshake, description: "Em tratativa" },
  { key: "vendido", label: "Vendido", color: "#10b981", icon: CheckCircle2, description: "Venda concluída" },
  { key: "devolvido", label: "Devolvido", color: "#6b7280", icon: RotateCcw, description: "Devolvido ao dono" },
] as const;

type CrmStatus = typeof CRM_COLUMNS[number]["key"];

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR");
}

function daysInYard(entryDate: number, exitDate?: number | null): number {
  const end = exitDate || Date.now();
  return Math.floor((end - entryDate) / (1000 * 60 * 60 * 24));
}

// ===== DRAGGABLE CARD =====
function openWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  window.open(`https://wa.me/${number}`, "_blank");
}

function DraggableCard({ record, onClick, canDrag = true, getSellerName }: { record: any; onClick: () => void; canDrag?: boolean; getSellerName?: (id: number) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(record.id),
    data: { record },
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : (canDrag ? 1 : 0.65),
    touchAction: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-3 transition-all ${
        canDrag
          ? 'border-border bg-card hover:border-primary/30 cursor-grab active:cursor-grabbing'
          : 'border-border/50 bg-card/60 cursor-default'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          className={`mt-1 text-muted-foreground ${canDrag ? 'cursor-grab active:cursor-grabbing hover:text-foreground' : 'cursor-not-allowed'}`}
        >
          {canDrag ? (
            <GripVertical className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate">
                {record.vehiclePlate || "Sem placa"}
              </h4>
              {record.isValid && (
                <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-green-500/20 text-green-500 border-green-500/30 shrink-0">
                  7d+
                </Badge>
              )}
              {record.hasAuction && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">
                  Leilão
                </Badge>
              )}
              {!canDrag && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground shrink-0">
                  <Lock className="w-2.5 h-2.5 mr-0.5" /> Bloqueado
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {daysInYard(record.entryDate, record.exitDate)}d
            </span>
          </div>
          <div className="space-y-1">
            {record.vehicleModel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Car className="w-3 h-3 shrink-0" /> {record.vehicleModel}
              </p>
            )}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {record.consignorName && (
                <span className="flex items-center gap-0.5 truncate">
                  <User className="w-3 h-3 shrink-0" /> {record.consignorName}
                </span>
              )}
              {record.costValue && (
                <span className="ml-auto font-medium text-foreground text-xs shrink-0">
                  {formatCurrency(record.costValue)}
                </span>
              )}
            </div>
            {/* Seller name badge */}
            {getSellerName && (
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">
                  <Users className="w-2.5 h-2.5 mr-0.5" />
                  {getSellerName(record.sellerId)}
                </Badge>
              </div>
            )}
            {(record.ownerPhone || record.consignorPhone) && (
              <button
                onClick={(e) => { e.stopPropagation(); openWhatsApp(record.ownerPhone || record.consignorPhone); }}
                className="mt-1 flex items-center gap-1 text-[10px] text-green-500 hover:text-green-400 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== DROPPABLE COLUMN =====
function DroppableColumn({
  column,
  records,
  onCardClick,
  canDragRecord,
  getSellerName,
}: {
  column: typeof CRM_COLUMNS[number];
  records: any[];
  onCardClick: (r: any) => void;
  canDragRecord?: (record: any) => boolean;
  getSellerName?: (id: number) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] lg:w-[280px] xl:w-[300px] rounded-xl border transition-all ${
        isOver
          ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-accent/20"
      }`}
    >
      {/* Column header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: column.color + "22" }}
          >
            <column.icon className="w-4 h-4" style={{ color: column.color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{column.label}</h3>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 h-5"
                style={{ backgroundColor: column.color + "22", color: column.color }}
              >
                {records.length}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">{column.description}</p>
          </div>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-220px)]">
        <div className="p-2 space-y-2">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CircleDot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Arraste veículos aqui</p>
            </div>
          ) : (
            records.map((record) => (
              <DraggableCard
                key={record.id}
                record={record}
                onClick={() => onCardClick(record)}
                canDrag={canDragRecord ? canDragRecord(record) : true}
                getSellerName={getSellerName}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===== OVERLAY CARD (shown while dragging) =====
function OverlayCard({ record }: { record: any }) {
  return (
    <div className="rounded-xl border-2 border-primary bg-card p-3 shadow-2xl shadow-primary/20 w-[260px]">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground truncate">{record.vehiclePlate || "Sem placa"}</h4>
          {record.vehicleModel && (
            <p className="text-xs text-muted-foreground truncate">{record.vehicleModel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function CrmConsignados() {
  const goBack = useGoBack("/minha-area");
  const { user } = useAuth();
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeller, setFilterSeller] = useState<string>("all");

  // Determine if current user is admin/gerente
  const isAdmin = user?.role === 'admin' || (user as any)?.actorType === 'oauth' || (user as any)?.actorType === 'crm_admin';
  const isGerente = (user as any)?.sellerRole === 'gerente';
  const canMoveAny = isAdmin || isGerente;
  const currentSellerId = (user as any)?.actorType === 'seller' ? (user as any)?.id : null;

  // Load sellers list for filter and card display
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });

  const { data: records, isLoading, refetch } = trpc.consignment.listForCrm.useQuery();
  const { data: detail, isLoading: loadingDetail } = trpc.consignment.getDetail.useQuery(
    { id: selectedRecord?.id || 0 },
    { enabled: !!selectedRecord }
  );

  const moveCrmStatus = trpc.consignment.moveCrmStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Check if current user can drag a specific record
  const canDragRecord = (record: any) => {
    if (canMoveAny) return true;
    return record.sellerId === currentSellerId;
  };

  // Get seller name by ID
  const getSellerName = (sellerId: number) => {
    if (!sellers) return `#${sellerId}`;
    const seller = sellers.find((s: any) => s.id === sellerId);
    return seller?.nickname || seller?.name || `#${sellerId}`;
  };

  // Filter records by search query and seller filter
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    let filtered = records as any[];
    // Seller filter
    if (filterSeller !== "all") {
      const sid = Number(filterSeller);
      filtered = filtered.filter((r: any) => r.sellerId === sid);
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r: any) =>
        (r.vehiclePlate && r.vehiclePlate.toLowerCase().includes(q)) ||
        (r.consignorName && r.consignorName.toLowerCase().includes(q)) ||
        (r.vehicleModel && r.vehicleModel.toLowerCase().includes(q)) ||
        (r.ownerName && r.ownerName.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [records, searchQuery, filterSeller]);

  // Group records by crmStatus
  const recordsByStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of CRM_COLUMNS) map[col.key] = [];
    for (const r of filteredRecords) {
      const status = (r.crmStatus || "cadastro") as string;
      if (map[status]) map[status].push(r);
      else map["cadastro"].push(r);
    }
    return map;
  }, [filteredRecords]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const record = (event.active.data.current as any)?.record;
    setActiveRecord(record || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveRecord(null);
    const { active, over } = event;
    if (!over) return;

    const record = (active.data.current as any)?.record;
    if (!record) return;

    const newStatus = over.id as string;
    const currentStatus = (record.crmStatus || "cadastro") as string;

    // Only move if dropped on a different column
    if (newStatus !== currentStatus && CRM_COLUMNS.some(c => c.key === newStatus)) {
      const targetCol = CRM_COLUMNS.find(c => c.key === newStatus);
      toast.success(`Movido para "${targetCol?.label || newStatus}"`, {
        description: `${record.vehiclePlate || "Veículo"} atualizado com sucesso`,
      });
      moveCrmStatus.mutate({ id: record.id, crmStatus: newStatus as CrmStatus });
    }
  };

  const openDetail = (record: any) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-1.5 hover:bg-accent rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                CRM Consignados
              </h1>
              <p className="text-xs text-muted-foreground">
                Arraste os veículos entre as etapas do processo
              </p>
            </div>
          </div>
          <Badge variant="secondary">{records?.length || 0} veículos</Badge>
        </div>
        {/* Filters */}
        <div className="px-4 pb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por placa, cliente ou modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/60"
            />
          </div>
          {canMoveAny && sellers && sellers.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Vendedor:</span>
              <Select value={filterSeller} onValueChange={setFilterSeller}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Todos
                    </span>
                  </SelectItem>
                  {sellers.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nickname || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {CRM_COLUMNS.map((col) => (
              <DroppableColumn
                key={col.key}
                column={col}
                records={recordsByStatus[col.key] || []}
                onCardClick={openDetail}
                canDragRecord={canDragRecord}
                getSellerName={getSellerName}
              />
            ))}
          </div>

          <DragOverlay>
            {activeRecord ? <OverlayCard record={activeRecord} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              {detail?.vehiclePlate || selectedRecord?.vehiclePlate || "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {/* Vehicle info */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Veículo</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Placa</span>
                      <p className="font-medium">{detail.vehiclePlate || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Modelo</span>
                      <p className="font-medium">{detail.vehicleModel || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Status Veículo</span>
                      <p className="font-medium capitalize">{detail.vehicleStatus || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Leilão</span>
                      <p className="font-medium">{detail.hasAuction ? "Sim" : "Não"}</p>
                    </div>
                  </div>
                </div>

                {/* Consignor info */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Consignador</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Nome</span>
                      <p className="font-medium">{detail.consignorName || detail.ownerName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">CPF/CNPJ</span>
                      <p className="font-medium">{detail.consignorCpf || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Telefone</span>
                      <p className="font-medium">{detail.consignorPhone || detail.ownerPhone || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Email</span>
                      <p className="font-medium">{detail.consignorEmail || "—"}</p>
                    </div>
                  </div>
                  {detail.consignorAddress && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground text-xs">Endereço</span>
                      <p className="font-medium">{detail.consignorAddress}</p>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Datas</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Entrada</span>
                      <p className="font-medium">{formatDate(detail.entryDate)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Saída</span>
                      <p className="font-medium">{formatDate(detail.exitDate)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Dias no Pátio</span>
                      <p className="font-medium">{daysInYard(detail.entryDate, detail.exitDate)} dias</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Válido (7d+)</span>
                      <p className="font-medium">{detail.isValid ? "✅ Sim" : "⏳ Não"}</p>
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Financeiro</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Valor de Custo</span>
                      <p className="font-medium">{formatCurrency(detail.costValue)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Valor Quitação</span>
                      <p className="font-medium">{formatCurrency(detail.payoffValue)}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Status</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Aprovação</span>
                      <Badge variant={detail.status === "approved" ? "default" : detail.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                        {detail.status === "approved" ? "Aprovado" : detail.status === "rejected" ? "Rejeitado" : "Pendente"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">CRM</span>
                      <Badge className="text-[10px]" style={{
                        backgroundColor: (CRM_COLUMNS.find(c => c.key === detail.crmStatus)?.color || "#6b7280") + "22",
                        color: CRM_COLUMNS.find(c => c.key === detail.crmStatus)?.color || "#6b7280",
                        borderColor: (CRM_COLUMNS.find(c => c.key === detail.crmStatus)?.color || "#6b7280") + "44",
                      }}>
                        {CRM_COLUMNS.find(c => c.key === detail.crmStatus)?.label || detail.crmStatus}
                      </Badge>
                    </div>
                    {detail.exitReason && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Motivo Saída</span>
                        <p className="font-medium">{detail.exitReason}</p>
                      </div>
                    )}
                    {detail.soldVia && (
                      <div>
                        <span className="text-muted-foreground text-xs">Vendido via</span>
                        <p className="font-medium capitalize">{detail.soldVia}</p>
                      </div>
                    )}
                    {detail.soldAt && (
                      <div>
                        <span className="text-muted-foreground text-xs">Data Venda</span>
                        <p className="font-medium">{formatDate(detail.soldAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {detail.notes && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Observações</h4>
                    <p className="text-sm text-foreground bg-accent/30 rounded-lg p-2">{detail.notes}</p>
                  </div>
                )}

                {/* Rejection reason */}
                {detail.rejectionReason && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 text-red-500">Motivo Rejeição</h4>
                    <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-2">{detail.rejectionReason}</p>
                  </div>
                )}

                {/* Move actions in detail */}
                <div className="pt-2 border-t border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Mover para</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {CRM_COLUMNS.map((col) => {
                      const isCurrent = col.key === (detail.crmStatus || "cadastro");
                      return (
                        <Button
                          key={col.key}
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          disabled={isCurrent}
                          className="text-xs h-7"
                          onClick={() => {
                            moveCrmStatus.mutate({ id: detail.id, crmStatus: col.key });
                            setDetailOpen(false);
                          }}
                        >
                          {col.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Registro não encontrado</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
