import { describe, expect, it } from 'vitest';
import { computeStageLayout, type ScaleMode } from '../apps/web/src/viewport';

const base = { baseWidth: 800, baseHeight: 600 };

function layout(viewportWidth: number, viewportHeight: number, mode: ScaleMode) {
  return computeStageLayout({ ...base, viewportWidth, viewportHeight, mode });
}

describe('computeStageLayout', () => {
  it('fit: letterboxes to the limiting dimension (width-limited)', () => {
    const r = layout(400, 600, 'fit');
    expect(r.width).toBe(400);
    expect(r.height).toBe(300);
    expect(r.scale).toBeCloseTo(0.5);
  });

  it('fit: letterboxes to the limiting dimension (height-limited)', () => {
    const r = layout(1600, 600, 'fit');
    // height is the limiter: 600 * (800/600) = 800 wide
    expect(r.width).toBe(800);
    expect(r.height).toBe(600);
    expect(r.scale).toBeCloseTo(1);
  });

  it('fill: covers the viewport (height drives width)', () => {
    const r = layout(400, 600, 'fill');
    // max(vw=400, vh*aspect=600*4/3=800) => 800
    expect(r.width).toBe(800);
    expect(r.height).toBe(600);
    expect(r.scale).toBeCloseTo(1);
  });

  it('fill: covers the viewport (width drives width)', () => {
    const r = layout(2000, 600, 'fill');
    // max(vw=2000, vh*aspect=800) => 2000
    expect(r.width).toBe(2000);
    expect(r.height).toBe(1500);
    expect(r.scale).toBeCloseTo(2.5);
  });

  it('integer: snaps to the largest whole multiple when it fits', () => {
    const r = layout(2500, 1900, 'integer');
    // maxScale = min(2500/800=3.125, 1900/600=3.166) => 3
    expect(r.width).toBe(2400);
    expect(r.height).toBe(1800);
    expect(r.scale).toBe(3);
  });

  it('integer: falls back to fit when the viewport is smaller than the base stage', () => {
    const r = layout(400, 300, 'integer');
    // maxScale < 1 => fit path
    expect(r.width).toBe(400);
    expect(r.height).toBe(300);
    expect(r.scale).toBeCloseTo(0.5);
  });

  it('clamps non-positive viewport and base dimensions to at least 1', () => {
    const r = computeStageLayout({
      viewportWidth: 0,
      viewportHeight: -10,
      baseWidth: 0,
      baseHeight: 0,
      mode: 'fit',
    });
    expect(r.width).toBe(1);
    expect(r.height).toBe(1);
    expect(r.scale).toBe(1);
  });
});
