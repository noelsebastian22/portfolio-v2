import { describe, it, expect } from 'vitest';
import { tipFraction } from '../src/lib/signal/draw';

describe('tipFraction — a mark drawn off the line as the tip passes it', () => {
  it('is 0 until the tip reaches the origin, and 1 once it is the distance past', () => {
    expect(tipFraction(900, 1000, 96)).toBe(0);
    expect(tipFraction(1000, 1000, 96)).toBe(0);
    expect(tipFraction(1048, 1000, 96)).toBe(0.5);
    expect(tipFraction(1096, 1000, 96)).toBe(1);
    expect(tipFraction(5000, 1000, 96)).toBe(1);
  });

  it('reads no tip, or a NaN one, as undrawn', () => {
    expect(tipFraction(null, 1000, 96)).toBe(0);
    expect(tipFraction(Number.NaN, 1000, 96)).toBe(0);
  });
});
