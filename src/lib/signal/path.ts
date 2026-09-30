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
 * Hand-placed control points, sampled with a uniform Catmull-Rom spline (held straight
 * along the spine — see `TANGENTS`). Catmull-Rom because it passes *through* its control
 * points: moving a point moves the curve to exactly where you put it, so the line can be
 * tuned by reading the table.
 *
 * Spacing is the design constraint, not just the positions. Sampling maps `t` uniformly
 * onto the point list, so the line's speed at a point is roughly `gap × (COUNT − 1)`.
 * With 51 points the widest gap here, 0.281, is ~14 units per unit-`t` — inside the
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
  //
  // Both ends are hairpins, and a hairpin's radius on the page grows with how far `y`
  // travels while `x` turns round. So `y` is spent at the ends — bigger gaps into and out
  // of each turn — and saved in the middle of the run, where the line is straight anyway.
  { x: -0.56, y: 0.162, z: -0.02 },
  { x: -0.64, y: 0.182, z: -0.01 }, // the far left end — where the timeline starts, 2016
  // Evenly spaced from here so emissions tick past at a constant rate across the years.
  { x: -0.54, y: 0.199, z: 0.00 },
  { x: -0.30, y: 0.210, z: 0.00 },
  { x: -0.05, y: 0.220, z: 0.00 },
  { x: 0.21, y: 0.229, z: 0.00 },
  { x: 0.47, y: 0.241, z: 0.00 },
  // Brakes into the corner rather than running at it: the turn back left starts here.
  { x: 0.55, y: 0.260, z: 0.00 }, // seam: the present day, right side of the page

  // ── work ────────────────────────────────────────────────────────────────────────────
  // The longest single move on the curve: right edge back across to the left margin. Five
  // segments spend that distance instead of one, which is the whole reason the sweep can
  // be this dramatic and still stay inside the continuity budget. The first two gaps are
  // deep in `y` to finish the turn at the present-day seam: the renderer squeezes this
  // whole sweep into the section's head (anchors.ts), so every bit of drop counts there.
  { x: 0.43, y: 0.290, z: 0.00 },
  { x: 0.16, y: 0.311, z: 0.00 },
  { x: -0.12, y: 0.321, z: 0.00 },
  { x: -0.40, y: 0.340, z: 0.00 },
  { x: -0.62, y: 0.365, z: 0.01 },
  // Parked at the left margin, descending dead straight — the spine the case studies
  // branch right from. One `x` from here to the spine's last point (see `TANGENTS`).
  { x: -0.74, y: 0.391, z: 0.01 },
  { x: -0.74, y: 0.417, z: 0.02 },
  { x: -0.74, y: 0.443, z: 0.02 },
  { x: -0.74, y: 0.469, z: 0.03 },
  { x: -0.74, y: 0.494, z: 0.04 },
  // Starts leaning toward the viewer as the ring approaches.
  { x: -0.74, y: 0.518, z: 0.06 },
  // The spine leaves with no sideways speed, so the steps right have to grow from here —
  // 0.03, 0.09, 0.11. A bigger first step than second makes the line surge off the spine,
  // ease off and turn back before the arc takes it.
  { x: -0.71, y: 0.540, z: 0.10 }, // seam

  // ── ring ────────────────────────────────────────────────────────────────────────────
  // Comes forward and centres, in one uncluttered arc. The renderer splits this span into
  // five, so it carries no waypoints of its own — every extra wiggle here would fight the
  // split. Note how much slower it moves than the rest: the line dwells through the ring.
  { x: -0.62, y: 0.561, z: 0.14 },
  { x: -0.51, y: 0.582, z: 0.19 },
  { x: -0.40, y: 0.602, z: 0.24 },
  { x: -0.28, y: 0.622, z: 0.29 },
  { x: -0.16, y: 0.642, z: 0.33 },
  { x: -0.06, y: 0.662, z: 0.36 },
  { x: 0.00, y: 0.682, z: 0.37 }, // nearest the viewer on the whole curve
  // Holds centre while the depth falls away, giving the five branches a stable spine, then
  // leans into the stack's first operator in growing steps — 0.01, 0.02, 0.05, 0.14. A
  // drift right and back here, then the whole lean in one step at the seam, drew a kink.
  { x: 0.00, y: 0.702, z: 0.36 },
  { x: 0.00, y: 0.722, z: 0.33 },
  { x: -0.01, y: 0.742, z: 0.28 },
  { x: -0.03, y: 0.761, z: 0.22 },
  { x: -0.08, y: 0.780, z: 0.16 }, // seam

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

/**
 * The `work` section's spine: the run parked at the left margin that the case studies
 * branch right from — control points 21 through 26. Metadata about the curve, not more
 * curve: it names a range of `t` that lands exactly on those control points, the same way
 * the seams do. Adding a waypoint before point 21 means updating these two indices.
 *
 * `--signal-gutter` is derived from the rightmost `x` in this range (see tokens.css, and
 * the test that holds the two together).
 */
export const SPINE_FIRST_POINT = 21;
export const SPINE_LAST_POINT = 26;

/**
 * Global `t` of a control point. Sampling maps `t` uniformly onto the point list, so a
 * control point sits at exactly `index / segments` — the same rule the seams follow.
 */
export function controlPointT(index: number): number {
  return index / TOTAL_SEGMENTS;
}

export const SPINE_SPAN: Readonly<{ tStart: number; tEnd: number }> = {
  tStart: controlPointT(SPINE_FIRST_POINT),
  tEnd: controlPointT(SPINE_LAST_POINT),
};

/**
 * The ring's split point: control point 34, where the `ring` span's arc reaches the centre
 * (`x` 0) and the curve is nearest the viewer. §6 has the line split into five at the ring,
 * and this is where: the 2D rail's track is pinned to it (anchors.ts), and the Phase 12
 * ring hangs off the same point. Naming, like `SPINE_SPAN`, not more curve — adding a
 * waypoint before point 34 means updating this index. tests/signal-anchors.test.ts holds
 * it to `x` 0 and the curve's maximum `z`.
 */
export const RING_SPLIT_POINT = 34;

function clamp01(value: number): number {
  if (!(value > 0)) return 0; // also catches NaN
  if (value > 1) return 1;
  return value;
}

/**
 * The curve's tangent at every control point, per unit of segment progress. Catmull-Rom's
 * own, `(next − previous) / 2`, with the terminal point standing in for the missing
 * neighbour at either end — which makes the curve leave and arrive along the chord instead
 * of flicking off-screen.
 *
 * One exception: the spine. Its points share one `x`, but Catmull-Rom takes the tangent at
 * its ends from the sweep arriving and the lean toward the ring, both of which move in
 * `x`, and would bow the first and last spine segments. The `x` tangent there is zero
 * instead, so the spine is straight end to end and the segments either side of it still
 * meet it with a continuous tangent.
 */
const TANGENTS: readonly SignalPoint[] = CONTROL_POINTS.map((_, i) => {
  const previous = CONTROL_POINTS[Math.max(i - 1, 0)];
  const next = CONTROL_POINTS[Math.min(i + 1, TOTAL_SEGMENTS)];
  const isSpineEnd = i === SPINE_FIRST_POINT || i === SPINE_LAST_POINT;
  return {
    x: isSpineEnd ? 0 : (next.x - previous.x) / 2,
    y: (next.y - previous.y) / 2,
    z: (next.z - previous.z) / 2,
  };
});

/**
 * Cubic Hermite on one axis: `b`→`c` over s∈0..1, leaving `b` along `mb` and arriving at
 * `c` along `mc`. With `TANGENTS` this is exactly uniform Catmull-Rom everywhere off the
 * spine. Written as an offset from `b` so a segment whose ends and tangents agree on an
 * axis — the spine's `x` — returns that value exactly rather than to within rounding.
 */
function hermite(b: number, c: number, mb: number, mc: number, s: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  return b + (c - b) * (3 * s2 - 2 * s3) + (s3 - 2 * s2 + s) * mb + (s3 - s2) * mc;
}

/** Position along the curve at normalised progress t (0..1). Clamps out of range. */
export function sampleSignal(t: number): SignalPoint {
  const scaled = clamp01(t) * TOTAL_SEGMENTS;
  // The final segment has no segment after it, so t === 1 belongs to segment
  // TOTAL_SEGMENTS - 1 at s === 1 rather than to a segment that does not exist.
  const segment = Math.min(Math.floor(scaled), TOTAL_SEGMENTS - 1);
  const s = scaled - segment;

  const b = CONTROL_POINTS[segment];
  const c = CONTROL_POINTS[segment + 1];
  const mb = TANGENTS[segment];
  const mc = TANGENTS[segment + 1];

  return {
    x: hermite(b.x, c.x, mb.x, mc.x, s),
    y: hermite(b.y, c.y, mb.y, mc.y, s),
    z: hermite(b.z, c.z, mb.z, mc.z, s),
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
