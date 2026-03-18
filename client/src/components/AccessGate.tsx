import { useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Flag, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ACCESS_KEY = "kafka_access_granted";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(true);

  const verifyMutation = trpc.access.verify.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        localStorage.setItem(ACCESS_KEY, "true");
        setGranted(true);
        toast.success("Acesso liberado!");
      } else {
        toast.error("Código incorreto. Tente novamente.");
      }
    },
    onError: () => toast.error("Erro ao verificar código."),
  });

  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_KEY);
    if (stored === "true") {
      setGranted(true);
    }
    setChecking(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Digite o código de acesso.");
      return;
    }
    verifyMutation.mutate({ code: code.trim() });
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Flag className="h-8 w-8" />
        </div>
      </div>
    );
  }

  if (granted) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="racing-card p-8 text-center space-y-6">
          {/* Logo / Icon */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full racing-gradient flex items-center justify-center">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-heading font-bold text-xl text-foreground tracking-wider">
              KAFKA MULTIMARCAS
            </h1>
            <p className="text-muted-foreground text-sm">
              Acesso restrito. Digite o código fornecido pelo gerente.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código de acesso"
                className="pl-10 bg-input border-border text-foreground text-center text-lg tracking-widest h-12"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full racing-gradient text-white h-12 font-heading font-bold tracking-wider"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "VERIFICANDO..." : "ENTRAR NA CORRIDA"}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Flag className="h-3 w-3" />
            <span>Acesso exclusivo para equipe Kafka</span>
          </div>
        </div>
      </div>
    </div>
  );
}
