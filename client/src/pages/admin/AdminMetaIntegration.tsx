import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Wifi, WifiOff, Eye, EyeOff, RefreshCw } from "lucide-react";

export default function AdminMetaIntegration() {
  const { data: metaConfig, isLoading, refetch } = trpc.crmIntegrations.getMetaConfig.useQuery();
  const saveMutation = trpc.crmIntegrations.saveMetaConfig.useMutation({
    onSuccess: () => { toast.success("Configuração salva!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const testMutation = trpc.crmIntegrations.testMetaConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Conectado! Página: ${data.pageName} (ID: ${data.pageId})`);
      } else {
        toast.error(`Falha: ${data.error}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (metaConfig) {
      setAppId(metaConfig.appId);
      setAppSecret(metaConfig.appSecret);
      setPageAccessToken(metaConfig.pageAccessToken);
      setVerifyToken(metaConfig.verifyToken);
      setPageId(metaConfig.pageId);
    }
  }, [metaConfig]);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/meta/leadgen`
    : "";
  const verifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/meta/verify`
    : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    saveMutation.mutate({ appId, appSecret, pageAccessToken, verifyToken, pageId });
  };

  const generateVerifyToken = () => {
    const token = "kafka_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setVerifyToken(token);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-500" fill="currentColor">
                <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0022 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
              </svg>
              Integração Meta
            </h1>
            <p className="text-muted-foreground mt-1">
              Receba leads do Facebook e Instagram automaticamente no CRM
            </p>
          </div>
          <Badge variant={metaConfig?.hasPageAccessToken ? "default" : "secondary"} className={metaConfig?.hasPageAccessToken ? "bg-green-600" : ""}>
            {metaConfig?.hasPageAccessToken ? (
              <><Wifi className="w-3 h-3 mr-1" /> Configurado</>
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" /> Não configurado</>
            )}
          </Badge>
        </div>

        {/* Step 1: Webhook URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. URLs do Webhook</CardTitle>
            <CardDescription>
              Copie estas URLs e cole no painel do Facebook Developers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">URL do Webhook (Callback URL)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={webhookUrl} readOnly className="font-mono text-sm bg-muted" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}>
                  {copied === "Webhook URL" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">URL de Verificação</Label>
              <div className="flex gap-2 mt-1">
                <Input value={verifyUrl} readOnly className="font-mono text-sm bg-muted" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(verifyUrl, "Verify URL")}>
                  {copied === "Verify URL" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: App Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Credenciais do App</CardTitle>
            <CardDescription>
              Encontre em{" "}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" className="text-blue-500 underline">
                developers.facebook.com/apps
              </a>
              {" "}→ Seu App → Configurações → Básico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>App ID</Label>
                <Input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="Ex: 123456789012345" className="mt-1" />
              </div>
              <div>
                <Label>App Secret</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={metaConfig?.hasAppSecret ? "***já configurado***" : "Cole o App Secret"}
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Usado para verificar assinatura do webhook</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Page Access Token */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Page Access Token</CardTitle>
            <CardDescription>
              Gere em{" "}
              <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-blue-500 underline">
                Graph API Explorer
              </a>
              {" "}com permissões: pages_read_engagement, pages_manage_metadata, leads_retrieval, ads_management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Page Access Token (longa duração)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type={showToken ? "text" : "password"}
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  placeholder={metaConfig?.hasPageAccessToken ? "***já configurado***" : "Cole o Page Access Token"}
                />
                <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Necessário para buscar dados completos do lead (nome, telefone, email)
              </p>
            </div>
            <div>
              <Label>Page ID</Label>
              <Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Ex: 123456789012345" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">ID da sua página no Facebook</p>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Verify Token */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Token de Verificação</CardTitle>
            <CardDescription>
              Token usado pelo Facebook para verificar o webhook. Gere um e cole no painel da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Gere ou digite um token" className="font-mono" />
              <Button variant="outline" onClick={generateVerifyToken}>
                <RefreshCw className="w-4 h-4 mr-1" /> Gerar
              </Button>
              <Button variant="outline" size="icon" onClick={() => verifyToken && copyToClipboard(verifyToken, "Verify Token")}>
                {copied === "Verify Token" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
            {saveMutation.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
          <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
            {testMutation.isPending ? "Testando..." : "Testar Conexão"}
          </Button>
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-1" /> Abrir Facebook Developers
            </Button>
          </a>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Passo a Passo</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Acesse{" "}
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" className="text-blue-500 underline">
                  developers.facebook.com
                </a>
                {" "}e crie um app (tipo: Negócios)
              </li>
              <li>Em <strong>Configurações → Básico</strong>, copie o <strong>App ID</strong> e <strong>App Secret</strong> e cole acima</li>
              <li>Vá em <strong>Produtos → Webhooks</strong> e clique em <strong>Configurar</strong></li>
              <li>Selecione <strong>Page</strong>, clique em <strong>Assinar</strong></li>
              <li>Cole a <strong>URL do Webhook</strong> e o <strong>Token de Verificação</strong> gerados acima</li>
              <li>Marque o campo <strong>leadgen</strong> para receber leads</li>
              <li>Vá em <strong>Graph API Explorer</strong>, selecione sua página e gere um <strong>Page Access Token</strong> com as permissões necessárias</li>
              <li>Converta para token de longa duração (60 dias) usando a ferramenta de debug de tokens</li>
              <li>Cole o <strong>Page Access Token</strong> acima e clique em <strong>Testar Conexão</strong></li>
              <li>Pronto! Os leads do Facebook/Instagram chegarão automaticamente no CRM</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
