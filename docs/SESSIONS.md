# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-10-07 · claude-code · Phase 14 websites, PR #5

**Did**
- Rebuilt `/websites` on the Signal Path system: seven section components in `src/components/websites/` + `SectionHead`, shared primitives in `src/styles/websites.css`, `WebsitesNav` without its script. Content in `data/websites.ts` untouched; no Tailwind left in `src/`.
- Put it back live: `vercel.json` redirect, sitemap filter gone; Contact links `/websites`; `scripts/budget.mjs` gates `/websites`.
- Review round (controller, from screenshots): prices aligned across tiers, the doubled "Concept" label dropped, the hero frame's underline removed, `ContactForm` `hideChoice` so clients are never offered "A role".
- Browser check (headless Chromium, 5 widths): no sideways scroll, anchors settle at 96px as on `/`, focus ring on every control; JS off renders all sections, FAQ opens, form posts. PR #5 open, not merged.

**Decided**
- Phase 14 restyles only; `data/websites.ts` frozen; the line stays unanchored (Noel).
- `ContactForm` `hideChoice`; `/websites` budget-gated (controller).

**Didn't work**
- Measuring anchor jumps 1.6s after the click read "under the nav" on `astro preview`: Lenis's glide takes ~2s. Sampled over 4s, `/websites` and `/` both settle at the section top = 96px. Not a bug.

**Open**
- **`/websites` has no phone number** and **Shared `/websites` links preview as the recruiter site** (Known Gaps → Post-launch).
- A dev server Noel started at 14:52 is still on :4321; it was left running.

**Next**
Noel opens PR #5's preview on a phone (hero, pricing, a test quote; `/websites` without the slash loads) and merges; then mark Phase 14 complete and start Phase 15 (preloader + OG images).

**Numbers** — build green · 342 tests · JS on `/` 64,984 gzip (±0) · `/websites` 58,752 (−391)

## 2026-10-07 · claude-code · Phase 13 merged

**Did**
- Noel heard the sound on PR #4's preview: it plays. Merged as `175b8ba`. www.noel-sebastian.com serves the same script chunks as the local build, and the lazy `connect` chunk returns 200.
- Phase 13 marked complete; its section and the superseded 2026-09-26 sound-toggle Decision are archived in `docs/archive/plan-phases.md`, and the "unheard" gap is closed. Figures moved from branch to live.
- BUILD-PLAN.md trimmed back under lint's 60,000 B (59,999) by tightening this phase's own Decisions and gaps.

**Decided**
- The sound's voice is to be reworked later; the mechanics stay (Deferred by Noel — 2026-10-07).

**Open**
- **The sound reads like a horror or sci-fi film score, not a portfolio** (Known Gaps → Deferred by Noel — 2026-10-07).

**Next**
Start Phase 14 (`/websites` restyle): expand BUILD-PLAN's Phase 14 section into task-level steps, brainstorm first, then a design spec. Or, if Noel prefers, rework the sound's voice first — by ear, in `lib/audio/engine.ts`.

**Numbers** — build green · 342 tests · JS on `/` 64,984 gzip (live; +1,124 vs Phase 12) · audio chunk 1,783 (lazy)

## 2026-10-06 · claude-code · Phase 13 audio, PR #4

**Did**
- Brainstormed Phase 13 with Noel, then wrote the spec (`2026-10-06-phase-13-audio-design.md`, D1–D14) and the plan; BUILD-PLAN's Phase 13 section expanded.
- Built it: the `lib/signal/emissions.ts` bus with `hasArrived`, announces in years/work/stack/ring/stage/contact, `lib/audio/score.ts` (tested), `engine.ts` and `connect.ts` (lazy), and `islands/sound.ts` with the Nav toggle.
- Browser check over CDP with real input events (scratchpad `sound-check.mjs`), 17/17: all 19 notes play in reading order on a scroll down, none play going up, and no chunk loads until the toggle is pressed.
- PR #4 is open; branch `feat/phase-13-audio`. Stopped the stale `astro preview` on :4321 (from 3 Oct).

**Decided**
- Warm analogue voice, A minor pentatonic, notes on downward arrival only, hover tick included (Noel).
- The `AudioContext` is created in the gesture by the island and passed to the lazy chunk.
- Reduced motion gets the drone, cutoff and ticks, but no notes.
- GSAP has one importer (`timeline.ts`'s new `onTick`); the bus joins `tip`; `/` accepted at +1,124 against the ≤ +1 KB estimate.

**Didn't work**
- Importing `gsap` directly in `lib/audio/connect.ts` made Rollup split GSAP into its own `index` chunk, +630 B on every page (`/websites` 59,030 → 59,681). Import from `motion/timeline.ts` instead.
- `window.scrollTo(0, 0)` in a CDP script does not reset the page under Lenis, so the first check turned sound on mid-page and heard only 8 notes. Reload instead.

**Open**
- **Phase 13's sound is unheard by a person** (Known Gaps → Post-launch).
- **The sound toggle's label changes width**; **with JS off the toggle reads `Sound · off`** (both under Known Gaps → Cosmetic).
- `check.mjs lint` WARNs: BUILD-PLAN.md is 63,157 B (limit 60,000) — this session's live Phase 13 section and decisions. Not archived: the phase is unfinished; archiving its section at merge brings it back under.

**Next**
Noel listens on PR #4's Vercel preview and tunes the constants in `lib/audio/engine.ts` if needed. Then merge, confirm production, mark Phase 13 complete and archive its section.

**Numbers** — build green · 342 tests · JS on `/` 64,984 gzip (+1,124 vs live) · `/websites` 59,143 (+113) · audio chunk 1,783 (lazy)

