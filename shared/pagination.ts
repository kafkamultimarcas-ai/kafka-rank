/**
 * Pagination Standard - Kafka Rank
 * 
 * Padrão de paginação server-side reutilizável para toda a aplicação.
 * 
 * BACKEND: usar `paginateQuery()` helper em qualquer listagem.
 * FRONTEND: usar `usePagination()` hook + `<PaginationControls />` componente.
 * 
 * Convenções:
 * - page: 1-indexed (primeira página = 1)
 * - pageSize: padrão 20, máximo 100
 * - Resposta sempre retorna { items, total, page, pageSize, totalPages }
 */

import { z } from "zod";

// ===== TYPES =====

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

// ===== ZOD SCHEMAS (para usar em tRPC inputs) =====

/** Schema Zod para parâmetros de paginação - usar em .input() do tRPC */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/** Extrai limit e offset a partir de page/pageSize */
export function toLimitOffset(input: PaginationInput): { limit: number; offset: number } {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20));
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

/** Monta o resultado paginado padronizado */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  input: PaginationInput
): PaginatedResult<T> {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20));
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
