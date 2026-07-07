import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/TenantContext";
import { StoreLoginPicker } from "@/components/StoreLoginPicker";
import {
  Flag, Trophy, MessageCircle, BarChart3, Car, Wallet, Users, Bot,
  CheckCircle2, ArrowRight, Menu, X, Instagram, Facebook, Mail, LogIn, Zap,
} from "lucide-react";
import { PLAN_CONFIG, LAUNCH_PROMO_LIMIT, formatCentsToBRL } from "@shared/plans";

const PLANS = [
  {
    id: "trial",
    name: "Trial",
    price: "Grátis",
    originalPrice: null as string | null,
    period: "por 30 dias",
    highlight: false,
    description: "Para conhecer a plataforma sem compromisso.",
    features: ["Até 5 vendedores", "1 administrador", "Todos os módulos liberados", "Sem cartão de crédito"],
    cta: "Começar agora",
  },
  {
    id: "basic",
    name: PLAN_CONFIG.basic.name,
    price: formatCentsToBRL(PLAN_CONFIG.basic.monthlyPriceCents),
    originalPrice: formatCentsToBRL(PLAN_CONFIG.basic.originalPriceCents),
    period: "/mês",
    highlight: false,
    description: PLAN_CONFIG.basic.description,
    features: PLAN_CONFIG.basic.features,
    cta: "Fazer Cadastro",
  },
  {
    id: "pro",
    name: PLAN_CONFIG.pro.name,
    price: formatCentsToBRL(PLAN_CONFIG.pro.monthlyPriceCents),
    originalPrice: formatCentsToBRL(PLAN_CONFIG.pro.originalPriceCents),
    period: "/mês",
    highlight: true,
    description: PLAN_CONFIG.pro.description,
    features: PLAN_CONFIG.pro.features,
    cta: "Fazer Cadastro",
  },
  {
    id: "enterprise",
    name: PLAN_CONFIG.enterprise.name,
    price: `12x ${formatCentsToBRL(PLAN_CONFIG.enterprise.monthlyPriceCents)}`,
    originalPrice: `12x ${formatCentsToBRL(PLAN_CONFIG.enterprise.originalPriceCents)}`,
    period: "plano anual",
    highlight: false,
    description: PLAN_CONFIG.enterprise.description,
    features: PLAN_CONFIG.enterprise.features,
    cta: "Fazer Cadastro",
  },
];

const FEATURES = [
  { icon: Trophy, title: "Ranking e gamificação", description: "Competições, metas e mata-mata que mantêm o time engajado no dia a dia." },
  { icon: Users, title: "CRM completo", description: "Pipeline de vendas, distribuição automática de leads e histórico de conversas." },
  { icon: MessageCircle, title: "WhatsApp integrado", description: "Atendimento e disparos em massa direto do CRM, sem trocar de tela." },
  { icon: Bot, title: "Atendente com IA", description: "Responde clientes automaticamente e qualifica leads fora do horário comercial." },
  { icon: Car, title: "Estoque e F&I", description: "Controle de veículos, consignação, financiamento e despacho num só lugar." },
  { icon: Wallet, title: "Financeiro", description: "Contas a pagar e receber, comissões e fechamento de mês sem planilha." },
  { icon: BarChart3, title: "Relatórios em tempo real", description: "Painel de resultados por vendedor, equipe e loja." },
  { icon: Car, title: "Integrações prontas", description: "OLX, Webmotors, SIG Web, Meta Ads e Google Ads já homologados." },
];

const WHATSAPP_CONTACT = "https://wa.me/5500000000000";

function LoginPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="racing-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-foreground">Entrar na sua loja</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <StoreLoginPicker title="" description="Selecione sua loja para ir direto para a tela de login dela." />
      </div>
    </div>
  );
}

export default function ComercialHome() {
  const [, navigate] = useLocation();
  const { name: brandName, logoUrl } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const goToSignup = (planId?: string) => {
    const query = planId && planId !== "trial" ? `?plan=${planId}` : "";
    navigate(`/comercial/cadastro${query}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-heading font-bold tracking-tight text-foreground">{brandName}</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <button onClick={() => scrollTo("hero")} className="transition-colors hover:text-foreground">Início</button>
            <button onClick={() => scrollTo("recursos")} className="transition-colors hover:text-foreground">Recursos</button>
            <button onClick={() => scrollTo("planos")} className="transition-colors hover:text-foreground">Planos e Preços</button>
            <button onClick={() => scrollTo("sobre")} className="transition-colors hover:text-foreground">Quem Somos</button>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" onClick={() => setShowLoginPrompt(true)}>
              <LogIn className="mr-1.5 h-4 w-4" /> Entrar
            </Button>
            <Button onClick={() => goToSignup()} className="racing-gradient text-white">
              Criar loja grátis
            </Button>
          </div>

          <button className="p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-2 border-t border-border px-4 py-3 md:hidden">
            <button onClick={() => scrollTo("hero")} className="block w-full py-2 text-left text-sm text-muted-foreground">Início</button>
            <button onClick={() => scrollTo("recursos")} className="block w-full py-2 text-left text-sm text-muted-foreground">Recursos</button>
            <button onClick={() => scrollTo("planos")} className="block w-full py-2 text-left text-sm text-muted-foreground">Planos e Preços</button>
            <button onClick={() => scrollTo("sobre")} className="block w-full py-2 text-left text-sm text-muted-foreground">Quem Somos</button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLoginPrompt(true)}>Entrar</Button>
              <Button className="flex-1 racing-gradient text-white" onClick={() => goToSignup()}>Criar loja grátis</Button>
            </div>
          </div>
        )}
      </header>

      <section id="hero" className="relative overflow-hidden">
        <div className="checkered-flag absolute inset-0 opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Flag className="h-3.5 w-3.5" /> Plataforma completa para concessionárias
            </div>
            <h1 className="mb-4 font-heading text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Ranking, CRM e gestão de vendas numa única plataforma
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              {brandName} conecta ranking de vendedores, CRM com WhatsApp integrado, atendente com IA, estoque e financeiro,
              tudo isolado por loja e pronto para sua concessionária usar hoje.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => goToSignup()} className="racing-gradient glow-orange text-white">
                Criar loja grátis <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowLoginPrompt(true)}>
                Já tenho uma loja
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Trial de 30 dias grátis. Sem cartão de crédito.</p>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="mb-3 font-heading text-3xl font-bold text-foreground">Tudo que a sua loja precisa</h2>
            <p className="text-muted-foreground">Um módulo para cada setor, todos conversando entre si.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="racing-card p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-foreground">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-t border-border bg-card/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-6 max-w-xl text-center">
            <h2 className="mb-3 font-heading text-3xl font-bold text-foreground">Planos e Preços</h2>
            <p className="text-muted-foreground">
              Faça o cadastro agora, entre no trial grátis por 30 dias e depois assine o plano ideal dentro da plataforma.
            </p>
          </div>

          <div className="mb-10 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
              <Zap className="h-3.5 w-3.5" />
              Preço promocional de lançamento para as primeiras {LAUNCH_PROMO_LIMIT} lojas clientes
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`racing-card flex flex-col p-6 ${plan.highlight ? "border-primary/60 ring-1 ring-primary/40" : ""}`}>
                {plan.highlight && (
                  <span className="mb-3 self-start rounded-full bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Mais popular
                  </span>
                )}
                <h3 className="font-heading text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="mt-2 mb-1 flex flex-wrap items-baseline gap-2">
                  {plan.originalPrice && <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}</span>}
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                </div>
                <p className="mb-4 text-[11px] text-muted-foreground">{plan.period}</p>
                <p className="mb-4 text-xs text-muted-foreground">{plan.description}</p>
                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => goToSignup(plan.id)}
                  className={`w-full ${plan.id === "trial" ? "racing-gradient text-white" : ""}`}
                  variant={plan.id === "trial" ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre" className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 font-heading text-3xl font-bold text-foreground">Quem Somos</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Nascemos dentro de uma concessionária de verdade, resolvendo o mesmo problema que toda loja de veículos enfrenta:
            times de vendas espalhados entre WhatsApp, planilha e papel, sem visibilidade de quem está performando e por quê.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            O {brandName} nasceu para juntar ranking, CRM, atendimento e gestão num só lugar, pensado por quem vive o dia a dia
            de uma loja de carros, não por quem só olha planilha de fora.
          </p>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-3 font-heading text-2xl font-bold text-foreground">Pronto para acelerar suas vendas?</h2>
          <p className="mb-6 text-muted-foreground">Crie sua loja agora. Leva menos de 2 minutos e não exige cartão de crédito.</p>
          <Button size="lg" onClick={() => goToSignup()} className="racing-gradient glow-orange text-white">
            Criar loja grátis <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt={brandName} className="h-6 w-6 rounded object-contain" />
            <span className="font-heading text-sm font-bold text-foreground">{brandName}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground" aria-label="WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </a>
            <a href="mailto:contato@kafkarank.com" className="transition-colors hover:text-foreground" aria-label="E-mail">
              <Mail className="h-4 w-4" />
            </a>
            <a href="#" className="transition-colors hover:text-foreground" aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="transition-colors hover:text-foreground" aria-label="Facebook">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</p>
        </div>
      </footer>

      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
}
