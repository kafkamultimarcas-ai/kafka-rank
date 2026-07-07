import { useEffect } from "react";
import { useTenant, useBranding } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { getTenantLoginPath } from "@/lib/tenant";
import { StoreLoginPicker } from "@/components/StoreLoginPicker";
import { useLocation } from "wouter";
import { Shield, Loader2 } from "lucide-react";

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

export default function CrmAdminLogin() {
  const [, navigate] = useLocation();
  const { tenant, tenantSlug, isLoading: tenantLoading } = useTenant();
  const { logoUrl, name: brandName } = useBranding();
  const tenantLoginPath = getTenantLoginPath(tenantSlug);

  useEffect(() => {
    if (!tenantSlug || tenantLoading || !tenant) return;
    navigate(tenantLoginPath, { replace: true });
  }, [navigate, tenant, tenantLoading, tenantLoginPath, tenantSlug]);

  if (tenantSlug && tenantLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-gray-400 text-sm">Carregando loja...</p>
        </div>
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

  if (tenantSlug && tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-gray-400 text-sm">Redirecionando para o login oficial da loja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <img src={logoUrl} alt={brandName} className="h-10 w-auto mb-2" />
            <h1 className="text-lg font-black text-white tracking-wider uppercase">
              Painel Admin
            </h1>
          </div>

          <StoreLoginPicker title="" description="Acesse pelo link da sua loja." />

          <div className="mt-4 text-center">
            <button onClick={() => navigate("/")}
              className="text-xs text-gray-500 hover:text-gray-300 mt-2">
              Voltar ao ranking
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          {brandName} &copy; {new Date().getFullYear()} &mdash; Painel Administrativo
        </p>
      </div>
    </div>
  );
}
