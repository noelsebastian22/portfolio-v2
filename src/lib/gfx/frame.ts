/**
 * Frame timing for the tube: the probe that decides whether it starts, the watchdog that
 * decides whether it stays, and the one rule for handing back to the 2D line.
 *
 * Pure — the scene feeds the probe `requestAnimationFrame` intervals, and the watchdog the
 * interval between drawn ticks (render-schedule.ts). The thresholds hold on 60Hz and 120Hz
 * displays alike, since both are judged in milliseconds rather than frames.
 */

import { MIN_VIEWPORT_WIDTH } from './gate';

export type ProbeVerdict = 'pass' | 'fail' | 'inconclusive';

export const PROBE_FRAMES = 20;
const PROBE_MEDIAN_MS = 20;
const PROBE_P90_MS = 33;
/** Longer than any real frame: the tab was hidden or the thread was busy with something else. */
const INCONCLUSIVE_GAP_MS = 250;

const WATCH_WINDOW = 60;
const WATCH_MEDIAN_MS = 25;
/** Rendering only on change leaves pauses between scrolls; those are not frames. */
const IDLE_GAP_MS = 100;

/** Nearest-rank percentile of `values`, 0 < p ≤ 1. */
function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

export function probeVerdict(intervals: readonly number[]): ProbeVerdict {
  const wasInterrupted = intervals.some((ms) => ms > INCONCLUSIVE_GAP_MS);
  if (intervals.length === 0 || wasInterrupted) return 'inconclusive';
  const isSteady = percentile(intervals, 0.5) <= PROBE_MEDIAN_MS;
  const hasNoSlowTail = percentile(intervals, 0.9) <= PROBE_P90_MS;
  return isSteady && hasNoSlowTail ? 'pass' : 'fail';
}

export interface FrameWatch {
  /** Records one rendered frame's interval; `true` once the tube should hand back. */
  push(intervalMs: number): boolean;
}

export function createFrameWatch(): FrameWatch {
  const recent: number[] = [];
  return {
    push(intervalMs) {
      if (!(intervalMs > 0) || intervalMs > IDLE_GAP_MS) return false;
      recent.push(intervalMs);
      if (recent.length > WATCH_WINDOW) recent.shift();
      return recent.length === WATCH_WINDOW && percentile(recent, 0.5) > WATCH_MEDIAN_MS;
    },
  };
}

export interface RuntimeState {
  viewportWidth: number;
  reducedMotion: boolean;
  contextLost: boolean;
  watchTripped: boolean;
}

/** Any one of these hands the page back to the SVG line for the rest of the visit. */
export function shouldFallBack(state: RuntimeState): boolean {
  const isNowNarrow = state.viewportWidth < MIN_VIEWPORT_WIDTH;
  return isNowNarrow || state.reducedMotion || state.contextLost || state.watchTripped;
}
