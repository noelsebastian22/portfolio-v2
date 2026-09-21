# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

<!-- newest first -->

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

