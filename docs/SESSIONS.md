# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-10-03 · claude-code · Phase 11 merged

**Did**
- Phase 11 brainstormed, specced, planned and built (7 tasks + 6b, hybrid SDD); PR #2 merged (`cf91bd9`), live.
- Hero still re-baked cream (`scripts/portrait.mjs`); ~40k particles sampled at runtime from it (`gfx/portrait-*.ts`, `particles.ts`), wired in `scene.ts`.
- Phase 11 marked complete; its section moved verbatim to `docs/archive/plan-phases.md`.

**Decided**
- The portrait is cream, and the particles are sampled from it at runtime.
- The still stays under the particle portrait (spec R1).

**Didn't work**
- Particles alone at 1:1 read as a skull — dark features sample to voids. Six offline splats (`gamma` 0.8–1.5, density floor 0–1, alpha floor 0–0.35) all failed: a count limit, not a constant.
- Eroding the still where particles had only *started* leaving brought the skull back mid-scroll; it now erodes at halfway.
- Restoring base JS to byte-identical via `manualChunks`: both variants grew it (63,240 / 63,334).
- Claude-in-Chrome was disconnected and `agent-browser` is not installed; browser checks ran on headless Chrome + SwiftShader over CDP. SwiftShader cannot hold 40k points, so capture frames before the tiers fall back.

**Open**
- **The portrait's geometry listener is unguarded.**
- **At 900–960px the particle portrait dissolves as it scrolls into view** (standing note, accepted).

**Next**
Start Phase 12 (3D ring) with superpowers:brainstorming — or the Stack rework brainstorm Noel asked for, if he prefers.

**Numbers** — build green · 246 tests (+24) · JS on `/` live 63,156 gzip (+5) · enhanced chunk 135,768 gzip (53.0%, +3,492) · LCP preview median 2,264 vs `master` 2,274


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
