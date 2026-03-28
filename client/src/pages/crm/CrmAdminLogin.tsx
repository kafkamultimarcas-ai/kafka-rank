import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Lock, User, LogIn, Eye, EyeOff, Shield, Loader2 } from "lucide-react";

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

export default function CrmAdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const autoLoginTriedRef = useRef(false);

  // Check if user is already logged in via Manus OAuth (owner)
  const { user: manusUser, loading: manusLoading } = useAuth();

  // Auto-login mutation for Manus OAuth owner
  const autoLoginMutation = trpc.adminAuth.autoLogin.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      toast.success(`Bem-vindo, ${data.admin.name}!`);
      navigate("/crm/admin");
    },
    onError: () => {
      // Auto-login failed (not owner or no admin account), show manual login
      setAutoLoginAttempted(true);
    },
  });

  // Try auto-login when Manus OAuth user is detected
  useEffect(() => {
    if (manusLoading || autoLoginTriedRef.current) return;
    if (manusUser) {
      autoLoginTriedRef.current = true;
      // Check if already has a valid CRM admin token
      const existingToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (existingToken) {
        // Already logged in, just navigate
        navigate("/crm/admin");
        return;
      }
      // Try auto-login
      autoLoginMutation.mutate();
    } else {
      setAutoLoginAttempted(true);
    }
  }, [manusUser, manusLoading]);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      toast.success(`Bem-vindo, ${data.admin.name}!`);
      navigate("/crm/admin");
    },
    onError: (err) => {
      toast.error(err.message || "Usuario ou senha invalidos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuario e senha");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  // Show loading while trying auto-login
  if (manusLoading || (!autoLoginAttempted && autoLoginMutation.isPending)) {
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
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <img src={LOGO_URL} alt="Kafka Rank" className="h-10 w-auto mb-2" />
            <h1 className="text-lg font-black text-white tracking-wider uppercase">
              CRM Admin
            </h1>
            <p className="text-xs text-gray-400 mt-1 text-center">
              Acesso administrativo ao CRM Kafka
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1.5">
                <User className="w-4 h-4 text-red-400" />
                Usuario
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu usuario admin"
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
              {loginMutation.isPending ? "Entrando..." : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" /> Entrar
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => navigate("/")}
              className="text-xs text-gray-500 hover:text-gray-300">
              Voltar ao ranking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
