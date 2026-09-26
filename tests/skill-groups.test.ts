import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { skillGroups } from '../src/data/content';

/**
 * Section 05 mirrors the resume's Skills table. The table is read from the transcript
 * rather than copied here, so an edit to either side that breaks the mirror fails.
 */
const transcript = readFileSync(new URL('../docs/resume-transcript.md', import.meta.url), 'utf8');

/** The rows of the `## Skills` table: `| Group | a, b, c |`, header and rule skipped. */
function resumeSkills(): { name: string; items: string[] }[] {
  const section = transcript.split(/^## Skills\s*$/m)[1]?.split(/^## /m)[0] ?? '';
  return section
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => {
      const [name, contents] = line.split('|').slice(1, 3).map((cell) => cell.trim());
      return { name, items: contents.split(',').map((item) => item.trim()) };
    });
}

/** A proficiency label in brackets, which §9.05 drops: "Angular (Expert)" → "Angular". */
const PROFICIENCY = /\s*\((Expert|Advanced|Intermediate|Beginner|Freelance)\)$/;

/**
 * RxJS's operators and creation functions (v7). A group's identifier composed in `pipe()`
 * must never shadow one: `core()` is a user-defined operator, `share()` would be a lie.
 */
const RXJS_NAMES = new Set([
  'audit', 'auditTime', 'buffer', 'bufferCount', 'bufferTime', 'bufferToggle', 'bufferWhen',
  'catchError', 'combineAll', 'combineLatest', 'combineLatestAll', 'combineLatestWith',
  'concat', 'concatAll', 'concatMap', 'concatMapTo', 'concatWith', 'connect', 'count',
  'debounce', 'debounceTime', 'defaultIfEmpty', 'defer', 'delay', 'delayWhen',
  'dematerialize', 'distinct', 'distinctUntilChanged', 'distinctUntilKeyChanged',
  'elementAt', 'empty', 'endWith', 'every', 'exhaust', 'exhaustAll', 'exhaustMap', 'expand',
  'filter', 'finalize', 'find', 'findIndex', 'first', 'flatMap', 'forkJoin', 'from',
  'fromEvent', 'generate', 'groupBy', 'identity', 'ignoreElements', 'iif', 'interval',
  'isEmpty', 'last', 'map', 'mapTo', 'materialize', 'max', 'merge', 'mergeAll', 'mergeMap',
  'mergeMapTo', 'mergeScan', 'mergeWith', 'min', 'multicast', 'never', 'noop', 'observeOn',
  'of', 'onErrorResumeNext', 'onErrorResumeNextWith', 'pairwise', 'pairs', 'partition',
  'pipe', 'pluck', 'publish', 'publishBehavior', 'publishLast', 'publishReplay', 'race',
  'raceWith', 'range', 'reduce', 'refCount', 'repeat', 'repeatWhen', 'retry', 'retryWhen',
  'sample', 'sampleTime', 'scan', 'scheduled', 'sequenceEqual', 'share', 'shareReplay',
  'single', 'skip', 'skipLast', 'skipUntil', 'skipWhile', 'startWith', 'subscribeOn',
  'switchAll', 'switchMap', 'switchMapTo', 'switchScan', 'take', 'takeLast', 'takeUntil',
  'takeWhile', 'tap', 'throttle', 'throttleTime', 'throwError', 'throwIfEmpty',
  'timeInterval', 'timeout', 'timeoutWith', 'timer', 'timestamp', 'toArray', 'using',
  'window', 'windowCount', 'windowTime', 'windowToggle', 'windowWhen', 'withLatestFrom',
  'zip', 'zipAll', 'zipWith',
]);

describe('skillGroups', () => {
  const resume = resumeSkills();

  it('reads the resume table (the parser is not silently empty)', () => {
    expect(resume.map((row) => row.name)).toEqual(['Core', 'Architecture', 'Testing', 'AI tooling', 'Also']);
  });

  it("has the resume's five groups, in the resume's order", () => {
    expect(skillGroups.map((group) => group.name)).toEqual(resume.map((row) => row.name));
  });

  it('carries every resume item, in order, with proficiency labels dropped', () => {
    skillGroups.forEach((group, i) => {
      expect(group.items).toEqual(resume[i].items.map((item) => item.replace(PROFICIENCY, '')));
    });
  });

  it('has no proficiency field and no proficiency label anywhere', () => {
    for (const group of skillGroups) {
      expect(Object.keys(group).sort()).toEqual(['items', 'name', 'op']);
      for (const item of group.items) {
        expect(typeof item).toBe('string');
        expect(item).not.toMatch(PROFICIENCY);
      }
    }
  });

  it('gives every group a distinct camelCase identifier that shadows no RxJS operator', () => {
    const ops = skillGroups.map((group) => group.op);
    expect(new Set(ops).size).toBe(ops.length);
    for (const op of ops) {
      expect(op).toMatch(/^[a-z][A-Za-z]*$/);
      expect(RXJS_NAMES.has(op)).toBe(false);
    }
  });
});
