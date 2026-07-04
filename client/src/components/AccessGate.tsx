import { useState, useEffect, ReactNode, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, LogIn, User, Eye, EyeOff, UserPlus, ArrowLeft, Flag, Shield, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranding } from "@/contexts/TenantContext";
import { buildTenantPath, getTenantLoginPath, getTenantSlugFromPath } from "@/lib/tenant";

// Routes that bypass the access gate (public pages, admin, TV, etc.)
const BYPASS_ROUTES = [
  "/crm/admin", "/crm", "/crm/integracoes",
  "/tv",
  "/admin",
  "/super-admin",
  "/comercial",
  "/assinatura",
];

function isTenantBypassRoute(pathname: string): boolean {
  return /^\/t\/[a-z0-9-]+\/(?:login|admin|crm|gerente|pos-venda|financeiro|minha-area|assinatura|esqueci-senha|redefinir-senha)(?:\/|$)/i.test(pathname);
}

const DEPARTMENT_OPTIONS = [
  { value: "vendas", label: "Vendas" },
  { value: "pre_vendas", label: "Pré-Vendas / SDR" },
  { value: "fei", label: "F&I" },
  { value: "consignacao", label: "Consignação" },
  { value: "despachante", label: "Despachante" },
  { value: "pos_venda", label: "Pós-Venda" },
  { value: "financeiro", label: "Financeiro" },
  { value: "marketing", label: "Marketing" },
];

export default function AccessGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"login" | "first-access">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // First access state
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { user: adminUser, loading: adminLoading } = useAuth();
  const { data: sellerSession, isLoading: sellerLoading } = trpc.sellers.me.useQuery();
  const { data: allSellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { logoUrl, name: brandName } = useBranding();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const currentTenantSlug = getTenantSlugFromPath(currentPath);

  const loginMutation = trpc.sellers.login.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Bem-vindo, ${data.nickname || data.name}!`);
      if (data.sellerRole === 'gerente') {
        window.location.href = buildTenantPath(currentTenantSlug, "/gerente");
      } else {
        window.location.reload();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Usuário ou senha inválidos");
    },
  });

  const firstAccessMutation = trpc.sellers.firstAccess.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Login criado com sucesso! Bem-vindo, ${data.nickname || data.name}!`);
      if (data.sellerRole === 'gerente') {
        window.location.href = buildTenantPath(currentTenantSlug, "/gerente");
      } else {
        window.location.reload();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar login");
    },
  });

  // Sellers that don't have a login yet (for first access)
  const sellersWithoutLogin = useMemo(() => {
    if (!allSellers) return [];
    return allSellers.filter(s => !s.username);
  }, [allSellers]);

  // Bypass for public routes
  if (BYPASS_ROUTES.some(route => currentPath.startsWith(route)) || isTenantBypassRoute(currentPath)) {
    return <>{children}</>;
  }

  // Still loading
  if (sellerLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Flag className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // Admin (OAuth) user is logged in - let them through
  if (adminUser) {
    return <>{children}</>;
  }

  // Seller is logged in - let them through
  if (sellerSession) {
    return <>{children}</>;
  }

  // Not logged in - show login screen
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  const handleFirstAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerId) {
      toast.error("Selecione seu nome");
      return;
    }
    if (!selectedDepartment) {
      toast.error("Selecione seu setor");
      return;
    }
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      toast.error("Usuário deve ter pelo menos 3 caracteres");
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      toast.error("Senha deve ter pelo menos 4 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    firstAccessMutation.mutate({
      sellerId: selectedSellerId,
      accessCode: "auto",
      username: newUsername.trim(),
      password: newPassword.trim(),
      department: selectedDepartment,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src={logoUrl} alt={brandName} className="h-16 w-auto mb-3" />
            <h1 className="text-xl font-black text-white tracking-wider uppercase font-heading">
              {brandName}
            </h1>
          </div>

          {mode === "login" ? (
            <>
              <p className="text-sm text-gray-400 text-center mb-6">
                Faca login para acessar o sistema
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-red-400" />
                    Usuario
                  </label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu nome de usuario"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
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
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-base uppercase tracking-wider"
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2">Entrando...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-5 h-5" /> ENTRAR
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-800 space-y-3">
                {sellersWithoutLogin.length > 0 && (
                  <button
                    onClick={() => setMode("first-access")}
                    className="w-full text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Primeiro acesso? Crie seu login aqui
                  </button>
                )}

                <button
                  onClick={() => { window.location.href = getTenantLoginPath(currentTenantSlug); }}
                  className="w-full text-xs text-gray-600 hover:text-gray-400 flex items-center justify-center gap-1 py-1"
                >
                  <Shield className="w-3 h-3" />
                  Área da Loja
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 text-center mb-4">
                Primeiro acesso - crie seu login
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-4">
                <p className="text-[11px] text-blue-300 text-center">
                  Apenas colaboradores ja cadastrados pelo gerente podem criar login.
                </p>
              </div>

              <form onSubmit={handleFirstAccess} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-blue-400" />
                    Selecione seu nome
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSellerId || ""}
                      onChange={(e) => setSelectedSellerId(parseInt(e.target.value) || null)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled>Escolha seu nome...</option>
                      {sellersWithoutLogin.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.department ? `(${s.department})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <Flag className="w-4 h-4 text-blue-400" />
                    Selecione seu setor
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled>Escolha seu setor...</option>
                      {DEPARTMENT_OPTIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-blue-400" />
                    Crie seu usuario
                  </label>
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: joao, maria123"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    autoComplete="username"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Minimo 3 caracteres</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Crie sua senha
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 4 caracteres"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Confirme a senha
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={firstAccessMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 text-base uppercase tracking-wider"
                >
                  {firstAccessMutation.isPending ? (
                    <span>Criando login...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" /> CRIAR MEU LOGIN
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setMode("login")}
                  className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" /> Ja tenho login
                </button>
              </div>
            </>
          )}

          <div className="mt-4 space-y-1">
            <p className="text-[10px] text-gray-600 text-center">
              Acesso exclusivo para equipe {brandName}.
            </p>
            <p className="text-[10px] text-gray-600 text-center">
              Cada colaborador tem acesso apenas aos seus proprios dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
