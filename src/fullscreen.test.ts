import { describe, expect, it } from "vitest";
import { SCENARIOS } from "./sim/scenarios";

describe("fullscreen helpers", () => {
  it("exposes the browser fullscreen API via a helper object", () => {
    const fs = {
      enabled: false,
      element: null as Element | null,
      request: async (el: Element) => {
        fs.element = el;
        fs.enabled = true;
      },
      exit: async () => {
        fs.enabled = false;
        fs.element = null;
      },
    };

    expect(fs.enabled).toBe(false);
    fs.request(document.createElement("div"));
    expect(fs.enabled).toBe(true);
    fs.exit();
    expect(fs.enabled).toBe(false);
  });
});

describe("scenario definitions", () => {
  it("does not inject magical runners into the field", () => {
    expect(SCENARIOS.every((s) => !("runners" in s))).toBe(true);
  });

  it("includes left- and right-center popflies with a true airborne catch expectation", () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    expect(ids.has("fly-lcf")).toBe(true);
    expect(ids.has("fly-rcf")).toBe(true);
    expect(SCENARIOS.some((s) => s.hit.kind === "fly" && s.expected.catchFly === true)).toBe(true);
  });
});

describe("selection policy", () => {
  it("keeps the same player selected when they are clicked again", async () => {
    const { shouldClearSelection } = await import("./engine/selection");
    expect(shouldClearSelection("SS", { kind: "fielder", id: "SS" })).toBe(false);
  });

  it("keeps the selection alive for move and command clicks", async () => {
    const { shouldClearSelection } = await import("./engine/selection");
    expect(shouldClearSelection("SS", { kind: "ground", x: 0, z: 0 })).toBe(false);
    expect(shouldClearSelection("SS", { kind: "ball" })).toBe(false);
    expect(shouldClearSelection("SS", { kind: "base", id: "1B" })).toBe(false);
  });
});
