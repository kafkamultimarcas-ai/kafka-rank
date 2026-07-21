import { nanoid } from "nanoid";

export const inventoryMediaTypes = ["image", "video"] as const;
export const inventoryMediaSourceModes = ["upload", "external_url", "integration"] as const;
export const inventoryMediaStorageProviders = ["s3", "external"] as const;
export const inventoryMediaStatuses = ["active", "deleted", "processing"] as const;

export type InventoryMediaType = (typeof inventoryMediaTypes)[number];
export type InventoryMediaSourceMode = (typeof inventoryMediaSourceModes)[number];
export type InventoryMediaStorageProvider = (typeof inventoryMediaStorageProviders)[number];
export type InventoryMediaStatus = (typeof inventoryMediaStatuses)[number];

export type InventoryMediaRowLike = {
  id?: number;
  mediaType: InventoryMediaType;
  sourceMode: InventoryMediaSourceMode;
  storageProvider: InventoryMediaStorageProvider;
  url: string;
  storageKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  sortOrder?: number | null;
  isPrimary?: boolean | null;
  status?: InventoryMediaStatus | null;
};

export type LegacyInventoryMediaFields = {
  photoUrl: string | null;
  photos: string | null;
  videoUrl: string | null;
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
};

function normalizeUrl(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function dedupeUrls(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const url = normalizeUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    normalized.push(url);
  }
  return normalized;
}

function compareMediaOrder(a: InventoryMediaRowLike, b: InventoryMediaRowLike) {
  const orderA = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
}

export function inferInventoryMediaTypeFromMime(mimeType: string): InventoryMediaType | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (VIDEO_MIME_TYPES.has(mimeType)) return "video";
  return null;
}

export function isAllowedInventoryMediaMime(mimeType: string) {
  return inferInventoryMediaTypeFromMime(mimeType) !== null;
}

export function inferFileExtension(fileName: string | null | undefined, mimeType: string) {
  // Segurança: a extensão da key no bucket vem SEMPRE do mime já validado, nunca
  // do nome enviado pelo cliente (evita persistir .html/.php/.svg etc. num objeto
  // público). O nome só é usado como fallback sanitizado se o mime for desconhecido.
  const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();
  const fromMime = MIME_TO_EXTENSION[normalizedMime];
  if (fromMime) return fromMime;
  const sanitized = (fileName || "").trim();
  const fromName = sanitized.includes(".") ? sanitized.split(".").pop()?.toLowerCase() : undefined;
  const safeName = fromName?.replace(/[^a-z0-9]/g, "");
  return safeName || "bin";
}

export function sanitizeInventoryFileName(fileName: string) {
  const trimmed = fileName.trim();
  const withoutInvalidChars = trimmed.replace(/[^\w.\-\s\u00C0-\u024F]/g, "_");
  return withoutInvalidChars.length > 0 ? withoutInvalidChars : "arquivo";
}

export function buildInventoryMediaStorageKey(params: {
  tenantId: number;
  vehicleId: number;
  mediaType: InventoryMediaType;
  fileName?: string | null;
  mimeType: string;
}) {
  const ext = inferFileExtension(params.fileName, params.mimeType);
  const folder = params.mediaType === "video" ? "videos" : "images";
  return `inventory/${params.vehicleId}/${folder}/${nanoid(12)}.${ext}`;
}

export function buildLegacyInventoryMediaFields(mediaRows: InventoryMediaRowLike[]): LegacyInventoryMediaFields {
  const activeRows = mediaRows
    .filter((item) => item.status !== "deleted" && normalizeUrl(item.url))
    .sort(compareMediaOrder);

  const imageRows = activeRows.filter((item) => item.mediaType === "image");
  const primaryImage = imageRows.find((item) => item.isPrimary) || imageRows[0] || null;
  const remainingImages = imageRows.filter((item) => item !== primaryImage);
  const imageUrls = primaryImage
    ? dedupeUrls([primaryImage.url, ...remainingImages.map((item) => item.url)])
    : dedupeUrls(imageRows.map((item) => item.url));

  const videoRows = activeRows.filter((item) => item.mediaType === "video");
  const primaryVideo = videoRows.find((item) => item.isPrimary) || videoRows[0] || null;

  return {
    photoUrl: primaryImage ? primaryImage.url : null,
    photos: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
    videoUrl: primaryVideo ? primaryVideo.url : null,
  };
}

export function buildExternalInventoryMediaRows(params: {
  tenantId: number;
  vehicleId: number;
  actorId?: number | null;
  photoUrl?: string | null;
  photos?: string[] | null;
  videoUrl?: string | null;
}) {
  const imageUrls = dedupeUrls([params.photoUrl, ...(params.photos || [])]);
  const videoUrls = dedupeUrls([params.videoUrl]);
  const rows = [
    ...imageUrls.map((url, index) => ({
      tenantId: params.tenantId,
      inventoryVehicleId: params.vehicleId,
      mediaType: "image" as const,
      sourceMode: "external_url" as const,
      storageProvider: "external" as const,
      url,
      storageKey: null,
      fileName: null,
      mimeType: null,
      fileSizeBytes: null,
      width: null,
      height: null,
      durationSeconds: null,
      sortOrder: index,
      isPrimary: index === 0,
      status: "active" as const,
      createdBySellerId: params.actorId ?? null,
    })),
    ...videoUrls.map((url, index) => ({
      tenantId: params.tenantId,
      inventoryVehicleId: params.vehicleId,
      mediaType: "video" as const,
      sourceMode: "external_url" as const,
      storageProvider: "external" as const,
      url,
      storageKey: null,
      fileName: null,
      mimeType: null,
      fileSizeBytes: null,
      width: null,
      height: null,
      durationSeconds: null,
      sortOrder: 1000 + index,
      isPrimary: index === 0,
      status: "active" as const,
      createdBySellerId: params.actorId ?? null,
    })),
  ];
  return rows;
}
