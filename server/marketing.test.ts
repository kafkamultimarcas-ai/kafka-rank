import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
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

describe("mktStrategies router", () => {
  const adminCaller = appRouter.createCaller(createAdminContext());
  const publicCaller = appRouter.createCaller(createPublicContext());

  it("lists strategies (public)", async () => {
    const result = await publicCaller.mktStrategies.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a strategy (admin)", async () => {
    const result = await adminCaller.mktStrategies.create({
      title: "Test Strategy",
      description: "Test description",
      category: "redes_sociais",
      status: "planejada",
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("updates a strategy (admin)", async () => {
    // First create one
    const created = await adminCaller.mktStrategies.create({
      title: "Strategy to Update",
    });
    const result = await adminCaller.mktStrategies.update({
      id: created.id,
      title: "Updated Strategy",
      status: "em_andamento",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes a strategy (admin)", async () => {
    const created = await adminCaller.mktStrategies.create({
      title: "Strategy to Delete",
    });
    const result = await adminCaller.mktStrategies.delete({ id: created.id });
    expect(result).toEqual({ success: true });
  });
});

describe("mktTasks router", () => {
  const adminCaller = appRouter.createCaller(createAdminContext());
  const publicCaller = appRouter.createCaller(createPublicContext());

  it("lists tasks (public)", async () => {
    const result = await publicCaller.mktTasks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a task (admin)", async () => {
    const result = await adminCaller.mktTasks.create({
      title: "Test Task",
      description: "Test task description",
      priority: "alta",
      status: "pendente",
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("updates a task (admin)", async () => {
    const created = await adminCaller.mktTasks.create({
      title: "Task to Update",
    });
    const result = await adminCaller.mktTasks.update({
      id: created.id,
      title: "Updated Task",
      status: "concluida",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes a task (admin)", async () => {
    const created = await adminCaller.mktTasks.create({
      title: "Task to Delete",
    });
    const result = await adminCaller.mktTasks.delete({ id: created.id });
    expect(result).toEqual({ success: true });
  });

  it("creates a task linked to a strategy", async () => {
    const strategy = await adminCaller.mktStrategies.create({
      title: "Strategy for Task Link",
    });
    const task = await adminCaller.mktTasks.create({
      title: "Linked Task",
      strategyId: strategy.id,
    });
    expect(task).toHaveProperty("id");

    // Verify it appears when listing by strategyId
    const tasks = await publicCaller.mktTasks.list({ strategyId: strategy.id });
    expect(tasks.some(t => t.id === task.id)).toBe(true);

    // Cleanup
    await adminCaller.mktStrategies.delete({ id: strategy.id });
  });
});
