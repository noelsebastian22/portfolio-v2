/**
 * The Signal — the canonical curve.
 *
 * This module is the ONLY place the signal's geometry is ever defined. The SVG renderer
 * and the Phase 10 Three.js tube both sample it, which is what makes the 2D fallback and
 * the WebGL version identical choreography rather than a degraded approximation. Adding a
 * renderer must never mean redefining the curve.
 *
 * Pure module: no DOM, no `window`, no imports. Coordinates are normalised — `x` and `z`
 * run −1..1, `y` runs 0..1 down the page. Renderers scale; the curve never knows about
 * pixels. Negative `z` is away from the viewer, positive `z` is toward them.
 *
 * `y` only ever increases: the line travels down the page and never back up it.
 */

export type SectionId = 'hero' | 'years' | 'work' | 'ring' | 'stack' | 'contact';

export interface SignalPoint {
  x: number;
  y: number;
  z: number;
}

export interface SectionSpan {
  id: SectionId;
  tStart: number;
  tEnd: number;
}

/**
 * Hand-placed control points, sampled with a uniform Catmull-Rom spline. Catmull-Rom
 * because it passes *through* its control points: moving a point moves the curve to
 * exactly where you put it, so the line can be tuned by reading the table.
 *
 * Spacing is the design constraint, not just the positions. Sampling maps `t` uniformly
 * onto the point list, so the line's speed at a point is roughly `gap × (COUNT − 1)`.
 * With 51 points the widest gap here, 0.265, is ~13 units per unit-`t` — inside the
 * continuity budget even after Catmull-Rom's overshoot. Keep every gap under ~0.30 when
 * editing. Dramatic geometry and a smooth curve are not in tension; sparse control points
 * are. Where the line has a long way to travel — the Nine Years run, the sweep back to
 * the left margin — it is subdivided rather than tamed.
 *
 * Section boundaries land exactly on control points (see SECTION_SEGMENTS), so a section
 * always begins and ends at a placed point rather than somewhere inside a segment.
 */
const CONTROL_POINTS: readonly SignalPoint[] = [
  // ── hero ────────────────────────────────────────────────────────────────────────────
  // Enters from deep Z, far from the viewer and just left of centre, then sweeps forward.
  { x: -0.12, y: 0.000, z: -1.00 },
  { x: -0.06, y: 0.016, z: -0.86 },
  { x: 0.04, y: 0.034, z: -0.72 },
  // Banks right as it crosses the headline — the bank is what reads as depth in 3D and as
  // a widening arc in 2D.
  { x: 0.14, y: 0.053, z: -0.56 },
  { x: 0.18, y: 0.073, z: -0.42 },
  // Carves back left on the way out, so the timeline's left end is a continuation of the
  // hero's exit rather than a reversal the curve has to absorb.
  { x: 0.06, y: 0.094, z: -0.29 },
  { x: -0.14, y: 0.116, z: -0.16 },
  { x: -0.38, y: 0.140, z: -0.05 }, // seam: arrives near the picture plane

  // ── years ───────────────────────────────────────────────────────────────────────────
  // Flattens to near-2D and runs horizontally: `x` travels the width of the page while
  // `y` advances at roughly half the rate it does elsewhere, so the run reads flat.
  { x: -0.58, y: 0.161, z: -0.02 },
  { x: -0.68, y: 0.178, z: -0.01 }, // the far left end — where the timeline starts, 2016
  // Evenly spaced from here so emissions tick past at a constant rate across the years.
  { x: -0.46, y: 0.192, z: 0.00 },
  { x: -0.23, y: 0.205, z: 0.00 },
  { x: 0.00, y: 0.218, z: 0.00 },
  { x: 0.23, y: 0.231, z: 0.00 },
  { x: 0.46, y: 0.245, z: 0.00 },
  { x: 0.62, y: 0.260, z: 0.00 }, // seam: the present day, right side of the page

  // ── work ────────────────────────────────────────────────────────────────────────────
  // The longest single move on the curve: right edge back across to the left margin. Five
  // segments spend that distance instead of one, which is the whole reason the sweep can
  // be this dramatic and still stay inside the continuity budget.
  { x: 0.38, y: 0.277, z: 0.00 },
  { x: 0.12, y: 0.296, z: 0.00 },
  { x: -0.14, y: 0.317, z: 0.00 },
  { x: -0.40, y: 0.340, z: 0.00 },
  { x: -0.62, y: 0.365, z: 0.01 },
  // Parked at the left margin, descending steadily — the spine the case studies branch
  // right from. The small outward breaths are where a card attaches.
  { x: -0.72, y: 0.391, z: 0.01 },
  { x: -0.76, y: 0.417, z: 0.02 },
  { x: -0.74, y: 0.443, z: 0.02 },
  { x: -0.77, y: 0.469, z: 0.03 },
  { x: -0.75, y: 0.494, z: 0.04 },
  // Starts leaning toward the viewer as the ring approaches.
  { x: -0.72, y: 0.518, z: 0.06 },
  { x: -0.66, y: 0.540, z: 0.10 }, // seam

  // ── ring ────────────────────────────────────────────────────────────────────────────
  // Comes forward and centres, in one uncluttered arc. The renderer splits this span into
  // five, so it carries no waypoints of its own — every extra wiggle here would fight the
  // split. Note how much slower it moves than the rest: the line dwells through the ring.
  { x: -0.60, y: 0.561, z: 0.14 },
  { x: -0.51, y: 0.582, z: 0.19 },
  { x: -0.40, y: 0.602, z: 0.24 },
  { x: -0.28, y: 0.622, z: 0.29 },
  { x: -0.16, y: 0.642, z: 0.33 },
  { x: -0.06, y: 0.662, z: 0.36 },
  { x: 0.00, y: 0.682, z: 0.37 }, // nearest the viewer on the whole curve
  // Holds centre while the depth falls away, giving the five branches a stable spine.
  { x: 0.03, y: 0.702, z: 0.36 },
  { x: 0.04, y: 0.722, z: 0.33 },
  { x: 0.03, y: 0.742, z: 0.28 },
  { x: 0.02, y: 0.761, z: 0.22 },
  { x: 0.00, y: 0.780, z: 0.16 }, // seam

  // ── stack ───────────────────────────────────────────────────────────────────────────
  // Passes through operator nodes rather than running straight. The first two nodes get a
  // pair of points each — one to arrive, one to dwell — so the transform reads as a
  // deliberate stop instead of a corner the curve happens to round.
  { x: -0.22, y: 0.800, z: 0.13 },
  { x: -0.30, y: 0.820, z: 0.10 }, // first operator, left of centre
  { x: -0.08, y: 0.840, z: 0.08 },
  { x: 0.18, y: 0.860, z: 0.06 },
  { x: 0.24, y: 0.880, z: 0.05 }, // second operator, right of centre
  { x: 0.06, y: 0.900, z: 0.03 },
  { x: -0.14, y: 0.920, z: 0.02 }, // seam: third operator, heading back to centre

  // ── contact ─────────────────────────────────────────────────────────────────────────
  // Settles toward centre and stops. Point spacing tightens all the way to the terminus,
  // so the line decelerates into the completion bar rather than running off the page.
  { x: -0.16, y: 0.940, z: 0.01 },
  { x: -0.10, y: 0.960, z: 0.01 },
  { x: -0.03, y: 0.980, z: 0.00 },
  { x: 0.00, y: 1.000, z: 0.00 }, // terminates dead centre, flat on the picture plane
];

/**
 * How many curve segments each section owns, in page order. Weighted by how much scroll
 * each section actually takes: Selected Work and The Ring are the long ones (four case
 * studies and five ring cards), Contact is short — it is a form and a sign-off.
 *
 * These also drive SECTION_SPANS, so the spans cannot drift away from the control points
 * they are meant to describe. They must sum to CONTROL_POINTS.length - 1.
 */
const SECTION_SEGMENTS: readonly (readonly [SectionId, number])[] = [
  ['hero', 7],
  ['years', 8],
  ['work', 12],
  ['ring', 12],
  ['stack', 7],
  ['contact', 4],
];

const TOTAL_SEGMENTS = CONTROL_POINTS.length - 1;

if (SECTION_SEGMENTS.reduce((sum, [, n]) => sum + n, 0) !== TOTAL_SEGMENTS) {
  // Fail at import rather than letting every section boundary silently slide by one
  // control point the next time someone adds a waypoint.
  throw new Error('signal/path: SECTION_SEGMENTS must sum to CONTROL_POINTS.length - 1');
}

/**
 * Section boundaries as global `t`. Each seam is one number used on both sides, so
 * `SECTION_SPANS[i].tStart` and `SECTION_SPANS[i - 1].tEnd` are the identical double —
 * no float drift at a boundary. First `tStart` is exactly 0, last `tEnd` exactly 1.
 *
 * Resolves to: hero 0–0.14 · years 0.14–0.30 · work 0.30–0.54 · ring 0.54–0.78 ·
 * stack 0.78–0.92 · contact 0.92–1.
 */
const SEAMS: readonly number[] = (() => {
  const seams: number[] = [0];
  let cumulative = 0;
  for (const [, segments] of SECTION_SEGMENTS) {
    cumulative += segments;
    seams.push(cumulative === TOTAL_SEGMENTS ? 1 : cumulative / TOTAL_SEGMENTS);
  }
  return seams;
})();

export const SECTION_SPANS: readonly SectionSpan[] = SECTION_SEGMENTS.map(([id], i) => ({
  id,
  tStart: SEAMS[i],
  tEnd: SEAMS[i + 1],
}));

function clamp01(value: number): number {
  if (!(value > 0)) return 0; // also catches NaN
  if (value > 1) return 1;
  return value;
}

/** Uniform Catmull-Rom on one axis: `b`→`c` over s∈0..1, shaped by neighbours `a` and `d`. */
function catmullRom(a: number, b: number, c: number, d: number, s: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    0.5 *
    (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3)
  );
}

/** Position along the curve at normalised progress t (0..1). Clamps out of range. */
export function sampleSignal(t: number): SignalPoint {
  const scaled = clamp01(t) * TOTAL_SEGMENTS;
  // The final segment has no segment after it, so t === 1 belongs to segment
  // TOTAL_SEGMENTS - 1 at s === 1 rather than to a segment that does not exist.
  const segment = Math.min(Math.floor(scaled), TOTAL_SEGMENTS - 1);
  const s = scaled - segment;

  // At the ends the terminal point stands in for the missing neighbour, which makes the
  // curve leave and arrive along the chord instead of flicking off-screen.
  const p0 = CONTROL_POINTS[Math.max(segment - 1, 0)];
  const p1 = CONTROL_POINTS[segment];
  const p2 = CONTROL_POINTS[segment + 1];
  const p3 = CONTROL_POINTS[Math.min(segment + 2, TOTAL_SEGMENTS)];

  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, s),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, s),
    z: catmullRom(p0.z, p1.z, p2.z, p3.z, s),
  };
}

/** `steps` evenly spaced points between t0 and t1 inclusive. */
export function sampleSignalRange(t0: number, t1: number, steps: number): SignalPoint[] {
  if (steps <= 0) return [];
  if (steps === 1) return [sampleSignal(t0)];

  const points: SignalPoint[] = new Array(steps);
  const divisor = steps - 1;
  for (let i = 0; i < steps; i++) {
    // The endpoints are sampled at the literal t0 and t1. Interpolating to them instead
    // lands a hair off, and callers legitimately compare the ends against sampleSignal.
    const t = i === 0 ? t0 : i === divisor ? t1 : t0 + ((t1 - t0) * i) / divisor;
    points[i] = sampleSignal(t);
  }
  return points;
}

/** Local 0..1 progress within a section, given global progress. Clamps. */
export function sectionProgress(id: SectionId, globalT: number): number {
  const span = SECTION_SPANS.find((s) => s.id === id);
  if (!span) return 0;
  const width = span.tEnd - span.tStart;
  if (width <= 0) return 0;
  return clamp01((globalT - span.tStart) / width);
}

/** Trim float noise so the emitted `d` attribute stays readable and small. */
function round(value: number): number {
  return Number(value.toFixed(3));
}

/**
 * An SVG `d` attribute for the given points, scaled to a viewBox.
 *
 * `z` is dropped: it exists for the Phase 10 tube, which extrudes along the same curve.
 * The path is a plain polyline — sampling density is what makes it smooth, so there is no
 * attempt to refit Bézier control points onto points that already describe the curve.
 */
export function toSvgPath(points: SignalPoint[], width: number, height: number): string {
  if (points.length === 0) return '';
  let d = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    d += `${i === 0 ? 'M' : ' L'}${round(((p.x + 1) / 2) * width)} ${round(p.y * height)}`;
  }
  return d;
}
