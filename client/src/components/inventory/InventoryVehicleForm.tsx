import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { AlertTriangle, ArrowLeft, BadgeDollarSign, Car, CircleDot, ClipboardList, Eye, History, ImageIcon, Loader2, Save, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  inventoryCreateDetailedInputSchema,
  inventorySourceTypes,
  inventoryStatuses,
  inventoryUpdateDetailedInputSchema,
  joinListToLines,
  splitLinesToList,
} from "@shared/inventory";

type InventoryVehicleRecord = any;

type InventoryVehicleFormProps = {
  initialVehicle?: InventoryVehicleRecord | null;
  isSubmitting?: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (payload: any) => void;
  onShowHistory?: () => void;
};

type FieldErrorMap = Record<string, string>;

type InventoryFormState = {
  title: string;
  internalCode: string;
  brand: string;
  model: string;
  version: string;
  sourceType: (typeof inventorySourceTypes)[number];
  status: (typeof inventoryStatuses)[number];
  plate: string;
  chassis: string;
  renavam: string;
  color: string;
  fuel: string;
  transmission: string;
  motor: string;
  bodyType: string;
  category: string;
  vehicleState: string;
  doors: string;
  year: string;
  manufactureYear: string;
  modelYear: string;
  km: string;
  price: string;
  offerPrice: string;
  fipePrice: string;
  purchasePrice: string;
  preparationCost: string;
  documentationCost: string;
  transportCost: string;
  otherCosts: string;
  minimumSalePrice: string;
  photoUrl: string;
  photosText: string;
  optionalsText: string;
  highlightsText: string;
  tagsText: string;
  externalUrl: string;
  videoUrl: string;
  observation: string;
  internalNotes: string;
  storeLocation: string;
  entryDate: string;
  isPublished: boolean;
  isFeatured: boolean;
  acceptsTradeIn: boolean;
  isArmored: boolean;
};

const TAB_ITEMS = [
  { value: "identificacao", label: "Identificação", icon: Car },
  { value: "comercial", label: "Comercial", icon: BadgeDollarSign },
  { value: "financeiro", label: "Financeiro", icon: Wrench },
  { value: "midia", label: "Mídia", icon: ImageIcon },
  { value: "operacao", label: "Operação", icon: ShieldCheck },
  { value: "observacoes", label: "Observações", icon: ClipboardList },
] as const;

function numberToInput(value?: number | null) {
  return value === null || value === undefined || Number.isNaN(value) ? "" : String(value);
}

function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function defaultFormState(vehicle?: InventoryVehicleRecord | null): InventoryFormState {
  return {
    title: vehicle?.title || "",
    internalCode: vehicle?.internalCode || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    version: vehicle?.version || "",
    sourceType: vehicle?.sourceType || "manual",
    status: vehicle?.status || "available",
    plate: vehicle?.plate || "",
    chassis: vehicle?.chassis || "",
    renavam: vehicle?.renavam || "",
    color: vehicle?.color || "",
    fuel: vehicle?.fuel || "",
    transmission: vehicle?.transmission || "",
    motor: vehicle?.motor || "",
    bodyType: vehicle?.bodyType || "",
    category: vehicle?.category || "",
    vehicleState: vehicle?.vehicleState || "",
    doors: vehicle?.doors || "",
    year: numberToInput(vehicle?.year),
    manufactureYear: numberToInput(vehicle?.manufactureYear),
    modelYear: numberToInput(vehicle?.modelYear),
    km: numberToInput(vehicle?.km),
    price: numberToInput(vehicle?.price),
    offerPrice: numberToInput(vehicle?.offerPrice),
    fipePrice: numberToInput(vehicle?.fipePrice),
    purchasePrice: numberToInput(vehicle?.purchasePrice),
    preparationCost: numberToInput(vehicle?.preparationCost),
    documentationCost: numberToInput(vehicle?.documentationCost),
    transportCost: numberToInput(vehicle?.transportCost),
    otherCosts: numberToInput(vehicle?.otherCosts),
    minimumSalePrice: numberToInput(vehicle?.minimumSalePrice),
    photoUrl: vehicle?.photoUrl || "",
    photosText: joinListToLines(parseJsonArray(vehicle?.photos)),
    optionalsText: joinListToLines(parseJsonArray(vehicle?.optionals)),
    highlightsText: joinListToLines(parseJsonArray(vehicle?.highlightItems)),
    tagsText: joinListToLines(parseJsonArray(vehicle?.internalTags)),
    externalUrl: vehicle?.externalUrl || "",
    videoUrl: vehicle?.videoUrl || "",
    observation: vehicle?.observation || "",
    internalNotes: vehicle?.internalNotes || "",
    storeLocation: vehicle?.storeLocation || "",
    entryDate: vehicle?.entryDate ? new Date(Number(vehicle.entryDate)).toISOString().slice(0, 10) : "",
    isPublished: vehicle?.isPublished ?? true,
    isFeatured: vehicle?.isFeatured ?? false,
    acceptsTradeIn: vehicle?.acceptsTradeIn ?? false,
    isArmored: vehicle?.isArmored ?? false,
  };
}

function toOptionalInt(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function buildPayload(state: InventoryFormState, mode: "create" | "edit", id?: number) {
  const basePayload = {
    title: state.title,
    internalCode: state.internalCode,
    brand: state.brand,
    model: state.model,
    version: state.version,
    sourceType: state.sourceType,
    status: state.status,
    plate: state.plate,
    chassis: state.chassis,
    renavam: state.renavam,
    color: state.color,
    fuel: state.fuel,
    transmission: state.transmission,
    motor: state.motor,
    bodyType: state.bodyType,
    category: state.category,
    vehicleState: state.vehicleState,
    doors: state.doors,
    year: toOptionalInt(state.year),
    manufactureYear: toOptionalInt(state.manufactureYear),
    modelYear: toOptionalInt(state.modelYear),
    km: toOptionalInt(state.km),
    price: Number(state.price || 0),
    offerPrice: toOptionalInt(state.offerPrice),
    fipePrice: toOptionalInt(state.fipePrice),
    purchasePrice: toOptionalInt(state.purchasePrice),
    preparationCost: toOptionalInt(state.preparationCost),
    documentationCost: toOptionalInt(state.documentationCost),
    transportCost: toOptionalInt(state.transportCost),
    otherCosts: toOptionalInt(state.otherCosts),
    minimumSalePrice: toOptionalInt(state.minimumSalePrice),
    photoUrl: state.photoUrl,
    photos: splitLinesToList(state.photosText),
    optionals: splitLinesToList(state.optionalsText),
    highlightItems: splitLinesToList(state.highlightsText),
    internalTags: splitLinesToList(state.tagsText),
    externalUrl: state.externalUrl,
    videoUrl: state.videoUrl,
    observation: state.observation,
    internalNotes: state.internalNotes,
    storeLocation: state.storeLocation,
    entryDate: state.entryDate ? new Date(`${state.entryDate}T12:00:00`).getTime() : undefined,
    isPublished: state.isPublished,
    isFeatured: state.isFeatured,
    acceptsTradeIn: state.acceptsTradeIn,
    isArmored: state.isArmored,
  };

  if (mode === "edit") {
    return inventoryUpdateDetailedInputSchema.safeParse({ ...basePayload, id });
  }
  return inventoryCreateDetailedInputSchema.safeParse(basePayload);
}

export default function InventoryVehicleForm({
  initialVehicle,
  isSubmitting,
  mode,
  onCancel,
  onSubmit,
  onShowHistory,
}: InventoryVehicleFormProps) {
  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]["value"]>("identificacao");
  const [state, setState] = useState<InventoryFormState>(() => defaultFormState(initialVehicle));
  const [errors, setErrors] = useState<FieldErrorMap>({});
  const tenantSlug = getCurrentTenantSlug();

  const duplicateQuery = trpc.inventory.validateDuplicate.useQuery(
    {
      id: initialVehicle?.id,
      plate: state.plate || undefined,
      chassis: state.chassis || undefined,
      renavam: state.renavam || undefined,
    },
    {
      enabled: [state.plate, state.chassis, state.renavam].some((value) => value.trim().length > 0),
    }
  );

  const previewUrl = initialVehicle?.id ? buildTenantPath(tenantSlug, `/admin/estoque/${initialVehicle.id}/preview`) : null;

  const checklist = useMemo(() => {
    const items = [
      { label: "Marca", passed: !!state.brand.trim() },
      { label: "Modelo", passed: !!state.model.trim() },
      { label: "Versão", passed: !!state.version.trim() },
      { label: "Preço", passed: Number(state.price || 0) > 0 },
      { label: "Ano", passed: !!(state.year.trim() || state.modelYear.trim()) },
      { label: "KM", passed: !!state.km.trim() },
      { label: "Loja", passed: !!state.storeLocation.trim() },
      { label: "Descrição", passed: state.observation.trim().length >= 20 },
      { label: "Foto principal", passed: !!state.photoUrl.trim() || splitLinesToList(state.photosText).length > 0 },
    ];
    const completed = items.filter((item) => item.passed).length;
    return {
      items,
      completed,
      total: items.length,
      completeness: Math.round((completed / items.length) * 100),
      missingItems: items.filter((item) => !item.passed).map((item) => item.label),
      readyForPublish: items.every((item) => item.passed),
    };
  }, [state]);

  const estimatedMargin = useMemo(() => {
    const price = Number(state.price || 0);
    const purchase = Number(state.purchasePrice || 0);
    const prep = Number(state.preparationCost || 0);
    const docs = Number(state.documentationCost || 0);
    const transport = Number(state.transportCost || 0);
    const other = Number(state.otherCosts || 0);
    if (price <= 0) return null;
    return price - purchase - prep - docs - transport - other;
  }, [state]);

  const setField = <K extends keyof InventoryFormState>(field: K, value: InventoryFormState[K]) => {
    setState((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  };

  const submit = () => {
    if (duplicateQuery.data?.hasDuplicate) {
      toast.error("Existe duplicidade de placa, chassi ou renavam. Revise antes de salvar.");
      setActiveTab("identificacao");
      return;
    }
    if (state.isPublished && !checklist.readyForPublish) {
      toast.error(`Checklist incompleto para publicar: ${checklist.missingItems.join(", ")}`);
      return;
    }

    const parsed = buildPayload(state, mode, initialVehicle?.id);
    if (!parsed.success) {
      const nextErrors: FieldErrorMap = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      const firstTab =
        nextErrors.brand || nextErrors.model || nextErrors.price
          ? "identificacao"
          : nextErrors.photoUrl || nextErrors.photos
            ? "midia"
            : "comercial";
      setActiveTab(firstTab as (typeof TAB_ITEMS)[number]["value"]);
      toast.error("Revise os campos obrigatórios antes de salvar.");
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  const fieldMessage = (field: keyof InventoryFormState | "photos") =>
    errors[field] ? <p className="text-xs text-destructive">{errors[field]}</p> : null;

  const checkboxRow = (
    field: keyof Pick<InventoryFormState, "isPublished" | "isFeatured" | "acceptsTradeIn" | "isArmored">,
    label: string,
    description: string,
  ) => (
    <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <Checkbox checked={state[field]} onCheckedChange={(checked) => setField(field, checked === true)} />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="gap-2" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para o estoque
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {previewUrl ? (
            <Button variant="outline" className="gap-2" onClick={() => window.open(previewUrl, "_blank")}>
              <Eye className="h-4 w-4" />
              Preview público
            </Button>
          ) : null}
          {onShowHistory ? (
            <Button variant="outline" className="gap-2" onClick={onShowHistory}>
              <History className="h-4 w-4" />
              Histórico
            </Button>
          ) : null}
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={submit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Cadastrar veículo" : "Salvar alterações"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_340px]">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <CircleDot className="h-3.5 w-3.5" />
                {mode === "create" ? "Novo veículo" : "Editar veículo"}
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  {state.brand || state.model ? `${state.brand} ${state.model}`.trim() : "Cadastro de estoque"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Cadastro com checklist de publicação, validação de duplicidade e preview da vitrine.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                {checklist.completeness}% completo
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {state.sourceType}
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {state.status}
              </Badge>
              <Badge variant="outline" className={state.isPublished ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}>
                {state.isPublished ? "Publicado" : "Rascunho"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Resumo operacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço</span>
              <span className="font-semibold text-foreground">{state.price ? `R$ ${Number(state.price).toLocaleString("pt-BR")}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Local</span>
              <span className="font-semibold text-foreground">{state.storeLocation || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mídia</span>
              <span className="font-semibold text-foreground">
                {splitLinesToList(state.photosText).length + (state.photoUrl ? 1 : 0)} arquivo(s)
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Margem estimada</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {estimatedMargin === null ? "—" : `R$ ${estimatedMargin.toLocaleString("pt-BR")}`}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checklist de publicação</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {checklist.completed}/{checklist.total}
              </p>
              {!checklist.readyForPublish ? (
                <p className="mt-2 text-xs text-amber-300">Faltando: {checklist.missingItems.join(", ")}</p>
              ) : (
                <p className="mt-2 text-xs text-emerald-300">Pronto para publicar.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {duplicateQuery.data?.hasDuplicate ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <p className="font-medium text-amber-100">Possível duplicidade encontrada</p>
                <p className="text-sm text-amber-200/90">
                  Já existe veículo com placa, chassi ou renavam iguais neste estoque.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {duplicateQuery.data.duplicates.map((duplicate: any) => (
                <div key={duplicate.id} className="rounded-lg border border-amber-500/20 bg-black/10 p-3 text-sm text-amber-100">
                  {duplicate.brand} {duplicate.model} • {duplicate.plate || "sem placa"} • {duplicate.status}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {state.isPublished && !checklist.readyForPublish ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Publicação bloqueada pelo checklist</p>
              <p className="text-sm text-muted-foreground">
                Complete os itens faltantes antes de deixar esse veículo visível no estoque público.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof TAB_ITEMS)[number]["value"])} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-transparent p-0 md:grid-cols-6">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex h-auto items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-3 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="identificacao" className="mt-0">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Título comercial</Label>
                <Input value={state.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ex: Corolla XEi impecável" />
              </div>
              <div>
                <Label>Marca *</Label>
                <Input value={state.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="Toyota" />
                {fieldMessage("brand")}
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input value={state.model} onChange={(e) => setField("model", e.target.value)} placeholder="Corolla" />
                {fieldMessage("model")}
              </div>
              <div>
                <Label>Versão</Label>
                <Input value={state.version} onChange={(e) => setField("version", e.target.value)} placeholder="XEi 2.0 Flex AT" />
              </div>
              <div>
                <Label>Código interno</Label>
                <Input value={state.internalCode} onChange={(e) => setField("internalCode", e.target.value)} placeholder="EST-2048" />
              </div>
              <div>
                <Label>Origem</Label>
                <Select value={state.sourceType} onValueChange={(value) => setField("sourceType", value as InventoryFormState["sourceType"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="integration">Integração</SelectItem>
                    <SelectItem value="sync">Sync</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={state.status} onValueChange={(value) => setField("status", value as InventoryFormState["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placa</Label>
                <Input value={state.plate} onChange={(e) => setField("plate", e.target.value.toUpperCase())} placeholder="ABC1D23" />
              </div>
              <div>
                <Label>Chassi</Label>
                <Input value={state.chassis} onChange={(e) => setField("chassis", e.target.value.toUpperCase())} placeholder="9BW..." />
              </div>
              <div>
                <Label>Renavam</Label>
                <Input value={state.renavam} onChange={(e) => setField("renavam", e.target.value)} placeholder="00000000000" />
              </div>
              <div>
                <Label>Cor</Label>
                <Input value={state.color} onChange={(e) => setField("color", e.target.value)} placeholder="Prata" />
              </div>
              <div>
                <Label>Combustível</Label>
                <Input value={state.fuel} onChange={(e) => setField("fuel", e.target.value)} placeholder="Flex" />
              </div>
              <div>
                <Label>Câmbio</Label>
                <Input value={state.transmission} onChange={(e) => setField("transmission", e.target.value)} placeholder="Automático" />
              </div>
              <div>
                <Label>Motor</Label>
                <Input value={state.motor} onChange={(e) => setField("motor", e.target.value)} placeholder="2.0" />
              </div>
              <div>
                <Label>Carroceria</Label>
                <Input value={state.bodyType} onChange={(e) => setField("bodyType", e.target.value)} placeholder="Sedan" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={state.category} onChange={(e) => setField("category", e.target.value)} placeholder="Carro / SUV / Picape" />
              </div>
              <div>
                <Label>Estado do veículo</Label>
                <Input value={state.vehicleState} onChange={(e) => setField("vehicleState", e.target.value)} placeholder="Seminovo" />
              </div>
              <div>
                <Label>Portas</Label>
                <Input value={state.doors} onChange={(e) => setField("doors", e.target.value)} placeholder="4" />
              </div>
              <div>
                <Label>Ano referência</Label>
                <Input type="number" value={state.year} onChange={(e) => setField("year", e.target.value)} placeholder="2024" />
              </div>
              <div>
                <Label>Ano fabricação</Label>
                <Input type="number" value={state.manufactureYear} onChange={(e) => setField("manufactureYear", e.target.value)} placeholder="2023" />
              </div>
              <div>
                <Label>Ano modelo</Label>
                <Input type="number" value={state.modelYear} onChange={(e) => setField("modelYear", e.target.value)} placeholder="2024" />
              </div>
              <div>
                <Label>Quilometragem</Label>
                <Input type="number" value={state.km} onChange={(e) => setField("km", e.target.value)} placeholder="45000" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comercial" className="mt-0">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Preço principal *</Label>
                <Input type="number" value={state.price} onChange={(e) => setField("price", e.target.value)} placeholder="89990" />
                {fieldMessage("price")}
              </div>
              <div>
                <Label>Preço de oferta</Label>
                <Input type="number" value={state.offerPrice} onChange={(e) => setField("offerPrice", e.target.value)} placeholder="85990" />
              </div>
              <div>
                <Label>Preço FIPE</Label>
                <Input type="number" value={state.fipePrice} onChange={(e) => setField("fipePrice", e.target.value)} placeholder="91000" />
              </div>
              <div>
                <Label>Valor mínimo de venda</Label>
                <Input type="number" value={state.minimumSalePrice} onChange={(e) => setField("minimumSalePrice", e.target.value)} placeholder="84000" />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição pública</Label>
                <Textarea value={state.observation} onChange={(e) => setField("observation", e.target.value)} rows={4} placeholder="Texto comercial do anúncio, diferenciais, procedência..." />
              </div>
              <div className="md:col-span-2">
                <Label>Opcionais</Label>
                <Textarea value={state.optionalsText} onChange={(e) => setField("optionalsText", e.target.value)} rows={5} placeholder={"Um item por linha\nBancos em couro\nCentral multimídia"} />
              </div>
              <div className="md:col-span-2">
                <Label>Destaques comerciais</Label>
                <Textarea value={state.highlightsText} onChange={(e) => setField("highlightsText", e.target.value)} rows={4} placeholder={"Um destaque por linha\nIPVA pago\nBaixa KM"} />
              </div>
              <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                {checkboxRow("isPublished", "Publicado no estoque público", "Quando desligado, o veículo fica visível apenas internamente.")}
                {checkboxRow("isFeatured", "Destaque comercial", "Permite destacar o veículo em listagens e campanhas futuras.")}
                {checkboxRow("acceptsTradeIn", "Aceita troca", "Marca o veículo como elegível para negociação com troca.")}
                {checkboxRow("isArmored", "Blindado", "Sinalização comercial e interna para veículos blindados.")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-0">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Preço de compra</Label>
                <Input type="number" value={state.purchasePrice} onChange={(e) => setField("purchasePrice", e.target.value)} placeholder="70000" />
              </div>
              <div>
                <Label>Custo de preparação</Label>
                <Input type="number" value={state.preparationCost} onChange={(e) => setField("preparationCost", e.target.value)} placeholder="2500" />
              </div>
              <div>
                <Label>Custo documental</Label>
                <Input type="number" value={state.documentationCost} onChange={(e) => setField("documentationCost", e.target.value)} placeholder="700" />
              </div>
              <div>
                <Label>Custo de transporte</Label>
                <Input type="number" value={state.transportCost} onChange={(e) => setField("transportCost", e.target.value)} placeholder="900" />
              </div>
              <div>
                <Label>Outros custos</Label>
                <Input type="number" value={state.otherCosts} onChange={(e) => setField("otherCosts", e.target.value)} placeholder="0" />
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Margem estimada</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {estimatedMargin === null ? "—" : `R$ ${estimatedMargin.toLocaleString("pt-BR")}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="midia" className="mt-0">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="grid gap-4 p-5">
              <div>
                <Label>Foto principal</Label>
                <Input value={state.photoUrl} onChange={(e) => setField("photoUrl", e.target.value)} placeholder="https://..." />
                {fieldMessage("photoUrl")}
              </div>
              <div>
                <Label>Galeria de fotos</Label>
                <Textarea value={state.photosText} onChange={(e) => setField("photosText", e.target.value)} rows={6} placeholder={"Uma URL por linha\nhttps://...\nhttps://..."} />
                {fieldMessage("photos")}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Link externo</Label>
                  <Input value={state.externalUrl} onChange={(e) => setField("externalUrl", e.target.value)} placeholder="https://site-da-loja/veiculo" />
                </div>
                <div>
                  <Label>Vídeo</Label>
                  <Input value={state.videoUrl} onChange={(e) => setField("videoUrl", e.target.value)} placeholder="https://youtube.com/..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacao" className="mt-0">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Loja / unidade</Label>
                <Input value={state.storeLocation} onChange={(e) => setField("storeLocation", e.target.value)} placeholder="Loja Joinville" />
              </div>
              <div>
                <Label>Data de entrada</Label>
                <Input type="date" value={state.entryDate} onChange={(e) => setField("entryDate", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Tags internas</Label>
                <Textarea value={state.tagsText} onChange={(e) => setField("tagsText", e.target.value)} rows={4} placeholder={"Uma tag por linha\nSUV\nPrioridade showroom"} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observacoes" className="mt-0">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="grid gap-4 p-5">
              <div>
                <Label>Observações internas</Label>
                <Textarea value={state.internalNotes} onChange={(e) => setField("internalNotes", e.target.value)} rows={6} placeholder="Informações internas para operação, negociação, documentação e histórico." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
