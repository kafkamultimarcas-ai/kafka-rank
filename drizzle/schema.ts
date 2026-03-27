import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Vendedores (sellers)
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  department: varchar("department", { length: 100 }).default("vendas"), // vendas, pre_vendas, fei, consignacao, despachante
  active: boolean("active").default(true).notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  username: varchar("username", { length: 100 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  lastAccess: bigint("lastAccess", { mode: "number" }),
  sellerRole: varchar("sellerRole", { length: 20 }).default("vendedor"), // vendedor, gerente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// Permissões do gerente (quais módulos pode acessar)
export const managerPermissions = mysqlTable("manager_permissions", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(), // gerente
  module: varchar("module", { length: 50 }).notNull(), // ranking, vendas, agendamentos, treinamentos, consignacao, fei, pos_venda, financeiro, marketing, crm, metas, sorteio, documentos
  canView: boolean("canView").default(true).notNull(),
  canEdit: boolean("canEdit").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ManagerPermission = typeof managerPermissions.$inferSelect;
export type InsertManagerPermission = typeof managerPermissions.$inferInsert;

// Competições - agora com categoria para multi-setor
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("vendas").notNull(), // vendas, pre_vendas, fei, consignacao, despachante, feirao
  type: mysqlEnum("type", ["individual", "team", "group"]).default("individual").notNull(),
  status: mysqlEnum("status", ["draft", "active", "finished"]).default("draft").notNull(),
  pointsPerSale: int("pointsPerSale").default(1).notNull(),
  goalTarget: int("goalTarget"), // meta (ex: X carros consignados, X transferências)
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  endDate: bigint("endDate", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;

// Equipes dentro de competições
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3B82F6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Participantes de competição (liga vendedor à competição e opcionalmente a uma equipe)
export const competitionParticipants = mysqlTable("competition_participants", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  sellerId: int("sellerId").notNull(),
  teamId: int("teamId"),
  points: int("points").default(0).notNull(),
  salesCount: int("salesCount").default(0).notNull(),
});

export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;
export type InsertCompetitionParticipant = typeof competitionParticipants.$inferInsert;

// Vendas registradas (vendas de veículos - setor vendas/feirão)
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  description: varchar("description", { length: 500 }),
  vehicleModel: varchar("vehicleModel", { length: 255 }),
  value: int("value").default(0),
  leadSource: varchar("leadSource", { length: 50 }), // 'lead_loja' ou 'lead_vendedor'
  customerPhone: varchar("customerPhone", { length: 20 }), // telefone do comprador para cruzar com agendamento
  sdrRecordId: int("sdrRecordId"), // vínculo com agendamento de origem (preenchido automaticamente pelo cruzamento de telefone)
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// Registros F&I (Financiamento e Seguros)
export const feiRecords = mysqlTable("fei_records", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  customerCpf: varchar("customerCpf", { length: 14 }),
  vehiclePlate: varchar("vehiclePlate", { length: 10 }),
  bankName: varchar("bankName", { length: 255 }),
  financedValue: int("financedValue").default(0), // valor financiado em centavos
  returnType: varchar("returnType", { length: 10 }), // R1, R2, R3, R4, R5
  paymentDate: bigint("paymentDate", { mode: "number" }), // data que o banco pagou a ficha
  notes: text("notes"), // observações do F&I
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FeiRecord = typeof feiRecords.$inferSelect;
export type InsertFeiRecord = typeof feiRecords.$inferInsert;

// Registros de Consignação
export const consignmentRecords = mysqlTable("consignment_records", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  vehiclePlate: varchar("vehiclePlate", { length: 10 }),
  vehicleModel: varchar("vehicleModel", { length: 255 }),
  ownerName: varchar("ownerName", { length: 255 }),
  ownerPhone: varchar("ownerPhone", { length: 20 }), // telefone do proprietário
  entryDate: bigint("entryDate", { mode: "number" }).notNull(), // data de entrada no pátio
  exitDate: bigint("exitDate", { mode: "number" }), // data de saída do pátio (preenchido quando sai)
  validAfterDays: int("validAfterDays").default(7).notNull(), // dias mínimos no pátio
  isValid: boolean("isValid").default(false).notNull(), // se já completou os 7 dias
  hasAuction: boolean("hasAuction").default(false), // se o carro tem leilão
  vehicleStatus: varchar("vehicleStatus", { length: 20 }).default("quitado"), // quitado ou financiado
  payoffValue: int("payoffValue"), // valor de quitação em centavos (quando financiado)
  costValue: int("costValue"), // valor de custo que o consignado deixou (centavos)
  notes: text("notes"), // observações adicionais
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsignmentRecord = typeof consignmentRecords.$inferSelect;
export type InsertConsignmentRecord = typeof consignmentRecords.$inferInsert;

// Registros de Despachante
export const dispatchRecords = mysqlTable("dispatch_records", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  vehiclePlate: varchar("vehiclePlate", { length: 10 }),
  documentType: varchar("documentType", { length: 100 }), // transferência, etc.
  customerPaid: boolean("customerPaid").default(false).notNull(), // se o cliente pagou (bônus)
  transferValue: int("transferValue").default(0), // valor da transferência em centavos
  points: int("points").default(1).notNull(),
  bonusPoints: int("bonusPoints").default(0).notNull(), // pontos bônus se cliente pagou
  // Documento emitido (preenchido quando despachante marca como transferido)
  documentUrl: text("documentUrl"), // URL do documento emitido (S3)
  documentKey: varchar("documentKey", { length: 500 }), // chave S3 do documento
  transferredAt: bigint("transferredAt", { mode: "number" }), // quando foi transferido
  // Placa do veículo vendido e vendedor original (para vincular ao vendedor)
  originalSellerId: int("originalSellerId"), // vendedor que vendeu o carro (para notificar)
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DispatchRecord = typeof dispatchRecords.$inferSelect;
export type InsertDispatchRecord = typeof dispatchRecords.$inferInsert;

// Mini treinamentos
export const trainings = mysqlTable("trainings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  videoUrl: text("videoUrl"), // URL externa (YouTube, Vimeo, etc.) ou URL do S3
  videoKey: varchar("videoKey", { length: 500 }), // chave S3 se foi upload direto
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Training = typeof trainings.$inferSelect;
export type InsertTraining = typeof trainings.$inferInsert;

// Planos de ação por vendedor
export const actionPlans = mysqlTable("action_plans", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  dueDate: bigint("dueDate", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = typeof actionPlans.$inferInsert;

// Frases motivacionais
export const motivationalQuotes = mysqlTable("motivational_quotes", {
  id: int("id").autoincrement().primaryKey(),
  dayOfYear: int("dayOfYear"),
  quote: text("quote").notNull(),
  author: varchar("author", { length: 255 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

export type MotivationalQuote = typeof motivationalQuotes.$inferSelect;
export type InsertMotivationalQuote = typeof motivationalQuotes.$inferInsert;

// Notificações
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId"), // null = notificação para admin/gerente
  targetType: varchar("targetType", { length: 20 }).default("seller").notNull(), // 'seller', 'admin', 'all'
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }), // URL para ação direta
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Configurações do app (código de acesso, etc.)
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

// Registros de Pré-Vendas / SDR / Agendamentos
export const sdrRecords = mysqlTable("sdr_records", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  type: mysqlEnum("type", ["agendamento", "lead_convertido"]).notNull(),
  ticketNumber: varchar("ticketNumber", { length: 20 }), // número automático #A001, #A002...
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerEmail: varchar("customerEmail", { length: 320 }), // email opcional
  vehicleInterest: varchar("vehicleInterest", { length: 255 }),
  source: varchar("source", { length: 100 }),
  scheduledDate: bigint("scheduledDate", { mode: "number" }),
  converted: boolean("converted").default(false).notNull(),
  isFeirão: boolean("isFeirão").default(false).notNull(), // flag para agendamentos de feirão
  notes: text("notes"),
  // Fluxo de comparecimento
  attendanceStatus: mysqlEnum("attendanceStatus", ["pending", "attended", "no_show", "approved", "rejected"]).default("pending"), // pending=aguardando, attended=vendedor marcou que veio, no_show=não compareceu, approved=gerente aprovou, rejected=gerente reprovou
  attendanceMarkedAt: bigint("attendanceMarkedAt", { mode: "number" }), // quando vendedor marcou comparecimento
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SdrRecord = typeof sdrRecords.$inferSelect;
export type InsertSdrRecord = typeof sdrRecords.$inferInsert;

// Metas da Loja e Individuais
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["store", "individual"]).notNull(), // loja geral ou individual
  sellerId: int("sellerId"), // null para meta da loja, preenchido para individual
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  category: varchar("category", { length: 50 }).default("vendas").notNull(), // vendas, fei, consignacao, despachante, pre_vendas
  targetValue: int("targetValue").notNull(), // meta (ex: 10 carros, 5 fichas)
  currentValue: int("currentValue").default(0).notNull(), // progresso atual
  bonusDescription: varchar("bonusDescription", { length: 500 }), // ex: "R$ 500 bônus"
  bonusValue: int("bonusValue").default(0), // valor do bônus em centavos
  achieved: boolean("achieved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

// Gerentes (login por senha separado)
export const managers = mysqlTable("managers", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Manager = typeof managers.$inferSelect;
export type InsertManager = typeof managers.$inferInsert;

// Push Subscriptions para notificações push
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  sellerId: int("sellerId"), // opcional: associar a um vendedor
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ===== CRM MODULE =====

// Admins (login próprio, independente do Manus OAuth)
export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["owner", "admin"]).default("admin").notNull(),
  permissions: text("permissions"), // JSON: {vendas:true, pre_vendas:true, consignacao:false, fei:false, marketing:false, financeiro:false, estoque:false, configuracoes:false, gerenciar_admins:false}
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

// CRM Leads - clientes/prospects
export const crmLeads = mysqlTable("crm_leads", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(), // vendedor responsável
  department: varchar("department", { length: 50 }).default("vendas").notNull(), // vendas, pre_vendas, fei, consignacao
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  vehicleInterest: varchar("vehicleInterest", { length: 255 }), // veículo de interesse
  vehiclePlate: varchar("vehiclePlate", { length: 10 }), // placa do veículo atual (troca)
  source: varchar("source", { length: 100 }).default("manual").notNull(), // manual, whatsapp, olx, webmotors, socarrao, facebook, instagram, trafego_pago, indicacao, loja
  stage: varchar("stage", { length: 100 }).default("novo").notNull(), // etapa do pipeline
  score: mysqlEnum("score", ["hot", "warm", "cold"]).default("warm").notNull(), // temperatura do lead
  notes: text("notes"), // observações gerais
  nextContactDate: bigint("nextContactDate", { mode: "number" }), // data do próximo contato agendado
  lastContactDate: bigint("lastContactDate", { mode: "number" }), // último contato
  archived: boolean("archived").default(false).notNull(),
  convertedToSale: boolean("convertedToSale").default(false).notNull(),
  saleValue: int("saleValue").default(0), // valor da venda em centavos (quando convertido)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = typeof crmLeads.$inferInsert;

// CRM Pipeline Stages - etapas configuráveis por departamento
export const crmPipelineStages = mysqlTable("crm_pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  department: varchar("department", { length: 50 }).notNull(), // vendas, pre_vendas, fei, consignacao
  name: varchar("name", { length: 100 }).notNull(),
  displayOrder: int("displayOrder").notNull(),
  color: varchar("color", { length: 20 }).default("#3B82F6").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // etapa inicial padrão
  isFinal: boolean("isFinal").default(false).notNull(), // etapa final (venda fechada, convertido, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmPipelineStage = typeof crmPipelineStages.$inferSelect;
export type InsertCrmPipelineStage = typeof crmPipelineStages.$inferInsert;

// CRM Activities - timeline de atividades do lead
export const crmActivities = mysqlTable("crm_activities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  sellerId: int("sellerId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // ligacao, whatsapp, visita, email, observacao, mudanca_etapa, agendamento
  description: text("description"),
  metadata: text("metadata"), // JSON com dados extras (ex: etapa anterior/nova, resultado da ligação)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmActivity = typeof crmActivities.$inferSelect;
export type InsertCrmActivity = typeof crmActivities.$inferInsert;

// CRM Inventory - estoque de veículos
export const crmInventory = mysqlTable("crm_inventory", {
  id: int("id").autoincrement().primaryKey(),
  brand: varchar("brand", { length: 100 }).notNull(), // marca
  model: varchar("model", { length: 255 }).notNull(), // modelo
  year: varchar("year", { length: 10 }), // ano (ex: "2023/2024")
  plate: varchar("plate", { length: 10 }),
  color: varchar("color", { length: 50 }),
  mileage: int("mileage").default(0), // quilometragem
  fuelType: varchar("fuelType", { length: 50 }), // flex, gasolina, diesel, elétrico, híbrido
  transmission: varchar("transmission", { length: 50 }), // manual, automático, CVT
  price: int("price").default(0).notNull(), // preço em centavos
  costPrice: int("costPrice").default(0), // preço de custo em centavos
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  status: mysqlEnum("status", ["available", "reserved", "sold", "consigned"]).default("available").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmInventory = typeof crmInventory.$inferSelect;
export type InsertCrmInventory = typeof crmInventory.$inferInsert;

// CRM Inventory Alerts - alertas quando veículo entra e tem cliente interessado
export const crmInventoryAlerts = mysqlTable("crm_inventory_alerts", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId").notNull(),
  leadId: int("leadId").notNull(),
  sellerId: int("sellerId").notNull(),
  notified: boolean("notified").default(false).notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmInventoryAlert = typeof crmInventoryAlerts.$inferSelect;
export type InsertCrmInventoryAlert = typeof crmInventoryAlerts.$inferInsert;

// CRM Integration Config - configurações de integrações externas
export const crmIntegrations = mysqlTable("crm_integrations", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // whatsapp, email_parser, sig, olx, webmotors, socarrao, facebook, webhook
  name: varchar("name", { length: 255 }).notNull(),
  config: text("config"), // JSON com configurações (tokens, URLs, etc.)
  apiToken: varchar("apiToken", { length: 500 }), // token de autenticação para API pública
  active: boolean("active").default(true).notNull(),
  lastSync: bigint("lastSync", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmIntegration = typeof crmIntegrations.$inferSelect;
export type InsertCrmIntegration = typeof crmIntegrations.$inferInsert;

// CRM Campaigns - campanhas de disparo (WhatsApp, SMS)
export const crmCampaigns = mysqlTable("crm_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(), // mensagem com variáveis {nome}, {veiculo}
  filters: text("filters"), // JSON com filtros (origem, período, interesse, etc.)
  channel: varchar("channel", { length: 50 }).default("whatsapp").notNull(), // whatsapp, sms
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "cancelled"]).default("draft").notNull(),
  scheduledDate: bigint("scheduledDate", { mode: "number" }),
  sentCount: int("sentCount").default(0).notNull(),
  totalTargets: int("totalTargets").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmCampaign = typeof crmCampaigns.$inferSelect;
export type InsertCrmCampaign = typeof crmCampaigns.$inferInsert;

// CRM Message Templates - templates de mensagem WhatsApp
export const crmMessageTemplates = mysqlTable("crm_message_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // primeiro_contato, follow_up, feirao, veiculo_disponivel, pos_venda, aniversario
  message: text("message").notNull(), // com variáveis {nome}, {veiculo}, {vendedor}, {loja}
  department: varchar("department", { length: 50 }).default("vendas").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmMessageTemplate = typeof crmMessageTemplates.$inferSelect;
export type InsertCrmMessageTemplate = typeof crmMessageTemplates.$inferInsert;

// CRM Follow-up Sequences - sequências automáticas de follow-up
export const crmFollowUpTasks = mysqlTable("crm_follow_up_tasks", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  sellerId: int("sellerId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // whatsapp, ligacao, visita, email
  description: text("description"),
  dueDate: bigint("dueDate", { mode: "number" }).notNull(), // timestamp de quando deve ser feito
  completed: boolean("completed").default(false).notNull(),
  completedAt: bigint("completedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmFollowUpTask = typeof crmFollowUpTasks.$inferSelect;
export type InsertCrmFollowUpTask = typeof crmFollowUpTasks.$inferInsert;

// CRM Lead Distribution - configuração de distribuição round-robin
export const crmLeadDistribution = mysqlTable("crm_lead_distribution", {
  id: int("id").autoincrement().primaryKey(),
  department: varchar("department", { length: 50 }).notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  lastAssignedSellerId: int("lastAssignedSellerId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmLeadDistribution = typeof crmLeadDistribution.$inferSelect;
export type InsertCrmLeadDistribution = typeof crmLeadDistribution.$inferInsert;

// ===== MÓDULO FINANCEIRO =====

// Categorias financeiras (personalizáveis)
export const finCategories = mysqlTable("fin_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["expense", "income"]).notNull(),
  icon: varchar("icon", { length: 50 }).default("receipt"),
  color: varchar("color", { length: 20 }).default("#6b7280"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FinCategory = typeof finCategories.$inferSelect;
export type InsertFinCategory = typeof finCategories.$inferInsert;

// Transações financeiras (contas a pagar e receber)
export const finTransactions = mysqlTable("fin_transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["payable", "receivable"]).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: bigint("dueDate", { mode: "number" }).notNull(), // timestamp vencimento
  paidDate: bigint("paidDate", { mode: "number" }), // timestamp pagamento
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  categoryId: int("categoryId"),
  supplier: varchar("supplier", { length: 255 }), // fornecedor ou cliente
  barcode: varchar("barcode", { length: 100 }), // código de barras do boleto
  notes: text("notes"),
  receiptUrl: text("receiptUrl"), // URL do comprovante no S3
  receiptKey: varchar("receiptKey", { length: 500 }),
  recurrence: mysqlEnum("recurrence", ["none", "monthly", "weekly", "yearly"]).default("none"),
  installmentNumber: int("installmentNumber"), // parcela atual
  installmentTotal: int("installmentTotal"), // total de parcelas
  createdBy: int("createdBy"), // admin que criou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FinTransaction = typeof finTransactions.$inferSelect;
export type InsertFinTransaction = typeof finTransactions.$inferInsert;


// ===== MÓDULO PÓS-VENDA =====

// Oficinas parceiras
export const pvOficinas = mysqlTable("pv_oficinas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 500 }),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PvOficina = typeof pvOficinas.$inferSelect;
export type InsertPvOficina = typeof pvOficinas.$inferInsert;

// Chamados de pós-venda
export const pvChamados = mysqlTable("pv_chamados", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 20 }).notNull(), // #PV001, #PV002...
  // Dados do cliente
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  clienteTelefone: varchar("clienteTelefone", { length: 20 }),
  // Dados do veículo
  carroModelo: varchar("carroModelo", { length: 255 }).notNull(),
  carroPlaca: varchar("carroPlaca", { length: 10 }),
  // Problema
  problemaRelatado: text("problemaRelatado").notNull(),
  observacoes: text("observacoes"),
  servicoRealizado: text("servicoRealizado"), // anotação do pós-venda sobre o que está sendo feito
  // Responsáveis
  vendedorId: int("vendedorId").notNull(), // quem abriu o chamado
  responsavelPvId: int("responsavelPvId"), // quem do pós-venda pegou
  oficinaId: int("oficinaId"), // oficina parceira vinculada
  oficinaNome: varchar("oficinaNome", { length: 255 }), // caso digite manualmente
  // Status e datas
  status: mysqlEnum("status", ["aberto", "agendado", "em_servico", "finalizado", "entregue", "cancelado"]).default("aberto").notNull(),
  dataEntradaAgendada: bigint("dataEntradaAgendada", { mode: "number" }), // quando cliente vai trazer
  dataEntradaReal: bigint("dataEntradaReal", { mode: "number" }), // quando carro chegou de fato
  prazoEntrega: bigint("prazoEntrega", { mode: "number" }), // prazo combinado para devolver ao cliente
  dataEntregaReal: bigint("dataEntregaReal", { mode: "number" }), // quando de fato entregou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PvChamado = typeof pvChamados.$inferSelect;
export type InsertPvChamado = typeof pvChamados.$inferInsert;

// Gastos de pós-venda (vinculados ao chamado)
export const pvGastos = mysqlTable("pv_gastos", {
  id: int("id").autoincrement().primaryKey(),
  chamadoId: int("chamadoId").notNull(),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  valor: decimal("valor", { precision: 12, scale: 2 }).notNull(), // valor em reais
  fotoNotaUrl: text("fotoNotaUrl"), // foto da nota de serviço (S3)
  fotoNotaKey: varchar("fotoNotaKey", { length: 500 }),
  statusAprovacao: mysqlEnum("statusAprovacao", ["pendente", "autorizado", "recusado", "pago"]).default("pendente").notNull(),
  autorizadoPor: varchar("autorizadoPor", { length: 255 }), // nome de quem autorizou
  autorizadoEm: bigint("autorizadoEm", { mode: "number" }),
  pagoEm: bigint("pagoEm", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PvGasto = typeof pvGastos.$inferSelect;
export type InsertPvGasto = typeof pvGastos.$inferInsert;

// Histórico de ações no chamado (timeline)
export const pvHistorico = mysqlTable("pv_historico", {
  id: int("id").autoincrement().primaryKey(),
  chamadoId: int("chamadoId").notNull(),
  acao: varchar("acao", { length: 100 }).notNull(), // abertura, agendamento, entrada, servico, gasto, finalizacao, entrega
  descricao: text("descricao").notNull(),
  usuario: varchar("usuario", { length: 255 }).notNull(), // quem fez a ação
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PvHistorico = typeof pvHistorico.$inferSelect;
export type InsertPvHistorico = typeof pvHistorico.$inferInsert;

// Orçamentos de pós-venda (vinculados ao chamado)
export const pvOrcamentos = mysqlTable("pv_orcamentos", {
  id: int("id").autoincrement().primaryKey(),
  chamadoId: int("chamadoId").notNull(),
  titulo: varchar("titulo", { length: 500 }).notNull(), // ex: "Orçamento Oficina X - Ar condicionado"
  descricao: text("descricao"), // detalhes gerais
  fotoUrl: text("fotoUrl"), // foto/scanner do orçamento (S3)
  fotoKey: varchar("fotoKey", { length: 500 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 2 }).default("0"), // soma dos itens
  statusAprovacao: mysqlEnum("statusAprovacao", ["pendente", "aprovado", "reprovado", "pago"]).default("pendente").notNull(),
  aprovadoPor: varchar("aprovadoPor", { length: 255 }), // quem aprovou (financeiro)
  aprovadoEm: bigint("aprovadoEm", { mode: "number" }),
  motivoReprovacao: text("motivoReprovacao"), // motivo se reprovado
  criadoPor: varchar("criadoPor", { length: 255 }).notNull(), // quem lançou (pós-venda)
  criadoPorId: int("criadoPorId"), // sellerId de quem lançou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PvOrcamento = typeof pvOrcamentos.$inferSelect;
export type InsertPvOrcamento = typeof pvOrcamentos.$inferInsert;

// Itens do orçamento (peças e serviços)
export const pvOrcamentoItens = mysqlTable("pv_orcamento_itens", {
  id: int("id").autoincrement().primaryKey(),
  orcamentoId: int("orcamentoId").notNull(),
  tipo: mysqlEnum("tipo", ["peca", "servico", "outro"]).default("peca").notNull(),
  descricao: varchar("descricao", { length: 500 }).notNull(), // nome da peça ou serviço
  quantidade: int("quantidade").default(1).notNull(),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 2 }).notNull(),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 2 }).notNull(), // qtd * valorUnitario
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PvOrcamentoItem = typeof pvOrcamentoItens.$inferSelect;
export type InsertPvOrcamentoItem = typeof pvOrcamentoItens.$inferInsert;

// ============ MARKETING ============

// Estratégias de Marketing
export const mktStrategies = mysqlTable("mkt_strategies", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("geral"), // geral, redes_sociais, trafego_pago, eventos, parcerias
  status: mysqlEnum("status", ["planejada", "em_andamento", "concluida", "cancelada"]).default("planejada").notNull(),
  startDate: bigint("startDate", { mode: "number" }),
  endDate: bigint("endDate", { mode: "number" }),
  budget: int("budget"), // orçamento em centavos
  responsibleId: int("responsibleId"), // seller do setor marketing
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MktStrategy = typeof mktStrategies.$inferSelect;
export type InsertMktStrategy = typeof mktStrategies.$inferInsert;

// Tarefas de Marketing
export const mktTasks = mysqlTable("mkt_tasks", {
  id: int("id").autoincrement().primaryKey(),
  strategyId: int("strategyId"), // pode ser null se tarefa avulsa
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida", "cancelada"]).default("pendente").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  dueDate: bigint("dueDate", { mode: "number" }),
  assignedToId: int("assignedToId"), // seller do setor marketing
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MktTask = typeof mktTasks.$inferSelect;
export type InsertMktTask = typeof mktTasks.$inferInsert;

// Configuração do IAM (Agente IA) pelo Admin
export const iamConfig = mysqlTable("iam_config", {
  id: int("id").autoincrement().primaryKey(),
  // Contexto do dia
  dayContext: mysqlEnum("dayContext", [
    "normal", "feirao", "movimento_fraco", "meta_apertada", "fim_de_mes", 
    "inicio_de_mes", "promocao", "lancamento", "treinamento"
  ]).default("normal").notNull(),
  dayContextCustom: text("dayContextCustom"), // texto livre para contexto personalizado
  // Mensagem motivacional personalizada (substitui a aleatória)
  customGreeting: text("customGreeting"),
  // Instruções extras para o IAM
  extraInstructions: text("extraInstructions"), // ex: "Foque em vender SUVs esta semana", "Cobrar anúncios no Facebook"
  // Alertas/avisos para vendedores
  alertMessage: text("alertMessage"), // ex: "Feirão neste sábado! Todos confirmem presença"
  alertActive: boolean("alertActive").default(false).notNull(),
  // Foco da semana
  weeklyFocus: text("weeklyFocus"), // ex: "Captar 10 carros consignados", "Bater meta de agendamentos"
  // Taxa de financiamento (% ao mês) - configurável pelo admin
  financingRate: decimal("financingRate", { precision: 5, scale: 2 }).default("2.20").notNull(),
  // Ativo
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: varchar("updatedBy", { length: 255 }),
});
export type IamConfig = typeof iamConfig.$inferSelect;
export type InsertIamConfig = typeof iamConfig.$inferInsert;

// ===== DOCUMENTOS DE VENDA (Vendedor → Despachante) =====
// Cada venda aprovada precisa de CNH e Comprovante de Residência do cliente
export const saleDocuments = mysqlTable("sale_documents", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(), // venda vinculada
  sellerId: int("sellerId").notNull(), // vendedor que enviou
  // Dados do cliente
  clienteNome: varchar("clienteNome", { length: 255 }),
  vehiclePlate: varchar("vehiclePlate", { length: 10 }),
  vehicleModel: varchar("vehicleModel", { length: 255 }),
  // CNH do cliente
  cnhUrl: text("cnhUrl"), // URL no S3
  cnhKey: varchar("cnhKey", { length: 500 }),
  // Comprovante de Residência
  comprovanteUrl: text("comprovanteUrl"), // URL no S3
  comprovanteKey: varchar("comprovanteKey", { length: 500 }),
  // Status do fluxo
  docStatus: mysqlEnum("docStatus", ["pendente", "parcial", "completo"]).default("pendente").notNull(),
  // Transferência pelo despachante
  dispatchStatus: mysqlEnum("dispatchStatus", ["aguardando_docs", "docs_enviados", "em_transferencia", "transferido"]).default("aguardando_docs").notNull(),
  dispatchRecordId: int("dispatchRecordId"), // vincula ao registro de despachante quando criado
  documentoEmitidoUrl: text("documentoEmitidoUrl"), // documento emitido pelo despachante (S3)
  documentoEmitidoKey: varchar("documentoEmitidoKey", { length: 500 }),
  transferredAt: bigint("transferredAt", { mode: "number" }), // quando despachante concluiu transferência
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SaleDocument = typeof saleDocuments.$inferSelect;
export type InsertSaleDocument = typeof saleDocuments.$inferInsert;


// ==================== MESA DE CRÉDITO / FINANCIAMENTO ====================

export const BANCOS_FINANCIAMENTO = [
  "Santander", "Bradesco", "Itaú", "Pan", "C6", "Safra", "BBC", "Omni",
  "Daycoval", "BV", "Ailos", "Sicoob", "Listo", "Carbank", "Porto Seguro"
] as const;

export const fichasFinanciamento = mysqlTable("fichas_financiamento", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(), // vendedor que enviou
  competitionId: int("competitionId"),
  // Status da ficha na fila
  status: mysqlEnum("status", ["na_fila", "em_analise", "aprovado", "recusado", "parcial"]).default("na_fila").notNull(),
  // Dados do veículo
  veiculo: varchar("veiculo", { length: 255 }),
  placa: varchar("placa", { length: 10 }),
  anoModelo: varchar("anoModelo", { length: 20 }),
  valorFipe: int("valorFipe"), // centavos
  valorFinanciado: int("valorFinanciado"), // centavos
  // Dados pessoais do cliente
  nomeCompleto: varchar("nomeCompleto", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 20 }).notNull(),
  rg: varchar("rg", { length: 30 }),
  dataNascimento: varchar("dataNascimento", { length: 20 }),
  estadoCivil: varchar("estadoCivil", { length: 50 }),
  nomeMae: varchar("nomeMae", { length: 255 }),
  nomePai: varchar("nomePai", { length: 255 }),
  cidadeNasceu: varchar("cidadeNasceu", { length: 255 }),
  email: varchar("email_ficha", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  cep: varchar("cep", { length: 15 }),
  endereco: text("endereco"),
  profissao: varchar("profissao", { length: 255 }),
  renda: varchar("renda", { length: 100 }),
  localTrabalho: varchar("localTrabalho", { length: 255 }),
  referenciaNome: varchar("referenciaNome", { length: 255 }),
  referenciaTelefone: varchar("referenciaTelefone", { length: 30 }),
  // Foto CNH/RG
  cnhFotoUrl: text("cnhFotoUrl"),
  cnhFotoKey: varchar("cnhFotoKey", { length: 500 }),
  // Observações do vendedor (bancos já tentados, etc)
  observacoesVendedor: text("observacoesVendedor"),
  // Observações do F&I
  observacoesFei: text("observacoesFei"),
  // Quem do F&I está analisando
  feiResponsavelId: int("feiResponsavelId"),
  feiResponsavelNome: varchar("feiResponsavelNome", { length: 255 }),
  // Timestamps de controle
  inicioAnalise: bigint("inicioAnalise", { mode: "number" }), // quando F&I pegou a ficha
  fimAnalise: bigint("fimAnalise", { mode: "number" }), // quando F&I finalizou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FichaFinanciamento = typeof fichasFinanciamento.$inferSelect;
export type InsertFichaFinanciamento = typeof fichasFinanciamento.$inferInsert;

export const fichaBancos = mysqlTable("ficha_bancos", {
  id: int("id").autoincrement().primaryKey(),
  fichaId: int("fichaId").notNull(),
  banco: varchar("banco", { length: 100 }).notNull(),
  status: mysqlEnum("status_banco", ["pendente", "em_analise", "aprovado", "recusado"]).default("pendente").notNull(),
  observacao: text("observacao"),
  valorParcela: int("valorParcela"), // centavos
  qtdParcelas: int("qtdParcelas"),
  taxaJuros: varchar("taxaJuros", { length: 20 }),
  tentadoPorVendedor: boolean("tentadoPorVendedor").default(false), // vendedor já tentou nesse banco
  atualizadoPor: varchar("atualizadoPor", { length: 255 }),
  atualizadoEm: bigint("atualizadoEm", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FichaBanco = typeof fichaBancos.$inferSelect;
export type InsertFichaBanco = typeof fichaBancos.$inferInsert;

// Estoque de veículos (sincronizado do site kafkamultimarcas.com.br)
export const inventoryVehicles = mysqlTable("inventory_vehicles", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 20 }).notNull(), // ID do veículo no site externo
  brand: varchar("brand", { length: 100 }).notNull(), // Volkswagen, Ford, etc.
  model: varchar("model", { length: 100 }).notNull(), // Saveiro, Ranger, etc.
  version: varchar("version", { length: 255 }), // ROBUST TOTAL FLEX, XLS 4X4, etc.
  motor: varchar("motor", { length: 50 }), // 1.6, 2.0, etc.
  year: int("year"), // 2025
  color: varchar("color", { length: 50 }), // Branco, Prata, etc.
  fuel: varchar("fuel", { length: 50 }), // Flex, Diesel, Gasolina
  km: int("km").default(0), // quilometragem
  price: int("price").default(0), // preço em reais inteiros
  photoUrl: text("photoUrl"), // URL da foto principal
  photos: text("photos"), // JSON array de URLs de fotos
  optionals: text("optionals"), // JSON array de opcionais
  externalUrl: text("externalUrl"), // link para o veículo no site original
  slug: varchar("slug", { length: 500 }), // slug da URL original
  bodyType: varchar("bodyType", { length: 50 }), // Hatch, Sedan, SUV, Picape, etc.
  transmission: varchar("transmission", { length: 50 }), // Manual, Automático
  plate: varchar("plate", { length: 10 }), // placa do veículo
  doors: varchar("doors", { length: 5 }), // número de portas
  fipePrice: int("fipePrice").default(0), // preço FIPE em reais inteiros
  offerPrice: int("offerPrice").default(0), // preço de oferta em reais inteiros
  vehicleState: varchar("vehicleState", { length: 20 }), // novo, usado
  category: varchar("category", { length: 50 }), // Carro/Camionetas, Moto
  observation: text("observation"), // observações do veículo
  status: mysqlEnum("inventory_status", ["available", "reserved", "sold"]).default("available").notNull(),
  soldBySellerId: int("soldBySellerId"), // vendedor que vendeu (quando status = sold)
  soldAt: bigint("soldAt", { mode: "number" }), // data da venda
  lastSyncedAt: bigint("lastSyncedAt", { mode: "number" }), // última sincronização
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InventoryVehicle = typeof inventoryVehicles.$inferSelect;
export type InsertInventoryVehicle = typeof inventoryVehicles.$inferInsert;

// Log de sincronização do estoque
export const inventorySyncLogs = mysqlTable("inventory_sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("sync_status", ["success", "error"]).notNull(),
  vehiclesFound: int("vehiclesFound").default(0),
  vehiclesAdded: int("vehiclesAdded").default(0),
  vehiclesUpdated: int("vehiclesUpdated").default(0),
  vehiclesRemoved: int("vehiclesRemoved").default(0),
  errorMessage: text("errorMessage"),
  duration: int("duration").default(0), // duração em ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InventorySyncLog = typeof inventorySyncLogs.$inferSelect;
export type InsertInventorySyncLog = typeof inventorySyncLogs.$inferInsert;

// Log de disparos em massa WhatsApp
export const crmBulkSendLogs = mysqlTable("crm_bulk_send_logs", {
  id: int("id").autoincrement().primaryKey(),
  message: text("message").notNull(),
  totalRecipients: int("totalRecipients").notNull(),
  sent: int("sent").default(0),
  failed: int("failed").default(0),
  errors: text("errors"),
  createdAt: bigint("createdAt", { mode: "number" }),
});
export type CrmBulkSendLog = typeof crmBulkSendLogs.$inferSelect;

// CRM Messages - histórico de mensagens WhatsApp por lead
export const crmMessages = mysqlTable("crm_messages", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(), // referência ao lead
  phone: varchar("phone", { length: 20 }).notNull(), // telefone do contato
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(), // recebida ou enviada
  messageType: varchar("messageType", { length: 20 }).default("text").notNull(), // text, image, audio, video, document
  content: text("content"), // texto da mensagem
  mediaUrl: text("mediaUrl"), // URL da mídia (imagem, áudio, vídeo, documento)
  senderName: varchar("senderName", { length: 255 }), // nome do remetente
  sentBy: int("sentBy"), // sellerId de quem enviou (null se recebida)
  zapiMessageId: varchar("zapiMessageId", { length: 255 }), // ID da mensagem na Z-API
  timestamp: bigint("timestamp", { mode: "number" }).notNull(), // timestamp da mensagem
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = typeof crmMessages.$inferInsert;
