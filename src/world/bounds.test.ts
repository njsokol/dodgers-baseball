import { describe, expect, it } from "vitest";
import { applyFenceBounce, buildFencePolygon, pointInPolygon } from "./bounds";

describe("stadium fence bounce", () => {
  it("reflects a ball back inside when it crosses the fence", () => {
    const poly = buildFencePolygon();
    const result = applyFenceBounce(
      { x: 170, z: 0 },
      { x: 24, z: 0 },
      poly,
      1.35,
    );

    expect(result.hit).toBe(true);
    expect(pointInPolygon(result.position, poly)).toBe(true);
    expect(result.velocity.x).toBeLessThan(0);
  });
});
