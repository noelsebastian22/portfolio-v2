/**
 * When the tube draws: on the scroll driver's own tick, and only if something changed.
 *
 * Every change source — a scroll, a tip move, a re-measure, a resize — only marks the scene
 * dirty. One tick listener draws it, in the same tick. Booking a fresh `requestAnimationFrame`
 * from inside the ticker (itself a rAF callback) can only fire next frame, and drew every
 * other frame under Lenis; the watchdog read that as a slow GPU and retired the tube on any
 * 60Hz display (Phase 10 final review, C1).
 *
 * Not a render loop: a clean tick returns at once and draws nothing (design D6).
 *
 * Pure — the scene injects the ticker and its clock, so the scheduling is testable without a
 * browser.
 */

export interface RenderScheduleOptions {
  /** Runs `onTick` once per frame, after the scroll driver; returns an unsubscribe. */
  subscribe(onTick: () => void): () => void;
  /** The current tick's time, in milliseconds. */
  now(): number;
  /** Draws. `sinceLastDrawMs` is the interval since the previous draw, `null` for the first. */
  draw(sinceLastDrawMs: number | null): void;
}

export interface RenderSchedule {
  /** Something changed: draw on this tick, if it has not reached the listener yet, or the next. */
  markDirty(): void;
  stop(): void;
}

export function createRenderSchedule({ subscribe, now, draw }: RenderScheduleOptions): RenderSchedule {
  let isDirty = false;
  let lastDrawAt: number | null = null;

  const unsubscribe = subscribe(() => {
    if (!isDirty) return;
    isDirty = false;
    const drawnAt = now();
    const sinceLastDrawMs = lastDrawAt === null ? null : drawnAt - lastDrawAt;
    lastDrawAt = drawnAt;
    draw(sinceLastDrawMs);
  });

  return {
    markDirty() {
      isDirty = true;
    },
    stop: unsubscribe,
  };
}
