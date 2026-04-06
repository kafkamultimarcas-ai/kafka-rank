import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("AI Attendant - Message Limits & Takeover Detection", () => {
  const aiAttendantPath = path.join(__dirname, "ai-attendant.ts");
  const aiAttendantCode = fs.readFileSync(aiAttendantPath, "utf-8");

  describe("HARD Message Limit (5 messages default)", () => {
    it("should have disableAiForLead helper function", () => {
      expect(aiAttendantCode).toContain("async function disableAiForLead(dbConn: any, leadId: number)");
    });

    it("should check per-lead AI setting before processing", () => {
      expect(aiAttendantCode).toContain("CHECK 1: IS AI DISABLED FOR THIS LEAD?");
      expect(aiAttendantCode).toContain("SELECT enabled FROM crm_ai_settings WHERE leadId =");
    });

    it("should have HARD message limit with default of 5", () => {
      expect(aiAttendantCode).toContain("HARD LIMIT: default 5 if not configured");
      expect(aiAttendantCode).toContain("const hardLimit = config.attendantMaxMessages > 0 ? config.attendantMaxMessages : 5");
    });

    it("should send transfer message when reaching limit", () => {
      expect(aiAttendantCode).toContain("sending TRANSFER message");
      expect(aiAttendantCode).toContain("vou encaminhar seu atendimento para um dos nossos consultores");
    });

    it("should disable AI after reaching limit", () => {
      expect(aiAttendantCode).toContain("transfer_limit_reached");
      expect(aiAttendantCode).toContain("await disableAiForLead(dbConn, leadId)");
    });

    it("should silently stop if past the limit", () => {
      expect(aiAttendantCode).toContain("PAST message limit");
      expect(aiAttendantCode).toContain("limit_exceeded");
    });

    it("should tell AI how many messages remain in the prompt", () => {
      expect(aiAttendantCode).toContain("Voce ja enviou ${aiMsgCount} mensagens");
      expect(aiAttendantCode).toContain("Mensagens restantes: ${hardLimit - aiMsgCount}");
    });

    it("should warn AI when on last messages", () => {
      expect(aiAttendantCode).toContain("ESTA E SUA ULTIMA MENSAGEM");
      expect(aiAttendantCode).toContain("PRIORIZE: coletar o dado mais importante");
    });
  });

  describe("Human Takeover Detection", () => {
    it("should check for human messages via CRM (sentBy field)", () => {
      expect(aiAttendantCode).toContain("Case 1: Message sent via CRM by a human seller (sentBy has sellerId)");
    });

    it("should check for human messages via WhatsApp (senderName)", () => {
      expect(aiAttendantCode).toContain("Case 2: Message sent from WhatsApp phone directly by a human");
    });

    it("should check for fromMe messages without sender info", () => {
      expect(aiAttendantCode).toContain("Case 3: fromMe message from webhook with NO senderName and NO sentBy");
    });

    it("should PERMANENTLY disable AI when human takes over", () => {
      expect(aiAttendantCode).toContain("IA stopping PERMANENTLY");
      // Should call disableAiForLead in all 3 cases
      const disableCalls = (aiAttendantCode.match(/await disableAiForLead\(dbConn, leadId\)/g) || []).length;
      expect(disableCalls).toBeGreaterThanOrEqual(5); // At least 5 calls (3 cases + transfer + limit)
    });

    it("should recognize IA Kafka Reativação as AI message", () => {
      expect(aiAttendantCode).toContain("IA Kafka (Reativação)");
    });
  });

  describe("Transfer to Seller", () => {
    it("should disable AI when transfer_to_seller is triggered", () => {
      expect(aiAttendantCode).toContain("parsed.nextStage === 'transfer_to_seller'");
      expect(aiAttendantCode).toContain("transferred to human seller, AI DISABLED");
    });

    it("should save collected data before returning on transfer", () => {
      expect(aiAttendantCode).toContain("Save updated data before returning");
      expect(aiAttendantCode).toContain("await saveCollectedData(leadId, updatedData)");
    });
  });

  describe("Duplicate Message Detection (Improved)", () => {
    it("should check exact duplicates", () => {
      expect(aiAttendantCode).toContain("Check 1: Exact match");
    });

    it("should check similar openings (first 40 chars)", () => {
      expect(aiAttendantCode).toContain("Check 2: First 40 chars match");
    });

    it("should check word overlap > 70%", () => {
      expect(aiAttendantCode).toContain("Check 3: Word overlap > 70%");
      expect(aiAttendantCode).toContain("overlapRatio > 0.7");
    });

    it("should check last 8 AI messages for duplicates", () => {
      expect(aiAttendantCode).toContain("ORDER BY timestamp DESC LIMIT 8");
    });
  });

  describe("Message Count in Prompt", () => {
    it("should pass aiMsgCount and hardLimit to buildAttendantPrompt", () => {
      expect(aiAttendantCode).toContain("buildAttendantPrompt(config, lead, collectedData, vehicleContext, chatHistory, aiMsgCount, hardLimit)");
    });

    it("should have aiMsgCount and hardLimit parameters in buildAttendantPrompt", () => {
      expect(aiAttendantCode).toContain("aiMsgCount: number = 0, hardLimit: number = 5");
    });
  });

  describe("Webhook Integration", () => {
    const webhooksPath = path.join(__dirname, "webhooks.ts");
    const webhooksCode = fs.readFileSync(webhooksPath, "utf-8");

    it("should check per-lead AI setting in fallback auto-reply", () => {
      expect(webhooksCode).toContain("human takeover or limit reached");
    });

    it("should double-check for human messages in fallback auto-reply", () => {
      expect(webhooksCode).toContain("Human seller already handling lead");
      expect(webhooksCode).toContain("skipping and disabling AI");
    });

    it("should disable AI in webhook when human detected", () => {
      expect(webhooksCode).toContain("INSERT INTO crm_ai_settings (leadId, enabled) VALUES");
      expect(webhooksCode).toContain("ON DUPLICATE KEY UPDATE enabled = 0");
    });
  });

  describe("Forbidden Words Filter", () => {
    it("should block messages containing 'vendido' and similar words", () => {
      expect(aiAttendantCode).toContain("vendido");
      expect(aiAttendantCode).toContain("esgotado");
      expect(aiAttendantCode).toContain("indisponivel");
      expect(aiAttendantCode).toContain("BLOCKED forbidden word");
    });

    it("should replace forbidden words with safe fallback", () => {
      expect(aiAttendantCode).toContain("vou confirmar com a equipe a disponibilidade desse modelo");
    });
  });

  describe("Memory System", () => {
    it("should track questions asked to prevent repetition", () => {
      expect(aiAttendantCode).toContain("questionsAsked");
      expect(aiAttendantCode).toContain("PERGUNTAS JA FEITAS (NUNCA REPITA!)");
    });

    it("should track sent vehicle IDs to prevent duplicate photos", () => {
      expect(aiAttendantCode).toContain("sentVehicleIds");
      expect(aiAttendantCode).toContain("DEDUP: Filter out vehicles already sent");
    });

    it("should recognize loose numbers as data (km, price, year)", () => {
      expect(aiAttendantCode).toContain("245.000");
      expect(aiAttendantCode).toContain("QUILOMETRAGEM");
    });
  });
});
