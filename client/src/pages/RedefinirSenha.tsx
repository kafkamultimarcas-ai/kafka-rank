import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { getTenantLoginPath } from "@/lib/tenant";

export default function RedefinirSenha() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { tenant, tenantSlug } = useTenant();
  const token = new URLSearchParams(search).get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const confirmReset = trpc.passwordReset.confirmReset.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success("Senha redefinida com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Não foi possível redefinir a senha."),
  });

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = !!token && newPassword.length >= 4 && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    confirmReset.mutate({ token, newPassword });
  };

  const logoUrl = tenant?.logoUrl;
  const title = tenant?.name || "Kafka Rank";

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900/80 p-8 text-center text-gray-300">
          <h1 className="text-lg font-bold text-white">Link inválido</h1>
          <p className="mt-2 text-sm text-gray-400">
            Esse link de redefinição de senha está incompleto. Solicite um novo.
          </p>
          <button
            onClick={() => navigate(getTenantLoginPath(tenantSlug))}
            className="mt-4 text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3 h-3" /> Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            {logoUrl && <img src={logoUrl} alt={title} className="h-16 w-auto mb-3" />}
            <h1 className="text-xl font-black text-white tracking-wider uppercase">
              Redefinir senha
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">{title}</p>
          </div>

          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-300 mb-4">Sua senha foi redefinida. Já pode entrar com a nova senha.</p>
              <Button
                onClick={() => navigate(getTenantLoginPath(tenantSlug))}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
              >
                Ir para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4 text-red-400" />
                  Nova senha
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 4 caracteres"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4 text-red-400" />
                  Confirmar nova senha
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-400 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit || confirmReset.isPending}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
              >
                {confirmReset.isPending ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}

          {!done && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate(getTenantLoginPath(tenantSlug))}
                className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
