/**
 * PaginationControls - Componente reutilizável de paginação server-side
 * 
 * USO:
 * ```tsx
 * <PaginationControls
 *   page={page}
 *   totalPages={data.totalPages}
 *   total={data.total}
 *   pageSize={pageSize}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Opções de tamanho de página (default: [10, 20, 50, 100]) */
  pageSizeOptions?: number[];
  /** Mostrar seletor de tamanho de página (default: true) */
  showPageSize?: boolean;
  /** Mostrar info "X de Y" (default: true) */
  showInfo?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showInfo = true,
  className = "",
}: PaginationControlsProps) {
  if (totalPages <= 0) return null;

  // Garante que o tamanho de página atual esteja entre as opções selecionáveis.
  const mergedPageSizeOptions = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  // Gera os números de página visíveis (max 5 botões)
  const getVisiblePages = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: (number | "ellipsis")[] = [];
    
    if (page <= 3) {
      pages.push(1, 2, 3, 4, "ellipsis", totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
    }
    
    return pages;
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 ${className}`}>
      {/* Info */}
      {showInfo && (
        <div className="text-sm text-muted-foreground">
          {total > 0 ? (
            <span>Mostrando <strong>{startItem}</strong>-<strong>{endItem}</strong> de <strong>{total}</strong></span>
          ) : (
            <span>Nenhum registro</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Por página:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                onPageSizeChange(Number(v));
                onPageChange(1); // Reset to page 1 when changing size
              }}
            >
              {/* Renderiza o valor direto (em vez de SelectValue) para garantir que
                  o tamanho selecionado apareça sempre, mesmo antes de abrir o menu. */}
              <SelectTrigger size="sm" className="w-[76px]" aria-label="Itens por página">
                <span>{pageSize}</span>
              </SelectTrigger>
              <SelectContent>
                {mergedPageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pagination buttons */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && onPageChange(page - 1)}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {getVisiblePages().map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => onPageChange(p)}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => page < totalPages && onPageChange(page + 1)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
