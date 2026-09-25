import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SECTION_SPANS, SPINE_SPAN, sampleSignal, sampleSignalRange } from '../src/lib/signal/path';
import { resolveSeamPixels, toPixelPoints, mapCurveY } from '../src/lib/signal/anchors';
import { gutterBands, strengthStops } from '../src/lib/signal/gutter';

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

describe('gutterBands', () => {
  // A line that runs right, sweeps into the gutter, parks, and leaves again.
  const line = [
    { x: 500, y: 0 },
    { x: 500, y: 100 },
    { x: 100, y: 200 }, // crosses x = 300 at y 150
    { x: 100, y: 400 },
    { x: 500, y: 500 }, // crosses x = 300 at y 450
  ];

  it('finds the run inside the gutter, interpolating the crossings along the chords', () => {
    expect(gutterBands(line, { top: 0, right: 300, width: 200 })).toEqual([[150, 450]]);
  });

  it('is empty when the gutter has no width — phone, where the whole line dims', () => {
    expect(gutterBands(line, { top: 0, right: 300, width: 0 })).toEqual([]);
  });

  it('ignores anything above the first section that reserves a gutter', () => {
    expect(gutterBands(line, { top: 250, right: 300, width: 200 })).toEqual([[250, 450]]);
    expect(gutterBands(line, { top: 600, right: 300, width: 200 })).toEqual([]);
  });

  it('finds several separate bands', () => {
    const zigzag = [
      { x: 100, y: 0 },
      { x: 500, y: 100 },
      { x: 100, y: 200 },
    ];
    expect(gutterBands(zigzag, { top: 0, right: 300, width: 200 })).toEqual([
      [0, 50],
      [150, 200],
    ]);
  });
});

describe('the real curve at 1440', () => {
  // Section tops measured on the built page at 1440x900, in the layer's coordinates.
  const TOPS = [65, 1115.39, 2167.89, 3205.08, 7107.83, 7816.02];
  const HEIGHT = 8568;
  const WIDTH = 1440;
  const GUTTER = { top: TOPS[2], right: 24 + 203.6, width: 203.6 };
  const seams = resolveSeamPixels(TOPS, HEIGHT);
  const points = toPixelPoints(sampleSignalRange(0, 1, 481), WIDTH, seams);
  const bands = gutterBands(points, GUTTER);

  it('is full strength along the whole spine', () => {
    const spineTop = mapCurveY(sampleSignal(SPINE_SPAN.tStart).y, seams);
    const spineBottom = mapCurveY(sampleSignal(SPINE_SPAN.tEnd).y, seams);
    expect(bands.some(([top, bottom]) => top <= spineTop && bottom >= spineBottom)).toBe(true);
  });

  it('is dim through sections 01–02 and the sweep that opens section 03', () => {
    const workTop = TOPS[SECTION_SPANS.findIndex((s) => s.id === 'work')];
    for (const [top] of bands) expect(top).toBeGreaterThan(workTop + 100);
  });
});

describe('strengthStops', () => {
  it('is dim at both ends of the box and only full strength inside a band', () => {
    const stops = strengthStops([[200, 600]], 1000, 32);
    expect(stops[0]).toEqual({ offset: 0, full: false });
    expect(stops[stops.length - 1]).toEqual({ offset: 1, full: false });
    expect(stops.filter((s) => s.full).map((s) => s.offset)).toEqual([0.232, 0.568]);
    expect(stops.filter((s) => !s.full).map((s) => s.offset)).toEqual([0, 0.2, 0.6, 1]);
  });

  it('lays the crossfade inside the band, so nothing outside is drawn above dim', () => {
    const stops = strengthStops([[200, 600]], 1000, 32);
    const firstFull = stops.find((s) => s.full)!;
    expect(firstFull.offset).toBeGreaterThan(0.2);
  });

  it('ramps straight back down in a band shorter than two fades', () => {
    const stops = strengthStops([[100, 140]], 1000, 32);
    expect(stops.filter((s) => s.full).map((s) => s.offset)).toEqual([0.12, 0.12]);
  });

  it('keeps offsets non-decreasing', () => {
    const stops = strengthStops([[0, 10], [5, 1200]], 1000, 32);
    for (let i = 1; i < stops.length; i++) expect(stops[i].offset).toBeGreaterThanOrEqual(stops[i - 1].offset);
  });

  it('is a single dim run with no bands at all', () => {
    expect(strengthStops([], 1000, 32)).toEqual([
      { offset: 0, full: false },
      { offset: 1, full: false },
    ]);
  });
});
