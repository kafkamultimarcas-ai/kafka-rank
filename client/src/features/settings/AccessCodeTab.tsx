import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Eye, EyeOff, Lock, Save, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";

/**
 * Aba "Código de Acesso" das configurações do admin: gerencia o código de
 * acesso da equipe, instruções de instalação (PWA) e o link de compartilhamento.
 * Extraída como componente reutilizável para compor com as demais abas.
 */
export function AccessCodeTab() {
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
    if (codeData?.code) setAccessCode(codeData.code);
  }, [codeData]);

  function handleSaveCode(e: React.FormEvent) {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error("O código não pode estar vazio.");
      return;
    }
    setCodeMutation.mutate({ code: accessCode.trim() });
  }

  function copyShareLink() {
    const url = window.location.origin;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copiado! Compartilhe com sua equipe."))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground">Código de Acesso</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie o código de acesso da equipe, a instalação no celular e o link de compartilhamento
        </p>
      </div>

      {/* Código de Acesso */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">CÓDIGO DE ACESSO</h4>
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
                onChange={(e) => setAccessCode(e.target.value)}
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

      {/* Como instalar no celular */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">INSTALAR NO CELULAR</h4>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">Android (Chrome):</h5>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Abra o link do app no Chrome</li>
              <li>Toque nos 3 pontinhos no canto superior direito</li>
              <li>Selecione <strong className="text-foreground">"Adicionar à tela inicial"</strong></li>
              <li>Confirme e pronto! O app aparece como um ícone</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">iPhone (Safari):</h5>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Abra o link do app no Safari</li>
              <li>Toque no botão de <strong className="text-foreground">compartilhar</strong> (quadrado com seta para cima)</li>
              <li>Role para baixo e selecione <strong className="text-foreground">"Adicionar à Tela de Início"</strong></li>
              <li>Confirme e pronto! O app aparece como um ícone</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Compartilhar link */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">COMPARTILHAR COM A EQUIPE</h4>
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
    </div>
  );
}
