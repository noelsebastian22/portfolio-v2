# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-10-04 · claude-code · Phase 12 ring, rebuilt as R4

**Did**
- Phase 12 brainstormed, specced, planned and built on `feat/phase-12-ring` (hybrid SDD, tasks 1–13; not merged): first a WebGL hoop with DOM cards (R1–R3), then rebuilt as a floating CSS 3D ring in `src/lib/ring/` (R4).
- Sections 04–06 now use the full content box; only 03 keeps the gutter, and `gutter.ts`'s region ends at 03's bottom.
- `scene.ts` is byte-identical to Phase 11 again; `ring-mesh.ts` deleted.

**Decided**
- The ring is a floating CSS 3D loop in its own lazy chunk, gated on width/motion/fit, not WebGL (R4).
- It scales to fit short windows, floor 0.7 (R3); the settle follows the direction of travel (R2).
- Sections 04–06 use the full content box.

**Didn't work**
- The WebGL hoop, drops, glow, floor and pulse: on Noel's screen they read as amateur, and a 35% dwell per card plus 0.6-viewport steps made the turn lag.
- A 10° look-down: the camera sits at the viewport's centre, below the hoop, so perspective cancelled the tilt and the hoop read as a flat bar. 22° put the hoop's back under the 67px nav at 800 tall.
- Outward-facing cards: at ±72° they were ~29px edge-on slivers; cards now turn half-way.
- A fixed ~790px minimum height: Noel's MacBook viewport never got the ring (measured: on at 1440×900, rail at 1440×760).
- A "nearest" settle: a single 100px wheel notch was pulled back, so a notch-by-notch reader could never leave a card.
- A controller edit of the plan (replacing from the first `pulseAt` match) deleted Task 2's tests and module; the first implementer designed bodies blind and the module was redone.
- Claude-in-Chrome was disconnected again; browser checks ran on headless Chrome over CDP (scripts in the session scratchpad).

**Open**
- **Phase 12 Task 14 is not done** — its agent hit the usage limit before changing anything.
- **`lib/ring/stage.ts` `update()` reads the rail's and the stage's rects every drawn frame**
- `BUILD-PLAN.md` is 60,475 B, over lint's 60,000: the R1–R3 hoop-era Phase 12 decisions superseded by R4 are the natural thing to archive in Task 14's docs pass.

**Next**
Run Task 14 from its brief (`.superpowers/sdd/2026-10-03-phase-12-3d-ring/task-14-brief.md`, git-ignored; ledger `progress.md` beside it), then the final whole-branch review, then a PR for Noel.

**Numbers** — build green · 327 tests (+81) · JS on `/` 64,015 gzip (+859 vs live) · enhanced chunk 135,913 (+145) · ring chunk 4,420 (new, lazy)

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
