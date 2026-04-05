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
  attendantMaxMessages: number; // 0 = unlimited
  personality: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  workingHoursEnabled: boolean;
  aiMode: string;
  feiraoConfig: string | null;
  storeAddress: string | null;
  storeCity: string | null;
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
  tradeInDetails?: string; // detalhes do carro de troca (o que precisa fazer, estado)
  tradeInPhotosReceived?: boolean; // se cliente já mandou fotos do carro de troca
  tradeInVideoReceived?: boolean; // se cliente já mandou vídeo do carro de troca
  financingTerm?: number;
  wantsSimulation?: boolean;
  wantsFicha?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  customerCity?: string; // cidade do cliente
  wantsVideoCall?: boolean; // cliente de fora quer videochamada
  conversationStage?: string; // greeting, qualifying, presenting, collecting_data, scheduling, ficha, closing
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
      const cfg: AttendantConfig = {
        attendantEnabled: !!r.attendantEnabled,
        attendantMode: r.attendantMode || 'off_hours',
        attendantPrompt: r.attendantPrompt || null,
        attendantSchedule: r.attendantSchedule || null,
        attendantCollectData: r.attendantCollectData !== undefined ? !!r.attendantCollectData : true,
        attendantAutoSchedule: r.attendantAutoSchedule !== undefined ? !!r.attendantAutoSchedule : true,
        attendantAutoFicha: r.attendantAutoFicha !== undefined ? !!r.attendantAutoFicha : true,
        attendantAutoDistribute: r.attendantAutoDistribute !== undefined ? !!r.attendantAutoDistribute : true,
        attendantTankPromo: r.attendantTankPromo !== undefined ? !!r.attendantTankPromo : true,
        attendantMaxMessages: r.attendantMaxMessages ?? 0, // 0 = unlimited
        personality: r.personality || 'amigavel',
        workingHoursStart: r.workingHoursStart ?? 8,
        workingHoursEnd: r.workingHoursEnd ?? 20,
        workingHoursEnabled: !!r.workingHoursEnabled,
        aiMode: r.aiMode || 'normal',
        feiraoConfig: r.feiraoConfig || null,
        storeAddress: null,
        storeCity: null,
      };
      // Load store address from tenants table
      try {
        const { getCurrentTenantId } = await import("./tenantDb");
        const tid = getCurrentTenantId();
        const tenantResult = await dbConn!.execute(sql`SELECT name, address, city, phone FROM tenants WHERE id = ${tid} LIMIT 1`);
        const tRaw = tenantResult as any;
        const tRows = Array.isArray(tRaw?.[0]) ? tRaw[0] : tRaw;
        if (tRows?.[0]) {
          cfg.storeAddress = tRows[0].address || null;
          cfg.storeCity = tRows[0].city || null;
        }
      } catch { /* ignore - use defaults */ }
      return cfg;
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
    amigavel: 'Carismática, simpática e acolhedora. Fala como uma amiga que entende de carros e quer ajudar de verdade.',
    profissional: 'Confiante, direta e competente. Transmite autoridade sem ser fria.',
    agressivo: 'Persuasiva e criativa. Cria urgência real com escassez e oportunidade.',
  };

  // Simulation fields needed
  const simFields: string[] = [];
  if (collectedData.wantsSimulation) {
    if (!collectedData.customerCpf) simFields.push('CPF');
    if (!collectedData.customerBirthDate) simFields.push('data de nascimento');
    if (!collectedData.customerPhone && !lead.phone) simFields.push('telefone');
  }

  // Full ficha fields needed
  const fichaFields: string[] = [];
  if (collectedData.wantsFicha) {
    if (!collectedData.customerCpf) fichaFields.push('CPF');
    if (!collectedData.customerBirthDate) fichaFields.push('data de nascimento');
    if (!collectedData.customerIncome) fichaFields.push('renda mensal');
    if (!collectedData.customerEmployer) fichaFields.push('onde trabalha');
    if (!collectedData.customerEmploymentTime) fichaFields.push('tempo de emprego');
    if (!collectedData.customerAddress) fichaFields.push('endereço completo');
    if (!collectedData.downPayment) fichaFields.push('valor de entrada');
    if (!collectedData.vehicleInterest) fichaFields.push('veículo de interesse');
  }

  // Feirão context
  let feiraoCtx = '';
  if (config.aiMode === 'feirao' && config.feiraoConfig) {
    try {
      const fc = JSON.parse(config.feiraoConfig);
      feiraoCtx = `\n\n=== MODO FEIRÃO ATIVO ===
Você está em modo FEIRÃO! Foco total em AGENDAR.
Benefícios do agendamento no feirão:`;
      if (fc.beneficios) feiraoCtx += `\n- ${fc.beneficios}`;
      feiraoCtx += `\n- Transferência GRATIS\n- Tanque CHEIO\n- Super avaliação do usado na troca`;
      if (fc.promocoes) feiraoCtx += `\nPromoções: ${fc.promocoes}`;
      if (fc.objetivo) feiraoCtx += `\nObjetivo: ${fc.objetivo}`;
      if (fc.instrucoes) feiraoCtx += `\nInstruções: ${fc.instrucoes}`;
      feiraoCtx += `\nUSE URGENCIA: "Só durante o feirão", "Vagas limitadas", "Garanta sua condição especial"`;
    } catch { /* ignore */ }
  }

  // Tank promo
  const tankPromo = config.attendantTankPromo 
    ? '\nPROMOÇÃO: Cliente que agendar visita e fechar = TANQUE CHEIO de presente! Use como gatilho quando oportuno, sem forçar.'
    : '';

  // Custom prompt
  const customInstr = config.attendantPrompt ? `\n\nINSTRUÇÕES DO GERENTE:\n${config.attendantPrompt}` : '';

  // Store location context
  const storeAddr = config.storeAddress || 'Rua Santa Catarina, 1318';
  const storeCity = config.storeCity || 'Joinville';

  // Trade-in pre-evaluation status
  let tradeInStatus = '';
  if (collectedData.tradeInVehicle) {
    tradeInStatus = `\nPRÉ-AVALIAÇÃO DO USADO:`;
    tradeInStatus += `\n- Carro: ${collectedData.tradeInVehicle}`;
    tradeInStatus += `\n- Placa: ${collectedData.tradeInPlate || 'não informou'}`;
    tradeInStatus += `\n- KM: ${collectedData.tradeInKm ? collectedData.tradeInKm.toLocaleString('pt-BR') + ' km' : 'não informou'}`;
    tradeInStatus += `\n- Detalhes/estado: ${collectedData.tradeInDetails || 'não informou'}`;
    tradeInStatus += `\n- Fotos recebidas: ${collectedData.tradeInPhotosReceived ? 'SIM' : 'NÃO - PEDIR'}`;
    tradeInStatus += `\n- Vídeo recebido: ${collectedData.tradeInVideoReceived ? 'SIM' : 'NÃO'}`;
  }

  // Stage-specific instructions
  let stageInstr = '';
  const stage = collectedData.conversationStage || 'greeting';
  
  if (stage === 'greeting' || stage === 'qualifying') {
    stageInstr = `
ETAPA ATUAL: QUALIFICAÇÃO
- Cumprimente rápido e pergunte o que procura
- Identifique: tipo de veículo, se tem troca
- Se o cliente já disse o carro, avance para presenting`;
  } else if (stage === 'presenting') {
    stageInstr = `
ETAPA ATUAL: APRESENTAÇÃO
- Se tiver no estoque, mande foto (sendPhoto=true)
- Pergunte se tem troca
- Se tem troca: peça modelo/ano/km e FOTOS + VÍDEO pra pré-avaliação
- Pergunte forma de pagamento`;
  } else if (stage === 'trade_evaluation') {
    stageInstr = `
ETAPA ATUAL: PRÉ-AVALIAÇÃO DO USADO
- O cliente tem carro pra trocar
- Peça: modelo/ano, KM, se tem algo pra fazer (funilaria, mecânica)
- PEÇA FOTOS E VÍDEO do carro de troca pra pré-avaliação online
- Diga: "Manda umas fotos e um videozinho do carro pra gente já fazer uma pré-avaliação"
- Quando receber fotos/vídeo, agradeça e avance pra coleta de dados ou agendamento
${tradeInStatus}`;
  } else if (stage === 'collecting_data') {
    const pendingFields = simFields.length > 0 ? simFields : fichaFields;
    stageInstr = `
ETAPA ATUAL: COLETA DE DADOS
- Peça UM dado por vez, de forma natural e rápida
- SIMULAÇÃO (rápida): CPF + data nascimento + telefone
- FICHA COMPLETA: CPF + nascimento + renda + empregador + tempo + endereço + entrada
- Dados faltando: ${pendingFields.join(', ') || 'TUDO COMPLETO!'}
- Quando completo: avise que foi enviado pra análise`;
  } else if (stage === 'scheduling') {
    stageInstr = `
ETAPA ATUAL: AGENDAMENTO
- Se cliente é de ${storeCity}: agende visita presencial
- Se cliente é de fora: ofereça VIDEOCHAMADA com vendedor
- Horários: seg-sáb, 8h-18h
- Confirme data e horário
- Tente fechar pra HOJE ou AMANHÃ`;
  } else if (stage === 'ficha') {
    stageInstr = `
ETAPA ATUAL: FICHA EM ANÁLISE
- Ficha está com a equipe F&I
- Sugira agendar visita enquanto aguarda
- Mantenha engajado sem ser insistente`;
  } else if (stage === 'closing') {
    stageInstr = `
ETAPA ATUAL: FECHAMENTO
- Agendamento confirmado, reforce data/horário
- Se presencial: passe endereço
- Se videochamada: confirme que vendedor vai ligar
- Encerre com confiança`;
  }

  return `Você é a SDR (pré-vendas) da KAFKA Multimarcas. Atende pelo WhatsApp como PESSOA REAL.

SEU PAPEL: Qualificar leads, filtrar interesse, coletar dados, fazer pré-avaliação do usado e AGENDAR.

PERSONALIDADE: ${personalityMap[config.personality] || personalityMap.amigavel}

REGRAS ABSOLUTAS:
1. MENSAGENS CURTAS: 1-2 frases no máximo. Como gente de verdade no WhatsApp
2. ZERO emoji. Nunca use emoji. Nenhum
3. ZERO formatação: sem markdown, sem asteriscos, sem negrito, sem listas
4. UMA pergunta por vez. NUNCA faça duas perguntas na mesma mensagem
5. Seja carismática, objetiva e rápida
6. NUNCA invente preço, dado ou informação
7. Quando perguntar preço: "a melhor condição é presencialmente, bora agendar?"
8. Quando pedir localização: PRIMEIRO pergunte de qual cidade ele é
9. Não repita informações que já foram ditas no histórico${tankPromo}

FLUXO DE QUALIFICAÇÃO:
1. Cumprimentar e perguntar o que procura
2. Entender o veículo de interesse
3. Mandar foto do carro se tiver no estoque (sendPhoto=true)
4. Perguntar se tem troca
5. Se tem troca: pedir modelo/ano/km + PEDIR FOTOS E VÍDEO do carro pra pré-avaliação
6. Perguntar forma de pagamento (financiamento/à vista)
7. Se financiamento: coletar CPF + data nascimento (simulação rápida)
8. Perguntar de onde o cliente é (cidade)
9. Se é de ${storeCity}: agendar visita presencial
10. Se é de FORA: oferecer videochamada com vendedor

PRÉ-AVALIAÇÃO DO USADO (quando tem troca):
- Peça: modelo, ano, KM, se tem algo pra fazer (funilaria, mecânica, pintura)
- PEÇA FOTOS: "Manda umas fotos do carro pra gente já fazer uma pré-avaliação"
- PEÇA VÍDEO: "Se puder mandar um videozinho rápido mostrando o carro por fora e por dentro ajuda muito"
- Isso filtra e agiliza a avaliação antes do cliente chegar

LOCALIZAÇÃO DA LOJA:
- Endereço: ${storeAddr} - ${storeCity}/SC
- Se cliente é de ${storeCity}: passe só o endereço
- Se cliente é de fora: passe endereço + cidade + ofereça videochamada
- SEMPRE pergunte de onde o cliente é ANTES de passar endereço

SOBRE A LOJA:
- KAFKA Multimarcas - veículos seminovos e usados
- Financiamento, troca, consignação
- Seg a Sáb, 8h às 18h

DADOS JÁ COLETADOS:
- Nome: ${collectedData.customerName || firstName || 'não informado'}
- Cidade: ${collectedData.customerCity || 'não perguntou ainda'}
- CPF: ${collectedData.customerCpf || 'não informado'}
- Nascimento: ${collectedData.customerBirthDate || 'não informado'}
- Veículo: ${collectedData.vehicleInterest || lead.vehicleInterest || 'não informado'}
- Entrada: ${collectedData.downPayment ? 'R$ ' + collectedData.downPayment.toLocaleString('pt-BR') : 'não informado'}
- Troca: ${collectedData.tradeInVehicle || 'não informado'}
- Renda: ${collectedData.customerIncome ? 'R$ ' + collectedData.customerIncome.toLocaleString('pt-BR') : 'não informado'}
${tradeInStatus}
${stageInstr}
${vehicleContext}
${feiraoCtx}
${customInstr}

RESPONDA SEMPRE EM JSON:
{
  "message": "sua resposta curta aqui (1-2 frases, SEM EMOJI)",
  "extracted": {
    "customerName": null,
    "customerCpf": null,
    "customerBirthDate": null,
    "customerIncome": null,
    "customerEmployer": null,
    "customerEmploymentTime": null,
    "customerEmail": null,
    "customerAddress": null,
    "customerCity": null,
    "vehicleInterest": null,
    "downPayment": null,
    "tradeInVehicle": null,
    "tradeInPlate": null,
    "tradeInKm": null,
    "tradeInDetails": null,
    "wantsSimulation": false,
    "wantsFicha": false,
    "wantsVideoCall": false,
    "scheduledDate": null,
    "scheduledTime": null
  },
  "sendPhoto": false,
  "requestTradePhotos": false,
  "nextStage": "${stage}"
}

CAMPOS:
- "message": resposta CURTA (1-2 frases, SEM EMOJI, sem formatação)
- "extracted": preencha APENAS dados que o cliente informou AGORA. null = não informou
- "sendPhoto": true se deve enviar foto do veículo de interesse
- "requestTradePhotos": true se está pedindo fotos/vídeo do carro de troca
- "tradeInDetails": detalhes do estado do carro de troca (funilaria, mecânica, etc)
- "nextStage": greeting, qualifying, presenting, trade_evaluation, collecting_data, scheduling, ficha, closing

HISTÓRICO:
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
    if (config.attendantMaxMessages > 0 && aiMsgCount >= config.attendantMaxMessages) {
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
              message: { type: "string", description: "Resposta curta para o cliente (1-2 frases)" },
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
                  customerCity: { type: ["string", "null"] },
                  vehicleInterest: { type: ["string", "null"] },
                  downPayment: { type: ["number", "null"] },
                  tradeInVehicle: { type: ["string", "null"] },
                  tradeInPlate: { type: ["string", "null"] },
                  tradeInKm: { type: ["number", "null"] },
                  tradeInDetails: { type: ["string", "null"], description: "Detalhes do estado do carro de troca" },
                  wantsSimulation: { type: "boolean" },
                  wantsFicha: { type: "boolean" },
                  wantsVideoCall: { type: "boolean" },
                  scheduledDate: { type: ["string", "null"] },
                  scheduledTime: { type: ["string", "null"] },
                },
                required: ["customerName", "customerCpf", "customerBirthDate", "customerIncome", "customerEmployer", "customerEmploymentTime", "customerEmail", "customerAddress", "customerCity", "vehicleInterest", "downPayment", "tradeInVehicle", "tradeInPlate", "tradeInKm", "tradeInDetails", "wantsSimulation", "wantsFicha", "wantsVideoCall", "scheduledDate", "scheduledTime"],
                additionalProperties: false,
              },
              sendPhoto: { type: "boolean", description: "Whether to send vehicle photo" },
              requestTradePhotos: { type: "boolean", description: "Whether requesting trade-in photos/video" },
              nextStage: { type: "string", description: "Next conversation stage" },
            },
            required: ["message", "extracted", "sendPhoto", "requestTradePhotos", "nextStage"],
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
    if (extracted.tradeInDetails) updatedData.tradeInDetails = extracted.tradeInDetails;
    if (parsed.requestTradePhotos) {
      // Mark that we requested photos - will be set to true when media is received
      console.log(`[AI Attendant] Requested trade-in photos/video from lead #${leadId}`);
    }
    if (extracted.wantsSimulation) updatedData.wantsSimulation = true;
    if (extracted.wantsFicha) updatedData.wantsFicha = true;
    if (extracted.wantsVideoCall) updatedData.wantsVideoCall = true;
    if (extracted.customerCity) updatedData.customerCity = extracted.customerCity;
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

      // 4. Send vehicle photo if AI requested it
      if (parsed.sendPhoto) {
        const vSearch = updatedData.vehicleInterest || lead.vehicleInterest;
        if (vSearch) {
          try {
            const searchTerm = `%${vSearch}%`;
            const matchedVehicles = await dbConn.select().from(inventoryVehicles)
              .where(and(
                eq(inventoryVehicles.status, "available"),
                or(like(inventoryVehicles.model, searchTerm), like(inventoryVehicles.brand, searchTerm))
              )).limit(1);
            if (matchedVehicles.length > 0) {
              const v = matchedVehicles[0];
              // Try photos array first, then photoUrl
              let photoToSend = v.photoUrl;
              if (v.photos) {
                try {
                  const photosArr = JSON.parse(v.photos);
                  if (Array.isArray(photosArr) && photosArr.length > 0) {
                    photoToSend = photosArr[0];
                  }
                } catch { /* use photoUrl */ }
              }
              if (photoToSend) {
                const caption = `${v.brand} ${v.model} ${v.year || ''} - ${v.km?.toLocaleString('pt-BR') || '0'} km`;
                const imgResult = await zapi.sendImage(phone, photoToSend, caption);
                if (imgResult.success) {
                  await crmDb.createMessage({
                    leadId, phone, direction: "outbound", messageType: "image",
                    content: caption, mediaUrl: photoToSend, senderName: "IA Kafka",
                    sentBy: null, zapiMessageId: null, timestamp: Date.now(),
                  });
                  console.log(`[AI Attendant] Sent photo of ${v.brand} ${v.model} to lead #${leadId}`);
                  action = action ? action + ',photo_sent' : 'photo_sent';
                }
              }
            }
          } catch (photoErr: any) {
            console.error(`[AI Attendant] Error sending photo:`, photoErr.message);
          }
        }
      }

      return { sent: true, message: responseText, action };
    }

    return { sent: false };
  } catch (err: any) {
    console.error("[AI Attendant] Error:", err.message);
    return { sent: false };
  }
}
