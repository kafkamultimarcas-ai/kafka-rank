import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText, FileCheck, FileWarning, Upload, Eye, Clock,
  CheckCircle2, ArrowRight, Filter, Search, Download, Loader2,
  Trash2, MessageSquare, X, ArrowLeft
} from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ListSkeleton } from "@/components/ListSkeleton";

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
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const pagination = usePagination({ initialPageSize: 20, resetDeps: [filter, search] });
  const listQuery = trpc.saleDocuments.listAll.useQuery({
    offset: pagination.offset,
    limit: pagination.pageSize,
    search: search || undefined,
    dispatchStatus: filter,
  });
  const refetch = listQuery.refetch;
  const markInTransfer = trpc.saleDocuments.markInTransfer.useMutation({
    onSuccess: () => { toast.success("Marcado como em transferência!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const markTransferred = trpc.saleDocuments.markTransferred.useMutation({
    onSuccess: () => { toast.success("Transferência concluída! Documento emitido salvo."); refetch(); setUploadingId(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateNotes = trpc.saleDocuments.updateNotes.useMutation({
    onSuccess: () => { toast.success("Observação salva!"); refetch(); setEditingNotesId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDoc = trpc.saleDocuments.delete.useMutation({
    onSuccess: () => { toast.success("Documento removido!"); refetch(); setDeletingId(null); },
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

  const startEditNotes = (doc: any) => {
    setEditingNotesId(doc.id);
    setNotesText(doc.notes || "");
  };

  const saveNotes = () => {
    if (editingNotesId === null) return;
    updateNotes.mutate({ id: editingNotesId, notes: notesText || null });
  };

  const confirmDelete = (id: number) => {
    setDeletingId(id);
  };

  const docs = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const counts = listQuery.data?.counts ?? { total: 0, aguardando: 0, recebidos: 0, emTransferencia: 0, transferidos: 0 };
  const isLoading = listQuery.isLoading;
  const isFetching = listQuery.isFetching;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => window.history.back()} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-black text-foreground">Despachante / Documentos</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-10">Gerencie transferências e documentos de vendas</p>
        </div>

        {/* Stats - Clicáveis */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button onClick={() => setFilter("todos")} className={`bg-card border border-border rounded-xl p-4 text-center cursor-pointer transition-all ${filter === 'todos' ? 'ring-2 ring-foreground/50' : 'hover:ring-1 hover:ring-foreground/30'}`}>
            <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{counts.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </button>
          <button onClick={() => setFilter("aguardando_docs")} className={`bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center cursor-pointer transition-all ${filter === 'aguardando_docs' ? 'ring-2 ring-red-400' : 'hover:ring-1 hover:ring-red-400/50'}`}>
            <FileWarning className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-400">{counts.aguardando}</p>
            <p className="text-xs text-red-400/70">Aguardando</p>
          </button>
          <button onClick={() => setFilter("docs_enviados")} className={`bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center cursor-pointer transition-all ${filter === 'docs_enviados' ? 'ring-2 ring-blue-400' : 'hover:ring-1 hover:ring-blue-400/50'}`}>
            <FileCheck className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-blue-400">{counts.recebidos}</p>
            <p className="text-xs text-blue-400/70">Recebidos</p>
          </button>
          <button onClick={() => setFilter("em_transferencia")} className={`bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center cursor-pointer transition-all ${filter === 'em_transferencia' ? 'ring-2 ring-yellow-400' : 'hover:ring-1 hover:ring-yellow-400/50'}`}>
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-yellow-400">{counts.emTransferencia}</p>
            <p className="text-xs text-yellow-400/70">Em Transferência</p>
          </button>
          <button onClick={() => setFilter("transferido")} className={`bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center cursor-pointer transition-all ${filter === 'transferido' ? 'ring-2 ring-emerald-400' : 'hover:ring-1 hover:ring-emerald-400/50'}`}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-emerald-400">{counts.transferidos}</p>
            <p className="text-xs text-emerald-400/70">Transferidos</p>
          </button>
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
                className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input ref={docInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={processDocUpload} />

        {/* Delete confirmation modal */}
        {deletingId !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-foreground mb-2">Confirmar exclusão</h3>
              <p className="text-sm text-muted-foreground mb-4">Tem certeza que deseja excluir este registro de documento? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>Cancelar</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteDoc.mutate({ id: deletingId })}
                  disabled={deleteDoc.isPending}
                  className="gap-1.5"
                >
                  {deleteDoc.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes editing modal */}
        {editingNotesId !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingNotesId(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Observações</h3>
                <button onClick={() => setEditingNotesId(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
              </div>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Adicione observações sobre este documento..."
                className="w-full h-32 bg-muted border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2 justify-end mt-3">
                <Button variant="outline" size="sm" onClick={() => setEditingNotesId(null)}>Cancelar</Button>
                <Button
                  size="sm"
                  onClick={saveNotes}
                  disabled={updateNotes.isPending}
                  className="gap-1.5"
                >
                  {updateNotes.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-3">
          {isLoading ? (
            <ListSkeleton rows={6} />
          ) : docs.length > 0 ? (
            <>
            {docs.map((doc: any) => {
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
                      {doc.notes && (
                        <p className="text-xs text-amber-400/80 mt-1 italic">📝 {doc.notes}</p>
                      )}
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditNotes(doc)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        title="Observações"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
            })}
            <PaginationControls
              page={pagination.page}
              totalPages={totalPages}
              total={total}
              pageSize={pagination.pageSize}
              isLoading={isFetching}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              className="border-t border-border pt-5"
            />
            </>
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
