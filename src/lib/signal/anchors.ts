/**
 * Section anchors — pins the canonical curve to the page's sections.
 *
 * `path.ts` describes the curve in normalised space, `y` 0..1. Mapping that `y` linearly
 * onto the whole document only lines the curve up with a section by coincidence, and any
 * change to a section's height slides the line off it. Instead, each `SECTION_SPANS` seam
 * is pinned to the top of the section it opens, and the curve is stretched between seams
 * along a monotone cubic (see `mapCurveY`). This is renderer scaling — the geometry in
 * `path.ts` is untouched.
 *
 * Inside sections, further anchors pin particular control points to particular elements
 * (`IN_SECTION_ANCHORS`, below): the work spine's two ends and the ring's split. They are
 * optional: without them only the seams are knots.
 *
 * Pure module: no DOM. The renderer measures the section tops and hands them in.
 * All pixel values here are in the renderer's own box (the `<svg>`), not the document.
 */

import {
  RING_HOLD_END_POINT,
  RING_SPLIT_POINT,
  SECTION_SPANS,
  SPINE_FIRST_POINT,
  SPINE_LAST_POINT,
  controlPointT,
  sampleSignal,
  type SignalPoint,
} from './path';

export interface PixelPoint {
  x: number;
  y: number;
}

/**
 * The curve's `y` at every seam, in `SECTION_SPANS` order, plus the terminus. One more
 * entry than there are sections. Strictly increasing, because `y` is monotonic in `t`.
 */
export const SEAM_CURVE_Y: readonly number[] = [
  ...SECTION_SPANS.map((span) => sampleSignal(span.tStart).y),
  sampleSignal(1).y,
];

/**
 * Pixel `y` for every seam (same length as `SEAM_CURVE_Y`).
 *
 * `sectionTops[i]` is the measured top of `SECTION_SPANS[i]`'s element, in the box's
 * coordinates, or `null` when the page has no such element. A missing anchor falls back to
 * the old whole-box linear position for that seam, so a page with no sections at all
 * (`/websites`) draws exactly what it always drew.
 *
 * The curve's last knot is `terminus` when the page has one — the footer's completion bar
 * — measured the same way as a section top. Without one (or a non-finite measurement) it
 * falls back to the box's bottom edge, exactly as before. Fallback seams scale to whichever
 * of the two is in force, so a page with a terminus but a missing section top still ends
 * where the terminus is rather than overshooting to the box.
 *
 * The first seam is clamped to the box's top and every seam, including the terminus, is
 * clamped at or below `end` and at or above the one before it — so a fallback can neither
 * fold the line back up the page nor run past where it ends, whether that end is the
 * terminus or the box bottom.
 */
export function resolveSeamPixels(
  sectionTops: readonly (number | null | undefined)[],
  height: number,
  terminus?: number | null,
): number[] {
  const hasTerminus = typeof terminus === 'number' && Number.isFinite(terminus);
  const end = hasTerminus ? Math.min(height, Math.max(0, terminus)) : height;
  const seams: number[] = new Array(SEAM_CURVE_Y.length);
  const lastIndex = SEAM_CURVE_Y.length - 1;
  for (let i = 0; i < SEAM_CURVE_Y.length; i++) {
    const measured = i < lastIndex ? sectionTops[i] : end;
    const hasMeasurement = typeof measured === 'number' && Number.isFinite(measured);
    const raw = hasMeasurement ? measured : SEAM_CURVE_Y[i] * end;
    const floor = i === 0 ? 0 : seams[i - 1];
    seams[i] = Math.min(end, Math.max(floor, raw));
  }
  return seams;
}

/**
 * Anchors *inside* a section, as opposed to the seams between sections: a control point
 * pinned to an element's edge. They are optional — a page without the element keeps the
 * seams-only mapping on that side — and every one of them is renderer scaling: `path.ts`
 * is untouched.
 *
 * Why they exist: with only the seams as knots, a feature of the curve lands wherever the
 * section's height happens to put it.
 *
 * - **The spine** (`SPINE_SPAN`, control points 21 and 26). Pinned by the seams alone,
 *   the right-to-left sweep that opens `work` always took 47.6% of the section, and the
 *   first case studies sat beside the sweep instead of the spine they branch from.
 *   Pinning the spine's ends to the first card's top and the last card's bottom fits the
 *   sweep into the head.
 * - **The ring's split** (`RING_SPLIT_POINT`, control point 34). The arc reaches the
 *   centre there, and §6 has the line split into five at that point. It is pinned to the
 *   centre line of the ring rail's track, so the curve meets the track exactly.
 * - **The ring's hold end** (`RING_HOLD_END_POINT`, control point 36). With the split, it
 *   brackets the stretch the curve holds centre. In the rail it is the cards' bottom edge; in
 *   the 3D ring (Phase 12) it is where the hoop's front point sits when the pin releases.
 *
 * In curve order. Each must sit strictly inside one section's span, which the module
 * checks at import.
 */
export interface InSectionAnchor {
  /** The control point that lands on the element (see `controlPointT`). */
  point: number;
  /** The element the renderer measures. */
  selector: string;
  /** Which of the element's horizontal lines the point lands on. */
  edge: 'top' | 'centre' | 'bottom';
}

export const IN_SECTION_ANCHORS: readonly InSectionAnchor[] = [
  { point: SPINE_FIRST_POINT, selector: '[data-signal-spine="start"]', edge: 'top' },
  { point: SPINE_LAST_POINT, selector: '[data-signal-spine="end"]', edge: 'bottom' },
  { point: RING_SPLIT_POINT, selector: '[data-signal-split]', edge: 'centre' },
  { point: RING_HOLD_END_POINT, selector: '[data-signal-hold="end"]', edge: 'top' },
];

/** The global `t` of every in-section anchor, in `IN_SECTION_ANCHORS` order. */
export const ANCHOR_T: readonly number[] = IN_SECTION_ANCHORS.map((a) => controlPointT(a.point));

/** The curve's `y` at every in-section anchor, in `IN_SECTION_ANCHORS` order. */
export const ANCHOR_CURVE_Y: readonly number[] = ANCHOR_T.map((t) => sampleSignal(t).y);

/** For each anchor, the index of the seam that opens the section it lives in. */
const ANCHOR_SEAM: readonly number[] = ANCHOR_T.map((t, i) => {
  const seam = SECTION_SPANS.findIndex((span) => span.tStart < t && t < span.tEnd);
  // Fail at import, like path.ts does: an anchor on a seam would be two knots at one
  // curve `y`, and one out of order would fold the mapping back up the page.
  if (seam < 0) throw new Error(`signal/anchors: anchor ${i} is not strictly inside a section`);
  if (i > 0 && !(t > ANCHOR_T[i - 1])) throw new Error('signal/anchors: anchors out of curve order');
  return seam;
});

/**
 * Pixel `y` for each in-section anchor, in `IN_SECTION_ANCHORS` order; `null` (or simply
 * absent, past the end of a shorter list) where the page has no such element.
 */
export type AnchorPixels = readonly (number | null | undefined)[];

/**
 * The anchors, clamped so they can never fold the line back up the page: each stays inside
 * its own section, between that section's seam and the next one, and at or below the
 * anchor before it in the same section. A missing or non-finite measurement is `null`, and
 * the mapping then falls back to the neighbouring knots on either side of it.
 */
export function resolveAnchorPixels(
  measured: readonly (number | null | undefined)[],
  seamPixels: readonly number[],
): (number | null)[] {
  const resolved: (number | null)[] = [];
  for (let i = 0; i < IN_SECTION_ANCHORS.length; i++) {
    const seam = ANCHOR_SEAM[i];
    let floor = seamPixels[seam];
    for (let j = 0; j < i; j++) {
      const earlier = resolved[j];
      if (ANCHOR_SEAM[j] === seam && earlier !== null) floor = earlier;
    }
    const ceiling = seamPixels[seam + 1];
    const value = measured[i];
    const isMeasured = typeof value === 'number' && Number.isFinite(value);
    resolved.push(isMeasured ? Math.min(ceiling, Math.max(floor, value)) : null);
  }
  return resolved;
}

/**
 * The spine's two anchors on their own — the first two entries of `IN_SECTION_ANCHORS`.
 * Kept as a named view over the general mechanism because the spine is what the work
 * section's layout and its tests reason about.
 */
export const SPINE_CURVE_Y: readonly [start: number, end: number] = [
  ANCHOR_CURVE_Y[0],
  ANCHOR_CURVE_Y[1],
];

/** Pixel `y` for the spine's two ends; `null` where the page has no such anchor. */
export type SpinePixels = readonly [start: number | null, end: number | null];

/** `resolveAnchorPixels` for the spine alone. Any later anchor reads as missing. */
export function resolveSpinePixels(
  spineTops: readonly [start: number | null | undefined, end: number | null | undefined],
  seamPixels: readonly number[],
): SpinePixels {
  const [start, end] = resolveAnchorPixels(spineTops, seamPixels);
  return [start, end];
}

/** Every anchor as a knot pair — curve `y` and pixel `y` — strictly ordered in curve `y`. */
export interface Knots {
  curve: number[];
  pixel: number[];
}

/**
 * The seams, with every in-section anchor the page has slotted in after the seam that
 * opens its section. Exported for the tests, which hold the curve side strictly increasing.
 */
export function anchorKnots(seamPixels: readonly number[], anchors?: AnchorPixels): Knots {
  const curve: number[] = [];
  const pixel: number[] = [];
  for (let i = 0; i < SEAM_CURVE_Y.length; i++) {
    curve.push(SEAM_CURVE_Y[i]);
    pixel.push(seamPixels[i]);
    if (!anchors) continue;
    for (let k = 0; k < IN_SECTION_ANCHORS.length; k++) {
      const measured = anchors[k];
      if (ANCHOR_SEAM[k] !== i || typeof measured !== 'number') continue;
      curve.push(ANCHOR_CURVE_Y[k]);
      pixel.push(measured);
    }
  }
  return { curve, pixel };
}

/** The knots plus the mapping's slope (d pixel / d curve `y`) at each of them. */
interface KnotSpline extends Knots {
  slope: number[];
}

/**
 * Fritsch–Carlson slopes for a monotone cubic Hermite through the knots. A piecewise-linear
 * map has a slope jump at every knot, and the line shows each one as a corner — at 1440 the
 * years → work seam bent 43° in one vertex. Hermite with shared slopes is C1 there; the
 * Fritsch–Carlson limit keeps every interval's cubic from overshooting, so the map stays
 * monotone and the line can never fold back up the page.
 */
function toSpline(knots: Knots): KnotSpline {
  const { curve, pixel } = knots;
  const last = curve.length - 1;
  const secant: number[] = [];
  for (let k = 0; k < last; k++) {
    const run = curve[k + 1] - curve[k];
    secant.push(run > 0 ? (pixel[k + 1] - pixel[k]) / run : 0);
  }

  // Each interior knot starts from the slope of the parabola through it and its two
  // neighbours. The plain mean of the two secants ignores how long each interval is, and
  // here they range from a spine-to-seam gap of under 100px to whole sections: it pulled a
  // long interval's steep slope into a short neighbour, which then had to brake hard inside
  // it, drawing a kink under 40px in radius where the spine hands over to the ring on a
  // narrow layout.
  const slope: number[] = new Array(curve.length);
  slope[0] = secant[0] ?? 0;
  slope[last] = secant[last - 1] ?? 0;
  for (let k = 1; k < last; k++) {
    const before = curve[k] - curve[k - 1];
    const after = curve[k + 1] - curve[k];
    slope[k] = (secant[k - 1] * after + secant[k] * before) / (before + after);
  }

  for (let k = 0; k < last; k++) {
    // A flat interval — two knots clamped onto one pixel — must stay flat end to end, or
    // the cubic would bulge out of it in one direction or the other.
    if (secant[k] === 0) {
      slope[k] = 0;
      slope[k + 1] = 0;
      continue;
    }
    const alpha = slope[k] / secant[k];
    const beta = slope[k + 1] / secant[k];
    const magnitude = Math.hypot(alpha, beta);
    if (magnitude > 3) {
      const tau = 3 / magnitude;
      slope[k] = tau * alpha * secant[k];
      slope[k + 1] = tau * beta * secant[k];
    }
  }
  return { curve, pixel, slope };
}

function mapThroughSpline(curveY: number, spline: KnotSpline): number {
  const { curve, pixel, slope } = spline;
  const last = curve.length - 1;
  if (curveY <= curve[0]) return pixel[0] + (curveY - curve[0]) * slope[0];
  if (curveY >= curve[last]) return pixel[last] + (curveY - curve[last]) * slope[last];

  let k = 0;
  while (k < last - 1 && curveY > curve[k + 1]) k++;
  const run = curve[k + 1] - curve[k];
  if (!(run > 0)) return pixel[k];
  const s = (curveY - curve[k]) / run;
  const s2 = s * s;
  const s3 = s2 * s;
  // Hermite, written as an offset from the interval's top knot so a flat interval returns
  // that knot's pixel exactly rather than within a rounding error either side of it.
  return (
    pixel[k] +
    (pixel[k + 1] - pixel[k]) * (3 * s2 - 2 * s3) +
    run * ((s3 - 2 * s2 + s) * slope[k] + (s3 - s2) * slope[k + 1])
  );
}

/**
 * Curve `y` (0..1) → pixel `y`, through every anchor: the seams, plus each in-section
 * anchor `anchors` has a pixel for. A monotone cubic (`toSpline`), so it passes exactly
 * through each knot with no corner at any of them, and never decreases because every
 * anchor is non-decreasing in both spaces. Out-of-range input extrapolates linearly along
 * the end slopes rather than clamping, though the curve never produces any.
 */
export function mapCurveY(
  curveY: number,
  seamPixels: readonly number[],
  anchors?: AnchorPixels,
): number {
  return mapThroughSpline(curveY, toSpline(anchorKnots(seamPixels, anchors)));
}

/**
 * Scales sampled curve points into the box: `x` −1..1 across the width, exactly as
 * `toSvgPath` does, and `y` through the anchors.
 */
export function toPixelPoints(
  points: readonly SignalPoint[],
  width: number,
  seamPixels: readonly number[],
  anchors?: AnchorPixels,
): PixelPoint[] {
  const spline = toSpline(anchorKnots(seamPixels, anchors));
  return points.map((p) => ({
    x: ((p.x + 1) / 2) * width,
    y: mapThroughSpline(p.y, spline),
  }));
}

/** Trim float noise so the emitted `d` attribute stays readable and small. */
function round(value: number): number {
  return Number(value.toFixed(3));
}

/** An SVG `d` attribute for already-scaled pixel points — a plain polyline. */
export function toPixelPath(points: readonly PixelPoint[]): string {
  let d = '';
  for (let i = 0; i < points.length; i++) {
    d += `${i === 0 ? 'M' : ' L'}${round(points[i].x)} ${round(points[i].y)}`;
  }
  return d;
}

/**
 * The inverse the branch work needs: the curve's pixel `x` at pixel height `y`, read off
 * the same polyline the path is drawn from, so a branch starts exactly on the drawn line.
 * `null` above the first point or below the last.
 */
export function xAtPixelY(points: readonly PixelPoint[], y: number): number | null {
  if (points.length === 0) return null;
  if (y < points[0].y || y > points[points.length - 1].y) return null;

  // Binary search for the first point at or below `y`. `y` is non-decreasing along the
  // polyline, so this is the segment that contains it.
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].y < y) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return points[0].x;
  const a = points[lo - 1];
  const b = points[lo];
  const span = b.y - a.y;
  if (span <= 0) return b.x;
  return a.x + ((y - a.y) / span) * (b.x - a.x);
}

/**
 * The one place the layer's box coordinates become page coordinates for a curve lookup:
 * page `y` → the drawn curve's page `x`, given where the box's origin sits in the page.
 * Closes over `points` as they are — the renderer replaces the array on every re-measure
 * rather than mutating it, so a lookup handed out earlier stays self-consistent.
 */
export function pageCurveLookup(
  points: readonly PixelPoint[],
  boxLeftInPage: number,
  boxTopInPage: number,
): (pageY: number) => number | null {
  return (pageY) => {
    if (!Number.isFinite(pageY)) return null;
    const x = xAtPixelY(points, pageY - boxTopInPage);
    return x === null ? null : boxLeftInPage + x;
  };
}
