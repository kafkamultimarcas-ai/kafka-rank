import { Receipt } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { EmptyState } from "@/features/financeiro/components/EmptyState";
import { ContaCard } from "@/features/financeiro/contas/ContaCard";

interface ContaListProps {
  transactions: any[];
  filteredTotal: number;
  emptyMessage: string;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  onEdit: (transaction: any) => void;
  onDelete: (transaction: any) => void;
  onMarkPaid: (transaction: any) => void;
  onApprove: (transaction: any, approved: boolean) => void;
  getCategoryName: (categoryId: number) => string;
  sellerNameById: Record<number, string>;
  isMarkingPaid: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ContaList({
  transactions,
  filteredTotal,
  emptyMessage,
  expandedId,
  onToggleExpand,
  onEdit,
  onDelete,
  onMarkPaid,
  onApprove,
  getCategoryName,
  sellerNameById,
  isMarkingPaid,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ContaListProps) {
  if (!transactions.length) {
    return <EmptyState icon={Receipt} message={emptyMessage} />;
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <ContaCard
          key={transaction.id}
          transaction={transaction}
          expanded={expandedId === transaction.id}
          sellerNameById={sellerNameById}
          categoryName={getCategoryName(transaction.categoryId)}
          onToggleExpand={() => onToggleExpand(transaction.id)}
          onEdit={() => onEdit(transaction)}
          onDelete={() => onDelete(transaction)}
          onMarkPaid={() => onMarkPaid(transaction)}
          onApprove={(approved) => onApprove(transaction, approved)}
          isMarkingPaid={isMarkingPaid}
        />
      ))}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={filteredTotal}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        className="border-t border-gray-800 pt-5"
      />
    </div>
  );
}
