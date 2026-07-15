import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { inventorySourceTypes, inventorySortFields } from "@shared/inventory";
import { BadgeCheck, Car, CheckCircle, ChevronLeft, ChevronRight, Clock3, Eye, History, Loader2, Pencil, Plus, RefreshCw, Search, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PAGE_SIZE_OPTIONS = [12, 24, 48];

function formatPrice(value: number | null | undefined) {
  if (!value) return "Consulte";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function formatKm(value: number | null | undefined) {
  if (!value) return "0 km";
  return `${Number(value).toLocaleString("pt-BR")} km`;
}

function statusConfig(status: string) {
  if (status === "sold") return { label: "Vendido", className: "bg-red-500/10 text-red-400 border-red-500/30" };
  if (status === "reserved") return { label: "Reservado", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
  return { label: "Disponível", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
}

function sourceConfig(sourceType: string) {
  if (sourceType === "sync") return { label: "Sync", className: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
  if (sourceType === "integration") return { label: "Integração", className: "bg-violet-500/10 text-violet-400 border-violet-500/30" };
  return { label: "Manual", className: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30" };
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
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "available" | "reserved" | "sold">("all");
  const [brand, setBrand] = useState("all");
  const [sourceType, setSourceType] = useState<"all" | (typeof inventorySourceTypes)[number]>("all");
  const [publishedState, setPublishedState] = useState<"all" | "published" | "draft">("all");
  const [featuredState, setFeaturedState] = useState<"all" | "featured" | "normal">("all");
  const [visibility, setVisibility] = useState<"active" | "deleted" | "all">("active");
  const [sortBy, setSortBy] = useState<(typeof inventorySortFields)[number]>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [markSoldVehicleId, setMarkSoldVehicleId] = useState<number | null>(null);
  const [sellerId, setSellerId] = useState<string>("");
  const [historyVehicleId, setHistoryVehicleId] = useState<number | null>(null);

  const adminListQuery = trpc.inventory.adminList.useQuery({
    page,
    pageSize,
    search: search || undefined,
    status,
    brand: brand !== "all" ? brand : undefined,
    sourceType,
    publishedState,
    featuredState,
    visibility,
    sortBy,
    sortOrder,
  });
  const statsQuery = trpc.inventory.stats.useQuery();
  const metricsQuery = trpc.inventory.adminMetrics.useQuery();
  const brandsQuery = trpc.inventory.brands.useQuery();
  const sellersQuery = trpc.sellers.list.useQuery({ activeOnly: true });
  const historyQuery = trpc.inventory.auditLogs.useQuery(
    { inventoryId: historyVehicleId || 0 },
    { enabled: !!historyVehicleId }
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

  const reserveMutation = trpc.inventory.reserve.useMutation({
    onSuccess: async () => {
      toast.success("Veículo reservado.");
      await invalidateInventory();
    },
    onError: (error) => toast.error(error.message),
  });

  const markAvailableMutation = trpc.inventory.markAvailable.useMutation({
    onSuccess: async () => {
      toast.success("Veículo voltou para disponível.");
      await invalidateInventory();
    },
    onError: (error) => toast.error(error.message),
  });

  const markSoldMutation = trpc.inventory.markSold.useMutation({
    onSuccess: async () => {
      toast.success("Veículo marcado como vendido.");
      setMarkSoldVehicleId(null);
      setSellerId("");
      await invalidateInventory();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: async () => {
      toast.success("Veículo removido com soft delete.");
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

  const sellers = (sellersQuery.data || []).filter((seller) => seller.department === "vendas");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card className="overflow-hidden border-border/60 bg-card/85">
            <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Gestão senior de estoque
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">CRUD completo de veículos</h1>
                  <p className="text-sm text-muted-foreground">
                    Cadastro, edição, soft delete, auditoria, preview público e operação com métricas.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="gap-2">
                  {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sincronizar
                </Button>
                <Button className="gap-2" onClick={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque/cadastrar"))}>
                  <Plus className="h-4 w-4" />
                  Cadastrar veículo
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-2">
            <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ativos</p><p className="mt-2 text-2xl font-semibold text-foreground">{metricsQuery.data?.active || 0}</p></CardContent></Card>
            <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rascunhos</p><p className="mt-2 text-2xl font-semibold text-amber-300">{metricsQuery.data?.drafts || 0}</p></CardContent></Card>
            <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sem foto</p><p className="mt-2 text-2xl font-semibold text-rose-300">{metricsQuery.data?.withoutPhoto || 0}</p></CardContent></Card>
            <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Margem média</p><p className="mt-2 text-lg font-semibold text-foreground">{formatPrice(metricsQuery.data?.averageMargin)}</p></CardContent></Card>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total público</p><p className="mt-2 text-2xl font-semibold text-foreground">{statsQuery.data?.total || 0}</p></CardContent></Card>
          <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Disponíveis</p><p className="mt-2 text-2xl font-semibold text-emerald-400">{statsQuery.data?.available || 0}</p></CardContent></Card>
          <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reservados</p><p className="mt-2 text-2xl font-semibold text-amber-400">{statsQuery.data?.reserved || 0}</p></CardContent></Card>
          <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Destaque</p><p className="mt-2 text-2xl font-semibold text-fuchsia-300">{metricsQuery.data?.featured || 0}</p></CardContent></Card>
          <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checklist baixo</p><p className="mt-2 text-2xl font-semibold text-orange-300">{metricsQuery.data?.lowCompleteness || 0}</p></CardContent></Card>
          <Card className="border-border/60 bg-card/85"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Removidos</p><p className="mt-2 text-2xl font-semibold text-muted-foreground">{metricsQuery.data?.deleted || 0}</p></CardContent></Card>
        </div>

        <Card className="border-border/60 bg-card/85">
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-8">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                  <SelectItem key={item.brand} value={item.brand}>{item.brand} ({item.count})</SelectItem>
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

            <Select value={publishedState} onValueChange={(value) => { setPublishedState(value as typeof publishedState); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Publicação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={featuredState} onValueChange={(value) => { setFeaturedState(value as typeof featuredState); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Destaque" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="featured">Em destaque</SelectItem>
                <SelectItem value="normal">Normais</SelectItem>
              </SelectContent>
            </Select>

            <Select value={visibility} onValueChange={(value) => { setVisibility(value as typeof visibility); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Visibilidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="deleted">Removidos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85">
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ordenar por</Label>
              <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {inventorySortFields.map((field) => (
                    <SelectItem key={field} value={field}>{sortFieldLabels[field]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ordem</Label>
              <Select value={sortOrder} onValueChange={(value) => { setSortOrder(value as typeof sortOrder); setPage(1); }}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descendente</SelectItem>
                  <SelectItem value="asc">Ascendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Itens por página</Label>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                {total} veículo(s) encontrados{totalPages > 0 ? ` • página ${page} de ${totalPages}` : ""}
              </div>
            </div>
          </CardContent>
        </Card>

        {adminListQuery.isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card className="border-border/60 bg-card/85">
            <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
              <Car className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Nenhum veículo encontrado</h2>
                <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre o primeiro veículo manual desta loja.</p>
              </div>
              <Button onClick={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque/cadastrar"))} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo cadastro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((vehicle: any) => {
              const statusMeta = statusConfig(vehicle.status);
              const sourceMeta = sourceConfig(vehicle.sourceType);
              return (
                <Card key={vehicle.id} className="overflow-hidden border-border/60 bg-card/85">
                  <CardContent className="p-0">
                    <div className="flex gap-4 p-4">
                      <div className="h-28 w-36 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted">
                        {vehicle.photoUrl ? (
                          <img src={vehicle.photoUrl} alt={`${vehicle.brand} ${vehicle.model}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Car className="h-8 w-8 text-muted-foreground" /></div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-foreground">{(vehicle.title || `${vehicle.brand} ${vehicle.model}`).trim()}</h3>
                            <p className="truncate text-sm text-muted-foreground">
                              {[vehicle.version, vehicle.plate, vehicle.internalCode].filter(Boolean).join(" • ") || "Sem complemento"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
                            <Badge variant="outline" className={sourceMeta.className}>{sourceMeta.label}</Badge>
                            <Badge variant="outline" className={vehicle.isPublished ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}>
                              {vehicle.isPublished ? "Público" : "Rascunho"}
                            </Badge>
                            {vehicle.isFeatured ? <Badge variant="outline" className="border-pink-500/30 bg-pink-500/10 text-pink-300">Destaque</Badge> : null}
                            {vehicle.deletedAt ? <Badge variant="outline" className="border-border text-muted-foreground">Removido</Badge> : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Preço</p><p className="font-semibold text-foreground">{formatPrice(vehicle.price)}</p></div>
                          <div><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">KM</p><p className="font-semibold text-foreground">{formatKm(vehicle.km)}</p></div>
                          <div><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ano</p><p className="font-semibold text-foreground">{vehicle.modelYear || vehicle.year || "—"}</p></div>
                          <div><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Margem</p><p className="font-semibold text-foreground">{vehicle.margin === null ? "—" : formatPrice(vehicle.margin)}</p></div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            <span>Checklist</span>
                            <span>{vehicle.checklist?.completeness || 0}%</span>
                          </div>
                          {vehicle.checklist?.missingItems?.length ? (
                            <p className="mt-2 text-xs text-amber-300">Faltando: {vehicle.checklist.missingItems.join(", ")}</p>
                          ) : (
                            <p className="mt-2 text-xs text-emerald-300">Pronto para publicação.</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation(buildTenantPath(tenantSlug, `/admin/estoque/${vehicle.id}/editar`))}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(buildTenantPath(tenantSlug, `/admin/estoque/${vehicle.id}/preview`), "_blank")}>
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setHistoryVehicleId(vehicle.id)}>
                            <History className="h-4 w-4" />
                            Histórico
                          </Button>

                          {!vehicle.deletedAt && vehicle.status === "available" ? (
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => reserveMutation.mutate({ id: vehicle.id })}>
                              <Clock3 className="h-4 w-4" />
                              Reservar
                            </Button>
                          ) : null}
                          {!vehicle.deletedAt && vehicle.status !== "available" ? (
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => markAvailableMutation.mutate({ id: vehicle.id })}>
                              <CheckCircle className="h-4 w-4" />
                              Disponibilizar
                            </Button>
                          ) : null}
                          {!vehicle.deletedAt && vehicle.status !== "sold" ? (
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => setMarkSoldVehicleId(vehicle.id)}>
                              <BadgeCheck className="h-4 w-4" />
                              Marcar vendido
                            </Button>
                          ) : null}
                          {!vehicle.deletedAt ? (
                            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(vehicle.id)}>
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={() => canGoPrev && setPage((current) => current - 1)} disabled={!canGoPrev} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            {pageNumbers.map((pageNumber, index) => {
              const prev = pageNumbers[index - 1];
              const showGap = prev && pageNumber - prev > 1;
              return (
                <div key={pageNumber} className="flex items-center gap-2">
                  {showGap ? <span className="px-1 text-muted-foreground">…</span> : null}
                  <Button variant={pageNumber === page ? "default" : "outline"} onClick={() => setPage(pageNumber)} className="min-w-10">
                    {pageNumber}
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" onClick={() => canGoNext && setPage((current) => current + 1)} disabled={!canGoNext} className="gap-2">
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={markSoldVehicleId !== null} onOpenChange={(open) => { if (!open) { setMarkSoldVehicleId(null); setSellerId(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar veículo como vendido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Vendedor responsável</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={String(seller.id)}>{seller.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMarkSoldVehicleId(null); setSellerId(""); }}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!markSoldVehicleId || !sellerId) {
                  toast.error("Selecione o vendedor antes de continuar.");
                  return;
                }
                markSoldMutation.mutate({ id: markSoldVehicleId, sellerId: Number(sellerId) });
              }}
              disabled={markSoldMutation.isPending}
            >
              {markSoldMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyVehicleId !== null} onOpenChange={(open) => !open && setHistoryVehicleId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Histórico do veículo</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !historyQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum histórico disponível para este veículo.</p>
            ) : (
              historyQuery.data.map((entry: any) => (
                <div key={entry.id} className="rounded-2xl border border-border/60 bg-card/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{entry.summary}</p>
                      <p className="text-xs text-muted-foreground">{entry.actorName || "Sistema"} • {new Date(entry.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{entry.action}</span>
                  </div>
                  {entry.changedFieldsList?.length ? <p className="mt-2 text-xs text-muted-foreground">Campos: {entry.changedFieldsList.join(", ")}</p> : null}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover veículo do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso fará um soft delete: o registro sai das listagens operacionais, mas permanece no histórico para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Motivo da remoção</Label>
            <Textarea id="delete-reason" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} placeholder="Ex: cadastro duplicado, veículo devolvido, erro operacional..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteReason("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!deleteId) return;
                if (deleteReason.trim().length < 3) {
                  toast.error("Informe um motivo para a remoção.");
                  return;
                }
                deleteMutation.mutate({ id: deleteId, reason: deleteReason.trim() });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover com histórico
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
