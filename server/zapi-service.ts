import { getDb } from "./db";
import { tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getCurrentTenantId } from "./tenantDb";
import { decryptSecret } from "./_core/secretCrypto";

// ===== TENANT-AWARE Z-API CREDENTIALS =====

interface ZapiCredentials {
  instanceId: string;
  token: string;
  clientToken: string;
  apiUrl: string;
}

// Cache tenant credentials for 5 minutes
const credentialsCache = new Map<number, { creds: ZapiCredentials; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get Z-API credentials for a specific tenant from the database.
 * SEMPRE usa as credenciais configuradas por loja (multi-tenant) na tela de Integrações.
 * NÃO usa mais variáveis de ambiente globais como fallback.
 *
 * Quando tenantId não é passado explicitamente, usa o tenant resolvido da request
 * atual (AsyncLocalStorage) — isso cobre automaticamente qualquer chamador que
 * rode dentro de um contexto tRPC ou de um webhook já tenantizado, sem precisar
 * que cada um dos pontos de chamada passe o tenantId manualmente.
 */
async function getTenantCredentials(tenantId?: number): Promise<ZapiCredentials> {
  const emptyCreds: ZapiCredentials = {
    instanceId: "",
    token: "",
    clientToken: "",
    apiUrl: "https://api.z-api.io",
  };

  const effectiveTenantId = tenantId ?? getCurrentTenantId();
  if (!effectiveTenantId) {
    console.warn("[Z-API] Nenhum tenantId resolvido — credenciais não disponíveis.");
    return emptyCreds;
  }

  // Check cache
  const cached = credentialsCache.get(effectiveTenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.creds;

  // Fetch from DB — cada loja tem suas próprias credenciais Z-API
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Z-API] DB indisponível — credenciais não disponíveis.");
      return emptyCreds;
    }
    const [tenant] = await db.select({
      zapiInstanceId: tenants.zapiInstanceId,
      zapiToken: tenants.zapiToken,
      zapiClientToken: tenants.zapiClientToken,
    }).from(tenants).where(eq(tenants.id, effectiveTenantId)).limit(1);

    if (tenant?.zapiInstanceId && tenant?.zapiToken) {
      // Handle case where instanceId might be stored as full URL
      let instanceId = tenant.zapiInstanceId;
      const urlMatch = instanceId.match(/instances\/([A-F0-9]+)/i);
      if (urlMatch) instanceId = urlMatch[1];

      const creds: ZapiCredentials = {
        instanceId,
        token: decryptSecret(tenant.zapiToken),
        clientToken: decryptSecret(tenant.zapiClientToken),
        apiUrl: "https://api.z-api.io",
      };
      credentialsCache.set(effectiveTenantId, { creds, expiresAt: Date.now() + CACHE_TTL });
      return creds;
    }

    console.warn(`[Z-API] Tenant ${effectiveTenantId} não tem credenciais Z-API configuradas.`);
    return emptyCreds;
  } catch (err) {
    console.warn("[Z-API] Falha ao buscar credenciais do tenant:", err);
    return emptyCreds;
  }
}

function makeBase(creds: ZapiCredentials): string {
  return `${creds.apiUrl}/instances/${creds.instanceId}/token/${creds.token}`;
}

function makeHeaders(creds: ZapiCredentials): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (creds.clientToken) h["Client-Token"] = creds.clientToken;
  return h;
}

// ===== BACKWARD-COMPATIBLE FUNCTIONS (use global credentials by default) =====
// All functions accept an optional tenantId parameter at the end

/** Check if the Z-API instance is connected */
export async function getStatus(tenantId?: number): Promise<{ connected: boolean; smartphoneConnected: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const res = await fetch(`${makeBase(creds)}/status`, { headers: makeHeaders(creds) });
    if (!res.ok) return { connected: false, smartphoneConnected: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { connected: data.connected === true, smartphoneConnected: data.smartphoneConnected === true };
  } catch (err: any) {
    return { connected: false, smartphoneConnected: false, error: err.message };
  }
}

/** Send a text message */
export async function sendText(phone: string, message: string, tenantId?: number): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/send-text`, {
      method: "POST",
      headers: makeHeaders(creds),
      body: JSON.stringify({ phone: normalizedPhone, message }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Send an image with optional caption */
export async function sendImage(phone: string, imageUrl: string, caption?: string, tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/send-image`, {
      method: "POST",
      headers: makeHeaders(creds),
      body: JSON.stringify({ phone: normalizedPhone, image: imageUrl, caption: caption || "" }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Send a document/file */
export async function sendDocument(phone: string, documentUrl: string, fileName: string, tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/send-document/pdf`, {
      method: "POST",
      headers: makeHeaders(creds),
      body: JSON.stringify({ phone: normalizedPhone, document: documentUrl, fileName }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Send an audio message */
export async function sendAudio(phone: string, audioUrl: string, tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/send-audio`, {
      method: "POST",
      headers: makeHeaders(creds),
      body: JSON.stringify({ phone: normalizedPhone, audio: audioUrl }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Send a video */
export async function sendVideo(phone: string, videoUrl: string, caption?: string, tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/send-video`, {
      method: "POST",
      headers: makeHeaders(creds),
      body: JSON.stringify({ phone: normalizedPhone, video: videoUrl, caption: caption || "" }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Send a link with preview */
export async function sendLink(phone: string, url: string, title: string, description?: string, imageUrl?: string, tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/send-link`, {
      method: "POST",
      headers: makeHeaders(creds),
      body: JSON.stringify({
        phone: normalizedPhone,
        message: title,
        image: imageUrl || "",
        linkUrl: url,
        title,
        linkDescription: description || "",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Get all contacts (paginated, fetches all pages) */
export async function getContacts(maxPages = 20, tenantId?: number): Promise<any[]> {
  const creds = await getTenantCredentials(tenantId);
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const res = await fetch(`${makeBase(creds)}/contacts?page=${page}&pageSize=100`, { headers: makeHeaders(creds) });
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < 100) break;
    } catch {
      break;
    }
  }
  return all;
}

/** Get all chats (paginated, fetches all pages) */
export async function getChats(maxPages = 20, tenantId?: number): Promise<any[]> {
  const creds = await getTenantCredentials(tenantId);
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const res = await fetch(`${makeBase(creds)}/chats?page=${page}&pageSize=100`, { headers: makeHeaders(creds) });
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < 100) break;
    } catch {
      break;
    }
  }
  return all;
}

/** Send text to multiple phones with rate limiting (1 msg per 2 seconds to avoid bans) */
export async function sendTextBulk(
  phones: string[],
  message: string,
  onProgress?: (sent: number, total: number, phone: string, success: boolean) => void,
  tenantId?: number
): Promise<{ sent: number; failed: number; errors: { phone: string; error: string }[] }> {
  const result = { sent: 0, failed: 0, errors: [] as { phone: string; error: string }[] };
  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];
    const res = await sendText(phone, message, tenantId);
    if (res.success) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push({ phone, error: res.error || "Unknown error" });
    }
    onProgress?.(i + 1, phones.length, phone, res.success);
    // Rate limit: wait 2 seconds between messages to avoid WhatsApp bans
    if (i < phones.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return result;
}

/** Get profile picture */
export async function getProfilePicture(phone: string, tenantId?: number): Promise<string | null> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${makeBase(creds)}/profile-picture/${normalizedPhone}`, { headers: makeHeaders(creds) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.link || null;
  } catch {
    return null;
  }
}

/** Normalize phone number to international format */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  if (!cleaned.startsWith("55")) cleaned = "55" + cleaned;
  return cleaned;
}

/** Configure webhook URL for receiving messages */
export async function setWebhook(webhookUrl: string, tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    // Z-API uses /update-webhook-received for incoming message webhooks
    const res = await fetch(`${makeBase(creds)}/update-webhook-received`, {
      method: "PUT",
      headers: makeHeaders(creds),
      body: JSON.stringify({
        value: webhookUrl,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    // Also enable notifySentByMe so we capture outbound messages sent from the phone
    await enableNotifySentByMe(tenantId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Enable receiving outbound messages (sent by the phone) through the webhook */
export async function enableNotifySentByMe(tenantId?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getTenantCredentials(tenantId);
    const res = await fetch(`${makeBase(creds)}/update-notify-sent-by-me`, {
      method: "PUT",
      headers: makeHeaders(creds),
      body: JSON.stringify({
        notifySentByMe: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log(`[Z-API] enableNotifySentByMe failed: HTTP ${res.status}: ${err}`);
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    console.log(`[Z-API] notifySentByMe enabled successfully`);
    return { success: true };
  } catch (err: any) {
    console.log(`[Z-API] enableNotifySentByMe error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/** Clear cached credentials for a tenant (call when tenant Z-API config changes) */
export function clearCredentialsCache(tenantId?: number): void {
  if (tenantId) {
    credentialsCache.delete(tenantId);
  } else {
    credentialsCache.clear();
  }
}
