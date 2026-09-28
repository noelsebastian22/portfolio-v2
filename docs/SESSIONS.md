# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-09-29 · claude-code · Handoff docs trimmed

**Did**
- Archive pass: `BUILD-PLAN.md` 129 KB → 47 KB, `docs/SESSIONS.md` 49 KB → 11 KB. Phases 0–9 detail, the per-phase "Measured after" snapshots and 24 closed Known Gaps moved verbatim to `docs/archive/plan-phases.md` and `plan-closed-gaps.md`; entries before 2026-09-27 to `docs/archive/sessions.md`.
- `BUILD-PLAN.md` now has "Current figures", a "Measurement history" table, "Carried forward" for Phases 0–9, and Known Gaps grouped by kind. Two gaps still marked open were already fixed — the gutter (Task 6.1, `tokens.css`) and the gallery double-encode (Task 7.1, `695dc79`) — checked in code, archived with a closing line.
- `session-handoff` split into `SKILL.md` (start) and `end.md`, plus `check.mjs` (`start`, `facts`, `lint`, `verify`). End mode reads JS from `npm run budget`, not a `dist/*.js` sum.
- `check.mjs verify` against `3b9f412`: every line of the old docs is still present, live or archived. A deliberate one-line deletion was caught in a dry run.

**Decided**
- One fact, one place; `docs/archive/` is append-only and moves are verbatim (BUILD-PLAN → Decisions, 2026-09-29).

**Open**
- The final-review minors the last entry deferred are now a Known Gap ("Final-review minors, deferred").
- Resolved in-session (Noel): `.agents/skills/session-handoff/` and the `.claude/skills/session-handoff` symlink are now tracked; the original `SKILL.md` is in `626c471`, the rework in `5c7d4e1`.
- `feat/signal-path-rebuild` and `master` are at the same commit; decide which branch Phase 10 works from.

**Next**
After 1 Oct, work the Known Gap "Confirm the first scheduled rebuild". Then brainstorm Phase 10 (WebGL gate + signal tube) on a new branch off `master`.

**Numbers** — build green (3 pages) · 155 tests · JS on `/` 61,490 gzip (±0, docs only)

## 2026-09-29 · claude-code · Phase 9 shipped live

**Did**
- Pushed the branch and verified the preview with `x-vercel-protection-bypass` (secret in `.env.local`, gitignored). Pages, 404, OG PNG, PDF, form `action` fine; `/websites/` (trailing slash) returned 200.
- Lighthouse ×3 on preview: LCP median 2,500ms (`p.hero__lede`, all render delay, no JS reveal) → applied the recorded font ruling.
- Task 9.8 (subagent, reviewed inline): `scripts/fonts.mjs` + `npm run fonts` (`subset-font` devDep), masters in `font-masters/`. Archivo 90,104 → 57,188 B, JetBrains Mono 40,404 → 38,472 B. `tokens.css` `font-stretch: 100% 125%`. `vercel.json` gets an explicit `/websites/` source.
- Re-verified preview: all three `/websites` forms 307; Lighthouse Perf 94/99/99, A11y 100, **LCP 1,988ms median** (2,645 / 1,941 / 1,988).
- Tagged `v1-letterpress` on `6a4bac7` (pushed); fast-forwarded `master` to `c2b0e46` and pushed. Production smoke check passed; Lighthouse ×1 on live: Perf 97, A11y/BP/SEO 100, LCP 2,165.
- Noel created the Vercel Deploy Hook and `VERCEL_DEPLOY_HOOK` secret; a manual `workflow_dispatch` got Vercel's `PENDING` job back.
- Build green (3 pages), 155 tests, JS on `/` **61,490 gzip unchanged** (75.1%). `dist/` 3.8 MB.

**Decided**
- Noel: CV PDF swap and VoiceOver pass are post-launch, not merge blockers.
- Archivo `wdth` narrowed to 100–125 (the only widths set); the script guards it. JetBrains Mono keeps `calt`.
- Rollback = Vercel Instant Rollback to the `6a4bac7` deployment; code at tag `v1-letterpress`.

**Didn't work**
- Subsetting codepoints alone saves ~4%: the originals were already Google's Latin subset. The size is in the variable-axis data.
- `/websites/:path*` does not match `/websites/` on Vercel; it needs its own source.
- Lighthouse's `robots-txt` audit fetches without the bypass header, so previews always score SEO 61 (plus Vercel's preview `x-robots-tag: noindex`). Ignore SEO on previews.
- Vercel's "Add Connection → Anthropic" is Vercel calling Claude, not an agent route into Vercel. Deploy-hook deploys don't create GitHub deployment records, so `gh api …/deployments` can't confirm them.
- Python `fontTools` here has no `brotli`, so it can't read WOFF2.

**Open**
- LCP has almost no headroom (1,988 median; single runs 2,165–2,645). Next lever: drop the JetBrains Mono preload.
- The `→` in "Bundle size, 100% → 40%" falls back (no U+2192 in either face); allowlisted. Consider "to".
- Noel: September CV PDF, VoiceOver pass. Confirm the 1 Oct scheduled run flips the copy to "a decade".
- Deferred minors from the last entry still stand (comment nits, sitemap domain, M5 clock tick).
- `feat/signal-path-rebuild` and `master` are at the same commit; decide which branch Phase 10 works from.

**Next**
After 1 Oct, check the live site says "a decade" and the scheduled run succeeded in Actions. Then brainstorm Phase 10 (WebGL gate + signal tube) on a new branch off `master`.

**Touched** — `scripts/fonts.mjs`, `font-masters/`, `public/fonts/*.woff2`, `src/styles/tokens.css`, `vercel.json`, `package.json`, `package-lock.json`, `BUILD-PLAN.md`, `.superpowers/sdd/BUILD-PLAN/task-9.8-brief.md`


## 2026-09-27 · claude-code · Phase 9 ship pass

**Did**
- Planned Phase 9 as Tasks 9.1–9.6, with briefs in `.superpowers/sdd/BUILD-PLAN/task-9.*-brief.md`. Ran them with subagent implementers and inline reviews.
- 9.1: `resolveSeamPixels(sectionTops, height, terminus?)`. The `|` bar moved to the footer's top, and `svg-signal.ts` `measureTerminus()` pins the curve's end to it. `●`→`|` is 72px at every width (was 392–526px).
- 9.2: RxJS added to `architecture()` (`SITE_ONLY_ITEMS` in `tests/skill-groups.test.ts`). `text-wrap: balance` on `.contact__title`. `/dev/signal` and `createSvgSignal`'s `pageLayer` option deleted. `mountHeroClock()` is idempotent.
- 9.3: `scripts/og-image.mjs` builds `public/og-image.png` (1200×630, 33.6 KB). It takes the curve from `path.ts` and draws the text as `opentype.js` outlines from TTFs in `scripts/og/fonts/`. `og-image.svg` deleted. One fix round: the glyph's position was hand-tuned; it is now worked out from the text's measured width.
- 9.4: `npm run budget` (`scripts/budget.mjs` + `scripts/lib/budget.mjs`, tested). `inlineStylesheets: 'always'`. `src/integrations/modulepreload.ts` adds `fetchpriority="low"` preloads. `follow` folded into the `tip` chunk.
- 9.5: ship audit. Fixed `role="list"`, the sound toggle (`aria-disabled`, "Sound · soon"), the ring's `aria-labelledby` order, and skip-link focus (`main tabindex=-1`). Removed the `if (layer)` guard.
- Final whole-branch review (Opus): 0 Critical, 4 Important, 9 Minor. One fix wave, `c02fc7c..8918fc2`. Details in `BUILD-PLAN.md` → "Final whole-branch review".
- 9.7: `vercel.json` 307s `/websites` → `/#contact`, the sitemap filter drops it, and Contact's freelance line is unlinked.
- Pushed the branch (to 68f2c78) on Noel's word. Build green (3 pages), 155 tests. JS on `/` **61,790 → 61,490 gzip (−300)**, 75.1%. `/websites` 57,124; `/404` 55,215.

**Decided**
- Noel: RxJS in the Stack on the site only. The line ends above the footer. `text-wrap: balance`. The sound toggle stays, made honest. The four unreferenced gallery masters stay (312 KB, not 53 MB).
- Noel: keep "industry-first". It is on the Winning Group study, not Direct Line, and is recorded in `docs/resume-transcript.md`. `AGENTS.md` and the plan now both name the transcript as the source.
- Noel: `/websites` reuses `ContactForm.astro`, and is redirected until Phase 14. The year count gets build-time "a decade" copy plus `.github/workflows/scheduled-rebuild.yml`.
- Controller: LCP 2,404ms (simulated) against 798ms (devtools throttling) is decided on the Vercel preview. Fonts are `swap`, so Lantern is charging the 130 KB of font preloads to LCP. If the preview is still over 2.0s, Latin-subset `archivo-var.woff2`.

**Didn't work**
- sharp cannot read WOFF2. Pointing `FONTCONFIG_FILE` at `public/fonts` rendered a generic sans. The macOS sharp build's Pango has only CoreText, and forcing fontconfig segfaults (lovell/sharp#4577). Glyph outlines via `opentype.js` replaced it.
- Headless Chrome's `--disable-javascript` switch is not honoured. JS runs anyway, which gives false "JS-off" screenshots. Use CDP `Emulation.setScriptExecutionDisabled`.
- `modulepreload` at default priority cost +373ms FCP, because it pulled 50 KB of GSAP ahead of the fonts. `fetchpriority="low"` fixed it.
- Any attribute on an Astro component `<script>` (e.g. `fetchpriority`) stops Astro bundling it: the tag ships a raw `import` and throws `SyntaxError`.
- Neither a `<head>` reorder nor preloading the entry scripts moved simulated LCP.
- `overflow-x: hidden` on `#top` made it a scroll container, and the sticky nav had silently scrolled away since Phase 4.

**Open**
- The merge to `master` is blocked on Noel:
  - a text-based export of the September resume for `public/noel-sebastian.pdf` (the served CV is March's; `Resume.pdf` has no text layer);
  - a Vercel **Protection Bypass for Automation** secret (the preview 302s to login, so the redirect, OG card and LCP can't be verified);
  - a VoiceOver pass (checklist in `task-9.5-report.md`).
- Commits after 68f2c78 (the fix wave and 9.7) are local and unpushed.
- A rebuild must run on or after 1 Oct 2026 for the "a decade" copy. After the merge, Noel creates a Vercel Deploy Hook and saves it as the `VERCEL_DEPLOY_HOOK` secret.
- Deferred minors: comment nits in `global.css` (the wrap is below 360, not 390) and `404.astro` (no sitemap `filter` exists), and the sitemap filter hard-codes the domain. M5, the hero clock's per-second tick, is parked for Noel. `/websites` A11y is 96 (Phase 14).
- `.superpowers/sdd/BUILD-PLAN/progress.md` holds every ruling; keep it until Phase 9 closes.

**Next**
Once Noel supplies the CV PDF and the bypass secret: swap in the PDF and push. On the preview, verify the pages, the `/websites` 307, `og-image.png` as `image/png`, and the form `action`, then run Lighthouse ×3 with `x-vercel-protection-bypass`. Rule on LCP (subset Archivo if it's over 2.0s). Then ask Noel to merge (`git merge --ff-only`) and run Task 9.6's smoke check.

**Touched** — `src/lib/signal/{anchors,svg-signal}.ts`, `src/lib/career.ts`, `src/components/{Footer,Contact,ContactForm,Nav,Ring,Hero,SelectedWork}.astro`, `src/layouts/BaseLayout.astro`, `src/pages/{index,websites,404}.astro`, `src/islands/hero.ts`, `src/integrations/modulepreload.ts`, `src/styles/global.css`, `src/data/content.ts`, `scripts/{og-image,budget,portrait}.mjs`, `scripts/lib/budget.mjs`, `scripts/og/fonts/`, `astro.config.mjs`, `vercel.json`, `.github/workflows/scheduled-rebuild.yml`, `public/{og-image.png,robots.txt}`, `tests/`, `AGENTS.md`, `docs/resume-transcript.md`, `BUILD-PLAN.md`; deleted `src/pages/dev/signal.astro`, `public/og-image.svg`; moved `public/images/noel-sebastian.jpeg` → `gallery-masters/`.
