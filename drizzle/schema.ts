import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

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
  sellerId: int("sellerId"),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
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

// Registros de Pré-Vendas / SDR
export const sdrRecords = mysqlTable("sdr_records", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  type: mysqlEnum("type", ["agendamento", "lead_convertido"]).notNull(), // tipo de registro
  customerName: varchar("customerName", { length: 255 }), // nome do cliente/lead
  customerPhone: varchar("customerPhone", { length: 20 }), // telefone do lead
  vehicleInterest: varchar("vehicleInterest", { length: 255 }), // veículo de interesse
  source: varchar("source", { length: 100 }), // origem: OLX, Instagram, site, indicacao, etc.
  scheduledDate: bigint("scheduledDate", { mode: "number" }), // data agendada para visita/test drive
  converted: boolean("converted").default(false).notNull(), // se o lead converteu em venda
  notes: text("notes"), // observações
  points: int("points").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SdrRecord = typeof sdrRecords.$inferSelect;
export type InsertSdrRecord = typeof sdrRecords.$inferInsert;

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
