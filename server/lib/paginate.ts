/**
 * Server-Side Pagination Helper - Kafka Rank
 * 
 * Utilitário reutilizável para paginação server-side com Drizzle ORM.
 * Garante que TODA query paginada inclua tenantId automaticamente.
 * 
 * USO:
 * ```ts
 * import { paginateQuery } from "../lib/paginate";
 * 
 * const result = await paginateQuery({
 *   table: finTransactions,
 *   filters: [eq(finTransactions.type, "payable")],
 *   orderBy: [asc(finTransactions.dueDate)],
 *   page: input.page,
 *   pageSize: input.pageSize,
 *   tenantColumn: finTransactions.tenantId, // opcional, default usa .tenantId
 * });
 * // result = { items, total, page, pageSize, totalPages }
 * ```
 */

import { getDb } from "../db";
import { getCurrentTenantId } from "../tenantDb";
import { eq, and, sql, asc, type SQL } from "drizzle-orm";
import type { MySqlTable, MySqlColumn } from "drizzle-orm/mysql-core";
import { buildPaginatedResult, type PaginatedResult, type PaginationInput } from "../../shared/pagination";

interface PaginateOptions<TTable extends MySqlTable> {
  /** A tabela Drizzle para consultar */
  table: TTable;
  /** Condições WHERE adicionais (sem tenantId, ele é adicionado automaticamente) */
  filters?: SQL[];
  /** Colunas para SELECT (se não informado, seleciona todas) */
  select?: Record<string, any>;
  /** Ordenação */
  orderBy?: SQL[];
  /** Página (1-indexed) */
  page?: number;
  /** Tamanho da página (default 20, max 100) */
  pageSize?: number;
  /** Coluna de tenantId na tabela (default: table.tenantId) */
  tenantColumn?: MySqlColumn;
  /** Se true, não adiciona filtro de tenantId (para queries cross-tenant do superadmin) */
  skipTenant?: boolean;
}

/**
 * Executa uma query paginada com tenant isolation automático.
 * Retorna o resultado no formato PaginatedResult padronizado.
 */
export async function paginateQuery<TTable extends MySqlTable>(
  options: PaginateOptions<TTable>
): Promise<PaginatedResult<any>> {
  const db = await getDb();
  if (!db) return buildPaginatedResult([], 0, { page: options.page, pageSize: options.pageSize });

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  const offset = (page - 1) * pageSize;

  // Build conditions with automatic tenant filtering
  const conditions: SQL[] = [];
  
  if (!options.skipTenant) {
    const tenantId = getCurrentTenantId();
    const tenantCol = options.tenantColumn || (options.table as any).tenantId;
    if (tenantCol) {
      conditions.push(eq(tenantCol, tenantId));
    }
  }

  if (options.filters) {
    conditions.push(...options.filters);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute count + items in parallel
  const [items, countResult] = await Promise.all([
    (() => {
      let query = options.select
        ? (db.select(options.select) as any).from(options.table)
        : db.select().from(options.table);
      
      if (where) query = query.where(where);
      if (options.orderBy && options.orderBy.length > 0) {
        query = query.orderBy(...options.orderBy);
      }
      return query.limit(pageSize).offset(offset);
    })(),
    (() => {
      let query: any = db.select({ count: sql<number>`count(*)` }).from(options.table);
      if (where) query = query.where(where);
      return query;
    })(),
  ]);

  const total = Number(countResult[0]?.count || 0);
  return buildPaginatedResult(items, total, { page, pageSize });
}

/**
 * Helper simplificado para quando você já tem items e total (queries customizadas).
 * Apenas formata no padrão PaginatedResult.
 */
export function formatPaginated<T>(
  items: T[],
  total: number,
  pagination: PaginationInput
): PaginatedResult<T> {
  return buildPaginatedResult(items, total, pagination);
}

/**
 * Helper para garantir tenant em queries manuais.
 * Retorna o tenantId atual - use em queries que não passam pelo paginateQuery.
 */
export function requireTenantId(): number {
  const tenantId = getCurrentTenantId();
  if (!tenantId || tenantId <= 0) {
    throw new Error("Tenant context not available. Ensure request goes through tRPC middleware.");
  }
  return tenantId;
}
