# Signal Path — Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> or `superpowers:executing-plans` to implement a phase task-by-task. Steps use checkbox
> (`- [ ]`) syntax. **Phases 10–15 carry phase-level detail only** — expand the phase you are
> starting into task-level steps with `superpowers:writing-plans` before implementing it.

**Goal:** Rebuild noel-sebastian.com as "Signal Path" — a dark, animation-led portfolio
built around one continuous signal line that is simultaneously a marble diagram of Noel's
career and a waveform driving the sound design.

**Architecture:** Astro renders every section to static HTML. Vanilla TypeScript islands
hydrate behaviour onto that markup; they never render content. One canonical curve
definition in `lib/signal/path.ts` feeds both the SVG renderer and the Three.js tube, so the
2D and WebGL paths share choreography rather than approximating each other. WebGL and audio
sit behind a capability gate and a user toggle respectively, and are never in the initial
module graph.

**Tech Stack:** Astro 5 (static) · TypeScript · Three.js · GSAP + ScrollTrigger · Lenis ·
Web Audio API · sharp · Vitest. **No UI framework.**

**Spec:** `docs/superpowers/specs/2026-09-19-signal-path-design.md` — read it alongside this
plan. The plan argues from the spec; where they disagree, the spec is wrong and must be
updated in the same commit.

**Session log:** `docs/SESSIONS.md`, written by the `session-handoff` skill.

**Archive:** `docs/archive/` holds what this file no longer needs to carry — finished phases
(`plan-phases.md`), closed gaps (`plan-closed-gaps.md`) and old session entries (`sessions.md`).
Moved verbatim, append-only, never deleted. This file is current state only.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from
the spec.

- **Palette, exact:** `--ground #0A0908` · `--ground-lift #131110` · `--type #F2EFE7` ·
  `--type-dim #8A857C` · `--signal #FF4B54` · `--shipped #FFC01E`.
- **The warm black rule.** Never substitute a cool grey or blue-black for `--ground`.
- **`--signal` is restricted** to large text, CTAs and graphical elements. It is 6.05:1 on
  `--ground` — AA, not AAA. Body copy never uses it.
- **Type:** Archivo (display + body, variable, Expanded axis for display) and JetBrains Mono
  (operators, metrics, status). Both self-hosted WOFF2. No Google Fonts CDN.
- **No UI framework.** No React, Preact, Vue or Svelte. No Tailwind.
- **The scroll is the transport.** Nothing animates on a timer except the audio drone and
  idle particle drift. All other motion is driven by scroll position or pointer input.
- **RxJS operator labels are normative** — see spec §4. `of` `scan` `switchMap` `mergeMap`
  `pipe` `subscribe`, each paired with a plain-English section name.
- **Performance budget:** Lighthouse mobile ≥ 95 · LCP ≤ 2.0s · CLS < 0.02 · INP < 200ms ·
  base-path JS ≤ 80KB gzip · enhanced WebGL chunk ≤ 250KB gzip, post-interactive · zero
  render-blocking JS above the fold.
- **Accessibility:** WCAG 2.2 AA. Every word server-rendered and readable with JS disabled.
  `prefers-reduced-motion` turns choreography into instant state changes.
- **Content truth:** `docs/resume-transcript.md` (the transcription of `Resume.pdf`, plus
  confirmed notes added to it under its own "Confirmed notes" heading) is the source for all
  metrics and dates. Never invent a number. Derive elapsed years from a constant, never
  hard-code.


---

## Phase Status

Update this table at the end of every session. It is the first thing a cold session reads.

| # | Phase | State | Notes |
|---|---|---|---|
| 0 | Foundation & teardown | **complete** | React+Tailwind out, tokens + self-hosted fonts in |
| 1 | Content model rewrite | **complete** | Rebuilt from `docs/resume-transcript.md`; year derived in 7 places |
| 2 | Signal path core (2D) | **complete** | 51-point curve + SVG renderer. Both tasks reviewed clean |
| 3 | Motion infrastructure | **complete** | Lenis + one GSAP ticker; `onSection()` owns every ScrollTrigger |
| 4 | Shell — layout, nav, footer | **complete** | Tasks 4.1–4.5, reviewed clean after 1 fix round. First JS since Phase 0 |
| 5 | Sections 01–02 — Hero, Nine Years | **complete** | Tasks 5.1–5.3. First two islands; Stats.astro retired into NineYears |
| 6 | Section 03 — Selected Work + diagrams | **complete** | Tasks 6.1–6.3, one fix round each. Curve pinned to sections; gutter derived |
| 7 | Section 04 — The Ring (2D rail) | **complete** | Tasks 7.1–7.2. The split is a track the curve is pinned to; Gallery retired |
| 8 | Sections 05–06 — Stack, Contact | **complete** | Tasks 8.1–8.2. About + Marquee retired; Contact's form works with JS off |
| 9 | SHIPPABLE — 2D site complete | **complete — live 2026-09-29** | `master` at `c2b0e46`, live on www.noel-sebastian.com; old site tagged `v1-letterpress`. Figures below |
| 10 | WebGL — gate + signal tube | **complete — live 2026-10-03** | PR #1 (`0dfc45e`); tube over the 2D line, revision R1–R4. Section archived |
| 11 | WebGL — particle portrait | **complete — live 2026-10-03** | PR #2 (`cf91bd9`); cream still, particles over it (R1). Section archived |
| 12 | WebGL — 3D ring | **built — awaiting merge** | `feat/phase-12-ring`; a floating CSS 3D ring (no WebGL), scroll-pinned, scales to fit (R4). Final review clean (2026-10-06). Section archived |
| 13 | Audio engine | not started | |
| 14 | `/websites` restyle | not started | |
| 15 | Preloader + final polish | not started | |

### Current figures — 2026-10-06

Replace values here when a session re-measures; do not add a new "Measured after" section.

| Global Constraints budget | Target | Latest | Measured |
|---|---|---|---|
| Lighthouse mobile Performance | ≥ 95 | preview ×3 (Phase 11 branch): 98 / 98 / 99, `master` interleaved 98 / 98 / 98 · production ×1: 97 (2026-09-29) | 2026-10-03 |
| LCP | ≤ 2.0s | preview, interleaved ×3 (2026-10-03): Phase 11 branch median **2,264ms** (2,267 / 2,264 / 2,189), `master` 2,274 (2,274 / 2,289 / 2,272) — no regression; the cream still is the LCP element and nothing changes before `load` — see Known Gaps → Performance · production ×1: 2,165ms (2026-09-29) | 2026-10-03 |
| Accessibility · Best Practices · SEO | 100 | production ×1: 100 · 100 · 100 (previews always score SEO 61 — see Didn't work, 2026-09-29) | 2026-09-29 |
| CLS | < 0.02 | 0 | Task 9.5 |
| TBT (lab proxy for INP) | report | 0 | Task 9.5 |
| Base-path JS gzip (`npm run budget`) | ≤ 81,920 | `/` Phase 12 branch **63,860 (78.0%)**, +704 vs live — the straight hold, `scrollToY`, `refreshScroll`, the island's 3D guards, the gutter's bottom (+27), and section 04's ring gate + dynamic import. Task 14 won back 155 of R4's +689 (the ring's gate stopped importing `gfx/gate.ts`; Vite's preload helper folded into `tip`) · live 63,156 (Phase 11) | 2026-10-06 |
| Enhanced WebGL chunk gzip | ≤ 256,000 | Phase 12 branch **135,887 (53.1%)**, +119 vs live (the ring left WebGL in R4) · live 135,768 (Phase 11); `npm run budget` fails if Three.js reaches an initial chunk or no enhanced chunk is found | 2026-10-06 |
| Ring chunk gzip (lazy, after load, no Three.js) | — | Phase 12 branch **4,518** (`lib/ring/stage.ts`; not in any page's initial graph) | 2026-10-06 |
| Render-blocking requests above the fold | 0 | 0 | Task 9.5 |
| Keyboard · JS off · reduced motion | pass | PASS on `/` | Task 9.5 |
| Fonts preloaded | — | 95,660 B (Archivo 57,188 + JetBrains Mono 38,472) | Task 9.8 |
| Tests | — | 326 | 2026-10-06 |

### Measurement history — shipped JS on `/`, gzip

Add one row when a phase completes or a task moves the number. Full snapshots per phase, and
the Phase 9 LCP diagnosis, are in `docs/archive/plan-phases.md`.

| When | JS on `/` | Budget | Tests |
|---|---|---|---|
| Baseline 2026-09-19 (old React site) | 73,854 | — | — |
| Phases 0–2 · 2026-09-20 | 0 (2,039 only on `/dev/signal`) | 0% | 11 |
| Phase 3 · 2026-09-22 | 0 (unchanged) | 0% | 18 |
| Phase 4 · 2026-09-23 | 52,332 | 63.9% | 18 |
| Phase 5 · 2026-09-24 | 53,241 | 65.0% | 18 |
| Phase 6 · 2026-09-25 | 57,756 | 70.5% | 103 |
| Task 7.2 · 2026-09-25 | 59,069 | 72.1% | — |
| Task 8.1 · 2026-09-26 | 59,921 | 73.1% | — |
| Task 8.2 · 2026-09-26 | 61,790 | 75.4% | — |
| Task 9.1 · 2026-09-26 | 61,847 | 75.5% | — |
| Task 9.4 · 2026-09-26 (`npm run budget` from here) | 61,370 | 74.9% | — |
| Task 9.8 · 2026-09-29 (live) | 61,490 | 75.1% | 155 |
| Curve cleanup · 2026-09-30 (live) | 61,772 | 75.4% | 173 |
| Phase 10 · 2026-10-01 (branch) | 63,150 | 77.1% | 215 |
| Phase 10 · 2026-10-03 (live, after the final-review fixes) | 63,151 | 77.1% | 222 |
| Phase 11 · 2026-10-03 (branch) | 63,157 | 77.1% | 246 |
| Phase 11 · 2026-10-03 (live) | 63,156 | 77.1% | 246 |
| Phase 12 · 2026-10-03 (branch) | 63,287 | 77.3% | 299 |
| Phase 12 R4 · 2026-10-06 (branch) | 63,860 | 78.0% | 326 |

### How to measure

Lighthouse: median of 3 runs, `npm run build && npx astro preview` (never the dev server) or the
Vercel preview, `npx lighthouse` default mobile emulation and simulated throttling. JS: `npm run
budget`, which counts every script a page runs before interaction.

## File Structure

```
src/
  lib/
    career.ts            derived dates — pure, tested
    signal/
      path.ts            THE canonical curve. Pure. Tested.
      svg-signal.ts      2D renderer — stroke-dashoffset
      anchors.ts         pins the curve to sections and in-section anchors
      draw.ts            drawing marks off the tip; the §7.4 easings
      tube-signal.ts     3D renderer — custom Three.js mesh over the published points (phase 10)
    motion/
      scroll.ts          Lenis init + global progress
      timeline.ts        GSAP master timeline, section registration
    audio/
      engine.ts          Web Audio — lazy, never fetched unless toggled (phase 13)
    gfx/
      gate.ts            capability gate
      scene.ts           Three.js renderer lifecycle              (phase 10)
      render-schedule.ts draws in the scroll tick, only when dirty (phase 10)
      particles.ts       portrait point cloud                      (phase 11)
    ring/                the 3D ring — CSS 3D, no WebGL, own chunk (phase 12, R4)
      gate.ts            its own gate (in section 04's script)
      geometry.ts        circle, turn, fit, poses — pure, tested
      stage.ts           the DOM side: swap, cards, input, drop
  islands/               one vanilla TS entry per interactive section
  components/            .astro section components
  data/
    content.ts           rewritten from Resume.pdf
    websites.ts          kept, restyled in phase 14
  styles/
    tokens.css           the design system — single source
    global.css
scripts/
  optimise-gallery.mjs   ring captures (duotone, AVIF + WebP) and /websites cards
  portrait.mjs           duotone still + particle source data
  og-image.mjs           generated OG image
tests/                   Vitest — pure modules only
```

---

# PHASES 0–9 — Complete

All ten are done and live. Their task-level steps, per-task measurements, the Phase 9 Review
Focus and the final whole-branch review are archived verbatim in `docs/archive/plan-phases.md`.
For the interfaces those phases produced, the code is the source of truth (`src/lib/signal/`,
`src/lib/motion/`).

**Carried forward** — the only parts of Phases 0–9 still owed:

- **Deliberately not in Phase 9.** Everything under "Deferred by Noel — 2026-09-26" (the Stack's
  nodes, the sharp turns at points 7–10, the work spine's breaths). The scatter's
  lowest-density fill. The ring's 9px drop at 375. The split meeting a dim line. A shared class for
  the reduced-motion opt-out: each opt-out is local and commented, which is enough. The
  `font-bricolage` strings and dead Tailwind on `/websites`, which is Phase 14's restyle.

- [ ] **After the merge (Noel ruled 2026-09-29 — neither blocks shipping):** a text-based export of the September resume replaces
  `public/noel-sebastian.pdf` (the served CV is the March one; `Resume.pdf` has no text layer, so ATS
  cannot read it); a 5-minute VoiceOver pass on the preview (checklist in `task-9.5-report.md`).
  After the merge: the `VERCEL_DEPLOY_HOOK` repo secret for the monthly rebuild. *Done 2026-09-29:
  hook `scheduled-rebuild` on `master`, secret set, a manual `workflow_dispatch` run returned Vercel's
  `PENDING` job.*

- Final whole-branch review, parked: M5, the hero clock's per-second tick — Noel's design call.

---

# PHASES 13–15 — Phase-Level Detail

Expand the phase you are about to start into task-level steps before implementing it.

## PHASE 13 — Audio Engine

**Deliverable:** generative Web Audio — a drone bed, one pentatonic note per emission,
scroll velocity mapped to filter cutoff.

**Files:** `src/lib/audio/engine.ts`

```ts
export interface AudioEngine {
  start(): Promise<void>;
  stop(): void;
  emit(index: number): void;        // index into the pentatonic scale
  setVelocity(v: number): void;     // 0..1 → filter cutoff
}
export async function createAudioEngine(): Promise<AudioEngine>;
```

**Verification:** off by default. The module is **never fetched** unless the toggle is
pressed — confirm in the network panel. State persists in `localStorage`. The toggle is a
real `<button>` with `aria-pressed`. No MP3 ships.

## PHASE 14 — `/websites` Restyle

**Deliverable:** the freelance funnel on the new system, deliberately lighter — the 2D line
only, no particle portrait, no ring, no WebGL, no audio (spec §14).

**Files:** `src/pages/websites.astro`, `src/components/WebsitesNav.astro`,
`src/data/websites.ts`

**Verification:** the page no longer references Tailwind. Its distinct SEO targeting for
local-business search is preserved.

- [ ] Remove the `/websites` redirect from `vercel.json`, the sitemap filter, and restore Contact's `/websites` link.

## PHASE 15 — Preloader + Final Polish

**Deliverable:** the preloader — built last, because the curtain needs the stage to exist —
plus the generated OG image and a final audit.

**Files:** `src/islands/preloader.ts`, `scripts/og-image.mjs`

Preloader rules (spec §9.00): hard 1200ms cap, skipped on repeat visits within a session
via `sessionStorage`, skipped entirely under reduced motion, never blocks content.

**Verification:** a full re-run of the Phase 9 checklist with every enhancement active, plus
the same run with the gate forced off.

---

## Decisions

Append here whenever something is decided that outlives a session. The log records *that* a
decision was made; this section records *what it is*.

- **2026-09-19** — Anchor concept is Signal Path. Rejected: The Build (too clinical), Dead
  Reckoning (metaphor about travelling, not building).
- **2026-09-19** — Astro + vanilla TS, not Angular and not Next. Angular's static story is
  weaker and a React site selling Angular depth invites the wrong question.
- **2026-09-19** — `PRODUCT.md` and `DESIGN.md` retired entirely at Noel's instruction.
- **2026-09-19** — Recruitment-first. Case studies move directly under the hero; Services
  and Process are cut.
- **2026-09-19** — Tailwind removed alongside React. Flagged reversible; revisit if the
  token-only approach fights back during Phases 4–8.

- **2026-09-20** — The build stays green on every commit. The plan intended the tree to be red
  from Task 0.1 until Phase 8; the real breakage was 7 lines, and `AGENTS.md` makes a green build
  the gate before any commit.
- **2026-09-20** — Both PDFs stay (Noel's call). Task 1.2 Step 6 is dropped, not deferred.
- **2026-09-20** — `docs/resume-transcript.md` is now the source of truth for every metric.
  `Resume.pdf` defeats text extraction but the Read tool renders PDFs as images, so it was always
  reachable. A task misattributed three metrics by inferring employer from "domain fit" before
  this existed.
- **2026-09-20** — The 90%+ and 85% test-coverage figures are NOT in conflict: 90%+ is Winning
  Group's monorepo, 85% is SRT Marine. An earlier instruction to "reconcile" them was wrong and
  cost a true stat until it was caught.
- **2026-09-20** — Commit attribution is normalised by the controller after the fact, never
  mandated in a task brief. Subagents override brief text by citing their own session instructions.
- **2026-09-20** — The signal curve's speed limit is structural: `speed ≈ gap × (N−1)`, so keep
  `max_gap × (N−1) ≤ 15`. The lever for dramatic geometry is subdivision, not tamer motion.

- **2026-09-22** — `reducedMotion()` guards `typeof matchMedia === 'undefined'`, **not**
  `typeof window`. `vitest.config.ts` sets no `environment`, so tests run in plain Node where
  `window` is undefined even after `globalThis.matchMedia` is stubbed; a window guard would pin
  `reducedMotion()` to false and make its own required test unsatisfiable. It is also strictly more
  defensive. The Task 3.1 brief specified the window guard and was wrong. **Do not revert this.**
- **2026-09-22** — Every `ScrollTrigger` id carries a per-section counter suffix (`ring-1`,
  `ring-2`), because GSAP's registry is last-write-wins on a duplicate id and `kill()` deletes the
  entry unconditionally — a shared id means killing one trigger silently unregisters a live
  sibling. The counter never decrements; reuse after a `kill()` would recreate the collision.
- **2026-09-22** — A review dispatch must state that the commit range has already been
  attribution-normalised. Reviewers have flagged the controller's own trailer as an implementer
  violation, and in the other direction flagged a trailer they could not see. Third finding on
  this project; it has cost real time each time.
- **2026-09-22** — **The signal is one whole-curve renderer on a single page-height layer behind
  all content, not a per-section mount.** `createSvgSignal(mount, section)` loses its `section`
  argument and draws `sampleSignalRange(0, 1, ...)`; `toSvgPath`'s global mapping is then correct
  by construction. `setProgress` takes global page progress, driven by a new
  `onPageProgress(fn)` in `src/lib/motion/timeline.ts` — a sibling of `onSection` with the same
  contract, and still the only place a `ScrollTrigger` is created. Rejected the per-section
  alternative: it needs a second coordinate space, makes every section seam a place two
  independently-scaled spans must meet at the same pixel, and cannot produce §6's *continuous*
  line. Noel's call; implementation lands as Task 4.5 (see `Addendum A` in
  `.superpowers/sdd/BUILD-PLAN/task-P4-brief.md`).
- **2026-09-23** — `/websites` keeps the signal layer. Spec §14 lists what the freelance page
  inherits from the new system and "the drawn line in 2D only" is on it by name; what it does not
  get is the particle portrait, the 3D ring, WebGL and audio. The layer lives in `BaseLayout` and
  needs no opt-out prop.
- **2026-09-23** — `CURVE_SAMPLE_DENSITY` is **480**, not 240. Measured, not guessed: on the real
  1440×9163 page the polyline deviates 2.70px from the true curve at 240 — over half the 4px
  stroke — and 0.69px at 480 (1.22px even at 2560 wide). Faceting scales with box size, so the
  page-height layer needed roughly double what a section-sized mount did.
- **2026-09-23** — **Do not import `lenis/dist/lenis.css`.** All five of its rules are inert in this
  shell: no percentage height on `html`/`body`, nothing calls `lenis.stop()`, `[data-lenis-prevent]`
  is unused, there are no iframes, and `autoToggle` defaults false. Importing it adds a
  render-blocking stylesheet request to buy nothing. **Phase 15 must revisit** — its preloader locks
  scroll, and `lenis.stop()` is what makes the `.lenis-stopped { overflow: clip }` rule live.
- **2026-09-23** — In-page anchors are smoothed by Lenis (`new Lenis({ anchors: true })`), not by
  `scroll-behavior: smooth`, which Task 4.1 deliberately removed. Lenis defaults `anchors = false`
  and only attaches its click listener when the option is set, so without it every nav link jumped
  instantly on a site whose premise is that the scroll is the transport. Under reduced motion Lenis
  is never constructed, so anchors stay native and instant — which is the correct behaviour there
  and needs no extra guard.

- **2026-09-24 (Noel)** — **The page grain paints above content, not behind it.** `--z-grain`
  moves from `-2` to `30`, over the nav and the skip link. Behind content it was covered by every
  opaque element, punching a grain-free rectangle out of the page wherever an image sat (portrait
  corners 10,9,7 against the grained ground's 15,14,13). The layer is `position: fixed` either way,
  so this changes paint order and nothing else — no extra compositing area. Measured after the
  change: open ground unchanged at mean 14.69 / stddev 1.254, grain now present over the portrait,
  and body copy at 2x magnification is indistinguishable from before. The alternative — a bespoke
  mask per image — cannot work for §9.03's case-study screenshots, which have to read as rectangles.
  Task 5.2's radial mask on the portrait stays: it is now an aesthetic choice rather than a fix.
- **2026-09-24 (Noel)** — **The gutter is derived from the curve, and the line dims where it still
  crosses content.** Phase 6 derives `--signal-gutter` from the curve's measured minimum `x`
  (~163.8px at 1440) rather than the guessed `clamp(48px, 6vw, 96px)`, and reserves that column for
  sections 03–06 per §7.3. Sections 01–02, which §7.3 grants no gutter, instead dim the signal
  behind content — an extension of the phone-width behaviour §7.3 already specifies, not a new rule.
  Forced by section 02 being the first section whose centre column is not empty: `--type` on
  `--signal` is ~2.9:1, so every glyph the 4px stroke crosses is under-contrasted, and it currently
  threads the gaps by luck. **Phase 6 implements both halves.**
- **2026-09-25 (claude-code, refining the entry above)** — **The curve is pinned to the sections, and
  the gutter is set by the spine's *maximum* `x`, not its minimum.** Measured: the curve's `y` maps
  linearly onto the whole document, so its left-margin run lands at 26–54% of the page while `#work`
  starts at 71%. It aligns with sections only by coincidence, so each `SECTION_SPANS` seam now anchors
  to its DOM section (renderer scaling; `path.ts` untouched). The ~163.8px figure above is the
  curve's leftmost point. Content has to clear the curve's *rightmost* point in the column, so the
  gutter derives from the spine's max `x`. "Dim behind content in 01–02" generalises to **the line
  is full strength only inside its gutter**. That also covers the right-to-left sweep that opens
  section 03, which crosses its heading, and §7.3's phone behaviour, with one rule.
- **2026-09-25 (claude-code)** — **§9.03's Nx dependency graph is dropped; three diagrams are drawn
  as claims, not data.** The resume gives no number for the dependency graph, so it goes, per this
  phase's own rule. The frame-time trace is flat with no simulated jitter, and the repo lines are
  five labelled `5+`. The scatter plots a genuine 1,000,000 seeded points, and the caption labels
  the distribution illustrative.
- **2026-09-25 (claude-code)** — **The `optimise-gallery.mjs` double-encode moves to Phase 7.** The
  Task 5.1 note assigned it to Phase 6 because "it rewrites the gallery anyway". But Phase 6 has no
  screenshots (§9.03), and §10's screenshot pipeline feeds the ring cards. Fixing it now would
  rewrite the committed gallery bytes twice.
- **2026-09-25 (claude-code)** — **The spine is pinned to the case studies, not just the section.**
  Anchoring only the seams left the right-to-left sweep occupying the top 47.6% of `#work` (35.9% at
  2560). Cards 01–02 sat beside the sweep, where no branch could start without crossing content.
  Control points 21 and 26 (`SPINE_SPAN`) now anchor to the first card's top and the last card's
  bottom (`data-signal-spine="start"`/`"end"`). The sweep compresses into the section heading,
  where the dim rule already covers it, and all four cards branch at every desktop width.
  Minimum card clearance went from 6.9px to 24.0px, which is exactly the clearance token. Still
  renderer scaling: `path.ts` is untouched, and 480 samples still hold (worst chord 0.66px at 1440).
- **2026-09-25 (Noel)** — **The H1's square middot stays, for now.** Archivo draws U+00B7 as a
  filled square at display size (it is the font's real glyph, not a fallback). In `--signal` on
  the dark ground it reads as an emission mark. The mono voice keeps its round dot. If the
  mismatch starts to grate, the cheapest change is to render just the separator in
  `--font-mono`: one `<span>`, round, matching the status rail.
- **2026-09-25 (claude-code)** — **The signal reveals to a viewport playhead, and branches follow the
  tip.** The drawn tip sits at page y `scrollY + vh·(0.5 + 0.5t)` rather than at `t × length`, which
  left it above the viewport. `src/lib/signal/tip.ts` publishes the tip and a
  `signalXAtPageY` lookup, so islands follow the line without re-deriving the mapping. A branch
  draws over the 96px after the tip passes its origin; the diagrams run on their card's
  `onSection` progress.
- **2026-09-25 (claude-code)** — **The ring captures are duotoned `--ground`→`--type`, with no baked
  grain and no baked chrome.** Three rulings for Task 7.1. (1) The stops are `--type`, not
  `--signal`: in §6 red means live, and these are shipped sites, so five red slabs would compete
  with the line for the one colour that means "the signal is here". A warm monochrome print still
  makes nine screenshots one system. (2) Grain comes from the page layer (`--z-grain`), which
  already paints over every card. Baked noise would multiply the weight of 5,000px captures,
  because noise is what AVIF and WebP compress worst. (3) Browser chrome is markup (Task 7.2),
  because the capture scrolls inside the frame on hover and the chrome has to hold still. As
  markup it can also show the real domain as text. §10 updated to match.
- **2026-09-25 (controller, Task 7.2)** — **In 2D the ring's split is a track.** §6 has the line
  split into five at the ring, one branch per card. The 2D rail draws that as a horizontal track
  above the cards, at the signal's weight and colour, with each card hanging off it on a short drop
  that ends in a `--shipped` emission (and says `shipped · live` in words, §13). The curve meets the
  track exactly where it reaches the centre, because control point 34 (`RING_SPLIT_POINT`, `x` 0,
  the curve's maximum `z`) is pinned to the track's centre line by a third in-section anchor. The
  spine's two anchors and this one are now one list in `anchors.ts` rather than a spine special
  case. The track is static; the drops live inside the scroller, so they slide with their cards
  and horizontal scroll needs no script. Below the track the curve holds the centre behind the
  cards, dimmed by the existing rule. `path.ts` coordinates untouched.
- **2026-09-25 (claude-code, Task 7.2)** — **A focused ring card is scrolled fully into the rail.**
  The brief expected native focus scrolling plus the snap to settle a card. Measured at 1440, it
  does not: focusing the third card scrolls just the 57px needed, and `scroll-snap-type: x
  mandatory` then re-snaps to the nearest position, which is 0, leaving the card and its focus ring
  clipped. `ring.ts` scrolls a focused, partly hidden card to its own snap position on `focusin`, by
  Tab or arrow alike. Instant, like native focus scrolling.
- **2026-09-26 (Noel)** — **About and the Marquee retire.** Spec §5's page order has no About.
  Its portrait is already the Hero's, its metrics are in Nine Years and Work, its stack columns
  duplicate the skill groups, and its small-business line becomes Contact's link to `/websites`.
  §9.05 folds the marquee into the Stack. So the ring's hold ends at Stack's top.
- **2026-09-26 (Noel)** — **The Stack keeps the weave.** The stack span's three bends stay as
  authored, and the line is not re-routed to the gutter. The five operator rows sit on hairline
  rules, and each row's node is drawn where the curve crosses its rule, so the nodes step left and
  right with the weave and never sit on a glyph. Between rules the line runs behind the rows, dimmed
  by the existing rule. In 2D the "transform" is the node lighting as the tip passes. §9.05's colour
  and thickness change on the line itself waits for `TubeSignal` (Phase 10), where it is a
  per-vertex attribute rather than a second renderer.
- **2026-09-26 (controller)** — **Skill groups mirror the resume's five.** `content.ts` had four
  groups arranged by the old site plus an AI node. The resume's Skills table has exactly five
  (Core, Architecture, Testing, AI tooling, Also), which gives the five operators without inventing
  a grouping, and every item traces to it.
- **2026-09-26 (controller)** — **The contact form works without JS and falls back to `mailto:`
  only when there is no usable endpoint.** The old form hard-coded the live Formspree ID as a
  default, and production sets no env var. Falling back to `mailto:` whenever the variable is
  unset would therefore have quietly turned off the live form. The endpoint resolves at build
  time: `PUBLIC_FORMSPREE_ENDPOINT`, else the live default. The form's `action` is that URL, so a
  native POST works with JS off. Only a missing or placeholder value makes the action `mailto:`.

- **2026-09-26 (claude-code, Task 8.1)** — **The Stack's operators are camelCase identifiers,
  and its nodes are served lit at the start of their rules.** Three calls. (1) The rows read
  `core()`, `architecture()`, `testing()`, `aiTooling()`, `also()` inside one `pipe(…)`, so the
  chain is a syntactically real pipe a tech lead can read; each is a user-defined operator and
  none shadows an RxJS operator (`tests/skill-groups.test.ts`). A screen reader gets the resume's
  group names instead, and the punctuation is hidden from it. (2) "Also" keeps all twelve resume
  entries: the rule is that the groups mirror the resume, and cutting is Noel's editorial call,
  not the build's. (3) With JS off there is no line, so each node sits filled at its rule's start:
  a rule with one filled mark is the marble notation `──●──`, an emission rather than a node
  waiting for a line. With JS, the island moves it onto the curve.

- **2026-09-26 (claude-code, Task 8.2)** — **Contact: field names, one opaque panel, and an
  emission served centred.** (1) Formspree receives `name`, `email` (its reply-to), `message`
  and `lookingFor` (`role` / `project`, optional), the names the old React form sent, so new
  submissions fill the same columns as old ones; `_gotcha` is the honeypot. (2) The form sits on
  an opaque `--ground-lift` panel, like the ring's cards, so the contact span runs behind it
  rather than under the fields' text, and dims across the head and the direct routes as
  everywhere else. (3) The final emission's track is full-bleed and serves the node lit at the
  page's centre, directly over the footer's bar, so with JS off the page still ends `●` then `|`;
  the island moves it onto the curve and fills it with the tip, the Stack's pattern. (4) The
  emission lives in its own island (`contact.ts`), so `/websites` can mount `contact-form.ts`
  without it. The island reads only the served `action`: the server alone decides the endpoint.

- **2026-09-26 (Noel)** — **RxJS joins the Stack in `architecture()`, beside Angular Signals.**
  The whole site is written in RxJS operators, so a Stack without it is the one omission a tech
  lead would notice. It is a documented exception to "the groups mirror the resume": the resume's
  Skills table stays as it is, and the PDF is not being changed. The exception covers this one
  item only. Every other Stack entry still traces to the resume, and "never invent a number"
  (metrics) is untouched.
- **2026-09-26 (Noel)** — **The line ends above the footer, not under it.** The order is the
  final emission `●`, then the `|` completion bar directly below it at the top of the footer, then
  the footer's content, after the line has ended. That is spec §4's order ("a final emission,
  then a `|` completion bar into the footer"). The curve's last control point stops being the
  document's last pixel, so `anchors.ts`'s bottom anchor and `Footer.astro`'s comment change with it.
- **2026-09-26 (Noel)** — **The Contact headline uses `text-wrap: balance`.** CSS only, which
  fixes "YOU" sitting alone on the last line at 375.
- **2026-09-26 (Noel)** — **The sound toggle stays in the nav until Phase 13, and says plainly
  that it is not ready.** It is a focusable button with `aria-disabled="true"`, not a `disabled`
  one, so it can be reached and announced. Its visible text says sound is coming, so the state
  is not only in a hover `title`. Activating it does nothing.
- **2026-09-26 (Noel)** — **The four unreferenced gallery masters stay** (`directline`,
  `qburst`, `srtmarine`, `winning`; 312 KB in all). "Problems, solved" may be reworked, and they
  are its source material.
- **2026-09-26 (controller)** — no back-to-top link: the persistent nav already reaches every
  section, and the skip link covers the top. **Amended 2026-09-27:** the premise was false when
  written — `#top`'s inline `overflow-x:hidden` made it a scroll container of its own, so Nav's
  `position: sticky` stuck to that div instead of the viewport, and the nav scrolled away like
  everything else (final review, I1). Fixed to `overflow-x:clip`; the nav now persists at every
  width, so the decision's reasoning holds as written from this point on.

- **2026-09-27 (Noel)** — **The year count: monthly rebuild, and "a decade" from ten years.**
  Final review finding I2 — a static build freezes `yearsElapsed()`, so a deploy made in the
  week before 1 Oct 2026 would ship "9+ years" past the tenth anniversary. Two parts, both
  implemented. (1) `isDecadeOrMore(years)` (`src/lib/career.ts`, TDD'd in `tests/career.test.ts`)
  is the one place the ">= 10" boundary lives; `SelectedWork.astro` and `BaseLayout.astro` — the
  two places that state the span in words rather than as the numeral stat — read "a decade"
  once it is true, and their current below-ten wording otherwise (spec §9.02). `content.ts`'s
  `stats` numeral counter is untouched by Noel's ruling: it keeps counting past ten rather than
  freezing at "a decade" as a number. (2) `.github/workflows/scheduled-rebuild.yml` re-triggers
  a Vercel deploy monthly (`0 0 1 * *`, plus `workflow_dispatch`) via `VERCEL_DEPLOY_HOOK`, so
  the count self-corrects without a manual push. See Known Gaps for what is still needed before
  that job can do anything.
- **2026-09-27 (Noel)** — **"Industry-first" stays in the Winning Group case study
  (`content.ts:103`), confirmed.** Final review finding I3: the word is not in `Resume.pdf`
  (transcribed as `docs/resume-transcript.md`), only in the older `public/noel-sebastian.pdf`
  (the March 2026 CV) — the newer resume dropped it when the bullet was rewritten. Noel
  confirmed the claim itself is true, so the word stays; `docs/resume-transcript.md` records the
  confirmation under a new "Confirmed notes" heading, separate from the verbatim transcription.
- **2026-09-27** — **Reconciled: `docs/resume-transcript.md` is the content-truth rule, not
  either PDF by name.** `AGENTS.md` said `public/noel-sebastian.pdf`; this file's Global
  Constraints said `Resume.pdf`. Two files each naming a different PDF directly is exactly how
  I3 happened — a claim true of one and not the other, with nothing recording which one counts.
  The rule was already `docs/resume-transcript.md` (2026-09-20's decision, above) plus any
  confirmed notes added to it since; both files now say that, identically.

- **2026-09-27 (Noel)** — **`/websites` redirects (307) to `/#contact` until Phase 14.** Its
  unrestyled state would have replaced production's working page on merge; the recruiter site
  ships now. `vercel.json` holds the redirect, the sitemap filter drops the URL, and Contact's
  freelance line points at the form instead of the page.
- **2026-09-29** — **Archivo's `wdth` axis is cut to 100–125.** The site only sets 100%, 112% and
  125%; the originals were already Google's Latin subset, so codepoints saved ~4% and the axis cut
  saved the rest (90 → 57 KB). `tokens.css` declares `font-stretch: 100% 125%`, and
  `scripts/fonts.mjs` fails the run if the build ever sets a width outside it. A narrower width
  means widening the axis in the script first. JetBrains Mono keeps `calt` (dropping it would give
  20 KB but changes the ligatures — Noel's call, not taken).
- **2026-09-29 (Noel)** — **The September CV PDF and the VoiceOver pass are post-launch, not merge
  blockers.** The PDF is a static download that no content reads; swapping it is a file replace.
- **2026-09-29** — **Rollback path:** Vercel Instant Rollback to the `6a4bac7` deployment for the
  live site (note it disables auto-promotion of new `master` deploys until undone); the tag
  `v1-letterpress` for the code.
- **2026-09-29** — **The handoff docs hold one fact in one place, and nothing is ever deleted
  from them.** This file is current state, `docs/SESSIONS.md` the last three entries, and
  `docs/archive/` everything finished or closed — moved verbatim, append-only. The routing table
  is in `.agents/skills/session-handoff/end.md`; `check.mjs lint` flags drift and `check.mjs
  verify` fails if a line present at `HEAD` is in neither the live docs nor the archive. It
  replaces the old "fold at ~40 entries, keep only Decided and Didn't-work lines" rule, which
  would have thrown data away and had not triggered by 180 KB.
- **2026-09-30** — **The curve is stretched between its anchors along a monotone cubic, not in
  straight pieces.** Piecewise-linear stretching jumped the slope at every seam and in-section
  anchor, drawing corners up to 43° at one vertex. Fritsch–Carlson with interval-weighted starting
  slopes still hits every knot exactly and never folds back up the page (`anchors.ts`).
- **2026-09-30** — **Curve editing rule: after a point whose sideways tangent is zero, the
  sideways steps must grow.** The spine ends (points 21, 26) have zero `x` tangent so the spine is
  dead straight; a larger first step than second makes the line surge, ease and turn back. Found
  twice (above `04 — mergeMap()` and below the ring split) and pinned by tests in
  `tests/signal-anchors.test.ts`. For near-vertical runs, judge wobble in pixels of sideways travel,
  not by turn direction — a few px already counts as a "bend" there.
- **2026-09-30** — **Phase 10 is an overlay:** the SVG line keeps measuring and publishing, and
  the tube paints its published geometry through a custom mesh (not `TubeGeometry`, which would
  re-sample its own curve). The gate runs after `load` + idle; Three.js is only behind
  `import('../lib/gfx/scene')`. Full design: `docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md`.
- **2026-09-30 (Noel)** — **Phase 10 revision R1–R4:** no line in the hero (both renderers start at
  the Nine Years seam), `--signal-stroke` 8px, the tube full strength with no dim rule (the 2D line
  keeps it for phones), the tube flat everywhere so the swap is instant. Reason: a line hovering
  mid-hero at first load read as a phantom. The AA cost is accepted for now (Known Gaps).
- **2026-10-01** — **The tube draws in the scroll driver's own tick, only when dirty**
  (`render-schedule.ts`, design D6). A `requestAnimationFrame` booked from inside `gsap.ticker` can
  only fire next frame, and under Lenis drew every other frame; the watchdog read 33ms at 60Hz
  as a slow GPU and retired the tube (final review C1). Every change source only marks dirty.
- **2026-10-01** — **A renderer that will not start is remembered for the session**, like the
  other fallbacks: the canvas is inserted only after `new WebGLRenderer` succeeds.
- **2026-10-01 (Noel)** — **R3 re-confirmed:** the 2D line keeps its dim rule; the tube is full
  strength. Phones get 2D, where the whole line runs behind copy.
- **2026-10-03 (Noel)** — **The portrait is cream, and the particles are sampled from it at
  runtime.** The still is re-baked `--ground → --type` with a tighter key light: the red
  duotone read as horror (every midtone red, no highlight above red, the arch as bright as the
  face), and red means *live*. The particles read the still's own pixels after load instead of
  shipping baked sample data, which would cost ~100–150 KB gzip against a 250 KB chunk with
  132 KB used, and could drift from the still. Phase 11 design D2, D3, D8.
- **2026-10-03 (Noel)** — **The still stays under the particle portrait.** At 1:1, 40k
  brightness-weighted particles alone read as a skull: the dark features (eyes behind the glasses,
  the beard) sample to voids, and no weighting fixed it — six offline variants all failed. The
  still now rests at opacity 0.4 under the particles and erodes bottom-up where they are halfway
  to the line (`stillErosion`, `portrait-dissolve.ts`). Chosen over more, smaller particles (≈3×
  the GPU work, still grainy) and blue-noise placement (a sampler rewrite). Phase 11 design R1,
  D10 revised, D12.
- **2026-10-03** — **The 3D ring pins with `position: sticky`, not a GSAP pin.** In 3D the rail
  grows by the pin length and its stage sticks for that distance. A GSAP pin wraps the section in a
  spacer and fixes it to the viewport; sticky keeps the content in place, scrolls natively under
  Lenis and needs no ScrollTrigger. Phase 12 design D6.
- **2026-10-03** — **The line holds straight down the centre through the ring, in 2D too.** Control
  points 34–36 sit at `x: 0` with zero `x` tangents, and point 36 is pinned to
  `[data-signal-hold="end"]` (`RING_HOLD_END_POINT`), so 34→36 is exactly vertical. While pinned,
  the hoop's front point is fixed in the viewport and stays on the line; without the hold the line
  would slide off it mid-turn. Zero tangents rather than new waypoints keep the curve's shape, and
  the rail gains a straight hold behind its cards. Phase 12 design D7.
- **2026-10-03** — **Reduced motion gets the rail, not a static 3D ring.** The enhanced layer
  never mounts under reduced motion, and a static ring would need a second, non-WebGL 3D path.
  Supersedes the "static ring" offered in conversation. Phase 12 design D11.
- **2026-10-03** — **Turning 3D on waits until the ring is off screen.** `.ring--3d` changes the
  document's height: off screen it shifts nothing visible (no CLS), on screen it would jump the
  reader. A reader already past the ring is held in place by moving the scroll by exactly what the
  section gained — or, when the ring drops, lost — because Chrome's scroll anchoring did not hold
  them. Phase 12 design D14.
- **2026-10-03 (controller)** — **The ring's settle follows the direction of travel, not the
  nearest card.** At 1280×800 a wheel notch (100px) is under half a step (480px), so settling to
  the nearest card pulled a notch-by-notch reader back to the card they had left: six single
  notches from card 1 all came back to it. That broke D1 (a reader who only scrolls sees all five).
  A move under 8% of a step settles to the nearest card; a larger one settles on the next card in
  the direction moved; leaving through the lead or the tail is never settled. `settleTarget` in
  `ring.ts`, unit-tested. Phase 12 design R2.

- **2026-10-03 (Noel)** — **The ring scales to fit a short window, down to 0.7, rather than
  giving up.** At 1440×760, the laptop case, the full-size ring did not fit and the reader got
  the rail. `stageLayout` now returns the largest uniform scale that fits, about the front point,
  for the hoop, drops, cards and floor. That is 1 where the full ring fits, so tall windows are
  unchanged. The floor is `MIN_RING_SCALE` 0.7: below it the card text gets too small, so the rail
  stays. The line's thickness never scales. 3D's minimum height drops from about 790px to 590px
  (563px card). Enhanced chunk +358 B gzip (141,079 → 141,437). Phase 12 design R3.
- **2026-10-03 (Noel)** — **Sections 04–06 use the full content box; only 03 Selected Work keeps
  the signal's gutter.** The gutter exists for the line's spine, which runs down the left margin
  in 03 only. Below it the line runs through the centre and weaves behind content, so the gutter
  only pushed 04 Ring, 05 Stack and 06 Contact right of 01–02's left edge for nothing. The dim
  rule's gutter region now ends at 03's bottom (the `ring` seam), or a point of the 2D line in
  the old gutter's `x` below 03 would count as clear and draw at full strength under text. The
  cost is conservative: on a screen wide enough that the centring margin alone clears the curve
  (2560), a run in 04 that sits in that empty margin, and was lit, is now dim. The tube is full
  strength everywhere (Phase 10 R3) and is unaffected. Base path +27 B gzip. Spec §7.3 updated.

- **2026-10-03 (Noel)** — **The ring is a floating CSS 3D loop; the hoop and all WebGL go (Phase 12
  R4).** On his own screen the hoop, drops, glow, floor and pulse read as amateur and the turn
  lagged (a 35% dwell per card, 0.6-viewport steps, a slow settle). Now: five cards on an invisible
  circle, side cards receding under a dark overlay; the line lands on the front card's lit yellow
  dot (no drop), and a `--ground` panel hides it below the dot while pinned; the turn tracks the
  scroll linearly with 0.4-viewport steps and snaps in the direction of travel after 110ms over
  0.3s (R2's rule); the cards fan out from a stack on arrival; the ring floats toward the pointer
  (±3°, capped so the side cards' tops clear the nav) and a side card lifts under it; a mono
  counter and five "Show <site>" dot buttons sit under the front card. Pure CSS 3D in its own lazy
  chunk (`src/lib/ring/`) with its own gate — ≥ 900px wide, no reduced motion (a live switch drops
  it), not `?signal=2d`, and fit (R3) — not WebGL's, so machines that fail the WebGL gate still get
  it. `ring-mesh.ts` and the scene's ring wiring are deleted; `scene.ts` is back to its Phase 11
  text. Tilt 8°, perspective 1600px. Enhanced chunk −5,550 (135,887); ring chunk 4,518; base
  +573 vs Phase 12's first build (63,860). R1's checkpoint values and the hoop-capped pointer tilt
  are superseded (archived in `docs/archive/plan-phases.md`). Phase 12 design R4.

## Known Gaps

Open items and standing notes only. When a gap closes, move the whole bullet verbatim to
`docs/archive/plan-closed-gaps.md` with a closing line — never delete it, never leave it here
marked RESOLVED.

### Post-launch — owed by Noel or waiting on a date

- **Served CV is still the March PDF** (`public/noel-sebastian.pdf`); replace with a text-based
  export of the September resume. VoiceOver pass still owed (checklist in `task-9.5-report.md`).

### Performance

- **LCP has ~0 headroom.** Preview median 1,988ms, one run 2,645; production single run 2,165.
  Next lever: drop the JetBrains Mono preload (the LCP element is set in Archivo).
  Already tried in Phase 9 and not kept (archived LCP diagnosis): `fetchpriority` on the entry
  `<script>` tags (Astro stops bundling them), low-priority entry `modulepreload`, `<head>` reorder.
  2026-09-30: preview ×3 now reads 2,263ms on both `master` and the Phase 10 branch, measured
  interleaved, so the rise is the measuring environment, not code — but as measured, LCP is over
  budget on the live build. Re-measure on production before acting.
  2026-10-01: Phase 10 branch after Task 9, preview ×3 2,220 / 2,174 / 2,175ms.
- The site has no automated performance regression check. Phase 9 establishes the numbers
  manually; consider a Lighthouse CI step afterwards.

### Cosmetic — open, not blocking

- **The `→` in "Bundle size, 100% → 40%" renders in a fallback face** — neither font has U+2192.
  Allowlisted in `scripts/fonts.mjs`; the copy could say "to" instead.
- **Final-review minors, deferred (2026-09-27):** comment nits in `global.css` (the wrap is below
  360, not 390) and `404.astro` (no sitemap `filter` exists); the sitemap filter hard-codes the
  domain. M5 is parked for Noel (see Carried forward).
- **Two Phase 4 review minors are still open** (the list of seven is archived; five are resolved).
  (4) The desktop signal layer crosses footer text at narrow widths — cosmetic, kept legible by
  `--signal-dim-alpha`; see the Task 8.2 re-check below. (6) Lowercase `font-bricolage` class
  strings survive on `/websites` only — Phase 14's restyle owns them.
- **Re-checked by Task 8.2 — the Phase 4 minor about footer text crossing the line** is covered
  by the dim rule (the line is dim anywhere it does not clear content). Measured with Contact
  built: at 1440, 1920 and 2560 the line crosses no footer text; at 1024 it crosses the colophon;
  at 375 it crosses the name, tagline, copyright line, "Medium" and the colophon. All at 0.15, so
  contrast holds.
- **The Stack's nodes step right, then back once, rather than left and right.** The weave's
  bends are at control points 41 (`x` −0.30), 44 (0.24) and 46 (−0.14, the contact seam). The
  seams pin the span to the section, and the five rules fall at 41–76% of its height at 1440, so
  the left bend lands in the head (at the lede's second line) and the rows see the run from it
  to the right bend and a little way back: nodes at 640, 761, 860, 897, 865px. The same shape at
  every width. Honest to the curve, and the nodes still never sit on a glyph, but it is less of a
  weave than the Decision pictures. Pinning a stack control point to a rule would fix it; that is
  an in-section anchor, which Task 8.1's brief ruled out.
- **At phone width the curve runs 9px beside the first card's drop.** At 375 the meeting point is
  187.5px and the first card's drop is at its centre, 178px, so the dim curve and the drop run down
  the 48px drop zone side by side before the card hides the curve. Legible, not ugly, but not
  designed. A drop placed off-centre, or the first card snapped so its centre is the meeting point,
  would settle it.
- **The split meets a dim line.** The track and drops are full strength, while the curve arriving
  at them is at `--signal-dim-alpha`: it is outside the gutter the whole way across the section's
  head. Correct under the dim rule, and the track reads as the line arriving at full strength, but
  the join is a step in strength, not a continuous stroke.
- **Minor: the scatter's lowest density level fills nearly the whole plot box**, since one point
  lifts a cell to level 1. It reads as a tinted panel rather than empty ground around the clusters.
  Cosmetic: a threshold or a log scale in `quantiseLevels`.

### Deferred by Noel — 2026-09-26 (revisit after implementation is complete)

Noel's instruction: record these, finish the implementation, then revisit. Do not act on them
before then.

- **The Stack's nodes are left as built.** Across the rows they form one smooth S, not the
  zig-zag in the sketch Noel chose, because the stack span's left bend falls in the heading. Noel
  may change the Stack after everything is done. Pinning control point 41 to row 1 would give a
  zig-zag through renderer scaling alone, with no coordinate change, but it is not to be done now.

### Deferred by Noel — 2026-09-30

- **Text drawn over the full-strength tube fails AA at ≥ 900px** (after plan Task 9): `--type` on
  `--signal` is 2.9:1, `--type-dim` on `--signal` 1.1:1, wherever the line runs behind copy — the
  Nine Years run, the sweep into Work, the ring arc, the Stack weave. Accepted by Noel for now. His
  idea for later: the line dives into a "hole" where a text block starts and resurfaces where it
  ends.
- **Small counter-bends at the Stack's operator nodes** (around control points 42 and 45), found
  by the 2026-09-30 curvature scan and present before the curve cleanup. Left for the Stack
  rework, together with the node pattern above.

### Parked by the Phase 10 final review — 2026-10-01 (not blocking merge)

- **Any fallback is remembered for the session, not only a slow GPU.** `scene.ts` `fallBack`
  sets the session flag for a narrow viewport or reduced motion too, though the gate re-checks
  both on every load. Narrowing the window below 900px, widening it and reloading stays 2D until
  the tab closes. Remembering only the watchdog, context loss and a probe `fail` is Noel's call.
- **The tube's start is square; the SVG's is round.** Only the tip has a cap sphere
  (`tube-signal.ts`), so at the Nine Years seam the tube ends 4px short and flat. Fix: a static
  cap at `pointAtLength(core, 0)`.
- **`hexToRgb` assumes `#RRGGBB`** (`tube-mesh.ts`). A shorthand, `rgb()` or `oklch()` value for
  `--signal` would silently give the tube a wrong colour.
- **The emission dots and the Stack's nodes were sized beside a 4px line.** The stroke is 8px
  since Task 9; check them at Noel's next look.

### Parked by the Phase 11 review — 2026-10-03 (not blocking merge)

- **The portrait's geometry listener is unguarded.** `scene.ts` `mountPortrait` re-measures inside
  `onSignalGeometry`, which runs in `svg-signal.ts`'s publish loop; the tube's listeners go through
  `whileLive`, which turns a throw into a hand-back. Nothing in `measure` can throw today, but a
  future edit that could would stop the 2D reveal. The fix is a local try/catch that calls
  `dropPortrait()` — not `whileLive`, which would take the tube down with it.

### Parked by Phase 12 — 2026-10-03 (not blocking merge)

- **3D needs a window at least 540px tall; full size from 705px** (563px card, nav reserved). In
  between the ring renders scaled down to fit (R3), floor 0.7. Why: the side cards' tops, the
  tallest card and the counter/dots row must fit below the nav in one viewport. The row is as
  wide as the front card, counter left and dots right, so the middle stays clear under the dot.
- **Wheel-scrolling away from a keyboard-focused card leaves its focus ring on a turned-aside
  card.** Inherent to scroll-as-transport: the scroll turns the ring and does not move focus.
- **The dots are clickable during the arrival fade, and arrow keys do not move between them.**
  The fade happens below the fold; the dots are plain Tab-order buttons by design.
- **`lib/ring/stage.ts` `update()` reads the rail's and the stage's rects every drawn frame**
  (moved from `ring-stage.ts`), after the previous frame's writes — one forced layout per drawn
  frame. Cache them in `measure()` if profiling shows a cost.

### Standing notes — limits and gotchas, not bugs

- **At 900–960px the particle portrait dissolves as it scrolls into view.** The hero stacks below
  961px, so the face starts below the fold and the dissolve (driven from scroll 0) is under way
  by the time it is fully on screen. Accepted at the Phase 11 checkpoint (2026-10-03); the
  alternative was to gate the particles at ≥ 961px.

- **The tube draws after Lenis only by load order.** `render-schedule.ts` hooks `gsap.ticker`,
  which runs listeners in the order added; `initScroll()` registers Lenis's at page load and
  `scene.ts` is imported after `load` + idle. A later phase that adds a scroll-publishing ticker
  listener after the scene loads would be drawn one frame late.

- **The `/websites` redirect is only verifiable on a Vercel deployment** (`astro preview`
  ignores `vercel.json`). Verified on preview and production 2026-09-29.
- **`onSection`'s first callback arrives on the next refresh/rAF pass, not synchronously inside the
  `onSection()` call.** A section already on screen at page load *does* receive its initial progress
  — traced through `ScrollTrigger.refresh()`'s `isFirstRefresh && !_refreshingAll && self.update()`,
  and through the batched case where `_refreshAll` calls `_updateAll(2)` whose gate passes on
  `force === 2` regardless of `_refreshingAll`. So this is a timing expectation, not a bug: do not
  write Phase 5 code that assumes the renderer has been given a progress value by the time
  `onSection()` returns. Give renderers a sane value at construction instead — `SvgSignal` already
  defaults to 0.
- **`--virtual-time-budget` freezes `requestAnimationFrame` after a single frame.** Proved with a
  recursive frame tracer: 1 frame over 3s, top-level and inside an iframe. Anything rAF-driven —
  Lenis, ScrollTrigger, the `stroke-dashoffset` draw — is therefore **invisible** under it, and a
  screenshot taken that way silently shows frame 1 rather than the settled state. This supersedes
  the 2026-09-20 note recommending `--virtual-time-budget=5000` for screenshots: it is fine for
  static paint, wrong for anything animated. Motion must be verified over real-time CDP. Every
  Phase 4 check except the anchor trace was rAF-independent, so they stand.
- **The content-box assumption is load-bearing.** Only 03 Selected Work reserves the gutter: it
  lays out as a centred `--container` with `--s-5` padding plus `padding-left:
  var(--signal-gutter)`, and `gutter.ts`'s lit/dim bands assume exactly that box. The probe's
  region runs from 03's top to the next section's top (`GutterRegion.bottom`, measured in
  `svg-signal.ts`), so the line is dim everywhere in 04–06, which use the plain content box like
  01–02. A section that wants the gutter back must reserve it in CSS *and* extend the region.
- **`global.css`'s reduced-motion rule turns inline style writes into 1ms transitions**, which
  stalled in headless Chrome. The branch and each scrubbed diagram part opt out. Any later island
  that writes positions per frame needs the same opt-out; worth one shared class in the Phase 9 pass.
- **The success state is a status line.** On a 200 the form resets and the status reads "Sent.
  Thank you — I will reply by email." Nothing else changes. That is enough for a single-purpose
  form; a larger confirmation would be island-rendered content, so it was not built.
- **JS off lands on Formspree's own confirmation page.** Acceptable per the brief; Formspree's
  `_next` redirect back to the site needs a paid plan.
- No test framework existed before Phase 0. Vitest covers pure modules only —
  `career.ts`, `signal/path.ts`, and later `audio/engine.ts` scheduling. Motion and visual
  work is verified by hand; this is a deliberate limit, not an oversight.
- Testimonials remain absent until real client quotes exist (spec §3).
