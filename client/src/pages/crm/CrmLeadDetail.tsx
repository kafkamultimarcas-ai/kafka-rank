import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, MessageCircle, Calendar, Clock, Edit2, Save, X,
  Flame, Thermometer, Snowflake, Car, Mail, MapPin, ChevronDown,
  Mic, MicOff, User, FileText, CheckCircle, AlertTriangle,
  CreditCard, Zap, DollarSign, Briefcase, Building2, Video, MapPinned
} from "lucide-react";

const SCORE_CONFIG = {
  hot: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/20" },
  warm: { label: "Morno", icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/20" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/20" },
};

const ACTIVITY_ICONS: Record<string, any> = {
  criacao: User, ligacao: Phone, whatsapp: MessageCircle, visita: MapPin,
  email: Mail, observacao: FileText, mudanca_etapa: ChevronDown, agendamento: Calendar,
};

function formatDateTime(ts: number | string | Date | null | undefined) {
  if (!ts) return "--";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function CrmLeadDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id || "0");
  const [isEditing, setIsEditing] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const sellerId = sellerSession?.id || 0;

  const { data: lead, refetch } = trpc.crmLeads.getById.useQuery({ id: leadId }, { enabled: leadId > 0 });
  const { data: activities, refetch: refetchActivities } = trpc.crmLeads.getActivities.useQuery({ leadId }, { enabled: leadId > 0 });
  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: lead?.department || "vendas" }, { enabled: !!lead });

  // Parse AI collected data
  const aiData = useMemo(() => {
    if (!lead?.aiDataCollected) return null;
    try { return JSON.parse(lead.aiDataCollected); } catch { return null; }
  }, [lead?.aiDataCollected]);

  const updateLead = trpc.crmLeads.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Lead atualizado!"); setIsEditing(false); },
    onError: (e) => toast.error(e.message),
  });

  const moveStage = trpc.crmLeads.moveStage.useMutation({
    onSuccess: () => { refetch(); refetchActivities(); toast.success("Etapa atualizada!"); },
  });

  const addActivity = trpc.crmLeads.addActivity.useMutation({
    onSuccess: () => { refetchActivities(); refetch(); setShowAddNote(false); setNoteText(""); toast.success("Atividade registrada!"); },
  });

  const handleWhatsApp = () => {
    if (!lead?.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Ola ${lead.name}! Tudo bem? Aqui e da Kafka Multimarcas.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    addActivity.mutate({ leadId, sellerId, type: "whatsapp", description: "WhatsApp enviado" });
  };

  const handleCall = () => {
    if (!lead?.phone) { toast.error("Lead sem telefone"); return; }
    window.open(`tel:+55${lead.phone.replace(/\D/g, "")}`, "_self");
    addActivity.mutate({ leadId, sellerId, type: "ligacao", description: "Ligacao realizada" });
  };

  const handleScheduleFollowUp = () => {
    if (!scheduleDate) return;
    const ts = new Date(scheduleDate).getTime();
    updateLead.mutate({ id: leadId, nextContactDate: ts });
    addActivity.mutate({ leadId, sellerId, type: "agendamento", description: `Retorno agendado para ${new Date(ts).toLocaleDateString("pt-BR")}` });
    setShowSchedule(false);
    setScheduleDate("");
  };

  if (!lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const scoreCfg = SCORE_CONFIG[lead.score as keyof typeof SCORE_CONFIG] || SCORE_CONFIG.warm;
  const ScoreIcon = scoreCfg.icon;

  // Check if we have simulation data (CPF + birthdate = enough to simulate)
  const hasSimulationData = aiData && (aiData.customerCpf || aiData.customerBirthDate || aiData.downPayment);
  const hasFichaData = aiData && (aiData.customerIncome || aiData.customerEmployer);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/crm")} className="p-1.5 hover:bg-accent rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">{lead.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{lead.stage}</span>
                <ScoreIcon className={`w-3 h-3 ${scoreCfg.color}`} />
                {lead.aiHandled && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> IA
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-accent rounded-lg">
            {isEditing ? <X className="w-4 h-4 text-muted-foreground" /> : <Edit2 className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-3 mt-3">
        <button onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/20 border border-green-500/30 active:scale-95 transition-all">
          <MessageCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium text-green-400">WhatsApp</span>
        </button>
        <button onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 active:scale-95 transition-all">
          <Phone className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Ligar</span>
        </button>
        <button onClick={() => setShowSchedule(!showSchedule)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 active:scale-95 transition-all">
          <Calendar className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">Agendar</span>
        </button>
      </div>

      {/* Schedule follow-up */}
      {showSchedule && (
        <div className="mx-3 mt-2 p-3 rounded-xl bg-accent/50 border border-border">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Data do retorno</label>
          <div className="flex gap-2">
            <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="h-9 text-sm flex-1" />
            <Button size="sm" onClick={handleScheduleFollowUp} className="racing-gradient text-white h-9">Salvar</Button>
          </div>
        </div>
      )}

      {/* ===== DADOS PARA SIMULACAO (coletados pela IA) ===== */}
      {hasSimulationData && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Dados para Simulacao</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Coletado pela IA</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {aiData.customerCpf && (
              <DataCard icon={<CreditCard className="w-3 h-3" />} label="CPF" value={aiData.customerCpf} highlight />
            )}
            {aiData.customerBirthDate && (
              <DataCard icon={<Calendar className="w-3 h-3" />} label="Nascimento" value={aiData.customerBirthDate} highlight />
            )}
            {(aiData.customerPhone || lead.phone) && (
              <DataCard icon={<Phone className="w-3 h-3" />} label="Telefone" value={aiData.customerPhone || lead.phone} />
            )}
            {aiData.vehicleInterest && (
              <DataCard icon={<Car className="w-3 h-3" />} label="Veiculo" value={aiData.vehicleInterest} />
            )}
            {aiData.downPayment && (
              <DataCard icon={<DollarSign className="w-3 h-3" />} label="Entrada" value={`R$ ${Number(aiData.downPayment).toLocaleString("pt-BR")}`} highlight />
            )}
            {aiData.tradeInVehicle && aiData.tradeInVehicle !== "Nao" && aiData.tradeInVehicle !== "Não" && (
              <DataCard icon={<Car className="w-3 h-3" />} label="Troca" value={aiData.tradeInVehicle} />
            )}
            {aiData.tradeInKm && (
              <DataCard icon={<MapPin className="w-3 h-3" />} label="KM Troca" value={`${Number(aiData.tradeInKm).toLocaleString("pt-BR")} km`} />
            )}
            {aiData.tradeInPlate && (
              <DataCard icon={<Car className="w-3 h-3" />} label="Placa Troca" value={aiData.tradeInPlate} />
            )}
            {aiData.tradeInDetails && (
              <DataCard icon={<FileText className="w-3 h-3" />} label="Estado do Usado" value={aiData.tradeInDetails} />
            )}
            {aiData.customerCity && (
              <DataCard icon={<MapPinned className="w-3 h-3" />} label="Cidade" value={aiData.customerCity} />
            )}
          </div>

          {/* Pre-avaliacao do usado */}
          {aiData.tradeInVehicle && aiData.tradeInVehicle !== "Nao" && aiData.tradeInVehicle !== "N\u00e3o" && (
            <div className="mt-2.5 pt-2.5 border-t border-purple-500/20">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Car className="w-3 h-3" /> Pre-Avaliacao do Usado
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {aiData.tradeInPhotosReceived ? (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Fotos recebidas
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Aguardando fotos
                  </span>
                )}
                {aiData.tradeInVideoReceived ? (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Video recebido
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-accent text-muted-foreground border border-border flex items-center gap-1">
                    <Video className="w-3 h-3" /> Video pendente
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Ficha completa - dados extras para F&I */}
          {hasFichaData && (
            <div className="mt-2.5 pt-2.5 border-t border-purple-500/20">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5 block">Dados para Ficha (F&I)</span>
              <div className="grid grid-cols-2 gap-2">
                {aiData.customerIncome && (
                  <DataCard icon={<DollarSign className="w-3 h-3" />} label="Renda" value={`R$ ${Number(aiData.customerIncome).toLocaleString("pt-BR")}`} />
                )}
                {aiData.customerEmployer && (
                  <DataCard icon={<Building2 className="w-3 h-3" />} label="Empresa" value={aiData.customerEmployer} />
                )}
                {aiData.customerEmploymentTime && (
                  <DataCard icon={<Briefcase className="w-3 h-3" />} label="Tempo Emprego" value={aiData.customerEmploymentTime} />
                )}
                {aiData.customerEmail && (
                  <DataCard icon={<Mail className="w-3 h-3" />} label="Email" value={aiData.customerEmail} />
                )}
                {aiData.customerAddress && (
                  <DataCard icon={<MapPin className="w-3 h-3" />} label="Endereco" value={aiData.customerAddress} />
                )}
                {aiData.customerRg && (
                  <DataCard icon={<FileText className="w-3 h-3" />} label="RG" value={aiData.customerRg} />
                )}
              </div>
            </div>
          )}

          {/* Agendamento info */}
          {(aiData.scheduledDate || aiData.wantsVideoCall) && (
            <div className="mt-2.5 pt-2.5 border-t border-purple-500/20">
              <div className="flex items-center gap-2 flex-wrap">
                {aiData.scheduledDate && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Agendado: {aiData.scheduledDate} {aiData.scheduledTime || ""}
                  </span>
                )}
                {aiData.wantsVideoCall && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Video className="w-3 h-3" /> Quer videochamada
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Conversation stage */}
          {aiData.conversationStage && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground">Etapa IA:</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                aiData.conversationStage === 'ficha' ? 'bg-green-500/20 text-green-400' :
                aiData.conversationStage === 'scheduling' ? 'bg-blue-500/20 text-blue-400' :
                aiData.conversationStage === 'presenting' ? 'bg-amber-500/20 text-amber-400' :
                aiData.conversationStage === 'trade_evaluation' ? 'bg-orange-500/20 text-orange-400' :
                aiData.conversationStage === 'closing' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-accent text-muted-foreground'
              }`}>{aiData.conversationStage}</span>
            </div>
          )}
        </div>
      )}

      {/* Lead info */}
      <div className="mx-3 mt-3 p-3 rounded-xl bg-card border border-border space-y-2">
        <InfoRow label="Telefone" value={lead.phone} />
        <InfoRow label="Email" value={lead.email} />
        <InfoRow label="CPF" value={lead.cpf || aiData?.customerCpf} icon={<CreditCard className="w-3 h-3" />} />
        <InfoRow label="Nascimento" value={lead.birthday || aiData?.customerBirthDate} icon={<Calendar className="w-3 h-3" />} />
        <InfoRow label="Veiculo de Interesse" value={lead.vehicleInterest} icon={<Car className="w-3 h-3" />} />
        <InfoRow label="Placa Atual" value={lead.vehiclePlate} />
        <InfoRow label="Origem" value={lead.source} />
        {lead.nextContactDate && (
          <InfoRow label="Proximo Contato" value={formatDateTime(lead.nextContactDate)} icon={<Calendar className="w-3 h-3" />} />
        )}
        {lead.notes && (
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Observacoes</span>
            <p className="text-xs text-foreground mt-0.5">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Score selector */}
      <div className="mx-3 mt-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Temperatura</span>
        <div className="flex gap-2">
          {(["hot", "warm", "cold"] as const).map(s => {
            const cfg = SCORE_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <button key={s} onClick={() => updateLead.mutate({ id: leadId, score: s })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all ${lead.score === s ? `${cfg.bg} border-current ${cfg.color} font-bold` : "bg-accent/50 border-border text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="mx-3 mt-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Etapa do Pipeline</span>
        <div className="flex flex-wrap gap-1.5">
          {stages?.map(s => (
            <button key={s.id} onClick={() => moveStage.mutate({ id: leadId, newStage: s.name, sellerId })}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${lead.stage === s.name ? "bg-primary/20 border-primary/50 text-primary font-bold" : "bg-accent/50 border-border text-muted-foreground hover:bg-accent"}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add note */}
      <div className="mx-3 mt-3">
        <button onClick={() => setShowAddNote(!showAddNote)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/50 border border-border text-sm text-muted-foreground hover:text-foreground transition-all">
          <FileText className="w-4 h-4" /> Adicionar observacao
        </button>
        {showAddNote && (
          <div className="mt-2 space-y-2">
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Escreva uma observacao..."
              className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" autoFocus />
            <Button size="sm" onClick={() => {
              if (!noteText.trim()) return;
              addActivity.mutate({ leadId, sellerId, type: "observacao", description: noteText.trim() });
            }} className="w-full racing-gradient text-white">Salvar</Button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mx-3 mt-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Historico</span>
        <div className="space-y-0">
          {activities && activities.length > 0 ? (
            activities.map((act, i) => {
              const Icon = ACTIVITY_ICONS[act.type] || FileText;
              return (
                <div key={act.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    {i < activities.length - 1 && <div className="w-px h-full bg-border min-h-[20px]" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs text-foreground">{act.description || act.type}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(act.createdAt)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">{icon} {label}</span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}

function DataCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`px-2.5 py-2 rounded-lg border ${highlight ? "bg-purple-500/10 border-purple-500/25" : "bg-card/50 border-border/50"}`}>
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-purple-400">{icon}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${highlight ? "text-purple-300" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
