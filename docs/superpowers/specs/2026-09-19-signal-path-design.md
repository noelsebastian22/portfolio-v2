# Signal Path — Design Spec

**Date:** 2026-09-19
**Status:** Approved for planning
**Supersedes:** `PRODUCT.md`, `DESIGN.md` (both retired — see §3)

---

## 1. Summary

A total rebuild of noel-sebastian.com around a single anchor concept: **the site is one
continuous live signal.** A luminous line enters at the top of the hero, runs unbroken to
the footer, and everything on the page is an event on that line.

The concept is not decorative. In Angular, a stream of values over time is drawn as a
**marble diagram** — a line with dots on it. Noel is an RxJS and Signals specialist, so the
line is a marble diagram of his career. A recruiter reads it as expensive and futuristic;
a tech lead reads it as a marble diagram and knows within seconds that he is serious.

"Signal path" is also the audio-engineering term for the route a signal takes from source
to output. The same line is therefore a waveform, which is what makes the sound design
structural rather than bolted on.

**Stack:** Astro 5 (static) + vanilla TypeScript islands + Three.js + GSAP + Lenis.
No React. No UI framework of any kind.

---

## 2. Audience & Goals

**Primary: recruitment.** Recruiters, hiring managers, and technical leads evaluating Noel
for senior frontend / Angular roles. Freelance clients are secondary and are served by the
same site plus the `/websites` page.

The primary audience frequently opens portfolios on a phone, between other things, for
under a minute. This pulls directly against a heavy WebGL and audio build. The resolution
is §12 and §13: every word is readable with zero JavaScript, and the enhanced layer is
gated rather than assumed.

**Success criteria**

1. A hiring manager can reach the enterprise case studies and their metrics within one
   scroll of landing.
2. The CV is one click from anywhere on the page.
3. A technical lead viewing devtools finds no framework, no render-blocking JavaScript,
   and a Lighthouse mobile performance score of 95 or better.
4. The site is memorable enough to be mentioned unprompted in an interview.

---

## 3. What This Retires

`PRODUCT.md` and `DESIGN.md` are retired in full, at Noel's explicit instruction. That
includes the "Technical Letterpress" north star, the warm cream ground (`#F3F0E8`), the
ink/red/yellow letterpress palette, and the Bricolage Grotesque / Manrope / Space Mono
type system.

Both files should be deleted rather than left in the repo to contradict this document.

Also retired:

- The **Services** section — a services pitch above the case studies is a freelance
  ordering, and this site is recruitment-first.
- The **Process** section — four generic steps that appear on every portfolio.
- The **Testimonials** section — currently three placeholder cards. It returns only when
  real client quotes exist.
- **React** — currently used only for `ContactForm.tsx`. The contact form is rebuilt in
  vanilla TypeScript. A site selling Angular depth ships no React.

---

## 4. The Anchor: Signal Path

Each section is a stage in the signal's life, labelled with the RxJS operator that
genuinely describes it, paired with a plain-English name for wayfinding.

```
00  ESTABLISHING SIGNAL ····  the line draws itself in from nothing
01  of('Noel Sebastian')      THE SOURCE      hero
02  scan()                    NINE YEARS      timeline + counting stats
03  switchMap()               SELECTED WORK   4 enterprise case studies
04  mergeMap()                THE RING        3D drawer, everything shipped
05  pipe()                    THE STACK       skills as composed operators
06  subscribe()               CONTACT         the terminal operator
                                         |    completion bar → footer
```

**The operators must stay semantically correct.** A tech lead who knows RxJS will check,
and a wrong one is worse than no concept at all.

| Operator | Real behaviour | Why it fits |
|---|---|---|
| `of(x)` | Emits `x`, then completes | The source. Here is Noel. |
| `scan()` | Emits the running accumulation on each value | A timeline where years accumulate |
| `switchMap()` | Cancels the previous inner stream when a new one arrives | Successive engagements |
| `mergeMap()` | Runs inner streams concurrently | One line fanning into many projects |
| `pipe()` | Composes operators together | The stack he composes with |
| `subscribe()` | Nothing runs until subscription | The contact CTA |

The contact headline is literally **"Nothing happens until you subscribe."** — the most
quoted line in RxJS, and a call to action at the same time.

Marble-diagram notation is used honestly throughout: `●` for an emission, `|` for
completion. The `|` closes the page in the footer.

---

## 5. Information Architecture

Page order changed deliberately. The current site runs Hero → Marquee → Services → Gallery
→ Stats → About → Process → Work, which buries the four enterprise case studies at
position eight behind a services pitch.

Recruitment-first means **proof comes second, directly under the hero.**

```
/                 Nav (sections · CV · sound toggle)
                  00  Preloader
                  01  Hero            of('Noel Sebastian')
                  02  Nine Years      scan()
                  03  Selected Work   switchMap()
                  04  The Ring        mergeMap()
                  05  The Stack       pipe()
                  06  Contact         subscribe()
                  Footer              |

/websites         Freelance funnel — same system, lighter treatment (§14)
```

---

## 6. The Signal — Core Mechanic

The line is the single most important implementation detail in the build.

**One canonical path definition.** `src/lib/signal/path.ts` exports the curve as normalised
control points. Both renderers consume it:

- `SvgSignal` — renders it as an SVG `<path>`, revealed by animating `stroke-dashoffset`
  against scroll progress.
- `TubeSignal` — renders it as a Three.js tube extruded through the same sampled points the
  SVG draws, with a glow; flat on the page, full strength, one weight (Phase 10 design,
  revision 2026-09-30).

Because both read the same source, the 2D fallback and the WebGL version have **identical
choreography** — not a degraded approximation. This is what makes the fast path honest.

**Per-section behaviour**

| Section | The line does this |
|---|---|
| Preloader | Draws in from nothing, one stroke, against pure black |
| Hero | No line: the signal begins at the hero's bottom edge (Phase 10 revision, 2026-09-30) |
| Nine Years | Flattens to near-2D, runs horizontally, emissions ticking past |
| Selected Work | Runs down the left margin, branching right into each case study on entry |
| The Ring | **Splits** — one line becomes five, each terminating on a card |
| The Stack | Passes through operator nodes that visibly transform it |
| Contact | Terminates in a final emission, then a `|` completion bar into the footer |

**Emissions carry meaning, not decoration:**

- `--signal` red — live / current
- `--shipped` yellow — shipped / complete
- `--type-dim` — historical

The timeline and the ring are therefore legible at a glance before a word is read.

---

## 7. Design System

### 7.1 Colour

```css
--ground       #0A0908   /* warm black — NOT blue-black */
--ground-lift  #131110   /* raised surfaces, cards */
--type         #F2EFE7   /* cream */
--type-dim     #8A857C   /* secondary text */
--signal       #FF4B54   /* the line, emissions, CTAs */
--shipped      #FFC01E   /* shipped-state emissions */
```

**The warm black rule.** All four reference sites sit on a cold blue-black. Warm black is
the cheapest single decision that makes this look like Noel's and not like theirs. Never
substitute a cool grey or a blue-black.

Measured contrast on `--ground` (verified, not estimated):

| Pair | Ratio | Verdict |
|---|---|---|
| `--type` on `--ground` | 17.32:1 | AAA |
| `--type-dim` on `--ground` | 5.43:1 | AA |
| `--signal` on `--ground` | 6.05:1 | AA (not AAA — see below) |
| `--shipped` on `--ground` | 12.14:1 | AAA |

`--signal` clears AA for normal text but not AAA. It is therefore restricted to large text,
CTAs, and graphical elements. Body copy never uses it.

### 7.2 Typography

Two families, both variable, both **self-hosted** rather than loaded from Google's CDN —
one fewer third-party connection, and a detail a technical reviewer notices.

| Role | Face | Job |
|---|---|---|
| Display | **Archivo**, Expanded axis | Hero and section headings, very large, very tight |
| Body | **Archivo**, normal width | Same file as display — one download covers both |
| Mono | **JetBrains Mono** | Operators, metrics, emissions, section numbers, status |

The mono carries the identity, not the display face. The whole site speaks in code, so the
display stays relatively neutral and the mono does the character work. JetBrains Mono
specifically because it is what a developer's editor looks like — it reads as native to a
tech lead in a way Space Mono does not.

Subset both to Latin and self-host as WOFF2 with `font-display: swap` and preload hints on
the two faces used above the fold.

### 7.3 Spacing & Layout

A 12-column grid on a 1440px max container, collapsing to 6 at tablet and 4 at phone.
Gutters scale with viewport.

Spacing is a 4px base with a modular ramp: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192.
Section vertical rhythm is `clamp(96px, 12vw, 200px)` — considerably more generous than the
current site, because a dark ground needs more air before it stops feeling heavy.

**The left gutter is reserved for the signal's spine.** In section 03 the line runs down a
fixed column on the left, and content never encroaches on it. Below 03 the line runs through
the centre and weaves behind content, so sections 04–06 use the full content box like 01–02,
and the line is dimmed wherever it is outside that one column. At phone width the line moves
behind the content at low opacity rather than beside it, since there is no room for a
reserved column.

### 7.4 Motion

**One named rule governs everything: the scroll is the transport.** Like a tape head or a
DAW playhead — the visitor scrubs the signal rather than watching a video play at them.

Concretely: nothing animates on a timer except the audio drone and the idle particle
drift. Every other movement is driven by scroll position or pointer input.

This is the main separator from the reference sites, most of which have a great deal
moving on loops. An instrument you operate reads as more engineered than a showreel that
plays at you.

- **Smooth scroll:** Lenis, lerp ≈ 0.08.
- **Orchestration:** GSAP ScrollTrigger, hanging off a single master timeline bound to page
  progress. Sections register into that timeline rather than creating independent ones.
- **Easing:** one signature curve for the line (long ease-out), one for emissions (slight
  overshoot, so they arrive rather than fade in).

GSAP's formerly premium plugins (ScrollTrigger, DrawSVG) are free as of GSAP 3.13. Verify
licence terms at install time rather than assuming.

---

## 8. Sound Design

**Off by default, with a visible, labelled toggle.** Browsers block autoplay and it is
hostile regardless. State persists in `localStorage`.

When enabled:

- A low drone bed, continuous.
- **Each emission on the line plays one note**, drawn from a pentatonic scale — so it
  cannot sound wrong regardless of firing order.
- Scroll velocity maps to a lowpass filter cutoff. Scrolling fast brightens the mix.
- A short tick on interactive hover.

Implemented with Web Audio oscillators and a small generated impulse response, so the cost
is a few KB of code rather than an MP3 download. The audio module is lazy-loaded on first
toggle and is never fetched if the toggle is never pressed.

The music is not ambient decoration layered on top. It is the same signal being watched.

---

## 9. Section Specifications

### 00 — Preloader: ESTABLISHING SIGNAL

The line draws itself in from nothing, one stroke, against pure black, while a mono label
reads `ESTABLISHING SIGNAL`. On completion the first note sounds (if audio is on) and the
hero resolves.

- Skipped automatically on repeat visits within a session (`sessionStorage`).
- Skipped entirely under `prefers-reduced-motion`.
- Hard cap of 1200ms; it never blocks content on a slow connection.
- The sound toggle is offered here, once, unobtrusively.

### 01 — Hero: `of('Noel Sebastian')`

**Content:** status rail (Sydney local time, availability state, **Australian Permanent
Resident**), H1 "Senior Web Engineer · Angular Specialist", one positioning sentence, two
CTAs — *See the work* and *Download CV*.

Work rights are in the status rail deliberately. Recruiters filter on them early and hard,
and burying it costs interviews. It is one mono line, and it removes a blocking question.

The positioning sentence must carry the **AI-augmented development** angle — MCP servers
and Figma Code Connect, shortening design-to-code. `content.ts` does not mention this
anywhere, and in 2026 it is the single most differentiating thing on the resume. It should
not be buried in a skills list.

**Visual:** the **particle portrait**; the signal begins below the hero.

The 3960×3960 photograph is baked into a cream duotone still (§10), and on a capable desktop
the still's own pixels are sampled into approximately 40,000 GPU particles. At rest they hold
the face over the still, which stays beneath them at reduced opacity to carry the likeness;
they drift faintly, and the cursor pushes through them. On scroll the face — particles and
still together — dissolves from the bottom up into a stream that pours down to the point at
the hero's bottom edge where the line begins, turning from cream to signal red as it joins it;
the face is gone exactly as the line starts to draw. Scrolling back rebuilds it. The face is
the line's source, not its
destination (Phase 11 design, 2026-10-03).

Conceptually exact — he is made of the signal — and technically a real demonstration:
GPU particles decoded from an image.

**Fallback:** the cream duotone still, baked at build time with `sharp`, on mobile,
reduced-motion, or when the WebGL gate (§12) fails. It is also the particles' only source.

### 02 — Nine Years: `scan()`

**Content:** the career timeline, 2016 → 2026, plus the accumulating statistics (9+ years,
3 countries, 90%+ test coverage, 35% faster builds).

**Visual:** the line flattens and runs horizontally. Emissions tick past like a real marble
diagram, one per milestone, coloured by the §6 logic.

**Motion:** scroll-linked horizontal travel. Each statistic counts up as its emission
crosses the playhead — driven by scroll position, never by a timer.

**Timeline data** (extracted from `Resume.pdf`, 2026-09-19 — now resolved):

| Period | Role | Company | Location |
|---|---|---|---|
| 10/2016 – 05/2020 | Analyst | Ernst & Young | Kakkanad, India |
| 05/2020 – 02/2022 | Senior Engineer | QBurst | Kakkanad, India |
| 02/2022 – 12/2023 | Senior Angular Developer | SRT Marine Systems PLC | Cardiff, UK |
| 12/2023 – 06/2025 | Senior Engineer | Direct Line Group | Leeds, UK |
| 09/2025 – present | Frontend Developer | Winning Group | Sydney, Australia |

Five emissions, one per engagement. India → UK → Australia substantiates the "3 countries"
claim geographically, which the timeline should make visible rather than assert.

**Ernst & Young is currently absent from the site entirely** — four years, a recognisable
brand, Fortune 500 reporting dashboards serving 5,000+ internal users, and three internal
awards. It belongs here as the origin emission. It does not become a fifth case study
(§9.03 keeps the four strongest); the timeline is where the full history lives.

**The "9+ years" statistic is now wrong.** 10/2016 to 10/2026 is ten years. The counter
should read `10` from October 2026, and the copy should say a decade. Derive it from a
start date constant rather than hard-coding a number that silently rots.

### 03 — Selected Work: `switchMap()`

**Content:** the four enterprise case studies — Winning Group, Direct Line Group, SRT
Marine, QBurst — each as problem / approach / result.

**Visual: generated data diagrams, not screenshots.** Two reasons. The existing screenshots
for these four are only 640px wide, and more importantly these are internal enterprise
systems that are usually NDA-restricted.

Each study gets a diagram generated from the metrics already claimed in `content.ts`:

| Study | Diagram |
|---|---|
| Winning Group | A bundle bar collapsing 100% → 40% |
| Direct Line Group | Five repos converging into one state tree; deploy 45min → 12min |
| SRT Marine | A frame-time graph holding flat at 60fps under load |
| QBurst | A scatter plot resolving one million points |

*Amended 2026-09-25:* the Nx dependency graph originally listed for Winning Group is dropped.
The resume gives it no number, so any node count would be invented. The frame-time trace is
drawn flat, with no simulated samples, and the scatter plots a genuine 1,000,000 seeded points
whose distribution is labelled illustrative.

This is honest, on-brand, sidesteps the NDA problem entirely, and is considerably more
persuasive to a technical lead than a screenshot of a login page.

**Seniority signals belong in the prose**, not only the diagrams. The Direct Line study
must carry "mentored 6 junior and mid-level developers, lifting sprint velocity 20%" — for
senior roles, evidence of raising a team is weighted at least as heavily as any
architecture metric, and it is currently nowhere on the site.

**Motion:** the line runs down the left margin and branches right into each card as it
enters frame.

### 04 — The Ring: `mergeMap()`

**Content:** the shipped freelance work — Daybook, Ezytrack, PLUMBER., TopDel Renovations,
Menzone.

`content.ts` carries them as `ringProjects`. TopDel used to appear twice, once as
`freelanceCaseStudy` as well; that is gone, and the ring is the only home for freelance work.

**Visual:** on a capable desktop, a 3D ring seen from a little above. The rail's split becomes
a **hoop**: a circle of tube at the signal's weight, which the curve meets at its front point.
Each card hangs from the hoop on a drop ending in its `--shipped` emission, so the anatomy is
the rail's with depth. The cards are the server-rendered rail cards, restyled in CSS 3D. The
hoop, drops and glow are drawn in the WebGL scene, and both read one geometry module
(`gfx/ring.ts`). The section **pins** with `position: sticky`, not a GSAP pin, and the line
holds straight down the centre for the whole pin. Scrolling turns the ring one card at a time,
and a pulse runs from the line along the hoop and down the arriving card's drop. **Back cards
fade**: full strength within ±30° of the front, gone by ±110°, and a faded card takes no clicks.
Design and revisions: `2026-10-03-phase-12-3d-ring-design.md` (D1–D3, D6, R1).

**Interaction:** scroll turns the ring, and when the scroll stops inside the pin it settles on
the next card in the direction the reader was going. Dragging the stage turns it too, by
moving the scroll. On hover, the card's long duotone capture (§10)
scrolls inside its frame — which reads as a screen recording at the cost of an image the
card already loads. It moves the image with `transform` at a constant speed, set per card from
the capture's height, and runs on focus as well as hover; under reduced motion the capture
stays at its top. Browser chrome is markup above the frame, showing the site's real hostname.

Every card is a real anchor to the live site. The ring is operable by keyboard: arrow keys
and Tab move focus between cards, and focus moves the ring — a focused card is brought to the
front, so the focus ring is never on a faded card.

**Fallback:** a horizontal scroll-snap rail on phones, short windows, under reduced motion,
and when the WebGL gate fails. A short window is one the ring does not fit: the hoop's back,
a drop and the tallest card must stack below the nav in one viewport, about 790px tall for
the 560px card. Same cards, same content, same links. In the rail **the split is a track**: a horizontal stroke above
the cards at the signal's weight and colour, which the curve meets exactly where it reaches the
centre (control point 34 is pinned to the track's centre line). Each card hangs off the track on
a short drop ending in a `--shipped` emission, and says `shipped · live` in words. The drops sit
inside the scroller and slide with their cards. The whole split is drawn in the HTML; with
script, it draws outward from the meeting point as the signal's tip reaches the track. Left and
Right move focus between cards; every card stays in the Tab order.

### 05 — The Stack: `pipe()`

**Content:** the resume's Skills table, reframed as an operator chain rather than a
proficiency grid. It has exactly five groups — Core, Architecture, Testing, AI tooling,
Also — and `content.ts` carries them as `skillGroups`, in that order, with every item traced
to the table. The tech marquee folds in here: the items it shared with the resume are in the
groups, and the rest of it retires with it.

**AI tooling** — MCP, Figma Code Connect, AI-assisted code review — is one of the five. Given
the roles being targeted in 2026, it earns an operator of its own rather than a line in
"Also".

Each group is a user-defined operator composed in one `pipe(…)`: `core()`,
`architecture()`, `testing()`, `aiTooling()`, `also()`. That is honest RxJS; an identifier
that shadowed a real operator (`map`, `share`, `retry`) would not be, and a test holds the
names to that. A screen reader gets the resume's own group names; the code punctuation is
visual.

**Visual:** the line passes through a series of operator nodes, each activating as the
playhead passes. The stack span keeps its three authored bends. In 2D, each operator row sits
on a hairline rule that carries no text, and the row's node is drawn where the curve crosses
that rule, so the nodes step with the weave and never cover a glyph; between rules the line
runs behind the rows, dimmed. A node is an outline until the signal's tip reaches its rule,
then fills as an emission while the row's identifier comes up from `--type-dim` to `--type`.
The chain is served lit: with JS off there is no line, and each node sits filled at the start
of its rule, which is a marble diagram's own notation. The colour shift and thickness change
on the line itself are per-vertex attributes on `TubeSignal` rather than a second renderer.
Since Phase 10's revision the mesh carries only a per-vertex length (for the reveal); the
effect adds its colour and thickness attributes to the same mesh when it comes, and waits for
the Stack rework (Phase 10 design, D8).

Proficiency labels ("Expert", "Advanced") are dropped, including the resume's own
"(Expert)". Self-assessed skill ratings read as filler to a hiring manager; the case-study
metrics do that job properly.

### 06 — Contact: `subscribe()`

**Headline:** "Nothing happens until you subscribe."

**Content:** the contact form (Formspree, via `PUBLIC_FORMSPREE_ENDPOINT`), direct email,
socials, CV download. A single short line acknowledging freelance availability, linking to
`/websites`.

**Form:** rebuilt in vanilla TypeScript with native constraint validation plus a small
validation layer. Replaces `ContactForm.tsx` and removes React, `react-hook-form`,
`@hookform/resolvers`, and `zod` from the bundle.

**Visual:** a final emission, then the `|` completion bar carrying into the footer.

### Nav and Footer

**Nav:** minimal and persistent. Section links, the sound toggle, and **CV download always
visible** — it is a primary conversion for this audience, not a footer link.

**Footer:** the `|` completion marker, meta, socials, colophon naming the stack.

---

## 10. Visual Assets

The concept is deliberately asset-light. Almost everything is generated at runtime.

| Asset | Source |
|---|---|
| Signal tube, emissions, particle portrait, ring | Generated — Three.js |
| Marble diagram, counting stats, case-study diagrams | Generated — SVG / canvas |
| Operator glyphs, completion bar, signal mark, favicon | Hand-authored SVG |
| Grain and noise | Procedural |
| Ring card imagery | Existing screenshots, reprocessed |
| OG image | Generated at build time with `sharp` |

**Screenshot treatment pipeline** (`scripts/optimise-gallery.mjs`): each ring capture is a
full-height duotone from `--ground` to `--type`, because red means *live* in §6 and five red
slabs would compete with the line for it. There is no baked grain, because the page grain
layer already paints over every card and noise is what AVIF and WebP compress worst. There
is no baked browser chrome either: the capture scrolls inside its frame, so the chrome has
to stay still, which makes it markup and lets the real domain appear as text. Each capture
ships as AVIF + WebP at 480w (1x) and 960w (2x), and its size is recorded in
`src/data/ring-captures.json` for `width`/`height` and a constant-speed hover scroll. Nine
mismatched screenshots become one system. `/websites` keeps its plain-colour hero crops
(§14).

The hero still follows the same rule (Phase 11, D2): `--ground` to `--type`, cream, not red.
Red mapped onto a face read as horror, and the still is also the particle portrait's only
source — the particles are sampled from its pixels at runtime and earn their red only as they
join the line.

**No video.** It is the heaviest thing that can go on a page and the entire pitch is
performance; a recruiter can click through to five live sites instead. The hover-scroll
trick on the ring cards covers the motion need at no additional asset cost.

---

## 11. Technical Architecture

```
src/
  lib/
    signal/       path.ts — ONE canonical curve; SvgSignal; TubeSignal
    motion/       lenis setup, gsap master timeline, section registration
    audio/        web audio engine (lazy, never fetched unless toggled)
    gfx/          three.js scenes — tube, particles, ring; capability gate
  islands/        vanilla TS entry points, one per interactive section
  components/     .astro section components
  data/           content.ts (rewritten), websites.ts
  styles/         tokens.css, global.css
scripts/          sharp pipelines — gallery, portrait, og image
```

**Principles**

1. Astro renders every section to static HTML. Islands hydrate behaviour onto existing
   markup; they never render content.
2. `lib/signal/path.ts` is the single source of truth for the curve. Adding a renderer must
   not require redefining geometry.
3. The Three.js modules live behind a dynamic `import()` behind the capability gate. They
   are never in the initial graph.
4. No UI framework. No React, Preact, Vue, or Svelte.

**Dependencies removed:** `react`, `react-dom`, `@astrojs/react`, `@types/react`,
`@types/react-dom`, `react-hook-form`, `@hookform/resolvers`, `zod`, `@astrojs/tailwind`,
`tailwindcss`.

Tailwind goes because the new system is token-driven CSS with a small set of primitives.
Retaining a utility framework to write six components is not worth the build weight. This
is a reversible call — flag it at planning if it looks wrong.

**Retained:** `astro`, `@astrojs/sitemap`, `sharp`. **Added:** `three`, `gsap`, `lenis`.

---

## 12. Performance Budget

Performance is not a nice-to-have here; it is the argument.

| Metric | Budget |
|---|---|
| Lighthouse mobile Performance | ≥ 95 |
| LCP (simulated 4G mobile) | ≤ 2.0s |
| CLS | < 0.02 |
| INP | < 200ms |
| Base-path JS (gzip) | ≤ 80KB |
| Enhanced WebGL chunk (gzip) | ≤ 250KB, post-interactive, never blocking |
| Render-blocking JS above the fold | 0 |

The enhanced chunk is genuinely heavy — a tree-shaken Three.js core is roughly 150KB gzip
before anything else. That weight is the entire reason for gating rather than assuming.

**WebGL capability gate.** All must pass:

- `prefers-reduced-motion: no-preference`
- Viewport width ≥ 900px
- `navigator.connection.saveData !== true`
- `navigator.hardwareConcurrency >= 4`
- WebGL2 context available
- A short frame-budget probe passes

Loaded only after the page is interactive. Any failure produces the 2D path — same
choreography, same content, no apology.

---

## 13. Accessibility

Target **WCAG 2.2 AA**.

- Every word is in the server-rendered HTML. The site is fully readable with JavaScript
  disabled. Motion is enhancement, never delivery.
- `prefers-reduced-motion: reduce` turns all scroll choreography into instant state
  changes, skips the preloader, and swaps the particle portrait for the baked still.
- The ring is keyboard-operable: arrow keys and Tab move focus, and focus brings a card to the
  front of the 3D ring. Every card is a real `<a>`.
- Focus indicators are high-contrast against warm black and never suppressed.
- Audio is off by default; the toggle is a real `<button>` with `aria-pressed`.
- Counting statistics expose their final value to assistive technology immediately rather
  than announcing intermediate numbers.
- `--signal` is restricted to large text, CTAs, and graphics (§7.1).
- Emission colour is never the sole carrier of meaning — state is also in text.

---

## 14. `/websites`

The freelance landing page is kept and restyled into the new system, in a deliberately
lighter treatment:

**Inherits:** warm black and signal red, Archivo / JetBrains Mono, the drawn line in 2D
only.

**Does not get:** the particle portrait, the 3D ring, WebGL of any kind, audio.

A local business owner comparing quotes needs to find a phone number, not a WebGL portrait.
The lighter treatment is the correct design, not a budget compromise.

This keeps a working lead funnel that is SEO-targeted at a completely different keyword set
from "senior angular engineer", and ensures no page on the site looks abandoned.

---

## 15. Non-Goals

- No blog or CMS.
- No internationalisation.
- No light/dark toggle. The site is dark; that is the design.
- No video.
- No testimonials until real client quotes exist.
- Not rebuilt in Angular. Astro with zero framework is the correct tool for a static
  content site, and choosing correctly is itself the signal.
- No third-party analytics beyond what is already in place.

---

## 16. Required Inputs From Noel

**All three original inputs are resolved as of 2026-09-19.**

1. ~~Timeline data~~ — **resolved.** Extracted from `Resume.pdf` (root, untracked).
   See the table in §9.02.
2. ~~`ezytrack` re-capture~~ — **resolved.** `gallery-masters/ezytrack2.jpg` supplied at
   2704×14756, which comfortably clears the ring-card requirement. It supersedes the 640px
   `ezytrack.jpg`. Note the file is PNG data despite a `.jpg` extension and is ~15MB; the
   `sharp` pipeline must handle both facts.
3. ~~Metric confirmation~~ — **resolved.** Every claim verified against the resume, and the
   resume carries several stronger ones not currently on the site: $15k/year technical debt
   eliminated, an order management system handling 10,000+ daily transactions at zero
   critical downtime, 20% runtime memory improvement, production bugs down 25% YoY, and
   code review cycles down 15%.

**One housekeeping item.** `Resume.pdf` sits untracked in the repo root while
`public/noel-sebastian.pdf` is the file the site actually serves, and the two differ. The
served CV must be reconciled with the current resume before launch, and only one of them
should survive.

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| Concept reads as gimmick to a non-technical recruiter | Every operator is paired with a plain-English section name. Wayfinding never depends on knowing RxJS. |
| Heavy build harms the primary audience on mobile | §12 gate. The 2D path is the default on mobile, not a fallback. |
| Wrong RxJS semantics embarrass him with the exact audience he wants | §4 table is normative. Operator choices are reviewed before build. |
| Generated diagrams look thin next to real screenshots | They visualise real claimed metrics. If a diagram cannot be built honestly from a real number, the study reverts to prose. |
| Scope is large for one person | The plan sequences the 2D path first as a shippable site; WebGL layers on afterwards. |
| Tailwind removal is disruptive mid-build | Reversible. Re-evaluate at planning. |
