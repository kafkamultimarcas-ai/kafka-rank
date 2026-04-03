/**
 * AI Attendant Service - Kafka Multimarcas
 * 
 * Handles automated customer conversations with humanized AI:
 * - Collects customer data (name, CPF, phone, income, etc.)
 * - Identifies vehicle interest and checks inventory
 * - Schedules appointments automatically
 * - Submits credit applications to F&I queue
 * - Distributes leads to sellers with alerts
 * - Promotes in-store visits with tank-full incentive
 */

import { invokeLLM } from "./_core/llm";
import * as crmDb from "./crmDb";
import * as zapi from "./zapi-service";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { inventoryVehicles } from "../drizzle/schema";
import { like, or, and, eq } from "drizzle-orm";

// ===== TYPES =====
interface AttendantConfig {
  attendantEnabled: boolean;
  attendantMode: string; // 'always' | 'off_hours' | 'holidays'
  attendantPrompt: string | null;
  attendantSchedule: string | null; // JSON with business hours
  attendantCollectData: boolean;
  attendantAutoSchedule: boolean;
  attendantAutoFicha: boolean;
  attendantAutoDistribute: boolean;
  attendantTankPromo: boolean;
  attendantMaxMessages: number;
  personality: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  workingHoursEnabled: boolean;
  aiMode: string;
  feiraoConfig: string | null;
}

interface CollectedData {
  customerName?: string;
  customerCpf?: string;
  customerRg?: string;
  customerBirthDate?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerIncome?: number;
  customerEmployer?: string;
  customerEmploymentTime?: string;
  vehicleInterest?: string;
  downPayment?: number;
  tradeInVehicle?: string;
  tradeInPlate?: string;
  tradeInKm?: number;
  financingTerm?: number;
  wantsSimulation?: boolean;
  wantsFicha?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  conversationStage?: string; // greeting, qualifying, collecting_data, scheduling, ficha, closing
}

// ===== CONFIGURATION =====
export async function getAttendantConfig(): Promise<AttendantConfig | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;
  try {
    const result = await dbConn.execute(sql`SELECT * FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
    const rawRows = result as any;
    const rows = Array.isArray(rawRows?.[0]) ? rawRows[0] : rawRows;
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        attendantEnabled: !!r.attendantEnabled,
        attendantMode: r.attendantMode || 'off_hours',
        attendantPrompt: r.attendantPrompt || null,
        attendantSchedule: r.attendantSchedule || null,
        attendantCollectData: r.attendantCollectData !== undefined ? !!r.attendantCollectData : true,
        attendantAutoSchedule: r.attendantAutoSchedule !== undefined ? !!r.attendantAutoSchedule : true,
        attendantAutoFicha: r.attendantAutoFicha !== undefined ? !!r.attendantAutoFicha : true,
        attendantAutoDistribute: r.attendantAutoDistribute !== undefined ? !!r.attendantAutoDistribute : true,
        attendantTankPromo: r.attendantTankPromo !== undefined ? !!r.attendantTankPromo : true,
        attendantMaxMessages: r.attendantMaxMessages || 30,
        personality: r.personality || 'amigavel',
        workingHoursStart: r.workingHoursStart ?? 8,
        workingHoursEnd: r.workingHoursEnd ?? 20,
        workingHoursEnabled: !!r.workingHoursEnabled,
        aiMode: r.aiMode || 'normal',
        feiraoConfig: r.feiraoConfig || null,
      };
    }
    return null;
  } catch (e) {
    console.error("[AI Attendant] Error loading config:", e);
    return null;
  }
}

// ===== CHECK IF ATTENDANT SHOULD BE ACTIVE =====
export function isAttendantActive(config: AttendantConfig): boolean {
  if (!config.attendantEnabled) return false;

  const now = new Date();
  // Adjust to Brasilia time (UTC-3)
  const brasiliaOffset = -3;
  const utcHours = now.getUTCHours();
  const brasiliaHour = (utcHours + brasiliaOffset + 24) % 24;
  const brasiliaDay = now.getUTCDay(); // 0=Sunday

  if (config.attendantMode === 'always') return true;

  if (config.attendantMode === 'off_hours') {
    // Active outside business hours
    const isBusinessHours = brasiliaHour >= config.workingHoursStart && brasiliaHour < config.workingHoursEnd;
    const isWeekday = brasiliaDay >= 1 && brasiliaDay <= 6; // Mon-Sat
    if (isBusinessHours && isWeekday) return false; // Business hours, human handles
    return true; // Off hours, AI handles
  }

  if (config.attendantMode === 'holidays') {
    // Check custom schedule
    if (config.attendantSchedule) {
      try {
        const schedule = JSON.parse(config.attendantSchedule);
        // Check if today is a holiday or special date
        const todayStr = now.toISOString().split('T')[0];
        if (schedule.holidays?.includes(todayStr)) return true;
        if (schedule.alwaysOn) return true;
      } catch { /* ignore */ }
    }
    return false;
  }

  return false;
}

// ===== GET COLLECTED DATA FROM LEAD =====
async function getCollectedData(leadId: number): Promise<CollectedData> {
  const dbConn = await getDb();
  if (!dbConn) return {};
  try {
    const result = await dbConn.execute(sql`SELECT aiDataCollected FROM crm_leads WHERE id = ${leadId} LIMIT 1`);
    const rawRows = result as any;
    const rows = Array.isArray(rawRows?.[0]) ? rawRows[0] : rawRows;
    if (rows?.[0]?.aiDataCollected) {
      return JSON.parse(rows[0].aiDataCollected);
    }
  } catch { /* ignore */ }
  return {};
}

// ===== SAVE COLLECTED DATA =====
async function saveCollectedData(leadId: number, data: CollectedData): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  try {
    await dbConn.execute(sql`UPDATE crm_leads SET aiDataCollected = ${JSON.stringify(data)}, aiHandled = 1 WHERE id = ${leadId}`);
  } catch (e) {
    console.error("[AI Attendant] Error saving collected data:", e);
  }
}

// ===== CREATE CREDIT APPLICATION =====
export async function createCreditApplication(leadId: number, data: CollectedData): Promise<number | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;
  try {
    const result = await dbConn.execute(sql`INSERT INTO credit_applications 
      (leadId, customerName, customerCpf, customerRg, customerBirthDate, customerPhone, customerEmail, customerAddress, customerIncome, customerEmployer, customerEmploymentTime, vehicleInterest, downPayment, tradeInVehicle, tradeInPlate, tradeInKm, financingTerm, aiCollected, aiCollectedAt, updatedAt)
      VALUES (${leadId}, ${data.customerName || null}, ${data.customerCpf || null}, ${data.customerRg || null}, ${data.customerBirthDate || null}, ${data.customerPhone || null}, ${data.customerEmail || null}, ${data.customerAddress || null}, ${data.customerIncome || 0}, ${data.customerEmployer || null}, ${data.customerEmploymentTime || null}, ${data.vehicleInterest || null}, ${data.downPayment || 0}, ${data.tradeInVehicle || null}, ${data.tradeInPlate || null}, ${data.tradeInKm || 0}, ${data.financingTerm || 48}, 1, ${Date.now()}, ${Date.now()})`);
    const insertResult = result as any;
    const insertId = insertResult?.[0]?.insertId || insertResult?.insertId;
    if (insertId) {
      await dbConn.execute(sql`UPDATE crm_leads SET aiCreditAppId = ${insertId} WHERE id = ${leadId}`);
      console.log(`[AI Attendant] Credit application #${insertId} created for lead #${leadId}`);
    }
    return insertId || null;
  } catch (e) {
    console.error("[AI Attendant] Error creating credit application:", e);
    return null;
  }
}

// ===== CREATE AI APPOINTMENT =====
export async function createAiAppointment(leadId: number, data: CollectedData): Promise<number | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;
  try {
    // Parse scheduled date
    let scheduledTimestamp = Date.now() + 86400000; // default: tomorrow
    if (data.scheduledDate) {
      try {
        const parts = data.scheduledDate.split('/');
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${data.scheduledTime || '10:00'}:00-03:00`);
          if (!isNaN(d.getTime())) scheduledTimestamp = d.getTime();
        } else {
          const d = new Date(data.scheduledDate);
          if (!isNaN(d.getTime())) scheduledTimestamp = d.getTime();
        }
      } catch { /* use default */ }
    }

    const result = await dbConn.execute(sql`INSERT INTO ai_appointments 
      (leadId, customerName, customerPhone, scheduledDate, scheduledTime, vehicleInterest, purpose, status, aiCreated, notes)
      VALUES (${leadId}, ${data.customerName || null}, ${data.customerPhone || null}, ${scheduledTimestamp}, ${data.scheduledTime || '10:00'}, ${data.vehicleInterest || null}, 'visita', 'pending', 1, ${'Agendamento feito pela IA Atendente'})`);
    const insertResult = result as any;
    const insertId = insertResult?.[0]?.insertId || insertResult?.insertId;
    if (insertId) {
      await dbConn.execute(sql`UPDATE crm_leads SET aiAppointmentId = ${insertId} WHERE id = ${leadId}`);
      console.log(`[AI Attendant] Appointment #${insertId} created for lead #${leadId} at ${data.scheduledDate} ${data.scheduledTime}`);
    }
    return insertId || null;
  } catch (e) {
    console.error("[AI Attendant] Error creating appointment:", e);
    return null;
  }
}

// ===== DISTRIBUTE LEAD TO SELLER =====
async function distributeLeadToSeller(leadId: number): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  try {
    // Find the seller with fewest active leads (round-robin)
    const sellersRes = await dbConn.execute(sql`SELECT s.id, s.name, COUNT(l.id) as leadCount 
      FROM sellers s 
      LEFT JOIN crm_leads l ON l.sellerId = s.id AND l.archived = 0 
      WHERE s.active = 1 AND (s.department = 'vendas' OR s.department IS NULL) 
      AND (s.leadReceiveBlocked IS NULL OR s.leadReceiveBlocked = 0)
      AND (s.leadBanUntil IS NULL OR s.leadBanUntil < ${Date.now()})
      GROUP BY s.id, s.name 
      ORDER BY leadCount ASC 
      LIMIT 1`);
    const rawRows = sellersRes as any;
    const rows = Array.isArray(rawRows?.[0]) ? rawRows[0] : rawRows;
    if (rows?.[0]?.id) {
      await dbConn.execute(sql`UPDATE crm_leads SET sellerId = ${rows[0].id} WHERE id = ${leadId}`);
      console.log(`[AI Attendant] Lead #${leadId} distributed to seller #${rows[0].id} (${rows[0].name})`);
    }
  } catch (e) {
    console.error("[AI Attendant] Error distributing lead:", e);
  }
}

// ===== BUILD SYSTEM PROMPT =====
function buildAttendantPrompt(config: AttendantConfig, lead: any, collectedData: CollectedData, vehicleContext: string, chatHistory: string): string {
  const firstName = (lead.name || '').split(' ')[0] || 'amigo';
  
  const personalityMap: Record<string, string> = {
    amigavel: 'Seja amigável, simpático e informal. Use linguagem natural como se fosse um amigo ajudando.',
    profissional: 'Seja profissional, educado e direto ao ponto. Transmita confiança e competência.',
    agressivo: 'Seja persuasivo e crie urgência. Foque em escassez, oportunidade única e benefícios exclusivos.',
  };

  // Determine what data is still missing
  const missingData: string[] = [];
  if (!collectedData.customerName) missingData.push('nome completo');
  if (!collectedData.customerPhone) missingData.push('telefone');
  
  // For ficha/simulation
  const fichaFields: string[] = [];
  if (collectedData.wantsFicha || collectedData.wantsSimulation) {
    if (!collectedData.customerCpf) fichaFields.push('CPF');
    if (!collectedData.customerBirthDate) fichaFields.push('data de nascimento');
    if (!collectedData.customerIncome) fichaFields.push('renda mensal');
    if (!collectedData.customerEmployer) fichaFields.push('onde trabalha');
    if (!collectedData.downPayment) fichaFields.push('valor de entrada');
    if (!collectedData.vehicleInterest) fichaFields.push('veículo de interesse');
  }

  // Feirão context
  let feiraoCtx = '';
  if (config.aiMode === 'feirao' && config.feiraoConfig) {
    try {
      const fc = JSON.parse(config.feiraoConfig);
      feiraoCtx = `\n\n=== MODO FEIRÃO ATIVO ===\n`;
      if (fc.beneficios) feiraoCtx += `Benefícios: ${fc.beneficios}\n`;
      if (fc.promocoes) feiraoCtx += `Promoções: ${fc.promocoes}\n`;
      if (fc.objetivo) feiraoCtx += `Objetivo: ${fc.objetivo}\n`;
      if (fc.instrucoes) feiraoCtx += `Instruções: ${fc.instrucoes}\n`;
    } catch { /* ignore */ }
  }

  // Tank promo
  const tankPromo = config.attendantTankPromo 
    ? '\n- PROMOÇÃO ESPECIAL: Se o cliente agendar uma visita e fechar negócio, GANHA UM TANQUE CHEIO! Mencione isso naturalmente quando for oportuno.'
    : '';

  // Custom prompt
  const customInstr = config.attendantPrompt ? `\n\nINSTRUÇÕES ADICIONAIS DO GERENTE:\n${config.attendantPrompt}` : '';

  // Stage-specific instructions
  let stageInstr = '';
  const stage = collectedData.conversationStage || 'greeting';
  
  if (stage === 'greeting' || stage === 'qualifying') {
    stageInstr = `
ETAPA ATUAL: Qualificação inicial
- Descubra o que o cliente procura (tipo de veículo, faixa de preço)
- Pergunte se tem veículo na troca
- Seja natural, não faça todas as perguntas de uma vez`;
  } else if (stage === 'collecting_data') {
    stageInstr = `
ETAPA ATUAL: Coleta de dados para ficha de crédito
- O cliente quer fazer ficha/simulação de financiamento
- Colete os dados que faltam de forma natural, UM POR VEZ
- Dados faltando: ${fichaFields.join(', ') || 'nenhum - dados completos!'}
- Quando tiver todos os dados, informe que a ficha foi enviada para análise`;
  } else if (stage === 'scheduling') {
    stageInstr = `
ETAPA ATUAL: Agendamento de visita
- Sugira horários disponíveis (seg-sáb, 8h-18h)
- Confirme data e horário com o cliente
- Mencione o benefício do tanque cheio (se aplicável)`;
  } else if (stage === 'ficha') {
    stageInstr = `
ETAPA ATUAL: Ficha enviada para análise
- Informe que a ficha está em análise pela equipe F&I
- Sugira agendar uma visita enquanto aguarda
- Mantenha o cliente engajado`;
  }

  return `Você é a assistente virtual da KAFKA Multimarcas, uma loja de veículos multimarcas.
Você está atendendo pelo WhatsApp de forma HUMANIZADA - o cliente NÃO deve perceber que é uma IA.

PERSONALIDADE: ${personalityMap[config.personality] || personalityMap.amigavel}

REGRAS FUNDAMENTAIS:
- Responda SEMPRE em português brasileiro natural
- Máximo 2-3 frases por mensagem (como uma pessoa real no WhatsApp)
- NÃO use formatação markdown, asteriscos ou negrito
- Use no máximo 1 emoji por mensagem
- NUNCA invente preços, dados ou informações que não tem
- Seja conversacional, pergunte UMA coisa por vez
- SEMPRE tente direcionar para agendamento presencial na loja
- A melhor proposta SEMPRE é na loja presencialmente
- Se o cliente perguntar preço, diga que o melhor valor é presencialmente${tankPromo}

SOBRE A LOJA:
- Nome: KAFKA Multimarcas
- Segmento: Venda de veículos seminovos e usados multimarcas
- Oferece: Financiamento, troca, consignação
- Horário: Segunda a Sábado, 8h às 18h

DADOS JÁ COLETADOS DO CLIENTE:
- Nome: ${collectedData.customerName || firstName || 'não informado'}
- Telefone: ${collectedData.customerPhone || lead.phone || 'não informado'}
- CPF: ${collectedData.customerCpf || 'não informado'}
- Veículo de interesse: ${collectedData.vehicleInterest || lead.vehicleInterest || 'não informado'}
- Entrada: ${collectedData.downPayment ? 'R$ ' + collectedData.downPayment.toLocaleString('pt-BR') : 'não informado'}
- Veículo na troca: ${collectedData.tradeInVehicle || 'não informado'}
- Renda: ${collectedData.customerIncome ? 'R$ ' + collectedData.customerIncome.toLocaleString('pt-BR') : 'não informado'}
${stageInstr}
${vehicleContext}
${feiraoCtx}
${customInstr}

OBJETIVO PRINCIPAL: Converter o lead em visita presencial na loja. Colete informações naturalmente durante a conversa.

IMPORTANTE - RESPONDA COM JSON:
Você DEVE responder SEMPRE no formato JSON abaixo. O campo "message" é a resposta para o cliente. Os outros campos são dados extraídos da conversa.

{
  "message": "sua resposta aqui",
  "extracted": {
    "customerName": null,
    "customerCpf": null,
    "customerBirthDate": null,
    "customerIncome": null,
    "customerEmployer": null,
    "customerEmploymentTime": null,
    "customerEmail": null,
    "customerAddress": null,
    "vehicleInterest": null,
    "downPayment": null,
    "tradeInVehicle": null,
    "tradeInPlate": null,
    "tradeInKm": null,
    "wantsSimulation": false,
    "wantsFicha": false,
    "scheduledDate": null,
    "scheduledTime": null
  },
  "nextStage": "${stage}"
}

Preencha os campos "extracted" APENAS quando o cliente fornecer a informação na mensagem atual. Use null para dados não fornecidos.
O "nextStage" deve ser: "greeting", "qualifying", "collecting_data", "scheduling", "ficha" ou "closing".

HISTÓRICO DA CONVERSA:
${chatHistory}`;
}

// ===== MAIN HANDLER =====
export async function handleAttendantMessage(
  leadId: number,
  incomingMessage: string,
  phone: string
): Promise<{ sent: boolean; message?: string; action?: string }> {
  try {
    const config = await getAttendantConfig();
    if (!config || !config.attendantEnabled) {
      return { sent: false };
    }

    // Check if attendant should be active based on mode/hours
    if (!isAttendantActive(config)) {
      return { sent: false };
    }

    const dbConn = await getDb();
    if (!dbConn) return { sent: false };

    // Get lead info
    const lead = await crmDb.getLeadById(leadId);
    if (!lead) return { sent: false };

    // Check message count limit
    const msgCountResult = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM crm_messages WHERE leadId = ${leadId} AND direction = 'outbound' AND senderName = 'IA Kafka'`);
    const msgRaw = msgCountResult as any;
    const msgRows = Array.isArray(msgRaw?.[0]) ? msgRaw[0] : msgRaw;
    const aiMsgCount = Number(msgRows?.[0]?.cnt || 0);
    if (aiMsgCount >= config.attendantMaxMessages) {
      console.log(`[AI Attendant] Lead #${leadId} reached max AI messages (${config.attendantMaxMessages}), skipping`);
      return { sent: false };
    }

    // Get previously collected data
    const collectedData = await getCollectedData(leadId);

    // Get vehicle context from inventory
    let vehicleContext = "";
    const vehicleSearch = collectedData.vehicleInterest || lead.vehicleInterest;
    if (vehicleSearch) {
      const search = `%${vehicleSearch}%`;
      const vehicles = await dbConn.select().from(inventoryVehicles)
        .where(and(
          eq(inventoryVehicles.status, "available"),
          or(like(inventoryVehicles.model, search), like(inventoryVehicles.brand, search))
        )).limit(5);
      if (vehicles.length > 0) {
        vehicleContext = "\nVEÍCULOS DISPONÍVEIS NO ESTOQUE:\n" + vehicles.map(v =>
          `- ${v.brand} ${v.model} ${v.year || ""} | R$ ${v.price?.toLocaleString("pt-BR") || "consultar"} | ${v.km?.toLocaleString("pt-BR") || "0"} km | ${v.color || ""}`
        ).join("\n");
      }
    }

    // Get chat history
    const recentMsgs = await crmDb.listMessagesByLead(leadId, 20);
    const chatHistory = recentMsgs.slice(-15).map(m => {
      const role = m.direction === "inbound" ? "CLIENTE" : "ATENDENTE";
      return `${role}: ${m.content || "[Mídia]"}`;
    }).join("\n");

    // Build prompt
    const systemPrompt = buildAttendantPrompt(config, lead, collectedData, vehicleContext, chatHistory);

    // Call LLM
    const aiResp = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `O cliente acabou de enviar: "${incomingMessage}"\n\nResponda no formato JSON especificado.` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "attendant_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Resposta para o cliente" },
              extracted: {
                type: "object",
                properties: {
                  customerName: { type: ["string", "null"] },
                  customerCpf: { type: ["string", "null"] },
                  customerBirthDate: { type: ["string", "null"] },
                  customerIncome: { type: ["number", "null"] },
                  customerEmployer: { type: ["string", "null"] },
                  customerEmploymentTime: { type: ["string", "null"] },
                  customerEmail: { type: ["string", "null"] },
                  customerAddress: { type: ["string", "null"] },
                  vehicleInterest: { type: ["string", "null"] },
                  downPayment: { type: ["number", "null"] },
                  tradeInVehicle: { type: ["string", "null"] },
                  tradeInPlate: { type: ["string", "null"] },
                  tradeInKm: { type: ["number", "null"] },
                  wantsSimulation: { type: "boolean" },
                  wantsFicha: { type: "boolean" },
                  scheduledDate: { type: ["string", "null"] },
                  scheduledTime: { type: ["string", "null"] },
                },
                required: ["customerName", "customerCpf", "customerBirthDate", "customerIncome", "customerEmployer", "customerEmploymentTime", "customerEmail", "customerAddress", "vehicleInterest", "downPayment", "tradeInVehicle", "tradeInPlate", "tradeInKm", "wantsSimulation", "wantsFicha", "scheduledDate", "scheduledTime"],
                additionalProperties: false,
              },
              nextStage: { type: "string", description: "Next conversation stage" },
            },
            required: ["message", "extracted", "nextStage"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = aiResp.choices?.[0]?.message?.content as string;
    if (!rawContent) return { sent: false };

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // If JSON parsing fails, try to extract message from raw text
      console.error("[AI Attendant] Failed to parse JSON response, using raw text");
      parsed = { message: rawContent.replace(/[{}"\n]/g, '').trim(), extracted: {}, nextStage: 'qualifying' };
    }

    const responseText = (parsed.message || '').trim();
    if (!responseText) return { sent: false };

    // Merge extracted data with existing collected data
    const extracted = parsed.extracted || {};
    const updatedData: CollectedData = { ...collectedData };
    
    if (extracted.customerName) updatedData.customerName = extracted.customerName;
    if (extracted.customerCpf) updatedData.customerCpf = extracted.customerCpf;
    if (extracted.customerBirthDate) updatedData.customerBirthDate = extracted.customerBirthDate;
    if (extracted.customerIncome) updatedData.customerIncome = extracted.customerIncome;
    if (extracted.customerEmployer) updatedData.customerEmployer = extracted.customerEmployer;
    if (extracted.customerEmploymentTime) updatedData.customerEmploymentTime = extracted.customerEmploymentTime;
    if (extracted.customerEmail) updatedData.customerEmail = extracted.customerEmail;
    if (extracted.customerAddress) updatedData.customerAddress = extracted.customerAddress;
    if (extracted.vehicleInterest) updatedData.vehicleInterest = extracted.vehicleInterest;
    if (extracted.downPayment) updatedData.downPayment = extracted.downPayment;
    if (extracted.tradeInVehicle) updatedData.tradeInVehicle = extracted.tradeInVehicle;
    if (extracted.tradeInPlate) updatedData.tradeInPlate = extracted.tradeInPlate;
    if (extracted.tradeInKm) updatedData.tradeInKm = extracted.tradeInKm;
    if (extracted.wantsSimulation) updatedData.wantsSimulation = true;
    if (extracted.wantsFicha) updatedData.wantsFicha = true;
    if (extracted.scheduledDate) updatedData.scheduledDate = extracted.scheduledDate;
    if (extracted.scheduledTime) updatedData.scheduledTime = extracted.scheduledTime;
    updatedData.conversationStage = parsed.nextStage || 'qualifying';
    if (extracted.customerPhone) updatedData.customerPhone = extracted.customerPhone;
    if (!updatedData.customerPhone && phone) updatedData.customerPhone = phone;

    // Save collected data
    await saveCollectedData(leadId, updatedData);

    // Update lead vehicle interest if extracted
    if (extracted.vehicleInterest && !lead.vehicleInterest) {
      await crmDb.updateLead(leadId, { vehicleInterest: extracted.vehicleInterest });
    }

    // Update lead name if extracted
    if (extracted.customerName && (lead.name === 'Novo Lead' || lead.name === phone || !lead.name)) {
      await crmDb.updateLead(leadId, { name: extracted.customerName });
    }

    // ===== ACTIONS =====
    let action = '';

    // 1. Create credit application if client wants ficha and we have enough data
    if ((extracted.wantsFicha || updatedData.wantsFicha) && config.attendantAutoFicha) {
      if (updatedData.customerCpf && updatedData.customerName) {
        const appId = await createCreditApplication(leadId, updatedData);
        if (appId) {
          action = 'ficha_created';
          console.log(`[AI Attendant] Credit application created for lead #${leadId}`);
        }
      }
    }

    // 2. Create appointment if scheduled
    if (extracted.scheduledDate && config.attendantAutoSchedule) {
      const aptId = await createAiAppointment(leadId, updatedData);
      if (aptId) {
        action = action ? action + ',appointment_created' : 'appointment_created';
        console.log(`[AI Attendant] Appointment created for lead #${leadId}`);
      }
    }

    // 3. Distribute to seller if enough data collected and not yet assigned
    if (config.attendantAutoDistribute && lead.sellerId === 0) {
      const hasBasicData = updatedData.customerName && (updatedData.vehicleInterest || lead.vehicleInterest);
      if (hasBasicData) {
        // Find seller with fewest leads using round-robin
        try {
          const sellersResult = await dbConn.execute(sql`SELECT s.id, s.name, COUNT(l.id) as leadCount 
            FROM sellers s 
            LEFT JOIN crm_leads l ON l.sellerId = s.id AND l.archived = 0 
            WHERE s.active = 1 AND (s.department = 'vendas' OR s.department IS NULL) 
            AND (s.leadReceiveBlocked IS NULL OR s.leadReceiveBlocked = 0)
            AND (s.leadBanUntil IS NULL OR s.leadBanUntil < ${Date.now()})
            GROUP BY s.id, s.name 
            ORDER BY leadCount ASC 
            LIMIT 1`);
          const sellerRaw = sellersResult as any;
          const sellerRows = Array.isArray(sellerRaw?.[0]) ? sellerRaw[0] : sellerRaw;
          if (sellerRows?.[0]?.id) {
            await dbConn.execute(sql`UPDATE crm_leads SET sellerId = ${sellerRows[0].id} WHERE id = ${leadId}`);
            action = action ? action + ',distributed' : 'distributed';
            console.log(`[AI Attendant] Lead #${leadId} distributed to seller ${sellerRows[0].name}`);
          }
        } catch (e) {
          console.error("[AI Attendant] Error distributing:", e);
        }
      }
    }

    // Send the message via WhatsApp
    const sendResult = await zapi.sendText(phone, responseText);
    if (sendResult.success) {
      // Save the message
      await crmDb.createMessage({
        leadId,
        phone,
        direction: "outbound",
        messageType: "text",
        content: responseText,
        mediaUrl: null,
        senderName: "IA Kafka",
        sentBy: null,
        zapiMessageId: sendResult.messageId || null,
        timestamp: Date.now(),
      });
      console.log(`[AI Attendant] Sent to lead #${leadId}: ${responseText.substring(0, 60)}...`);
      return { sent: true, message: responseText, action };
    }

    return { sent: false };
  } catch (err: any) {
    console.error("[AI Attendant] Error:", err.message);
    return { sent: false };
  }
}
