/**
 * Direct Line Group — two shapes sharing one diagram.
 *
 * 1. Five lines, one per repository, converging into a single point: the resume says
 *    "5+ Angular repositories" — 5 is a stated lower bound, so five lines are drawn and
 *    carry the label `5+` rather than a bare `5`.
 * 2. A deploy-time bar shrinking from 45 to 12 minutes, at true scale: the end bar is drawn
 *    at exactly 12/45 of the start bar's length, never eyeballed shorter.
 *
 * Pure geometry, no DOM. Coordinates are normalised, 0..1 in both axes.
 */

import type { ReposDiagramData } from './types';
import { clamp01, lerp } from './util';

export interface Point {
  x: number;
  y: number;
}

export interface RepoLine {
  /** Where this repo's line starts, spread across the top of the diagram. */
  start: Point;
  /** Where it ends — identical for every line, the converged state tree. */
  end: Point;
}

/** Every line converges here. Bottom-centre: the single state tree the five repos feed. */
const CONVERGE_POINT: Point = { x: 0.5, y: 1 };

/**
 * One line per repository, evenly spread across the top edge, all converging on the same
 * point. Static — Task 6.3 animates convergence with `repoLinePointAt`, not by regenerating
 * this list.
 */
export function reposLines(data: ReposDiagramData): RepoLine[] {
  const n = data.repoCount;
  const lines: RepoLine[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // n === 1 would divide by zero; not a real case here (n is always 5) but centres
    // cleanly rather than throwing if the data ever changes.
    const x = n === 1 ? 0.5 : i / (n - 1);
    lines[i] = { start: { x, y: 0 }, end: { ...CONVERGE_POINT } };
  }
  return lines;
}

/** A repo line's position at scroll progress 0..1 — 0 is its spread start, 1 is the converged point. */
export function repoLinePointAt(line: RepoLine, progress: number): Point {
  const t = clamp01(progress);
  return {
    x: lerp(line.start.x, line.end.x, t),
    y: lerp(line.start.y, line.end.y, t),
  };
}

export interface DeployBarState {
  /** The bar's length as a fraction of its progress-0 length. True scale: 12/45 at progress 1, not eyeballed. */
  lengthFraction: number;
  /** Minutes to label the bar with, rounded to the nearest whole minute. */
  minutes: number;
}

/** The deploy bar's state at scroll progress 0..1. */
export function deployBarAt(data: ReposDiagramData, progress: number): DeployBarState {
  const t = clamp01(progress);
  const minutes = lerp(data.deployStartMinutes, data.deployEndMinutes, t);
  return {
    lengthFraction: minutes / data.deployStartMinutes,
    minutes: Math.round(minutes),
  };
}
