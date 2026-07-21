import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, decimal, uniqueIndex, index } from "drizzle-orm/mysql-core";

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_users_tenant").on(table.tenantId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Vendedores (sellers)
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  competitionPhotoUrl: text("competitionPhotoUrl"), // foto separada para competição (não altera a principal)
  competitionPhotoKey: varchar("competitionPhotoKey", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }).notNull(),
  department: varchar("department", { length: 100 }).default("vendas"), // vendas, pre_vendas, fei, consignacao, despachante
  active: boolean("active").default(true).notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  username: varchar("username", { length: 100 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  inviteToken: varchar("inviteToken", { length: 64 }),
  lastAccess: bigint("lastAccess", { mode: "number" }),
  sellerRole: varchar("sellerRole", { length: 20 }).default("vendedor"),
  leadReceiveBlocked: boolean("leadReceiveBlocked").default(false).notNull(),
  leadBanUntil: bigint("leadBanUntil", { mode: "number" }),
  leadBanReason: varchar("leadBanReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantUsernameIdx: uniqueIndex("sellers_tenant_username_idx").on(table.tenantId, table.username),
  emailIdx: uniqueIndex("sellers_email_idx").on(table.email),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_manager_permissions_tenant").on(table.tenantId),
}));

export type ManagerPermission = typeof managerPermissions.$inferSelect;
export type InsertManagerPermission = typeof managerPermissions.$inferInsert;

// Competições - agora com categoria para multi-setor
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("vendas").notNull(), // vendas, pre_vendas, fei, consignacao, despachante, feirao
  type: mysqlEnum("type", ["individual", "team", "group", "1v1"]).default("individual").notNull(),
  status: mysqlEnum("status", ["draft", "active", "finished"]).default("draft").notNull(),
  pointsPerSale: int("pointsPerSale").default(1).notNull(),
  goalTarget: int("goalTarget"), // meta (ex: X carros consignados, X transferências)
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  endDate: bigint("endDate", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_competitions_tenant").on(table.tenantId),
}));

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;

// Equipes dentro de competições
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3B82F6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_teams_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_competition_participants_tenant").on(table.tenantId),
}));

export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;
export type InsertCompetitionParticipant = typeof competitionParticipants.$inferInsert;

// Vendas registradas (vendas de veículos - setor vendas/feirão)
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  description: varchar("description", { length: 500 }),
  vehicleModel: varchar("vehicleModel", { length: 255 }),
  vehiclePlate: varchar("vehiclePlate", { length: 10 }), // placa do veículo vendido para cruzar com consignação
  value: int("value").default(0),
  leadSource: varchar("leadSource", { length: 50 }), // 'lead_loja' ou 'lead_vendedor'
  customerPhone: varchar("customerPhone", { length: 20 }), // telefone do comprador para cruzar com agendamento
  customerName: varchar("customerName", { length: 255 }), // nome completo do cliente
  customerEmail: varchar("customerEmail", { length: 320 }), // email do cliente
  customerCpf: varchar("customerCpf", { length: 14 }), // CPF do cliente
  customerBirthday: varchar("customerBirthday", { length: 10 }), // data de nascimento DD/MM/AAAA
  sdrRecordId: int("sdrRecordId"), // vínculo com agendamento de origem (preenchido automaticamente pelo cruzamento de telefone)
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_sales_tenant").on(table.tenantId),
}));

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// Registros F&I (Financiamento e Seguros)
export const feiRecords = mysqlTable("fei_records", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  customerCpf: varchar("customerCpf", { length: 14 }),
  customerName: varchar("customerName", { length: 255 }),
  vehiclePlate: varchar("vehiclePlate", { length: 10 }),
  bankName: varchar("bankName", { length: 255 }),
  financedValue: int("financedValue").default(0), // valor financiado em centavos
  returnType: varchar("returnType", { length: 10 }), // R1, R2, R3, R4, R5
  paymentDate: bigint("paymentDate", { mode: "number" }), // data que o banco pagou a ficha
  notes: text("notes"), // observações do F&I
  lastEditedBy: varchar("lastEditedBy", { length: 255 }), // quem editou por último
  lastEditedAt: bigint("lastEditedAt", { mode: "number" }), // quando foi editado (timestamp ms)
  editNotes: text("editNotes"), // motivo da edição
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_fei_records_tenant").on(table.tenantId),
}));

export type FeiRecord = typeof feiRecords.$inferSelect;
export type InsertFeiRecord = typeof feiRecords.$inferInsert;

// Audit log para edições de F&I
export const feiAuditLogs = mysqlTable("fei_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  feiRecordId: int("feiRecordId").notNull(),
  editedBy: varchar("editedBy", { length: 255 }).notNull(),
  editedAt: timestamp("editedAt").defaultNow().notNull(),
  fieldChanged: varchar("fieldChanged", { length: 100 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  reason: text("reason"),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_fei_audit_logs_tenant").on(table.tenantId),
}));

export type FeiAuditLog = typeof feiAuditLogs.$inferSelect;
export type InsertFeiAuditLog = typeof feiAuditLogs.$inferInsert;

// Permissões por vendedor (controle de visibilidade)
export const sellerPermissions = mysqlTable("seller_permissions", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  module: varchar("module", { length: 50 }).notNull(), // vendas, fei, consignacao, pos_venda, financeiro, crm, metas, agendamentos, treinamentos, estoque, marketing
  canView: boolean("canView").default(false).notNull(),
  canEdit: boolean("canEdit").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_seller_permissions_tenant").on(table.tenantId),
}));

export type SellerPermission = typeof sellerPermissions.$inferSelect;
export type InsertSellerPermission = typeof sellerPermissions.$inferInsert;

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
  rejectionReason: text("rejectionReason"), // motivo da rejeição (quando rejeitado)
  soldVia: varchar("soldVia", { length: 20 }), // null=not sold, 'sale'=sold via sale registration
  saleId: int("saleId"), // FK to sales table if sold
  soldAt: bigint("soldAt", { mode: "number" }), // timestamp when marked as sold
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_consignment_records_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_dispatch_records_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_trainings_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_action_plans_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_motivational_quotes_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_notifications_tenant").on(table.tenantId),
}));

export type Notification = typeof notifications.$inferSelect;

// Log de todo e-mail transacional disparado pela plataforma (OTP, redefinição de
// senha, boas-vindas de cadastro, confirmação/suspensão de assinatura...) — sem
// tenantId obrigatório porque nem todo e-mail está ligado a uma loja resolvida
// (ex: OTP de login acontece antes da sessão existir). Consumido pela tela de
// logs do Super Admin junto com subscription_events (server/routers/platformLogsRouter.ts).
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  emailType: varchar("emailType", { length: 50 }).notNull(),
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed"]).notNull(),
  providerId: varchar("providerId", { length: 100 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_email_logs_tenant").on(table.tenantId),
  typeIdx: index("idx_email_logs_type").on(table.emailType),
}));

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;

// Configurações do app (código de acesso, etc.)
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_app_settings_tenant").on(table.tenantId),
}));

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
  feiraoEditionId: int("feiraoEditionId"), // vínculo com edição do feirão
  notes: text("notes"),
  // Fluxo de comparecimento
  attendanceStatus: mysqlEnum("attendanceStatus", ["pending", "attended", "no_show", "approved", "rejected"]).default("pending"), // pending=aguardando, attended=vendedor marcou que veio, no_show=não compareceu, approved=gerente aprovou, rejected=gerente reprovou
  attendanceMarkedAt: bigint("attendanceMarkedAt", { mode: "number" }), // quando vendedor marcou comparecimento
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_sdr_records_tenant").on(table.tenantId),
}));

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
  accepted: boolean("accepted").default(false).notNull(), // meta individual aceita pelo colaborador
  acceptedAt: bigint("acceptedAt", { mode: "number" }), // timestamp quando aceitou
  acceptedBy: int("acceptedBy"), // sellerId de quem aceitou
  deadline: bigint("deadline", { mode: "number" }), // prazo para aceitar (timestamp, ex: 48h após criação)
  reminderSentAt: bigint("reminderSentAt", { mode: "number" }), // quando o lembrete foi enviado
  reminderCount: int("reminderCount").default(0).notNull(), // quantos lembretes foram enviados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_goals_tenant").on(table.tenantId),
}));

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

// Gerentes (login por senha separado)
export const managers = mysqlTable("managers", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantUsernameIdx: uniqueIndex("managers_tenant_username_idx").on(table.tenantId, table.username),
  emailIdx: uniqueIndex("managers_email_idx").on(table.email),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_push_subscriptions_tenant").on(table.tenantId),
}));

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ===== CRM MODULE =====

// Admins (login próprio, independente do Manus OAuth)
export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("admin_phone", { length: 20 }),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  lastAccess: bigint("admin_lastAccess", { mode: "number" }),
  role: mysqlEnum("role", ["owner", "admin"]).default("admin").notNull(),
  permissions: text("permissions"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantUsernameIdx: uniqueIndex("admins_tenant_username_idx").on(table.tenantId, table.username),
  emailIdx: uniqueIndex("admins_email_idx").on(table.email),
}));

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

// Tokens de "esqueci minha senha" — um token bruto é gerado e mandado por
// e-mail, só o hash SHA-256 dele fica salvo aqui (mesmo princípio de nunca
// guardar segredo em texto puro que já vale pra passwordHash). userType+userId
// aponta pra admin/manager/seller dentro do tenant.
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userType: mysqlEnum("userType", ["admin", "manager", "seller"]).notNull(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  usedAt: bigint("usedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_password_reset_tokens_tenant").on(table.tenantId),
  tokenHashIdx: uniqueIndex("idx_password_reset_tokens_hash").on(table.tokenHash),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

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
  cpf: varchar("cpf", { length: 14 }), // CPF do cliente
  birthday: varchar("birthday", { length: 10 }), // data de nascimento DD/MM/AAAA
  notes: text("notes"), // observações gerais
  nextContactDate: bigint("nextContactDate", { mode: "number" }), // data do próximo contato agendado
  lastContactDate: bigint("lastContactDate", { mode: "number" }), // último contato
  archived: boolean("archived").default(false).notNull(),
  convertedToSale: boolean("convertedToSale").default(false).notNull(),
  saleValue: int("saleValue").default(0), // valor da venda em centavos (quando convertido)
  acknowledgedAt: bigint("acknowledgedAt", { mode: "number" }), // timestamp quando vendedor confirmou recebimento do lead
  lastAutoTransferAt: bigint("lastAutoTransferAt", { mode: "number" }), // timestamp da última transferência automática (previne loop infinito)
  aiHandled: boolean("aiHandled").default(false), // se a IA já atendeu este lead
  aiDataCollected: text("aiDataCollected"), // JSON com dados coletados pela IA (CPF, entrada, renda, etc.)
  aiCreditAppId: int("aiCreditAppId"), // ID da ficha de crédito criada pela IA
  aiAppointmentId: int("aiAppointmentId"), // ID do agendamento criado pela IA
  lastMessageAt: bigint("lastMessageAt", { mode: "number" }), // timestamp da última mensagem
  lastMessageContent: varchar("lastMessageContent", { length: 500 }), // conteúdo da última mensagem (denormalizado)
  lastMessageDirection: varchar("lastMessageDirection", { length: 10 }), // direction da última mensagem
  lastMessageType: varchar("lastMessageType", { length: 20 }), // tipo da última mensagem
  lastMessageSender: varchar("lastMessageSender", { length: 100 }), // sender da última mensagem
  unreadCount: int("unreadCount").notNull().default(0), // contagem de msgs não lidas (denormalizado)
  lastCampaignId: int("lastCampaignId"), // ID da última campanha enviada
  isCampaignResponse: boolean("isCampaignResponse").default(false), // se respondeu a uma campanha
  profilePicUrl: varchar("profilePicUrl", { length: 512 }), // URL da foto de perfil (Instagram/Facebook)
  socialUsername: varchar("socialUsername", { length: 100 }), // username do Instagram ou Facebook
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_leads_tenant").on(table.tenantId),
}));

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = typeof crmLeads.$inferInsert;

// Credit Applications - fichas de crédito submetidas ao F&I (criadas manualmente ou pelo Atendente IA)
export const creditApplications = mysqlTable("credit_applications", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  sellerId: int("sellerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerCpf: varchar("customerCpf", { length: 14 }),
  customerRg: varchar("customerRg", { length: 20 }),
  customerBirthDate: varchar("customerBirthDate", { length: 10 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerAddress: text("customerAddress"),
  customerIncome: int("customerIncome").default(0),
  customerEmployer: varchar("customerEmployer", { length: 255 }),
  customerEmploymentTime: varchar("customerEmploymentTime", { length: 100 }),
  vehicleInterest: varchar("vehicleInterest", { length: 255 }),
  downPayment: int("downPayment").default(0),
  tradeInVehicle: varchar("tradeInVehicle", { length: 255 }),
  tradeInPlate: varchar("tradeInPlate", { length: 10 }),
  tradeInKm: int("tradeInKm").default(0),
  tradeInValue: int("tradeInValue").default(0),
  financingTerm: int("financingTerm").default(48),
  financingValue: int("financingValue").default(0),
  status: mysqlEnum("status", ["pending", "analyzing", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  feiNotes: text("feiNotes"),
  bankPreference: varchar("bankPreference", { length: 100 }),
  feiAnalyzedAt: bigint("feiAnalyzedAt", { mode: "number" }),
  aiCollected: boolean("aiCollected").default(false),
  aiCollectedAt: bigint("aiCollectedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_credit_applications_tenant").on(table.tenantId),
  leadIdx: index("idx_credit_applications_lead").on(table.leadId),
}));

export type CreditApplication = typeof creditApplications.$inferSelect;
export type InsertCreditApplication = typeof creditApplications.$inferInsert;

// AI Appointments - agendamentos criados pelo Atendente IA (visita presencial ou videochamada)
export const aiAppointments = mysqlTable("ai_appointments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  sellerId: int("sellerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  scheduledDate: bigint("scheduledDate", { mode: "number" }).notNull(),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  vehicleInterest: varchar("vehicleInterest", { length: 255 }),
  purpose: varchar("purpose", { length: 50 }).default("visita").notNull(), // visita, videochamada
  status: mysqlEnum("status", ["pending", "confirmed", "attended", "no_show", "cancelled"]).default("pending").notNull(),
  aiCreated: boolean("aiCreated").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_ai_appointments_tenant").on(table.tenantId),
  leadIdx: index("idx_ai_appointments_lead").on(table.leadId),
}));

export type AiAppointment = typeof aiAppointments.$inferSelect;
export type InsertAiAppointment = typeof aiAppointments.$inferInsert;

// Configuração global do Atendente IA/CRM por loja — uma linha por tenant,
// criada no provisionamento (server/tenantProvisioning.ts). Manipulada via SQL
// raw em vários lugares (ai-attendant.ts, crmRouter.ts, webhooks.ts,
// inactive-dispatch.ts) — modelada aqui pra existir migration/tipo, mesmo sem
// passar pelo query builder do Drizzle nesses pontos.
export const crmAiGlobalConfig = mysqlTable("crm_ai_global_config", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1).unique(),

  aiMode: varchar("aiMode", { length: 20 }).default("normal").notNull(),
  feiraoConfig: text("feiraoConfig"),
  normalConfig: text("normalConfig"),

  autoReplyEnabled: boolean("autoReplyEnabled").default(true).notNull(),
  workingHoursEnabled: boolean("workingHoursEnabled").default(false).notNull(),
  workingHoursStart: int("workingHoursStart").default(8).notNull(),
  workingHoursEnd: int("workingHoursEnd").default(20).notNull(),
  maxMessagesEnabled: boolean("maxMessagesEnabled").default(false).notNull(),
  maxMessagesPerLead: int("maxMessagesPerLead").default(20).notNull(),
  personality: varchar("personality", { length: 20 }).default("amigavel").notNull(),

  inactiveDispatchEnabled: boolean("inactiveDispatchEnabled").default(false).notNull(),
  inactiveDispatchHours: int("inactiveDispatchHours").default(24).notNull(),
  inactiveDispatchMessage: text("inactiveDispatchMessage"),
  inactiveDispatchMaxPerDay: int("inactiveDispatchMaxPerDay").default(1).notNull(),
  inactiveDispatchLastRun: bigint("inactiveDispatchLastRun", { mode: "number" }),

  feiraoScheduleStart: bigint("feiraoScheduleStart", { mode: "number" }),
  feiraoScheduleEnd: bigint("feiraoScheduleEnd", { mode: "number" }),
  feiraoAutoSchedule: boolean("feiraoAutoSchedule").default(false).notNull(),

  attendantEnabled: boolean("attendantEnabled").default(false).notNull(),
  attendantMode: varchar("attendantMode", { length: 20 }).default("off_hours").notNull(),
  attendantPrompt: text("attendantPrompt"),
  attendantSchedule: text("attendantSchedule"),
  attendantCollectData: boolean("attendantCollectData").default(true).notNull(),
  attendantAutoSchedule: boolean("attendantAutoSchedule").default(true).notNull(),
  attendantAutoFicha: boolean("attendantAutoFicha").default(true).notNull(),
  attendantAutoDistribute: boolean("attendantAutoDistribute").default(true).notNull(),
  attendantTankPromo: boolean("attendantTankPromo").default(true).notNull(),
  attendantMaxMessages: int("attendantMaxMessages").default(0).notNull(),

  updatedAt: bigint("updatedAt", { mode: "number" }),
});

export type CrmAiGlobalConfig = typeof crmAiGlobalConfig.$inferSelect;
export type InsertCrmAiGlobalConfig = typeof crmAiGlobalConfig.$inferInsert;

// Log de alterações na config do Atendente IA/CRM (quem mudou o quê e quando),
// consumido por getAiConfigLog em crmRouter.ts.
export const crmAiConfigLog = mysqlTable("crm_ai_config_log", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1),
  adminId: int("adminId"),
  adminName: varchar("adminName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  field: varchar("field", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  details: text("details"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (table) => ({
  tenantIdx: index("idx_crm_ai_config_log_tenant").on(table.tenantId),
}));

export type CrmAiConfigLog = typeof crmAiConfigLog.$inferSelect;
export type InsertCrmAiConfigLog = typeof crmAiConfigLog.$inferInsert;

// Log de disparo automático pra leads inativos (evita duplicar envio no mesmo
// dia/janela), consumido por server/inactive-dispatch.ts.
export const crmAiInactiveDispatchLog = mysqlTable("crm_ai_inactive_dispatch_log", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  tenantId: int("tenantId").notNull().default(1),
  sentAt: bigint("sentAt", { mode: "number" }).notNull(),
  message: text("message"),
}, (table) => ({
  tenantIdx: index("idx_crm_ai_inactive_dispatch_log_tenant").on(table.tenantId),
  leadIdx: index("idx_crm_ai_inactive_dispatch_log_lead").on(table.leadId),
}));

export type CrmAiInactiveDispatchLog = typeof crmAiInactiveDispatchLog.$inferSelect;
export type InsertCrmAiInactiveDispatchLog = typeof crmAiInactiveDispatchLog.$inferInsert;

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_pipeline_stages_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_activities_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_inventory_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_inventory_alerts_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_integrations_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_campaigns_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_message_templates_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_follow_up_tasks_tenant").on(table.tenantId),
}));

export type CrmFollowUpTask = typeof crmFollowUpTasks.$inferSelect;
export type InsertCrmFollowUpTask = typeof crmFollowUpTasks.$inferInsert;

// CRM Lead Distribution - configuração de distribuição round-robin
export const crmLeadDistribution = mysqlTable("crm_lead_distribution", {
  id: int("id").autoincrement().primaryKey(),
  department: varchar("department", { length: 50 }).notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  transferThresholdMinutes: int("transferThresholdMinutes").default(10).notNull(), // tempo em minutos para transferir lead sem resposta
  lastAssignedSellerId: int("lastAssignedSellerId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_lead_distribution_tenant").on(table.tenantId),
}));

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_fin_categories_tenant").on(table.tenantId),
}));
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
  vehicle: varchar("vehicle", { length: 255 }), // veículo do estoque vinculado (rótulo: marca modelo ano - placa)
  barcode: varchar("barcode", { length: 100 }), // código de barras do boleto
  notes: text("notes"),
  receiptUrl: text("receiptUrl"), // URL do comprovante no S3
  receiptKey: varchar("receiptKey", { length: 500 }),
  recurrence: mysqlEnum("recurrence", ["none", "monthly", "weekly", "yearly"]).default("none"),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "cartao_credito", "boleto", "dinheiro"]),
  installmentNumber: int("installmentNumber"), // parcela atual
  installmentTotal: int("installmentTotal"), // total de parcelas
  sellerId: int("sellerId"), // colaborador vinculado quando a conta é um Vale/adiantamento (null = conta normal)
  needsApproval: boolean("needsApproval").default(false), // conta que precisa de autorização de pagamento
  approvalStatus: mysqlEnum("approvalStatus", ["none", "pending_approval", "approved", "rejected"]).default("none"), // status da autorização
  approvedBy: varchar("approvedBy", { length: 255 }), // quem autorizou
  approvedAt: bigint("approvedAt", { mode: "number" }), // quando autorizou
  createdBy: int("createdBy"), // admin que criou
  createdByName: varchar("createdByName", { length: 255 }), // nome de quem criou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_fin_transactions_tenant").on(table.tenantId),
}));
export type FinTransaction = typeof finTransactions.$inferSelect;
export type InsertFinTransaction = typeof finTransactions.$inferInsert;

// ===== FORNECEDORES =====
export const finSuppliers = mysqlTable("fin_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1),
  personType: mysqlEnum("person_type", ["fisica", "juridica"]).notNull().default("fisica"),
  name: varchar("name", { length: 255 }).notNull(),
  cpfCnpj: varchar("cpf_cnpj", { length: 20 }),
  rg: varchar("rg", { length: 30 }),
  nationality: varchar("nationality", { length: 100 }),
  profession: varchar("profession", { length: 150 }),
  birthDate: bigint("birth_date", { mode: "number" }),
  gender: mysqlEnum("gender", ["masculino", "feminino", "outro"]),
  maritalStatus: mysqlEnum("marital_status", ["solteiro", "casado", "divorciado", "viuvo", "outro"]),
  cep: varchar("cep", { length: 10 }),
  state: varchar("state", { length: 2 }),
  city: varchar("city", { length: 150 }),
  neighborhood: varchar("neighborhood", { length: 150 }),
  street: varchar("street", { length: 255 }),
  number: varchar("number", { length: 20 }),
  complement: varchar("complement", { length: 150 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_fin_suppliers_tenant").on(table.tenantId),
  nameIdx: index("idx_fin_suppliers_name").on(table.tenantId, table.name),
}));
export type FinSupplier = typeof finSuppliers.$inferSelect;
export type InsertFinSupplier = typeof finSuppliers.$inferInsert;


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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_pv_oficinas_tenant").on(table.tenantId),
}));
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
  tipoVeiculo: mysqlEnum("tipoVeiculo", ["loja", "consignado"]).default("loja").notNull(), // se o carro é da loja ou consignado
  // Status e datas
  status: mysqlEnum("status", ["aberto", "agendado", "em_servico", "finalizado", "entregue", "cancelado"]).default("aberto").notNull(),
  dataEntradaAgendada: bigint("dataEntradaAgendada", { mode: "number" }), // quando cliente vai trazer
  dataEntradaReal: bigint("dataEntradaReal", { mode: "number" }), // quando carro chegou de fato
  prazoEntrega: bigint("prazoEntrega", { mode: "number" }), // prazo combinado para devolver ao cliente
  dataEntregaReal: bigint("dataEntregaReal", { mode: "number" }), // quando de fato entregou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_pv_chamados_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_pv_gastos_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_pv_historico_tenant").on(table.tenantId),
}));
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
  editadoPor: varchar("editadoPor", { length: 255 }), // quem editou por último (financeiro)
  editadoEm: bigint("editadoEm", { mode: "number" }), // quando foi editado
  editMotivo: text("editMotivo"), // motivo da edição
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_pv_orcamentos_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_pv_orcamento_itens_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_mkt_strategies_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_mkt_tasks_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_iam_config_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_sale_documents_tenant").on(table.tenantId),
}));
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
  // Data que o banco efetivamente pagou (pode ser diferente da data de aprovação)
  dataPagamentoBanco: bigint("dataPagamentoBanco", { mode: "number" }),
  // Timestamps de controle
  inicioAnalise: bigint("inicioAnalise", { mode: "number" }), // quando F&I pegou a ficha
  fimAnalise: bigint("fimAnalise", { mode: "number" }), // quando F&I finalizou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_fichas_financiamento_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_ficha_bancos_tenant").on(table.tenantId),
}));
export type FichaBanco = typeof fichaBancos.$inferSelect;
export type InsertFichaBanco = typeof fichaBancos.$inferInsert;

// Estoque de veículos (sincronizado do site kafkamultimarcas.com.br)
export const inventoryVehicles = mysqlTable("inventory_vehicles", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 20 }).notNull(), // ID do veículo no site externo
  brand: varchar("brand", { length: 100 }).notNull(), // Volkswagen, Ford, etc.
  model: varchar("model", { length: 100 }).notNull(), // Saveiro, Ranger, etc.
  title: varchar("title", { length: 255 }), // título comercial customizado
  internalCode: varchar("internalCode", { length: 100 }), // código interno do estoque
  sourceType: varchar("sourceType", { length: 30 }).default("sync").notNull(), // sync, manual, integration
  version: varchar("version", { length: 255 }), // ROBUST TOTAL FLEX, XLS 4X4, etc.
  motor: varchar("motor", { length: 50 }), // 1.6, 2.0, etc.
  year: int("year"), // 2025
  manufactureYear: int("manufactureYear"), // ano fabricação
  modelYear: int("modelYear"), // ano modelo
  chassis: varchar("chassis", { length: 50 }),
  renavam: varchar("renavam", { length: 50 }),
  color: varchar("color", { length: 50 }), // Branco, Prata, etc.
  fuel: varchar("fuel", { length: 50 }), // Flex, Diesel, Gasolina
  km: int("km").default(0), // quilometragem
  price: int("price").default(0), // preço em reais inteiros
  purchasePrice: int("purchasePrice").default(0), // custo de compra
  preparationCost: int("preparationCost").default(0), // custo de preparação
  documentationCost: int("documentationCost").default(0), // custo documental
  transportCost: int("transportCost").default(0), // custo transporte
  otherCosts: int("otherCosts").default(0), // outras despesas
  minimumSalePrice: int("minimumSalePrice").default(0), // valor mínimo de venda
  photoUrl: text("photoUrl"), // URL da foto principal
  photos: text("photos"), // JSON array de URLs de fotos
  optionals: text("optionals"), // JSON array de opcionais
  highlightItems: text("highlightItems"), // JSON array de destaques
  internalTags: text("internalTags"), // JSON array de tags internas
  externalUrl: text("externalUrl"), // link para o veículo no site original
  videoUrl: text("videoUrl"), // vídeo opcional
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
  internalNotes: text("internalNotes"), // observações internas da loja
  storeLocation: varchar("storeLocation", { length: 120 }), // unidade física
  entryDate: bigint("entryDate", { mode: "number" }), // data de entrada no estoque
  isPublished: boolean("isPublished").default(true).notNull(), // aparece no estoque público
  isFeatured: boolean("isFeatured").default(false).notNull(), // destaque interno/comercial
  acceptsTradeIn: boolean("acceptsTradeIn").default(false).notNull(),
  isArmored: boolean("isArmored").default(false).notNull(),
  status: mysqlEnum("inventory_status", ["available", "reserved", "sold"]).default("available").notNull(),
  soldBySellerId: int("soldBySellerId"), // vendedor que vendeu (quando status = sold)
  soldAt: bigint("soldAt", { mode: "number" }), // data da venda
  lastSyncedAt: bigint("lastSyncedAt", { mode: "number" }), // última sincronização
  deletedAt: bigint("deletedAt", { mode: "number" }), // soft delete
  deletedBy: int("deletedBy"), // usuário que removeu
  deletedReason: text("deletedReason"), // motivo da remoção
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_inventory_vehicles_tenant").on(table.tenantId),
  tenantExternalIdx: uniqueIndex("idx_inventory_vehicles_tenant_external").on(table.tenantId, table.externalId),
}));
export type InventoryVehicle = typeof inventoryVehicles.$inferSelect;
export type InsertInventoryVehicle = typeof inventoryVehicles.$inferInsert;

export const inventoryVehicleMedia = mysqlTable("inventory_vehicle_media", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1),
  inventoryVehicleId: int("inventoryVehicleId").notNull(),
  mediaType: mysqlEnum("mediaType", ["image", "video"]).notNull(),
  sourceMode: mysqlEnum("sourceMode", ["upload", "external_url", "integration"]).notNull(),
  storageProvider: mysqlEnum("storageProvider", ["s3", "external"]).notNull(),
  url: text("url").notNull(),
  storageKey: varchar("storageKey", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 120 }),
  fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }),
  width: int("width"),
  height: int("height"),
  durationSeconds: int("durationSeconds"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  status: mysqlEnum("status", ["active", "deleted", "processing"]).default("active").notNull(),
  createdBySellerId: int("createdBySellerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: bigint("deletedAt", { mode: "number" }),
}, (table) => ({
  tenantIdx: index("idx_inventory_vehicle_media_tenant").on(table.tenantId),
  vehicleIdx: index("idx_inventory_vehicle_media_vehicle").on(table.inventoryVehicleId),
  vehicleStatusIdx: index("idx_inventory_vehicle_media_vehicle_status").on(table.inventoryVehicleId, table.status),
}));
export type InventoryVehicleMedia = typeof inventoryVehicleMedia.$inferSelect;
export type InsertInventoryVehicleMedia = typeof inventoryVehicleMedia.$inferInsert;

export const inventoryAuditLogs = mysqlTable("inventory_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId").notNull(),
  action: varchar("action", { length: 40 }).notNull(), // created, updated, status_changed, soft_deleted, restored
  actorId: int("actorId"),
  actorName: varchar("actorName", { length: 255 }),
  summary: varchar("summary", { length: 500 }).notNull(),
  changedFields: text("changedFields"), // JSON array
  metadata: text("metadata"), // JSON extra
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_inventory_audit_logs_tenant").on(table.tenantId),
  inventoryIdx: index("idx_inventory_audit_logs_inventory").on(table.inventoryId),
}));
export type InventoryAuditLog = typeof inventoryAuditLogs.$inferSelect;
export type InsertInventoryAuditLog = typeof inventoryAuditLogs.$inferInsert;

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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_inventory_sync_logs_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_bulk_send_logs_tenant").on(table.tenantId),
}));
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
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_crm_messages_tenant").on(table.tenantId),
}));
export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = typeof crmMessages.$inferInsert;

// Registros de abastecimento (gasolina)
export const fuelRecords = mysqlTable("fuel_records", {
  id: int("id").autoincrement().primaryKey(),
  vehicleModel: varchar("vehicleModel", { length: 255 }).notNull(),
  vehiclePlate: varchar("vehiclePlate", { length: 20 }),
  fuelType: mysqlEnum("fuelType", ["gasolina", "etanol", "diesel", "gnv"]).default("gasolina").notNull(),
  liters: decimal("liters", { precision: 8, scale: 2 }).notNull(),
  pricePerLiter: decimal("pricePerLiter", { precision: 8, scale: 3 }).notNull(),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).notNull(),
  odometer: int("odometer"), // km atual
  gasStation: varchar("gasStation", { length: 255 }), // posto
  notes: text("notes"),
  receiptUrl: text("receiptUrl"),
  receiptKey: varchar("receiptKey", { length: 500 }),
  fuelDate: bigint("fuelDate", { mode: "number" }).notNull(), // data do abastecimento
  createdBy: int("createdBy"), // seller que registrou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_fuel_records_tenant").on(table.tenantId),
}));
export type FuelRecord = typeof fuelRecords.$inferSelect;
export type InsertFuelRecord = typeof fuelRecords.$inferInsert;


// ===== MANAGER MENTOR IA =====

// Tarefas geradas pela IA para o gerente
export const managerTasks = mysqlTable("manager_tasks", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull(), // seller com role gerente
  type: varchar("type", { length: 50 }).notNull(), // coaching, alert, recognition, strategy, followup
  priority: varchar("priority", { length: 20 }).default("medium").notNull(), // critical, high, medium, low
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetSellerId: int("targetSellerId"), // vendedor alvo da tarefa (se aplicável)
  actionType: varchar("actionType", { length: 50 }), // talk, message, review, approve, transfer
  completed: boolean("completed").default(false).notNull(),
  completedAt: bigint("completedAt", { mode: "number" }),
  expiresAt: bigint("expiresAt", { mode: "number" }), // quando a tarefa expira
  metadata: text("metadata"), // JSON com dados extras (ex: % queda, lead ID)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_manager_tasks_tenant").on(table.tenantId),
}));
export type ManagerTask = typeof managerTasks.$inferSelect;
export type InsertManagerTask = typeof managerTasks.$inferInsert;

// Alertas inteligentes em tempo real para o gerente
export const managerAlerts = mysqlTable("manager_alerts", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // idle_seller, hot_lead_no_response, goal_at_risk, performance_drop, new_record
  severity: varchar("severity", { length: 20 }).default("warning").notNull(), // critical, warning, info, success
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetSellerId: int("targetSellerId"),
  relatedEntityId: int("relatedEntityId"), // leadId, saleId, etc
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // lead, sale, appointment
  dismissed: boolean("dismissed").default(false).notNull(),
  dismissedAt: bigint("dismissedAt", { mode: "number" }),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_manager_alerts_tenant").on(table.tenantId),
}));
export type ManagerAlert = typeof managerAlerts.$inferSelect;
export type InsertManagerAlert = typeof managerAlerts.$inferInsert;

// Mensagens de mentoria IA (dica do dia, direcionamento estratégico)
export const managerMentorMessages = mysqlTable("manager_mentor_messages", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // daily_tip, strategy, motivation, warning, celebration
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  icon: varchar("icon", { length: 50 }), // emoji ou ícone
  read: boolean("read").default(false).notNull(),
  generatedFor: varchar("generatedFor", { length: 20 }), // date string YYYY-MM-DD
  metadata: text("metadata"), // JSON com contexto usado para gerar
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_manager_mentor_messages_tenant").on(table.tenantId),
}));
export type ManagerMentorMessage = typeof managerMentorMessages.$inferSelect;
export type InsertManagerMentorMessage = typeof managerMentorMessages.$inferInsert;

// ===== MATA-MATA (BRACKET MATCHES) =====
// Confrontos diretos dentro de competições tipo equipe/mata-mata
export const bracketMatches = mysqlTable("bracket_matches", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  round: int("round").notNull(), // 1 = quartas, 2 = semi, 3 = final (ou conforme nº de participantes)
  matchOrder: int("matchOrder").notNull(), // ordem do confronto dentro da rodada (1, 2, 3...)
  teamAId: int("teamAId"), // equipe/dupla A (null se bye)
  teamBId: int("teamBId"), // equipe/dupla B (null se bye)
  sellerAId: int("sellerAId"), // vendedor A (para individual 1v1)
  sellerBId: int("sellerBId"), // vendedor B (para individual 1v1)
  scoreA: int("scoreA").default(0).notNull(), // placar do lado A (vendas)
  scoreB: int("scoreB").default(0).notNull(), // placar do lado B (vendas)
  winnerId: int("winnerId"), // teamId ou sellerId do vencedor
  winnerType: varchar("winnerType", { length: 10 }), // "team" ou "seller"
  status: mysqlEnum("bracket_status", ["pending", "active", "finished"]).default("pending").notNull(),
  startedAt: bigint("startedAt", { mode: "number" }),
  finishedAt: bigint("finishedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_bracket_matches_tenant").on(table.tenantId),
}));
export type BracketMatch = typeof bracketMatches.$inferSelect;
export type InsertBracketMatch = typeof bracketMatches.$inferInsert;


// ===== MULTI-TENANT (MULTI-LOJA) =====

// Tenants (Lojas) - cada loja é um tenant isolado
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Nome da loja (ex: "Kafka Multimarcas")
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL amigável (ex: "kafka-multimarcas")
  logoUrl: text("logoUrl"), // Logo da loja (S3)
  logoKey: varchar("logoKey", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  // Configurações de branding
  primaryColor: varchar("primaryColor", { length: 20 }).default("#DC2626"), // cor principal
  secondaryColor: varchar("secondaryColor", { length: 20 }).default("#1F2937"), // cor secundária
  // Plano e limites
  plan: mysqlEnum("plan", ["trial", "basic", "pro", "enterprise"]).default("trial").notNull(),
  maxSellers: int("maxSellers").default(10).notNull(), // limite de vendedores
  maxAdmins: int("maxAdmins").default(2).notNull(), // limite de admins
  // Módulos habilitados (JSON array)
  enabledModules: text("enabledModules"), // JSON: ["ranking","crm","financeiro","pos_venda","consignacao","mesa_credito","marketing","estoque","iam","treinamentos","competicoes","mata_mata"]
  // Integração WhatsApp (cada loja tem sua Z-API)
  zapiInstanceId: varchar("zapiInstanceId", { length: 255 }),
  zapiToken: varchar("zapiToken", { length: 500 }),
  zapiClientToken: varchar("zapiClientToken", { length: 500 }),
  // Site de estoque (para scraper)
  inventoryUrl: text("inventoryUrl"), // URL do site de estoque da loja
  // Status
  status: mysqlEnum("tenant_status", ["active", "suspended", "cancelled", "trial"]).default("trial").notNull(),
  trialEndsAt: bigint("trialEndsAt", { mode: "number" }), // quando o trial expira
  // Dias de aviso de trial já enviados (ex: "5,3") — idempotência do job diário
  // de lembrete (server/trialReminderJob.ts), pra não mandar o mesmo aviso duas vezes.
  trialReminderDaysSent: varchar("trialReminderDaysSent", { length: 50 }),
  // Dados de pagamento/assinatura (ASAAS)
  asaasCustomerId: varchar("asaasCustomerId", { length: 100 }), // ID do customer no ASAAS
  subscriptionId: varchar("subscriptionId", { length: 255 }), // ID da assinatura no ASAAS
  monthlyPrice: int("monthlyPrice").default(0), // preço mensal em centavos
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// Log de eventos de assinatura/pagamento da loja com a PLATAFORMA (via ASAAS) —
// não confundir com fin_transactions, que é o financeiro interno de cada loja com
// os próprios clientes dela. Alimentado pelo webhook do ASAAS + ações manuais.
export const subscriptionEvents = mysqlTable("subscription_events", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(), // ex: PAYMENT_CONFIRMED, PAYMENT_OVERDUE
  asaasPaymentId: varchar("asaasPaymentId", { length: 100 }), // id da cobrança no ASAAS (idempotência)
  asaasSubscriptionId: varchar("asaasSubscriptionId", { length: 100 }),
  status: varchar("status", { length: 50 }), // status da cobrança no momento do evento
  value: decimal("value", { precision: 12, scale: 2 }),
  billingType: varchar("billingType", { length: 30 }), // BOLETO, PIX, CREDIT_CARD
  dueDate: bigint("dueDate", { mode: "number" }),
  paymentDate: bigint("paymentDate", { mode: "number" }),
  rawPayload: text("rawPayload"), // JSON cru do webhook, pra auditoria/debug
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_subscription_events_tenant").on(table.tenantId),
  paymentIdx: index("idx_subscription_events_payment").on(table.asaasPaymentId),
}));
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = typeof subscriptionEvents.$inferInsert;

// Alertas internos de falhas no caminho crítico de cobrança (webhook ASAAS,
// chamadas à API do ASAAS) — substitui error tracking externo: fica durável
// no banco e dispara e-mail pros Super Admins quando severity="critical".
export const billingAlerts = mysqlTable("billing_alerts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"), // nullable: nem sempre dá pra resolver o tenant antes da falha
  severity: mysqlEnum("severity", ["critical", "warning"]).notNull(),
  code: varchar("code", { length: 100 }).notNull(), // ex: webhook_processing_failed, asaas_api_error
  message: text("message").notNull(),
  context: text("context"), // JSON: paymentId, event, subscriptionId, stack, etc.
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: bigint("resolvedAt", { mode: "number" }),
  resolvedBy: varchar("resolvedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  resolvedIdx: index("idx_billing_alerts_resolved").on(table.resolved),
  tenantIdx: index("idx_billing_alerts_tenant").on(table.tenantId),
}));
export type BillingAlert = typeof billingAlerts.$inferSelect;
export type InsertBillingAlert = typeof billingAlerts.$inferInsert;

// Super Admins - acesso ao portal master (gerencia todas as lojas)
export const superAdmins = mysqlTable("super_admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  twoFactorEnabled: boolean("twoFactorEnabled").default(true).notNull(),
  role: mysqlEnum("super_role", ["owner", "support"]).default("support").notNull(),
  active: boolean("active").default(true).notNull(),
  lastAccess: bigint("lastAccess", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SuperAdmin = typeof superAdmins.$inferSelect;
export type InsertSuperAdmin = typeof superAdmins.$inferInsert;

// Códigos de verificação por email (2FA)
export const emailVerificationCodes = mysqlTable("email_verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(), // login, register, reset_password
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;


// Snapshots mensais - grava o estado de cada vendedor ao final de cada mês
export const monthlySnapshots = mysqlTable("monthly_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  sellerName: varchar("sellerName", { length: 255 }).notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  department: varchar("department", { length: 100 }),
  rank: int("rank").default(0), // posição no ranking daquele mês
  // Dados extras opcionais
  totalFei: int("totalFei").default(0),
  totalConsignacao: int("totalConsignacao").default(0),
  totalAgendamentos: int("totalAgendamentos").default(0),
  totalLeads: int("totalLeads").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_monthly_snapshots_tenant").on(table.tenantId),
}));
export type MonthlySnapshot = typeof monthlySnapshots.$inferSelect;
export type InsertMonthlySnapshot = typeof monthlySnapshots.$inferInsert;

// Snapshots de competições - grava o resultado final de cada competição
export const competitionSnapshots = mysqlTable("competition_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  competitionName: varchar("competitionName", { length: 255 }).notNull(),
  competitionType: varchar("competitionType", { length: 20 }),
  category: varchar("category", { length: 50 }),
  startDate: bigint("startDate", { mode: "number" }),
  endDate: bigint("endDate", { mode: "number" }),
  month: int("month").notNull(),
  year: int("year").notNull(),
  // Ranking serializado como JSON
  rankingJson: text("rankingJson"), // JSON array com posição, nome, pontos, vendas
  championName: varchar("championName", { length: 255 }),
  championSellerId: int("championSellerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_competition_snapshots_tenant").on(table.tenantId),
}));
export type CompetitionSnapshot = typeof competitionSnapshots.$inferSelect;
export type InsertCompetitionSnapshot = typeof competitionSnapshots.$inferInsert;


// ===== AI CONVERSATION LOGS (MÉTRICAS DA IA) =====

// Log de cada conversa da IA com um lead (registra métricas ao final)
export const aiConversationLogs = mysqlTable("ai_conversation_logs", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  leadName: varchar("leadName", { length: 255 }),
  leadPhone: varchar("leadPhone", { length: 20 }),
  // Métricas da conversa
  totalAiMessages: int("totalAiMessages").default(0).notNull(), // total de msgs enviadas pela IA
  totalClientMessages: int("totalClientMessages").default(0).notNull(), // total de msgs do cliente
  messageLimit: int("messageLimit").default(5).notNull(), // limite configurado na época
  // Resultado
  stopReason: varchar("stopReason", { length: 50 }).notNull(), // limit_reached, transfer_to_seller, human_takeover, ai_disabled, duplicate_blocked, error
  leadTemperature: varchar("leadTemperature", { length: 20 }), // hot, warm, cold
  conversationStage: varchar("conversationStage", { length: 50 }), // qualifying, trade_evaluation, collecting_data, scheduling, closing, transfer_to_seller
  // Dados coletados (resumo)
  collectedName: boolean("collectedName").default(false).notNull(),
  collectedCpf: boolean("collectedCpf").default(false).notNull(),
  collectedVehicleInterest: boolean("collectedVehicleInterest").default(false).notNull(),
  collectedTradeIn: boolean("collectedTradeIn").default(false).notNull(),
  collectedPaymentMethod: boolean("collectedPaymentMethod").default(false).notNull(),
  collectedCity: boolean("collectedCity").default(false).notNull(),
  collectedSchedule: boolean("collectedSchedule").default(false).notNull(),
  totalFieldsCollected: int("totalFieldsCollected").default(0).notNull(), // quantos campos foram coletados
  // Ações realizadas
  photosSent: int("photosSent").default(0).notNull(), // quantas fotos foram enviadas
  fichaCreated: boolean("fichaCreated").default(false).notNull(),
  appointmentCreated: boolean("appointmentCreated").default(false).notNull(),
  distributedToSeller: boolean("distributedToSeller").default(false).notNull(),
  assignedSellerId: int("assignedSellerId"), // vendedor que recebeu o lead
  // Timing
  firstMessageAt: bigint("firstMessageAt", { mode: "number" }), // timestamp da primeira msg da IA
  lastMessageAt: bigint("lastMessageAt", { mode: "number" }), // timestamp da última msg da IA
  durationSeconds: int("durationSeconds").default(0), // duração total da conversa em segundos
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_ai_conversation_logs_tenant").on(table.tenantId),
}));
export type AiConversationLog = typeof aiConversationLogs.$inferSelect;
export type InsertAiConversationLog = typeof aiConversationLogs.$inferInsert;

// Edições de Feirão
export const feiraoEditions = mysqlTable("feirao_editions", {
  id: int("id").autoincrement().primaryKey(),
  editionNumber: int("editionNumber").notNull(), // ex: 39, 40, 41
  name: varchar("name", { length: 255 }).notNull(), // ex: "Feirão Kafka Ed. 39"
  startDate: bigint("startDate", { mode: "number" }),
  endDate: bigint("endDate", { mode: "number" }),
  status: mysqlEnum("status", ["active", "finished"]).default("active").notNull(),
  notes: text("notes"), // observações do feirão
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_feirao_editions_tenant").on(table.tenantId),
}));
export type FeiraoEdition = typeof feiraoEditions.$inferSelect;
export type InsertFeiraoEdition = typeof feiraoEditions.$inferInsert;


// ===== CUSTO POR VEÍCULO =====
export const vehicleCosts = mysqlTable("vehicle_costs", {
  id: int("id").autoincrement().primaryKey(),
  plate: varchar("plate", { length: 20 }).notNull(), // placa do veículo
  brand: varchar("brand", { length: 100 }), // marca (ex: Chevrolet)
  model: varchar("model", { length: 200 }), // modelo (ex: Onix 1.0 LT)
  year: int("year"), // ano do modelo
  color: varchar("color", { length: 50 }), // cor (opcional)
  fuel: varchar("fuel", { length: 50 }), // combustível (Gasolina, Flex, Diesel)
  fipeCode: varchar("fipeCode", { length: 30 }), // código FIPE
  fipeValue: decimal("fipeValue", { precision: 12, scale: 2 }), // valor FIPE consultado
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }), // valor de compra
  salePrice: decimal("salePrice", { precision: 12, scale: 2 }), // valor de venda (quando vendido)
  entryDate: bigint("entryDate", { mode: "number" }), // data de entrada (timestamp)
  saleDate: bigint("saleDate", { mode: "number" }), // data de venda (timestamp)
  photoUrl: text("photoUrl"), // foto principal do veículo
  photoKey: varchar("photoKey", { length: 500 }),
  status: mysqlEnum("vehicleStatus", ["in_stock", "sold", "reserved"]).default("in_stock").notNull(),
  clientName: varchar("clientName", { length: 255 }), // nome do cliente (comprador ou vendedor)
  notes: text("notes"), // observações
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_vehicle_costs_tenant").on(table.tenantId),
}));
export type VehicleCost = typeof vehicleCosts.$inferSelect;
export type InsertVehicleCost = typeof vehicleCosts.$inferInsert;

// Itens de custo por veículo (gastos individuais)
export const vehicleCostItems = mysqlTable("vehicle_cost_items", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(), // FK para vehicle_costs.id
  description: varchar("description", { length: 255 }).notNull(), // descrição do gasto
  category: varchar("category", { length: 100 }), // categoria (mecânica, funilaria, documentação, estética, outros)
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // valor do gasto
  date: bigint("date", { mode: "number" }), // data do gasto (timestamp)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_vehicle_cost_items_tenant").on(table.tenantId),
}));
export type VehicleCostItem = typeof vehicleCostItems.$inferSelect;
export type InsertVehicleCostItem = typeof vehicleCostItems.$inferInsert;

// Vales e Adiantamentos dos vendedores
export const sellerAdvances = mysqlTable("seller_advances", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  amount: int("amount").notNull(), // valor em centavos
  description: varchar("description", { length: 500 }),
  date: bigint("date", { mode: "number" }).notNull(), // timestamp da data do vale
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  createdBy: int("createdBy"), // admin/gerente que registrou
  finTransactionId: int("finTransactionId"), // conta a pagar de origem no Financeiro (null = vale avulso)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_seller_advances_tenant").on(table.tenantId),
}));

export type SellerAdvance = typeof sellerAdvances.$inferSelect;
export type InsertSellerAdvance = typeof sellerAdvances.$inferInsert;

// Tabela de regras de comissão (configurável pelo admin)
export const commissionRules = mysqlTable("commission_rules", {
  id: int("id").autoincrement().primaryKey(),
  minSales: int("minSales").notNull(), // mínimo de vendas para esta faixa
  maxSales: int("maxSales"), // máximo (null = sem limite)
  helpAllowance: int("helpAllowance").notNull(), // ajuda de custo em centavos
  commissionPerSale: int("commissionPerSale").notNull(), // comissão por carro em centavos
  bonus: int("bonus").default(0).notNull(), // bônus em centavos
  bonusDescription: varchar("bonusDescription", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_commission_rules_tenant").on(table.tenantId),
}));

export type CommissionRule = typeof commissionRules.$inferSelect;
export type InsertCommissionRule = typeof commissionRules.$inferInsert;

// Carros Bônus (cadastrados pelo gestor, vinculados a campanhas)
export const bonusVehicles = mysqlTable("bonus_vehicles", {
  id: int("id").autoincrement().primaryKey(),
  vehicleModel: varchar("vehicleModel", { length: 255 }).notNull(),
  plate: varchar("plate", { length: 20 }), // placa específica (opcional)
  bonusAmount: int("bonusAmount").notNull(), // valor do bônus em centavos
  campaignName: varchar("campaignName", { length: 255 }).notNull(),
  campaignRules: text("campaignRules"),
  startDate: bigint("startDate", { mode: "number" }).notNull(), // timestamp início
  endDate: bigint("endDate", { mode: "number" }).notNull(), // timestamp fim
  active: boolean("active").default(true).notNull(),
  createdBy: int("createdBy"), // admin/gerente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_bonus_vehicles_tenant").on(table.tenantId),
}));

export type BonusVehicle = typeof bonusVehicles.$inferSelect;
export type InsertBonusVehicle = typeof bonusVehicles.$inferInsert;

// Bônus lançados para vendedores (automático ou manual)
export const sellerBonuses = mysqlTable("seller_bonuses", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  saleId: int("saleId"), // venda que gerou o bônus (se automático)
  bonusVehicleId: int("bonusVehicleId"), // carro bônus vinculado (se aplicável)
  type: varchar("type", { length: 50 }).notNull(), // 'carro_bonus' | 'campanha' | 'premiacao' | 'manual'
  amount: int("amount").notNull(), // valor em centavos
  description: varchar("description", { length: 500 }).notNull(),
  campaignName: varchar("campaignName", { length: 255 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'paid'
  month: int("month").notNull(),
  year: int("year").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: bigint("approvedAt", { mode: "number" }),
  paidAt: bigint("paidAt", { mode: "number" }),
  rejectionReason: varchar("rejectionReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  tenantId: int("tenantId").notNull().default(1),
}, (table) => ({
  tenantIdx: index("idx_seller_bonuses_tenant").on(table.tenantId),
}));

export type SellerBonus = typeof sellerBonuses.$inferSelect;
export type InsertSellerBonus = typeof sellerBonuses.$inferInsert;

// ===== INTEGRATION SYNC LOGS (generic for all integrations) =====
export const integrationSyncLogs = mysqlTable("integration_sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1),
  integrationType: varchar("integrationType", { length: 50 }).notNull(), // 'whatsapp', 'sig', 'olx', 'meta', 'inventory'
  status: mysqlEnum("sync_status", ["success", "error"]).notNull(),
  summary: text("summary"), // e.g. "124 encontrado(s), 0 novo(s), 116 atualizado(s)"
  details: text("details"), // JSON with detailed metrics
  errorMessage: text("errorMessage"),
  duration: int("duration").default(0), // ms
  triggeredBy: varchar("triggeredBy", { length: 50 }).default("auto"), // 'auto' | 'manual'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantTypeIdx: index("idx_integration_sync_logs_tenant_type").on(table.tenantId, table.integrationType),
}));
export type IntegrationSyncLog = typeof integrationSyncLogs.$inferSelect;
export type InsertIntegrationSyncLog = typeof integrationSyncLogs.$inferInsert;
