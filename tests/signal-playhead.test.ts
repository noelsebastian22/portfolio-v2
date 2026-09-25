import { describe, it, expect } from 'vitest';
import { sampleSignalRange } from '../src/lib/signal/path';
import { resolveSeamPixels, toPixelPoints } from '../src/lib/signal/anchors';
import { cumulativeLengths, lengthAtY, playheadPageY } from '../src/lib/signal/playhead';
import { onSignalTip, publishSignalTip, signalTipY } from '../src/lib/signal/tip';

const DOC = 8572;
const VH = 900;

describe('playheadPageY', () => {
  it("starts at the viewport's centre and ends on the document's bottom", () => {
    expect(playheadPageY(0, DOC, VH)).toBe(450);
    expect(playheadPageY(1, DOC, VH)).toBe(DOC);
  });

  it('is always inside the viewport, between its centre and its bottom edge', () => {
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const scrollY = t * (DOC - VH);
      const y = playheadPageY(t, DOC, VH);
      expect(y).toBeGreaterThanOrEqual(scrollY + VH / 2 - 1e-9);
      expect(y).toBeLessThanOrEqual(scrollY + VH + 1e-9);
    }
  });

  it('is monotonic in t, and clamps out-of-range and non-finite input', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const y = playheadPageY(i / 100, DOC, VH);
      expect(y).toBeGreaterThan(previous);
      previous = y;
    }
    expect(playheadPageY(-1, DOC, VH)).toBe(450);
    expect(playheadPageY(2, DOC, VH)).toBe(DOC);
    expect(playheadPageY(NaN, DOC, VH)).toBe(450);
  });

  it('copes with a document shorter than the viewport', () => {
    expect(playheadPageY(1, 500, VH)).toBe(VH);
  });
});

describe('cumulativeLengths and lengthAtY', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 30, y: 40 }, // 50
    { x: 30, y: 100 }, // 60
  ];
  const table = cumulativeLengths(square);

  it('accumulates segment lengths', () => {
    expect(table).toEqual([0, 50, 110]);
  });

  it('interpolates along the segment that contains y', () => {
    expect(lengthAtY(square, table, 20)).toBeCloseTo(25, 12);
    expect(lengthAtY(square, table, 40)).toBeCloseTo(50, 12);
    expect(lengthAtY(square, table, 70)).toBeCloseTo(80, 12);
  });

  it('clamps: nothing above the first point, everything below the last', () => {
    expect(lengthAtY(square, table, -5)).toBe(0);
    expect(lengthAtY(square, table, 1000)).toBe(110);
    expect(lengthAtY([], [], 10)).toBe(0);
  });

  it('is monotonic in y along the real, pinned curve and reaches the whole length', () => {
    const seams = resolveSeamPixels([65, 1115.39, 2167.89, 3205.08, 7107.83, 7816.02], 8568);
    const points = toPixelPoints(sampleSignalRange(0, 1, 481), 1440, seams);
    const lengths = cumulativeLengths(points);
    let previous = -Infinity;
    for (let y = 0; y <= 8600; y += 7) {
      const length = lengthAtY(points, lengths, y);
      expect(length).toBeGreaterThanOrEqual(previous);
      previous = length;
    }
    expect(lengthAtY(points, lengths, 8568)).toBe(lengths[lengths.length - 1]);
  });
});

describe('tip channel', () => {
  it('reports the latest tip, replays it to a new subscriber, and unsubscribes', () => {
    const seen: number[] = [];
    publishSignalTip(1200);
    const off = onSignalTip((y) => seen.push(y));
    publishSignalTip(1300);
    publishSignalTip(1300); // unchanged: not re-sent
    off();
    publishSignalTip(1400);
    expect(seen).toEqual([1200, 1300]);
    expect(signalTipY()).toBe(1400);
  });
});
