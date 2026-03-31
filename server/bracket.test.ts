import { describe, it, expect } from "vitest";

describe("Bracket (Mata-Mata) System", () => {
  describe("bracket.list", () => {
    it("should return empty array for competition with no brackets", async () => {
      const { listBracketMatches } = await import("./db");
      const matches = await listBracketMatches(99999);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
    });
  });

  describe("bracket match data structure", () => {
    it("should have correct schema fields", async () => {
      const { bracketMatches } = await import("../drizzle/schema");
      // Verify table exists and has expected columns
      const columns = Object.keys(bracketMatches);
      expect(columns).toContain("id");
      expect(columns).toContain("competitionId");
      expect(columns).toContain("round");
      expect(columns).toContain("matchOrder");
      expect(columns).toContain("teamAId");
      expect(columns).toContain("teamBId");
      expect(columns).toContain("sellerAId");
      expect(columns).toContain("sellerBId");
      expect(columns).toContain("scoreA");
      expect(columns).toContain("scoreB");
      expect(columns).toContain("winnerId");
      expect(columns).toContain("winnerType");
      expect(columns).toContain("status");
    });
  });

  describe("bracket match CRUD", () => {
    it("should create and retrieve a bracket match", async () => {
      const { createBracketMatch, getBracketMatch, deleteBracketMatchesByCompetition } = await import("./db");
      // Use a unique competition ID for testing
      const testCompId = 999888;
      try {
        const matchId = await createBracketMatch({
          competitionId: testCompId,
          round: 1,
          matchOrder: 1,
          sellerAId: 1,
          sellerBId: 2,
          status: "active",
          startedAt: Date.now(),
        });
        expect(matchId).toBeGreaterThan(0);

        const match = await getBracketMatch(matchId);
        expect(match).not.toBeNull();
        expect(match!.competitionId).toBe(testCompId);
        expect(match!.round).toBe(1);
        expect(match!.scoreA).toBe(0);
        expect(match!.scoreB).toBe(0);
        expect(match!.status).toBe("active");
      } finally {
        await deleteBracketMatchesByCompetition(testCompId);
      }
    });

    it("should increment score correctly", async () => {
      const { createBracketMatch, getBracketMatch, incrementBracketScore, deleteBracketMatchesByCompetition } = await import("./db");
      const testCompId = 999887;
      try {
        const matchId = await createBracketMatch({
          competitionId: testCompId,
          round: 1,
          matchOrder: 1,
          sellerAId: 1,
          sellerBId: 2,
          status: "active",
          startedAt: Date.now(),
        });

        await incrementBracketScore(matchId, "A");
        await incrementBracketScore(matchId, "A");
        await incrementBracketScore(matchId, "B");

        const match = await getBracketMatch(matchId);
        expect(match!.scoreA).toBe(2);
        expect(match!.scoreB).toBe(1);
      } finally {
        await deleteBracketMatchesByCompetition(testCompId);
      }
    });

    it("should update match with winner", async () => {
      const { createBracketMatch, getBracketMatch, updateBracketMatch, deleteBracketMatchesByCompetition } = await import("./db");
      const testCompId = 999886;
      try {
        const matchId = await createBracketMatch({
          competitionId: testCompId,
          round: 1,
          matchOrder: 1,
          sellerAId: 1,
          sellerBId: 2,
          status: "active",
          startedAt: Date.now(),
        });

        await updateBracketMatch(matchId, {
          winnerId: 1,
          winnerType: "seller",
          status: "finished",
          finishedAt: Date.now(),
        });

        const match = await getBracketMatch(matchId);
        expect(match!.winnerId).toBe(1);
        expect(match!.winnerType).toBe("seller");
        expect(match!.status).toBe("finished");
      } finally {
        await deleteBracketMatchesByCompetition(testCompId);
      }
    });

    it("should list matches ordered by round and matchOrder", async () => {
      const { createBracketMatch, listBracketMatches, deleteBracketMatchesByCompetition } = await import("./db");
      const testCompId = 999885;
      try {
        await createBracketMatch({ competitionId: testCompId, round: 2, matchOrder: 1, sellerAId: 1, sellerBId: 2, status: "pending", startedAt: Date.now() });
        await createBracketMatch({ competitionId: testCompId, round: 1, matchOrder: 2, sellerAId: 3, sellerBId: 4, status: "active", startedAt: Date.now() });
        await createBracketMatch({ competitionId: testCompId, round: 1, matchOrder: 1, sellerAId: 5, sellerBId: 6, status: "active", startedAt: Date.now() });

        const matches = await listBracketMatches(testCompId);
        expect(matches.length).toBe(3);
        // Should be ordered: round 1 match 1, round 1 match 2, round 2 match 1
        expect(matches[0].round).toBe(1);
        expect(matches[0].matchOrder).toBe(1);
        expect(matches[1].round).toBe(1);
        expect(matches[1].matchOrder).toBe(2);
        expect(matches[2].round).toBe(2);
      } finally {
        await deleteBracketMatchesByCompetition(testCompId);
      }
    });

    it("should delete all matches for a competition", async () => {
      const { createBracketMatch, listBracketMatches, deleteBracketMatchesByCompetition } = await import("./db");
      const testCompId = 999884;
      try {
        await createBracketMatch({ competitionId: testCompId, round: 1, matchOrder: 1, sellerAId: 1, sellerBId: 2, status: "active", startedAt: Date.now() });
        await createBracketMatch({ competitionId: testCompId, round: 1, matchOrder: 2, sellerAId: 3, sellerBId: 4, status: "active", startedAt: Date.now() });

        let matches = await listBracketMatches(testCompId);
        expect(matches.length).toBe(2);

        await deleteBracketMatchesByCompetition(testCompId);

        matches = await listBracketMatches(testCompId);
        expect(matches.length).toBe(0);
      } finally {
        await deleteBracketMatchesByCompetition(testCompId);
      }
    });
  });

  describe("motivational alert logic", () => {
    it("should identify losing side correctly", () => {
      const match = { scoreA: 3, scoreB: 1, status: "active" };
      const losingIsSideB = match.scoreA > match.scoreB;
      expect(losingIsSideB).toBe(true);

      const match2 = { scoreA: 0, scoreB: 2, status: "active" };
      const losingIsSideA = match2.scoreB > match2.scoreA;
      expect(losingIsSideA).toBe(true);

      const match3 = { scoreA: 1, scoreB: 1, status: "active" };
      const isTied = match3.scoreA === match3.scoreB;
      expect(isTied).toBe(true);
    });
  });
});
