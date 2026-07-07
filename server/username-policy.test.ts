import { beforeEach, describe, expect, it, vi } from "vitest";
import { admins, managers, sellers, superAdmins } from "../drizzle/schema";

const tableRows = new Map<any, any[]>();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: (table: any) => ({
        where: () => ({
          limit: async () => tableRows.get(table) ?? [],
        }),
      }),
    }),
  })),
}));

describe("usernamePolicy", () => {
  beforeEach(() => {
    tableRows.clear();
  });

  it("normaliza username para minúsculas e sem espaços laterais", async () => {
    const { normalizeUsername, assertGlobalUsernameAvailable } = await import("./usernamePolicy");

    expect(normalizeUsername("  Joao.Silva  ")).toBe("joao.silva");
    await expect(assertGlobalUsernameAvailable("  Joao.Silva  ")).resolves.toBe("joao.silva");
  });

  it("rejeita username já usado por vendedor", async () => {
    tableRows.set(sellers, [{ id: 7, username: "joao", tenantId: 2 }]);
    const { assertGlobalUsernameAvailable } = await import("./usernamePolicy");

    await expect(assertGlobalUsernameAvailable("joao")).rejects.toThrow(/já está em uso/i);
  });

  it("rejeita username já usado por super admin", async () => {
    tableRows.set(superAdmins, [{ id: 1, username: "master" }]);
    const { assertGlobalUsernameAvailable } = await import("./usernamePolicy");

    await expect(assertGlobalUsernameAvailable("MASTER")).rejects.toThrow(/já está em uso/i);
  });

  it("permite manter o mesmo username ao atualizar o próprio registro", async () => {
    tableRows.set(managers, [{ id: 9, username: "gerente", tenantId: 4 }]);
    const { assertGlobalUsernameAvailable } = await import("./usernamePolicy");

    await expect(
      assertGlobalUsernameAvailable("gerente", {
        allow: [{ ownerType: "manager", ownerId: 9 }],
      })
    ).resolves.toBe("gerente");
  });

  it("considera ocupação em qualquer papel do sistema", async () => {
    tableRows.set(admins, [{ id: 5, username: "shared", tenantId: 3 }]);
    tableRows.set(managers, [{ id: 8, username: "shared", tenantId: 3 }]);
    const { findGlobalUsernameOwners } = await import("./usernamePolicy");

    const owners = await findGlobalUsernameOwners("shared");

    expect(owners).toEqual([
      { ownerType: "admin", ownerId: 5, tenantId: 3, username: "shared" },
      { ownerType: "manager", ownerId: 8, tenantId: 3, username: "shared" },
    ]);
  });
});
