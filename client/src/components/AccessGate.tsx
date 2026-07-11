import { useEffect, useMemo, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User, UserPlus, ArrowLeft, Flag, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranding } from "@/contexts/TenantContext";
import { buildTenantPath, getTenantSlugFromPath } from "@/lib/tenant";

const BYPASS_ROUTES = [
  "/crm/admin", "/crm", "/crm/integracoes",
  "/crm/admin/login",
  "/tv",
  "/admin",
  "/admin/login",
  "/super-admin",
  "/super-admin/login",
  "/comercial",
  "/assinatura",
  "/login",
  "/esqueci-senha",
  "/redefinir-senha",
];

function isTenantBypassRoute(pathname: string): boolean {
  return (
    /^\/t\/[a-z0-9-]+\/login(?:\/|$)/i.test(pathname) ||
    /^\/t\/[a-z0-9-]+\/crm\/admin\/login(?:\/|$)/i.test(pathname) ||
    /^\/t\/[a-z0-9-]+\/(?:admin|crm|gerente|pos-venda|financeiro|minha-area|assinatura)(?:\/|$)/i.test(pathname)
  );
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
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("invite") || "" : ""
  );

  const { user: adminUser, loading: adminLoading } = useAuth();
  const { data: sellerSession, isLoading: sellerLoading } = trpc.sellers.me.useQuery();
  const { data: allSellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { logoUrl, name: brandName } = useBranding();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const currentTenantSlug = getTenantSlugFromPath(currentPath);
  const hasInviteParam = typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("invite");

  const firstAccessMutation = trpc.sellers.firstAccess.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Login criado com sucesso! Bem-vindo, ${data.nickname || data.name}!`);
      if (data.sellerRole === "gerente") {
        window.location.href = buildTenantPath(currentTenantSlug, "/gerente");
      } else {
        window.location.reload();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar login");
    },
  });

  const sellersWithoutLogin = useMemo(() => {
    if (!allSellers) return [];
    return allSellers.filter(s => !s.username);
  }, [allSellers]);

  const isBypassRoute =
    currentPath === "/" ||
    BYPASS_ROUTES.some(route => currentPath.startsWith(route)) ||
    isTenantBypassRoute(currentPath);
  const isLoggedIn = !!adminUser || !!sellerSession;
  const shouldRedirectToLogin = !isBypassRoute && !sellerLoading && !adminLoading && !isLoggedIn && !hasInviteParam;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      window.location.replace("/login");
    }
  }, [shouldRedirectToLogin]);

  if (isBypassRoute) return <>{children}</>;
  if (sellerLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Flag className="h-8 w-8" />
        </div>
      </div>
    );
  }
  if (isLoggedIn) return <>{children}</>;

  if (!hasInviteParam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Flag className="h-8 w-8" />
        </div>
      </div>
    );
  }

  const handleFirstAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerId) { toast.error("Selecione seu nome"); return; }
    if (!inviteCode.trim()) { toast.error("Cole o código de convite que seu gerente/admin te enviou"); return; }
    if (!selectedDepartment) { toast.error("Selecione seu setor"); return; }
    if (!newUsername.trim() || newUsername.trim().length < 3) { toast.error("Usuário deve ter pelo menos 3 caracteres"); return; }
    if (!newPassword.trim() || newPassword.trim().length < 4) { toast.error("Senha deve ter pelo menos 4 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    firstAccessMutation.mutate({
      sellerId: selectedSellerId,
      inviteToken: inviteCode.trim(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      department: selectedDepartment,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <img src={logoUrl} alt={brandName} className="h-16 w-auto mb-3" />
            <h1 className="text-xl font-black text-white tracking-wider uppercase font-heading">
              {brandName}
            </h1>
          </div>

          <p className="text-sm text-gray-400 text-center mb-4">
            Primeiro acesso — crie seu login
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-4">
            <p className="text-[11px] text-blue-300 text-center">
              Apenas colaboradores já cadastrados pelo gerente podem criar login.
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
                      {s.name} {s.department ? `(${s.department})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                <Lock className="w-4 h-4 text-blue-400" />
                Código de convite
              </label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Cole o código enviado pelo seu gerente/admin"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm"
              />
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
                Crie seu usuário
              </label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ex: joao, maria123"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                autoComplete="username"
              />
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
                placeholder="Mínimo 4 caracteres"
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
              onClick={() => { window.location.href = "/login"; }}
              className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Já tenho login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
