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
  active: boolean("active").default(true).notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// Competições
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["individual", "team", "group"]).default("individual").notNull(),
  status: mysqlEnum("status", ["draft", "active", "finished"]).default("draft").notNull(),
  pointsPerSale: int("pointsPerSale").default(1).notNull(),
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

// Vendas registradas
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  competitionId: int("competitionId"),
  description: varchar("description", { length: 500 }),
  vehicleModel: varchar("vehicleModel", { length: 255 }),
  value: int("value").default(0),
  points: int("points").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// Mini treinamentos
export const trainings = mysqlTable("trainings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
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
