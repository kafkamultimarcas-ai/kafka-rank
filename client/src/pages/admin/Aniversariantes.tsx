import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Cake, Send, Phone, Mail, Car, Users, PartyPopper, Gift, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function Aniversariantes() {
  const { data: birthdays, isLoading, refetch } = trpc.birthday.todayBirthdays.useQuery();
  const sendOne = trpc.birthday.sendBirthdayMessage.useMutation();
  const sendBulk = trpc.birthday.sendBulkBirthday.useMutation();
  const [customMessage, setCustomMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const handleSendOne = async (phone: string, name: string, id: string) => {
    setSendingId(id);
    try {
      await sendOne.mutateAsync({ phone, name, customMessage: customMessage || undefined });
      setSentIds(prev => new Set(prev).add(id));
      toast.success(`Parabéns enviado para ${name}!`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    }
    setSendingId(null);
  };

  const handleSendAll = async () => {
    if (!birthdays || birthdays.length === 0) return;
    const contacts = birthdays
      .filter(b => b.phone && !sentIds.has(`${b.source}-${b.id}`))
      .map(b => ({ phone: b.phone!, name: b.name || "Cliente" }));
    
    if (contacts.length === 0) {
      toast.info("Todos os parabéns já foram enviados!");
      return;
    }

    try {
      const result = await sendBulk.mutateAsync({ contacts, customMessage: customMessage || undefined });
      const newSent = new Set(sentIds);
      birthdays.filter(b => b.phone).forEach(b => newSent.add(`${b.source}-${b.id}`));
      setSentIds(newSent);
      toast.success(`${result.sent} parabéns enviados! ${result.failed > 0 ? `(${result.failed} falharam)` : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar em massa");
    }
  };

  const withPhone = birthdays?.filter(b => b.phone) || [];
  const withoutPhone = birthdays?.filter(b => !b.phone) || [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Cake className="h-10 w-10 text-pink-400 animate-bounce" />
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400">
              ANIVERSARIANTES DO DIA
            </h1>
            <PartyPopper className="h-10 w-10 text-yellow-400 animate-bounce" />
          </div>
          <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="racing-card p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-black text-blue-400">{birthdays?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aniversariantes</p>
          </div>
          <div className="racing-card p-4 text-center">
            <Gift className="h-6 w-6 mx-auto text-green-400 mb-1" />
            <p className="text-2xl font-black text-green-400">{sentIds.size}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Parabéns Enviados</p>
          </div>
          <div className="racing-card p-4 text-center">
            <MessageCircle className="h-6 w-6 mx-auto text-orange-400 mb-1" />
            <p className="text-2xl font-black text-orange-400">{withPhone.length - sentIds.size > 0 ? withPhone.length - sentIds.size : 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendentes</p>
          </div>
        </div>

        {/* Custom Message */}
        <div className="racing-card p-4 space-y-3">
          <button onClick={() => setShowCustom(!showCustom)} className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors w-full">
            <MessageCircle className="h-4 w-4" />
            {showCustom ? "Ocultar mensagem personalizada" : "Personalizar mensagem de parabéns"}
          </button>
          {showCustom && (
            <div className="space-y-2">
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder={`🎂 Parabéns, {nome}! 🎉\n\nA equipe Kafka Multimarcas deseja a você um feliz aniversário! 🌟\n\nQue este novo ciclo seja repleto de conquistas, saúde e muita prosperidade! 🚀\n\nConte sempre conosco! ❤️\n\nKafka Multimarcas - Onde seus sonhos ganham rodas!`}
                className="w-full h-40 p-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm resize-none placeholder:text-gray-500"
              />
              <p className="text-[10px] text-gray-500">Use {"{nome}"} para inserir o primeiro nome do cliente automaticamente</p>
            </div>
          )}
        </div>

        {/* Send All Button */}
        {withPhone.length > 0 && (
          <Button
            onClick={handleSendAll}
            disabled={sendBulk.isPending}
            className="w-full h-14 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-black text-lg shadow-lg shadow-pink-500/20"
          >
            {sendBulk.isPending ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Enviando parabéns...</>
            ) : (
              <><Send className="h-5 w-5 mr-2" /> Enviar Parabéns para Todos ({withPhone.length - sentIds.size > 0 ? withPhone.length - sentIds.size : 0})</>
            )}
          </Button>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-pink-400 mb-3" />
            <p className="text-muted-foreground">Buscando aniversariantes...</p>
          </div>
        )}

        {/* No birthdays */}
        {!isLoading && (!birthdays || birthdays.length === 0) && (
          <div className="racing-card p-12 text-center">
            <Cake className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-400">Nenhum aniversariante hoje</h3>
            <p className="text-sm text-gray-500 mt-1">Cadastre a data de nascimento dos clientes nas vendas para ativar os parabéns automáticos!</p>
          </div>
        )}

        {/* Birthday List */}
        {withPhone.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Phone className="h-4 w-4" /> Com telefone ({withPhone.length})
            </h2>
            {withPhone.map(b => {
              const uid = `${b.source}-${b.id}`;
              const isSent = sentIds.has(uid);
              const isSending = sendingId === uid;
              return (
                <div key={uid} className={`racing-card p-4 flex items-center gap-4 transition-all ${isSent ? "border-green-500/30 bg-green-500/5" : ""}`}>
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shrink-0">
                    {(b.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{b.name || "Cliente"}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.phone}</span>
                      {b.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {b.email}</span>}
                      {(b as any).vehicleModel && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {(b as any).vehicleModel}</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{b.source === 'venda' ? 'Cliente' : 'Lead'}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isSent ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" /> Enviado
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSendOne(b.phone!, b.name || "Cliente", uid)}
                        disabled={isSending}
                        className="bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Enviar</>}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Without phone */}
        {withoutPhone.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Mail className="h-4 w-4" /> Sem telefone ({withoutPhone.length})
            </h2>
            {withoutPhone.map(b => {
              const uid = `${b.source}-${b.id}`;
              return (
                <div key={uid} className="racing-card p-4 flex items-center gap-4 opacity-60">
                  <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 font-black text-lg shrink-0">
                    {(b.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-300 truncate">{b.name || "Cliente"}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {b.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {b.email}</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Sem telefone</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tips */}
        <div className="racing-card p-4 border-yellow-500/20 bg-yellow-500/5">
          <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4" /> Dicas
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>- Cadastre a data de nascimento (DD/MM/AAAA) ao registrar vendas</li>
            <li>- O sistema busca automaticamente clientes e leads com aniversário hoje</li>
            <li>- Personalize a mensagem para dar um toque especial</li>
            <li>- Use {"{nome}"} na mensagem personalizada para inserir o nome do cliente</li>
            <li>- O disparo em massa tem delay de 3s entre mensagens para evitar bloqueio</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
