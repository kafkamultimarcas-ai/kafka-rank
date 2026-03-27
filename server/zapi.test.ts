import { describe, it, expect } from "vitest";

describe("Z-API credentials", () => {
  it("should have ZAPI_INSTANCE_ID configured", () => {
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    expect(instanceId).toBeDefined();
    expect(instanceId).not.toBe("");
    expect(instanceId!.length).toBeGreaterThan(10);
  });

  it("should have ZAPI_TOKEN configured", () => {
    const token = process.env.ZAPI_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    expect(token!.length).toBeGreaterThan(10);
  });

  it("should have ZAPI_CLIENT_TOKEN configured", () => {
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;
    expect(clientToken).toBeDefined();
    expect(clientToken).not.toBe("");
    expect(clientToken!.length).toBeGreaterThan(10);
  });

  it("should be able to connect to Z-API and verify instance is connected", async () => {
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;
    const apiUrl = process.env.ZAPI_API_URL || "https://api.z-api.io";

    const response = await fetch(
      `${apiUrl}/instances/${instanceId}/token/${token}/status`,
      {
        method: "GET",
        headers: {
          "Client-Token": clientToken!,
        },
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.connected).toBe(true);
    console.log("Z-API status:", JSON.stringify(data));
  });
});
