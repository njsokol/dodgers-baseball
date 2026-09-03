import { describe, expect, it } from "vitest";
import { awardScore, SCORE_VALUES } from "./sim/scoring";

describe("score values", () => {
  it("matches the requested point awards", () => {
    expect(SCORE_VALUES.pickup).toBe(2);
    expect(SCORE_VALUES.throw).toBe(3);
    expect(SCORE_VALUES.out).toBe(10);
    expect(SCORE_VALUES.doublePlay).toBe(25);
    expect(SCORE_VALUES.triplePlay).toBe(50);
  });

  it("adds a score event to a running total", () => {
    expect(awardScore(0, "pickup")).toBe(2);
    expect(awardScore(10, "out")).toBe(20);
    expect(awardScore(40, "doublePlay")).toBe(65);
  });
});
