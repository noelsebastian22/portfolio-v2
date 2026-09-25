/**
 * The `diagram` field on a `caseStudies` entry (`src/data/content.ts`). This is the only
 * place a case study's real figures live — `src/lib/diagrams/*.ts` reads them and never a
 * literal, and `tests/diagrams.test.ts` checks every number here against
 * `docs/resume-transcript.md`.
 *
 * Each shape carries only numbers that appear in the transcript. Anything derived from
 * them (a baseline of 100%, a computed frame time, a PRNG seed) is computed inside the
 * matching geometry module instead, so it never has to be justified against the resume —
 * it isn't a claim, it's arithmetic on one.
 */

export interface BundleDiagramData {
  readonly kind: 'bundle';
  /** Resume, Winning Group: "cutting total bundle size by 60%". */
  readonly reductionPercent: number;
}

export interface ReposDiagramData {
  readonly kind: 'repos';
  /** Resume, Direct Line Group: "5+ Angular repositories" — 5 is the stated lower bound. */
  readonly repoCount: number;
  /** The label drawn next to the converged line: '5+', not '5' — five is a floor, not a count. */
  readonly repoLabel: string;
  /** Resume: "reducing deployment windows from 45 minutes to 12 minutes". */
  readonly deployStartMinutes: number;
  readonly deployEndMinutes: number;
}

export interface FrametimeDiagramData {
  readonly kind: 'frametime';
  /** Resume, SRT Marine: "holding real-time data rendering at 60fps". */
  readonly fps: number;
}

export interface ScatterDiagramData {
  readonly kind: 'scatter';
  /** Resume, QBurst: "1M+ rows visualised with sub-second latency". */
  readonly pointCount: number;
}

export type CaseStudyDiagram =
  | BundleDiagramData
  | ReposDiagramData
  | FrametimeDiagramData
  | ScatterDiagramData;
