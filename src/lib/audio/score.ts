/**
 * The score (Phase 13, spec D3, D5, D7): which notes an emission plays, how scroll speed
 * becomes filter cutoff, and when a requested note may sound. Everything that can be wrong
 * without hearing it lives here, so it is tested; `engine.ts` only makes the sounds.
 *
 * Pure module: no DOM, no Web Audio.
 */

import type { EmissionEvent, EmissionSection } from '../signal/emissions';

/** A minor pentatonic, A3 → G5: it cannot clash in any order, and minor does not read cheerful. */
export const SCALE_HZ: readonly number[] = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.26, 783.99];

/** The final emission: A2 under A3 — the phrase comes home. */
export const RESOLVE_HZ: readonly number[] = [110, 220];

/** Where each section's climb starts, in scale degrees; later sections start higher, as the career does. */
const START_DEGREE: Record<Exclude<EmissionSection, 'contact'>, number> = {
  years: 0,
  work: 2,
  stack: 4,
  ring: 5,
};

export function notesFor(event: EmissionEvent): readonly number[] {
  if (event.section === 'contact') return RESOLVE_HZ;
  const top = SCALE_HZ.length - 1;
  const degree = Math.min(top, Math.max(0, START_DEGREE[event.section] + Math.floor(event.index)));
  return [SCALE_HZ[degree]];
}

export const CUTOFF_MIN_HZ = 450;
export const CUTOFF_MAX_HZ = 2800;

/** Velocity 0..1 → lowpass cutoff, exponentially, because pitch is heard as a ratio. */
export function cutoffFor(velocity: number): number {
  const v = Math.min(1, Math.max(0, velocity));
  return CUTOFF_MIN_HZ * (CUTOFF_MAX_HZ / CUTOFF_MIN_HZ) ** v;
}

/** Scroll speed at which the mix is fully open. */
export const FULL_SPEED_PX_PER_S = 3000;

export function normaliseSpeed(pxPerSecond: number): number {
  if (!Number.isFinite(pxPerSecond)) return 0;
  return Math.min(1, Math.abs(pxPerSecond) / FULL_SPEED_PX_PER_S);
}

/** One emission cannot repeat inside this — a jittery trackpad cannot machine-gun a note. */
export const COOLDOWN_S = 0.15;
/** The closest two notes may sound: a jump through the page is a run, not a cluster. */
export const SPACING_S = 0.07;
/** A note later than this behind its request is dropped rather than heard out of place. */
export const MAX_LATE_S = 0.35;

/**
 * `schedule(key, now)` → the audio-clock time the note should start, or `null` to skip it.
 * `key` identifies the emission (`section:index`); `now` is `AudioContext.currentTime`.
 */
export function createNoteGate(): { schedule(key: string, now: number): number | null } {
  const lastRequestByKey = new Map<string, number>();
  let nextSlot = Number.NEGATIVE_INFINITY;

  return {
    schedule(key, now) {
      const last = lastRequestByKey.get(key);
      const isCoolingDown = last !== undefined && now - last < COOLDOWN_S;
      if (isCoolingDown) return null;
      const startAt = Math.max(now, nextSlot);
      if (startAt - now > MAX_LATE_S) return null;
      lastRequestByKey.set(key, now);
      nextSlot = startAt + SPACING_S;
      return startAt;
    },
  };
}
