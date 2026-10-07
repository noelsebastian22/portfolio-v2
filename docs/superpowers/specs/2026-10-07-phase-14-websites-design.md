# Phase 14 — `/websites` Restyle — Design

**Date:** 2026-10-07 · **Parent spec:** `2026-09-19-signal-path-design.md` §14 ·
**Status:** approved by Noel in session (shell section explicitly; the rest delegated — "make the
decisions… don't hallucinate… this is for clients").

## Intent

`/websites` is the freelance funnel: the URL that goes on Upwork, in cold email and on the Google
Business profile. Its reader is a local business owner comparing quotes, not a hiring manager.
The page must be good enough to hand a client as it stands — professional, clear, and showing the
work — while staying deliberately lighter than the home page.

**Content is frozen.** Every word, price, tier and project in `src/data/websites.ts` carries over
unchanged; the project list will be reworked later, so all content stays in the data file and the
markup only renders it. Nothing may be added that is not already true and already in that file —
no phone number, no client counts, no testimonials.

## Decisions

1. **Restyle only** (Noel). Section order unchanged: hero, what you get, recent work, pricing,
   process, FAQ, contact.
2. **The signal line is left exactly as it is** (Noel, option A). With no `data-signal-section`
   anchors the whole curve stretches over the page and the dim rule keeps it faint behind
   content. No signal code changes. The WebGL gate already refuses this page (`hasHero`).
3. **One component per section** (Noel, approach 1), under `src/components/websites/`, each with
   scoped BEM styles. `websites.astro` becomes the composition plus the SEO schema.
4. **The nav loses its hamburger and its inline script** (Noel approved the shell). Like
   `Nav.astro`: sticky, translucent `--ground`, favicon mark + "Noel Sebastian", mono uppercase
   anchor links, and one always-visible "Get a quote" action styled as the primary button. Below
   640px the links sit on their own row, which scrolls sideways rather than wrapping into three.
5. **Shell.** The home page's content box (`--container`, `--s-5` inline padding), with a
   tighter rhythm than home's `--section-y` — `clamp(--s-8, 9vw, --s-10)`, 64–128px — because
   this is a funnel of seven short sections, not a scroll-driven story. Section heads in the
   house voice with plain-English markers (`01 — What you get`), uppercase because there are no
   operators here. Hero H1 in the home Hero's treatment (125% stretch, 700, 0.94, uppercase)
   but sized to its column, `clamp(36px, 4.6vw, 68px)`, since it shares the row with the work.
6. **Surfaces.** Cards are opaque `--ground-lift` panels with a hairline border and `--radius`,
   so the line passes behind them. Hover changes the border colour only — no lift, no shadow.
7. **Glyphs.** Neither face carries `→ ↗ ✓`. Button labels lose their arrows; tick lists use a
   CSS-drawn `--signal` dot that echoes the line's emissions. `+` (FAQ) is in both faces.
8. **The hero shows the work.** At ≥ 960px a second column holds the first non-concept project
   from `websitesWork` (today TopDel Renovation) as a framed capture with its `kind` and `title`,
   linking to the live site. Below 960px it follows the facts row. Data-driven: if the project
   list changes, the hero follows.
9. **Process is a track.** The four steps sit on one hairline with a `--signal` node per step —
   horizontal at ≥ 960px, vertical below. Pure CSS.
10. **FAQ** keeps native `<details>`; at ≥ 960px its head is sticky in a left column with the
    questions on the right. No JS.
11. **Work cards** become real `<img>` (900×495, `loading="lazy"`, the same alt text) instead of
    `role="img"` background divs. The hero's capture is `loading="eager"`.
12. **Contact** — head and the existing lede (with the email link) beside `ContactForm`
    (`lookingFor="project"`) on an opaque panel, as home Contact does.
13. **Shared primitives** live in `src/styles/websites.css`, imported only by `websites.astro`:
    the primary and ghost buttons (`.w-btn`, `.w-btn--ghost`) and the dot list (`.w-ticks`).
    `SectionHead.astro` carries marker, title and lede.
14. **`data-reveal` is removed** — nothing has read it since Phase 3 retired the reveal script.

## Launch

- `vercel.json`: the three `/websites` redirects go; the file keeps its `$schema`.
- `astro.config.mjs`: the sitemap filter goes, so `/websites/` returns to the sitemap.
- `Contact.astro`: the freelance line links to `/websites` again
  (`<a class="contact__link" href="/websites">I build those too.</a>`), and its header comment
  drops the Task 9.7 note.
- SEO preserved verbatim: title, description, `ProfessionalService` + `FAQPage` JSON-LD, and the
  `BaseLayout` props (`collectionSchema={false}`, `personJobTitle`, `personKnowsAbout`).

## Verification

- `npm run build` green; `npx vitest run` unchanged; `npm run budget` within limits, `/websites`
  figure recorded. `/websites` joins `/` as a gated page in `scripts/budget.mjs`, as that
  script's header has promised since Phase 9.
- No Tailwind left anywhere: no `font-bricolage`, `text-ink`, `bg-cream`, `rounded-full` or
  breakpoint-prefixed (`sm:`/`md:`/`lg:`) class in `src/`.
- JS off: every section readable, FAQ opens, form posts to Formspree.
- Browser check at 375, 768 and 1440: no horizontal scroll, nav fits, text over the line is
  legible, focus visible on every control.

## Known gaps this phase records, not fixes

- **No phone number on the page.** Spec §14 says a business owner "needs to find a phone
  number"; Noel has not supplied one and none may be invented. Owed by Noel.
- **The OG image and its alt text are the recruiter ones** (`BaseLayout`), so a shared `/websites`
  link previews as "Senior Web Engineer & Angular Specialist". Phase 15 generates OG images.
