import { describe, it, expect } from 'vitest';
import { sampleSignal, sampleSignalRange, sectionProgress, SECTION_SPANS } from '../src/lib/signal/path';

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
