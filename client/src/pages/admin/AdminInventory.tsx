import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { formatBRL, inventorySourceTypes, inventorySortFields } from "@shared/inventory";
import { ChevronLeft, ChevronRight, Eye, Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function formatPrice(value: number | null | undefined) {
  return formatBRL(value, "Consulte");
}

function formatKm(value: number | null | undefined) {
  if (!value) return "-";
  return `${Number(value).toLocaleString("pt-BR")} km`;
}

function formatDate(value: number | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  if (status === "sold") return "Vendido";
  if (status === "reserved") return "Reservado";
  return "Disponível";
}

function sourceLabel(sourceType: string) {
  if (sourceType === "integration") return "Integração";
  if (sourceType === "sync") return "Sync";
  return "Manual";
}

const sortFieldLabels: Record<(typeof inventorySortFields)[number], string> = {
  createdAt: "Cadastro",
  entryDate: "Entrada",
  price: "Preço",
  km: "KM",
  margin: "Margem",
  published: "Publicação",
  featured: "Destaque",
  sourceType: "Origem",
  status: "Status",
};

export default function AdminInventory() {
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const utils = trpc.useUtils();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "available" | "reserved" | "sold">("all");
  const [brand, setBrand] = useState("all");
  const [sourceType, setSourceType] = useState<"all" | (typeof inventorySourceTypes)[number]>("all");
  const [sortBy, setSortBy] = useState<(typeof inventorySortFields)[number]>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const adminListQuery = trpc.inventory.adminList.useQuery({
    page,
    pageSize,
    search: search || undefined,
    status,
    brand: brand !== "all" ? brand : undefined,
    sourceType,
    publishedState: "all",
    featuredState: "all",
    visibility: "active",
    sortBy,
    sortOrder,
  });

  const brandsQuery = trpc.inventory.brands.useQuery();
  const detailsQuery = trpc.inventory.getAdminById.useQuery(
    { id: detailsId || 0 },
    { enabled: !!detailsId }
  );

  const invalidateInventory = async () => {
    await Promise.all([
      utils.inventory.adminList.invalidate(),
      utils.inventory.adminMetrics.invalidate(),
      utils.inventory.stats.invalidate(),
      utils.inventory.list.invalidate(),
      utils.inventory.getAdminById.invalidate(),
    ]);
  };

  const syncMutation = trpc.inventory.sync.useMutation({
    onSuccess: async (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sincronização concluída: ${result.added} novos, ${result.updated} atualizados.`);
      await invalidateInventory();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: async () => {
      toast.success("Veículo excluído com soft delete.");
      setDeleteId(null);
      setDeleteReason("");
      await invalidateInventory();
    },
    onError: (error) => toast.error(error.message),
  });

  const items = adminListQuery.data?.items || [];
  const totalPages = adminListQuery.data?.totalPages || 0;
  const total = adminListQuery.data?.total || 0;

  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    const pages: number[] = [];
    for (let current = start; current <= end; current += 1) pages.push(current);
    if (!pages.includes(1)) pages.unshift(1);
    if (!pages.includes(totalPages)) pages.push(totalPages);
    return Array.from(new Set(pages));
  }, [page, totalPages]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Estoque</h1>
            <p className="text-sm text-muted-foreground">
              {total} veículo(s) no estoque
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar
            </Button>
            <Button
              className="gap-2"
              onClick={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque/cadastrar"))}
            >
              <Plus className="h-4 w-4" />
              Cadastrar
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.2fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              placeholder="Buscar por marca, modelo, placa ou código"
            />
          </div>

          <Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="available">Disponíveis</SelectItem>
              <SelectItem value="reserved">Reservados</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={brand} onValueChange={(value) => { setBrand(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {(brandsQuery.data || []).map((item) => (
                <SelectItem key={item.brand} value={item.brand}>
                  {item.brand} ({item.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceType} onValueChange={(value) => { setSourceType(value as typeof sourceType); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="integration">Integração</SelectItem>
              <SelectItem value="sync">Sync</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              {inventorySortFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {sortFieldLabels[field]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select value={sortOrder} onValueChange={(value) => { setSortOrder(value as typeof sortOrder); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Ordem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Itens" /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}/página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          {adminListQuery.isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <p className="text-base font-medium text-foreground">Nenhum veículo encontrado.</p>
              <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre um novo veículo no estoque.</p>
              <Button onClick={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque/cadastrar"))}>
                Cadastrar veículo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/35">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Veículo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Preço</th>
                    <th className="px-4 py-3 font-medium">KM</th>
                    <th className="px-4 py-3 font-medium">Ano</th>
                    <th className="px-4 py-3 font-medium">Entrada</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((vehicle: any) => (
                    <tr key={vehicle.id} className="transition-colors hover:bg-muted/25">
                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-[260px] items-start gap-3">
                          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                            {vehicle.photoUrl ? (
                              <img
                                src={vehicle.photoUrl}
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {(vehicle.title || `${vehicle.brand} ${vehicle.model}`).trim()}
                            </p>
                            <p className="truncate text-muted-foreground">
                              {[vehicle.version, vehicle.plate, vehicle.internalCode].filter(Boolean).join(" • ") || "Sem complemento"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline">{vehicle.isPublished ? "Publicado" : "Rascunho"}</Badge>
                              {vehicle.isFeatured ? <Badge variant="outline">Destaque</Badge> : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-foreground">{statusLabel(vehicle.status)}</td>
                      <td className="px-4 py-4 align-top text-foreground">{sourceLabel(vehicle.sourceType)}</td>
                      <td className="px-4 py-4 align-top font-medium text-foreground">{formatPrice(vehicle.price)}</td>
                      <td className="px-4 py-4 align-top text-foreground">{formatKm(vehicle.km)}</td>
                      <td className="px-4 py-4 align-top text-foreground">{vehicle.modelYear || vehicle.year || "-"}</td>
                      <td className="px-4 py-4 align-top text-foreground">{formatDate(vehicle.entryDate)}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Ações do veículo">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => setLocation(buildTenantPath(tenantSlug, `/admin/estoque/${vehicle.id}/editar`))}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDetailsId(vehicle.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(vehicle.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Exibindo página {page} de {totalPages} • {total} veículo(s)
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => canGoPrev && setPage((current) => current - 1)}
                disabled={!canGoPrev}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              {pageNumbers.map((pageNumber, index) => {
                const prev = pageNumbers[index - 1];
                const showGap = prev && pageNumber - prev > 1;
                return (
                  <div key={pageNumber} className="flex items-center gap-2">
                    {showGap ? <span className="px-1 text-muted-foreground">…</span> : null}
                    <Button
                      variant={pageNumber === page ? "default" : "outline"}
                      onClick={() => setPage(pageNumber)}
                      className="min-w-10"
                    >
                      {pageNumber}
                    </Button>
                  </div>
                );
              })}

              <Button
                variant="outline"
                onClick={() => canGoNext && setPage((current) => current + 1)}
                disabled={!canGoNext}
                className="gap-2"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={detailsId !== null} onOpenChange={(open) => !open && setDetailsId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do veículo</DialogTitle>
          </DialogHeader>

          {detailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !detailsQuery.data ? (
            <p className="text-sm text-muted-foreground">Veículo não encontrado.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="h-44 w-full overflow-hidden rounded-xl border border-border/60 bg-muted md:w-72">
                  {detailsQuery.data.photoUrl ? (
                    <img
                      src={detailsQuery.data.photoUrl}
                      alt={`${detailsQuery.data.brand} ${detailsQuery.data.model}`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {(detailsQuery.data.title || `${detailsQuery.data.brand} ${detailsQuery.data.model}`).trim()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[detailsQuery.data.version, detailsQuery.data.plate, detailsQuery.data.internalCode].filter(Boolean).join(" • ") || "Sem complemento"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Preço</p>
                      <p className="font-medium text-foreground">{formatPrice(detailsQuery.data.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                      <p className="font-medium text-foreground">{statusLabel(detailsQuery.data.status)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Origem</p>
                      <p className="font-medium text-foreground">{sourceLabel(detailsQuery.data.sourceType)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Entrada</p>
                      <p className="font-medium text-foreground">{formatDate(detailsQuery.data.entryDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">KM</p>
                      <p className="font-medium text-foreground">{formatKm(detailsQuery.data.km)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ano</p>
                      <p className="font-medium text-foreground">{detailsQuery.data.modelYear || detailsQuery.data.year || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Checklist</p>
                  <p className="mt-1 text-sm text-foreground">
                    {detailsQuery.data.checklist?.completeness || 0}% completo
                  </p>
                  {detailsQuery.data.checklist?.missingItems?.length ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Faltando: {detailsQuery.data.checklist.missingItems.join(", ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Pronto para publicação.</p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Observação</p>
                  <p className="mt-1 text-sm text-foreground">
                    {detailsQuery.data.observation || "Sem descrição cadastrada."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setLocation(buildTenantPath(tenantSlug, `/admin/estoque/${detailsQuery.data.id}/editar`))}
                >
                  Editar veículo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(buildTenantPath(tenantSlug, `/admin/estoque/${detailsQuery.data.id}/preview`), "_blank")}
                >
                  Abrir preview público
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é lógica. O veículo sai da operação e permanece registrado para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Motivo da exclusão</Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="Ex: cadastro duplicado, veículo vendido fora da plataforma..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteReason("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!deleteId) return;
                if (deleteReason.trim().length < 3) {
                  toast.error("Informe um motivo para a exclusão.");
                  return;
                }
                deleteMutation.mutate({ id: deleteId, reason: deleteReason.trim() });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
