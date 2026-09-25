import { describe, it, expect } from 'vitest';
import { SECTION_SPANS, sampleSignal, sampleSignalRange } from '../src/lib/signal/path';
import {
  SEAM_CURVE_Y,
  mapCurveY,
  resolveSeamPixels,
  toPixelPoints,
  xAtPixelY,
  pageCurveLookup,
} from '../src/lib/signal/anchors';
import {
  onSignalCurve,
  publishSignalCurve,
  signalXAtPageY,
} from '../src/lib/signal/tip';

// A plausible page: hero under a nav, then five sections of uneven height.
const HEIGHT = 8568;
const TOPS = [66, 900, 1850, 3900, 6400, 7700];

describe('SEAM_CURVE_Y', () => {
  it('has one entry per seam including the terminus, strictly increasing', () => {
    expect(SEAM_CURVE_Y).toHaveLength(SECTION_SPANS.length + 1);
    expect(SEAM_CURVE_Y[0]).toBe(0);
    expect(SEAM_CURVE_Y[SEAM_CURVE_Y.length - 1]).toBeCloseTo(1, 12);
    for (let i = 1; i < SEAM_CURVE_Y.length; i++) {
      expect(SEAM_CURVE_Y[i]).toBeGreaterThan(SEAM_CURVE_Y[i - 1]);
    }
  });
});

describe('the curve is monotonic in y', () => {
  it('never travels back up the page, sampled densely', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 20000; i++) {
      const y = sampleSignal(i / 20000).y;
      expect(y).toBeGreaterThan(previous);
      previous = y;
    }
  });
});

describe('resolveSeamPixels', () => {
  it('uses every measured top, and lands the terminus on the box bottom', () => {
    expect(resolveSeamPixels(TOPS, HEIGHT)).toEqual([...TOPS, HEIGHT]);
  });

  it('falls back to the whole-box linear position when every anchor is missing', () => {
    const seams = resolveSeamPixels([null, null, null, null, null, null], 1000);
    seams.forEach((px, i) => expect(px).toBeCloseTo(SEAM_CURVE_Y[i] * 1000, 9));
  });

  it('falls back per seam, keeping the anchors it does have', () => {
    const seams = resolveSeamPixels([66, 900, null, 3900, 6400, 7700], HEIGHT);
    expect(seams[1]).toBe(900);
    expect(seams[2]).toBeCloseTo(SEAM_CURVE_Y[2] * HEIGHT, 9);
    expect(seams[3]).toBe(3900);
  });

  it('never lets a fallback seam fold the line back up the page', () => {
    // `work` missing, and its linear fallback (0.26 × 1000 = 260) is above `years`.
    const seams = resolveSeamPixels([0, 500, null, 700, 800, 900], 1000);
    for (let i = 1; i < seams.length; i++) expect(seams[i]).toBeGreaterThanOrEqual(seams[i - 1]);
    expect(seams[2]).toBe(500);
  });

  it('clamps anchors into the box, so the end caps stay inside the inset', () => {
    const seams = resolveSeamPixels([-2, 900, 1850, 3900, 6400, 9999], HEIGHT);
    expect(seams[0]).toBe(0);
    expect(seams[5]).toBe(HEIGHT);
    expect(seams[6]).toBe(HEIGHT);
  });
});

describe('mapCurveY', () => {
  const seams = resolveSeamPixels(TOPS, HEIGHT);

  it('lands every seam exactly on its section top', () => {
    SECTION_SPANS.forEach((span, i) => {
      expect(mapCurveY(sampleSignal(span.tStart).y, seams)).toBeCloseTo(TOPS[i], 9);
    });
  });

  it('maps the end points onto the first anchor and the box bottom', () => {
    expect(mapCurveY(sampleSignal(0).y, seams)).toBe(TOPS[0]);
    expect(mapCurveY(sampleSignal(1).y, seams)).toBeCloseTo(HEIGHT, 9);
  });

  it('is monotonic along the whole curve', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 5000; i++) {
      const y = mapCurveY(sampleSignal(i / 5000).y, seams);
      expect(y).toBeGreaterThan(previous);
      previous = y;
    }
  });

  it('is linear within a section', () => {
    const [y0, y1] = [SEAM_CURVE_Y[3], SEAM_CURVE_Y[4]];
    const mid = mapCurveY((y0 + y1) / 2, seams);
    expect(mid).toBeCloseTo((TOPS[3] + TOPS[4]) / 2, 9);
  });
});

describe('toPixelPoints and xAtPixelY', () => {
  const seams = resolveSeamPixels(TOPS, HEIGHT);
  const points = toPixelPoints(sampleSignalRange(0, 1, 480), 1440, seams);

  it('scales x across the width exactly as toSvgPath does', () => {
    expect(points[0].x).toBeCloseTo(((sampleSignal(0).x + 1) / 2) * 1440, 9);
    expect(points[0].y).toBe(TOPS[0]);
    expect(points[points.length - 1].y).toBeCloseTo(HEIGHT, 9);
  });

  it('returns the drawn vertex at a vertex height', () => {
    expect(xAtPixelY(points, points[200].y)).toBeCloseTo(points[200].x, 9);
  });

  it('interpolates along the drawn chord between vertices', () => {
    const a = points[300];
    const b = points[301];
    expect(xAtPixelY(points, (a.y + b.y) / 2)).toBeCloseTo((a.x + b.x) / 2, 9);
  });

  it('is null off either end of the line', () => {
    expect(xAtPixelY(points, TOPS[0] - 1)).toBeNull();
    expect(xAtPixelY(points, HEIGHT + 1)).toBeNull();
    expect(xAtPixelY([], 10)).toBeNull();
  });
});

describe('pageCurveLookup — box coordinates to page coordinates, in one place', () => {
  const seams = resolveSeamPixels(TOPS, HEIGHT);
  const points = toPixelPoints(sampleSignalRange(0, 1, 480), 1440, seams);
  // The layer is inset by half the stroke at the top of the document (#signal-layer).
  const BOX_LEFT = 0;
  const BOX_TOP = 2;
  const lookup = pageCurveLookup(points, BOX_LEFT, BOX_TOP);

  it('offsets both axes by the box origin', () => {
    const vertex = points[250];
    expect(lookup(vertex.y + BOX_TOP)).toBeCloseTo(vertex.x + BOX_LEFT, 9);
    const shifted = pageCurveLookup(points, 30, 100);
    expect(shifted(vertex.y + 100)).toBeCloseTo(vertex.x + 30, 9);
  });

  it('agrees with xAtPixelY everywhere along the line', () => {
    for (let y = TOPS[0]; y <= HEIGHT; y += 97) {
      expect(lookup(y + BOX_TOP)).toBeCloseTo(xAtPixelY(points, y)!, 9);
    }
  });

  it('is null off the line and for non-finite input', () => {
    expect(lookup(TOPS[0] + BOX_TOP - 1)).toBeNull();
    expect(lookup(HEIGHT + BOX_TOP + 1)).toBeNull();
    expect(lookup(Number.NaN)).toBeNull();
  });

  it('lands on the spine inside the work section', () => {
    // A height a third of the way down the spine: the curve there is parked at the left
    // margin, around 13% of the width — where the case studies branch from.
    const spineTop = mapCurveY(sampleSignal(21 / 50).y, seams);
    const spineBottom = mapCurveY(sampleSignal(26 / 50).y, seams);
    const x = lookup((spineTop + spineBottom) / 2 + BOX_TOP)!;
    expect(x / 1440).toBeGreaterThan(0.1);
    expect(x / 1440).toBeLessThanOrEqual(0.14 + 1e-9);
  });
});

describe('the curve channel in tip.ts', () => {
  it('answers through the published lookup and notifies on every re-measure', () => {
    const calls: number[] = [];
    const unsubscribe = onSignalCurve(() => calls.push(signalXAtPageY(500) ?? -1));
    publishSignalCurve((y) => y * 2);
    publishSignalCurve((y) => y + 1);
    expect(calls).toEqual([1000, 501]);
    unsubscribe();
    publishSignalCurve(() => 7);
    expect(calls).toHaveLength(2);
    expect(signalXAtPageY(1)).toBe(7);
  });

  it('calls a late subscriber once immediately', () => {
    const calls: number[] = [];
    onSignalCurve(() => calls.push(1))();
    expect(calls).toEqual([1]);
  });
});
