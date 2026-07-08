import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Lock, Save, Share2, Smartphone } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { CrmSettingsAjustesPanel, CrmSettingsIntegracoesPanel, StoreDataPanel } from "@/components/admin/CrmSettingsPanels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

export default function AdminSettings() {
  const { data: codeData } = trpc.access.getCode.useQuery();
  const utils = trpc.useUtils();

  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  const setCodeMutation = trpc.access.setCode.useMutation({
    onSuccess: () => {
      utils.access.getCode.invalidate();
      toast.success("Código de acesso atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar código."),
  });

  useEffect(() => {
    if (codeData?.code) {
      setAccessCode(codeData.code);
    }
  }, [codeData]);

  function handleSaveCode(event: React.FormEvent) {
    event.preventDefault();
    if (!accessCode.trim()) {
      toast.error("O código não pode estar vazio.");
      return;
    }
    setCodeMutation.mutate({ code: accessCode.trim() });
  }

  function copyShareLink() {
    const url = window.location.origin;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copiado! Compartilhe com sua equipe.");
    }).catch(() => {
      toast.error("Não foi possível copiar o link.");
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o acesso e configurações do app</p>
        </div>

        <Tabs defaultValue="dados-loja" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-4">
            <TabsTrigger value="dados-loja">Dados da Loja</TabsTrigger>
            <TabsTrigger value="app">App</TabsTrigger>
            <TabsTrigger value="crm-ajustes">Ajustes CRM</TabsTrigger>
            <TabsTrigger value="crm-integracoes">Integrações CRM</TabsTrigger>
          </TabsList>

          <TabsContent value="dados-loja" className="mt-0">
            <StoreDataPanel />
          </TabsContent>

          <TabsContent value="app" className="space-y-6 mt-0">
            <div className="racing-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-sm text-foreground">CÓDIGO DE ACESSO</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Este código é necessário para que os vendedores acessem o app. Compartilhe apenas com sua equipe.
              </p>
              <form onSubmit={handleSaveCode} className="space-y-4">
                <div>
                  <Label className="text-foreground">Código atual</Label>
                  <div className="relative">
                    <Input
                      type={showCode ? "text" : "password"}
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="Digite o código de acesso"
                      className="bg-input border-border text-foreground pr-10 text-lg tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="racing-gradient text-white gap-2" disabled={setCodeMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {setCodeMutation.isPending ? "Salvando..." : "Salvar Código"}
                </Button>
              </form>
            </div>

            <div className="racing-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-sm text-foreground">INSTALAR NO CELULAR</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Android (Chrome):</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Abra o link do app no Chrome</li>
                    <li>Toque nos 3 pontinhos no canto superior direito</li>
                    <li>Selecione <strong className="text-foreground">"Adicionar à tela inicial"</strong></li>
                    <li>Confirme e pronto! O app aparece como um ícone</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">iPhone (Safari):</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Abra o link do app no Safari</li>
                    <li>Toque no botão de <strong className="text-foreground">compartilhar</strong> (quadrado com seta para cima)</li>
                    <li>Role para baixo e selecione <strong className="text-foreground">"Adicionar à Tela de Início"</strong></li>
                    <li>Confirme e pronto! O app aparece como um ícone</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="racing-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-sm text-foreground">COMPARTILHAR COM A EQUIPE</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Copie o link abaixo e envie para seus vendedores junto com o código de acesso.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={typeof window !== "undefined" ? window.location.origin : ""}
                  className="bg-input border-border text-foreground text-sm"
                />
                <Button variant="outline" onClick={copyShareLink} className="gap-2 shrink-0">
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="crm-ajustes" className="mt-0">
            <CrmSettingsAjustesPanel />
          </TabsContent>

          <TabsContent value="crm-integracoes" className="mt-0">
            <CrmSettingsIntegracoesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
