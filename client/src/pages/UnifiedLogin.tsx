import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, CheckCircle2, Lock, LogIn, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";
const ADMIN_TOKEN_KEY = "crm_admin_token";
const SUPER_ADMIN_TOKEN_KEY = "super_token";
const REMEMBER_EMAIL_KEY = "kafka_remember_email";
const REMEMBER_ME_KEY = "kafka_remember_me";

type LoginStep = "credentials" | "change_password";

export default function UnifiedLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    return saved || "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  });
  const [step, setStep] = useState<LoginStep>("credentials");
  const [pendingAdminToken, setPendingAdminToken] = useState("");
  const [pendingSlug, setPendingSlug] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");

  // Auto-redirect: if seller session already exists, redirect to their area
  const { data: sellerSession, isLoading: sellerLoading } = trpc.sellers.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (sellerLoading) return;
    if (sellerSession) {
      // Already logged in as seller - redirect to their area
      const slug = (window.location.pathname.match(/^\/t\/([^/]+)/) || [])[1];
      if (slug) {
        const dept = sellerSession.department || "vendas";
        const role = sellerSession.sellerRole || "vendedor";
        if (dept === "pos_venda") {
          window.location.href = `/t/${slug}/pos-venda`;
        } else if (dept === "financeiro") {
          window.location.href = `/t/${slug}/financeiro`;
        } else if (role === "gerente") {
          window.location.href = `/t/${slug}/gerente`;
        } else {
          window.location.href = `/t/${slug}/minha-area/${sellerSession.id}`;
        }
      }
    }
  }, [sellerSession, sellerLoading]);

  // Auto-redirect: if admin token exists and is valid
  useEffect(() => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (adminToken) {
      const slug = (window.location.pathname.match(/^\/t\/([^/]+)/) || [])[1];
      if (slug) {
        // Admin token exists - redirect to admin panel
        window.location.href = `/t/${slug}/admin`;
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedEmail(email.trim().toLowerCase());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [email]);

  const previewQuery = trpc.tenantAuth.loginPreviewByEmail.useQuery(
    { email: debouncedEmail || "placeholder@local.test" },
    {
      enabled: debouncedEmail.includes("@") && debouncedEmail.includes("."),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const loginMutation = trpc.tenantAuth.loginByEmail.useMutation({
    onSuccess: (data) => {
      // Save or clear "remember me" preference
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
        localStorage.setItem(REMEMBER_ME_KEY, "true");
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      if (data.userType === "super_admin") {
        localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, data.token || "");
        toast.success(`Bem-vindo, ${data.name}!`);
        navigate(data.redirectPath);
        return;
      }

      if (data.userType === "admin" && data.mustChangePassword) {
        setPendingAdminToken(data.token || "");
        setPendingSlug(data.tenantSlug || "");
        setStep("change_password");
        toast.info("Primeiro acesso! Defina sua nova senha.");
        return;
      }

      toast.success(`Bem-vindo, ${data.name}!`);
      if (data.userType === "admin") {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token || "");
      }
      navigate(`/t/${data.tenantSlug}${data.redirectPath}`);
    },
    onError: (err) => {
      toast.error(err.message || "E-mail ou senha inválidos");
    },
  });

  const changePasswordMutation = trpc.adminAuth.changePassword.useMutation({
    onSuccess: () => {
      localStorage.setItem(ADMIN_TOKEN_KEY, pendingAdminToken);
      toast.success("Senha alterada com sucesso!");
      navigate(`/t/${pendingSlug}/admin`);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao alterar senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
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
                  <span className="flex items-center gap-2"><span className="animate-spin">...</span> Salvando...</span>
                ) : (
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Salvar e entrar</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <img src={LOGO_URL} alt="Kafka Rank" className="h-16 w-auto mb-3" />
            <h1 className="text-xl font-black text-white tracking-wider uppercase">
              Entrar
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">
              Use seu e-mail para acessar sua loja.
            </p>
            {previewQuery.data && (
              <div className="mt-4 w-full rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/12 via-blue-500/10 to-cyan-500/12 p-4 text-left shadow-[0_0_0_1px_rgba(56,189,248,0.05)]">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                  <Building2 className="h-3.5 w-3.5" />
                  Loja identificada
                </div>
                <p className="mt-2 text-base font-bold text-white">
                  {previewQuery.data.tenantName}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-200">
                  <UserRound className="h-4 w-4 text-sky-200" />
                  <span>{previewQuery.data.name}</span>
                  {previewQuery.data.tenantName && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-blue-100">{previewQuery.data.roleLabel}</span>
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {previewQuery.data.userType === "super_admin"
                    ? "Acesso ao portal master da plataforma."
                    : `Entrando em ${previewQuery.data.tenantName}.`}
                </div>
              </div>
            )}
          </div>

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
                autoComplete="email"
                autoFocus={!email}
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
                autoFocus={!!email}
              />
            </div>

            {/* Lembrar-me checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-gray-400 cursor-pointer select-none">
                Lembrar meu e-mail
              </label>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2"><span className="animate-spin">...</span> Entrando...</span>
              ) : (
                <span className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Entrar</span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/esqueci-senha")}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="mt-2 text-center">
            <button
              onClick={() => navigate("/comercial")}
              className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao comercial
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500 mb-2">Ainda não tem uma loja?</p>
            <button
              onClick={() => navigate("/comercial/cadastro")}
              className="text-xs font-semibold text-red-400 hover:text-red-300"
            >
              Criar loja gratuitamente
            </button>
          </div>

          <p className="text-xs text-gray-600 text-center mt-4">
            Um único login para vendedor, gerente ou administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
