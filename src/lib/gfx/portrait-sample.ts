/**
 * Where the portrait's particles live (Phase 11 design D8): homes sampled from the still's own
 * brightness, so the particle face can never drift from the picture everyone else sees.
 *
 * Each particle is drawn independently from the same weighted distribution, so the sample is
 * already in random order — any prefix of it is itself a fair sample. That is what lets the
 * tiers (portrait-tier.ts) thin the face with `setDrawRange` instead of re-sampling (D11).
 *
 * Pure: the scene hands in the grid (portrait-source.ts reads it off the page).
 */

export interface BrightnessGrid {
  width: number;
  height: number;
  /** Row-major, 0..1. */
  values: Float32Array;
}

export interface PortraitSample {
  count: number;
  /** `u, v` pairs in 0..1 inside the still's box, `v` running down. */
  homes: Float32Array;
  brightness: Float32Array;
  /** 0..1, the phase of each particle's drift. */
  seeds: Float32Array;
}

/** One face on every visit: the same seed, the same particles. */
export const PORTRAIT_SEED = 20261003;

/**
 * Above 1 so lit skin dominates while the dark jumper keeps a few particles. Tuned at the
 * checkpoint.
 */
const WEIGHT_GAMMA = 1.5;

const BELOW_ONE = 0.9999;

/** `.hero__face`'s mask: `radial-gradient(farthest-side at 50% 45%, #000 86%, transparent 100%)`. */
const MASK = { cx: 0.5, cy: 0.45, opaque: 0.86 };

/**
 * The mask's alpha at `u, v`. In a square box, `farthest-side` from (0.5, 0.45) gives radii of
 * 0.5 across and 0.55 down — the distance to the farthest side on each axis.
 */
export function maskAt(u: number, v: number): number {
  const radiusX = Math.max(MASK.cx, 1 - MASK.cx);
  const radiusY = Math.max(MASK.cy, 1 - MASK.cy);
  const distance = Math.hypot((u - MASK.cx) / radiusX, (v - MASK.cy) / radiusY);
  if (distance <= MASK.opaque) return 1;
  return Math.max(0, (1 - distance) / (1 - MASK.opaque));
}

/** mulberry32 — small, fast, and good enough for placing dots. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function samplePortrait(grid: BrightnessGrid, count: number, seed: number): PortraitSample {
  const { width, height, values } = grid;
  const cumulative = new Float64Array(width * height);
  let total = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      total += Math.pow(values[cell], WEIGHT_GAMMA) * maskAt((x + 0.5) / width, (y + 0.5) / height);
      cumulative[cell] = total;
    }
  }
  if (!(total > 0)) throw new Error('portrait has no bright pixels to sample');

  const random = seededRandom(seed);
  const homes = new Float32Array(count * 2);
  const brightness = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // The first cell whose running total passes the target: binary search over `cumulative`.
    const target = random() * total;
    let low = 0;
    let high = cumulative.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (cumulative[mid] > target) high = mid;
      else low = mid + 1;
    }
    const cellX = low % width;
    const cellY = (low - cellX) / width;
    // Jittered within the cell, so a 320-cell grid does not read as a 320-line raster. A
    // jitter that crosses the mask's edge falls back to the cell's centre, which the weight
    // already proved is inside it.
    let u = (cellX + random()) / width;
    let v = (cellY + random()) / height;
    if (maskAt(u, v) === 0) {
      u = (cellX + 0.5) / width;
      v = (cellY + 0.5) / height;
    }
    // Float32 rounds anything within 6e-8 of 1 up to 1; keep homes strictly inside the box.
    homes[i * 2] = Math.min(u, BELOW_ONE);
    homes[i * 2 + 1] = Math.min(v, BELOW_ONE);
    brightness[i] = values[low];
    seeds[i] = random();
  }

  return { count, homes, brightness, seeds };
}
