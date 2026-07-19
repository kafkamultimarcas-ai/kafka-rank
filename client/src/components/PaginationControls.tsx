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
import { Loader2 } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Opções de tamanho de página (default: [10, 25, 50]) */
  pageSizeOptions?: number[];
  /** Mostrar seletor de tamanho de página (default: true) */
  showPageSize?: boolean;
  /** Mostrar info "X de Y" (default: true) */
  showInfo?: boolean;
  /** Estado de carregamento durante troca de página */
  isLoading?: boolean;
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
  pageSizeOptions = [10, 25, 50],
  showPageSize = true,
  showInfo = true,
  isLoading = false,
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
  const handlePageChange = (nextPage: number) => {
    if (isLoading || nextPage === page) return;
    onPageChange(nextPage);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 ${className}`}>
      {/* Info */}
      {showInfo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {total > 0 ? (
            <span>Mostrando <strong>{startItem}</strong>-<strong>{endItem}</strong> de <strong>{total}</strong></span>
          ) : (
            <span>Nenhum registro</span>
          )}
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando página...
            </span>
          )}
        </div>
      )}

      <div className={`flex items-center gap-4 transition-opacity ${isLoading ? "opacity-70" : ""}`}>
        {/* Page size selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Por página:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                if (isLoading) return;
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
                  onClick={() => page > 1 && handlePageChange(page - 1)}
                  className={page <= 1 || isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                      onClick={() => handlePageChange(p)}
                      className={isLoading ? "pointer-events-none cursor-wait" : "cursor-pointer"}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => page < totalPages && handlePageChange(page + 1)}
                  className={page >= totalPages || isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
