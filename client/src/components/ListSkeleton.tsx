import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de carregamento padronizado para listagens paginadas.
 * `grid` renderiza cards em grade (ex.: Custo por Veículo); caso contrário,
 * linhas empilhadas (ex.: Vendas, F&I, Documentos, Pós-Venda).
 */
export function ListSkeleton({ rows = 6, grid = false }: { rows?: number; grid?: boolean }) {
  const items = Array.from({ length: rows });
  const card = (i: number) => (
    <div key={i} className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );

  return grid ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{items.map((_, i) => card(i))}</div>
  ) : (
    <div className="space-y-2">{items.map((_, i) => card(i))}</div>
  );
}
