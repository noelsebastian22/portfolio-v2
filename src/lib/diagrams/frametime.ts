/**
 * SRT Marine — a frame-time trace holding flat on the budget line for the claimed frame
 * rate. The resume says "holding real-time data rendering at 60fps"; the diagram draws the
 * claim, not a simulation of it. Every sample sits at exactly `1000 / fps` milliseconds —
 * derived from the 60 in the data, never typed as the literal 16.7 — and no jitter or noise
 * is added. Simulated per-frame samples would be invented data this module has no source
 * for.
 *
 * Because every point shares one `y`, this geometry never needs a start/end pair or a
 * progress parameter of its own: Task 6.3 can reveal the already-computed flat line with a
 * stroke-dasharray/dashoffset driven by scroll progress, which needs no new geometry.
 *
 * Pure geometry, no DOM. Coordinates are normalised: `x` runs 0..1 across the trace, `y` is
 * the frame time in milliseconds (Task 6.3 maps it onto the diagram's height).
 */

import type { FrametimeDiagramData } from './types';

export interface FrametimePoint {
  x: number;
  y: number;
}

export interface FrametimeGeometry {
  /** Milliseconds per frame implied by `fps` — e.g. 1000/60 ≈ 16.667. */
  frameTimeMs: number;
  /** Evenly spaced sample points tracing a flat line at `frameTimeMs`. */
  points: FrametimePoint[];
}

/**
 * How many points make up the trace. This is a rendering choice (dense enough to read as a
 * continuous line), not a claim about measured samples — every point's `y` is identical, so
 * no per-sample data is being asserted, only that the rate held steady across the trace.
 */
const SAMPLE_COUNT = 48;

export function frametimeGeometry(data: FrametimeDiagramData): FrametimeGeometry {
  const frameTimeMs = 1000 / data.fps;
  const points: FrametimePoint[] = new Array(SAMPLE_COUNT);
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    points[i] = { x: i / (SAMPLE_COUNT - 1), y: frameTimeMs };
  }
  return { frameTimeMs, points };
}
