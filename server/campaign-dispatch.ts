/**
 * Campaign Dispatch Service
 * Handles sending campaign messages with anti-ban protection
 * - Configurable interval between messages (default 45s)
 * - Max messages per day (default 80)
 * - Business hours only (default 8h-20h)
 * - Excludes post-sale customers
 * - Supports text, image, video, document
 */

import * as zapi from "./zapi-service";
import { sql } from "drizzle-orm";
import { withTenantAsync } from "./tenantDb";

interface CampaignConfig {
  campaignId: number;
  message: string;
  mediaUrl?: string | null;
  mediaType?: string | null; // 'image' | 'video' | 'document'
  mediaFileName?: string | null;
  intervalSec: number; // seconds between each message
  maxPerDay: number;
  startHour: number; // 0-23
  endHour: number; // 0-23
  tenantId: number; // ID da loja para usar credenciais Z-API corretas
}

interface Recipient {
  id: number; // crm_campaign_recipients.id
  phone: string;
  name?: string | null;
  leadId?: number | null;
}

// Track active dispatches to allow cancellation
const activeDispatches = new Map<number, { cancelled: boolean }>();

export function cancelDispatch(campaignId: number) {
  const state = activeDispatches.get(campaignId);
  if (state) state.cancelled = true;
}

export function isDispatching(campaignId: number): boolean {
  return activeDispatches.has(campaignId) && !activeDispatches.get(campaignId)!.cancelled;
}

/**
 * Check if we're within business hours
 */
function isWithinBusinessHours(startHour: number, endHour: number): boolean {
  const now = new Date();
  // Adjust for Brazil timezone (UTC-3)
  const brHour = (now.getUTCHours() - 3 + 24) % 24;
  return brHour >= startHour && brHour < endHour;
}

/**
 * Get today's sent count for anti-ban protection
 */
async function getTodaySentCount(dbConn: any): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const result = await dbConn.execute(
    sql`SELECT COUNT(*) as cnt FROM crm_campaign_recipients WHERE status = 'sent' AND sentAt >= ${todayStart.getTime()}`
  );
  const rawRows = result as any;
  const rows = Array.isArray(rawRows?.[0]) ? rawRows[0] : rawRows;
  return Number(rows?.[0]?.cnt || 0);
}

/**
 * Send a single message with media support
 */
async function sendCampaignMessage(
  phone: string,
  message: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
  mediaFileName?: string | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Send media first if present
    if (mediaUrl && mediaType) {
      switch (mediaType) {
        case 'image':
          const imgResult = await zapi.sendImage(phone, mediaUrl, message);
          return { success: imgResult.success, error: (imgResult as any).error };
        case 'video':
          const vidResult = await zapi.sendVideo(phone, mediaUrl, message);
          return { success: vidResult.success, error: (vidResult as any).error };
        case 'document':
          // Send document + text separately
          const docResult = await zapi.sendDocument(phone, mediaUrl, mediaFileName || 'arquivo');
          if (docResult.success && message) {
            await zapi.sendText(phone, message);
          }
          return { success: docResult.success, error: (docResult as any).error };
        default:
          // Fallback to text only
          return await zapi.sendText(phone, message);
      }
    }
    // Text only
    return await zapi.sendText(phone, message);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Replace template variables in message
 */
function replaceVariables(template: string, recipient: Recipient): string {
  let msg = template;
  msg = msg.replace(/\{nome\}/gi, recipient.name || 'Cliente');
  msg = msg.replace(/\{telefone\}/gi, recipient.phone || '');
  return msg;
}

/**
 * Main dispatch function - runs asynchronously with delays
 */
export async function startCampaignDispatch(
  config: CampaignConfig,
  recipients: Recipient[],
  dbConn: any,
  onProgress?: (sent: number, total: number, current: string, success: boolean) => void
): Promise<{ sent: number; failed: number; cancelled: boolean }> {
  // Wrap entire dispatch in tenant context so all Z-API calls use per-store credentials
  return withTenantAsync(config.tenantId, async () => {
  const state = { cancelled: false };
  activeDispatches.set(config.campaignId, state);

  let sent = 0;
  let failed = 0;

  try {
    // Update campaign status to 'sending'
    await dbConn.execute(
      sql`UPDATE crm_campaigns SET status = 'sending', startedAt = ${Date.now()}, totalRecipients = ${recipients.length} WHERE id = ${config.campaignId}`
    );

    for (let i = 0; i < recipients.length; i++) {
      // Check cancellation
      if (state.cancelled) {
        console.log(`[Campaign ${config.campaignId}] Cancelled after ${sent} sent, ${failed} failed`);
        break;
      }

      // Check business hours
      if (!isWithinBusinessHours(config.startHour, config.endHour)) {
        console.log(`[Campaign ${config.campaignId}] Outside business hours (${config.startHour}h-${config.endHour}h). Pausing...`);
        // Wait 5 minutes and check again
        await new Promise(r => setTimeout(r, 5 * 60 * 1000));
        i--; // Retry this recipient
        continue;
      }

      // Check daily limit
      const todayCount = await getTodaySentCount(dbConn);
      if (todayCount >= config.maxPerDay) {
        console.log(`[Campaign ${config.campaignId}] Daily limit reached (${config.maxPerDay}). Stopping.`);
        // Mark remaining as 'daily_limit'
        for (let j = i; j < recipients.length; j++) {
          await dbConn.execute(
            sql`UPDATE crm_campaign_recipients SET status = 'daily_limit' WHERE id = ${recipients[j].id}`
          );
        }
        break;
      }

      const recipient = recipients[i];
      const personalizedMsg = replaceVariables(config.message, recipient);

      try {
        const result = await sendCampaignMessage(
          recipient.phone,
          personalizedMsg,
          config.mediaUrl,
          config.mediaType,
          config.mediaFileName
        );

        if (result.success) {
          sent++;
          await dbConn.execute(
            sql`UPDATE crm_campaign_recipients SET status = 'sent', sentAt = ${Date.now()}, zapiMessageId = ${result.messageId || null} WHERE id = ${recipient.id}`
          );
          // Mark lead as campaign response target
          if (recipient.leadId) {
            await dbConn.execute(
              sql`UPDATE crm_leads SET lastCampaignId = ${config.campaignId}, isCampaignResponse = 0 WHERE id = ${recipient.leadId}`
            );
          }
        } else {
          failed++;
          await dbConn.execute(
            sql`UPDATE crm_campaign_recipients SET status = 'failed', errorMessage = ${result.error || 'Unknown error'} WHERE id = ${recipient.id}`
          );
        }

        // Update campaign counters
        await dbConn.execute(
          sql`UPDATE crm_campaigns SET totalSent = ${sent}, totalFailed = ${failed} WHERE id = ${config.campaignId}`
        );

        onProgress?.(sent, recipients.length, recipient.phone, result.success);
      } catch (err: any) {
        failed++;
        await dbConn.execute(
          sql`UPDATE crm_campaign_recipients SET status = 'failed', errorMessage = ${err.message} WHERE id = ${recipient.id}`
        );
      }

      // Anti-ban delay between messages (randomize ±20%)
      if (i < recipients.length - 1 && !state.cancelled) {
        const baseDelay = config.intervalSec * 1000;
        const jitter = baseDelay * 0.2;
        const delay = baseDelay + (Math.random() * jitter * 2 - jitter);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Update campaign status
    const finalStatus = state.cancelled ? 'cancelled' : 'sent';
    await dbConn.execute(
      sql`UPDATE crm_campaigns SET status = ${finalStatus}, completedAt = ${Date.now()}, totalSent = ${sent}, totalFailed = ${failed} WHERE id = ${config.campaignId}`
    );
  } finally {
    activeDispatches.delete(config.campaignId);
  }

  return { sent, failed, cancelled: state.cancelled };
  }); // end withTenantAsync
}
