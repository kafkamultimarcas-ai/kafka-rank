import { describe, it, expect, vi } from "vitest";

// Test the manager mentor router structure and helpers
describe("Manager Mentor Router", () => {
  it("should export managerMentorRouter", async () => {
    const mod = await import("./routers/managerMentorRouter");
    expect(mod.managerMentorRouter).toBeDefined();
    expect(mod.managerMentorRouter._def).toBeDefined();
  });

  it("should have all required procedures", async () => {
    const mod = await import("./routers/managerMentorRouter");
    const router = mod.managerMentorRouter;
    const procedures = Object.keys(router._def.procedures);
    
    expect(procedures).toContain("getTeamAnalytics");
    expect(procedures).toContain("getTasks");
    expect(procedures).toContain("completeTask");
    expect(procedures).toContain("getAlerts");
    expect(procedures).toContain("dismissAlert");
    expect(procedures).toContain("getMentorMessages");
    expect(procedures).toContain("markMessageRead");
    expect(procedures).toContain("generateDailyInsights");
    expect(procedures).toContain("sendMotivationalMessage");
  });

  it("should have the router wired in appRouter", async () => {
    const mod = await import("./routers");
    const appRouter = mod.appRouter;
    const topLevelKeys = Object.keys(appRouter._def.procedures);
    
    // Check that managerMentor procedures are accessible
    const mentorProcedures = topLevelKeys.filter(k => k.startsWith("managerMentor."));
    expect(mentorProcedures.length).toBeGreaterThan(0);
    expect(mentorProcedures).toContain("managerMentor.getTeamAnalytics");
    expect(mentorProcedures).toContain("managerMentor.generateDailyInsights");
  });
});

describe("Manager Mentor Schema", () => {
  it("should have manager_tasks table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.managerTasks).toBeDefined();
    expect(typeof schema.managerTasks).toBe("object");
  });

  it("should have manager_alerts table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.managerAlerts).toBeDefined();
  });

  it("should have manager_mentor_messages table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.managerMentorMessages).toBeDefined();
  });

  it("should have correct columns on managerTasks", async () => {
    const schema = await import("../drizzle/schema");
    const columns = Object.keys(schema.managerTasks);
    expect(columns).toContain("id");
    expect(columns).toContain("managerId");
    expect(columns).toContain("type");
    expect(columns).toContain("priority");
    expect(columns).toContain("title");
    expect(columns).toContain("completed");
  });

  it("should have correct type exports for managerAlerts", async () => {
    const schema = await import("../drizzle/schema");
    // Verify the table has the expected structure by checking it's a valid drizzle table
    expect(typeof schema.managerAlerts).toBe("object");
    expect(schema.managerAlerts).toHaveProperty("id");
    expect(schema.managerAlerts).toHaveProperty("managerId");
    expect(schema.managerAlerts).toHaveProperty("severity");
  });

  it("should have correct type exports for managerMentorMessages", async () => {
    const schema = await import("../drizzle/schema");
    expect(typeof schema.managerMentorMessages).toBe("object");
    expect(schema.managerMentorMessages).toHaveProperty("id");
    expect(schema.managerMentorMessages).toHaveProperty("managerId");
    expect(schema.managerMentorMessages).toHaveProperty("content");
    expect(schema.managerMentorMessages).toHaveProperty("generatedFor");
  });
});
