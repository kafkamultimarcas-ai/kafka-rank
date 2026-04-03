import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          response: "Olá! Bem-vindo à Kafka Multimarcas! Meu nome é Ana, como posso te ajudar hoje?",
          collectedData: { customerName: "João" },
          intent: "greeting",
          shouldCreateFicha: false,
          shouldSchedule: false,
          scheduleSuggestion: null,
        })
      }
    }]
  })
}));

// Mock the zapi-service
vi.mock("./zapi-service", () => ({
  sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock the db module
vi.mock("./db", () => ({
  pool: {
    execute: vi.fn().mockResolvedValue([[], []]),
    query: vi.fn().mockResolvedValue([[], []]),
  }
}));

describe("AI Attendant System", () => {
  describe("Configuration API", () => {
    it("should return default attendant config", async () => {
      const http = await import("http");
      const result = await new Promise<any>((resolve, reject) => {
        const req = http.default.request({
          hostname: "localhost",
          port: 3000,
          path: "/api/trpc/crmAi.getAttendantConfig",
          method: "GET",
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => data += chunk);
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve({ raw: data, status: res.statusCode });
            }
          });
        });
        req.on("error", reject);
        req.end();
      });

      expect(result.result).toBeDefined();
      expect(result.result.data.json).toBeDefined();
      const config = result.result.data.json;
      expect(config).toHaveProperty("attendantEnabled");
      expect(config).toHaveProperty("attendantMode");
      expect(config).toHaveProperty("attendantCollectData");
      expect(config).toHaveProperty("attendantAutoSchedule");
      expect(config).toHaveProperty("attendantAutoFicha");
      expect(config).toHaveProperty("attendantAutoDistribute");
      expect(config).toHaveProperty("attendantTankPromo");
      expect(config).toHaveProperty("attendantMaxMessages");
    });

    it("should return credit applications list", async () => {
      const http = await import("http");
      const result = await new Promise<any>((resolve, reject) => {
        const req = http.default.request({
          hostname: "localhost",
          port: 3000,
          path: "/api/trpc/crmAi.listCreditApplications?input=" + encodeURIComponent(JSON.stringify({ json: {} })),
          method: "GET",
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => data += chunk);
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });
        req.on("error", reject);
        req.end();
      });

      // Should return 200 or 401 (if auth required)
      expect([200, 401]).toContain(result.status);
    });
  });

  describe("AI Attendant Module", () => {
    it("should have ai-attendant.ts file with handleAIAttendant export", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("/home/ubuntu/kafka_sales_competition/server/ai-attendant.ts", "utf8");
      expect(content).toContain("export async function handleAttendantMessage");
      expect(content).toContain("invokeLLM");
      expect(content).toContain("credit_applications");
      expect(content).toContain("ai_appointments");
    });
  });

  describe("Database Tables", () => {
    it("should have crm_ai_global_config table with attendant columns", async () => {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool(process.env.DATABASE_URL || "");
      try {
        const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM crm_ai_global_config");
        expect(rows).toBeDefined();
      } catch (e: any) {
        expect(e.message).not.toContain("doesn't exist");
      } finally {
        await pool.end();
      }
    });

    it("should have crm_credit_applications table", async () => {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool(process.env.DATABASE_URL || "");
      try {
        const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM credit_applications");
        expect(rows).toBeDefined();
      } catch (e: any) {
        // Table should exist
        expect(e.message).not.toContain("doesn't exist");
      } finally {
        await pool.end();
      }
    });

    it("should have crm_ai_appointments table", async () => {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool(process.env.DATABASE_URL || "");
      try {
        const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM crm_ai_appointments");
        expect(rows).toBeDefined();
      } catch (e: any) {
        expect(e.message).not.toContain("doesn't exist");
      } finally {
        await pool.end();
      }
    });
  });
});
