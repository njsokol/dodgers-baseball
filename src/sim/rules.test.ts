import { describe, expect, it } from "vitest";
import type { BaseId } from "../world/fieldLayout";
import { shouldAdvanceRunner } from "./rules";

describe("runner advancement", () => {
  it("always sends the current batter to first", () => {
    expect(shouldAdvanceRunner(new Set<BaseId>(), "1B", true)).toBe(true);
  });

  it("sends a runner from first when forced by the batter", () => {
    expect(shouldAdvanceRunner(new Set<BaseId>(["1B"]), "2B")).toBe(true);
  });

  it("allows a runner on second to stay when there is no force", () => {
    expect(shouldAdvanceRunner(new Set<BaseId>(["2B"]), "3B")).toBe(false);
  });

  it("sends a runner from second when first and second are occupied", () => {
    expect(shouldAdvanceRunner(new Set<BaseId>(["1B", "2B"]), "3B")).toBe(true);
  });
});