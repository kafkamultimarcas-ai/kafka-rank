import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Bot, Camera, Send, ArrowLeft, X, Loader2,
  Sparkles, Brain, Target, Zap, Copy, Check,
  Phone, MessageSquare, TrendingUp, FileText, Heart,
  Shield, DollarSign, Video, Users, CalendarCheck,
  Lightbulb, AlertTriangle, Car, HandshakeIcon, Trophy, Mic, MicOff,
} from "lucide-react";
import { Streamdown } from "streamdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp: number;
}

const QUICK_OBJECTIONS = [
  { label: "Tá caro", emoji: "💰", prompt: "O cliente disse que o carro está caro demais. Como quebro essa objeção?" },
  { label: "Vou pensar", emoji: "🤔", prompt: "O cliente disse 'vou pensar' e quer ir embora. Como faço pra fechar agora?" },
  { label: "Vi mais barato", emoji: "🏷️", prompt: "O cliente disse que viu o mesmo carro mais barato em outra loja. Como argumento?" },
  { label: "Falar c/ esposa", emoji: "👫", prompt: "O cliente disse que precisa falar com a esposa/marido antes de decidir. Como contorno?" },
  { label: "Sem entrada", emoji: "🚫", prompt: "O cliente não tem entrada. Como viabilizo a venda mesmo assim?" },
  { label: "Score baixo", emoji: "📊", prompt: "O cliente tem score baixo e pode não ser aprovado no financiamento. O que fazer?" },
  { label: "Não respondeu", emoji: "👻", prompt: "O lead parou de responder no WhatsApp faz 3 dias. Como resgato esse lead?" },
  { label: "Quer desconto", emoji: "✂️", prompt: "O cliente está pedindo desconto. Como negocio sem perder margem?" },
];

const CATEGORIES = [
  { id: "responder", icon: MessageSquare, label: "Me ajuda a responder", color: "from-blue-500 to-cyan-500", desc: "Cole a mensagem do cliente" },
  { id: "objecao", icon: Shield, label: "Quebrar Objeção", color: "from-red-500 to-orange-500", desc: "Objeções mais comuns" },
  { id: "script", icon: Phone, label: "Script de Ligação", color: "from-green-500 to-emerald-500", desc: "Antes de ligar pro lead" },
  { id: "followup", icon: CalendarCheck, label: "Follow-up / Resgate", color: "from-amber-500 to-yellow-500", desc: "Reengajar lead frio" },
  { id: "financiamento", icon: DollarSign, label: "Financiamento", color: "from-emerald-500 to-teal-500", desc: "Simular e argumentar" },
  { id: "conteudo", icon: Video, label: "Ideia de Conteúdo", color: "from-pink-500 to-rose-500", desc: "Posts e vídeos virais" },
  { id: "consignacao", icon: Car, label: "Consignação", color: "from-indigo-500 to-blue-500", desc: "Captar e negociar" },
  { id: "despachante", icon: FileText, label: "Documentação", color: "from-slate-500 to-gray-500", desc: "Transferência e docs" },
  { id: "gestao", icon: Users, label: "Gestão de Equipe", color: "from-violet-500 to-purple-500", desc: "Motivar e liderar" },
  { id: "posvenda", icon: Heart, label: "Pós-Venda", color: "from-rose-500 to-pink-500", desc: "Fidelizar e indicação" },
  { id: "marketing", icon: TrendingUp, label: "Marketing Digital", color: "from-cyan-500 to-blue-500", desc: "Tráfego e campanhas" },
  { id: "fechamento", icon: Trophy, label: "Fechamento de Vendas", color: "from-yellow-500 to-amber-500", desc: "Fechar negócio agora" },
  { id: "gatilhos", icon: Brain, label: "Gatilhos Mentais", color: "from-purple-500 to-violet-500", desc: "Técnicas avançadas" },
];

const CATEGORY_PROMPTS: Record<string, string> = {
  responder: "Preciso de ajuda para responder um cliente. Vou colar a mensagem dele aqui:",
  objecao: "",
  script: "Preciso de um script de ligação para agendar uma visita. O cliente se interessou por:",
  followup: "Preciso reengajar um lead que esfriou. Situação:",
  financiamento: "Preciso de ajuda com financiamento. Situação do cliente:",
  conteudo: "Me dê uma ideia de conteúdo viral para postar hoje nas redes sociais da loja de carros. Algo criativo e que gere engajamento!",
  consignacao: "Preciso de ajuda com consignação de veículo. Situação:",
  despachante: "Tenho uma dúvida sobre documentação/despachante de veículo:",
  gestao: "Preciso de ajuda com gestão da equipe de vendas. Situação:",
  posvenda: "Preciso de ajuda com pós-venda. Situação:",
  marketing: "Preciso de estratégia de marketing digital para a loja. Objetivo:",
  fechamento: "Preciso de técnicas de fechamento de vendas para fechar o negócio agora. O cliente está interessado mas preciso dar o empurrão final. Situação:",
  gatilhos: "Me ensine gatilhos mentais avançados para usar na venda de carros. Situação:",
};

export default function IAVendedor() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [, navigate] = useLocation();
  const sid = Number(sellerId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showCategories, setShowCategories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const uploadMut = trpc.aiSales.uploadImage.useMutation();
  const analyzeMut = trpc.aiSales.analyzeConversation.useMutation();

  // Seller info
  const { data: sellerData } = trpc.sellers.getById.useQuery({ id: sid });

  useEffect(() => {
    if (messages.length > 0) setShowCategories(false);
  }, [messages.length]);

  // Voice recognition
  function toggleVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use o Chrome.");
      return;
    }
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTextInput(prev => prev ? prev + " " + transcript : transcript);
      setIsRecording(false);
      toast.success("Voz capturada!");
    };
    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permita o acesso ao microfone nas configurações do navegador.");
      } else {
        toast.error("Erro no reconhecimento de voz. Tente novamente.");
      }
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.info("🎤 Fale agora...");
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }
    setPreviewFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setPreviewImage(null);
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectCategory(catId: string) {
    setActiveCategory(catId);
    const prompt = CATEGORY_PROMPTS[catId];
    if (catId === "conteudo") {
      // Auto-send content idea request
      sendMessage(prompt, catId);
    } else if (catId === "objecao") {
      // Show objection buttons - don't set text
    } else {
      setTextInput(prompt + " ");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }

  function selectObjection(prompt: string) {
    sendMessage(prompt, "objecao");
  }

  async function sendMessage(overrideText?: string, overrideCategory?: string) {
    const text = overrideText || textInput;
    if (!text.trim() && !previewFile) {
      toast.error("Escreva algo ou envie um print");
      return;
    }

    setIsAnalyzing(true);
    let imageUrl: string | undefined;

    try {
      if (previewFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(previewFile);
        });
        const { url } = await uploadMut.mutateAsync({
          sellerId: sid,
          base64,
          filename: previewFile.name,
        });
        imageUrl = url;
      }

      const userMsg: ChatMessage = {
        role: "user",
        content: text,
        imageUrl: previewImage || undefined,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMsg]);
      setTextInput("");
      clearImage();

      const result = await analyzeMut.mutateAsync({
        sellerId: sid,
        imageUrl,
        textMessage: text || undefined,
        category: overrideCategory || activeCategory || undefined,
      });

      const aiMsg: ChatMessage = {
        role: "assistant",
        content: result.response as string,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function copyToClipboard(text: string, idx: number) {
    const match = text.match(/\*\*RESPOSTA SUGERIDA:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/);
    const toCopy = match ? match[1].trim() : text;
    navigator.clipboard.writeText(toCopy);
    setCopiedIdx(idx);
    toast.success("Copiado! Cole no WhatsApp");
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function resetChat() {
    setMessages([]);
    setActiveCategory(null);
    setShowCategories(true);
    setTextInput("");
    clearImage();
  }

  const sellerFirstName = sellerData?.nickname || sellerData?.name?.split(" ")[0] || "Vendedor";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-violet-950 via-purple-950 to-indigo-950 border-b border-purple-500/20 px-4 py-3 shadow-lg shadow-purple-500/5">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (window.history.length > 1) { window.history.back(); } else { navigate(sid ? `/minha-area/${sid}` : '/'); } }} className="text-purple-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-purple-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                IAM <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              </h1>
              <p className="text-[10px] text-purple-300">Super Agente Automotivo</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={resetChat} className="text-[10px] text-purple-400 hover:text-white px-2 py-1 rounded-full border border-purple-500/30 hover:border-purple-400 transition-colors">
                Nova conversa
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {showCategories && messages.length === 0 ? (
          <div className="p-4 space-y-5">
            {/* Welcome */}
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-3 ring-2 ring-violet-500/20">
                <Brain className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                E aí, {sellerFirstName}! Como posso te ajudar?
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha uma categoria ou envie um print da conversa
              </p>
            </div>

            {/* Quick objection buttons */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-orange-400" />
                Objeção Rápida — 1 toque
              </h3>
              <div className="flex flex-wrap gap-2">
                {QUICK_OBJECTIONS.map(obj => (
                  <button
                    key={obj.label}
                    onClick={() => selectObjection(obj.prompt)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span>{obj.emoji}</span>
                    <span>{obj.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category grid */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                Especialidades do IAM
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.filter(c => c.id !== "objecao").map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => selectCategory(cat.id)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-violet-500/30 hover:bg-violet-950/20 transition-all active:scale-[0.98] text-left disabled:opacity-50"
                    >
                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{cat.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{cat.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Print upload CTA */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-950/10 hover:bg-violet-950/20 hover:border-violet-500/50 transition-all"
            >
              <Camera className="h-5 w-5 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">Enviar Print da Conversa</span>
            </button>
          </div>
        ) : (
          /* Chat messages */
          <div className="p-4 space-y-4">
            {/* Active category badge */}
            {activeCategory && (
              <div className="flex items-center justify-center">
                <span className="text-[10px] px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">
                  {CATEGORIES.find(c => c.id === activeCategory)?.label || "Conversa"}
                </span>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%]`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-[10px] text-purple-400 font-medium">IAM</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white rounded-br-sm"
                      : "bg-muted/40 border border-border/50 rounded-bl-sm"
                  }`}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Print" className="rounded-lg mb-2 max-h-48 w-auto" />
                    )}
                    {msg.role === "assistant" ? (
                      <div className="text-sm prose prose-invert prose-sm max-w-none [&_strong]:text-violet-300 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-3 mt-1.5 ml-1">
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-violet-400 transition-colors"
                      >
                        {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedIdx === idx ? "Copiado!" : "Copiar resposta"}
                      </button>
                    </div>
                  )}
                  <p className={`text-[9px] mt-0.5 ${msg.role === "user" ? "text-right" : "ml-1"} text-muted-foreground/40`}>
                    {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mt-1">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <div className="bg-muted/40 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Analisando...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Image preview */}
      {previewImage && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img src={previewImage} alt="Preview" className="h-16 rounded-lg border border-border" />
            <button onClick={clearImage} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shadow-md">
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-3">
        {/* Input para galeria - sem capture para abrir seletor de arquivo/galeria */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/30 transition-colors"
            title="Enviar print da galeria ou tirar foto"
          >
            <Camera className="h-5 w-5 text-violet-400" />
          </button>
          <button
            onClick={toggleVoice}
            className={`flex-shrink-0 h-10 w-10 rounded-full border flex items-center justify-center transition-all ${
              isRecording
                ? "bg-red-500/20 border-red-500/50 animate-pulse"
                : "bg-muted/50 border-border/50 hover:bg-emerald-500/10 hover:border-emerald-500/30"
            }`}
            title={isRecording ? "Parar gravação" : "Falar por voz"}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5 text-red-400" />
            ) : (
              <Mic className="h-5 w-5 text-emerald-400" />
            )}
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Descreva a situação, cole a mensagem do cliente..."
              rows={1}
              className="w-full rounded-2xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30"
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={isAnalyzing || (!textInput.trim() && !previewFile)}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
          >
            {isAnalyzing ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
        {/* Quick return to categories */}
        {!showCategories && !isAnalyzing && (
          <button
            onClick={() => { setShowCategories(true); setActiveCategory(null); }}
            className="w-full mt-2 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            Ver todas as categorias
          </button>
        )}
      </div>
    </div>
  );
}
