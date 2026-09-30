/**
 * Where the signal is, for anything that wants to follow it — Task 6.3's branches start
 * from it. A module-level channel rather than a method on the renderer, so a section
 * island can read it without being handed the renderer: `BaseLayout` creates that, and
 * islands only import modules. Vite emits this once as a shared chunk, so every importer
 * sees the same state.
 *
 * Three things are published, all by the renderer only:
 *
 * - the drawn **tip**, which moves with scroll;
 * - the **curve lookup** — the curve's page `x` at a page `y` — which changes only when
 *   the renderer re-measures (a resize, or the document changing height);
 * - the **geometry** — the line's points, lengths and dim-rule strength, for the Phase 10
 *   tube, which paints over the SVG instead of measuring anything itself.
 *
 * Every value is in **page** coordinates (document coordinates, comparable with
 * `getBoundingClientRect().top + scrollY`). The conversion from the layer's own box happens
 * once, in the renderer (`pageCurveLookup` in `anchors.ts`), so no island ever re-samples
 * the curve or re-measures a section anchor: that would be a second copy of the mapping.
 * No DOM, no timers.
 */

type TipListener = (pageY: number) => void;

/** The curve's page `x` at page height `y`, or `null` above or below the drawn line. */
export type CurveLookup = (pageY: number) => number | null;

let currentTip: number | null = null;
const listeners = new Set<TipListener>();

let currentLookup: CurveLookup | null = null;
const curveListeners = new Set<() => void>();

/** The tip's page `y`, or `null` before the renderer has drawn. */
export function signalTipY(): number | null {
  return currentTip;
}

/**
 * Calls `fn` with the tip's page `y` every time it moves, and once immediately if it is
 * already known. Returns an unsubscribe.
 */
export function onSignalTip(fn: TipListener): () => void {
  listeners.add(fn);
  if (currentTip !== null) fn(currentTip);
  return () => {
    listeners.delete(fn);
  };
}

/** Renderer-only: publishes a new tip position. Unchanged values are not re-sent. */
export function publishSignalTip(pageY: number): void {
  if (!Number.isFinite(pageY) || pageY === currentTip) return;
  currentTip = pageY;
  for (const fn of listeners) fn(pageY);
}

/**
 * The drawn curve's page `x` at page `y`, read off the same pixel points the line is drawn
 * from. `null` before the renderer has measured, or outside the line's vertical extent.
 */
export function signalXAtPageY(pageY: number): number | null {
  return currentLookup ? currentLookup(pageY) : null;
}

/**
 * Calls `fn` every time the renderer re-measures the curve (after which `signalXAtPageY`
 * answers differently), and once immediately if it already has. Returns an unsubscribe.
 */
export function onSignalCurve(fn: () => void): () => void {
  curveListeners.add(fn);
  if (currentLookup !== null) fn();
  return () => {
    curveListeners.delete(fn);
  };
}

/** Renderer-only: publishes the lookup for the curve as it has just been drawn. */
export function publishSignalCurve(lookup: CurveLookup): void {
  currentLookup = lookup;
  for (const fn of curveListeners) fn();
}

/** One drawn point, in page px, with the curve's own `z` and normalised `y` beside it. */
export interface SignalGeometryPoint {
  x: number;
  y: number;
  z: number;
  curveY: number;
}

/**
 * The line exactly as the SVG renderer has just drawn it — so a second renderer paints the
 * same points rather than re-sampling `path.ts` or re-measuring the sections.
 */
export interface SignalGeometry {
  points: readonly SignalGeometryPoint[];
  /** Cumulative length along the line at each point, px. */
  lengths: readonly number[];
  /** The dim rule per point: 0 dim … 1 full strength, from the same stops as the gradient. */
  strength: readonly number[];
}

let currentGeometry: SignalGeometry | null = null;
const geometryListeners = new Set<(geometry: SignalGeometry) => void>();

/** The latest geometry, or `null` before the renderer has measured. */
export function signalGeometry(): SignalGeometry | null {
  return currentGeometry;
}

/**
 * Calls `fn` with every new geometry, and once immediately with the latest — the tube loads
 * long after the first measure, and must not wait for a resize to see the line.
 */
export function onSignalGeometry(fn: (geometry: SignalGeometry) => void): () => void {
  geometryListeners.add(fn);
  if (currentGeometry !== null) fn(currentGeometry);
  return () => {
    geometryListeners.delete(fn);
  };
}

/** Renderer-only: publishes the geometry it has just drawn. */
export function publishSignalGeometry(geometry: SignalGeometry): void {
  currentGeometry = geometry;
  for (const fn of geometryListeners) fn(geometry);
}
