import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Send, ArrowLeft, Phone, MessageCircle, Clock, Flame, Thermometer, Snowflake,
  User, Bot, Star, AlertTriangle, ChevronDown, Image, Paperclip, Search,
  X, Filter, Users, Zap, TrendingUp, CheckCircle, XCircle, BarChart3
} from "lucide-react";

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
  const { data: allLeads } = trpc.crmLeads.listAll.useQuery({ archived: false });
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
    // Sort: alerts first, then by lastContactDate desc
    return [...base].sort((a: any, b: any) => {
      const aAlert = alertLeadIds.has(a.id) ? 1 : 0;
      const bAlert = alertLeadIds.has(b.id) ? 1 : 0;
      if (aAlert !== bAlert) return bAlert - aAlert;
      const aTime = a.lastContactDate || new Date(a.createdAt).getTime();
      const bTime = b.lastContactDate || new Date(b.createdAt).getTime();
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

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lead.vehicleInterest && (
                      <span className="text-[11px] text-muted-foreground truncate flex-1">
                        {lead.vehicleInterest}
                      </span>
                    )}
                    {!lead.vehicleInterest && lead.notes && (
                      <span className="text-[11px] text-muted-foreground truncate flex-1">
                        {lead.notes.substring(0, 50)}
                      </span>
                    )}
                    {!lead.vehicleInterest && !lead.notes && (
                      <span className="text-[11px] text-muted-foreground/50 flex-1">Sem mensagens</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    {isAlert && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center gap-0.5 animate-pulse">
                        <AlertTriangle className="w-2.5 h-2.5" /> SEM RESPOSTA
                      </span>
                    )}
                    {!sellerName && lead.sellerId === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                        Novo
                      </span>
                    )}
                    {sellerName && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: lead } = trpc.crmLeads.getById.useQuery({ id: leadId });
  const { data: messages, refetch: refetchMessages } = trpc.crmChat.getMessages.useQuery(
    { leadId },
    { refetchInterval: 5000 } // Poll every 5s for new messages
  );
  const { data: sellers } = trpc.sellers.list.useQuery();

  const sendMessage = trpc.crmChat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
    },
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
  });

  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => toast.success("Lead transferido!"),
    onError: (e: any) => toast.error(e.message),
  });

  const updateScore = trpc.crmLeads.update.useMutation({
    onSuccess: () => toast.success("Score atualizado!"),
    onError: (e: any) => toast.error(e.message),
  });

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
          <button onClick={onBack} className="md:hidden p-1 hover:bg-accent rounded-lg">
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
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(16,185,129,0.03), transparent 50%)" }}>
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] text-muted-foreground bg-accent/80 px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>

                {group.messages.map((msg) => (
                  <div key={msg.id} className={`flex mb-1.5 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      msg.direction === "outbound"
                        ? "bg-green-600/90 text-white rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    }`}>
                      {msg.direction === "outbound" && msg.sentBy && (
                        <p className="text-[9px] font-medium opacity-70 mb-0.5">
                          {sellerMap[msg.sentBy] || "Você"}
                        </p>
                      )}
                      {msg.direction === "inbound" && msg.senderName && (
                        <p className="text-[9px] font-medium text-primary mb-0.5">
                          {msg.senderName}
                        </p>
                      )}

                      {msg.mediaUrl && msg.messageType === "image" && (
                        <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full mb-1" style={{ maxHeight: 200 }} />
                      )}
                      {msg.mediaUrl && msg.messageType !== "image" && (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener"
                          className="flex items-center gap-1.5 text-xs underline mb-1">
                          <Paperclip className="w-3 h-3" /> Arquivo
                        </a>
                      )}

                      {msg.content && (
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      <p className={`text-[9px] mt-0.5 text-right ${msg.direction === "outbound" ? "opacity-60" : "text-muted-foreground"}`}>
                        {formatTime(msg.timestamp)}
                      </p>
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

          {/* Message input */}
          <div className="border-t border-border bg-card p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
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
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="h-[42px] w-[42px] rounded-full bg-green-600 hover:bg-green-700 p-0 shrink-0"
              >
                <Send className="w-5 h-5 text-white" />
              </Button>
            </div>
          </div>
        </div>

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
          <h3 className="text-sm font-bold text-foreground">Detalhes do Lead</h3>
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
            <p className="text-sm text-foreground">{SOURCE_CFG[lead.source]?.label || lead.source}</p>
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
