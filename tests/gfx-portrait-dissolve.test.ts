import { describe, expect, it } from 'vitest';
import {
  DISSOLVE,
  dissolveProgress,
  particleAt,
  particleProgress,
  stillErosion,
} from '../src/lib/gfx/portrait-dissolve';

const home = { x: 1100, y: 400 };
const start = { x: 450, y: 960 };
const steps = Array.from({ length: 101 }, (_, i) => i / 100);

describe('dissolveProgress', () => {
  it('is 0 at rest and 1 when the playhead reaches the line start', () => {
    expect(dissolveProgress(450, 450, 960, 900)).toBe(0);
    expect(dissolveProgress(960, 450, 960, 900)).toBe(1);
    expect(dissolveProgress(705, 450, 960, 900)).toBeCloseTo(0.5, 5);
  });

  it('clamps to 0..1', () => {
    expect(dissolveProgress(300, 450, 960, 900)).toBe(0);
    expect(dissolveProgress(2000, 450, 960, 900)).toBe(1);
  });

  it('floors the range at half the hero, so a very tall window still has a dissolve to scroll', () => {
    // The start sits only 100px below the resting playhead; the range is 450 instead.
    expect(dissolveProgress(775, 700, 800, 900)).toBeCloseTo(75 / 450, 5);
  });

  it('is fully dissolved rather than NaN when there is no range at all', () => {
    expect(dissolveProgress(500, 500, 500, 0)).toBe(1);
  });
});

describe('particleProgress', () => {
  it('is 0 for every particle at p = 0 and 1 for every particle by lastArrival', () => {
    for (const homeV of [0, 0.25, 0.5, 0.75, 1]) {
      expect(particleProgress(homeV, 0)).toBe(0);
      // Close to, not exactly: 0.92 − 0.47 is not 0.45 in binary floating point.
      expect(particleProgress(homeV, DISSOLVE.lastArrival)).toBeCloseTo(1, 9);
      expect(particleProgress(homeV, 1)).toBe(1);
    }
  });

  it('moves the lowest particles first (D9)', () => {
    expect(particleProgress(1, 0.3)).toBeGreaterThan(particleProgress(0.5, 0.3));
    expect(particleProgress(0.5, 0.3)).toBeGreaterThan(particleProgress(0, 0.3));
  });

  it('never moves backwards as p rises, so reversing the scroll retraces it exactly', () => {
    for (const homeV of [0, 0.4, 1]) {
      const values = steps.map((p) => particleProgress(homeV, p));
      values.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(values[i]));
    }
  });
});

describe('particleAt', () => {
  it('is home at p = 0 and on the line start at p = 1', () => {
    expect(particleAt(home, 0.3, start, 0)).toEqual(home);
    const arrived = particleAt(home, 0.3, start, 1);
    expect(arrived.x).toBeCloseTo(start.x, 6);
    expect(arrived.y).toBeCloseTo(start.y, 6);
  });

  it('drops before it sweeps left - the bow keeps the stream under the portrait, off the copy', () => {
    // Halfway along its own travel, a particle has covered more of the drop than of the sweep.
    const p = steps.find((step) => particleProgress(0.3, step) >= 0.5)!;
    const mid = particleAt(home, 0.3, start, p);
    const dropShare = (mid.y - home.y) / (start.y - home.y);
    const sweepShare = (home.x - mid.x) / (home.x - start.x);
    expect(dropShare).toBeGreaterThan(sweepShare);
  });
});

describe('stillErosion', () => {
  it('hides nothing at rest and all of the still once the highest particles have left', () => {
    expect(stillErosion(0)).toBe(0);
    expect(stillErosion(DISSOLVE.lastArrival - DISSOLVE.window)).toBe(1);
    expect(stillErosion(1)).toBe(1);
  });

  it('hides the still exactly where particles have started to leave, and nowhere else', () => {
    for (const p of steps) {
      // The still is hidden below this height (v runs down, 0 at the top).
      const edge = 1 - stillErosion(p);
      for (const homeV of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const isBelowEdge = homeV > edge + 1e-9;
        const isAboveEdge = homeV < edge - 1e-9;
        if (isBelowEdge && p > 0) expect(particleProgress(homeV, p)).toBeGreaterThan(0);
        if (isAboveEdge) expect(particleProgress(homeV, p)).toBe(0);
      }
    }
  });
});
