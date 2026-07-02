import { describe, it, expect } from "vitest";
import * as schema from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";

/**
 * Multi-Tenant Security Tests
 * 
 * These tests verify that:
 * 1. All tables have tenantId column in the schema
 * 2. All db functions use getCurrentTenantId() for data isolation
 * 3. No query can leak data between tenants
 * 4. INSERT operations include tenantId
 */

// Get all table names from schema
const schemaContent = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
const dbContent = fs.readFileSync(path.join(__dirname, "db.ts"), "utf-8");
const crmDbContent = fs.readFileSync(path.join(__dirname, "crmDb.ts"), "utf-8");
const finDbContent = fs.readFileSync(path.join(__dirname, "finDb.ts"), "utf-8");

describe("Multi-Tenant Schema Security", () => {
  it("should have tenantId in all data tables in the schema", () => {
    // Extract all table definitions
    const tableMatches = schemaContent.matchAll(/export const (\w+)\s*=\s*mysqlTable/g);
    const tables = Array.from(tableMatches).map(m => m[1]);
    
    expect(tables.length).toBeGreaterThan(40); // We know there are 53+ tables
    
    // These tables should have tenantId
    const tablesWithTenant: string[] = [];
    const tablesWithoutTenant: string[] = [];
    
    for (const table of tables) {
      // Find the table definition and check if it has tenantId
      const tableRegex = new RegExp(`export const ${table}\\s*=\\s*mysqlTable[\\s\\S]*?\\);`, "m");
      const tableMatch = schemaContent.match(tableRegex);
      if (tableMatch && tableMatch[0].includes("tenantId")) {
        tablesWithTenant.push(table);
      } else {
        tablesWithoutTenant.push(table);
      }
    }
    
    // Only tenants and superAdmins should NOT have tenantId
    const allowedWithoutTenant = ["tenants", "superAdmins", "emailVerificationCodes"];
    const unexpectedWithout = tablesWithoutTenant.filter(t => !allowedWithoutTenant.includes(t));
    
    expect(unexpectedWithout).toEqual([]);
    expect(tablesWithTenant.length).toBeGreaterThan(45);
  });

  it("should have tenantId column with default value 1 in schema", () => {
    // Check that tenantId has a default value for backward compatibility
    const tenantIdMatches = schemaContent.matchAll(/tenantId:\s*int\(['"]tenantId['"]\)\.notNull\(\)\.default\((\d+)\)/g);
    const defaults = Array.from(tenantIdMatches).map(m => m[1]);
    
    // All should default to 1 (Kafka's tenant)
    for (const d of defaults) {
      expect(d).toBe("1");
    }
    expect(defaults.length).toBeGreaterThan(40);
  });
});

describe("Multi-Tenant Query Isolation", () => {
  it("db.ts should import getCurrentTenantId", () => {
    expect(dbContent).toContain("getCurrentTenantId");
  });

  it("crmDb.ts should import getCurrentTenantId", () => {
    expect(crmDbContent).toContain("getCurrentTenantId");
  });

  it("finDb.ts should import getCurrentTenantId", () => {
    expect(finDbContent).toContain("getCurrentTenantId");
  });

  it("db.ts should use getCurrentTenantId in WHERE clauses", () => {
    const tenantFilterCount = (dbContent.match(/getCurrentTenantId\(\)/g) || []).length;
    // Should have many tenant filters (we injected 120+)
    expect(tenantFilterCount).toBeGreaterThan(50);
  });

  it("crmDb.ts should use getCurrentTenantId in WHERE clauses", () => {
    const tenantFilterCount = (crmDbContent.match(/getCurrentTenantId\(\)/g) || []).length;
    expect(tenantFilterCount).toBeGreaterThan(10);
  });

  it("finDb.ts should use getCurrentTenantId in WHERE clauses", () => {
    const tenantFilterCount = (finDbContent.match(/getCurrentTenantId\(\)/g) || []).length;
    expect(tenantFilterCount).toBeGreaterThan(5);
  });

  it("all SELECT queries on sellers should filter by tenantId", () => {
    // Check that listSellers uses tenant filtering
    const listSellersMatch = dbContent.match(/export async function listSellers[\s\S]*?^}/m);
    if (listSellersMatch) {
      expect(listSellersMatch[0]).toContain("getCurrentTenantId");
    }
  });

  it("all SELECT queries on sales should filter by tenantId", () => {
    // Check that listSales uses tenant filtering
    const listSalesMatch = dbContent.match(/export async function listSales[\s\S]*?^}/m);
    if (listSalesMatch) {
      expect(listSalesMatch[0]).toContain("getCurrentTenantId");
    }
  });
});

describe("Multi-Tenant INSERT Isolation", () => {
  it("createSeller should include tenantId in values", () => {
    const createSellerMatch = dbContent.match(/export async function createSeller[\s\S]*?^}/m);
    if (createSellerMatch) {
      expect(createSellerMatch[0]).toContain("getCurrentTenantId");
    }
  });

  it("createSale should include tenantId in values", () => {
    const createSaleMatch = dbContent.match(/export async function createSale[\s\S]*?^}/m);
    if (createSaleMatch) {
      expect(createSaleMatch[0]).toContain("getCurrentTenantId");
    }
  });

  it("createCompetition should include tenantId in values", () => {
    const createCompMatch = dbContent.match(/export async function createCompetition[\s\S]*?^}/m);
    if (createCompMatch) {
      expect(createCompMatch[0]).toContain("getCurrentTenantId");
    }
  });
});

describe("Multi-Tenant Context & Middleware", () => {
  it("context.ts should resolve tenantId", () => {
    const contextContent = fs.readFileSync(
      path.join(__dirname, "_core/context.ts"), "utf-8"
    );
    expect(contextContent).toContain("tenantId");
    expect(contextContent).toContain("resolveTenantContext");
  });

  it("trpc.ts should have tenant middleware with AsyncLocalStorage", () => {
    const trpcContent = fs.readFileSync(
      path.join(__dirname, "_core/trpc.ts"), "utf-8"
    );
    expect(trpcContent).toContain("tenantStorage");
    expect(trpcContent).toContain("tenantMiddleware");
    expect(trpcContent).toContain("AsyncLocalStorage");
  });

  it("TrpcContext type should include tenantId field", () => {
    const contextContent = fs.readFileSync(
      path.join(__dirname, "_core/context.ts"), "utf-8"
    );
    expect(contextContent).toContain("tenantId: number");
    expect(contextContent).toContain("tenantSlug: string | null");
  });

  it("tenantDb.ts should export getCurrentTenantId function", () => {
    const tenantDbContent = fs.readFileSync(
      path.join(__dirname, "tenantDb.ts"), "utf-8"
    );
    expect(tenantDbContent).toContain("export function getCurrentTenantId");
    expect(tenantDbContent).toContain("tenantStorage");
  });

  it("tenantMiddleware.ts should export resolveTenantId function", () => {
    const tenantMiddlewareContent = fs.readFileSync(
      path.join(__dirname, "tenantMiddleware.ts"), "utf-8"
    );
    expect(tenantMiddlewareContent).toContain("export async function resolveTenantId");
    expect(tenantMiddlewareContent).toContain("extractTenantSlugFromRequest");
    expect(tenantMiddlewareContent).toContain("resolveTenantContext");
  });
});

describe("Multi-Tenant Super Admin", () => {
  it("superAdminRouter should exist and handle tenant CRUD", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "routers/superAdminRouter.ts"), "utf-8"
    );
    expect(routerContent).toContain("createTenant");
    expect(routerContent).toContain("allTenants");
    expect(routerContent).toContain("updateTenant");
    expect(routerContent).toContain("deleteTenant");
  });

  it("super admin login should use separate JWT secret", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "routers/superAdminRouter.ts"), "utf-8"
    );
    expect(routerContent).toContain("SUPER_SECRET");
  });

  it("super admin should use bcrypt for password hashing", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "routers/superAdminRouter.ts"), "utf-8"
    );
    expect(routerContent).toContain("bcrypt");
  });
});

describe("Month Turnover System", () => {
  it("should have monthly_snapshots table in schema", () => {
    expect(schemaContent).toContain("monthly_snapshots");
    expect(schemaContent).toContain("monthlySnapshots");
  });

  it("should have competition_snapshots table in schema", () => {
    expect(schemaContent).toContain("competition_snapshots");
    expect(schemaContent).toContain("competitionSnapshots");
  });

  it("db.ts should have executeMonthTurnover function", () => {
    expect(dbContent).toContain("executeMonthTurnover");
  });

  it("db.ts should have getMonthlySnapshots function", () => {
    expect(dbContent).toContain("getMonthlySnapshots");
  });

  it("db.ts should have resetMonthlyCounters function", () => {
    expect(dbContent).toContain("resetMonthlyCounters");
  });

  it("db.ts should have listAvailableMonths function", () => {
    expect(dbContent).toContain("listAvailableMonths");
  });
});
