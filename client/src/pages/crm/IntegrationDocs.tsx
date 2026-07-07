import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getCurrentTenantSlug, buildTenantPath } from "@/lib/tenant";
import {
  ArrowLeft, Copy, ExternalLink, Globe, Instagram, Facebook,
  Mail, MessageCircle, Webhook, Code, FileText, ChevronDown, ChevronRight,
  Zap, Target, CheckCircle2, Database, Eye, EyeOff
} from "lucide-react";

const API_BASE = window.location.origin;

function CopyBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative group">
      {label && <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">{label}</p>}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-x-auto">
        <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">{code}</pre>
        <button
          onClick={() => { navigator.clipboard.writeText(code); toast.success("Copiado!"); }}
          className="absolute top-2 right-2 p-1.5 rounded bg-gray-800 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, color, children, defaultOpen = false }: {
  title: string; icon: any; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-foreground flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-border">{children}</div>}
    </div>
  );
}

export default function IntegrationDocs() {
  const [, navigate] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const { data: integrations } = trpc.crmIntegrations.list.useQuery();
  const [revealedId, setRevealedId] = useState<number | null>(null);

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copiado!`); };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(buildTenantPath(tenantSlug, "/crm/admin"))} className="p-1.5 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground">Guia de Integrações</h1>
            <p className="text-[10px] text-muted-foreground">Como conectar cada plataforma ao CRM</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Tokens já configurados desta loja */}
        {integrations && integrations.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">Seus tokens configurados</h3>
            <div className="space-y-2">
              {integrations.map(i => (
                <div key={i.id} className="flex items-center gap-2 bg-background rounded-lg border border-border p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{i.name} <span className="text-[10px] text-muted-foreground">({i.type})</span></p>
                    <code className="text-[10px] font-mono text-muted-foreground">{revealedId === i.id ? i.apiToken : "•".repeat(20)}</code>
                  </div>
                  <button onClick={() => setRevealedId(revealedId === i.id ? null : i.id)} className="p-1.5 rounded hover:bg-accent shrink-0">
                    {revealedId === i.id ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => copy(i.apiToken || "", "Token")} className="p-1.5 rounded hover:bg-accent shrink-0"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick overview */}
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4">
          <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" /> Visão Geral
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O Kafka CRM recebe leads de qualquer plataforma via <strong className="text-foreground">webhooks</strong> (URLs que recebem dados automaticamente).
            Cada integração envia os dados do lead para uma URL específica, e o CRM cria o lead automaticamente, distribui para o próximo vendedor via round-robin, e dispara alertas.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-background/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-foreground">12+</p>
              <p className="text-[10px] text-muted-foreground">Plataformas suportadas</p>
            </div>
            <div className="bg-background/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-foreground">Auto</p>
              <p className="text-[10px] text-muted-foreground">Distribuição round-robin</p>
            </div>
          </div>
        </div>

        {/* API Base URL */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-bold text-foreground mb-2">URL Base da API</h3>
          <CopyBlock code={API_BASE} />
          <p className="text-[10px] text-muted-foreground mt-2">
            Use esta URL como base para todos os endpoints abaixo.
          </p>
        </div>

        {/* ===== INSTAGRAM / FACEBOOK ADS ===== */}
        <Section title="Instagram / Facebook Ads (Meta Lead Ads)" icon={Instagram} color="bg-gradient-to-r from-pink-500 to-purple-500" defaultOpen>
          <div className="mt-3 space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400 font-bold mb-1">Melhor opção para tráfego pago no Instagram/Facebook!</p>
              <p className="text-[10px] text-muted-foreground">
                Quando alguém preenche o formulário do anúncio (Lead Ad), o lead cai automaticamente no CRM com origem "Insta Ads" ou "FB Ads".
              </p>
            </div>

            <h4 className="text-xs font-bold text-foreground">Opção 1: Direto pelo Meta (avançado)</h4>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Acesse <a href="https://developers.facebook.com" target="_blank" className="text-blue-400 underline">developers.facebook.com</a></li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Crie um App tipo "Business" e conecte sua página</li>
              <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Em Webhooks, adicione o produto "Page" e inscreva o campo "leadgen"</li>
              <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Configure a URL de callback:</li>
            </ol>
            <CopyBlock code={`${API_BASE}/api/webhooks/meta/leadgen`} label="URL do Webhook" />
            <CopyBlock code={`${API_BASE}/api/webhooks/meta/verify`} label="URL de Verificação" />

            <h4 className="text-xs font-bold text-foreground mt-4">Opção 2: Via Zapier / Make (mais fácil)</h4>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> No Zapier/Make, crie uma automação: "Facebook Lead Ads → Webhook"</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Configure o webhook para enviar POST para:</li>
            </ol>
            <CopyBlock code={`${API_BASE}/api/webhooks/meta/leadgen`} label="URL do Webhook" />
            <p className="text-[10px] text-muted-foreground">Mapeie os campos assim:</p>
            <CopyBlock code={JSON.stringify({
              name: "{{full_name}}",
              phone: "{{phone_number}}",
              email: "{{email}}",
              vehicle: "{{campo_personalizado_veiculo}}",
              platform: "instagram",
              campaign_name: "{{campaign_name}}",
              ad_name: "{{ad_name}}"
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-green-400">Não precisa de token!</strong> O endpoint do Meta é público para facilitar a integração.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== GOOGLE ADS ===== */}
        <Section title="Google Ads (Lead Form Extensions)" icon={Globe} color="bg-emerald-500">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Se você usa extensões de formulário de lead no Google Ads, configure o webhook para enviar os dados diretamente.
            </p>

            <h4 className="text-xs font-bold text-foreground">Via Zapier / Make</h4>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> No Zapier: "Google Ads Lead Form Extension → Webhook"</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Configure o POST para:</li>
            </ol>
            <CopyBlock code={`${API_BASE}/api/webhooks/google/lead`} label="URL do Webhook" />
            <CopyBlock code={JSON.stringify({
              name: "{{full_name}}",
              phone: "{{phone_number}}",
              email: "{{email}}",
              vehicle: "{{campo_personalizado}}",
              campaign_name: "{{campaign_name}}"
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <h4 className="text-xs font-bold text-foreground mt-4">Via Landing Page com UTM</h4>
            <p className="text-xs text-muted-foreground">
              Se o Google Ads direciona para uma landing page, use o <strong className="text-foreground">Widget Kafka</strong> (veja seção abaixo).
              O widget captura automaticamente os UTMs da URL e identifica como "Google Ads".
            </p>
            <CopyBlock code="https://sualandingpage.com?utm_source=google&utm_medium=cpc&utm_campaign=veiculos" label="Exemplo de URL com UTM" />
          </div>
        </Section>

        {/* ===== LANDING PAGE / WIDGET ===== */}
        <Section title="Landing Page (Widget Embeddable)" icon={Code} color="bg-indigo-500" defaultOpen>
          <div className="mt-3 space-y-3">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-400 font-bold mb-1">Ideal para tráfego pago!</p>
              <p className="text-[10px] text-muted-foreground">
                Cole uma linha de código na sua landing page e pronto. O widget cria um botão flutuante com formulário de contato.
                Captura UTMs automaticamente da URL, então funciona com Google Ads, Facebook Ads, Instagram Ads, etc.
              </p>
            </div>

            <h4 className="text-xs font-bold text-foreground">Como instalar</h4>
            <p className="text-xs text-muted-foreground">Cole este código antes do &lt;/body&gt; da sua landing page:</p>
            <CopyBlock code={`<script src="${API_BASE}/api/webhooks/widget.js" data-kafka-crm></script>`} label="Código do Widget" />

            <h4 className="text-xs font-bold text-foreground mt-4">Como funciona</h4>
            <ol className="space-y-1 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Aparece um botão vermelho flutuante no canto inferior direito</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Cliente clica e preenche: nome, telefone, veículo, mensagem</li>
              <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Lead é criado no CRM automaticamente como "hot" (quente)</li>
              <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Distribuído automaticamente para o próximo vendedor</li>
              <li className="flex gap-2"><span className="text-primary font-bold">5.</span> UTMs são capturados da URL para rastrear a campanha</li>
            </ol>

            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-green-400">Não precisa de token!</strong> O widget é público e funciona em qualquer site.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== SIG WEB ===== */}
        <Section title="SIG Web (sistema de gestão)" icon={Database} color="bg-cyan-500">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Sincronize vendas e estoque do seu sistema de gestão SIG Web com o CRM. Ative a integração em <strong className="text-foreground">Ajustes → Integrações → SIG Web</strong> para gerar o token da sua loja.
            </p>

            <h4 className="text-xs font-bold text-foreground">Sincronizar venda (fecha o lead automaticamente)</h4>
            <CopyBlock code={`${API_BASE}/api/webhooks/sig/sale`} label="URL do Webhook" />
            <p className="text-[10px] text-muted-foreground">Header obrigatório:</p>
            <CopyBlock code={`x-api-token: SEU_TOKEN_AQUI`} label="Header de autenticação" />
            <CopyBlock code={JSON.stringify({
              leadId: 123,
              vehicleModel: "HB20 2023",
              saleValue: 75000,
              sigId: "SIG-000123"
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <h4 className="text-xs font-bold text-foreground mt-4">Sincronizar estoque (adiciona veículo e avisa leads interessados)</h4>
            <CopyBlock code={`${API_BASE}/api/webhooks/sig/inventory`} label="URL do Webhook" />
            <p className="text-[10px] text-muted-foreground">Header obrigatório:</p>
            <CopyBlock code={`x-api-token: SEU_TOKEN_AQUI`} label="Header de autenticação" />
            <CopyBlock code={JSON.stringify({
              brand: "Hyundai",
              model: "HB20",
              year: 2023,
              plate: "ABC1D23",
              color: "Prata",
              mileage: 12000,
              fuelType: "Flex",
              transmission: "Automático",
              price: 75000,
              costPrice: 68000
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-blue-400">Dica:</strong> peça pro suporte do SIG Web (ou pra área de TI de vocês) configurar o envio automático desses dados via webhook usando essas URLs e o token da sua loja. Campos <code className="bg-accent px-1 rounded">brand</code> e <code className="bg-accent px-1 rounded">model</code> são obrigatórios na sincronização de estoque.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== OLX / WEBMOTORS / SOCARRÃO ===== */}
        <Section title="OLX / Webmotors / SóCarrão / iCarros" icon={Mail} color="bg-orange-500">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Essas plataformas enviam notificações por email quando alguém se interessa por um anúncio.
              Configure o encaminhamento automático de emails para o parser do CRM.
            </p>

            <h4 className="text-xs font-bold text-foreground">Opção 1: Via Zapier (recomendado)</h4>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> No Zapier: "Email by Zapier (New Inbound Email)" ou "Gmail → Webhook"</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Filtre emails de: noreply@olx.com.br, contato@webmotors.com.br, etc.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Envie POST para:</li>
            </ol>
            <CopyBlock code={`${API_BASE}/api/webhooks/email-parser`} label="URL do Webhook" />
            <p className="text-[10px] text-muted-foreground">Header obrigatório:</p>
            <CopyBlock code={`x-api-token: SEU_TOKEN_AQUI`} label="Header de autenticação" />
            <CopyBlock code={JSON.stringify({
              subject: "{{email_subject}}",
              body: "{{email_body_plain}}",
              from: "{{from_email}}",
              html: "{{email_body_html}}"
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <h4 className="text-xs font-bold text-foreground mt-4">Opção 2: Encaminhamento de email</h4>
            <p className="text-xs text-muted-foreground">
              Configure uma regra no seu email para encaminhar automaticamente emails da OLX/Webmotors para um serviço como
              <a href="https://mailparser.io" target="_blank" className="text-blue-400 underline ml-1">Mailparser.io</a> ou
              <a href="https://parseur.com" target="_blank" className="text-blue-400 underline ml-1">Parseur.com</a>,
              que extrai os dados e envia para o webhook acima.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-blue-400">Detecção automática:</strong> O parser identifica automaticamente se o email é da OLX, Webmotors, SóCarrão ou iCarros
                e extrai nome, telefone e veículo de interesse.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== WHATSAPP ===== */}
        <Section title="WhatsApp (Z-API / Evolution API)" icon={MessageCircle} color="bg-green-500">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Integre com Z-API, Evolution API, Twilio ou qualquer provedor de WhatsApp Business API.
            </p>

            <CopyBlock code={`${API_BASE}/api/webhooks/whatsapp`} label="URL do Webhook" />
            <p className="text-[10px] text-muted-foreground">Header obrigatório:</p>
            <CopyBlock code={`x-api-token: SEU_TOKEN_AQUI`} label="Header de autenticação" />
            <CopyBlock code={JSON.stringify({
              from: "5547999999999",
              message: "Oi, vi o anúncio do HB20...",
              timestamp: 1711000000000
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <p className="text-xs text-muted-foreground">
              Se o número já existe como lead, adiciona atividade. Se não existe, cria um novo lead automaticamente.
            </p>
          </div>
        </Section>

        {/* ===== MANYCHAT / CHATBOT ===== */}
        <Section title="ManyChat / Chatbot (Instagram Direct)" icon={Zap} color="bg-blue-400">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Se você usa ManyChat ou outro chatbot no Instagram Direct, configure para enviar os dados coletados via webhook genérico.
            </p>

            <h4 className="text-xs font-bold text-foreground">No ManyChat</h4>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Crie um fluxo que coleta: nome, telefone, veículo de interesse</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> No final do fluxo, adicione ação "External Request" (HTTP Request)</li>
              <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Configure POST para:</li>
            </ol>
            <CopyBlock code={`${API_BASE}/api/webhooks/generic`} label="URL do Webhook" />
            <p className="text-[10px] text-muted-foreground">Headers:</p>
            <CopyBlock code={`Content-Type: application/json\nx-api-token: SEU_TOKEN_AQUI`} label="Headers" />
            <CopyBlock code={JSON.stringify({
              nome: "{{user_full_name}}",
              telefone: "{{phone}}",
              carro: "{{veiculo_interesse}}",
              origem: "manychat",
              mensagem: "Lead via chatbot Instagram"
            }, null, 2)} label="Corpo do webhook (JSON)" />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground">
                <strong className="text-blue-400">Flexível:</strong> O webhook genérico aceita campos em português ou inglês.
                Aceita: nome/name, telefone/phone, carro/vehicle, origem/source, etc.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== WEBHOOK GENÉRICO ===== */}
        <Section title="Webhook Genérico (qualquer plataforma)" icon={Webhook} color="bg-violet-500">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Use este endpoint para integrar qualquer plataforma que suporte webhooks: n8n, Zapier, Make, Pabbly, ActiveCampaign, RD Station, etc.
            </p>

            <CopyBlock code={`POST ${API_BASE}/api/webhooks/generic`} label="Endpoint" />
            <p className="text-[10px] text-muted-foreground">Headers:</p>
            <CopyBlock code={`Content-Type: application/json\nx-api-token: SEU_TOKEN_AQUI`} label="Headers" />

            <h4 className="text-xs font-bold text-foreground">Campos aceitos (flexíveis)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-accent">
                    <th className="text-left p-2 font-bold text-foreground">Campo</th>
                    <th className="text-left p-2 font-bold text-foreground">Alternativas aceitas</th>
                    <th className="text-left p-2 font-bold text-foreground">Obrigatório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-2 text-muted-foreground">name</td><td className="p-2 text-muted-foreground">full_name, nome, customer_name, lead_name, first_name</td><td className="p-2 text-green-400">Sim*</td></tr>
                  <tr><td className="p-2 text-muted-foreground">phone</td><td className="p-2 text-muted-foreground">phone_number, telefone, celular, whatsapp, tel</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">email</td><td className="p-2 text-muted-foreground">e_mail, mail</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">vehicle</td><td className="p-2 text-muted-foreground">vehicleInterest, veiculo, carro, interesse, car</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">source</td><td className="p-2 text-muted-foreground">origem, platform, canal</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">notes</td><td className="p-2 text-muted-foreground">observacao, mensagem, message, comentario</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">utm_source</td><td className="p-2 text-muted-foreground">-</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">utm_medium</td><td className="p-2 text-muted-foreground">-</td><td className="p-2 text-muted-foreground">Não</td></tr>
                  <tr><td className="p-2 text-muted-foreground">utm_campaign</td><td className="p-2 text-muted-foreground">-</td><td className="p-2 text-muted-foreground">Não</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">* Se nome não for enviado, será criado como "Lead sem nome"</p>
          </div>
        </Section>

        {/* ===== API GENÉRICA ===== */}
        <Section title="API Direta (com token)" icon={FileText} color="bg-gray-600">
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Para integrações customizadas, use a API direta com token de autenticação.
            </p>

            <h4 className="text-xs font-bold text-foreground">Criar um lead</h4>
            <CopyBlock code={`curl -X POST ${API_BASE}/api/webhooks/lead \\
  -H "Content-Type: application/json" \\
  -H "x-api-token: SEU_TOKEN_AQUI" \\
  -d '{
    "name": "João Silva",
    "phone": "47999999999",
    "email": "joao@email.com",
    "vehicleInterest": "HB20 2023",
    "source": "olx",
    "department": "vendas",
    "score": "hot",
    "notes": "Viu anúncio na OLX"
  }'`} label="Exemplo cURL" />

            <h4 className="text-xs font-bold text-foreground mt-4">Criar múltiplos leads</h4>
            <CopyBlock code={`curl -X POST ${API_BASE}/api/webhooks/leads/bulk \\
  -H "Content-Type: application/json" \\
  -H "x-api-token: SEU_TOKEN_AQUI" \\
  -d '{
    "leads": [
      {"name": "João", "phone": "47999999999", "source": "olx"},
      {"name": "Maria", "phone": "47988888888", "source": "webmotors"}
    ]
  }'`} label="Exemplo cURL (bulk)" />

            <h4 className="text-xs font-bold text-foreground mt-4">Documentação completa da API</h4>
            <CopyBlock code={`${API_BASE}/api/webhooks/docs`} label="URL da documentação JSON" />
          </div>
        </Section>

        {/* ===== COMO GERAR TOKEN ===== */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Como gerar o Token de API
          </h3>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Acesse o <strong className="text-foreground">Painel Admin</strong> do CRM → <strong className="text-foreground">Ajustes</strong></li>
            <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Na seção <strong className="text-foreground">Integrações</strong>, clique em <strong className="text-foreground">"Ativar Integração"</strong> em SIG Web ou OLX/Webmotors</li>
            <li className="flex gap-2"><span className="text-primary font-bold">3.</span> O token é gerado automaticamente. Clique para revelar e copiar, e use no header <code className="bg-accent px-1 rounded text-foreground">x-api-token</code></li>
            <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Para outras plataformas (ManyChat, n8n, webhook genérico), use a API direta com o mesmo token — veja seção "API Direta" acima</li>
          </ol>
          <Button onClick={() => navigate(buildTenantPath(tenantSlug, "/crm/admin"))} size="sm" className="mt-3 racing-gradient text-white">
            Ir para Integrações
          </Button>
        </div>

        {/* Summary table */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Resumo das Integrações</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-accent">
                  <th className="text-left p-2 font-bold text-foreground">Origem</th>
                  <th className="text-left p-2 font-bold text-foreground">Endpoint</th>
                  <th className="text-left p-2 font-bold text-foreground">Token?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2 text-pink-400 font-medium">Instagram Ads</td><td className="p-2 text-muted-foreground">/api/webhooks/meta/leadgen</td><td className="p-2 text-green-400">Não</td></tr>
                <tr><td className="p-2 text-blue-400 font-medium">Facebook Ads</td><td className="p-2 text-muted-foreground">/api/webhooks/meta/leadgen</td><td className="p-2 text-green-400">Não</td></tr>
                <tr><td className="p-2 text-emerald-400 font-medium">Google Ads</td><td className="p-2 text-muted-foreground">/api/webhooks/google/lead</td><td className="p-2 text-green-400">Não</td></tr>
                <tr><td className="p-2 text-indigo-400 font-medium">Landing Page</td><td className="p-2 text-muted-foreground">/api/webhooks/widget/lead</td><td className="p-2 text-green-400">Não</td></tr>
                <tr><td className="p-2 text-cyan-400 font-medium">SIG Web (venda)</td><td className="p-2 text-muted-foreground">/api/webhooks/sig/sale</td><td className="p-2 text-amber-400">Sim</td></tr>
                <tr><td className="p-2 text-cyan-400 font-medium">SIG Web (estoque)</td><td className="p-2 text-muted-foreground">/api/webhooks/sig/inventory</td><td className="p-2 text-amber-400">Sim</td></tr>
                <tr><td className="p-2 text-orange-400 font-medium">OLX/Webmotors/etc</td><td className="p-2 text-muted-foreground">/api/webhooks/email-parser</td><td className="p-2 text-amber-400">Sim</td></tr>
                <tr><td className="p-2 text-green-400 font-medium">WhatsApp</td><td className="p-2 text-muted-foreground">/api/webhooks/whatsapp</td><td className="p-2 text-amber-400">Sim</td></tr>
                <tr><td className="p-2 text-blue-300 font-medium">ManyChat/Chatbot</td><td className="p-2 text-muted-foreground">/api/webhooks/generic</td><td className="p-2 text-amber-400">Sim</td></tr>
                <tr><td className="p-2 text-violet-400 font-medium">Qualquer plataforma</td><td className="p-2 text-muted-foreground">/api/webhooks/generic</td><td className="p-2 text-amber-400">Sim</td></tr>
                <tr><td className="p-2 text-gray-400 font-medium">API direta</td><td className="p-2 text-muted-foreground">/api/webhooks/lead</td><td className="p-2 text-amber-400">Sim</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
