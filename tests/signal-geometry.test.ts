import { describe, expect, it } from 'vitest';
import { strengthAt, strengthStops } from '../src/lib/signal/gutter';
import {
  onSignalGeometry,
  publishSignalGeometry,
  signalGeometry,
  type SignalGeometry,
} from '../src/lib/signal/tip';

function geometry(tag: number): SignalGeometry {
  return {
    points: [
      { x: 0, y: tag, z: 0, curveY: 0 },
      { x: 0, y: tag + 10, z: 0, curveY: 1 },
    ],
    lengths: [0, 10],
    strength: [0, 1],
  };
}

describe('the geometry channel in tip.ts', () => {
  it('delivers every re-measure, and the latest one to a late subscriber', () => {
    const seen: number[] = [];
    const unsubscribe = onSignalGeometry((g) => seen.push(g.points[0].y));
    publishSignalGeometry(geometry(1));
    publishSignalGeometry(geometry(2)); // the document changed height: a second measure
    expect(seen).toEqual([1, 2]);
    unsubscribe();

    const late: number[] = [];
    onSignalGeometry((g) => late.push(g.points[0].y));
    expect(late).toEqual([2]);
    expect(signalGeometry()?.points[0].y).toBe(2);
  });
});

describe('strengthAt — the dim rule per point', () => {
  const height = 1000;
  const stops = strengthStops([[200, 600]], height, 32);

  it('is dim outside every band and full well inside one', () => {
    expect(strengthAt(stops, height, 100)).toBe(0);
    expect(strengthAt(stops, height, 400)).toBe(1);
    expect(strengthAt(stops, height, 900)).toBe(0);
  });

  it('crossfades linearly inside the band edge, as the gradient does', () => {
    expect(strengthAt(stops, height, 216)).toBeCloseTo(0.5, 9);
    expect(strengthAt(stops, height, 584)).toBeCloseTo(0.5, 9);
  });

  it('is dim everywhere with no bands, and for a box with no height', () => {
    const none = strengthStops([], height, 32);
    expect(strengthAt(none, height, 500)).toBe(0);
    expect(strengthAt(stops, 0, 500)).toBe(0);
  });
});
