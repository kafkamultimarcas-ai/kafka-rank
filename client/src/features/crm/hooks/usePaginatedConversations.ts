import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

type AssignmentFilter = "all" | "unassigned" | "assigned";

export type PaginatedConversation = {
  id: number;
  sellerId?: number;
  source?: string | null;
  score?: string | null;
  unreadCount?: number | null;
  acknowledgedAt?: number | string | Date | null;
  lastMessageTimestamp?: number | string | Date | null;
  lastMessageAt?: number | string | Date | null;
  updatedAt?: number | string | Date | null;
  createdAt?: number | string | Date | null;
  [key: string]: unknown;
};

type UsePaginatedConversationsParams = {
  mode: "admin" | "seller" | "sdr";
  sellerId?: number;
  archived?: boolean;
  query?: string;
  score?: string | null;
  source?: string | null;
  filterAssignment?: AssignmentFilter;
  enabled?: boolean;
  pageSize?: number;
  refreshInterval?: number;
};

function sortConversations<T extends PaginatedConversation>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = Number(a.lastMessageTimestamp || a.lastMessageAt || a.updatedAt || a.createdAt || 0);
    const bTime = Number(b.lastMessageTimestamp || b.lastMessageAt || b.updatedAt || b.createdAt || 0);
    if (bTime !== aTime) return bTime - aTime;
    return b.id - a.id;
  });
}

function mergeConversations<T extends PaginatedConversation>(current: T[], incoming: T[]) {
  const byId = new Map<number, T>();

  for (const item of current) {
    byId.set(item.id, item);
  }

  for (const item of incoming) {
    const previous = byId.get(item.id);
    byId.set(item.id, previous ? { ...previous, ...item } : item);
  }

  return sortConversations(Array.from(byId.values()));
}

export function usePaginatedConversations({
  mode,
  sellerId,
  archived = false,
  query = "",
  score,
  source,
  filterAssignment = "all",
  enabled = true,
  pageSize = 500,
  refreshInterval = 10000,
}: UsePaginatedConversationsParams) {
  const [loadedItems, setLoadedItems] = useState<PaginatedConversation[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const baseInput = useMemo(() => ({
    sellerId,
    archived,
    query: query.trim() || undefined,
    score: score || undefined,
    source: source || undefined,
    filterAssignment,
    limit: pageSize,
  }), [archived, filterAssignment, pageSize, query, score, sellerId, source]);

  const queryKey = useMemo(() => JSON.stringify(baseInput), [baseInput]);

  useEffect(() => {
    setLoadedItems([]);
    setPage(0);
    setHasMore(true);
    setIsLoadingMore(false);
    setTotal(0);
  }, [queryKey]);

  const firstPageQuery = trpc.crmChat.listConversations.useQuery(
    { ...baseInput, offset: 0 },
    { enabled: enabled && false, refetchInterval: refreshInterval }
  );

  const nextOffset = page * pageSize;
  const morePageQuery = trpc.crmChat.listConversations.useQuery(
    { ...baseInput, offset: nextOffset },
    { enabled: enabled && false && page > 0 && hasMore }
  );

  const adminFirstPageQuery = trpc.crmLeads.listAllPaginated.useQuery(
    { ...baseInput, offset: 0 },
    { enabled: enabled && mode === "admin", refetchInterval: refreshInterval }
  );
  const adminMorePageQuery = trpc.crmLeads.listAllPaginated.useQuery(
    { ...baseInput, offset: nextOffset },
    { enabled: enabled && mode === "admin" && page > 0 && hasMore }
  );

  const sellerFirstPageQuery = trpc.crmLeads.listBySellerPaginated.useQuery(
    { ...baseInput, sellerId: sellerId || 0, offset: 0 },
    { enabled: enabled && mode === "seller" && !!sellerId, refetchInterval: refreshInterval }
  );
  const sellerMorePageQuery = trpc.crmLeads.listBySellerPaginated.useQuery(
    { ...baseInput, sellerId: sellerId || 0, offset: nextOffset },
    { enabled: enabled && mode === "seller" && !!sellerId && page > 0 && hasMore }
  );

  const sdrFirstPageQuery = trpc.crmLeads.listForSDRPaginated.useQuery(
    { ...baseInput, offset: 0 },
    { enabled: enabled && mode === "sdr", refetchInterval: refreshInterval }
  );
  const sdrMorePageQuery = trpc.crmLeads.listForSDRPaginated.useQuery(
    { ...baseInput, offset: nextOffset },
    { enabled: enabled && mode === "sdr" && page > 0 && hasMore }
  );

  const activeFirstPageQuery =
    mode === "admin" ? adminFirstPageQuery :
    mode === "seller" ? sellerFirstPageQuery :
    sdrFirstPageQuery;

  const activeMorePageQuery =
    mode === "admin" ? adminMorePageQuery :
    mode === "seller" ? sellerMorePageQuery :
    sdrMorePageQuery;

  useEffect(() => {
    if (!activeFirstPageQuery.data) return;

    setLoadedItems((current) => mergeConversations(current, activeFirstPageQuery.data.items as unknown as PaginatedConversation[]));
    setTotal(activeFirstPageQuery.data.total);
    setHasMore(activeFirstPageQuery.data.hasMore);
  }, [activeFirstPageQuery.data]);

  useEffect(() => {
    if (!activeMorePageQuery.data || page === 0) return;

    setLoadedItems((current) => mergeConversations(current, activeMorePageQuery.data.items as unknown as PaginatedConversation[]));
    setTotal(activeMorePageQuery.data.total);
    setHasMore(activeMorePageQuery.data.hasMore);
    setIsLoadingMore(false);
  }, [activeMorePageQuery.data, page]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || activeFirstPageQuery.isLoading) return;
    setIsLoadingMore(true);
    setPage((current) => current + 1);
  }, [activeFirstPageQuery.isLoading, hasMore, isLoadingMore]);

  return {
    items: loadedItems,
    total,
    hasMore,
    isLoadingMore,
    isInitialLoading: activeFirstPageQuery.isLoading && loadedItems.length === 0,
    isRefreshingFirstPage: activeFirstPageQuery.isFetching,
    loadMore,
    refetchFirstPage: activeFirstPageQuery.refetch,
  };
}
