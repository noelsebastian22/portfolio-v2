/**
 * The reveal's playhead: page progress → a page-`y` the line is drawn down to → a dash
 * length along the drawn path.
 *
 * Revealing by path-length fraction (`t × totalLength`) ties the tip to how much line
 * precedes it, not to where the reader is. Pinned to the sections, the curve spends a lot
 * of its length in the horizontal Nine Years run and the sweep, so the tip trailed above
 * the viewport while `#work` was on screen. The playhead ties it to the viewport instead.
 *
 * Pure module: no DOM.
 */

import type { PixelPoint } from './anchors';

/**
 * The playhead's page `y` for page progress `t`, where `t = scrollY / (docHeight − vh)`.
 *
 * `scrollY + vh × (0.5 + 0.5t)`: the viewport's centre at the top of the page, sliding to
 * its bottom edge as the page ends, so the tip is always inside the viewport, and at
 * `t = 1` it is the document's bottom — the line is fully drawn. Monotonic in `t`.
 * `scrollY` is recovered from `t` so the renderer needs nothing but the progress it is
 * already given.
 */
export function playheadPageY(t: number, docHeight: number, viewportHeight: number): number {
  const progress = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const scrollRange = Math.max(0, docHeight - viewportHeight);
  return progress * scrollRange + viewportHeight * (0.5 + 0.5 * progress);
}

/**
 * Cumulative length along the polyline at each point: `table[i]` is the drawn length from
 * the first point to point `i`. Built from the same pixel points the path is drawn from,
 * so a dash of `table[i]` ends exactly on vertex `i`.
 */
export function cumulativeLengths(points: readonly PixelPoint[]): number[] {
  const table = new Array<number>(points.length);
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    table[i] = total;
  }
  return table;
}

/**
 * The drawn length at which the line reaches pixel height `y`. Binary search on `y`, which
 * is monotonic along the polyline, then linear along the segment that contains it. Clamps:
 * 0 above the first point, the whole length below the last.
 */
export function lengthAtY(points: readonly PixelPoint[], table: readonly number[], y: number): number {
  const last = points.length - 1;
  if (last < 0) return 0;
  if (!(y > points[0].y)) return 0;
  if (y >= points[last].y) return table[last];

  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].y < y) lo = mid + 1;
    else hi = mid;
  }
  const a = points[lo - 1];
  const b = points[lo];
  const span = b.y - a.y;
  const fraction = span > 0 ? (y - a.y) / span : 1;
  return table[lo - 1] + fraction * (table[lo] - table[lo - 1]);
}
