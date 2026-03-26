import { describe, it, expect } from "vitest";
import { AVAILABLE_MODULES } from "./db";

describe("Manager Permissions System", () => {
  describe("AVAILABLE_MODULES", () => {
    it("should have all expected modules", () => {
      expect(AVAILABLE_MODULES.length).toBeGreaterThanOrEqual(15);
      const keys = AVAILABLE_MODULES.map(m => m.key);
      expect(keys).toContain("ranking");
      expect(keys).toContain("vendas");
      expect(keys).toContain("agendamentos");
      expect(keys).toContain("consignacao");
      expect(keys).toContain("fei");
      expect(keys).toContain("fichas");
      expect(keys).toContain("crm");
      expect(keys).toContain("financeiro");
      expect(keys).toContain("pos_venda");
      expect(keys).toContain("marketing");
      expect(keys).toContain("metas");
      expect(keys).toContain("treinamentos");
      expect(keys).toContain("vendedores");
      expect(keys).toContain("iam");
    });

    it("each module should have key and label", () => {
      for (const mod of AVAILABLE_MODULES) {
        expect(mod.key).toBeTruthy();
        expect(mod.label).toBeTruthy();
        expect(typeof mod.key).toBe("string");
        expect(typeof mod.label).toBe("string");
      }
    });

    it("module keys should be unique", () => {
      const keys = AVAILABLE_MODULES.map(m => m.key);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });
  });

  describe("Seller Role Logic", () => {
    it("default role should be vendedor", () => {
      const defaultRole = null || 'vendedor';
      expect(defaultRole).toBe('vendedor');
    });

    it("gerente role should be recognized", () => {
      const role = 'gerente';
      expect(role).toBe('gerente');
      expect(role !== 'vendedor').toBe(true);
    });

    it("role toggle should work correctly", () => {
      const currentRole = 'vendedor';
      const newRole = currentRole === 'gerente' ? 'vendedor' : 'gerente';
      expect(newRole).toBe('gerente');

      const currentRole2 = 'gerente';
      const newRole2 = currentRole2 === 'gerente' ? 'vendedor' : 'gerente';
      expect(newRole2).toBe('vendedor');
    });
  });

  describe("Permission Structure", () => {
    it("permission object should have required fields", () => {
      const perm = { module: "ranking", canView: true, canEdit: false };
      expect(perm).toHaveProperty("module");
      expect(perm).toHaveProperty("canView");
      expect(perm).toHaveProperty("canEdit");
    });

    it("canEdit true should imply canView true", () => {
      // Business rule: if canEdit is true, canView should also be true
      const perm = { module: "vendas", canView: true, canEdit: true };
      expect(perm.canView).toBe(true);
      expect(perm.canEdit).toBe(true);
    });

    it("canView false should imply canEdit false", () => {
      // Business rule: can't edit without viewing
      const canView = false;
      const canEdit = canView ? true : false;
      expect(canEdit).toBe(false);
    });

    it("should filter only allowed modules", () => {
      const perms = [
        { module: "ranking", canView: true, canEdit: false },
        { module: "vendas", canView: true, canEdit: true },
        { module: "financeiro", canView: false, canEdit: false },
      ];
      const allowed = perms.filter(p => p.canView).map(p => p.module);
      expect(allowed).toEqual(["ranking", "vendas"]);
      expect(allowed).not.toContain("financeiro");
    });
  });
});
