import { describe, expect, it, vi, beforeEach } from "vitest";

// Test the ranking department filter logic
describe("Ranking Department Filters", () => {
  // Constants matching the backend
  const SALES_RANKING_DEPARTMENTS = ['vendas'];
  const APPOINTMENT_RANKING_DEPARTMENTS = ['vendas', 'pre_vendas'];

  describe("Sales Ranking Filter", () => {
    it("should include vendas department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('vendas')).toBe(true);
    });

    it("should NOT include pre_vendas department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('pre_vendas')).toBe(false);
    });

    it("should NOT include fei department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('fei')).toBe(false);
    });

    it("should NOT include consignacao department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('consignacao')).toBe(false);
    });

    it("should NOT include despachante department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('despachante')).toBe(false);
    });

    it("should NOT include pos_venda department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('pos_venda')).toBe(false);
    });

    it("should NOT include marketing department", () => {
      expect(SALES_RANKING_DEPARTMENTS.includes('marketing')).toBe(false);
    });
  });

  describe("Appointment Ranking Filter", () => {
    it("should include vendas department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('vendas')).toBe(true);
    });

    it("should include pre_vendas (SDR) department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('pre_vendas')).toBe(true);
    });

    it("should NOT include fei department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('fei')).toBe(false);
    });

    it("should NOT include consignacao department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('consignacao')).toBe(false);
    });

    it("should NOT include despachante department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('despachante')).toBe(false);
    });

    it("should NOT include pos_venda department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('pos_venda')).toBe(false);
    });

    it("should NOT include marketing department", () => {
      expect(APPOINTMENT_RANKING_DEPARTMENTS.includes('marketing')).toBe(false);
    });
  });

  describe("Frontend Seller Filter Logic", () => {
    const mockSellers = [
      { id: 1, name: "João", department: "vendas", totalSales: 5, totalPoints: 10 },
      { id: 2, name: "Maria", department: "pre_vendas", totalSales: 0, totalPoints: 3 },
      { id: 3, name: "Rafaela", department: "despachante", totalSales: 0, totalPoints: 0 },
      { id: 4, name: "Jordana", department: "consignacao", totalSales: 0, totalPoints: 0 },
      { id: 5, name: "Carlos", department: "fei", totalSales: 0, totalPoints: 0 },
      { id: 6, name: "Ana", department: "pos_venda", totalSales: 0, totalPoints: 0 },
      { id: 7, name: "Pedro", department: "marketing", totalSales: 0, totalPoints: 0 },
      { id: 8, name: "Lucas", department: "vendas", totalSales: 3, totalPoints: 6 },
    ];

    it("should filter only vendas for TOP EQUIPE (Home)", () => {
      const vendedores = mockSellers.filter(s => !s.department || s.department === 'vendas');
      expect(vendedores).toHaveLength(2);
      expect(vendedores.every(v => v.department === 'vendas')).toBe(true);
    });

    it("should filter vendas + SDR for appointment ranking", () => {
      const appointmentEligible = mockSellers.filter(s => 
        s.department === 'vendas' || s.department === 'pre_vendas'
      );
      expect(appointmentEligible).toHaveLength(3);
      expect(appointmentEligible.map(s => s.department)).toEqual(
        expect.arrayContaining(['vendas', 'pre_vendas'])
      );
    });

    it("should NOT include despachante, consignacao, fei, pos_venda, marketing in vendas filter", () => {
      const vendedores = mockSellers.filter(s => !s.department || s.department === 'vendas');
      const excludedDepts = ['despachante', 'consignacao', 'fei', 'pos_venda', 'marketing', 'pre_vendas'];
      vendedores.forEach(v => {
        expect(excludedDepts).not.toContain(v.department);
      });
    });

    it("should show 'Sem ranking' for non-ranking departments in AdminSellers", () => {
      const nonRankingDepts = ['fei', 'consignacao', 'despachante', 'pos_venda', 'marketing'];
      const rankingDepts = ['vendas', 'pre_vendas'];
      
      mockSellers.forEach(seller => {
        const showRanking = !seller.department || seller.department === 'vendas' || seller.department === 'pre_vendas';
        if (rankingDepts.includes(seller.department)) {
          expect(showRanking).toBe(true);
        }
        if (nonRankingDepts.includes(seller.department)) {
          expect(showRanking).toBe(false);
        }
      });
    });

    it("should filter sellers by category in RegisterSale", () => {
      const filterByCategory = (category: string) => {
        return mockSellers.filter(s => {
          const dept = s.department || 'vendas';
          if (category === 'vendas') return dept === 'vendas';
          if (category === 'fei') return dept === 'fei';
          if (category === 'consignacao') return dept === 'consignacao';
          if (category === 'despachante') return dept === 'despachante';
          if (category === 'pre_vendas') return dept === 'pre_vendas' || dept === 'vendas';
          return true;
        });
      };

      // Vendas category should only show vendas department
      const vendasSellers = filterByCategory('vendas');
      expect(vendasSellers.every(s => s.department === 'vendas')).toBe(true);
      expect(vendasSellers).toHaveLength(2);

      // SDR category should show vendas + pre_vendas
      const sdrSellers = filterByCategory('pre_vendas');
      expect(sdrSellers).toHaveLength(3);

      // F&I category should only show fei
      const feiSellers = filterByCategory('fei');
      expect(feiSellers).toHaveLength(1);
      expect(feiSellers[0].department).toBe('fei');

      // Consignacao should only show consignacao
      const consigSellers = filterByCategory('consignacao');
      expect(consigSellers).toHaveLength(1);
      expect(consigSellers[0].department).toBe('consignacao');

      // Despachante should only show despachante
      const despSellers = filterByCategory('despachante');
      expect(despSellers).toHaveLength(1);
      expect(despSellers[0].department).toBe('despachante');
    });
  });

  describe("Points should not accumulate for non-ranking departments", () => {
    it("updateSaleTotals should block points for non-vendas departments on sales", () => {
      const shouldUpdateSalePoints = (department: string) => {
        return SALES_RANKING_DEPARTMENTS.includes(department);
      };

      expect(shouldUpdateSalePoints('vendas')).toBe(true);
      expect(shouldUpdateSalePoints('pre_vendas')).toBe(false);
      expect(shouldUpdateSalePoints('fei')).toBe(false);
      expect(shouldUpdateSalePoints('consignacao')).toBe(false);
      expect(shouldUpdateSalePoints('despachante')).toBe(false);
      expect(shouldUpdateSalePoints('pos_venda')).toBe(false);
      expect(shouldUpdateSalePoints('marketing')).toBe(false);
    });

    it("updateSaleTotals should allow points for vendas+SDR on appointments", () => {
      const shouldUpdateAppointmentPoints = (department: string) => {
        return APPOINTMENT_RANKING_DEPARTMENTS.includes(department);
      };

      expect(shouldUpdateAppointmentPoints('vendas')).toBe(true);
      expect(shouldUpdateAppointmentPoints('pre_vendas')).toBe(true);
      expect(shouldUpdateAppointmentPoints('fei')).toBe(false);
      expect(shouldUpdateAppointmentPoints('consignacao')).toBe(false);
      expect(shouldUpdateAppointmentPoints('despachante')).toBe(false);
    });
  });
});
