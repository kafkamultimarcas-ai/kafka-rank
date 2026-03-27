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

/** Get all contacts */
export async function getContacts(): Promise<any[]> {
  try {
    const res = await fetch(`${ZAPI_BASE()}/contacts`, { headers: headers() });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
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
