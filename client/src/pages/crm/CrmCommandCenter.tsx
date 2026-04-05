import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Search, Phone, MessageCircle, Calendar, ChevronRight, Flame, Thermometer,
  Snowflake, Plus, ArrowLeft, Clock, AlertTriangle, User, Car,
  Mic, MicOff, LayoutGrid, List, Eye, TrendingUp, Target, Image,
  Zap, Bell, BellRing, Timer, CheckCircle, ArrowUpRight, BarChart3,
  MessageSquare, Send, X, ChevronDown, FileText, UserPlus, ArrowRightLeft, Paperclip,
  Volume2, Download, Play, File, Square, Handshake, Power, Shuffle, CheckCheck, CreditCard
} from "lucide-react";
import { ChannelIcon, ChannelBadge, ChannelIndicator } from "@/components/ChannelIcon";

// Detect media type from URL extension as fallback
function detectMediaTypeFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/)) return "image";
  if (lower.match(/\.(ogg|mp3|wav|m4a|aac|opus|webm)/)) return "audio";
  if (lower.match(/\.(mp4|avi|mov|mkv|3gp)/)) return "video";
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)/)) return "document";
  return null;
}

// Reusable media renderer for chat messages
function ChatMediaRenderer({ msg }: { msg: any }) {
  if (!msg.mediaUrl) return null;
  
  // Determine effective type: use messageType, fallback to URL detection
  const effectiveType = (msg.messageType && msg.messageType !== "text")
    ? msg.messageType
    : detectMediaTypeFromUrl(msg.mediaUrl) || msg.messageType;
  
  if (effectiveType === "image") {
    return (
      <a href={msg.mediaUrl} target="_blank" rel="noopener" className="block mb-1">
        <img
          src={msg.mediaUrl}
          alt=""
          className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
          style={{ maxHeight: 200 }}
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden items-center gap-2 text-xs bg-black/20 rounded-lg px-3 py-2">
          <Image className="w-4 h-4 text-blue-400" />
          <span>Imagem</span>
          <Download className="w-3 h-3 ml-auto" />
        </div>
      </a>
    );
  }
  
  if (effectiveType === "audio" || effectiveType === "ptt") {
    return (
      <div className="mb-1">
        <div className="flex items-center gap-2 bg-black/10 rounded-xl px-2 py-1.5" style={{ minWidth: 200, maxWidth: 260 }}>
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
        <video
          controls
          preload="metadata"
          className="rounded-lg max-w-full"
          style={{ maxHeight: 200, maxWidth: 240 }}
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        >
          <source src={msg.mediaUrl} />
        </video>
        <a href={msg.mediaUrl} target="_blank" rel="noopener" className="hidden items-center gap-2 text-xs bg-black/20 rounded-lg px-3 py-2">
          <Play className="w-4 h-4 text-blue-400" /> Vídeo <Download className="w-3 h-3 ml-auto" />
        </a>
      </div>
    );
  }
  
  if (effectiveType === "sticker") {
    return <img src={msg.mediaUrl} alt="sticker" className="mb-1" style={{ maxHeight: 100, maxWidth: 100 }} />;
  }
  
  // Document or unknown with media URL
  const fileName = msg.mediaUrl.split("/").pop()?.split("?")[0] || "Arquivo";
  const ext = fileName.split(".").pop()?.toUpperCase() || "";
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

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  manual: { label: "Manual", color: "text-gray-400", bg: "bg-gray-500/20" },
  whatsapp: { label: "WhatsApp", color: "text-green-400", bg: "bg-green-500/20" },
  olx: { label: "OLX", color: "text-orange-400", bg: "bg-orange-500/20" },
  webmotors: { label: "Webmotors", color: "text-blue-400", bg: "bg-blue-500/20" },
  socarrao: { label: "SóCarrão", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  facebook: { label: "Facebook", color: "text-blue-500", bg: "bg-blue-600/20" },
  instagram: { label: "Instagram", color: "text-pink-400", bg: "bg-pink-500/20" },
  instagram_ads: { label: "Insta Ads", color: "text-pink-400", bg: "bg-pink-500/20" },
  facebook_ads: { label: "FB Ads", color: "text-blue-500", bg: "bg-blue-600/20" },
  google_ads: { label: "Google Ads", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  trafego_pago: { label: "Tráfego Pago", color: "text-purple-400", bg: "bg-purple-500/20" },
  indicacao: { label: "Indicação", color: "text-cyan-400", bg: "bg-cyan-500/20" },
  loja: { label: "Loja", color: "text-amber-400", bg: "bg-amber-500/20" },
  landing_page: { label: "Landing Page", color: "text-indigo-400", bg: "bg-indigo-500/20" },
  icarros: { label: "iCarros", color: "text-red-400", bg: "bg-red-500/20" },
  manychat: { label: "ManyChat", color: "text-blue-300", bg: "bg-blue-400/20" },
  webhook: { label: "API", color: "text-violet-400", bg: "bg-violet-500/20" },
};

const SCORE_CONFIG = {
  hot: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "bg-red-500/20 text-red-400 border-red-500/30", glow: "shadow-red-500/20" },
  warm: { label: "Morno", icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", glow: "shadow-amber-500/20" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", glow: "shadow-blue-500/20" },
};

function timeAgo(ts: number | null | undefined) {
  if (!ts) return "Sem contato";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days}d`;
}

function minutesSinceCreation(createdAt: any): number {
  if (!createdAt) return 999;
  const ts = typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime();
  return Math.floor((Date.now() - ts) / (1000 * 60));
}

type TabView = "dashboard" | "leads" | "pipeline" | "templates" | "fichas";
type AssignmentFilter = "all" | "unassigned" | "assigned";
type LeadStatusFilter = "all" | "accepted" | "pending";

function formatChatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatChatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ===== INLINE CHAT PANEL =====
function InlineChatPanel({ leadId, sellerId, onClose }: { leadId: number; sellerId: number; onClose: () => void }) {
  const [message, setMessage] = useState("");
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
    { leadId }, { refetchInterval: 5000 }
  );
  const { data: sellers } = trpc.sellers.list.useQuery();
  const sellerMap = useMemo(() => {
    if (!sellers) return {} as Record<number, string>;
    return sellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [sellers]);

  const sendMsg = trpc.crmChat.sendMessage.useMutation({
    onSuccess: () => { setMessage(""); refetchMessages(); },
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
  });

  const aiSuggest = trpc.crmAi.suggestReply.useMutation({
    onSuccess: (data) => { setAiSuggestion(data.suggestion); },
    onError: (e: any) => toast.error("Erro IA: " + e.message),
  });
  const { data: autoReplyData, refetch: refetchAutoReply } = trpc.crmAi.getAutoReply.useQuery({ leadId });
  const setAutoReply = trpc.crmAi.setAutoReply.useMutation({
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
    sendMsg.mutate({ leadId, message: aiSuggestion, sellerId });
    setShowAiSuggestion(false);
    setAiSuggestion("");
    setAiCustomPrompt("");
  };

  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => toast.success("Lead transferido!"),
    onError: (e: any) => toast.error(e.message),
  });

  const sendImage = trpc.crmChat.sendImage.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Imagem enviada!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const sendAudioMut = trpc.crmChat.sendAudio.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Áudio enviado!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const sendVideo = trpc.crmChat.sendVideo.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Vídeo enviado!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const sendDoc = trpc.crmChat.sendDocument.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Documento enviado!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const sendVehicle = trpc.crmChat.sendVehicle.useMutation({
    onSuccess: (data: any) => {
      setShowVehicles(false);
      toast.success(`Veículo ${data.vehicleName} enviado! ${data.photosSent}/${data.photosTotal} fotos`);
      // Delay refetch to ensure all photos are saved in DB
      setTimeout(() => refetchMessages(), 2000);
      setTimeout(() => refetchMessages(), 5000);
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const uploadMedia = trpc.crmChat.uploadMedia.useMutation();
  const { data: vehicles } = trpc.crmInventory.list.useQuery(undefined, { enabled: showVehicles });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (!vehicleSearch) return vehicles.filter((v: any) => v.status === "available");
    const q = vehicleSearch.toLowerCase();
    return vehicles.filter((v: any) => v.status === "available" && (`${v.brand} ${v.model}`.toLowerCase().includes(q) || v.plate?.toLowerCase().includes(q)));
  }, [vehicles, vehicleSearch]);

  const handleFileUpload = async (file: File, type: "image" | "video" | "audio" | "document") => {
    setUploading(true);
    setShowAttach(false);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => { resolve((reader.result as string).split(",")[1]); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadMedia.mutateAsync({ base64, filename: file.name, mimeType: file.type });
      if (type === "image") sendImage.mutate({ leadId, imageUrl: url, sellerId });
      else if (type === "audio") sendAudioMut.mutate({ leadId, audioUrl: url, sellerId });
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
          sendAudioMut.mutate({ leadId, audioUrl: url, sellerId });
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMsg.mutate({ leadId, message: message.trim(), sellerId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = "";
    for (const msg of messages as any[]) {
      const date = formatChatDate(msg.timestamp);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  const scoreCfg = lead ? (SCORE_CONFIG[lead.score as keyof typeof SCORE_CONFIG] || SCORE_CONFIG.warm) : SCORE_CONFIG.warm;

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border flex flex-col" style={{ maxHeight: "90vh", height: "90vh" }} onClick={e => e.stopPropagation()}>
        {/* Chat header */}
        <div className="border-b border-border bg-gradient-to-r from-card to-card/90 px-3 py-2.5 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              lead?.score === 'hot' ? 'bg-red-500/15' : lead?.score === 'cold' ? 'bg-blue-500/15' : 'bg-amber-500/15'
            }`}>
              <span className={`text-sm font-bold ${
                lead?.score === 'hot' ? 'text-red-400' : lead?.score === 'cold' ? 'text-blue-400' : 'text-amber-400'
              }`}>{(lead?.name || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground truncate">{lead?.name || "..."}</span>
                <scoreCfg.icon className={`w-3 h-3 shrink-0 ${scoreCfg.color}`} />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {lead?.source && lead.source !== 'manual' && (
                  <ChannelIcon source={lead.source} size={12} />
                )}
                <span>{lead?.phone}</span>
                <span className="text-muted-foreground/30">•</span>
                <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                  lead?.stage === 'novo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/10 text-primary'
                }`}>{lead?.stage}</span>
                {lead?.vehicleInterest && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <span className="truncate text-muted-foreground/70">{lead.vehicleInterest}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {lead?.phone && (
                <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                  className="p-2 rounded-lg hover:bg-green-500/10 text-green-400" title="Abrir WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {lead?.phone && (
                <a href={`tel:${lead.phone}`}
                  className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400" title="Ligar">
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-1 py-3 space-y-1" style={{ backgroundColor: "#0b141a" }}>
          {groupedMessages.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center justify-center my-3">
                <span className="text-[10px] text-gray-400 bg-[#182229] px-3 py-1 rounded-lg shadow-sm">{group.date}</span>
              </div>
              {group.messages.map((msg: any) => (
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
                      <p className="text-[10px] font-semibold text-[#53bdeb] mb-1">{msg.senderName || "Cliente"}</p>
                    )}
                    <ChatMediaRenderer msg={msg} />
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
                      <span className="text-[10px] opacity-60">{formatChatTime(msg.timestamp)}</span>
                      {msg.direction === "outbound" && <span className="text-[10px] opacity-60">\u2713\u2713</span>}
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

        {/* Vehicle picker */}
        {showVehicles && (
          <div className="border-t border-border bg-card/95 backdrop-blur max-h-[250px] overflow-hidden flex flex-col shrink-0">
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

        {/* Message input */}
        <div className="border-t border-border bg-card p-3 rounded-b-2xl shrink-0">
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
                {message.trim() ? (
                  <Button
                    onClick={handleSend}
                    disabled={sendMsg.isPending}
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

          {/* AI Auto-reply toggle */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${autoReplyData?.enabled ? 'text-green-400' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${autoReplyData?.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                {autoReplyData?.enabled ? '⚡ IA Ativada' : 'IA Desativada'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAutoReply.mutate({ leadId, enabled: !autoReplyData?.enabled }); }}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer z-10 border-2 ${
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
    </div>
  );
}

export default function CrmCommandCenter() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [filterScore, setFilterScore] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>("leads");
  const [showTemplates, setShowTemplates] = useState<number | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatusFilter>("all");
  const [chatLeadId, setChatLeadId] = useState<number | null>(null);

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const sellerId = sellerSession?.id || 0;
  const dept = sellerSession?.department || "vendas";
  const isSDR = dept === "pre_vendas";
  const { isSupported: pushSupported, isSubscribed, subscribe: subscribePush, permission } = usePushNotifications(sellerId || undefined);

  // SDRs see ALL leads via listForSDR, sellers see their own
  const { data: sellerLeads, refetch: refetchSellerLeads } = trpc.crmLeads.listBySeller.useQuery(
    { sellerId, archived: false }, { enabled: sellerId > 0 && !isSDR, refetchInterval: 5000 }
  );
  const { data: sdrLeads, refetch: refetchSDR } = trpc.crmLeads.listForSDR.useQuery(
    { archived: false }, { enabled: isSDR && sellerId > 0, refetchInterval: 5000 }
  );
  const leads = isSDR ? sdrLeads : sellerLeads;
  const refetchLeads = isSDR ? refetchSDR : refetchSellerLeads;

  // Sellers list for SDR assign dropdown
  const { data: allSellers } = trpc.sellers.list.useQuery({ activeOnly: true }, { enabled: isSDR });
  const vendorSellers = useMemo(() => {
    if (!allSellers) return [];
    return allSellers.filter((s: any) => s.department === "vendas" && s.active);
  }, [allSellers]);
  const sellerMap = useMemo(() => {
    if (!allSellers) return {} as Record<number, string>;
    return allSellers.reduce((acc: Record<number, string>, s: any) => { acc[s.id] = s.nickname || s.name; return acc; }, {});
  }, [allSellers]);

  const { data: followUps } = trpc.crmLeads.getFollowUps.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: dept });
  const { data: searchResults } = trpc.crmLeads.search.useQuery(
    { query: searchQuery, sellerId: isSDR ? undefined : sellerId }, { enabled: searchQuery.length >= 2 }
  );
  const { data: stats } = trpc.crmLeads.getStats.useQuery(
    { sellerId: isSDR ? undefined : sellerId }, { enabled: sellerId > 0 }
  );
  const { data: inventoryAlerts } = trpc.crmInventory.getAlerts.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: templates } = trpc.crmTemplates.list.useQuery({ department: dept });
  const { data: sellerDashboard } = trpc.crmSellerStats.getDashboard.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );
  const { data: overdueTasks } = trpc.crmFollowUp.listOverdue.useQuery(
    { sellerId }, { enabled: sellerId > 0 && !isSDR }
  );

  // Assign lead mutation for SDR
  const assignLead = trpc.crmLeads.assignToSeller.useMutation({
    onSuccess: () => { refetchLeads(); toast.success("Lead atribuído com sucesso!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Leads with urgency alerts + assignment filter
  const { urgentLeads, warningLeads, normalLeads, filteredLeads, assignmentStats, acceptedCount, pendingCount } = useMemo(() => {
    const displayLeads = searchQuery.length >= 2 ? searchResults : leads;
    if (!displayLeads) return { urgentLeads: [], warningLeads: [], normalLeads: [], filteredLeads: [], assignmentStats: { total: 0, unassigned: 0, assigned: 0 }, acceptedCount: 0, pendingCount: 0 };

    // Assignment stats
    const total = displayLeads.length;
    const unassigned = displayLeads.filter((l: any) => l.sellerId === 0).length;
    const assigned = total - unassigned;

    // Apply assignment filter for SDR
    let filtered = displayLeads;
    if (isSDR && assignmentFilter !== "all") {
      filtered = assignmentFilter === "unassigned"
        ? displayLeads.filter((l: any) => l.sellerId === 0)
        : displayLeads.filter((l: any) => l.sellerId > 0);
    }

    const urgent: any[] = [];
    const warning: any[] = [];
    const normal: any[] = [];

    filtered.forEach((lead: any) => {
      const mins = minutesSinceCreation(lead.createdAt);
      const lastContact = lead.lastContactDate ? Math.floor((Date.now() - lead.lastContactDate) / (1000 * 60)) : 999;
      if (lastContact === 999 && mins >= 10) {
        urgent.push({ ...lead, _alertType: "transfer" });
      } else if (lastContact === 999 && mins >= 5) {
        warning.push({ ...lead, _alertType: "priority" });
      } else {
        normal.push(lead);
      }
    });

    let all = [...urgent, ...warning, ...normal];
    if (filterScore) all = all.filter(l => l.score === filterScore);
    if (filterSource) all = all.filter(l => l.source === filterSource);
    // Lead status filter (accepted/pending) for non-SDR sellers
    if (!isSDR && leadStatusFilter === "accepted") {
      all = all.filter(l => l.acknowledgedAt);
    } else if (!isSDR && leadStatusFilter === "pending") {
      all = all.filter(l => !l.acknowledgedAt);
    }

    // Compute accepted/pending counts
    const baseForCount = [...urgent, ...warning, ...normal];
    const acceptedCount = baseForCount.filter(l => l.acknowledgedAt).length;
    const pendingCount = baseForCount.filter(l => !l.acknowledgedAt).length;

    return { urgentLeads: urgent, warningLeads: warning, normalLeads: normal, filteredLeads: all, assignmentStats: { total, unassigned, assigned }, acceptedCount, pendingCount };
  }, [leads, searchResults, searchQuery, filterScore, filterSource, isSDR, assignmentFilter, leadStatusFilter]);

  const moveStage = trpc.crmLeads.moveStage.useMutation({
    onSuccess: () => { refetchLeads(); toast.success("Etapa atualizada!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const addActivity = trpc.crmLeads.addActivity.useMutation({
    onSuccess: () => { refetchLeads(); },
  });
  const renderTemplateQuery = trpc.useUtils();

  const handleWhatsApp = useCallback((lead: any, customMsg?: string) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    const msg = customMsg || `Olá ${lead.name}! Tudo bem? Aqui é da Kafka Multimarcas.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "whatsapp", description: "WhatsApp enviado" });
  }, [sellerId, addActivity]);

  const handleCall = useCallback((lead: any) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`tel:+55${phone}`, "_self");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "ligacao", description: "Ligação realizada" });
  }, [sellerId, addActivity]);

  const handleTemplateSelect = async (lead: any, templateId: number) => {
    try {
      const result = await renderTemplateQuery.crmTemplates.render.fetch({ templateId, leadId: lead.id, sellerId });
      handleWhatsApp(lead, result.text);
      setShowTemplates(null);
    } catch {
      toast.error("Erro ao carregar template");
    }
  };

  const handleAssign = useCallback((leadId: number, newSellerId: number) => {
    assignLead.mutate({ leadId, newSellerId, currentSellerId: sellerId });
  }, [assignLead, sellerId]);

  if (!sellerSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Faça login para acessar o CRM</p>
          <Button onClick={() => navigate("/login-vendedor")} className="racing-gradient text-white">Fazer Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header fixo mobile */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{isSDR ? 'Meus Leads' : 'Meus Clientes'}</h1>
              <p className="text-[10px] text-muted-foreground/70">{sellerSession.nickname || sellerSession.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {pushSupported && !isSubscribed && permission !== "denied" && (
              <button
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) toast.success("Notificações ativadas! Você será avisado de novos leads.");
                }}
                className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Ativar notificações de leads"
              >
                <Bell className="w-4.5 h-4.5 text-amber-400" />
              </button>
            )}
            {isSubscribed && (
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <BellRing className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            {(urgentLeads.length > 0 || warningLeads.length > 0) && (
              <div className="relative p-1.5">
                <Bell className="w-5 h-5 text-red-400 animate-pulse" />
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                  {urgentLeads.length + warningLeads.length}
                </span>
              </div>
            )}
            <Button size="sm" onClick={() => setShowNewLead(true)} className="racing-gradient text-white h-8 px-3 text-xs font-semibold shadow-md">
              <Plus className="w-3.5 h-3.5 mr-1" /> Lead
            </Button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex px-2 gap-1 pb-2">
          {[
            { key: "dashboard" as TabView, label: "Resumo", icon: BarChart3 },
            { key: "leads" as TabView, label: "Clientes", icon: User },
            { key: "pipeline" as TabView, label: "Etapas", icon: Target },
            { key: "fichas" as TabView, label: "Fichas", icon: CreditCard },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-primary/15 text-primary border border-primary/25 shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 border border-transparent"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* URGENT ALERTS */}
      {urgentLeads.length > 0 && (
        <div className="mx-3 mt-3 rounded-xl overflow-hidden shadow-lg shadow-red-500/10">
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-500/25 flex items-center justify-center">
                  <Timer className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-red-400 tracking-wide block">
                    {urgentLeads.length} lead(s) urgente(s)
                  </span>
                  <span className="text-[9px] text-red-300/60">Serão transferidos automaticamente</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {urgentLeads.slice(0, 3).map((lead: any) => (
                <div key={lead.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-red-500/10">
                  <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-red-400">{(lead.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground truncate block">{lead.name}</span>
                    <span className="text-[10px] text-red-300/80">{minutesSinceCreation(lead.createdAt)}min sem resposta</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setChatLeadId(lead.id)} className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 transition-all" title="Chat">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button onClick={() => handleCall(lead)} className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all">
                      <Phone className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WARNING ALERTS */}
      {warningLeads.length > 0 && (
        <div className="mx-3 mt-2 rounded-xl overflow-hidden">
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-400 block">
                  {warningLeads.length} lead(s) aguardando 5min+
                </span>
                <span className="text-[9px] text-amber-300/50">Conversão cai 80% após 5 minutos</span>
              </div>
            </div>
            <div className="space-y-1">
              {warningLeads.slice(0, 3).map((lead: any) => (
                <div key={lead.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-amber-500/5">
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-amber-400">{(lead.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                    <span className="text-[10px] text-amber-300/70">{minutesSinceCreation(lead.createdAt)}min</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setChatLeadId(lead.id)} className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 transition-all" title="Chat">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button onClick={() => handleCall(lead)} className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 active:scale-95 transition-all">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === "dashboard" && (
        isSDR ? (
          <SDRDashboard
            stats={stats}
            assignmentStats={assignmentStats}
            leads={leads || []}
            sellerMap={sellerMap}
            vendorSellers={vendorSellers}
            onAssign={handleAssign}
            onWhatsApp={handleWhatsApp}
            onCall={handleCall}
            sellerId={sellerId}
            department={dept}
          />
        ) : (
          <SellerDashboard
            dashboard={sellerDashboard}
            stats={stats}
            followUps={followUps}
            overdueTasks={overdueTasks}
            inventoryAlerts={inventoryAlerts}
            onWhatsApp={handleWhatsApp}
            onCall={handleCall}
            sellerId={sellerId}
            leads={leads}
          />
        )
      )}

      {activeTab === "leads" && (
        <div className="px-3 mt-3">
          {/* Seller: Accepted/Pending filter */}
          {!isSDR && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              <button onClick={() => setLeadStatusFilter("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${leadStatusFilter === "all" ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <LayoutGrid className="w-3 h-3" /> Todos {(leads || []).length}
              </button>
              <button onClick={() => setLeadStatusFilter("accepted")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${leadStatusFilter === "accepted" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <CheckCheck className="w-3 h-3" /> Aceitos {acceptedCount}
              </button>
              <button onClick={() => setLeadStatusFilter("pending")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${leadStatusFilter === "pending" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <Clock className="w-3 h-3" /> Pendentes {pendingCount}
              </button>
            </div>
          )}
          {/* SDR Assignment filter */}
          {isSDR && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              <button onClick={() => setAssignmentFilter("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${assignmentFilter === "all" ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <LayoutGrid className="w-3 h-3" /> Todos ({assignmentStats.total})
              </button>
              <button onClick={() => setAssignmentFilter("unassigned")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${assignmentFilter === "unassigned" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <UserPlus className="w-3 h-3" /> Novos ({assignmentStats.unassigned})
              </button>
              <button onClick={() => setAssignmentFilter("assigned")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${assignmentFilter === "assigned" ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-accent/50 border-border text-muted-foreground"}`}>
                <CheckCircle className="w-3 h-3" /> Atribuídos ({assignmentStats.assigned})
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar nome, telefone, placa..." className="pl-9 h-9 text-sm bg-accent/50 border-border" />
          </div>

          {/* Source filters */}
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterSource(null)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${!filterSource ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              Todas origens
            </button>
            {Object.entries(SOURCE_LABELS).filter(([key]) => {
              if (!leads) return false;
              return leads.some((l: any) => l.source === key);
            }).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilterSource(filterSource === key ? null : key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1.5 ${filterSource === key ? `${cfg.bg} ${cfg.color} border-current` : "bg-accent/50 border-border text-muted-foreground"}`}>
                <ChannelIcon source={key} size={13} />
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Score filters */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterScore(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!filterScore ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              Todos {stats?.total || 0}
            </button>
            {(["hot", "warm", "cold"] as const).map(s => {
              const cfg = SCORE_CONFIG[s];
              const count = stats?.[s] || 0;
              return (
                <button key={s} onClick={() => setFilterScore(filterScore === s ? null : s)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${filterScore === s ? cfg.badge : "bg-accent/50 border-border text-muted-foreground"}`}>
                  <cfg.icon className="w-3 h-3" /> {cfg.label} {count}
                </button>
              );
            })}
          </div>

          {/* Lead list */}
          <div className="space-y-2">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead: any) => (
                <LeadCard key={lead.id} lead={lead} stages={stages || []} sellerId={sellerId}
                  templates={templates || []}
                  isSDR={isSDR}
                  vendorSellers={vendorSellers}
                  sellerMap={sellerMap}
                  onWhatsApp={() => handleWhatsApp(lead)} onCall={() => handleCall(lead)}
                  onChat={() => setChatLeadId(lead.id)}
                  onMoveStage={(newStage) => moveStage.mutate({ id: lead.id, newStage, sellerId })}
                  onView={() => navigate(`/crm/lead/${lead.id}`)}
                  onTemplateSelect={(tId) => handleTemplateSelect(lead, tId)}
                  onAssign={(newSellerId) => handleAssign(lead.id, newSellerId)}
                  showTemplates={showTemplates === lead.id}
                  onToggleTemplates={() => setShowTemplates(showTemplates === lead.id ? null : lead.id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{searchQuery ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}</p>
                <Button size="sm" onClick={() => setShowNewLead(true)} variant="outline" className="mt-3">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Lead
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "pipeline" && (
        <PipelineView sellerId={sellerId} dept={dept} stages={stages || []} leads={filteredLeads || []}
          isSDR={isSDR} sellerMap={sellerMap}
          onMoveStage={(id, stage) => moveStage.mutate({ id, newStage: stage, sellerId })}
          onView={(id) => navigate(`/crm/lead/${id}`)} />
      )}

      {activeTab === "fichas" && (
        <SellerFichasView sellerId={sellerId} />
      )}

      {/* Modal novo lead */}
      {showNewLead && (
        <NewLeadModal sellerId={isSDR ? 0 : sellerId} department={dept}
          onClose={() => setShowNewLead(false)}
          onCreated={() => { setShowNewLead(false); refetchLeads(); }} />
      )}

      {/* Inline Chat Panel */}
      {chatLeadId && (
        <InlineChatPanel leadId={chatLeadId} sellerId={sellerId} onClose={() => setChatLeadId(null)} />
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-xl border-t border-border/40 z-50 safe-area-bottom">
        <div className="flex justify-around py-1.5 max-w-md mx-auto">
          <button onClick={() => navigate(`/minha-area/${sellerId}`)} className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors rounded-lg">
            <User className="w-5 h-5" /><span className="text-[10px]">Minha Área</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-primary relative">
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
            <LayoutGrid className="w-5 h-5" /><span className="text-[10px] font-bold">CRM</span>
          </button>
          <button onClick={() => navigate(`/agendamentos/${sellerId}`)} className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors rounded-lg">
            <Calendar className="w-5 h-5" /><span className="text-[10px]">Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== SDR DASHBOARD =====
function SDRDashboard({ stats, assignmentStats, leads, sellerMap, vendorSellers, onAssign, onWhatsApp, onCall, sellerId, department }: any) {
  const unassignedLeads = useMemo(() => leads.filter((l: any) => l.sellerId === 0), [leads]);

  // Distribution config
  const { data: distConfig, refetch: refetchConfig } = trpc.crmDistribution.getConfig.useQuery();
  const updateConfigMut = trpc.crmDistribution.updateConfig.useMutation({
    onSuccess: () => { refetchConfig(); toast.success("Configuração atualizada!"); },
    onError: (e) => toast.error(e.message),
  });
  const autoDistributeMut = trpc.crmDistribution.autoDistributeToSellers.useMutation({
    onSuccess: (data) => {
      if (data.distributed > 0) {
        toast.success(`${data.distributed} leads distribuídos automaticamente!`);
      } else {
        toast.info("Nenhum lead para distribuir.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const currentDeptConfig = useMemo(() => {
    if (!distConfig) return null;
    return distConfig.find((c: any) => c.department === (department || "vendas"));
  }, [distConfig, department]);

  const isAutoEnabled = currentDeptConfig?.enabled ?? false;
  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a: any, b: any) => {
        const aTime = a.lastContactDate || new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = b.lastContactDate || new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [leads]);

  // Count leads per seller
  const sellerLeadCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    leads.forEach((l: any) => {
      if (l.sellerId > 0) {
        counts[l.sellerId] = (counts[l.sellerId] || 0) + 1;
      }
    });
    return counts;
  }, [leads]);

  return (
    <div className="px-3 mt-3 space-y-3">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Total</span>
          </div>
          <p className="text-xl font-bold text-foreground">{assignmentStats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Novos</span>
          </div>
          <p className="text-xl font-bold text-amber-400">{assignmentStats.unassigned}</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Com Vendedor</span>
          </div>
          <p className="text-xl font-bold text-cyan-400">{assignmentStats.assigned}</p>
        </div>
      </div>

      {/* Distribution Controls */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Shuffle className="w-3.5 h-3.5 text-primary" /> Enviar Leads p/ Vendedores
          </h3>
          <button
            onClick={() => updateConfigMut.mutate({ department: department || "vendas", enabled: !isAutoEnabled })}
            disabled={updateConfigMut.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
              isAutoEnabled
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
            }`}
          >
            <Power className="w-3 h-3" />
            {isAutoEnabled ? "AUTOMÁTICO" : "MANUAL"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">
          {isAutoEnabled
            ? "Quando chegar lead novo, o sistema já manda direto pra um vendedor."
            : "Você escolhe pra qual vendedor mandar cada lead."}
        </p>
        {unassignedLeads.length > 0 && (
          <button
            onClick={() => autoDistributeMut.mutate({ department: department || "vendas", sdrSellerId: sellerId })}
            disabled={autoDistributeMut.isPending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold transition-all active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            {autoDistributeMut.isPending ? "Enviando..." : `Enviar ${unassignedLeads.length} leads para vendedores agora`}
          </button>
        )}
      </div>

      {/* Unassigned leads needing attention */}
      {unassignedLeads.length > 0 && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{unassignedLeads.length} leads sem vendedor</span>
          </div>
          {unassignedLeads.slice(0, 5).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-2 border-t border-amber-500/15">
              <div className="flex-1 min-w-0 mr-2">
                <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                <span className="text-[10px] text-muted-foreground">{lead.phone || "Sem tel."} • {timeAgo(lead.lastContactDate || (typeof lead.createdAt === 'number' ? lead.createdAt : new Date(lead.createdAt).getTime()))}</span>
              </div>
              <div className="flex items-center gap-1">
                <select
                  defaultValue=""
                  onChange={e => { const v = parseInt(e.target.value); if (v) onAssign(lead.id, v); }}
                  className="h-7 px-2 text-[10px] rounded-lg border border-border bg-background text-foreground min-w-[100px]"
                >
                  <option value="">Enviar p/ →</option>
                  {vendorSellers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                  ))}
                </select>
                <button onClick={() => onWhatsApp(lead)} className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leads per seller */}
      {vendorSellers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-primary" /> Quantos leads cada vendedor tem
          </h3>
          <div className="space-y-1.5">
            {vendorSellers.map((s: any) => {
              const count = sellerLeadCounts[s.id] || 0;
              const maxCount = Math.max(...Object.values(sellerLeadCounts), 1);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-foreground w-24 truncate">{s.nickname || s.name}</span>
                  <div className="flex-1 h-4 bg-accent/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/40 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentLeads.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Últimos Leads
          </h3>
          {recentLeads.map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-border/50">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-foreground truncate block">{lead.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {lead.sellerId > 0 ? sellerMap[lead.sellerId] || `#${lead.sellerId}` : "Sem vendedor ainda"} • {timeAgo(lead.lastContactDate || (typeof lead.createdAt === 'number' ? lead.createdAt : new Date(lead.createdAt).getTime()))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SELLER DASHBOARD =====
function SellerDashboard({ dashboard, stats, followUps, overdueTasks, inventoryAlerts, onWhatsApp, onCall, sellerId, leads }: any) {
  // Em Negociação tracking
  const negotiationLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l: any) => l.stage === 'Em Negociacao' || l.stage === 'Em Negociação');
  }, [leads]);
  const staleNegotiations = useMemo(() => {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    return negotiationLeads.filter((l: any) => !l.lastContactDate || l.lastContactDate < threeDaysAgo);
  }, [negotiationLeads]);

  return (
    <div className="px-3 mt-3 space-y-3">
      {/* Performance cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase">Leads Ativos</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats?.total || 0}</p>
          <div className="flex gap-1 mt-1">
            <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">{stats?.hot || 0} quentes</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">{stats?.warm || 0} mornos</span>
          </div>
        </div>
        <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Handshake className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] text-orange-300 uppercase font-bold">Em Negociação</span>
          </div>
          <p className="text-xl font-bold text-orange-400">{negotiationLeads.length}</p>
          {staleNegotiations.length > 0 && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">{staleNegotiations.length} parados 3d+</span>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Conversão</span>
          </div>
          <p className="text-xl font-bold text-foreground">{dashboard?.conversionRate || 0}%</p>
          <p className="text-[9px] text-muted-foreground">{dashboard?.closedThisMonth || 0} vendas este mês</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase">Retornos</span>
          </div>
          <p className="text-xl font-bold text-foreground">{dashboard?.pendingFollowUps || 0}</p>
          <p className="text-[9px] text-muted-foreground">pendentes hoje</p>
        </div>
      </div>

      {/* ALERTA: Negociações paradas */}
      {staleNegotiations.length > 0 && (
        <div className="rounded-xl border-2 border-orange-500/50 bg-orange-500/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">{staleNegotiations.length} negociação parada há 3+ dias!</span>
          </div>
          <p className="text-[10px] text-orange-300/70 mb-1">Esses clientes estão esperando! Manda mensagem agora.</p>
          {staleNegotiations.slice(0, 3).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-orange-500/20">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                {lead.vehicleInterest && <span className="text-[10px] text-muted-foreground">{lead.vehicleInterest}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onWhatsApp(lead)} className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button onClick={() => onCall(lead)} className="p-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 active:scale-95">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow-ups pendentes */}
      {followUps && followUps.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{followUps.length} clientes esperando retorno (48h+)</span>
          </div>
          {followUps.slice(0, 4).map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between py-1.5 border-t border-amber-500/15">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                {lead.vehicleInterest && <span className="text-[10px] text-muted-foreground">{lead.vehicleInterest}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onWhatsApp(lead)} className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 active:scale-95">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button onClick={() => onCall(lead)} className="p-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 active:scale-95">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overdue tasks */}
      {overdueTasks && overdueTasks.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400">{overdueTasks.length} tarefas atrasadas</span>
          </div>
          {overdueTasks.slice(0, 3).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between py-1.5 border-t border-red-500/15">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">{task.type}: {task.description || "Sem descrição"}</span>
                <span className="text-[10px] text-red-300">Venceu {timeAgo(task.dueDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory alerts */}
      {inventoryAlerts && inventoryAlerts.length > 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold text-green-400">Veículos novos para seus clientes!</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{inventoryAlerts.length} match(es) encontrados. Toque para ver.</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => {}} className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <Plus className="w-5 h-5 text-primary" />
          <span className="text-[10px] text-muted-foreground">Novo Lead</span>
        </button>
        <button onClick={() => {}} className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <Calendar className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] text-muted-foreground">Agendar</span>
        </button>
        <button onClick={() => {}} className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <FileText className="w-5 h-5 text-green-400" />
          <span className="text-[10px] text-muted-foreground">Templates</span>
        </button>
      </div>
    </div>
  );
}

// ===== PIPELINE VIEW =====
function PipelineView({ sellerId, dept, stages, leads, onMoveStage, onView, isSDR, sellerMap }: {
  sellerId: number; dept: string; stages: any[]; leads: any[];
  onMoveStage: (id: number, stage: string) => void; onView: (id: number) => void;
  isSDR?: boolean; sellerMap?: Record<number, string>;
}) {
  return (
    <div className="px-3 mt-3">
      <div className="space-y-4">
        {stages.map((stage: any) => {
          const stageLeads = leads.filter((l: any) => l.stage === stage.name);
          return (
            <div key={stage.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between"
                style={{ borderLeftWidth: 4, borderLeftColor: stage.color || "#666" }}>
                <span className="text-xs font-bold text-foreground">{stage.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{stageLeads.length}</span>
              </div>
              {stageLeads.length > 0 ? (
                <div className="divide-y divide-border">
                  {stageLeads.map((lead: any) => (
                    <button key={lead.id} onClick={() => onView(lead.id)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent/50 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground truncate block">{lead.name}</span>
                        <div className="flex items-center gap-1.5">
                          {lead.source && lead.source !== 'manual' && (
                            <ChannelIcon source={lead.source} size={12} />
                          )}
                          {lead.vehicleInterest && <span className="text-[10px] text-muted-foreground">{lead.vehicleInterest}</span>}
                          {isSDR && lead.sellerId > 0 && sellerMap && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">
                              {sellerMap[lead.sellerId] || `#${lead.sellerId}`}
                            </span>
                          )}
                          {isSDR && lead.sellerId === 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                              Novo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(lead.lastContactDate)}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-3 text-[10px] text-muted-foreground text-center">Nenhum lead nesta etapa</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== LEAD CARD =====
function LeadCard({ lead, stages, sellerId, templates, isSDR, vendorSellers, sellerMap, onWhatsApp, onCall, onChat, onMoveStage, onView, onTemplateSelect, onAssign, showTemplates, onToggleTemplates }: {
  lead: any; stages: any[]; sellerId: number; templates: any[];
  isSDR?: boolean; vendorSellers?: any[]; sellerMap?: Record<number, string>;
  onWhatsApp: () => void; onCall: () => void; onChat: () => void;
  onMoveStage: (stage: string) => void; onView: () => void;
  onTemplateSelect: (tId: number) => void;
  onAssign?: (newSellerId: number) => void;
  showTemplates: boolean; onToggleTemplates: () => void;
}) {
  const [showStages, setShowStages] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { data: soldCheck } = trpc.crmLeads.checkAlreadySold.useQuery(
    { leadId: lead.id },
    { enabled: !!lead.id, staleTime: 300000, refetchOnWindowFocus: false, refetchOnMount: false }
  );
  const scoreCfg = SCORE_CONFIG[lead.score as keyof typeof SCORE_CONFIG] || SCORE_CONFIG.warm;
  const ScoreIcon = scoreCfg.icon;
  const isUrgent = lead._alertType === "transfer";
  const isWarning = lead._alertType === "priority";
  const isUnassigned = lead.sellerId === 0;

  // Score color for left accent bar
  const accentColor = lead.score === 'hot' ? 'bg-red-500' : lead.score === 'cold' ? 'bg-blue-400' : 'bg-amber-400';

  return (
    <div className={`relative rounded-xl overflow-hidden transition-all ${
      isUrgent ? "shadow-lg shadow-red-500/20 ring-1 ring-red-500/50" :
      isWarning ? "shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30" :
      "shadow-sm hover:shadow-md"
    }`}>
      {/* Left accent bar - score indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

      <div className={`pl-3 pr-3 py-3 ${
        isUrgent ? "bg-red-500/8 border border-red-500/30" :
        isWarning ? "bg-amber-500/8 border border-amber-500/20" :
        "bg-card/80 border border-border/60"
      }`}>
        {/* Urgency banner */}
        {isUrgent && (
          <div className="flex items-center gap-2 mb-2.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30">
            <Timer className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-[11px] font-bold text-red-400 tracking-wide">URGENTE — {minutesSinceCreation(lead.createdAt)}min sem resposta</span>
          </div>
        )}
        {isWarning && (
          <div className="flex items-center gap-2 mb-2.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-amber-400">ATENÇÃO — {minutesSinceCreation(lead.createdAt)}min aguardando</span>
          </div>
        )}

        {/* Main content row - WhatsApp style */}
        <div className="flex items-start gap-3" onClick={onView}>
          {/* Avatar circle with channel indicator */}
          <div className="relative shrink-0">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
              lead.score === 'hot' ? 'bg-red-500/15' : lead.score === 'cold' ? 'bg-blue-500/15' : 'bg-amber-500/15'
            }`}>
              <span className={`text-base font-bold ${
                lead.score === 'hot' ? 'text-red-400' : lead.score === 'cold' ? 'text-blue-400' : 'text-amber-400'
              }`}>{(lead.name || '?').charAt(0).toUpperCase()}</span>
            </div>
            {lead.source && lead.source !== 'manual' && (
              <ChannelIndicator source={lead.source} size={13} />
            )}
          </div>

          {/* Lead info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-[13px] font-bold text-foreground truncate">{lead.name}</h3>
                <ScoreIcon className={`w-3.5 h-3.5 shrink-0 ${scoreCfg.color}`} />
                {soldCheck?.alreadySold && (
                  <span className="shrink-0 text-[8px] px-1 py-0.5 rounded bg-red-500/30 text-red-400 font-bold">VENDIDO</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums">
                {timeAgo(lead.lastContactDate || lead.updatedAt)}
              </span>
            </div>

            {/* Second line: phone + arrival */}
            <div className="flex items-center gap-2 mt-0.5">
              {lead.phone && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5" /> {lead.phone}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground/50">
                {new Date(lead.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Third line: vehicle interest */}
            {lead.vehicleInterest && (
              <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 mt-0.5 truncate">
                <Car className="w-3 h-3 shrink-0" /> {lead.vehicleInterest}
              </p>
            )}

            {/* Notes preview */}
            {lead.notes && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate italic">
                {lead.notes.replace(/^Primeira mensagem:\s*/i, '').substring(0, 80)}
              </p>
            )}

            {/* Tags row */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                lead.stage === 'novo' ? 'bg-emerald-500/15 text-emerald-400' :
                lead.stage === 'Em Negociacao' || lead.stage === 'Em Negociação' ? 'bg-blue-500/15 text-blue-400' :
                lead.stage === 'Proposta' ? 'bg-purple-500/15 text-purple-400' :
                lead.stage === 'Fechamento' ? 'bg-green-500/15 text-green-400' :
                lead.stage === 'Perdido' ? 'bg-red-500/15 text-red-400' :
                'bg-primary/10 text-primary'
              }`}>{lead.stage}</span>
              {lead.source && (
                <ChannelBadge source={lead.source} size={11} />
              )}
              {isSDR && isUnassigned && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 animate-pulse">
                  NOVO
                </span>
              )}
              {isSDR && !isUnassigned && sellerMap && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  → {sellerMap[lead.sellerId] || `#${lead.sellerId}`}
                </span>
              )}
              {lead.acknowledgedAt && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 flex items-center gap-0.5">
                  <CheckCheck className="w-2.5 h-2.5" /> OK
                </span>
              )}
              {lead.aiHandled && lead.aiDataCollected && (() => {
                try {
                  const d = JSON.parse(lead.aiDataCollected);
                  const hasData = d.customerCpf || d.downPayment || d.customerBirthDate;
                  if (!hasData) return null;
                  return (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center gap-0.5 font-medium">
                      <Zap className="w-2.5 h-2.5" /> Dados IA
                    </span>
                  );
                } catch { return null; }
              })()}
            </div>
          </div>
        </div>

        {/* Quick actions - always visible, compact */}
        <div className="flex items-center gap-1.5 mt-2.5 ml-14">
          {/* Acknowledge button */}
          {!lead.acknowledgedAt && lead.sellerId > 0 && !isSDR && (
            <AcknowledgeButton leadId={lead.id} sellerId={lead.sellerId} />
          )}
          {/* Primary: Chat */}
          <button onClick={(e) => { e.stopPropagation(); onChat(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 transition-all active:scale-[0.97]">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">Chat</span>
          </button>
          {/* WhatsApp external */}
          <button onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/15 transition-all active:scale-[0.97]" title="WhatsApp">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </button>
          {/* Call */}
          <button onClick={(e) => { e.stopPropagation(); onCall(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 transition-all active:scale-[0.97]">
            <Phone className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">Ligar</span>
          </button>
          {/* SDR: Assign */}
          {isSDR && (
            <button onClick={(e) => { e.stopPropagation(); setShowAssign(!showAssign); }}
              className={`p-2 rounded-lg transition-all active:scale-[0.97] border ${
                showAssign ? "bg-cyan-500/25 border-cyan-500/40" : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20"
              }`}>
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            </button>
          )}
          {/* More actions */}
          <button onClick={(e) => { e.stopPropagation(); setShowMore(!showMore); }}
            className={`p-2 rounded-lg transition-all active:scale-[0.97] border ${
              showMore ? "bg-accent border-border" : "bg-accent/30 hover:bg-accent/60 border-transparent"
            }`}>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Expandable actions */}
        {showMore && (
          <div className="mt-2 ml-14 space-y-2">
            {/* Templates */}
            <div className="flex gap-1.5">
              <button onClick={(e) => { e.stopPropagation(); onToggleTemplates(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent border border-border text-xs text-muted-foreground transition-all">
                <MessageSquare className="w-3.5 h-3.5" /> Mensagens prontas
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowStages(!showStages); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-xs text-purple-400 transition-all">
                <Target className="w-3.5 h-3.5" /> Mover etapa
              </button>
              <button onClick={(e) => { e.stopPropagation(); onView(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent border border-border text-xs text-muted-foreground transition-all">
                <Eye className="w-3.5 h-3.5" /> Detalhes
              </button>
            </div>

            {/* Stage selector */}
            {showStages && (
              <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-card/80 border border-border">
                {stages.map((s: any) => (
                  <button key={s.id} onClick={(e) => { e.stopPropagation(); onMoveStage(s.name); setShowStages(false); setShowMore(false); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                      lead.stage === s.name ? "bg-primary/20 border-primary/40 text-primary font-bold" : "bg-accent/50 border-border text-muted-foreground hover:bg-accent"
                    }`}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* Templates list */}
            {showTemplates && templates.length > 0 && (
              <div className="p-2 rounded-lg bg-card/80 border border-border space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium mb-1">Enviar mensagem pronta:</p>
                {templates.map((t: any) => (
                  <button key={t.id} onClick={(e) => { e.stopPropagation(); onTemplateSelect(t.id); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent text-xs text-foreground flex items-center gap-2 transition-colors">
                    <Send className="w-3 h-3 text-green-400 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SDR: Assign dropdown */}
        {isSDR && showAssign && vendorSellers && vendorSellers.length > 0 && (
          <div className="mt-2 ml-14 p-2.5 rounded-lg bg-card/90 border border-cyan-500/20 space-y-1">
            <p className="text-[10px] text-cyan-400 font-medium mb-1.5 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3" /> Enviar para vendedor:
            </p>
            <div className="grid grid-cols-2 gap-1">
              {vendorSellers.map((s: any) => (
                <button key={s.id} onClick={(e) => { e.stopPropagation(); if (onAssign) onAssign(s.id); setShowAssign(false); }}
                  className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                    lead.sellerId === s.id
                      ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30"
                      : "hover:bg-accent text-foreground border border-transparent"
                  }`}>
                  <User className="w-3 h-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s.nickname || s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
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
    onSuccess: () => { toast.success("Cliente cadastrado!"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    createLead.mutate({ sellerId, department, name: name.trim(), phone: phone.trim() || undefined, vehicleInterest: vehicleInterest.trim() || undefined, source, notes: notes.trim() || undefined });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setNotes(prev => prev + (prev ? "\n" : "") + "[Nota de voz gravada]");
        setIsRecording(false);
        toast.success("Nota de voz salva!");
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => { if (mediaRecorder.state === "recording") mediaRecorder.stop(); }, 30000);
      (window as any).__mediaRecorder = mediaRecorder;
    } catch { toast.error("Permissão de microfone negada"); }
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
          <h2 className="text-base font-bold text-foreground">Novo Cliente</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" className="h-10" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(47) 99999-9999" className="h-10" type="tel" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Carro que quer</label>
            <Input value={vehicleInterest} onChange={e => setVehicleInterest(e.target.value)} placeholder="Ex: HB20, Hilux, Civic..." className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">De onde veio</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm">
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="trafego_pago">Tráfego Pago</option>
              <option value="olx">OLX</option>
              <option value="webmotors">Webmotors</option>
              <option value="socarrao">SóCarrão</option>
              <option value="icarros">iCarros</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="instagram_ads">Instagram Ads</option>
              <option value="facebook_ads">Facebook Ads</option>
              <option value="google_ads">Google Ads</option>
              <option value="landing_page">Landing Page</option>
              <option value="indicacao">Indicação</option>
              <option value="loja">Loja (presencial)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-2">
              Observações
              <button type="button" onClick={isRecording ? stopRecording : startRecording}
                className={`p-1 rounded ${isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-accent text-muted-foreground hover:text-foreground"}`}>
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anotações sobre o cliente..."
              className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
          </div>
          <Button type="submit" disabled={createLead.isPending} className="w-full racing-gradient text-white font-bold h-11">
            {createLead.isPending ? "Salvando..." : "Cadastrar Cliente"}
          </Button>
        </form>
      </div>
    </div>
  );
}


// Acknowledge button component - vendedor confirma que recebeu o lead
function AcknowledgeButton({ leadId, sellerId }: { leadId: number; sellerId: number }) {
  const utils = trpc.useUtils();
  const ack = trpc.crmLeads.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Lead confirmado! Não será mais transferido automaticamente.");
      utils.crmLeads.invalidate();
    },
    onError: () => toast.error("Erro ao confirmar lead"),
  });
  return (
    <button
      onClick={(e) => { e.stopPropagation(); ack.mutate({ leadId, sellerId }); }}
      disabled={ack.isPending}
      className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all active:scale-95"
      title="Confirmar recebimento do lead (impede transferência automática)"
    >
      <CheckCheck className="w-4 h-4 text-emerald-400" />
      <span className="text-[10px] font-bold text-emerald-400">Recebi</span>
    </button>
  );
}


// ===== SELLER FICHAS VIEW =====
function SellerFichasView({ sellerId }: { sellerId: number }) {
  const { data: applications, refetch } = trpc.crmAi.listCreditApplications.useQuery({ sellerId });
  const { data: leadsWithAiData } = trpc.crmAi.listLeadsWithAiData.useQuery({ sellerId });
  const updateApp = trpc.crmAi.updateCreditApplication.useMutation({ onSuccess: () => { refetch(); toast.success('Ficha atualizada!'); } });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'fichas' | 'simulacao'>('fichas');
  const [, navigate] = useLocation();

  const statusColors: Record<string, string> = {
    pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    analyzing: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    approved: "text-green-400 bg-green-500/10 border-green-500/30",
    rejected: "text-red-400 bg-red-500/10 border-red-500/30",
    cancelled: "text-muted-foreground bg-muted border-border",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pendente", analyzing: "Em Analise", approved: "Aprovada",
    rejected: "Rejeitada", cancelled: "Cancelada",
  };

  const fichasCount = applications?.length || 0;
  const leadsCount = leadsWithAiData?.length || 0;

  return (
    <div className="space-y-3 px-3 pb-20">
      {/* Sub-tabs: Fichas vs Dados Simulacao */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
        <button onClick={() => setActiveTab('fichas')}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${activeTab === 'fichas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          <CreditCard className="w-3.5 h-3.5 inline mr-1" />Fichas ({fichasCount})
        </button>
        <button onClick={() => setActiveTab('simulacao')}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${activeTab === 'simulacao' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          <Zap className="w-3.5 h-3.5 inline mr-1" />Dados IA ({leadsCount})
        </button>
      </div>

      {/* FICHAS TAB */}
      {activeTab === 'fichas' && (
        <>
          {fichasCount === 0 ? (
            <div className="text-center py-12 px-4">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma ficha de credito</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Fichas criadas pela IA aparecerao aqui</p>
            </div>
          ) : (
            applications?.map((app: any) => (
              <div key={app.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => { setExpandedId(expandedId === app.id ? null : app.id); setNotes(app.feiNotes || ''); }}
                  className="w-full p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${statusColors[app.status] || ''}`}>
                      {app.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : app.status === 'rejected' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{app.customerName || app.leadName || 'Sem nome'}</div>
                      <div className="text-[10px] text-muted-foreground">{app.vehicleInterest || 'Veiculo nao informado'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[app.status] || ''}`}>
                      {statusLabels[app.status] || app.status}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === app.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {expandedId === app.id && (
                  <div className="border-t border-border p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "CPF", value: app.customerCpf },
                        { label: "Nascimento", value: app.customerBirthDate },
                        { label: "Telefone", value: app.customerPhone || app.leadPhone },
                        { label: "Renda", value: app.customerIncome ? `R$ ${Number(app.customerIncome).toLocaleString('pt-BR')}` : null },
                        { label: "Entrada", value: app.downPayment ? `R$ ${Number(app.downPayment).toLocaleString('pt-BR')}` : null },
                        { label: "Empregador", value: app.customerEmployer },
                        { label: "Veiculo Troca", value: app.tradeInVehicle },
                        { label: "KM Troca", value: app.tradeInKm ? `${Number(app.tradeInKm).toLocaleString('pt-BR')} km` : null },
                        { label: "Prazo", value: app.financingTerm ? `${app.financingTerm} meses` : null },
                        { label: "Banco", value: app.bankPreference },
                        { label: "Origem", value: app.leadSource },
                        { label: "Criado", value: app.createdAt ? new Date(Number(app.createdAt)).toLocaleString('pt-BR') : null },
                      ].filter(f => f.value).map(f => (
                        <div key={f.label}>
                          <div className="text-[10px] text-muted-foreground">{f.label}</div>
                          <div className="text-xs font-medium text-foreground">{f.value}</div>
                        </div>
                      ))}
                    </div>
                    {app.feiNotes && (
                      <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <div className="text-[10px] text-blue-400 font-medium">Obs F&I:</div>
                        <div className="text-xs text-foreground">{app.feiNotes}</div>
                      </div>
                    )}
                    {/* Seller can add notes and work on approval */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-muted-foreground">Suas observacoes</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Adicionar observacoes..."
                        className="w-full h-16 p-2 rounded-lg bg-background border border-border text-xs text-foreground resize-none" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {app.status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 text-[11px]"
                          onClick={() => updateApp.mutate({ id: app.id, status: 'analyzing', feiNotes: notes || undefined })}>
                          <Eye className="w-3 h-3 mr-1" /> Iniciar Analise
                        </Button>
                      )}
                      {(app.status === 'pending' || app.status === 'analyzing') && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-[11px]"
                            onClick={() => updateApp.mutate({ id: app.id, status: 'approved', feiNotes: notes || undefined })}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" className="text-[11px]"
                            onClick={() => updateApp.mutate({ id: app.id, status: 'rejected', feiNotes: notes || undefined })}>
                            <X className="w-3 h-3 mr-1" /> Rejeitar
                          </Button>
                        </>
                      )}
                      {notes !== (app.feiNotes || '') && (
                        <Button size="sm" variant="outline" className="text-[11px]"
                          onClick={() => updateApp.mutate({ id: app.id, feiNotes: notes })}>
                          Salvar Obs
                        </Button>
                      )}
                    </div>
                    {app.aiCollected && (
                      <div className="flex items-center gap-1 text-[10px] text-purple-400">
                        <Zap className="w-3 h-3" /> Dados coletados pela IA
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* DADOS IA TAB - Leads com dados de simulacao coletados */}
      {activeTab === 'simulacao' && (
        <>
          {leadsCount === 0 ? (
            <div className="text-center py-12 px-4">
              <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum lead com dados coletados</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Quando a IA coletar CPF, entrada, etc. aparecera aqui</p>
            </div>
          ) : (
            leadsWithAiData?.map((lead: any) => {
              const ai = lead.aiData || {};
              const hasCpf = !!ai.cpf;
              const hasBirth = !!ai.birthDate;
              const hasIncome = !!ai.monthlyIncome;
              const readyToSimulate = hasCpf && hasBirth;
              return (
                <div key={lead.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                    className="w-full p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                        readyToSimulate ? 'text-green-400 bg-green-500/10 border border-green-500/30' : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                      }`}>
                        {readyToSimulate ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-foreground">{lead.name || 'Sem nome'}</div>
                        <div className="text-[10px] text-muted-foreground">{lead.vehicleInterest || ai.vehicleInterest || 'Veiculo nao informado'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        readyToSimulate ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      }`}>
                        {readyToSimulate ? 'Pronto p/ Simular' : 'Coletando...'}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedLeadId === lead.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {expandedLeadId === lead.id && (
                    <div className="border-t border-border p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "CPF", value: ai.cpf },
                          { label: "Nascimento", value: ai.birthDate },
                          { label: "Telefone", value: lead.phone },
                          { label: "Renda", value: ai.monthlyIncome ? `R$ ${ai.monthlyIncome}` : null },
                          { label: "Entrada", value: ai.downPayment ? `R$ ${ai.downPayment}` : null },
                          { label: "Forma Pgto", value: ai.paymentMethod },
                          { label: "Troca", value: ai.hasTradeIn ? 'Sim' : ai.hasTradeIn === false ? 'Nao' : null },
                          { label: "Veiculo Troca", value: ai.tradeInVehicle },
                          { label: "KM Troca", value: ai.tradeInKm },
                          { label: "Cidade", value: ai.customerCity },
                          { label: "Empregador", value: ai.employer },
                          { label: "Origem", value: lead.source },
                        ].filter(f => f.value != null).map(f => (
                          <div key={f.label}>
                            <div className="text-[10px] text-muted-foreground">{f.label}</div>
                            <div className="text-xs font-medium text-foreground">{String(f.value)}</div>
                          </div>
                        ))}
                      </div>
                      {ai.tradeInDetails && (
                        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <div className="text-[10px] text-amber-400 font-medium">Pre-Avaliacao Troca:</div>
                          <div className="text-xs text-foreground">{ai.tradeInDetails}</div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-[11px]" onClick={() => navigate(`/crm/lead/${lead.id}`)}>
                          <Eye className="w-3 h-3 mr-1" /> Ver Lead
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-purple-400">
                        <Zap className="w-3 h-3" /> Dados coletados pela IA automaticamente
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
