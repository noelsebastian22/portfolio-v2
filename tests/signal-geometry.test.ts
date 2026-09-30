import { describe, expect, it } from 'vitest';
import {
  onSignalGeometry,
  publishSignalGeometry,
  signalGeometry,
  type SignalGeometry,
} from '../src/lib/signal/tip';

function geometry(tag: number): SignalGeometry {
  return { points: [{ x: 0, y: tag }, { x: 0, y: tag + 10 }], lengths: [0, 10] };
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
