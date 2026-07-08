import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { isValidEmail } from "@shared/validators";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function EsqueciSenha() {
  const [, navigate] = useLocation();
  const { tenant } = useTenant();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const requestReset = trpc.passwordReset.requestReset.useMutation({
    onSuccess: () => setSent(true),
    onError: (err) => toast.error(err.message || "Erro ao solicitar redefinição de senha."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    requestReset.mutate({ email: email.trim() });
  };

  const logoUrl = tenant?.logoUrl;
  const title = tenant?.name || "Kafka Rank";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            {logoUrl && <img src={logoUrl} alt={title} className="h-16 w-auto mb-3" />}
            <h1 className="text-xl font-black text-white tracking-wider uppercase">
              Esqueci minha senha
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">
              Informe o e-mail cadastrado na sua conta em {title}.
            </p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-300">
                Se esse e-mail estiver cadastrado, enviamos um link pra redefinir sua senha. Confira sua caixa de entrada (e o spam).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                  <Mail className="w-4 h-4 text-red-400" />
                  E-mail
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                disabled={requestReset.isPending}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
              >
                {requestReset.isPending ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
