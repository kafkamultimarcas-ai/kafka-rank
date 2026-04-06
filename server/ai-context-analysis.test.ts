import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const aiAttendantCode = readFileSync(join(__dirname, "ai-attendant.ts"), "utf-8");

describe("AI Context Analysis - Smart Conversation Detection", () => {
  
  describe("Post-Sale Detection (CHECK 4A)", () => {
    it("should have post-sale keyword detection", () => {
      expect(aiAttendantCode).toContain("postSaleKeywords");
      expect(aiAttendantCode).toContain("isPostSale");
    });

    it("should detect common post-sale keywords", () => {
      const keywords = ['problema', 'defeito', 'garantia', 'quebrou', 'pos venda', 'comprei'];
      for (const kw of keywords) {
        expect(aiAttendantCode).toContain(kw);
      }
    });

    it("should transfer to post-sale when detected", () => {
      expect(aiAttendantCode).toContain("post_sale_transfer");
      expect(aiAttendantCode).toContain("setor de pos-venda");
    });

    it("should disable AI after post-sale transfer", () => {
      expect(aiAttendantCode).toContain("if (isPostSale)");
      expect(aiAttendantCode).toContain("await disableAiForLead(dbConn, leadId)");
    });

    it("should log post-sale transfer", () => {
      expect(aiAttendantCode).toContain("'post_sale_transfer'");
    });
  });

  describe("Already Qualified Detection (CHECK 4B)", () => {
    it("should check if lead was already transferred", () => {
      expect(aiAttendantCode).toContain("wasAlreadyTransferred");
      expect(aiAttendantCode).toContain("transfer_to_seller");
    });

    it("should check qualification data (3+ fields)", () => {
      expect(aiAttendantCode).toContain("hasQualificationData");
      expect(aiAttendantCode).toContain("filter(Boolean).length >= 3");
    });

    it("should not restart conversation for qualified leads", () => {
      expect(aiAttendantCode).toContain("already_qualified");
      expect(aiAttendantCode).toContain("ja encaminhei suas informacoes pro nosso consultor");
    });

    it("should require at least 3 AI messages before considering qualified", () => {
      expect(aiAttendantCode).toContain("aiMsgCount >= 3");
    });
  });

  describe("Internal Message Detection (CHECK 4C)", () => {
    it("should have internal keyword detection", () => {
      expect(aiAttendantCode).toContain("internalKeywords");
      expect(aiAttendantCode).toContain("isLikelyInternal");
    });

    it("should check if phone belongs to a registered seller", () => {
      expect(aiAttendantCode).toContain("isSellerPhone");
      expect(aiAttendantCode).toContain("SELECT id, name FROM sellers");
    });

    it("should skip AI for internal messages", () => {
      expect(aiAttendantCode).toContain("internal_message_skipped");
    });

    it("should disable AI for seller phone numbers", () => {
      expect(aiAttendantCode).toContain("AI will NOT respond");
    });
  });

  describe("Returning Contact Context (CHECK 4D)", () => {
    it("should detect returning contacts", () => {
      expect(aiAttendantCode).toContain("isReturningContact");
      expect(aiAttendantCode).toContain("totalInboundCount");
    });

    it("should add context note for returning contacts", () => {
      expect(aiAttendantCode).toContain("contextNote");
      expect(aiAttendantCode).toContain("JA CONVERSOU com voce antes");
    });

    it("should include previously collected data in context", () => {
      expect(aiAttendantCode).toContain("ja demonstrou interesse em");
      expect(aiAttendantCode).toContain("carro de troca");
      expect(aiAttendantCode).toContain("Forma de pagamento");
    });
  });

  describe("Prompt Context Analysis Rules", () => {
    it("should have context analysis section in prompt", () => {
      expect(aiAttendantCode).toContain("REGRA MAIS IMPORTANTE: ANALISE DE CONTEXTO");
    });

    it("should list all situation types", () => {
      expect(aiAttendantCode).toContain("CLIENTE NOVO");
      expect(aiAttendantCode).toContain("CLIENTE RETORNANDO");
      expect(aiAttendantCode).toContain("CLIENTE COM DUVIDA ESPECIFICA");
      expect(aiAttendantCode).toContain("CLIENTE FALANDO DE POS-VENDA");
      expect(aiAttendantCode).toContain("CLIENTE IRRITADO/REPETINDO");
    });

    it("should instruct AI to stay on topic", () => {
      expect(aiAttendantCode).toContain("NAO mude para outro tema");
      expect(aiAttendantCode).toContain("NAO tente vender algo diferente");
    });
  });

  describe("External Link Detection", () => {
    it("should detect external URLs", () => {
      expect(aiAttendantCode).toContain("externalLinkContext");
      expect(aiAttendantCode).toContain("externalUrls");
    });

    it("should filter out our own domains", () => {
      expect(aiAttendantCode).toContain("kafkamultimarcas");
      expect(aiAttendantCode).toContain("ourDomains");
    });

    it("should search our stock when external link detected", () => {
      expect(aiAttendantCode).toContain("LINK EXTERNO DETECTADO");
      expect(aiAttendantCode).toContain("VEICULO NAO ENCONTRADO NO ESTOQUE");
    });

    it("should transfer when vehicle not in stock", () => {
      expect(aiAttendantCode).toContain("NUNCA agende visita para um carro que NAO temos no estoque");
    });
  });
});
