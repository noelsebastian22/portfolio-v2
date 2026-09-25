# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

<!-- newest first -->

## 2026-09-25 · claude-code · middot decision

**Did**
- Recorded Noel's ruling on the H1 middot in `BUILD-PLAN.md` (Decisions; Known Gap marked
  resolved). No code changed since `058e227`. Build green, shipped JS unchanged at 57,756 gzip on `/`.

**Decided**
- The square middot in "Senior Web Engineer · Angular Specialist" stays for now. It reads as
  an emission mark. The fallback if it grates is a `--font-mono` `<span>` around the separator.

**Open**
- Everything under the Phase 6 entry's Open list below, minus the middot.

**Next**
Phase 7 (The Ring, 2D rail first). Start with `optimise-gallery.mjs`'s double-encode (write the
encoded buffer with `writeFile`, as `portrait.mjs` does), then build the rail as a centred
`--container` + `--signal-gutter` section and move `data-signal-section="ring"` onto it.

**Touched** — `BUILD-PLAN.md`


## 2026-09-25 · claude-code · Phase 6 selected work

**Did**
- Expanded Phase 6 into 6.1–6.3 in `BUILD-PLAN.md`. Implementation went to subagents (6.2 in a
  worktree, in parallel with 6.1); every review was inline, with one fix round per task.
- 6.1: `anchors.ts` pins each `SECTION_SPANS` seam to its `data-signal-section` element;
  `gutter.ts` sets the lit/dim bands; `playhead.ts` + `tip.ts` reveal the line to a viewport
  playhead. `--signal-gutter` derived from `SPINE_SPAN`, held by a test that reads `tokens.css`.
  `--signal-dim-alpha: 0.15`. `<Work />` moved under `<NineYears />`.
- 6.2: `src/lib/diagrams/{bundle,repos,frametime,scatter,figure}.ts` + a `diagram` field on
  each `caseStudies` entry. The honesty test scopes every diagram number to its employer's own
  transcript section.
- 6.3: `SelectedWork.astro` replaces `Work.astro` (deleted); `src/islands/work.ts`. The diagrams
  are server-rendered at their end state and scrubbed on `onSection('work', …)`. Branches draw
  as the tip passes. The spine is pinned to the first card's top and last card's bottom.
- Spec §9.03 amended (Nx graph dropped). Attribution trailer normalised on the 10 implementer
  commits by rebase, tree verified identical.
- Build green, 103/103 tests. **Shipped JS on `/`: 53,241 → 57,756 gzip (+4,515)**, which is
  70.5% of the 80 KB budget, 24,164 left for Phases 7–9. The diagram SVGs add 8,559 gzip of HTML.

**Decided**
- The curve is pinned to the sections by the renderer, and `path.ts` is untouched: it had
  lined up with sections only by coincidence (`#work` at 71% of the page, its curve span at 26–54%).
- The gutter derives from the spine's rightmost `x`, not the 163.8px leftmost figure logged
  2026-09-24. It is 203.6px at 1440 and 0 past ~2006px.
- The line is full strength only where it clears the content. One rule covers 01–02, the
  sweep that opens section 03, phone width, and wide screens.
- The spine's two ends anchor to the first and last card.
- The Nx dependency graph is dropped (no resume number). The frame-time trace is flat with no
  jitter; the scatter is 1,000,000 real seeded points.
- `optimise-gallery.mjs`'s double-encode moves to Phase 7: Phase 6 has no screenshots.

**Didn't work**
- **Seam-only anchoring left cards 01–02 without a branch.** The sweep took the top 47.6% of
  `#work` and the cards sat beside it. Fixed by the spine anchors; do not revert to seams only.
- **"Gutter 0 → dim the whole line" dimmed the spine on screens over ~2006px**, where it sits in
  empty margin. The test has to be "clears the content edge", not "gutter > 0".
- **Revealing by `t × totalLength` left the tip above the viewport** once anchoring stretched the
  spans. Branches need the tip on screen.
- **Agent worktrees were provisioned off stale `master`**, not the current branch (no
  `BUILD-PLAN.md`, the retired `PRODUCT.md` present). The 6.2 implementer caught it and reset.
  Check a worktree's base before trusting it.
- **Chrome's `--blink-settings=scriptEnabled=false` is ignored by new headless.** Use CDP
  `Emulation.setScriptExecutionDisabled` for JS-off checks.
- **`global.css`'s reduced-motion rule turned per-frame inline writes into 1ms transitions**
  that stalled headless Chrome. The island's scrubbed parts opt out.
- A honesty test that checked the numbers against the whole transcript proved nothing: 60, 5,
  45 and 12 appear under several employers. And 60 was a bad negative example (both Winning
  Group and SRT Marine have one); the test uses 35.

**Open**
- Three sections anchor to interim stand-ins (`ring` → `#gallery`, `stack` → `#skills`, `contact`
  → `#contact`). Phases 7–8 must move `data-signal-section` onto the rebuilt sections and lay out
  to the content-box assumption in `gutter.ts`.
- The dim line lies over unrebuilt Gallery/About/Skills text (contrast holds; placement doesn't).
- Minor: the scatter's lowest density level tints nearly the whole plot box.
- Still carried: Archivo's square middot (Noel's call), `mountHeroClock()` idempotency, Phase 4
  minors, OG image, `src/pages/dev/signal.astro` deletion before Phase 9, branch unpushed.

**Next**
Phase 7 (The Ring, 2D rail first). Start by fixing `optimise-gallery.mjs`'s double-encode:
write the encoded buffer with `writeFile`, as `portrait.mjs` does, then re-run and commit the
re-encoded gallery. Then build the rail as a centred `--container` + `--signal-gutter` section and
move `data-signal-section="ring"` off `#gallery` onto it.

**Touched** — `src/lib/signal/{anchors,gutter,playhead,tip,path,svg-signal}.ts`,
`src/lib/diagrams/*.ts`, `src/components/SelectedWork.astro`, `src/components/Work.astro` (deleted),
`src/islands/work.ts`, `src/data/content.ts`, `src/styles/{tokens,global}.css`,
`src/pages/{index,dev/signal}.astro`, `src/components/{Hero,NineYears,Gallery,Skills}.astro`,
`tests/{signal-anchors,signal-gutter,signal-playhead,diagrams,diagram-figure}.test.ts`,
`AGENTS.md`, `BUILD-PLAN.md`, `docs/superpowers/specs/2026-09-19-signal-path-design.md`


## 2026-09-25 · claude-code · Phase 5 sections 01–02

**Did**
- Task 5.1 subagent-driven: `scripts/portrait.mjs` bakes the duotone still from the 3960² master
  (crop → tone → key light + edge dissolve → two-stop gradient map, both tones parsed out of
  `tokens.css`), AVIF/WebP/JPEG at 640/1280, wired into `npm run images`. The ad-hoc
  `portrait-400w/800w` files are deleted and `About.astro`, their only consumer, repointed.
- Tasks 5.2–5.3 batched to one implementer: `Hero.astro` rewritten + `src/islands/hero.ts` (the
  clock's numerals, nothing else); `NineYears.astro` + `src/islands/years.ts` (emissions grouped by
  country, four statistics counting through one `onSection('years', …)`). `Stats.astro` deleted,
  `heroChips` deleted.
- Raised `--z-grain` from `-2` to `30` in `tokens.css` — the grain now paints over content.
- Corrected the "Verify visually" rule in `task-5.1-brief.md` and `task-P5-brief.md`, which still
  told implementers to check motion under `--virtual-time-budget`; added a controller addendum to
  the P5 brief. (`.superpowers/` is gitignored — brief edits carry no commit.)
- Reviewed both dispatches inline. Build green, 18/18. **Shipped JS on `/`: 52,332 → 53,241 gzip
  (+909).** 65.0% of the 80 KB budget, 28,679 left for Phases 6–9.

**Decided**
- **The page grain paints above content** (`--z-grain: 30`, over nav and skip link). Behind it, every
  opaque element punched a grain-free rectangle (portrait corners 10,9,7 vs grained ground 15,14,13).
  The layer is `position: fixed` either way, so only paint order changes. Not stopped below the nav:
  the nav is 84% opaque, so it would have become the new rectangle.
- **`--signal-gutter` gets derived from the curve** (~163.8px measured at 1440, not the guessed
  `clamp(48px, 6vw, 96px)`) for sections 03–06; sections 01–02, which §7.3 grants no gutter, dim the
  line behind content instead. Phase 6 implements both halves.
- **`NineYears` absorbs `Stats.astro`** — the four statistics are §9.02's accumulating statistics, and
  the old component's IntersectionObserver + fixed-1100ms rAF loop was a second scroll pathway.
- **A clock is information, not choreography.** §7.4's no-timers rule does not bind it: `setTimeout`
  re-armed onto the next wall-clock second, not registered through `onSection()`, still running under
  reduced motion. Build-time-baked numerals are forbidden on a static build — the rail's words are
  server-rendered, the numerals arrive on mount over a reserved `calc(10ch + 0.6em)`.
- **Archivo's `wdth` axis is live** — 521.16 / 787.83 / 984.58px condensed/normal/expanded at 64px/800.
  `archivo-var.woff2` is the right file; that Known Gap is closed.

**Didn't work**
- **`mix-blend-mode: screen` on the portrait made the rectangle worse, not better** (22,21,18 against
  a 15,14,13 ground). The asset dissolves to `--ground`, not to black, so screen adds a ground to a
  ground. A `radial-gradient(farthest-side …)` mask fixed that instance — `farthest-side` puts the
  radii on the mid-edges so the corners fall outside — but masks were rejected as the *general* rule:
  §9.03's case-study screenshots have to read as rectangles and cannot dissolve.
- **Chunk-summing understates shipped JS.** The hero island is small enough that Astro inlines it into
  `index.html` rather than emitting a chunk, so it appears in no `_astro/*.js` listing while still
  shipping; `Gallery.astro`'s `is:inline` script has never been counted in any phase figure either.
  Deltas stay sound, the absolute number does not. Reproduce the recorded figures with `gzip -c <path>`
  **by name** — stdin measures ~60 bytes smaller, `zlib.gzipSync` ~130 larger.
- **The P5 implementer was killed mid-task by a session rate limit, and its final message claimed less
  than it had done** — it had already committed 5.2 and written 487 lines of `NineYears.astro`
  untracked. Check the tree before re-dispatching: resuming the original agent was right, a fresh
  dispatch would have redone the hero.
- **My own `git commit` of the brief corrections was a no-op** and I nearly reported it as landed —
  `.gitignore:38` excludes `.superpowers/`. Brief and report edits never appear in git.

**Open**
- **Archivo's middot is a square**, and nothing chose it. Verified genuinely in-font
  (`document.fonts.check` true, 35.95px advance at 86px; Archivo's own U+2022 is round), so not a tofu
  or a fallback. Reads as an emission mark on the dark palette, and renders round in the mono voice.
  Kept by default pending Noel.
- `mountHeroClock()` is not idempotent — a leaked `visibilitychange` listener and `setTimeout` chain
  per call. Inert today; `scroll.ts` anticipates view transitions, so Phase 15 would expose it.
- `optimise-gallery.mjs` encodes every asset twice and discards the quality setting
  (`sharp(buffer).toFile()`), so `npm run images` rewrites committed gallery bytes. Phase 6 owns it;
  `node scripts/portrait.mjs` direct is deterministic and leaves the tree clean.
- Phase 4's seven review minors and three critical-path perf items still held for one Phase 9 pass.
- OG image still SVG; `src/pages/dev/signal.astro` still to delete before Phase 9.
- Branch `feat/signal-path-rebuild` unmerged, unpushed, no upstream. 6 commits this session.

**Next**
Phase 6 (Section 03, Selected Work + generated diagrams). Start by settling `--signal-gutter` from
the curve's measured minimum `x` and implementing the 01–02 dim — both are decided above and both
block laying out any section against the line. Read the two Phase 5 Known Gaps first: the grain
question is resolved but the *general* image-mount rule it implies is what Phase 6's case-study
shots land on.

**Touched** — `scripts/portrait.mjs`, `package.json`, `src/components/Hero.astro`,
`src/components/NineYears.astro`, `src/components/Stats.astro` (deleted), `src/components/About.astro`,
`src/islands/hero.ts`, `src/islands/years.ts`, `src/pages/index.astro`, `src/data/content.ts`,
`src/styles/tokens.css`, `src/styles/global.css`, `public/images/portrait/*`, `BUILD-PLAN.md`

## 2026-09-23 · claude-code · Phase 4 shell complete

**Did**
- Settled the owed framing decision and wrote it into `BUILD-PLAN.md` + `Addendum A` of `task-P4-brief.md`, which added Task 4.5.
- Ran Phase 4 subagent-driven: one batched implementer (4.1–4.5), spec+quality review, one fix round, scoped re-review clean.
- Shell landed: `global.css` dark reset + 0.42 KB `feTurbulence` grain, generated `favicon.svg` doubling as the nav wordmark, dark `BaseLayout`, Nav with CV always visible, Footer with the `|` completion bar, and the signal on a page-height layer.
- Ran Lighthouse myself (none in the repo) to close the implementer's own "not verified" concern: desktop **100 / 96 / 100 / 100**, mobile **94 / 96 / 100 / 100**, CLS 0 and TBT 0 on both.
- **Shipped JS on `/`: 2,039 → 52,332 gzip (+50,293).** 63.9% of the 80 KB budget; 29,588 left for Phases 5–9. Forecast was ~54.6 KB, so it came in 4.3 KB under. Build green, 18/18.

**Decided**
- **One whole-curve renderer on a page-height layer**, not per-section mounts (Noel's call). `createSvgSignal` loses its `section` argument; `toSvgPath`'s global mapping is then right by construction. `onPageProgress(fn)` joins `onSection` in `timeline.ts` as the only other place a ScrollTrigger is created.
- **`CURVE_SAMPLE_DENSITY` is 480, measured not guessed** — 240 deviates 2.70px from the true curve against a 4px stroke on the real 1440×9163 page.
- **`/websites` keeps the signal layer** — spec §14 already lists "the drawn line in 2D only" among what it inherits.
- **Do not import `lenis/dist/lenis.css`** — all five rules verified inert here; it would add a render-blocking request for nothing. Phase 15 revisits, because its preloader calls `lenis.stop()`.
- **Anchors are smoothed by `new Lenis({ anchors: true })`**, not `scroll-behavior: smooth`, which Task 4.1 removed.

**Didn't work**
- **`--virtual-time-budget` freezes rAF after one frame.** Proved with a recursive tracer: 1 frame over 3s, top-level and in-iframe. Lenis, ScrollTrigger and the dashoffset draw are all invisible under it — a screenshot shows frame 1, not the settled state. **Supersedes the 2026-09-20 note recommending it.** Motion needs real-time CDP; the anchor fix was unverifiable until that was built.
- **The implementer's first clipping check proved nothing and passed anyway.** It sampled the document's bottom row at x=712 — where the completion bar paints the same `--signal` in the same pixels. Caught by the reviewer. Re-taken on `/dev/signal/?t=1`, which has neither nav nor bar.
- **Insetting the layer by half the stroke does not un-clip the endpoint caps.** The root `<svg>` is `overflow: hidden` under the UA stylesheet; the inset just moves the clipped cap 2px inward. `overflow: visible` is the fix, and the inset is what makes it safe. The wrong reasoning had already been committed as a comment.
- **My own ruling-1 grep was case-sensitive** and missed 24 lowercase `font-bricolage` strings — the exact hole the ruling was written to close. Inert, on components Phases 5–8 rewrite, but the ruling was weaker than intended.
- **My "three z-index values" ruling was impossible.** Three cannot order grain/signal/content *and* nav/skip-link; the implementer used four and was right to.

**Open**
- Seven review minors deferred to the final whole-branch review, and three critical-path perf items (29 KiB unused JS, render-blocking 1.9 KB CSS, no `modulepreload` on the renderer chunk) held for **one** Phase 9 pass rather than piecemeal fixes. All listed in `BUILD-PLAN.md` → Known Gaps.
- `--signal-gutter` is 86.4px against the curve's measured 163.8px left extreme. Phase 6 owns it; derive the gutter from the curve, not the reverse.
- Archivo's `wdth` axis is still unconfirmed — Phase 5's first display heading is the decisive check.
- The OG image is still SVG, so the share card renders nowhere. `src/pages/dev/signal.astro` still to be deleted before Phase 9.
- Branch `feat/signal-path-rebuild` is unmerged, unpushed, no upstream.

**Next**
Phase 5 (Tasks 5.1–5.3) from `.superpowers/sdd/BUILD-PLAN/task-P5-brief.md`, starting with 5.1's `scripts/portrait.mjs` — it reports NEEDS_CONTEXT if the 3960×3960 source portrait is absent, so check that exists first. Read Known Gaps before dispatching: the reduced-motion delay net, the rAF/screenshot trap and the counting-stats a11y requirement all land directly in Phase 5's path.

**Touched** — `BUILD-PLAN.md`, `src/styles/global.css`, `src/styles/tokens.css`, `src/layouts/BaseLayout.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/lib/signal/svg-signal.ts`, `src/lib/motion/scroll.ts`, `src/lib/motion/timeline.ts`, `src/pages/dev/signal.astro`, `public/favicon.svg`, `public/og-image.svg`

## 2026-09-22 · claude-code · Task 2.2 review and Phase 3

**Did**
- Ran the owed Task 2.2 spec+quality gate inline (a review is read-only, so it needed no handoff): ✅ spec compliant, quality Approved, 0 Critical / 1 Important / 4 Minor, no fix round.
- **Verified the renderer's reduced-motion branch for the first time** — Chrome takes `--force-prefers-reduced-motion`. At `?t=0` the path renders fully drawn, matching `?t=1`, readout still `t = 0.000`. The cut-off implementer never reported and the earlier spot-check only covered default motion.
- Measured polyline faceting rather than assuming it: max deviation from the true curve is 0.33–0.90 px against a 4 px stroke at a 1000×480 mount, so `CURVE_SAMPLE_DENSITY = 240` is genuinely adequate. Scales linearly — `stack` is worst at ~2.3 px on a 2560 px mount.
- Task 3.1 subagent-driven: `src/lib/motion/scroll.ts` (Lenis + `gsap.ticker` on one RAF loop, idempotent `initScroll`, Lenis never constructed under reduced motion, pure `progressFromScroll` extracted), `src/lib/motion/timeline.ts` (`onSection` owning the only `ScrollTrigger.create` in the codebase), `tests/motion.test.ts`. Review approved after one fix round.
- Corrected the plan's headline "0 bytes. No `_astro/*.js` chunks are emitted at all." The build emits 4,139 raw / **2,039 gzip**; true of the two public pages, which reference no chunk, but the `/dev/signal` harness's `<script>` imports a module and is therefore bundled, not inlined.
- **Build green, 18/18 tests (was 11). Shipped JS unchanged at 2,039 gzip — delta 0.**

**Decided**
- **The 3.1 brief's SSR guard was wrong and the implementer was right to depart from it.** `reducedMotion()` guards `typeof matchMedia === 'undefined'`, not `typeof window`. `vitest.config.ts` sets no `environment`, so tests run in plain Node where `window` is undefined even after stubbing `globalThis.matchMedia` — a window guard pins `reducedMotion()` to false and makes the brief's own required test unsatisfiable. Also strictly more defensive. **Do not revert this.**
- **`createSvgSignal`'s per-section API and `toSvgPath`'s global coordinate space are incompatible.** `toSvgPath` maps the curve across the whole box it is given, so a section draws only its global slice: measured box-fill at 1000×480 is hero 3.9%, years 7.8%, work 19.5%, ring 8.4%, stack 3.8%, **contact 0.7%**. Not a defect in `805a57e` — the brief specified the API, Task 2.1 the mapping, and neither owned the seam. Phase 4 picks one: one whole-curve renderer on a page-height layer, or per-section bounding boxes. Table in `BUILD-PLAN.md` → Known Gaps.
- **Review dispatches must state that the range has already been attribution-normalised.** Third finding attribution has cost on this project.
- ScrollTrigger ids get a per-section counter suffix (`ring-1`, `ring-2`); the counter never decrements, because reuse after a `kill()` recreates the collision.

**Didn't work**
- **I suspected `onSection` never pushes an initial value** — which would strand a section that is on screen at load at progress 0. Traced `ScrollTrigger.js` and disconfirmed it before reporting: `isFirstRefresh && !_refreshingAll && self.update()` at line 1606 fires it once `_refreshing` clears at 1579. The reviewer then resolved the batched case I had flagged as uncertain — `_refreshAll` calls `_updateAll(2)` whose gate passes on `force === 2` regardless of `_refreshingAll`. Initial fire is not skippable. It does land on the next refresh pass, not synchronously inside `onSection()`.
- **The review's Minor was void and it was my fault.** It flagged a `Co-Authored-By` trailer as the implementer violating the brief. The trailer was mine, added by `commit-tree` *before* the review was dispatched; commit `0dba274` parses as having no trailers. Tasks 0.1 and 0.3 hit the inverse — reviewers flagging a trailer they could not see. Same gap in both directions, now closed by the ruling above.
- **`du -b` does not exist on macOS** (BSD `du` has no `-b`); the skill's fact-gathering snippet silently returns nothing for the JS weight. Use `wc -c` and `gzip -c | wc -c` per file instead.
- `npx vite-node` on a script outside the project root fails to resolve (`/@fs/` prefix error). A temp `.mts` at the repo root, run and then deleted, works.

**Open**
- **Phase 4 must settle the renderer framing decision** above before mounting anything.
- **Phase 4 is where the ~54.6 KB gzip motion bill actually lands** (gsap 28,356 + ScrollTrigger 17,988 + lenis 8,254), the moment the shell calls `initScroll()`. The Phase 3 delta of 0 is deferred, not free — do not read it as headroom.
- Archivo's `wdth` axis is still confirmed only circumstantially. The decisive check is the first display heading rendered with `font-stretch` expanded — Phase 4/5.
- `src/pages/dev/signal.astro` must be deleted before the Phase 9 ship.
- Task 2.1 and 2.2 minors still deferred: no `NaN`/`Infinity`/fractional guard on `sampleSignalRange`'s `steps`; no committed regression test for `toSvgPath`; `mount.clientWidth` feeds the viewBox while the `<svg>` is `width:100%`, so any padding on a Phase 4 mount silently scales the curve down; `stroke-width: var(--s-1)` borrows a spacing token.
- Branch `feat/signal-path-rebuild` is unmerged, unpushed, and has no upstream configured.

**Next**
Dispatch Phase 4 as one batched task from `.superpowers/sdd/BUILD-PLAN/task-P4-brief.md` — `global.css` reset + grain, signal mark / favicon / OG, `BaseLayout` rewrite, Nav + Footer. **Read the brief to the end; its controller addenda override the plan text.** Settle the framing decision first, and re-measure shipped JS afterwards — it will move for the first time since Phase 0.

**Touched** — `src/lib/motion/scroll.ts`, `src/lib/motion/timeline.ts`, `tests/motion.test.ts`, `BUILD-PLAN.md`, `docs/SESSIONS.md`, `.superpowers/sdd/BUILD-PLAN/progress.md`

## 2026-09-20 · claude-code · Phases 0–2 complete

**Did**
- Ran subagent-driven mode: fresh implementer per task, spec+quality review after each. Ledger, briefs and review packages live in `.superpowers/sdd/BUILD-PLAN/` — **gitignored but NOT deleted; the next session needs them.**
- **Phase 0** — removed React/Tailwind/zod and the retired brand docs, added three/gsap/lenis/vitest, created `vitest.config.ts`, wrote `src/styles/tokens.css`, self-hosted Archivo + JetBrains Mono and cut the Google Fonts CDN.
- **Phase 1** — `src/lib/career.ts` + tests (TDD, 4 tests); `src/data/content.ts` rebuilt with the EY role, the AI-tooling group and every resume metric. Retired Services/Process/Testimonials.
- **Phase 2** — `src/lib/signal/path.ts`: the canonical curve, 51 control points, 7 tests. `src/lib/signal/svg-signal.ts`: the 2D renderer, plus a `/dev/signal` harness that takes `?t=<0..1>`.
- Transcribed the résumé to `docs/resume-transcript.md` and wrote the Phase 4–5 task expansion into `BUILD-PLAN.md`.
- **Shipped JS: 73,854 bytes gzip → 0.** Not reduced, eliminated — no `client:*` islands remain and every `<script>` is `is:inline`, so Vite emits no chunks at all. Build green on every commit; 11 tests passing.

**Decided**
- **The build stays green on every commit.** The plan meant to leave the tree red from Task 0.1 until Phase 8 and call the failures "the Phase 4–8 worklist". Measured first: the breakage was 7 lines. `AGENTS.md` makes a green build the gate and outranks the plan.
- **`docs/resume-transcript.md` is the source of truth for every metric**, with a metric→employer table. `Resume.pdf` defeats *text extraction*, but the Read tool renders PDFs as images — it was always reachable. Two sessions worked around it instead.
- **90%+ and 85% test coverage are both correct** — 90%+ is Winning Group's monorepo, 85% is SRT Marine. Not a contradiction.
- **Commit attribution is normalised by the controller afterwards, never mandated in a brief.**
- **Curve speed is structural:** `speed ≈ gap × (N−1)`; keep `max_gap × (N−1) ≤ 15`. Dramatic geometry comes from subdivision, not tamer motion.
- Both PDFs stay (Noel's call). Phase 4 batched into one task, Phase 5 into two.

**Didn't work**
- **Telling subagents which `Co-Authored-By` trailer to use.** Two implementers in a row overrode the brief, each citing its own session's attribution instruction as superseding. Brief text cannot win that; it cost a `DONE_WITH_CONCERNS` each time. Briefs now say *add no trailer* and the controller rewrites with `git commit-tree` onto the same tree. Don't re-litigate this in a brief.
- **Two of my own instructions caused defects.** I called the 90%+/85% coverage figures a contradiction and asked for a reconciliation — a faithful implementer then deleted a true, verified stat. And my hard-coded-year acceptance regex required a `+` or `yrs`, so it missed `"9 years of shipping"` in `Work.astro`. Both caught, both fixed; the lesson is that an acceptance check written from memory is not an acceptance check.
- **Inferring metric attribution from "domain fit" put three résumé numbers on the wrong employers** ($15k/year debt and 20% memory belong to Winning Group, not SRT Marine; 25% YoY bug reduction to SRT Marine, not Direct Line). Caught by reading the PDF. This is why the transcript now exists.
- **The obvious signal curve fails the plan's own continuity test.** A 19-point Catmull-Rom honouring §6 measured 0.3321 against the 0.2 limit, at t=0.36 — the Nine Years run swinging back to the left margin, two points 1.42 apart in a segment 0.056 wide. Reference harness: `.superpowers/sdd/BUILD-PLAN/curve-feasibility-reference.py`.
- **`claude-in-chrome` is unavailable and `agent-browser` still isn't installed — but that no longer blocks visual work.** Chrome's own headless mode works: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless --disable-gpu --no-sandbox --hide-scrollbars --screenshot=out.png --window-size=W,H --virtual-time-budget=5000 URL`. macOS prints `CVDisplayLinkCreateWithCGDisplay failed` — harmless noise; check the PNG was written. ES modules need a server, so `npm run preview` + localhost, never `file://`. This is how the six hard-coded year claims were found and how the renderer was verified.
- **Don't run `scripts/task-brief` to "verify extraction"** — it writes to `task-<N>-brief.md` and silently overwrote two hand-written briefs. The batched `task-P4-brief.md` / `task-P5-brief.md` / `task-5.1-brief.md` are canonical; the superseded singles were deleted.

**Open**
- **Task 2.2 never received its task review.** Its implementer committed `805a57e` and was cut off by a session limit before writing a report. I verified it directly — build green, 11/11 tests, and screenshots at `?t=0/0.5/1` showing the line drawing monotonically in `--signal` on `--ground`, with `work`'s geometry correct at `t=1` — but the formal spec+quality gate is owed. **Run it first.**
- The renderer's **viewBox framing is unreviewed**: at `?t=1` the span sits in the upper-left of a large empty box. May be right once Phase 4 mounts it in the `--signal-gutter` column. Decide when the shell exists.
- `src/pages/dev/signal.astro` must be deleted before the Phase 9 ship (it is why the build reports 3 pages).
- Task 2.1 minors, all deferred: no `NaN`/`Infinity`/fractional guard on `sampleSignalRange`'s `steps`; `toSvgPath` has no committed regression test; the import-time guard misses a compensating mis-attribution between adjacent sections; the `y = 0.9999999999999998` float footgun is documented only in the report.
- **Phase 3 will claim ~67% of the JS budget**: gsap 28,356 + ScrollTrigger 17,988 + lenis 8,254 = 54,598 gzip against 81,920, leaving ~25 KB for the renderer and every section island in Phases 4–9. Escape hatch: ScrollTrigger is 18 KB of it and sits behind `onSection()`'s interface.
- Archivo's `wdth` axis is confirmed only circumstantially. Decisive check is the first display heading rendered with `font-stretch` expanded, in Phase 4/5.
- Branch `feat/signal-path-rebuild` is unmerged and unpushed.

**Next**
Run the owed Task 2.2 review, then Task 3.1 (motion infrastructure — brief at `.superpowers/sdd/BUILD-PLAN/task-3.1-brief.md`, one task covering both `scroll.ts` and `timeline.ts`). Then Phase 4 as a single batched task (`task-P4-brief.md`), then `task-5.1-brief.md` (portrait pipeline) and `task-P5-brief.md` (Hero + Nine Years) to finish Phase 5. **Every brief has controller addenda that override the plan text — read them to the end, later sections supersede earlier ones.**

**Touched** — `package.json`, `astro.config.mjs`, `vitest.config.ts`, `src/styles/tokens.css`, `src/styles/global.css`, `src/lib/career.ts`, `src/lib/signal/path.ts`, `src/lib/signal/svg-signal.ts`, `src/data/content.ts`, `src/pages/dev/signal.astro`, `src/pages/index.astro`, `src/pages/websites.astro`, `src/layouts/BaseLayout.astro`, `src/components/{Nav,Work,Skills,Hero,About}.astro`, `tests/`, `public/fonts/`, `docs/resume-transcript.md`, `gallery-masters/ezytrack.png`, `scripts/upwork-heroes.mjs`, `BUILD-PLAN.md`, `docs/SESSIONS.md`


## 2026-09-19 · claude-code · Signal Path spec and plan

**Did**
- Wrote `docs/superpowers/specs/2026-09-19-signal-path-design.md` — 17 sections, the full design.
- Wrote `BUILD-PLAN.md` — 16 phases. Phases 0–2 have code-level detail; 3–15 are phase-level.
- Ported `session-handoff` from `todo/daybook`, adapted: `npm run build` not `ng build`, no Supabase step.
- Rewrote `AGENTS.md` — was a stub pointing at a non-existent `README.md`.
- Extracted `Resume.pdf`; found four things absent from the site: Ernst & Young (10/2016–05/2020), MCP + Figma Code Connect work, mentoring 6 devs, Australian PR status.
- No application code written. Phase 0 has not started.

**Decided**
- Anchor concept is **Signal Path** — one line, both a marble diagram and a waveform. Rejected The Build (clinical) and Dead Reckoning (metaphor about travelling, not building).
- Astro + vanilla TS + Three/GSAP/Lenis. No React, no Tailwind. Angular and Next both rejected — see `BUILD-PLAN.md` → Decisions for the reasoning on each.
- **Phase 9 is the shippable milestone.** Do not start Phase 10 until it is signed off.
- `PRODUCT.md` and `DESIGN.md` retired; deleting them is Phase 0 work.

**Didn't work**
- `pdftotext` on `Resume.pdf` returns **2 characters**. The file has no text layer — `pdffonts` shows zero embedded fonts; it is Quartz-generated vector art. Do not retry text extraction on it. It required `brew install poppler` and reading the rendered pages as images.
- Chrome/`claude-in-chrome` was unavailable the whole session, so the four reference sites could never be screenshotted — design analysis came from `WebFetch` text summaries only. If a visual re-check of saifullah.dev / manishkr.xyz / brandonbartram.dev / lukebaffait.fr is ever needed, the browser has to be reconnected first.
- `agent-browser` CLI is not installed on this machine. Not globally installed without asking.

**Open**
- `Resume.pdf` (repo root, now tracked) and `public/noel-sebastian.pdf` (the file the site serves) differ. Only one should survive — Phase 1, Task 1.2, Step 6.
- `gallery-masters/ezytrack2.jpg` is **PNG data with a `.jpg` extension**, 16MB, now tracked. The Phase 7 sharp pipeline must sniff the real format rather than trust the extension.
- Noel has not picked an execution mode — subagent-driven or inline.
- Branch `feat/signal-path-rebuild` is not merged and not pushed.

**Next**
Phase 0, Task 0.1 — the dependency swap. **Expect `npm run build` to FAIL immediately afterwards**: `index.astro` still imports `ContactForm` and every component still carries Tailwind classes. That failure list is not a problem to fix on the spot; it *is* the Phase 4–8 worklist, and it should be recorded in the next session's entry.

**Touched** — `BUILD-PLAN.md`, `AGENTS.md`, `docs/SESSIONS.md`, `docs/superpowers/specs/2026-09-19-signal-path-design.md`, `.agents/skills/session-handoff/SKILL.md`, `.claude/skills/session-handoff`, `Resume.pdf`, `gallery-masters/ezytrack2.jpg`

