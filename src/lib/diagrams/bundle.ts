/**
 * Winning Group — one bar collapsing from the pre-migration bundle size to the
 * post-migration size.
 *
 * §9.03 also calls for "an Nx dependency graph resolving" beside this bar. Dropped: the
 * resume gives that graph no node or edge count, and any count would be invented (the
 * 2026-09-25 BUILD-PLAN decision, "§9.03's Nx dependency graph is dropped"). This module
 * draws only the bar.
 *
 * Pure geometry, no DOM. `heightFraction` is 0..1, the bar's height as a fraction of the
 * diagram's full height; Task 6.3 scales it to pixels.
 */

import type { BundleDiagramData } from './types';
import { clamp01, lerp } from './util';

/**
 * The bar's height is always measured against its own 100% starting point — that baseline
 * is arithmetic, not a resume claim, so it is a constant here rather than a `content.ts`
 * literal that the honesty test would have to justify.
 */
const BASELINE_PERCENT = 100;

export interface BundleBarState {
  /** 0..1 — fraction of the diagram's full height the bar should be drawn at. */
  heightFraction: number;
  /** The percentage to label the bar with, rounded to the nearest whole percent. */
  percent: number;
}

/**
 * The bar's state at scroll progress 0..1. A single lerp between two resume-derived
 * endpoints, cheap enough to call every animation frame — Task 6.3 needs no cached start/end
 * pair and no recomputation, just this function and the current progress.
 */
export function bundleBarAt(data: BundleDiagramData, progress: number): BundleBarState {
  const t = clamp01(progress);
  const endPercent = BASELINE_PERCENT - data.reductionPercent;
  const percent = lerp(BASELINE_PERCENT, endPercent, t);
  return {
    heightFraction: percent / 100,
    percent: Math.round(percent),
  };
}
