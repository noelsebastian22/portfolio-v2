/**
 * Section anchors — pins the canonical curve to the page's sections.
 *
 * `path.ts` describes the curve in normalised space, `y` 0..1. Mapping that `y` linearly
 * onto the whole document only lines the curve up with a section by coincidence, and any
 * change to a section's height slides the line off it. Instead, each `SECTION_SPANS` seam
 * is pinned to the top of the section it opens, and the curve is scaled linearly between
 * seams. This is renderer scaling — the geometry in `path.ts` is untouched.
 *
 * Pure module: no DOM. The renderer measures the section tops and hands them in.
 * All pixel values here are in the renderer's own box (the `<svg>`), not the document.
 */

import { SECTION_SPANS, sampleSignal, type SignalPoint } from './path';

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
 * Curve `y` (0..1) → pixel `y`, piecewise-linear between seams. Monotonic because the
 * seams are non-decreasing in both spaces. Out-of-range input extrapolates along the end
 * segments rather than clamping, though the curve never produces any.
 */
export function mapCurveY(curveY: number, seamPixels: readonly number[]): number {
  const last = SEAM_CURVE_Y.length - 1;
  let segment = 0;
  while (segment < last - 1 && curveY > SEAM_CURVE_Y[segment + 1]) segment++;
  const y0 = SEAM_CURVE_Y[segment];
  const y1 = SEAM_CURVE_Y[segment + 1];
  const p0 = seamPixels[segment];
  const p1 = seamPixels[segment + 1];
  return p0 + ((curveY - y0) / (y1 - y0)) * (p1 - p0);
}

/**
 * Scales sampled curve points into the box: `x` −1..1 across the width, exactly as
 * `toSvgPath` does, and `y` through the seam anchors.
 */
export function toPixelPoints(
  points: readonly SignalPoint[],
  width: number,
  seamPixels: readonly number[],
): PixelPoint[] {
  return points.map((p) => ({
    x: ((p.x + 1) / 2) * width,
    y: mapCurveY(p.y, seamPixels),
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
