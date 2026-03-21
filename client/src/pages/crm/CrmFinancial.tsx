import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Camera, X, Calendar,
  CheckCircle, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Filter, Search, FileText, Trash2, Edit, Save, Eye, Receipt,
  Wallet, CreditCard, Banknote, BarChart3, ChevronDown, Upload
} from "lucide-react";

const TYPE_CONFIG = {
  receita: { label: "Receita", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: ArrowUpRight },
  despesa: { label: "Despesa", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: ArrowDownRight },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pendente: { label: "Pendente", color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
  pago: { label: "Pago", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle },
  atrasado: { label: "Atrasado", color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "text-muted-foreground", bg: "bg-accent/50", icon: X },
};

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(ts: any): string {
  if (!ts) return "--";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString("pt-BR");
}

export default function CrmFinancial() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "pagar" | "receber" | "todas">("dashboard");
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryType, setNewEntryType] = useState<"receita" | "despesa">("despesa");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const { data: entries, refetch } = trpc.finTransactions.list.useQuery({
    type: activeTab === "pagar" ? "payable" : activeTab === "receber" ? "receivable" : undefined,
    status: filterStatus as any || undefined,
  });
  const { data: categories } = trpc.finCategories.list.useQuery();
  const { data: summary } = trpc.finTransactions.dashboard.useQuery({});

  const entryList = entries?.items || [];
  const filteredEntries = useMemo(() => {
    if (!entryList.length) return [];
    if (!searchQuery) return entryList;
    const q = searchQuery.toLowerCase();
    return entryList.filter((e: any) =>
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.supplier?.toLowerCase().includes(q)
    );
  }, [entryList, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-accent/30 rounded-xl p-1">
        {[
          { key: "dashboard" as const, label: "Resumo", icon: BarChart3 },
          { key: "pagar" as const, label: "A Pagar", icon: ArrowDownRight },
          { key: "receber" as const, label: "A Receber", icon: ArrowUpRight },
          { key: "todas" as const, label: "Todas", icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <FinancialDashboard summary={summary} />
      )}

      {activeTab !== "dashboard" && (
        <>
          {/* Action bar */}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setNewEntryType(activeTab === "receber" ? "receita" : "despesa"); setShowNewEntry(true); }}
              className="racing-gradient text-white h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Lançar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowScanner(true)} className="h-8 text-xs">
              <Camera className="w-3.5 h-3.5 mr-1" /> Ler Documento
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar descrição, categoria..." className="pl-9 h-9 text-sm" />
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterStatus(null)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${!filterStatus ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              Todas
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilterStatus(filterStatus === key ? null : key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1 ${filterStatus === key ? `${cfg.bg} border-current ${cfg.color}` : "bg-accent/50 border-border text-muted-foreground"}`}>
                <cfg.icon className="w-2.5 h-2.5" /> {cfg.label}
              </button>
            ))}
          </div>

          {/* Entries list */}
          <div className="space-y-2">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry: any) => (
                <EntryCard key={entry.id} entry={entry} onRefetch={refetch} />
              ))
            ) : (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
                <Button size="sm" onClick={() => setShowNewEntry(true)} variant="outline" className="mt-3">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Novo Lançamento
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* New entry modal */}
      {showNewEntry && (
        <NewEntryModal type={newEntryType} categories={categories || []}
          onClose={() => setShowNewEntry(false)}
          onCreated={() => { setShowNewEntry(false); refetch(); }} />
      )}

      {/* Camera scanner modal */}
      {showScanner && (
        <CameraScanner
          onClose={() => setShowScanner(false)}
          onScanned={(data) => {
            setShowScanner(false);
            setNewEntryType("despesa");
            setShowNewEntry(true);
            toast.success("Documento lido! Preencha os dados.");
          }}
        />
      )}
    </div>
  );
}

// ===== FINANCIAL DASHBOARD =====
function FinancialDashboard({ summary }: { summary: any }) {
  const totalReceitas = summary?.totalReceitas || 0;
  const totalDespesas = summary?.totalDespesas || 0;
  const saldo = totalReceitas - totalDespesas;
  const pendentePagar = summary?.pendentePagar || 0;
  const pendenteReceber = summary?.pendenteReceber || 0;
  const atrasados = summary?.atrasados || 0;

  return (
    <div className="space-y-3">
      {/* Saldo card */}
      <div className={`rounded-xl border p-4 ${saldo >= 0 ? "bg-green-500/5 border-green-500/30" : "bg-red-500/5 border-red-500/30"}`}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Saldo do Mês</span>
        </div>
        <p className={`text-2xl font-bold ${saldo >= 0 ? "text-green-400" : "text-red-400"}`}>
          {formatCurrency(saldo)}
        </p>
      </div>

      {/* Receitas vs Despesas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Receitas</span>
          </div>
          <p className="text-lg font-bold text-green-400">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Despesas</span>
          </div>
          <p className="text-lg font-bold text-red-400">{formatCurrency(totalDespesas)}</p>
        </div>
      </div>

      {/* Pending cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-muted-foreground uppercase">A Pagar</span>
          </div>
          <p className="text-sm font-bold text-foreground">{formatCurrency(pendentePagar)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-green-400" />
            <span className="text-[9px] text-muted-foreground uppercase">A Receber</span>
          </div>
          <p className="text-sm font-bold text-foreground">{formatCurrency(pendenteReceber)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[9px] text-muted-foreground uppercase">Atrasados</span>
          </div>
          <p className="text-sm font-bold text-red-400">{atrasados}</p>
        </div>
      </div>

      {/* Visual bar */}
      {(totalReceitas > 0 || totalDespesas > 0) && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Receitas vs Despesas</p>
          <div className="h-4 rounded-full bg-accent/50 overflow-hidden flex">
            <div className="h-full bg-green-500/60 transition-all" style={{ width: `${totalReceitas / (totalReceitas + totalDespesas) * 100}%` }} />
            <div className="h-full bg-red-500/60 transition-all" style={{ width: `${totalDespesas / (totalReceitas + totalDespesas) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-green-400">{Math.round(totalReceitas / (totalReceitas + totalDespesas) * 100)}% receitas</span>
            <span className="text-[9px] text-red-400">{Math.round(totalDespesas / (totalReceitas + totalDespesas) * 100)}% despesas</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ENTRY CARD =====
function EntryCard({ entry, onRefetch }: { entry: any; onRefetch: () => void }) {
  const typeCfg = TYPE_CONFIG[entry.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.despesa;
  const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pendente;
  const TypeIcon = typeCfg.icon;
  const StatusIcon = statusCfg.icon;

  const markPaid = trpc.finTransactions.markPaid.useMutation({
    onSuccess: () => { onRefetch(); toast.success("Marcado como pago!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteEntry = trpc.finTransactions.delete.useMutation({
    onSuccess: () => { onRefetch(); toast.success("Lançamento excluído!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const isOverdue = entry.status === "pendente" && entry.dueDate && new Date(entry.dueDate).getTime() < Date.now();

  return (
    <div className={`rounded-xl border p-3 transition-all ${isOverdue ? "bg-red-500/5 border-red-500/30" : typeCfg.bg}`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon className={`w-3.5 h-3.5 shrink-0 ${typeCfg.color}`} />
            <h3 className="text-sm font-bold text-foreground truncate">{entry.description}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">{entry.category}</span>
            )}
            {entry.supplier && (
              <span className="text-[10px] text-muted-foreground">{entry.supplier}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className={`text-sm font-bold ${typeCfg.color}`}>
            {entry.type === "despesa" ? "-" : "+"}{formatCurrency(entry.amount)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-2.5 h-2.5" /> {statusCfg.label}
          </span>
          {entry.dueDate && (
            <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
              <Calendar className="w-2.5 h-2.5" />
              {isOverdue && "ATRASADO - "}
              Venc: {formatDate(entry.dueDate)}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {entry.status === "pendente" && (
            <button onClick={() => markPaid.mutate({ id: entry.id })}
              className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95 transition-all">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            </button>
          )}
          <button onClick={() => { if (confirm("Excluir este lançamento?")) deleteEntry.mutate({ id: entry.id }); }}
            className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== NEW ENTRY MODAL =====
function NewEntryModal({ type, categories, onClose, onCreated }: {
  type: "receita" | "despesa"; categories: any[]; onClose: () => void; onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const createEntry = trpc.finTransactions.create.useMutation({
    onSuccess: () => { toast.success("Lançamento criado!"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredCategories = categories.filter((c: any) => c.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { toast.error("Descrição é obrigatória"); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error("Valor inválido"); return; }
    createEntry.mutate({
      type: type === "receita" ? "receivable" : "payable",
      description: description.trim(),
      amount: amount,
      supplier: supplier.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate).getTime() : Date.now(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b border-border flex items-center justify-between ${type === "receita" ? "bg-green-500/5" : "bg-red-500/5"}`}>
          <div className="flex items-center gap-2">
            {type === "receita" ? <ArrowUpRight className="w-5 h-5 text-green-400" /> : <ArrowDownRight className="w-5 h-5 text-red-400" />}
            <h2 className="text-base font-bold text-foreground">
              {type === "receita" ? "Nova Receita" : "Nova Despesa"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
            <Input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Conta de energia, Venda veículo..." className="h-10" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor (R$) *</label>
              <Input value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0,00" className="h-10" type="number" step="0.01" min="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Vencimento</label>
              <Input value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="h-10" type="date" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm">
              <option value="">Selecione...</option>
              {filteredCategories.map((c: any) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {type === "despesa" ? "Fornecedor / Empresa" : "Cliente / Origem"}
            </label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder={type === "despesa" ? "Ex: CELESC, Prefeitura..." : "Ex: João Silva..."} className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anotações adicionais..."
              className="w-full h-16 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
          </div>
          <Button type="submit" disabled={createEntry.isPending}
            className={`w-full font-bold h-11 text-white ${type === "receita" ? "bg-green-600 hover:bg-green-700" : "racing-gradient"}`}>
            {createEntry.isPending ? "Salvando..." : type === "receita" ? "Lançar Receita" : "Lançar Despesa"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ===== CAMERA SCANNER =====
function CameraScanner({ onClose, onScanned }: { onClose: () => void; onScanned: (data: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsCapturing(true);
    } catch {
      toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const processImage = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    // Simulate OCR processing - in production would use LLM vision API
    setTimeout(() => {
      setIsProcessing(false);
      onScanned({ type: "boleto", description: "Documento lido via câmera" });
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <h2 className="text-white font-bold text-sm">Ler Documento</h2>
        <button onClick={() => { stopCamera(); onClose(); }} className="text-white/70 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {!isCapturing && !capturedImage && (
          <div className="text-center space-y-4 p-6">
            <Camera className="w-16 h-16 text-white/30 mx-auto" />
            <p className="text-white/70 text-sm">Tire uma foto do boleto, nota fiscal ou conta</p>
            <div className="space-y-2">
              <Button onClick={startCamera} className="w-full bg-primary text-white">
                <Camera className="w-4 h-4 mr-2" /> Abrir Câmera
              </Button>
              <label className="block">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" asChild>
                  <span><Upload className="w-4 h-4 mr-2" /> Enviar da Galeria</span>
                </Button>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {isCapturing && (
          <div className="relative w-full h-full">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[80%] h-[50%] border-2 border-primary/50 rounded-xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-xl" />
              </div>
            </div>
            <p className="absolute bottom-20 left-0 right-0 text-center text-white/70 text-xs">
              Posicione o documento dentro da área
            </p>
          </div>
        )}

        {capturedImage && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img src={capturedImage} alt="Documento capturado" className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="p-4 bg-black/80 space-y-2">
        {isCapturing && (
          <Button onClick={capturePhoto} className="w-full bg-white text-black font-bold h-12">
            <Camera className="w-5 h-5 mr-2" /> Capturar
          </Button>
        )}
        {capturedImage && !isProcessing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setCapturedImage(null); startCamera(); }}
              className="flex-1 border-white/20 text-white hover:bg-white/10 h-11">
              Tirar Outra
            </Button>
            <Button onClick={processImage} className="flex-1 racing-gradient text-white font-bold h-11">
              <FileText className="w-4 h-4 mr-2" /> Processar
            </Button>
          </div>
        )}
        {isProcessing && (
          <div className="text-center py-3">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-white/70 text-sm">Lendo documento...</p>
          </div>
        )}
      </div>
    </div>
  );
}
