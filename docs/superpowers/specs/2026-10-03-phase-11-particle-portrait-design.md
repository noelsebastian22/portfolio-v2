# Phase 11 — WebGL particle portrait: design

**Date:** 2026-10-03 · **Status:** approved in conversation, awaiting written review ·
**Parent spec:** `2026-09-19-signal-path-design.md` (§9.01 Hero, §10 Visual Assets, §12
Performance Budget) · **Builds on:** `2026-09-30-phase-10-webgl-tube-design.md`

## 1. Intent

On a capable desktop the hero's portrait is about 40,000 cream particles that hold Noel's face,
drift faintly, and part around the cursor. Scrolling dissolves the face into a stream that
pours down to the point at the hero's bottom edge where the line begins, turning from cream to
`--signal` red as it goes — so the line visibly continues out of him. Scrolling back rebuilds
the face exactly. Everyone else gets a cream duotone still of the same photograph, which is
also the particles' only source.

This replaces the parent spec's choreography ("the line arrives, then resolves into the face"),
which Phase 10's revision R1 made impossible: the hero carries no line, so there is nothing in
it to arrive. The face is now the **source** of the line, not its destination.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Face as source.** At rest, the face; on scroll, it drains into the line's start point; reversed on the way up. | Keeps "he is made of the signal" with no line in the hero, and is driven purely by scroll — no load animation. |
| D2 | **The still becomes cream:** duotone `--ground → --type`, not `--ground → --signal`. | Red on a face read as horror: every midtone red, no highlight above red, the subject merged with the background. It also brings the portrait under the rule the ring captures already follow (parent §10): red means *live*. |
| D3 | **A tighter key light** in `scripts/portrait.mjs`: `{ cx 0.53, cy 0.37, rx 0.44, ry 0.56, inner 0.26, outer 0.98, floor 0.10 }`, was `{ 0.53, 0.38, 0.52, 0.62, 0.30, 1.15, 0.22 }`. | The door arch behind the head read as bright as the face. Previewed and approved; it also spends fewer particles on stonework. |
| D4 | **Point cloud**, not scanlines. | A hero portrait's job is the person; the likeness survives fewer particles by softening, where a thinned raster looks broken. The concept is carried by the motion and the colour, not the resting form. |
| D5 | **Red is earned:** particles are cream at rest and heat to `--signal` only as they join the line. | The colour says what the motion says, instead of being a filter over his face. |
| D6 | **Cursor: a local push.** Particles within ~80px are pushed aside and ease home when it leaves. No wake. | Always legible; a wake smears the face and is harder to tune. |
| D7 | **Idle drift, only while the hero is visible** (and the tab is). A pixel or two around home, slow. | The face reads as alive rather than printed. Phase 10's draw-on-change rule (its D6) holds everywhere else. |
| D8 | **Sampled in the browser from the still** the page already downloaded — no baked sample data. | Zero bytes on the wire with LCP at ~0 headroom; baked data (~100–150 KB gzip) would break the 250 KB chunk budget; and the face can never drift from the still. Supersedes `BUILD-PLAN.md`'s "portrait.mjs emits sample data". |
| D9 | **Bottom-first dissolve:** particles leave in order of their height in the face, lowest first. | The eyes and smile hold longest; the face thins rather than vanishing at once. |
| D10 | **A ~400ms fade** from the still to the particles, once, after load. | A dot face and a photograph never match pixel for pixel, so an instant swap pops. A state change like the preloader, not choreography — §7.4's rule is about how the page moves under scroll. |
| D11 | **Count steps down before it falls back:** 40k → 20k → 10k → the existing one-way fallback. | The verification line in `BUILD-PLAN.md`: scale down rather than drop frames. The face gets softer before it is dropped. |

## Revision R1 — 2026-10-03, after the first look

**Found:** at 1:1 the 40k-particle face read as a skull. A brightness-weighted stipple leaves the
dark features — the eyes behind the glasses, the beard — empty, and at ~600px those voids read as
holes. Six offline variants of the weighting (gamma 0.8–1.5, a density floor of 0–1, an alpha
floor of 0–0.35) all failed at 1:1: 40k random dots cannot carry eye-level detail across the
face, and the weights only trade a skull for grain. A count or placement limit, not a constant.

**Decided (Noel):**

- **D10, revised — the still stays under the particles.** When the particles mount, the still
  fades over the same ~400ms to a rest opacity of 0.4 instead of to 0. It carries the likeness
  (eyes, smile, beard); the particles carry the light, the drift, the push and the whole dissolve.
- **D12 — the still erodes bottom-up in step with the particles.** A second mask layer on the
  still, a feathered edge driven by the same `p`, hides it from the bottom up where particles are
  **halfway** along their travel: `stillErosion(p) = clamp((p − window/2) / (lastArrival − window))`,
  the share of the still's height hidden from the bottom. Halfway, not just started (first look,
  same day): eroding where particles had only begun to move uncovered the sparse particle layer
  over the dark beard and mouth, and the skull came back mid-scroll. Where particles have visibly
  gone the photograph has gone too — never a half-faded photo hanging where its particles left.
  It is fully hidden at `p = lastArrival − window/2`, before the line starts to draw. Reversing the scroll restores it, because it is the same pure function of scroll.

No GPU or bundle cost beyond a few lines: one CSS custom property written when its value
changes. On every fallback path the still returns to full opacity with no mask, as before.

## 3. Structure

Everything is behind the Phase 10 gate and `import('./scene')`; base-path JS does not change.
World units are CSS px on the page plane (`camera.ts`), so the portrait, the start point and the
pointer are all in the same page coordinates as the tube.

| Unit | Does | Tested |
|---|---|---|
| `src/lib/gfx/portrait-sample.ts` | Brightness grid → N homes (normalised 0–1 in the still's box) + a brightness per particle. Weighted by brightness × the radial falloff of `.hero__face`'s mask (`farthest-side at 50% 45%`, opaque to 86%). Seeded RNG; the output is shuffled, so any prefix is an even thinning. | Vitest |
| `src/lib/gfx/portrait-dissolve.ts` | A particle's stagger from its home `y`; its own progress at a dissolve progress `p`; the control point of its curve from home to the start point. The vertex shader implements the same formulas; this is their tested reference. | Vitest |
| `src/lib/gfx/portrait-tier.ts` | The step-down (D11), fed the existing frame watch's verdicts. | Vitest |
| `src/lib/gfx/particles.ts` | Three.js `Points`: one buffer (home, brightness, stagger) and one `ShaderMaterial`. Uniforms: the still's page box, the start point, `p`, pointer position and strength, time, `--type` and `--signal`. The count changes by `setDrawRange`, never a rebuild. | browser |
| `src/lib/gfx/portrait-source.ts` | The DOM edge: waits for the still to decode, draws its `currentSrc` to an offscreen canvas at a fixed 320×320, returns the brightness grid. Fixed size so the sample does not depend on which format or density the browser chose. | browser |

**Edits:** `scene.ts` (adds the portrait to the scene and its lifecycle), `Hero.astro` (a
`hero--particles` state class and a measurable hook on the `<figure>`), `scripts/portrait.mjs`
(D2, D3, and its header: the still is now the particles' source).

## 4. Behaviour

**Loading.** Unchanged up to the tube going live. Then, in an idle callback: the source reads the
grid, the sampler builds the homes, `particles.ts` uploads them once, the scene renders one frame
with the particles in place, and `hero--particles` fades the still out (D10). The tube never
waits for the portrait.

**Dissolve progress `p`.** The 2D reveal's tip is `playheadPageY` (`playhead.ts`): the viewport's
centre at scroll 0, sliding down with scroll. `p` runs from 0 at scroll 0 to 1 when that playhead
reaches the line's start point — the first point of the published geometry
(`onSignalGeometry`) — so the dissolve completes exactly as the line begins to draw from where
the particles converged. Computed in the scene's tick from `scrollY`, not from `onSection('hero')`,
whose range (`top bottom` → `bottom top`) is already part-way along at scroll 0. If the start
point sits less than half a hero's height below the scroll-0 playhead (a very tall window), the
range is floored at that half-height: the line then starts drawing before the face is gone,
which is accepted. `p` is a pure function of scroll, so reversing is exact.

**Per particle.** Stagger from home `y`, lowest first (D9); each particle's own progress is `p`
remapped into its window, all windows closing before `p = 1`. Its position travels a quadratic
curve from home to the start point, bowed so the stream flows rather than shoots. Along the way
colour mixes `--type → --signal` (D5) and size and alpha fall as it converges.

**At rest.** Drift (D7) is a small time-driven offset in the shader, scaled by `1 − p`. The push
(D6) displaces particles inside the radius away from the pointer; the pointer's strength eases to
zero after it leaves the hero, so particles settle back over a few hundred ms.

**When it draws.** The scene marks itself dirty every tick while an `IntersectionObserver` reports
`#hero` visible and the tab is visible — the drift loop. Below the hero the portrait is fully
dissolved (`p = 1`), contributes nothing, and the scene is back to drawing on change only.

## 5. Failure and fallback

- **Sampling or upload fails** (a decode error, a tainted canvas): the portrait's own try/catch
  leaves the still in place. The tube carries on — a portrait failure never hands the tube back.
- **GPU-level failure** (context loss, reduced motion switched on, a narrow window, the watchdog
  past the last tier): the existing one-way `fallBack`, which also removes `hero--particles`, so
  the still is back.
- **Resize:** homes are normalised to the still's box, so it is a uniform update.
- **No hero** (`/websites`, `/404`): the gate already excludes these pages.

## 6. Text contrast

The canvas paints behind text, like the tube. The straight route from the face to the start point
should pass right of the CTA row (estimated from the layout, not yet measured); the plan verifies at 900, 1280 and 1440
that the stream never crosses the H1 or the CTAs at full strength, and bows the curve away if it
does. Particles mid-stream are already fading, which bounds the cost.

## 7. Testing and verification

**Vitest:**
- `portrait-sample`: same seed → same output, different seed → different output; exactly N points,
  all in 0–1; density follows brightness on a synthetic half-bright grid; masked corners get none;
  the first 10k of a uniform grid cover its four quadrants evenly within a tolerance.
- `portrait-dissolve`: all home at `p = 0`, all at the start point at `p = 1`; lower particles
  leave first; position is monotonic in `p`; every window closes before `p = 1`.
- `portrait-tier`: sustained strain steps down one tier at a time; a single bad frame does not;
  strain at the last tier returns fall back.

**Build:** `npm run build` green; `npm run budget` — the enhanced chunk stays ≤ 250 KB gzip with
the delta recorded (estimate +3–5 KB), and base JS on `/` is byte-identical.

**Browser:** at 1440, 1280 and 900 — the rest-state face sits on the still's box and the fade
shifts nothing; the stream clears the H1 and the CTAs; the line continues from the convergence
point; scrolling up rebuilds the face. `?signal=2d` and reduced motion show the cream still with
no canvas work. A forced step-down thins the face evenly. Preview LCP is no worse than `master`'s,
measured interleaved as Phase 10 did (its branch median was 2,175ms), because the still remains the LCP element and nothing changes before `load`.

**Checkpoint (Noel):** the likeness and feel at rest; the dissolve's pace and order; the drift and
push amounts; the Phase 10 60Hz check (5s+ trackpad scroll over the hero, no
`signal-tube-fallback` key).

## 8. Docs, in the commits that change behaviour

- Parent spec §9.01: the face-as-source choreography replaces "the line arrives, then resolves
  into the face" and the R1 holding note; the fallback is a cream still.
- Parent spec §10: the portrait joins the duotone rule — `--ground → --type`.
- `BUILD-PLAN.md`: Phase 11 expanded into tasks; "`portrait.mjs` (extended to emit sample data)"
  corrected to D8; a Decision entry for D2 and D8.

## 9. Task order

1. The cream re-bake (D2, D3) — ships value on its own.
2. The pure modules with their tests.
3. The source and the particles at rest, with the handover.
4. The dissolve and the stream.
5. Pointer and drift.
6. Tiers.
7. Verification and figures.

## 10. Out of scope

- Scanline or hybrid face styles (D4).
- A cursor wake (D6).
- Any load-time assembly animation; the preloader is Phase 15.
- Particles anywhere but the home page's hero.
- Changing the tube, the curve or the gate's conditions.
