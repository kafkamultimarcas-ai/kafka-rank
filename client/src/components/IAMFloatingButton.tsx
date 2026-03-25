import { Bot } from "lucide-react";
import { useLocation } from "wouter";

interface IAMFloatingButtonProps {
  sellerId: number;
}

export default function IAMFloatingButton({ sellerId }: IAMFloatingButtonProps) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(`/ia-vendedor/${sellerId}`)}
      className="fixed bottom-6 right-6 z-50 group"
      title="IAM - Seu Agente de Vendas"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
      {/* Glow */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
      {/* Button */}
      <span className="relative flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
        <Bot className="h-7 w-7 text-white" />
      </span>
      {/* Label */}
      <span className="absolute -top-8 right-0 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        IAM - Pergunte qualquer coisa!
      </span>
    </button>
  );
}
