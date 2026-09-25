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

describe('honesty — every diagram number traces to the RIGHT employer in the resume', () => {
  const transcriptPath = fileURLToPath(new URL('../docs/resume-transcript.md', import.meta.url));
  const transcript = readFileSync(transcriptPath, 'utf-8');

  /**
   * Numbers in a block of text, normalised so a magnitude suffix matches its expanded value.
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
  function textNumbers(text: string): Set<number> {
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

  /**
   * The transcript's `### <Role>, <Employer> — <dates> · <place>` headings, in the order they
   * appear, delimit one employer's Experience bullets from the next. Slicing from one heading
   * up to (not including) the next `###` or `##` heading isolates exactly that employer's own
   * claims — which is the whole point: a number that is real but belongs to a *different*
   * employer must not satisfy this check, per "Do not infer attribution."
   */
  function experienceSection(text: string, headingText: string): string {
    const lines = text.split('\n');
    const startIndex = lines.findIndex((line) => line.startsWith('### ') && line.includes(headingText));
    if (startIndex === -1) {
      throw new Error(`resume-transcript.md: no "### ...${headingText}..." heading found`);
    }
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('### ') || lines[i].startsWith('## ')) {
        endIndex = i;
        break;
      }
    }
    return lines.slice(startIndex, endIndex).join('\n');
  }

  /** Rows of the bottom attribution table whose Employer column mentions this exact name. */
  function attributionRows(text: string, tableName: string): string {
    return text
      .split('\n')
      .filter((line) => line.startsWith('|') && line.includes(tableName))
      .join('\n');
  }

  /**
   * Maps a `caseStudies` name to the exact strings needed to find its numbers, because the
   * two places the transcript names employers do not always agree with each other or with
   * `content.ts`: the Experience heading says "SRT Marine Systems PLC", the attribution table
   * says "SRT Marine", and `content.ts` also says "SRT Marine". Explicit, not inferred.
   */
  const EMPLOYER: Record<string, { heading: string; table: string }> = {
    'Winning Group': { heading: 'Winning Group', table: 'Winning Group' },
    'Direct Line Group': { heading: 'Direct Line Group', table: 'Direct Line Group' },
    'SRT Marine': { heading: 'SRT Marine Systems PLC', table: 'SRT Marine' },
    QBurst: { heading: 'QBurst', table: 'QBurst' },
  };

  function employerNumbers(name: string): Set<number> {
    const employer = EMPLOYER[name];
    if (!employer) throw new Error(`honesty test: no employer heading mapped for "${name}"`);
    const section = experienceSection(transcript, employer.heading);
    const rows = attributionRows(transcript, employer.table);
    return textNumbers(`${section}\n${rows}`);
  }

  it("every numeric field in every case study's diagram is attested in THAT employer's own section", () => {
    for (const study of caseStudies) {
      const allowedForThisEmployer = employerNumbers(study.name);
      const diagram = study.diagram as unknown as Record<string, unknown>;
      for (const [field, value] of Object.entries(diagram)) {
        if (typeof value !== 'number') continue;
        expect(
          allowedForThisEmployer.has(value),
          `${study.name}.diagram.${field} = ${value} not found in ${study.name}'s own resume section`,
        ).toBe(true);
      }
    }
  });

  it('rejects a number that is real but belongs to a different employer — scoping actually bites', () => {
    // 60 is a bad choice for this check: it is genuinely attested under BOTH Winning Group
    // ("cutting total bundle size by 60%") AND SRT Marine ("holding real-time data rendering
    // at 60fps"), so it would pass either way and prove nothing about scoping. 35 ("reducing
    // CI/CD build times by 35%") is unique to Winning Group — grepped, it appears nowhere else
    // in the transcript — so it is a real number that must still fail for every other employer.
    expect(employerNumbers('Winning Group').has(35)).toBe(true);
    expect(employerNumbers('SRT Marine').has(35)).toBe(false);
    expect(employerNumbers('Direct Line Group').has(35)).toBe(false);
    expect(employerNumbers('QBurst').has(35)).toBe(false);

    // And directly: a diagram fixture that misattributes Winning Group's 35% to SRT Marine
    // must fail the same assertion the honesty test above runs.
    const misattributedToSrtMarine = { kind: 'bundle', reductionPercent: 35 } as const;
    expect(employerNumbers('SRT Marine').has(misattributedToSrtMarine.reductionPercent)).toBe(false);
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

  it('does not pile clipped Gaussian tails onto the border — rejection sampling, not clamping', () => {
    const { fine } = scatterGeometry(scatterData);
    const borderCounts: number[] = [];
    for (let col = 0; col < fine.cols; col++) {
      borderCounts.push(fine.counts[0 * fine.cols + col]); // top row
      borderCounts.push(fine.counts[(fine.rows - 1) * fine.cols + col]); // bottom row
    }
    for (let row = 0; row < fine.rows; row++) {
      borderCounts.push(fine.counts[row * fine.cols + 0]); // left column
      borderCounts.push(fine.counts[row * fine.cols + (fine.cols - 1)]); // right column
    }
    const maxBorderCell = Math.max(...borderCounts);
    // Clamping instead of redrawing would dump every out-of-range point onto whichever edge
    // cell it was nearest to — thousands of points stacked into a single cell. A genuinely
    // Gaussian-tailed distribution never concentrates more than a sliver of the total there.
    // 0.5% of 1,000,000 is a generous ceiling, not a tight bound tuned to the current output.
    expect(maxBorderCell).toBeLessThan(scatterData.pointCount * 0.005);
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
