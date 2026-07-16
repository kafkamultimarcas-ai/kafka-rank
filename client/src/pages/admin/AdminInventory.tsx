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
import { Car, Search, RefreshCw, Loader2, Calendar, Gauge, Fuel, Palette, DollarSign, ExternalLink, ChevronLeft, ChevronRight, Package, CheckCircle, Clock, XCircle, Eye, Tag, TrendingUp, Copy, Plus, Edit, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentTenantSlug, buildTenantPath } from "@/lib/tenant";

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
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [createForm, setCreateForm] = useState({
    brand: "", model: "", version: "", motor: "", year: "", manufactureYear: "", modelYear: "",
    color: "", fuel: "", km: "", price: "", plate: "", chassis: "", renavam: "",
    bodyType: "", transmission: "", doors: "", vehicleState: "usado", category: "Carro/Camionetas",
    observation: "", title: "", internalCode: "", purchasePrice: "", preparationCost: "",
    documentationCost: "", transportCost: "", otherCosts: "", minimumSalePrice: "",
    fipePrice: "", offerPrice: "", videoUrl: "", internalNotes: "", storeLocation: "",
  });
  const [editForm, setEditForm] = useState<any>({});

  const { data: vehicles, isLoading, refetch } = trpc.inventory.list.useQuery({
    status: statusFilter === "all" ? "all" : statusFilter as any,
    search: search || undefined,
    brand: brandFilter !== "all" ? brandFilter : undefined,
  });
  const { data: brands } = trpc.inventory.brands.useQuery();
  const { data: stats } = trpc.inventory.stats.useQuery();
  const { data: syncLogs } = trpc.inventory.syncLogs.useQuery();
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });

  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!");
      setShowCreate(false);
      setCreateForm({
        brand: "", model: "", version: "", motor: "", year: "", manufactureYear: "", modelYear: "",
        color: "", fuel: "", km: "", price: "", plate: "", chassis: "", renavam: "",
        bodyType: "", transmission: "", doors: "", vehicleState: "usado", category: "Carro/Camionetas",
        observation: "", title: "", internalCode: "", purchasePrice: "", preparationCost: "",
        documentationCost: "", transportCost: "", otherCosts: "", minimumSalePrice: "",
        fipePrice: "", offerPrice: "", videoUrl: "", internalNotes: "", storeLocation: "",
      });
      refetch();
    },
    onError: (err) => toast.error("Erro ao cadastrar: " + err.message),
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado!");
      setShowEdit(false);
      setSelectedVehicle(null);
      refetch();
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Veículo excluído!");
      setSelectedVehicle(null);
      refetch();
    },
    onError: (err) => toast.error("Erro ao excluir: " + err.message),
  });

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
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Veículo
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar Agora
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card onClick={() => setStatusFilter('all')} className={`bg-gray-900/50 border-gray-800 cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-400' : 'hover:ring-1 hover:ring-blue-400/50'}`}>
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
              <p className="text-xs text-gray-400">Total</p>
            </CardContent>
          </Card>
          <Card onClick={() => setStatusFilter('available')} className={`bg-gray-900/50 border-gray-800 cursor-pointer transition-all ${statusFilter === 'available' ? 'ring-2 ring-emerald-400' : 'hover:ring-1 hover:ring-emerald-400/50'}`}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <p className="text-2xl font-bold text-emerald-400">{stats?.available || 0}</p>
              <p className="text-xs text-gray-400">Disponíveis</p>
            </CardContent>
          </Card>
          <Card onClick={() => setStatusFilter('reserved')} className={`bg-gray-900/50 border-gray-800 cursor-pointer transition-all ${statusFilter === 'reserved' ? 'ring-2 ring-amber-400' : 'hover:ring-1 hover:ring-amber-400/50'}`}>
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
                    {Number(v.fipePrice) > 0 && Number(v.price) > 0 && Number(v.price) < Number(v.fipePrice) && (
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
                  <Button
                    variant="outline"
                    className="border-gray-700"
                    onClick={() => {
                      const link = `${window.location.origin}${buildTenantPath(getCurrentTenantSlug(), "/estoque")}?veiculo=${selectedVehicle.id}&utm_source=veiculo&utm_medium=link_direto`;
                      navigator.clipboard.writeText(link);
                      toast.success("Link do veículo copiado!");
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
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
                  <Button
                    variant="outline"
                    className="border-blue-500/30 text-blue-400"
                    onClick={() => {
                      setEditForm({
                        id: selectedVehicle.id,
                        brand: selectedVehicle.brand || "",
                        model: selectedVehicle.model || "",
                        version: selectedVehicle.version || "",
                        motor: selectedVehicle.motor || "",
                        year: selectedVehicle.year?.toString() || "",
                        manufactureYear: selectedVehicle.manufactureYear?.toString() || "",
                        modelYear: selectedVehicle.modelYear?.toString() || "",
                        color: selectedVehicle.color || "",
                        fuel: selectedVehicle.fuel || "",
                        km: selectedVehicle.km?.toString() || "",
                        price: selectedVehicle.price?.toString() || "",
                        plate: selectedVehicle.plate || "",
                        chassis: selectedVehicle.chassis || "",
                        renavam: selectedVehicle.renavam || "",
                        bodyType: selectedVehicle.bodyType || "",
                        transmission: selectedVehicle.transmission || "",
                        doors: selectedVehicle.doors || "",
                        vehicleState: selectedVehicle.vehicleState || "usado",
                        category: selectedVehicle.category || "Carro/Camionetas",
                        observation: selectedVehicle.observation || "",
                        title: selectedVehicle.title || "",
                        internalCode: selectedVehicle.internalCode || "",
                        purchasePrice: selectedVehicle.purchasePrice?.toString() || "",
                        minimumSalePrice: selectedVehicle.minimumSalePrice?.toString() || "",
                        fipePrice: selectedVehicle.fipePrice?.toString() || "",
                        offerPrice: selectedVehicle.offerPrice?.toString() || "",
                        internalNotes: selectedVehicle.internalNotes || "",
                        storeLocation: selectedVehicle.storeLocation || "",
                      });
                      setSelectedVehicle(null);
                      setShowEdit(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500/30 text-red-400"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja excluir este veículo?")) {
                        deleteMutation.mutate({ id: selectedVehicle.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        {/* Create Vehicle Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-3xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Cadastrar Veículo
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-gray-300">Marca *</Label>
                <Input placeholder="Volkswagen" value={createForm.brand} onChange={(e) => setCreateForm({...createForm, brand: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Modelo *</Label>
                <Input placeholder="Saveiro" value={createForm.model} onChange={(e) => setCreateForm({...createForm, model: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Versão</Label>
                <Input placeholder="ROBUST 1.6 FLEX" value={createForm.version} onChange={(e) => setCreateForm({...createForm, version: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Motor</Label>
                <Input placeholder="1.6" value={createForm.motor} onChange={(e) => setCreateForm({...createForm, motor: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Ano</Label>
                <Input type="number" placeholder="2024" value={createForm.year} onChange={(e) => setCreateForm({...createForm, year: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Ano Fabricação</Label>
                <Input type="number" placeholder="2023" value={createForm.manufactureYear} onChange={(e) => setCreateForm({...createForm, manufactureYear: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Ano Modelo</Label>
                <Input type="number" placeholder="2024" value={createForm.modelYear} onChange={(e) => setCreateForm({...createForm, modelYear: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Cor</Label>
                <Input placeholder="Branco" value={createForm.color} onChange={(e) => setCreateForm({...createForm, color: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Combustível</Label>
                <Select value={createForm.fuel} onValueChange={(v) => setCreateForm({...createForm, fuel: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flex">Flex</SelectItem>
                    <SelectItem value="Gasolina">Gasolina</SelectItem>
                    <SelectItem value="Etanol">Etanol</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Elétrico">Elétrico</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="GNV">GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">KM</Label>
                <Input type="number" placeholder="50000" value={createForm.km} onChange={(e) => setCreateForm({...createForm, km: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Preço Venda (R$)</Label>
                <Input type="number" placeholder="89990" value={createForm.price} onChange={(e) => setCreateForm({...createForm, price: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Placa</Label>
                <Input placeholder="ABC1D23" value={createForm.plate} onChange={(e) => setCreateForm({...createForm, plate: e.target.value.toUpperCase()})} maxLength={8} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Chassi</Label>
                <Input placeholder="9BWZZZ377VT004251" value={createForm.chassis} onChange={(e) => setCreateForm({...createForm, chassis: e.target.value.toUpperCase()})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">RENAVAM</Label>
                <Input placeholder="00123456789" value={createForm.renavam} onChange={(e) => setCreateForm({...createForm, renavam: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Tipo Carroceria</Label>
                <Select value={createForm.bodyType} onValueChange={(v) => setCreateForm({...createForm, bodyType: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hatch">Hatch</SelectItem>
                    <SelectItem value="Sedan">Sedan</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="Picape">Picape</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Caminhão">Caminhão</SelectItem>
                    <SelectItem value="Moto">Moto</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Câmbio</Label>
                <Select value={createForm.transmission} onValueChange={(v) => setCreateForm({...createForm, transmission: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="cvt">CVT</SelectItem>
                    <SelectItem value="automatizado">Automatizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Portas</Label>
                <Select value={createForm.doors} onValueChange={(v) => setCreateForm({...createForm, doors: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Estado</Label>
                <Select value={createForm.vehicleState} onValueChange={(v) => setCreateForm({...createForm, vehicleState: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Categoria</Label>
                <Select value={createForm.category} onValueChange={(v) => setCreateForm({...createForm, category: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carro/Camionetas">Carro/Camionetas</SelectItem>
                    <SelectItem value="Moto">Moto</SelectItem>
                    <SelectItem value="Caminhão">Caminhão</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Preço Compra (R$)</Label>
                <Input type="number" placeholder="75000" value={createForm.purchasePrice} onChange={(e) => setCreateForm({...createForm, purchasePrice: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Preço Mínimo Venda (R$)</Label>
                <Input type="number" placeholder="85000" value={createForm.minimumSalePrice} onChange={(e) => setCreateForm({...createForm, minimumSalePrice: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Preço FIPE (R$)</Label>
                <Input type="number" placeholder="92000" value={createForm.fipePrice} onChange={(e) => setCreateForm({...createForm, fipePrice: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Código Interno</Label>
                <Input placeholder="VH-001" value={createForm.internalCode} onChange={(e) => setCreateForm({...createForm, internalCode: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Local no Pátio</Label>
                <Input placeholder="Vaga A3" value={createForm.storeLocation} onChange={(e) => setCreateForm({...createForm, storeLocation: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-gray-300">Observações</Label>
                <Textarea placeholder="Observações sobre o veículo..." value={createForm.observation} onChange={(e) => setCreateForm({...createForm, observation: e.target.value})} rows={2} className="bg-gray-800 border-gray-700" />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-gray-300">Notas Internas</Label>
                <Textarea placeholder="Notas internas (não visível ao público)..." value={createForm.internalNotes} onChange={(e) => setCreateForm({...createForm, internalNotes: e.target.value})} rows={2} className="bg-gray-800 border-gray-700" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-gray-700" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => createMutation.mutate({
                  brand: createForm.brand,
                  model: createForm.model,
                  version: createForm.version || undefined,
                  motor: createForm.motor || undefined,
                  year: createForm.year ? parseInt(createForm.year) : undefined,
                  manufactureYear: createForm.manufactureYear ? parseInt(createForm.manufactureYear) : undefined,
                  modelYear: createForm.modelYear ? parseInt(createForm.modelYear) : undefined,
                  color: createForm.color || undefined,
                  fuel: createForm.fuel || undefined,
                  km: createForm.km ? parseInt(createForm.km) : undefined,
                  price: createForm.price ? parseInt(createForm.price) : undefined,
                  plate: createForm.plate || undefined,
                  chassis: createForm.chassis || undefined,
                  renavam: createForm.renavam || undefined,
                  bodyType: createForm.bodyType || undefined,
                  transmission: createForm.transmission || undefined,
                  doors: createForm.doors || undefined,
                  vehicleState: createForm.vehicleState || undefined,
                  category: createForm.category || undefined,
                  observation: createForm.observation || undefined,
                  title: createForm.title || undefined,
                  internalCode: createForm.internalCode || undefined,
                  purchasePrice: createForm.purchasePrice ? parseInt(createForm.purchasePrice) : undefined,
                  minimumSalePrice: createForm.minimumSalePrice ? parseInt(createForm.minimumSalePrice) : undefined,
                  fipePrice: createForm.fipePrice ? parseInt(createForm.fipePrice) : undefined,
                  offerPrice: createForm.offerPrice ? parseInt(createForm.offerPrice) : undefined,
                  internalNotes: createForm.internalNotes || undefined,
                  storeLocation: createForm.storeLocation || undefined,
                  entryDate: Date.now(),
                })}
                disabled={!createForm.brand || !createForm.model || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Vehicle Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="max-w-3xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                Editar Veículo
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-gray-300">Marca *</Label>
                <Input value={editForm.brand || ""} onChange={(e) => setEditForm({...editForm, brand: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Modelo *</Label>
                <Input value={editForm.model || ""} onChange={(e) => setEditForm({...editForm, model: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Versão</Label>
                <Input value={editForm.version || ""} onChange={(e) => setEditForm({...editForm, version: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Motor</Label>
                <Input value={editForm.motor || ""} onChange={(e) => setEditForm({...editForm, motor: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Ano</Label>
                <Input type="number" value={editForm.year || ""} onChange={(e) => setEditForm({...editForm, year: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Cor</Label>
                <Input value={editForm.color || ""} onChange={(e) => setEditForm({...editForm, color: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Combustível</Label>
                <Select value={editForm.fuel || ""} onValueChange={(v) => setEditForm({...editForm, fuel: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flex">Flex</SelectItem>
                    <SelectItem value="Gasolina">Gasolina</SelectItem>
                    <SelectItem value="Etanol">Etanol</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Elétrico">Elétrico</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="GNV">GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">KM</Label>
                <Input type="number" value={editForm.km || ""} onChange={(e) => setEditForm({...editForm, km: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Preço Venda (R$)</Label>
                <Input type="number" value={editForm.price || ""} onChange={(e) => setEditForm({...editForm, price: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Placa</Label>
                <Input value={editForm.plate || ""} onChange={(e) => setEditForm({...editForm, plate: e.target.value.toUpperCase()})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Chassi</Label>
                <Input value={editForm.chassis || ""} onChange={(e) => setEditForm({...editForm, chassis: e.target.value.toUpperCase()})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">RENAVAM</Label>
                <Input value={editForm.renavam || ""} onChange={(e) => setEditForm({...editForm, renavam: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Câmbio</Label>
                <Select value={editForm.transmission || ""} onValueChange={(v) => setEditForm({...editForm, transmission: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="cvt">CVT</SelectItem>
                    <SelectItem value="automatizado">Automatizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Preço Compra (R$)</Label>
                <Input type="number" value={editForm.purchasePrice || ""} onChange={(e) => setEditForm({...editForm, purchasePrice: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Preço Mínimo (R$)</Label>
                <Input type="number" value={editForm.minimumSalePrice || ""} onChange={(e) => setEditForm({...editForm, minimumSalePrice: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Código Interno</Label>
                <Input value={editForm.internalCode || ""} onChange={(e) => setEditForm({...editForm, internalCode: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-300">Local no Pátio</Label>
                <Input value={editForm.storeLocation || ""} onChange={(e) => setEditForm({...editForm, storeLocation: e.target.value})} className="bg-gray-800 border-gray-700" />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-gray-300">Observações</Label>
                <Textarea value={editForm.observation || ""} onChange={(e) => setEditForm({...editForm, observation: e.target.value})} rows={2} className="bg-gray-800 border-gray-700" />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-gray-300">Notas Internas</Label>
                <Textarea value={editForm.internalNotes || ""} onChange={(e) => setEditForm({...editForm, internalNotes: e.target.value})} rows={2} className="bg-gray-800 border-gray-700" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-gray-700" onClick={() => setShowEdit(false)}>Cancelar</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => updateMutation.mutate({
                  id: editForm.id,
                  brand: editForm.brand || undefined,
                  model: editForm.model || undefined,
                  version: editForm.version || undefined,
                  motor: editForm.motor || undefined,
                  year: editForm.year ? parseInt(editForm.year) : undefined,
                  color: editForm.color || undefined,
                  fuel: editForm.fuel || undefined,
                  km: editForm.km ? parseInt(editForm.km) : undefined,
                  price: editForm.price ? parseInt(editForm.price) : undefined,
                  plate: editForm.plate || undefined,
                  chassis: editForm.chassis || undefined,
                  renavam: editForm.renavam || undefined,
                  transmission: editForm.transmission || undefined,
                  purchasePrice: editForm.purchasePrice ? parseInt(editForm.purchasePrice) : undefined,
                  minimumSalePrice: editForm.minimumSalePrice ? parseInt(editForm.minimumSalePrice) : undefined,
                  internalCode: editForm.internalCode || undefined,
                  storeLocation: editForm.storeLocation || undefined,
                  observation: editForm.observation || undefined,
                  internalNotes: editForm.internalNotes || undefined,
                })}
                disabled={!editForm.brand || !editForm.model || updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
