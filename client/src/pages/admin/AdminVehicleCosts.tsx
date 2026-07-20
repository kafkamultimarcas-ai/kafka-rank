import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Camera, Car, Trash2, Edit, DollarSign, Eye, Loader2, X, ChevronLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ListSkeleton } from "@/components/ListSkeleton";
import VehicleDetail from "./VehicleDetail";
import FipeConsulta from "./FipeConsulta";

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPlate(plate: string): string {
  if (!plate) return "";
  const clean = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

function getMarginColor(margin: number | null): string {
  if (margin === null) return "text-muted-foreground";
  if (margin >= 10) return "text-green-500";
  if (margin >= 5) return "text-yellow-500";
  return "text-red-500";
}

function getMarginBadge(margin: number | null) {
  if (margin === null) return null;
  if (margin >= 10) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Lucro saudável</Badge>;
  if (margin >= 5) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Atenção</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Margem baixa</Badge>;
}

// ===== CADASTRO MANUAL =====
// Helper para formatar valor monetário ao digitar
function parseCurrencyInput(value: string): string {
  // Remove tudo exceto números e vírgula/ponto
  const clean = value.replace(/[^0-9.,]/g, '');
  // Se for só números (ex: 50000), retorna como está para ser convertido
  return clean;
}

function formatCurrencyInput(value: string): string {
  if (!value) return '';
  // Remove formatação existente
  let clean = value.replace(/[^0-9.,]/g, '');
  // Converte vírgula para ponto se for separador decimal
  if (clean.includes(',') && !clean.includes('.')) {
    // Se tem vírgula seguida de 1-2 dígitos no final, é decimal
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      clean = parts[0].replace(/\./g, '') + '.' + parts[1];
    } else {
      clean = clean.replace(/[.,]/g, '');
    }
  } else if (clean.includes('.') && clean.includes(',')) {
    // Formato brasileiro: 50.000,00
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(clean);
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currencyToNumber(value: string): string {
  if (!value) return '';
  // Remove pontos de milhar e troca vírgula por ponto
  let clean = value.replace(/[^0-9.,]/g, '');
  if (clean.includes(',') && !clean.includes('.')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      clean = parts[0] + '.' + parts[1];
    } else {
      clean = clean.replace(',', '');
    }
  } else if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.split('.').length > 2) {
    // Múltiplos pontos = separador de milhar brasileiro
    clean = clean.replace(/\./g, '');
  }
  const num = parseFloat(clean);
  if (isNaN(num)) return '';
  return num.toString();
}

function ManualRegisterDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    plate: "", brand: "", model: "", year: "", color: "", fuel: "",
    purchasePrice: "", clientName: "", notes: "",
  });
  const createMutation = trpc.vehicleCosts.create.useMutation({
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!");
      setForm({ plate: "", brand: "", model: "", year: "", color: "", fuel: "", purchasePrice: "", clientName: "", notes: "" });
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error("Erro ao cadastrar: " + err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Cadastrar Veículo Manualmente</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="col-span-2">
            <Label>Placa *</Label>
            <Input placeholder="ABC1D23" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} maxLength={8} />
          </div>
          <div className="col-span-2">
            <Label>Nome do Cliente</Label>
            <Input placeholder="Nome do cliente" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div>
            <Label>Marca</Label>
            <Input placeholder="Chevrolet" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input placeholder="Onix 1.0 LT" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <Label>Ano</Label>
            <Input type="number" placeholder="2022" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input placeholder="Prata" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div>
            <Label>Combustível</Label>
            <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flex">Flex</SelectItem>
                <SelectItem value="gasolina">Gasolina</SelectItem>
                <SelectItem value="etanol">Etanol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="eletrico">Elétrico</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor de Compra (R$)</Label>
            <Input 
              placeholder="50.000,00" 
              value={form.purchasePrice} 
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
              onBlur={(e) => {
                const formatted = formatCurrencyInput(e.target.value);
                if (formatted) setForm({ ...form, purchasePrice: formatted });
              }}
            />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea placeholder="Observações opcionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate({
              plate: form.plate,
              brand: form.brand || undefined,
              model: form.model || undefined,
              year: form.year ? parseInt(form.year) : undefined,
              color: form.color || undefined,
              fuel: form.fuel || undefined,
              purchasePrice: currencyToNumber(form.purchasePrice) || undefined,
              clientName: form.clientName || undefined,
              entryDate: Date.now(),
            })}
            disabled={!form.plate || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== CADASTRO POR FOTO (IA) =====
function PhotoRegisterDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"capture" | "processing" | "confirm" | "manual">("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [form, setForm] = useState({
    plate: "", brand: "", model: "", year: "", color: "", fuel: "",
    purchasePrice: "", fipeValue: "", fipeCode: "", notes: "",
  });

  const ocrMutation = trpc.vehicleCosts.ocrPlate.useMutation({
    onSuccess: (data) => {
      if (data.plate) {
        setOcrResult(data);
        setForm({
          plate: data.plate || "",
          brand: data.brand || "",
          model: data.model || "",
          year: data.year?.toString() || "",
          color: data.color || "",
          fuel: "", purchasePrice: "", fipeValue: "", fipeCode: "",
          notes: "",
        });
        setStep("confirm");
      } else {
        toast.error(data.error || "Placa não identificada. Tente novamente ou cadastre manualmente");
        setForm({ ...form, plate: "", brand: data.brand || "", model: data.model || "", year: data.year?.toString() || "", color: data.color || "" });
        setStep("manual");
      }
    },
    onError: (err) => {
      toast.error("Erro no processamento: " + err.message);
      setStep("manual");
    },
  });

  const createMutation = trpc.vehicleCosts.create.useMutation({
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!");
      resetState();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error("Erro ao cadastrar: " + err.message),
  });

  const resetState = () => {
    setStep("capture");
    setPreview(null);
    setOcrResult(null);
    setForm({ plate: "", brand: "", model: "", year: "", color: "", fuel: "", purchasePrice: "", fipeValue: "", fipeCode: "", notes: "" });
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setStep("processing");
      const base64 = result.split(",")[1];
      ocrMutation.mutate({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleConfirm = () => {
    createMutation.mutate({
      plate: form.plate,
      brand: form.brand || undefined,
      model: form.model || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      color: form.color || undefined,
      fuel: form.fuel || undefined,
      fipeCode: form.fipeCode || undefined,
      fipeValue: form.fipeValue || undefined,
      purchasePrice: form.purchasePrice || undefined,
      entryDate: Date.now(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetState(); onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Cadastrar por Foto (IA)</DialogTitle>
        </DialogHeader>

        {step === "capture" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-12 h-12 text-primary" />
            </div>
            <p className="text-center text-muted-foreground text-sm">
              Tire uma foto do veículo mostrando a placa, ou selecione da galeria.
              A IA vai identificar a placa e buscar os dados automaticamente.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            <div className="flex gap-3">
              <Button onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" /> Tirar Foto / Galeria
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            {preview && <img src={preview} alt="Preview" className="w-48 h-36 object-cover rounded-lg" />}
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">Processando imagem com IA...</p>
            <p className="text-center text-xs text-muted-foreground">Identificando placa, marca, modelo...</p>
          </div>
        )}

        {(step === "confirm" || step === "manual") && (
          <div className="space-y-3">
            {preview && <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />}
            {step === "confirm" && ocrResult && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-400">Placa identificada: {formatPlate(ocrResult.plate)}</p>
                <p className="text-muted-foreground">Confiança: {ocrResult.confidence === "high" ? "Alta" : ocrResult.confidence === "medium" ? "Média" : "Baixa"}</p>
              </div>
            )}
            {step === "manual" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-400">Placa não identificada com certeza</p>
                <p className="text-muted-foreground">Complete os dados manualmente</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Placa *</Label>
                <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} maxLength={8} />
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div>
                <Label>Cor</Label>
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div>
                <Label>Valor de Compra (R$)</Label>
                <Input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
              </div>
              <div>
                <Label>Combustível</Label>
                <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flex">Flex</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { resetState(); }}>
                Tentar Novamente
              </Button>
              <Button onClick={handleConfirm} disabled={!form.plate || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmar Cadastro
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== VEHICLE CARD =====
function VehicleCard({ vehicle, onClick }: { vehicle: any; onClick: () => void }) {
  const purchasePrice = parseFloat(String(vehicle.purchasePrice || "0"));
  const totalExpenses = vehicle.totalExpenses || 0;
  const totalCost = purchasePrice + totalExpenses;
  const salePrice = parseFloat(String(vehicle.salePrice || "0"));
  const profit = vehicle.profit;
  const margin = vehicle.margin;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </p>
              <p className="text-xs text-muted-foreground">Placa: {formatPlate(vehicle.plate)}</p>
              {vehicle.clientName && <p className="text-xs text-muted-foreground">Cliente: {vehicle.clientName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {vehicle.status === "sold" && <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Vendido</Badge>}
            {vehicle.status === "reserved" && <Badge className="bg-orange-500/20 text-orange-400 text-[10px]">Reservado</Badge>}
            {vehicle.status === "in_stock" && <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Em Estoque</Badge>}
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Compra:</span>
            <span className="font-medium">{formatCurrency(purchasePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gastos:</span>
            <span className="font-medium text-red-400">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-1">
            <span className="text-muted-foreground font-medium">Total:</span>
            <span className="font-bold">{formatCurrency(totalCost)}</span>
          </div>
          {salePrice > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venda:</span>
                <span className="font-medium">{formatCurrency(salePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro:</span>
                <span className={`font-bold ${getMarginColor(margin)}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Margem:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getMarginColor(margin)}`}>
                    {margin !== null ? `${margin.toFixed(1)}%` : "-"}
                  </span>
                  {margin !== null && (
                    margin >= 10 ? <TrendingUp className="w-3 h-3 text-green-500" /> :
                    margin >= 5 ? <Minus className="w-3 h-3 text-yellow-500" /> :
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {salePrice > 0 && (
          <div className="mt-2">{getMarginBadge(margin)}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== MAIN COMPONENT =====
export default function AdminVehicleCosts() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const vehicleId = params.id ? parseInt(params.id) : null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showFipeDialog, setShowFipeDialog] = useState(false);

  const utils = trpc.useUtils();
  const pagination = usePagination({ initialPageSize: 12, total: undefined, resetDeps: [search, statusFilter] });
  const { data, isLoading, isFetching } = trpc.vehicleCosts.list.useQuery({
    search, status: statusFilter, offset: pagination.offset, limit: pagination.pageSize,
  });
  const vehicles = data?.items;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

  const handleRefresh = () => {
    utils.vehicleCosts.list.invalidate();
  };

  // Se estiver na rota de detalhe, mostrar VehicleDetail
  if (vehicleId) {
    return (
      <DashboardLayout>
        <VehicleDetail vehicleId={vehicleId} onBack={() => setLocation("/admin/custo-veiculo")} />
      </DashboardLayout>
    );
  }

  const stats = data?.stats;
  const totalInStock = stats?.inStock ?? 0;
  const totalSold = stats?.sold ?? 0;
  const totalInvested = stats?.totalInvested ?? 0;
  const totalProfit = stats?.totalProfit ?? 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Custo por Veículo</h1>
            <p className="text-sm text-muted-foreground">Controle de compra, gastos e margem de lucro</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowFipeDialog(true)}>
              <Search className="w-4 h-4 mr-2" /> Consultar FIPE
            </Button>
            <Button variant="outline" onClick={() => setShowPhotoDialog(true)}>
              <Camera className="w-4 h-4 mr-2" /> Cadastrar por Foto
            </Button>
            <Button onClick={() => setShowManualDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Cadastrar Manualmente
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Em Estoque</p>
              <p className="text-2xl font-bold text-emerald-400">{totalInStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Vendidos</p>
              <p className="text-2xl font-bold text-blue-400">{totalSold}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Investido</p>
              <p className="text-lg font-bold">{formatCurrency(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Lucro Total</p>
              <p className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(totalProfit)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, marca, modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="in_stock">Em Estoque</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
              <SelectItem value="reserved">Reservados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Veículos */}
        {isLoading ? (
          <ListSkeleton grid rows={6} />
        ) : vehicles && vehicles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  onClick={() => setLocation(`/admin/custo-veiculo/${v.id}`)}
                />
              ))}
            </div>
            <PaginationControls
              page={pagination.page}
              totalPages={totalPages}
              total={total}
              pageSize={pagination.pageSize}
              isLoading={isFetching}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[12, 24, 48]}
              className="border-t border-border pt-5"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Car className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum veículo cadastrado</p>
            <p className="text-sm">Cadastre seu primeiro veículo usando os botões acima</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ManualRegisterDialog open={showManualDialog} onClose={() => setShowManualDialog(false)} onSuccess={handleRefresh} />
      <PhotoRegisterDialog open={showPhotoDialog} onClose={() => setShowPhotoDialog(false)} onSuccess={handleRefresh} />
      
      {/* Consulta FIPE Dialog */}
      <Dialog open={showFipeDialog} onOpenChange={setShowFipeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Consultar Tabela FIPE</DialogTitle>
          </DialogHeader>
          <FipeConsulta />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
