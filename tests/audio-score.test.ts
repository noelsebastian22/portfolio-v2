import { describe, it, expect } from 'vitest';
import {
  CUTOFF_MAX_HZ,
  CUTOFF_MIN_HZ,
  MAX_LATE_S,
  RESOLVE_HZ,
  SCALE_HZ,
  SPACING_S,
  createNoteGate,
  cutoffFor,
  normaliseSpeed,
  notesFor,
} from '../src/lib/audio/score';

describe('notesFor — the score (spec D3)', () => {
  it('climbs each section from its start degree', () => {
    expect(notesFor({ section: 'years', index: 0 })).toEqual([SCALE_HZ[0]]);
    expect(notesFor({ section: 'years', index: 4 })).toEqual([SCALE_HZ[4]]);
    expect(notesFor({ section: 'work', index: 0 })).toEqual([SCALE_HZ[2]]);
    expect(notesFor({ section: 'stack', index: 1 })).toEqual([SCALE_HZ[5]]);
    expect(notesFor({ section: 'ring', index: 4 })).toEqual([SCALE_HZ[9]]);
  });

  it('clamps to the top of the scale rather than running off it', () => {
    expect(notesFor({ section: 'ring', index: 40 })).toEqual([SCALE_HZ[9]]);
    expect(notesFor({ section: 'years', index: -3 })).toEqual([SCALE_HZ[0]]);
  });

  it('resolves the final emission to A2 under A3', () => {
    expect(notesFor({ section: 'contact', index: 0 })).toEqual(RESOLVE_HZ);
    expect(RESOLVE_HZ).toEqual([110, 220]);
  });

  it('is A minor pentatonic over two octaves', () => {
    expect(SCALE_HZ).toHaveLength(10);
    expect(SCALE_HZ[0]).toBe(220);
    expect(SCALE_HZ[5]).toBe(440);
  });
});

describe('cutoffFor and normaliseSpeed — speed heard as brightness (spec D5)', () => {
  it('maps 0..1 onto the cutoff range, monotonically', () => {
    expect(cutoffFor(0)).toBeCloseTo(CUTOFF_MIN_HZ);
    expect(cutoffFor(1)).toBeCloseTo(CUTOFF_MAX_HZ);
    expect(cutoffFor(0.5)).toBeGreaterThan(cutoffFor(0.25));
    expect(cutoffFor(-2)).toBeCloseTo(CUTOFF_MIN_HZ);
    expect(cutoffFor(9)).toBeCloseTo(CUTOFF_MAX_HZ);
  });

  it('normalises scroll speed in either direction, clamped, and survives junk', () => {
    expect(normaliseSpeed(0)).toBe(0);
    expect(normaliseSpeed(1500)).toBe(0.5);
    expect(normaliseSpeed(-1500)).toBe(0.5);
    expect(normaliseSpeed(99999)).toBe(1);
    expect(normaliseSpeed(Number.NaN)).toBe(0);
  });
});

describe('createNoteGate — cooldown, spacing, drop (spec D7)', () => {
  it('plays the first note now', () => {
    expect(createNoteGate().schedule('years:0', 10)).toBe(10);
  });

  it('refuses the same emission inside its cooldown, and allows it after', () => {
    const gate = createNoteGate();
    gate.schedule('years:0', 10);
    expect(gate.schedule('years:0', 10.1)).toBeNull();
    expect(gate.schedule('years:0', 10.2)).toBe(10.2);
  });

  it('spaces different emissions asked for at once', () => {
    const gate = createNoteGate();
    expect(gate.schedule('years:0', 10)).toBe(10);
    expect(gate.schedule('years:1', 10)).toBeCloseTo(10 + SPACING_S);
    expect(gate.schedule('years:2', 10)).toBeCloseTo(10 + 2 * SPACING_S);
  });

  it('drops a note that would sound too late, without taking a slot', () => {
    const gate = createNoteGate();
    const keys = Array.from({ length: 12 }, (_, i) => `stack:${i}`);
    const times = keys.map((key) => gate.schedule(key, 10));
    const played = times.filter((t): t is number => t !== null);
    expect(played.every((t) => t - 10 <= MAX_LATE_S + 1e-9)).toBe(true);
    expect(times.some((t) => t === null)).toBe(true);
    // Later, the run has drained and the next note plays on time.
    expect(gate.schedule('contact:0', 20)).toBe(20);
  });
});
