# Phase 11 — WebGL Particle Portrait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On capable desktops the hero portrait becomes ~40,000 cream GPU particles that drift, part around the cursor, and on scroll pour down into the point where the line begins, turning red as they join it; everyone else gets a cream duotone still of the same photograph.

**Architecture:** The still is re-baked cream and stays the LCP element. After the Phase 10 tube is live, the scene reads the still's own pixels into a brightness grid, samples homes from it with a seeded, brightness-weighted sampler, and draws them as one Three.js `Points` in the existing scene and canvas. All motion — dissolve, colour, drift, push — is in one vertex shader whose dissolve formulas are mirrored by a pure, tested TypeScript reference. The existing frame watch drives a 40k → 20k → 10k step-down before the existing one-way fallback.

**Tech Stack:** Astro 5 (static), vanilla TypeScript, Three.js 0.186, GSAP ticker (via the Phase 10 render schedule), Vitest (pure modules, node environment), `sharp` (the still).

**Spec:** `docs/superpowers/specs/2026-10-03-phase-11-particle-portrait-design.md` (decisions D1–D11; parent: `docs/superpowers/specs/2026-09-19-signal-path-design.md` §9.01, §10, §12; previous phase: `docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md`). Read the Phase 11 spec before starting any task.

## Global Constraints

- Read `AGENTS.md` first. Its hard rules apply to every task.
- **No UI framework.** No React, Preact, Vue, Svelte, Tailwind.
- **Astro renders content; islands only add behaviour.** The still `<img>` stays in the server HTML with its `alt`; the canvas is decorative (`aria-hidden`, `pointer-events: none` — already true of `.signal-canvas`).
- **One canonical curve.** Nothing here samples `path.ts`. The line's start point is the first point of the geometry `svg-signal.ts` publishes (`onSignalGeometry`, `src/lib/signal/tip.ts`).
- **The scroll is the transport.** The dissolve is a pure function of scroll. The only timed motion is idle drift while the hero is visible (D7) and the one ~400ms still→particles fade (D10).
- **Palette, exact, read from computed style at runtime, never hard-coded in the scene:** `--type #F2EFE7` (cream), `--signal #FF4B54`. `scripts/portrait.mjs` reads tokens from `src/styles/tokens.css` via `readTone`.
- **Performance budget:** base-path JS ≤ 81,920 bytes gzip on `/` and must be **byte-identical** to `master`'s 63,151 (`npm run budget`); the enhanced WebGL chunk ≤ 256,000 bytes gzip (currently 132,276). No new network request: the particles are sampled from the still the page already downloaded.
- **Gate unchanged:** `src/lib/gfx/gate.ts` is not edited. The portrait only exists where the tube already does.
- **Code style:** descriptive names, complex conditions extracted into named booleans, comment *why* not *what*, match the density and idiom of neighbouring files (`src/lib/gfx/*.ts` is the reference).
- **Gates before every commit:** `npx vitest run` and `npm run build` both pass.
- **Commits:** one per task, `feat:`/`test:`/`chore:`/`docs:` prefix, message body says why. **Add no `Co-Authored-By` or other trailer**; the controller normalises attribution. Do not push. Do not edit `docs/SESSIONS.md`.

## Review Focus

1. **A portrait failure must never take the tube or the still down.** A decode error, an exception while sampling, or a throw in the per-frame update leaves the still visible and the tube live. (Task 6, `dropPortrait`; the sampler's no-bright-pixels throw is pinned in Task 2.)
2. **Scrolling back up after a full dissolve must rebuild the face exactly**, including after the particles were hidden at `p = 1`. (Task 3 pins `p → local` as a pure function; Task 6 re-shows `points` whenever `p < 1`.)
3. **A tier step-down must thin the face evenly, not crop it.** The first 10k of a sample cover the face like the whole 40k. (Task 2's prefix test.)
4. **A resize or a document-height change must keep the particles on the still's box and the stream on the line's start.** Both are re-measured on `resize` and on every published geometry. (Task 6.)
5. **The fallback must bring the still back**, not leave an empty hero: `hero--particles` is removed on every hand-back path. (Task 6, registered through `onHandBack`.)

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `scripts/portrait.mjs` | modify | Cream duotone (`--ground → --type`), tighter key light, header says the still is the particles' source |
| `public/images/portrait/portrait-{640,1280}w.{avif,webp,jpg}` | regenerate | The cream still |
| `src/lib/gfx/portrait-sample.ts` | create | Pure: brightness grid → seeded, brightness- and mask-weighted homes |
| `src/lib/gfx/portrait-dissolve.ts` | create | Pure: dissolve progress from the playhead; per-particle progress and position — the shader's reference |
| `src/lib/gfx/portrait-tier.ts` | create | Pure: 40k → 20k → 10k → fall back, on the existing frame watch |
| `src/lib/gfx/portrait-source.ts` | create | DOM: the still's pixels → a 320×320 brightness grid |
| `src/lib/gfx/particles.ts` | create | Three.js `Points` + shader; setters only |
| `src/lib/gfx/scene.ts` | modify | Mounts the portrait after the tube is live; drift loop; pointer; tiers; teardown |
| `src/components/Hero.astro` | modify | `data-portrait-still` hook; `hero--particles` fades the still |
| `tests/gfx-portrait-sample.test.ts`, `tests/gfx-portrait-dissolve.test.ts`, `tests/gfx-portrait-tier.test.ts` | create | Vitest |
| `docs/superpowers/specs/2026-09-19-signal-path-design.md` | modify | §9.01 choreography, §10 duotone rule |
| `BUILD-PLAN.md` | modify | Phase 11 section, a Decision entry, figures |

---

### Task 1: The cream still

**Files:**
- Modify: `scripts/portrait.mjs` (header comment note 4, `KEY`, the `readTone(css, 'signal')` call, the log line)
- Regenerate: `public/images/portrait/` (six files, via `node scripts/portrait.mjs`)
- Modify: `docs/superpowers/specs/2026-09-19-signal-path-design.md` §10 (Visual Assets)
- Modify: `BUILD-PLAN.md` — the Phase 11 section and the Decisions list

**Interfaces:**
- Consumes: `readTokens`, `readTone` from `scripts/lib/tokens.mjs` (existing).
- Produces: the six cream files at the same paths and sizes; nothing in `src/` changes.

- [ ] **Step 1: Switch the duotone's top stop to `--type` and tighten the key light**

In `scripts/portrait.mjs`, replace the `KEY` constant:

```js
/**
 * The key light. `floor` is what the darkest corner of the falloff keeps, so
 * the shoulders stay readable instead of snapping off at the ellipse. Tightened
 * 2026-10-03 (Phase 11, D3): at the old { rx 0.52, ry 0.62, outer 1.15,
 * floor 0.22 } the door arch behind the head read as bright as the face.
 */
const KEY = { cx: 0.53, cy: 0.37, rx: 0.44, ry: 0.56, inner: 0.26, outer: 0.98, floor: 0.1 };
```

In `run()`, replace `const signal = readTone(css, 'signal');` with `const cream = readTone(css, 'type');`, and rename every later use of `signal` in `run()` to `cream` (the `bake(width, ground, signal)` call and the log template). In `bake`, rename the parameter `signal` to `top` and its use in the inner loop to `top[c]`, so the function no longer names a colour it does not use.

- [ ] **Step 2: Rewrite header note 4 and the opening paragraph**

Replace header note 4 with:

```js
 * 4. DUOTONE. A two-stop gradient map, --ground to --type (cream), read out of
 *    src/styles/tokens.css at build time rather than typed in here. Cream, not
 *    --signal: red mapped onto a face read as horror — every midtone red, no
 *    highlight above red — and red means *live* on this site (spec §10), the
 *    rule the ring captures already follow. Retune the palette in tokens.css,
 *    re-run `npm run images`, and the portrait follows.
```

In the opening paragraph, replace "Phase 11 turns this photograph into ~40,000 GPU particles, but the particle portrait is the enhancement, not the baseline" with "Phase 11's ~40,000 GPU particles are sampled at runtime from this still's own pixels (`src/lib/gfx/portrait-source.ts`), so it is both the baseline and the particles' only source. The particle portrait is the enhancement, not the baseline". Keep the rest of the paragraph.

- [ ] **Step 3: Re-bake and look**

Run: `node scripts/portrait.mjs`
Expected: a log line `→  duotone rgb(10,9,8) → rgb(242,239,231)` and six files written, each within ~±30% of the old sizes (640w: avif ~15 kB, webp ~21 kB, jpg ~33 kB).

Open `public/images/portrait/portrait-640w.jpg` and confirm: warm black-and-white, no red; the arch behind the head reads as a faint shape, not as bright as the face; the ears and the jumper's shoulders are still visible.

- [ ] **Step 4: Parent spec §10 — the portrait joins the duotone rule**

In `docs/superpowers/specs/2026-09-19-signal-path-design.md` §10, after the paragraph that ends "Nine mismatched screenshots become one system. `/websites` keeps its plain-colour hero crops (§14).", add:

```markdown
The hero still follows the same rule (Phase 11, D2): `--ground` to `--type`, cream, not red.
Red mapped onto a face read as horror, and the still is also the particle portrait's only
source — the particles are sampled from its pixels at runtime and earn their red only as they
join the line.
```

- [ ] **Step 5: `BUILD-PLAN.md` — Phase 11 section and a Decision**

Replace the Phase 11 section's **Files** line with:

```markdown
**Files:** `src/lib/gfx/{portrait-sample,portrait-dissolve,portrait-tier,portrait-source,particles}.ts`,
`scene.ts`, `Hero.astro`, `scripts/portrait.mjs` (cream re-bake). No baked sample data: the
particles are sampled at runtime from the still (design D8).

**Spec:** `docs/superpowers/specs/2026-10-03-phase-11-particle-portrait-design.md` ·
**Plan:** `docs/superpowers/plans/2026-10-03-phase-11-particle-portrait.md`
```

In the Decisions list, append (match the neighbouring entries' format, newest last):

```markdown
- **2026-10-03 (Noel)** — **The portrait is cream, and the particles are sampled from it at
  runtime.** The still is re-baked `--ground → --type` with a tighter key light: the red
  duotone read as horror (every midtone red, no highlight above red, the arch as bright as the
  face), and red means *live*. The particles read the still's own pixels after load instead of
  shipping baked sample data, which would cost ~100–150 KB gzip against a 250 KB chunk with
  132 KB used, and could drift from the still. Phase 11 design D2, D3, D8.
```

- [ ] **Step 6: Gates**

Run: `npx vitest run && npm run build`
Expected: 222 tests pass; build completes.

- [ ] **Step 7: Commit**

```bash
git add scripts/portrait.mjs public/images/portrait docs/superpowers/specs/2026-09-19-signal-path-design.md BUILD-PLAN.md
git commit -m "feat: the hero still is a cream duotone

Red on a face read as horror, and red means live on this site. The still
is also the particle portrait's source from Phase 11 on."
```

---

### Task 2: The sampler

**Files:**
- Create: `src/lib/gfx/portrait-sample.ts`
- Test: `tests/gfx-portrait-sample.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface BrightnessGrid { width: number; height: number; values: Float32Array } // row-major, 0..1
  export interface PortraitSample {
    count: number;
    homes: Float32Array;      // 2 × count: u, v in 0..1 within the still's box, v down
    brightness: Float32Array; // count: 0..1
    seeds: Float32Array;      // count: 0..1, per-particle drift phase
  }
  export const PORTRAIT_SEED: number;
  export function maskAt(u: number, v: number): number;
  export function samplePortrait(grid: BrightnessGrid, count: number, seed: number): PortraitSample;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
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

  it('records each particle’s brightness from its cell', () => {
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/gfx-portrait-sample.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/portrait-sample`.

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/gfx-portrait-sample.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Full gates and commit**

Run: `npx vitest run && npm run build` — all pass.

```bash
git add src/lib/gfx/portrait-sample.ts tests/gfx-portrait-sample.test.ts
git commit -m "feat: seeded, brightness-weighted portrait sampler

Homes come from the still's own pixels, weighted by the hero mask, in
independent draws so any prefix is a fair thinning for the tiers."
```

---

### Task 3: The dissolve maths

**Files:**
- Create: `src/lib/gfx/portrait-dissolve.ts`
- Test: `tests/gfx-portrait-dissolve.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface PagePoint { x: number; y: number }
  export const DISSOLVE: { readonly window: number; readonly lastArrival: number; readonly bow: number };
  export function dissolveProgress(playheadY: number, restPlayheadY: number, startY: number, heroHeight: number): number;
  export function particleProgress(homeV: number, progress: number): number;
  export function particleAt(home: PagePoint, homeV: number, start: PagePoint, progress: number): PagePoint;
  ```
  `particles.ts` (Task 5) injects `DISSOLVE`'s three numbers into its shader as `#define`s, so the GLSL and this file share their constants.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  DISSOLVE,
  dissolveProgress,
  particleAt,
  particleProgress,
} from '../src/lib/gfx/portrait-dissolve';

const home = { x: 1100, y: 400 };
const start = { x: 450, y: 960 };
const steps = Array.from({ length: 101 }, (_, i) => i / 100);

describe('dissolveProgress', () => {
  it('is 0 at rest and 1 when the playhead reaches the line’s start', () => {
    expect(dissolveProgress(450, 450, 960, 900)).toBe(0);
    expect(dissolveProgress(960, 450, 960, 900)).toBe(1);
    expect(dissolveProgress(705, 450, 960, 900)).toBeCloseTo(0.5, 5);
  });

  it('clamps to 0..1', () => {
    expect(dissolveProgress(300, 450, 960, 900)).toBe(0);
    expect(dissolveProgress(2000, 450, 960, 900)).toBe(1);
  });

  it('floors the range at half the hero, so a very tall window still has a dissolve to scroll', () => {
    // The start sits only 100px below the resting playhead; the range is 450 instead.
    expect(dissolveProgress(775, 700, 800, 900)).toBeCloseTo(75 / 450, 5);
  });

  it('is fully dissolved rather than NaN when there is no range at all', () => {
    expect(dissolveProgress(500, 500, 500, 0)).toBe(1);
  });
});

describe('particleProgress', () => {
  it('is 0 for every particle at p = 0 and 1 for every particle by lastArrival', () => {
    for (const homeV of [0, 0.25, 0.5, 0.75, 1]) {
      expect(particleProgress(homeV, 0)).toBe(0);
      // Close to, not exactly: 0.92 − 0.47 is not 0.45 in binary floating point.
      expect(particleProgress(homeV, DISSOLVE.lastArrival)).toBeCloseTo(1, 9);
      expect(particleProgress(homeV, 1)).toBe(1);
    }
  });

  it('moves the lowest particles first (D9)', () => {
    expect(particleProgress(1, 0.3)).toBeGreaterThan(particleProgress(0.5, 0.3));
    expect(particleProgress(0.5, 0.3)).toBeGreaterThan(particleProgress(0, 0.3));
  });

  it('never moves backwards as p rises, so reversing the scroll retraces it exactly', () => {
    for (const homeV of [0, 0.4, 1]) {
      const values = steps.map((p) => particleProgress(homeV, p));
      values.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(values[i]));
    }
  });
});

describe('particleAt', () => {
  it('is home at p = 0 and on the line’s start at p = 1', () => {
    expect(particleAt(home, 0.3, start, 0)).toEqual(home);
    const arrived = particleAt(home, 0.3, start, 1);
    expect(arrived.x).toBeCloseTo(start.x, 6);
    expect(arrived.y).toBeCloseTo(start.y, 6);
  });

  it('drops before it sweeps left — the bow keeps the stream under the portrait, off the copy', () => {
    // Halfway along its own travel, a particle has covered more of the drop than of the sweep.
    const p = steps.find((step) => particleProgress(0.3, step) >= 0.5)!;
    const mid = particleAt(home, 0.3, start, p);
    const dropShare = (mid.y - home.y) / (start.y - home.y);
    const sweepShare = (home.x - mid.x) / (home.x - start.x);
    expect(dropShare).toBeGreaterThan(sweepShare);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/gfx-portrait-dissolve.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/portrait-dissolve`.

- [ ] **Step 3: Implement**

```ts
/**
 * How the face drains into the line (Phase 11 design D1, D9) — the tested reference for the
 * vertex shader in particles.ts, which implements these same formulas with these same
 * constants (injected as `#define`s, so the two cannot disagree about a number).
 *
 * `p` is the dissolve's progress: 0 with the face whole, 1 as the line begins to draw from the
 * point the particles converged on. It is a pure function of scroll, so the way back up
 * retraces the way down exactly.
 *
 * Pure. Page px throughout, `y` down.
 */

export interface PagePoint {
  x: number;
  y: number;
}

export const DISSOLVE = {
  /** The share of `p` each particle spends travelling. */
  window: 0.45,
  /** Every particle has arrived by this `p`, leaving the last stretch for the hand-off. */
  lastArrival: 0.92,
  /** 0 is a straight line to the start; 1 bends the path to drop first, then sweep. */
  bow: 0.8,
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep01 = (x: number) => x * x * (3 - 2 * x);

/**
 * The 2D reveal's tip is the playhead (`playheadPageY`, playhead.ts): the viewport's centre at
 * scroll 0. The face is gone exactly as that playhead reaches the line's first point. A very
 * tall window can put that point barely below the playhead, so the range is floored at half the
 * hero: the line then starts drawing just before the face has finished leaving (accepted, spec §4).
 */
export function dissolveProgress(
  playheadY: number,
  restPlayheadY: number,
  startY: number,
  heroHeight: number,
): number {
  const range = Math.max(startY - restPlayheadY, heroHeight / 2);
  if (!(range > 0)) return 1;
  return clamp01((playheadY - restPlayheadY) / range);
}

/** A particle's own progress, 0 home … 1 arrived. Lower in the face (`homeV` → 1) leaves first. */
export function particleProgress(homeV: number, progress: number): number {
  const stagger = 1 - homeV;
  const leaves = stagger * (DISSOLVE.lastArrival - DISSOLVE.window);
  return smoothstep01(clamp01((progress - leaves) / DISSOLVE.window));
}

/**
 * A quadratic curve from home to the start. The control point is pulled from the midpoint
 * toward the corner below home, so the stream falls under the portrait before it sweeps left
 * along the hero's bottom edge — away from the headline and the CTAs.
 */
export function particleAt(home: PagePoint, homeV: number, start: PagePoint, progress: number): PagePoint {
  const travelled = particleProgress(homeV, progress);
  const control = {
    x: (home.x + start.x) / 2 + ((home.x - (home.x + start.x) / 2) * DISSOLVE.bow),
    y: (home.y + start.y) / 2 + ((start.y - (home.y + start.y) / 2) * DISSOLVE.bow),
  };
  const rest = 1 - travelled;
  return {
    x: rest * rest * home.x + 2 * rest * travelled * control.x + travelled * travelled * start.x,
    y: rest * rest * home.y + 2 * rest * travelled * control.y + travelled * travelled * start.y,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/gfx-portrait-dissolve.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Full gates and commit**

Run: `npx vitest run && npm run build` — all pass.

```bash
git add src/lib/gfx/portrait-dissolve.ts tests/gfx-portrait-dissolve.test.ts
git commit -m "feat: dissolve maths for the particle portrait

A pure reference for the shader: progress from the 2D playhead, a
bottom-first stagger, and a path that drops before it sweeps to the
line's start."
```

---

### Task 4: The tiers

**Files:**
- Create: `src/lib/gfx/portrait-tier.ts`
- Test: `tests/gfx-portrait-tier.test.ts`

**Interfaces:**
- Consumes: `createFrameWatch(): FrameWatch` and `FrameWatch.push(intervalMs): boolean` from `src/lib/gfx/frame.ts` (unchanged; trips when the median of the last 60 drawn intervals exceeds 25ms; ignores intervals > 100ms).
- Produces:
  ```ts
  export const PORTRAIT_COUNTS: readonly [40000, 20000, 10000];
  export type TierVerdict = 'hold' | 'step' | 'fallBack';
  export interface PortraitTiers { readonly count: number; push(intervalMs: number): TierVerdict }
  export function createPortraitTiers(createWatch?: () => FrameWatch): PortraitTiers;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { createPortraitTiers, PORTRAIT_COUNTS } from '../src/lib/gfx/portrait-tier';

const pushAll = (tiers: ReturnType<typeof createPortraitTiers>, ms: number, n: number) =>
  Array.from({ length: n }, () => tiers.push(ms));

describe('createPortraitTiers', () => {
  it('starts at the full count', () => {
    expect(createPortraitTiers().count).toBe(PORTRAIT_COUNTS[0]);
  });

  it('holds on a healthy 60Hz display, and through one bad frame', () => {
    const tiers = createPortraitTiers();
    const verdicts = [...pushAll(tiers, 16.7, 59), tiers.push(40), ...pushAll(tiers, 16.7, 60)];
    expect(verdicts.every((v) => v === 'hold')).toBe(true);
    expect(tiers.count).toBe(PORTRAIT_COUNTS[0]);
  });

  it('steps down one tier on sustained strain, then judges the new tier from scratch', () => {
    const tiers = createPortraitTiers();
    const first = pushAll(tiers, 30, 60);
    expect(first.slice(0, 59).every((v) => v === 'hold')).toBe(true);
    expect(first[59]).toBe('step');
    expect(tiers.count).toBe(PORTRAIT_COUNTS[1]);
    // A fresh window: 59 more slow frames are not yet a verdict on the 20k tier.
    expect(pushAll(tiers, 30, 59).every((v) => v === 'hold')).toBe(true);
    expect(tiers.push(30)).toBe('step');
    expect(tiers.count).toBe(PORTRAIT_COUNTS[2]);
  });

  it('falls back once the last tier strains too', () => {
    const tiers = createPortraitTiers();
    pushAll(tiers, 30, 120);
    const last = pushAll(tiers, 30, 60);
    expect(last[59]).toBe('fallBack');
    expect(tiers.count).toBe(PORTRAIT_COUNTS[2]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/gfx-portrait-tier.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/portrait-tier`.

- [ ] **Step 3: Implement**

```ts
/**
 * The portrait gets softer before it gets dropped (Phase 11 design D11). The Phase 10 frame
 * watch decides "too slow"; each time it trips, the face thins to the next count and a fresh
 * watch judges the new one. Only the last tier's trip hands the page back to the 2D line.
 *
 * The sampler's output is a fair sample in any prefix (portrait-sample.ts), so a smaller count
 * is `setDrawRange(0, count)` — an even thinning of the same face, not a crop.
 *
 * Pure.
 */

import { createFrameWatch, type FrameWatch } from './frame';

export const PORTRAIT_COUNTS = [40_000, 20_000, 10_000] as const;

export type TierVerdict = 'hold' | 'step' | 'fallBack';

export interface PortraitTiers {
  readonly count: number;
  /** One drawn frame's interval. `step` means `count` just changed. */
  push(intervalMs: number): TierVerdict;
}

export function createPortraitTiers(createWatch: () => FrameWatch = createFrameWatch): PortraitTiers {
  let tier = 0;
  let watch = createWatch();
  return {
    get count() {
      return PORTRAIT_COUNTS[tier];
    },
    push(intervalMs) {
      if (!watch.push(intervalMs)) return 'hold';
      const isLastTier = tier === PORTRAIT_COUNTS.length - 1;
      if (isLastTier) return 'fallBack';
      tier++;
      watch = createWatch();
      return 'step';
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/gfx-portrait-tier.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Full gates and commit**

Run: `npx vitest run && npm run build` — all pass.

```bash
git add src/lib/gfx/portrait-tier.ts tests/gfx-portrait-tier.test.ts
git commit -m "feat: portrait tiers step 40k to 20k to 10k before falling back

The face softens on a strained GPU instead of being dropped at the
first sustained slow window."
```

---

### Task 5: The source and the particles

**Files:**
- Create: `src/lib/gfx/portrait-source.ts`
- Create: `src/lib/gfx/particles.ts`

No unit tests: both touch the DOM or the GPU, and Vitest here is node-only for pure modules (`AGENTS.md`). The maths they use is Tasks 2–3's. This task's gate is the build plus a type-correct, unused export; Task 6 is where they are seen.

**Interfaces:**
- Consumes: `BrightnessGrid`, `PortraitSample` (Task 2); `DISSOLVE` (Task 3).
- Produces:
  ```ts
  // portrait-source.ts
  export const GRID_SIZE: 320;
  export function readPortraitGrid(still: HTMLImageElement): Promise<BrightnessGrid>;

  // particles.ts
  export interface PageBox { x: number; y: number; width: number; height: number }
  export interface PortraitLook { cream: [number, number, number]; signal: [number, number, number] }
  export interface PortraitParticles {
    points: Points;
    setBox(box: PageBox): void;
    setStart(x: number, y: number): void;
    setProgress(progress: number): void;
    setPointer(x: number, y: number, strength: number): void;
    setTime(seconds: number): void;
    setPixelRatio(ratio: number): void;
    setCount(count: number): void;
    dispose(): void;
  }
  export function createPortraitParticles(sample: PortraitSample, look: PortraitLook): PortraitParticles;
  ```

- [ ] **Step 1: Write `portrait-source.ts`**

```ts
/**
 * The particles' source is the still the page already shows (Phase 11 design D8): its own
 * pixels, read once after load. No baked sample data, no second request.
 *
 * Drawn at a fixed 320×320 whatever the browser picked from the `srcset` — AVIF or WebP or
 * JPEG, 640 or 1280 — so the sample is the same face on every display. The mask on
 * `.hero__face` is CSS and does not reach `drawImage`; the sampler applies it (`maskAt`).
 */

import type { BrightnessGrid } from './portrait-sample';

export const GRID_SIZE = 320;

/**
 * The still dissolves to `--ground`, which reads ~10 on every channel. Below that is ground,
 * not picture, and must weigh nothing.
 */
const GROUND_LEVEL = 10;

export async function readPortraitGrid(still: HTMLImageElement): Promise<BrightnessGrid> {
  await still.decode();
  const canvas = document.createElement('canvas');
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('no 2D context to read the portrait');
  context.drawImage(still, 0, 0, GRID_SIZE, GRID_SIZE);
  const { data } = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE);

  const values = new Float32Array(GRID_SIZE * GRID_SIZE);
  for (let i = 0; i < values.length; i++) {
    const level = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    values[i] = Math.min(1, Math.max(0, (level - GROUND_LEVEL) / (255 - GROUND_LEVEL)));
  }
  return { width: GRID_SIZE, height: GRID_SIZE, values };
}
```

- [ ] **Step 2: Write `particles.ts`**

```ts
/**
 * The portrait as GPU particles (Phase 11): one `Points`, one shader, every motion in the
 * vertex stage — the dissolve (portrait-dissolve.ts is its tested reference, and its constants
 * are injected here as defines), the cream → red shift as a particle joins the line (D5), idle
 * drift (D7) and the cursor's push (D6). The scene only sets uniforms.
 *
 * World units are CSS px on the page plane, `y` negated (camera.ts) — the same space as the
 * tube, so the stream lands on the line's first point exactly.
 */

import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { DISSOLVE } from './portrait-dissolve';
import type { PortraitSample } from './portrait-sample';

export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PortraitLook {
  /** `--type` as 0..1 channels (tube-mesh.ts `hexToRgb`). */
  cream: [number, number, number];
  /** `--signal` as 0..1 channels. */
  signal: [number, number, number];
}

export interface PortraitParticles {
  points: Points;
  /** The still's box, page px. */
  setBox(box: PageBox): void;
  /** The line's first point, page px. */
  setStart(x: number, y: number): void;
  /** Dissolve progress, 0..1 (portrait-dissolve.ts `dissolveProgress`). */
  setProgress(progress: number): void;
  /** Page px; `strength` 0..1 eases the push in and out. */
  setPointer(x: number, y: number, strength: number): void;
  setTime(seconds: number): void;
  setPixelRatio(ratio: number): void;
  /** How many of the sample to draw — a prefix is an even thinning (portrait-tier.ts). */
  setCount(count: number): void;
  dispose(): void;
}

/** Tuned at the checkpoint with Noel. CSS px unless stated. */
const LOOK = {
  sizePx: 2,
  driftPx: 1.5,
  /** Radians per second. */
  driftSpeed: 0.6,
  pushRadiusPx: 80,
  pushPx: 18,
};

const glslFloat = (value: number) => value.toFixed(4);

const VERTEX = /* glsl */ `
  uniform vec4 uBox;
  uniform vec2 uStart;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec2 aHome;
  attribute float aBright;
  attribute float aSeed;
  varying float vTravelled;
  varying float vAlpha;

  void main() {
    vec2 home = uBox.xy + aHome * uBox.zw;

    // portrait-dissolve.ts particleProgress — keep the two identical.
    float leaves = (1.0 - aHome.y) * (LAST_ARRIVAL - WINDOW);
    float travelled = smoothstep(0.0, 1.0, clamp((uProgress - leaves) / WINDOW, 0.0, 1.0));

    // portrait-dissolve.ts particleAt.
    vec2 middle = (home + uStart) * 0.5;
    vec2 control = middle + (vec2(home.x, uStart.y) - middle) * BOW;
    float rest = 1.0 - travelled;
    vec2 page = rest * rest * home + 2.0 * rest * travelled * control + travelled * travelled * uStart;

    float phase = aSeed * 6.2831853;
    page += DRIFT_PX * rest * vec2(sin(uTime * DRIFT_SPEED + phase), cos(uTime * DRIFT_SPEED * 0.83 + phase * 1.7));

    vec2 away = page - uPointer;
    float distance = length(away);
    float push = uPointerStrength * rest * (1.0 - smoothstep(0.0, PUSH_RADIUS, distance));
    if (distance > 0.001) page += normalize(away) * PUSH_PX * push;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(page.x, -page.y, 0.0, 1.0);
    gl_PointSize = SIZE_PX * mix(0.6 + 0.6 * aBright, 0.5, travelled) * uPixelRatio;
    vTravelled = travelled;
    vAlpha = (0.35 + 0.65 * aBright) * (1.0 - smoothstep(0.8, 1.0, travelled));
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uCream;
  uniform vec3 uSignal;
  varying float vTravelled;
  varying float vAlpha;

  void main() {
    float radius = length(gl_PointCoord - 0.5);
    if (radius > 0.5) discard;
    float edge = 1.0 - smoothstep(0.35, 0.5, radius);
    // Cream at home, the signal's red by the time it joins the line (D5).
    vec3 color = mix(uCream, uSignal, smoothstep(0.15, 0.7, vTravelled));
    gl_FragColor = vec4(color, vAlpha * edge);
  }
`;

export function createPortraitParticles(sample: PortraitSample, look: PortraitLook): PortraitParticles {
  const geometry = new BufferGeometry();
  geometry.setAttribute('aHome', new BufferAttribute(sample.homes, 2));
  geometry.setAttribute('aBright', new BufferAttribute(sample.brightness, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(sample.seeds, 1));
  // Three needs a `position` to size the draw; the shader never reads it.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(sample.count * 3), 3));

  const uniforms = {
    uBox: { value: new Vector4() },
    uStart: { value: new Vector2() },
    uProgress: { value: 0 },
    uPointer: { value: new Vector2(-1e5, -1e5) },
    uPointerStrength: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uCream: { value: new Vector3(...look.cream) },
    uSignal: { value: new Vector3(...look.signal) },
  };

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: {
      WINDOW: glslFloat(DISSOLVE.window),
      LAST_ARRIVAL: glslFloat(DISSOLVE.lastArrival),
      BOW: glslFloat(DISSOLVE.bow),
      SIZE_PX: glslFloat(LOOK.sizePx),
      DRIFT_PX: glslFloat(LOOK.driftPx),
      DRIFT_SPEED: glslFloat(LOOK.driftSpeed),
      PUSH_RADIUS: glslFloat(LOOK.pushRadiusPx),
      PUSH_PX: glslFloat(LOOK.pushPx),
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const points = new Points(geometry, material);
  // The shader moves every vertex; Three's bounds would be of the unused `position` buffer.
  points.frustumCulled = false;
  // Drawn after the tube's glow (renderOrder 1), so a particle arriving on the line sits on it.
  points.renderOrder = 2;

  return {
    points,
    setBox: (box) => uniforms.uBox.value.set(box.x, box.y, box.width, box.height),
    setStart: (x, y) => uniforms.uStart.value.set(x, y),
    setProgress(progress) {
      uniforms.uProgress.value = progress;
      // Fully dissolved, every particle sits on the start at zero alpha: skip the draw.
      points.visible = progress < 1;
    },
    setPointer(x, y, strength) {
      uniforms.uPointer.value.set(x, y);
      uniforms.uPointerStrength.value = strength;
    },
    setTime: (seconds) => {
      uniforms.uTime.value = seconds;
    },
    setPixelRatio: (ratio) => {
      uniforms.uPixelRatio.value = ratio;
    },
    setCount: (count) => geometry.setDrawRange(0, Math.min(count, sample.count)),
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
```

- [ ] **Step 3: Gates**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build completes. Nothing imports these modules yet, so the enhanced chunk does not move — confirm with `npm run budget` (base JS on `/` 63,151).

- [ ] **Step 4: Commit**

```bash
git add src/lib/gfx/portrait-source.ts src/lib/gfx/particles.ts
git commit -m "feat: portrait source and GPU particles

Reads the still's own pixels into a brightness grid, and draws a sample
as one Points whose shader carries the dissolve, colour, drift and push."
```

---

### Task 6: The portrait in the scene

**Files:**
- Modify: `src/lib/gfx/scene.ts`
- Modify: `src/components/Hero.astro` (the `<img>`, the file header, the portrait CSS)
- Modify: `docs/superpowers/specs/2026-09-19-signal-path-design.md` §9.01 (Hero)

**Interfaces:**
- Consumes: `readPortraitGrid` (Task 5), `samplePortrait`, `PORTRAIT_SEED` (Task 2), `dissolveProgress` (Task 3), `createPortraitTiers`, `PORTRAIT_COUNTS` (Task 4), `createPortraitParticles`, `PortraitParticles` (Task 5); existing `playheadPageY(t, docHeight, viewportHeight)` from `src/lib/signal/playhead.ts`; existing `onSignalGeometry`, `onPageProgress`, `hexToRgb`, `onHandBack`, `schedule`, `watch`, `render`, `fallBack` inside `loadEnhanced`.
- Produces: the DOM contract `img[data-portrait-still]` inside `#hero`, and the state class `hero--particles` on `#hero`.

- [ ] **Step 1: `Hero.astro` — the hook and the fade**

On the `<img class="hero__face" …>`, add the attribute `data-portrait-still`.

In the `<style>` block, add after the `.hero__face` rule:

```css
  /* Phase 11: once the particles are drawn over it, the still fades out (design D10). Opacity,
     not display: the box stays, because the particles are placed on it and re-measure it on
     every resize. A one-off state change, not choreography — the scroll still drives all of
     the motion. */
  .hero__face {
    transition: opacity 400ms ease-out;
  }

  .hero--particles .hero__face {
    opacity: 0;
  }
```

In the file header, replace "Particles replace the still in Phase 11." with "On a capable desktop, Phase 11's particles are sampled from this still's pixels and drawn over it (`src/lib/gfx/scene.ts`); `hero--particles` then fades it out."

- [ ] **Step 2: `scene.ts` — imports and module constants**

Add to the imports:

```ts
import { playheadPageY } from '../signal/playhead';
import { createPortraitParticles, type PortraitParticles } from './particles';
import { dissolveProgress } from './portrait-dissolve';
import { PORTRAIT_SEED, samplePortrait } from './portrait-sample';
import { readPortraitGrid } from './portrait-source';
import { createPortraitTiers, PORTRAIT_COUNTS, type PortraitTiers } from './portrait-tier';
```

Add beside `MAX_PIXEL_RATIO`:

```ts
/** Per drawn frame: how far the pushed field's centre and strength close on the real pointer. */
const POINTER_EASE = 0.18;

const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn) : setTimeout(fn, 0);
```

- [ ] **Step 3: `scene.ts` — portrait state, read by the draw**

Inside `loadEnhanced`, directly after `const reducedMotion = …`, add:

```ts
  // The portrait (Phase 11) — null until it has sampled, and again after it is dropped.
  let portrait: PortraitParticles | null = null;
  let tiers: PortraitTiers | null = null;
  let pageProgress = 0;
  // Client px, so a page that scrolls under a still mouse moves the push with it. `hasMoved`
  // lets the first move place the eased centre outright instead of sweeping it in from nowhere.
  const pointer = { clientX: 0, clientY: 0, isInWindow: false, hasMoved: false, easedX: 0, easedY: 0, strength: 0 };
  const portraitFrame = {
    start: { x: 0, y: 0 },
    heroTop: 0,
    heroBottom: 0,
    heroHeight: 0,
    docHeight: 0,
    viewportHeight: 0,
  };

  /** Everything the portrait's uniforms need for this frame; called just before `render()`. */
  function updatePortrait(): void {
    if (!portrait) return;
    const { start, heroHeight, docHeight, viewportHeight } = portraitFrame;
    const playheadY = playheadPageY(pageProgress, docHeight, viewportHeight);
    const restPlayheadY = playheadPageY(0, docHeight, viewportHeight);
    portrait.setProgress(dissolveProgress(playheadY, restPlayheadY, start.y, heroHeight));
    portrait.setTime(gsap.ticker.time);
    const pageX = pointer.clientX + window.scrollX;
    const pageY = pointer.clientY + window.scrollY;
    const isOverHero =
      pointer.isInWindow && pointer.hasMoved && pageY >= portraitFrame.heroTop && pageY <= portraitFrame.heroBottom;
    pointer.strength += ((isOverHero ? 1 : 0) - pointer.strength) * POINTER_EASE;
    pointer.easedX += (pageX - pointer.easedX) * POINTER_EASE;
    pointer.easedY += (pageY - pointer.easedY) * POINTER_EASE;
    portrait.setPointer(pointer.easedX, pointer.easedY, pointer.strength);
  }
```

- [ ] **Step 4: `scene.ts` — the draw: tiers, and a portrait that fails alone**

Replace the `draw` option of `createRenderSchedule` with:

```ts
    draw: (sinceLastDrawMs) => {
      let tripped = false;
      if (isLive && sinceLastDrawMs !== null) {
        if (tiers && portrait) {
          const verdict = tiers.push(sinceLastDrawMs);
          if (verdict === 'step') portrait.setCount(tiers.count);
          tripped = verdict === 'fallBack';
        } else {
          tripped = watch.push(sinceLastDrawMs);
        }
      }
      if (!checkHealth(tripped)) return;
      try {
        updatePortrait();
      } catch {
        dropPortrait();
      }
      render();
    },
```

Replace the existing `onPageProgress(() => schedule.markDirty()),` entry in the `onHandBack(…)` call with:

```ts
    onPageProgress((t) => {
      pageProgress = t;
      schedule.markDirty();
    }),
```

- [ ] **Step 5: `scene.ts` — mounting and dropping the portrait**

Add these two functions inside `loadEnhanced`, after `whileLive` is defined:

```ts
  /** Undo everything `mountPortrait` did; the still fades back. The tube is untouched. */
  let unmountPortrait: (() => void) | null = null;
  function dropPortrait(): void {
    unmountPortrait?.();
    unmountPortrait = null;
    schedule.markDirty();
  }

  /**
   * After the tube is live, in an idle callback: sample the still, put the particles on it, then
   * fade the still. Any failure here leaves the still and the tube exactly as they were (design
   * §5) — the portrait never hands the tube back.
   */
  async function mountPortrait(hero: HTMLElement, still: HTMLImageElement): Promise<void> {
    let particles: PortraitParticles;
    try {
      const grid = await readPortraitGrid(still);
      if (!canvas.isConnected) return;
      particles = createPortraitParticles(samplePortrait(grid, PORTRAIT_COUNTS[0], PORTRAIT_SEED), {
        cream: hexToRgb(tokens.getPropertyValue('--type')),
        signal: hexToRgb(tokens.getPropertyValue('--signal')),
      });
    } catch {
      return;
    }

    // Layout reads, kept out of the draw: the box, the hero, the document and the viewport.
    const measure = () => {
      const box = still.getBoundingClientRect();
      particles.setBox({ x: box.left + window.scrollX, y: box.top + window.scrollY, width: box.width, height: box.height });
      particles.setPixelRatio(renderer.getPixelRatio());
      const heroBox = hero.getBoundingClientRect();
      portraitFrame.heroTop = heroBox.top + window.scrollY;
      portraitFrame.heroBottom = heroBox.bottom + window.scrollY;
      portraitFrame.heroHeight = heroBox.height;
      portraitFrame.docHeight = document.documentElement.scrollHeight;
      portraitFrame.viewportHeight = window.innerHeight;
      schedule.markDirty();
    };

    let heroVisible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
    });
    visibility.observe(hero);

    // The drift loop (design D7): dirty every tick while the hero is on screen and the tab is
    // visible. Appended after the schedule's own listener, so it draws on the following tick.
    const keepDrifting = () => {
      if (heroVisible && !document.hidden) schedule.markDirty();
    };
    gsap.ticker.add(keepDrifting);

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.isInWindow = true;
      if (!pointer.hasMoved) {
        pointer.hasMoved = true;
        pointer.easedX = event.clientX + window.scrollX;
        pointer.easedY = event.clientY + window.scrollY;
      }
    };
    const onPointerLeave = () => {
      pointer.isInWindow = false;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', measure);
    const stopGeometry = onSignalGeometry((geometry) => {
      const first = geometry.points[0];
      if (first) portraitFrame.start = { x: first.x, y: first.y };
      if (first) particles.setStart(first.x, first.y);
      measure();
    });

    unmountPortrait = () => {
      stopGeometry();
      window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      gsap.ticker.remove(keepDrifting);
      visibility.disconnect();
      scene.remove(particles.points);
      particles.dispose();
      hero.classList.remove('hero--particles');
      portrait = null;
      tiers = null;
    };
    onHandBack(() => unmountPortrait?.());

    tiers = createPortraitTiers();
    particles.setCount(tiers.count);
    scene.add(particles.points);
    portrait = particles;
    measure();
    try {
      updatePortrait();
      render();
    } catch {
      dropPortrait();
      return;
    }
    // The particles are on screen under the still; now the still can go (D10).
    hero.classList.add('hero--particles');
  }
```

`onHandBack` runs a cleanup registered after a hand-back at once, so a fallback that lands while `readPortraitGrid` is awaiting still unmounts — the `canvas.isConnected` check after the await stops the mount before anything is added.

- [ ] **Step 6: `scene.ts` — start it after the tube is live**

At the very end of `loadEnhanced`, after `canvas.classList.add('signal-canvas--on');`, add:

```ts
  // Phase 11: the portrait follows the tube and never delays it.
  const hero = document.getElementById('hero');
  const still = hero?.querySelector<HTMLImageElement>('img[data-portrait-still]');
  if (hero && still) whenIdle(() => void mountPortrait(hero, still));
```

- [ ] **Step 7: Parent spec §9.01 — the choreography**

In `docs/superpowers/specs/2026-09-19-signal-path-design.md` §9.01, replace the paragraph beginning "The 3960×3960 portrait is sampled into approximately 40,000 GPU particles" through the end of the *Holding note* paragraph with:

```markdown
The 3960×3960 photograph is baked into a cream duotone still (§10), and on a capable desktop
the still's own pixels are sampled into approximately 40,000 GPU particles. At rest they hold
the face, drifting faintly, and the cursor pushes through them. On scroll the face dissolves
from the bottom up into a stream that pours down to the point at the hero's bottom edge where
the line begins, turning from cream to signal red as it joins it; the face is gone exactly as
the line starts to draw. Scrolling back rebuilds it. The face is the line's source, not its
destination (Phase 11 design, 2026-10-03).
```

And replace the **Fallback** line with:

```markdown
**Fallback:** the cream duotone still, baked at build time with `sharp`, on mobile,
reduced-motion, or when the WebGL gate (§12) fails. It is also the particles' only source.
```

- [ ] **Step 8: Gates**

Run: `npx vitest run && npm run build && npm run budget`
Expected: all tests pass; build completes; base JS on `/` is **63,151** (unchanged); the enhanced chunk is ≤ 256,000 and its delta from 132,276 is recorded in the commit body.

- [ ] **Step 9: Smoke check in a browser**

Run: `npm run build && npx astro preview` and open `http://localhost:4321/?signal=tube` at ≥ 1280px wide. Confirm: the still fades to particles in the same place; scrolling drains the face down and left into the line's start, cream turning red; scrolling up rebuilds it; moving the mouse over the face pushes particles aside. Open `/?signal=2d`: the cream still, no canvas. Report what you saw; screenshots are welcome but not required.

- [ ] **Step 10: Commit**

```bash
git add src/lib/gfx/scene.ts src/components/Hero.astro docs/superpowers/specs/2026-09-19-signal-path-design.md
git commit -m "feat: the particle portrait in the hero

Mounted after the tube is live, from the still's own pixels; dissolves
into the line's start on scroll, drifts while the hero is visible, steps
down in count before falling back, and fails alone. Enhanced chunk: <n>
gzip (+<delta>)."
```

---

### Task 7: Verification and figures (controller, with Noel)

Run by the controller, not an implementer subagent: it needs the browser, judgement and Noel.

**Files:**
- Modify: `BUILD-PLAN.md` (Performance figures; Known Gaps if anything is parked)
- Modify, only if a check fails and the fix is a constant: `src/lib/gfx/particles.ts` `LOOK`, `src/lib/gfx/portrait-dissolve.ts` `DISSOLVE`, `src/lib/gfx/portrait-sample.ts` `WEIGHT_GAMMA`

- [ ] **Step 1: Geometry checks at 1440, 1280 and 900 wide** (`?signal=tube`)
  - The rest-state face sits on the still's box; the fade shifts nothing.
  - Scrolling slowly, the stream never crosses the H1 or the CTA row at full strength. If it does, raise `DISSOLVE.bow` toward 1 and re-check; the Task 3 bow test must still pass.
  - The line visibly begins from the point the particles converged on.
  - Scrolling back to the top rebuilds the face exactly.
  - After a resize from 1440 → 1000 → 1440, the face is still on the box and the stream still lands on the start.

- [ ] **Step 2: Paths that must show the still** — `?signal=2d`; DevTools reduced-motion emulation (a mid-visit switch must fade the still back); 390px wide; `/websites` and `/404` (no portrait work at all).

- [ ] **Step 3: Tier check** — with a local, uncommitted edit that passes `30` instead of `sinceLastDrawMs` to `tiers.push` in `scene.ts`'s draw (DevTools CPU throttling does not reliably slow the GPU); confirm the face thins evenly at each step and the last step hands back to the still and the 2D line. Revert any local edit.

- [ ] **Step 4: Figures** — `npm run budget` (base JS on `/` must equal `master`'s 63,151; record the enhanced chunk); preview LCP ×3 on this branch and ×3 on `master`, interleaved, as Phase 10 did (`BUILD-PLAN.md` → Performance → LCP). The branch must not be worse than `master` beyond run-to-run noise (~±50ms), because the still is still the LCP element and nothing changes before `load`. Record both in `BUILD-PLAN.md`'s Performance table.

- [ ] **Step 5: Checkpoint with Noel** on his desktop: the likeness and feel at rest; the dissolve's pace and order; drift and push amounts; the Phase 10 60Hz check (5s+ trackpad scroll over the hero, no `signal-tube-fallback` key in sessionStorage). Constant changes he asks for go in one `chore:` commit with the before/after values in its body.

- [ ] **Step 6: Commit**

```bash
git add BUILD-PLAN.md
git commit -m "docs: Phase 11 figures"
```
