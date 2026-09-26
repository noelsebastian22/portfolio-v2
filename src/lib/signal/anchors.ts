/**
 * Section anchors — pins the canonical curve to the page's sections.
 *
 * `path.ts` describes the curve in normalised space, `y` 0..1. Mapping that `y` linearly
 * onto the whole document only lines the curve up with a section by coincidence, and any
 * change to a section's height slides the line off it. Instead, each `SECTION_SPANS` seam
 * is pinned to the top of the section it opens, and the curve is scaled linearly between
 * seams. This is renderer scaling — the geometry in `path.ts` is untouched.
 *
 * Inside sections, further anchors pin particular control points to particular elements
 * (`IN_SECTION_ANCHORS`, below): the work spine's two ends and the ring's split. They are
 * optional: without them the mapping is seam-linear.
 *
 * Pure module: no DOM. The renderer measures the section tops and hands them in.
 * All pixel values here are in the renderer's own box (the `<svg>`), not the document.
 */

import {
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
 * seam-linear mapping on that side — and every one of them is renderer scaling: `path.ts`
 * is untouched.
 *
 * Why they exist: the seams alone scale the curve linearly inside a section, so a feature
 * of the curve lands wherever the section's height happens to put it.
 *
 * - **The spine** (`SPINE_SPAN`, control points 21 and 26). Seam-linear, the right-to-left
 *   sweep that opens `work` always took 47.6% of the section, and the first case studies
 *   sat beside the sweep instead of the spine they branch from. Pinning the spine's ends
 *   to the first card's top and the last card's bottom fits the sweep into the head.
 * - **The ring's split** (`RING_SPLIT_POINT`, control point 34). The arc reaches the
 *   centre there, and §6 has the line split into five at that point. It is pinned to the
 *   centre line of the ring rail's track, so the curve meets the track exactly.
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
 * Curve `y` (0..1) → pixel `y`, piecewise-linear between anchors: the seams, plus each
 * in-section anchor `anchors` has a pixel for. Monotonic because every anchor is
 * non-decreasing in both spaces. Out-of-range input extrapolates along the end segments
 * rather than clamping, though the curve never produces any.
 */
export function mapCurveY(
  curveY: number,
  seamPixels: readonly number[],
  anchors?: AnchorPixels,
): number {
  return mapThroughKnots(curveY, anchorKnots(seamPixels, anchors));
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
  const knots = anchorKnots(seamPixels, anchors);
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
