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

## Revision R3 — 2026-10-03, the ring scales to fit

**Found:** Noel could not see the ring on his laptop. At 1440×900 `.ring--3d` switched on; at
1440×760 it never did, even with `?signal=tube`. The full-size ring needs a window about 790px
tall for the 563px card (R1), and a MacBook's Chrome viewport is usually 700–800px tall, so most
recruiters on a laptop would get the rail.

**Decided (Noel) — scale the whole ring down to fit, down to a floor, rather than give up.**

- **One uniform scale `s`** for the ring's geometry in front space: the hoop's radius, the drop's
  length, the cards and the floor. It is taken about the front point, which stays on the page
  plane where the line meets it, so the front card's top-centre stays exactly on its drop end.
- **`s = 1` wherever the ring fits at full size**, so tall windows are unchanged and the front
  card is still a pure translation. Otherwise `stageLayout` returns the largest `s` that fits, by
  the R1 fit test at scaled lengths.
- **The floor is `MIN_RING_SCALE = 0.7`.** Below about 70% a card's body text stops reading as
  text, and the rail at full size is the better page. A window where 0.7 does not fit keeps the
  rail. For the 563px card that is anything under 590px tall. Between 590px and about 790px the
  ring renders scaled: 0.95 at 1440×760, 0.86 at 1440×700, 0.90 at 1280×720 (a 560px card).
- **The line's thickness does not scale.** The hoop is rebuilt at the scaled radius, and only
  when a resize changes it. The drops stretch in length only. The hoop and drops keep
  `--signal-stroke`, so the ring stays the same line as the curve that runs into it.
- **Amends D9:** the front card is 1:1 with CSS px only at scale 1. Below that it is a uniform
  scale about its top-centre, still on the page plane.
- **Amends D12:** the ring fits wherever it fits at a scale of 0.7 or more, not only at full size.

## Revision R4 — 2026-10-03, a floating ring, no WebGL

**Found (Noel, first look on his own screen):** the hoop, drops, glow, floor and pulse read as
amateur, and the turn lagged — each card held for 35% of every step, a step was 0.6 of a screen,
and a separate settle followed. He asked for a loop of floating cards that turns at once and
snaps: modern, futuristic, elegant, minimalist, professional.

**Decided (Noel, "same as recommended"; details ruled by the controller):**

- **No WebGL in the ring.** `ring-mesh.ts` and its scene wiring go; so do the pulse, flare,
  floor and reflection. The ring is pure CSS 3D in its own lazily loaded chunk
  (`src/lib/ring/`), mounted from section 04's script after load and idle — not from the
  WebGL scene. Its own gate: viewport ≥ 900px wide, no reduced motion, not `?signal=2d`, and the
  scaled ring fits (R3). A machine that fails the WebGL gate still gets the ring. Supersedes
  D4's WebGL half, D13, and §3's `ring-mesh.ts` row.
- **An invisible circle.** Cards on a circle as before (half-facing, R1); side cards recede
  under a dark overlay, the back two fade out (D3). No hoop, no drops: the front point is the
  front card's top-centre.
- **The line lands on the front card's yellow dot.** It comes down the centre (the hold, D7)
  onto the front card's emission, which is lit (larger, a soft `--shipped` glow) on whichever
  card is in front. `path.ts` is unchanged.
- **The turn tracks the scroll.** No dwell (linear in scroll), a step of 0.4 of a viewport,
  and a quick directional snap (R2) after ~110ms still, over ~0.3s. Supersedes D10's dwell.
- **Arrival fans out.** As the section scrolls in, the cards spread from one stack into the
  circle, driven by tip travel past the split (as before), reversed on the way up.
- **Pointer float.** The ring tilts up to ±3° toward the pointer, and the card under the pointer
  lifts toward the viewer; both ease only while the pointer moves, then go quiet (no timer).
  No base look-down beyond a small value tuned by eye (0–8°).
- **Navigation.** A mono counter (`02 / 05`, `aria-hidden`) and five dot buttons under the ring,
  server-rendered and shown only in 3D. Each button is labelled "Show <site>", carries
  `aria-current` when its card is in front, and turns the ring by moving the scroll.
- **Perspective** is chosen for the look, no longer tied to the camera rig: the front card sits
  on the page plane, so it is exact under any perspective.

## 3. Structure

As built after R4 (the hoop-era rows — `gfx/ring.ts`, `gfx/ring-mesh.ts`, `gfx/ring-stage.ts`, the
`scene.ts` hook — are gone). §3–§6 describe the ring as built; D1–D14 and R1–R3 above are the
record of how it got there.

| File | Job | Pure | Tested |
|---|---|---|---|
| `src/lib/signal/path.ts` | `RING_HOLD_END_POINT = 36`; zero `x` tangents at 34 and 36. | yes | yes |
| `src/lib/signal/anchors.ts` | Anchor point 36 to `[data-signal-hold="end"]`, edge `top`. | yes | yes |
| `src/lib/ring/gate.ts` | `canTurnRing`: ≥ 900px wide, no reduced motion, not `?signal=2d`. Imports nothing from `gfx/gate.ts` (base JS); a test pins its width to the tube's. | yes | yes |
| `src/lib/ring/geometry.ts` | The circle, the pin and the turn (`rawSteps`, `turnSteps`, `settleTarget`), `stageLayout` (fit, scale, nav row), `cardMatrix`/`cardPose`, `fanOut`, `recede`, `frontness`, `liftOffset`, `pointerTiltRoom`. | yes | yes |
| `src/lib/ring/stage.ts` | DOM wiring, in its own lazy chunk: the fit check, the off-screen swap (D14), measuring, each card's `matrix3d`/opacity/`--ring-dim`/`--ring-lit` per drawn frame, focus/dot/drag → scroll, the snap, the pointer float, the counter and dots. Drops itself on any exception, a resize below the gate or the fit, or reduced motion turning on. | no | no |
| `src/components/Ring.astro` | `.ring--3d` styles (tall rail, sticky stage, perspective, the `--ground` panel under the dot, the nav row); the hold-end marker; the server-rendered counter and dots; the script that gates and imports the stage after load and idle. | — | — |
| `src/islands/ring.ts` | Arrow keys unchanged (they move focus). The rail's draw and focus-snap stand down while `.ring--3d` is on. | no | no |

## 4. Behaviour

As built after R4. The values are the shipped ones, from `ring/geometry.ts` and `ring/stage.ts`.

**Mount.** Section 04's script runs `canTurnRing` once the page has loaded and gone idle, and on a
pass imports `ring/stage.ts`, its own chunk. The stage reads the rail cards' size. It returns
without touching the page if reduced motion has come on meanwhile, or if `stageLayout` says the
ring does not fit (D12, R3). Otherwise it waits for the section to be off screen (D14), adds
`.ring--3d`, measures, and refreshes ScrollTrigger. A reader already past the section is moved
by exactly what the section grew. The WebGL scene plays no part: a machine with no tube still
gets the ring.

**Layout in 3D.** The section head scrolls normally. The rail grows by the pin, `(0.15 + 4 × 0.4
+ 0.15)` viewports = 1.9, and the stage inside it is `position: sticky; top: 0`, one viewport tall
(D6). `stageLayout` places the front point (the front card's top-centre) and the nav row as one
block, centred, never closer than 75px to the top (it clears the 67px nav). A window too short
for the full ring gets it scaled about the front point, down to 0.7; below that, the rail. The
front point's `x` is the curve's own `x` at its height (`signalXAtPageY`), as the rail's track
reads it. `perspective` is 1600px with its origin at the viewport's centre, and the ring is
tilted 8° about `x` around the front point (D8). While the stage is stuck, a `--ground` panel
from the front point to its bottom hides the line below the front card. `[data-signal-hold="end"]`
sits at the rail's end, so the line holds centre for the whole pin (D7).

**The beats** (the turn is a function of `scrollY` and the measured rail top):

1. **Arrival — the fan-out.** Driven by tip travel past the split over 0.35 viewport heights.
   The five cards start stacked at the front point, 2px apart in depth so they sort by DOM
   order. They spread onto the circle, turning outward only as they spread, and come up out of
   the ground overlay, fully opaque by halfway. The counter and dots come up with them. A
   reversed scroll gathers them back.
2. **The turn.** Linear in scroll: 72° per step of 0.4 viewport heights, with no dwell. Each card
   hangs by its top-centre from an invisible circle (radius 1.1 card widths) and faces outward by
   half its angle (R1). The side cards recede under a `--ground` overlay, up to 0.6 (`recede`).
   The back two fade between 72° and 110° and are inert below 0.3 opacity (D3). The front card is
   lit by its `frontness`: a soft low shadow, its dot 1.25× with a `--shipped` glow, and its
   title in `--signal` (`card--front`). The counter and the dots' `aria-current` follow
   `nearestCard`.
3. **The snap.** Once the scroll has been still for 110ms inside the pin, `settleTarget` picks a
   card in the direction of travel (R2), and the scroll eases there over 0.3s (ease-out cubic). A
   move under 8% of a step settles back to the nearest card. A reader leaving through the lead or
   the tail is let go.
4. **Departure.** The last card holds through the tail, and the line runs on down past the hold's
   end as the pin releases.

**Pointer float** (mouse and pen, over the stage). Pointer high adds up to 3° to the look-down
and pointer low takes up to 3° away. The upward tilt is capped by `pointerTiltRoom`, so the side
cards' tops still clear the 75px margin. The side card under the pointer lifts up to 18px toward
the eye along its line of sight and sheds up to 35% of its overlay. The front card never lifts:
its transform stays the identity, so its text stays crisp, and it answers with its hover-scroll
instead. Both ease per drawn frame (0.18) while the pointer moves, then land exactly and stop
drawing.

**Input.** Every turn goes through the scroll, the one source of the angle. Arrow keys move focus,
unchanged (`islands/ring.ts`). Focus on any card scrolls that card to the front over 0.45s. A dot
turns the ring to its card, and focus stays on the dot. A mouse or pen drag on the stage, past
6px, turns one step per scaled card width: dragging left brings the next card in from the right.
On release the ring settles on the nearest card, and the click that ends the drag is swallowed.
Native link and image drag are suppressed. Touch scrolls natively.

**Drawing.** On change only. Scroll progress, the tip, the pointer, or an ease still under way
marks the stage dirty, and it draws on the GSAP ticker after Lenis (`render-schedule.ts`). There
is no free loop. The 110ms timer only detects that the scroll has stopped, so the snap is still
driven by the scroll.

## 5. Failure and fallback

- **The gate fails** (narrower than 900px, reduced motion, `?signal=2d`) or the chunk fails to
  load: the rail. Nothing was touched.
- **The ring does not fit**, even at 0.7: the rail.
- **Any exception** in a draw, a measure, the observer or an event handler (`guarded`): the stage
  unmounts. It removes `.ring--3d` and every inline property, restores the rail and refreshes the
  anchors. A reader inside the ring, or within a viewport above it, lands on the section's top.
  A reader past the pin is moved back by exactly what the section lost, so what they were
  reading stays put.
- **A resize below 900px wide or below the fit**, and **reduced motion turned on live**, unmount it
  the same way. Both are one-way: the ring does not come back on that page load.
- **The tube's own fallback** (WebGL unavailable, the watchdog, context loss) does not touch the
  ring. Since R4 they are independent.
- **JS off:** the rail, with the split drawn and no counter or dots (the nav is `display: none`
  outside 3D).

## 6. Accessibility

- Every card stays a real `<a>` in source order. Nothing is reparented: the cards are only
  restyled and given a `matrix3d`.
- A focused card is always brought to the front, so its focus ring is never on a faded card. The
  exception is a reader who wheel-scrolls away from a focused card: the scroll turns the ring
  without moving focus (Known Gaps).
- The back cards take no pointer events below 0.3 opacity. The list's own box takes none either,
  so it never covers the side cards' hover and click.
- The dots are buttons in `<nav aria-label="Shipped sites">`. Each is labelled "Show <site>",
  carries `aria-current` when its card is in front, and has a 24px target (WCAG 2.2). A focused
  dot is shown in full even during the arrival fade. The counter is `aria-hidden`. Arrow keys do
  not move between the dots (Known Gaps).
- The track, drops and emissions are `aria-hidden`. A card's state is still in its "shipped · live"
  text.
- The front card keeps the rail's contrast: an opaque `--ground-lift` panel with no overlay. The
  side cards are dimmed on purpose and are not meant to be read in place. Focus or a dot brings
  any card to the front at full contrast.
- Reduced motion gets the rail (D11).

## 7. Testing and verification

**Unit (Vitest, pure modules):**
- `path.ts`: points 34–36 at `x: 0` with zero `x` tangent, so every sample between them has `x` 0.
- `anchors.ts`: the new anchor is in curve order and inside the ring span.
- `ring/gate.ts`: width, reduced motion and `?signal=2d`; its width equals `gfx/gate.ts`'s.
- `ring/geometry.ts`: radius clears adjacent cards; the pin and the linear turn; `settleTarget`
  follows the direction of travel (R2); poses fade only the back two, symmetric; the look-down;
  **parity** — every card's `cardMatrix` puts its top-centre exactly on `cardTop`, at full and
  reduced scale, with and without the pointer tilt; `stageLayout` reserves the nav and scales to
  fit (floor 0.7); the fan-out stays in depth order; `recede`, `liftOffset`, `frontness`,
  `pointerTiltRoom`.

**Browser** (headless Chrome over CDP): frames at 1440×760, 1440×900 and 1920×1080; Tab through
all five cards and each lands at the front; the dots; the snap. Failure paths (Task 14): a resize
below the fit or below 900 wide mid-pin → rail, reader at the section's top; reduced motion on
load → rail; a live switch to reduced motion → the ring drops (inside the pin onto the section's
top, past it with the next section held in place); JS off → rail, split drawn, no nav;
`?signal=2d` → rail; WebGL unavailable → ring on, no tube; an exception in `update()` → rail,
place kept. The `--ground` panel at 1440×760 and 1920×1080, cards 0 and 3 in front: no line
below the card, the ground the same either side of the panel's edges.

**Budgets:** `npm run budget` — base JS within a few bytes of 63,156; enhanced chunk delta recorded
(expected single-digit KB). LCP unaffected: the section is below the fold and mounts after load.
After R4 (Task 14): base 63,860, enhanced 135,887, the ring's own chunk 4,518 (no Three.js, not
initial).

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
