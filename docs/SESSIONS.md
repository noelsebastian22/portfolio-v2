# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-10-03 · claude-code · Phase 10 merged

**Did**
- Noel passed the 60Hz check (5s+ trackpad scroll: tube stays, no `signal-tube-fallback` key).
- PR #1 opened and merged by Noel (`0dfc45e`); production serves the gate in the `BaseLayout` script.
- Phase 10 marked complete; its section moved verbatim to `docs/archive/plan-phases.md`; figures now read live.
- SDD workspace for the Phase 10 plan deleted; the local branch removed.

**Open**
- nothing open beyond Known Gaps (Phase 10's parked minors, the AA cost over the tube, LCP headroom).

**Next**
Start Phase 11 (particle portrait) with superpowers:brainstorming: it must settle the parent spec §8 holding note — the hero now has no line to "arrive" and "resolve into the face". Or the Stack rework brainstorm Noel asked for, if he prefers.

**Numbers** — build green · 222 tests · JS on `/` live 63,151 gzip (+1,379 vs 61,772) · enhanced chunk 132,276 gzip (51.7%)

## 2026-10-03 · claude-code · Phase 10 revision and review

**Did**
- Plan Task 9 built (`d1c0e6a`): both renderers start at `DRAWN_FROM_T` (Nine Years seam), `--signal-stroke` 8px, tube full strength and flat, instant swap; hero depth code, `strengthAt` and the crossfade removed. Noel checked the tube in a browser: approved.
- Task 8 figures recorded (`7de4959`). Final whole-branch review (Opus): 1 Critical, 1 Important, 13 Minor.
- Fix wave (`6123376..f9af4fe`): new `render-schedule.ts` draws in the `gsap.ticker` tick; probe checks `canvas.isConnected` after every await; zoom pixel ratio, `forceContextLoss`, guarded listeners, `npm run budget` fails with no Three chunk; stale comments and both specs corrected. Re-reviewed inline: clean.
- Scheduled rebuild confirmed (gap archived): run fired 1 Oct 05:22 UTC, live copy reads "a decade".

**Decided**
- The tube draws in the scroll driver's tick, only when dirty (BUILD-PLAN → Decisions, 2026-10-01).
- A renderer that will not start is remembered for the session.
- R3 re-confirmed by Noel: the 2D line keeps its dim rule.

**Didn't work**
- Booking `requestAnimationFrame` from tip/progress listeners: they run inside GSAP's ticker (a rAF callback), so the render lands next frame and GSAP's next tick finds it pending — the tube drew every other frame (headless: 28 draws in 59 frames; after the fix 50 in 53). At 60Hz that is ~33ms, over the watchdog's 25ms median, so the tube retired itself after ~2s of scrolling. Noel's display likely hid it.

**Open**
- **Parked by the Phase 10 final review** (Known Gaps): session-wide fallback memory, square tube start, `hexToRgb` format, dot/node sizing beside 8px.
- **The tube draws after Lenis only by load order** (Known Gaps → Standing notes).

**Next**
Noel checks on a 60Hz display (5s+ trackpad scroll on `/`: tube stays, no fallback key in Session Storage). If it passes, finish `feat/phase-10-webgl` (superpowers:finishing-a-development-branch → merge to `master`), then delete `.superpowers/sdd/2026-09-30-phase-10-webgl-tube/`.

**Numbers** — build green · 222 tests on branch (173 live) · JS on `/` live 61,772, branch 63,151 (−118 vs last entry) · enhanced chunk 132,276 gzip (51.7%, −283) · Lighthouse preview 98/99/99, LCP 2,175 median

## 2026-09-30 · claude-code · Curve cleanup, Phase 10 tube

**Did**
- Curve cleanup shipped live (`master` `e06feda`): monotone-cubic stretching between anchors in `anchors.ts` (the corners were all at knots, up to 43°), a straight work spine (points 21–26 at `x −0.74`, zero `x` tangent at the ends) and respaced years turns (points 7–18) in `path.ts`, and two counter-bends Noel spotted, below the spine and below the ring split, fixed with tests.
- Phase 10 designed (`docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md`), planned, and Tasks 1–7 built on `feat/phase-10-webgl`: geometry channel in `tip.ts`, `lib/gfx/{gate,camera,frame,tube-mesh,scene}.ts`, `lib/signal/tube-signal.ts`, gate wired in `BaseLayout.astro`, `npm run budget` guarding Three.js. Reviewed inline; every file matches the plan.
- Noel saw the tube: the spine is right, the hero is not. Plan Task 9 (revision R1–R4) written, not built.

**Decided**
- Curve stretching is a monotone cubic; after a zero-tangent point the sideways steps must grow.
- Phase 10 is an overlay on the running SVG, with a custom mesh, not `TubeGeometry`.
- Revision R1–R4 (Noel): no line in the hero, 8px stroke, full-strength tube, instant swap.

**Didn't work**
- Counting curvature sign flips over 1500px radius to find wobbles: on near-vertical runs a 3px wobble already counts, so every candidate "failed". Sideways travel in px is the measure there.
- Moving only control point 27 to fix the spine-exit counter-bend moved it to point 28; 27 and 28 had to move together.
- The first implementer stalled once (600s watchdog) and was then killed by a revoked OAuth token; `/login` fixed it, and resuming the same agent kept its work.

**Open**
- **Text drawn over the full-strength tube fails AA at ≥ 900px** — accepted by Noel for now.
- **LCP has ~0 headroom** — updated: preview 2,263ms today on `master` and the branch alike.
- **Small counter-bends at the Stack's operator nodes** — left for the Stack rework.
- Noel wants to rework the Stack ("Tools, composed" reads too technical): a brainstorm of its own.

**Next**
Execute plan Task 9 (`docs/superpowers/plans/2026-09-30-phase-10-webgl-tube.md`; ledger `.superpowers/sdd/2026-09-30-phase-10-webgl-tube/progress.md`), then show Noel `/` and `?signal=2d` in a real browser (headless here has no WebGL2), then Task 8's figures and a final review before merging. After 1 Oct, the scheduled-rebuild gap.

**Numbers** — build green · 222 tests on branch (173 live) · JS on `/` live 61,772 (+282), branch 63,269 (+1,497) · enhanced chunk 132,559 gzip (51.8%) · Lighthouse 98
