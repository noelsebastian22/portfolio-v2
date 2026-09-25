/**
 * The four diagrams laid out in SVG user units — the one place their pixel geometry is
 * written down. `SelectedWork.astro` calls these at progress 1 to server-render the end
 * state; `src/islands/work.ts` calls the same functions every scroll tick to scrub from
 * progress 0 to 1. Because both read this module, the state JavaScript lands on at
 * progress 1 is byte-for-byte the state the HTML shipped with.
 *
 * The data geometry itself (what 100 → 40 means, where five repos converge) stays in
 * `bundle.ts` and `repos.ts`; this module only places it in a box. The scatter's cells are
 * built at build time only and live in `scatter-figure.ts`, so the island never pulls in
 * a million-point generator.
 *
 * Pure module: no DOM.
 */

import { bundleBarAt } from './bundle';
import { deployBarAt, repoLinePointAt, reposLines, type Point } from './repos';
import type { BundleDiagramData, ReposDiagramData } from './types';

/** Every diagram shares one viewBox, so the four figures read as one system. */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 200;

/** Left and right edge of every horizontal bar and plot. */
export const PLOT_LEFT = 16;
export const PLOT_RIGHT = 304;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;

/** Trim float noise so attributes stay short in the HTML. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Winning Group: one bar ─────────────────────────────────────────────────────────────

export const BUNDLE_BAR = { y: 88, height: 40 } as const;

export interface BundleFrame {
  /** Width of the filled bar in user units. */
  width: number;
  /** Where the bar ends — the value label is anchored here. */
  endX: number;
  /** The label, e.g. `40%`. */
  label: string;
}

export function bundleFrame(data: BundleDiagramData, progress: number): BundleFrame {
  const state = bundleBarAt(data, progress);
  const width = round2(PLOT_WIDTH * state.heightFraction);
  return { width, endX: round2(PLOT_LEFT + width), label: `${state.percent}%` };
}

// ── Direct Line Group: five repos converging, and a deploy bar at true scale ──────────

/** The repo lines occupy the top of the box; the deploy bar sits under them. */
const REPO_AREA = { left: 40, right: 280, top: 30, bottom: 104 } as const;
export const DEPLOY_BAR = { y: 150, height: 16 } as const;

export function repoPoint(point: Point): Point {
  return {
    x: round2(REPO_AREA.left + point.x * (REPO_AREA.right - REPO_AREA.left)),
    y: round2(REPO_AREA.top + point.y * (REPO_AREA.bottom - REPO_AREA.top)),
  };
}

export interface RepoSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** One segment per repo, from its start to where it has travelled at `progress`. */
export function repoSegments(data: ReposDiagramData, progress: number): RepoSegment[] {
  return reposLines(data).map((line) => {
    const from = repoPoint(line.start);
    const to = repoPoint(repoLinePointAt(line, progress));
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  });
}

/** Where every line ends — the single state tree. */
export function repoConvergePoint(data: ReposDiagramData): Point {
  return repoPoint(reposLines(data)[0].end);
}

export interface DeployFrame {
  width: number;
  endX: number;
  label: string;
}

export function deployFrame(data: ReposDiagramData, progress: number): DeployFrame {
  const state = deployBarAt(data, progress);
  const width = round2(PLOT_WIDTH * state.lengthFraction);
  return { width, endX: round2(PLOT_LEFT + width), label: `${state.minutes} min` };
}

// ── SRT Marine: the frame-time trace ──────────────────────────────────────────────────

/** Zero milliseconds sits on this line; the budget sits halfway up the plot. */
export const FRAME_BASELINE_Y = 176;
const FRAME_PLOT_TOP = 36;

/**
 * The plot's vertical scale runs from 0 to twice the frame budget, so the budget line is
 * its midline. The scale is a layout choice and carries no label of its own: the only
 * value on the axis is the one the resume attests.
 */
export function frameTimeY(ms: number, frameTimeMs: number): number {
  const fraction = ms / (2 * frameTimeMs);
  return round2(FRAME_BASELINE_Y - fraction * (FRAME_BASELINE_Y - FRAME_PLOT_TOP));
}

// ── Motion easing — spec §7.4 ──────────────────────────────────────────────────────────

// Defined with the rest of the draw-off-the-line helpers, which the ring's split shares
// with these diagrams; re-exported so the diagrams keep one import.
export { easeEmission, easeLine, unit } from '../signal/draw';
