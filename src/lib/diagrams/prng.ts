/**
 * mulberry32 — a tiny, fast, seeded PRNG. Written here instead of pulled in as a dependency:
 * the scatter diagram (`scatter.ts`) needs exactly this — a generator that is fully
 * deterministic (same seed, same sequence, forever) and cheap enough to call several million
 * times at build time without measurable cost. Public domain algorithm, ~10 lines.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
