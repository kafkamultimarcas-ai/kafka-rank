import { ENV } from "./_core/env";

const ZAPI_BASE = () => `${ENV.zapiApiUrl || "https://api.z-api.io"}/instances/${ENV.zapiInstanceId}/token/${ENV.zapiToken}`;

function headers() {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ENV.zapiClientToken) {
    h["Client-Token"] = ENV.zapiClientToken;
  }
  return h;
}

/** Check if the Z-API instance is connected */
export async function getStatus(): Promise<{ connected: boolean; smartphoneConnected: boolean; error?: string }> {
  try {
    const res = await fetch(`${ZAPI_BASE()}/status`, { headers: headers() });
    if (!res.ok) return { connected: false, smartphoneConnected: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { connected: data.connected === true, smartphoneConnected: data.smartphoneConnected === true };
  } catch (err: any) {
    return { connected: false, smartphoneConnected: false, error: err.message };
  }
}

/** Send a text message */
export async function sendText(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/send-text`, {
      method: "POST",
      headers: headers(),
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
export async function sendImage(phone: string, imageUrl: string, caption?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/send-image`, {
      method: "POST",
      headers: headers(),
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
export async function sendDocument(phone: string, documentUrl: string, fileName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/send-document/pdf`, {
      method: "POST",
      headers: headers(),
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
export async function sendAudio(phone: string, audioUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/send-audio`, {
      method: "POST",
      headers: headers(),
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
export async function sendVideo(phone: string, videoUrl: string, caption?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/send-video`, {
      method: "POST",
      headers: headers(),
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
export async function sendLink(phone: string, url: string, title: string, description?: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/send-link`, {
      method: "POST",
      headers: headers(),
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
export async function getContacts(maxPages = 20): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const res = await fetch(`${ZAPI_BASE()}/contacts?page=${page}&pageSize=100`, { headers: headers() });
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
export async function getChats(maxPages = 20): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const res = await fetch(`${ZAPI_BASE()}/chats?page=${page}&pageSize=100`, { headers: headers() });
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
  onProgress?: (sent: number, total: number, phone: string, success: boolean) => void
): Promise<{ sent: number; failed: number; errors: { phone: string; error: string }[] }> {
  const result = { sent: 0, failed: 0, errors: [] as { phone: string; error: string }[] };
  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];
    const res = await sendText(phone, message);
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
export async function getProfilePicture(phone: string): Promise<string | null> {
  try {
    const normalizedPhone = normalizePhone(phone);
    const res = await fetch(`${ZAPI_BASE()}/profile-picture/${normalizedPhone}`, { headers: headers() });
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
export async function setWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Z-API uses /update-webhook-received for incoming message webhooks
    const res = await fetch(`${ZAPI_BASE()}/update-webhook-received`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({
        value: webhookUrl,
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
