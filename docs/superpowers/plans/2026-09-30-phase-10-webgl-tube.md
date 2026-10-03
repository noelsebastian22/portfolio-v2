# Phase 10 — WebGL Gate + Signal Tube Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On capable desktops, replace the flat SVG signal with a lit Three.js tube that rises from real depth in the hero and lies pixel-exact on the page below it; everyone else keeps today's 2D line.

**Architecture:** The SVG renderer keeps running and gains one published message, the line's geometry in page pixels. A tiny gate in the base bundle decides after `load` whether to `import()` the scene. The scene draws a custom tube mesh through the published points with a perspective camera whose `z = 0` plane maps 1:1 to CSS pixels, redraws only when the scroll or the tip moves, and hands back to the SVG, one way, on any trouble.

**Tech Stack:** Astro 5 (static), vanilla TypeScript, Three.js 0.186 (`three` is already a dependency), Vitest (pure modules, node environment), GSAP ticker via `onPageProgress`.

**Spec:** `docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md` (parent: `docs/superpowers/specs/2026-09-19-signal-path-design.md` §6, §12). Read both before starting any task.

## Global Constraints

- Read `AGENTS.md` first. Its hard rules apply to every task.
- **No UI framework.** No React, Preact, Vue, Svelte, Tailwind.
- **One canonical curve.** `src/lib/signal/path.ts` is the only place geometry is defined. Nothing in this plan re-samples or re-interpolates the curve. The tube is built from the points `svg-signal.ts` already draws.
- **Astro renders content; islands only add behaviour.** The canvas is decorative: `aria-hidden="true"`, `pointer-events: none`.
- **The scroll is the transport.** No free-running render loop. Redraw on scroll, tip or geometry change only. The one exception is the 300ms crossfade in spec §6 step 5.
- **Palette, exact:** `--signal #FF4B54`. The dim rule uses `--signal-dim-alpha` (0.15). The stroke is `--signal-stroke` (4px). Read them from computed style at runtime and never hard-code them in the scene.
- **Performance budget:** base-path JS ≤ 81,920 bytes gzip on `/` (`npm run budget`). The enhanced WebGL chunk is ≤ 256,000 bytes gzip (250KB), post-interactive, never in an initial chunk. LCP must not move.
- **Gate, all required (spec §12):** `prefers-reduced-motion: no-preference`, viewport ≥ 900px, `navigator.connection.saveData !== true`, `navigator.hardwareConcurrency >= 4`, WebGL2 available, frame probe passes.
- **Code style:** descriptive names, complex conditions extracted into named booleans, comment *why* not *what*, match the density and idiom of neighbouring files (`src/lib/signal/*.ts` is the reference).
- **Gates before every commit:** `npx vitest run` and `npm run build` both pass.
- **Commits:** one per task, `feat:`/`test:`/`chore:` prefix, message body says why. **Add no `Co-Authored-By` or other trailer**; the controller normalises attribution. Do not push. Do not edit `docs/SESSIONS.md`.

## Review Focus

1. **Pages without the hero (`/websites`, `/404`)** use the same `BaseLayout` and must never load the tube; the gate returns `no-hero`. (Task 2.)
2. **Resizing a window below 900px mid-visit** must hand back to the 2D line, not leave a desktop tube on a narrow layout. (Task 4, `shouldFallBack`.)
3. **A backgrounded tab during the frame probe** pauses `requestAnimationFrame`, and one huge interval must not be read as a slow GPU. The verdict is `inconclusive`, and the probe retries when the tab is visible. (Task 4.)
4. **The document changing height after the tube is built** (fonts, images) re-measures the SVG. The tube must follow the second geometry message, and a subscriber that arrives late gets the latest geometry. (Task 1.)
5. **Reloading mid-page** (restored scroll position) must put the camera on the right CSS pixels at a large `scrollY`, not only at the top. (Task 3.)

---

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/lib/signal/tip.ts` | 1 | + geometry channel (`SignalGeometry`, `publishSignalGeometry`, `onSignalGeometry`, `signalGeometry`) |
| `src/lib/signal/gutter.ts` | 1 | + `strengthAt(stops, height, y)` |
| `src/lib/signal/svg-signal.ts` | 1 | publishes geometry on every re-measure |
| `src/lib/gfx/gate.ts` | 2 | `checkCapability`, `forcedMode`, `readEnvironment`, `rememberFallback` |
| `src/lib/gfx/camera.ts` | 3 | `cameraRig`, `heroDepthFor` |
| `src/lib/gfx/frame.ts` | 4 | `probeVerdict`, `createFrameWatch`, `shouldFallBack` |
| `src/lib/gfx/tube-mesh.ts` | 5 | `heroWeight`, `radiusAt`, `worldPoint`, `buildTube`, `pointAtLength`, `hexToRgb` |
| `scripts/lib/budget.mjs`, `scripts/budget.mjs` | 6 | three-in-initial-graph guard, enhanced-chunk report |
| `src/lib/signal/tube-signal.ts` | 7 | Three.js meshes + shaders from `buildTube` output |
| `src/lib/gfx/scene.ts` | 7 | `loadEnhanced`: renderer, camera, probe, swap, watchdog, fallback |
| `src/layouts/BaseLayout.astro`, `src/styles/global.css` | 7 | gate wiring after `load`; canvas and swap CSS |
| `tests/signal-geometry.test.ts` | 1 | channel + `strengthAt` |
| `tests/gfx-gate.test.ts` | 2 | |
| `tests/gfx-camera.test.ts` | 3 | |
| `tests/gfx-frame.test.ts` | 4 | |
| `tests/gfx-tube-mesh.test.ts` | 5 | |
| `tests/budget.test.ts` | 6 | + `containsThree` |

Reference layout used by several tests: the real 1440 page's knots, already in `tests/signal-anchors.test.ts` as `REFERENCE_LAYOUTS[0]`:
`width 1425, seamPixels [65, 923.4, 1975.9, 4762.1, 6041.9, 7239.9, 8494.9], anchors [2435, 4589.3, 5223.2]`.

---

### Task 1: The geometry channel

**Files:**
- Modify: `src/lib/signal/tip.ts` (append after `publishSignalCurve`)
- Modify: `src/lib/signal/gutter.ts` (append after `strengthStops`)
- Modify: `src/lib/signal/svg-signal.ts` (`applyStrength` returns its stops, `measureAndDraw` publishes)
- Modify: `docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md` §4.1 (add `curveY`)
- Test: `tests/signal-geometry.test.ts` (create)

**Interfaces:**
- Produces:
  ```ts
  // tip.ts
  export interface SignalGeometryPoint { x: number; y: number; z: number; curveY: number }
  export interface SignalGeometry {
    points: readonly SignalGeometryPoint[]; // page px; z and curveY straight from path.ts samples
    lengths: readonly number[];             // cumulative px along the line
    strength: readonly number[];            // 0 dim … 1 full, per point
  }
  export function signalGeometry(): SignalGeometry | null;
  export function onSignalGeometry(fn: (geometry: SignalGeometry) => void): () => void;
  export function publishSignalGeometry(geometry: SignalGeometry): void;
  // gutter.ts
  export function strengthAt(stops: readonly StrengthStop[], height: number, y: number): number;
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/signal-geometry.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/signal-geometry.test.ts`
Expected: FAIL — `strengthAt` / `onSignalGeometry` are not exported.

- [ ] **Step 3: Implement the channel**

Append to `src/lib/signal/tip.ts`, and add a third bullet to the module comment's "Two things are published" list (make it "Three things"): *the **geometry** — the line's points, lengths and dim-rule strength, for the Phase 10 tube, which paints over the SVG instead of measuring anything itself.*

```ts
/** One drawn point, in page px, with the curve's own `z` and normalised `y` beside it. */
export interface SignalGeometryPoint {
  x: number;
  y: number;
  z: number;
  curveY: number;
}

/**
 * The line exactly as the SVG renderer has just drawn it — so a second renderer paints the
 * same points rather than re-sampling `path.ts` or re-measuring the sections.
 */
export interface SignalGeometry {
  points: readonly SignalGeometryPoint[];
  /** Cumulative length along the line at each point, px. */
  lengths: readonly number[];
  /** The dim rule per point: 0 dim … 1 full strength, from the same stops as the gradient. */
  strength: readonly number[];
}

let currentGeometry: SignalGeometry | null = null;
const geometryListeners = new Set<(geometry: SignalGeometry) => void>();

/** The latest geometry, or `null` before the renderer has measured. */
export function signalGeometry(): SignalGeometry | null {
  return currentGeometry;
}

/**
 * Calls `fn` with every new geometry, and once immediately with the latest — the tube loads
 * long after the first measure, and must not wait for a resize to see the line.
 */
export function onSignalGeometry(fn: (geometry: SignalGeometry) => void): () => void {
  geometryListeners.add(fn);
  if (currentGeometry !== null) fn(currentGeometry);
  return () => {
    geometryListeners.delete(fn);
  };
}

/** Renderer-only: publishes the geometry it has just drawn. */
export function publishSignalGeometry(geometry: SignalGeometry): void {
  currentGeometry = geometry;
  for (const fn of geometryListeners) fn(geometry);
}
```

Append to `src/lib/signal/gutter.ts`:

```ts
/**
 * The strength at pixel `y`: 0 dim … 1 full, read off `strengthStops` exactly as an SVG
 * gradient interpolates them — linearly between neighbours, the later stop winning a tie.
 * The tube carries this per vertex, so it dims exactly where the SVG line dims.
 */
export function strengthAt(stops: readonly StrengthStop[], height: number, y: number): number {
  if (!(height > 0) || stops.length === 0) return 0;
  const offset = Math.min(1, Math.max(0, y / height));
  const level = (stop: StrengthStop): number => (stop.full ? 1 : 0);

  for (let i = 1; i < stops.length; i++) {
    const [before, after] = [stops[i - 1], stops[i]];
    if (offset > after.offset) continue;
    const span = after.offset - before.offset;
    if (!(span > 0)) return level(after);
    return level(before) + ((level(after) - level(before)) * (offset - before.offset)) / span;
  }
  return level(stops[stops.length - 1]);
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/signal-geometry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Publish from the SVG renderer**

In `src/lib/signal/svg-signal.ts`:

1. Import: add `publishSignalGeometry` to the `./tip` import, and `strengthAt, type StrengthStop` to the `./gutter` import.
2. Make `applyStrength` return the stops it wrote. Change its signature to `): StrengthStop[] {` and its body to:

```ts
    const bands = gutter ? gutterBands(pixelPoints, gutter) : [];
    const stops = strengthStops(bands, height, BAND_FADE_PX);
    gradient.setAttribute('y2', String(height));
    gradient.replaceChildren(
      ...stops.map(({ offset, full }) => {
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', String(offset));
        stop.style.stopColor = 'var(--signal)';
        stop.style.stopOpacity = full ? '1' : 'var(--signal-dim-alpha)';
        return stop;
      }),
    );
    return stops;
```

3. In `measureAndDraw`, replace the `applyStrength(...)` call line with:

```ts
    const stops = applyStrength(pixelPoints, measureGutter(sectionTops[gutterIndex] ?? null), height);

    // For the Phase 10 tube (tip.ts): the same points, in page px, with each point's curve
    // z and y carried beside it. Before the reduced-motion return like the dim rule — the
    // geometry is the line, not its motion.
    const boxLeftInPage = boxRect.left + window.scrollX;
    publishSignalGeometry({
      points: pixelPoints.map((p, i) => ({
        x: boxLeftInPage + p.x,
        y: boxTopInPage + p.y,
        z: points[i].z,
        curveY: points[i].y,
      })),
      lengths: lengthTable,
      strength: pixelPoints.map((p) => strengthAt(stops, height, p.y)),
    });
```

`points` is the renderer's own `sampleWholeCurve()` result (same length as `pixelPoints`), so nothing is re-sampled.

- [ ] **Step 6: Amend the design doc**

In `docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md` §4.1, change the `points` line of the interface to
`points: readonly { x: number; y: number; z: number; curveY: number }[];` and extend its comment:
`/** Page-pixel points — the same samples the SVG path is drawn through — with the curve's own z and normalised y (curveY), which the tube's hero profile reads. */`

- [ ] **Step 7: Full gates and budget**

Run: `npx vitest run && npm run build && npm run budget`
Expected: all tests pass; build green; `/` total reported. Note the number: it should rise by well under 1KB from 61,772.

- [ ] **Step 8: Commit**

```bash
git add src/lib/signal/tip.ts src/lib/signal/gutter.ts src/lib/signal/svg-signal.ts tests/signal-geometry.test.ts docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md
git commit -m "feat: signal geometry channel for the Phase 10 tube" -m "The SVG renderer publishes the points it has just drawn, in page px, with each point's curve z and y and its dim-rule strength, so the tube paints the same line instead of re-sampling path.ts or re-measuring the sections."
```

---

### Task 2: The capability gate

**Files:**
- Create: `src/lib/gfx/gate.ts`
- Test: `tests/gfx-gate.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SignalMode = '2d' | 'tube' | null;
  export interface Environment {
    reducedMotion: boolean; viewportWidth: number; saveData: boolean;
    hardwareConcurrency: number; hasHero: boolean; fallbackRemembered: boolean;
    webgl2: () => boolean; // lazy: creates a context, so it runs last
  }
  export interface Capability { enabled: boolean; reason?: string; skipProbe: boolean }
  export const MIN_VIEWPORT_WIDTH = 900;
  export const MIN_CORES = 4;
  export const FALLBACK_KEY = 'signal-tube-fallback';
  export function forcedMode(search: string): SignalMode;
  export function checkCapability(env: Environment, mode: SignalMode): Capability;
  export function readEnvironment(): Environment;   // DOM reader, not unit-tested
  export function rememberFallback(): void;         // sessionStorage, try/catch
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/gfx-gate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkCapability, forcedMode, type Environment } from '../src/lib/gfx/gate';

const capable: Environment = {
  reducedMotion: false,
  viewportWidth: 1440,
  saveData: false,
  hardwareConcurrency: 8,
  hasHero: true,
  fallbackRemembered: false,
  webgl2: () => true,
};

describe('checkCapability', () => {
  it('enables the tube when every condition passes, with the probe', () => {
    expect(checkCapability(capable, null)).toEqual({ enabled: true, skipProbe: false });
  });

  it.each([
    ['reduced-motion', { reducedMotion: true }],
    ['narrow-viewport', { viewportWidth: 899 }],
    ['save-data', { saveData: true }],
    ['few-cores', { hardwareConcurrency: 2 }],
    ['fell-back-this-session', { fallbackRemembered: true }],
    ['no-webgl2', { webgl2: () => false }],
    // /websites and /404 share BaseLayout and have no hero: never the tube.
    ['no-hero', { hasHero: false }],
  ] as const)('fails on %s alone', (reason, override) => {
    expect(checkCapability({ ...capable, ...override }, null)).toEqual({
      enabled: false,
      reason,
      skipProbe: false,
    });
  });

  it('accepts exactly 900px and exactly 4 cores', () => {
    expect(checkCapability({ ...capable, viewportWidth: 900, hardwareConcurrency: 4 }, null).enabled).toBe(true);
  });

  it('never creates a WebGL context when a cheaper check already failed', () => {
    let probed = false;
    const env = { ...capable, saveData: true, webgl2: () => ((probed = true), true) };
    checkCapability(env, null);
    expect(probed).toBe(false);
  });

  it('?signal=2d forces the flat line even on a capable machine', () => {
    expect(checkCapability(capable, '2d')).toEqual({ enabled: false, reason: 'forced-2d', skipProbe: false });
  });

  it('?signal=tube skips the static checks and the probe, but not WebGL2 or the hero', () => {
    const weak = { ...capable, viewportWidth: 600, hardwareConcurrency: 2, fallbackRemembered: true };
    expect(checkCapability(weak, 'tube')).toEqual({ enabled: true, skipProbe: true });
    expect(checkCapability({ ...weak, webgl2: () => false }, 'tube').reason).toBe('no-webgl2');
    expect(checkCapability({ ...weak, hasHero: false }, 'tube').reason).toBe('no-hero');
  });
});

describe('forcedMode', () => {
  it('reads ?signal=2d and ?signal=tube and ignores anything else', () => {
    expect(forcedMode('?signal=2d')).toBe('2d');
    expect(forcedMode('?a=1&signal=tube')).toBe('tube');
    expect(forcedMode('?signal=3d')).toBeNull();
    expect(forcedMode('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/gfx-gate.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/gate`.

- [ ] **Step 3: Implement**

Create `src/lib/gfx/gate.ts`:

```ts
/**
 * The WebGL capability gate (spec §12) — whether this visit gets the Phase 10 tube.
 *
 * In the base bundle, so it has to stay small: the decision is pure (`checkCapability`, given
 * an `Environment`), and the DOM is read in one place (`readEnvironment`). Three.js is never
 * imported here; `BaseLayout` only reaches for `import('./scene')` when this says yes.
 *
 * The checks run cheapest first, and WebGL2 last, because testing for it creates a context.
 */

export type SignalMode = '2d' | 'tube' | null;

export interface Environment {
  reducedMotion: boolean;
  viewportWidth: number;
  saveData: boolean;
  hardwareConcurrency: number;
  /** Only the home page has the hero the tube rises through; `/websites` and `/404` do not. */
  hasHero: boolean;
  /** The tube already handed back to 2D once this session (see `rememberFallback`). */
  fallbackRemembered: boolean;
  /** Lazy, because it creates a WebGL context. */
  webgl2: () => boolean;
}

export interface Capability {
  enabled: boolean;
  reason?: string;
  skipProbe: boolean;
}

export const MIN_VIEWPORT_WIDTH = 900;
export const MIN_CORES = 4;
export const FALLBACK_KEY = 'signal-tube-fallback';

/** `?signal=2d` forces the flat line, `?signal=tube` forces the tube — for checks and demos. */
export function forcedMode(search: string): SignalMode {
  const value = new URLSearchParams(search).get('signal');
  return value === '2d' || value === 'tube' ? value : null;
}

const off = (reason: string): Capability => ({ enabled: false, reason, skipProbe: false });

export function checkCapability(env: Environment, mode: SignalMode): Capability {
  if (mode === '2d') return off('forced-2d');
  if (!env.hasHero) return off('no-hero');

  // A forced tube is for demos and checks: it skips the static checks and the frame probe,
  // but a browser without WebGL2 still cannot draw it.
  const isForced = mode === 'tube';
  if (!isForced) {
    if (env.reducedMotion) return off('reduced-motion');
    if (env.viewportWidth < MIN_VIEWPORT_WIDTH) return off('narrow-viewport');
    if (env.saveData) return off('save-data');
    if (env.hardwareConcurrency < MIN_CORES) return off('few-cores');
    if (env.fallbackRemembered) return off('fell-back-this-session');
  }
  if (!env.webgl2()) return off('no-webgl2');
  return { enabled: true, skipProbe: isForced };
}

function hasWebGL2(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    if (!context) return false;
    // Hand the context straight back; the scene makes its own.
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function readFallbackFlag(): boolean {
  try {
    return sessionStorage.getItem(FALLBACK_KEY) === '1';
  } catch {
    return false;
  }
}

export function readEnvironment(): Environment {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    viewportWidth: document.documentElement.clientWidth,
    saveData: connection?.saveData === true,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
    hasHero: document.querySelector('[data-signal-section="hero"]') !== null,
    fallbackRemembered: readFallbackFlag(),
    webgl2: hasWebGL2,
  };
}

/** One-way per visit: a reload in this tab does not retry a tube that just failed. */
export function rememberFallback(): void {
  try {
    sessionStorage.setItem(FALLBACK_KEY, '1');
  } catch {
    // Private mode or blocked storage: the fallback still happens, it just is not remembered.
  }
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/gfx-gate.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Gates and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/lib/gfx/gate.ts tests/gfx-gate.test.ts
git commit -m "feat: WebGL capability gate" -m "Pure decision over a read-once environment: spec §12's conditions, cheapest first and WebGL2 last, plus no-hero pages and a one-way session fallback. ?signal=2d|tube overrides it for checks and demos."
```

---

### Task 3: The camera rig

**Files:**
- Create: `src/lib/gfx/camera.ts`
- Test: `tests/gfx-camera.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface CameraRig {
    fov: number; aspect: number; distance: number; near: number; far: number;
    position: readonly [x: number, y: number, z: number];
  }
  export const CAMERA_FOV = 30;          // degrees, vertical
  export const HERO_DEPTH_FACTOR = 1.5;  // hero depth as a multiple of the camera distance
  export function cameraRig(width: number, height: number, scrollX: number, scrollY: number): CameraRig;
  export function heroDepthFor(distance: number): number;
  ```
- World convention (used by Tasks 5 and 7): world units are CSS px; world `x` = page `x`; world `y` = −page `y`; world `z` = 0 on the page, negative away from the viewer.

- [ ] **Step 1: Write the failing tests**

Create `tests/gfx-camera.test.ts`. Three.js runs in node for maths, so the test checks the real projection:

```ts
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraRig, heroDepthFor } from '../src/lib/gfx/camera';

/** Where a world point lands on screen, in CSS px from the viewport's top-left. */
function project(rig: ReturnType<typeof cameraRig>, width: number, height: number, world: Vector3) {
  const camera = new PerspectiveCamera(rig.fov, rig.aspect, rig.near, rig.far);
  camera.position.set(...rig.position);
  camera.updateMatrixWorld();
  const ndc = world.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
}

describe('cameraRig — the page plane is 1:1 with CSS px', () => {
  it.each([
    // width, height, scrollY — the top, mid-page after a reload, and a small window
    [1425, 900, 0],
    [1425, 900, 6000],
    [1905, 1080, 3210.5],
    [985, 700, 8200],
  ])('maps z = 0 page points onto their own pixels at %ix%i, scrollY %d', (width, height, scrollY) => {
    const rig = cameraRig(width, height, 0, scrollY);
    for (const [pageX, offsetY] of [[0, 0], [width / 2, height / 2], [width, height], [137, 611]]) {
      const pageY = scrollY + offsetY;
      const onScreen = project(rig, width, height, new Vector3(pageX, -pageY, 0));
      expect(onScreen.x).toBeCloseTo(pageX, 6);
      expect(onScreen.y).toBeCloseTo(offsetY, 6);
    }
  });

  it('draws a point behind the page smaller and toward the centre', () => {
    const [width, height] = [1425, 900];
    const rig = cameraRig(width, height, 0, 0);
    const far = project(rig, width, height, new Vector3(100, -100, -heroDepthFor(rig.distance)));
    expect(far.x).toBeGreaterThan(100);
    expect(far.y).toBeGreaterThan(100);
    expect(far.x).toBeLessThan(width / 2);
  });

  it('keeps the deepest hero point inside the far plane', () => {
    const rig = cameraRig(1425, 900, 0, 0);
    expect(rig.distance + heroDepthFor(rig.distance)).toBeLessThan(rig.far);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/gfx-camera.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/camera`.

- [ ] **Step 3: Implement**

Create `src/lib/gfx/camera.ts`:

```ts
/**
 * The tube's camera: a perspective camera placed so the page plane (world z = 0) projects
 * 1:1 onto CSS pixels at the current scroll. Anything lying flat on the page — the tube
 * everywhere below the hero — lands on exactly the pixel the SVG line would, which is what
 * keeps every island's emissions, drops and nodes attached (Phase 10 design, D1).
 *
 * World units are CSS px: x = page x, y = −page y, z = 0 on the page and negative away from
 * the viewer. Pure — the scene copies these numbers onto a THREE.PerspectiveCamera.
 */

export interface CameraRig {
  fov: number;
  aspect: number;
  distance: number;
  near: number;
  far: number;
  position: readonly [x: number, y: number, z: number];
}

/** Vertical field of view, degrees. Narrow enough that the hero's depth reads as depth, not distortion. */
export const CAMERA_FOV = 30;

/** How far behind the page the hero's deepest point (curve z = −1) sits, in camera distances. */
export const HERO_DEPTH_FACTOR = 1.5;

export function cameraRig(width: number, height: number, scrollX: number, scrollY: number): CameraRig {
  // At this distance the viewport's height exactly fills the field of view at z = 0.
  const distance = height / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360);
  return {
    fov: CAMERA_FOV,
    aspect: width / height,
    distance,
    near: Math.max(1, distance * 0.05),
    far: distance * (2 + HERO_DEPTH_FACTOR),
    position: [scrollX + width / 2, -(scrollY + height / 2), distance],
  };
}

export function heroDepthFor(distance: number): number {
  return distance * HERO_DEPTH_FACTOR;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/gfx-camera.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Gates and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/lib/gfx/camera.ts tests/gfx-camera.test.ts
git commit -m "feat: camera rig mapping the page plane 1:1 to CSS px" -m "Below the hero the tube must land on the SVG line's own pixels; a perspective camera at height/2 / tan(fov/2) does that at any scroll, and still gives the hero real depth."
```

---

### Task 4: Frame timing — probe, watchdog, fallback rule

**Files:**
- Create: `src/lib/gfx/frame.ts`
- Test: `tests/gfx-frame.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProbeVerdict = 'pass' | 'fail' | 'inconclusive';
  export const PROBE_FRAMES = 20;
  export function probeVerdict(intervals: readonly number[]): ProbeVerdict;
  export interface FrameWatch { push(intervalMs: number): boolean } // true = tripped
  export function createFrameWatch(): FrameWatch;
  export interface RuntimeState { viewportWidth: number; reducedMotion: boolean; contextLost: boolean; watchTripped: boolean }
  export function shouldFallBack(state: RuntimeState): boolean;
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/gfx-frame.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFrameWatch, probeVerdict, shouldFallBack } from '../src/lib/gfx/frame';

const repeat = (ms: number, n: number) => Array.from({ length: n }, () => ms);

describe('probeVerdict', () => {
  it('passes a steady 60Hz and a steady 120Hz display', () => {
    expect(probeVerdict(repeat(16.7, 20))).toBe('pass');
    expect(probeVerdict(repeat(8.3, 20))).toBe('pass');
  });

  it('fails a slow median, and a fast median with a slow tail', () => {
    expect(probeVerdict(repeat(24, 20))).toBe('fail');
    expect(probeVerdict([...repeat(16, 16), ...repeat(40, 4)])).toBe('fail');
  });

  it('is inconclusive when the tab was hidden mid-probe — one huge gap is not a slow GPU', () => {
    expect(probeVerdict([...repeat(16.7, 10), 1800, ...repeat(16.7, 9)])).toBe('inconclusive');
  });

  it('is inconclusive with no frames at all', () => {
    expect(probeVerdict([])).toBe('inconclusive');
  });
});

describe('createFrameWatch', () => {
  it('trips once the median of the last 60 rendered frames is over 25ms', () => {
    const watch = createFrameWatch();
    const tripped = repeat(30, 60).map((ms) => watch.push(ms));
    expect(tripped.slice(0, 59).every((t) => !t)).toBe(true);
    expect(tripped[59]).toBe(true);
  });

  it('ignores idle gaps between scrolls — rendering only on change leaves long pauses', () => {
    const watch = createFrameWatch();
    const pushes = [...repeat(16, 30), 2000, 5000, ...repeat(16, 30)].map((ms) => watch.push(ms));
    expect(pushes.some(Boolean)).toBe(false);
  });

  it('does not trip on a short burst of slow frames inside a healthy window', () => {
    const watch = createFrameWatch();
    const pushes = [...repeat(16, 40), ...repeat(40, 20)].map((ms) => watch.push(ms));
    expect(pushes.some(Boolean)).toBe(false);
  });
});

describe('shouldFallBack', () => {
  const healthy = { viewportWidth: 1440, reducedMotion: false, contextLost: false, watchTripped: false };

  it('keeps the tube while healthy', () => {
    expect(shouldFallBack(healthy)).toBe(false);
  });

  it.each([
    // A window dragged narrower than the gate's floor mid-visit.
    ['viewport below 900px', { viewportWidth: 899 }],
    ['reduced motion switched on', { reducedMotion: true }],
    ['WebGL context lost', { contextLost: true }],
    ['slow frames', { watchTripped: true }],
  ])('hands back on %s', (_, override) => {
    expect(shouldFallBack({ ...healthy, ...override })).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/gfx-frame.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/frame`.

- [ ] **Step 3: Implement**

Create `src/lib/gfx/frame.ts`:

```ts
/**
 * Frame timing for the tube: the probe that decides whether it starts, the watchdog that
 * decides whether it stays, and the one rule for handing back to the 2D line.
 *
 * Pure — the scene feeds in `requestAnimationFrame` intervals. The thresholds hold on 60Hz
 * and 120Hz displays alike, since both are judged in milliseconds rather than frames.
 */

import { MIN_VIEWPORT_WIDTH } from './gate';

export type ProbeVerdict = 'pass' | 'fail' | 'inconclusive';

export const PROBE_FRAMES = 20;
const PROBE_MEDIAN_MS = 20;
const PROBE_P90_MS = 33;
/** Longer than any real frame: the tab was hidden or the thread was busy with something else. */
const INCONCLUSIVE_GAP_MS = 250;

const WATCH_WINDOW = 60;
const WATCH_MEDIAN_MS = 25;
/** Rendering only on change leaves pauses between scrolls; those are not frames. */
const IDLE_GAP_MS = 100;

/** Nearest-rank percentile of `values`, 0 < p ≤ 1. */
function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

export function probeVerdict(intervals: readonly number[]): ProbeVerdict {
  const wasInterrupted = intervals.some((ms) => ms > INCONCLUSIVE_GAP_MS);
  if (intervals.length === 0 || wasInterrupted) return 'inconclusive';
  const isSteady = percentile(intervals, 0.5) <= PROBE_MEDIAN_MS;
  const hasNoSlowTail = percentile(intervals, 0.9) <= PROBE_P90_MS;
  return isSteady && hasNoSlowTail ? 'pass' : 'fail';
}

export interface FrameWatch {
  /** Records one rendered frame's interval; `true` once the tube should hand back. */
  push(intervalMs: number): boolean;
}

export function createFrameWatch(): FrameWatch {
  const recent: number[] = [];
  return {
    push(intervalMs) {
      if (!(intervalMs > 0) || intervalMs > IDLE_GAP_MS) return false;
      recent.push(intervalMs);
      if (recent.length > WATCH_WINDOW) recent.shift();
      return recent.length === WATCH_WINDOW && percentile(recent, 0.5) > WATCH_MEDIAN_MS;
    },
  };
}

export interface RuntimeState {
  viewportWidth: number;
  reducedMotion: boolean;
  contextLost: boolean;
  watchTripped: boolean;
}

/** Any one of these hands the page back to the SVG line for the rest of the visit. */
export function shouldFallBack(state: RuntimeState): boolean {
  const isNowNarrow = state.viewportWidth < MIN_VIEWPORT_WIDTH;
  return isNowNarrow || state.reducedMotion || state.contextLost || state.watchTripped;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/gfx-frame.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Gates and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/lib/gfx/frame.ts tests/gfx-frame.test.ts
git commit -m "feat: frame probe, watchdog and fallback rule for the tube" -m "Judged in milliseconds so 60Hz and 120Hz displays pass alike; a hidden tab reads as inconclusive rather than slow, and idle pauses between scrolls are not frames."
```

---

### Task 5: The tube mesh

**Files:**
- Create: `src/lib/gfx/tube-mesh.ts`
- Test: `tests/gfx-tube-mesh.test.ts`

**Interfaces:**
- Consumes: `SignalGeometry`, `SignalGeometryPoint` from `src/lib/signal/tip.ts` (Task 1); `controlPointT`, `sampleSignal` from `src/lib/signal/path.ts`.
- Produces:
  ```ts
  export interface TubeProfile { heroRadius: number; baseRadius: number; heroDepth: number; radialSegments: number }
  export interface TubeArrays {
    positions: Float32Array; normals: Float32Array;     // 3 per vertex
    lengths: Float32Array; strengths: Float32Array;     // 1 per vertex
    indices: Uint32Array;
    centres: Float32Array; radii: Float32Array;         // per ring: 3 / 1
    ringLengths: Float32Array;                          // per ring, px along the line
    ringStrengths: Float32Array;                        // per ring
  }
  export function heroWeight(curveY: number): number;          // 1 → 0, exactly 0 from control point 7 on
  export function radiusAt(curveY: number, profile: TubeProfile): number;
  export function worldPoint(p: SignalGeometryPoint, heroDepth: number): [number, number, number];
  export function buildTube(geometry: SignalGeometry, profile: TubeProfile, radiusScale?: number, radiusPad?: number): TubeArrays;
  export function pointAtLength(tube: TubeArrays, length: number): { x: number; y: number; z: number; radius: number; strength: number };
  export function hexToRgb(hex: string): [number, number, number]; // sRGB 0..1
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/gfx-tube-mesh.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { controlPointT, sampleSignal, sampleSignalRange } from '../src/lib/signal/path';
import { toPixelPoints } from '../src/lib/signal/anchors';
import { cumulativeLengths } from '../src/lib/signal/playhead';
import type { SignalGeometry } from '../src/lib/signal/tip';
import {
  buildTube,
  heroWeight,
  hexToRgb,
  pointAtLength,
  radiusAt,
  worldPoint,
  type TubeProfile,
} from '../src/lib/gfx/tube-mesh';

/** The line as the SVG draws it on the real 1440 page (tests/signal-anchors.test.ts). */
function referenceGeometry(): SignalGeometry {
  const samples = sampleSignalRange(0, 1, 481);
  const pixels = toPixelPoints(samples, 1425, [65, 923.4, 1975.9, 4762.1, 6041.9, 7239.9, 8494.9], [2435, 4589.3, 5223.2]);
  return {
    points: pixels.map((p, i) => ({ x: p.x, y: p.y, z: samples[i].z, curveY: samples[i].y })),
    lengths: cumulativeLengths(pixels),
    strength: pixels.map((_, i) => (i % 2 === 0 ? 1 : 0)),
  };
}

const profile: TubeProfile = { heroRadius: 12, baseRadius: 2, heroDepth: 2500, radialSegments: 12 };
const heroEndY = sampleSignal(controlPointT(7)).y;

describe('the hero profile', () => {
  it('is full depth through the hero and exactly flat from the Nine Years seam on', () => {
    expect(heroWeight(0)).toBe(1);
    expect(heroWeight(sampleSignal(controlPointT(5)).y)).toBe(1);
    expect(heroWeight(heroEndY)).toBe(0);
    for (const y of [heroEndY + 1e-9, 0.3, 0.68, 1]) expect(heroWeight(y)).toBe(0);
  });

  it('is thick at the headline and the 2D width from the seam on', () => {
    expect(radiusAt(0.06, profile)).toBe(12);
    expect(radiusAt(heroEndY, profile)).toBe(2);
    expect(radiusAt(0.5, profile)).toBe(2);
    const mid = radiusAt((sampleSignal(controlPointT(5)).y + heroEndY) / 2, profile);
    expect(mid).toBeGreaterThan(2);
    expect(mid).toBeLessThan(12);
  });

  it('puts a flat point on the page and a hero point behind it', () => {
    expect(worldPoint({ x: 10, y: 5000, z: 0.37, curveY: 0.68 }, 2500)).toEqual([10, -5000, 0]);
    expect(worldPoint({ x: 10, y: 20, z: -1, curveY: 0 }, 2500)).toEqual([10, -20, -2500]);
  });
});

describe('buildTube', () => {
  const geometry = referenceGeometry();
  const tube = buildTube(geometry, profile);
  const rings = geometry.points.length;
  const segments = profile.radialSegments;

  it('has one ring per published point, centred exactly on it', () => {
    expect(tube.centres.length).toBe(rings * 3);
    geometry.points.forEach((p, i) => {
      const [x, y, z] = worldPoint(p, profile.heroDepth);
      // Float32 buffers: ~1e-4 px of rounding at page scale, far below a pixel.
      expect(tube.centres[i * 3]).toBeCloseTo(x, 2);
      expect(tube.centres[i * 3 + 1]).toBeCloseTo(y, 2);
      expect(tube.centres[i * 3 + 2]).toBeCloseTo(z, 2);
    });
  });

  it('sizes its buffers to rings × segments', () => {
    expect(tube.positions.length).toBe(rings * segments * 3);
    expect(tube.normals.length).toBe(rings * segments * 3);
    expect(tube.lengths.length).toBe(rings * segments);
    expect(tube.indices.length).toBe((rings - 1) * segments * 6);
  });

  it('puts every vertex at its ring radius, with a unit normal pointing out', () => {
    for (let ring = 0; ring < rings; ring += 37) {
      for (let j = 0; j < segments; j++) {
        const v = (ring * segments + j) * 3;
        const offset = [0, 1, 2].map((k) => tube.positions[v + k] - tube.centres[ring * 3 + k]);
        expect(Math.hypot(...offset)).toBeCloseTo(tube.radii[ring], 2);
        const normal = [0, 1, 2].map((k) => tube.normals[v + k]);
        expect(Math.hypot(...normal)).toBeCloseTo(1, 5);
        expect(offset.reduce((sum, o, k) => sum + o * normal[k], 0)).toBeGreaterThan(0);
      }
    }
  });

  it('never flips its frame from ring to ring, through the tightest turns on the line', () => {
    for (let ring = 0; ring < rings - 1; ring++) {
      const a = ring * segments * 3;
      const b = (ring + 1) * segments * 3;
      const dot = tube.normals[a] * tube.normals[b] + tube.normals[a + 1] * tube.normals[b + 1] + tube.normals[a + 2] * tube.normals[b + 2];
      expect(dot).toBeGreaterThan(0.5);
    }
  });

  it('carries length and strength per vertex from the geometry', () => {
    const ring = 200;
    expect(tube.lengths[ring * segments + 3]).toBeCloseTo(geometry.lengths[ring], 3);
    expect(tube.strengths[ring * segments + 3]).toBe(geometry.strength[ring]);
  });

  it('scales and pads the radius for the glow shell', () => {
    const halo = buildTube(geometry, profile, 3, 2);
    expect(halo.radii[300]).toBeCloseTo(tube.radii[300] * 3 + 2, 4);
  });

  // Front faces must face out: the materials cull back faces, and a tube drawn from both
  // sides would double the dim rule's alpha — the SVG's 0.15 becoming ~0.28 over text.
  it('winds every triangle to face away from its ring centre', () => {
    const vertex = (n: number) => [0, 1, 2].map((k) => tube.positions[n * 3 + k]);
    for (let t = 0; t < tube.indices.length; t += 6 * 97) {
      const [a, b, c] = [tube.indices[t], tube.indices[t + 1], tube.indices[t + 2]].map(vertex);
      const ab = [0, 1, 2].map((k) => b[k] - a[k]);
      const ac = [0, 1, 2].map((k) => c[k] - a[k]);
      const face = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const ring = Math.floor(tube.indices[t] / segments);
      const outward = [0, 1, 2].map((k) => a[k] - tube.centres[ring * 3 + k]);
      expect(face.reduce((sum, f, k) => sum + f * outward[k], 0)).toBeGreaterThan(0);
    }
  });
});

describe('pointAtLength', () => {
  const tube = buildTube(referenceGeometry(), profile);

  it('lands on a ring at its own length, and between rings in proportion', () => {
    const at = pointAtLength(tube, tube.ringLengths[100]);
    expect(at.x).toBeCloseTo(tube.centres[300], 6);
    const halfway = (tube.ringLengths[100] + tube.ringLengths[101]) / 2;
    expect(pointAtLength(tube, halfway).y).toBeCloseTo((tube.centres[301] + tube.centres[304]) / 2, 6);
  });

  it('clamps before the start and past the end', () => {
    expect(pointAtLength(tube, -50).x).toBe(tube.centres[0]);
    const last = tube.ringLengths.length - 1;
    expect(pointAtLength(tube, 1e9).y).toBe(tube.centres[last * 3 + 1]);
  });
});

describe('hexToRgb', () => {
  it('reads the palette token as sRGB channels', () => {
    const [r, g, b] = hexToRgb('#FF4B54');
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0x4b / 255, 9);
    expect(b).toBeCloseTo(0x54 / 255, 9);
    expect(hexToRgb('  #ff4b54 ')).toEqual([r, g, b]);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/gfx-tube-mesh.test.ts`
Expected: FAIL — cannot resolve `../src/lib/gfx/tube-mesh`.

- [ ] **Step 3: Implement**

Create `src/lib/gfx/tube-mesh.ts`:

```ts
/**
 * The tube's geometry, built straight from the points the SVG line is drawn through
 * (`SignalGeometry`, tip.ts). Not `THREE.TubeGeometry`: that needs its own `Curve` and
 * re-samples it — a second definition of the line — and cannot vary its radius along the
 * way (Phase 10 design, D4).
 *
 * One ring of vertices per published point, oriented by rotation-minimising frames (the
 * double-reflection method), which never twist or flip at a tight turn the way Frenet frames
 * do. Pure: typed arrays out, no Three.js — tube-signal.ts turns them into buffers.
 */

import type { SignalGeometry, SignalGeometryPoint } from '../signal/tip';
import { controlPointT, sampleSignal } from '../signal/path';

export interface TubeProfile {
  /** Radius where the tube passes the headline, px. */
  heroRadius: number;
  /** Radius from the Nine Years seam on — half of `--signal-stroke`. */
  baseRadius: number;
  /** World depth of curve z = −1 (camera.ts `heroDepthFor`). */
  heroDepth: number;
  radialSegments: number;
}

export interface TubeArrays {
  positions: Float32Array;
  normals: Float32Array;
  lengths: Float32Array;
  strengths: Float32Array;
  indices: Uint32Array;
  centres: Float32Array;
  radii: Float32Array;
  ringLengths: Float32Array;
  ringStrengths: Float32Array;
}

// The hero's landmarks, read off the curve rather than restated: it banks through the
// headline around control points 3–4 and reaches the Nine Years seam at 7.
const TAPER_FROM_Y = sampleSignal(controlPointT(5)).y;
const FLATTEN_FROM_Y = sampleSignal(controlPointT(6)).y;
const HERO_END_Y = sampleSignal(controlPointT(7)).y;

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * How much of the curve's z becomes real depth: 1 through the hero, easing to exactly 0 at
 * the Nine Years seam. Below it the tube lies on the page, on the SVG line's own pixels
 * (Phase 10 design, D1) — including the ring, whose depth waits for Phase 12.
 */
export function heroWeight(curveY: number): number {
  return 1 - smoothstep(FLATTEN_FROM_Y, HERO_END_Y, curveY);
}

/** Thick past the headline, tapering to the 2D line's width by the seam (design D2). */
export function radiusAt(curveY: number, profile: TubeProfile): number {
  const heroShare = 1 - smoothstep(TAPER_FROM_Y, HERO_END_Y, curveY);
  return profile.baseRadius + (profile.heroRadius - profile.baseRadius) * heroShare;
}

/** Page px → world: x as is, y negated, z real only in the hero (camera.ts convention). */
export function worldPoint(p: SignalGeometryPoint, heroDepth: number): [number, number, number] {
  const depth = p.z * heroDepth * heroWeight(p.curveY);
  return [p.x, -p.y, depth === 0 ? 0 : depth]; // no −0: tests compare flat points exactly
}

type Vec3 = [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalise = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length > 0 ? scale(a, 1 / length) : [0, 0, 1];
};
/** `v` reflected in the plane through the origin with normal `n` (`nn` = n·n). */
const reflect = (v: Vec3, n: Vec3, nn: number): Vec3 => sub(v, scale(n, (2 * dot(n, v)) / nn));

export function buildTube(
  geometry: SignalGeometry,
  profile: TubeProfile,
  radiusScale = 1,
  radiusPad = 0,
): TubeArrays {
  const rings = geometry.points.length;
  const segments = profile.radialSegments;
  const centres = geometry.points.map((p) => worldPoint(p, profile.heroDepth));

  const tangents: Vec3[] = centres.map((_, i) =>
    normalise(sub(centres[Math.min(i + 1, rings - 1)], centres[Math.max(i - 1, 0)])),
  );

  // First frame: any vector perpendicular to the first tangent. After that each frame is the
  // previous one carried along by two reflections — the rotation-minimising frame.
  const frames: Vec3[] = new Array(rings);
  const seed: Vec3 = Math.abs(tangents[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  frames[0] = normalise(cross(tangents[0], seed));
  for (let i = 0; i < rings - 1; i++) {
    const step = sub(centres[i + 1], centres[i]);
    const stepLength = dot(step, step);
    if (!(stepLength > 0)) {
      frames[i + 1] = frames[i];
      continue;
    }
    const carried = reflect(frames[i], step, stepLength);
    const carriedTangent = reflect(tangents[i], step, stepLength);
    const correction = sub(tangents[i + 1], carriedTangent);
    const correctionLength = dot(correction, correction);
    frames[i + 1] = normalise(correctionLength > 1e-18 ? reflect(carried, correction, correctionLength) : carried);
  }

  const vertexCount = rings * segments;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const lengths = new Float32Array(vertexCount);
  const strengths = new Float32Array(vertexCount);
  const radii = new Float32Array(rings);
  const centreArray = new Float32Array(rings * 3);

  for (let i = 0; i < rings; i++) {
    const radius = radiusAt(geometry.points[i].curveY, profile) * radiusScale + radiusPad;
    radii[i] = radius;
    centreArray.set(centres[i], i * 3);
    const across = frames[i];
    const around = cross(tangents[i], across);
    for (let j = 0; j < segments; j++) {
      const angle = (2 * Math.PI * j) / segments;
      const out: Vec3 = [
        across[0] * Math.cos(angle) + around[0] * Math.sin(angle),
        across[1] * Math.cos(angle) + around[1] * Math.sin(angle),
        across[2] * Math.cos(angle) + around[2] * Math.sin(angle),
      ];
      const v = i * segments + j;
      positions.set([centres[i][0] + out[0] * radius, centres[i][1] + out[1] * radius, centres[i][2] + out[2] * radius], v * 3);
      normals.set(out, v * 3);
      lengths[v] = geometry.lengths[i];
      strengths[v] = geometry.strength[i];
    }
  }

  const indices = new Uint32Array((rings - 1) * segments * 6);
  let k = 0;
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j;
      const b = i * segments + ((j + 1) % segments);
      const c = a + segments;
      const d = b + segments;
      // Counter-clockwise seen from outside, so the default front-face culling keeps the
      // outer surface only (the ring runs right-handed about the tangent).
      indices.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }

  return {
    positions,
    normals,
    lengths,
    strengths,
    indices,
    centres: centreArray,
    radii,
    ringLengths: Float32Array.from(geometry.lengths),
    ringStrengths: Float32Array.from(geometry.strength),
  };
}

/** The tube's centre, radius and strength at `length` px along it — where the tip's cap sits. */
export function pointAtLength(
  tube: TubeArrays,
  length: number,
): { x: number; y: number; z: number; radius: number; strength: number } {
  const last = tube.ringLengths.length - 1;
  const ringAt = (i: number) => ({
    x: tube.centres[i * 3],
    y: tube.centres[i * 3 + 1],
    z: tube.centres[i * 3 + 2],
    radius: tube.radii[i],
    strength: tube.ringStrengths[i],
  });
  if (!(length > tube.ringLengths[0])) return ringAt(0);
  if (length >= tube.ringLengths[last]) return ringAt(last);

  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tube.ringLengths[mid] < length) lo = mid + 1;
    else hi = mid;
  }
  const [before, after] = [ringAt(lo - 1), ringAt(lo)];
  const span = tube.ringLengths[lo] - tube.ringLengths[lo - 1];
  const t = span > 0 ? (length - tube.ringLengths[lo - 1]) / span : 1;
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    x: mix(before.x, after.x),
    y: mix(before.y, after.y),
    z: mix(before.z, after.z),
    radius: mix(before.radius, after.radius),
    strength: mix(before.strength, after.strength),
  };
}

/**
 * A `#RRGGBB` token as sRGB channels 0..1. The shaders write these straight to the canvas,
 * which is sRGB — going through THREE.Color would convert to linear and darken the red.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.trim().replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/gfx-tube-mesh.test.ts`
Expected: PASS (13 tests). If the frame-flip test fails, the double reflection is wrong. Check `reflect` against Wang et al., "Computation of Rotation Minimizing Frames" (2008), Algorithm 1; do not loosen the threshold.

- [ ] **Step 5: Gates and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/lib/gfx/tube-mesh.ts tests/gfx-tube-mesh.test.ts
git commit -m "feat: tube mesh built from the published signal points" -m "Rings on rotation-minimising frames through exactly the points the SVG draws — not TubeGeometry, which would re-sample its own curve and cannot vary radius. Carries the hero depth and thickness profile, and length and strength per vertex."
```

---

### Task 6: Budget guard for the enhanced chunk

**Files:**
- Modify: `scripts/lib/budget.mjs` (append `containsThree`)
- Modify: `scripts/budget.mjs` (`walkClosure` records it; `main` guards and reports)
- Test: `tests/budget.test.ts` (append)

**Interfaces:**
- Produces: `export function containsThree(source: string): boolean` in `scripts/lib/budget.mjs`.

- [ ] **Step 1: Write the failing test**

Append to `tests/budget.test.ts` (add `containsThree` to its import from `../scripts/lib/budget.mjs`):

```js
describe('containsThree', () => {
  it('spots Three.js by the global it registers, which survives minification', () => {
    expect(containsThree('var a=1;window.__THREE__="186";')).toBe(true);
    expect(containsThree('import{a}from"./tip.x.js";')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/budget.test.ts`
Expected: FAIL — `containsThree` is not exported.

- [ ] **Step 3: Implement**

Append to `scripts/lib/budget.mjs`:

```js
/**
 * Whether a built chunk contains Three.js. Three registers `__THREE__` on the global object
 * with its revision, and that string survives minification, so it identifies the library
 * however Vite names or splits the chunk.
 *
 * @param {string} source
 * @returns {boolean}
 */
export function containsThree(source) {
  return source.includes('__THREE__');
}
```

In `scripts/budget.mjs`:

1. Import `containsThree` alongside the existing helpers, and add below `BUDGET_BYTES`:
   `const ENHANCED_BUDGET_BYTES = 256_000; // 250 KB gzip, spec §12 — the post-interactive WebGL chunk.`
2. In `walkClosure`, record the flag: `files.push({ path: urlPath, raw: raw.length, gzip: gzip.length, hasThree: containsThree(raw.toString('utf8')) });`
3. Make `measurePage` also return `files` (the closure) alongside `page, rows, total`.
4. At the end of `main`, before the `overBudget` exit, add:

```js
  // Spec §11.3: Three.js lives behind a dynamic import and is never in an initial chunk.
  const pagesLoadingThree = pages.filter((result) => result.files.some((file) => file.hasThree));
  for (const result of pagesLoadingThree) {
    console.error(`\n${result.page} loads Three.js before interaction.`);
  }

  // The enhanced chunk: every built chunk no page loads up front, closed over its static
  // imports, that reaches Three.js — minus anything a page already loaded.
  const initialPaths = new Set(pages.flatMap((result) => result.files.map((file) => file.path)));
  const astroDir = path.join(DIST, '_astro');
  const lateEntries = readdirSync(astroDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => `/_astro/${name}`)
    .filter((urlPath) => !initialPaths.has(urlPath));
  const enhanced = new Map();
  for (const entry of lateEntries) {
    const closure = walkClosure([entry]);
    if (!closure.some((file) => file.hasThree)) continue;
    for (const file of closure) if (!initialPaths.has(file.path)) enhanced.set(file.path, file);
  }
  const enhancedTotal = [...enhanced.values()].reduce((sum, file) => sum + file.gzip, 0);
  if (enhanced.size > 0) {
    const pct = ((enhancedTotal / ENHANCED_BUDGET_BYTES) * 100).toFixed(1);
    console.log(`\nEnhanced WebGL chunk (after interaction): ${enhancedTotal} gzip, ${pct}% of ${ENHANCED_BUDGET_BYTES}.`);
  }
  const enhancedOverBudget = enhancedTotal > ENHANCED_BUDGET_BYTES;
  if (enhancedOverBudget) console.error(`Enhanced chunk exceeds ${ENHANCED_BUDGET_BYTES} bytes.`);
  if (pagesLoadingThree.length > 0 || enhancedOverBudget) process.exit(1);
```

Update the file's header comment: add a paragraph saying the script also fails if any page's initial graph contains Three.js, and reports and gates the enhanced chunk at 256,000 bytes gzip.

- [ ] **Step 4: Run to verify**

Run: `npx vitest run tests/budget.test.ts && npm run build && npm run budget`
Expected: tests PASS. Budget prints the same `/` total as before and **no** enhanced line (no chunk contains Three.js yet), and exits 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/budget.mjs scripts/budget.mjs tests/budget.test.ts
git commit -m "chore: budget guards Three.js out of initial chunks and gates the enhanced chunk" -m "Spec §11.3 and §12: three behind a dynamic import only, the post-interactive chunk at most 250KB gzip. Identified by the __THREE__ global, which survives minification."
```

---

### Task 7: Tube renderer, scene and wiring

**Files:**
- Create: `src/lib/signal/tube-signal.ts`
- Create: `src/lib/gfx/scene.ts`
- Modify: `src/layouts/BaseLayout.astro` (the `<script>` at the end of `<body>`)
- Modify: `src/styles/global.css` (after the `#signal-layer` rule)

**Interfaces:**
- Consumes: Task 1 `onSignalGeometry`, `onSignalTip`, `signalTipY`, `SignalGeometry`; Task 2 `checkCapability`, `forcedMode`, `readEnvironment`, `rememberFallback`; Task 3 `cameraRig`, `heroDepthFor`; Task 4 `probeVerdict`, `createFrameWatch`, `shouldFallBack`, `PROBE_FRAMES`; Task 5 `buildTube`, `pointAtLength`, `hexToRgb`, `TubeProfile`; existing `onPageProgress` (`src/lib/motion/timeline.ts`), `lengthAtY` (`src/lib/signal/playhead.ts`).
- Produces: `export async function loadEnhanced(options: { skipProbe: boolean }): Promise<void>` in `scene.ts`; `createTubeSignal(look)` in `tube-signal.ts`.

This task is integration against WebGL, so it has no unit tests of its own. Every decision in it is already tested in Tasks 1–5. Verification is in the browser, in Steps 5–7.

- [ ] **Step 1: The tube renderer**

Create `src/lib/signal/tube-signal.ts`:

```ts
/**
 * The 3D renderer for the signal (Phase 10): Three.js meshes over `tube-mesh.ts`'s arrays.
 * It measures nothing and samples nothing — the SVG renderer publishes the line
 * (`SignalGeometry`, tip.ts) and this paints it, so the two can never disagree about where
 * the line is (Phase 10 design, D3).
 *
 * Two meshes share the geometry's shape: the core, shaded round by its normal against the
 * view, and an additive glow shell around it (design D5 — no post-processing). Both cut off
 * at the tip in the fragment shader, so the reveal is exact rather than ring by ring, and a
 * sphere caps the tip like the SVG's round linecap.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { buildTube, pointAtLength, type TubeArrays, type TubeProfile } from '../gfx/tube-mesh';
import { lengthAtY } from './playhead';
import type { SignalGeometry } from './tip';

export interface TubeLook {
  /** `--signal` as sRGB channels (tube-mesh.ts `hexToRgb`). */
  color: [number, number, number];
  /** `--signal-dim-alpha`. */
  dimAlpha: number;
  heroRadius: number;
  /** Half of `--signal-stroke`. */
  baseRadius: number;
}

export interface TubeSignal {
  group: Group;
  rebuild(geometry: SignalGeometry, heroDepth: number): void;
  /** The published tip's page y (tip.ts). */
  setTip(pageY: number): void;
  dispose(): void;
}

const RADIAL_SEGMENTS = 12;
/** The glow shell: this many times the core's radius, plus this many px. Tuned at the checkpoint. */
const GLOW_SCALE = 3;
const GLOW_PAD = 2;
const GLOW_STRENGTH = 0.35;

const VERTEX = /* glsl */ `
  attribute float aLength;
  attribute float aStrength;
  varying float vLength;
  varying float vStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vLength = aLength;
    vStrength = aStrength;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// Round without lights: bright where the surface faces the camera, darker toward the rim.
const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDim;
  uniform float uDrawn;
  uniform float uCapStrength;
  varying float vLength;
  varying float vStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #ifdef CAP
      float strength = uCapStrength;
    #else
      if (vLength > uDrawn) discard;
      float strength = vStrength;
    #endif
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    vec3 shaded = uColor * mix(0.45, 1.0, pow(facing, 0.6)) + vec3(pow(facing, 12.0) * 0.25);
    gl_FragColor = vec4(shaded, mix(uDim, 1.0, strength));
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDim;
  uniform float uDrawn;
  uniform float uGlow;
  uniform float uCapStrength;
  varying float vLength;
  varying float vStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #ifdef CAP
      float strength = uCapStrength;
    #else
      if (vLength > uDrawn) discard;
      float strength = vStrength;
    #endif
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    gl_FragColor = vec4(uColor, pow(facing, 2.0) * uGlow * mix(uDim, 1.0, strength));
  }
`;

export function createTubeSignal(look: TubeLook): TubeSignal {
  const group = new Group();
  const uniforms = {
    uColor: { value: new Vector3(...look.color) },
    uDim: { value: look.dimAlpha },
    uDrawn: { value: 0 },
    uGlow: { value: GLOW_STRENGTH },
    uCapStrength: { value: 1 },
  };

  const material = (fragmentShader: string, isGlow: boolean, isCap: boolean) =>
    new ShaderMaterial({
      uniforms, // shared: one uDrawn moves every part
      vertexShader: VERTEX,
      fragmentShader,
      defines: isCap ? { CAP: '' } : {},
      transparent: true,
      depthWrite: !isGlow,
      // Front faces only (tube-mesh.ts winds them outward): drawing both sides would double
      // the dim rule's alpha. Spread, not `blending: undefined`, which Three warns about.
      ...(isGlow ? { blending: AdditiveBlending } : {}),
    });

  const coreMesh = new Mesh(new BufferGeometry(), material(CORE_FRAGMENT, false, false));
  const glowMesh = new Mesh(new BufferGeometry(), material(GLOW_FRAGMENT, true, false));
  const capGeometry = new SphereGeometry(1, 16, 12);
  const coreCap = new Mesh(capGeometry, material(CORE_FRAGMENT, false, true));
  const glowCap = new Mesh(capGeometry, material(GLOW_FRAGMENT, true, true));
  glowMesh.renderOrder = 1;
  glowCap.renderOrder = 1;
  group.add(coreMesh, glowMesh, coreCap, glowCap);

  let core: TubeArrays | null = null;
  let points: SignalGeometry['points'] = [];
  let lengths: SignalGeometry['lengths'] = [];
  let tipY: number | null = null;

  function toBufferGeometry(arrays: TubeArrays): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(arrays.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(arrays.normals, 3));
    geometry.setAttribute('aLength', new BufferAttribute(arrays.lengths, 1));
    geometry.setAttribute('aStrength', new BufferAttribute(arrays.strengths, 1));
    geometry.setIndex(new BufferAttribute(arrays.indices, 1));
    return geometry;
  }

  function placeCaps(): void {
    if (!core || tipY === null) return;
    const drawn = lengthAtY(points, lengths, tipY);
    uniforms.uDrawn.value = drawn;
    const tip = pointAtLength(core, drawn);
    uniforms.uCapStrength.value = tip.strength;
    coreCap.position.set(tip.x, tip.y, tip.z);
    coreCap.scale.setScalar(tip.radius);
    glowCap.position.set(tip.x, tip.y, tip.z);
    glowCap.scale.setScalar(tip.radius * GLOW_SCALE + GLOW_PAD);
  }

  function rebuild(geometry: SignalGeometry, heroDepth: number): void {
    const profile: TubeProfile = {
      heroRadius: look.heroRadius,
      baseRadius: look.baseRadius,
      heroDepth,
      radialSegments: RADIAL_SEGMENTS,
    };
    core = buildTube(geometry, profile);
    points = geometry.points;
    lengths = geometry.lengths;
    coreMesh.geometry.dispose();
    glowMesh.geometry.dispose();
    coreMesh.geometry = toBufferGeometry(core);
    glowMesh.geometry = toBufferGeometry(buildTube(geometry, profile, GLOW_SCALE, GLOW_PAD));
    placeCaps();
  }

  function setTip(pageY: number): void {
    tipY = pageY;
    placeCaps();
  }

  function dispose(): void {
    for (const mesh of [coreMesh, glowMesh, coreCap, glowCap]) (mesh.material as ShaderMaterial).dispose();
    coreMesh.geometry.dispose();
    glowMesh.geometry.dispose();
    capGeometry.dispose();
  }

  return { group, rebuild, setTip, dispose };
}
```

- [ ] **Step 2: The scene**

Create `src/lib/gfx/scene.ts`:

```ts
/**
 * The enhanced layer's entry — the dynamic-import boundary (spec §11.3). Nothing here is in
 * any initial chunk: `BaseLayout` imports this only after the gate (gate.ts) says yes.
 *
 * Owns the renderer, the fixed canvas, the camera, the frame probe, the swap from the SVG
 * line, the watchdog and the one-way fallback. The SVG renderer keeps running underneath
 * throughout, only hidden, so handing back is one class removed (Phase 10 design, §6).
 *
 * Renders on change only — a scroll, a tip move, a re-measure, a resize — never in a free
 * loop: the scroll is the transport, and an idle page costs the GPU nothing (design D6).
 */

import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { onPageProgress } from '../motion/timeline';
import { createTubeSignal } from '../signal/tube-signal';
import { onSignalGeometry, onSignalTip } from '../signal/tip';
import { cameraRig, heroDepthFor } from './camera';
import { createFrameWatch, probeVerdict, PROBE_FRAMES, shouldFallBack, type ProbeVerdict } from './frame';
import { rememberFallback } from './gate';
import { hexToRgb } from './tube-mesh';

/** Starting value, tuned at Noel's checkpoint (design D2): 24px across at the headline. */
const HERO_RADIUS = 12;
const MAX_PIXEL_RATIO = 2;
/** The probe is retried this many times if the tab was hidden while it ran. */
const PROBE_ATTEMPTS = 3;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

function whenVisible(): Promise<void> {
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

export async function loadEnhanced({ skipProbe }: { skipProbe: boolean }): Promise<void> {
  const layer = document.getElementById('signal-layer')!;
  const tokens = getComputedStyle(document.documentElement);
  const tube = createTubeSignal({
    color: hexToRgb(tokens.getPropertyValue('--signal')),
    dimAlpha: parseFloat(tokens.getPropertyValue('--signal-dim-alpha')),
    heroRadius: HERO_RADIUS,
    baseRadius: parseFloat(tokens.getPropertyValue('--signal-stroke')) / 2,
  });

  const canvas = document.createElement('canvas');
  canvas.className = 'signal-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.after(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  const scene = new Scene();
  scene.add(tube.group);
  const camera = new PerspectiveCamera();

  // The canvas's own box, not innerWidth: a fixed element excludes the scrollbar, and the
  // page-px ↔ world mapping has to use the width the canvas actually covers.
  const viewport = () => ({ width: canvas.clientWidth, height: canvas.clientHeight });
  let heroDepth = heroDepthFor(cameraRig(viewport().width, viewport().height, 0, 0).distance);

  function render(): void {
    const { width, height } = viewport();
    const rig = cameraRig(width, height, window.scrollX, window.scrollY);
    camera.fov = rig.fov;
    camera.aspect = rig.aspect;
    camera.near = rig.near;
    camera.far = rig.far;
    camera.position.set(...rig.position);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  const resize = () => {
    const { width, height } = viewport();
    renderer.setSize(width, height, false);
  };
  resize();

  let contextLost = false;
  let isLive = false;
  let pendingFrame = 0;
  let lastFrameAt = 0;
  const watch = createFrameWatch();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups: (() => void)[] = [];

  /** One way: `remember` is false only when the probe could not reach a verdict. */
  function fallBack(remember = true): void {
    if (!canvas.isConnected) return; // already handed back
    isLive = false;
    layer.classList.remove('signal-layer--tube');
    cancelAnimationFrame(pendingFrame);
    for (const cleanup of cleanups) cleanup();
    tube.dispose();
    renderer.dispose();
    canvas.remove();
    if (remember) rememberFallback();
  }

  function checkHealth(watchTripped: boolean): boolean {
    const mustHandBack = shouldFallBack({
      viewportWidth: document.documentElement.clientWidth,
      reducedMotion: reducedMotion.matches,
      contextLost,
      watchTripped,
    });
    if (mustHandBack) fallBack();
    return !mustHandBack;
  }

  function requestRender(): void {
    if (pendingFrame !== 0 || !canvas.isConnected) return;
    pendingFrame = requestAnimationFrame((now) => {
      pendingFrame = 0;
      const tripped = isLive && lastFrameAt > 0 && watch.push(now - lastFrameAt);
      lastFrameAt = now;
      if (!checkHealth(tripped)) return;
      render();
    });
  }

  cleanups.push(
    onSignalGeometry((geometry) => {
      heroDepth = heroDepthFor(cameraRig(viewport().width, viewport().height, 0, 0).distance);
      tube.rebuild(geometry, heroDepth);
      requestRender();
    }),
    onSignalTip((pageY) => {
      tube.setTip(pageY);
      requestRender();
    }),
    onPageProgress(() => requestRender()),
  );
  const onResize = () => {
    resize();
    requestRender();
  };
  const onContextLost = () => {
    contextLost = true;
    checkHealth(false);
  };
  const onMotionChange = () => checkHealth(false);
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', onContextLost);
  reducedMotion.addEventListener('change', onMotionChange);
  cleanups.push(
    () => window.removeEventListener('resize', onResize),
    () => canvas.removeEventListener('webglcontextlost', onContextLost),
    () => reducedMotion.removeEventListener('change', onMotionChange),
  );

  if (!skipProbe) {
    let verdict: ProbeVerdict = 'inconclusive';
    for (let attempt = 0; attempt < PROBE_ATTEMPTS && verdict === 'inconclusive'; attempt++) {
      await whenVisible();
      const intervals: number[] = [];
      let previous = await nextFrame();
      for (let i = 0; i < PROBE_FRAMES; i++) {
        render();
        const now = await nextFrame();
        intervals.push(now - previous);
        previous = now;
      }
      verdict = probeVerdict(intervals);
    }
    if (verdict !== 'pass') {
      // A tab hidden through every attempt proves nothing about the GPU: stay 2D this time,
      // but let the next load try again.
      fallBack(verdict === 'fail');
      return;
    }
  }

  // Below the hero the tube and the line share every pixel, so the swap is invisible; with
  // the hero on screen they differ, so it crossfades once (design §6 step 5).
  const years = document.querySelector('[data-signal-section="years"]');
  const isHeroOnScreen = years !== null && years.getBoundingClientRect().top > 0;
  if (isHeroOnScreen) {
    layer.classList.add('signal-crossfade');
    canvas.classList.add('signal-crossfade');
  }
  render();
  isLive = true;
  layer.classList.add('signal-layer--tube');
  canvas.classList.add('signal-canvas--on');
}
```

- [ ] **Step 3: The canvas and swap CSS**

In `src/styles/global.css`, directly after the `#signal-layer { … }` rule, add:

```css
/**
 * The Phase 10 tube's canvas (lib/gfx/scene.ts). Fixed to the viewport — the camera follows
 * the scroll instead — and in #signal-layer's stacking slot, so the islands' emissions,
 * drops and nodes still draw above it. Invisible until the scene has passed its probe.
 */
.signal-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-signal);
  pointer-events: none;
  opacity: 0;
}

.signal-canvas--on {
  opacity: 1;
}

/* The SVG keeps measuring and publishing underneath; it is only hidden. */
#signal-layer.signal-layer--tube svg {
  opacity: 0;
}

/* The one timed transition on the site besides hover states: the tube's arrival while the
   hero is on screen, once (Phase 10 design §6 step 5). */
.signal-crossfade,
#signal-layer.signal-crossfade svg {
  transition: opacity 300ms ease;
}
```

- [ ] **Step 4: Wire the gate in `BaseLayout.astro`**

In the `<script>` at the end of `<body>`, add the import `import { checkCapability, forcedMode, readEnvironment } from '../lib/gfx/gate';` and, after `onPageProgress((t) => signal.setProgress(t));`, append:

```ts
      // Phase 10: the enhanced layer, decided only once the page is loaded and idle, so it
      // can never touch first paint or LCP. Three.js is behind this import and in no
      // initial chunk (npm run budget fails if it ever is).
      function startEnhanced(): void {
        const capability = checkCapability(readEnvironment(), forcedMode(location.search));
        if (!capability.enabled) return;
        import('../lib/gfx/scene')
          .then(({ loadEnhanced }) => loadEnhanced({ skipProbe: capability.skipProbe }))
          .catch(() => {
            // A failed chunk load or a renderer that would not start: the SVG line was never
            // hidden, so there is nothing to undo.
          });
      }
      const whenIdle = (fn: () => void) =>
        'requestIdleCallback' in window ? requestIdleCallback(fn) : fn();
      if (document.readyState === 'complete') whenIdle(startEnhanced);
      else window.addEventListener('load', () => whenIdle(startEnhanced), { once: true });
```

- [ ] **Step 5: Build, test, budget**

Run: `npx vitest run && npm run build && npm run budget`
Expected: all tests pass, the build is green, and `npm run budget` exits 0 and prints an **Enhanced WebGL chunk** line under 256,000. Record both numbers: the `/` total (base delta from Task 1's figure) and the enhanced total. If `/` loads Three.js, the budget fails; find the static import of `three` reachable from `BaseLayout` and remove it.

- [ ] **Step 6: Browser check**

Run: `npx astro preview` (after the build) and open `http://localhost:4321/` in desktop Chrome at 1440 wide.

Check each of these and note what you saw:
1. Default: the tube appears after load. The hero shows depth, and the line thins to 2D width by Nine Years.
2. `?signal=2d`: the flat SVG line, identical to `master`.
3. `?signal=tube`: the tube with no probe.
4. DevTools → Rendering → `prefers-reduced-motion: reduce`, then reload: the 2D line. Toggling it while the tube is showing hands back to 2D.
5. Narrow the window below 900px while the tube is showing: it hands back to 2D, and the line stays attached to the sections.
6. `/websites/` and a 404 URL: never a canvas (check the Elements panel for `.signal-canvas`).
7. Alignment: scroll to the Work spine, the ring split and the Stack. Toggle `.signal-layer--tube` off in the Elements panel and confirm the SVG line sits under the tube to the pixel.
8. Network panel on a default load: the Three.js chunk is requested only after the `load` event.

Take screenshots of items 1 and 7 for the checkpoint.

- [ ] **Step 7: Commit**

```bash
git add src/lib/signal/tube-signal.ts src/lib/gfx/scene.ts src/layouts/BaseLayout.astro src/styles/global.css
git commit -m "feat: Phase 10 signal tube — renderer, scene and gate wiring" -m "The tube paints the published geometry over the running SVG line: real depth in the hero, the SVG's own pixels below it, a shader glow, an exact reveal at the tip. Loaded after load+idle behind the gate, probed, and handed back to the SVG one way on slow frames, context loss, reduced motion or a narrow window."
```

---

### Task 8: Measure and hand to the checkpoint

**Files:**
- Modify: `BUILD-PLAN.md` (Current figures: the enhanced chunk row, JS on `/`, tests; Measurement history: one row)

- [ ] **Step 1: Lighthouse**

Run three times against the preview (`npm run build && npx astro preview`):
`npx lighthouse http://localhost:4321/ --only-categories=performance --output=json --quiet --chrome-flags="--headless=new" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.categories.performance.score*100, Math.round(r.audits['largest-contentful-paint'].numericValue))})"`
Expected: the LCP median is within noise of the recorded 1,988ms. Lighthouse emulates a phone (412px wide), so the gate says `narrow-viewport` and the tube never loads, which is the point.

- [ ] **Step 2: Record the figures**

In `BUILD-PLAN.md` → "Current figures", replace the Enhanced WebGL chunk row's "not built — Phase 10" with the measured gzip and percentage, and update JS on `/` and Tests with today's values. Add one row to "Measurement history": `| Phase 10 · 2026-09-30 | <JS on /> | <pct> | <tests> |`.

- [ ] **Step 3: Commit**

```bash
git add BUILD-PLAN.md
git commit -m "docs: Phase 10 figures — enhanced chunk, base JS, LCP"
```

- [ ] **Step 4: Checkpoint**

Stop. Hand Noel the Task 7 screenshots and the numbers. He reviews the hero moment, the thickness (`HERO_RADIUS` in `scene.ts`), the depth (`HERO_DEPTH_FACTOR` in `camera.ts`) and the glow (`GLOW_*` in `tube-signal.ts`) on his desktop. Tuning those constants is a follow-up commit. Nothing merges to `master` before he approves.

---

## Revision — 2026-09-30, after Noel's first look (Task 9)

Noel saw the tube (Tasks 1–7 as built, `a3cec21`). The spine looks right. The hero does not: a line hovering in the middle of the hero at first load reads as a phantom. His decisions, all confirmed in conversation:

| # | Decision | Replaces |
|---|---|---|
| R1 | **The line starts at the bottom of the hero, for both renderers.** No line in the hero at all; the tip emerges at the hero's bottom edge as you scroll. | Design D1 (real depth in the hero) and parent spec §6's hero row |
| R2 | **8px everywhere**: `--signal-stroke: 8px`. The SVG line, work branches, ring track and drops, footer bar and gutter clearance all derive from the token. The tube is a uniform radius of `--signal-stroke / 2`. | Design D2 (thick hero, 2D width below) |
| R3 | **The tube is full `--signal` everywhere, with no dim rule.** The **2D line keeps its dim rule**: phones get 2D, and there the whole line runs behind copy. | The tube half of spec §5 "Shading" |
| R4 | The hero's depth and thickness code is now dead and is **removed**: the tube lies flat (z = 0) everywhere. Because the SVG and the tube now coincide at every point, **the swap is always instant**, and the 300ms crossfade (the one timer exception) goes. | Design §5 hero depth/radius, §6 step 5 crossfade |

**Accepted cost (a Known Gap, owned by Noel):** at ≥ 900px, text drawn over the full-strength tube fails AA (`--type` on `--signal` 2.9:1, `--type-dim` 1.1:1). Revisit later with Noel's idea: the line dives into a "hole" where a text block starts and comes out where it ends.

**To check at the next look:** the emission dots and the Stack's nodes were sized beside a 4px line.

### Task 9: The revised look — line from the hero's bottom, 8px, full strength

**Files:**
- Modify: `src/lib/signal/path.ts` (export `DRAWN_FROM_T`)
- Modify: `src/lib/signal/svg-signal.ts` (sample from `DRAWN_FROM_T`; publish the slimmer geometry; `applyStrength` back to `void`)
- Modify: `src/lib/signal/tip.ts` (`SignalGeometryPoint` is `{ x, y }`; `SignalGeometry` is `{ points, lengths }`)
- Modify: `src/lib/signal/gutter.ts` (remove `strengthAt`: no consumer is left)
- Replace: `src/lib/gfx/tube-mesh.ts`, `src/lib/signal/tube-signal.ts` (full code below)
- Modify: `src/lib/gfx/camera.ts` (remove `HERO_DEPTH_FACTOR`, `heroDepthFor`; `far = distance * 2`)
- Modify: `src/lib/gfx/scene.ts` (uniform radius from the token; no hero depth; instant swap)
- Modify: `src/styles/tokens.css` (`--signal-stroke: 8px`), `src/styles/global.css` (remove the `.signal-crossfade` rules)
- Tests: `tests/signal-geometry.test.ts`, `tests/gfx-tube-mesh.test.ts`, `tests/gfx-camera.test.ts`, `tests/signal-path.test.ts`
- Docs (same commit, AGENTS.md rule): the design doc, and the parent spec's §6 (the `TubeSignal` bullet and the hero row) and §8's hero visual line (the one that says "the signal tube entering from deep Z")

**Interfaces:**
- Produces:
  ```ts
  // path.ts
  export const DRAWN_FROM_T: number; // SECTION_SPANS' years tStart — control point 7
  // tip.ts
  export interface SignalGeometryPoint { x: number; y: number }
  export interface SignalGeometry { points: readonly SignalGeometryPoint[]; lengths: readonly number[] }
  // tube-mesh.ts
  export interface TubeProfile { radius: number; radialSegments: number }
  export interface TubeArrays { positions: Float32Array; normals: Float32Array; lengths: Float32Array; indices: Uint32Array; centres: Float32Array; ringLengths: Float32Array }
  export function buildTube(geometry: SignalGeometry, profile: TubeProfile, radiusScale?: number, radiusPad?: number): TubeArrays;
  export function pointAtLength(tube: TubeArrays, length: number): { x: number; y: number; z: number };
  export function hexToRgb(hex: string): [number, number, number];
  // tube-signal.ts
  export interface TubeLook { color: [number, number, number]; radius: number }
  export interface TubeSignal { group: Group; rebuild(geometry: SignalGeometry): void; setTip(pageY: number): void; dispose(): void }
  // camera.ts
  export function cameraRig(width: number, height: number, scrollX: number, scrollY: number): CameraRig; // unchanged signature
  ```

- [ ] **Step 1: Failing tests first**

In `tests/signal-path.test.ts`, add (import `DRAWN_FROM_T` and `SECTION_SPANS`, and `controlPointT` if they aren't already imported):

```ts
describe('DRAWN_FROM_T — where the drawn line begins', () => {
  // Noel, 2026-09-30: no line in the hero; it emerges at the hero's bottom edge.
  it('is the Nine Years seam, control point 7', () => {
    expect(DRAWN_FROM_T).toBe(SECTION_SPANS.find((s) => s.id === 'years')!.tStart);
    expect(DRAWN_FROM_T).toBeCloseTo(controlPointT(7), 12);
  });
});
```

Replace `tests/gfx-tube-mesh.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { sampleSignalRange } from '../src/lib/signal/path';
import { DRAWN_FROM_T } from '../src/lib/signal/path';
import { toPixelPoints } from '../src/lib/signal/anchors';
import { cumulativeLengths } from '../src/lib/signal/playhead';
import type { SignalGeometry } from '../src/lib/signal/tip';
import { buildTube, hexToRgb, pointAtLength, type TubeProfile } from '../src/lib/gfx/tube-mesh';

/** The line as the SVG draws it on the real 1440 page, from the hero's bottom edge down. */
function referenceGeometry(): SignalGeometry {
  const samples = sampleSignalRange(DRAWN_FROM_T, 1, 413);
  const pixels = toPixelPoints(samples, 1425, [65, 923.4, 1975.9, 4762.1, 6041.9, 7239.9, 8494.9], [2435, 4589.3, 5223.2]);
  return { points: pixels, lengths: cumulativeLengths(pixels) };
}

const profile: TubeProfile = { radius: 4, radialSegments: 12 };

describe('buildTube', () => {
  const geometry = referenceGeometry();
  const tube = buildTube(geometry, profile);
  const rings = geometry.points.length;
  const segments = profile.radialSegments;

  it('has one ring per published point, centred on it, flat on the page', () => {
    geometry.points.forEach((p, i) => {
      // Float32 buffers: ~1e-4 px of rounding at page scale, far below a pixel.
      expect(tube.centres[i * 3]).toBeCloseTo(p.x, 2);
      expect(tube.centres[i * 3 + 1]).toBeCloseTo(-p.y, 2);
      expect(tube.centres[i * 3 + 2]).toBe(0);
    });
  });

  it('sizes its buffers to rings × segments', () => {
    expect(tube.positions.length).toBe(rings * segments * 3);
    expect(tube.normals.length).toBe(rings * segments * 3);
    expect(tube.lengths.length).toBe(rings * segments);
    expect(tube.indices.length).toBe((rings - 1) * segments * 6);
  });

  it('is one radius the whole way — the 2D stroke, halved', () => {
    for (let ring = 0; ring < rings; ring += 37) {
      for (let j = 0; j < segments; j++) {
        const v = (ring * segments + j) * 3;
        const offset = [0, 1, 2].map((k) => tube.positions[v + k] - tube.centres[ring * 3 + k]);
        expect(Math.hypot(...offset)).toBeCloseTo(4, 2);
        const normal = [0, 1, 2].map((k) => tube.normals[v + k]);
        expect(Math.hypot(...normal)).toBeCloseTo(1, 5);
        expect(offset.reduce((sum, o, k) => sum + o * normal[k], 0)).toBeGreaterThan(0);
      }
    }
  });

  it('never flips its frame from ring to ring, through the tightest turns on the line', () => {
    for (let ring = 0; ring < rings - 1; ring++) {
      const a = ring * segments * 3;
      const b = (ring + 1) * segments * 3;
      const dot = tube.normals[a] * tube.normals[b] + tube.normals[a + 1] * tube.normals[b + 1] + tube.normals[a + 2] * tube.normals[b + 2];
      expect(dot).toBeGreaterThan(0.5);
    }
  });

  it('carries length per vertex from the geometry', () => {
    expect(tube.lengths[200 * segments + 3]).toBeCloseTo(geometry.lengths[200], 3);
  });

  it('scales and pads the radius for the glow shell', () => {
    const halo = buildTube(geometry, profile, 3, 2);
    const v = 300 * segments * 3;
    const offset = [0, 1, 2].map((k) => halo.positions[v + k] - halo.centres[300 * 3 + k]);
    expect(Math.hypot(...offset)).toBeCloseTo(4 * 3 + 2, 2);
  });

  // Front faces must face out: the materials cull back faces.
  it('winds every triangle to face away from its ring centre', () => {
    const vertex = (n: number) => [0, 1, 2].map((k) => tube.positions[n * 3 + k]);
    for (let t = 0; t < tube.indices.length; t += 6 * 97) {
      const [a, b, c] = [tube.indices[t], tube.indices[t + 1], tube.indices[t + 2]].map(vertex);
      const ab = [0, 1, 2].map((k) => b[k] - a[k]);
      const ac = [0, 1, 2].map((k) => c[k] - a[k]);
      const face = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const ring = Math.floor(tube.indices[t] / segments);
      const outward = [0, 1, 2].map((k) => a[k] - tube.centres[ring * 3 + k]);
      expect(face.reduce((sum, f, k) => sum + f * outward[k], 0)).toBeGreaterThan(0);
    }
  });
});

describe('pointAtLength', () => {
  const tube = buildTube(referenceGeometry(), profile);

  it('lands on a ring at its own length, and between rings in proportion', () => {
    expect(pointAtLength(tube, tube.ringLengths[100]).x).toBeCloseTo(tube.centres[300], 6);
    const halfway = (tube.ringLengths[100] + tube.ringLengths[101]) / 2;
    expect(pointAtLength(tube, halfway).y).toBeCloseTo((tube.centres[301] + tube.centres[304]) / 2, 6);
  });

  it('clamps before the start and past the end', () => {
    expect(pointAtLength(tube, -50).x).toBe(tube.centres[0]);
    const last = tube.ringLengths.length - 1;
    expect(pointAtLength(tube, 1e9).y).toBe(tube.centres[last * 3 + 1]);
  });
});

describe('hexToRgb', () => {
  it('reads the palette token as sRGB channels', () => {
    const [r, g, b] = hexToRgb('#FF4B54');
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0x4b / 255, 9);
    expect(b).toBeCloseTo(0x54 / 255, 9);
    expect(hexToRgb('  #ff4b54 ')).toEqual([r, g, b]);
  });
});
```

In `tests/signal-geometry.test.ts`: remove the `strengthAt` describe block and its import; change the `geometry()` fixture to `{ points: [{ x: 0, y: tag }, { x: 0, y: tag + 10 }], lengths: [0, 10] }`.

In `tests/gfx-camera.test.ts`: remove the two tests that use `heroDepthFor` (`draws a point behind the page…` and `keeps the deepest hero point…`) and drop it from the import.

Run: `npx vitest run tests/signal-path.test.ts tests/gfx-tube-mesh.test.ts tests/signal-geometry.test.ts tests/gfx-camera.test.ts`
Expected: FAIL (`DRAWN_FROM_T` is not exported; `TubeProfile.radius` does not match).

- [ ] **Step 2: `path.ts` — where the line begins**

After `SECTION_SPANS`, add:

```ts
/**
 * Where the drawn line begins: the Nine Years seam, at the hero's bottom edge. The hero
 * carries no line (Noel, 2026-09-30 — a line hovering mid-hero at first load read as a
 * phantom). The hero's control points stay: they still set the curve's direction as it
 * arrives at this seam, because Catmull-Rom takes point 7's tangent from points 6 and 8.
 */
export const DRAWN_FROM_T = SECTION_SPANS.find((span) => span.id === 'years')!.tStart;
```

Update the hero block's comment in `CONTROL_POINTS` to say that these points shape the entry and are not drawn.

- [ ] **Step 3: `svg-signal.ts` — draw from there, publish the slimmer geometry**

1. Import `DRAWN_FROM_T` from `./path`. In `sampleWholeCurve`, build the cuts from it:

```ts
  const cuts = [
    DRAWN_FROM_T,
    ...SECTION_SPANS.map((span) => span.tStart).filter((t) => t > DRAWN_FROM_T),
    ...ANCHOR_T,
    1,
  ].sort((a, b) => a - b);
```

Update the function's comment to say the line is sampled from `DRAWN_FROM_T`, not from 0.

2. Restore `applyStrength` to return `void` and write `strengthStops(...)` inline as it did before Task 1. Drop `strengthAt` and `StrengthStop` from the gutter import.
3. Replace the `publishSignalGeometry({...})` call with:

```ts
    const boxLeftInPage = boxRect.left + window.scrollX;
    publishSignalGeometry({
      points: pixelPoints.map((p) => ({ x: boxLeftInPage + p.x, y: boxTopInPage + p.y })),
      lengths: lengthTable,
    });
```

and trim its comment to: *For the Phase 10 tube (tip.ts): the same points, in page px.*

- [ ] **Step 4: `tip.ts` and `gutter.ts`**

`tip.ts`: `SignalGeometryPoint` becomes `{ x: number; y: number }` (doc: *One drawn point, in page px.*). `SignalGeometry` loses `strength`. The module comment's geometry bullet becomes *the line's points and lengths*.
`gutter.ts`: delete `strengthAt` and its doc comment.

- [ ] **Step 5: Replace `src/lib/gfx/tube-mesh.ts`**

```ts
/**
 * The tube's geometry, built straight from the points the SVG line is drawn through
 * (`SignalGeometry`, tip.ts). Not `THREE.TubeGeometry`: that needs its own `Curve` and
 * re-samples it — a second definition of the line (Phase 10 design, D4).
 *
 * One ring of vertices per published point, flat on the page (world z = 0, camera.ts) and
 * one radius the whole way (revision R2, R4), oriented by rotation-minimising frames (the
 * double-reflection method), which never twist or flip at a tight turn the way Frenet frames
 * do. Pure: typed arrays out, no Three.js — tube-signal.ts turns them into buffers.
 */

import type { SignalGeometry } from '../signal/tip';

export interface TubeProfile {
  /** Half of `--signal-stroke`, px. */
  radius: number;
  radialSegments: number;
}

export interface TubeArrays {
  positions: Float32Array;
  normals: Float32Array;
  lengths: Float32Array;
  indices: Uint32Array;
  centres: Float32Array;
  ringLengths: Float32Array;
}

type Vec3 = [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalise = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length > 0 ? scale(a, 1 / length) : [0, 0, 1];
};
/** `v` reflected in the plane through the origin with normal `n` (`nn` = n·n). */
const reflect = (v: Vec3, n: Vec3, nn: number): Vec3 => sub(v, scale(n, (2 * dot(n, v)) / nn));

export function buildTube(
  geometry: SignalGeometry,
  profile: TubeProfile,
  radiusScale = 1,
  radiusPad = 0,
): TubeArrays {
  const rings = geometry.points.length;
  const segments = profile.radialSegments;
  const radius = profile.radius * radiusScale + radiusPad;
  // Page px → world: x as is, y negated, on the page plane (camera.ts convention).
  const centres: Vec3[] = geometry.points.map((p) => [p.x, -p.y, 0]);

  const tangents: Vec3[] = centres.map((_, i) =>
    normalise(sub(centres[Math.min(i + 1, rings - 1)], centres[Math.max(i - 1, 0)])),
  );

  // First frame: any vector perpendicular to the first tangent. After that each frame is the
  // previous one carried along by two reflections — the rotation-minimising frame.
  const frames: Vec3[] = new Array(rings);
  const seed: Vec3 = Math.abs(tangents[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  frames[0] = normalise(cross(tangents[0], seed));
  for (let i = 0; i < rings - 1; i++) {
    const step = sub(centres[i + 1], centres[i]);
    const stepLength = dot(step, step);
    if (!(stepLength > 0)) {
      frames[i + 1] = frames[i];
      continue;
    }
    const carried = reflect(frames[i], step, stepLength);
    const carriedTangent = reflect(tangents[i], step, stepLength);
    const correction = sub(tangents[i + 1], carriedTangent);
    const correctionLength = dot(correction, correction);
    frames[i + 1] = normalise(correctionLength > 1e-18 ? reflect(carried, correction, correctionLength) : carried);
  }

  const vertexCount = rings * segments;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const lengths = new Float32Array(vertexCount);
  const centreArray = new Float32Array(rings * 3);

  for (let i = 0; i < rings; i++) {
    centreArray.set(centres[i], i * 3);
    const across = frames[i];
    const around = cross(tangents[i], across);
    for (let j = 0; j < segments; j++) {
      const angle = (2 * Math.PI * j) / segments;
      const out: Vec3 = [
        across[0] * Math.cos(angle) + around[0] * Math.sin(angle),
        across[1] * Math.cos(angle) + around[1] * Math.sin(angle),
        across[2] * Math.cos(angle) + around[2] * Math.sin(angle),
      ];
      const v = i * segments + j;
      positions.set([centres[i][0] + out[0] * radius, centres[i][1] + out[1] * radius, centres[i][2] + out[2] * radius], v * 3);
      normals.set(out, v * 3);
      lengths[v] = geometry.lengths[i];
    }
  }

  const indices = new Uint32Array((rings - 1) * segments * 6);
  let k = 0;
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j;
      const b = i * segments + ((j + 1) % segments);
      const c = a + segments;
      const d = b + segments;
      // Counter-clockwise seen from outside, so the default front-face culling keeps the
      // outer surface only (the ring runs right-handed about the tangent).
      indices.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }

  return { positions, normals, lengths, indices, centres: centreArray, ringLengths: Float32Array.from(geometry.lengths) };
}

/** The tube's centre at `length` px along it — where the tip's cap sits. */
export function pointAtLength(tube: TubeArrays, length: number): { x: number; y: number; z: number } {
  const last = tube.ringLengths.length - 1;
  const ringAt = (i: number) => ({ x: tube.centres[i * 3], y: tube.centres[i * 3 + 1], z: tube.centres[i * 3 + 2] });
  if (!(length > tube.ringLengths[0])) return ringAt(0);
  if (length >= tube.ringLengths[last]) return ringAt(last);

  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tube.ringLengths[mid] < length) lo = mid + 1;
    else hi = mid;
  }
  const [before, after] = [ringAt(lo - 1), ringAt(lo)];
  const span = tube.ringLengths[lo] - tube.ringLengths[lo - 1];
  const t = span > 0 ? (length - tube.ringLengths[lo - 1]) / span : 1;
  const mix = (a: number, b: number) => a + (b - a) * t;
  return { x: mix(before.x, after.x), y: mix(before.y, after.y), z: mix(before.z, after.z) };
}

/**
 * A `#RRGGBB` token as sRGB channels 0..1. The shaders write these straight to the canvas,
 * which is sRGB — going through THREE.Color would convert to linear and darken the red.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.trim().replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
```

- [ ] **Step 6: Replace `src/lib/signal/tube-signal.ts`**

```ts
/**
 * The 3D renderer for the signal (Phase 10): Three.js meshes over `tube-mesh.ts`'s arrays.
 * It measures nothing and samples nothing — the SVG renderer publishes the line
 * (`SignalGeometry`, tip.ts) and this paints it, so the two can never disagree about where
 * the line is (Phase 10 design, D3).
 *
 * Full `--signal` along its whole length (revision R3): the dim rule stays with the 2D line.
 * Two meshes share the shape: the core, shaded round by its normal against the view, and an
 * additive glow shell (design D5 — no post-processing). Both cut off at the tip in the
 * fragment shader, so the reveal is exact rather than ring by ring, and a sphere caps the tip
 * like the SVG's round linecap.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { buildTube, pointAtLength, type TubeArrays, type TubeProfile } from '../gfx/tube-mesh';
import { lengthAtY } from './playhead';
import type { SignalGeometry } from './tip';

export interface TubeLook {
  /** `--signal` as sRGB channels (tube-mesh.ts `hexToRgb`). */
  color: [number, number, number];
  /** Half of `--signal-stroke`. */
  radius: number;
}

export interface TubeSignal {
  group: Group;
  rebuild(geometry: SignalGeometry): void;
  /** The published tip's page y (tip.ts). */
  setTip(pageY: number): void;
  dispose(): void;
}

const RADIAL_SEGMENTS = 12;
/** The glow shell: this many times the core's radius, plus this many px. Tuned at the checkpoint. */
const GLOW_SCALE = 3;
const GLOW_PAD = 2;
const GLOW_STRENGTH = 0.35;

const VERTEX = /* glsl */ `
  attribute float aLength;
  varying float vLength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vLength = aLength;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// Round without lights: bright where the surface faces the camera, darker toward the rim.
const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDrawn;
  varying float vLength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #ifndef CAP
      if (vLength > uDrawn) discard;
    #endif
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    vec3 shaded = uColor * mix(0.45, 1.0, pow(facing, 0.6)) + vec3(pow(facing, 12.0) * 0.25);
    gl_FragColor = vec4(shaded, 1.0);
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDrawn;
  uniform float uGlow;
  varying float vLength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #ifndef CAP
      if (vLength > uDrawn) discard;
    #endif
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    gl_FragColor = vec4(uColor, pow(facing, 2.0) * uGlow);
  }
`;

export function createTubeSignal(look: TubeLook): TubeSignal {
  const group = new Group();
  const uniforms = {
    uColor: { value: new Vector3(...look.color) },
    uDrawn: { value: 0 },
    uGlow: { value: GLOW_STRENGTH },
  };

  const material = (fragmentShader: string, isGlow: boolean, isCap: boolean) =>
    new ShaderMaterial({
      uniforms, // shared: one uDrawn moves every part
      vertexShader: VERTEX,
      fragmentShader,
      defines: isCap ? { CAP: '' } : {},
      // The core is opaque; only the glow blends. Front faces only (tube-mesh.ts winds them
      // outward). Spread, not `blending: undefined`, which Three warns about.
      transparent: isGlow,
      depthWrite: !isGlow,
      ...(isGlow ? { blending: AdditiveBlending } : {}),
    });

  const coreMesh = new Mesh(new BufferGeometry(), material(CORE_FRAGMENT, false, false));
  const glowMesh = new Mesh(new BufferGeometry(), material(GLOW_FRAGMENT, true, false));
  const capGeometry = new SphereGeometry(1, 16, 12);
  const coreCap = new Mesh(capGeometry, material(CORE_FRAGMENT, false, true));
  const glowCap = new Mesh(capGeometry, material(GLOW_FRAGMENT, true, true));
  glowMesh.renderOrder = 1;
  glowCap.renderOrder = 1;
  coreCap.scale.setScalar(look.radius);
  glowCap.scale.setScalar(look.radius * GLOW_SCALE + GLOW_PAD);
  group.add(coreMesh, glowMesh, coreCap, glowCap);

  let core: TubeArrays | null = null;
  let points: SignalGeometry['points'] = [];
  let lengths: SignalGeometry['lengths'] = [];
  let tipY: number | null = null;

  function toBufferGeometry(arrays: TubeArrays): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(arrays.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(arrays.normals, 3));
    geometry.setAttribute('aLength', new BufferAttribute(arrays.lengths, 1));
    geometry.setIndex(new BufferAttribute(arrays.indices, 1));
    return geometry;
  }

  function placeCaps(): void {
    if (!core || tipY === null) return;
    const drawn = lengthAtY(points, lengths, tipY);
    uniforms.uDrawn.value = drawn;
    const tip = pointAtLength(core, drawn);
    coreCap.position.set(tip.x, tip.y, tip.z);
    glowCap.position.set(tip.x, tip.y, tip.z);
  }

  function rebuild(geometry: SignalGeometry): void {
    const profile: TubeProfile = { radius: look.radius, radialSegments: RADIAL_SEGMENTS };
    core = buildTube(geometry, profile);
    points = geometry.points;
    lengths = geometry.lengths;
    coreMesh.geometry.dispose();
    glowMesh.geometry.dispose();
    coreMesh.geometry = toBufferGeometry(core);
    glowMesh.geometry = toBufferGeometry(buildTube(geometry, profile, GLOW_SCALE, GLOW_PAD));
    placeCaps();
  }

  function setTip(pageY: number): void {
    tipY = pageY;
    placeCaps();
  }

  function dispose(): void {
    for (const mesh of [coreMesh, glowMesh, coreCap, glowCap]) (mesh.material as ShaderMaterial).dispose();
    coreMesh.geometry.dispose();
    glowMesh.geometry.dispose();
    capGeometry.dispose();
  }

  return { group, rebuild, setTip, dispose };
}
```

One behaviour to check in the browser: above `DRAWN_FROM_T` the tip is clamped to the line's first point, so `lengthAtY` returns 0 and the cap sits at the line's start. The cap must not be visible before the line has started to draw. Hide both caps while `drawn <= 0` by adding `coreCap.visible = glowCap.visible = drawn > 0;` to `placeCaps`, after `uDrawn` is set.

- [ ] **Step 7: `camera.ts` and `scene.ts`**

`camera.ts`: delete `HERO_DEPTH_FACTOR` and `heroDepthFor`, and set `far: distance * 2`. Replace the module comment's hero sentence with: the tube lies on the page plane everywhere (revision R4), so this is 1:1 at every point; a perspective camera is kept so that depth (Phase 12's ring) needs no new rig.

`scene.ts`:
- Remove `heroDepthFor` from the camera import, and the `HERO_RADIUS` constant.
- Create the tube with `createTubeSignal({ color: hexToRgb(tokens.getPropertyValue('--signal')), radius: parseFloat(tokens.getPropertyValue('--signal-stroke')) / 2 })`.
- Delete `let heroDepth = …`. The geometry subscription becomes `onSignalGeometry((geometry) => { tube.rebuild(geometry); requestRender(); })`.
- Replace the swap block (from `// Below the hero the tube and the line share every pixel…` to just before `render();`) with this comment only: `// The tube and the SVG line now share every pixel (revision R4), so the swap is instant.`
- Update the module comment's "the swap from the SVG line" wording accordingly.

- [ ] **Step 8: CSS**

`tokens.css`: `--signal-stroke: 8px;`. Keep the comment above it and add: *8px since Phase 10's revision (2026-09-30): the tube reads as a tube at this weight, and every branch, drop and bar derives from it.*
`global.css`: delete the `.signal-crossfade` rule and its comment.

- [ ] **Step 9: Docs, in this same commit**

- **Design doc** (`docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md`): add a "Revision — 2026-09-30" section after §2 with the R1–R4 table and the accepted-cost paragraph from this plan's revision header. Mark D1 and D2 "superseded by R1/R2/R4". Update §4.1's interface to `{ points: { x, y }[]; lengths }`. In §5, replace the Hero depth and Radius bullets with the uniform radius, and the Shading bullet's dim sentence with "full `--signal` everywhere (R3)". In §6, replace step 5 with "Swap: instant — the tube and the line share every pixel". Update §7's test list: remove the `heroWeight` and strength bullets, and add `DRAWN_FROM_T`.
- **Parent spec** (`2026-09-19-signal-path-design.md`): in §6, the `TubeSignal` bullet becomes "…extruded through the same sampled points the SVG draws, with a glow; flat on the page, full strength, one weight (Phase 10 design, revision 2026-09-30)". The per-section table's Hero row becomes "No line: the signal begins at the hero's bottom edge (Phase 10 revision, 2026-09-30)". In §8's hero **Visual** line, replace "plus the signal tube entering from deep Z" with "; the signal begins below the hero".

- [ ] **Step 10: Gates, browser check, commit**

Run: `npx vitest run && npm run build && npm run budget` and record `/` and the enhanced figure.
Browser, on the controller's machine: the hero shows no line in both `/` and `?signal=2d`, and the tip emerges at the hero's bottom edge. The tube is 8px and full strength everywhere, while `?signal=2d` is 8px and still dims over content. The ring's drops and the Work branches meet the tube at the same weight.

```bash
git add -A src tests docs/superpowers/specs
git commit -m "feat: Phase 10 revision — line from the hero's bottom, 8px, full-strength tube" -m "Noel's first look: a line hovering mid-hero read as a phantom. Both renderers now start at the Nine Years seam; the stroke token doubles to 8px so branches and drops keep pace; the tube drops the dim rule (the 2D line keeps it for phones) and its hero depth code, which makes the swap instant."
```

Task 8's figures are recorded after Task 9, not before.
