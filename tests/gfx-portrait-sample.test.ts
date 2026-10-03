import { describe, expect, it } from 'vitest';
import { maskAt, samplePortrait, type BrightnessGrid } from '../src/lib/gfx/portrait-sample';

function grid(size: number, valueAt: (u: number, v: number) => number): BrightnessGrid {
  const values = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) values[y * size + x] = valueAt((x + 0.5) / size, (y + 0.5) / size);
  }
  return { width: size, height: size, values };
}

const uniform = grid(64, () => 1);

/** Share of `count` homes in each quadrant around the mask's centre. */
function quadrantShares(homes: Float32Array, count: number): number[] {
  const tally = [0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    const right = homes[i * 2] >= 0.5 ? 1 : 0;
    const lower = homes[i * 2 + 1] >= 0.45 ? 2 : 0;
    tally[right + lower]++;
  }
  return tally.map((n) => n / count);
}

describe('maskAt — the radial falloff of .hero__face (farthest-side at 50% 45%, opaque to 86%)', () => {
  it('is opaque at the centre and transparent in the corners', () => {
    expect(maskAt(0.5, 0.45)).toBe(1);
    expect(maskAt(0, 0)).toBe(0);
    expect(maskAt(1, 1)).toBe(0);
  });

  it('fades linearly between 86% and 100% of the radius', () => {
    // Along the horizontal axis the radius is 0.5: 93% of it is halfway through the fade.
    expect(maskAt(0.5 + 0.5 * 0.93, 0.45)).toBeCloseTo(0.5, 5);
  });
});

describe('samplePortrait', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = samplePortrait(uniform, 2000, 7);
    const b = samplePortrait(uniform, 2000, 7);
    const c = samplePortrait(uniform, 2000, 8);
    expect(Array.from(a.homes)).toEqual(Array.from(b.homes));
    expect(Array.from(a.homes)).not.toEqual(Array.from(c.homes));
  });

  it('returns exactly the requested count, every home inside the box', () => {
    const sample = samplePortrait(uniform, 5000, 1);
    expect(sample.count).toBe(5000);
    expect(sample.homes.length).toBe(10000);
    expect(sample.brightness.length).toBe(5000);
    expect(sample.seeds.length).toBe(5000);
    for (const value of sample.homes) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('puts the particles where the picture is bright', () => {
    const leftLit = grid(64, (u) => (u < 0.5 ? 1 : 0.1));
    const sample = samplePortrait(leftLit, 10000, 3);
    let left = 0;
    for (let i = 0; i < sample.count; i++) if (sample.homes[i * 2] < 0.5) left++;
    expect(left / sample.count).toBeGreaterThan(0.9);
  });

  it('puts none where the mask is transparent', () => {
    const sample = samplePortrait(uniform, 20000, 5);
    for (let i = 0; i < sample.count; i++) {
      expect(maskAt(sample.homes[i * 2], sample.homes[i * 2 + 1])).toBeGreaterThan(0);
    }
  });

  it('thins evenly: the first 10k cover the face like all 40k do', () => {
    const sample = samplePortrait(uniform, 40000, 11);
    const prefix = quadrantShares(sample.homes, 10000);
    const whole = quadrantShares(sample.homes, 40000);
    prefix.forEach((share, quadrant) => expect(Math.abs(share - whole[quadrant])).toBeLessThan(0.02));
  });

  it("records each particle's brightness from its cell", () => {
    const halfLit = grid(64, (u) => (u < 0.5 ? 0.8 : 0.4));
    const sample = samplePortrait(halfLit, 2000, 2);
    for (let i = 0; i < sample.count; i++) {
      const expected = sample.homes[i * 2] < 0.5 ? 0.8 : 0.4;
      expect(sample.brightness[i]).toBeCloseTo(expected, 5);
    }
  });

  it('throws on a picture with nothing bright in it — the caller keeps the still', () => {
    expect(() => samplePortrait(grid(16, () => 0), 100, 1)).toThrow(/no bright pixels/);
  });
});
