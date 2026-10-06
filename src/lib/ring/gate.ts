/**
 * Whether section 04 loads the 3D ring (revision R4) — its own gate, independent of the WebGL
 * tube's: a machine that fails the tube's still gets the ring. In section 04's script, before
 * the ring's chunk is imported, so it stays this small. Whether the ring fits the window is the
 * stage's own check (`mountRingStage`): it needs a card's measured size.
 *
 * Deliberately imports nothing from `gfx/gate.ts`: two entry scripts sharing it made Vite split
 * it, with its preload helper, into a shared chunk of its own on every page (+689 B gzip base,
 * Phase 12 Task 11). The width and the `?signal=2d` check are duplicated instead, and a test
 * pins the width to the tube's.
 *
 * Pure: the caller reads the window.
 */

/** The tube's `MIN_VIEWPORT_WIDTH`, duplicated (see above); tests/ring-gate.test.ts keeps them equal. */
export const RING_MIN_VIEWPORT_WIDTH = 900;

export function canTurnRing({
  viewportWidth,
  reducedMotion,
  search,
}: {
  viewportWidth: number;
  reducedMotion: boolean;
  /** `location.search`: `?signal=2d` keeps the rail, so the fallback stays reachable. */
  search: string;
}): boolean {
  const isForced2d = new URLSearchParams(search).get('signal') === '2d';
  return viewportWidth >= RING_MIN_VIEWPORT_WIDTH && !reducedMotion && !isForced2d;
}
