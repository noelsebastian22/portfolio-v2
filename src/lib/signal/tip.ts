/**
 * Where the signal's drawn tip is, for anything that wants to follow it — Task 6.3's
 * branches start from it. A module-level channel rather than a method on the renderer, so
 * a section island can read it without being handed the renderer: `BaseLayout` creates
 * that, and islands only import modules. Vite emits this once as a shared chunk, so every
 * importer sees the same state.
 *
 * Values are **page** `y` (document coordinates, comparable with
 * `getBoundingClientRect().top + scrollY`). No DOM, no timers.
 */

type TipListener = (pageY: number) => void;

let currentTip: number | null = null;
const listeners = new Set<TipListener>();

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
