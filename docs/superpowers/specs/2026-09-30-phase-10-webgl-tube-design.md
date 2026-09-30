# Phase 10 — WebGL gate + signal tube: design

**Date:** 2026-09-30 · **Status:** approved in conversation, awaiting written review ·
**Parent spec:** `2026-09-19-signal-path-design.md` (§6 The Signal, §12 Performance Budget)

## 1. Intent

On a capable desktop the signal becomes a lit tube that **rises out of real depth in the
hero** and lies flat on the page from the Nine Years seam down, moving exactly like the 2D
line and carrying every emission, drop and node the sections attach to it. Everyone else —
phones, reduced motion, Save-Data, weak GPUs — gets today's 2D site unchanged, and the base
bundle barely moves.

Success:

1. Below the hero the tube lands on the same CSS pixels as the SVG line, so no island
   changes.
2. The hero shows a genuine 3D moment: the far end small and drawn toward the screen centre,
   rising forward past the headline.
3. Three.js is in no initial chunk; the enhanced chunk is ≤ 250KB gzip; LCP is unchanged.
4. Any gate failure or runtime trouble lands on the 2D line with no visible break.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Real 3D in the hero only.** The curve's `z` is real depth in the hero and eases to exactly 0 by the Nine Years seam (control point 7); below it `z` is ignored for position. | Four islands pin elements to the 2D line's on-screen position. Perspective anywhere else would slide the tube off them. The hero has nothing pinned to it. |
| D2 | **Thick in the hero, 2D width below.** ~24px across at the headline (a starting value, tuned at the checkpoint), tapering to `--signal-stroke` by the Nine Years seam. | A tube only reads as round when thick; every dot, drop and node is sized for a 4px line. |
| D3 | **Overlay on the running 2D line.** `svg-signal.ts` keeps measuring, publishing the tip and the curve lookup; it gains one geometry publication. The tube is a painter over it. | Minimal change to live code. The islands' source of truth is untouched. Fallback is instant: unhide the SVG. |
| D4 | **A custom tube mesh, not `TubeGeometry`.** | `TubeGeometry` needs its own `Curve` and re-samples it — a second definition of the curve, against AGENTS.md's "one canonical curve". It also cannot vary radius along its length. |
| D5 | **Glow in the shader, not post-process bloom.** | Near-zero per-frame cost and no extra code, so the frame probe passes on more machines. Bloom (`UnrealBloomPass`, ~10KB, several full-screen passes) is the fallback option if the glow looks flat at the checkpoint. |
| D6 | **Render on change only.** The scene redraws when the scroll position or the tip changes; there is no free-running loop. | "The scroll is the transport." An idle page costs the GPU nothing. |
| D7 | **Fallback is one-way per visit,** remembered in `sessionStorage` (wrapped in try/catch). | Flicking between renderers is worse than staying on 2D; a reload should not retry a tube that just failed. |
| D8 | **The Stack's colour/thickness effect is out of scope.** The mesh carries per-vertex attributes so it *can* be added. | Noel may rework the Stack section; its effect is decided in that brainstorm. |

## 3. Prerequisite — done

The curve cleanup shipped first (`master` at `e06feda`, 2026-09-30): a monotone-cubic
stretching between anchors (no corners at knots), a straight work spine, opened years turns,
and no counter-bends leaving the spine or the ring split. The tube inherits it for free.

## 4. Structure

| File | Job | Depends on | In base bundle |
|---|---|---|---|
| `src/lib/signal/svg-signal.ts` (changed) | Also publishes a `SignalGeometry` on every re-measure. | — | yes (already) |
| `src/lib/signal/tip.ts` (changed) | Adds the geometry channel beside the tip and curve channels. | — | yes (already) |
| `src/lib/gfx/gate.ts` | `checkCapability()` — the static conditions; `forcedMode()` — the `?signal=` override. Pure given its inputs. | nothing | yes, small |
| `src/lib/gfx/scene.ts` | The dynamic-`import()` boundary. Renderer, fixed canvas, camera, frame probe, watchdog, swap, fallback. | three, `tip.ts` | no |
| `src/lib/signal/tube-signal.ts` | Geometry message → mesh + shader material; updates the reveal uniform from the tip. | three, `tube-mesh.ts` | no |
| `src/lib/gfx/tube-mesh.ts` | Pure: builds vertex rings around the published points with parallel-transport frames (no flips at tight turns), per-vertex radius, length and strength. | nothing | no |
| `src/lib/gfx/camera.ts` | Pure: the perspective setup that maps the `z = 0` plane 1:1 to CSS pixels at a given scroll and viewport. | nothing | no |

`BaseLayout.astro`'s script runs the gate after `load` + idle and calls `import('../lib/gfx/scene')`
only when it passes.

### 4.1 The geometry message

```ts
export interface SignalGeometry {
  /** Page-pixel points — the same samples the SVG path is drawn through — with the curve's own z and normalised y (curveY), which the tube's hero profile reads. */
  points: readonly { x: number; y: number; z: number; curveY: number }[];
  /** Cumulative length along the line at each point, px. */
  lengths: readonly number[];
  /** Dim rule per point, 0 (dim) … 1 (full), from the same bands as the SVG gradient. */
  strength: readonly number[];
}
```

Published on creation and after every debounced resize re-measure. `z` comes from the same
`sampleWholeCurve()` samples; nothing re-samples `path.ts`.

## 5. Rendering

- **Camera.** A `PerspectiveCamera` at distance `D = (viewportHeight / 2) / tan(fov / 2)`
  from the page plane, centred on the viewport and moved with `scrollY`, so a point at
  `z = 0` projects onto its own CSS pixel. World units are CSS pixels (`y` negated).
- **Hero depth.** World `z = z_curve × HERO_DEPTH × heroWeight(t)`. `heroWeight` is 1
  through the hero and eases to exactly 0 at control point 7 (smoothstep over the last hero
  segment). `HERO_DEPTH` is a tunable starting at about `1.5 × D`, so the far end sits well
  behind the page.
- **Radius.** Starts at ~12px (24px across) where the tube passes the headline, and tapers to
  `--signal-stroke / 2` by control point 7. Perspective thins the distant part on its own.
- **Shading.** An unlit shader: a bright core and a darker rim from the normal against the view
  direction reads as round, with an additive halo for the glow (D5). Colour is `--signal`. The
  per-vertex strength scales it toward `--signal-dim-alpha` exactly where the SVG dims. Token
  values are read from computed style at start-up.
- **Reveal.** A per-vertex length attribute against a `uDrawn` uniform. Fragments past the tip
  are discarded, so the cut is exact rather than stepping from ring to ring, and the tip gets a
  rounded cap to match the SVG's round linecap. `uDrawn` comes from the published tip through
  the same `lengthAtY` the SVG uses.
- **Canvas.** `position: fixed`, full viewport, `pointer-events: none`, `aria-hidden`, in
  `#signal-layer`'s stacking slot, so island elements still draw above it.
  `devicePixelRatio` is capped at 2.

## 6. Gate, loading, fallback

1. The 2D line paints first, exactly as now.
2. After `load`, in `requestIdleCallback` (or straight after `load` where that is missing):
   `checkCapability()` — `prefers-reduced-motion: no-preference`, viewport ≥ 900px,
   `saveData !== true`, `hardwareConcurrency >= 4`, WebGL2 available — and no
   session fallback flag. Any failure: stop and download nothing.
3. Pass: `import('../lib/gfx/scene')`, build the scene with the canvas at opacity 0.
4. **Frame probe:** render ~20 frames at the current scroll position. Pass if the median frame
   interval is ≤ 20ms and the 90th percentile ≤ 33ms, which holds on both 60Hz and 120Hz
   displays. Failure: dispose, set the session flag, stay on 2D.
5. **Swap:** if the hero is off-screen, swap instantly (the tube and the line coincide there);
   if it is on screen, crossfade over 300ms, once. That is a state change like a hover
   transition, not scroll choreography — a noted exception to "nothing animates on a timer",
   open to Noel's veto. The SVG path stays mounted and measuring, only hidden.
6. **Watchdog → fallback (one-way):** the median of the last 60 rendered frames goes over 25ms
   while scrolling, `webglcontextlost` fires, or `prefers-reduced-motion` flips to `reduce`.
   Then unhide the SVG, dispose the renderer, remove the canvas and set the session flag.
7. **Override:** `?signal=2d` forces the SVG; `?signal=tube` forces the tube and skips the probe
   (not the WebGL2 check). For verification and demos.

## 7. Testing and verification

**Vitest (pure modules):**
- `gate.ts` — each condition fails the gate alone, with fake `navigator`/`matchMedia`/canvas;
  the override parses `2d`/`tube` and ignores anything else.
- `tube-mesh.ts` — ring centres are exactly the input points; consecutive frames never flip
  (normal dot product > 0) through the curve's tightest turns; radius follows the D2 profile;
  vertex/index counts match.
- `heroWeight` — 1 in the hero, exactly 0 at control point 7 and everywhere after.
- `camera.ts` — a `z = 0` point projects to its CSS pixel at several scroll positions and
  viewport sizes.
- Geometry strength — matches `strengthStops` at every point.

**Build:** `npm run budget` fails if a `three` module is reachable from any page's initial
graph, and reports the enhanced chunk against 250KB gzip. The base-path delta is recorded in
`BUILD-PLAN.md`.

**Browser:** `?signal=2d` and each gate condition forced false (DevTools emulation for
reduced motion, width and Save-Data) render the 2D line identically; screenshots of the tube
against the SVG at three scroll positions below the hero line up. Lighthouse (median of 3,
preview) shows LCP unchanged.

**Checkpoint:** Noel reviews the hero moment, the thickness and the glow on his desktop before
it ships.

## 8. Out of scope

The Stack's per-vertex colour/thickness effect (D8) · real depth in the ring (Phase 12) ·
post-process bloom unless the checkpoint asks for it · any change to the islands.
