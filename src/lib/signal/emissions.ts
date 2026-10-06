/**
 * The emissions bus (Phase 13, spec D1). Each island announces an emission on the frame it
 * lands it, from the paint it already runs, so whoever listens hears it at the moment it is
 * seen. Today only the audio engine listens, and it is loaded only once sound is turned on:
 * until then an announcement returns at once.
 *
 * Pure module: no DOM.
 */

export type EmissionSection = 'years' | 'work' | 'stack' | 'ring' | 'contact';

export interface EmissionEvent {
  section: EmissionSection;
  /** The emission's place within its section, top to bottom (or, in the 3D ring, the card's). */
  index: number;
}

type EmissionListener = (event: EmissionEvent) => void;

const listeners = new Set<EmissionListener>();

export function announceEmission(section: EmissionSection, index: number): void {
  if (listeners.size === 0) return;
  const event: EmissionEvent = { section, index };
  for (const listener of listeners) listener(event);
}

/** Subscribes `listener`; returns the unsubscribe. */
export function onEmission(listener: EmissionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Whether a mark painted at `previous` has just landed at `progress` (spec D2). Down only,
 * and only from a painted state: `-1` is the islands' "not measured yet" sentinel, so a
 * reload or a re-measure that finds the tip already past a mark never announces it.
 */
export function hasArrived(previous: number, progress: number): boolean {
  const wasPaintedShort = previous >= 0 && previous < 1;
  return wasPaintedShort && progress >= 1;
}
