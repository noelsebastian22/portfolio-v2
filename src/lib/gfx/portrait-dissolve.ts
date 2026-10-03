/**
 * How the face drains into the line (Phase 11 design D1, D9) — the tested reference for the
 * vertex shader in particles.ts, which implements these same formulas with these same
 * constants (injected as `#define`s, so the two cannot disagree about a number).
 *
 * `p` is the dissolve's progress: 0 with the face whole, 1 as the line begins to draw from the
 * point the particles converged on. It is a pure function of scroll, so the way back up
 * retraces the way down exactly.
 *
 * Pure. Page px throughout, `y` down.
 */

export interface PagePoint {
  x: number;
  y: number;
}

export const DISSOLVE = {
  /** The share of `p` each particle spends travelling. */
  window: 0.45,
  /** Every particle has arrived by this `p`, leaving the last stretch for the hand-off. */
  lastArrival: 0.92,
  /** 0 is a straight line to the start; 1 bends the path to drop first, then sweep. */
  bow: 0.8,
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep01 = (x: number) => x * x * (3 - 2 * x);

/**
 * The 2D reveal's tip is the playhead (`playheadPageY`, playhead.ts): the viewport's centre at
 * scroll 0. The face is gone exactly as that playhead reaches the line's first point. A very
 * tall window can put that point barely below the playhead, so the range is floored at half the
 * hero: the line then starts drawing just before the face has finished leaving (accepted, spec §4).
 */
export function dissolveProgress(
  playheadY: number,
  restPlayheadY: number,
  startY: number,
  heroHeight: number,
): number {
  const range = Math.max(startY - restPlayheadY, heroHeight / 2);
  if (!(range > 0)) return 1;
  return clamp01((playheadY - restPlayheadY) / range);
}

/** A particle's own progress, 0 home … 1 arrived. Lower in the face (`homeV` → 1) leaves first. */
export function particleProgress(homeV: number, progress: number): number {
  const stagger = 1 - homeV;
  const leaves = stagger * (DISSOLVE.lastArrival - DISSOLVE.window);
  return smoothstep01(clamp01((progress - leaves) / DISSOLVE.window));
}

/**
 * A quadratic curve from home to the start. The control point is pulled from the midpoint
 * toward the corner below home, so the stream falls under the portrait before it sweeps left
 * along the hero's bottom edge — away from the headline and the CTAs.
 */
export function particleAt(home: PagePoint, homeV: number, start: PagePoint, progress: number): PagePoint {
  const travelled = particleProgress(homeV, progress);
  const control = {
    x: (home.x + start.x) / 2 + ((home.x - (home.x + start.x) / 2) * DISSOLVE.bow),
    y: (home.y + start.y) / 2 + ((start.y - (home.y + start.y) / 2) * DISSOLVE.bow),
  };
  const rest = 1 - travelled;
  return {
    x: rest * rest * home.x + 2 * rest * travelled * control.x + travelled * travelled * start.x,
    y: rest * rest * home.y + 2 * rest * travelled * control.y + travelled * travelled * start.y,
  };
}

/**
 * How much of the still is hidden, from the bottom, at dissolve progress `p` (design R1, D12):
 * the share of its height whose particles have started to leave. The lowest particles leave at
 * `p = 0` and the highest at `lastArrival − window`, so the photograph is gone exactly where its
 * particles are, and never hangs half-faded where they left.
 */
export function stillErosion(progress: number): number {
  return clamp01(progress / (DISSOLVE.lastArrival - DISSOLVE.window));
}
