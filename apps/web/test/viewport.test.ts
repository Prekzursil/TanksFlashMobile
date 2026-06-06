import { describe, expect, it } from "vitest";

import { computeStageLayout, type ScaleMode } from "../src/viewport";

const BASE = { baseWidth: 800, baseHeight: 600 } as const;

describe("computeStageLayout", () => {
  it("fit: letterboxes to the limiting dimension (width-limited)", () => {
    const layout = computeStageLayout({
      viewportWidth: 400,
      viewportHeight: 600,
      ...BASE,
      mode: "fit",
    });
    // Width is the limiting axis here: 400 wide -> 300 tall keeps 4:3.
    expect(layout.width).toBe(400);
    expect(layout.height).toBe(300);
    expect(layout.scale).toBeCloseTo(0.5, 5);
  });

  it("fit: letterboxes to the limiting dimension (height-limited)", () => {
    const layout = computeStageLayout({
      viewportWidth: 2000,
      viewportHeight: 600,
      ...BASE,
      mode: "fit",
    });
    // Height is limiting: vh * aspect = 600 * (800/600) = 800.
    expect(layout.width).toBe(800);
    expect(layout.height).toBe(600);
    expect(layout.scale).toBeCloseTo(1, 5);
  });

  it("fill: covers the viewport, overflowing the non-limiting axis", () => {
    const layout = computeStageLayout({
      viewportWidth: 1000,
      viewportHeight: 1000,
      ...BASE,
      mode: "fill",
    });
    // aspect = 4/3; fill picks max(vw, vh*aspect) = max(1000, 1333.33) = 1334.
    expect(layout.width).toBe(1334);
    expect(layout.height).toBe(Math.ceil(1334 / (800 / 600)));
    expect(layout.scale).toBeCloseTo(1334 / 800, 5);
  });

  it("integer: uses an integer scale when the viewport is large enough", () => {
    const layout = computeStageLayout({
      viewportWidth: 2000,
      viewportHeight: 2000,
      ...BASE,
      mode: "integer",
    });
    // min(2000/800, 2000/600) = 2.5 -> floor -> 2x.
    expect(layout.scale).toBe(2);
    expect(layout.width).toBe(1600);
    expect(layout.height).toBe(1200);
  });

  it("integer: falls back to fit when the viewport is smaller than the base stage", () => {
    const layout = computeStageLayout({
      viewportWidth: 400,
      viewportHeight: 300,
      ...BASE,
      mode: "integer",
    });
    // maxScale < 1 -> fall through to fit branch.
    expect(layout.width).toBe(400);
    expect(layout.height).toBe(300);
    expect(layout.scale).toBeCloseTo(0.5, 5);
  });

  it("clamps non-positive inputs up to a minimum of 1", () => {
    const layout = computeStageLayout({
      viewportWidth: 0,
      viewportHeight: -50,
      baseWidth: 0,
      baseHeight: 0,
      mode: "fit",
    });
    // Every dimension clamps to >= 1; with base 1x1 the fit result is 1x1.
    expect(layout.width).toBeGreaterThanOrEqual(1);
    expect(layout.height).toBeGreaterThanOrEqual(1);
    expect(layout.scale).toBeGreaterThan(0);
  });

  it("accepts every declared scale mode", () => {
    const modes: ScaleMode[] = ["fit", "fill", "integer"];
    for (const mode of modes) {
      const layout = computeStageLayout({
        viewportWidth: 1024,
        viewportHeight: 768,
        ...BASE,
        mode,
      });
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
    }
  });
});
