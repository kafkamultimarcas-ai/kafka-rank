import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { AlertTriangle, ArrowLeft, BadgeDollarSign, Car, CheckCircle2, CircleDot, ClipboardList, Copy, Eye, FileText, History, ImageIcon, ListChecks, Loader2, Save, ShieldCheck, Star, Trash2, UploadCloud, Video, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  formatBRL,
  type InventoryCreateDetailedInput,
  inventoryCreateDetailedInputSchema,
  inventorySourceTypes,
  inventoryStatuses,
  type InventoryUpdateDetailedInput,
  inventoryUpdateDetailedInputSchema,
  joinListToLines,
  splitLinesToList,
  summaryValue,
} from "@shared/inventory";
import { CurrencyInput } from "@/components/ui/currency-input";

type InventoryVehicleMediaRecord = {
  id: number;
  mediaType: "image" | "video";
  sourceMode: "upload" | "external_url" | "integration";
  storageProvider: "s3" | "external";
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  sortOrder?: number | null;
  isPrimary: boolean;
  status: "active" | "deleted" | "processing";
};

type InventoryVehicleRecord = {
  id?: number;
  title?: string | null;
  internalCode?: string | null;
  brand?: string | null;
  model?: string | null;
  version?: string | null;
  sourceType?: "manual" | "integration" | "sync" | null;
  status?: "available" | "reserved" | "sold" | null;
  plate?: string | null;
  chassis?: string | null;
  renavam?: string | null;
  color?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  motor?: string | null;
  bodyType?: string | null;
  category?: string | null;
  vehicleState?: string | null;
  doors?: string | null;
  year?: number | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  km?: number | null;
  price?: number | null;
  offerPrice?: number | null;
  fipePrice?: number | null;
  purchasePrice?: number | null;
  preparationCost?: number | null;
  documentationCost?: number | null;
  transportCost?: number | null;
  otherCosts?: number | null;
  minimumSalePrice?: number | null;
  photoUrl?: string | null;
  photos?: string | null;
  optionals?: string | null;
  highlightItems?: string | null;
  internalTags?: string | null;
  externalUrl?: string | null;
  videoUrl?: string | null;
  observation?: string | null;
  internalNotes?: string | null;
  storeLocation?: string | null;
  entryDate?: number | null;
  isPublished?: boolean | null;
  isFeatured?: boolean | null;
  acceptsTradeIn?: boolean | null;
  isArmored?: boolean | null;
  mediaItems?: InventoryVehicleMediaRecord[];
};

export type InventoryPendingUpload = {
  clientId: string;
  file: File;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: "image" | "video";
  previewUrl: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type InventoryVehicleFormSubmitPayload = {
  data: InventoryCreateDetailedInput | InventoryUpdateDetailedInput;
  pendingUploads: InventoryPendingUpload[];
};

type InventoryVehicleFormProps = {
  initialVehicle?: InventoryVehicleRecord | null;
  isSubmitting?: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (payload: InventoryVehicleFormSubmitPayload) => void | Promise<void>;
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
  { value: "resumo", label: "Resumo", icon: FileText },
] as const;

type TabValue = (typeof TAB_ITEMS)[number]["value"];

/** Mapa de campo (nome no schema) → aba, usado para o indicador de erro por aba. */
const FIELD_TAB_MAP: Record<string, TabValue> = {
  title: "identificacao", brand: "identificacao", model: "identificacao", version: "identificacao",
  internalCode: "identificacao", sourceType: "identificacao", status: "identificacao", plate: "identificacao",
  chassis: "identificacao", renavam: "identificacao", color: "identificacao", fuel: "identificacao",
  transmission: "identificacao", motor: "identificacao", bodyType: "identificacao", category: "identificacao",
  vehicleState: "identificacao", doors: "identificacao", year: "identificacao", manufactureYear: "identificacao",
  modelYear: "identificacao", km: "identificacao",
  price: "comercial", offerPrice: "comercial", fipePrice: "comercial", minimumSalePrice: "comercial",
  observation: "comercial", optionals: "comercial", highlightItems: "comercial",
  purchasePrice: "financeiro", preparationCost: "financeiro", documentationCost: "financeiro",
  transportCost: "financeiro", otherCosts: "financeiro",
  photoUrl: "midia", photos: "midia", externalUrl: "midia", videoUrl: "midia",
  storeLocation: "operacao", entryDate: "operacao", internalTags: "operacao",
  internalNotes: "observacoes",
};

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

function inferClientMediaType(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function sortUploadedMedia(items: InventoryVehicleMediaRecord[]) {
  return [...items].sort((left, right) => {
    const leftOrder = typeof left.sortOrder === "number" ? left.sortOrder : Number.MAX_SAFE_INTEGER;
    const rightOrder = typeof right.sortOrder === "number" ? right.sortOrder : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.id - right.id;
  });
}

function formatDurationSeconds(value?: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function CompletenessRing({ value, size = 48 }: { value: number; size?: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} className="fill-none stroke-border/50" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none stroke-primary transition-all duration-500"
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
        {safeValue}%
      </span>
    </div>
  );
}

function SummarySection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function SummaryRow({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function readImageMetadata(previewUrl: string) {
  return new Promise<{ width?: number; height?: number; durationSeconds?: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({});
    image.src = previewUrl;
  });
}

function readVideoMetadata(previewUrl: string) {
  return new Promise<{ width?: number; height?: number; durationSeconds?: number }>((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration * 100) / 100 : undefined,
      });
    };
    video.onerror = () => resolve({});
    video.src = previewUrl;
  });
}

async function extractMediaMetadata(previewUrl: string, mediaType: "image" | "video") {
  if (mediaType === "image") {
    return readImageMetadata(previewUrl);
  }

  return readVideoMetadata(previewUrl);
}

async function readFileAsBase64(file: File) {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function buildPendingUpload(file: File): Promise<InventoryPendingUpload | null> {
  const mediaType = inferClientMediaType(file);
  if (!mediaType) return null;

  const previewUrl = URL.createObjectURL(file);
  const metadata = await extractMediaMetadata(previewUrl, mediaType);

  return {
    clientId: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    mediaType,
    previewUrl,
    width: metadata.width,
    height: metadata.height,
    durationSeconds: metadata.durationSeconds,
  };
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
  const [pendingUploads, setPendingUploads] = useState<InventoryPendingUpload[]>([]);
  const [uploadedMediaItems, setUploadedMediaItems] = useState<InventoryVehicleMediaRecord[]>([]);
  const [draggedPendingUploadId, setDraggedPendingUploadId] = useState<string | null>(null);
  const [draggedUploadedMediaId, setDraggedUploadedMediaId] = useState<number | null>(null);
  const pendingUploadsRef = useRef<InventoryPendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tenantSlug = getCurrentTenantSlug();
  const utils = trpc.useUtils();

  const mediaQuery = trpc.inventory.listMedia.useQuery(
    { vehicleId: Number(initialVehicle?.id) },
    { enabled: mode === "edit" && Number.isFinite(Number(initialVehicle?.id)) && Number(initialVehicle?.id) > 0 }
  );

  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation({
    onSuccess: async () => {
      if (initialVehicle?.id) {
        await utils.inventory.listMedia.invalidate({ vehicleId: Number(initialVehicle.id) });
        await utils.inventory.getAdminById.invalidate({ id: Number(initialVehicle.id) });
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMediaMutation = trpc.inventory.deleteMedia.useMutation({
    onSuccess: async () => {
      if (initialVehicle?.id) {
        await utils.inventory.listMedia.invalidate({ vehicleId: Number(initialVehicle.id) });
        await utils.inventory.getAdminById.invalidate({ id: Number(initialVehicle.id) });
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const setPrimaryMediaMutation = trpc.inventory.setPrimaryMedia.useMutation({
    onSuccess: async () => {
      if (initialVehicle?.id) {
        await utils.inventory.listMedia.invalidate({ vehicleId: Number(initialVehicle.id) });
        await utils.inventory.getAdminById.invalidate({ id: Number(initialVehicle.id) });
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const reorderMediaMutation = trpc.inventory.reorderMedia.useMutation({
    onSuccess: async () => {
      if (initialVehicle?.id) {
        await utils.inventory.listMedia.invalidate({ vehicleId: Number(initialVehicle.id) });
        await utils.inventory.getAdminById.invalidate({ id: Number(initialVehicle.id) });
      }
    },
    onError: (error) => toast.error(error.message),
  });

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

  useEffect(() => {
    const initialMedia = ((initialVehicle?.mediaItems || []) as InventoryVehicleMediaRecord[])
      .filter((item) => item.status === "active" && item.sourceMode === "upload");
    setUploadedMediaItems(sortUploadedMedia(initialMedia));
  }, [initialVehicle?.mediaItems]);

  useEffect(() => {
    if (mediaQuery.data) {
      setUploadedMediaItems(sortUploadedMedia(mediaQuery.data.filter((item) => item.status === "active" && item.sourceMode === "upload")));
    }
  }, [mediaQuery.data]);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      for (const upload of pendingUploadsRef.current) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    };
  }, []);

  const previewUrl = initialVehicle?.id ? buildTenantPath(tenantSlug, `/admin/estoque/${initialVehicle.id}/preview`) : null;

  const checklist = useMemo(() => {
    const hasUploadedImage = uploadedMediaItems.some((item) => item.mediaType === "image");
    const hasPendingImage = pendingUploads.some((item) => item.mediaType === "image");
    const items = [
      { label: "Marca", passed: !!state.brand.trim() },
      { label: "Modelo", passed: !!state.model.trim() },
      { label: "Versão", passed: !!state.version.trim() },
      { label: "Preço", passed: Number(state.price || 0) > 0 },
      { label: "Ano", passed: !!(state.year.trim() || state.modelYear.trim()) },
      { label: "KM", passed: !!state.km.trim() },
      { label: "Loja", passed: !!state.storeLocation.trim() },
      { label: "Descrição", passed: state.observation.trim().length >= 20 },
      { label: "Foto principal", passed: !!state.photoUrl.trim() || splitLinesToList(state.photosText).length > 0 || hasUploadedImage || hasPendingImage },
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
  }, [pendingUploads, state, uploadedMediaItems]);

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

  const summaryCoverImage = useMemo(() => {
    if (state.photoUrl.trim()) return state.photoUrl.trim();
    const primaryUploaded = uploadedMediaItems.find((item) => item.mediaType === "image" && item.isPrimary)
      || uploadedMediaItems.find((item) => item.mediaType === "image");
    if (primaryUploaded) return primaryUploaded.url;
    const firstLink = splitLinesToList(state.photosText)[0];
    if (firstLink) return firstLink;
    const pendingImage = pendingUploads.find((item) => item.mediaType === "image");
    return pendingImage?.previewUrl ?? null;
  }, [state.photoUrl, state.photosText, uploadedMediaItems, pendingUploads]);

  const mediaSummary = useMemo(() => {
    const linkImages = splitLinesToList(state.photosText).length + (state.photoUrl.trim() ? 1 : 0);
    const uploadedImages = uploadedMediaItems.filter((item) => item.mediaType === "image").length;
    const uploadedVideos = uploadedMediaItems.filter((item) => item.mediaType === "video").length;
    const pendingImages = pendingUploads.filter((item) => item.mediaType === "image").length;
    const pendingVideos = pendingUploads.filter((item) => item.mediaType === "video").length;
    const linkVideo = state.videoUrl.trim() ? 1 : 0;
    return {
      images: linkImages + uploadedImages + pendingImages,
      videos: uploadedVideos + pendingVideos + linkVideo,
      total: linkImages + uploadedImages + uploadedVideos + pendingImages + pendingVideos + linkVideo,
      pending: pendingUploads.length,
    };
  }, [state.photosText, state.photoUrl, state.videoUrl, uploadedMediaItems, pendingUploads]);

  const tabsWithErrors = useMemo(() => {
    const set = new Set<TabValue>();
    for (const field of Object.keys(errors)) {
      const tab = FIELD_TAB_MAP[field];
      if (tab) set.add(tab);
    }
    return set;
  }, [errors]);

  const validateField = (schemaField: string) => {
    const parsed = buildPayload(state, mode, initialVehicle?.id);
    setErrors((current) => {
      const next = { ...current };
      if (parsed.success) {
        delete next[schemaField];
        return next;
      }
      const issue = parsed.error.issues.find((item) => String(item.path[0]) === schemaField);
      if (issue) next[schemaField] = issue.message;
      else delete next[schemaField];
      return next;
    });
  };

  // ---- Autosave de rascunho (somente no cadastro) ----
  const draftKey = `inventory:draft:new:${tenantSlug}`;
  const [draftRestored, setDraftRestored] = useState(false);
  const draftReadyRef = useRef(false);

  useEffect(() => {
    if (mode !== "create" || draftReadyRef.current) return;
    draftReadyRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        setState(JSON.parse(raw) as InventoryFormState);
        setDraftRestored(true);
      }
    } catch {
      /* rascunho inválido é ignorado */
    }
  }, [mode, draftKey]);

  useEffect(() => {
    if (mode !== "create" || !draftReadyRef.current) return;
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(state));
      } catch {
        /* storage indisponível — ignora */
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [state, mode, draftKey]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  const discardDraft = () => {
    clearDraft();
    for (const upload of pendingUploads) URL.revokeObjectURL(upload.previewUrl);
    setPendingUploads([]);
    setState(defaultFormState(undefined));
    setErrors({});
    setDraftRestored(false);
    toast.success("Rascunho descartado.");
  };

  const handleCopySummary = async () => {
    const title = state.brand || state.model ? `${state.brand} ${state.model}`.trim() : "Veículo";
    const specs = [
      state.modelYear || state.year ? `Ano ${state.modelYear || state.year}` : null,
      state.km ? `${Number(state.km).toLocaleString("pt-BR")} km` : null,
      state.color || null,
      state.transmission || null,
      state.fuel || null,
    ].filter(Boolean);
    const optionals = splitLinesToList(state.optionalsText);

    const lines: string[] = [`🚗 ${title}${state.version ? ` ${state.version}` : ""}`];
    if (specs.length) lines.push(specs.join(" • "));
    lines.push(`💰 ${formatBRL(state.price)}${Number(state.offerPrice || 0) > 0 ? ` (oferta ${formatBRL(state.offerPrice)})` : ""}`);
    if (optionals.length) lines.push(`\n✅ Opcionais:\n${optionals.map((item) => `• ${item}`).join("\n")}`);
    if (state.observation.trim()) lines.push(`\n${state.observation.trim()}`);
    if (state.storeLocation.trim()) lines.push(`\n📍 ${state.storeLocation.trim()}`);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Resumo copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o resumo.");
    }
  };

  const setField = <K extends keyof InventoryFormState>(field: K, value: InventoryFormState[K]) => {
    setState((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  };

  const handleSelectFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const pendingUploadResults = await Promise.all(files.map(async (file) => {
      const mediaType = inferClientMediaType(file);
      if (!mediaType) {
        toast.error(`Arquivo n?o suportado: ${file.name}`);
        return null;
      }

      const maxBytes = mediaType === "video" ? 9 * 1024 * 1024 : 8 * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error(
          mediaType === "video"
            ? `V?deo muito grande: ${file.name}. Limite atual de 9MB.`
            : `Imagem muito grande: ${file.name}. Limite atual de 8MB.`,
        );
        return null;
      }

      return buildPendingUpload(file);
    }));
    const acceptedUploads = pendingUploadResults.filter((upload): upload is InventoryPendingUpload => upload !== null);

    if (acceptedUploads.length === 0) {
      event.target.value = "";
      return;
    }

    if (mode === "edit" && initialVehicle?.id) {
      for (const upload of acceptedUploads) {
        const base64 = await readFileAsBase64(upload.file);

        await uploadMediaMutation.mutateAsync({
          vehicleId: Number(initialVehicle.id),
          fileName: upload.fileName,
          base64,
          mimeType: upload.mimeType,
          width: upload.width,
          height: upload.height,
          durationSeconds: upload.durationSeconds,
        });

        URL.revokeObjectURL(upload.previewUrl);
      }

      toast.success("M?dia enviada com sucesso.");
    } else {
      setPendingUploads((current) => [...current, ...acceptedUploads]);
    }

    event.target.value = "";
  };

  const removePendingUpload = (clientId: string) => {
    setPendingUploads((current) => {
      const found = current.find((item) => item.clientId === clientId);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return current.filter((item) => item.clientId !== clientId);
    });
  };

  const movePendingUploadToIndex = (clientId: string, targetIndex: number) => {
    setPendingUploads((current) => {
      const fromIndex = current.findIndex((item) => item.clientId === clientId);
      if (fromIndex < 0) return current;
      return moveItem(current, fromIndex, targetIndex);
    });
  };

  const handlePendingUploadDrop = (targetClientId: string) => {
    if (!draggedPendingUploadId || draggedPendingUploadId === targetClientId) return;
    setPendingUploads((current) => {
      const fromIndex = current.findIndex((item) => item.clientId === draggedPendingUploadId);
      const toIndex = current.findIndex((item) => item.clientId === targetClientId);
      if (fromIndex < 0 || toIndex < 0) return current;
      return moveItem(current, fromIndex, toIndex);
    });
    setDraggedPendingUploadId(null);
  };

  const removeUploadedMedia = async (mediaId: number) => {
    await deleteMediaMutation.mutateAsync({ mediaId });
  };

  const moveUploadedMediaToIndex = async (mediaId: number, targetIndex: number) => {
    if (!initialVehicle?.id) return;
    const previousItems = uploadedMediaItems;
    const fromIndex = previousItems.findIndex((item) => item.id === mediaId);
    if (fromIndex < 0 || fromIndex === targetIndex) return;

    const reordered = moveItem(previousItems, fromIndex, targetIndex).map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setUploadedMediaItems(reordered);
    try {
      await reorderMediaMutation.mutateAsync({
        vehicleId: Number(initialVehicle.id),
        orderedIds: reordered.map((item) => item.id),
      });
    } catch {
      setUploadedMediaItems(previousItems);
    }
  };

  const handleUploadedMediaDrop = async (targetMediaId: number) => {
    if (!draggedUploadedMediaId || draggedUploadedMediaId === targetMediaId) return;
    const targetIndex = uploadedMediaItems.findIndex((item) => item.id === targetMediaId);
    setDraggedUploadedMediaId(null);
    if (targetIndex < 0) return;
    await moveUploadedMediaToIndex(draggedUploadedMediaId, targetIndex);
  };

  const makeUploadedMediaPrimary = async (mediaId: number) => {
    if (!initialVehicle?.id) return;
    await setPrimaryMediaMutation.mutateAsync({ vehicleId: Number(initialVehicle.id), mediaId });
  };

  const submit = async () => {
    if (duplicateQuery.data?.hasDuplicate) {
      toast.error("Existe duplicidade de placa, chassi ou renavam. Revise antes de salvar.");
      setActiveTab("identificacao");
      return;
    }
    // O checklist só bloqueia quando estamos publicando agora (criando publicado
    // ou ligando o "publicado"). Editar um veículo que já estava publicado —
    // caso comum de dados integrados/sincronizados — nunca é bloqueado.
    const wasPublished = mode === "edit" ? Boolean(initialVehicle?.isPublished) : false;
    if (state.isPublished && !wasPublished && !checklist.readyForPublish) {
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
    if (mode === "create") {
      clearDraft();
      setDraftRestored(false);
    }
    await onSubmit({
      data: parsed.data,
      pendingUploads,
    });
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
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/70 to-background/50 px-6 py-5">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              <CircleDot className="h-3 w-3 text-primary" />
              {mode === "create" ? "Novo veículo" : "Editar veículo"}
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {state.brand || state.model ? `${state.brand} ${state.model}`.trim() : "Cadastro de estoque"}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Cadastro com checklist de publicação, validação de duplicidade e preview da vitrine.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="border-border/70 text-muted-foreground">{state.sourceType}</Badge>
              <Badge variant="outline" className="border-border/70 text-muted-foreground">{state.status}</Badge>
              <Badge variant="outline" className={state.isPublished ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}>
                {state.isPublished ? "Publicado" : "Rascunho"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/50 px-4 py-3">
            <CompletenessRing value={checklist.completeness} size={56} />
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Checklist</p>
              <p className="text-sm font-semibold text-foreground">{checklist.completed}/{checklist.total} concluídos</p>
              {checklist.readyForPublish ? (
                <p className="flex items-center gap-1 text-xs text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Pronto para publicar</p>
              ) : (
                <p className="text-xs text-amber-300">Faltam {checklist.missingItems.length} itens</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {duplicateQuery.data?.hasDuplicate ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
            Possível duplicidade de placa, chassi ou renavam neste estoque — revise na aba Identificação.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {duplicateQuery.data.duplicates.map((duplicate) => (
              <span key={duplicate.id} className="rounded-full border border-amber-500/20 bg-black/10 px-2.5 py-1 text-xs text-amber-100">
                {duplicate.brand} {duplicate.model} · {duplicate.plate || "sem placa"} · {duplicate.status}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {draftRestored ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <History className="h-4 w-4 text-primary" />
            Rascunho recuperado automaticamente — continue de onde parou.
          </div>
          <Button type="button" size="sm" variant="ghost" className="gap-2 text-muted-foreground" onClick={discardDraft}>
            <Trash2 className="h-3.5 w-3.5" />
            Descartar rascunho
          </Button>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof TAB_ITEMS)[number]["value"])} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-transparent p-0 sm:grid-cols-4 lg:grid-cols-7">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative flex h-auto items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-3 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {tabsWithErrors.has(tab.value) ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive shadow-[0_0_0_3px] shadow-destructive/20" />
                ) : null}
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
                <Input value={state.brand} onChange={(e) => setField("brand", e.target.value)} onBlur={() => validateField("brand")} placeholder="Toyota" />
                {fieldMessage("brand")}
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input value={state.model} onChange={(e) => setField("model", e.target.value)} onBlur={() => validateField("model")} placeholder="Corolla" />
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
                <CurrencyInput value={state.price} onChange={(v) => setField("price", v)} onBlur={() => validateField("price")} placeholder="89.990" />
                {fieldMessage("price")}
              </div>
              <div>
                <Label>Preço de oferta</Label>
                <CurrencyInput value={state.offerPrice} onChange={(v) => setField("offerPrice", v)} placeholder="85.990" />
              </div>
              <div>
                <Label>Preço FIPE</Label>
                <CurrencyInput value={state.fipePrice} onChange={(v) => setField("fipePrice", v)} placeholder="91.000" />
              </div>
              <div>
                <Label>Valor mínimo de venda</Label>
                <CurrencyInput value={state.minimumSalePrice} onChange={(v) => setField("minimumSalePrice", v)} placeholder="84.000" />
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
                <CurrencyInput value={state.purchasePrice} onChange={(v) => setField("purchasePrice", v)} placeholder="70.000" />
              </div>
              <div>
                <Label>Custo de preparação</Label>
                <CurrencyInput value={state.preparationCost} onChange={(v) => setField("preparationCost", v)} placeholder="2.500" />
              </div>
              <div>
                <Label>Custo documental</Label>
                <CurrencyInput value={state.documentationCost} onChange={(v) => setField("documentationCost", v)} placeholder="700" />
              </div>
              <div>
                <Label>Custo de transporte</Label>
                <CurrencyInput value={state.transportCost} onChange={(v) => setField("transportCost", v)} placeholder="900" />
              </div>
              <div>
                <Label>Outros custos</Label>
                <CurrencyInput value={state.otherCosts} onChange={(v) => setField("otherCosts", v)} placeholder="0" />
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                multiple
                className="hidden"
                onChange={handleSelectFiles}
              />

              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Upload de arquivos</p>
                    <p className="text-xs text-muted-foreground">
                      Fotos e vídeos pequenos podem ser enviados direto para o bucket. Links externos continuam disponíveis abaixo.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="h-4 w-4" />
                    Selecionar arquivos
                  </Button>
                </div>
                {mode === "create" ? (
                  <p className="mt-3 text-xs text-amber-300">
                    Os arquivos escolhidos serão enviados após o primeiro cadastro do veículo.
                  </p>
                ) : null}
              </div>

              {uploadedMediaItems.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Arquivos enviados</Label>
                    <p className="text-xs text-muted-foreground">Arraste para reordenar. A capa continua sendo definida pelo bot?o.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {uploadedMediaItems.map((item, index) => {
                      const durationLabel = formatDurationSeconds(item.durationSeconds);
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDraggedUploadedMediaId(item.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => void handleUploadedMediaDrop(item.id)}
                          onDragEnd={() => setDraggedUploadedMediaId(null)}
                          className="rounded-2xl border border-border/60 bg-background/70 p-3"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.mediaType === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                              <span className="truncate">{item.fileName || item.mediaType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">#{index + 1}</span>
                              {item.isPrimary ? <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Capa</span> : null}
                            </div>
                          </div>
                          {item.mediaType === "image" ? (
                            <img src={item.url} alt={item.fileName || "Imagem do ve?culo"} className="h-36 w-full rounded-xl object-cover" />
                          ) : (
                            <video src={item.url} controls className="h-36 w-full rounded-xl bg-black/30 object-cover" preload="metadata" />
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            {item.width && item.height ? <span className="rounded-full border border-border/60 px-2 py-1">{item.width}x{item.height}</span> : null}
                            {durationLabel ? <span className="rounded-full border border-border/60 px-2 py-1">{durationLabel}</span> : null}
                            {item.fileSizeBytes ? <span className="rounded-full border border-border/60 px-2 py-1">{(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span> : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.mediaType === "image" && !item.isPrimary ? (
                              <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => void makeUploadedMediaPrimary(item.id)}>
                                <Star className="h-3.5 w-3.5" />
                                Definir capa
                              </Button>
                            ) : null}
                            {index > 0 ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => void moveUploadedMediaToIndex(item.id, 0)}>
                                Mover para o topo
                              </Button>
                            ) : null}
                            <Button type="button" size="sm" variant="outline" className="gap-2 text-destructive" onClick={() => void removeUploadedMedia(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {pendingUploads.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Fila local de upload</Label>
                    <p className="text-xs text-muted-foreground">A primeira imagem da fila tende a virar capa ap?s o cadastro. Voc? tamb?m pode arrastar para reordenar.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pendingUploads.map((item, index) => {
                      const durationLabel = formatDurationSeconds(item.durationSeconds);
                      return (
                        <div
                          key={item.clientId}
                          draggable
                          onDragStart={() => setDraggedPendingUploadId(item.clientId)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handlePendingUploadDrop(item.clientId)}
                          onDragEnd={() => setDraggedPendingUploadId(null)}
                          className="rounded-2xl border border-border/60 bg-background/70 p-3"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {item.mediaType === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                              <span className="truncate">{item.fileName}</span>
                            </div>
                            <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">#{index + 1}</span>
                          </div>
                          {item.mediaType === "image" ? (
                            <img src={item.previewUrl} alt={item.fileName} className="h-36 w-full rounded-xl object-cover" />
                          ) : (
                            <video src={item.previewUrl} controls className="h-36 w-full rounded-xl bg-black/30 object-cover" preload="metadata" />
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            {item.width && item.height ? <span className="rounded-full border border-border/60 px-2 py-1">{item.width}x{item.height}</span> : null}
                            {durationLabel ? <span className="rounded-full border border-border/60 px-2 py-1">{durationLabel}</span> : null}
                            <span className="rounded-full border border-border/60 px-2 py-1">{(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.mediaType === "image" && index > 0 ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => movePendingUploadToIndex(item.clientId, 0)}>
                                Mover para o topo
                              </Button>
                            ) : null}
                            <Button type="button" size="sm" variant="outline" className="gap-2 text-destructive" onClick={() => removePendingUpload(item.clientId)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <Label>Foto principal por link</Label>
                <Input value={state.photoUrl} onChange={(e) => setField("photoUrl", e.target.value)} onBlur={() => validateField("photoUrl")} placeholder="https://..." />
                {fieldMessage("photoUrl")}
              </div>
              <div>
                <Label>Galeria de fotos por link</Label>
                <Textarea value={state.photosText} onChange={(e) => setField("photosText", e.target.value)} rows={6} placeholder={"Uma URL por linha\nhttps://...\nhttps://..."} />
                {fieldMessage("photos")}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Link externo</Label>
                  <Input value={state.externalUrl} onChange={(e) => setField("externalUrl", e.target.value)} onBlur={() => validateField("externalUrl")} placeholder="https://site-da-loja/veiculo" />
                </div>
                <div>
                  <Label>Vídeo por link</Label>
                  <Input value={state.videoUrl} onChange={(e) => setField("videoUrl", e.target.value)} onBlur={() => validateField("videoUrl")} placeholder="https://youtube.com/..." />
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

        <TabsContent value="resumo" className="mt-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resumo do veículo</h2>
              <p className="text-xs text-muted-foreground">Confira todos os dados antes de salvar ou copie para anúncio/WhatsApp.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void handleCopySummary()}>
              <Copy className="h-4 w-4" />
              Copiar resumo
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="overflow-hidden border-border/60 bg-card/80">
              <div className="relative aspect-[4/3] w-full bg-background/60">
                {summaryCoverImage ? (
                  <img src={summaryCoverImage} alt="Capa do veículo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-xs">Sem imagem de capa</span>
                  </div>
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-white/20 bg-black/50 text-white backdrop-blur">{state.status}</Badge>
                  <Badge variant="outline" className={state.isPublished ? "border-cyan-400/40 bg-black/50 text-cyan-200 backdrop-blur" : "border-amber-400/40 bg-black/50 text-amber-200 backdrop-blur"}>
                    {state.isPublished ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{summaryValue(state.version)}</p>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {state.brand || state.model ? `${state.brand} ${state.model}`.trim() : "Veículo sem nome"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[state.modelYear || state.year, state.km ? `${Number(state.km).toLocaleString("pt-BR")} km` : null, state.color]
                      .filter(Boolean).join(" · ") || "Sem detalhes"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Preço anunciado</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{formatBRL(state.price)}</p>
                  {Number(state.offerPrice || 0) > 0 ? (
                    <p className="mt-1 text-sm text-emerald-300">Oferta: {formatBRL(state.offerPrice)}</p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                    <span className="text-muted-foreground">Margem estimada</span>
                    <span className="font-semibold text-foreground">{estimatedMargin === null ? "—" : formatBRL(estimatedMargin)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                  <CompletenessRing value={checklist.completeness} size={56} />
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{checklist.completed}/{checklist.total} concluídos</p>
                    {checklist.readyForPublish ? (
                      <p className="flex items-center gap-1 text-xs text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Pronto para publicar</p>
                    ) : (
                      <p className="text-xs text-amber-300">Faltando: {checklist.missingItems.join(", ")}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{mediaSummary.images}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Imagens</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{mediaSummary.videos}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vídeos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <SummarySection title="Identificação" icon={Car}>
                <SummaryRow label="Título comercial" value={summaryValue(state.title)} full />
                <SummaryRow label="Marca" value={summaryValue(state.brand)} />
                <SummaryRow label="Modelo" value={summaryValue(state.model)} />
                <SummaryRow label="Versão" value={summaryValue(state.version)} />
                <SummaryRow label="Código interno" value={summaryValue(state.internalCode)} />
                <SummaryRow label="Placa" value={summaryValue(state.plate)} />
                <SummaryRow label="Chassi" value={summaryValue(state.chassis)} />
                <SummaryRow label="Renavam" value={summaryValue(state.renavam)} />
                <SummaryRow label="Cor" value={summaryValue(state.color)} />
                <SummaryRow label="Combustível" value={summaryValue(state.fuel)} />
                <SummaryRow label="Câmbio" value={summaryValue(state.transmission)} />
                <SummaryRow label="Motor" value={summaryValue(state.motor)} />
                <SummaryRow label="Carroceria" value={summaryValue(state.bodyType)} />
                <SummaryRow label="Categoria" value={summaryValue(state.category)} />
                <SummaryRow label="Estado do veículo" value={summaryValue(state.vehicleState)} />
                <SummaryRow label="Portas" value={summaryValue(state.doors)} />
                <SummaryRow label="Ano ref. / modelo" value={summaryValue([state.year, state.modelYear].filter(Boolean).join(" / "))} />
                <SummaryRow label="Ano fabricação" value={summaryValue(state.manufactureYear)} />
                <SummaryRow label="Quilometragem" value={state.km ? `${Number(state.km).toLocaleString("pt-BR")} km` : "—"} />
              </SummarySection>

              <SummarySection title="Comercial & Financeiro" icon={BadgeDollarSign}>
                <SummaryRow label="Preço principal" value={formatBRL(state.price)} />
                <SummaryRow label="Preço de oferta" value={formatBRL(state.offerPrice)} />
                <SummaryRow label="Preço FIPE" value={formatBRL(state.fipePrice)} />
                <SummaryRow label="Valor mínimo de venda" value={formatBRL(state.minimumSalePrice)} />
                <SummaryRow label="Preço de compra" value={formatBRL(state.purchasePrice)} />
                <SummaryRow label="Custo de preparação" value={formatBRL(state.preparationCost)} />
                <SummaryRow label="Custo documental" value={formatBRL(state.documentationCost)} />
                <SummaryRow label="Custo de transporte" value={formatBRL(state.transportCost)} />
                <SummaryRow label="Outros custos" value={formatBRL(state.otherCosts)} />
                <SummaryRow label="Margem estimada" value={estimatedMargin === null ? "—" : formatBRL(estimatedMargin)} />
                <SummaryRow label="Sinalizações" full value={
                  [state.isFeatured ? "Destaque" : null, state.acceptsTradeIn ? "Aceita troca" : null, state.isArmored ? "Blindado" : null]
                    .filter(Boolean).join(" · ") || "Nenhuma"
                } />
              </SummarySection>

              <SummarySection title="Mídia" icon={ImageIcon}>
                <SummaryRow label="Total de arquivos" value={`${mediaSummary.total} (${mediaSummary.images} imagens · ${mediaSummary.videos} vídeos)`} />
                <SummaryRow label="Uploads pendentes" value={mediaSummary.pending > 0 ? `${mediaSummary.pending} na fila` : "Nenhum"} />
                <SummaryRow label="Foto principal (link)" value={summaryValue(state.photoUrl)} full />
                <SummaryRow label="Vídeo (link)" value={summaryValue(state.videoUrl)} full />
                <SummaryRow label="Link externo" value={summaryValue(state.externalUrl)} full />
              </SummarySection>

              <SummarySection title="Operação & Observações" icon={ShieldCheck}>
                <SummaryRow label="Loja / unidade" value={summaryValue(state.storeLocation)} />
                <SummaryRow label="Data de entrada" value={state.entryDate ? new Date(`${state.entryDate}T12:00:00`).toLocaleDateString("pt-BR") : "—"} />
                <SummaryRow label="Tags internas" full value={summaryValue(splitLinesToList(state.tagsText).join(", "))} />
                <SummaryRow label="Descrição pública" full value={summaryValue(state.observation)} />
                <SummaryRow label="Observações internas" full value={summaryValue(state.internalNotes)} />
              </SummarySection>

              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  <ListChecks className="h-3.5 w-3.5 text-primary" />
                  Checklist de publicação
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {checklist.items.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      {item.passed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={item.passed ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/85 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex items-center gap-3">
          <CompletenessRing value={checklist.completeness} size={40} />
          <div className="text-sm leading-tight">
            <p className="font-medium text-foreground">{checklist.completed}/{checklist.total} concluídos</p>
            <p className={checklist.readyForPublish ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>
              {checklist.readyForPublish ? "Pronto para publicar" : `Faltam ${checklist.missingItems.length} itens`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={() => void submit()}
            disabled={isSubmitting || uploadMediaMutation.isPending || deleteMediaMutation.isPending || setPrimaryMediaMutation.isPending}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Cadastrar veículo" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
