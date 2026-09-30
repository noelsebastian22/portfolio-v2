# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

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
