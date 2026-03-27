import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Search, RefreshCw, Loader2, Calendar, Gauge, Fuel, Palette, DollarSign, ExternalLink, ChevronLeft, ChevronRight, Package, CheckCircle, Clock, XCircle, Eye, Tag, TrendingUp } from "lucide-react";

const PAGE_SIZE = 20;

function formatPrice(value: number | null | undefined): string {
  if (!value) return "Consulte";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function formatKm(km: number | null | undefined): string {
  if (!km) return "0 km";
  return `${km.toLocaleString("pt-BR")} km`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    available: { label: "Disponível", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
    reserved: { label: "Reservado", className: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
    sold: { label: "Vendido", className: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  };
  const c = config[status] || config.available;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={c.className}>
      <Icon className="w-3 h-3 mr-1" />
      {c.label}
    </Badge>
  );
}

export default function AdminInventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("available");
  const [brandFilter, setBrandFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: vehicles, isLoading, refetch } = trpc.inventory.list.useQuery({
    status: statusFilter === "all" ? "all" : statusFilter as any,
    search: search || undefined,
    brand: brandFilter !== "all" ? brandFilter : undefined,
  });
  const { data: brands } = trpc.inventory.brands.useQuery();
  const { data: stats } = trpc.inventory.stats.useQuery();
  const { data: syncLogs } = trpc.inventory.syncLogs.useQuery();
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });

  const syncMutation = trpc.inventory.sync.useMutation({
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`Erro na sincronização: ${result.error}`);
      } else {
        toast.success(`Sincronizado! ${result.found} veículos encontrados, ${result.added} novos, ${result.updated} atualizados`);
      }
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reserveMutation = trpc.inventory.reserve.useMutation({
    onSuccess: () => { toast.success("Veículo reservado!"); refetch(); setSelectedVehicle(null); },
    onError: (err) => toast.error(err.message),
  });

  const markSoldMutation = trpc.inventory.markSold.useMutation({
    onSuccess: () => { toast.success("Veículo marcado como vendido!"); refetch(); setSelectedVehicle(null); },
    onError: (err) => toast.error(err.message),
  });

  const markAvailableMutation = trpc.inventory.markAvailable.useMutation({
    onSuccess: () => { toast.success("Veículo disponível novamente!"); refetch(); setSelectedVehicle(null); },
    onError: (err) => toast.error(err.message),
  });

  const filteredVehicles = vehicles || [];
  const totalPages = Math.ceil(filteredVehicles.length / PAGE_SIZE);
  const pagedVehicles = filteredVehicles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const lastSync = syncLogs?.[0];
  const lastSyncTime = lastSync?.createdAt ? new Date(lastSync.createdAt).toLocaleString("pt-BR") : "Nunca";

  const selectedPhotos = useMemo(() => {
    if (!selectedVehicle?.photos) return [];
    try { return JSON.parse(selectedVehicle.photos); } catch { return []; }
  }, [selectedVehicle]);

  const selectedOptionals = useMemo(() => {
    if (!selectedVehicle?.optionals) return [];
    try { return JSON.parse(selectedVehicle.optionals); } catch { return []; }
  }, [selectedVehicle]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Car className="w-7 h-7 text-blue-400" />
              Estoque de Veículos
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Sincronizado do site kafkamultimarcas.com.br | Última sync: {lastSyncTime}
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar Agora
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
              <p className="text-xs text-gray-400">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <p className="text-2xl font-bold text-emerald-400">{stats?.available || 0}</p>
              <p className="text-xs text-gray-400">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-amber-400 mb-1" />
              <p className="text-2xl font-bold text-amber-400">{stats?.reserved || 0}</p>
              <p className="text-xs text-gray-400">Reservados</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-purple-400 mb-1" />
              <p className="text-2xl font-bold text-white">{formatPrice(stats?.avgPrice)}</p>
              <p className="text-xs text-gray-400">Preço Médio</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar por marca, modelo, cor..."
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] bg-gray-900 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponíveis</SelectItem>
              <SelectItem value="reserved">Reservados</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {(brands || []).map((b) => (
                <SelectItem key={b.brand} value={b.brand}>
                  {b.brand} ({b.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vehicle Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : pagedVehicles.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-12 text-center">
              <Car className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Nenhum veículo encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedVehicles.map((v) => (
                <Card
                  key={v.id}
                  className="bg-gray-900/50 border-gray-800 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden group"
                  onClick={() => { setSelectedVehicle(v); setPhotoIndex(0); }}
                >
                  {/* Photo */}
                  <div className="relative aspect-[16/10] bg-gray-800 overflow-hidden">
                    {v.photoUrl ? (
                      <img
                        src={v.photoUrl}
                        alt={`${v.brand} ${v.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={v.status} />
                    </div>
                    {v.fipePrice && v.fipePrice > 0 && v.price && v.price < v.fipePrice && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-600/90 text-white text-[10px]">
                          <Tag className="w-3 h-3 mr-1" />
                          Abaixo FIPE
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-white text-sm truncate">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-gray-400 text-xs truncate">{v.version}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-emerald-400">
                        {formatPrice(v.price)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {v.year} | {formatKm(v.km)}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {v.transmission && (
                        <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">
                          {v.transmission}
                        </Badge>
                      )}
                      {v.fuel && (
                        <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">
                          {v.fuel}
                        </Badge>
                      )}
                      {v.color && (
                        <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">
                          {v.color}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="border-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-gray-400 text-sm">
                  Página {page + 1} de {totalPages} ({filteredVehicles.length} veículos)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="border-gray-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Vehicle Detail Dialog */}
        <Dialog open={!!selectedVehicle} onOpenChange={(open) => { if (!open) setSelectedVehicle(null); }}>
          <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
            {selectedVehicle && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </DialogTitle>
                  <p className="text-gray-400">{selectedVehicle.version}</p>
                </DialogHeader>

                {/* Photo Gallery */}
                {selectedPhotos.length > 0 && (
                  <div className="relative">
                    <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={selectedPhotos[photoIndex]}
                        alt={`Foto ${photoIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedPhotos.length > 1 && (
                      <div className="flex items-center justify-between mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPhotoIndex(i => (i - 1 + selectedPhotos.length) % selectedPhotos.length)}
                          className="border-gray-700"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-gray-400 text-sm">
                          {photoIndex + 1} / {selectedPhotos.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPhotoIndex(i => (i + 1) % selectedPhotos.length)}
                          className="border-gray-700"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicle Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Ano:</span>
                    <span className="font-semibold">{selectedVehicle.year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">KM:</span>
                    <span className="font-semibold">{formatKm(selectedVehicle.km)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Combustível:</span>
                    <span className="font-semibold">{selectedVehicle.fuel || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Cor:</span>
                    <span className="font-semibold">{selectedVehicle.color || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Câmbio:</span>
                    <span className="font-semibold">{selectedVehicle.transmission || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Motor:</span>
                    <span className="font-semibold">{selectedVehicle.motor || "N/A"}</span>
                  </div>
                </div>

                {/* Prices */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Preço:</span>
                    <span className="text-xl font-bold text-emerald-400">{formatPrice(selectedVehicle.price)}</span>
                  </div>
                  {selectedVehicle.fipePrice > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">FIPE:</span>
                      <span className="text-sm text-gray-300">{formatPrice(selectedVehicle.fipePrice)}</span>
                    </div>
                  )}
                  {selectedVehicle.offerPrice > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Oferta:</span>
                      <span className="text-sm text-orange-400">{formatPrice(selectedVehicle.offerPrice)}</span>
                    </div>
                  )}
                </div>

                {/* Optionals */}
                {selectedOptionals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Opcionais</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedOptionals.map((opt: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-gray-700 text-gray-400">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status & Actions */}
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedVehicle.status} />
                  {selectedVehicle.plate && (
                    <Badge variant="outline" className="border-gray-700 text-gray-400">
                      Placa: {selectedVehicle.plate}
                    </Badge>
                  )}
                </div>

                <DialogFooter className="flex flex-wrap gap-2">
                  {selectedVehicle.externalUrl && (
                    <Button
                      variant="outline"
                      className="border-gray-700"
                      onClick={() => window.open(selectedVehicle.externalUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver no Site
                    </Button>
                  )}
                  {selectedVehicle.status === "available" && (
                    <>
                      <Button
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => reserveMutation.mutate({ id: selectedVehicle.id })}
                        disabled={reserveMutation.isPending}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Reservar
                      </Button>
                      <Select onValueChange={(sellerId) => {
                        markSoldMutation.mutate({ id: selectedVehicle.id, sellerId: parseInt(sellerId) });
                      }}>
                        <SelectTrigger className="w-[200px] bg-red-600/20 border-red-500/30 text-red-400">
                          <SelectValue placeholder="Marcar como vendido..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(sellers || []).filter(s => s.department === "vendas").map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {(selectedVehicle.status === "reserved" || selectedVehicle.status === "sold") && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => markAvailableMutation.mutate({ id: selectedVehicle.id })}
                      disabled={markAvailableMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Disponibilizar
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
