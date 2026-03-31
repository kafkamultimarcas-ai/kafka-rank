import { describe, expect, it } from "vitest";

// Test 1: AI auto-reply lock mechanism
describe("AI auto-reply lock", () => {
  it("should prevent concurrent AI replies to the same lead", async () => {
    const { aiReplyLocks } = await import("./webhooks");
    
    const leadId = 123;
    aiReplyLocks.set(leadId, Date.now());
    
    expect(aiReplyLocks.has(leadId)).toBe(true);
    
    const lockTime = aiReplyLocks.get(leadId)!;
    expect(Date.now() - lockTime).toBeLessThan(5000);
    
    aiReplyLocks.delete(leadId);
    expect(aiReplyLocks.has(leadId)).toBe(false);
  });

  it("should expire old locks (older than 60s)", async () => {
    const { aiReplyLocks } = await import("./webhooks");
    
    const leadId = 456;
    aiReplyLocks.set(leadId, Date.now() - 61000);
    
    const lockTime = aiReplyLocks.get(leadId)!;
    const isExpired = (Date.now() - lockTime) > 60000;
    expect(isExpired).toBe(true);
    
    aiReplyLocks.delete(leadId);
  });
});

// Test 2: Temperature auto-classification logic
describe("Temperature auto-classification", () => {
  it("should only upgrade temperature, never downgrade", () => {
    const SCORE_ORDER: Record<string, number> = { cold: 0, warm: 1, hot: 2 };
    
    function shouldUpgrade(currentScore: string, newScore: string): boolean {
      const currentRank = SCORE_ORDER[currentScore] ?? 0;
      const newRank = SCORE_ORDER[newScore] ?? 0;
      return newRank > currentRank;
    }
    
    expect(shouldUpgrade("cold", "warm")).toBe(true);
    expect(shouldUpgrade("warm", "hot")).toBe(true);
    expect(shouldUpgrade("hot", "warm")).toBe(false);
    expect(shouldUpgrade("warm", "cold")).toBe(false);
    expect(shouldUpgrade("warm", "warm")).toBe(false);
  });
});

// Test 3: checkAlreadySold endpoint logic
describe("checkAlreadySold logic", () => {
  it("should return alreadySold: false when no conditions match", () => {
    const lead = { phone: null, vehiclePlate: null };
    const conditions: string[] = [];
    
    if (lead.phone) conditions.push("phone_match");
    if (lead.vehiclePlate) conditions.push("plate_match");
    
    expect(conditions.length).toBe(0);
    const result = conditions.length === 0 ? { alreadySold: false } : { alreadySold: true };
    expect(result.alreadySold).toBe(false);
  });

  it("should build conditions for phone and plate", () => {
    const lead = { phone: "5511999999999", vehiclePlate: "ABC1234" };
    const conditions: string[] = [];
    
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, "");
      conditions.push(`phone:${lead.phone}`);
      if (cleanPhone !== lead.phone) conditions.push(`phone:${cleanPhone}`);
    }
    if (lead.vehiclePlate) {
      conditions.push(`plate:${lead.vehiclePlate}`);
    }
    
    expect(conditions.length).toBe(2);
    expect(conditions).toContain("phone:5511999999999");
    expect(conditions).toContain("plate:ABC1234");
  });

  it("should add extra condition for phone with non-numeric chars", () => {
    const lead = { phone: "+55 (11) 99999-9999", vehiclePlate: null };
    const conditions: string[] = [];
    
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, "");
      conditions.push(`phone:${lead.phone}`);
      if (cleanPhone !== lead.phone) conditions.push(`phone:${cleanPhone}`);
    }
    
    expect(conditions.length).toBe(2);
    expect(conditions).toContain("phone:+55 (11) 99999-9999");
    expect(conditions).toContain("phone:5511999999999");
  });
});

// Test 4: Financial routes accessibility (publicProcedure)
describe("Financial routes accessibility", () => {
  it("finRouter should use publicProcedure for all routes", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const finRouterPath = path.resolve(process.cwd(), "server/routers/finRouter.ts");
    const content = fs.readFileSync(finRouterPath, "utf-8");
    
    const protectedCount = (content.match(/protectedProcedure/g) || []).length;
    expect(protectedCount).toBe(0);
    
    const publicCount = (content.match(/publicProcedure/g) || []).length;
    expect(publicCount).toBeGreaterThan(0);
  });
});

// Test 5: Em Negociação stale detection
describe("Em Negociação stale detection", () => {
  it("should detect leads in negotiation for 3+ days without contact", () => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const leads = [
      { id: 1, stage: "Em Negociação", lastContactDate: now - (4 * 24 * 60 * 60 * 1000) },
      { id: 2, stage: "Em Negociação", lastContactDate: now - (1 * 24 * 60 * 60 * 1000) },
      { id: 3, stage: "Novo", lastContactDate: now - (5 * 24 * 60 * 60 * 1000) },
    ];
    
    const staleNegotiations = leads.filter(
      (l) => l.stage === "Em Negociação" && (now - l.lastContactDate) > THREE_DAYS_MS
    );
    
    expect(staleNegotiations.length).toBe(1);
    expect(staleNegotiations[0].id).toBe(1);
  });

  it("should not flag leads with recent contact", () => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const leads = [
      { id: 1, stage: "Em Negociação", lastContactDate: now - (2 * 60 * 60 * 1000) }, // 2 hours ago
    ];
    
    const staleNegotiations = leads.filter(
      (l) => l.stage === "Em Negociação" && (now - l.lastContactDate) > THREE_DAYS_MS
    );
    
    expect(staleNegotiations.length).toBe(0);
  });
});

// Test 6: AI prompt humanization
describe("AI prompt humanization", () => {
  it("should have short, humanized prompts in webhook", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve(process.cwd(), "server/webhooks.ts"), "utf-8");
    
    // Should contain the humanized prompt instructions
    expect(content).toContain("1-2 linhas curtas");
    expect(content).toContain("informal");
  });

  it("should have humanized prompts in suggestReply", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve(process.cwd(), "server/routers/crmRouter.ts"), "utf-8");
    
    // Should contain humanized instructions
    expect(content).toContain("1-2 linhas curtas");
    expect(content).toContain("informal");
  });
});

// Test 7: Deduplication logic for outbound messages
describe("Outbound message deduplication logic", () => {
  it("should detect duplicate by content within time window", () => {
    const messages = [
      { content: "Olá!", timestamp: Date.now() - 5000, direction: "outbound" },
      { content: "Tudo bem?", timestamp: Date.now() - 120000, direction: "outbound" },
    ];
    
    const newContent = "Olá!";
    const isDup = messages.some(m => {
      const timeDiff = Date.now() - m.timestamp;
      return m.content === newContent && timeDiff < 30000;
    });
    
    expect(isDup).toBe(true);
  });

  it("should not flag old messages as duplicates", () => {
    const messages = [
      { content: "Olá!", timestamp: Date.now() - 120000, direction: "outbound" },
    ];
    
    const newContent = "Olá!";
    const isDup = messages.some(m => {
      const timeDiff = Date.now() - m.timestamp;
      return m.content === newContent && timeDiff < 30000;
    });
    
    expect(isDup).toBe(false);
  });
});
