/**
 * The portrait gets softer before it gets dropped (Phase 11 design D11). The Phase 10 frame
 * watch decides "too slow"; each time it trips, the face thins to the next count and a fresh
 * watch judges the new one. Only the last tier's trip hands the page back to the 2D line.
 *
 * The sampler's output is a fair sample in any prefix (portrait-sample.ts), so a smaller count
 * is `setDrawRange(0, count)` — an even thinning of the same face, not a crop.
 *
 * Pure.
 */

import { createFrameWatch, type FrameWatch } from './frame';

export const PORTRAIT_COUNTS = [40_000, 20_000, 10_000] as const;

export type TierVerdict = 'hold' | 'step' | 'fallBack';

export interface PortraitTiers {
  readonly count: number;
  /** One drawn frame's interval. `step` means `count` just changed. */
  push(intervalMs: number): TierVerdict;
}

export function createPortraitTiers(createWatch: () => FrameWatch = createFrameWatch): PortraitTiers {
  let tier = 0;
  let watch = createWatch();
  return {
    get count() {
      return PORTRAIT_COUNTS[tier];
    },
    push(intervalMs) {
      if (!watch.push(intervalMs)) return 'hold';
      const isLastTier = tier === PORTRAIT_COUNTS.length - 1;
      if (isLastTier) return 'fallBack';
      tier++;
      watch = createWatch();
      return 'step';
    },
  };
}
