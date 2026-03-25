import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText, FileCheck, FileWarning, Upload, Eye, Clock,
  CheckCircle2, ArrowRight, Filter, Search, Download, Loader2
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  aguardando_docs: { label: "Aguardando Docs", color: "text-red-400", bg: "bg-red-500/20", icon: FileWarning },
  docs_enviados: { label: "Docs Recebidos", color: "text-blue-400", bg: "bg-blue-500/20", icon: FileCheck },
  em_transferencia: { label: "Em Transferência", color: "text-yellow-400", bg: "bg-yellow-500/20", icon: Clock },
  transferido: { label: "Transferido", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle2 },
};

function formatDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function AdminDocumentos() {
  const [filter, setFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: docs, refetch } = trpc.saleDocuments.listAll.useQuery(
    filter !== "todos" ? { filterStatus: filter } : {}
  );
  const markInTransfer = trpc.saleDocuments.markInTransfer.useMutation({
    onSuccess: () => { toast.success("Marcado como em transferência!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const markTransferred = trpc.saleDocuments.markTransferred.useMutation({
    onSuccess: () => { toast.success("Transferência concluída! Documento emitido salvo."); refetch(); setUploadingId(null); },
    onError: (e) => toast.error(e.message),
  });

  const handleUploadDocEmitido = (id: number) => {
    setUploadingId(id);
    docInputRef.current?.click();
  };

  const processDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      markTransferred.mutate({ id: uploadingId, base64, filename: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const allDocs = docs || [];
  const filteredDocs = search
    ? allDocs.filter((d: any) =>
        (d.clienteNome || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.vehicleModel || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.vehiclePlate || "").toLowerCase().includes(search.toLowerCase())
      )
    : allDocs;

  const counts = {
    total: allDocs.length,
    aguardando: allDocs.filter((d: any) => d.dispatchStatus === "aguardando_docs").length,
    recebidos: allDocs.filter((d: any) => d.dispatchStatus === "docs_enviados").length,
    emTransferencia: allDocs.filter((d: any) => d.dispatchStatus === "em_transferencia").length,
    transferidos: allDocs.filter((d: any) => d.dispatchStatus === "transferido").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Documentos de Venda
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie documentos enviados pelos vendedores para transferência
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <FileWarning className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-400">{counts.aguardando}</p>
            <p className="text-xs text-red-400/70">Aguardando Docs</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
            <FileCheck className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-blue-400">{counts.recebidos}</p>
            <p className="text-xs text-blue-400/70">Docs Recebidos</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-yellow-400">{counts.emTransferencia}</p>
            <p className="text-xs text-yellow-400/70">Em Transferência</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-emerald-400">{counts.transferidos}</p>
            <p className="text-xs text-emerald-400/70">Transferidos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {[
            { key: "todos", label: "Todos", count: counts.total },
            { key: "aguardando_docs", label: "Aguardando", count: counts.aguardando },
            { key: "docs_enviados", label: "Recebidos", count: counts.recebidos },
            { key: "em_transferencia", label: "Em Transfer.", count: counts.emTransferencia },
            { key: "transferido", label: "Transferidos", count: counts.transferidos },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === f.key ? "bg-white/20" : "bg-background"
              }`}>{f.count}</span>
            </button>
          ))}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por cliente, veículo ou placa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input ref={docInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={processDocUpload} />

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc: any) => {
              const statusInfo = STATUS_CONFIG[doc.dispatchStatus] || STATUS_CONFIG.aguardando_docs;
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={doc.id}
                  className={`bg-card border rounded-xl p-4 transition-all hover:border-primary/30 ${
                    doc.dispatchStatus === "docs_enviados" ? "border-blue-500/40 ring-1 ring-blue-500/20" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-foreground">{doc.vehicleModel || "Veículo"}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color} font-semibold`}>
                          <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {doc.clienteNome || "N/I"} {doc.vehiclePlate ? `• Placa: ${doc.vehiclePlate}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Venda #{doc.saleId} • Vendedor #{doc.sellerId} • {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Documentos do vendedor */}
                  <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
                    {/* CNH */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      doc.cnhUrl ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {doc.cnhUrl ? <FileCheck className="w-3.5 h-3.5" /> : <FileWarning className="w-3.5 h-3.5" />}
                      CNH {doc.cnhUrl ? "Recebida" : "Pendente"}
                      {doc.cnhUrl && (
                        <a href={doc.cnhUrl} target="_blank" rel="noopener noreferrer" className="ml-1 hover:text-emerald-300">
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {/* Comprovante */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      doc.comprovanteUrl ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {doc.comprovanteUrl ? <FileCheck className="w-3.5 h-3.5" /> : <FileWarning className="w-3.5 h-3.5" />}
                      Comprovante {doc.comprovanteUrl ? "Recebido" : "Pendente"}
                      {doc.comprovanteUrl && (
                        <a href={doc.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="ml-1 hover:text-emerald-300">
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Ações do despachante */}
                  {doc.dispatchStatus === "docs_enviados" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markInTransfer.mutate({ id: doc.id })}
                        disabled={markInTransfer.isPending}
                        className="gap-1.5 border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Iniciar Transferência
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUploadDocEmitido(doc.id)}
                        disabled={markTransferred.isPending}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {markTransferred.isPending && uploadingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Concluir + Doc Emitido
                      </Button>
                    </div>
                  )}

                  {doc.dispatchStatus === "em_transferencia" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => handleUploadDocEmitido(doc.id)}
                        disabled={markTransferred.isPending}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {markTransferred.isPending && uploadingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Concluir Transferência + Doc Emitido
                      </Button>
                    </div>
                  )}

                  {doc.dispatchStatus === "transferido" && doc.documentoEmitidoUrl && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <a
                        href={doc.documentoEmitidoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Ver Documento Emitido
                      </a>
                      <span className="text-xs text-muted-foreground">
                        Transferido em {formatDate(doc.transferredAt)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filter !== "todos" ? "Nenhum documento com esse filtro" : "Nenhum documento de venda registrado ainda"}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
