# Phase 12 — WebGL 3D ring: design

**Date:** 2026-10-03 · **Status:** approved in conversation, awaiting written review ·
**Parent spec:** `2026-09-19-signal-path-design.md` (§6 The Line, §9.04 The Ring, §11
Accessibility, §12 Performance Budget) · **Builds on:** `2026-09-30-phase-10-webgl-tube-design.md`,
`2026-10-03-phase-11-particle-portrait-design.md`

## 1. Intent

On a capable desktop, section 04's five shipped sites hang from a glowing hoop of the signal, in
depth. The section pins; scrolling turns the ring one card at a time; each card that arrives at
the front is lit by a pulse that runs from the line, along the hoop and down into it. The line
arrives from above, meets the hoop's front point, and leaves from the same point for the Stack
when the pin releases.

It is the Phase 7 rail with a third dimension: the same cards, the same split anatomy (track →
drops → emissions) with the track bent into a circle. Every card is still the server-rendered
`<a>`. Phones, short windows, reduced motion and every gate failure keep the rail exactly as it
is today.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Scroll drives the turn, pinned.** One card per step, five cards, four steps. Drag and arrow keys also turn it, by moving the scroll. | Noel's choice. A recruiter who only scrolls is guaranteed all five; "the scroll is the transport" holds. |
| D2 | **The track becomes a hoop.** A circle of tube at the signal's weight above the cards; each card hangs from it on a drop ending in its `--shipped` emission. The curve meets the hoop at its front point. | Noel's choice. The rail's anatomy with depth, so both presentations read as one design; nothing near the camera can cross anything else. |
| D3 | **Back cards fade.** A card is full strength within ±30° of front, fades to 0 by ±110°, and takes no pointer events below 0.3 opacity. It stays focusable. | Noel's choice. Only readable faces are ever shown; the hoop alone proves the circle. |
| D4 | **Cards are DOM in CSS 3D; hoop, drops and emissions are tube geometry in the existing scene.** Both read one ring angle from one pure module, and the stage's CSS `perspective` equals the camera's distance, so the two renderers agree. | Content stays server-rendered (hard rule); links, hover-scroll, focus rings and text are native. `CSS3DRenderer` would reparent content; WebGL cards would render text as pixels. |
| D5 | **`gfx/ring.ts` is the only place the ring's geometry is defined** — radius, tilt, turn angle, every card's pose, the hoop, drop ends, the pulse. CSS transforms and mesh positions are both derived from it. | "One canonical curve", applied to the ring: adding a renderer never means redefining the ring. |
| D6 | **The pin is `position: sticky`**, not a GSAP pin. In 3D mode the rail grows by the pin length and its stage sticks for that distance. | A GSAP pin wraps the section in a spacer and fixes it to the viewport. Sticky keeps the content in place, scrolls natively under Lenis and needs no ScrollTrigger. |
| D7 | **The line holds centre for the whole pin.** Control points 34–36 already sit at `x: 0`; a new in-section anchor pins point 36 to the hold's end (`[data-signal-hold="end"]`), and their `x` tangents are zeroed as the spine's are, so 34→36 is exactly vertical. While pinned, the hoop's front point (fixed in the viewport) sits on that line the whole time. | Without it the line would slide off the front point mid-turn. Zero tangents, not new waypoints: the curve keeps its shape, and the rail gains a straight hold behind its cards that it already described in words. |
| D8 | **A 10° look-down.** The ring group is turned about `x` by 10° around the hoop's front point; the camera is untouched. | An ellipse reads as depth at a glance. Turning the ring, not the camera, keeps the page plane 1:1 for the rest of the line. Starting value, tuned at the checkpoint. |
| D9 | **The front card sits on the page plane.** Ring centre at `z = −R`, so the front card and the hoop's front point are at `z = 0` — 1:1 with CSS px, exactly the rail card's size. | The meeting point is where the 2D anchor is; the front card is pixel-crisp. |
| D10 | **Each step dwells.** The turn angle is eased per step with a plateau (starting value: 35% of each step holds the card at front). After scroll stops inside the pin, the scroll settles to the nearest dwell over ~400ms via Lenis. | The ring rests on a card without needing exact scrolling. The settle starts from scroll stopping and moves the scroll — not choreography on a timer. |
| D11 | **Reduced motion gets the rail.** | The enhanced layer never mounts under reduced motion (`shouldFallBack`). A static 3D ring would need a second, non-WebGL 3D path. Supersedes the "static ring" offered in conversation. |
| D12 | **3D needs ≥ 900px wide (the gate's) and a window the ring fits in:** the hoop's back, the drops and the tallest card stacked in one viewport (`stageLayout` in `ring.ts`; ~760px tall for a 540px card). Otherwise the rail, even with the tube live. | The stage is one viewport tall. A computed fit rather than a fixed height, so a shorter card set earns 3D on shorter windows. |
| D13 | **Enhancement extras are scroll- or pointer-driven only:** the arrival pulse, a floor reflection of the hoop, emission glow sprites, and a pointer tilt of a few degrees. No post-processing pass. | The look Noel approved, within "nothing animates on a timer"; sprites and a mirrored mesh cost a few draw calls, not a bloom pass. |
| D14 | **The swap waits until the ring is off screen.** If `#ring` intersects the viewport when the 3D layer is ready, adding `.ring--3d` waits until it does not. | Turning on 3D changes the document's height. Off screen it shifts nothing visible (no CLS); on screen it would jump the reader. |

## Revision R1 — 2026-10-03, at the checkpoint

**Found:** at 1280×800 the hoop read as a flat bar, not an ellipse. The camera and the stage's
perspective origin sit at the viewport's centre, and the hoop's front point sat ~132px from the
stage top — ~268px *above* eye level — so we looked *up* at the hoop, and perspective lowered its
back by about as much as the 10° tilt raised it. `stageLayout` hid this: it projected the back
about the front point, not about the eye, so it under-estimated how far the back rises or falls.
Second, the side cards faced straight outward, so at ±72° they were within 18° of edge-on —
~29px wide slivers at 1280. With the first change made, the frames showed a third problem: at
22° and a 32px margin the hoop's back ran under the sticky nav (67px) at 800 tall.

**Decided (the controller at the checkpoint, for Noel's review):**

- **D8, revised — a 17° look-down**, placed through the true eye. `hoopRiseAt` projects the
  hoop's back about the perspective origin (the viewport's centre); the rise is affine in the
  front point's height, so `stageLayout` solves for it in closed form. The checkpoint brief set
  22°, but 22° needs ~150px of rise at 800 tall, and the block (rise + drop + a 560px card) then
  cannot sit below the nav. 17° is the steepest whole degree that does — the hoop still reads as an ellipse seen from above at
  both 1280×800 and 1920×1080, its whole back arc and back drops in view.
- **D12, amended — the stage clears the nav, and the floor does not count against the fit.**
  `STAGE_MARGIN_PX` 32 → 75 (the 67px nav + 8). `fits` is
  `frontY + drop + card + FIT_MARGIN_PX (8) ≤ viewport height`; the floor is decoration and may
  run off the bottom. A 560px card now needs a 790px-tall window (540px: 771px).
- **D4, amended — cards turn half-way.** `CARD_FACING_SHARE = 0.5`: a card turns half its angle
  round the ring (`rotateY(φ · 0.5)`), so the side cards read as cards — a carousel, not a drum —
  and still clear the front card on screen (≥ 30px at 1280). The front card is still a pure
  translation, and each card still hangs from its drop end by its top-centre.

## Revision R2 — 2026-10-03, settle in the direction of travel

**Found:** in the Task 6 browser check, settling to the *nearest* card trapped a reader who
scrolls one wheel notch at a time. At 1280×800 a notch is 100px and a step is 480px. Lenis eases
the notch, the scroll stops, and the settle pulls the reader back. Six single notches from
card 1, 1.2s apart, all came back to card 1. That breaks D1: a reader who only scrolls is
guaranteed all five.

**Decided — D10, amended.** The settle follows the direction of travel, measured from where the
ring last came to rest. The rest is updated by a settle, by a focus turn, at the end of a drag,
and wherever the scroll stops outside the pin. Leaving through the lead or the tail does not
move the rest: Lenis ends a wheel ease in 1px moves more than 140ms apart, so a rest moved to
the first of them would make the last one a nudge, and the reader would be pulled back.

- **A nudge settles to the nearest card.** A nudge is a move off the rest of less than
  `SETTLE_NUDGE_SHARE` (8%) of a step.
- **Moving down** settles on the next card at or ahead of the stop. A stop in the tail, past the
  last card, is not settled, so the reader can leave the pin.
- **Moving up** settles on the next card at or behind the stop. A stop in the lead, before the
  first card, is not settled, so the reader can leave the pin.
- **A drag** settles to the nearest card from where it was let go.
- **Within `SETTLE_ON_CARD_PX` (1px) of a card is on it.** The page scrolls in whole pixels, so
  it rests at 5687 for a card at 5687.34. Without the tolerance, a reader moving up who stopped
  on card 1 was settled to card 0.
- **Where it lives:** the decision is `settleTarget(pinOffset, restOffset, vh)` in `ring.ts`,
  covered by unit tests. The ~400ms Lenis ease and the 140ms "scroll has stopped" debounce are
  unchanged.

## 3. Structure

| File | Job | Pure | Tested |
|---|---|---|---|
| `src/lib/signal/path.ts` | `RING_HOLD_END_POINT = 36`; zero `x` tangents at 34 and 36. | yes | yes |
| `src/lib/signal/anchors.ts` | Anchor point 36 to `[data-signal-hold="end"]`, edge `top`. | yes | yes |
| `src/lib/gfx/ring.ts` | The ring's geometry, from inputs (card width, card count, stage size, scroll progress): `ringRadius`, `RING_TILT_DEG`, `turnAngle(progress)` with dwells, `cardPose(i, angle)` → CSS transform + opacity + `isFront`, `hoopPoints`, `dropEnds(angle)`, `pulse(progress)`, `dwellProgress(i)` for focus and settle, and `projectToViewport` for the parity test. | yes | yes |
| `src/lib/gfx/ring-mesh.ts` | Three.js objects from `ring.ts` output: hoop tube (shaded like the line; back half fogged toward `--ground`), drop tubes, emission spheres + glow sprites, the floor reflection, the pulse uniform. `dispose()`. | no | no |
| `src/lib/gfx/ring-stage.ts` | DOM wiring: the size check (D12), the off-screen swap (D14), measuring the stage, writing each card's transform/opacity/`card--front` per drawn frame, focus → scroll, drag → scroll, settle. `unmount()` restores the rail. | no | no |
| `src/lib/gfx/scene.ts` | Mounts the ring after the tube is live, in an idle callback, like the portrait; feeds it scroll each draw; drops it on any failure without taking the tube down. A small hook — the work is in `ring-stage.ts`. | no | no |
| `src/components/Ring.astro` | `.ring--3d` styles: tall rail, sticky one-viewport stage, `perspective`, `transform-style: preserve-3d`, cards absolutely centred, 2D track/drops/emissions hidden; the hold-end marker. No new content. | — | — |
| `src/islands/ring.ts` | Arrow keys unchanged (they move focus). The rail's focus-snap stands down while `.ring--3d` is on. | no | no |

Base-path JS changes by a few bytes (one selector, one class check). Everything else is in the
enhanced chunk.

## 4. Behaviour

**Mount.** After the tube is live, in an idle callback: if the viewport passes D12, build the
hoop and drops, measure, wait for the ring to be off screen (D14), add `.ring--3d`, refresh the
renderer's anchors (document height changed), and start drawing. A failure at any step leaves the
rail as it was.

**Layout in 3D.** The section head scrolls normally. The rail's height becomes `100vh + PIN`,
where `PIN = LEAD + 4 × STEP + TAIL` (starting values: STEP 60vh, LEAD and TAIL 25vh each, so
2.9 viewports). The stage inside it is `position: sticky; top: 0; height:
100vh`, full bleed, with `perspective` = the camera rig's `distance` and `perspective-origin` at
its centre. The hoop's front point sits at the split's `x` (read off the curve, as the rail does
now) and at a fixed stage `y`; the 2D track element moves there so `[data-signal-split]` still
measures the meeting point. `[data-signal-hold="end"]` sits at the same stage `y` at the rail's
end.

**The beats** (the turn's progress is computed from `scrollY` and the measured rail top):

1. **Arrival** — as the ring scrolls into view, before the pin. The hoop draws both ways round
   from the front point and closes at the back; the drops fall; each card rises into place as its
   drop lands. The clock is tip travel past the split, as in the rail, over 0.35 viewport heights
   (the playhead sits in the viewport's lower half, so it passes the split before the stage
   sticks); a reversed scroll undraws it. The pin's LEAD then holds the first card.
2. **The turn.** `turnAngle(p)` steps 72° per card with dwells (D10). During each step a pulse
   leaves the meeting point along the hoop towards the arriving card's drop; they meet as the card
   reaches the front, the pulse runs down the drop, and the emission flares. The front card gets
   `card--front` (title in `--signal`).
3. **Departure.** The last card holds; the line continues down from the front point as the pin
   releases.

Always on in 3D: the back half of the hoop dimmed by depth; the floor reflection; the emission
glow; the pointer tilt (±3° about `x` only — a turn about `y` would take the front card off its
pure translation — eased like the portrait's push, touch ignored).

**Input.** Arrow keys move focus (unchanged). Focus on any card, by any key, scrolls to that card's
dwell — "focus moves the ring". Dragging horizontally on the stage scrolls the page by the drag.
Every turn goes through the scroll, so there is one source of truth for the angle.

## 5. Failure and fallback

- Any exception in the ring's mount or per-frame update: unmount the ring, remove `.ring--3d`,
  refresh anchors. The tube and the portrait carry on (as Phase 11's portrait never hands back
  the tube).
- The tube's own fallback (watchdog, context loss, narrow window, reduced motion) unmounts the
  ring first via `onHandBack`. If that happens mid-pin, the page height shrinks; the scroll is
  re-anchored to the ring section's top so the reader lands on the rail.
- A viewport resized below D12 unmounts the ring; resizing back does not remount it on that page
  load (one-way, like the tube).
- Three logs a failed shader compile without throwing: the mount renders once with
  `renderer.debug.onShaderError` set, as the portrait does, and treats a compile error as a failure.

## 6. Accessibility

- Every card stays a real `<a>` in source order; nothing is reparented.
- A focused card is always brought to the front, so the focus ring is never on a faded card.
- Back cards have `pointer-events: none` below 0.3 opacity, so a faded card never steals a click
  meant for the front one.
- The hoop, drops and emissions are `aria-hidden` canvas pixels; the state is still in each card's
  "shipped · live" text.
- Colour contrast is unchanged: cards are opaque `--ground-lift` panels as in the rail.

## 7. Testing and verification

**Unit (Vitest, pure modules):**
- `path.ts`: points 34–36 at `x: 0` with zero `x` tangent, so every sample between them has `x` 0.
- `anchors.ts`: the new anchor is in curve order and inside the ring span.
- `ring.ts`: radius from card width keeps adjacent cards from overlapping at ±72°; the turn is
  monotonic, starts on card 0, ends on card 4, and is flat across each dwell; `cardPose` opacity is 1 at
  front, 0 at back, symmetric; `dwellProgress` round-trips through `turnAngle` to each card's
  front; **parity** — a card's top-centre, transformed as CSS will and projected with the stage
  `perspective`, lands within 0.5px of the drop end the mesh uses, at 900, 1280 and 1920 wide.

**Browser** (headless Chrome over CDP, as in Phase 11; SwiftShader frames captured before tiers
fall back): frames at each beat for the checkpoint; the meeting point on the line across the whole
pin; Tab through all five cards and each lands at the front; arrow keys; reduced motion → rail;
800px tall → rail; JS off → rail; fallback mid-pin lands on the rail.

**Budgets:** `npm run budget` — base JS within a few bytes of 63,156; enhanced chunk delta recorded
(expected single-digit KB). LCP unaffected: the section is below the fold and mounts after load.

## 8. Docs, in the commits that change behaviour

- Parent spec §9.04: the pin, the hoop, fallback adds reduced motion and short windows (D11, D12).
- Implementation plan: `docs/superpowers/plans/2026-10-03-phase-12-3d-ring.md`.
- `BUILD-PLAN.md`: Phase 12 expanded; Decisions for D6, D7, D11, D14; figures at the end.
- `Ring.astro`'s header comment: the 3D mode, and which element is the meeting point in each.

## 9. Task order

1. The straight hold (path + anchor + rail marker) — tests first.
2. `ring.ts` pure geometry — tests first, parity included.
3. The stage: `.ring--3d` layout and `ring-stage.ts` turning DOM cards from scroll, no WebGL yet.
4. `ring-mesh.ts`: hoop, drops and emissions in the scene; arrival drawn by the tip.
5. **Visual checkpoint (Noel):** frames of each beat at 1280 and 1920 — tilt, radius, pin length,
   fog, alignment. Values tuned here are recorded as revisions.
6. Input: focus → front, drag, settle.
7. Extras: pulse, floor reflection, emission glow, pointer tilt, front title.
8. Failure paths, the off-screen swap, budgets, docs, final review.

## 10. Out of scope

Reflections of the cards themselves (they are DOM) · a post-processing bloom pass · audio on the
pulse (Phase 13 owns `emit`) · a 3D ring on `/websites` (§14 forbids it) · the ring on touch
devices ≥ 900px beyond what scroll and tap already do.
