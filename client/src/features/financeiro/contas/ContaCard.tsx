import {
  Banknote,
  Calendar,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  Layers,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/features/financeiro/utils/formatters";

interface ContaCardProps {
  transaction: any;
  expanded: boolean;
  sellerNameById: Record<number, string>;
  categoryName: string;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteGroup?: () => void;
  onMarkPaid: () => void;
  onApprove: (approved: boolean) => void;
  isMarkingPaid: boolean;
}

export function ContaCard({
  transaction,
  expanded,
  sellerNameById,
  categoryName,
  onToggleExpand,
  onEdit,
  onDelete,
  onDeleteGroup,
  onMarkPaid,
  onApprove,
  isMarkingPaid,
}: ContaCardProps) {
  const nowTs = Date.now();
  const isOverdue =
    (transaction.status === "pending" || transaction.status === "overdue") &&
    transaction.dueDate < nowTs;
  const isPaid = transaction.status === "paid";
  const isPayable = transaction.type === "payable";
  const needsAuth = transaction.approvalStatus === "pending_approval";
  const isApproved = transaction.approvalStatus === "approved";
  const isRejected = transaction.approvalStatus === "rejected";

  return (
    <div className={`rounded-xl border transition-all ${
      needsAuth ? "border-purple-500/30 bg-purple-500/10" :
      isOverdue ? "border-red-500/30 bg-red-500/10" :
      isPaid ? "border-emerald-500/20 bg-emerald-500/10" :
      "border-gray-800 bg-gray-900/60"
    }`}>
      <button onClick={onToggleExpand} className="w-full p-4 text-left">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              {isPayable ? (
                <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              )}
              <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
              {transaction.sellerId && (
                <span className="flex items-center gap-0.5 rounded bg-orange-500/20 px-1.5 py-0.5 font-bold text-orange-300">
                  <Banknote className="h-3 w-3" />
                  Vale{sellerNameById[transaction.sellerId] ? ` • ${sellerNameById[transaction.sellerId]}` : ""}
                </span>
              )}
              <span className="rounded bg-gray-800 px-1.5 py-0.5">{categoryName}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(transaction.dueDate)}</span>
              {transaction.supplier && <span className="text-gray-400">{transaction.supplier}</span>}
              {(transaction as any).vehicle && <span className="flex items-center gap-1 text-sky-300"><Car className="h-3 w-3" /> {(transaction as any).vehicle}</span>}
              {transaction.installmentTotal && transaction.installmentTotal > 1 && (
                <span className="flex items-center gap-0.5 rounded bg-blue-500/20 px-1.5 py-0.5 font-bold text-blue-300">
                  <Layers className="h-3 w-3" /> Parcela {transaction.installmentNumber || 1}/{transaction.installmentTotal}
                </span>
              )}
              {isOverdue && <span className="font-bold text-red-400">VENCIDA</span>}
              {isPaid && (
                <span className="flex items-center gap-0.5 font-bold text-emerald-400">
                  <CheckCircle className="h-3 w-3" /> Paga {transaction.paidDate ? formatDate(transaction.paidDate) : ""}
                </span>
              )}
              {needsAuth && (
                <span className="flex items-center gap-0.5 font-bold text-purple-400">
                  <Shield className="h-3 w-3" /> Aguardando
                </span>
              )}
              {isApproved && (
                <span className="flex items-center gap-0.5 text-green-400">
                  <ShieldCheck className="h-3 w-3" /> Autorizada
                </span>
              )}
              {isRejected && (
                <span className="flex items-center gap-0.5 text-red-400">
                  <ShieldAlert className="h-3 w-3" /> Rejeitada
                </span>
              )}
            </div>
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-2">
            <p className={`text-sm font-bold ${isPayable ? "text-red-400" : "text-emerald-400"}`}>
              {isPayable ? "-" : "+"}{formatCurrency(transaction.amount)}
            </p>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-600" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-600" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-800/50 px-4 pb-4 pt-3">
          {transaction.notes && <p className="text-xs text-gray-400">{transaction.notes}</p>}
          {transaction.createdByName && <p className="text-[10px] text-gray-600">Lançado por: {transaction.createdByName}</p>}
          {transaction.receiptUrl && (
            <a
              href={transaction.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
            >
              <Eye className="h-3 w-3" /> Ver Comprovante
            </a>
          )}

          <div className="flex flex-wrap gap-2">
            {!isPaid && transaction.status !== "cancelled" && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkPaid();
                }}
                disabled={isMarkingPaid}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500"
              >
                <CheckCircle className="h-4 w-4" />
                {isMarkingPaid ? "Processando..." : "Marcar como Pago"}
              </button>
            )}

            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:bg-gray-600"
            >
              <Edit2 className="h-3.5 w-3.5" /> Editar
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/30"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>

            {transaction.installmentGroupId && transaction.installmentTotal > 1 && onDeleteGroup && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteGroup();
                }}
                className="flex items-center gap-1 rounded-lg bg-orange-500/20 px-3 py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/30"
              >
                <Layers className="h-3.5 w-3.5" /> Excluir Parcelas Futuras
              </button>
            )}

            {needsAuth && (
              <>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onApprove(true);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-500"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Autorizar
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onApprove(false);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Rejeitar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
