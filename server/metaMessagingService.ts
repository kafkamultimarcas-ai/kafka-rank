import * as crmDb from "./crmDb";
import { getCurrentTenantId } from "./tenantDb";

// ===== TENANT-AWARE META (MESSENGER/INSTAGRAM) SEND API =====
// Reaproveita a MESMA integracao `crm_integrations` tipo "facebook" ja usada pelo
// Meta Lead Ads (mesmo App/Page) — o pageAccessToken configurado ali tambem autoriza
// o envio de mensagens via Send API, que e unificada para Messenger (PSID) e
// Instagram (IGSID) quando a Pagina e a conta Instagram Business estao linkadas.

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<number, CachedToken>();
const CACHE_TTL = 5 * 60 * 1000;

async function getPageAccessToken(): Promise<string | null> {
  const tenantId = getCurrentTenantId();
  const cached = tokenCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const integration = await crmDb.getIntegrationByType("facebook");
  if (!integration?.config) return null;
  try {
    const config = JSON.parse(integration.config);
    const token = config.pageAccessToken || null;
    if (token) {
      tokenCache.set(tenantId, { token, expiresAt: Date.now() + CACHE_TTL });
    }
    return token;
  } catch {
    return null;
  }
}

/** Send a text message to a Messenger PSID or Instagram IGSID */
export async function sendText(recipientId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getPageAccessToken();
    if (!token) {
      console.error(`[Meta Send API] No pageAccessToken found for tenant ${getCurrentTenantId()}`);
      return { success: false, error: "Page Access Token nao configurado" };
    }
    const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    });
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      console.error(`[Meta Send API] Error sending to ${recipientId}: ${data.error?.message || `HTTP ${res.status}`}`, data.error);
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    console.log(`[Meta Send API] Successfully sent message to ${recipientId}, messageId=${data.message_id}`);
    return { success: true, messageId: data.message_id };
  } catch (err: any) {
    console.error(`[Meta Send API] Exception sending to ${recipientId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send an image. A Send API da Meta nao aceita legenda embutida no anexo — se
 * `caption` for informado, ele e enviado como uma mensagem de texto separada logo
 * em seguida (mesmo efeito visual que o WhatsApp da via zapi.sendImage com caption).
 */
export async function sendImage(recipientId: string, imageUrl: string, caption?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getPageAccessToken();
    if (!token) return { success: false, error: "Page Access Token nao configurado" };
    const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { attachment: { type: "image", payload: { url: imageUrl, is_reusable: true } } },
        messaging_type: "RESPONSE",
      }),
    });
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    if (caption) {
      await sendText(recipientId, caption);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Responde um comentario de post/anuncio via Private Reply, abrindo uma DM com quem
 * comentou (Messenger e Instagram). Sujeito as regras da Meta: so funciona ate 7 dias
 * apos o comentario e uma unica vez por comentario.
 */
export async function sendPrivateReply(commentId: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getPageAccessToken();
    if (!token) return { success: false, error: "Page Access Token nao configurado" };
    const res = await fetch(`${GRAPH_API_BASE}/${commentId}/private_replies?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Clear cached page access token for a tenant (call when Meta config changes) */
export function clearTokenCache(tenantId?: number): void {
  if (tenantId) {
    tokenCache.delete(tenantId);
  } else {
    tokenCache.clear();
  }
}
