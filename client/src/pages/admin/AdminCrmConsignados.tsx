import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Car, Calendar, User, Phone, ChevronLeft, ChevronRight,
  Package, Handshake, CheckCircle2, RotateCcw, Clock, MapPin, Filter, Users
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

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR");
}

function daysInYard(entryDate: number, exitDate?: number | null): number {
  const end = exitDate || Date.now();
  return Math.floor((end - entryDate) / (1000 * 60 * 60 * 24));
}

export default function AdminCrmConsignados() {
  const [activeColumnIdx, setActiveColumnIdx] = useState(0);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const sellerIdFilter = selectedSellerId === "all" ? undefined : Number(selectedSellerId);

  const { data: records, isLoading, refetch } = trpc.consignment.listForCrm.useQuery(
    sellerIdFilter ? { sellerId: sellerIdFilter } : undefined
  );
  const { data: detail, isLoading: loadingDetail } = trpc.consignment.getDetail.useQuery(
    { id: selectedRecord?.id || 0 },
    { enabled: !!selectedRecord }
  );

  const moveCrmStatus = trpc.consignment.moveCrmStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Get seller name by ID
  const getSellerName = (sellerId: number) => {
    const seller = sellers?.find((s: any) => s.id === sellerId);
    return seller?.nickname || seller?.name || `#${sellerId}`;
  };

  // Group records by crmStatus
  const recordsByStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of CRM_COLUMNS) map[col.key] = [];
    if (records) {
      for (const r of records) {
        const status = (r.crmStatus || "cadastro") as string;
        if (map[status]) map[status].push(r);
        else map["cadastro"].push(r);
      }
    }
    return map;
  }, [records]);

  const currentColumn = CRM_COLUMNS[activeColumnIdx];
  const currentRecords = recordsByStatus[currentColumn.key] || [];

  const handleMoveNext = (record: any) => {
    const currentIdx = CRM_COLUMNS.findIndex(c => c.key === (record.crmStatus || "cadastro"));
    if (currentIdx < CRM_COLUMNS.length - 1) {
      moveCrmStatus.mutate({ id: record.id, crmStatus: CRM_COLUMNS[currentIdx + 1].key });
    }
  };

  const handleMovePrev = (record: any) => {
    const currentIdx = CRM_COLUMNS.findIndex(c => c.key === (record.crmStatus || "cadastro"));
    if (currentIdx > 0) {
      moveCrmStatus.mutate({ id: record.id, crmStatus: CRM_COLUMNS[currentIdx - 1].key });
    }
  };

  const openDetail = (record: any) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">CRM Consignados</h1>
          <p className="text-sm text-muted-foreground">Kanban de veículos consignados</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {records?.length || 0} veículos
          </Badge>
        </div>
      </div>

      {/* Seller filter */}
      <div className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg border border-border">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Vendedor:</span>
        <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue placeholder="Todos os vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Todos
              </span>
            </SelectItem>
            {sellers?.map((s: any) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.nickname || s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Column tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {CRM_COLUMNS.map((col, i) => {
          const count = recordsByStatus[col.key]?.length || 0;
          const Icon = col.icon;
          return (
            <button
              key={col.key}
              onClick={() => setActiveColumnIdx(i)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                activeColumnIdx === i
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-accent/30 border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ backgroundColor: col.color + "33", color: col.color }}
              >
                {count}
              </span>
              <Icon className="w-3.5 h-3.5" />
              {col.label}
            </button>
          );
        })}
      </div>

      {/* Current column info */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentColumn.color }} />
        <span className="text-sm font-bold text-foreground">{currentColumn.label}</span>
        <span className="text-xs text-muted-foreground">({currentRecords.length})</span>
        <span className="text-xs text-muted-foreground ml-auto">{currentColumn.description}</span>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : currentRecords.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum veículo nesta etapa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {currentRecords.map((record: any) => (
            <div
              key={record.id}
              className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all"
            >
              <div className="cursor-pointer" onClick={() => openDetail(record)}>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {record.vehiclePlate || "Sem placa"}
                      </h3>
                      {record.isValid && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-green-500/20 text-green-500 border-green-500/30">
                          7d+
                        </Badge>
                      )}
                      {record.hasAuction && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          Leilão
                        </Badge>
                      )}
                    </div>
                    {record.vehicleModel && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Car className="w-3 h-3" /> {record.vehicleModel}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                      <Clock className="w-3 h-3" />
                      {daysInYard(record.entryDate, record.exitDate)} dias
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                  {record.consignorName && (
                    <span className="flex items-center gap-0.5">
                      <User className="w-3 h-3" /> {record.consignorName}
                    </span>
                  )}
                  {record.costValue && (
                    <span className="ml-auto font-medium text-foreground">
                      {formatCurrency(record.costValue)}
                    </span>
                  )}
                </div>
                {/* Seller badge */}
                <div className="mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <User className="w-2.5 h-2.5 mr-0.5" />
                    {getSellerName(record.sellerId)}
                  </Badge>
                </div>
              </div>

              {/* Move actions */}
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/50">
                <button
                  onClick={() => handleMovePrev(record)}
                  disabled={CRM_COLUMNS.findIndex(c => c.key === (record.crmStatus || "cadastro")) <= 0}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-accent/50 border border-border active:scale-95 transition-all disabled:opacity-30 text-xs text-muted-foreground"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleMoveNext(record)}
                  disabled={CRM_COLUMNS.findIndex(c => c.key === (record.crmStatus || "cadastro")) >= CRM_COLUMNS.length - 1}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary/15 border border-primary/25 active:scale-95 transition-all disabled:opacity-30 text-xs text-primary"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              {detail?.vehiclePlate || selectedRecord?.vehiclePlate || "Detalhes"}
              {detail && (
                <Badge variant="outline" className="text-[10px] ml-2">
                  {getSellerName(detail.sellerId)}
                </Badge>
              )}
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
