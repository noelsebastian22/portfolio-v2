# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-10-06 · claude-code · Phase 12 merged

**Did**
- Rewrote the Phase 12 spec's §4–§6 to the ring as built (R4); the Known Gap that owed it is archived.
- Noel checked the ring on PR #3's preview and approved; merged as `e8f87cb`. Vercel's production
  deploy succeeded; www.noel-sebastian.com serves the same script chunks as the local build, plus
  the ring's nav, the hold-end marker and the lazy `stage` chunk (200).
- Phase 12 marked complete in Phase Status; figures moved from branch to live (its section was
  already archived).

**Open**
- Old `astro preview` processes from earlier sessions may still listen on :4321 and :4322.

**Next**
Start Phase 13 (audio engine): expand BUILD-PLAN's Phase 13 section into task-level steps from
the parent spec, brainstorm first, then a Phase 13 design spec.

**Numbers** — build green · 326 tests · JS on `/` 63,860 gzip (live; +704 vs Phase 11) · enhanced 135,887 · ring chunk 4,518


## 2026-10-06 · claude-code · Phase 12 Task 14, PR #3

**Did**
- Re-ran Phase 12 Task 14 (agent, reviewed inline): every failure path passes on headless Chrome over CDP; `lib/ring/stage.ts` now drops the ring on a live reduced-motion `change`; a `--ground` `::before` on the stage hides the line's tip below the front card's dot.
- `lib/ring/gate.ts` no longer imports `gfx/gate.ts` (`RING_MIN_VIEWPORT_WIDTH` pinned by test); Vite's preload helper joins `tip` in `astro.config.mjs`. `buildTubeFromCentres` folded back into `buildTube`.
- Docs brought to R4 (parent spec §9.04/§11, Phase 12 spec §3/§7, `Ring.astro` header); two superseded decisions archived; BUILD-PLAN under lint's 60,000 B.
- Final whole-branch review inline: clean apart from stale "hoop" comments in `path.ts`/`anchors.ts`, fixed. Lighthouse interleaved with `master`; PR #3 opened.

**Didn't work**
- Winning back all of Task 11's +689 B base JS: only 155 B came back. Against the pre-R4 build, BaseLayout and `tip` are within ~96 B; the rest is section 04's own gate and dynamic import with its preload list. Folding gate and helper both into `tip` measured 63,874, worse than keeping the gate standalone (63,859).

**Open**
- **The Phase 12 spec's §4–§6 still describe the WebGL hoop.**
- PR #3 is unmerged: Noel to check the ring's look on his own screen first.
- Old `astro preview` processes from earlier sessions still listen on :4321 and :4322.

**Next**
Noel checks the ring on PR #3's Vercel preview; on approval, merge to `master`, confirm the live site, then mark Phase 12 complete and archive its section per end.md step 2.

**Numbers** — build green · 326 tests (−1: −2 hoop tests, +1 width pin) · JS on `/` 63,860 gzip (−155 vs last session; +704 vs live) · enhanced 135,887 · ring chunk 4,518 · LCP median 2,265ms (`master` 2,264)

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
