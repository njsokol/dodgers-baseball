import { describe, expect, it } from "vitest";
import { Player } from "./Player";
import { bobKid, makeKidMesh } from "./kidMesh";
import { BASES } from "../world/fieldLayout";
import { buildFencePolygon } from "../world/bounds";

describe("batter animation", () => {
  it("keeps the batter clean while still animating the arm motion", () => {
    const group = makeKidMesh({ label: "R", team: "away", isBatter: true } as any);
    const rightArm = group.getObjectByName("rightArm");

    expect(rightArm).toBeTruthy();
    const before = (rightArm as any).rotation.x;
    bobKid(group, true, 0.25);
    expect((rightArm as any).rotation.x).not.toBe(before);
    expect((group as any).children.some((child: any) => child.name === "bat")).toBe(false);
  });

  it("faces the next base while a runner is standing on a bag", () => {
    const player = new Player({
      id: "runner",
      team: "away",
      label: "R",
      x: BASES["1B"].x,
      z: BASES["1B"].z,
      isRunner: true,
    });
    player.onBase = "1B";
    player.runnerDest = "2B";
    player.step(0.016, buildFencePolygon());

    const target = BASES["2B"];
    const expected = Math.atan2(target.x - player.mesh.position.x, target.z - player.mesh.position.z);
    expect(player.mesh.rotation.y).toBeCloseTo(expected, 4);
  });
});
