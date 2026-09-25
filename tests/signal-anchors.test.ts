import { describe, it, expect } from 'vitest';
import {
  RING_SPLIT_POINT,
  SECTION_SPANS,
  SPINE_FIRST_POINT,
  SPINE_LAST_POINT,
  SPINE_SPAN,
  controlPointT,
  sampleSignal,
  sampleSignalRange,
} from '../src/lib/signal/path';
import {
  ANCHOR_CURVE_Y,
  IN_SECTION_ANCHORS,
  SEAM_CURVE_Y,
  anchorKnots,
  resolveAnchorPixels,
  SPINE_CURVE_Y,
  mapCurveY,
  resolveSeamPixels,
  resolveSpinePixels,
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

describe('spine anchors — pinned inside the work section', () => {
  const seams = resolveSeamPixels(TOPS, HEIGHT);
  // TOPS: work opens at 1850, the ring at 3900. The first card starts at 2300, the last
  // card ends at 3700.
  const SPINE: [number, number] = [2300, 3700];
  const spine = resolveSpinePixels(SPINE, seams);

  it('sits strictly inside the work span, at control points 21 and 26', () => {
    const work = SECTION_SPANS.find((s) => s.id === 'work')!;
    expect(SPINE_CURVE_Y[0]).toBeCloseTo(sampleSignal(SPINE_SPAN.tStart).y, 12);
    expect(SPINE_CURVE_Y[1]).toBeCloseTo(sampleSignal(SPINE_SPAN.tEnd).y, 12);
    expect(SPINE_CURVE_Y[0]).toBeGreaterThan(sampleSignal(work.tStart).y);
    expect(SPINE_CURVE_Y[1]).toBeLessThan(sampleSignal(work.tEnd).y);
  });

  it('lands the spine start and end on their anchors', () => {
    expect(spine).toEqual(SPINE);
    expect(mapCurveY(SPINE_CURVE_Y[0], seams, spine)).toBeCloseTo(2300, 9);
    expect(mapCurveY(SPINE_CURVE_Y[1], seams, spine)).toBeCloseTo(3700, 9);
  });

  it('leaves every seam exactly where it was', () => {
    SECTION_SPANS.forEach((span, i) => {
      expect(mapCurveY(sampleSignal(span.tStart).y, seams, spine)).toBeCloseTo(TOPS[i], 9);
    });
    expect(mapCurveY(sampleSignal(1).y, seams, spine)).toBeCloseTo(HEIGHT, 9);
  });

  it('stays monotonic in y, sampled densely', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 20000; i++) {
      const y = mapCurveY(sampleSignal(i / 20000).y, seams, spine);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });

  it('falls back to seam-linear mapping when either anchor is missing', () => {
    const mid = (SPINE_CURVE_Y[0] + SPINE_CURVE_Y[1]) / 2;
    expect(resolveSpinePixels([null, null], seams)).toEqual([null, null]);
    expect(mapCurveY(mid, seams, [null, null])).toBeCloseTo(mapCurveY(mid, seams), 9);
    expect(mapCurveY(mid, seams, undefined)).toBeCloseTo(mapCurveY(mid, seams), 9);
    // Only the start: pinned there, seam-linear from it to the next seam.
    const startOnly = resolveSpinePixels([2300, null], seams);
    expect(mapCurveY(SPINE_CURVE_Y[0], seams, startOnly)).toBeCloseTo(2300, 9);
    const workEnd = sampleSignal(SECTION_SPANS[3].tStart).y;
    expect(mapCurveY(workEnd, seams, startOnly)).toBeCloseTo(TOPS[3], 9);
  });

  it('clamps anchors that would fold the line back up the page', () => {
    // Start above its section's seam, end below the next seam.
    expect(resolveSpinePixels([1000, 5000], seams)).toEqual([TOPS[2], TOPS[3]]);
    // End above start: held at the start.
    expect(resolveSpinePixels([3000, 2500], seams)).toEqual([3000, 3000]);
    // End with no start: held within the section.
    expect(resolveSpinePixels([null, 100], seams)).toEqual([null, TOPS[2]]);
    for (const bad of [[1000, 5000], [3000, 2500], [null, 100]] as const) {
      const clamped = resolveSpinePixels(bad, seams);
      let previous = -Infinity;
      for (let i = 0; i <= 4000; i++) {
        const y = mapCurveY(sampleSignal(i / 4000).y, seams, clamped);
        expect(y).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = y;
      }
    }
  });

  it('ignores non-finite measurements', () => {
    expect(resolveSpinePixels([Number.NaN, Number.POSITIVE_INFINITY], seams)).toEqual([null, null]);
  });

  it('carries the pinning through toPixelPoints', () => {
    const pts = toPixelPoints(sampleSignalRange(SPINE_SPAN.tStart, SPINE_SPAN.tEnd, 3), 1440, seams, spine);
    expect(pts[0].y).toBeCloseTo(2300, 6);
    expect(pts[2].y).toBeCloseTo(3700, 6);
  });
});

describe('the ring split — control point RING_SPLIT_POINT, pinned to the rail track', () => {
  const splitT = controlPointT(RING_SPLIT_POINT);
  const ring = SECTION_SPANS.find((s) => s.id === 'ring')!;

  it('is where the arc reaches the centre: x is 0', () => {
    expect(sampleSignal(splitT).x).toBeCloseTo(0, 12);
  });

  it('is the curve\'s maximum z — nearest the viewer on the whole curve', () => {
    const splitZ = sampleSignal(splitT).z;
    for (let i = 0; i <= 20000; i++) {
      expect(sampleSignal(i / 20000).z).toBeLessThanOrEqual(splitZ + 1e-12);
    }
  });

  it('sits strictly inside the ring span', () => {
    expect(splitT).toBeGreaterThan(ring.tStart);
    expect(splitT).toBeLessThan(ring.tEnd);
  });

  it('is an in-section anchor on the centre line of [data-signal-split]', () => {
    const i = IN_SECTION_ANCHORS.findIndex((a) => a.point === RING_SPLIT_POINT);
    expect(IN_SECTION_ANCHORS[i]).toEqual({
      point: RING_SPLIT_POINT,
      selector: '[data-signal-split]',
      edge: 'centre',
    });
    expect(ANCHOR_CURVE_Y[i]).toBeCloseTo(sampleSignal(splitT).y, 12);
  });
});

describe('in-section anchors — the general mechanism', () => {
  const seams = resolveSeamPixels(TOPS, HEIGHT);
  // Spine inside work (1850–3900), and the track inside the ring (3900–6400).
  const MEASURED = [2300, 3700, 4600];
  const anchors = resolveAnchorPixels(MEASURED, seams);

  it('lists the spine ends first and every anchor in curve order', () => {
    expect(IN_SECTION_ANCHORS.map((a) => a.point)).toEqual([
      SPINE_FIRST_POINT,
      SPINE_LAST_POINT,
      RING_SPLIT_POINT,
    ]);
    for (let i = 1; i < ANCHOR_CURVE_Y.length; i++) {
      expect(ANCHOR_CURVE_Y[i]).toBeGreaterThan(ANCHOR_CURVE_Y[i - 1]);
    }
  });

  it('keeps the knots strictly ordered in curve y, and ordered in pixels, with every anchor in', () => {
    const knots = anchorKnots(seams, anchors);
    expect(knots.curve).toHaveLength(SEAM_CURVE_Y.length + IN_SECTION_ANCHORS.length);
    for (let i = 1; i < knots.curve.length; i++) {
      expect(knots.curve[i]).toBeGreaterThan(knots.curve[i - 1]);
      expect(knots.pixel[i]).toBeGreaterThanOrEqual(knots.pixel[i - 1]);
    }
  });

  it('lands every anchor on its element, and leaves every seam where it was', () => {
    MEASURED.forEach((px, i) => expect(mapCurveY(ANCHOR_CURVE_Y[i], seams, anchors)).toBeCloseTo(px, 9));
    SECTION_SPANS.forEach((span, i) => {
      expect(mapCurveY(sampleSignal(span.tStart).y, seams, anchors)).toBeCloseTo(TOPS[i], 9);
    });
  });

  it('stays monotonic in y, sampled densely', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 20000; i++) {
      const y = mapCurveY(sampleSignal(i / 20000).y, seams, anchors);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });

  it('pins the split independently of the spine', () => {
    const splitOnly = resolveAnchorPixels([null, null, 4600], seams);
    expect(splitOnly).toEqual([null, null, 4600]);
    expect(mapCurveY(ANCHOR_CURVE_Y[2], seams, splitOnly)).toBeCloseTo(4600, 9);
    // The work section is untouched: seam-linear, exactly as with no anchors at all.
    const mid = (SPINE_CURVE_Y[0] + SPINE_CURVE_Y[1]) / 2;
    expect(mapCurveY(mid, seams, splitOnly)).toBeCloseTo(mapCurveY(mid, seams), 9);
  });

  it('clamps the split into the ring section, never across a seam', () => {
    expect(resolveAnchorPixels([null, null, 3000], seams)[2]).toBe(TOPS[3]);
    expect(resolveAnchorPixels([null, null, 9000], seams)[2]).toBe(TOPS[4]);
    // A spine end past its own seam does not drag the split with it.
    expect(resolveAnchorPixels([2300, 4800, 4600], seams)).toEqual([2300, TOPS[3], 4600]);
  });

  it('puts the split on a drawn vertex when the curve is cut there', () => {
    const splitT = controlPointT(RING_SPLIT_POINT);
    const pts = toPixelPoints(sampleSignalRange(splitT, splitT, 1), 1440, seams, anchors);
    expect(pts[0]).toEqual({ x: 720, y: 4600 });
  });
});

describe('controlPointT', () => {
  it('names the same t the spine span is built from', () => {
    expect(controlPointT(SPINE_FIRST_POINT)).toBe(SPINE_SPAN.tStart);
    expect(controlPointT(SPINE_LAST_POINT)).toBe(SPINE_SPAN.tEnd);
  });
});
