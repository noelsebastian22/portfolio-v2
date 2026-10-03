# Build plan archive — closed Known Gaps

Moved verbatim out of `BUILD-PLAN.md` → Known Gaps once closed. Append-only: add newly closed
gaps at the bottom under a dated heading, with a line saying what closed them. Never delete one.

---

## Archive pass 2026-09-29

- **CLOSED 2026-09-29 —** the scheduled rebuild's `VERCEL_DEPLOY_HOOK` secret is set and a manual
  run reached Vercel. First scheduled run: 1 Oct 00:00 UTC, which should flip the copy to "a decade".

- `src/pages/dev/signal.astro` (Task 2.2) is a `noindex` dev harness for the SVG signal
  renderer — there is no real page to mount a section on until Phase 4 builds the shell.
  It accepts `?t=0..1` to set progress directly for screenshotting, and falls back to a
  raw scroll listener otherwise. Scaffolding: delete it before the Phase 9 ship.
  **Closed by Task 9.2:** deleted, along with the now-empty `src/pages/dev/`.

- **The `/dev/signal` harness (`src/pages/dev/signal.astro`) must be deleted before the Phase 9
  ship.** It is `noindex` but it is scaffolding, and it is why the build now reports 3 pages.
  **Closed by Task 9.2:** deleted. `createSvgSignal`'s `pageLayer` option (which existed only
  so the harness could turn off the dim rule, the playhead reveal and the tip publishing) went
  with it — every `if (pageLayer)` branch is now unconditional page-layer behaviour, and the
  isolated-mount length-fraction reveal in `applyReveal` is gone. Every comment naming the
  harness or `/dev/signal` (`anchors.ts`, `svg-signal.ts`, `motion/scroll.ts`,
  `tests/motion.test.ts`) now names the real case instead — a page with no hero anchor or no
  section anchors (`/websites`) and, hypothetically, a page rendering no
  `[data-signal-terminus]` element. The build now reports **2 pages**, and `dist/sitemap-0.xml`
  lists only `/` and `/websites/`. Re-verified after the teardown, with a genuine wheel-driven
  scroll through Lenis (a raw `window.scrollTo()` does not update GSAP's ScrollTrigger, which
  only recalculates on Lenis's own `scroll` event — a test-methodology trap, not a code issue):
  on both `/` and `/websites`, scrolled to the bottom, `strokeDasharray` is `'none'` (fully
  drawn) and the curve's last point matches the footer bar's centre to within 0.00025px.
  Reduced motion still draws the line fully at once with no scroll. Shipped JS on `/`:
  **61,500 gzip (−347 against 61,847)** — folding `svg-signal.js` into the `BaseLayout` chunk
  (no more separate request) plus small, deterministic shrinks across every other chunk from
  Rollup's chunk-splitting graph having one fewer entry point to plan around.

- **RESOLVED 2026-09-22 (was: decision owed before Phase 4) — the signal is one whole-curve,
  page-height layer.** `createSvgSignal`'s per-section API and `toSvgPath`'s global coordinate
  space were incompatible: `toSvgPath` maps the normalised curve over the *whole* box it is given
  (`x` → `((x+1)/2)·width`, `y` → `y·height`), but `createSvgSignal(mount, section)` handed it one
  section's points and the mount's full box, so each section drew its global slice into a
  page-sized space. Measured box-fill at a 1000×480 mount — kept because it is the evidence the
  decision rests on:

  | section | drawn width | drawn height | box area filled |
  |---|---|---|---|
  | hero | 28% | 14% | 3.9% |
  | years | 65% | 12% | 7.8% |
  | work | 70% | 28% | 19.5% |
  | ring | 35% | 24% | 8.4% |
  | stack | 27% | 14% | 3.8% |
  | contact | 8% | 8% | **0.7%** |

  The resolution is one renderer for the whole curve on a single page-height layer; the `section`
  parameter goes and the global mapping becomes correct by construction. See Decisions
  (2026-09-22) for the full statement and `Addendum A` in
  `.superpowers/sdd/BUILD-PLAN/task-P4-brief.md` for the Task 4.5 implementation.

- **OPEN, Phase 6 owns it: `--signal-gutter` is about half the width the line actually occupies.**
  From `work` onward the curve parks at `x ≈ −0.76`, which maps to ~12% of the layer's width — about
  173px at a 1440px viewport. `--signal-gutter` is `clamp(48px, 6vw, 96px)`, about 86px there. Spec
  §7.3 reserves that column for the line and says content never encroaches, so content laid out
  against the current token would sit on top of the line from section 03 onward. Nothing before
  Phase 6 lays out a section, so nothing is blocked. Settle it by deriving the gutter from the
  curve's measured minimum `x`, not by moving the curve — the geometry is the design and the token
  was a guess.
  **Archived 2026-09-29 — closed by Task 6.1 Step 3:** `--signal-gutter` is derived from the
  spine's maximum `x` (`src/styles/tokens.css`, guarded by `tests/signal-gutter.test.ts`).

- **RESOLVED 2026-09-24 by Task 5.2 — Archivo's `wdth` axis is live.** `SENIOR WEB ENGINEER` at
  64px/800 measures condensed **521.16px**, normal **787.83px**, expanded **984.58px** (+24.97% over
  normal); `font-stretch` keywords and raw `font-variation-settings` agree to the hundredth of a
  pixel. `public/fonts/archivo-var.woff2` is the right file. Original entry, for the record:
  **Archivo's `wdth` axis is confirmed only circumstantially** — Fontsource metadata declares
  wdth 62–125, and `-wdth-` (90,104 bytes) is 2.6× the weight-only `-wght-` (34,928). No font
  tooling on this machine. The decisive check is visual: the first display heading rendered with
  `font-stretch` expanded, in Phase 4/5. If Expanded never appears, that file is the first suspect.

### Opened by Phase 4 — 2026-09-23

- **Seven Phase 4 review minors, deferred to the final whole-branch review:**
  (1) the inert sound toggle explains itself only via `title` on a `disabled` button, which is
  neither focusable nor reliably announced — **RESOLVED 2026-09-26 by Task 9.5:** a real
  focusable button, `aria-disabled="true"` not `disabled`, visible label "Sound · soon"
  (Decisions, 2026-09-26); (2) `role="list"` missing on the nav and footer `ul`s
  (Safari/VoiceOver drops list semantics under `list-style: none`) — **RESOLVED 2026-09-26 by
  Task 9.5:** both carry `role="list"` now, confirmed in the live AX tree; (3) the "Back to top"
  link was dropped without a decision record, on a 9,163px document — **RESOLVED 2026-09-26
  (Decisions):** staying dropped is the decision, recorded rather than left silent; (4) the
  desktop signal layer is full-opacity and the footer is the one place Phase 4 lays text across
  the curve's path — latent, since the centre column is mostly empty — **confirmed by Task 9.5,
  matches the Task 8.2 re-check below: still open, still just cosmetic.** At 1440 the centre
  column is empty (no overlap). At 375, under `prefers-reduced-motion` with the line fully
  drawn, it runs straight through "Medium" in the footer's social row — visibly a dim red
  stroke through the word, same as Task 8.2 found for the name/tagline/copyright/colophon at
  this width. `--signal-dim-alpha` keeps it legible (screenshotted); no code change made. (5)
  `og-image.svg`
  duplicates the generated `d` with no regeneration command of its own, so it can go stale
  silently — **RESOLVED 2026-09-26 by Task 9.3:** `og-image.svg` is deleted; `scripts/og-image.mjs`
  bakes `public/og-image.png` from `sampleSignalRange()` directly, so there is no `d` left to
  duplicate; (6) **24 lowercase `font-bricolage` class strings survive in `src/`** — the Phase 4
  ruling's grep was case-sensitive and missed exactly the hole it was written to close, though
  they are inert Tailwind names on components Phases 5–8 rewrite — **confirmed by Task 9.5: still
  open**, on `/websites` only now (every other page was rewritten by Phases 5–8); Phase 14's
  restyle owns it, per "Deliberately not in Phase 9"; (7) `BaseLayout.astro`'s `if (layer)`
  silently no-ops on an element `BaseLayout` itself renders eleven lines above — **RESOLVED
  2026-09-26 by Task 9.5:** the guard is gone; a missing layer now throws.
  **Archived 2026-09-29:** (1), (2), (3), (5), (7) resolved; (4) and (6) are still open and carried
  in the live Known Gaps as one bullet.

- **RESOLVED 2026-09-26 by Task 9.4 — all three fixed together.** Original: **Three critical-path
  items for the Phase 9 performance pass, to be fixed together, not piecemeal:** `unused-javascript`
  reports 29 KiB (the motion chunk ships whole while no section registers a trigger yet — expected
  to amortise across Phases 5–8, but verify rather than assume); a render-blocking 1.9 KB
  `_astro/index.css` link worth ~150ms; and no `modulepreload` for the 1.6 KB `svg-signal` chunk,
  which `BaseLayout`'s chunk statically imports — one extra round trip. Now: `unused-javascript`
  re-measured at **29,451 bytes, unchanged** — it never amortised, because it is GSAP core code no
  section's `ScrollTrigger` usage exercises during Lighthouse's trace window, not motion-chunk
  code waiting for a trigger to register. Accepted — removing it means removing GSAP features.
  The render-blocking CSS is gone: `build.inlineStylesheets: 'always'` (there are two stylesheets
  by Task 9.4, 5,341 + 1,806 bytes gzip, not one) drops render-blocking-insight's count 2 → 0, for
  a measured LCP −147.5ms / FCP −76.1ms / Performance 97 → 98, and the combined HTML+CSS bytes
  over the wire *fall* (one gzip stream beats three). The `svg-signal` chunk's missing
  `modulepreload` is moot — Task 9.2 folded `svg-signal` into `BaseLayout`'s own entry chunk,
  so it was never a separate chunk to preload by the time Task 9.4 started. The request-chain
  problem the finding was really pointing at (any shared chunk discovered only after its entry
  parses) still existed for `timeline` and `tip`, and Task 9.4 fixes it there: `src/integrations/
  modulepreload.ts` adds a `modulepreload` link per shared chunk, `fetchpriority="low"` (measured:
  default priority regressed FCP +373.5ms by pulling GSAP's 50.84 KB chunk forward; low priority
  keeps the chain-depth fix, 3 → 2, without the regression).

- **RESOLVED 2026-09-26 by Task 9.3 — the OG image is a build-time PNG.** Original: **the OG image
  is still an SVG**, which Twitter/X, Facebook, LinkedIn and Slack do not render, so the share card
  currently shows nowhere. Pre-existing; spec §10 already schedules a build-time `sharp` raster.
  Now: `scripts/og-image.mjs` renders a committed `public/og-image.png` (1200×630, 33.6 kB),
  `BaseLayout` points at it with the four `og:image:*` tags a crawler expects.

### Opened by Task 5.1 — 2026-09-23

- **`scripts/optimise-gallery.mjs` encodes every gallery asset twice, and the second pass throws
  the settings away.** It builds a buffer with `.webp({ quality: 72 })` / `.webp({ quality: 76 })`
  and then writes it with `sharp(buffer).toFile(...)` — re-opening an already-encoded buffer, which
  re-encodes it at sharp's *default* WebP quality and discards the quality the line above asked
  for. So the committed gallery files are double-encoded (generation loss) at a quality nobody
  chose. Found while writing `scripts/portrait.mjs`, which avoids it by writing the encoded buffer
  with `writeFile` and says why in a comment.

- **Consequence: `npm run images` dirties the tree.** Re-running it rewrites committed gallery
  assets to different bytes (`ezytrack-scroll.webp` 192,436 → 279,384), which means the committed
  gallery assets were not produced by the current script against the current libvips. Task 5.1
  reverted the churn rather than fixing it. **Phase 6 owns this** — it rewrites the gallery anyway,
  so the re-encode and the byte change land there rather than as a drive-by now.
  Workaround meanwhile: run `node scripts/portrait.mjs` directly to re-bake the portrait. Verified
  deterministic — a re-run leaves the tree clean.
  **Archived 2026-09-29 — both bullets above closed by Task 7.1** (`695dc79`, "the double-encode
  fixed"; moved from Phase 6 to 7 by the 2026-09-25 decision). `optimise-gallery.mjs` now writes
  the encoded buffer with `writeFile` and says why in a comment.

- **RESOLVED 2026-09-26 by Task 8.1 — `About.astro` is deleted; the portrait lives only in the
  Hero.** Original: **`About.astro`'s portrait mount still carries dead Tailwind-era styling** (`border-2 border-ink`,
  an inline box-shadow). Inert since Phase 0, but the new portrait is engineered to dissolve into
  `--ground` with no edges, so a border around it is the wrong mount. Whichever phase rebuilds
  that section drops it.

### Opened by Phase 5 — 2026-09-24

- **RESOLVED 2026-09-24 — the grain now paints above content (see Decisions). Original finding:**
  **the page grain punches a hole around every opaque element.**
  `body::after` carries the grain at `z-index: -2`, behind all content, so any opaque in-flow
  element covers it and reads as a rectangle against a grained ground. Measured on the real page:
  ground **15,14,13** with grain against the portrait's corners at **10,9,7**. This is not a
  portrait problem — Task 5.1's "dissolves to exactly `--ground`, no visible boundary" is true of
  the *asset* and false of the *page*, and it generalises to every full-bleed image the site adds
  (§9.03's case-study shots, §9.04's ring cards). Task 5.2 fixed its own instance with a
  `radial-gradient(farthest-side …)` mask — `farthest-side` puts the radii on the mid-edges so the
  corners, where a rectangle reads loudest, fall outside the mask — and verified at 9× contrast
  boost that the grain runs continuously across the area. **`mix-blend-mode: screen` was tried
  first and measured worse** (22,21,18): the asset dissolves to `--ground`, not to black, so screen
  adds a ground to a ground. The general alternatives are to raise the grain above content (costs a
  compositing layer over the whole document) or to accept masks per image. **Phase 6 needs a
  standing answer before it places its first case-study image.**

- **DECIDED 2026-09-24, Phase 6 implements (see Decisions) — text now crosses the signal, and the
  overlap is under-contrasted.**
  Phase 4's deferred minor (4) is no longer latent. Section 02 is the first section whose centre
  column is not empty, and the curve runs through it — visibly across "since 2016" in the lede and
  straight through the "90%+" statistic. `--type` on `--signal` is about **2.9:1**, below AA, so
  wherever a 4px stroke crosses a glyph that glyph is under-contrasted. It currently threads the
  gaps by luck rather than by design. This is the same question as `--signal-gutter` being half the
  curve's real extent, and Phase 6 already owns that — settle both together: derive the gutter from
  the curve's measured minimum `x`, and decide whether the line dims behind content (§7.3 already
  does this at phone width) or content routes around it.
  **Archived 2026-09-29 — implemented by Task 6.1 Steps 3–4:** the gutter derived from the curve,
  and the dim rule (the line is full strength only inside its gutter).

- **RESOLVED 2026-09-26 by Task 9.4 — `npm run budget` measures every script, not just
  `_astro/*.js`.** Original: **The JS budget has been measured with two blind spots all along.**
  The hero island is inlined into `index.html` rather than emitted as a chunk, so a chunk-only
  sum misses it; and `Gallery.astro`'s `is:inline` script (~1.1 KB raw) was never counted in any
  phase figure (it left with `Gallery.astro` in Task 7.2, so the page now has no `is:inline`
  script at all). Deltas between phases are still sound because the omission is consistent, but
  the **absolute** number understates what ships. Phase 9 must measure every script the page
  actually loads — external chunks, module-inlined scripts and `is:inline` blocks — not just
  `_astro/*.js`. Now: `scripts/budget.mjs` (`npm run budget`) parses `pageScripts()` off the
  built HTML itself — every `<script type="module" src>`, `<link rel="modulepreload">`, and every
  inline executable `<script>` body, whatever page structure produced them — then walks each
  external file's static import closure and gzips everything, inline bodies included. No blind
  spot is possible by construction: it does not know "chunk" from "inline", only "script the page
  runs". Reconciled exactly against the existing 61,540-byte figure (Task 9.2/9.3's manual
  `zlib.gzipSync` sum) before any Task 9.4 code change — no gap to explain, confirming the manual
  sums were already counting the hero island's inline script correctly by hand; the blind spot
  was in *not having a script that does this automatically*, which is now fixed.

- **`mountHeroClock()` is not idempotent.** Each call adds a `visibilitychange` listener and starts
  a `setTimeout` chain nothing cancels. Nothing re-mounts it today, but `scroll.ts` is deliberately
  written to survive an Astro view transition re-mounting it, so the codebase anticipates them. If
  view transitions land (Phase 15 is the likely place), that is a leaked timer and listener per
  navigation. Minor; fold into the final whole-branch review. **Closed by Task 9.2:** a
  module-level `stopClock` calls `stopClock?.()` at the top of `mountHeroClock()`, clearing the
  pending timeout and removing the named `visibilitychange` listener before scheduling a new
  chain. Verified live on the dev server (import through `/src/islands/hero.ts`, spying on
  `setTimeout`/`clearTimeout`/`addEventListener`/`removeEventListener` against an isolated DOM,
  the Astro dev 404 page, so nothing else on a real page confounds the count): three back-to-back
  `mountHeroClock()` calls produce 3 `setTimeout` calls and 2 `clearTimeout` calls (each of the
  2nd and 3rd mounts cancelling the previous), and 3 listener adds against 2 removes — net exactly
  one live timer chain and one live listener. A further 3.2s real-time wait adds exactly 3 more
  `setTimeout` calls (one re-arm per second, one chain) and zero more `clearTimeout` calls,
  confirming only the single surviving chain keeps ticking.

- **RESOLVED 2026-09-25: kept, see Decisions. Original finding:** **Archivo's middot is a square, and nothing chose that.** The H1's `·` separator renders as a
  filled square block at display size. Verified it is genuinely Archivo's U+00B7 — the glyph is in
  the font (`document.fonts.check` true, 35.95px advance at 86px) and differs from both serif's and
  system-ui's round dots, while Archivo's own U+2022 bullet is round. So it is not a tofu and not a
  fallback. On the dark palette in `--signal` it happens to read as an emission mark, which is
  on-concept, but it was inherited rather than decided, and the same `·` renders round in the mono
  voice (the status rail, the `01 · of('Noel Sebastian')` caption). Noel's call.

### Deferred by Noel — 2026-09-26 (closed item only; the open items stay live)

- **The two open Phase 8 questions were answered on 2026-09-26** (see Decisions): RxJS goes into
  `architecture()` on the site only, and the `|` moves to the top of the footer, directly under
  the final emission. Both are Phase 9 work.

### Opened by Task 8.2 — 2026-09-26

- **The final emission and the `|` are 392–396px apart on desktop, 526px at 375, and the line
  runs on between them.** The curve ends at the document's last pixel, where the footer's bar is,
  and the emission sits in Contact above the footer, so the whole footer lies between the two.
  They read as one sequence — one mark on the line, then the bar it ends in, both near the centre
  (the emission 17–37px left of the bar, where the curve is still settling) — but §6's
  "terminates in a final emission" is looser than it could be. Tighter would mean the emission in
  the footer, or a shorter footer; Phase 9's polish pass or Noel. **Resolved 2026-09-26 (Noel):**
  the bar moves to the top of the footer, under the emission, and the line ends there. Phase 9.
  **Closed by Task 9.1:** `resolveSeamPixels` takes a measured terminus (the bar's centre line,
  `Footer.astro`'s `[data-signal-terminus]`) in place of the box's bottom edge, and the bar
  itself moved to be the footer's first child, centred on the footer's top hairline via a
  margin calc that adds nothing to the footer's height. Measured at 1024/1440/1920/2560/375:
  the curve's drawn last point lands on the bar's centre within 0.001px at every width, and the
  emission-to-bar gap is a flat **72px** everywhere (well under the 96px target) purely as a
  side effect of the bar's move — Contact.astro's spacing tokens were not touched. Verified live
  with real-time CDP (not `--virtual-time-budget`): a font-swap forced by holding the two woff2
  responses open (Fetch domain) shows the terminus tracking the bar through a 92px document-
  height change at 1440, via the existing ResizeObserver on `#signal-layer` — no
  `document.fonts.ready` hook was needed. A real resize while scrolled to the bottom keeps the
  tip on the bar. JS-off screenshots at 1440 and 375, zoomed 4×, show the footer's 1px hairline
  passing through the dead centre of the 4px bar at both widths. Shipped JS on `/` **61,847
  gzip (+57 against 61,790)** — `measureTerminus()` alone, in `svg-signal.js`; every other
  chunk byte-for-byte unchanged. 75.5% of the 80 KB budget, 20,073 bytes left.

### Opened by Task 8.1 — 2026-09-26

- **RxJS is not on the resume.** The site is built on RxJS operators, but neither the Skills
  table nor the experience lists RxJS (the old `skillGroups` and marquee did). The rule is that
  every Stack item traces to the resume, so it is not in the chain. Noel's call: add it to the
  resume, and the test lets it into the chain. **Resolved 2026-09-26 (Noel, Decisions):** the
  resume and the PDF do not change; RxJS is the one documented exception. **Closed by Task 9.2:**
  `content.ts`'s `architecture()` items gain `'RxJS'` after `'Angular Signals'`.
  `tests/skill-groups.test.ts` names the exception (`SITE_ONLY_ITEMS`) and asserts it against
  the resume transcript on both sides — it inserts RxJS into the expected list at the right
  slot, and a second test fails if RxJS ever appears in the resume itself, so the exception
  retires on its own the day Noel adds it there.

- **RESOLVED 2026-09-26 by Task 9.4 — folded into `tip`.** Original: **The shared `follow` helper
  is its own 282-byte chunk and one more request.** Rollup splits it because its importers (Ring,
  Stack) differ from `tip`'s. Duplicating the wiring instead measured 59,821 gzip, 100 bytes less,
  with no extra request. Fold it into the `tip` chunk with a `manualChunks` rule in the Phase 9
  chunking pass, alongside the missing `modulepreload`. Now: `vite.build.rollupOptions.output.
  manualChunks` in `astro.config.mjs` matches `/src/lib/signal/(?:follow|tip)\.ts$` into one `tip`
  chunk. Measured: 489 bytes gzip merged against 262 + 334 = 596 bytes apart, and the page total
  drops 61,540 → 61,370 (−170, more than the merge alone accounts for — every other entry chunk
  lost a byte or two of Rollup wrapper/boilerplate, the same effect Task 9.2 saw removing
  `/dev/signal` from the module graph), with one fewer request.

### Opened by Task 7.2 — 2026-09-25

- **RESOLVED 2026-09-26 by Task 8.1 — About is gone and the `stack` seam is `#stack`, so the hold
  ends at the Stack's top: 808px at 1440 (754 at 1024, 836 at 1920 and 2560, 699 at 375).**
  Original finding: **the ring's hold runs down through About.** The `ring` span ends at the `stack` seam, which is
  still `#skills`, and `About.astro` sits between the ring and Skills with no anchor of its own. So
  control points 34→39 — the curve holding the centre — stretch from the track through the rest of
  the rail and all of About (about 2,200px at 1440). Dimmed throughout, so contrast holds. Phase 8
  decides where About goes; the ring's bottom seam follows.

### Opened by Phase 6 — 2026-09-25

- **RESOLVED 2026-09-26 by Task 8.2 — `contact` is on `Contact.astro` (`#contact`), so no interim
  anchor is left. Amended by Task 8.1: `stack` is on `Stack.astro` (`#stack`).** Original finding:
  **Two sections are anchored to interim stand-ins** (the ring's moved onto `#ring` in Task 7.2):
  `stack` → `#skills`, `contact` → `#contact`, each marked `data-signal-section` and commented as
  interim. Phase 8 moves the attribute onto the rebuilt sections. A missing anchor falls back to
  linear mapping, so forgetting one fails soft, but it fails *wrong*: the line will drift off its
  section.

- **RESOLVED 2026-09-26 by Task 8.1 — About and Skills are deleted, and the Stack lays out in the
  shared content box; the dim line crosses its rows by design (Decisions, "The Stack keeps the
  weave"). The interim `#contact` block below it still starts at x=0 until Task 8.2.** Original:
  **The dim line still crosses unrebuilt text below section 04**: About and Skills start at
  x=0 because their layout classes are dead Tailwind (Gallery is gone as of Task 7.2). It is
  dimmed to 0.15, so contrast holds, but it lies on the text. Phase 8 owns it.

## Closed 2026-09-30

- **CLOSED 2026-09-30 by the curve cleanup (`0951b88`..`e06feda`, live) — monotone-cubic stretching removed the anchor corners, points 7–18 were respaced, and two counter-bends were fixed; Noel approved in the browser.** Original:
  **The line is not always smooth: some turns are sharp enough to read as corners, not a curve.**
  Named instance: the start of `02 — scan()` and the turn after it. Control points 7–10
  (`x` −0.38 → −0.58 → −0.68 → −0.46) reverse direction over only 0.017 of `y`, and uniform
  Catmull-Rom over unevenly spaced points tightens exactly such reversals into cusps.
  **Unverified second suspect:** `anchors.ts` scales `y` linearly and separately between each
  pair of anchors, so the curve's slope in pixels jumps at every seam and in-section anchor. That
  would turn a smooth normalised curve into visible corners wherever two neighbouring spans get
  different scale factors. Measure the pixel tangent on both sides of each anchor before changing
  any geometry.
- **CLOSED 2026-09-30 by `0d93800` — points 21–26 share `x −0.74` with zero `x` tangent at both ends.** Original:
  **The work spine (`Problems, solved`) should be straight.** Control points 22–26 carry
  deliberate "outward breaths" (`x` −0.72, −0.76, −0.74, −0.77, −0.75), and to Noel they read as
  an uneven, dirty line rather than as attachment points. Straightening them is a `path.ts` edit.
  Re-run the continuity and chord tests, and re-check the branch origins in `work.ts`, which
  read the curve's `x`.

## Closed 2026-10-03

- **CLOSED 2026-10-03 — the scheduled run fired 2026-10-01 05:22 UTC (Actions run 36819490932, success; GitHub ran it ~5h late) and the live copy reads "a decade".** Original:
- **Confirm the first scheduled rebuild.** `VERCEL_DEPLOY_HOOK` is set (closed gap archived);
  after the 1 Oct 00:00 UTC run, check it succeeded in Actions and the live copy says "a decade".
