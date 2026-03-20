import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Search, Phone, MessageCircle, Calendar, ChevronRight, Flame, Thermometer,
  Snowflake, Plus, ArrowLeft, Clock, AlertTriangle, User, Car,
  Mic, MicOff, SlidersHorizontal, LayoutGrid, List, Eye
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual", whatsapp: "WhatsApp", olx: "OLX", webmotors: "Webmotors",
  socarrao: "SoCarrao", facebook: "Facebook", instagram: "Instagram",
  trafego_pago: "Trafego Pago", indicacao: "Indicacao", loja: "Loja",
};

const SCORE_CONFIG = {
  hot: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/20 border-red-500/40", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  warm: { label: "Morno", icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/40", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/40", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function timeAgo(ts: number | null | undefined) {
  if (!ts) return "Sem contato";
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Agora";
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days} dias atras`;
}

export default function CrmCommandCenter() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [filterScore, setFilterScore] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  // Get seller session
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const sellerId = sellerSession?.id || 0;
  const dept = sellerSession?.department || "vendas";

  // Fetch leads
  const { data: leads, refetch: refetchLeads } = trpc.crmLeads.listBySeller.useQuery(
    { sellerId, archived: false },
    { enabled: sellerId > 0 }
  );

  // Fetch follow-ups
  const { data: followUps } = trpc.crmLeads.getFollowUps.useQuery(
    { sellerId },
    { enabled: sellerId > 0 }
  );

  // Fetch pipeline stages
  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: dept });

  // Search
  const { data: searchResults } = trpc.crmLeads.search.useQuery(
    { query: searchQuery, sellerId },
    { enabled: searchQuery.length >= 2 && sellerId > 0 }
  );

  // Stats
  const { data: stats } = trpc.crmLeads.getStats.useQuery(
    { sellerId },
    { enabled: sellerId > 0 }
  );

  // Inventory alerts
  const { data: inventoryAlerts } = trpc.crmInventory.getAlerts.useQuery(
    { sellerId },
    { enabled: sellerId > 0 }
  );

  const displayLeads = searchQuery.length >= 2 ? searchResults : leads;
  const filteredLeads = useMemo(() => {
    if (!displayLeads) return [];
    if (!filterScore) return displayLeads;
    return displayLeads.filter(l => l.score === filterScore);
  }, [displayLeads, filterScore]);

  const moveStage = trpc.crmLeads.moveStage.useMutation({
    onSuccess: () => { refetchLeads(); toast.success("Etapa atualizada!"); },
    onError: (e) => toast.error(e.message),
  });

  const addActivity = trpc.crmLeads.addActivity.useMutation({
    onSuccess: () => { refetchLeads(); },
  });

  const handleWhatsApp = (lead: any) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Ola ${lead.name}! Tudo bem? Aqui e da Kafka Multimarcas.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "whatsapp", description: "WhatsApp enviado" });
  };

  const handleCall = (lead: any) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`tel:+55${phone}`, "_self");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "ligacao", description: "Ligacao realizada" });
  };

  if (!sellerSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Faca login para acessar o CRM</p>
          <Button onClick={() => navigate("/login-vendedor")} className="racing-gradient text-white">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header fixo mobile */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="p-1.5 hover:bg-accent rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">CRM</h1>
              <p className="text-[10px] text-muted-foreground">{sellerSession.nickname || sellerSession.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode(viewMode === "cards" ? "list" : "cards")}
              className="p-2 hover:bg-accent rounded-lg">
              {viewMode === "cards" ? <List className="w-4 h-4 text-muted-foreground" /> : <LayoutGrid className="w-4 h-4 text-muted-foreground" />}
            </button>
            <Button size="sm" onClick={() => setShowNewLead(true)} className="racing-gradient text-white h-8 px-3 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, telefone, placa..."
              className="pl-9 h-9 text-sm bg-accent/50 border-border"
            />
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="flex gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilterScore(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${!filterScore ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
            Todos {stats?.total || 0}
          </button>
          {(["hot", "warm", "cold"] as const).map(s => {
            const cfg = SCORE_CONFIG[s];
            const count = stats?.[s] || 0;
            return (
              <button key={s} onClick={() => setFilterScore(filterScore === s ? null : s)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${filterScore === s ? cfg.badge : "bg-accent/50 border-border text-muted-foreground"}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label} {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alertas de follow-up */}
      {followUps && followUps.length > 0 && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {followUps.length} leads sem contato ha 48h+
            </span>
          </div>
          <div className="space-y-1">
            {followUps.slice(0, 3).map(lead => (
              <div key={lead.id} className="flex items-center justify-between">
                <span className="text-xs text-foreground truncate">{lead.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleWhatsApp(lead)} className="p-1 rounded bg-green-500/20 hover:bg-green-500/30">
                    <MessageCircle className="w-3 h-3 text-green-400" />
                  </button>
                  <button onClick={() => handleCall(lead)} className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/30">
                    <Phone className="w-3 h-3 text-blue-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de estoque */}
      {inventoryAlerts && inventoryAlerts.length > 0 && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
              Veiculos novos no estoque para seus clientes!
            </span>
          </div>
        </div>
      )}

      {/* Lista de leads */}
      <div className="px-3 mt-3 space-y-2">
        {filteredLeads && filteredLeads.length > 0 ? (
          filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stages={stages || []}
              sellerId={sellerId}
              onWhatsApp={() => handleWhatsApp(lead)}
              onCall={() => handleCall(lead)}
              onMoveStage={(newStage) => moveStage.mutate({ id: lead.id, newStage, sellerId })}
              onView={() => navigate(`/crm/lead/${lead.id}`)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}
            </p>
            <Button size="sm" onClick={() => setShowNewLead(true)} variant="outline" className="mt-3">
              <Plus className="w-4 h-4 mr-1" /> Cadastrar primeiro lead
            </Button>
          </div>
        )}
      </div>

      {/* Modal novo lead */}
      {showNewLead && (
        <NewLeadModal
          sellerId={sellerId}
          department={dept}
          onClose={() => setShowNewLead(false)}
          onCreated={() => { setShowNewLead(false); refetchLeads(); }}
        />
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="flex justify-around py-2">
          <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Minha Area</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-bold">CRM</span>
          </button>
          <button onClick={() => navigate(`/crm/pipeline`)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px]">Pipeline</span>
          </button>
          <button onClick={() => navigate(`/agendamentos/${sellerId}`)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== LEAD CARD =====
function LeadCard({ lead, stages, sellerId, onWhatsApp, onCall, onMoveStage, onView }: {
  lead: any; stages: any[]; sellerId: number;
  onWhatsApp: () => void; onCall: () => void;
  onMoveStage: (stage: string) => void; onView: () => void;
}) {
  const [showStages, setShowStages] = useState(false);
  const scoreCfg = SCORE_CONFIG[lead.score as keyof typeof SCORE_CONFIG] || SCORE_CONFIG.warm;
  const ScoreIcon = scoreCfg.icon;

  return (
    <div className={`rounded-xl border p-3 transition-all ${scoreCfg.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0" onClick={onView}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{lead.name}</h3>
            <ScoreIcon className={`w-3.5 h-3.5 shrink-0 ${scoreCfg.color}`} />
          </div>
          {lead.vehicleInterest && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Car className="w-3 h-3" /> {lead.vehicleInterest}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{lead.stage}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> {timeAgo(lead.lastContactDate)}
            </span>
          </div>
          {lead.source && lead.source !== "manual" && (
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Origem: {SOURCE_LABELS[lead.source] || lead.source}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons - 2 toques */}
      <div className="flex gap-1.5 mt-2">
        <button onClick={onWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-all active:scale-95">
          <MessageCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">WhatsApp</span>
        </button>
        <button onClick={onCall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all active:scale-95">
          <Phone className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">Ligar</span>
        </button>
        <button onClick={() => setShowStages(!showStages)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-all active:scale-95">
          <ChevronRight className={`w-4 h-4 text-purple-400 transition-transform ${showStages ? "rotate-90" : ""}`} />
          <span className="text-xs font-medium text-purple-400">Etapa</span>
        </button>
        <button onClick={onView}
          className="flex items-center justify-center p-2 rounded-lg bg-accent/50 hover:bg-accent border border-border transition-all active:scale-95">
          <Eye className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stage selector */}
      {showStages && (
        <div className="mt-2 flex flex-wrap gap-1">
          {stages.map(s => (
            <button key={s.id} onClick={() => { onMoveStage(s.name); setShowStages(false); }}
              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${lead.stage === s.name ? "bg-primary/30 border-primary/50 text-primary font-bold" : "bg-accent/50 border-border text-muted-foreground hover:bg-accent"}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== NEW LEAD MODAL =====
function NewLeadModal({ sellerId, department, onClose, onCreated }: {
  sellerId: number; department: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const createLead = trpc.crmLeads.create.useMutation({
    onSuccess: () => { toast.success("Lead cadastrado!"); onCreated(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome e obrigatorio"); return; }
    createLead.mutate({ sellerId, department, name: name.trim(), phone: phone.trim() || undefined, vehicleInterest: vehicleInterest.trim() || undefined, source, notes: notes.trim() || undefined });
  };

  // Voice recording for notes
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        // For now, just append a note that voice was recorded
        setNotes(prev => prev + (prev ? "\n" : "") + "[Nota de voz gravada - transcrever]");
        setIsRecording(false);
        toast.success("Nota de voz salva!");
      };
      mediaRecorder.start();
      setIsRecording(true);
      // Auto-stop after 30s
      setTimeout(() => { if (mediaRecorder.state === "recording") mediaRecorder.stop(); }, 30000);
      // Store ref for manual stop
      (window as any).__mediaRecorder = mediaRecorder;
    } catch {
      toast.error("Permissao de microfone negada");
    }
  };

  const stopRecording = () => {
    const mr = (window as any).__mediaRecorder;
    if (mr && mr.state === "recording") mr.stop();
    setIsRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Novo Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" className="h-10" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-10" type="tel" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Veiculo de Interesse</label>
            <Input value={vehicleInterest} onChange={e => setVehicleInterest(e.target.value)} placeholder="Ex: HB20, Hilux, Civic..." className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm">
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="trafego_pago">Trafego Pago</option>
              <option value="olx">OLX</option>
              <option value="webmotors">Webmotors</option>
              <option value="socarrao">SoCarrao</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="indicacao">Indicacao</option>
              <option value="loja">Loja (presencial)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-2">
              Observacoes
              <button type="button" onClick={isRecording ? stopRecording : startRecording}
                className={`p-1 rounded ${isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-accent text-muted-foreground hover:text-foreground"}`}>
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anotacoes sobre o cliente..."
              className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
          </div>
          <Button type="submit" disabled={createLead.isPending} className="w-full racing-gradient text-white font-bold h-11">
            {createLead.isPending ? "Salvando..." : "Cadastrar Lead"}
          </Button>
        </form>
      </div>
    </div>
  );
}
