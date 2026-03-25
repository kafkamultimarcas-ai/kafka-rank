import { useState, useEffect } from "react";
import { Bot, X, Sparkles, AlertTriangle, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface IAMGreetingProps {
  sellerName: string;
  sellerId: number;
}

const MOTIVATIONAL_MESSAGES = [
  "Hoje é dia de FECHAR negócio! Cada cliente que entra é uma oportunidade de ouro. Vai com tudo!",
  "Campeão, lembra: quem faz mais contatos, vende mais. Bora ligar, mandar mensagem e agendar visitas!",
  "Você não é um vendedor comum — você é um CLOSER. Hoje alguém vai sair de carro novo por sua causa!",
  "O segredo dos top sellers? Consistência. Faça hoje o que os outros não querem fazer e colha os resultados!",
  "Cada 'não' te aproxima do 'sim'. Não desanime — o próximo cliente pode ser a venda do mês!",
  "Foco no cliente, não no carro. Entenda o sonho dele e mostre como você pode realizar. Bora vender!",
  "Lembre-se: você não vende carro, você vende SOLUÇÃO. Mobilidade, status, segurança. Pense assim!",
  "Top vendedor não espera o cliente — ele CRIA oportunidade. Quem você vai prospectar hoje?",
  "A energia que você transmite é a energia que volta. Sorria, seja positivo e venda com paixão!",
  "Seu diferencial não é o preço — é VOCÊ. Sua atenção, seu conhecimento, seu atendimento. Brilha!",
  "Hoje é dia de quebrar recorde! Não importa o placar de ontem, o jogo é AGORA. Vai com tudo!",
  "Cliente indeciso? Use gatilhos mentais! Escassez, urgência, prova social. Você tem as armas, use!",
  "Pós-venda é pré-venda! Ligou pro cliente de ontem? Uma indicação vale mais que 10 leads frios!",
  "Não existe mercado ruim pra vendedor bom. Enquanto outros reclamam, você VENDE. Essa é a diferença!",
  "Acredite no produto, acredite em você. Confiança vende mais que qualquer desconto!",
];

const CONTEXT_MESSAGES: Record<string, string> = {
  normal: "",
  feirao: "🔥 FEIRÃO EM ANDAMENTO! Aproveite a energia, o fluxo de clientes vai ser alto. Foque em fechar rápido!",
  movimento_fraco: "📞 Movimento tá fraco? Hora de PROSPECTAR! Liga pros leads, manda mensagem, resgata quem sumiu. Quem busca, acha!",
  meta_apertada: "🎯 META APERTADA! Cada atendimento conta. Foco total em conversão. Não deixe nenhum cliente sair sem proposta!",
  fim_de_mes: "⚡ ÚLTIMOS DIAS DO MÊS! É agora ou nunca. Pressão vira diamante. Bora fechar tudo que tem pendente!",
  inicio_de_mes: "🚀 INÍCIO DE MÊS! Hora de plantar. Quem prospecta agora, colhe no fim do mês. Monte sua agenda!",
  promocao: "🎁 PROMOÇÃO ATIVA! Use isso como argumento de venda. Cliente adora sentir que tá fazendo um bom negócio!",
  lancamento: "✨ LANÇAMENTO! Novidades chamam atenção. Destaque os novos veículos e crie desejo nos clientes!",
  treinamento: "📚 DIA DE TREINAMENTO! Aproveite pra aprender algo novo. Conhecimento é a arma mais poderosa do vendedor!",
};

export default function IAMGreeting({ sellerName, sellerId }: IAMGreetingProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { data: iamConfig } = trpc.iamConfig.get.useQuery();

  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(`iam_greeting_${sellerId}`);
    if (lastShown === today) {
      setDismissed(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [sellerId]);

  function dismiss() {
    setVisible(false);
    const today = new Date().toDateString();
    localStorage.setItem(`iam_greeting_${sellerId}`, today);
    setTimeout(() => setDismissed(true), 300);
  }

  if (dismissed) return null;

  const hour = new Date().getHours();
  let greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = sellerName.split(" ")[0];

  // Use custom greeting from admin or random motivational
  const customGreeting = iamConfig?.customGreeting;
  const motivationalMsg = customGreeting || MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

  // Context message from admin
  const contextMsg = iamConfig?.dayContext ? CONTEXT_MESSAGES[iamConfig.dayContext] || "" : "";

  // Alert from admin
  const hasAlert = iamConfig?.alertActive && iamConfig?.alertMessage;

  // Weekly focus
  const weeklyFocus = iamConfig?.weeklyFocus;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end justify-center p-4 pointer-events-none transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 pointer-events-auto transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={dismiss}
      />

      {/* Card */}
      <div className={`relative pointer-events-auto w-full max-w-md mb-20 transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <div className="bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950 rounded-2xl border border-violet-500/30 shadow-2xl shadow-violet-500/20 overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">IAM</span>
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <span className="text-[10px] text-violet-300">Seu mentor de vendas</span>
              </div>
            </div>
            <button onClick={dismiss} className="text-violet-400 hover:text-white transition-colors p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Motivational Message */}
          <div className="px-4 pb-2">
            <div className="bg-violet-900/30 rounded-xl px-4 py-3 border border-violet-500/10">
              <p className="text-sm text-violet-100 whitespace-pre-line leading-relaxed">
                {greeting}, {firstName}! 💪{"\n\n"}{motivationalMsg}
              </p>
            </div>
          </div>

          {/* Context Message (from admin) */}
          {contextMsg && (
            <div className="px-4 pb-2">
              <div className="bg-amber-900/20 rounded-xl px-4 py-2.5 border border-amber-500/20">
                <p className="text-xs text-amber-200 leading-relaxed">{contextMsg}</p>
                {iamConfig?.dayContextCustom && (
                  <p className="text-[10px] text-amber-300/70 mt-1">{iamConfig.dayContextCustom}</p>
                )}
              </div>
            </div>
          )}

          {/* Alert from Admin */}
          {hasAlert && (
            <div className="px-4 pb-2">
              <div className="bg-red-900/20 rounded-xl px-4 py-2.5 border border-red-500/30 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase">Aviso do Gerente</p>
                  <p className="text-xs text-red-200 leading-relaxed">{iamConfig?.alertMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Focus */}
          {weeklyFocus && (
            <div className="px-4 pb-2">
              <div className="bg-green-900/20 rounded-xl px-3 py-2 border border-green-500/20 flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                <p className="text-[10px] text-green-300">
                  <span className="font-semibold">Foco da semana:</span> {weeklyFocus}
                </p>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 pt-1">
            <p className="text-[10px] text-violet-400 text-center">
              Toque no botão roxo a qualquer momento para pedir ajuda ao IAM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
