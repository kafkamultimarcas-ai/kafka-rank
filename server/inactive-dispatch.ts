import { getDb } from "./db";
import * as crmDb from "./crmDb";
import * as zapi from "./zapi-service";
import { invokeLLM } from "./_core/llm";
import { sql } from "drizzle-orm";
import { crmMessages } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Run inactive dispatch: find leads that haven't responded in X hours
 * and send them a follow-up message via WhatsApp.
 * 
 * Rules:
 * - Only sends to leads with a phone number
 * - Only sends if the last message was outbound (we're waiting for them)
 * - Respects maxPerDay limit per lead
 * - Does NOT duplicate: checks dispatch log before sending
 * - Uses AI to generate personalized message OR uses custom template
 */
export async function runInactiveDispatch(): Promise<{ sent: number; skipped: number; errors: number }> {
  const result = { sent: 0, skipped: 0, errors: 0 };
  
  try {
    const database = await getDb();
    if (!database) return result;

    // 1. Get config
    const cfgResult = await database.execute(sql`SELECT * FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
    const cfgRows = cfgResult as any;
    if (!cfgRows || cfgRows.length === 0) return result;
    const cfg = cfgRows[0];

    if (!cfg.inactiveDispatchEnabled) {
      console.log("[Inactive Dispatch] Disabled, skipping.");
      return result;
    }

    // Check working hours if enabled
    if (cfg.workingHoursEnabled) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < (cfg.workingHoursStart ?? 8) || hour >= (cfg.workingHoursEnd ?? 20)) {
        console.log(`[Inactive Dispatch] Outside working hours (${cfg.workingHoursStart}-${cfg.workingHoursEnd}), current: ${hour}h`);
        return result;
      }
    }

    const inactiveHours = cfg.inactiveDispatchHours || 1;
    const maxPerDay = cfg.inactiveDispatchMaxPerDay || 1;
    const customMessage = cfg.inactiveDispatchMessage || '';
    const cutoffTime = Date.now() - (inactiveHours * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    // 2. Get all active leads with phone that have last contact before cutoff
    const leadsResult = await database.execute(sql`
      SELECT id, name, phone, vehicleInterest, score, sellerId, lastContactDate 
      FROM crm_leads 
      WHERE archived = 0 
        AND phone IS NOT NULL 
        AND phone != ''
        AND lastContactDate IS NOT NULL
        AND lastContactDate < ${cutoffTime}
        AND lastContactDate > ${cutoffTime - 72 * 60 * 60 * 1000}
    `);
    const leads = leadsResult as any[];
    if (!leads || leads.length === 0) {
      console.log("[Inactive Dispatch] No inactive leads found.");
      await database.execute(sql`UPDATE crm_ai_global_config SET inactiveDispatchLastRun = ${Date.now()} WHERE id = 1`);
      return result;
    }

    console.log(`[Inactive Dispatch] Found ${leads.length} inactive leads (>${inactiveHours}h).`);

    for (const lead of leads) {
      try {
        if (!lead.phone) { result.skipped++; continue; }

        // Check if last message was outbound (we already sent, waiting for reply)
        const lastMsgResult = await database.select().from(crmMessages)
          .where(eq(crmMessages.leadId, lead.id))
          .orderBy(desc(crmMessages.timestamp))
          .limit(1);
        
        if (lastMsgResult.length > 0 && lastMsgResult[0].direction === 'inbound') {
          // Last message was from client - they DID respond, we haven't replied
          // This is not "inactive client" - skip
          result.skipped++;
          continue;
        }

        // Check dispatch log: how many times we sent today for this lead
        const logResult = await database.execute(sql`
          SELECT COUNT(*) as cnt FROM crm_ai_inactive_dispatch_log 
          WHERE leadId = ${lead.id} AND sentAt >= ${todayStart.getTime()}
        `);
        const logRows = logResult as any;
        const todayCount = Number(logRows?.[0]?.cnt || 0);
        if (todayCount >= maxPerDay) {
          result.skipped++;
          continue;
        }

        // Also check if we already sent a dispatch in the last inactiveHours period
        const recentLogResult = await database.execute(sql`
          SELECT COUNT(*) as cnt FROM crm_ai_inactive_dispatch_log 
          WHERE leadId = ${lead.id} AND sentAt >= ${cutoffTime}
        `);
        const recentRows = recentLogResult as any;
        if (Number(recentRows?.[0]?.cnt || 0) > 0) {
          result.skipped++;
          continue;
        }

        // Generate or use custom message
        let messageToSend = '';
        const phone = lead.phone.replace(/\D/g, '');

        if (customMessage.trim()) {
          // Use custom template with placeholders
          messageToSend = customMessage
            .replace(/\{nome\}/gi, lead.name?.split(' ')[0] || 'amigo')
            .replace(/\{veiculo\}/gi, lead.vehicleInterest || 'veículo')
            .replace(/\{nome_completo\}/gi, lead.name || 'amigo');
        } else {
          // Use AI to generate personalized follow-up
          const personality = cfg.personality || 'amigavel';
          const personalityMap: Record<string, string> = {
            amigavel: 'Seja amigável, informal e simpático. Use 1 emoji no máximo.',
            profissional: 'Seja profissional e educado, mas direto. Sem emojis.',
            agressivo: 'Seja persuasivo e crie urgência. Foque em escassez e oportunidade.',
          };
          const personalityInstr = personalityMap[personality] || personalityMap.amigavel;

          try {
            const aiResp = await invokeLLM({
              messages: [
                {
                  role: 'system',
                  content: `Você é vendedor da Kafka Multimarcas. Gere uma mensagem de follow-up para um cliente que não responde há ${inactiveHours}+ horas.

REGRAS:
- MÁXIMO 2-3 linhas curtas (WhatsApp)
- ${personalityInstr}
- SEM formatação (sem negrito, asteriscos, markdown)
- Chame pelo primeiro nome
- NÃO seja insistente demais
- Pergunte se ainda tem interesse ou se pode ajudar
- Responda APENAS com o texto da mensagem`
                },
                {
                  role: 'user',
                  content: `Cliente: ${lead.name}\nInteresse: ${lead.vehicleInterest || 'veículo'}\nÚltimo contato: há ${inactiveHours}+ horas`
                }
              ],
            });
            messageToSend = ((aiResp.choices?.[0]?.message?.content as string) || '').trim();
          } catch (aiErr) {
            // Fallback message
            const firstName = lead.name?.split(' ')[0] || 'amigo';
            messageToSend = `Oi ${firstName}! Tudo bem? Vi que conversamos sobre ${lead.vehicleInterest || 'um veículo'} e queria saber se ainda tem interesse. Posso te ajudar com algo?`;
          }
        }

        if (!messageToSend) {
          result.skipped++;
          continue;
        }

        // Send via WhatsApp
        const sendResult = await zapi.sendText(phone, messageToSend);
        if (sendResult.success) {
          // Log the dispatch
          await database.execute(sql`
            INSERT INTO crm_ai_inactive_dispatch_log (leadId, sentAt, message) 
            VALUES (${lead.id}, ${Date.now()}, ${messageToSend})
          `);
          // Save as CRM message
          await crmDb.createMessage({
            leadId: lead.id,
            phone,
            direction: 'outbound',
            messageType: 'text',
            content: messageToSend,
            mediaUrl: null,
            senderName: 'IA Kafka (Reativação)',
            sentBy: null,
            zapiMessageId: null,
            timestamp: Date.now(),
          });
          // Update lastContactDate
          await crmDb.updateLead(lead.id, { lastContactDate: Date.now() });
          result.sent++;
          console.log(`[Inactive Dispatch] Sent to ${lead.name} (${phone}): ${messageToSend.substring(0, 50)}...`);
        } else {
          result.errors++;
          console.error(`[Inactive Dispatch] Failed to send to ${phone}: ${sendResult.error}`);
        }
      } catch (leadErr: any) {
        result.errors++;
        console.error(`[Inactive Dispatch] Error processing lead #${lead.id}:`, leadErr.message);
      }
    }

    // Update last run timestamp
    await database.execute(sql`UPDATE crm_ai_global_config SET inactiveDispatchLastRun = ${Date.now()} WHERE id = 1`);
    console.log(`[Inactive Dispatch] Complete: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`);
    return result;
  } catch (err: any) {
    console.error("[Inactive Dispatch] Fatal error:", err.message);
    return result;
  }
}
