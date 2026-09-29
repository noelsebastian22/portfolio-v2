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
    expect(sampleSignal(SPINE_SPAN.tStart).x).toBeCloseTo(-0.74, 12);
    expect(sampleSignal(SPINE_SPAN.tEnd).x).toBeCloseTo(-0.74, 12);
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
    // Tolerance is float noise only, for a coefficient set exactly on the spine.
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
  // A line that runs right, sweeps into the clear zone, parks, and leaves again.
  const line = [
    { x: 500, y: 0 },
    { x: 500, y: 100 },
    { x: 100, y: 200 }, // crosses x = 300 at y 150
    { x: 100, y: 400 },
    { x: 500, y: 500 }, // crosses x = 300 at y 450
  ];

  it('finds the run that clears the content, interpolating the crossings along the chords', () => {
    expect(gutterBands(line, { top: 0, contentLeft: 300, reach: 0 })).toEqual([[150, 450]]);
  });

  it('counts the stroke and the clearance against the content edge', () => {
    // Clear only where x + 100 <= 400, i.e. x <= 300: the same crossings as above.
    expect(gutterBands(line, { top: 0, contentLeft: 400, reach: 100 })).toEqual([[150, 450]]);
    // Nothing clears when the reach spans the whole distance to the content.
    expect(gutterBands(line, { top: 0, contentLeft: 150, reach: 100 })).toEqual([]);
  });

  it('ignores anything above the first section that reserves a gutter', () => {
    expect(gutterBands(line, { top: 250, contentLeft: 300, reach: 0 })).toEqual([[250, 450]]);
    expect(gutterBands(line, { top: 600, contentLeft: 300, reach: 0 })).toEqual([]);
  });

  it('finds several separate bands', () => {
    const zigzag = [
      { x: 100, y: 0 },
      { x: 500, y: 100 },
      { x: 100, y: 200 },
    ];
    expect(gutterBands(zigzag, { top: 0, contentLeft: 300, reach: 0 })).toEqual([
      [0, 50],
      [150, 200],
    ]);
  });
});

/**
 * The content edge exactly as tokens.css and the probe in global.css define it: the
 * centring margin of a 1440px container, its 24px padding, and --signal-gutter (0 at
 * ≤768px). Reach is half the 4px stroke plus the 24px clearance.
 */
const CONTAINER = 1440;
const PAD = 24;
const REACH = 2 + 24;
function contentLeft(viewport: number): number {
  const margin = Math.max(0, (viewport - CONTAINER) / 2);
  const gutter = viewport <= 768 ? 0 : Math.max(0, 0.14 * viewport + 2 + 24 - margin - PAD);
  return margin + PAD + gutter;
}

describe.each([
  // Section tops measured on the built page, in the layer's coordinates.
  { viewport: 768, tops: [65, 1250, 2500, 3700, 7500, 8200], height: 9000, lit: false },
  { viewport: 1440, tops: [65, 1115.39, 2167.89, 3205.08, 7107.83, 7816.02], height: 8568, lit: true },
  { viewport: 2560, tops: [65, 1201.17, 2366.77, 3357.77, 7241.77, 7954.77], height: 8708, lit: true },
])('the real curve at $viewport', ({ viewport, tops, height, lit }) => {
  const region = { top: tops[2], contentLeft: contentLeft(viewport), reach: REACH };
  const seams = resolveSeamPixels(tops, height);
  const points = toPixelPoints(sampleSignalRange(0, 1, 481), viewport, seams);
  const bands = gutterBands(points, region);
  const spineTop = mapCurveY(sampleSignal(SPINE_SPAN.tStart).y, seams);
  const spineBottom = mapCurveY(sampleSignal(SPINE_SPAN.tEnd).y, seams);

  if (lit) {
    it('lights the whole spine', () => {
      // The spine sits a hundredth of the width inside the clear edge, so one band holds it.
      expect(bands.some(([top, bottom]) => top <= spineTop + 1 && bottom >= spineBottom - 1)).toBe(true);
    });

    it('keeps sections 01–02 and the opening of the sweep dim', () => {
      const workTop = tops[SECTION_SPANS.findIndex((s) => s.id === 'work')];
      for (const [top] of bands) expect(top).toBeGreaterThan(workTop + 100);
    });
  } else {
    it('dims the whole line — phone width falls out of the same test', () => {
      expect(bands).toEqual([]);
    });
  }
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
