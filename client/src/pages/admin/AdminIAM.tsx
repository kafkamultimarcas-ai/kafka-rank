import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bot, Save, Sparkles, Megaphone, Target, Brain,
  AlertTriangle, Zap, Calendar, TrendingDown, TrendingUp,
  Gift, Rocket, GraduationCap, Settings2, DollarSign, Percent,
} from "lucide-react";

const DAY_CONTEXTS = [
  { value: "normal", label: "Dia Normal", icon: Calendar, color: "text-gray-400", desc: "Operação padrão, sem contexto especial" },
  { value: "feirao", label: "Feirão", icon: Zap, color: "text-red-400", desc: "Urgência máxima! IAM foca em fechar vendas rápido" },
  { value: "movimento_fraco", label: "Movimento Fraco", icon: TrendingDown, color: "text-amber-400", desc: "IAM incentiva prospecção, ligações e resgate de leads" },
  { value: "meta_apertada", label: "Meta Apertada", icon: Target, color: "text-orange-400", desc: "Foco total em conversão e fechamento" },
  { value: "fim_de_mes", label: "Fim de Mês", icon: AlertTriangle, color: "text-red-500", desc: "Últimos dias! IAM pressiona por resultados" },
  { value: "inicio_de_mes", label: "Início de Mês", icon: Rocket, color: "text-green-400", desc: "Hora de plantar! Foco em agendamentos e prospecção" },
  { value: "promocao", label: "Promoção", icon: Gift, color: "text-pink-400", desc: "IAM usa a promoção como argumento de venda" },
  { value: "lancamento", label: "Lançamento", icon: Sparkles, color: "text-cyan-400", desc: "Destaque para novos veículos/serviços" },
  { value: "treinamento", label: "Treinamento", icon: GraduationCap, color: "text-violet-400", desc: "IAM foca em ensinar e capacitar" },
];

export default function AdminIAM() {
  const { data: config, isLoading } = trpc.iamConfig.get.useQuery();
  const updateMut = trpc.iamConfig.update.useMutation();
  const utils = trpc.useUtils();

  const [dayContext, setDayContext] = useState("normal");
  const [dayContextCustom, setDayContextCustom] = useState("");
  const [customGreeting, setCustomGreeting] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertActive, setAlertActive] = useState(false);
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [financingRate, setFinancingRate] = useState("2.20");

  useEffect(() => {
    if (config) {
      setDayContext(config.dayContext || "normal");
      setDayContextCustom(config.dayContextCustom || "");
      setCustomGreeting(config.customGreeting || "");
      setExtraInstructions(config.extraInstructions || "");
      setAlertMessage(config.alertMessage || "");
      setAlertActive(config.alertActive || false);
      setWeeklyFocus(config.weeklyFocus || "");
      setFinancingRate(config.financingRate || "2.20");
    }
  }, [config]);

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        dayContext: dayContext as any,
        dayContextCustom: dayContextCustom || null,
        customGreeting: customGreeting || null,
        extraInstructions: extraInstructions || null,
        alertMessage: alertMessage || null,
        alertActive,
        weeklyFocus: weeklyFocus || null,
        financingRate: financingRate || "2.20",
      });
      utils.iamConfig.get.invalidate();
      toast.success("Configuração do IAM salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin"><Bot className="h-8 w-8 text-violet-400" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            Configurar IAM <Sparkles className="h-5 w-5 text-yellow-400" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure o agente de IA que ajuda seus vendedores
          </p>
        </div>
      </div>

      {/* Contexto do Dia */}
      <Card className="border-violet-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            Contexto do Dia
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            O IAM adapta todas as respostas baseado neste contexto. Mude conforme a situação da loja.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {DAY_CONTEXTS.map(ctx => {
              const Icon = ctx.icon;
              const isActive = dayContext === ctx.value;
              return (
                <button
                  key={ctx.value}
                  onClick={() => setDayContext(ctx.value)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/30"
                      : "border-border/50 hover:border-violet-500/30 hover:bg-muted/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isActive ? "text-violet-400" : ctx.color}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? "text-violet-300" : "text-foreground"}`}>{ctx.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{ctx.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Detalhes adicionais (opcional)</label>
            <textarea
              value={dayContextCustom}
              onChange={e => setDayContextCustom(e.target.value)}
              placeholder="Ex: Feirão de SUVs com desconto de até 15%, válido até sábado..."
              className="w-full mt-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm resize-none h-20 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mensagem Motivacional */}
      <Card className="border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-400" />
            Mensagem Motivacional do Dia
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Substitui a mensagem aleatória. Aparece quando o vendedor abre o app. Deixe vazio para usar mensagens automáticas.
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={customGreeting}
            onChange={e => setCustomGreeting(e.target.value)}
            placeholder="Ex: Hoje é dia de FEIRÃO! Quem vender 2 carros ganha bônus de R$500. Bora pra cima, time! 🔥"
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm resize-none h-24 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </CardContent>
      </Card>

      {/* Instruções Extras */}
      <Card className="border-blue-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-blue-400" />
            Instruções para o IAM
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Instruções específicas que o IAM vai seguir em TODAS as respostas. Use para direcionar o foco da equipe.
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={extraInstructions}
            onChange={e => setExtraInstructions(e.target.value)}
            placeholder="Ex: Foque em vender SUVs esta semana. Cobrar dos vendedores que atualizem os anúncios no Facebook. Priorizar financiamento pelo Santander que tem taxa especial..."
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm resize-none h-24 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </CardContent>
      </Card>

      {/* Foco da Semana */}
      <Card className="border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-green-400" />
            Foco da Semana
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Meta ou objetivo principal da semana. O IAM vai reforçar isso nas interações.
          </p>
        </CardHeader>
        <CardContent>
          <Input
            value={weeklyFocus}
            onChange={e => setWeeklyFocus(e.target.value)}
            placeholder="Ex: Captar 10 carros consignados e bater 30 agendamentos"
            className="bg-muted/20 border-border/50"
          />
        </CardContent>
      </Card>

      {/* Alerta para Vendedores */}
      <Card className={`${alertActive ? "border-red-500/30 bg-red-500/5" : "border-orange-500/20"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${alertActive ? "text-red-400" : "text-orange-400"}`} />
            Alerta para Vendedores
            <button
              onClick={() => setAlertActive(!alertActive)}
              className={`ml-auto text-xs px-3 py-1 rounded-full font-medium transition-all ${
                alertActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-muted/30 text-muted-foreground border border-border/50"
              }`}
            >
              {alertActive ? "ATIVO" : "Desativado"}
            </button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Quando ativo, aparece como alerta destacado na tela do vendedor ao abrir o app.
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={alertMessage}
            onChange={e => setAlertMessage(e.target.value)}
            placeholder="Ex: ATENÇÃO: Feirão neste sábado das 8h às 18h. Todos devem estar presentes. Confirmar presença com o gerente."
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm resize-none h-20 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </CardContent>
      </Card>

      {/* Taxa de Financiamento */}
      <Card className="border-emerald-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Taxa de Financiamento
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Taxa mensal usada no simulador de financiamento dos vendedores. Altere conforme a taxa vigente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                value={financingRate}
                onChange={e => setFinancingRate(e.target.value)}
                className="bg-muted/20 border-border/50 pr-10 text-lg font-bold"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Percent className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">ao mês</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Padrão: 2.20% • Esta taxa é usada no simulador ilustrativo que os vendedores acessam
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={updateMut.isPending}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-8 shadow-lg shadow-violet-500/20"
        >
          {updateMut.isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar Configuração
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
