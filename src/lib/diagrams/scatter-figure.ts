/**
 * The QBurst scatter as SVG paths, built at build time only. One `<path>` per density
 * level, each a run of rectangle subpaths — one per non-empty cell — so a 48×48 grid costs
 * four elements rather than two thousand.
 *
 * Kept apart from `figure.ts` on purpose: that module ships to the browser, and this one
 * imports the million-point generator.
 */

import { PLOT_LEFT, PLOT_RIGHT, VIEW_HEIGHT, round2 } from './figure';
import { LEVEL_COUNT, type DensityGrid } from './scatter';

const PLOT_TOP = 8;
const PLOT_BOTTOM = VIEW_HEIGHT - 8;

export interface LevelPath {
  /** 1..LEVEL_COUNT−1; level 0 is empty and is never drawn. */
  level: number;
  d: string;
}

export function gridPaths(grid: DensityGrid): LevelPath[] {
  const cellWidth = (PLOT_RIGHT - PLOT_LEFT) / grid.cols;
  const cellHeight = (PLOT_BOTTOM - PLOT_TOP) / grid.rows;
  const byLevel: string[] = new Array(LEVEL_COUNT).fill('');

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const level = grid.levels[row * grid.cols + col];
      if (level === 0) continue;
      const x = round2(PLOT_LEFT + col * cellWidth);
      const y = round2(PLOT_TOP + row * cellHeight);
      byLevel[level] += `M${x} ${y}h${round2(cellWidth)}v${round2(cellHeight)}h${round2(-cellWidth)}z`;
    }
  }

  return byLevel
    .map((d, level) => ({ level, d }))
    .filter((path) => path.level > 0 && path.d.length > 0);
}
