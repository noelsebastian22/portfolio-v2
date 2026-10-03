# Phase 10 — WebGL gate + signal tube: design

**Date:** 2026-09-30 · **Status:** approved in conversation, awaiting written review ·
**Parent spec:** `2026-09-19-signal-path-design.md` (§6 The Signal, §12 Performance Budget)

## 1. Intent

On a capable desktop the signal becomes a lit tube that **rises out of real depth in the
hero** and lies flat on the page from the Nine Years seam down, moving exactly like the 2D
line and carrying every emission, drop and node the sections attach to it. *(The hero half is
superseded by R1/R4: both renderers begin at the hero's bottom edge, and the tube lies flat
everywhere.)* Everyone else —
phones, reduced motion, Save-Data, weak GPUs — gets today's 2D site unchanged, and the base
bundle barely moves.

Success:

1. Below the hero the tube lands on the same CSS pixels as the SVG line, so no island
   changes.
2. ~~The hero shows a genuine 3D moment: the far end small and drawn toward the screen centre,
   rising forward past the headline.~~ *(Superseded by R1/R4: there is no line in the hero.)*
3. Three.js is in no initial chunk; the enhanced chunk is ≤ 250KB gzip; LCP is unchanged.
4. Any gate failure or runtime trouble lands on the 2D line with no visible break.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Real 3D in the hero only.** The curve's `z` is real depth in the hero and eases to exactly 0 by the Nine Years seam (control point 7); below it `z` is ignored for position. *(Superseded by R1/R2/R4.)* | Four islands pin elements to the 2D line's on-screen position. Perspective anywhere else would slide the tube off them. The hero has nothing pinned to it. |
| D2 | **Thick in the hero, 2D width below.** ~24px across at the headline (a starting value, tuned at the checkpoint), tapering to `--signal-stroke` by the Nine Years seam. *(Superseded by R1/R2/R4.)* | A tube only reads as round when thick; every dot, drop and node is sized for a 4px line. |
| D3 | **Overlay on the running 2D line.** `svg-signal.ts` keeps measuring, publishing the tip and the curve lookup; it gains one geometry publication. The tube is a painter over it. | Minimal change to live code. The islands' source of truth is untouched. Fallback is instant: unhide the SVG. |
| D4 | **A custom tube mesh, not `TubeGeometry`.** | `TubeGeometry` needs its own `Curve` and re-samples it — a second definition of the curve, against AGENTS.md's "one canonical curve". It also cannot vary radius along its length. |
| D5 | **Glow in the shader, not post-process bloom.** | Near-zero per-frame cost and no extra code, so the frame probe passes on more machines. Bloom (`UnrealBloomPass`, ~10KB, several full-screen passes) is the fallback option if the glow looks flat at the checkpoint. |
| D6 | **Render on change only.** The scene redraws when the scroll position or the tip changes; there is no free-running loop. A change marks the scene dirty, and it draws in the same `gsap.ticker` tick that Lenis scrolled in (`render-schedule.ts`): a fresh `requestAnimationFrame` booked from inside the ticker drew every other frame (final review, C1). | "The scroll is the transport." An idle page costs the GPU nothing. |
| D7 | **Fallback is one-way per visit,** remembered in `sessionStorage` (wrapped in try/catch). | Flicking between renderers is worse than staying on 2D; a reload should not retry a tube that just failed. |
| D8 | **The Stack's colour/thickness effect is out of scope.** It stays a per-vertex attribute on the one mesh, not a second renderer. Since R4 the mesh carries only `aLength`, the reveal's; the effect adds its own attributes to `buildTube` when it comes. | Noel may rework the Stack section; its effect is decided in that brainstorm. |

## Revision — 2026-09-30, after Noel's first look

Noel saw the tube (Tasks 1–7 as built, `a3cec21`). The spine looks right. The hero does not: a
line hovering in the middle of the hero at first load reads as a phantom. His decisions, all
confirmed in conversation:

| # | Decision | Replaces |
|---|---|---|
| R1 | **The line starts at the bottom of the hero, for both renderers.** No line in the hero at all; the tip emerges at the hero's bottom edge as you scroll. | Design D1 (real depth in the hero) and parent spec §6's hero row |
| R2 | **8px everywhere**: `--signal-stroke: 8px`. The SVG line, work branches, ring track and drops, footer bar and gutter clearance all derive from the token. The tube is a uniform radius of `--signal-stroke / 2`. | Design D2 (thick hero, 2D width below) |
| R3 | **The tube is full `--signal` everywhere, with no dim rule.** The **2D line keeps its dim rule**: phones get 2D, and there the whole line runs behind copy. | The tube half of spec §5 "Shading" |
| R4 | The hero's depth and thickness code is now dead and is **removed**: the tube lies flat (z = 0) everywhere. Because the SVG and the tube now coincide at every point, **the swap is always instant**, and the 300ms crossfade (the one timer exception) goes. | Design §5 hero depth/radius, §6 step 5 crossfade |

**Accepted cost (a Known Gap, owned by Noel):** at ≥ 900px, text drawn over the full-strength
tube fails AA (`--type` on `--signal` 2.9:1, `--type-dim` 1.1:1). Revisit later with Noel's
idea: the line dives into a "hole" where a text block starts and comes out where it ends.

**To check at the next look:** the emission dots and the Stack's nodes were sized beside a 4px
line.

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
| `src/lib/gfx/render-schedule.ts` | Pure: the dirty flag and the tick hook — draws in the scroll driver's tick when something changed, and reports the interval between drawn ticks to the watchdog. | nothing (the ticker and clock are injected) | no |
| `src/lib/signal/tube-signal.ts` | Geometry message → mesh + shader material; updates the reveal uniform from the tip. | three, `tube-mesh.ts` | no |
| `src/lib/gfx/tube-mesh.ts` | Pure: builds vertex rings around the published points with parallel-transport frames (no flips at tight turns), one radius the whole way, and a per-vertex length for the reveal (R2, R4 — the per-vertex radius and strength went with the hero). | nothing | no |
| `src/lib/gfx/camera.ts` | Pure: the perspective setup that maps the `z = 0` plane 1:1 to CSS pixels at a given scroll and viewport. | nothing | no |

`BaseLayout.astro`'s script runs the gate after `load` + idle and calls `import('../lib/gfx/scene')`
only when it passes.

### 4.1 The geometry message

```ts
export interface SignalGeometry {
  /** Page-pixel points — the same samples the SVG path is drawn through, from DRAWN_FROM_T on. */
  points: readonly { x: number; y: number }[];
  /** Cumulative length along the line at each point, px. */
  lengths: readonly number[];
}
```

Published on creation and after every debounced resize re-measure. Nothing re-samples `path.ts`.

## 5. Rendering

- **Camera.** A `PerspectiveCamera` at distance `D = (viewportHeight / 2) / tan(fov / 2)`
  from the page plane, centred on the viewport and moved with `scrollY`, so a point at
  `z = 0` projects onto its own CSS pixel. World units are CSS pixels (`y` negated).
- **Radius.** One uniform radius the whole way: `--signal-stroke / 2` (R2, R4). The tube lies
  flat on the page everywhere, so there is no taper and nothing tunable.
- **Shading.** An unlit shader: a bright core and a darker rim from the normal against the view
  direction reads as round, with an additive halo for the glow (D5). Colour is `--signal`,
  full `--signal` everywhere (R3). Token values are read from computed style at start-up.
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
5. **Swap:** instant — the tube and the line share every pixel. The SVG path stays mounted and
   measuring, only hidden.
6. **Watchdog → fallback (one-way):** the median interval between the last 60 drawn ticks goes
   over 25ms while scrolling, `webglcontextlost` fires, or `prefers-reduced-motion` flips to `reduce`.
   Then unhide the SVG, dispose the renderer, remove the canvas and set the session flag.
7. **Override:** `?signal=2d` forces the SVG; `?signal=tube` forces the tube and skips the probe
   (not the WebGL2 check). For verification and demos.

## 7. Testing and verification

**Vitest (pure modules):**
- `gate.ts` — each condition fails the gate alone, with fake `navigator`/`matchMedia`/canvas;
  the override parses `2d`/`tube` and ignores anything else.
- `tube-mesh.ts` — ring centres are exactly the input points, flat on the page; consecutive
  frames never flip (normal dot product > 0) through the curve's tightest turns; one radius
  the whole way; vertex/index counts match.
- `camera.ts` — a `z = 0` point projects to its CSS pixel at several scroll positions and
  viewport sizes.
- `render-schedule.ts` — a change marked earlier in a tick draws in that tick; no change, no
  draw; at 60Hz the watchdog sees 16.7ms between draws, not 33.
- `DRAWN_FROM_T` — the Nine Years seam, control point 7.

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
