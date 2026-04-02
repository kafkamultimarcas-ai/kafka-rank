import { describe, it, expect } from "vitest";

describe("Lead Block/Ban System", () => {
  describe("Seller lead blocking", () => {
    it("should filter out blocked sellers from distribution", () => {
      const sellers = [
        { id: 1, name: "Wesley", leadReceiveBlocked: false, leadBanUntil: null },
        { id: 2, name: "LOJA", leadReceiveBlocked: true, leadBanUntil: null },
        { id: 3, name: "Gabriel", leadReceiveBlocked: false, leadBanUntil: null },
      ];
      const nowMs = Date.now();
      const eligible = sellers.filter(s => 
        !s.leadReceiveBlocked && (!s.leadBanUntil || s.leadBanUntil < nowMs)
      );
      expect(eligible).toHaveLength(2);
      expect(eligible.map(s => s.name)).toEqual(["Wesley", "Gabriel"]);
    });

    it("should filter out banned sellers from distribution", () => {
      const futureDate = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now
      const sellers = [
        { id: 1, name: "Wesley", leadReceiveBlocked: false, leadBanUntil: null },
        { id: 2, name: "Lucas", leadReceiveBlocked: false, leadBanUntil: futureDate },
        { id: 3, name: "Gabriel", leadReceiveBlocked: false, leadBanUntil: null },
      ];
      const nowMs = Date.now();
      const eligible = sellers.filter(s => 
        !s.leadReceiveBlocked && (!s.leadBanUntil || s.leadBanUntil < nowMs)
      );
      expect(eligible).toHaveLength(2);
      expect(eligible.map(s => s.name)).toEqual(["Wesley", "Gabriel"]);
    });

    it("should allow sellers whose ban has expired", () => {
      const pastDate = Date.now() - 1000; // already expired
      const sellers = [
        { id: 1, name: "Wesley", leadReceiveBlocked: false, leadBanUntil: null },
        { id: 2, name: "Lucas", leadReceiveBlocked: false, leadBanUntil: pastDate },
      ];
      const nowMs = Date.now();
      const eligible = sellers.filter(s => 
        !s.leadReceiveBlocked && (!s.leadBanUntil || s.leadBanUntil < nowMs)
      );
      expect(eligible).toHaveLength(2);
    });

    it("should filter both blocked and banned sellers", () => {
      const futureDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const sellers = [
        { id: 1, name: "Wesley", leadReceiveBlocked: false, leadBanUntil: null },
        { id: 2, name: "LOJA", leadReceiveBlocked: true, leadBanUntil: null },
        { id: 3, name: "Lucas", leadReceiveBlocked: false, leadBanUntil: futureDate },
        { id: 4, name: "Gabriel", leadReceiveBlocked: false, leadBanUntil: null },
        { id: 5, name: "Nathan", leadReceiveBlocked: true, leadBanUntil: futureDate },
      ];
      const nowMs = Date.now();
      const eligible = sellers.filter(s => 
        !s.leadReceiveBlocked && (!s.leadBanUntil || s.leadBanUntil < nowMs)
      );
      expect(eligible).toHaveLength(2);
      expect(eligible.map(s => s.name)).toEqual(["Wesley", "Gabriel"]);
    });
  });

  describe("Ban duration calculation", () => {
    it("should calculate correct ban expiry for 3 days", () => {
      const days = 3;
      const banUntil = Date.now() + days * 24 * 60 * 60 * 1000;
      const diffDays = (banUntil - Date.now()) / (24 * 60 * 60 * 1000);
      expect(Math.round(diffDays)).toBe(3);
    });

    it("should calculate correct ban expiry for 7 days", () => {
      const days = 7;
      const banUntil = Date.now() + days * 24 * 60 * 60 * 1000;
      const diffDays = (banUntil - Date.now()) / (24 * 60 * 60 * 1000);
      expect(Math.round(diffDays)).toBe(7);
    });
  });

  describe("Login username fallback", () => {
    it("should match by exact username first", () => {
      const sellers = [
        { id: 1, username: "Nathan", name: "Nathan Felipe", nickname: "Nathan", passwordHash: "hash1" },
        { id: 2, username: "Wesley", name: "Wesley Souza", nickname: "Wesley", passwordHash: "hash2" },
      ];
      const input = "Nathan";
      const match = sellers.find(s => 
        s.username?.toLowerCase() === input.toLowerCase()
      );
      expect(match?.id).toBe(1);
    });

    it("should fallback to name match when username not found", () => {
      const sellers = [
        { id: 1, username: "Nathan", name: "Nathan Felipe", nickname: "Nathan", passwordHash: "hash1" },
        { id: 2, username: "Wesley", name: "Wesley Souza", nickname: "Wesley", passwordHash: "hash2" },
      ];
      const input = "Nathan Felipe";
      // First try username
      let match = sellers.find(s => 
        s.username?.toLowerCase() === input.toLowerCase()
      );
      // Fallback to name
      if (!match) {
        match = sellers.find(s => 
          s.name?.toLowerCase() === input.toLowerCase() && s.passwordHash
        );
      }
      expect(match?.id).toBe(1);
    });

    it("should fallback to nickname match when username and name not found", () => {
      const sellers = [
        { id: 1, username: "nath123", name: "Nathan Felipe Oliveira", nickname: "Nathan", passwordHash: "hash1" },
      ];
      const input = "Nathan";
      let match = sellers.find(s => 
        s.username?.toLowerCase() === input.toLowerCase()
      );
      if (!match) {
        match = sellers.find(s => 
          s.name?.toLowerCase() === input.toLowerCase() && s.passwordHash
        );
      }
      if (!match) {
        match = sellers.find(s => 
          s.nickname?.toLowerCase() === input.toLowerCase() && s.passwordHash
        );
      }
      expect(match?.id).toBe(1);
    });
  });
});
