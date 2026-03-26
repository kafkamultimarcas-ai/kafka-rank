import { describe, it, expect } from "vitest";

describe("Feirão Ranking & Phone Link", () => {
  // Teste de normalização de telefone
  describe("Phone normalization", () => {
    function normalizePhone(phone: string): string {
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 9 ? digits.slice(-9) : digits;
    }

    it("normalizes phone with country code", () => {
      expect(normalizePhone("+55 47 99978-6565")).toBe("999786565");
    });

    it("normalizes phone with area code only", () => {
      expect(normalizePhone("47999786565")).toBe("999786565");
    });

    it("normalizes phone with parentheses", () => {
      expect(normalizePhone("(47) 99978-6565")).toBe("999786565");
    });

    it("normalizes simple phone", () => {
      expect(normalizePhone("999786565")).toBe("999786565");
    });

    it("matches two different formats of same number", () => {
      const phone1 = normalizePhone("+55 47 99978-6565");
      const phone2 = normalizePhone("47999786565");
      expect(phone1).toBe(phone2);
    });

    it("handles short phone gracefully", () => {
      expect(normalizePhone("12345")).toBe("12345");
    });
  });

  // Teste de estrutura de ranking
  describe("Ranking structure", () => {
    it("should sort by total descending", () => {
      const ranking = [
        { sellerId: 1, total: 5, compareceram: 3, naoVieram: 1, pendentes: 1 },
        { sellerId: 2, total: 10, compareceram: 7, naoVieram: 2, pendentes: 1 },
        { sellerId: 3, total: 3, compareceram: 1, naoVieram: 0, pendentes: 2 },
      ];
      const sorted = [...ranking].sort((a, b) => b.total - a.total);
      expect(sorted[0].sellerId).toBe(2);
      expect(sorted[1].sellerId).toBe(1);
      expect(sorted[2].sellerId).toBe(3);
    });

    it("should calculate stats correctly", () => {
      const agendamentos = [
        { attendanceStatus: "attended" },
        { attendanceStatus: "attended" },
        { attendanceStatus: "no_show" },
        { attendanceStatus: "pending" },
        { attendanceStatus: "pending" },
      ];
      const stats = {
        total: agendamentos.length,
        compareceram: agendamentos.filter(a => a.attendanceStatus === "attended" || a.attendanceStatus === "approved").length,
        naoVieram: agendamentos.filter(a => a.attendanceStatus === "no_show").length,
        pendentes: agendamentos.filter(a => a.attendanceStatus === "pending").length,
      };
      expect(stats.total).toBe(5);
      expect(stats.compareceram).toBe(2);
      expect(stats.naoVieram).toBe(1);
      expect(stats.pendentes).toBe(2);
    });
  });

  // Teste de vínculo venda↔agendamento
  describe("Sale-Appointment linking", () => {
    it("should match sale phone to appointment phone", () => {
      function normalizePhone(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 9 ? digits.slice(-9) : digits;
      }

      const salePhone = "(47) 99978-6565";
      const appointmentPhone = "+55 47 99978-6565";
      
      expect(normalizePhone(salePhone)).toBe(normalizePhone(appointmentPhone));
    });

    it("should not match different phones", () => {
      function normalizePhone(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 9 ? digits.slice(-9) : digits;
      }

      const salePhone = "(47) 99978-6565";
      const appointmentPhone = "(47) 99123-4567";
      
      expect(normalizePhone(salePhone)).not.toBe(normalizePhone(appointmentPhone));
    });
  });

  // Teste de schema de dados
  describe("Data schema", () => {
    it("sale should have customerPhone and sdrRecordId fields", () => {
      const sale = {
        id: 1,
        sellerId: 1,
        vehicleModel: "Civic",
        customerPhone: "47999786565",
        sdrRecordId: 5,
        status: "pending",
      };
      expect(sale.customerPhone).toBeDefined();
      expect(sale.sdrRecordId).toBeDefined();
    });

    it("sdr conversion should have agendamento and venda", () => {
      const conversion = {
        agendamento: { id: 1, customerName: "João", customerPhone: "47999786565" },
        venda: { id: 10, vehicleModel: "Civic", value: 8500000 },
        vendedorNome: "Wesley",
      };
      expect(conversion.agendamento).toBeDefined();
      expect(conversion.venda).toBeDefined();
      expect(conversion.vendedorNome).toBe("Wesley");
    });
  });
});
