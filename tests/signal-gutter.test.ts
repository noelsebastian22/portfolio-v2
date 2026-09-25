import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPINE_SPAN, sampleSignal, sampleSignalRange } from '../src/lib/signal/path';

const TOKENS = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8');

/** The spine's rightmost x, sampled densely from the curve itself. */
function spineMaxX(): number {
  return Math.max(...sampleSignalRange(SPINE_SPAN.tStart, SPINE_SPAN.tEnd, 4001).map((p) => p.x));
}

describe('SPINE_SPAN', () => {
  it('lands exactly on control points 21 and 26 — the run parked at the left margin', () => {
    expect(SPINE_SPAN.tStart).toBeCloseTo(21 / 50, 12);
    expect(SPINE_SPAN.tEnd).toBeCloseTo(26 / 50, 12);
    expect(sampleSignal(SPINE_SPAN.tStart).x).toBeCloseTo(-0.72, 12);
    expect(sampleSignal(SPINE_SPAN.tEnd).x).toBeCloseTo(-0.72, 12);
  });

  it('stays in the left fifth of the layer throughout', () => {
    expect(spineMaxX()).toBeLessThan(-0.6);
  });
});

describe('--signal-gutter in tokens.css', () => {
  const coefficient = Number(TOKENS.match(/--signal-spine-x:\s*([\d.]+)\s*;/)?.[1]);

  it('declares the spine coefficient as a plain number', () => {
    expect(Number.isFinite(coefficient)).toBe(true);
  });

  it("clears the spine: the coefficient is at least the spine's rightmost x as a fraction of the width", () => {
    // Tolerance is float noise only: (−0.72 + 1) / 2 is 0.14000000000000001 in doubles.
    expect(coefficient).toBeGreaterThanOrEqual((spineMaxX() + 1) / 2 - 1e-12);
  });

  it('derives the gutter from that coefficient rather than a guessed length', () => {
    const gutter = TOKENS.match(/--signal-gutter:\s*max\(([\s\S]*?)\);/)?.[1] ?? '';
    expect(gutter).toContain('var(--signal-spine-x) * 100vw');
    expect(gutter).toContain('var(--signal-stroke) / 2');
    expect(gutter).toContain('var(--container)');
  });

  it('keeps the phone override to zero', () => {
    expect(TOKENS).toMatch(/max-width:\s*768px[\s\S]*--signal-gutter:\s*0px/);
  });
});
