# Build plan archive — finished phases

Moved verbatim out of `BUILD-PLAN.md`. Append-only: add a finished phase at the bottom, never
edit or delete what is here. `BUILD-PLAN.md` holds current state; this holds how it got there.

---

## Archive pass 2026-09-29 — Phases 0–9

### Phase Status notes as they stood before the pass (rows 7–9 were shortened)

| # | Phase | State | Notes |
|---|---|---|---|
| 7 | Section 04 — The Ring (2D rail) | **complete** | Tasks 7.1–7.2, reviewed clean, no fix round. Split drawn as a track the curve is pinned to; Gallery retired |
| 8 | Sections 05–06 — Stack, Contact | **complete** | Tasks 8.1–8.2. About + Marquee retired, the Stack's nodes sit on the weave; Contact's form works with JS off, and the line ends in a final emission over the footer's bar |
| 9 | SHIPPABLE — 2D site complete | **complete — live 2026-09-29** | Merged to `master` (`c2b0e46`, ff), live on www.noel-sebastian.com; old site tagged `v1-letterpress` (`6a4bac7`). Task 9.8 subset the fonts (130,508 → 95,660 B preloaded). Preview Lighthouse ×3: Perf 94/99/99, A11y 100, **LCP median 1,988ms** (was 2,500). Production ×1: Perf 97, A11y/BP/SEO 100, LCP 2,165. Base-path JS 61,490 gzip (75.1%). Post-launch for Noel: September CV PDF, VoiceOver pass. |

### Superseded header note

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> or `superpowers:executing-plans` to implement a phase task-by-task. Steps use checkbox
> (`- [ ]`) syntax. **Phases 3–15 carry phase-level detail only** — expand the phase you are

### Measured baseline — 2026-09-19, before Phase 0

The site as it stands today, so Phase 0 can be measured rather than guessed at:

| | Value |
|---|---|
| Build | green, 2 pages, 717ms |
| `dist/` | 5.2 MB |
| Shipped JS | **73,854 bytes gzip (72 KB)** |
| — of which React | `client…js` 44,041 + `types…js` 22,965 = **67 KB, 93% of the total** |

### Measured after Phases 0–2 — 2026-09-20

| | Value |
|---|---|
| Build | green, 3 pages (the third is the `/dev/signal` harness) |
| Shipped JS — the two public pages (`/`, `/websites`) | **0 bytes. Neither references an `_astro/*.js` chunk at all.** |
| Shipped JS — total emitted | 4,139 raw / **2,039 gzip**, one chunk, referenced only by `/dev/signal` |
| Tests | 11 passing across 2 files |
| Fonts on the critical path | 130,508 bytes (Archivo 90,104 + JetBrains Mono 40,404) |

### Measured after Phase 3 — 2026-09-22

| | Value |
|---|---|
| Build | green, 3 pages |
| Shipped JS | **unchanged — 4,139 raw / 2,039 gzip, still only `/dev/signal`** |
| Tests | 18 passing across 3 files |

### Measured after Phase 4 — 2026-09-23

The first real movement against the budget since Phase 0 emptied it.

| | Value |
|---|---|
| Build | green, 3 pages, 490ms |
| `dist/` | 5.2 MB |
| **Shipped JS on `/`** | **52,332 bytes gzip** — `BaseLayout` chunk 50,719 + `svg-signal` 1,613 |
| Against the 80 KB budget | **63.9% spent, 29,588 bytes gzip left** for Phases 5–9 |
| Delta from Phase 3 | **+50,293** (2,039 → 52,332) |
| Tests | 18 passing across 3 files — none added; motion stays hand-verified |
| Lighthouse desktop `/` | Perf **100** · A11y 96 · BP **100** · SEO **100** · LCP 0.6s · CLS **0** · TBT **0ms** |
| Lighthouse mobile `/` | Perf 94 · A11y 96 · BP **100** · SEO **100** · LCP 3.0s · CLS **0** · TBT **0ms** |

The motion bill landed almost exactly where Phase 3 predicted — ~54.6 KB forecast, 50.3 KB actual.
Both Lighthouse deductions trace to components Phase 4 was told not to touch: accessibility 96 is
a single `aria-hidden-focus` audit whose five offending nodes are all `div.gallery-card` in
`Gallery.astro`, and mobile Perf 94 / LCP 3.0s has the **old** hero's `<h1 class="font-bricolage">`
as its LCP element. CLS and TBT are the two budget lines Phase 4 could actually move; both are
clean. Phase 9 re-measures on the finished site.

Phase 3 added GSAP, ScrollTrigger and Lenis to `src/lib/motion/` but **nothing imports them yet**,
so they are not in any bundle and the delta is genuinely 0. The ~54.6 KB gzip motion bill lands in
**Phase 4**, the moment the shell calls `initScroll()`. Re-measure there and expect the first real
movement against the 80 KB budget since Phase 0 emptied it.

Removing React did not reduce the bundle, it eliminated it: no `client:*` islands remain, so
neither public page loads a script. The one chunk Vite does emit belongs to the `/dev/signal`
harness, whose `<script>` imports a module and is therefore bundled rather than inlined; it goes
when the harness goes. The full 80 KB base-path budget is unspent
going into Phase 3, which will claim ~54.6 KB of it (gsap 28,356 + ScrollTrigger 17,988 + lenis
8,254), leaving ~25 KB for the signal renderer and every section island in Phases 4–9.

The base-path budget is 80 KB gzip. Removing React in Phase 0 therefore frees almost the
entire budget, and the whole GSAP + Lenis + signal-renderer layer has to fit in roughly
what React costs today. Re-measure with the same command after Task 0.1 and record the
delta in `docs/SESSIONS.md`.

**Phase 9 is the milestone that matters.** Everything through it produces a complete,
fast, accessible site that can go live. Phases 10–15 are enhancement on a working product.
If time runs out, stopping at 9 leaves something genuinely good rather than half-built.

---

### Measured after Phase 5 — 2026-09-24

The first two islands, and the first sections built on the dark system.

| | Value |
|---|---|
| Build | green, 3 pages |
| **Shipped JS on `/`** | **53,241 bytes gzip** — `timeline` chunk 50,657 + `svg-signal` 1,613 + two entry chunks 737 + the hero island, inlined into the HTML |
| Against the 80 KB budget | **65.0% spent, 28,679 bytes gzip left** for Phases 6–9 |
| Delta from Phase 4 | **+909** (52,332 → 53,241) — the hero +244, section 02 the rest |
| Tests | 18 passing across 3 files — none added |

Two islands cost under a kilobyte because Vite hoisted gsap and Lenis into a shared
`timeline.*.js` chunk the moment a second entry imported the motion layer. The library
bill was already paid by Phase 4; sections now draw against it rather than adding to it,
which is the shape the budget was forecast on.

**Measurement methodology, so Phase 9 reproduces these.** `gzip -c <path>` — by name, so the
filename header is included. Reading the same bytes from stdin measures ~60 bytes smaller and
`zlib.gzipSync` ~130 larger. Chunk-summing alone also understates: the hero island is small
enough that Astro inlines it into `index.html` rather than emitting a chunk, so it appears in
no `_astro/*.js` listing while still shipping.

### Measured after Phase 6 — 2026-09-25

| | Value |
|---|---|
| Build | green, 3 pages |
| **Shipped JS on `/`** | **57,756 bytes gzip**: `timeline` 50,662 + `svg-signal` 3,627 + `SelectedWork` island 2,187 + `NineYears` 506 + `BaseLayout` 243 + `tip` 242 + the hero island inlined into the HTML (289) |
| Against the 80 KB budget | **70.5% spent, 24,164 bytes gzip left** for Phases 7–9 |
| Delta from Phase 5 | **+4,515** (53,241 → 57,756). Section anchors, dim rule and playhead in `svg-signal` +2,014; the section 03 island +2,187; the shared `tip` channel +242 |
| HTML | the four inline diagram SVGs add 8,559 bytes gzip to `index.html`, 6,502 of it the scatter |
| Tests | 103 passing across 8 files (was 18 across 3) |

`svg-signal` more than doubled because it now owns three things that used to be implicit: where each section is, where the line may be lit, and where its tip is. All three are pure modules the renderer calls (`anchors.ts`, `gutter.ts`, `playhead.ts`), so the growth is the renderer's glue code rather than duplicated geometry.

### Measured after Phase 9 — 2026-09-26

Task 9.5, the ship audit. Every figure is a median of 3 runs, `npm run build && npx astro
preview` (never the dev server), `npx lighthouse` default mobile emulation and simulated
throttling — the same methodology Task 9.4 used, so the numbers are comparable.

| Global Constraints budget | Target | Measured — `/` | Measured — `/websites` | Status |
|---|---|---|---|---|
| Lighthouse mobile Performance | ≥ 95 | 97 | 98 | **PASS** both |
| Accessibility | 100 | 100 | 96 | **PASS** `/`, **FAIL** `/websites` (finding — `target-size`, dead-Tailwind nav/FAQ, Phase 14) |
| LCP (simulated 4G mobile) | ≤ 2.0s | 2,404.3ms | 2,477.4ms | **FAIL** both — see LCP diagnosis below |
| CLS | < 0.02 | 0 | 0 | **PASS** both |
| TBT (lab proxy for INP < 200ms) | report | 0 | 0 | **PASS** both (field INP still needs real users) |
| Base-path JS gzip (`npm run budget`) | ≤ 81,920 (80 KB) | 61,364 (74.9%) | 55,606 (67.9%) | **PASS** both |
| Enhanced WebGL chunk gzip, post-interactive | ≤ 250KB | not built — Phase 10 | not built — Phase 10 | N/A |
| Render-blocking requests above the fold | 0 | 0 | 0 | **PASS** both |
| Keyboard: reachable, ordered, no trap, visible focus | pass | 35 stops, 1440 and 375, no traps, 2px `--signal`/`--type` ring at every stop | not audited (Phase 9 scope is `/`; `/websites` inherits the same global focus CSS) | **PASS** `/` |
| JS off: every word present, page ends `●` then `\|` | pass | Confirmed both widths; only diff is the hero clock's live digits vs. the served "local time" placeholder, by design (`Hero.astro`) | not audited | **PASS** `/` |
| `prefers-reduced-motion`: instant states, nothing on a timer | pass | 0 of ~350 sampled transform/opacity/dashoffset properties changed across 6 fixed scroll positions × 6 real-time samples; line fully drawn (`stroke-dasharray: none`) at every position; hero clock still ticks (allowed) | not audited | **PASS** `/` |

**LCP diagnosis.** The LCP element on `/` is `header#hero > … > p.hero__lede` — body text,
set in Archivo (the preloaded face), not an image and not a late font swap. Review Focus 5
is met: nothing to fix there. Lighthouse's own diagnostics (`font-display-insight`,
`render-blocking-insight`, `document-latency-insight`, `network-dependency-tree-insight`,
`modern-http-insight`, `cache-insight`, `legacy/duplicated-javascript-insight`,
`image-delivery-insight`) all report **zero recoverable savings** on the current build —
there is nothing left that Lighthouse itself identifies as fixable.

`lcp-breakdown-insight` (median of 3, same simulated-throttling runs as the score above):
time-to-first-byte 3.2ms, element-render-delay 47.8ms, resource-load-delay/duration both 0
(a text node has no resource to load). These do not sum to the reported 2,404ms — a
documented Lighthouse characteristic, not a measurement error: under `throttlingMethod:
simulate` (the default, used for every run above and in Task 9.4), the "Insights" audits
are computed from the trace as captured — unthrottled, since simulate never actually slows
the browser — while only the headline metric (LCP's `numericValue`) is Lantern's simulated
estimate for a throttled mobile connection. The two numbers come from different models and
are not additive.

To get a breakdown computed on the *same* timeline as its own headline number, three more
runs used `--throttling-method=devtools` (real CPU/network throttling applied during
capture): median LCP **797.9ms** — comfortably under budget — with TTFB 3.4ms and
element-render-delay 794.5ms, still nothing but the render delay itself. Two candidate
fixes were tried and measured, neither committed because neither moved the number:

- **`fetchpriority="low"` on the six per-section entry `<script type="module">` tags**, to
  stop them competing with the fonts at the browser's default "High" priority for that tag.
  Blocked immediately: any attribute beyond a bare `<script>` makes Astro stop bundling it
  — the tag loses `type="module"` entirely and ships a raw `import` statement, a build that
  looks fine and throws `SyntaxError` in the browser. Reverted before it was ever built into
  a commit.
- **Low-priority `modulepreload` hints for those same six entries** (extending Task 9.4's
  integration, which deliberately preloads only shared chunks, not entries) — a
  build-time-only change, no `<script>` tag touched. Three-run median: FCP 785.4ms (down
  from 1,054.6ms, but noisy — one run read 1,211ms), **LCP 2,404.7ms, unchanged**. Not kept;
  it moves a metric outside the gate without moving the gated one.
- **Reordering `<head>`** (fonts before the OG/Twitter block) — three-run median FCP and LCP
  both unchanged to the millisecond. Not kept.

**Proposal, not applied — needs a ruling.** The gap between the graded 2,404ms (`simulate`)
and the diagnostic 798ms (`devtools`, same build, same host) is wide enough that the
`simulate` figure may be dominated by Lantern's local-preview model (this repo's `astro
preview` serves plain HTTP/1.1, not the HTTP/2 the production Vercel deploy will use) rather
than by anything wrong with the page. Recommend Task 9.6 re-run Lighthouse against the real
Vercel preview before treating 2.0s as unmet — that is already on 9.6's checklist
("Lighthouse against the real network"), so this is a note to weight that number over the
local one if they disagree, not a new task.

# PHASE 0 — Foundation & Teardown

**Deliverable:** a building Astro site on the new palette and typography, with React,
Tailwind and the retired brand docs removed. Nothing visual is finished; everything
compiles.

**Files:**
- Modify: `package.json`, `astro.config.mjs`
- Create: `src/styles/tokens.css`, `vitest.config.ts`, `public/fonts/`
- Delete: `PRODUCT.md`, `DESIGN.md`, `tailwind.config.mjs`,
  `src/components/react/ContactForm.tsx`, `src/components/react/ClientQuoteForm.tsx`

**Interfaces produced:** the CSS custom properties in `tokens.css`, consumed by every
later phase.

### Task 0.1 — Dependency swap

- [ ] **Step 1: Remove the framework dependencies**

```bash
npm uninstall react react-dom @astrojs/react @types/react @types/react-dom \
  react-hook-form @hookform/resolvers zod @astrojs/tailwind tailwindcss
```

- [ ] **Step 2: Add the new ones**

```bash
npm install three gsap lenis
npm install -D vitest @types/three
```

- [ ] **Step 3: Strip the integrations from `astro.config.mjs`**

Leave only `sitemap()`. The file becomes:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.noel-sebastian.com',
  output: 'static',
  integrations: [sitemap()],
});
```

- [ ] **Step 4: Delete the React components and the retired brand docs**

```bash
rm -rf src/components/react tailwind.config.mjs PRODUCT.md DESIGN.md
```

`PRODUCT.md` and `DESIGN.md` describe the retired "Technical Letterpress" direction and
actively contradict the spec. They go — the spec supersedes them and git retains them.

- [ ] **Step 5: Verify the tree still builds**

Run: `npm run build`
Expected: FAILS — `index.astro` still imports `ContactForm` and every component still uses
Tailwind classes. This failure is expected and is fixed across Phases 4–8. Record the error
list in the session log; it is the Phase 4–8 worklist.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: remove React, Tailwind and retired brand docs"
```

### Task 0.2 — Self-hosted fonts

- [ ] **Step 1: Fetch the variable WOFF2 files**

Download Archivo (variable, with the `wdth` axis) and JetBrains Mono from Google Fonts'
repository, subset to Latin, into `public/fonts/`. Target filenames:
`archivo-var.woff2`, `jetbrains-mono-var.woff2`.

- [ ] **Step 2: Declare the faces in `tokens.css`** — see Task 0.3, which includes them.

- [ ] **Step 3: Verify no external font request remains**

```bash
grep -rn "fonts.googleapis\|fonts.gstatic" src/ && echo "FAIL: CDN reference remains" || echo "OK"
```
Expected: `OK` once `BaseLayout.astro` is rewritten in Phase 4. Until then this will fail —
note it and carry it to Phase 4.

### Task 0.3 — Design tokens

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
@font-face {
  font-family: 'Archivo';
  src: url('/fonts/archivo-var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-stretch: 62.5% 125%;
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono-var.woff2') format('woff2-variations');
  font-weight: 100 800;
  font-display: swap;
}

:root {
  /* Colour — spec §7.1. Do not substitute a cool grey for --ground. */
  --ground:      #0A0908;
  --ground-lift: #131110;
  --type:        #F2EFE7;
  --type-dim:    #8A857C;
  --signal:      #FF4B54;
  --shipped:     #FFC01E;

  /* Type */
  --font-display: 'Archivo', system-ui, sans-serif;
  --font-body:    'Archivo', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;

  /* Spacing ramp — spec §7.3 */
  --s-1: 4px;   --s-2: 8px;   --s-3: 12px;  --s-4: 16px;
  --s-5: 24px;  --s-6: 32px;  --s-7: 48px;  --s-8: 64px;
  --s-9: 96px;  --s-10: 128px; --s-11: 192px;

  --section-y: clamp(96px, 12vw, 200px);
  --container: 1440px;

  /* The signal's reserved left column — spec §7.3 */
  --signal-gutter: clamp(48px, 6vw, 96px);
}

@media (max-width: 768px) {
  /* No room for a reserved column; the line goes behind content instead. */
  :root { --signal-gutter: 0px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add design tokens and self-hosted variable fonts"
```

---

# PHASE 1 — Content Model Rewrite

**Deliverable:** `src/data/content.ts` rebuilt from `Resume.pdf`, with elapsed years derived
rather than hard-coded, and a passing test proving the derivation.

**Files:**
- Create: `src/lib/career.ts`, `tests/career.test.ts`
- Rewrite: `src/data/content.ts`
- Reconcile: `Resume.pdf` vs `public/noel-sebastian.pdf`

**Interfaces produced:**
```ts
// src/lib/career.ts
export const CAREER_START: Date;                    // 2016-10-01
export function yearsElapsed(now?: Date): number;   // whole years, floor
```

### Task 1.1 — Derived career length (TDD)

The spec (§9.02) requires the year count be derived from a start date, because "9+ years"
is already wrong — October 2026 is ten years.

- [ ] **Step 1: Write the failing test** — `tests/career.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { yearsElapsed, CAREER_START } from '../src/lib/career';

describe('yearsElapsed', () => {
  it('starts from October 2016', () => {
    expect(CAREER_START.getUTCFullYear()).toBe(2016);
    expect(CAREER_START.getUTCMonth()).toBe(9); // 0-indexed October
  });

  it('is 9 the day before the tenth anniversary', () => {
    expect(yearsElapsed(new Date('2026-09-30T00:00:00Z'))).toBe(9);
  });

  it('ticks to 10 on the tenth anniversary', () => {
    expect(yearsElapsed(new Date('2026-10-01T00:00:00Z'))).toBe(10);
  });

  it('does not tick early in the anniversary month', () => {
    expect(yearsElapsed(new Date('2027-09-30T00:00:00Z'))).toBe(10);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/career.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/career'`

- [ ] **Step 3: Implement** — `src/lib/career.ts`

```ts
/** Noel's first professional role: Analyst, Ernst & Young, Kakkanad — 10/2016. */
export const CAREER_START = new Date(Date.UTC(2016, 9, 1));

/** Whole years elapsed since CAREER_START. Never hard-code this number. */
export function yearsElapsed(now: Date = new Date()): number {
  let years = now.getUTCFullYear() - CAREER_START.getUTCFullYear();
  const beforeAnniversary =
    now.getUTCMonth() < CAREER_START.getUTCMonth() ||
    (now.getUTCMonth() === CAREER_START.getUTCMonth() &&
     now.getUTCDate() < CAREER_START.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return years;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/career.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/career.ts tests/career.test.ts vitest.config.ts
git commit -m "feat: derive career length from a start date constant"
```

### Task 1.2 — Rewrite `content.ts`

- [ ] **Step 1: Write the timeline export**

Exact data, from `Resume.pdf`. Do not paraphrase the roles or invent dates.

```ts
export type EmissionState = 'live' | 'shipped' | 'historical';

export interface TimelineEntry {
  from: string;          // 'YYYY-MM'
  to: string | null;     // null = present
  role: string;
  company: string;
  city: string;
  country: string;
  state: EmissionState;
}

export const timeline: TimelineEntry[] = [
  { from: '2016-10', to: '2020-05', role: 'Analyst',                   company: 'Ernst & Young',           city: 'Kakkanad', country: 'India',     state: 'historical' },
  { from: '2020-05', to: '2022-02', role: 'Senior Engineer',           company: 'QBurst',                  city: 'Kakkanad', country: 'India',     state: 'historical' },
  { from: '2022-02', to: '2023-12', role: 'Senior Angular Developer',  company: 'SRT Marine Systems PLC',  city: 'Cardiff',  country: 'UK',        state: 'historical' },
  { from: '2023-12', to: '2025-06', role: 'Senior Engineer',           company: 'Direct Line Group',       city: 'Leeds',    country: 'UK',        state: 'historical' },
  { from: '2025-09', to: null,      role: 'Frontend Developer',        company: 'Winning Group',           city: 'Sydney',   country: 'Australia', state: 'live' },
];
```

- [ ] **Step 2: Add the status rail data**

Work rights go in the hero (spec §9.01) because recruiters screen on them early.

```ts
export const status = {
  city: 'Sydney',
  timezone: 'Australia/Sydney',
  workRights: 'Australian Permanent Resident',
  availability: 'Open to senior frontend roles',
} as const;
```

- [ ] **Step 3: Rewrite the case studies with the full resume metrics**

Four studies only — EY stays on the timeline, not here (spec §9.02). Each must carry every
metric the resume claims, including the ones currently missing from the site: $15k/year
technical debt eliminated, the 10,000+ daily transaction order management system, 20%
runtime memory improvement, mentoring 6 developers for +20% sprint velocity, 25% YoY
production bug reduction, and 15% shorter code review cycles.

- [ ] **Step 4: Add the AI tooling group to the stack data**

MCP servers, Figma Code Connect, AI-assisted review. Spec §9.05 gives this its own node.

- [ ] **Step 5: Delete `freelanceCaseStudy`, `services`, `processSteps`, `testimonials`,
      and the `levelColor` / proficiency labels**

All retired by spec §3 and §9.05. TopDel survives only as a ring card.

- [ ] **Step 6: Reconcile the CV**

`Resume.pdf` (root, untracked) and `public/noel-sebastian.pdf` (served) differ. Move the
current resume into `public/`, delete the root copy, and confirm the nav download points at
the surviving file. Only one CV should exist.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: rebuild content model from resume, add EY and AI tooling"
```

---

# PHASE 2 — Signal Path Core (2D)

**Deliverable:** the canonical curve, a pure tested sampling API, and an SVG renderer that
draws it against a progress value. This is the load-bearing module of the whole build —
spec §6.

**Files:**
- Create: `src/lib/signal/path.ts`, `src/lib/signal/svg-signal.ts`, `tests/signal-path.test.ts`

**Interfaces produced — later phases depend on these exact names:**

```ts
// src/lib/signal/path.ts
export type SectionId = 'hero' | 'years' | 'work' | 'ring' | 'stack' | 'contact';

export interface SignalPoint { x: number; y: number; z: number; }

export interface SectionSpan { id: SectionId; tStart: number; tEnd: number; }

export const SECTION_SPANS: readonly SectionSpan[];

/** Position along the curve at normalised progress t (0..1). Clamps out of range. */
export function sampleSignal(t: number): SignalPoint;

/** `steps` evenly spaced points between t0 and t1 inclusive. */
export function sampleSignalRange(t0: number, t1: number, steps: number): SignalPoint[];

/** Local 0..1 progress within a section, given global progress. Clamps. */
export function sectionProgress(id: SectionId, globalT: number): number;

/** An SVG `d` attribute for the given points, scaled to a viewBox. */
export function toSvgPath(points: SignalPoint[], width: number, height: number): string;
```

```ts
// src/lib/signal/svg-signal.ts
export interface SvgSignal { setProgress(t: number): void; destroy(): void; }
export function createSvgSignal(mount: HTMLElement, section: SectionId): SvgSignal;
```

### Task 2.1 — Curve sampling (TDD)

- [ ] **Step 1: Write the failing test** — `tests/signal-path.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { sampleSignal, sampleSignalRange, sectionProgress, SECTION_SPANS } from '../src/lib/signal/path';

describe('sampleSignal', () => {
  it('clamps below 0 and above 1', () => {
    expect(sampleSignal(-1)).toEqual(sampleSignal(0));
    expect(sampleSignal(2)).toEqual(sampleSignal(1));
  });

  it('advances monotonically down the page', () => {
    expect(sampleSignal(0.9).y).toBeGreaterThan(sampleSignal(0.1).y);
  });

  it('is continuous — no jumps between adjacent samples', () => {
    for (let t = 0; t < 1; t += 0.01) {
      const a = sampleSignal(t), b = sampleSignal(t + 0.01);
      expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.2);
    }
  });
});

describe('sampleSignalRange', () => {
  it('returns exactly `steps` points, inclusive of both ends', () => {
    const pts = sampleSignalRange(0, 1, 10);
    expect(pts).toHaveLength(10);
    expect(pts[0]).toEqual(sampleSignal(0));
    expect(pts[9]).toEqual(sampleSignal(1));
  });
});

describe('SECTION_SPANS', () => {
  it('covers 0..1 with no gaps or overlaps', () => {
    expect(SECTION_SPANS[0].tStart).toBe(0);
    expect(SECTION_SPANS[SECTION_SPANS.length - 1].tEnd).toBe(1);
    for (let i = 1; i < SECTION_SPANS.length; i++) {
      expect(SECTION_SPANS[i].tStart).toBe(SECTION_SPANS[i - 1].tEnd);
    }
  });
});

describe('sectionProgress', () => {
  it('is 0 at a section start and 1 at its end', () => {
    const span = SECTION_SPANS.find(s => s.id === 'ring')!;
    expect(sectionProgress('ring', span.tStart)).toBeCloseTo(0);
    expect(sectionProgress('ring', span.tEnd)).toBeCloseTo(1);
  });

  it('clamps outside its span', () => {
    expect(sectionProgress('ring', 0)).toBe(0);
    expect(sectionProgress('hero', 1)).toBe(1);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/signal-path.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `path.ts`**

Use a Catmull-Rom spline through hand-placed control points. Catmull-Rom because it passes
*through* its control points, so the curve can be tuned by moving a point to a place it
will actually go. Keep coordinates normalised: `x` and `z` in −1..1, `y` in 0..1 down the
page. Renderers scale; the curve never knows about pixels.

- [ ] **Step 4: Run and watch it pass**

Run: `npx vitest run tests/signal-path.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/signal/path.ts tests/signal-path.test.ts
git commit -m "feat: add canonical signal curve with tested sampling API"
```

### Task 2.2 — SVG renderer

- [ ] **Step 1: Implement `svg-signal.ts`**

Build an `<svg>` with a single `<path>`, set `stroke-dasharray` to the measured
`getTotalLength()`, and drive `stroke-dashoffset` from `setProgress`. Re-measure on resize,
debounced. Honour `prefers-reduced-motion` by jumping straight to full draw.

- [ ] **Step 2: Verify by hand**

Mount it on a scratch page, scroll, and confirm the line draws smoothly with no jump at
section boundaries. There is no meaningful unit test for this; visual confirmation is the
gate.

- [ ] **Step 3: Commit**

```bash
git add src/lib/signal/svg-signal.ts
git commit -m "feat: add 2D SVG signal renderer"
```

---

# PHASES 3–15 — Phase-Level Detail

Expand the phase you are about to start into task-level steps before implementing it.

## PHASE 3 — Motion Infrastructure

**Deliverable:** Lenis smooth scroll and a single GSAP master timeline that sections
register into. No section uses its own ScrollTrigger.

**Files:** `src/lib/motion/scroll.ts`, `src/lib/motion/timeline.ts`

**Interfaces produced:**
```ts
export function initScroll(): void;
export function globalProgress(): number;                       // 0..1 page progress
export function onSection(id: SectionId, el: HTMLElement,
                          fn: (local: number) => void): () => void;  // returns unsubscribe
export function reducedMotion(): boolean;
```

**Verification:** scrolling the full page logs monotonic 0→1 progress; `reducedMotion()`
returns true under an emulated `prefers-reduced-motion` and all registered callbacks fire
once at their end state instead of animating.

## PHASE 4 — Shell: Layout, Nav, Footer

**Deliverable:** `BaseLayout.astro` rewritten dark, self-hosted fonts preloaded, existing
SEO and JSON-LD schema preserved. Nav with **CV download always visible** and a sound
toggle (inert until Phase 13). Footer carrying the `|` completion bar.

**Files:** `src/layouts/BaseLayout.astro`, `src/components/Nav.astro`,
`src/components/Footer.astro`, `src/styles/global.css`, `public/favicon.svg`

**Also in this phase** (spec §10, otherwise unassigned): the **signal mark** — a
hand-authored SVG of the curve reduced to a single glyph — which becomes the favicon and
the nav wordmark. And the **procedural page grain**: a tiled SVG `feTurbulence` or a small
canvas-generated noise texture applied as a low-opacity overlay on `--ground`. Warm black
reads flat and digital without it; grain is what makes it look like a surface rather than
an absence of light.

**Carry forward from Phase 0:** the `fonts.googleapis` grep must now return clean.

**Verification:** `npm run build` passes. Lighthouse on the shell alone ≥ 98. Focus ring
visible on `--ground` at every interactive element. Tab order is linear.

**Task-level expansion (added 2026-09-20).** The plan requires each phase be expanded before
implementing it. Briefs for these are already written in `.superpowers/sdd/BUILD-PLAN/`, including
batched forms (`task-P4-brief.md`, `task-P5-brief.md`) that carry standing constraints.

### Task 4.1 — `global.css` reset + page grain

- [ ] **Step 1: Rewrite `src/styles/global.css`.** It currently opens with three `@tailwind`
  directives removed in Task 0.1 and still styles the retired cream direction. Replace with:
  `@import './tokens.css';` first, then a minimal reset, `body { background: var(--ground);
  color: var(--type); font-family: var(--font-body); }`, and the `.skip-link` rule (keep it —
  it is a real accessibility affordance already present).
- [ ] **Step 2: Retire the dead font families.** `Manrope`, `Bricolage Grotesque` and
  `Space Mono` are referenced throughout. Every one becomes `var(--font-body)`,
  `var(--font-display)` or `var(--font-mono)`. After this step no typeface is named as a
  literal string anywhere in `src/`.
- [ ] **Step 3: The procedural page grain** (spec §10, unassigned until now). A tiled SVG
  `feTurbulence` as a data-URI background, or a small canvas-generated noise texture, applied
  as a low-opacity overlay on `--ground`. Warm black reads flat and digital without it.
  Must be CSS-only and cost zero JS — a `body::after` with `pointer-events: none`.
  Keep it under 2 KB. Respect `prefers-reduced-motion` only if it animates; a static grain
  needs no guard.
- [ ] **Step 4:** `npm run build` green; screenshot the built page headless and confirm the
  ground is warm black, not blue-black, and that text is legible on it.

### Task 4.2 — The signal mark, favicon and OG image

- [ ] **Step 1: Author the signal mark.** A hand-authored SVG reducing the curve to a single
  glyph (spec §10). Source its shape from `sampleSignalRange` output so the mark and the
  page draw the same line — do not draw a different squiggle.
- [ ] **Step 2:** It becomes `public/favicon.svg` and the nav wordmark. One file, two uses.
- [ ] **Step 3:** Regenerate `public/og-image.svg` on the dark palette. The existing one is
  cream and contradicts the new direction.
- [ ] **Step 4:** Confirm the favicon renders legibly at 16px — a curve with too much detail
  turns to mush. Screenshot to check rather than assuming.

### Task 4.3 — `BaseLayout.astro` rewritten dark

- [ ] **Step 1: Preserve the SEO and JSON-LD exactly.** The existing schema, canonical URLs,
  OG and Twitter tags are correct and hard-won. Carry them across verbatim; only the
  `description` default changes (Task 1.2 already derived its year count).
- [ ] **Step 2:** Import `global.css`. This is the first time `tokens.css` reaches the page —
  Task 0.3 deliberately left it unwired.
- [ ] **Step 3:** The two font preloads are already in place from Task 0.2. Verify they
  survive the rewrite, `crossorigin` intact.
- [ ] **Step 4:** Call `initScroll()` from `src/lib/motion/scroll.ts` in an inline module
  script. This is the first JS the site ships since Phase 0 — **record the gzip delta**.
- [ ] **Step 5:** `grep -rn "fonts.googleapis\|fonts.gstatic" src/` must return clean. This is
  the Phase 0 carry-forward and Phase 4 is where it is formally closed.

### Task 4.4 — Nav and Footer

- [ ] **Step 1: Nav.** CV download **always visible**, not hidden in a menu — spec §9 is
  explicit, recruiters look for it first. Sound toggle present but inert until Phase 13
  (render it `aria-pressed="false"` and `disabled`, or omit the handler; do not fake it).
  Wordmark uses the Task 4.2 signal mark.
- [ ] **Step 2: Footer.** Carries the `|` completion bar — the RxJS completion notation that
  terminates the signal (spec §6). It is a graphical element, so `--signal` is permitted.
- [ ] **Step 3: Accessibility gate.** Focus ring visible against `--ground` on every
  interactive element, tab order linear, skip-link still first in the tab order.
  This is the phase's stated verification and it is not optional.

### Task 4.5 — Mount the signal layer (added 2026-09-22)

Carries the whole-curve framing decision (see Decisions, 2026-09-22). Full step list lives in
`Addendum A` of `.superpowers/sdd/BUILD-PLAN/task-P4-brief.md`; the substance, so a cold session
is not dependent on a gitignored brief:

- [ ] **Step 1:** `createSvgSignal(mount)` — drop the `section` argument, sample
  `sampleSignalRange(0, 1, CURVE_SAMPLE_DENSITY)`, and re-measure polyline faceting against the
  much larger box before trusting `CURVE_SAMPLE_DENSITY = 240`. `setProgress` now means *global*
  page progress. Measure the `<svg>`'s own box, not the mount's, or padding on the mount silently
  scales the curve down.
- [ ] **Step 2:** Add `onPageProgress(fn)` to `src/lib/motion/timeline.ts` — a sibling of
  `onSection` reporting 0..1 across the document, same reduced-motion contract, still the only
  place a `ScrollTrigger` is created. Do not poll `globalProgress()` on the ticker instead; that is
  a second scroll pathway and it will drift from anything a later phase pins.
- [ ] **Step 3:** One `<div id="signal-layer" aria-hidden="true">` in `BaseLayout.astro`,
  absolutely positioned and `pointer-events: none`, so it cannot add to document height and feed
  back into its own measurement. Stacking: ground, grain, signal, content.
- [ ] **Step 4:** Below 768px, drop the layer's opacity — spec §7.3, no reserved column at phone
  width so the line goes behind the content.
- [ ] **Step 5:** The curve terminates at `x: 0, y: 1`, inside the footer. Meet it with the Task
  4.4 `|` completion bar, or record why not.
- [ ] **Step 6:** Report shipped JS gzip and the delta from **2,039 bytes**. This commit is where
  the deferred ~54.6 KB motion bill lands.
- [ ] **Step 7:** Do NOT import `reducedMotion()` from `motion/scroll.ts` into `svg-signal.ts` —
  `scroll.ts` imports gsap and lenis at module scope, so it would drag the whole motion layer into
  the renderer's import graph. The renderer's local `matchMedia` check stays.


## PHASE 5 — Sections 01–02: Hero and Nine Years

**Deliverable:** hero with the status rail (Sydney time, work rights, availability),
headline, positioning line carrying the MCP/AI-augmented angle, both CTAs, and the
**duotone still portrait** — particles arrive in Phase 11. Timeline rendering five
emissions from `timeline`, with statistics counting up on scroll position.

**Files:** `src/components/Hero.astro`, `src/components/NineYears.astro`,
`src/islands/hero.ts`, `src/islands/years.ts`, `scripts/portrait.mjs`

**Verification:** the year counter reads the value `yearsElapsed()` returns, not a literal.
Counting stats expose their final value to assistive tech immediately (spec §13). Local
time updates without a layout shift.

**Task-level expansion (added 2026-09-20).** The plan requires each phase be expanded before
implementing it. Briefs for these are already written in `.superpowers/sdd/BUILD-PLAN/`, including
batched forms (`task-P4-brief.md`, `task-P5-brief.md`) that carry standing constraints.

### Task 5.1 — `scripts/portrait.mjs`: the duotone still

- [ ] **Step 1:** Bake a duotone portrait at build time with `sharp`, using `--ground` and
  `--signal` as the two tones. This is the Phase 11 fallback and the mobile/reduced-motion
  path, so it ships to most visitors and must look deliberate, not degraded.
- [ ] **Step 2:** Emit AVIF + WebP + a JPEG fallback at 1x and 2x. Wire into `npm run images`.
- [ ] **Step 3:** The source portrait is 3960×3960 (spec §9.01). Confirm it exists before
  building the pipeline; if it is absent, report NEEDS_CONTEXT — do not substitute a
  placeholder face.

### Task 5.2 — Section 01: Hero

- [ ] **Step 1: The status rail.** Sydney local time (live, updating without layout shift —
  reserve the width), availability state, and **Australian Permanent Resident**. One mono
  line. Work rights are here deliberately: recruiters filter on them early and hard.
- [ ] **Step 2: H1** — "Senior Web Engineer · Angular Specialist".
- [ ] **Step 3: The positioning sentence must carry the AI-augmented angle** — MCP servers
  and Figma Code Connect, shortening design-to-code. Spec §9.01 calls this "the single most
  differentiating thing on the resume". Task 1.2 added it to the stack data; this is where
  it earns its place in prose.
- [ ] **Step 4:** Two CTAs — *See the work* and *Download CV*.
- [ ] **Step 5:** Mount the duotone portrait. Particles are Phase 11; the still is the
  deliverable here and must stand on its own.
- [ ] **Step 6:** `src/islands/hero.ts` — the clock only. Everything else is server-rendered.

### Task 5.3 — Section 02: Nine Years

- [ ] **Step 1:** Render five emissions from `timeline`, coloured by the §6 state logic
  (`--signal` live, `--shipped` shipped, `--type-dim` historical).
- [ ] **Step 2:** India → UK → Australia must be *visible* in the layout, not asserted —
  it is what substantiates the "3 countries" claim.
- [ ] **Step 3: Statistics count up on scroll position, never on a timer.** Register via
  `onSection('years', el, fn)` from Phase 3. No component creates its own ScrollTrigger.
- [ ] **Step 4: Accessibility (spec §13).** Counting stats must expose their **final** value
  to assistive tech immediately — the animation is decorative. `aria-hidden` the animating
  digits and carry the real value in the accessible name, or render the final value and
  animate a visual-only layer.
- [ ] **Step 5:** The year counter reads `yearsElapsed()`. Verify it renders 9 today and
  would render 10 on 2026-10-01 — this is the phase's stated verification.

## PHASE 6 — Section 03: Selected Work + Generated Diagrams

**Deliverable:** four case studies, each with a generated SVG diagram. No screenshots.

**Files:** `src/components/SelectedWork.astro`, `src/lib/diagrams/*.ts`

Four diagrams per spec §9.03: bundle bar 100%→40%, five repos converging with deploy
45min→12min, a flat 60fps frame-time graph, a one-million-point scatter resolving.

**Rule:** if a diagram cannot be built honestly from a real resume number, that study
reverts to prose. Never draw a chart of an invented figure.

**Verification:** every number in every diagram traces to a line in `Resume.pdf`.

**Task-level expansion (added 2026-09-25).** Three tasks. 6.1 is the precondition for the
rest: measured on the built page at 1440, the curve's left-margin run sits at 26–54% of the
document while `#work` starts at 71%. The curve's `y` is mapped linearly onto the whole
document, so it lines up with a section only by coincidence. Nothing can be laid out against
the line until the line is pinned to the sections. Briefs are in `.superpowers/sdd/BUILD-PLAN/`.

### Task 6.1 — Pin the signal to the sections; derive the gutter; dim off-gutter

- [x] **Step 1: Section anchors (TDD).** A pure module maps curve `y` to page `y` piecewise:
  each `SECTION_SPANS` seam lands on the top of the DOM element carrying
  `data-signal-section="<id>"`. Linear within a section. `path.ts` geometry is untouched —
  this is renderer scaling, which is the renderer's job. Sections not yet rebuilt are
  anchored to their interim stand-ins (`ring` → `#gallery`, `stack` → `#skills`,
  `contact` → `#contact`) until Phases 7–8 replace them.
- [x] **Step 2: Page order.** `<Work />` moves directly under `<NineYears />` (§5).
- [x] **Step 3: `--signal-gutter` derived from the curve (TDD).** The work section's spine
  (the run parked at the left margin, control points 21–26) sets it: max spine `x` plus half
  the stroke plus clearance, stated as a viewport-relative formula that also holds past
  1440px. A test reads `tokens.css` and fails if the token no longer clears the curve.
- [x] **Step 4: The dim rule.** The line is full strength only where it sits in its gutter,
  and dimmed everywhere else. That covers sections 01–02 (the 2026-09-24 decision), the
  sweep that opens section 03, and phone width (§7.3) with one rule. The bands come from
  the same sampled pixel points the path is drawn from. The dim alpha is computed, not
  guessed: every text colour the line crosses stays ≥ 4.5:1 against the blended stroke.

### Task 6.2 — `src/lib/diagrams/*.ts` (TDD, pure)

- [x] **Step 1:** `bundle` — one bar, 100 → 40. The Nx dependency graph in §9.03 is **dropped**:
  the resume gives it no number, so any node count would be invented.
- [x] **Step 2:** `repos` — five lines converging into one, labelled `5+` (the resume says
  5+, so five is a lower bound drawn as one); a deploy bar 45 → 12 min at true scale.
- [x] **Step 3:** `frametime` — a flat trace on the 16.7ms line. No jitter: sample noise
  would be invented data. The claim is the flat line.
- [x] **Step 4:** `scatter` — exactly 1,000,000 points from a seeded PRNG, binned at build
  time into a density grid. Test asserts the bins sum to 1,000,000. The distribution is
  illustrative and the caption says so; the count is real.

### Task 6.3 — Section 03: `SelectedWork.astro` + `src/islands/work.ts`

- [x] **Step 1:** Replace `Work.astro` with `SelectedWork.astro`: four studies,
  problem / approach / result, each with its diagram as a server-rendered SVG `<figure>`.
  The figcaption carries the numbers as text, so the section reads completely with JS off.
- [x] **Step 2:** Lay the section out against `--signal-gutter`. Content never enters it.
- [x] **Step 3:** The branch: as each card enters, a branch draws from the spine (its origin
  sampled from `path.ts` through the 6.1 anchor mapping) right into the card, via
  `onSection('work', …)`.
- [x] **Step 4:** Diagrams resolve on scroll position — bar collapses, repos converge, the
  scatter resolves — never on a timer. Reduced motion shows the end state.

## PHASE 7 — Section 04: The Ring (2D rail first)

**Deliverable:** the horizontal scroll-snap rail that is the mobile and no-WebGL
presentation — built first so the ring has a working fallback before it exists. Screenshot
pipeline extended with duotone and AVIF output (grain and chrome are not baked — see Decisions).

**Files:** `src/components/Ring.astro`, `src/islands/ring.ts`,
`scripts/optimise-gallery.mjs`

**Note:** the Ezytrack master is now `gallery-masters/ezytrack.png`, a correctly named 2704×14756 PNG.

**Verification:** every card is a real `<a>` to a live site. Hover scrolls the long capture
inside the frame. Keyboard reaches every card.

**Task-level expansion (added 2026-09-25).** Briefs are in `.superpowers/sdd/BUILD-PLAN/`.

### Task 7.1 — The screenshot pipeline

- [x] `optimise-gallery.mjs` rewritten: duotone `--ground`→`--type` ring captures at 480w/960w in
  AVIF and WebP, `src/data/ring-captures.json` for their sizes, the double-encode fixed.

### Task 7.2 — `Ring.astro` (the 2D rail) + `src/islands/ring.ts`

- [x] **Step 1:** `Ring.astro` replaces `Gallery.astro` (deleted, with its divider and its
  `is:inline` script). `#ring` carries `data-signal-section="ring"`; the nav links to it as
  *Shipped*. Five cards in a native scroll-snap rail, each one `<a>` to the live site wrapping
  markup browser chrome (the real hostname), the capture and the title. Hover or focus scrolls the
  capture with `transform` at a constant 400px/s; none under reduced motion.
- [x] **The split is a track** (see Decisions): a stroke above the rail, the curve pinned to its
  centre line at control point 34 (`RING_SPLIT_POINT`), a drop and a `--shipped` emission per
  card. Drawn in full in the HTML.
- [x] **In-section anchors generalised.** `anchors.ts` holds a list of control point + selector +
  edge (`IN_SECTION_ANCHORS`): the spine's two ends and the split. Every anchor is a sampling cut;
  480 samples still hold (worst chord 0.66px at 1440, unchanged).
- [x] **Step 2:** `ring.ts` draws the split off the tip over 128px (`--s-10`) of tip travel —
  the track outward from the measured meeting point, then the drops, then the emissions. Arrow
  keys, Home and End move between cards; a focused card is snapped fully into the rail.
  `lib/signal/draw.ts` holds what it shares with `work.ts`.

Measured: the curve meets the track at the drawn vertex exactly (Δ < 0.01px) at 1024, 1440, 1920,
2560 and 375. Shipped JS on `/` 59,069 gzip by the same method that reads the Phase 6 build as
57,745 (**+1,324**; against the recorded 57,756, +1,313): 72.1% of the 80 KB budget, 22,851
bytes left. `index.html` 19,945 → 18,955 gzip. CLS 0.

## PHASE 8 — Sections 05–06: Stack and Contact

**Deliverable:** the `pipe()` operator chain including the new AI tooling node, and the
contact form rebuilt in vanilla TypeScript — which finally removes the last React
dependency.

**Files:** `src/components/Stack.astro`, `src/components/Contact.astro`,
`src/islands/contact-form.ts`

Headline: **"Nothing happens until you subscribe."**

**Verification:** form submits to Formspree via `PUBLIC_FORMSPREE_ENDPOINT`, else the live
default, and falls back to `mailto:` only when neither is a usable Formspree URL (Decisions,
2026-09-26 — falling back whenever the variable is unset would turn the live form off). Native constraint validation, errors announced to screen readers,
no React in the built output (`grep -r "react" dist/` is clean).

**Task-level expansion (added 2026-09-26).** Briefs are in `.superpowers/sdd/BUILD-PLAN/`.
About and the Marquee retire (see Decisions), so the page runs Ring → Stack → Contact.

### Task 8.1 — Section 05: `Stack.astro` + `src/islands/stack.ts`

- [x] `About.astro`, `Marquee.astro`, `Skills.astro` deleted, and `aboutCols`, `marqueeItems` and
  the proficiency `Level` with them. `#stack` carries `data-signal-section="stack"`. Nav reads
  Work · Shipped · Stack · Contact.
- [x] `skillGroups` rebuilt from the resume's five groups (Core, Architecture, Testing, AI
  tooling, Also). No proficiency labels.
- [x] Five operator rows inside a mono `pipe(` … `)`. Each row sits on a hairline rule, and the
  row's node is drawn on the rule at the curve's own `x` (`signalXAtPageY`), so a node never
  sits on a glyph. The curve's weave is unchanged; between rules it passes behind the rows,
  dimmed.
- [x] `stack.ts`: each node fills as the tip passes its rule. Server-rendered lit, so JS-off and
  reduced-motion visitors see the finished chain.

Measured: every node sits on the drawn curve at its rule (Δ ≤ 0.005px) at 1024, 1440, 1920, 2560
and 375, inside its rule and clear of the gutter; none needed the on-rule hold. The ring's centre
hold is now 808px at 1440 (was ~2,195). 480 samples still hold (worst chord 0.66px at 1440,
unchanged; 0.48px inside the stack span). Each node passes 30–31 intermediate fill states over
64px of tip travel. Shipped JS on `/` **59,921 gzip (+852)**: the Stack island 650, the shared
`follow` chunk 282, the Ring island −79. 73.1% of the 80 KB budget. `index.html` 18,955 → 17,179
gzip. CLS 0.

### Task 8.2 — Section 06: `Contact.astro` + `src/islands/contact-form.ts`

- [x] `Contact.astro` replaces the interim `#contact` block in `index.astro` and takes over
  `data-signal-section="contact"`. Headline "Nothing happens until you subscribe."
- [x] The form posts natively to Formspree, so it works with JS off. The island adds
  constraint messages, announced errors and an in-place sent/failed state. The endpoint is
  `PUBLIC_FORMSPREE_ENDPOINT`, else the live default; if neither is a usable URL, `mailto:`.
- [x] Email, socials, CV, and one line on freelance availability linking to `/websites`.
- [x] The final emission on the line, drawn as the tip reaches it, above the footer's `|`.

Measured: every seam Δ 0 at 1024, 1440, 1920, 2560 and 375; `#contact` still opens at 7235.36 at
1440 (the Stack above it is unchanged), and `/` grows 7990 → 8816px. The emission sits on the
drawn curve (|Δx| ≤ 0.004px) at all five widths and lands 392–396px above the footer's bar on
desktop (526px at 375), 17–37px left of it (6px at 375). It fills over 64px of tip travel with
30–31 intermediate states, and under reduced motion it is placed and lit with one state. The
line runs behind the form's opaque panel and, dimmed, across the head. Worst chord in the contact
span 0.26px at 1440 (whole curve 0.66px, unchanged). CLS 0. The form was exercised over CDP
interception only — 200, 422, 500 and a network failure; nothing reached Formspree. Shipped JS on
`/` **61,790 gzip (+1,869)**: the Contact chunk 1,873. 75.4% of the 80 KB budget. `index.html`
17,179 → 17,913 gzip. No `react-dom`, `jsx-runtime`, `react-hook-form` or `zod` in `dist/`.
`resend` is removed: nothing imported it, and it was the last thing pulling `react` and
`react-dom` into `node_modules` (through `@react-email/render`), 19 packages in all.

## PHASE 9 — SHIPPABLE: 2D Site Complete

**Deliverable:** a complete, fast, accessible portfolio, live. **This is the finish line
that matters.**

Do not begin Phase 10 until this phase is signed off. The value of a shipped 2D site
exceeds the value of a half-finished 3D one.

**Task-level expansion (added 2026-09-26).** Briefs are in `.superpowers/sdd/BUILD-PLAN/`.
Tasks 9.1–9.4 change the site, 9.5 is the audit that proves it and fixes what the audit finds,
and 9.6 is the deploy, which the controller runs with Noel and no subagent. The order matters.
9.1 moves the terminus, which changes the page's height, so 9.4's figures and 9.5's audit have
to run after it. 9.4 comes before 9.5 because Lighthouse should grade the final chunking.

**Review Focus.** These are the five conditions most likely to bite a real visitor that no unit
test pins. Each is checked in the task named:

1. **The footer moves after the line is drawn:** fonts swap in, a late image lands, or the
   viewport resizes. The terminus must follow the bar, because a stale terminus leaves the line
   ending in mid-air (9.1: re-measure after `document.fonts.ready` and on resize, and check the
   bar against the curve's end at five widths).
2. **JS off:** no line at all, yet the page still has to end `●` then `|`, centred and close
   together, with every word readable (9.1 for the ending, 9.5 for the whole page).
3. **Reduced motion:** the line is fully drawn to the new terminus at once, the emission is lit,
   and nothing animates anywhere (9.1 for the ending, 9.5 for the page).
4. **A share crawler fetching `og:image`:** it gets an absolute URL to a 1200×630 PNG served as
   `image/png`, set in the brand faces rather than a fallback sans (9.3, then checked again on
   the preview deploy in 9.6).
5. **A first visit on throttled mobile:** no render-blocking request the budget does not allow,
   and the LCP element is text painted in the preloaded face (9.4 for the requests, 9.5 for the
   Lighthouse figures).

**Deliberately not in Phase 9.** Everything under "Deferred by Noel — 2026-09-26" (the Stack's
nodes, the sharp turns at points 7–10, the work spine's breaths). The scatter's
lowest-density fill. The ring's 9px drop at 375. The split meeting a dim line. A shared class for
the reduced-motion opt-out: each opt-out is local and commented, which is enough. The
`font-bricolage` strings and dead Tailwind on `/websites`, which is Phase 14's restyle.

### Task 9.1 — The line ends above the footer ✅ Done

- [x] `resolveSeamPixels(sectionTops, height, terminus?)`: a measured terminus replaces the
  box's bottom edge as the curve's last knot. Fallback seams scale to the terminus, not to the
  box, and no seam passes it. TDD in `tests/signal-anchors.test.ts`.
- [x] `Footer.astro`: the `|` bar moves from the footer's last pixel to its top edge, centred,
  and carries `data-signal-terminus`. `svg-signal.ts` measures the bar's centre line and passes
  it in.
- [x] `Contact.astro`: the emission sits directly above the bar. Target: the emission's centre
  is at most 96px from the bar's centre at every width, and it sits on the curve. **Measured
  72px at every width** (half `--emission` + `--s-8`), already under target from Step 2 alone —
  no spacing token changed, only the comments describing the old ~400px gap.
- [x] Comments and spec wording that place the terminus "at the document's bottom" are
  corrected (`Footer.astro`, `anchors.ts`, `contact.ts`). The spec itself never said "document's
  bottom" or "last pixel" (`grep -n -i` for both turned up nothing) — nothing to change there.

### Task 9.2 — Rulings and teardown

- [x] RxJS goes into `architecture()` after Angular Signals. `tests/skill-groups.test.ts` keeps
  the resume mirror and names RxJS as its one exception. It also fails if RxJS ever appears on
  the resume, so the exception retires itself. Checked at 1440 and 375: the row wraps cleanly
  (two lines at 375, one at 1440), no glyph sits on the node, and the node still lands on the
  curve — max Δ 0.005px at 1440, 0.004px at 375, independently re-measured by parsing the drawn
  `<path d>`, matching Task 8.1's own figures.
- [x] `.contact__title { text-wrap: balance }`, so "YOU" no longer sits alone at 375. Checked at
  375, 390 and 1440: at 375/390 the headline balances to four lines ("NOTHING" / "HAPPENS" /
  "UNTIL YOU" / "SUBSCRIBE."), pairing YOU with UNTIL; at 1440 it still wraps to three lines,
  just distributed more evenly than the unbalanced greedy wrap, with no orphan and no overflow.
- [x] `/dev/signal` deleted, and with it `createSvgSignal`'s `pageLayer` option, which only the
  harness turned off. The build reports 2 pages. See Known Gaps ("Closed by Task 9.2") for the
  full verification and the JS delta (61,500 gzip, −347 against 61,847).
- [x] `mountHeroClock()` is idempotent: a second call cancels the first one's timer and
  listener. Verified live (see Known Gaps, "Closed by Task 9.2"): three back-to-back mounts
  leave exactly one live timer chain and one live listener running.

Shipped JS on `/` after all four items: **61,540 gzip (−307 against the Task 9.1 baseline of
61,847)** — the `/dev/signal`/`pageLayer` teardown (item 3) accounts for −347, and the hero
clock's stop function (item 4) adds back +40 to the inline module script. See
`task-9.2-report.md` for every script named.

### Task 9.3 — The OG image as a raster

- [x] `scripts/og-image.mjs` imports `path.ts` and draws the card's line from the canonical
  curve (no duplicated `d`). It takes colours from `tokens.css`, renders with sharp to a
  committed 1200×630 `public/og-image.png` (33.6 kB), and is added to `npm run images`.
- [x] The card's text is set in Archivo and JetBrains Mono. sharp's renderer cannot read the
  site's WOFF2 files (tested 2026-09-26: everything fell back to a sans). Build-only static
  TTFs with their OFL licence go in `scripts/og/fonts/`. **Not** reached through
  `FONTCONFIG_FILE` in the end: on this machine, sharp/libvips' Pango has only a CoreText
  backend compiled in — no env var reaches it, and forcing the fontconfig backend segfaults
  (matches `lovell/sharp#4577`). Instead `opentype.js` shapes each line into glyph-outline
  `<path>`s directly from the TTFs, so sharp never resolves a font by name at all — see
  `scripts/og-image.mjs`'s header comment for the full finding. Verified by eye against a
  Chrome render of the old SVG at 11× zoom: genuinely wider/bolder name, genuinely
  monospaced mono line, not a fallback sans.
- [x] `public/og-image.svg` deleted. `BaseLayout` points at the PNG and emits `og:image:width`,
  `og:image:height`, `og:image:type` and `og:image:alt`. This closes Phase 4 minor (5).

### Task 9.4 — The critical path, and a budget that measures itself ✅ Done

- [x] `scripts/budget.mjs` (`npm run budget`): for each built page, every script the page loads
  before interaction is gzipped and summed: external module scripts, their static import graph,
  inline module scripts and `is:inline` blocks. Dynamic `import()` is excluded. The run fails
  above 80 KB. Its pure parts are in `scripts/lib/budget.mjs` and tested (`tests/budget.test.ts`,
  TDD — RED on the missing module, GREEN on the first implementation, 7 tests). `/` reconciled
  exactly to the pre-existing 61,540-byte figure with no gap to explain.
- [x] The three critical-path items, fixed together. Render-blocking CSS: `build.inlineStylesheets:
  'always'` in `astro.config.mjs` — kept; render-blocking-insight 2 → 0, LCP −147.5ms, FCP −76.1ms,
  Performance 97 → 98, and combined HTML+CSS bytes over the wire *fall* 25,257 → 24,920 gzip
  (−337). The missing `modulepreload`: `src/integrations/modulepreload.ts`, an `astro:build:done`
  hook reusing `pageScripts`/`staticImports`/`resolveSpecifier`, adding a `<link
  rel="modulepreload" fetchpriority="low">` per shared chunk. `fetchpriority="low"` is not
  decorative — the default-priority version regressed FCP +373.5ms by pulling GSAP's 50.84 KB
  chunk forward at high priority; low priority keeps the round-trip fix (chain depth 3 → 2) and
  *improves* FCP over even the no-preload baseline. The renderer chunk's own missing
  `modulepreload` (`svg-signal`) is moot — Task 9.2 folded it into `BaseLayout`'s entry chunk, so
  it was never a separate chunk to preload. Chunking: `vite.build.rollupOptions.output.manualChunks`
  folds the 282-byte `follow` chunk into `tip` (489 bytes merged vs. 262 + 334 = 596 apart,
  −170 on the page total including the wrapper-boilerplate shrink on every other entry chunk, one
  fewer request). No other chunk under ~1 KB gzip exists once `follow`/`tip` are merged — `timeline`
  (GSAP, 50.84 KB) is the only other shared chunk and is far over the line, so nothing else
  qualifies. "Unused JavaScript" re-measured: still 29,451 bytes, entirely within `timeline.js`
  (57.9% of its 50,890 transferred bytes) — GSAP core code no section's `ScrollTrigger` usage
  exercises during the Lighthouse trace window. Accepted: dropping it means dropping GSAP
  features, which the brief rules out.
- [x] Before and after, recorded below and in `.superpowers/sdd/BUILD-PLAN/task-9.4-report.md`
  (full `npm run budget` output, three-run Lighthouse medians, request-chain evidence, island
  smoke checks over real-time CDP, JS-off check via CDP `Emulation.setScriptExecutionDisabled`).

  | Metric | Before | After |
  |---|---|---|
  | Budget total (`/`) | 61,540 gzip (75.1%) | 61,370 gzip (74.9%) |
  | Render-blocking resources | 2 | 0 |
  | Request-chain depth | 3 (HTML → entry → shared chunk) | 2 (HTML → entry; shared chunks preloaded directly) |
  | Lighthouse Performance (median of 3) | 97 | 98 |
  | LCP (median of 3) | 2,554.5ms | 2,404.8ms |
  | FCP (median of 3) | 1,434.8ms | 1,054.8ms |
  | CLS (median of 3) | 0 | 0 |
  | TBT (median of 3) | 0 | 0 |
  | Unused JavaScript | 29,451 bytes (`timeline.js`) | 29,451 bytes (`timeline.js`, unchanged, accepted) |
  | Accessibility (median of 3) | 100 | 100 |

### Task 9.5 — The ship audit

- [x] Lighthouse mobile, three runs with the median recorded: Performance **97/98** (`/`/
  `/websites`, ≥ 95 ✓), Accessibility **100/96** (✓ / finding), **LCP 2,404ms/2,477ms — over
  the 2.0s budget on both pages**, CLS **0/0** (✓), TBT **0/0** reported as INP's lab proxy.
  See "Measured after Phase 9" for the full table and the LCP diagnosis.
- [x] A keyboard-only pass through the whole page (35 stops, 1440 and 375, no traps, visible
  focus at every stop). A screen-reader pass (AX tree over CDP) on the timeline, the ring
  rail and the form — all match §13. A JS-off pass — every word readable, only the hero
  clock's live digits differ from its "local time" placeholder, by design. A reduced-motion
  pass — zero timer-driven property changes sampled at six fixed scroll positions.
- [x] Phase 4 minors fixed: (2) `role="list"`, (7) the redundant `if (layer)`, and (1) the inert
  sound toggle, made honest per Noel's ruling (Decisions, 2026-09-26). (3) "Back to top" is not
  restored, because the nav is persistent; recorded as a Decision below. (4) and (6) confirmed
  still open, belonging to later phases (see Known Gaps); (5) already resolved by Task 9.3.
- [x] Every Global Constraints budget measured and recorded under "Measured after Phase 9" and
  in `docs/SESSIONS.md`.

### Task 9.6 — Deploy (controller with Noel, no subagent)

- [x] Push `feat/signal-path-rebuild` **only on Noel's word**. Verify the Vercel preview: the
  pages, the OG card fetched from the preview URL, the form's `action`, and Lighthouse against
  the real network. *Pushed 2026-09-27 on Noel's word (68f2c78; later commits local). The preview
  builds, but Vercel Deployment Protection 302s every route to the login, so verification waits on
  a Protection Bypass for Automation secret from Noel. Add to the checks: the `/websites` → `/#contact`
  307 (Task 9.7) — `astro preview` ignores `vercel.json`, so only a Vercel deploy can show it.*
- [ ] **After the merge (Noel ruled 2026-09-29 — neither blocks shipping):** a text-based export of the September resume replaces
  `public/noel-sebastian.pdf` (the served CV is the March one; `Resume.pdf` has no text layer, so ATS
  cannot read it); a 5-minute VoiceOver pass on the preview (checklist in `task-9.5-report.md`).
  After the merge: the `VERCEL_DEPLOY_HOOK` repo secret for the monthly rebuild. *Done 2026-09-29:
  hook `scheduled-rebuild` on `master`, secret set, a manual `workflow_dispatch` run returned Vercel's
  `PENDING` job.*
- [x] Merge to `master` for production **only on Noel's word**, then smoke-check
  `https://www.noel-sebastian.com`. Phase 9 is marked complete only after that check. *2026-09-29:
  preview verified with the bypass header (`.env.local` `VERCEL_AUTOMATION_BYPASS_SECRET`); found and
  fixed (Task 9.8) the `/websites/` trailing-slash gap and LCP over 2.0s. Tagged `v1-letterpress` on
  `6a4bac7`, `master` fast-forwarded to `c2b0e46`. Smoke check on the live domain: `/` 200, apex → www
  308, `/websites` and `/websites/` 307 → `/#contact`, 404 page, `og-image.png` `image/png`, PDF,
  `robots.txt`, sitemap, form `action` all correct; no `x-robots-tag`.*

### Task 9.8 — Latin-subset the fonts; `/websites/` redirect gap (added 2026-09-29) ✅ Done

- [x] Preview LCP median was 2,500ms (`p.hero__lede`, all render delay), so the recorded ruling
  applied. `scripts/fonts.mjs` (`npm run fonts`, `subset-font`) writes `public/fonts/` from the
  masters in `font-masters/`; it fails on a dropped used codepoint, a lost axis/feature, or a
  `font-stretch` outside the kept range. Archivo 90,104 → 57,188 B, JetBrains Mono 40,404 → 38,472 B.
  `vercel.json` gains an explicit `/websites/` source (`/websites/:path*` does not match the empty
  path). Report: `task-9.8-report.md`.

### Final whole-branch review — 2026-09-27

Opus, over `6a4bac7..68f2c78`: ready with fixes — 0 Critical, 4 Important, 9 Minor
(`.superpowers/sdd/BUILD-PLAN/final-review-report.md`). The one fix wave (`c02fc7c..8918fc2`) was
reviewed clean. The fixes: the nav is sticky again (`overflow-x: clip`); the decade copy plus the monthly rebuild; "industry-first" kept and
recorded; `/websites` given the Contact form (`ContactForm.astro`); a `robots.txt` sitemap URL; a 404 page;
JSON-LD from `caseStudies`; the portrait source moved out of `public/`; a shared new-tab note. Parked:
M5, the hero clock's per-second tick, as Noel's design call.

### Task 9.7 — `/websites` redirects to Contact until Phase 14 (added 2026-09-27)

- [x] `vercel.json`: `/websites` and `/websites/:path*` → `/#contact`, 307. The sitemap filter drops
  the URL. Contact's freelance line points at the form instead of the page. Found in the final
  review's re-check: without Tailwind, `/websites` renders essentially unstyled, and merging would
  have replaced production's working page (Decisions, 2026-09-27).

---

## Archive pass 2026-10-03 — Phase 10

Phase Status note as it stood before the pass:

| 10 | WebGL — gate + signal tube | **in progress** | Tasks 1–9 + final-review fixes on `feat/phase-10-webgl` (not merged); owed: Noel's 60Hz check, then merge |

## PHASE 10 — WebGL: Gate + Signal Tube

**Deliverable:** the capability gate, and `TubeSignal` reading the **same**
`sampleSignalRange` output as the SVG renderer.

**Design:** `docs/superpowers/specs/2026-09-30-phase-10-webgl-tube-design.md` — overlay on the
running SVG, custom mesh (not `TubeGeometry`), shader glow. Its original "real depth in the
hero" was **revised 2026-09-30 after Noel's first look** (plan Task 9, built): the line starts at the
hero's bottom edge in both renderers, `--signal-stroke` is 8px, the tube is full strength
with no dim rule and flat on the page everywhere, and the hero depth code and the crossfade are
gone. Plan:
`docs/superpowers/plans/2026-09-30-phase-10-webgl-tube.md`; ledger in `.superpowers/sdd/`.

**Files:** `src/lib/gfx/gate.ts`, `src/lib/gfx/scene.ts`, `src/lib/gfx/render-schedule.ts`,
`src/lib/gfx/tube-mesh.ts`, `src/lib/gfx/camera.ts`, `src/lib/signal/tube-signal.ts`; `svg-signal.ts` and `tip.ts` gain the
geometry channel.

```ts
export interface Capability { enabled: boolean; reason?: string; }
export function checkCapability(): Capability;
export async function loadEnhanced(): Promise<void>;   // dynamic import boundary
```

Gate conditions, all required (spec §12): `prefers-reduced-motion: no-preference`, viewport
≥ 900px, `saveData !== true`, `hardwareConcurrency >= 4`, WebGL2 available, frame-budget
probe passes.

**Verification:** Three.js appears in **no** initial chunk. Force each gate condition false
in turn and confirm the 2D path renders with identical choreography.

## Archive pass 2026-10-03 — Phase 11

Phase Status note as it stood before the pass:

| 11 | WebGL — particle portrait | **built — branch, awaiting final review** | `feat/phase-11-portrait`; cream still, 40k particles over it, revision R1. Noel approved the look 2026-10-03 |

## PHASE 11 — WebGL: Particle Portrait

**Deliverable:** ~40k GPU particles sampled from the portrait, assembling out of the line
and dissolving back on scroll, with cursor displacement.

**Files:** `src/lib/gfx/{portrait-sample,portrait-dissolve,portrait-tier,portrait-source,particles}.ts`,
`scene.ts`, `Hero.astro`, `scripts/portrait.mjs` (cream re-bake). No baked sample data: the
particles are sampled at runtime from the still (design D8).

**Spec:** `docs/superpowers/specs/2026-10-03-phase-11-particle-portrait-design.md` ·
**Plan:** `docs/superpowers/plans/2026-10-03-phase-11-particle-portrait.md`

**Verification:** holds 60fps on a mid-range laptop. Falls back to the Phase 5 duotone still
whenever the gate fails. Particle count scales down on weaker hardware rather than dropping
frames.

## Archive pass 2026-10-03 — Phase 12

Phase Status note as it stood before the pass:

| 12 | WebGL — 3D ring | not started | |

The phase was built to its design and plan, not to the phase-level sketch below:
`docs/superpowers/specs/2026-10-03-phase-12-3d-ring-design.md` (revisions R1–R2) ·
`docs/superpowers/plans/2026-10-03-phase-12-3d-ring.md`.

## PHASE 12 — WebGL: 3D Ring

**Deliverable:** the ring carousel — cards on a circle via `rotateY(θ) translateZ(radius)`,
drag to spin, with the signal splitting into one branch per card.

**Files:** `src/lib/gfx/ring.ts`, `src/islands/ring.ts` (extended)

**Verification:** arrow keys rotate the ring and move focus together. Every card remains a
real link. The Phase 7 rail still renders whenever the gate fails.
