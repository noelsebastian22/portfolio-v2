/**
 * The dim rule: the line is full strength only where it clears the content, and dimmed
 * everywhere else. "Clears" means the stroke's right edge plus the clearance stays at or
 * left of the content box's left edge — the gutter's right edge, or on a screen wider than
 * the container, the empty centring margin plus the gutter.
 *
 * Text paints over the line, and `--type` on full-strength `--signal` is ~2.9:1. Inside the
 * gutter nothing sits on the line; outside it something might, so it drops to
 * `--signal-dim-alpha`. One rule covers sections 01–02 (no gutter at all), the sweep that
 * opens section 03 and crosses its heading, and phone width, where the gutter is zero.
 *
 * Pure module: the renderer measures the gutter and hands in the same pixel points it draws.
 */

import type { PixelPoint } from './anchors';

/** A contiguous range of pixel `y`, top to bottom. */
export type Band = readonly [top: number, bottom: number];

export interface GutterRegion {
  /** Pixel `y` where the gutter starts — the top of the first section that reserves it. */
  top: number;
  /**
   * Pixel `x` where content begins: the centring margin, plus the container's padding,
   * plus `--signal-gutter`. At phone width the gutter is 0 and this is the page padding.
   */
  contentLeft: number;
  /** How far right of a point the line reaches, plus the clearance: stroke / 2 + clearance. */
  reach: number;
}

/**
 * Contiguous `y` ranges where the drawn line clears the content: at or below `region.top`,
 * and with `x + reach` at or left of `region.contentLeft`.
 *
 * There is no special case for phone width. There the content edge is the page padding
 * (24px) and the curve never comes within 13% of the width of the left edge, so no point
 * clears and the whole line dims — by geometry, the same test as everywhere else.
 *
 * Crossings are interpolated along the polyline segment rather than snapped to a vertex,
 * so a band edge sits where the drawn chord actually crosses the gutter edge.
 */
export function gutterBands(points: readonly PixelPoint[], region: GutterRegion): Band[] {
  if (points.length === 0) return [];

  const bands: Band[] = [];
  let bandTop: number | null = null;
  const clearRight = region.contentLeft - region.reach;

  const isInside = (p: PixelPoint): boolean => p.y >= region.top && p.x <= clearRight;

  /** Where segment a→b crosses the gutter's boundary (its right edge or its top). */
  const crossingY = (a: PixelPoint, b: PixelPoint): number => {
    const crossesTop = (a.y < region.top) !== (b.y < region.top);
    if (crossesTop) return region.top;
    const dx = b.x - a.x;
    if (dx === 0) return b.y;
    return a.y + ((clearRight - a.x) / dx) * (b.y - a.y);
  };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const inside = isInside(p);
    if (inside && bandTop === null) {
      bandTop = i === 0 ? p.y : crossingY(points[i - 1], p);
    } else if (!inside && bandTop !== null) {
      bands.push([bandTop, crossingY(points[i - 1], p)]);
      bandTop = null;
    }
  }
  if (bandTop !== null) bands.push([bandTop, points[points.length - 1].y]);

  // A band of zero height is a vertex grazing the edge, not a run inside the gutter.
  return bands.filter(([top, bottom]) => bottom > top);
}

export interface StrengthStop {
  /** 0..1 down the box. */
  offset: number;
  full: boolean;
}

/**
 * Gradient stops for the bands: dim everywhere, full strength inside each band, with a
 * linear crossfade of `fadePx` at each band edge so the line never snaps in opacity.
 *
 * The crossfade is laid *inside* the band, never outside it. Outside the gutter text may
 * sit on the line, and the dim alpha is what keeps it at AA — so no point outside a band
 * is ever drawn stronger than dim. A band shorter than two fades ramps up and straight
 * back down.
 */
export function strengthStops(
  bands: readonly Band[],
  height: number,
  fadePx: number,
): StrengthStop[] {
  const stops: StrengthStop[] = [{ offset: 0, full: false }];
  if (!(height > 0)) return [...stops, { offset: 1, full: false }];

  const toOffset = (y: number): number => Math.min(1, Math.max(0, y / height));

  for (const [top, bottom] of bands) {
    const fade = Math.min(fadePx, (bottom - top) / 2);
    stops.push(
      { offset: toOffset(top), full: false },
      { offset: toOffset(top + fade), full: true },
      { offset: toOffset(bottom - fade), full: true },
      { offset: toOffset(bottom), full: false },
    );
  }

  stops.push({ offset: 1, full: false });

  // SVG gradient offsets must be non-decreasing; clamping above can only have produced
  // ties, but hold the invariant explicitly rather than trusting the band order.
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].offset < stops[i - 1].offset) stops[i] = { ...stops[i], offset: stops[i - 1].offset };
  }
  return stops;
}

/**
 * The strength at pixel `y`: 0 dim … 1 full, read off `strengthStops` exactly as an SVG
 * gradient interpolates them — linearly between neighbours, the later stop winning a tie.
 * The tube carries this per vertex, so it dims exactly where the SVG line dims.
 */
export function strengthAt(stops: readonly StrengthStop[], height: number, y: number): number {
  if (!(height > 0) || stops.length === 0) return 0;
  const offset = Math.min(1, Math.max(0, y / height));
  const level = (stop: StrengthStop): number => (stop.full ? 1 : 0);

  for (let i = 1; i < stops.length; i++) {
    const [before, after] = [stops[i - 1], stops[i]];
    if (offset > after.offset) continue;
    const span = after.offset - before.offset;
    if (!(span > 0)) return level(after);
    return level(before) + ((level(after) - level(before)) * (offset - before.offset)) / span;
  }
  return level(stops[stops.length - 1]);
}
