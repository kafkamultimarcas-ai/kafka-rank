import { describe, it, expect } from "vitest";

describe("Asaas API Key Validation (base64)", () => {
  it("should decode ASAAS_API_KEY from base64 and call the API successfully", async () => {
    const raw = process.env.ASAAS_API_KEY;

    if (!raw) {
      console.log("ASAAS_API_KEY not available in test context - skipping");
      expect(true).toBe(true);
      return;
    }

    // Decode from base64
    const decoded = Buffer.from(raw, "base64").toString("utf-8");

    // Should start with $aact (Asaas key format)
    expect(decoded.startsWith("$aact")).toBe(true);
    expect(decoded.length).toBeGreaterThan(50);

    // Call the Asaas sandbox API
    const response = await fetch("https://api-sandbox.asaas.com/v3/finance/balance", {
      headers: { "access_token": decoded },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("balance");
    console.log("API call successful, balance:", data.balance);
  });
});
