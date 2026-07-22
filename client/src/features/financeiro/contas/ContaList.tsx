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
  onDeleteGroup?: (transaction: any) => void;
  onViewInstallments?: (transaction: any) => void;
  onMarkPaid: (transaction: any) => void;
  onApprove: (transaction: any, approved: boolean) => void;
  getCategoryName: (categoryId: number) => string;
  sellerNameById: Record<number, string>;
  isMarkingPaid: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
  isLoadingPage?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function ContaListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-gray-800" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-5 w-24 rounded bg-gray-800" />
                  <div className="h-5 w-20 rounded bg-gray-800" />
                  <div className="h-5 w-28 rounded bg-gray-800" />
                </div>
              </div>
              <div className="h-6 w-24 rounded bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContaList({
  transactions,
  filteredTotal,
  emptyMessage,
  expandedId,
  onToggleExpand,
  onEdit,
  onDelete,
  onDeleteGroup,
  onViewInstallments,
  onMarkPaid,
  onApprove,
  getCategoryName,
  sellerNameById,
  isMarkingPaid,
  page,
  totalPages,
  pageSize,
  isLoadingPage = false,
  onPageChange,
  onPageSizeChange,
}: ContaListProps) {
  if (isLoadingPage) {
    return (
      <div className="space-y-4">
        <ContaListSkeleton />
        {filteredTotal > 0 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={filteredTotal}
            pageSize={pageSize}
            isLoading={isLoadingPage}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            className="border-t border-gray-800 pt-5"
          />
        )}
      </div>
    );
  }

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
          onDeleteGroup={onDeleteGroup ? () => onDeleteGroup(transaction) : undefined}
          onViewInstallments={onViewInstallments ? () => onViewInstallments(transaction) : undefined}
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
        isLoading={isLoadingPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        className="border-t border-gray-800 pt-5"
      />
    </div>
  );
}
