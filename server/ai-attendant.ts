/**
 * AI Attendant Service - Kafka Multimarcas
 * 
 * SDR pré-vendas inteligente via WhatsApp:
 * - Mensagens curtas e humanizadas (1-2 frases, sem emoji)
 * - Memória completa: NUNCA repete pergunta já respondida
 * - Envio automático de fotos por tipo (SUV, Sedan, Hatch) + faixa de preço
 * - Coleta dados (CPF, nascimento, renda, troca) de forma natural
 * - Agenda visitas presenciais ou videochamadas
 * - Submete fichas de crédito ao F&I
 * - Classifica temperatura do lead pela conversa (quente/morno/frio)
 */

import { invokeLLM } from "./_core/llm";
import * as crmDb from "./crmDb";
import * as zapi from "./zapi-service";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { inventoryVehicles } from "../drizzle/schema";
import { like, or, and, eq, gte, lte, between } from "drizzle-orm";

// ===== TYPES =====
interface AttendantConfig {
  attendantEnabled: boolean;
  attendantMode: string; // 'always' | 'off_hours' | 'holidays'
  attendantPrompt: string | null;
  attendantSchedule: string | null;
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
  vehicleType?: string; // SUV, Sedan, Hatch, Picape, etc.
  priceMin?: number;
  priceMax?: number;
  downPayment?: number;
  tradeInVehicle?: string;
  tradeInPlate?: string;
  tradeInKm?: number;
  tradeInDetails?: string;
  tradeInPhotosReceived?: boolean;
  tradeInVideoReceived?: boolean;
  financingTerm?: number;
  paymentMethod?: string; // financiamento, avista, troca
  wantsSimulation?: boolean;
  wantsFicha?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  customerCity?: string;
  wantsVideoCall?: boolean;
  conversationStage?: string;
  lastQuestionAsked?: string; // track what we last asked to avoid repeating
  questionsAsked?: string[]; // history of all questions asked
  leadTemperature?: string; // hot, warm, cold - AI-analyzed
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
        attendantMaxMessages: r.attendantMaxMessages ?? 0,
        personality: r.personality || 'amigavel',
        workingHoursStart: r.workingHoursStart ?? 8,
        workingHoursEnd: r.workingHoursEnd ?? 20,
        workingHoursEnabled: !!r.workingHoursEnabled,
        aiMode: r.aiMode || 'normal',
        feiraoConfig: r.feiraoConfig || null,
        storeAddress: null,
        storeCity: null,
      };
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
      } catch { /* ignore */ }
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
  const brasiliaOffset = -3;
  const utcHours = now.getUTCHours();
  const brasiliaHour = (utcHours + brasiliaOffset + 24) % 24;
  const brasiliaDay = now.getUTCDay();

  if (config.attendantMode === 'always') return true;
  if (config.attendantMode === 'off_hours') {
    const isBusinessHours = brasiliaHour >= config.workingHoursStart && brasiliaHour < config.workingHoursEnd;
    const isWeekday = brasiliaDay >= 1 && brasiliaDay <= 6;
    if (isBusinessHours && isWeekday) return false;
    return true;
  }
  if (config.attendantMode === 'holidays') {
    if (config.attendantSchedule) {
      try {
        const schedule = JSON.parse(config.attendantSchedule);
        const todayStr = now.toISOString().split('T')[0];
        if (schedule.holidays?.includes(todayStr)) return true;
        if (schedule.alwaysOn) return true;
      } catch { /* ignore */ }
    }
    return false;
  }
  return false;
}

// ===== GET/SAVE COLLECTED DATA =====
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

async function saveCollectedData(leadId: number, data: CollectedData): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  try {
    await dbConn.execute(sql`UPDATE crm_leads SET aiDataCollected = ${JSON.stringify(data)}, aiHandled = 1 WHERE id = ${leadId}`);
  } catch (e) {
    console.error("[AI Attendant] Error saving collected data:", e);
  }
}

// ===== VEHICLE SEARCH BY TYPE + PRICE RANGE =====
async function searchVehiclesByTypeAndPrice(
  vehicleType?: string,
  priceMin?: number,
  priceMax?: number,
  searchTerm?: string,
  limit = 5
): Promise<any[]> {
  const dbConn = await getDb();
  if (!dbConn) return [];

  try {
    const conditions: any[] = [eq(inventoryVehicles.status, "available")];

    // Map common terms to bodyType values
    const typeMap: Record<string, string[]> = {
      'suv': ['SUV'],
      'sedan': ['Sedan', 'Sedã'],
      'hatch': ['Hatch', 'Hatchback'],
      'picape': ['Picape', 'Pickup', 'Pick-up'],
      'pickup': ['Picape', 'Pickup', 'Pick-up'],
      'caminhonete': ['Picape', 'Pickup', 'Pick-up'],
      'van': ['Van', 'Furgão'],
      'conversivel': ['Conversível', 'Conversivel'],
      'coupe': ['Coupé', 'Coupe'],
      'minivan': ['Minivan'],
      'utilitario': ['Utilitário', 'Utilitario'],
    };

    // Search by bodyType if vehicle type is specified
    if (vehicleType) {
      const normalizedType = vehicleType.toLowerCase().trim();
      const bodyTypes = typeMap[normalizedType] || [vehicleType];
      const typeConditions = bodyTypes.map(t => like(inventoryVehicles.bodyType, `%${t}%`));
      if (typeConditions.length === 1) {
        conditions.push(typeConditions[0]);
      } else {
        conditions.push(or(...typeConditions));
      }
    }

    // Search by price range with 20% margin above max
    if (priceMin && priceMax) {
      const marginMax = Math.round(priceMax * 1.2); // 20% above max
      conditions.push(gte(inventoryVehicles.price, priceMin));
      conditions.push(lte(inventoryVehicles.price, marginMax));
    } else if (priceMax) {
      const marginMax = Math.round(priceMax * 1.2);
      conditions.push(lte(inventoryVehicles.price, marginMax));
    } else if (priceMin) {
      conditions.push(gte(inventoryVehicles.price, priceMin));
    }

    // Also search by model/brand name if provided
    if (searchTerm && !vehicleType) {
      const search = `%${searchTerm}%`;
      conditions.push(or(
        like(inventoryVehicles.model, search),
        like(inventoryVehicles.brand, search)
      ));
    }

    const vehicles = await dbConn.select().from(inventoryVehicles)
      .where(and(...conditions))
      .limit(limit);

    return vehicles;
  } catch (err: any) {
    console.error("[AI Attendant] Vehicle search error:", err.message);
    return [];
  }
}

// ===== SEND VEHICLE PHOTOS =====
async function sendVehiclePhotos(
  phone: string,
  leadId: number,
  vehicles: any[]
): Promise<number> {
  let sentCount = 0;
  for (const v of vehicles.slice(0, 3)) { // Max 3 vehicles
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
      const priceStr = v.price ? `R$ ${v.price.toLocaleString('pt-BR')}` : 'consultar';
      const kmStr = v.km ? `${v.km.toLocaleString('pt-BR')} km` : '0 km';
      const caption = `${v.brand} ${v.model} ${v.year || ''} - ${kmStr} - ${priceStr}`;
      try {
        const imgResult = await zapi.sendImage(phone, photoToSend, caption);
        if (imgResult.success) {
          await crmDb.createMessage({
            leadId, phone, direction: "outbound", messageType: "image",
            content: caption, mediaUrl: photoToSend, senderName: "IA Kafka",
            sentBy: null, zapiMessageId: null, timestamp: Date.now(),
          });
          sentCount++;
          console.log(`[AI Attendant] Sent photo: ${v.brand} ${v.model} to lead #${leadId}`);
          // Small delay between photos to avoid rate limiting
          if (sentCount < 3) await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err: any) {
        console.error(`[AI Attendant] Photo send error:`, err.message);
      }
    }
  }
  return sentCount;
}

// ===== CREATE CREDIT APPLICATION =====
export async function createCreditApplication(leadId: number, data: CollectedData): Promise<number | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;
  try {
    // Check if already created for this lead
    const existing = await dbConn.execute(sql`SELECT id FROM credit_applications WHERE leadId = ${leadId} LIMIT 1`);
    const exRaw = existing as any;
    const exRows = Array.isArray(exRaw?.[0]) ? exRaw[0] : exRaw;
    if (exRows?.[0]?.id) {
      console.log(`[AI Attendant] Credit app already exists for lead #${leadId}`);
      return exRows[0].id;
    }

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
    let scheduledTimestamp = Date.now() + 86400000;
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
    }
    return insertId || null;
  } catch (e) {
    console.error("[AI Attendant] Error creating appointment:", e);
    return null;
  }
}

// ===== ANALYZE LEAD TEMPERATURE =====
export async function analyzeLeadTemperature(leadId: number, chatHistory: string, collectedData: CollectedData): Promise<string> {
  try {
    // Quick heuristic first - if we have enough data, it's hot
    const hasName = !!collectedData.customerName;
    const hasVehicle = !!collectedData.vehicleInterest;
    const hasCpf = !!collectedData.customerCpf;
    const hasSchedule = !!collectedData.scheduledDate;
    const wantsFicha = !!collectedData.wantsFicha || !!collectedData.wantsSimulation;
    const hasTradeIn = !!collectedData.tradeInVehicle;
    const hasPayment = !!collectedData.paymentMethod || !!collectedData.downPayment;

    // Score-based classification
    let score = 0;
    if (hasName) score += 1;
    if (hasVehicle) score += 2;
    if (hasCpf) score += 3;
    if (hasSchedule) score += 4;
    if (wantsFicha) score += 3;
    if (hasTradeIn) score += 2;
    if (hasPayment) score += 2;

    // Analyze conversation content for intent signals
    const lowerHistory = chatHistory.toLowerCase();
    const hotSignals = ['quero comprar', 'vou comprar', 'fechar negocio', 'pode agendar', 'quero agendar', 'vou ai', 'vou passar ai', 'qual o endereco', 'posso ir hoje', 'posso ir amanha', 'manda o pix', 'vou financiar', 'aprovado', 'manda contrato', 'fecha', 'quero esse'];
    const coldSignals = ['so olhando', 'nao tenho interesse', 'ja comprei', 'nao quero', 'para de mandar', 'nao preciso', 'obrigado mas nao', 'nao obrigado', 'talvez', 'vou pensar', 'depois eu vejo'];
    
    for (const signal of hotSignals) {
      if (lowerHistory.includes(signal)) score += 3;
    }
    for (const signal of coldSignals) {
      if (lowerHistory.includes(signal)) score -= 3;
    }

    if (score >= 8) return 'hot';
    if (score >= 3) return 'warm';
    return 'cold';
  } catch {
    return 'warm'; // default
  }
}

// ===== BUILD SYSTEM PROMPT =====
function buildAttendantPrompt(config: AttendantConfig, lead: any, collectedData: CollectedData, vehicleContext: string, chatHistory: string): string {
  const firstName = (collectedData.customerName || lead.name || '').split(' ')[0] || 'amigo';

  // Build list of data ALREADY collected (to prevent re-asking)
  const alreadyCollected: string[] = [];
  if (collectedData.customerName) alreadyCollected.push(`Nome: ${collectedData.customerName}`);
  if (collectedData.customerCity) alreadyCollected.push(`Cidade: ${collectedData.customerCity}`);
  if (collectedData.customerCpf) alreadyCollected.push(`CPF: ${collectedData.customerCpf}`);
  if (collectedData.customerBirthDate) alreadyCollected.push(`Nascimento: ${collectedData.customerBirthDate}`);
  if (collectedData.vehicleInterest) alreadyCollected.push(`Veiculo interesse: ${collectedData.vehicleInterest}`);
  if (collectedData.vehicleType) alreadyCollected.push(`Tipo: ${collectedData.vehicleType}`);
  if (collectedData.priceMin || collectedData.priceMax) alreadyCollected.push(`Faixa preco: R$ ${collectedData.priceMin?.toLocaleString('pt-BR') || '?'} - R$ ${collectedData.priceMax?.toLocaleString('pt-BR') || '?'}`);
  if (collectedData.downPayment) alreadyCollected.push(`Entrada: R$ ${collectedData.downPayment.toLocaleString('pt-BR')}`);
  if (collectedData.paymentMethod) alreadyCollected.push(`Pagamento: ${collectedData.paymentMethod}`);
  if (collectedData.tradeInVehicle) alreadyCollected.push(`Carro troca: ${collectedData.tradeInVehicle}`);
  if (collectedData.tradeInPlate) alreadyCollected.push(`Placa troca: ${collectedData.tradeInPlate}`);
  if (collectedData.tradeInKm) alreadyCollected.push(`KM troca: ${collectedData.tradeInKm.toLocaleString('pt-BR')}`);
  if (collectedData.tradeInDetails) alreadyCollected.push(`Estado troca: ${collectedData.tradeInDetails}`);
  if (collectedData.tradeInPhotosReceived) alreadyCollected.push(`Fotos troca: RECEBIDAS`);
  if (collectedData.customerIncome) alreadyCollected.push(`Renda: R$ ${collectedData.customerIncome.toLocaleString('pt-BR')}`);
  if (collectedData.customerEmployer) alreadyCollected.push(`Empregador: ${collectedData.customerEmployer}`);
  if (collectedData.customerEmploymentTime) alreadyCollected.push(`Tempo emprego: ${collectedData.customerEmploymentTime}`);
  if (collectedData.customerAddress) alreadyCollected.push(`Endereco: ${collectedData.customerAddress}`);
  if (collectedData.customerEmail) alreadyCollected.push(`Email: ${collectedData.customerEmail}`);
  if (collectedData.scheduledDate) alreadyCollected.push(`Agendamento: ${collectedData.scheduledDate} ${collectedData.scheduledTime || ''}`);

  // Build list of data still MISSING for simulation/ficha
  const simFields: string[] = [];
  if (collectedData.wantsSimulation || collectedData.wantsFicha) {
    if (!collectedData.customerCpf) simFields.push('CPF');
    if (!collectedData.customerBirthDate) simFields.push('data de nascimento');
  }
  const fichaFields: string[] = [];
  if (collectedData.wantsFicha) {
    if (!collectedData.customerIncome) fichaFields.push('renda mensal');
    if (!collectedData.customerEmployer) fichaFields.push('onde trabalha');
    if (!collectedData.customerEmploymentTime) fichaFields.push('tempo de emprego');
    if (!collectedData.customerAddress) fichaFields.push('endereco completo');
    if (!collectedData.downPayment) fichaFields.push('valor de entrada');
  }

  // Feirão context
  let feiraoCtx = '';
  if (config.aiMode === 'feirao' && config.feiraoConfig) {
    try {
      const fc = JSON.parse(config.feiraoConfig);
      feiraoCtx = `\n\n=== MODO FEIRÃO ATIVO ===
Voce esta em modo FEIRÃO! Foco total em AGENDAR.
Beneficios do agendamento no feirão:`;
      if (fc.beneficios) feiraoCtx += `\n- ${fc.beneficios}`;
      feiraoCtx += `\n- Transferencia GRATIS\n- Tanque CHEIO\n- Super avaliacao do usado na troca`;
      if (fc.promocoes) feiraoCtx += `\nPromocoes: ${fc.promocoes}`;
      if (fc.objetivo) feiraoCtx += `\nObjetivo: ${fc.objetivo}`;
      if (fc.instrucoes) feiraoCtx += `\nInstrucoes: ${fc.instrucoes}`;
      feiraoCtx += `\nUSE URGENCIA: "So durante o feirão", "Vagas limitadas", "Garanta sua condicao especial"`;
    } catch { /* ignore */ }
  }

  const tankPromo = config.attendantTankPromo 
    ? '\nPROMOÇÃO: Cliente que agendar visita e fechar = TANQUE CHEIO de presente! Use como gatilho quando oportuno, sem forcar.'
    : '';

  const customInstr = config.attendantPrompt ? `\n\nINSTRUÇÕES DO GERENTE:\n${config.attendantPrompt}` : '';

  const storeAddr = config.storeAddress || 'Rua Santa Catarina, 1318 - Bairro Floresta';
  const storeCity = config.storeCity || 'Joinville';

  // Trade-in status
  let tradeInStatus = '';
  if (collectedData.tradeInVehicle) {
    tradeInStatus = `\nPRE-AVALIAÇÃO DO USADO:`;
    tradeInStatus += `\n- Carro: ${collectedData.tradeInVehicle}`;
    tradeInStatus += `\n- Placa: ${collectedData.tradeInPlate || 'nao informou'}`;
    tradeInStatus += `\n- KM: ${collectedData.tradeInKm ? collectedData.tradeInKm.toLocaleString('pt-BR') + ' km' : 'nao informou'}`;
    tradeInStatus += `\n- Detalhes/estado: ${collectedData.tradeInDetails || 'nao informou'}`;
    tradeInStatus += `\n- Fotos recebidas: ${collectedData.tradeInPhotosReceived ? 'SIM' : 'NÃO - PEDIR'}`;
    tradeInStatus += `\n- Video recebido: ${collectedData.tradeInVideoReceived ? 'SIM' : 'NÃO'}`;
  }

  // Stage-specific instructions
  const stage = collectedData.conversationStage || 'greeting';
  let stageInstr = '';
  
  if (stage === 'greeting' || stage === 'qualifying') {
    stageInstr = `\nETAPA ATUAL: QUALIFICAÇÃO
- Cumprimente rapido e pergunte o que procura
- Identifique: tipo de veiculo, se tem troca, faixa de preco
- Se o cliente ja disse o carro, avance para presenting`;
  } else if (stage === 'presenting') {
    stageInstr = `\nETAPA ATUAL: APRESENTAÇÃO
- Se tiver no estoque, mande foto (sendPhotos=true)
- Pergunte se tem troca
- Se tem troca: peca modelo/ano/km e FOTOS + VIDEO pra pre-avaliacao
- Pergunte forma de pagamento`;
  } else if (stage === 'trade_evaluation') {
    stageInstr = `\nETAPA ATUAL: PRE-AVALIAÇÃO DO USADO
- O cliente tem carro pra trocar
- Peca: modelo/ano, KM, se tem algo pra fazer (funilaria, mecanica)
- PECA FOTOS E VIDEO do carro de troca pra pre-avaliacao online
- Diga: "Manda umas fotos e um videozinho do carro pra gente ja fazer uma pre-avaliacao"
${tradeInStatus}`;
  } else if (stage === 'collecting_data') {
    const pendingFields = fichaFields.length > 0 ? fichaFields : simFields;
    stageInstr = `\nETAPA ATUAL: COLETA DE DADOS
- Peca UM dado por vez, de forma natural e rapida
- Dados faltando: ${pendingFields.join(', ') || 'TUDO COMPLETO!'}
- Quando completo: avise que foi enviado pra analise`;
  } else if (stage === 'scheduling') {
    stageInstr = `\nETAPA ATUAL: AGENDAMENTO
- Se cliente e de ${storeCity}: agende visita presencial
- Se cliente e de fora: ofereça VIDEOCHAMADA com vendedor
- Horarios: seg-sab, 8h-18h
- Tente fechar pra HOJE ou AMANHÃ`;
  } else if (stage === 'ficha') {
    stageInstr = `\nETAPA ATUAL: FICHA EM ANALISE
- Ficha esta com a equipe F&I
- Sugira agendar visita enquanto aguarda`;
  } else if (stage === 'closing') {
    stageInstr = `\nETAPA ATUAL: FECHAMENTO
- Agendamento confirmado, reforce data/horario
- Se presencial: passe endereco
- Se videochamada: confirme que vendedor vai ligar`;
  }

  // Questions already asked (to prevent repetition)
  const questionsAsked = collectedData.questionsAsked || [];
  const questionsCtx = questionsAsked.length > 0 
    ? `\n\nPERGUNTAS JA FEITAS (NUNCA REPITA ESTAS):\n${questionsAsked.map((q, i) => `${i+1}. ${q}`).join('\n')}`
    : '';

  return `Voce e uma SDR (pre-vendas) da KAFKA Multimarcas, especialista em atendimento automotivo via WhatsApp.

=== SEU OBJETIVO ===
- Atender rapido
- Gerar conexao
- Entender o cliente
- Qualificar o lead
- Preparar o cliente para o vendedor
- Levar para simulacao e visita na loja
Voce NAO fecha a venda. Voce entrega o cliente PRONTO para o fechamento.

=== PERSONALIDADE PADRAO KAFKA ===
- Direta, clara e confiante
- Profissional e proxima
- Sem enrolacao
- Sem parecer robo
- Controla a conversa
- Chame o cliente de ${firstName}

=== MISSAO DA SDR ===
Voce deve descobrir:
- O que o cliente quer
- Se tem carro na troca
- Como pretende pagar
- Qual o momento de compra (urgencia)
- Se esta pronto para avancar

=== FLUXO DE ATENDIMENTO ===

1. ABERTURA (primeira mensagem):
"Bom dia/tarde, tudo certo? Voce viu esse modelo ou ta buscando algo nessa linha?"

2. ENTENDER INTERESSE:
"Voce ja tem algum modelo em mente ou quer que eu te ajude a encontrar o melhor custo-beneficio?"
Se disser tipo (sedan, suv, hatch) ou faixa de preco → sendPhotos=true

3. TROCA:
"Voce tem carro na troca? A gente costuma dar uma super avaliacao, vale a pena trazer pra gente ver"
Se SIM: "Qual carro voce tem hoje? Se puder me mandar umas fotos ja consigo adiantar uma avaliacao"
→ requestTradePhotos=true

4. FORMA DE PAGAMENTO:
"Normalmente o pessoal faz financiado com uma entrada e fica com parcela bem tranquila, voce ja pensou em como faria?"

5. SIMULACAO (use como GATILHO de conversao):
"Consigo montar uma simulacao pra voce ter uma ideia real de parcela. E depois que a gente aprova o cadastro, conseguimos uma taxa de juros bem mais baixa, melhorando muito a parcela. Vale fazer sem compromisso"
Se aceitar: "Pra te passar certinho, preciso do CPF e data de nascimento"
→ wantsSimulation=true

6. URGENCIA (no momento certo):
"E me diz, voce ja ta querendo resolver isso agora ou ta analisando com calma?"

=== PERGUNTAS PRESSUPOSICIONAIS (USE SEMPRE) ===
Em vez de perguntar SE o cliente quer, ASSUMA que ele vai:
- Em vez de "quer agendar?" → "Vou separar esse carro pra voce ver com calma, qual melhor horario?"
- Em vez de "quer simular?" → "Vou adiantar uma simulacao pra voce, me passa o CPF"
- Em vez de "tem interesse?" → "Esse ta com condicao especial, vou te mostrar os detalhes"
- Em vez de "quer ver fotos?" → "Vou te mandar umas fotos pra voce ja ter uma ideia"

=== AGENDAMENTO (PRIORIDADE MAXIMA) ===
"Vou separar esse carro pra voce ver com calma aqui na loja, qual melhor horario pra voce passar?"

=== TRANSICAO PARA VENDEDOR ===
Quando cliente esta qualificado OU quando voce nao sabe responder algo tecnico:
"Perfeito, vou encaminhar seu atendimento para um dos nossos consultores que vai te atender com tudo pronto"
OU
"Vou deixar tudo separado pra voce ver direto aqui na loja com a equipe"
IMPORTANTE: Se o cliente fizer uma pergunta que voce NAO sabe responder (tecnica, financeira complexa, negociacao de valor), TRANSFIRA para o consultor em vez de inventar resposta. Diga: "Essa parte quem pode te dar a melhor resposta e nosso consultor, vou te encaminhar pra ele"

=== QUEBRA DE OBJECOES ===
Quando o cliente apresentar objecoes, use estas respostas:

"Ta caro" / "Vi mais barato":
→ "Entendo, mas aqui a gente trabalha com procedencia garantida e revisao completa. Presencialmente consigo ver uma condicao melhor pra voce"

"Vou pensar":
→ "Tranquilo, fico a disposicao. So te adianto que esse modelo ta com bastante procura, se quiser garanto pra voce"

"Estou so pesquisando":
→ "Perfeito, pesquisar e importante. Me diz o que voce ta buscando que te mando as melhores opcoes pra comparar"

"Nao tenho entrada":
→ "Sem problema, a gente trabalha com financiamento e consigo ver a melhor parcela pra voce. Quer que eu simule?"

"Preciso falar com meu esposo/esposa":
→ "Claro, inclusive pode trazer ele pra ver junto. Que tal agendar um horario que fique bom pros dois?"

"O carro tem muita quilometragem":
→ "Entendo sua preocupacao. Esse carro passou por revisao completa e ta em otimo estado. Vale a pena ver pessoalmente"

"Nao confio em carro usado":
→ "Aqui na Kafka todos os carros passam por vistoria completa. A gente da garantia e voce pode trazer seu mecanico pra avaliar"

"Ta longe" / "Sou de outra cidade":
→ "Posso agendar uma videochamada com nosso consultor pra te mostrar o carro em detalhes, o que acha?"

=== 7 GATILHOS MENTAIS (USE COM INTELIGENCIA) ===
1. ESCASSEZ: "Esse modelo e dificil de encontrar nesse estado" / "Esse ta saindo rapido"
2. URGENCIA: "Essa condicao e por tempo limitado" / "Depois nao consigo garantir"
3. PROVA SOCIAL: "Esse modelo e o mais procurado aqui na loja" / "Ja vendemos varios desse"
4. AUTORIDADE: "A gente trabalha com veiculo revisado e com garantia" / "Pode ficar tranquilo"
5. RECIPROCIDADE: "Vou adiantar uma simulacao pra voce sem compromisso, so pra ter uma ideia"
6. NOVIDADE: "Temos novidades chegando que ainda nao estao no site" / "Tem mais opcoes na loja"
7. AVERSAO A PERDA: "Se nao garantir agora, pode ser que outro cliente feche antes"
Use 1-2 gatilhos por mensagem, de forma NATURAL, sem forcar.

=== ADAPTACAO POR PERFIL ===
Identifique o perfil do cliente pelo TOM das mensagens e adapte:
- DECIDIDO (msgs curtas, diretas, quer preco): Seja direto, va rapido pro agendamento
- ANALITICO (muitas perguntas tecnicas, compara): De detalhes, comparativos, dados
- EMOCIONAL (fala de familia, seguranca, conforto): Fale de espaco, seguranca, conforto
- INDECISO ("vou pensar", "talvez", demora): Use prova social, escassez, ofereca test-drive

=== TRATAMENTO DE MIDIA ===
- Se o cliente mandou AUDIO: "Recebi seu audio, vou ouvir e ja te respondo" (e responda ao conteudo)
- Se o cliente mandou FOTO do carro de troca: "Recebi as fotos, vou encaminhar pro nosso avaliador. Enquanto isso, me diz a quilometragem e se tem algo pra fazer nele"
- Se o cliente mandou FOTO de outro anuncio: "Vi o anuncio, deixa eu ver o que tenho de similar aqui pra voce"
- Se o cliente mandou VIDEO: "Recebi o video, vou analisar e ja te dou um retorno"

=== REGRAS ABSOLUTAS (NUNCA VIOLE) ===
1. MENSAGENS CURTAS: 1-2 frases no maximo. Como gente de verdade no WhatsApp
2. ZERO emoji. Nunca use emoji. Nenhum. Sem caracteres especiais Unicode de emoji. PROIBIDO
3. ZERO formatacao: sem markdown, sem asteriscos, sem negrito, sem listas
4. UMA pergunta por vez. NUNCA faca duas perguntas na mesma mensagem
5. NUNCA invente preco, dado ou informacao
6. Nao fechar venda
7. Nao negociar pesado
8. Nao passar tudo de uma vez
9. Nao fazer interrogatorio
10. SEMPRE conduzir a conversa
11. Quando perguntar preco: "a melhor condicao e presencialmente, bora agendar?"
12. Quando pedir localizacao: PRIMEIRO pergunte de qual cidade ele e
13. NUNCA use a palavra "emoji" na resposta
14. DISPONIBILIDADE DE VEICULOS: Voce NAO tem informacao se um veiculo foi vendido ou nao. Veiculos podem estar em PREPARACAO, podem ter acabado de CHEGAR e ainda nao foram cadastrados. NUNCA diga "vendido", "ja foi vendido", "nao temos mais", "nao esta disponivel", "saiu do estoque". Se o veiculo nao aparece na lista de estoque, diga APENAS: "vou confirmar com a equipe a disponibilidade desse modelo e ja te retorno". SEMPRE trate como se o carro PODE estar disponivel.
15. NUNCA repita a mesma mensagem ou uma mensagem muito parecida com algo que voce ja enviou. Leia o historico e VARIE suas respostas.
16. Se voce NAO SABE responder algo (tecnico, financeiro complexo, negociacao), TRANSFIRA para o consultor: "Essa parte quem pode te dar a melhor resposta e nosso consultor, vou te encaminhar". Use nextStage="transfer_to_seller"
17. NUNCA use as palavras: vendido, esgotado, acabou, nao temos, indisponivel. SEMPRE use: verificar, confirmar, checar com a equipe

=== REGRA CRITICA: MEMORIA ===
VOCE TEM MEMORIA PERFEITA. Analise o HISTORICO abaixo com cuidado.
- NUNCA repita uma pergunta que ja foi respondida no historico
- NUNCA peca um dado que ja esta na lista "DADOS JA COLETADOS"
- Se o cliente ja disse o ano do carro, NAO pergunte de novo
- Se o cliente ja disse a forma de pagamento, NAO pergunte de novo
- Se o cliente ja disse a cidade, NAO pergunte de novo
- Se voce ja perguntou algo e o cliente respondeu, AVANCE para o proximo passo
- Referencie dados anteriores: "Voce mencionou que quer um [carro], certo?"
${questionsCtx}

=== REGRA CRITICA: FOTOS E ESTOQUE ===
- Quando o cliente pedir fotos ou disser tipo + faixa de preco, SEMPRE coloque sendPhotos=true
- Quando o cliente disser "sedan", "suv", "hatch", "picape" + preco, coloque sendPhotos=true E preencha vehicleType e priceMin/priceMax
- Se o cliente pedir um sedan de 30 a 40 mil, busque tambem opcoes ate 55 mil
- SEJA PROATIVA: assim que identificar o interesse, JA MANDE FOTOS sem esperar pedir
- GATILHO DE CURIOSIDADE apos enviar fotos:
  * "Essas sao algumas opcoes, mas temos mais novidades chegando que ainda nao estao no site"
  * "Tem mais opcoes aqui na loja que ainda nao subimos, vale a pena dar uma passada"
- SE O CLIENTE NAO GOSTAR das opcoes: pergunte o que busca exatamente e refine

PRE-AVALIACAO DO USADO (quando tem troca):
- Peca: modelo, ano, KM, se tem algo pra fazer (funilaria, mecanica, pintura)
- PECA FOTOS: "Manda umas fotos do carro pra gente ja fazer uma pre-avaliacao"
- PECA VIDEO: "Se puder mandar um videozinho rapido mostrando o carro por fora e por dentro ajuda muito"

LOCALIZACAO DA LOJA:
- Endereco CORRETO: ${storeAddr} - ${storeCity}/SC
- A loja fica em JOINVILLE, NAO em Navegantes, NAO em outra cidade
- NUNCA diga Navegantes. O endereco e JOINVILLE/SC
- SEMPRE pergunte de onde o cliente e ANTES de passar endereco

SOBRE A LOJA:
- KAFKA Multimarcas - veiculos seminovos e usados
- Financiamento, troca, consignacao
- Seg a Sab, 8h as 18h

=== CLASSIFICACAO DE LEAD (INTERNA) ===
- HOT = pronto pra comprar, quer agendar, mandou CPF, quer fechar
- WARM = avaliando, interessado, fazendo perguntas
- COLD = so pesquisando, sem interesse claro, "vou pensar"

=== DADOS JA COLETADOS (NAO PERGUNTE DE NOVO!) ===
${alreadyCollected.length > 0 ? alreadyCollected.join('\n') : 'Nenhum dado coletado ainda'}
${tradeInStatus}
${stageInstr}
${vehicleContext}
${feiraoCtx}
${tankPromo}
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
    "vehicleType": null,
    "priceMin": null,
    "priceMax": null,
    "downPayment": null,
    "paymentMethod": null,
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
  "sendPhotos": false,
  "requestTradePhotos": false,
  "nextStage": "${stage}",
  "questionAsked": "resumo curto da pergunta feita nesta resposta",
  "leadTemperature": "warm"
}

CAMPOS:
- "message": resposta CURTA (1-2 frases, SEM EMOJI, sem formatacao). Fale como pessoa real no WhatsApp
- "extracted": preencha APENAS dados que o cliente informou AGORA. null = nao informou
- "vehicleType": tipo do veiculo (suv, sedan, hatch, picape, etc) - preencha quando cliente mencionar
- "priceMin"/"priceMax": faixa de preco em reais (ex: 30000, 40000) - preencha quando cliente mencionar
- "paymentMethod": financiamento, avista, troca - preencha quando cliente disser
- "sendPhotos": true se deve enviar fotos do estoque (quando cliente pede fotos OU diz tipo+preco)
- "requestTradePhotos": true se esta pedindo fotos/video do carro de troca
- "nextStage": greeting, qualifying, presenting, trade_evaluation, collecting_data, scheduling, ficha, closing
- "questionAsked": resumo da pergunta que voce fez (para nao repetir depois)
- "leadTemperature": "hot" (quer comprar/agendar), "warm" (interessado), "cold" (so olhando/sem interesse)

ESSENCIA: Voce prepara o terreno. Quem fecha e o vendedor.
OBJETIVO FINAL: Simulacao + Envio de dados + Agendamento na loja + Atendimento com vendedor

HISTORICO DA CONVERSA:
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
    if (!isAttendantActive(config)) {
      return { sent: false };
    }

    const dbConn = await getDb();
    if (!dbConn) return { sent: false };

    // Get lead info
    const lead = await crmDb.getLeadById(leadId);
    if (!lead) return { sent: false };

    // === CHECK IF HUMAN SDR ENTERED THE CONVERSATION ===
    // If any outbound message was sent by a HUMAN (not IA Kafka), the IA must STOP immediately
    // Human messages are identified by:
    // 1. sentBy is set (CRM-sent messages have sellerId in sentBy)
    // 2. senderName is NOT 'IA Kafka' AND NOT null (WhatsApp-sent by human from phone)
    // 3. fromMe webhook messages that weren't sent by IA
    const recentOutbound = await dbConn.execute(
      sql`SELECT senderName, sentBy, timestamp FROM crm_messages 
          WHERE leadId = ${leadId} AND direction = 'outbound' 
          ORDER BY timestamp DESC LIMIT 10`
    );
    const outboundRaw = recentOutbound as any;
    const outboundRows = Array.isArray(outboundRaw?.[0]) ? outboundRaw[0] : outboundRaw;
    if (outboundRows && outboundRows.length > 0) {
      for (const msg of outboundRows) {
        const sName = (msg.senderName || '').toString().trim();
        const sByVal = msg.sentBy;
        const isAiMessage = sName === 'IA Kafka' || sName === 'IA' || sName === 'Bot';
        
        // Case 1: Message sent via CRM by a human seller (sentBy has sellerId, senderName is null)
        if (sByVal && !isAiMessage) {
          console.log(`[AI Attendant] Human seller (ID: ${sByVal}) is handling lead #${leadId} via CRM, IA stopping`);
          return { sent: false, action: 'human_handling' };
        }
        // Case 2: Message sent from WhatsApp phone directly (senderName has human name)
        if (sName && !isAiMessage && !sByVal) {
          console.log(`[AI Attendant] Human "${sName}" is handling lead #${leadId} via WhatsApp, IA stopping`);
          return { sent: false, action: 'human_handling' };
        }
      }
    }

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

    // Get ALL recent inbound messages (in case multiple arrived during debounce)
    const recentMsgs = await crmDb.listMessagesByLead(leadId, 30);
    
    // Consolidate recent unprocessed inbound messages into one
    // Find the last AI outbound message timestamp
    const lastAiMsg = [...recentMsgs].reverse().find(m => m.direction === 'outbound' && m.senderName === 'IA Kafka');
    const lastAiTimestamp = lastAiMsg?.timestamp || 0;
    
    // Get all inbound messages AFTER the last AI reply
    const unprocessedInbound = recentMsgs.filter(m => 
      m.direction === 'inbound' && (m.timestamp || 0) > lastAiTimestamp
    );
    
    // Consolidate multiple messages into one context
    let consolidatedMessage = incomingMessage;
    if (unprocessedInbound.length > 1) {
      consolidatedMessage = unprocessedInbound
        .map(m => m.content || '[Midia]')
        .join(' | ');
      console.log(`[AI Attendant] Consolidated ${unprocessedInbound.length} messages for lead #${leadId}`);
    }

    // Build vehicle context from inventory
    let vehicleContext = "";
    const vehicleSearch = collectedData.vehicleInterest || lead.vehicleInterest;
    if (vehicleSearch) {
      const vehicles = await searchVehiclesByTypeAndPrice(
        collectedData.vehicleType,
        collectedData.priceMin,
        collectedData.priceMax,
        vehicleSearch,
        5
      );
      if (vehicles.length > 0) {
        vehicleContext = "\nVEICULOS DISPONIVEIS NO ESTOQUE:\n" + vehicles.map(v =>
          `- ${v.brand} ${v.model} ${v.year || ""} | R$ ${v.price?.toLocaleString("pt-BR") || "consultar"} | ${v.km?.toLocaleString("pt-BR") || "0"} km | ${v.color || ""} | Tipo: ${v.bodyType || "N/A"}`
        ).join("\n");
      }
    }

    // Build chat history (last 20 messages for full context)
    const chatHistory = recentMsgs.slice(-20).map(m => {
      const role = m.direction === "inbound" ? "CLIENTE" : "ATENDENTE";
      const content = m.content || (m.messageType === 'image' ? '[Foto enviada]' : m.messageType === 'audio' || m.messageType === 'ptt' ? '[Audio enviado]' : m.messageType === 'video' ? '[Video enviado]' : '[Midia]');
      return `${role}: ${content}`;
    }).join("\n");

    // Build prompt
    const systemPrompt = buildAttendantPrompt(config, lead, collectedData, vehicleContext, chatHistory);

    // Call LLM
    const aiResp = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `O cliente acabou de enviar: "${consolidatedMessage}"\n\nResponda no formato JSON especificado. LEMBRE-SE: nao repita perguntas ja feitas, analise o historico.` }
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
                  vehicleType: { type: ["string", "null"] },
                  priceMin: { type: ["number", "null"] },
                  priceMax: { type: ["number", "null"] },
                  downPayment: { type: ["number", "null"] },
                  paymentMethod: { type: ["string", "null"] },
                  tradeInVehicle: { type: ["string", "null"] },
                  tradeInPlate: { type: ["string", "null"] },
                  tradeInKm: { type: ["number", "null"] },
                  tradeInDetails: { type: ["string", "null"] },
                  wantsSimulation: { type: "boolean" },
                  wantsFicha: { type: "boolean" },
                  wantsVideoCall: { type: "boolean" },
                  scheduledDate: { type: ["string", "null"] },
                  scheduledTime: { type: ["string", "null"] },
                },
                required: ["customerName", "customerCpf", "customerBirthDate", "customerIncome", "customerEmployer", "customerEmploymentTime", "customerEmail", "customerAddress", "customerCity", "vehicleInterest", "vehicleType", "priceMin", "priceMax", "downPayment", "paymentMethod", "tradeInVehicle", "tradeInPlate", "tradeInKm", "tradeInDetails", "wantsSimulation", "wantsFicha", "wantsVideoCall", "scheduledDate", "scheduledTime"],
                additionalProperties: false,
              },
              sendPhotos: { type: "boolean", description: "Whether to send vehicle photos from inventory" },
              requestTradePhotos: { type: "boolean", description: "Whether requesting trade-in photos/video" },
              nextStage: { type: "string", description: "Next conversation stage" },
              questionAsked: { type: ["string", "null"], description: "Summary of question asked in this response" },
              leadTemperature: { type: "string", description: "hot, warm, or cold based on conversation analysis" },
            },
            required: ["message", "extracted", "sendPhotos", "requestTradePhotos", "nextStage", "questionAsked", "leadTemperature"],
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
      console.error("[AI Attendant] Failed to parse JSON response, using raw text");
      parsed = { message: rawContent.replace(/[{}"\n]/g, '').trim(), extracted: {}, nextStage: 'qualifying', sendPhotos: false, requestTradePhotos: false, questionAsked: null, leadTemperature: 'warm' };
    }

    let responseText = (parsed.message || '').trim();
    if (!responseText) return { sent: false };

    // ===== HARD FILTER: BLOCK FORBIDDEN WORDS =====
    // This is the LAST line of defense - if the LLM still says "vendido", we catch it here
    const forbiddenWords = ['vendido', 'vendida', 'já foi vendido', 'ja foi vendido', 'não temos mais', 'nao temos mais', 'esgotado', 'esgotada', 'indisponivel', 'indisponível', 'saiu do estoque', 'não está disponível', 'nao esta disponivel'];
    const lowerResponse = responseText.toLowerCase();
    const hasForbidden = forbiddenWords.some(w => lowerResponse.includes(w));
    if (hasForbidden) {
      console.log(`[AI Attendant] BLOCKED forbidden word in response for lead #${leadId}: "${responseText.substring(0, 80)}..."`);
      // Replace with safe fallback
      const clientName = collectedData.customerName || lead.name || '';
      const namePrefix = clientName && clientName !== 'Novo Lead' ? `${clientName.split(' ')[0]}, ` : '';
      responseText = `${namePrefix}vou confirmar com a equipe a disponibilidade desse modelo e ja te retorno`;
    }

    // ===== TRANSFER TO SELLER =====
    // If AI decided to transfer to seller (doesn't know how to answer), handle gracefully
    if (parsed.nextStage === 'transfer_to_seller') {
      console.log(`[AI Attendant] Transferring lead #${leadId} to human seller`);
      // The message already contains the transfer text from the AI
    }

    // Merge extracted data with existing collected data (NEVER overwrite with null)
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
    if (extracted.customerCity) updatedData.customerCity = extracted.customerCity;
    if (extracted.vehicleInterest) updatedData.vehicleInterest = extracted.vehicleInterest;
    if (extracted.vehicleType) updatedData.vehicleType = extracted.vehicleType;
    if (extracted.priceMin) updatedData.priceMin = extracted.priceMin;
    if (extracted.priceMax) updatedData.priceMax = extracted.priceMax;
    if (extracted.downPayment) updatedData.downPayment = extracted.downPayment;
    if (extracted.paymentMethod) updatedData.paymentMethod = extracted.paymentMethod;
    if (extracted.tradeInVehicle) updatedData.tradeInVehicle = extracted.tradeInVehicle;
    if (extracted.tradeInPlate) updatedData.tradeInPlate = extracted.tradeInPlate;
    if (extracted.tradeInKm) updatedData.tradeInKm = extracted.tradeInKm;
    if (extracted.tradeInDetails) updatedData.tradeInDetails = extracted.tradeInDetails;
    if (extracted.wantsSimulation) updatedData.wantsSimulation = true;
    if (extracted.wantsFicha) updatedData.wantsFicha = true;
    if (extracted.wantsVideoCall) updatedData.wantsVideoCall = true;
    if (extracted.scheduledDate) updatedData.scheduledDate = extracted.scheduledDate;
    if (extracted.scheduledTime) updatedData.scheduledTime = extracted.scheduledTime;
    
    updatedData.conversationStage = parsed.nextStage || 'qualifying';
    if (!updatedData.customerPhone && phone) updatedData.customerPhone = phone;
    
    // Track questions asked to prevent repetition
    if (parsed.questionAsked) {
      if (!updatedData.questionsAsked) updatedData.questionsAsked = [];
      updatedData.questionsAsked.push(parsed.questionAsked);
      updatedData.lastQuestionAsked = parsed.questionAsked;
    }

    // Update lead temperature from AI analysis
    if (parsed.leadTemperature && ['hot', 'warm', 'cold'].includes(parsed.leadTemperature)) {
      updatedData.leadTemperature = parsed.leadTemperature;
      // Also update lead score in DB
      try {
        await crmDb.updateLead(leadId, { score: parsed.leadTemperature as any });
      } catch { /* ignore */ }
    }

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
        }
      }
    }

    // 2. Create appointment if scheduled
    if (extracted.scheduledDate && config.attendantAutoSchedule) {
      const aptId = await createAiAppointment(leadId, updatedData);
      if (aptId) {
        action = action ? action + ',appointment_created' : 'appointment_created';
      }
    }

    // 3. Distribute to seller if enough data collected and not yet assigned
    if (config.attendantAutoDistribute && lead.sellerId === 0) {
      const hasBasicData = updatedData.customerName && (updatedData.vehicleInterest || lead.vehicleInterest);
      if (hasBasicData) {
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
          }
        } catch (e) {
          console.error("[AI Attendant] Error distributing:", e);
        }
      }
    }

    // === DUPLICATE MESSAGE CHECK ===
    // Check if we already sent a very similar message recently (prevents repetition)
    const recentAiMsgs = await dbConn.execute(
      sql`SELECT content FROM crm_messages WHERE leadId = ${leadId} AND direction = 'outbound' AND senderName = 'IA Kafka' ORDER BY timestamp DESC LIMIT 5`
    );
    const recentAiRaw = recentAiMsgs as any;
    const recentAiRows = Array.isArray(recentAiRaw?.[0]) ? recentAiRaw[0] : recentAiRaw;
    if (recentAiRows && recentAiRows.length > 0) {
      for (const prevMsg of recentAiRows) {
        const prevContent = (prevMsg.content || '').toLowerCase().trim();
        const newContent = responseText.toLowerCase().trim();
        // Exact match or very similar (>80% overlap)
        if (prevContent === newContent) {
          console.log(`[AI Attendant] BLOCKED duplicate message for lead #${leadId}: "${responseText.substring(0, 50)}..."`);
          return { sent: false, action: 'duplicate_blocked' };
        }
        // Check if the core content is the same (first 50 chars match)
        if (prevContent.length > 20 && newContent.length > 20 && prevContent.substring(0, 50) === newContent.substring(0, 50)) {
          console.log(`[AI Attendant] BLOCKED similar message for lead #${leadId}: "${responseText.substring(0, 50)}..."`);
          return { sent: false, action: 'similar_blocked' };
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

      // 4. Send vehicle photos if AI requested it
      if (parsed.sendPhotos) {
        const vType = extracted.vehicleType || updatedData.vehicleType;
        const pMin = extracted.priceMin || updatedData.priceMin;
        const pMax = extracted.priceMax || updatedData.priceMax;
        const vSearch = extracted.vehicleInterest || updatedData.vehicleInterest || lead.vehicleInterest;

        // Search by type + price range (smart search)
        const matchedVehicles = await searchVehiclesByTypeAndPrice(vType, pMin, pMax, vSearch, 5);
        
        if (matchedVehicles.length > 0) {
          // Small delay before sending photos (feels more natural)
          await new Promise(r => setTimeout(r, 2000));
          const sentCount = await sendVehiclePhotos(phone, leadId, matchedVehicles);
          if (sentCount > 0) {
            action = action ? action + `,${sentCount}_photos_sent` : `${sentCount}_photos_sent`;
          }
        } else {
          // No vehicles found - try broader search
          const broadVehicles = await searchVehiclesByTypeAndPrice(vType, undefined, undefined, vSearch, 3);
          if (broadVehicles.length > 0) {
            await new Promise(r => setTimeout(r, 2000));
            const sentCount = await sendVehiclePhotos(phone, leadId, broadVehicles);
            if (sentCount > 0) {
              action = action ? action + `,${sentCount}_photos_sent` : `${sentCount}_photos_sent`;
            }
          } else {
            console.log(`[AI Attendant] No vehicles found for type=${vType}, search=${vSearch}, price=${pMin}-${pMax}`);
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
