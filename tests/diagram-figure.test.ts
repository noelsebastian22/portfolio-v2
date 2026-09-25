import { describe, it, expect } from 'vitest';
import { caseStudies } from '../src/data/content';
import {
  PLOT_LEFT,
  PLOT_RIGHT,
  bundleFrame,
  deployFrame,
  easeEmission,
  easeLine,
  repoConvergePoint,
  repoSegments,
  unit,
} from '../src/lib/diagrams/figure';
import { gridPaths } from '../src/lib/diagrams/scatter-figure';
import { scatterGeometry } from '../src/lib/diagrams/scatter';
import type { BundleDiagramData, ReposDiagramData, ScatterDiagramData } from '../src/lib/diagrams/types';

const byKind = <K extends string>(kind: K) => caseStudies.find((s) => s.diagram.kind === kind)!.diagram;
const bundle = byKind('bundle') as BundleDiagramData;
const repos = byKind('repos') as ReposDiagramData;
const scatter = byKind('scatter') as ScatterDiagramData;
const plotWidth = PLOT_RIGHT - PLOT_LEFT;

describe('bundle bar', () => {
  it('starts full width at 100% and ends at the resume figure, labelled from the data', () => {
    expect(bundleFrame(bundle, 0)).toMatchObject({ width: plotWidth, label: '100%' });
    const end = bundleFrame(bundle, 1);
    expect(end.width).toBeCloseTo(plotWidth * (100 - bundle.reductionPercent) / 100, 2);
    expect(end.label).toBe(`${100 - bundle.reductionPercent}%`);
  });
});

describe('repos', () => {
  it('draws one segment per repo, all meeting at the converge point at progress 1', () => {
    const end = repoSegments(repos, 1);
    expect(end).toHaveLength(repos.repoCount);
    const meet = repoConvergePoint(repos);
    for (const s of end) expect([s.x2, s.y2]).toEqual([meet.x, meet.y]);
  });

  it('starts every segment at zero length', () => {
    for (const s of repoSegments(repos, 0)) expect([s.x2, s.y2]).toEqual([s.x1, s.y1]);
  });

  it('keeps the deploy bar at true scale: end is exactly end/start of the start width', () => {
    const start = deployFrame(repos, 0);
    const end = deployFrame(repos, 1);
    expect(start.width).toBe(plotWidth);
    expect(end.width / start.width).toBeCloseTo(repos.deployEndMinutes / repos.deployStartMinutes, 3);
    expect(end.label).toBe(`${repos.deployEndMinutes} min`);
  });
});

describe('easing — applied to progress, never a duration', () => {
  it('the line ease runs 0 → 1, monotonic, and clamps', () => {
    expect(easeLine(0)).toBe(0);
    expect(easeLine(1)).toBe(1);
    expect(easeLine(-1)).toBe(0);
    expect(easeLine(Number.NaN)).toBe(0);
    let previous = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      expect(easeLine(t)).toBeGreaterThanOrEqual(previous);
      previous = easeLine(t);
    }
  });

  it('the emission ease overshoots slightly and settles on 1', () => {
    expect(easeEmission(0)).toBeCloseTo(0, 12);
    expect(easeEmission(1)).toBe(1);
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.001) peak = Math.max(peak, easeEmission(t));
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.1);
  });

  it('unit clamps', () => {
    expect([unit(-2), unit(0.5), unit(3)]).toEqual([0, 0.5, 1]);
  });
});

describe('scatter paths', () => {
  it('emits one path per non-empty density level, coarse and fine alike', () => {
    const geometry = scatterGeometry(scatter);
    for (const grid of [geometry.coarse, geometry.fine]) {
      const paths = gridPaths(grid);
      const levels = new Set(grid.levels.filter((l) => l > 0));
      expect(paths.map((p) => p.level).sort()).toEqual([...levels].sort());
      const cells = paths.reduce((n, p) => n + (p.d.match(/M/g)?.length ?? 0), 0);
      expect(cells).toBe(grid.levels.filter((l) => l > 0).length);
    }
  });
});
