import { useCallback, useEffect, useMemo, useState } from "react";

export interface UsePaginationOptions {
  /** Página inicial (default: 1). */
  initialPage?: number;
  /** Tamanho de página inicial (default: 10). */
  initialPageSize?: number;
  /**
   * Total de registros conhecido (vindo do servidor). Quando informado, o hook
   * calcula `totalPages` e faz o clamp da página atual (ex.: após excluir itens).
   */
  total?: number;
  /**
   * Ao mudar qualquer valor deste array, a página volta para 1.
   * Use para filtros/busca (ex.: [search, status, month]).
   */
  resetDeps?: ReadonlyArray<unknown>;
}

export interface UsePaginationResult {
  page: number;
  pageSize: number;
  /** Offset para queries server-side: (page - 1) * pageSize. */
  offset: number;
  /** Alias de pageSize (para passar como `limit` em queries). */
  limit: number;
  /** Total de páginas (>= 1). Calculado a partir de `total`, se informado. */
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
  canPrev: boolean;
  canNext: boolean;
}

/**
 * Estado headless de paginação — server-side ou client-side.
 *
 * Server-side:
 * ```ts
 * const p = usePagination({ initialPageSize: 25, total: data?.total, resetDeps: [search] });
 * const { data } = trpc.x.list.useQuery({ offset: p.offset, limit: p.pageSize, search });
 * <PaginationControls page={p.page} totalPages={p.totalPages} total={data?.total ?? 0}
 *   pageSize={p.pageSize} onPageChange={p.setPage} onPageSizeChange={p.setPageSize} />
 * ```
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPage = 1, initialPageSize = 10, total, resetDeps } = options;

  const [page, setPageRaw] = useState(Math.max(1, initialPage));
  const [pageSize, setPageSizeRaw] = useState(Math.max(1, initialPageSize));

  const totalPages = useMemo(
    () => (total == null ? Math.max(1, page) : Math.max(1, Math.ceil(total / pageSize))),
    [total, pageSize, page]
  );

  const setPage = useCallback((next: number) => {
    setPageRaw(() => Math.max(1, Math.floor(next) || 1));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(Math.max(1, Math.floor(size) || 1));
    setPageRaw(1); // trocar o tamanho sempre volta pra primeira página
  }, []);

  const nextPage = useCallback(() => setPageRaw((p) => p + 1), []);
  const prevPage = useCallback(() => setPageRaw((p) => Math.max(1, p - 1)), []);
  const reset = useCallback(() => setPageRaw(1), []);

  // Volta para a página 1 quando os filtros externos mudam.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPageRaw(1); }, resetDeps ?? []);

  // Clamp: se o total encolheu (ex.: exclusão) e a página atual ficou fora do range.
  useEffect(() => {
    if (total != null && page > totalPages) setPageRaw(totalPages);
  }, [total, page, totalPages]);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    totalPages,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    reset,
    canPrev: page > 1,
    canNext: page < totalPages,
  };
}
