import { describe, it, expect } from "vitest";
import { resolveRoundOutcome } from "../../src/store/useAppStore";

const p = ["p1", "p2", "p3"];
const survivors = (players: string[], totals: Record<string, number>) =>
  players.filter((pid) => totals[pid] <= 100);

describe("resolveRoundOutcome", () => {
  describe("normal outcome", () => {
    it("returns normal when no one is eliminated", () => {
      const prev = { p1: 0, p2: 0, p3: 0 };
      const totals = { p1: 5, p2: 10, p3: 3 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("normal");
      expect(result.justEliminated).toHaveLength(0);
    });

    it("100 is safe — player at exactly 100 is not eliminated", () => {
      const prev = { p1: 95, p2: 0, p3: 0 };
      const totals = { p1: 100, p2: 5, p3: 5 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("normal");
      expect(result.justEliminated).toHaveLength(0);
    });

    it("already-eliminated players don't appear in justEliminated again", () => {
      // p1 was already at 105 last round (already out), crosses no threshold this round
      const prev = { p1: 105, p2: 0, p3: 0 };
      const totals = { p1: 110, p2: 5, p3: 5 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("normal");
      expect(result.justEliminated).toHaveLength(0);
    });
  });

  describe("elimination outcome", () => {
    it("101 triggers elimination when 2+ survivors remain", () => {
      const prev = { p1: 95, p2: 0, p3: 0 };
      const totals = { p1: 101, p2: 5, p3: 5 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("elimination");
      expect(result.justEliminated).toEqual(["p1"]);
    });

    it("player at exactly 100 then scores 1 → eliminated", () => {
      const prev = { p1: 100, p2: 0, p3: 0 };
      const totals = { p1: 101, p2: 5, p3: 5 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("elimination");
      expect(result.justEliminated).toEqual(["p1"]);
    });
  });

  describe("winner outcome", () => {
    it("2-player game: one player crosses 100 → winner directly, no elimination modal", () => {
      const two = ["p1", "p2"];
      const prev = { p1: 95, p2: 0 };
      const totals = { p1: 101, p2: 5 };
      const result = resolveRoundOutcome(two, prev, totals, survivors(two, totals));
      expect(result.outcome).toBe("winner");
      expect(result.justEliminated).toEqual(["p1"]);
    });

    it("3-player: 2 cross 100 same round → winner (1 survivor remains)", () => {
      const prev = { p1: 95, p2: 90, p3: 0 };
      const totals = { p1: 101, p2: 101, p3: 5 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("winner");
      expect(result.justEliminated).toContain("p1");
      expect(result.justEliminated).toContain("p2");
    });
  });

  describe("allOut outcome", () => {
    it("all players cross 100 same round → allOut", () => {
      const prev = { p1: 95, p2: 90, p3: 85 };
      const totals = { p1: 101, p2: 101, p3: 101 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("allOut");
      expect(result.justEliminated).toHaveLength(3);
    });

    it("allOut: one already eliminated, remaining two cross 100 together", () => {
      // p1 was already out (110 prev). p2 and p3 both cross now.
      const prev = { p1: 110, p2: 95, p3: 90 };
      const totals = { p1: 115, p2: 101, p3: 101 };
      const result = resolveRoundOutcome(p, prev, totals, survivors(p, totals));
      expect(result.outcome).toBe("allOut");
      // Only p2 and p3 are justEliminated (p1 was already out)
      expect(result.justEliminated).toEqual(["p2", "p3"]);
    });
  });
});
