# Phase 14 — `/websites` Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/websites` on the Signal Path system — one Astro component per section, no Tailwind, no new JS — and put it back live.

**Architecture:** `src/pages/websites.astro` keeps the SEO (title, description, two JSON-LD blocks) and composes seven section components from `src/components/websites/`. Each component renders from `src/data/websites.ts` (unchanged) with scoped BEM styles; three shared primitives (buttons, dot list, panel, content box) live in `src/styles/websites.css`, imported by the page only. The signal line is untouched.

**Tech Stack:** Astro 5 (static), plain CSS with the tokens in `src/styles/tokens.css`, vanilla TS islands.

**Spec:** `docs/superpowers/specs/2026-10-07-phase-14-websites-design.md` (parent: `docs/superpowers/specs/2026-09-19-signal-path-design.md` §14).

## Global Constraints

- No UI framework, no Tailwind. No class from the old Tailwind set may survive (`font-bricolage`, `text-ink`, `bg-cream`, `rounded-full`, `sm:` / `md:` / `lg:` prefixes).
- Astro renders content; the only scripts on the page are BaseLayout's and `mountContactForms()`. The nav ships **no** script.
- Content is frozen: every string, price and project comes from `src/data/websites.ts`, untouched. Section markers and the few headings that already live in markup (`Sites I've built`, `Four steps, no surprises`, `Questions people ask`, `Tell me about the job`, the contact lede, the concept note) are copied verbatim.
- Never invent anything — no phone number, no client counts, no reviews.
- Neither font has `→`, `↗` or `✓`; none may appear in this page's output.
- Tokens only (`--ground`, `--ground-lift`, `--type`, `--type-dim`, `--signal`, `--s-*`, `--radius`, `--container`, `--z-nav`, `--font-*`); no new hex values.
- `npm run build` is the gate before every commit. Do not add commit trailers.

## Review Focus

1. **Phone widths (320 / 375):** no horizontal page scroll; the nav's link row scrolls inside itself, and the sticky nav's height stays under `html`'s `scroll-padding-top` so anchor jumps do not land under it — Task 1 Step 9 measures it.
2. **JS off:** every section reads, every `<details>` opens, the form posts to Formspree. Task 1 Step 10.
3. **Keyboard:** every link, button and `<summary>` shows the focus ring, including the primary buttons (the ring is `--signal`; on a `--signal` button it is switched to `--type`). Task 1 Step 9.
4. **The project list changes later:** if `websitesWork` holds no client build, the hero drops to one column rather than rendering an empty frame. Task 1 Step 8 checks the `--solo` branch by build-time reasoning and the class in the output.
5. **Text over the line:** the hero copy and section heads sit on bare `--ground` where the curve runs dim; panels are opaque. Task 1 Step 9 checks legibility at 1440 and 375.

---

### Task 1: The restyled page

**Files:**
- Create: `src/styles/websites.css`
- Create: `src/components/websites/SectionHead.astro`
- Create: `src/components/websites/Hero.astro`
- Create: `src/components/websites/Offer.astro`
- Create: `src/components/websites/Work.astro`
- Create: `src/components/websites/Pricing.astro`
- Create: `src/components/websites/Process.astro`
- Create: `src/components/websites/Faq.astro`
- Create: `src/components/websites/Quote.astro`
- Modify (rewrite): `src/components/WebsitesNav.astro`
- Modify (rewrite): `src/pages/websites.astro`

**Interfaces:**
- Consumes: `websitesNav`, `websitesHero`, `websitesWhat`, `websitesWork`, `websitesPricing`, `websitesProcess`, `websitesFaq` from `src/data/websites.ts`; `CONTACT_EMAIL` from `src/lib/contact-form.ts`; `ContactForm.astro` (`lookingFor="project"`); `Footer.astro` (`tagline`, `showSocials`, `showColophon`); BaseLayout's `#new-tab-note`.
- Produces: global classes `.w-inner`, `.w-section`, `.w-panel`, `.w-btn`, `.w-btn--ghost`, `.w-btn--small`, `.w-ticks`, `.w-sr`; `SectionHead` props `{ id: string; marker: string; title: string; lede?: string }`; section ids `#what #work #pricing #process #faq #contact` (the nav's anchors).

There are no unit tests for Astro components in this repo (Vitest covers pure modules only). The test cycle for this task is: build, then assert on `dist/websites/index.html`, then a browser check.

- [ ] **Step 1: Write the failing output check**

Create the check as a scratch script (not committed) at `$TMPDIR/websites-check.mjs`:

```js
// Asserts on the built /websites page. Run after `npm run build`.
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/websites/index.html', 'utf8');
const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

for (const banned of ['font-bricolage', 'text-ink', 'bg-cream', 'rounded-full', 'md:', 'lg:', 'sm:grid', 'data-reveal', 'wnav-btn', '→', '↗', '✓']) {
  expect(!html.includes(banned), `still contains ${JSON.stringify(banned)}`);
}
for (const id of ['what', 'work', 'pricing', 'process', 'faq', 'contact']) {
  expect(html.includes(`id="${id}"`), `missing section #${id}`);
}
expect((html.match(/<h1[\s>]/g) ?? []).length === 1, 'expected exactly one <h1>');
expect(html.includes('"@type":"ProfessionalService"'), 'ProfessionalService schema missing');
expect(html.includes('"@type":"FAQPage"'), 'FAQPage schema missing');
expect((html.match(/<details/g) ?? []).length === 6, 'expected six FAQ <details>');
expect((html.match(/class="[^"]*w-panel[^"]*work__card/g) ?? []).length === 4, 'expected four work cards');
expect(html.includes('class="w-btn w-btn--small w-nav__cta"'), 'nav quote button missing');
expect(html.includes('data-contact-form'), 'quote form missing');
expect(html.includes('hero__sample'), 'hero sample missing (TopDel is a client build)');
expect(html.includes('topdelrenovation.com.au'), 'hero host label missing');

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join('\n'));
  process.exit(1);
}
console.log('websites-check: all assertions pass');
```

- [ ] **Step 2: Run it against today's page to see it fail**

Run: `npm run build && node $TMPDIR/websites-check.mjs`
Expected: FAIL lines for `font-bricolage`, `text-ink`, `data-reveal`, `wnav-btn`, `→`, the nav quote button, the work cards and the hero sample.

- [ ] **Step 3: Create `src/styles/websites.css`**

```css
/*
 * /websites' shared primitives. Imported only by src/pages/websites.astro, so nothing here
 * reaches the home page. Each section's layout lives in its own component's scoped styles;
 * this file holds only what several of them share.
 */

/* The home page's content box (SelectedWork.astro), without the signal gutter. */
.w-inner {
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--s-5);
}

/* Tighter than home's --section-y: seven short sections in a funnel, not a story. */
.w-section {
  padding-top: clamp(var(--s-8), 9vw, var(--s-10));
}

/* Opaque, like the ring's cards: the line passes behind a panel, never under its text. */
.w-panel {
  border: 1px solid color-mix(in srgb, var(--type) 10%, transparent);
  border-radius: var(--radius);
  background: var(--ground-lift);
  transition: border-color 0.2s;
}

/* ── Buttons — ContactForm's submit, as a link ──────────────────────────────────────── */

.w-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--s-4) var(--s-6);
  border: 1px solid var(--signal);
  border-radius: var(--radius);
  background: var(--signal);
  color: var(--ground);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.w-btn:hover {
  border-color: var(--type);
  background: var(--type);
}

/* The global ring is --signal; on a --signal button only its offset would read. */
.w-btn:focus-visible {
  outline-color: var(--type);
}

.w-btn--ghost {
  border-color: color-mix(in srgb, var(--type) 24%, transparent);
  background: transparent;
  color: var(--type);
}

.w-btn--ghost:hover {
  border-color: var(--type);
  background: transparent;
}

.w-btn--ghost:focus-visible {
  outline-color: var(--signal);
}

.w-btn--small {
  padding: var(--s-3) var(--s-4);
  font-size: 12px;
}

/* ── Tick lists — neither face has ✓, so the tick is an emission dot ──────────────── */

.w-ticks {
  display: grid;
  gap: var(--s-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.w-ticks > li {
  position: relative;
  padding-left: var(--s-5);
  line-height: 1.5;
}

/* Centred on the first line: half of a 1.5 line box is 0.75em; the dot is 8px. */
.w-ticks > li::before {
  content: '';
  position: absolute;
  top: calc(0.75em - 4px);
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--signal);
}

/* Read by a screen reader, not drawn: disambiguates repeated link text. */
.w-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

- [ ] **Step 4: Create `src/components/websites/SectionHead.astro`**

```astro
---
/**
 * The head every /websites section opens with: a dim mono marker, the title, an optional
 * lede. The home page's house voice in plain English — this page's reader is a business
 * owner, so the markers are words, not operators, and they are uppercased like the nav.
 *
 * `id` lands on the title so the section can be `aria-labelledby` it.
 */
interface Props {
  id: string;
  marker: string;
  title: string;
  lede?: string;
}

const { id, marker, title, lede } = Astro.props;
---

<header class="head">
  <p class="head__marker">{marker}</p>
  <h2 class="head__title" id={id}>{title}</h2>
  {lede && <p class="head__lede">{lede}</p>}
</header>

<style>
  .head {
    max-width: 62ch;
  }

  .head__marker {
    margin: 0;
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .head__title {
    margin: var(--s-4) 0 0;
    color: var(--type);
    font-family: var(--font-display);
    font-size: clamp(30px, 3.6vw, 52px);
    font-stretch: 125%;
    font-weight: 700;
    line-height: 0.96;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    text-wrap: balance;
  }

  .head__lede {
    max-width: 52ch;
    margin: var(--s-5) 0 0;
    color: var(--type-dim);
    font-size: clamp(15px, 1.15vw, 17px);
    line-height: 1.6;
  }
</style>
```

- [ ] **Step 5: Rewrite `src/components/WebsitesNav.astro`**

```astro
---
/**
 * Nav for /websites. Separate from Nav.astro because that one's links point at the home
 * page's sections — reusing it here would give a business owner a menu of pages about
 * Angular experience.
 *
 * Zero JavaScript, like Nav.astro: no hamburger. The quote button is this page's one
 * conversion, so it is never behind a menu. Below 900px the section links take their own
 * row, and below that row's natural width they scroll sideways inside it rather than
 * wrapping into a nav three rows deep — the nav is sticky, and every row it grows is
 * screen a phone loses.
 */
import { websitesNav } from '../data/websites';
---

<nav class="w-nav" aria-label="Primary">
  <div class="w-nav__inner">
    <a class="w-nav__brand" href="#top">
      <img src="/favicon.svg" width="26" height="26" alt="" />
      <span class="w-nav__name">Noel Sebastian</span>
    </a>

    <ul class="w-nav__links" role="list">
      {websitesNav.map((link) => (
        <li>
          <a class="w-nav__link" href={link.href}>{link.label}</a>
        </li>
      ))}
    </ul>

    <a class="w-btn w-btn--small w-nav__cta" href="#contact">Get a quote</a>
  </div>
</nav>

<style>
  .w-nav {
    position: sticky;
    top: 0;
    z-index: var(--z-nav);
    border-bottom: 1px solid color-mix(in srgb, var(--type) 10%, transparent);
    /* Fallback first, as Nav.astro: a nav with no background would let the line run
       through the links. */
    background: var(--ground);
    background: color-mix(in srgb, var(--ground) 84%, transparent);
    backdrop-filter: blur(10px);
  }

  .w-nav__inner {
    display: grid;
    grid-template-areas: 'brand links cta';
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--s-3) var(--s-6);
    max-width: var(--container);
    margin: 0 auto;
    padding: var(--s-3) var(--s-5);
  }

  .w-nav__brand {
    display: inline-flex;
    grid-area: brand;
    align-items: center;
    gap: var(--s-3);
    color: var(--type);
    text-decoration: none;
  }

  .w-nav__name {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.2px;
    white-space: nowrap;
  }

  .w-nav__links {
    display: flex;
    grid-area: links;
    justify-content: center;
    gap: var(--s-5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .w-nav__link {
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 1px;
    text-decoration: none;
    text-transform: uppercase;
    white-space: nowrap;
    transition: color 0.2s;
  }

  .w-nav__link:hover {
    color: var(--type);
  }

  .w-nav__cta {
    grid-area: cta;
    white-space: nowrap;
  }

  @media (max-width: 899px) {
    .w-nav__inner {
      grid-template-areas:
        'brand cta'
        'links links';
      grid-template-columns: minmax(0, 1fr) auto;
    }

    /* Bleeds to the screen edges so a link scrolled under them is visibly cut, which is
       the cue that the row scrolls. The block padding is room for the focus ring, which
       an overflow container would otherwise clip. */
    .w-nav__links {
      justify-content: flex-start;
      margin-inline: calc(-1 * var(--s-5));
      padding: var(--s-1) var(--s-5);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .w-nav__links::-webkit-scrollbar {
      display: none;
    }
  }
</style>
```

- [ ] **Step 6: Create the seven section components**

`src/components/websites/Hero.astro`:

```astro
---
/**
 * The hero: what this is, the next step, and a real site beside it. A business owner
 * judges a web developer by the work, so the first client build in `websitesWork` sits in
 * the second column rather than below the fold. Read from the data, so when the project
 * list changes the hero follows — and a list with no client build renders one column
 * instead of an empty frame.
 *
 * Every card capture is the top 900×495 of its site (scripts/optimise-gallery.mjs), so
 * the dimensions are constants, not per-project data.
 */
import { websitesHero as hero, websitesWork } from '../../data/websites';

const featured = websitesWork.find((project) => !project.concept);
const featuredHost = featured ? new URL(featured.site).hostname.replace(/^www\./, '') : '';
---

<section class:list={['hero', { 'hero--solo': !featured }]} aria-labelledby="hero-title">
  <div class="w-inner hero__inner">
    <div class="hero__copy">
      <p class="hero__eyebrow">{hero.eyebrow}</p>
      <h1 class="hero__title" id="hero-title">{hero.headline}</h1>
      <p class="hero__sub">{hero.sub}</p>

      <div class="hero__actions">
        <a class="w-btn" href={hero.primaryCta.href}>{hero.primaryCta.label}</a>
        <a class="w-btn w-btn--ghost" href={hero.secondaryCta.href}>{hero.secondaryCta.label}</a>
      </div>

      <ul class="w-ticks hero__facts" role="list">
        {hero.facts.map((fact) => <li>{fact}</li>)}
      </ul>
    </div>

    {featured && (
      <figure class="hero__sample">
        <a
          class="hero__frame"
          href={featured.site}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="new-tab-note"
        >
          <span class="hero__bar" aria-hidden="true">
            <span class="hero__dot"></span>
            <span class="hero__dot"></span>
            <span class="hero__dot"></span>
            <span class="hero__host">{featuredHost}</span>
          </span>
          <img
            class="hero__shot"
            src={featured.img}
            width="900"
            height="495"
            alt={`Screenshot of the ${featured.title} website`}
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
        </a>
        <figcaption class="hero__caption">
          <span class="hero__kind">{featured.kind}</span>
          <span class="hero__name">{featured.title}</span>
        </figcaption>
      </figure>
    )}
  </div>
</section>

<style>
  .hero {
    padding-block: clamp(var(--s-8), 8vw, var(--s-10)) clamp(var(--s-4), 2vw, var(--s-6));
  }

  .hero__inner {
    display: grid;
    align-items: center;
    gap: var(--s-8);
  }

  @media (min-width: 960px) {
    .hero__inner {
      grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
      gap: var(--s-9);
    }

    .hero--solo .hero__inner {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .hero__eyebrow {
    margin: 0;
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .hero__title {
    margin: var(--s-5) 0 0;
    color: var(--type);
    font-family: var(--font-display);
    font-size: clamp(36px, 4.6vw, 68px);
    font-stretch: 125%;
    font-weight: 700;
    line-height: 0.94;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    text-wrap: balance;
  }

  .hero__sub {
    max-width: 54ch;
    margin: var(--s-5) 0 0;
    color: var(--type-dim);
    font-size: clamp(16px, 1.25vw, 19px);
    line-height: 1.6;
  }

  .hero__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-3);
    margin-top: var(--s-6);
  }

  .hero__facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-3) var(--s-6);
    margin-top: var(--s-6);
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 12.5px;
  }

  .hero__sample {
    margin: 0;
  }

  .hero__frame {
    display: block;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--type) 14%, transparent);
    border-radius: var(--radius);
    background: var(--ground-lift);
    transition: border-color 0.2s;
  }

  .hero__frame:hover {
    border-color: var(--signal);
  }

  .hero__bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: var(--s-2) var(--s-3);
    border-bottom: 1px solid color-mix(in srgb, var(--type) 10%, transparent);
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .hero__dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--type) 22%, transparent);
  }

  .hero__host {
    min-width: 0;
    margin-left: var(--s-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero__shot {
    display: block;
    width: 100%;
    height: auto;
  }

  .hero__caption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--s-2) var(--s-4);
    margin-top: var(--s-3);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .hero__kind {
    color: var(--type-dim);
  }

  .hero__name {
    color: var(--type);
  }
</style>
```

`src/components/websites/Offer.astro`:

```astro
---
/** 01 — What you get: the six foundations every build ships with. */
import SectionHead from './SectionHead.astro';
import { websitesWhat as what } from '../../data/websites';
---

<section class="w-section offer" id="what" aria-labelledby="what-title">
  <div class="w-inner">
    <SectionHead id="what-title" marker="01 — What you get" title={what.title} lede={what.intro} />

    <ul class="offer__grid" role="list">
      {what.items.map((item) => (
        <li class="w-panel offer__item">
          <span class="offer__no" aria-hidden="true">{item.no}</span>
          <h3 class="offer__title">{item.title}</h3>
          <p class="offer__body">{item.body}</p>
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .offer__grid {
    display: grid;
    gap: var(--s-4);
    margin: clamp(var(--s-6), 4vw, var(--s-7)) 0 0;
    padding: 0;
    list-style: none;
  }

  @media (min-width: 640px) {
    .offer__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .offer__grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .offer__item {
    padding: var(--s-6);
  }

  .offer__no {
    color: var(--signal);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  .offer__title {
    margin: var(--s-4) 0 var(--s-3);
    color: var(--type);
    font-family: var(--font-display);
    font-size: 20px;
    font-stretch: 112%;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .offer__body {
    margin: 0;
    color: var(--type-dim);
    font-size: 15px;
    line-height: 1.6;
  }
</style>
```

`src/components/websites/Work.astro`:

```astro
---
/**
 * 02 — Recent work. Each card's capture is also a link to the live site, but out of the
 * tab order and the accessibility tree: the "Open the site" button is the one real target,
 * so a keyboard or screen-reader user meets each site once, not twice.
 */
import SectionHead from './SectionHead.astro';
import { websitesWork as work } from '../../data/websites';
---

<section class="w-section work" id="work" aria-labelledby="work-title">
  <div class="w-inner">
    <SectionHead
      id="work-title"
      marker="02 — Recent work"
      title="Sites I've built"
      lede="Open any of them on your phone. That is the honest test — how it feels in the hand, and how long it takes to appear."
    />

    <ul class="work__grid" role="list">
      {work.map((project) => (
        <li class="w-panel work__card">
          <a class="work__shot" href={project.site} target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">
            <img
              src={project.img}
              width="900"
              height="495"
              alt={`Screenshot of the ${project.title} website`}
              loading="lazy"
              decoding="async"
            />
          </a>
          <div class="work__body">
            <p class="work__meta">
              <span>{project.kind}</span>
              {project.concept && <span class="work__badge">Concept</span>}
            </p>
            <h3 class="work__title">{project.title}</h3>
            <p class="work__desc">{project.desc}</p>
            <a
              class="w-btn w-btn--ghost w-btn--small work__link"
              href={project.site}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby="new-tab-note"
            >
              Open the site<span class="w-sr">: {project.title}</span>
            </a>
          </div>
        </li>
      ))}
    </ul>

    <p class="work__note">
      Builds marked <strong>concept</strong> were made on my own initiative rather than for a
      paying client — the code and the craft are identical, and I would rather label them than
      let you assume otherwise.
    </p>
  </div>
</section>

<style>
  .work__grid {
    display: grid;
    gap: var(--s-5);
    margin: clamp(var(--s-6), 4vw, var(--s-7)) 0 0;
    padding: 0;
    list-style: none;
  }

  @media (min-width: 768px) {
    .work__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .work__card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .work__card:hover {
    border-color: var(--signal);
  }

  .work__shot {
    display: block;
    border-bottom: 1px solid color-mix(in srgb, var(--type) 10%, transparent);
  }

  .work__shot img {
    display: block;
    width: 100%;
    height: auto;
  }

  .work__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    padding: var(--s-6);
  }

  .work__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
    margin: 0;
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 11.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .work__badge {
    padding: 2px var(--s-2);
    border: 1px solid color-mix(in srgb, var(--type) 24%, transparent);
    border-radius: var(--radius);
    font-size: 10.5px;
  }

  .work__title {
    margin: var(--s-3) 0 var(--s-3);
    color: var(--type);
    font-family: var(--font-display);
    font-size: clamp(22px, 2vw, 26px);
    font-stretch: 112%;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }

  .work__desc {
    margin: 0 0 var(--s-6);
    color: var(--type-dim);
    font-size: 15px;
    line-height: 1.6;
  }

  .work__link {
    margin-top: auto;
  }

  .work__note {
    max-width: 62ch;
    margin: var(--s-6) 0 0;
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.7;
  }

  .work__note strong {
    color: var(--type);
  }
</style>
```

`src/components/websites/Pricing.astro`:

```astro
---
/**
 * 03 — Pricing. The featured tier carries the signal border and the "Most common" tag; the
 * others' quote buttons are ghosts, so the eye lands on one choice, not three.
 */
import SectionHead from './SectionHead.astro';
import { websitesPricing as pricing } from '../../data/websites';
---

<section class="w-section pricing" id="pricing" aria-labelledby="pricing-title">
  <div class="w-inner">
    <SectionHead id="pricing-title" marker="03 — Pricing" title={pricing.title} lede={pricing.intro} />

    <ul class="pricing__tiers" role="list">
      {pricing.tiers.map((tier) => (
        <li class:list={['w-panel', 'pricing__tier', { 'pricing__tier--featured': tier.featured }]}>
          {tier.featured && <p class="pricing__tag">Most common</p>}
          <h3 class="pricing__name">{tier.name}</h3>
          <p class="pricing__summary">{tier.summary}</p>
          <p class="pricing__price">{tier.price}</p>
          <p class="pricing__timeline">{tier.timeline}</p>
          <ul class="w-ticks pricing__includes" role="list">
            {tier.includes.map((line) => <li>{line}</li>)}
          </ul>
          <a class:list={['w-btn', 'pricing__cta', { 'w-btn--ghost': !tier.featured }]} href="#contact">
            Get a quote<span class="w-sr">: {tier.name}</span>
          </a>
        </li>
      ))}
    </ul>

    <div class="w-panel pricing__extras">
      <h3 class="pricing__extras-title">Add-ons</h3>
      <dl class="pricing__addons">
        {pricing.addOns.map((addOn) => (
          <div class="pricing__addon">
            <dt>{addOn.label}</dt>
            <dd>{addOn.price}</dd>
          </div>
        ))}
      </dl>
      <p class="pricing__note">{pricing.note}</p>
    </div>
  </div>
</section>

<style>
  .pricing__tiers {
    display: grid;
    gap: var(--s-4);
    margin: clamp(var(--s-6), 4vw, var(--s-7)) 0 0;
    padding: 0;
    list-style: none;
  }

  @media (min-width: 960px) {
    .pricing__tiers {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .pricing__tier {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--s-6);
  }

  .pricing__tier--featured {
    border-color: var(--signal);
  }

  .pricing__tag {
    position: absolute;
    top: var(--s-6);
    right: var(--s-6);
    margin: 0;
    padding: 3px var(--s-2);
    border-radius: var(--radius);
    background: var(--signal);
    color: var(--ground);
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pricing__name {
    margin: 0;
    color: var(--type);
    font-family: var(--font-display);
    font-size: 22px;
    font-stretch: 112%;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .pricing__summary {
    margin: var(--s-2) 0 0;
    color: var(--type-dim);
    font-size: 15px;
    line-height: 1.55;
  }

  .pricing__price {
    margin: var(--s-6) 0 0;
    color: var(--type);
    font-family: var(--font-display);
    font-size: clamp(28px, 2.6vw, 38px);
    font-stretch: 112%;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .pricing__timeline {
    margin: var(--s-3) 0 0;
    color: var(--signal);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pricing__includes {
    margin: var(--s-6) 0 var(--s-7);
    color: var(--type-dim);
    font-size: 15px;
  }

  .pricing__cta {
    margin-top: auto;
  }

  .pricing__extras {
    margin-top: var(--s-4);
    padding: var(--s-6);
  }

  .pricing__extras-title {
    margin: 0 0 var(--s-4);
    color: var(--type-dim);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pricing__addons {
    margin: 0;
  }

  .pricing__addon {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--s-1) var(--s-5);
    padding-block: var(--s-3);
    border-bottom: 1px solid color-mix(in srgb, var(--type) 8%, transparent);
  }

  .pricing__addon:first-child {
    padding-top: 0;
  }

  .pricing__addon dt {
    color: var(--type);
    font-size: 15px;
  }

  .pricing__addon dd {
    margin: 0;
    color: var(--type);
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

  .pricing__note {
    max-width: 72ch;
    margin: var(--s-5) 0 0;
    color: var(--type-dim);
    font-size: 14px;
    line-height: 1.6;
  }
</style>
```

`src/components/websites/Process.astro`:

```astro
---
/**
 * 04 — How it works. The four steps sit on one hairline with a node per step — the signal's
 * emissions, without the vocabulary. Horizontal from 960px, vertical below. Pure CSS.
 */
import SectionHead from './SectionHead.astro';
import { websitesProcess as steps } from '../../data/websites';
---

<section class="w-section process" id="process" aria-labelledby="process-title">
  <div class="w-inner">
    <SectionHead id="process-title" marker="04 — How it works" title="Four steps, no surprises" />

    <ol class="process__steps" role="list">
      {steps.map((step) => (
        <li class="process__step">
          <span class="process__node" aria-hidden="true"></span>
          <span class="process__no" aria-hidden="true">{step.no}</span>
          <h3 class="process__title">{step.title}</h3>
          <p class="process__body">{step.body}</p>
        </li>
      ))}
    </ol>
  </div>
</section>

<style>
  .process__steps {
    --node: 13px;

    display: grid;
    gap: var(--s-7);
    margin: clamp(var(--s-6), 4vw, var(--s-7)) 0 0;
    padding: 0 0 0 var(--s-7);
    list-style: none;
  }

  .process__step {
    position: relative;
  }

  /* The track, one segment per step, from this node's centre to the next one's — so it
     starts and ends on a node at every width rather than running past the last step's
     text. Painted before the step's own children, so each hollow node sits over its own
     segment, and the next step's node over this segment's end. */
  .process__step:not(:last-child)::before {
    content: '';
    position: absolute;
    top: calc(2px + var(--node) / 2);
    bottom: calc(-1 * (var(--s-7) + 2px + var(--node) / 2));
    left: calc(-1 * var(--s-7) + var(--node) / 2 - 0.5px);
    width: 1px;
    background: color-mix(in srgb, var(--type) 18%, transparent);
  }

  /* Hollow, like an emission the tip has not reached; opaque so the track stops at it. */
  .process__node {
    position: absolute;
    top: 2px;
    left: calc(-1 * var(--s-7));
    width: var(--node);
    height: var(--node);
    box-sizing: border-box;
    border: 2px solid var(--signal);
    border-radius: 50%;
    background: var(--ground);
  }

  .process__no {
    color: var(--signal);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  .process__title {
    margin: var(--s-3) 0 var(--s-3);
    color: var(--type);
    font-family: var(--font-display);
    font-size: 20px;
    font-stretch: 112%;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .process__body {
    max-width: 48ch;
    margin: 0;
    color: var(--type-dim);
    font-size: 15px;
    line-height: 1.6;
  }

  @media (min-width: 960px) {
    .process__steps {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--s-6);
      padding: 0;
    }

    .process__step:not(:last-child)::before {
      top: calc(var(--node) / 2 - 0.5px);
      right: calc(-1 * (var(--s-6) + var(--node) / 2));
      bottom: auto;
      left: calc(var(--node) / 2);
      width: auto;
      height: 1px;
    }

    /* In flow above the number, but still positioned, so it paints over the segment. */
    .process__node {
      position: relative;
      top: auto;
      left: auto;
      display: block;
      margin-bottom: var(--s-5);
    }
  }
</style>
```

Check in the browser (Step 9): at 375 and 1440 the track starts at node 01's centre and ends at node 04's; no line shows inside a node or past the last one.

`src/components/websites/Faq.astro`:

```astro
---
/**
 * 05 — FAQ. Native `<details>`, so every answer opens with JS off. From 960px the head is
 * sticky in its own column while the questions scroll past it.
 *
 * The +/× is drawn in CSS: `+` is in both faces, but a drawn mark rotates about its true
 * centre, where a glyph rotates about its em box.
 */
import SectionHead from './SectionHead.astro';
import { websitesFaq as faq } from '../../data/websites';
---

<section class="w-section faq" id="faq" aria-labelledby="faq-title">
  <div class="w-inner faq__inner">
    <div class="faq__head">
      <SectionHead id="faq-title" marker="05 — FAQ" title="Questions people ask" />
    </div>

    <div class="faq__list">
      {faq.map((item) => (
        <details class="faq__item">
          <summary class="faq__question">
            <span>{item.q}</span>
            <span class="faq__icon" aria-hidden="true"></span>
          </summary>
          <p class="faq__answer">{item.a}</p>
        </details>
      ))}
    </div>
  </div>
</section>

<style>
  .faq__inner {
    display: grid;
    gap: clamp(var(--s-6), 4vw, var(--s-7));
  }

  @media (min-width: 960px) {
    .faq__inner {
      grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
      gap: var(--s-9);
      align-items: start;
    }

    /* Clears the sticky nav (one row at this width), with the same air as anchor jumps. */
    .faq__head {
      position: sticky;
      top: var(--s-9);
    }
  }

  .faq__item {
    border-bottom: 1px solid color-mix(in srgb, var(--type) 12%, transparent);
  }

  .faq__item:first-child {
    border-top: 1px solid color-mix(in srgb, var(--type) 12%, transparent);
  }

  .faq__question {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--s-5);
    padding-block: var(--s-5);
    color: var(--type);
    font-size: clamp(17px, 1.3vw, 19px);
    font-weight: 600;
    line-height: 1.4;
    list-style: none;
    cursor: pointer;
  }

  /* Safari still paints the default disclosure triangle without this. */
  .faq__question::-webkit-details-marker {
    display: none;
  }

  .faq__icon {
    position: relative;
    flex: none;
    width: 14px;
    height: 14px;
    margin-top: 0.35em;
    color: var(--type-dim);
    transition: transform 0.2s, color 0.2s;
  }

  .faq__icon::before,
  .faq__icon::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    margin-top: -1px;
    background: currentColor;
  }

  .faq__icon::after {
    transform: rotate(90deg);
  }

  .faq__question:hover .faq__icon,
  .faq__item[open] .faq__icon {
    color: var(--signal);
  }

  .faq__item[open] .faq__icon {
    transform: rotate(45deg);
  }

  .faq__answer {
    max-width: 64ch;
    margin: 0;
    padding-bottom: var(--s-5);
    color: var(--type-dim);
    font-size: 15.5px;
    line-height: 1.65;
  }
</style>
```

`src/components/websites/Quote.astro`:

```astro
---
/**
 * 06 — Get started. The same ContactForm.astro the home page's Contact uses (final review,
 * I4), preset to "A project" — one form, one Formspree wiring, no drifting copy. The form
 * draws its own opaque panel. `mountContactForms()` in websites.astro binds it.
 */
import SectionHead from './SectionHead.astro';
import ContactForm from '../ContactForm.astro';
import { CONTACT_EMAIL } from '../../lib/contact-form';
---

<section class="w-section quote" id="contact" aria-labelledby="contact-title">
  <div class="w-inner quote__inner">
    <div class="quote__intro">
      <SectionHead id="contact-title" marker="06 — Get started" title="Tell me about the job" />
      <p class="quote__lede">
        No obligation and no sales call. Send the details and you'll get a price, or an honest
        answer that you don't need what you think you need. Or email me directly at
        <a class="quote__link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </div>

    <ContactForm lookingFor="project" />
  </div>
</section>

<style>
  .quote {
    padding-bottom: clamp(var(--s-8), 9vw, var(--s-10));
  }

  .quote__inner {
    display: grid;
    gap: clamp(var(--s-6), 4vw, var(--s-7));
  }

  @media (min-width: 960px) {
    .quote__inner {
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      gap: var(--s-9);
      align-items: start;
    }
  }

  .quote__lede {
    max-width: 52ch;
    margin: var(--s-5) 0 0;
    color: var(--type-dim);
    font-size: clamp(15px, 1.15vw, 17px);
    line-height: 1.6;
  }

  /* Contact.astro's link treatment. */
  .quote__link {
    color: var(--type);
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--type) 35%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.25em;
    overflow-wrap: anywhere;
    transition: text-decoration-color 0.2s;
  }

  .quote__link:hover {
    text-decoration-color: currentColor;
  }
</style>
```

- [ ] **Step 7: Rewrite `src/pages/websites.astro`**

Keep the file's header comment, `title`, `description`, `serviceSchema`, `faqSchema` and the `BaseLayout` props **verbatim**; replace the imports, the style constants, the markup, the `<style>` block and the `<script>` with:

```astro
---
/**
 * /websites — the client-facing page.
 *
 * This is the URL that goes on Upwork, in cold email, and on the Google Business profile.
 * The root domain stays exactly as it is for recruiters.
 *
 * House rule for anyone editing this file: if a sentence would only make sense to another
 * developer, it does not belong here. No framework names, no "9+ years", no Nx, no NgRx.
 * The reader is a plumber deciding whether to spend $1,500.
 *
 * Spec §14: the Signal Path system in a deliberately lighter treatment — the 2D line (from
 * BaseLayout, unanchored here, so the whole curve spans the page), no portrait, no ring, no
 * WebGL, no audio. One component per section under components/websites/; their shared
 * buttons, panel and tick list are in styles/websites.css. Every word is in data/websites.ts.
 */
import BaseLayout from '../layouts/BaseLayout.astro';
import WebsitesNav from '../components/WebsitesNav.astro';
import Hero from '../components/websites/Hero.astro';
import Offer from '../components/websites/Offer.astro';
import Work from '../components/websites/Work.astro';
import Pricing from '../components/websites/Pricing.astro';
import Process from '../components/websites/Process.astro';
import Faq from '../components/websites/Faq.astro';
import Quote from '../components/websites/Quote.astro';
import Footer from '../components/Footer.astro';
import { websitesPricing as pricing, websitesFaq as faq } from '../data/websites';
import '../styles/websites.css';

/* title, description, serviceSchema, faqSchema: unchanged from the current file */
---

<BaseLayout
  title={title}
  description={description}
  collectionSchema={false}
  personJobTitle="Web Developer"
  personKnowsAbout={[
    'Web Design',
    'Website Development',
    'Landing Pages',
    'Local SEO',
    'Web Performance',
    'Small Business Websites',
  ]}
>
  <script type="application/ld+json" is:inline set:html={JSON.stringify(serviceSchema)} slot="head" />
  <script type="application/ld+json" is:inline set:html={JSON.stringify(faqSchema)} slot="head" />

  <!-- overflow-x:clip, not hidden — see index.astro's #top for why hidden turns this into
       a scroll container that a sticky child sticks to instead of the viewport. -->
  <div id="top" style="overflow-x:clip">
    <WebsitesNav />

    {/* tabindex="-1": see index.astro's #main-content for why the skip link needs this. */}
    <main id="main-content" tabindex="-1">
      <Hero />
      <Offer />
      <Work />
      <Pricing />
      <Process />
      <Faq />
      <Quote />
    </main>

    <Footer
      tagline="Websites for small businesses · Blue Mountains, NSW"
      showSocials={false}
      showColophon={false}
    />
  </div>
</BaseLayout>

<script>
  // Same island Contact.astro mounts — contact-form.ts binds every form[data-contact-form]
  // on the page, not by id, so it covers this page's quote form by name.
  import { mountContactForms } from '../islands/contact-form';

  mountContactForms();
</script>
```

(The `/* … unchanged … */` line above is an instruction to you, not code: paste the existing `title`, `description`, `serviceSchema` and `faqSchema` declarations there exactly as they are today. Delete `sectionPad`, `h2Class`, `h2Style`, `eyebrowClass`, the unused `websitesHero/What/Process/Work` imports and the page's old `<style>` block.)

- [ ] **Step 8: Build and run the check**

Run: `npm run build && node $TMPDIR/websites-check.mjs`
Expected: `websites-check: all assertions pass`.

Then confirm the `--solo` fallback cannot render an empty frame: in `Hero.astro`, the `<figure>` is inside `{featured && (…)}` and `hero--solo` is applied by the same condition — read it once more; no runtime path exists to test without changing data.

Then: `grep -rnE "font-bricolage|text-ink|bg-cream|rounded-full|\b(sm|md|lg):[a-z]" src/` — Expected: no output.

- [ ] **Step 9: Browser check**

Run `npm run dev`, open `http://localhost:4321/websites` at 1440×900, 768×1024, 375×812 and 320×640. At each width:
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no sideways scroll).
- Measure `document.querySelector('.w-nav').offsetHeight` and compare with `getComputedStyle(document.documentElement).scrollPaddingTop`. If the nav is taller than the padding at any width, add to `src/styles/websites.css`, at the media query where it overflows, an `html { scroll-padding-top: … }` built from `--s-*` that clears it, with a one-line comment giving the measured height.
- Click each nav link: the section's marker is visible below the nav after the jump.
- Tab from the skip link through the page: every link, button and summary shows a visible ring; the primary buttons' ring is cream, not red.
- The hero copy and section heads are legible where the line crosses them.
- The FAQ head stays pinned at ≥ 960px while the list scrolls; an open item shows ×.

- [ ] **Step 10: JS-off check**

Run: `npm run build && npx astro preview`, then in a JS-disabled browser (or `agent-browser` with JavaScript off) load `/websites/`: every section renders, each `<details>` opens, and the form's `action` is the Formspree endpoint.

- [ ] **Step 11: Commit**

```bash
git add src/styles/websites.css src/components/websites src/components/WebsitesNav.astro src/pages/websites.astro
git commit -m "feat: /websites on the Signal Path system — one component per section"
```

---

### Task 2: Put `/websites` back live and gate its budget

**Files:**
- Modify: `vercel.json` (remove the three redirects)
- Modify: `astro.config.mjs:9-12` (remove the sitemap filter)
- Modify: `src/components/Contact.astro:4-8, 76-78` (restore the link, drop the Task 9.7 note)
- Modify: `scripts/budget.mjs:27-28, 48, 144, 188-191` (gate `/websites`)

**Interfaces:**
- Consumes: Task 1's built page.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing check**

Append to `$TMPDIR/websites-check.mjs` (before the `if (failures.length)` block):

```js
const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
expect(sitemap.includes('https://www.noel-sebastian.com/websites/'), '/websites missing from sitemap');
const home = readFileSync('dist/index.html', 'utf8');
expect(home.includes('href="/websites"'), "Contact's /websites link missing");
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
expect(!JSON.stringify(vercel).includes('/websites'), 'vercel.json still redirects /websites');
```

Run: `npm run build && node $TMPDIR/websites-check.mjs` — Expected: three FAIL lines.

- [ ] **Step 2: `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json"
}
```

- [ ] **Step 3: `astro.config.mjs`** — replace

```js
    sitemap({
      // Task 9.7: exclude /websites until the restyle in Phase 14
      filter: (page) => !page.startsWith('https://www.noel-sebastian.com/websites'),
    }),
```

with

```js
    sitemap(),
```

- [ ] **Step 4: `src/components/Contact.astro`**

In the header comment, replace

```
 * form, then the direct routes (email, CV, socials), then one line for freelance clients,
 * which inherits the retired About's small-business sentence. Task 9.7 redirects `/websites`
 * to this section; its link is restored in Phase 14 when the restyle ships.
```

with

```
 * form, then the direct routes (email, CV, socials), then one line for freelance clients,
 * which inherits the retired About's small-business sentence and points at `/websites`.
```

and replace the freelance line

```astro
          Need a website for your business? I build those too — pick "A project" in the form.
```

with

```astro
          Need a website for your business? <a class="contact__link" href="/websites">I build those too.</a>
```

- [ ] **Step 5: `scripts/budget.mjs`** — gate both pages.

Replace the header lines

```
 * Only `/` is gated (exit 1 over budget) — `/websites` is reported, not gated, until Phase
 * 14 restyles it (BUILD-PLAN.md, Phase 9 "Deliberately not in Phase 9").
```

with

```
 * `/` and `/websites` are gated (exit 1 over budget); `/404` is reported only. `/websites`
 * joined the gate when Phase 14 restyled it.
```

Replace `const GATED_PAGE = '/';` with

```js
const GATED_PAGES = new Set(['/', '/websites']);
```

Replace the loop body's check

```js
    if (result.page === GATED_PAGE && result.total > BUDGET_BYTES) {
      overBudget = true;
    }
```

with

```js
    if (GATED_PAGES.has(result.page) && result.total > BUDGET_BYTES) {
      overBudget.push(result.page);
    }
```

and `let overBudget = false;` with `const overBudget = [];`, and the final block

```js
  if (overBudget) {
    console.error(`\n${GATED_PAGE} exceeds the ${BUDGET_BYTES}-byte budget.`);
    process.exit(1);
  }
```

with

```js
  if (overBudget.length > 0) {
    console.error(`\n${overBudget.join(', ')} exceeds the ${BUDGET_BYTES}-byte budget.`);
    process.exit(1);
  }
```

Before editing, `grep -n "GATED_PAGE\|overBudget" scripts/budget.mjs` and update every occurrence — the list above must leave none behind.

- [ ] **Step 6: Run everything**

Run: `npm run build && node $TMPDIR/websites-check.mjs && npm run budget && npx vitest run`
Expected: check passes; budget exits 0 and prints `/websites` (record its total); vitest passes (342 tests).

- [ ] **Step 7: Commit**

```bash
git add vercel.json astro.config.mjs src/components/Contact.astro scripts/budget.mjs
git commit -m "feat: /websites back live — redirect and sitemap filter gone, budget gates it"
```
