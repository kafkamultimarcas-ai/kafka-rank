import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Lock, LogIn, Search, Store, User } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";
const ADMIN_TOKEN_KEY = "crm_admin_token";

type LoginStep = "credentials" | "change_password";

function normalizeStoreSlug(value: string) {
  const directSlug = value.match(/\/t\/([a-z0-9-]+)(?:\/|$)/i)?.[1];
  const source = directSlug || value;

  return source
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

export default function SellerLogin() {
  const [, navigate] = useLocation();
  const { tenant, tenantSlug, isLoading: tenantLoading } = useTenant();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [pendingAdminToken, setPendingAdminToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const tenantBase = tenantSlug ? `/t/${tenantSlug}` : "";
  const normalizedStoreSlug = normalizeStoreSlug(storeSlug);

  const loginMutation = trpc.tenantAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.userType === "admin" && data.mustChangePassword) {
        setPendingAdminToken(data.token || "");
        setStep("change_password");
        toast.info("Primeiro acesso! Defina sua nova senha.");
        return;
      }

      toast.success(`Bem-vindo, ${data.name}!`);
      if (data.userType === "admin") {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token || "");
      }
      navigate(`${tenantBase}${data.redirectPath}`);
    },
    onError: (err) => {
      toast.error(err.message || "Usuário ou senha inválidos");
    },
  });

  const changePasswordMutation = trpc.adminAuth.changePassword.useMutation({
    onSuccess: () => {
      localStorage.setItem(ADMIN_TOKEN_KEY, pendingAdminToken);
      toast.success("Senha alterada com sucesso!");
      navigate(`${tenantBase}/crm/admin`);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao alterar senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantSlug) {
      if (normalizedStoreSlug.length < 2) {
        toast.error("Informe o slug da loja ou cole o link da loja.");
        return;
      }

      navigate(`/t/${normalizedStoreSlug}/login`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha.");
      return;
    }

    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    changePasswordMutation.mutate({ token: pendingAdminToken, newPassword });
  };

  if (tenantSlug && tenantLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <p className="text-sm text-gray-400">Carregando loja...</p>
      </div>
    );
  }

  if (tenantSlug && !tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900/80 p-8 text-center text-gray-300">
          <h1 className="text-lg font-bold text-white">Loja não encontrada</h1>
          <p className="mt-2 text-sm text-gray-400">
            O link acessado não corresponde a uma loja ativa.
          </p>
        </div>
      </div>
    );
  }

  const logoUrl = tenant?.logoUrl || LOGO_URL;
  const title = tenant?.name || "Acessar Loja";

  if (step === "change_password") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col items-center mb-6">
              <h1 className="text-lg font-black text-white tracking-wider uppercase">
                Primeiro Acesso
              </h1>
              <p className="text-sm text-gray-400 mt-2 text-center">
                Defina sua nova senha para continuar.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
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
                  <Lock className="w-4 h-4 text-amber-400" />
                  Confirmar nova senha
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending || newPassword.length < 4 || newPassword !== confirmPassword}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 text-base uppercase tracking-wider"
              >
                {changePasswordMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">...</span> Salvando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Salvar e entrar
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setStep("credentials");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar ao login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tenantSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col items-center mb-6">
              <img src={logoUrl} alt={title} className="h-16 w-auto mb-3" />
              <h1 className="text-xl font-black text-white tracking-wider uppercase">
                Acessar Loja
              </h1>
              <p className="text-sm text-gray-400 mt-1 text-center">
                Informe o slug da loja ou cole o link que você recebeu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                  <Store className="w-4 h-4 text-red-400" />
                  Loja
                </label>
                <Input
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value)}
                  placeholder="Ex: loja-demo ou https://kafkarank.com/t/loja-demo/login"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  O acesso oficial de cada loja segue o padrão <span className="text-gray-300">`/t/slug/login`</span>.
                </p>
              </div>

              <Button
                type="submit"
                disabled={normalizedStoreSlug.length < 2}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-5 h-5" /> Ir para o login da loja
                </span>
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar ao ranking
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <img src={logoUrl} alt={title} className="h-16 w-auto mb-3" />
            <h1 className="text-xl font-black text-white tracking-wider uppercase">
              {title}
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">
              Faça login para acessar sua área.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                <User className="w-4 h-4 text-red-400" />
                Usuário
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                <Lock className="w-4 h-4 text-red-400" />
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">...</span> Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" /> Entrar
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate(`${tenantBase}/esqueci-senha`)}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="mt-2 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao ranking
            </button>
          </div>

          <p className="text-xs text-gray-600 text-center mt-4">
            Um único login para vendedor, gerente ou administrador. Cada perfil acessa apenas o que a loja permitir.
          </p>
        </div>
      </div>
    </div>
  );
}
