import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Lock, User, LogIn, ArrowLeft } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

export default function SellerLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.sellers.login.useMutation({
    onSuccess: (data) => {
      toast.success(`Bem-vindo, ${data.nickname || data.name}!`);
      // Redirecionar direto para o CRM do vendedor (leads como primeira tela)
      navigate(`/crm`);
    },
    onError: (err) => {
      toast.error(err.message || "Usuário ou senha inválidos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src={LOGO_URL} alt="Kafka Rank" className="h-16 w-auto mb-3" />
            <h1 className="text-xl font-black text-white tracking-wider uppercase">
              Minha Área
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">
              Faça login para acessar seus dados e registros
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
                  <span className="animate-spin">⏳</span> Entrando...
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
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao ranking
            </button>
          </div>

          <p className="text-xs text-gray-600 text-center mt-4">
            Peça seu login ao gerente ou administrador.
            Cada colaborador tem acesso apenas aos seus próprios dados.
          </p>
        </div>
      </div>
    </div>
  );
}
