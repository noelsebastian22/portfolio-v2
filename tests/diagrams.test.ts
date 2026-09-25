import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { caseStudies } from '../src/data/content';
import { bundleBarAt } from '../src/lib/diagrams/bundle';
import { reposLines, repoLinePointAt, deployBarAt } from '../src/lib/diagrams/repos';
import { frametimeGeometry } from '../src/lib/diagrams/frametime';
import { scatterGeometry, LEVEL_COUNT } from '../src/lib/diagrams/scatter';
import { mulberry32 } from '../src/lib/diagrams/prng';
import type {
  BundleDiagramData,
  ReposDiagramData,
  FrametimeDiagramData,
  ScatterDiagramData,
} from '../src/lib/diagrams/types';

function diagramOf(name: string) {
  const study = caseStudies.find((s) => s.name === name);
  if (!study) throw new Error(`fixture problem: no case study named "${name}"`);
  return study.diagram;
}

const bundleData = diagramOf('Winning Group') as BundleDiagramData;
const reposData = diagramOf('Direct Line Group') as ReposDiagramData;
const frametimeData = diagramOf('SRT Marine') as FrametimeDiagramData;
const scatterData = diagramOf('QBurst') as ScatterDiagramData;

describe('honesty — every diagram number traces to the resume', () => {
  const transcriptPath = fileURLToPath(new URL('../docs/resume-transcript.md', import.meta.url));
  const transcript = readFileSync(transcriptPath, 'utf-8');

  /**
   * Numbers in the transcript, normalised so a magnitude suffix matches its expanded value.
   * QBurst's line reads "1M+ rows", which is how the resume writes 1,000,000 — the honesty
   * check has to recognise that suffix or the scatter's real, resume-traced point count would
   * fail a test that is supposed to catch invented figures, not correctly-attributed ones
   * written in shorthand.
   *
   * The suffix must sit directly against the digits (no `\s*`) and match the transcript's
   * actual casing (`M` for millions, `k` for thousands — confirmed by grepping the file: every
   * instance is "1M+" or "…k", never "K" or a lowercase "m"). Without both constraints, "45
   * minutes" would misparse as "45m" and inflate to 45,000,000.
   */
  function transcriptNumbers(text: string): Set<number> {
    const numbers = new Set<number>();
    const pattern = /(\d[\d,]*(?:\.\d+)?)([Mk])?\+?/g;
    for (const match of text.matchAll(pattern)) {
      const raw = Number(match[1].replace(/,/g, ''));
      if (Number.isNaN(raw)) continue;
      const suffix = match[2];
      const value = suffix === 'M' ? raw * 1_000_000 : suffix === 'k' ? raw * 1_000 : raw;
      numbers.add(value);
    }
    return numbers;
  }

  const allowed = transcriptNumbers(transcript);

  it('every numeric field in every case study\'s diagram appears in the transcript', () => {
    for (const study of caseStudies) {
      const diagram = study.diagram as unknown as Record<string, unknown>;
      for (const [field, value] of Object.entries(diagram)) {
        if (typeof value !== 'number') continue;
        expect(allowed.has(value), `${study.name}.diagram.${field} = ${value} not found in transcript`).toBe(
          true,
        );
      }
    }
  });
});

describe('bundle — Winning Group', () => {
  it('starts at 100% and collapses to the resume-derived end percent', () => {
    expect(bundleBarAt(bundleData, 0).percent).toBe(100);
    expect(bundleBarAt(bundleData, 1).percent).toBe(100 - bundleData.reductionPercent);
    expect(bundleBarAt(bundleData, 1).percent).toBe(40); // resume: "cutting total bundle size by 60%"
  });

  it('is monotonically non-increasing as progress advances', () => {
    expect(bundleBarAt(bundleData, 0.25).percent).toBeGreaterThanOrEqual(bundleBarAt(bundleData, 0.75).percent);
  });

  it('clamps outside 0..1', () => {
    expect(bundleBarAt(bundleData, -1)).toEqual(bundleBarAt(bundleData, 0));
    expect(bundleBarAt(bundleData, 2)).toEqual(bundleBarAt(bundleData, 1));
  });
});

describe('repos — Direct Line Group', () => {
  it('draws exactly five lines, one per resume-stated repo', () => {
    const lines = reposLines(reposData);
    expect(lines).toHaveLength(5);
  });

  it('all five lines end at the same converged point', () => {
    const lines = reposLines(reposData);
    for (const line of lines) {
      expect(line.end).toEqual(lines[0].end);
    }
  });

  it('lines start spread apart and converge fully by progress 1', () => {
    const lines = reposLines(reposData);
    const startXs = new Set(lines.map((l) => l.start.x));
    expect(startXs.size).toBe(lines.length); // no two lines start at the same x

    for (const line of lines) {
      expect(repoLinePointAt(line, 1)).toEqual(line.end);
      expect(repoLinePointAt(line, 0)).toEqual(line.start);
    }
  });

  it('the deploy bar shrinks at true scale, not eyeballed', () => {
    const start = deployBarAt(reposData, 0);
    const end = deployBarAt(reposData, 1);
    expect(start.minutes).toBe(45);
    expect(end.minutes).toBe(12);
    expect(start.lengthFraction).toBe(1);
    expect(end.lengthFraction).toBeCloseTo(12 / 45, 10);
  });
});

describe('frametime — SRT Marine', () => {
  const geometry = frametimeGeometry(frametimeData);

  it('derives frame time from fps rather than a typed literal', () => {
    expect(geometry.frameTimeMs).toBeCloseTo(1000 / 60, 10);
    expect(geometry.frameTimeMs).not.toBe(16.7);
  });

  it('holds flat — every sample sits on the budget line, no jitter', () => {
    for (const point of geometry.points) {
      expect(point.y).toBe(geometry.frameTimeMs);
    }
  });
});

describe('scatter — QBurst', () => {
  it('bins exactly 1,000,000 points at both resolutions', () => {
    const { fine, coarse } = scatterGeometry(scatterData);
    const sum = (counts: number[]) => counts.reduce((a, b) => a + b, 0);
    expect(sum(fine.counts)).toBe(scatterData.pointCount);
    expect(sum(coarse.counts)).toBe(scatterData.pointCount);
  });

  it('the coarse grid is the fine grid coarsened — sums match exactly', () => {
    const { fine, coarse } = scatterGeometry(scatterData);
    const sum = (counts: number[]) => counts.reduce((a, b) => a + b, 0);
    expect(sum(coarse.counts)).toBe(sum(fine.counts));
  });

  it('two runs are byte-identical', () => {
    const a = scatterGeometry(scatterData);
    const b = scatterGeometry(scatterData);
    expect(a.fine.counts).toEqual(b.fine.counts);
    expect(a.coarse.counts).toEqual(b.coarse.counts);
    expect(a.fine.levels).toEqual(b.fine.levels);
  });

  it('quantises density into a handful of levels, 0 for empty cells', () => {
    const { fine } = scatterGeometry(scatterData);
    for (const level of fine.levels) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThan(LEVEL_COUNT);
    }
    const emptyCellsAreLevelZero = fine.counts.every((c, i) => (c === 0 ? fine.levels[i] === 0 : true));
    expect(emptyCellsAreLevelZero).toBe(true);
  });

  it('exposes at least two resolutions with different cell counts', () => {
    const { fine, coarse } = scatterGeometry(scatterData);
    expect(fine.cols * fine.rows).toBeGreaterThan(coarse.cols * coarse.rows);
  });
});

describe('mulberry32', () => {
  it('is deterministic — the same seed produces the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
