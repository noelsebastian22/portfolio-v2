import { describe, it, expect } from 'vitest';
import {
  sampleSignal,
  sampleSignalRange,
  sectionProgress,
  controlPointT,
  SECTION_SPANS,
  SPINE_FIRST_POINT,
  SPINE_LAST_POINT,
  DRAWN_FROM_T,
} from '../src/lib/signal/path';

describe('sampleSignal', () => {
  it('clamps below 0 and above 1', () => {
    expect(sampleSignal(-1)).toEqual(sampleSignal(0));
    expect(sampleSignal(2)).toEqual(sampleSignal(1));
  });

  it('advances monotonically down the page', () => {
    expect(sampleSignal(0.9).y).toBeGreaterThan(sampleSignal(0.1).y);
  });

  it('is continuous — no jumps between adjacent samples', () => {
    for (let t = 0; t < 1; t += 0.01) {
      const a = sampleSignal(t), b = sampleSignal(t + 0.01);
      expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.2);
    }
  });
});

describe('sampleSignalRange', () => {
  it('returns exactly `steps` points, inclusive of both ends', () => {
    const pts = sampleSignalRange(0, 1, 10);
    expect(pts).toHaveLength(10);
    expect(pts[0]).toEqual(sampleSignal(0));
    expect(pts[9]).toEqual(sampleSignal(1));
  });
});

describe('DRAWN_FROM_T — where the drawn line begins', () => {
  // Noel, 2026-09-30: no line in the hero; it emerges at the hero's bottom edge.
  it('is the Nine Years seam, control point 7', () => {
    expect(DRAWN_FROM_T).toBe(SECTION_SPANS.find((s) => s.id === 'years')!.tStart);
    expect(DRAWN_FROM_T).toBeCloseTo(controlPointT(7), 12);
  });
});

describe('SECTION_SPANS', () => {
  it('covers 0..1 with no gaps or overlaps', () => {
    expect(SECTION_SPANS[0].tStart).toBe(0);
    expect(SECTION_SPANS[SECTION_SPANS.length - 1].tEnd).toBe(1);
    for (let i = 1; i < SECTION_SPANS.length; i++) {
      expect(SECTION_SPANS[i].tStart).toBe(SECTION_SPANS[i - 1].tEnd);
    }
  });
});

describe('sectionProgress', () => {
  it('is 0 at a section start and 1 at its end', () => {
    const span = SECTION_SPANS.find(s => s.id === 'ring')!;
    expect(sectionProgress('ring', span.tStart)).toBeCloseTo(0);
    expect(sectionProgress('ring', span.tEnd)).toBeCloseTo(1);
  });

  it('clamps outside its span', () => {
    expect(sectionProgress('ring', 0)).toBe(0);
    expect(sectionProgress('hero', 1)).toBe(1);
  });
});

describe('the work spine', () => {
  const [spineStart, spineEnd] = [controlPointT(SPINE_FIRST_POINT), controlPointT(SPINE_LAST_POINT)];

  it('is dead straight: one x from its first control point to its last', () => {
    const x = sampleSignal(spineStart).x;
    for (const p of sampleSignalRange(spineStart, spineEnd, 5001)) {
      expect(p.x).toBeCloseTo(x, 12);
    }
  });

  it('meets the curve either side of it with no kink', () => {
    const h = 1e-7;
    for (const t of [spineStart, spineEnd]) {
      const left = (sampleSignal(t).x - sampleSignal(t - h).x) / h;
      const right = (sampleSignal(t + h).x - sampleSignal(t).x) / h;
      expect(Math.abs(left)).toBeLessThan(1e-4);
      expect(Math.abs(right)).toBeLessThan(1e-4);
    }
  });

  it('leaves every segment off the spine exactly plain Catmull-Rom', () => {
    // The reference: uniform Catmull-Rom through the same control points, read back off
    // the curve itself (it passes through each of them), with the terminal point standing
    // in for the missing neighbour at either end.
    const COUNT = 51;
    const points = Array.from({ length: COUNT }, (_, i) => sampleSignal(controlPointT(i)));
    const catmullRom = (a: number, b: number, c: number, d: number, s: number) =>
      0.5 *
      (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s +
        (-a + 3 * b - 3 * c + d) * s * s * s);
    const reference = (t: number) => {
      const scaled = t * (COUNT - 1);
      const segment = Math.min(Math.floor(scaled), COUNT - 2);
      const s = scaled - segment;
      const [a, b, c, d] = [segment - 1, segment, segment + 1, segment + 2].map(
        (i) => points[Math.min(Math.max(i, 0), COUNT - 1)],
      );
      return {
        x: catmullRom(a.x, b.x, c.x, d.x, s),
        y: catmullRom(a.y, b.y, c.y, d.y, s),
        z: catmullRom(a.z, b.z, c.z, d.z, s),
      };
    };

    // The tangent override at points 21 and 26 reaches the segments that end on them.
    const touchesSpine = (t: number) =>
      t > controlPointT(SPINE_FIRST_POINT - 1) && t < controlPointT(SPINE_LAST_POINT + 1);
    let checked = 0;
    for (let i = 0; i <= 5000; i++) {
      const t = i / 5000;
      if (touchesSpine(t)) continue;
      const [actual, expected] = [sampleSignal(t), reference(t)];
      expect(actual.x).toBeCloseTo(expected.x, 12);
      expect(actual.y).toBeCloseTo(expected.y, 12);
      expect(actual.z).toBeCloseTo(expected.z, 12);
      checked++;
    }
    expect(checked).toBeGreaterThan(4000);
  });
});
