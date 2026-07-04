import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranding } from "@/contexts/TenantContext";
import { getTenantLoginPath } from "@/lib/tenant";
import { slugify } from "@/lib/tenantForm";
import {
  Flag, Trophy, MessageCircle, BarChart3, Car, Wallet, Users, Bot,
  CheckCircle2, ArrowRight, Menu, X, Instagram, Facebook, Mail, LogIn, Zap,
} from "lucide-react";
import { PLAN_CONFIG, LAUNCH_PROMO_LIMIT, formatCentsToBRL } from "@shared/plans";

// Preços derivados de shared/plans.ts (fonte única, mesma usada pra cobrar de
// verdade no billingRouter) — só a copy/CTA de cada card fica aqui.
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
    cta: "Falar com vendas",
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
    cta: "Falar com vendas",
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
    cta: "Falar com vendas",
  },
];

const FEATURES = [
  { icon: Trophy, title: "Ranking e gamificação", description: "Competições, metas e mata-mata que mantêm o time engajado no dia a dia." },
  { icon: Users, title: "CRM completo", description: "Pipeline de vendas, distribuição automática de leads e histórico de conversas." },
  { icon: MessageCircle, title: "WhatsApp integrado", description: "Atendimento e disparos em massa direto do CRM, sem trocar de tela." },
  { icon: Bot, title: "Atendente com IA", description: "Responde clientes automaticamente e qualifica leads fora do horário comercial." },
  { icon: Car, title: "Estoque e F&I", description: "Controle de veículos, consignação, financiamento e despacho num só lugar." },
  { icon: Wallet, title: "Financeiro", description: "Contas a pagar/receber, comissões e fechamento de mês sem planilha." },
  { icon: BarChart3, title: "Relatórios em tempo real", description: "Painel de resultados por vendedor, equipe e loja." },
  { icon: Car, title: "Integrações prontas", description: "OLX, Webmotors, SIG Web, Meta Ads e Google Ads já homologados." },
];

const WHATSAPP_CONTACT = "https://wa.me/5500000000000";

function LoginPrompt({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState("");

  const go = () => {
    const slug = slugify(value.trim());
    if (!slug) return;
    navigate(getTenantLoginPath(slug));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="racing-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold text-foreground">Entrar na sua loja</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Digite o nome ou a URL da sua loja no Kafka Rank pra ir direto pra tela de login dela.
        </p>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ex: minha-loja"
          onKeyDown={(e) => e.key === "Enter" && go()}
          autoFocus
        />
        <Button onClick={go} disabled={!value.trim()} className="w-full mt-3">
          Continuar <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-heading font-bold text-foreground tracking-tight">{brandName}</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo("hero")} className="hover:text-foreground transition-colors">Início</button>
            <button onClick={() => scrollTo("recursos")} className="hover:text-foreground transition-colors">Recursos</button>
            <button onClick={() => scrollTo("planos")} className="hover:text-foreground transition-colors">Planos e Preços</button>
            <button onClick={() => scrollTo("sobre")} className="hover:text-foreground transition-colors">Quem Somos</button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => setShowLoginPrompt(true)}>
              <LogIn className="w-4 h-4 mr-1.5" /> Entrar
            </Button>
            <Button onClick={() => navigate("/comercial/cadastro")} className="racing-gradient text-white">
              Criar loja grátis
            </Button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border px-4 py-3 space-y-2">
            <button onClick={() => scrollTo("hero")} className="block w-full text-left py-2 text-sm text-muted-foreground">Início</button>
            <button onClick={() => scrollTo("recursos")} className="block w-full text-left py-2 text-sm text-muted-foreground">Recursos</button>
            <button onClick={() => scrollTo("planos")} className="block w-full text-left py-2 text-sm text-muted-foreground">Planos e Preços</button>
            <button onClick={() => scrollTo("sobre")} className="block w-full text-left py-2 text-sm text-muted-foreground">Quem Somos</button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLoginPrompt(true)}>Entrar</Button>
              <Button className="flex-1 racing-gradient text-white" onClick={() => navigate("/comercial/cadastro")}>Criar loja grátis</Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        <div className="checkered-flag absolute inset-0 opacity-[0.03]" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
              <Flag className="w-3.5 h-3.5" /> Plataforma completa para concessionárias
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              Ranking, CRM e gestão de vendas numa única plataforma
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {brandName} conecta ranking de vendedores, CRM com WhatsApp integrado, atendente com IA, estoque e financeiro —
              tudo isolado por loja, pronto pra sua concessionária usar hoje.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => navigate("/comercial/cadastro")} className="racing-gradient text-white glow-orange">
                Criar loja grátis <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowLoginPrompt(true)}>
                Já tenho uma loja
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Trial de 30 dias grátis. Sem cartão de crédito.</p>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="font-heading text-3xl font-bold text-foreground mb-3">Tudo que a sua loja precisa</h2>
            <p className="text-muted-foreground">Um módulo pra cada setor, todos conversando entre si.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="racing-card p-5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos e Preços */}
      <section id="planos" className="py-20 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h2 className="font-heading text-3xl font-bold text-foreground mb-3">Planos e Preços</h2>
            <p className="text-muted-foreground">Comece grátis. Fale com a gente quando quiser escalar.</p>
          </div>

          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              Preço promocional de lançamento para as primeiras {LAUNCH_PROMO_LIMIT} lojas clientes
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`racing-card p-6 flex flex-col ${plan.highlight ? "border-primary/60 ring-1 ring-primary/40" : ""}`}>
                {plan.highlight && (
                  <span className="self-start mb-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/20 text-primary">
                    Mais popular
                  </span>
                )}
                <h3 className="font-heading text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="mt-2 mb-1 flex items-baseline gap-2 flex-wrap">
                  {plan.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}</span>
                  )}
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-4">{plan.period}</p>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {feat}
                    </li>
                  ))}
                </ul>
                {plan.id === "trial" ? (
                  <Button onClick={() => navigate("/comercial/cadastro")} className="w-full racing-gradient text-white">
                    {plan.cta}
                  </Button>
                ) : (
                  <Button variant="outline" asChild className="w-full">
                    <a href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer">{plan.cta}</a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quem Somos */}
      {/* Texto institucional — rascunho editável, sem informações factuais reais sobre a empresa. */}
      <section id="sobre" className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-4">Quem Somos</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Nascemos dentro de uma concessionária de verdade, resolvendo o mesmo problema que toda loja de veículos enfrenta:
            times de vendas espalhados entre WhatsApp, planilha e papel, sem visibilidade de quem está performando e por quê.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            O {brandName} nasceu pra juntar ranking, CRM, atendimento e gestão num só lugar — pensado por quem vive o dia a
            dia de uma loja de carros, não por quem só olha planilha de fora.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-3">Pronto pra acelerar suas vendas?</h2>
          <p className="text-muted-foreground mb-6">Crie sua loja agora — leva menos de 2 minutos, sem cartão de crédito.</p>
          <Button size="lg" onClick={() => navigate("/comercial/cadastro")} className="racing-gradient text-white glow-orange">
            Criar loja grátis <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt={brandName} className="h-6 w-6 rounded object-contain" />
            <span className="font-heading font-bold text-sm text-foreground">{brandName}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
            <a href="mailto:contato@kafkarank.com" className="hover:text-foreground transition-colors" aria-label="E-mail">
              <Mail className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-foreground transition-colors" aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-foreground transition-colors" aria-label="Facebook">
              <Facebook className="w-4 h-4" />
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</p>
        </div>
      </footer>

      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
}
