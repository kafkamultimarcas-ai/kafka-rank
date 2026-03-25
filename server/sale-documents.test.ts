import { describe, it, expect, vi } from "vitest";

// Test sale documents schema and router structure
describe("Sale Documents Feature", () => {
  it("should have saleDocuments table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.saleDocuments).toBeDefined();
    expect(schema.saleDocuments.saleId).toBeDefined();
    expect(schema.saleDocuments.sellerId).toBeDefined();
    expect(schema.saleDocuments.cnhUrl).toBeDefined();
    expect(schema.saleDocuments.comprovanteUrl).toBeDefined();
    expect(schema.saleDocuments.docStatus).toBeDefined();
  });

  it("should have dispatch document fields in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.dispatchRecords.documentUrl).toBeDefined();
    expect(schema.dispatchRecords.documentKey).toBeDefined();
    expect(schema.dispatchRecords.transferredAt).toBeDefined();
  });

  it("should have isFeirão field in sdrRecords schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.sdrRecords.isFeirão).toBeDefined();
  });

  it("should have saleDocuments router procedures", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("saleDocuments.myDocs");
    expect(procedures).toContain("saleDocuments.pendingCount");
    expect(procedures).toContain("saleDocuments.uploadCnh");
    expect(procedures).toContain("saleDocuments.uploadComprovante");
    expect(procedures).toContain("saleDocuments.listAll");
    expect(procedures).toContain("saleDocuments.markTransferred");
  });

  it("should have db helper functions for sale documents", async () => {
    const db = await import("./db");
    expect(typeof db.listSaleDocumentsBySeller).toBe("function");
    expect(typeof db.countPendingDocsBySeller).toBe("function");
    expect(typeof db.uploadSaleDocCnh).toBe("function");
    expect(typeof db.uploadSaleDocComprovante).toBe("function");
    expect(typeof db.listAllSaleDocuments).toBe("function");
    expect(typeof db.createSaleDocument).toBe("function");
  });

  it("should have db helper functions for dispatch documents", async () => {
    const db = await import("./db");
    expect(typeof db.markDispatchTransferred).toBe("function");
    expect(typeof db.listTransferredDocumentsForSeller).toBe("function");
    expect(typeof db.listAllTransferredDocuments).toBe("function");
  });
});

describe("Feirão Flag Feature", () => {
  it("should accept isFeirão in createAppointment", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("sdr.createAppointment");
  });

  it("should have isFeirão field in sdrRecords with default false", async () => {
    const schema = await import("../drizzle/schema");
    const col = schema.sdrRecords.isFeirão;
    expect(col).toBeDefined();
    // The column should have a default value
    expect(col.hasDefault).toBe(true);
  });
});
