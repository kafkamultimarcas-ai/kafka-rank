import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Lock, User, LogIn, Eye, EyeOff, Shield, Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";
const ADMIN_TOKEN_KEY = "crm_admin_token";

export function useAdminAuth() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const { data: admin, isLoading } = trpc.adminAuth.me.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false, refetchOnWindowFocus: false }
  );
  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.location.reload();
  };
  return { admin, isLoading, isAuthenticated: !!admin, token, logout };
}

type LoginStep = "credentials" | "change_password";

export default function CrmAdminLogin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [token, setToken] = useState("");
  const [autoLoginFailed, setAutoLoginFailed] = useState(false);
  const autoLoginTriedRef = useRef(false);

  // Auto-login mutation (for Manus owner)
  const autoLoginMutation = trpc.adminAuth.autoLogin.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      toast.success(`Bem-vindo, ${data.admin.name}!`);
      navigate("/crm/admin", { replace: true });
    },
    onError: () => {
      setAutoLoginFailed(true);
    },
  });

  // Auto-login on page load
  useEffect(() => {
    if (autoLoginTriedRef.current) return;
    autoLoginTriedRef.current = true;
    const existingToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (existingToken) {
      // Only navigate if not already on admin page to prevent loops
      if (!window.location.pathname.startsWith("/crm/admin") || window.location.pathname === "/crm/admin/login") {
        navigate("/crm/admin", { replace: true });
      }
      return;
    }
    autoLoginMutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login direto com usuário + senha
  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.admin?.mustChangePassword) {
        setToken(data.token);
        setStep("change_password");
        toast.info("Primeiro acesso! Defina sua nova senha.");
      } else {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        toast.success(`Bem-vindo, ${data.admin.name}!`);
        navigate("/crm/admin", { replace: true });
      }
    },
    onError: (err) => {
      toast.error(err.message || "Usuário ou senha inválidos");
    },
  });

  // Trocar senha
  const changePasswordMutation = trpc.adminAuth.changePassword.useMutation({
    onSuccess: () => {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      toast.success("Senha alterada com sucesso!");
      navigate("/crm/admin", { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao alterar senha");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("A senha deve ter pelo menos 4 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    changePasswordMutation.mutate({ token, newPassword });
  };

  // Show loading while trying auto-login
  if (!autoLoginFailed && autoLoginMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-gray-400 text-sm">Entrando automaticamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          {step === "credentials" ? (
            <>
              {/* Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <img src={LOGO_URL} alt="Kafka Rank" className="h-10 w-auto mb-2" />
                <h1 className="text-lg font-black text-white tracking-wider uppercase">
                  Painel Admin
                </h1>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Acesse com seu usuário e senha
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-red-400" />
                    Usuário
                  </label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-11"
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <Lock className="w-4 h-4 text-red-400" />
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-11 pr-10"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider h-12"
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Entrar</span>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 mt-2">
                  Esqueceu a senha? Solicite ao administrador para resetar.
                </p>
                <button onClick={() => navigate("/")}
                  className="text-xs text-gray-500 hover:text-gray-300 mt-2">
                  Voltar ao ranking
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Change Password (First Access) */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                  <KeyRound className="w-8 h-8 text-amber-400" />
                </div>
                <h1 className="text-lg font-black text-white tracking-wider uppercase">
                  Primeiro Acesso
                </h1>
                <p className="text-sm text-gray-400 mt-2 text-center">
                  Defina sua nova senha para continuar
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-11 pr-10"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Confirmar Nova Senha
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-11"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending || newPassword.length < 4 || newPassword !== confirmPassword}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 text-base uppercase tracking-wider h-12"
                >
                  {changePasswordMutation.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Salvar e Entrar</span>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button onClick={() => { setStep("credentials"); setNewPassword(""); setConfirmPassword(""); }}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Voltar ao login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Kafka Rank &copy; {new Date().getFullYear()} &mdash; Painel Administrativo
        </p>
      </div>
    </div>
  );
}
