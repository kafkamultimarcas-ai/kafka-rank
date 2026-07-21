import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";
import { getCurrentTenantId } from "./tenantDb";

type StorageConfig = { baseUrl: string; apiKey: string };
type S3DeleteConfig = { bucket: string; client: S3Client };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error("Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function getS3DeleteConfig(): S3DeleteConfig | null {
  if (!ENV.awsRegion || !ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.awsS3Bucket) {
    return null;
  }

  return {
    bucket: ENV.awsS3Bucket,
    client: new S3Client({
      region: ENV.awsRegion,
      endpoint: ENV.awsS3Endpoint || undefined,
      forcePathStyle: ENV.awsS3ForcePathStyle,
      credentials: {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey,
      },
    }),
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(baseUrl: string, relKey: string, apiKey: string): Promise<string> {
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string,
): FormData {
  const binaryData = typeof data === "string" ? data : new Uint8Array(data);
  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([binaryData], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function withTenantPrefix(relKey: string): string {
  return `t/${getCurrentTenantId()}/${normalizeKey(relKey)}`;
}

export function isStorageDeleteConfigured() {
  return getS3DeleteConfig() !== null;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = withTenantPrefix(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status} ${response.statusText}): ${message}`);
  }

  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

/**
 * Remove um objeto do bucket. ATENÇÃO à consistência de infra: o upload
 * (`storagePut`) vai pelo proxy Forge (BUILT_IN_FORGE_API_URL) e guarda a key
 * `t/<tenant>/...`; este delete usa o AWS SDK direto no AWS_S3_BUCKET com essa
 * MESMA key. Para não gerar objetos órfãos, o proxy Forge PRECISA gravar no
 * mesmo bucket (AWS_S3_BUCKET) e com o mesmo prefixo de key. Se apontarem para
 * buckets diferentes, o delete "sucede" na API mas não remove o arquivo real.
 */
export async function storageDelete(relKey: string): Promise<{ key: string; deleted: boolean }> {
  const config = getS3DeleteConfig();
  const key = normalizeKey(relKey);

  if (!config) {
    throw new Error("Storage delete requires AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET.");
  }

  await config.client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));

  return { key, deleted: true };
}
