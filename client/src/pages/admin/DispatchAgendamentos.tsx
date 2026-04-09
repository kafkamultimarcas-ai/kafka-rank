import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, X, Users, MessageSquare, Filter, Calendar } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  attended: "Vieram",
  no_show: "Não vieram",
  pending: "Pendentes",
  all: "Todos",
};

const ATTENDANCE_COLORS: Record<string, string> = {
  attended: "text-green-400",
  no_show: "text-red-400",
  pending: "text-yellow-400",
};

export default function DispatchAgendamentos({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<"feirao" | "normal" | "all">("all");
  const [editionId, setEditionId] = useState<number | undefined>();
  const [status, setStatus] = useState<"attended" | "no_show" | "pending" | "all">("all");
  const [sellerId, setSellerId] = useState<number | undefined>();
  const [excludeBuyers, setExcludeBuyers] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const editions = trpc.appointmentDispatch.editions.useQuery();
  const sellers = trpc.appointmentDispatch.sellers.useQuery();

  const filters = useMemo(() => ({
    type,
    editionId: type === "feirao" ? editionId : undefined,
    status,
    sellerId,
    excludeBuyers,
    startDate: startDate ? new Date(startDate + "T00:00:00").getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
  }), [type, editionId, status, sellerId, excludeBuyers, startDate, endDate]);

  const preview = trpc.appointmentDispatch.preview.useQuery(filters);
  const sendMutation = trpc.appointmentDispatch.send.useMutation();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Digite a mensagem antes de disparar");
      return;
    }
    if (!preview.data || preview.data.length === 0) {
      toast.error("Nenhum destinatário encontrado");
      return;
    }
    if (preview.data.length > 500) {
      toast.error("Máximo 500 destinatários. Refine os filtros.");
      return;
    }

    const estimatedMinutes = Math.ceil((preview.data.length * 45) / 60);
    const confirm = window.confirm(
      `Confirma o disparo para ${preview.data.length} destinatário(s)?\n\n` +
      `⏱ Intervalo anti-ban: ~45s entre cada mensagem\n` +
      `⏳ Tempo estimado: ~${estimatedMinutes} minutos\n\n` +
      `Mensagem:\n${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`
    );
    if (!confirm) return;

    setSending(true);
    setResult(null);
    try {
      const res = await sendMutation.mutateAsync({ ...filters, message });
      setResult({ sent: res.sent, failed: res.failed });
      toast.success(`Disparo concluído! ${res.sent} enviados, ${res.failed} falharam`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao disparar");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (ts: number | null | undefined) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const insertVariable = (variable: string) => {
    setMessage((m) => m + variable);
  };

  return (
    <div className="space-y-4 mb-6 border border-green-500/30 rounded-xl p-4 bg-zinc-950/80">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Send className="h-5 w-5 text-green-400" />
          Disparo WhatsApp — Agendamentos
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">
          <X className="h-4 w-4 mr-1" /> Fechar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Linha 1: Tipo + Edição */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Tipo</label>
              <Select value={type} onValueChange={(v) => { setType(v as any); if (v !== "feirao") setEditionId(undefined); }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="feirao">Feirão</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "feirao" && (
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Edição Feirão</label>
                <Select value={editionId?.toString() || "all"} onValueChange={(v) => setEditionId(v === "all" ? undefined : Number(v))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas edições</SelectItem>
                    {editions.data?.map((ed) => (
                      <SelectItem key={ed.id} value={ed.id.toString()}>
                        Ed. {ed.editionNumber} — {ed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="attended">Vieram</SelectItem>
                  <SelectItem value="no_show">Não vieram</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Vendedor</label>
              <Select value={sellerId?.toString() || "all"} onValueChange={(v) => setSellerId(v === "all" ? undefined : Number(v))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sellers.data?.filter(s => s.department === "vendedor" || s.department === "sdr").map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} ({s.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
          </div>

          {/* Excluir compradores */}
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeBuyers}
              onChange={(e) => setExcludeBuyers(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800"
            />
            Excluir quem já comprou (cruzar com vendas aprovadas)
          </label>
        </CardContent>
      </Card>

      {/* Preview dos destinatários */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Destinatários
            </span>
            <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 font-bold">
              {preview.isLoading ? "..." : preview.data?.length || 0} contatos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preview.isLoading ? (
            <p className="text-zinc-500 text-sm">Carregando...</p>
          ) : !preview.data || preview.data.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nenhum destinatário encontrado com esses filtros</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.data.slice(0, 50).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-zinc-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white font-medium truncate">{r.customerName || "Sem nome"}</span>
                    <span className="text-zinc-500 text-xs shrink-0">{r.customerPhone}</span>
                    {r.isFeirão && <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-[10px] px-1.5 shrink-0">Feirão</Badge>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-500 text-xs">{r.sellerName}</span>
                    <span className={`text-xs ${ATTENDANCE_COLORS[r.attendanceStatus || "pending"] || "text-zinc-500"}`}>
                      {STATUS_LABELS[r.attendanceStatus || "pending"] || "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
              {preview.data.length > 50 && (
                <p className="text-zinc-500 text-xs text-center pt-2">
                  ... e mais {preview.data.length - 50} contatos
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensagem */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem... Use {nome}, {veiculo}, {vendedor} para personalizar"
            className="bg-zinc-800 border-zinc-700 min-h-[80px] text-white"
          />
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="text-green-400 border-green-400/30 cursor-pointer hover:bg-green-400/10"
              onClick={() => insertVariable("{nome}")}
            >
              + {"{nome}"}
            </Badge>
            <Badge
              variant="outline"
              className="text-blue-400 border-blue-400/30 cursor-pointer hover:bg-blue-400/10"
              onClick={() => insertVariable("{veiculo}")}
            >
              + {"{veiculo}"}
            </Badge>
            <Badge
              variant="outline"
              className="text-purple-400 border-purple-400/30 cursor-pointer hover:bg-purple-400/10"
              onClick={() => insertVariable("{vendedor}")}
            >
              + {"{vendedor}"}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-600">
            Variáveis: {"{nome}"} = nome do cliente | {"{veiculo}"} = veículo de interesse | {"{vendedor}"} = nome do vendedor
          </p>
        </CardContent>
      </Card>

      {/* Resultado */}
      {result && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-6 justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{result.sent}</p>
                <p className="text-xs text-zinc-500">Enviados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-zinc-500">Falharam</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão de disparo + Info */}
      <div className="flex gap-3">
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim() || !preview.data?.length}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11"
        >
          {sending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Disparando... (intervalo 45s)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Disparar para {preview.data?.length || 0} contato(s)
            </span>
          )}
        </Button>
        <Button variant="outline" onClick={onClose} className="h-11">
          Cancelar
        </Button>
      </div>

      <p className="text-[11px] text-zinc-600 text-center">
        Anti-ban ativo: intervalo de ~45s entre mensagens | Máximo 500 por disparo | Exclui quem já comprou
      </p>
    </div>
  );
}
