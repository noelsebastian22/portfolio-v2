/**
 * Drawing things off the signal — shared by every island that draws a mark as the line
 * reaches it: section 03's branches (`work.ts`) and section 04's split (`ring.ts`).
 *
 * Three things, all of them already decided elsewhere and only named here:
 *
 * - **The draw clock is the tip.** A mark starts drawing when the signal's drawn tip
 *   (`tip.ts`) passes the mark's origin and is complete a stated distance of tip travel
 *   later, so the line visibly reaches a thing and then acts on it. `tipFraction` is that
 *   mapping; the distance is each caller's to state.
 * - **The two easings of §7.4** — one for the line, one for emissions. They are applied to
 *   progress, never to a duration: nothing here runs on a clock of its own.
 * - **The re-measure debounce** the renderer uses, so a section island re-measures on the
 *   same beat as the line it follows.
 *
 * Pure module: no DOM.
 */

/** How long a resize must settle before anything re-measures, in ms. */
export const RESIZE_DEBOUNCE_MS = 150;

/** Clamped to 0..1; NaN reads as 0. */
export function unit(value: number): number {
  if (!(value > 0)) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Linear progress of a mark drawn off the line: 0 until the tip reaches `originY`, 1 once
 * it is `distancePx` further down. All page `y`. `null` (no tip yet) reads as undrawn.
 */
export function tipFraction(tipY: number | null, originY: number, distancePx: number): number {
  if (tipY === null) return 0;
  return unit((tipY - originY) / distancePx);
}

/**
 * The line's signature curve: a long ease-out. Applied to progress, never to a duration.
 * Quartic, so most of the travel happens early and the last stretch settles.
 */
export function easeLine(t: number): number {
  return 1 - (1 - unit(t)) ** 4;
}

/**
 * The emissions' curve: a slight overshoot, so an emission arrives rather than fades in.
 * A back-out with a small overshoot constant — it peaks about 6% past 1 and settles on 1.
 */
const OVERSHOOT = 1.2;
export function easeEmission(t: number): number {
  const u = unit(t) - 1;
  return 1 + (OVERSHOOT + 1) * u ** 3 + OVERSHOOT * u ** 2;
}
