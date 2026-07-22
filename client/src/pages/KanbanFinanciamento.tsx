import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
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
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock, CreditCard, User, Car, Phone, CheckCircle2,
  XCircle, AlertCircle, CircleDot, Timer, GripVertical, Building2
} from "lucide-react";

// ===== STATUS COLUMNS =====
const KANBAN_COLUMNS = [
  { key: "na_fila", label: "Na Fila", color: "#f59e0b", icon: Clock, description: "Aguardando análise" },
  { key: "em_analise", label: "Em Análise", color: "#3b82f6", icon: Timer, description: "F&I analisando" },
  { key: "parcial", label: "Parcial", color: "#f97316", icon: AlertCircle, description: "Aprovação parcial" },
  { key: "aprovado", label: "Aprovado", color: "#10b981", icon: CheckCircle2, description: "Crédito aprovado" },
  { key: "recusado", label: "Recusado", color: "#ef4444", icon: XCircle, description: "Crédito recusado" },
] as const;

type KanbanStatus = typeof KANBAN_COLUMNS[number]["key"];

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(val: string | number | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "number" ? new Date(val) : new Date(val);
  return d.toLocaleDateString("pt-BR");
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ===== DRAGGABLE CARD =====
function DraggableCard({ record, onClick }: { record: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(record.id),
    data: { record },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-foreground truncate">{record.nomeCompleto}</h4>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {timeAgo(record.createdAt)}
            </span>
          </div>
          <div className="space-y-1">
            {record.veiculo && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Car className="w-3 h-3 shrink-0" /> {record.veiculo}
                {record.placa && <span className="font-mono text-[10px] bg-accent/50 px-1 rounded">{record.placa}</span>}
              </p>
            )}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <User className="w-3 h-3" /> {record.sellerName}
              </span>
              {record.valorFinanciado && (
                <span className="ml-auto font-medium text-foreground text-xs">
                  {formatCurrency(record.valorFinanciado)}
                </span>
              )}
            </div>
            {record.feiResponsavelNome && (
              <p className="text-[10px] text-blue-400 flex items-center gap-0.5">
                <Building2 className="w-3 h-3" /> {record.feiResponsavelNome}
              </p>
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
}: {
  column: typeof KANBAN_COLUMNS[number];
  records: any[];
  onCardClick: (r: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-[280px] lg:w-[300px] xl:w-[320px] rounded-xl border transition-all ${
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
      <ScrollArea className="flex-1 max-h-[calc(100vh-260px)]">
        <div className="p-2 space-y-2">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CircleDot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Arraste fichas aqui</p>
            </div>
          ) : (
            records.map((record) => (
              <DraggableCard
                key={record.id}
                record={record}
                onClick={() => onCardClick(record)}
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
    <div className="rounded-xl border-2 border-primary bg-card p-3 shadow-2xl shadow-primary/20 w-[280px]">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground truncate">{record.nomeCompleto}</h4>
          {record.veiculo && (
            <p className="text-xs text-muted-foreground truncate">{record.veiculo}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function KanbanFinanciamento() {
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [detailRecord, setDetailRecord] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: fichas, isLoading, refetch } = trpc.fichas.listForKanban.useQuery();
  const { data: detail, isLoading: loadingDetail } = trpc.fichas.getById.useQuery(
    { id: detailRecord?.id || 0 },
    { enabled: !!detailRecord }
  );

  const moveStatus = trpc.fichas.moveKanbanStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Group by status
  const recordsByStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of KANBAN_COLUMNS) map[col.key] = [];
    if (fichas) {
      for (const f of fichas) {
        const status = f.status || "na_fila";
        if (map[status]) map[status].push(f);
        else map["na_fila"].push(f);
      }
    }
    return map;
  }, [fichas]);

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
    const currentStatus = record.status || "na_fila";

    // Only move if dropped on a different column
    if (newStatus !== currentStatus && KANBAN_COLUMNS.some(c => c.key === newStatus)) {
      moveStatus.mutate({ fichaId: record.id, newStatus: newStatus as any });
    }
  };

  const openDetail = (record: any) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Kanban Financiamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Arraste as fichas entre as etapas do processo de financiamento
          </p>
        </div>
        <Badge variant="secondary">{fichas?.length || 0} fichas</Badge>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {KANBAN_COLUMNS.map((col) => (
            <DroppableColumn
              key={col.key}
              column={col}
              records={recordsByStatus[col.key] || []}
              onCardClick={openDetail}
            />
          ))}
        </div>

        <DragOverlay>
          {activeRecord ? <OverlayCard record={activeRecord} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {detail?.nomeCompleto || detailRecord?.nomeCompleto || "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge style={{
                    backgroundColor: (KANBAN_COLUMNS.find(c => c.key === detail.status)?.color || "#6b7280") + "22",
                    color: KANBAN_COLUMNS.find(c => c.key === detail.status)?.color || "#6b7280",
                  }}>
                    {KANBAN_COLUMNS.find(c => c.key === detail.status)?.label || detail.status}
                  </Badge>
                </div>

                {/* Vehicle */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Veículo</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Veículo</span>
                      <p className="font-medium">{detail.veiculo || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Placa</span>
                      <p className="font-medium font-mono">{detail.placa || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Ano/Modelo</span>
                      <p className="font-medium">{detail.anoModelo || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Valor FIPE</span>
                      <p className="font-medium">{formatCurrency(detail.valorFipe)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Valor Financiado</span>
                      <p className="font-medium text-primary">{formatCurrency(detail.valorFinanciado)}</p>
                    </div>
                  </div>
                </div>

                {/* Client */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Cliente</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Nome</span>
                      <p className="font-medium">{detail.nomeCompleto}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">CPF</span>
                      <p className="font-medium">{detail.cpf}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Telefone</span>
                      <p className="font-medium">{detail.telefone || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Email</span>
                      <p className="font-medium">{detail.email || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Profissão</span>
                      <p className="font-medium">{detail.profissao || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Renda</span>
                      <p className="font-medium">{detail.renda || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Datas</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Criada em</span>
                      <p className="font-medium">{formatDate(detail.createdAt as any)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Início Análise</span>
                      <p className="font-medium">{formatDate(detail.inicioAnalise)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Fim Análise</span>
                      <p className="font-medium">{formatDate(detail.fimAnalise)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Pgto Banco</span>
                      <p className="font-medium">{formatDate(detail.dataPagamentoBanco)}</p>
                    </div>
                  </div>
                </div>

                {/* F&I */}
                {detail.feiResponsavelNome && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">F&I Responsável</h4>
                    <p className="text-sm font-medium">{detail.feiResponsavelNome}</p>
                  </div>
                )}

                {/* Bancos */}
                {detail.bancos && detail.bancos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Bancos</h4>
                    <div className="space-y-1.5">
                      {detail.bancos.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between text-sm bg-accent/30 rounded-lg px-3 py-1.5">
                          <span className="font-medium">{b.banco}</span>
                          <Badge variant={
                            b.status === "aprovado" ? "default" :
                            b.status === "recusado" ? "destructive" :
                            b.status === "em_analise" ? "secondary" : "outline"
                          } className="text-[10px]">
                            {b.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations */}
                {detail.observacoesVendedor && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Obs. Vendedor</h4>
                    <p className="text-sm bg-accent/30 rounded-lg p-2">{detail.observacoesVendedor}</p>
                  </div>
                )}
                {detail.observacoesFei && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Obs. F&I</h4>
                    <p className="text-sm bg-blue-500/10 rounded-lg p-2 text-blue-300">{detail.observacoesFei}</p>
                  </div>
                )}

                {/* Move actions */}
                <div className="pt-2 border-t border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Mover para</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {KANBAN_COLUMNS.map((col) => {
                      const isCurrent = col.key === detail.status;
                      return (
                        <Button
                          key={col.key}
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          disabled={isCurrent}
                          className="text-xs h-7"
                          onClick={() => {
                            moveStatus.mutate({ fichaId: detail.id, newStatus: col.key });
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
              <p className="text-sm text-muted-foreground text-center py-4">Ficha não encontrada</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
