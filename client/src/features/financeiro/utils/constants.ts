import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  Building2,
  FileSpreadsheet,
  Fuel,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
} from "lucide-react";

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type MainTab = "dashboard" | "contas" | "admin-financeiro" | "pos-venda" | "gasolina" | "relatorios" | "fornecedor";

export interface FinanceiroTabDefinition {
  key?: MainTab;
  label: string;
  icon: LucideIcon;
  activeClass?: string;
  href?: string;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  aberto: { label: "Aberto", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40", emoji: "🔵" },
  agendado: { label: "Agendado", color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/40", emoji: "📅" },
  em_servico: { label: "Em Serviço", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/40", emoji: "🔧" },
  finalizado: { label: "Finalizado", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40", emoji: "✅" },
  entregue: { label: "Entregue", color: "text-gray-400", bg: "bg-gray-500/20", border: "border-gray-500/40", emoji: "🚗" },
};

export const FINANCEIRO_STATIC_TAB_CLASSES: Record<MainTab, string> = {
  dashboard: "border-cyan-500 text-cyan-400",
  contas: "border-emerald-500 text-emerald-400",
  "admin-financeiro": "border-green-500 text-green-400",
  "pos-venda": "border-orange-500 text-orange-400",
  gasolina: "border-yellow-500 text-yellow-400",
  relatorios: "border-purple-500 text-purple-400",
  fornecedor: "border-blue-500 text-blue-400",
};

export const CONTAS_STATUS_OPTIONS = [
  { key: "all", label: "Todas", color: "gray" },
  { key: "overdue", label: "Vencidas", color: "red" },
  { key: "pending", label: "Pendentes", color: "amber" },
  { key: "paid", label: "Pagas", color: "emerald" },
  { key: "approval", label: "Autorizar", color: "purple" },
] as const;

export const CONTAS_TYPE_OPTIONS = [
  { key: "all", label: "Todos", icon: Receipt },
  { key: "payable", label: "A Pagar", icon: TrendingDown },
  { key: "receivable", label: "A Receber", icon: TrendingUp },
] as const;

export const CONTAS_DESKTOP_PANEL_OPTIONS = [
  { key: "all", label: "Todas", icon: Receipt },
  { key: "overdue", label: "Vencidas", icon: Clock },
  { key: "pending", label: "Pendentes", icon: AlertTriangle },
  { key: "paid", label: "Pagas", icon: CheckCircle },
  { key: "approval", label: "Autorizar", icon: Shield },
] as const;

export const FINANCEIRO_EXTRA_LINK = {
  label: "Fornecedor",
  icon: Building2,
} as const;

export const FINANCEIRO_MENU_ICONS = {
  dashboard: BarChart3,
  contas: Receipt,
  adminFinanceiro: Banknote,
  posVenda: Wrench,
  gasolina: Fuel,
  relatorios: FileSpreadsheet,
};
