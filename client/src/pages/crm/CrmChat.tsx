import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Send, ArrowLeft, Phone, MessageCircle, Clock, Flame, Thermometer, Snowflake,
  User, Bot, Star, AlertTriangle, ChevronDown, Image, Paperclip, Search,
  X, Filter, Users, Zap, TrendingUp, CheckCircle, XCircle, BarChart3,
  Volume2, Download, Play, File, Mic, Square
} from "lucide-react";
import { ChannelIcon } from "@/components/ChannelIcon";

// Detect media type from URL extension as fallback
function detectMediaTypeFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/)) return "image";
  if (lower.match(/\.(ogg|mp3|wav|m4a|aac|opus|webm)/)) return "audio";
  if (lower.match(/\.(mp4|avi|mov|mkv|3gp)/)) return "video";
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)/)) return "document";
  return null;
}

function ChatMediaRendererFull({ msg }: { msg: any }) {
  if (!msg.mediaUrl) return null;
  const effectiveType = (msg.messageType && msg.messageType !== "text")
    ? msg.messageType
    : detectMediaTypeFromUrl(msg.mediaUrl) || msg.messageType;
  
  if (effectiveType === "image") {
    return (
      <a href={msg.mediaUrl} target="_blank" rel="noopener" className="block mb-1">
        <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full cursor-pointer hover:opacity-90" style={{ maxHeight: 200 }}
          onError={(e) => { e.currentTarget.style.display = "none"; const f = e.currentTarget.nextElementSibling as HTMLElement; if (f) f.style.display = "flex"; }} />
        <div className="hidden items-center gap-2 text-xs bg-black/20 rounded-lg px-3 py-2">
          <Image className="w-4 h-4 text-blue-400" /> <span>Imagem</span> <Download className="w-3 h-3 ml-auto" />
        </div>
      </a>
    );
  }
  if (effectiveType === "audio" || effectiveType === "ptt") {
    return (
      <div className="mb-1">
        <div className="flex items-center gap-2 bg-black/10 rounded-xl px-2 py-1.5" style={{ minWidth: 200, maxWidth: 280 }}>
          <Volume2 className="w-4 h-4 text-green-400 shrink-0" />
          <audio controls preload="metadata" className="flex-1 h-8" style={{ minWidth: 0 }}>
            <source src={msg.mediaUrl} type="audio/ogg; codecs=opus" />
            <source src={msg.mediaUrl} type="audio/ogg" />
            <source src={msg.mediaUrl} />
          </audio>
        </div>
      </div>
    );
  }
  if (effectiveType === "video") {
    return (
      <div className="mb-1">
        <video controls preload="metadata" className="rounded-lg max-w-full" style={{ maxHeight: 240, maxWidth: 280 }}
          onError={(e) => { e.currentTarget.style.display = "none"; const f = e.currentTarget.nextElementSibling as HTMLElement; if (f) f.style.display = "flex"; }}>
          <source src={msg.mediaUrl} />
        </video>
        <a href={msg.mediaUrl} target="_blank" rel="noopener" className="hidden items-center gap-2 text-xs bg-black/20 rounded-lg px-3 py-2">
          <Play className="w-4 h-4 text-blue-400" /> Vídeo <Download className="w-3 h-3 ml-auto" />
        </a>
      </div>
    );
  }
  if (effectiveType === "sticker") {
    return <img src={msg.mediaUrl} alt="sticker" className="mb-1" style={{ maxHeight: 120, maxWidth: 120 }} />;
  }
  const ext = msg.mediaUrl.split(".").pop()?.split("?")[0]?.toUpperCase() || "";
  return (
    <a href={msg.mediaUrl} target="_blank" rel="noopener"
      className="flex items-center gap-2 text-xs mb-1 bg-black/20 rounded-lg px-3 py-2.5 hover:bg-black/30 transition-colors">
      <File className="w-4 h-4 text-orange-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{effectiveType === "document" ? "Documento" : "Arquivo"}</p>
        {ext && <p className="text-[10px] opacity-60">{ext}</p>}
      </div>
      <Download className="w-3.5 h-3.5 opacity-60 shrink-0" />
    </a>
  );
}

// ===== TYPES =====
interface Lead {
  id: number;
  name: string;
  phone: string | null;
  score: string;
  source: string;
  stage: string;
  department: string;
  sellerId: number;
  vehicleInterest: string | null;
  lastContactDate: number | null;
  createdAt: Date | string;
  notes: string | null;
  archived: boolean;
}

interface Message {
  id: number;
  leadId: number;
  phone: string;
  direction: "inbound" | "outbound";
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  senderName: string | null;
  sentBy: number | null;
  timestamp: number;
}

// ===== HELPERS =====
function timeAgo(ts: number | string | Date | null | undefined) {
  if (!ts) return "";
  const numTs = typeof ts === "number" ? ts : (ts instanceof Date ? ts.getTime() : new Date(ts).getTime());
  const diff = Date.now() - numTs;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `${days}d`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const SCORE_CFG = {
  hot: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
  warm: { label: "Morno", icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
};

const SOURCE_CFG: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "text-green-400" },
  olx: { label: "OLX", color: "text-orange-400" },
  manual: { label: "Manual", color: "text-gray-400" },
  facebook: { label: "Facebook", color: "text-blue-400" },
  instagram: { label: "Instagram", color: "text-pink-400" },
};

// ===== MAIN CRM CHAT COMPONENT =====
export default function CrmChat({ sellerId, isSdr }: { sellerId?: number; isSdr?: boolean }) {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScore, setFilterScore] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const handleSelectLead = (id: number) => {
    setSelectedLeadId(id);
    setShowMobileChat(true);
  };

  const handleBack = () => {
    setShowMobileChat(false);
  };

  return (
    <div className="h-[calc(100vh-60px)] flex bg-background overflow-hidden">
      {/* Left panel - Lead list */}
      <div className={`w-full md:w-96 md:min-w-[360px] border-r border-border flex flex-col bg-card ${showMobileChat ? "hidden md:flex" : "flex"}`}>
        <LeadList
          sellerId={sellerId}
          isSdr={isSdr}
          selectedLeadId={selectedLeadId}
          onSelectLead={handleSelectLead}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterScore={filterScore}
          setFilterScore={setFilterScore}
        />
      </div>

      {/* Right panel - Chat */}
      <div className={`flex-1 flex flex-col bg-background ${showMobileChat ? "flex" : "hidden md:flex"}`}>
        {selectedLeadId ? (
          <ChatPanel leadId={selectedLeadId} sellerId={sellerId} onBack={handleBack} />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
}

// ===== LEAD LIST =====
function LeadList({
  sellerId, isSdr, selectedLeadId, onSelectLead, searchQuery, setSearchQuery, filterScore, setFilterScore
}: {
  sellerId?: number;
  isSdr?: boolean;
  selectedLeadId: number | null;
  onSelectLead: (id: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterScore: string | null;
  setFilterScore: (s: string | null) => void;
}) {
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false }, { refetchInterval: 5000 });
  const { data: searchResults } = trpc.crmLeads.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  const { data: sellers } = trpc.sellers.list.useQuery();
  const { data: alerts } = trpc.crmPerformance.getAlerts.useQuery({ thresholdMinutes: 5 }, { refetchInterval: 60000 });

  const sellerMap = useMemo(() => {
    if (!sellers) return {} as Record<number, string>;
    return sellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [sellers]);

  // Color map for sellers - each seller gets a unique color badge
  const SELLER_COLORS = [
    "bg-cyan-500/15 text-cyan-400",
    "bg-violet-500/15 text-violet-400",
    "bg-pink-500/15 text-pink-400",
    "bg-teal-500/15 text-teal-400",
    "bg-orange-500/15 text-orange-400",
    "bg-lime-500/15 text-lime-400",
    "bg-sky-500/15 text-sky-400",
    "bg-rose-500/15 text-rose-400",
    "bg-indigo-500/15 text-indigo-400",
    "bg-emerald-500/15 text-emerald-400",
  ];
  const sellerColorMap = useMemo(() => {
    if (!sellers) return {} as Record<number, string>;
    return sellers.reduce((acc: Record<number, string>, s: any, i: number) => {
      acc[s.id] = SELLER_COLORS[i % SELLER_COLORS.length];
      return acc;
    }, {});
  }, [sellers]);

  const alertLeadIds = useMemo(() => new Set(alerts?.map((a: any) => a.id) || []), [alerts]);

  const leads = useMemo(() => {
    let base = searchQuery.length >= 2 ? searchResults : allLeads;
    if (!base) return [];
    // Filter by seller if not SDR/admin
    if (sellerId && !isSdr) {
      base = base.filter((l: any) => l.sellerId === sellerId);
    }
    // Filter by score
    if (filterScore) {
      base = base.filter((l: any) => l.score === filterScore);
    }
    // Sort: alerts first, then by most recent activity (lastContactDate > updatedAt > createdAt)
    return [...base].sort((a: any, b: any) => {
      const aAlert = alertLeadIds.has(a.id) ? 1 : 0;
      const bAlert = alertLeadIds.has(b.id) ? 1 : 0;
      if (aAlert !== bAlert) return bAlert - aAlert;
      // Use lastContactDate if available, otherwise updatedAt, otherwise createdAt
      const aTime = a.lastContactDate || new Date(a.updatedAt || a.createdAt).getTime();
      const bTime = b.lastContactDate || new Date(b.updatedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [allLeads, searchResults, searchQuery, sellerId, isSdr, filterScore, alertLeadIds]);

  const stats = useMemo(() => {
    if (!allLeads) return { total: 0, hot: 0, warm: 0, cold: 0, unassigned: 0 };
    const filtered = sellerId && !isSdr ? allLeads.filter((l: any) => l.sellerId === sellerId) : allLeads;
    return {
      total: filtered.length,
      hot: filtered.filter((l: any) => l.score === "hot").length,
      warm: filtered.filter((l: any) => l.score === "warm").length,
      cold: filtered.filter((l: any) => l.score === "cold").length,
      unassigned: filtered.filter((l: any) => l.sellerId === 0).length,
    };
  }, [allLeads, sellerId, isSdr]);

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            Leads
            {alerts && alerts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                {alerts.length}
              </span>
            )}
          </h2>
          <span className="text-xs text-muted-foreground">{stats.total} total</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-9 h-9 text-sm bg-accent/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Score filter chips */}
        <div className="flex gap-1.5">
          <button onClick={() => setFilterScore(null)}
            className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${!filterScore ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/30 border-border text-muted-foreground"}`}>
            Todos ({stats.total})
          </button>
          <button onClick={() => setFilterScore(filterScore === "hot" ? null : "hot")}
            className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${filterScore === "hot" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-accent/30 border-border text-muted-foreground"}`}>
            <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />{stats.hot}</span>
          </button>
          <button onClick={() => setFilterScore(filterScore === "warm" ? null : "warm")}
            className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${filterScore === "warm" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-accent/30 border-border text-muted-foreground"}`}>
            <span className="flex items-center gap-0.5"><Thermometer className="w-3 h-3" />{stats.warm}</span>
          </button>
          <button onClick={() => setFilterScore(filterScore === "cold" ? null : "cold")}
            className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${filterScore === "cold" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-accent/30 border-border text-muted-foreground"}`}>
            <span className="flex items-center gap-0.5"><Snowflake className="w-3 h-3" />{stats.cold}</span>
          </button>
          {stats.unassigned > 0 && (
            <button onClick={() => setFilterScore(null)}
              className="px-2 py-1 rounded-full text-[10px] font-medium border bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse">
              {stats.unassigned} novos
            </button>
          )}
        </div>
      </div>

      {/* Lead list */}
      <div className="flex-1 overflow-y-auto">
        {leads.map((lead: any) => {
          const scoreCfg = SCORE_CFG[lead.score as keyof typeof SCORE_CFG] || SCORE_CFG.warm;
          const ScoreIcon = scoreCfg.icon;
          const isAlert = alertLeadIds.has(lead.id);
          const isSelected = lead.id === selectedLeadId;
          const sellerName = lead.sellerId > 0 ? sellerMap[lead.sellerId] : null;

          return (
            <button
              key={lead.id}
              onClick={() => onSelectLead(lead.id)}
              className={`w-full text-left px-3 py-3 border-b border-border/50 transition-all hover:bg-accent/50 ${
                isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""
              } ${isAlert ? "bg-red-500/5" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${scoreCfg.bg} ${scoreCfg.border} border`}>
                  <ScoreIcon className={`w-5 h-5 ${scoreCfg.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground truncate">{lead.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {timeAgo(lead.lastContactDate || lead.createdAt)}
                    </span>
                  </div>

                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/70 truncate">
                        {lead.phone}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50">
                        Chegou: {new Date(lead.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {!lead.phone && (
                    <span className="text-[9px] text-muted-foreground/50 block">
                      Chegou: {new Date(lead.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lead.vehicleInterest && (
                      <span className="text-[11px] text-muted-foreground truncate flex-1">
                        {lead.vehicleInterest}
                      </span>
                    )}
                    {!lead.vehicleInterest && lead.notes && (
                      <span className="text-[11px] text-muted-foreground truncate flex-1">
                        {lead.notes.replace(/^Primeira mensagem:\s*/i, '').substring(0, 50)}
                      </span>
                    )}
                    {!lead.vehicleInterest && !lead.notes && (
                      <span className="text-[11px] text-muted-foreground/50 flex-1">Novo lead</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    {isAlert && (() => {
                      const mins = Math.floor((Date.now() - (lead.lastContactDate || new Date(lead.createdAt).getTime() || Date.now())) / 60000);
                      const threshold = lead.sellerId > 0 ? 10 : 5;
                      const remaining = Math.max(0, threshold - mins);
                      return (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {remaining > 0 ? `${remaining}min restante` : `${mins}min sem resposta`}
                        </span>
                      );
                    })()}
                    {!sellerName && lead.sellerId === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                        Novo
                      </span>
                    )}
                    {sellerName && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sellerColorMap[lead.sellerId] || 'bg-cyan-500/15 text-cyan-400'}`}>
                        {sellerName}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${scoreCfg.bg} ${scoreCfg.color}`}>
                      {scoreCfg.label}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {leads.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum lead encontrado</p>
          </div>
        )}
      </div>
    </>
  );
}

// ===== CHAT PANEL =====
function ChatPanel({ leadId, sellerId, onBack }: { leadId: number; sellerId?: number; onBack: () => void }) {
  const [message, setMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: lead } = trpc.crmLeads.getById.useQuery({ id: leadId });
  const { data: messages, refetch: refetchMessages } = trpc.crmChat.getMessages.useQuery(
    { leadId },
    { refetchInterval: 5000 }
  );
  const { data: sellers } = trpc.sellers.list.useQuery();

  const sendMessage = trpc.crmChat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
    },
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
  });

  const aiSuggest = trpc.crmAi.suggestReply.useMutation({
    onSuccess: (data) => { setAiSuggestion(data.suggestion); },
    onError: (e: any) => toast.error("Erro IA: " + e.message),
  });
  const { data: autoReplyData, refetch: refetchAutoReply } = trpc.crmAi.getAutoReply.useQuery({ leadId });
  const setAutoReplyMut = trpc.crmAi.setAutoReply.useMutation({
    onSuccess: () => { toast.success("Configura\u00e7\u00e3o salva!"); refetchAutoReply(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const handleAiSuggest = (customPrompt?: string) => {
    setShowAiSuggestion(true);
    setAiSuggestion("");
    aiSuggest.mutate({ leadId, customPrompt });
  };
  const handleUseAiSuggestion = () => {
    setMessage(aiSuggestion);
    setShowAiSuggestion(false);
    setAiCustomPrompt("");
  };
  const handleSendAiSuggestion = () => {
    if (!aiSuggestion.trim() || !lead?.phone) return;
    sendMessage.mutate({ leadId, message: aiSuggestion, sellerId: sellerId || 0 });
    setShowAiSuggestion(false);
    setAiSuggestion("");
    setAiCustomPrompt("");
  };

  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => toast.success("Lead transferido!"),
    onError: (e: any) => toast.error(e.message),
  });

  const updateScore = trpc.crmLeads.update.useMutation({
    onSuccess: () => toast.success("Score atualizado!"),
    onError: (e: any) => toast.error(e.message),
  });

  const sendImage = trpc.crmChat.sendImage.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Imagem enviada!"); },
    onError: (e: any) => toast.error("Erro ao enviar imagem: " + e.message),
  });
  const sendAudio = trpc.crmChat.sendAudio.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Áudio enviado!"); },
    onError: (e: any) => toast.error("Erro ao enviar áudio: " + e.message),
  });
  const sendVideo = trpc.crmChat.sendVideo.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Vídeo enviado!"); },
    onError: (e: any) => toast.error("Erro ao enviar vídeo: " + e.message),
  });
  const sendDoc = trpc.crmChat.sendDocument.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Documento enviado!"); },
    onError: (e: any) => toast.error("Erro ao enviar documento: " + e.message),
  });
  const sendVehicle = trpc.crmChat.sendVehicle.useMutation({
    onSuccess: (data: any) => { refetchMessages(); setShowVehicles(false); toast.success(`Veículo ${data.vehicleName} enviado!`); },
    onError: (e: any) => toast.error("Erro ao enviar veículo: " + e.message),
  });
  const { data: vehicles } = trpc.crmInventory.list.useQuery(undefined, { enabled: showVehicles });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (!vehicleSearch) return vehicles.filter((v: any) => v.status === "available");
    const q = vehicleSearch.toLowerCase();
    return vehicles.filter((v: any) => v.status === "available" && (`${v.brand} ${v.model}`.toLowerCase().includes(q) || v.plate?.toLowerCase().includes(q)));
  }, [vehicles, vehicleSearch]);

  const uploadMedia = trpc.crmChat.uploadMedia.useMutation();

  const handleFileUpload = async (file: File, type: "image" | "video" | "audio" | "document") => {
    setUploading(true);
    setShowAttach(false);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Remove data:...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadMedia.mutateAsync({ base64, filename: file.name, mimeType: file.type });
      if (type === "image") sendImage.mutate({ leadId, imageUrl: url, sellerId });
      else if (type === "audio") sendAudio.mutate({ leadId, audioUrl: url, sellerId });
      else if (type === "video") sendVideo.mutate({ leadId, videoUrl: url, sellerId });
      else sendDoc.mutate({ leadId, documentUrl: url, fileName: file.name, sellerId });
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) handleFileUpload(file, "image");
    else if (file.type.startsWith("video/")) handleFileUpload(file, "video");
    else handleFileUpload(file, "document");
    e.target.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("audio/")) handleFileUpload(file, "audio");
    else if (file.type.startsWith("video/")) handleFileUpload(file, "video");
    else if (file.type.startsWith("image/")) handleFileUpload(file, "image");
    else handleFileUpload(file, "document");
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) { toast.error("Áudio muito curto"); return; }
        setUploading(true);
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const ext = mimeType.includes("webm") ? "webm" : "ogg";
          const { url } = await uploadMedia.mutateAsync({ base64, filename: `audio-${Date.now()}.${ext}`, mimeType });
          sendAudio.mutate({ leadId, audioUrl: url, sellerId });
        } catch (err: any) {
          toast.error("Erro ao enviar áudio: " + err.message);
        } finally {
          setUploading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    audioChunksRef.current = [];
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate({ leadId, message: message.trim(), sellerId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of messages as Message[]) {
      const date = formatDate(msg.timestamp);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  const sellerMap = useMemo(() => {
    if (!sellers) return {} as Record<number, string>;
    return sellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [sellers]);

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const scoreCfg = SCORE_CFG[lead.score as keyof typeof SCORE_CFG] || SCORE_CFG.warm;
  const ScoreIcon = scoreCfg.icon;

  return (
    <>
      {/* Chat header */}
      <div className="border-b border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${scoreCfg.bg} ${scoreCfg.border} border`}>
            <ScoreIcon className={`w-4 h-4 ${scoreCfg.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground truncate">{lead.name}</span>
              {lead.vehicleInterest && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">• {lead.vehicleInterest}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{lead.phone}</span>
              <span>•</span>
              <span className={scoreCfg.color}>{scoreCfg.label}</span>
              <span>•</span>
              <span>{lead.stage}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {lead.phone && (
              <>
                <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                  className="p-2 rounded-lg hover:bg-green-500/10 text-green-400 transition-all" title="Abrir WhatsApp">
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href={`tel:${lead.phone}`}
                  className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-all" title="Ligar">
                  <Phone className="w-5 h-5" />
                </a>
              </>
            )}
            <button onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-lg transition-all ${showInfo ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"}`}>
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-1 py-3 space-y-1" style={{ backgroundColor: "#0b141a", backgroundImage: "url('data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M20 5 L20 8 M5 20 L8 20 M32 20 L35 20 M20 32 L20 35\' stroke=\'%23ffffff\' stroke-width=\'0.3\' opacity=\'0.04\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E')" }}>
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] text-gray-400 bg-[#182229] px-3 py-1 rounded-lg shadow-sm">
                    {group.date}
                  </span>
                </div>

                {group.messages.map((msg) => (
                  <div key={msg.id} className={`flex mb-2 px-2 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[85%] shadow-md px-3 py-2 ${
                      msg.direction === "outbound"
                        ? "bg-[#005c4b] text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-sm"
                        : "bg-[#1f2c33] text-gray-100 rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg"
                    }`}>
                      {msg.direction === "outbound" && (
                        <p className="text-[10px] font-semibold mb-1" style={{color: msg.senderName === "IA Kafka" ? "#a78bfa" : "#34d399"}}>
                          {msg.sentBy ? (sellerMap[msg.sentBy] || "Voc\u00ea") : (msg.senderName === "IA Kafka" ? "\u26a1 IA Kafka" : "\ud83d\udce4 Vendedor")}
                        </p>
                      )}
                      {msg.direction === "inbound" && (
                        <p className="text-[10px] font-semibold text-[#53bdeb] mb-1">
                          {msg.senderName || "Cliente"}
                        </p>
                      )}

                      <ChatMediaRendererFull msg={msg} />

                      {msg.content && msg.content !== "NULL" && msg.content.trim() !== "" ? (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : !msg.mediaUrl && msg.messageType !== "text" ? (
                        <p className="text-[12px] italic opacity-60">
                          {msg.messageType === "ptt" || msg.messageType === "audio" ? "🎤 Mensagem de voz" :
                           msg.messageType === "sticker" ? "Figurinha" :
                           msg.messageType === "location" ? "📍 Localização" :
                           msg.messageType === "contact" ? "👤 Contato compartilhado" :
                           msg.messageType === "poll" ? "📊 Enquete" :
                           msg.messageType === "product" ? "🛒 Produto" :
                           msg.messageType === "order" ? "📦 Pedido" :
                           msg.messageType === "document" ? "📄 Documento" :
                           msg.messageType === "image" ? "📷 Imagem" :
                           msg.messageType === "video" ? "🎥 Vídeo" :
                           null}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] opacity-60">
                          {formatTime(msg.timestamp)}
                        </span>
                        {msg.direction === "outbound" && (
                          <span className="text-[10px] opacity-60">\u2713\u2713</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {(!messages || messages.length === 0) && (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground/60">Envie a primeira mensagem para este lead</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Vehicle picker modal */}
          {showVehicles && (
            <div className="border-t border-border bg-card/95 backdrop-blur max-h-[300px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-bold text-foreground">🚗 Mandar Carro do Estoque</span>
                <button onClick={() => setShowVehicles(false)} className="p-1 hover:bg-accent rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-3 py-2">
                <Input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} placeholder="Buscar marca, modelo ou placa..." className="h-8 text-xs" />
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
                {filteredVehicles.map((v: any) => (
                  <button key={v.id} onClick={() => sendVehicle.mutate({ leadId, vehicleId: v.id, sellerId })}
                    disabled={sendVehicle.isPending}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-all text-left">
                    {v.photoUrl ? (
                      <img src={v.photoUrl} alt="" className="w-12 h-9 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-9 rounded bg-accent/50 flex items-center justify-center text-muted-foreground text-[10px]">🚗</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{v.brand} {v.model}</p>
                      <p className="text-[10px] text-muted-foreground">{v.year} • {v.mileage?.toLocaleString("pt-BR")} km • R$ {(v.price / 100).toLocaleString("pt-BR")}</p>
                    </div>
                  </button>
                ))}
                {filteredVehicles.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum veículo disponível</p>}
              </div>
            </div>
          )}

          {/* AI Auto-reply toggle - above input */}
          <div className="border-t border-border bg-card/95 flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Zap className={`w-3.5 h-3.5 ${autoReplyData?.enabled ? 'text-green-400' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${autoReplyData?.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                {autoReplyData?.enabled ? '⚡ IA Ativada' : 'IA Desativada'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setAutoReplyMut.mutate({ leadId, enabled: !autoReplyData?.enabled }); }}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer border-2 shrink-0 ${
                autoReplyData?.enabled 
                  ? 'bg-green-500 border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-transform duration-300 pointer-events-none ${
                autoReplyData?.enabled 
                  ? 'translate-x-5 bg-white' 
                  : 'translate-x-0.5 bg-gray-400'
              }`} />
            </button>
          </div>

          {/* Message input */}
          <div className="border-t border-border bg-card p-3">
            {uploading && (
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Enviando arquivo...
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* Attachment menu */}
              <div className="relative">
                <button onClick={() => { setShowAttach(!showAttach); setShowVehicles(false); }}
                  className="h-[42px] w-[42px] rounded-full flex items-center justify-center hover:bg-accent text-muted-foreground transition-all shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                {showAttach && (
                  <div className="absolute bottom-12 left-0 bg-popover border border-border rounded-xl shadow-xl p-2 min-w-[160px] z-50">
                    <button onClick={() => { imageInputRef.current?.click(); setShowAttach(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm text-foreground">
                      <Image className="w-4 h-4 text-blue-400" /> Foto / Vídeo
                    </button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowAttach(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm text-foreground">
                      <Paperclip className="w-4 h-4 text-orange-400" /> Arquivo
                    </button>
                    <button onClick={() => { setShowVehicles(true); setShowAttach(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm text-foreground">
                      <span className="text-base">🚗</span> Veículo do Estoque
                    </button>
                  </div>
                )}
              </div>

              <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
              <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileSelect} />

              {isRecording ? (
                <div className="flex-1 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-red-400">{formatRecTime(recordingTime)}</span>
                  <span className="text-xs text-muted-foreground">Gravando...</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={cancelRecording} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-red-400" title="Cancelar">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={stopRecording} className="h-8 w-8 rounded-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white" title="Enviar áudio">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleAiSuggest()}
                    disabled={aiSuggest.isPending}
                    className="h-[42px] w-[42px] rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center justify-center shrink-0 transition-all shadow-lg shadow-purple-500/20"
                    title="Sugestão da IA"
                  >
                    {aiSuggest.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <div className="flex-1 relative min-w-0">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite uma mensagem..."
                      rows={1}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      style={{ minHeight: 42, maxHeight: 120 }}
                    />
                  </div>
                  {message.trim() ? (
                    <Button
                      onClick={handleSend}
                      disabled={sendMessage.isPending}
                      className="h-[42px] w-[42px] rounded-full bg-green-600 hover:bg-green-700 p-0 shrink-0"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </Button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="h-[42px] w-[42px] rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shrink-0 transition-all"
                      title="Gravar áudio"
                    >
                      <Mic className="w-5 h-5 text-white" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* AI Suggestion Modal */}
        {showAiSuggestion && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAiSuggestion(false)}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Assistente IA de Vendas</h3>
                  <p className="text-xs text-muted-foreground">Sugestão de resposta para o cliente</p>
                </div>
                <button onClick={() => setShowAiSuggestion(false)} className="ml-auto p-1 hover:bg-accent rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {aiSuggest.isPending ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Analisando conversa e gerando sugestão...</p>
                  </div>
                ) : aiSuggestion ? (
                  <div className="space-y-3">
                    <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestion}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUseAiSuggestion} variant="outline" className="flex-1 text-sm">
                        Editar antes de enviar
                      </Button>
                      <Button onClick={handleSendAiSuggestion} className="flex-1 bg-green-600 hover:bg-green-700 text-sm">
                        <Send className="w-4 h-4 mr-1" /> Enviar direto
                      </Button>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-2">Pedir algo específico:</p>
                      <div className="flex gap-2">
                        <input
                          value={aiCustomPrompt}
                          onChange={e => setAiCustomPrompt(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && aiCustomPrompt.trim()) handleAiSuggest(aiCustomPrompt); }}
                          placeholder="Ex: Ofereça desconto, agende visita..."
                          className="flex-1 bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm"
                        />
                        <Button onClick={() => handleAiSuggest(aiCustomPrompt)} disabled={!aiCustomPrompt.trim()} size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Zap className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {["Quebrar objeção de preço", "Agendar visita", "Oferecer financiamento", "Criar urgência"].map(p => (
                          <button key={p} onClick={() => handleAiSuggest(p)} className="text-xs bg-accent hover:bg-accent/80 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Info sidebar */}
        {showInfo && (
          <LeadInfoSidebar
            lead={lead}
            sellers={sellers}
            sellerMap={sellerMap}
            onAssign={(sid) => assignLead.mutate({ leadId: lead.id, newSellerId: sid, currentSellerId: lead.sellerId })}
            onUpdateScore={(score) => updateScore.mutate({ id: lead.id, score: score as "hot" | "warm" | "cold" })}
            onClose={() => setShowInfo(false)}
          />
        )}
      </div>
    </>
  );
}

// ===== LEAD INFO SIDEBAR =====
function LeadInfoSidebar({ lead, sellers, sellerMap, onAssign, onUpdateScore, onClose }: {
  lead: any;
  sellers: any;
  sellerMap: Record<number, string>;
  onAssign: (sellerId: number) => void;
  onUpdateScore: (score: string) => void;
  onClose: () => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeConversation = trpc.crmPerformance.analyzeConversation.useMutation({
    onSuccess: (data) => { setAnalysis(data); setAnalyzing(false); },
    onError: (e: any) => { toast.error(e.message); setAnalyzing(false); },
  });

  const handleAnalyze = () => {
    setAnalyzing(true);
    analyzeConversation.mutate({ leadId: lead.id });
  };

  return (
    <div className="w-72 border-l border-border bg-card overflow-y-auto hidden lg:block">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Info do Cliente</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Lead info */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Nome</label>
            <p className="text-sm text-foreground font-medium">{lead.name}</p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Telefone</label>
            <p className="text-sm text-foreground">{lead.phone || "—"}</p>
          </div>
          {lead.vehicleInterest && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Veículo</label>
              <p className="text-sm text-foreground">{lead.vehicleInterest}</p>
            </div>
          )}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Origem</label>
            <p className="text-sm text-foreground flex items-center gap-1.5"><ChannelIcon source={lead.source} size={16} /> {SOURCE_CFG[lead.source]?.label || lead.source}</p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Etapa</label>
            <p className="text-sm text-foreground">{lead.stage}</p>
          </div>
        </div>

        {/* Score buttons */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase mb-1.5 block">Temperatura</label>
          <div className="flex gap-1.5">
            {(["hot", "warm", "cold"] as const).map(s => {
              const cfg = SCORE_CFG[s];
              const Icon = cfg.icon;
              return (
                <button key={s} onClick={() => onUpdateScore(s)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                    lead.score === s ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "bg-accent/30 border-border text-muted-foreground hover:bg-accent"
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Assign seller */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase mb-1.5 block">Vendedor</label>
          <select
            value={lead.sellerId || ""}
            onChange={e => { const v = parseInt(e.target.value); if (v) onAssign(v); }}
            className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground"
          >
            <option value="0">Sem vendedor</option>
            {sellers?.filter((s: any) => s.department === "vendas" && s.active).map((s: any) => (
              <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
            ))}
          </select>
        </div>

        {/* AI Analysis */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              <Bot className="w-3 h-3" /> Análise IA
            </label>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analisando..." : "Analisar"}
            </Button>
          </div>

          {analysis && (
            <div className="space-y-2">
              {/* Score circle */}
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                  analysis.score >= 7 ? "border-green-500 bg-green-500/10" :
                  analysis.score >= 4 ? "border-amber-500 bg-amber-500/10" :
                  "border-red-500 bg-red-500/10"
                }`}>
                  <span className={`text-xl font-bold ${
                    analysis.score >= 7 ? "text-green-400" :
                    analysis.score >= 4 ? "text-amber-400" :
                    "text-red-400"
                  }`}>{analysis.score}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-foreground leading-relaxed">{analysis.analysis}</p>
                </div>
              </div>

              {/* Strengths */}
              {analysis.strengths?.length > 0 && (
                <div>
                  <p className="text-[10px] text-green-400 font-medium mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Pontos fortes
                  </p>
                  {analysis.strengths.map((s: string, i: number) => (
                    <p key={i} className="text-[10px] text-muted-foreground pl-4">• {s}</p>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {analysis.improvements?.length > 0 && (
                <div>
                  <p className="text-[10px] text-amber-400 font-medium mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Melhorar
                  </p>
                  {analysis.improvements.map((s: string, i: number) => (
                    <p key={i} className="text-[10px] text-muted-foreground pl-4">• {s}</p>
                  ))}
                </div>
              )}

              {/* Tips */}
              {analysis.tips?.length > 0 && (
                <div>
                  <p className="text-[10px] text-primary font-medium mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Dicas
                  </p>
                  {analysis.tips.map((s: string, i: number) => (
                    <p key={i} className="text-[10px] text-muted-foreground pl-4">• {s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== EMPTY CHAT =====
function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-10 h-10 text-green-500/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">CRM WhatsApp</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Selecione um lead para ver o histórico de conversas e enviar mensagens
        </p>
      </div>
    </div>
  );
}

// ===== PERFORMANCE DASHBOARD =====
export function PerformanceDashboard() {
  const { data: stats } = trpc.crmPerformance.getAllSellersStats.useQuery();
  const { data: alerts } = trpc.crmPerformance.getAlerts.useQuery({ thresholdMinutes: 5 });

  if (!stats) return <div className="animate-pulse text-muted-foreground text-sm p-4">Carregando...</div>;

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> Performance da Equipe
      </h3>

      {/* Alert banner */}
      {alerts && alerts.length > 0 && (
        <div className="rounded-xl border-2 border-red-500/40 bg-red-500/5 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-400">{alerts.length} leads sem resposta</p>
            <p className="text-[10px] text-red-400/70">Leads aguardando resposta há mais de 5 minutos</p>
          </div>
        </div>
      )}

      {/* Seller cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((s: any) => (
          <div key={s.sellerId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-foreground">{s.sellerName}</p>
                <p className="text-[10px] text-muted-foreground">{s.department === "pre_vendas" ? "SDR" : "Vendedor"}</p>
              </div>
              {/* Score badge */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                s.conversionRate >= 30 ? "border-green-500 bg-green-500/10" :
                s.conversionRate >= 15 ? "border-amber-500 bg-amber-500/10" :
                "border-red-500 bg-red-500/10"
              }`}>
                <span className={`text-sm font-bold ${
                  s.conversionRate >= 30 ? "text-green-400" :
                  s.conversionRate >= 15 ? "text-amber-400" :
                  "text-red-400"
                }`}>{s.conversionRate}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{s.totalLeads}</p>
                <p className="text-[9px] text-muted-foreground">Leads</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${s.avgResponseMinutes <= 5 ? "text-green-400" : s.avgResponseMinutes <= 10 ? "text-amber-400" : "text-red-400"}`}>
                  {s.avgResponseMinutes}min
                </p>
                <p className="text-[9px] text-muted-foreground">Tempo Resp.</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{s.respondedLeads}</p>
                <p className="text-[9px] text-muted-foreground">Respondidos</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sem dados de performance ainda</p>
        </div>
      )}
    </div>
  );
}
