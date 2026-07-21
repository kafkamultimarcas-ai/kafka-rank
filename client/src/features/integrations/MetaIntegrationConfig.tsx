import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getCurrentTenantSlug } from "@/lib/tenant";
import {
  AlertTriangle, Check, CheckCircle2, ChevronRight, Copy, ExternalLink, Eye, EyeOff,
  Facebook, Instagram, Loader2, RefreshCw, Save, WifiOff, XCircle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { SyncLogSection } from "./SyncLogSection";

/** Banner de saúde do token (validação ao vivo, revalida a cada 5min). */
function TokenStatusBanner() {
  const { data: tokenStatus, isLoading, refetch } = trpc.crmIntegrations.getMetaTokenStatus.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-accent/30 p-3 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Verificando status do token...</span>
      </div>
    );
  }
  if (!tokenStatus) return null;

  if (tokenStatus.valid) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Token ativo — conta conectada</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Conta: <strong>@{tokenStatus.username}</strong> • Tipo: {tokenStatus.tokenType === "instagram" ? "Instagram Business Login" : "Facebook Page Token"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 inline-flex items-center gap-1">
            <Instagram className="w-3 h-3" /> Ativo
          </span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2"><RefreshCw className="w-3 h-3" /></Button>
        </div>
      </div>
    );
  }

  const isExpired = tokenStatus.error?.includes("expired") || tokenStatus.error?.includes("Session has expired") || tokenStatus.errorCode === 190;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isExpired ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
        <div>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {isExpired ? "Token expirado — reconecte a conta" : "Token com erro — reconecte a conta"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{tokenStatus.error}</p>
          {isExpired && (
            <p className="text-[11px] text-amber-500 mt-1">Tokens do Instagram expiram a cada 60 dias. Refaça o login OAuth para renovar.</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 inline-flex items-center gap-1">
          <WifiOff className="w-3 h-3" /> Desconectado
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2"><RefreshCw className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

/**
 * Configuração completa da integração Meta (Facebook + Instagram): credenciais,
 * webhook, token de verificação, recebimento de DMs/comentários e logs de sync.
 * Fonte única — usada tanto na aba Integrações quanto na rota dedicada.
 */
export function MetaIntegrationConfig({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { data: config, refetch } = trpc.crmIntegrations.getMetaConfig.useQuery();
  const saveMutation = trpc.crmIntegrations.saveMetaConfig.useMutation({
    onSuccess: () => { toast.success("Configuração do Meta salva!"); refetch(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  const testMutation = trpc.crmIntegrations.testMetaConnection.useMutation({
    onSuccess: (data: any) => {
      if (data.success) toast.success(`Conectado! Página: ${data.pageName} (ID: ${data.pageId})`);
      else toast.error(`Falha: ${data.error}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [expanded, setExpanded] = useState(defaultOpen);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [dmEnabled, setDmEnabled] = useState(false);
  const [commentTriggerWords, setCommentTriggerWords] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setAppId(config.appId || "");
      setAppSecret(config.appSecret || "");
      setPageAccessToken(config.pageAccessToken || "");
      setVerifyToken(config.verifyToken || "");
      setPageId(config.pageId || "");
      setDmEnabled(!!config.dmEnabled);
      setCommentTriggerWords(config.commentTriggerWords || "");
    }
  }, [config]);

  const isActive = !!(config?.hasAppSecret && config?.hasPageAccessToken);
  const slug = getCurrentTenantSlug();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${origin}/api/webhooks/meta/leadgen?tenant=${slug}`;
  const verifyUrl = `${origin}/api/webhooks/meta/verify?tenant=${slug}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateVerifyToken = () => {
    setVerifyToken("kafka_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  };

  const handleSave = () => {
    saveMutation.mutate({ appId, appSecret, pageAccessToken, verifyToken, pageId, dmEnabled, commentTriggerWords });
  };

  const label = "text-[10px] text-muted-foreground mb-1 block";
  const section = "rounded-lg bg-accent/20 border border-border p-3 space-y-3";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-blue-500/20" : "bg-amber-500/20"}`}>
            <Facebook className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-amber-400"}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">Meta (Facebook + Instagram)</h3>
            <p className="text-[10px] text-muted-foreground">Leads de anúncios, DMs e comentários — recebimento e resposta automáticos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded ${isActive ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
            {isActive ? "Configurado" : "Pendente"}
          </span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {config?.hasPageAccessToken && <TokenStatusBanner />}

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-[11px] text-blue-300 leading-relaxed">
              Crie um App em <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="underline">developers.facebook.com</a>,
              conecte sua Página do Facebook e a conta do Instagram vinculada, e copie as credenciais abaixo. O passo a passo completo está no final.
            </p>
          </div>

          {/* 1. Webhook URLs */}
          <div className={section}>
            <p className="text-xs font-bold text-foreground">1. URLs do Webhook</p>
            <div>
              <label className={label}>URL do Webhook (Callback)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 truncate">{webhookUrl}</code>
                <button onClick={() => copyToClipboard(webhookUrl, "Webhook URL")} className="p-1.5 rounded hover:bg-accent shrink-0">
                  {copied === "Webhook URL" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div>
              <label className={label}>URL de Verificação</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 truncate">{verifyUrl}</code>
                <button onClick={() => copyToClipboard(verifyUrl, "Verify URL")} className="p-1.5 rounded hover:bg-accent shrink-0">
                  {copied === "Verify URL" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Credenciais do App */}
          <div className={section}>
            <p className="text-xs font-bold text-foreground">2. Credenciais do App</p>
            <div>
              <label className={label}>App ID</label>
              <Input value={appId} onChange={e => setAppId(e.target.value)} className="h-9 text-sm font-mono" placeholder="Ex: 1234567890" />
            </div>
            <div>
              <label className={label}>App Secret (verifica a assinatura do webhook)</label>
              <div className="flex gap-2">
                <Input type={showSecret ? "text" : "password"} value={appSecret} onChange={e => setAppSecret(e.target.value)}
                  placeholder={config?.hasAppSecret ? "***já configurado*** (deixe para manter)" : "Cole o App Secret"} className="h-9 text-sm font-mono" />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Page Access Token */}
          <div className={section}>
            <p className="text-xs font-bold text-foreground">3. Page Access Token &amp; Page ID</p>
            <div>
              <label className={label}>Page Access Token (longa duração — permissões: pages_read_engagement, pages_manage_metadata, leads_retrieval, instagram_manage_messages)</label>
              <div className="flex gap-2">
                <Input type={showToken ? "text" : "password"} value={pageAccessToken} onChange={e => setPageAccessToken(e.target.value)}
                  placeholder={config?.hasPageAccessToken ? "***já configurado*** (deixe para manter)" : "Cole o Page Access Token"} className="h-9 text-sm font-mono" />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className={label}>Page ID</label>
              <Input value={pageId} onChange={e => setPageId(e.target.value)} className="h-9 text-sm font-mono" placeholder="Ex: 987654321" />
            </div>
          </div>

          {/* 4. Verify Token */}
          <div className={section}>
            <p className="text-xs font-bold text-foreground">4. Token de Verificação</p>
            <div className="flex gap-2">
              <Input value={verifyToken} onChange={e => setVerifyToken(e.target.value)} className="h-9 text-sm font-mono" placeholder="Gere ou digite um token" />
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={generateVerifyToken}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Gerar</Button>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => verifyToken && copyToClipboard(verifyToken, "Verify Token")}>
                {copied === "Verify Token" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* 5. DMs (Instagram/Messenger) + comentários */}
          <div className={section}>
            <p className="text-xs font-bold text-foreground">5. Mensagens Diretas &amp; Comentários (Instagram + Messenger)</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Ativar recebimento de DMs</label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Transforma cada DM do Instagram/Messenger em Lead com resposta do Atendente IA. No painel da Meta, em
                  <strong> Webhooks</strong>, assine os campos <strong>messages</strong> e <strong>messaging_postbacks</strong> (Página) e <strong>messages</strong> (Instagram).
                </p>
              </div>
              <Switch checked={dmEnabled} onCheckedChange={setDmEnabled} />
            </div>
            <div>
              <label className={label}>Palavras-gatilho para responder comentários (Private Reply)</label>
              <Input value={commentTriggerWords} onChange={e => setCommentTriggerWords(e.target.value)}
                placeholder="quero, preço, quanto, disponível, informação" className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Quando alguém comenta um post/anúncio com uma dessas palavras, enviamos uma DM convidando a conversar. Separe por vírgula.
                Assine o campo <strong>comments</strong> (Página e Instagram) no painel da Meta.
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="flex-1" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="w-3.5 h-3.5 mr-1" /> {saveMutation.isPending ? "Salvando..." : "Salvar Credenciais"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !isActive}>
              <Zap className="w-3.5 h-3.5 mr-1" /> {testMutation.isPending ? "Testando..." : "Testar Conexão"}
            </Button>
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">
              <Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Facebook Developers</Button>
            </a>
          </div>

          <SyncLogSection integrationType="meta" mutationKey="syncMeta" />

          {/* Passo a passo */}
          <details className="rounded-lg bg-accent/20 border border-border p-3">
            <summary className="text-xs font-bold text-foreground cursor-pointer">Passo a passo completo</summary>
            <ol className="mt-3 space-y-2 text-[11px] text-muted-foreground list-decimal list-inside">
              <li>Acesse <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" className="text-blue-400 underline">developers.facebook.com</a> e crie um app (tipo: Negócios).</li>
              <li>Em <strong>Configurações → Básico</strong>, copie <strong>App ID</strong> e <strong>App Secret</strong> e cole acima.</li>
              <li>Vá em <strong>Produtos → Webhooks</strong>, cole a <strong>URL do Webhook</strong> e o <strong>Token de Verificação</strong> gerados acima.</li>
              <li>Assine os campos: <strong>leadgen</strong> (leads de anúncio), <strong>messages</strong> + <strong>messaging_postbacks</strong> (DMs) e <strong>comments</strong> — na Página e no Instagram.</li>
              <li>No <strong>Graph API Explorer</strong>, gere um <strong>Page Access Token</strong> com as permissões listadas e converta para longa duração (60 dias).</li>
              <li>Cole o <strong>Page Access Token</strong> e o <strong>Page ID</strong>, salve e clique em <strong>Testar Conexão</strong>.</li>
              <li>Vincule a conta do <strong>Instagram</strong> à Página para receber DMs/comentários do Instagram também.</li>
              <li>Pronto! Leads, DMs e comentários chegam automaticamente no CRM.</li>
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}
