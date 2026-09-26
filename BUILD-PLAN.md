# Signal Path — Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> or `superpowers:executing-plans` to implement a phase task-by-task. Steps use checkbox
> (`- [ ]`) syntax. **Phases 3–15 carry phase-level detail only** — expand the phase you are
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
- **Content truth:** `Resume.pdf` is the source for all metrics and dates. Never invent a
  number. Derive elapsed years from a constant, never hard-code.

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
| 7 | Section 04 — The Ring (2D rail) | **complete** | Tasks 7.1–7.2, reviewed clean, no fix round. Split drawn as a track the curve is pinned to; Gallery retired |
| 8 | Sections 05–06 — Stack, Contact | **complete** | Tasks 8.1–8.2. About + Marquee retired, the Stack's nodes sit on the weave; Contact's form works with JS off, and the line ends in a final emission over the footer's bar |
| **9** | **SHIPPABLE — 2D site complete** | not started | **Real finish line. Deploy here.** |
| 10 | WebGL — gate + signal tube | not started | |
| 11 | WebGL — particle portrait | not started | |
| 12 | WebGL — 3D ring | not started | |
| 13 | Audio engine | not started | |
| 14 | `/websites` restyle | not started | |
| 15 | Preloader + final polish | not started | |

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
      tube-signal.ts     3D renderer — Three.js TubeGeometry   (phase 10)
    motion/
      scroll.ts          Lenis init + global progress
      timeline.ts        GSAP master timeline, section registration
    audio/
      engine.ts          Web Audio — lazy, never fetched unless toggled (phase 13)
    gfx/
      gate.ts            capability gate
      scene.ts           Three.js renderer lifecycle              (phase 10)
      particles.ts       portrait point cloud                      (phase 11)
      ring.ts            3D ring carousel                          (phase 12)
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

## PHASE 9 — SHIPPABLE: 2D Site Complete

**Deliverable:** a complete, fast, accessible portfolio, live. **This is the finish line
that matters.**

- [ ] Full Lighthouse run, mobile — Performance ≥ 95, Accessibility 100
- [ ] Every budget in Global Constraints measured and recorded in `docs/SESSIONS.md`
- [ ] Keyboard-only pass through the entire page
- [ ] Screen reader pass on the timeline and the ring rail
- [ ] JS disabled — every word still readable
- [ ] `prefers-reduced-motion` — no animation anywhere
- [ ] Deploy

Do not begin Phase 10 until this phase is signed off. The value of a shipped 2D site
exceeds the value of a half-finished 3D one.

## PHASE 10 — WebGL: Gate + Signal Tube

**Deliverable:** the capability gate, and `TubeSignal` reading the **same**
`sampleSignalRange` output as the SVG renderer.

**Files:** `src/lib/gfx/gate.ts`, `src/lib/gfx/scene.ts`, `src/lib/signal/tube-signal.ts`

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

## PHASE 11 — WebGL: Particle Portrait

**Deliverable:** ~40k GPU particles sampled from the portrait, assembling out of the line
and dissolving back on scroll, with cursor displacement.

**Files:** `src/lib/gfx/particles.ts`, `scripts/portrait.mjs` (extended to emit sample data)

**Verification:** holds 60fps on a mid-range laptop. Falls back to the Phase 5 duotone still
whenever the gate fails. Particle count scales down on weaker hardware rather than dropping
frames.

## PHASE 12 — WebGL: 3D Ring

**Deliverable:** the ring carousel — cards on a circle via `rotateY(θ) translateZ(radius)`,
drag to spin, with the signal splitting into one branch per card.

**Files:** `src/lib/gfx/ring.ts`, `src/islands/ring.ts` (extended)

**Verification:** arrow keys rotate the ring and move focus together. Every card remains a
real link. The Phase 7 rail still renders whenever the gate fails.

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

## Known Gaps

- No test framework existed before Phase 0. Vitest covers pure modules only —
  `career.ts`, `signal/path.ts`, and later `audio/engine.ts` scheduling. Motion and visual
  work is verified by hand; this is a deliberate limit, not an oversight.
- Testimonials remain absent until real client quotes exist (spec §3).
- The site has no automated performance regression check. Phase 9 establishes the numbers
  manually; consider a Lighthouse CI step afterwards.
- `src/pages/dev/signal.astro` (Task 2.2) is a `noindex` dev harness for the SVG signal
  renderer — there is no real page to mount a section on until Phase 4 builds the shell.
  It accepts `?t=0..1` to set progress directly for screenshotting, and falls back to a
  raw scroll listener otherwise. Scaffolding: delete it before the Phase 9 ship.
- **The `/dev/signal` harness (`src/pages/dev/signal.astro`) must be deleted before the Phase 9
  ship.** It is `noindex` but it is scaffolding, and it is why the build now reports 3 pages.
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
- **`onSection`'s first callback arrives on the next refresh/rAF pass, not synchronously inside the
  `onSection()` call.** A section already on screen at page load *does* receive its initial progress
  — traced through `ScrollTrigger.refresh()`'s `isFirstRefresh && !_refreshingAll && self.update()`,
  and through the batched case where `_refreshAll` calls `_updateAll(2)` whose gate passes on
  `force === 2` regardless of `_refreshingAll`. So this is a timing expectation, not a bug: do not
  write Phase 5 code that assumes the renderer has been given a progress value by the time
  `onSection()` returns. Give renderers a sane value at construction instead — `SvgSignal` already
  defaults to 0.
- **RESOLVED 2026-09-24 by Task 5.2 — Archivo's `wdth` axis is live.** `SENIOR WEB ENGINEER` at
  64px/800 measures condensed **521.16px**, normal **787.83px**, expanded **984.58px** (+24.97% over
  normal); `font-stretch` keywords and raw `font-variation-settings` agree to the hundredth of a
  pixel. `public/fonts/archivo-var.woff2` is the right file. Original entry, for the record:
  **Archivo's `wdth` axis is confirmed only circumstantially** — Fontsource metadata declares
  wdth 62–125, and `-wdth-` (90,104 bytes) is 2.6× the weight-only `-wght-` (34,928). No font
  tooling on this machine. The decisive check is visual: the first display heading rendered with
  `font-stretch` expanded, in Phase 4/5. If Expanded never appears, that file is the first suspect.

### Opened by Phase 4 — 2026-09-23

- **`--virtual-time-budget` freezes `requestAnimationFrame` after a single frame.** Proved with a
  recursive frame tracer: 1 frame over 3s, top-level and inside an iframe. Anything rAF-driven —
  Lenis, ScrollTrigger, the `stroke-dashoffset` draw — is therefore **invisible** under it, and a
  screenshot taken that way silently shows frame 1 rather than the settled state. This supersedes
  the 2026-09-20 note recommending `--virtual-time-budget=5000` for screenshots: it is fine for
  static paint, wrong for anything animated. Motion must be verified over real-time CDP. Every
  Phase 4 check except the anchor trace was rAF-independent, so they stand.
- **Seven Phase 4 review minors, deferred to the final whole-branch review:**
  (1) the inert sound toggle explains itself only via `title` on a `disabled` button, which is
  neither focusable nor reliably announced; (2) `role="list"` missing on the nav and footer `ul`s
  (Safari/VoiceOver drops list semantics under `list-style: none`); (3) the "Back to top" link was
  dropped without a decision record, on a 9,163px document; (4) the desktop signal layer is
  full-opacity and the footer is the one place Phase 4 lays text across the curve's path — latent,
  since the centre column is mostly empty; (5) `og-image.svg` duplicates the generated `d` with no
  regeneration command of its own, so it can go stale silently; (6) **24 lowercase
  `font-bricolage` class strings survive in `src/`** — the Phase 4 ruling's grep was
  case-sensitive and missed exactly the hole it was written to close, though they are inert
  Tailwind names on components Phases 5–8 rewrite; (7) `BaseLayout.astro`'s `if (layer)` silently
  no-ops on an element `BaseLayout` itself renders eleven lines above.
- **Three critical-path items for the Phase 9 performance pass, to be fixed together, not
  piecemeal:** `unused-javascript` reports 29 KiB (the motion chunk ships whole while no section
  registers a trigger yet — expected to amortise across Phases 5–8, but verify rather than assume);
  a render-blocking 1.9 KB `_astro/index.css` link worth ~150ms; and no `modulepreload` for the
  1.6 KB `svg-signal` chunk, which `BaseLayout`'s chunk statically imports — one extra round trip.
- **The OG image is still an SVG**, which Twitter/X, Facebook, LinkedIn and Slack do not render, so
  the share card currently shows nowhere. Pre-existing; spec §10 already schedules a build-time
  `sharp` raster. Phase 9 at the latest.

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
- **The JS budget has been measured with two blind spots all along.** The hero island is inlined
  into `index.html` rather than emitted as a chunk, so a chunk-only sum misses it; and
  `Gallery.astro`'s `is:inline` script (~1.1 KB raw) was never counted in any phase figure (it
  left with `Gallery.astro` in Task 7.2, so the page now has no `is:inline` script at all).
  Deltas between phases are still sound because the omission is consistent, but the **absolute**
  number understates what ships. Phase 9 must measure every script the page actually loads —
  external chunks, module-inlined scripts and `is:inline` blocks — not just `_astro/*.js`.
- **`mountHeroClock()` is not idempotent.** Each call adds a `visibilitychange` listener and starts
  a `setTimeout` chain nothing cancels. Nothing re-mounts it today, but `scroll.ts` is deliberately
  written to survive an Astro view transition re-mounting it, so the codebase anticipates them. If
  view transitions land (Phase 15 is the likely place), that is a leaked timer and listener per
  navigation. Minor; fold into the final whole-branch review.
- **RESOLVED 2026-09-25: kept, see Decisions. Original finding:** **Archivo's middot is a square, and nothing chose that.** The H1's `·` separator renders as a
  filled square block at display size. Verified it is genuinely Archivo's U+00B7 — the glyph is in
  the font (`document.fonts.check` true, 35.95px advance at 86px) and differs from both serif's and
  system-ui's round dots, while Archivo's own U+2022 bullet is round. So it is not a tofu and not a
  fallback. On the dark palette in `--signal` it happens to read as an emission mark, which is
  on-concept, but it was inherited rather than decided, and the same `·` renders round in the mono
  voice (the status rail, the `01 · of('Noel Sebastian')` caption). Noel's call.

### Opened by Task 8.2 — 2026-09-26

- **The final emission and the `|` are 392–396px apart on desktop, 526px at 375, and the line
  runs on between them.** The curve ends at the document's last pixel, where the footer's bar is,
  and the emission sits in Contact above the footer, so the whole footer lies between the two.
  They read as one sequence — one mark on the line, then the bar it ends in, both near the centre
  (the emission 17–37px left of the bar, where the curve is still settling) — but §6's
  "terminates in a final emission" is looser than it could be. Tighter would mean the emission in
  the footer, or a shorter footer; Phase 9's polish pass or Noel.
- **The success state is a status line.** On a 200 the form resets and the status reads "Sent.
  Thank you — I will reply by email." Nothing else changes. That is enough for a single-purpose
  form; a larger confirmation would be island-rendered content, so it was not built.
- **JS off lands on Formspree's own confirmation page.** Acceptable per the brief; Formspree's
  `_next` redirect back to the site needs a paid plan.

### Opened by Task 8.1 — 2026-09-26

- **The Stack's nodes step right, then back once, rather than left and right.** The weave's
  bends are at control points 41 (`x` −0.30), 44 (0.24) and 46 (−0.14, the contact seam). The
  seams pin the span to the section, and the five rules fall at 41–76% of its height at 1440, so
  the left bend lands in the head (at the lede's second line) and the rows see the run from it
  to the right bend and a little way back: nodes at 640, 761, 860, 897, 865px. The same shape at
  every width. Honest to the curve, and the nodes still never sit on a glyph, but it is less of a
  weave than the Decision pictures. Pinning a stack control point to a rule would fix it; that is
  an in-section anchor, which Task 8.1's brief ruled out.
- **RxJS is not on the resume.** The site is built on RxJS operators, but neither the Skills
  table nor the experience lists RxJS (the old `skillGroups` and marquee did). The rule is that
  every Stack item traces to the resume, so it is not in the chain. Noel's call: add it to the
  resume, and the test lets it into the chain.
- **The shared `follow` helper is its own 282-byte chunk and one more request.** Rollup splits it
  because its importers (Ring, Stack) differ from `tip`'s. Duplicating the wiring instead measured
  59,821 gzip, 100 bytes less, with no extra request. Fold it into the `tip` chunk with a
  `manualChunks` rule in the Phase 9 chunking pass, alongside the missing `modulepreload`.

### Opened by Task 7.2 — 2026-09-25

- **RESOLVED 2026-09-26 by Task 8.1 — About is gone and the `stack` seam is `#stack`, so the hold
  ends at the Stack's top: 808px at 1440 (754 at 1024, 836 at 1920 and 2560, 699 at 375).**
  Original finding: **the ring's hold runs down through About.** The `ring` span ends at the `stack` seam, which is
  still `#skills`, and `About.astro` sits between the ring and Skills with no anchor of its own. So
  control points 34→39 — the curve holding the centre — stretch from the track through the rest of
  the rail and all of About (about 2,200px at 1440). Dimmed throughout, so contrast holds. Phase 8
  decides where About goes; the ring's bottom seam follows.
- **At phone width the curve runs 9px beside the first card's drop.** At 375 the meeting point is
  187.5px and the first card's drop is at its centre, 178px, so the dim curve and the drop run down
  the 48px drop zone side by side before the card hides the curve. Legible, not ugly, but not
  designed. A drop placed off-centre, or the first card snapped so its centre is the meeting point,
  would settle it.
- **The split meets a dim line.** The track and drops are full strength, while the curve arriving
  at them is at `--signal-dim-alpha`: it is outside the gutter the whole way across the section's
  head. Correct under the dim rule, and the track reads as the line arriving at full strength, but
  the join is a step in strength, not a continuous stroke.

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
- **The content-box assumption is load-bearing.** `gutter.ts`'s lit/dim bands assume every section
  from 03 down lays out as a centred `--container` with `--s-5` padding plus
  `padding-left: var(--signal-gutter)`. A section built differently gets a line lit under its
  text. Phases 7–8 build to it, or extend the probe.
- **`global.css`'s reduced-motion rule turns inline style writes into 1ms transitions**, which
  stalled in headless Chrome. The branch and each scrubbed diagram part opt out. Any later island
  that writes positions per frame needs the same opt-out; worth one shared class in the Phase 9 pass.
- **Minor: the scatter's lowest density level fills nearly the whole plot box**, since one point
  lifts a cell to level 1. It reads as a tinted panel rather than empty ground around the clusters.
  Cosmetic: a threshold or a log scale in `quantiseLevels`.
- **Re-checked by Task 8.2 — the Phase 4 minor about footer text crossing the line** is covered
  by the dim rule (the line is dim anywhere it does not clear content). Measured with Contact
  built: at 1440, 1920 and 2560 the line crosses no footer text; at 1024 it crosses the colophon;
  at 375 it crosses the name, tagline, copyright line, "Medium" and the colophon. All at 0.15, so
  contrast holds.
