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
| 0 | Foundation & teardown | not started | |
| 1 | Content model rewrite | not started | |
| 2 | Signal path core (2D) | not started | |
| 3 | Motion infrastructure | not started | |
| 4 | Shell — layout, nav, footer | not started | |
| 5 | Sections 01–02 — Hero, Nine Years | not started | |
| 6 | Section 03 — Selected Work + diagrams | not started | |
| 7 | Section 04 — The Ring (2D rail) | not started | |
| 8 | Sections 05–06 — Stack, Contact | not started | |
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

The base-path budget is 80 KB gzip. Removing React in Phase 0 therefore frees almost the
entire budget, and the whole GSAP + Lenis + signal-renderer layer has to fit in roughly
what React costs today. Re-measure with the same command after Task 0.1 and record the
delta in `docs/SESSIONS.md`.

**Phase 9 is the milestone that matters.** Everything through it produces a complete,
fast, accessible site that can go live. Phases 10–15 are enhancement on a working product.
If time runs out, stopping at 9 leaves something genuinely good rather than half-built.

---

## File Structure

```
src/
  lib/
    career.ts            derived dates — pure, tested
    signal/
      path.ts            THE canonical curve. Pure. Tested.
      svg-signal.ts      2D renderer — stroke-dashoffset
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
  optimise-gallery.mjs   extended: duotone, grain, chrome, AVIF
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

## PHASE 6 — Section 03: Selected Work + Generated Diagrams

**Deliverable:** four case studies, each with a generated SVG diagram. No screenshots.

**Files:** `src/components/SelectedWork.astro`, `src/lib/diagrams/*.ts`

Four diagrams per spec §9.03: bundle bar 100%→40%, five repos converging with deploy
45min→12min, a flat 60fps frame-time graph, a one-million-point scatter resolving.

**Rule:** if a diagram cannot be built honestly from a real resume number, that study
reverts to prose. Never draw a chart of an invented figure.

**Verification:** every number in every diagram traces to a line in `Resume.pdf`.

## PHASE 7 — Section 04: The Ring (2D rail first)

**Deliverable:** the horizontal scroll-snap rail that is the mobile and no-WebGL
presentation — built first so the ring has a working fallback before it exists. Screenshot
pipeline extended with duotone, grain, browser chrome and AVIF output.

**Files:** `src/components/Ring.astro`, `src/islands/ring.ts`,
`scripts/optimise-gallery.mjs`

**Note:** `gallery-masters/ezytrack2.jpg` is PNG data with a `.jpg` extension and is ~15MB.
The pipeline must sniff the real format rather than trust the extension, and must supersede
the 640px `ezytrack.jpg`.

**Verification:** every card is a real `<a>` to a live site. Hover scrolls the long capture
inside the frame. Keyboard reaches every card.

## PHASE 8 — Sections 05–06: Stack and Contact

**Deliverable:** the `pipe()` operator chain including the new AI tooling node, and the
contact form rebuilt in vanilla TypeScript — which finally removes the last React
dependency.

**Files:** `src/components/Stack.astro`, `src/components/Contact.astro`,
`src/islands/contact-form.ts`

Headline: **"Nothing happens until you subscribe."**

**Verification:** form submits to Formspree via `PUBLIC_FORMSPREE_ENDPOINT` and falls back
to `mailto:` when unset. Native constraint validation, errors announced to screen readers,
no React in the built output (`grep -r "react" dist/` is clean).

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
