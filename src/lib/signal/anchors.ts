/**
 * Section anchors — pins the canonical curve to the page's sections.
 *
 * `path.ts` describes the curve in normalised space, `y` 0..1. Mapping that `y` linearly
 * onto the whole document only lines the curve up with a section by coincidence, and any
 * change to a section's height slides the line off it. Instead, each `SECTION_SPANS` seam
 * is pinned to the top of the section it opens, and the curve is scaled linearly between
 * seams. This is renderer scaling — the geometry in `path.ts` is untouched.
 *
 * Inside the work section, two further anchors pin the spine's ends to the case studies
 * (`SPINE_CURVE_Y`, below). They are optional: without them the mapping is seam-linear.
 *
 * Pure module: no DOM. The renderer measures the section tops and hands them in.
 * All pixel values here are in the renderer's own box (the `<svg>`), not the document.
 */

import { SECTION_SPANS, SPINE_SPAN, sampleSignal, type SignalPoint } from './path';

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
 * (`/dev/signal`) draws exactly what it always drew.
 *
 * The first and last seams are clamped into the box, and the terminus always lands on the
 * box's bottom edge: the box is already inset by half the stroke (see `#signal-layer`), so
 * clamping keeps the end caps inside the document rather than past it. Every anchor is also
 * held at or below the one before it, so a fallback seam can never fold the line back up
 * the page.
 */
export function resolveSeamPixels(
  sectionTops: readonly (number | null | undefined)[],
  height: number,
): number[] {
  const seams: number[] = new Array(SEAM_CURVE_Y.length);
  const lastIndex = SEAM_CURVE_Y.length - 1;
  for (let i = 0; i < SEAM_CURVE_Y.length; i++) {
    const measured = i < lastIndex ? sectionTops[i] : height;
    const hasMeasurement = typeof measured === 'number' && Number.isFinite(measured);
    const raw = hasMeasurement ? measured : SEAM_CURVE_Y[i] * height;
    const floor = i === 0 ? 0 : seams[i - 1];
    seams[i] = Math.min(height, Math.max(floor, raw));
  }
  return seams;
}

/**
 * The curve's `y` at the two ends of the work section's spine (`SPINE_SPAN`, control points
 * 21 and 26). These are anchors *inside* a section, not seams.
 *
 * The seams alone scale the curve linearly inside `work`, so the right-to-left sweep that
 * opens it always takes the same share of the section: 47.6% of its height. That puts the
 * first case studies beside the sweep instead of the spine they are supposed to branch
 * from. Pinning the spine's two ends to the first card's top and the last card's bottom
 * fits the sweep into the section head and stretches the spine down beside every card.
 * This is still renderer scaling; `path.ts` is untouched.
 */
export const SPINE_CURVE_Y: readonly [start: number, end: number] = [
  sampleSignal(SPINE_SPAN.tStart).y,
  sampleSignal(SPINE_SPAN.tEnd).y,
];

/** The index of the seam that opens the section the spine lives in. */
const SPINE_SEAM = SECTION_SPANS.findIndex(
  (span) => span.tStart <= SPINE_SPAN.tStart && SPINE_SPAN.tEnd <= span.tEnd,
);

/** Pixel `y` for the spine's two ends; `null` where the page has no such anchor. */
export type SpinePixels = readonly [start: number | null, end: number | null];

/**
 * The spine anchors, clamped so they can never fold the line back up the page: the start
 * stays inside its section, between the section's seam and the next one, and the end sits
 * at or below the start and at or above the next seam. A missing measurement is `null`,
 * and the mapping then falls back to the seams on that side.
 */
export function resolveSpinePixels(
  spineTops: readonly [start: number | null | undefined, end: number | null | undefined],
  seamPixels: readonly number[],
): SpinePixels {
  const top = seamPixels[SPINE_SEAM];
  const bottom = seamPixels[SPINE_SEAM + 1];
  const isMeasured = (v: number | null | undefined): v is number =>
    typeof v === 'number' && Number.isFinite(v);
  const clampInto = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const start = isMeasured(spineTops[0]) ? clampInto(spineTops[0], top, bottom) : null;
  const end = isMeasured(spineTops[1]) ? clampInto(spineTops[1], start ?? top, bottom) : null;
  return [start, end];
}

/** Every anchor as a knot pair — curve `y` and pixel `y` — strictly ordered in curve `y`. */
interface Knots {
  curve: number[];
  pixel: number[];
}

function knotsOf(seamPixels: readonly number[], spine: SpinePixels | undefined): Knots {
  const curve: number[] = [];
  const pixel: number[] = [];
  for (let i = 0; i < SEAM_CURVE_Y.length; i++) {
    curve.push(SEAM_CURVE_Y[i]);
    pixel.push(seamPixels[i]);
    if (i === SPINE_SEAM && spine) {
      for (const k of [0, 1] as const) {
        const measured = spine[k];
        if (measured === null) continue;
        curve.push(SPINE_CURVE_Y[k]);
        pixel.push(measured);
      }
    }
  }
  return { curve, pixel };
}

function mapThroughKnots(curveY: number, knots: Knots): number {
  const last = knots.curve.length - 1;
  let segment = 0;
  while (segment < last - 1 && curveY > knots.curve[segment + 1]) segment++;
  const y0 = knots.curve[segment];
  const y1 = knots.curve[segment + 1];
  const p0 = knots.pixel[segment];
  const p1 = knots.pixel[segment + 1];
  return p0 + ((curveY - y0) / (y1 - y0)) * (p1 - p0);
}

/**
 * Curve `y` (0..1) → pixel `y`, piecewise-linear between anchors: the seams, plus the
 * spine's ends where `spine` has them. Monotonic because every anchor is non-decreasing
 * in both spaces. Out-of-range input extrapolates along the end segments rather than
 * clamping, though the curve never produces any.
 */
export function mapCurveY(
  curveY: number,
  seamPixels: readonly number[],
  spine?: SpinePixels,
): number {
  return mapThroughKnots(curveY, knotsOf(seamPixels, spine));
}

/**
 * Scales sampled curve points into the box: `x` −1..1 across the width, exactly as
 * `toSvgPath` does, and `y` through the anchors.
 */
export function toPixelPoints(
  points: readonly SignalPoint[],
  width: number,
  seamPixels: readonly number[],
  spine?: SpinePixels,
): PixelPoint[] {
  const knots = knotsOf(seamPixels, spine);
  return points.map((p) => ({
    x: ((p.x + 1) / 2) * width,
    y: mapThroughKnots(p.y, knots),
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
