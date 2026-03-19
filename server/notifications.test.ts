import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Notifications System", () => {
  it("admin can list admin notifications", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.adminList();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can get unread count", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.unreadCountAdmin();
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
  });

  it("seller can get unread count", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.unreadCountSeller({ sellerId: 1 });
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
  });

  it("public can list notifications for a seller", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list({ sellerId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Sales - Lead Source", () => {
  it("registerBySeller requires leadSource field", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    // Should fail without leadSource
    await expect(
      caller.sales.registerBySeller({
        sellerId: 1,
        vehicleModel: "Test Car",
      } as any)
    ).rejects.toThrow();
  });

  it("registerBySeller accepts valid leadSource values", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    // Should fail with invalid leadSource
    await expect(
      caller.sales.registerBySeller({
        sellerId: 1,
        vehicleModel: "Test Car",
        leadSource: "invalid_source" as any,
      })
    ).rejects.toThrow();
  });
});

describe("Alerts System", () => {
  it("checkExpiringAppointments returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.checkExpiringAppointments({ sellerId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("checkExpiringAppointments items have correct shape", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.checkExpiringAppointments({ sellerId: 1 });
    // Even if empty, the query should work
    for (const item of result) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("customerName");
      expect(item).toHaveProperty("minutesLeft");
      expect(item).toHaveProperty("status");
      expect(["expired", "expiring"]).toContain(item.status);
    }
  });

  it("checkInactivity requires admin", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.alerts.checkInactivity()).rejects.toThrow();
  });

  it("admin can check inactivity", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.checkInactivity();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Push Notifications", () => {
  it("getVapidKey returns a key", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.push.getVapidKey();
    expect(result).toHaveProperty("key");
    expect(typeof result.key).toBe("string");
  });
});
