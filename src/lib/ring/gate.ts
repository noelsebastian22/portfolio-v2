/**
 * Whether section 04 loads the 3D ring (revision R4) — its own gate, independent of the WebGL
 * tube's: a machine that fails the tube's still gets the ring. In section 04's script, before
 * the ring's chunk is imported, so it stays this small. Whether the ring fits the window is the
 * stage's own check (`mountRingStage`): it needs a card's measured size.
 *
 * Pure: the caller reads the window.
 */

import { MIN_VIEWPORT_WIDTH, type SignalMode } from '../gfx/gate';

export function canTurnRing({
  viewportWidth,
  reducedMotion,
  mode,
}: {
  viewportWidth: number;
  reducedMotion: boolean;
  /** `forcedMode(location.search)`: `?signal=2d` keeps the rail, so the fallback stays reachable. */
  mode: SignalMode;
}): boolean {
  return viewportWidth >= MIN_VIEWPORT_WIDTH && !reducedMotion && mode !== '2d';
}
