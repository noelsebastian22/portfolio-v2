# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

Only the last three entries live here. Older ones are moved verbatim to `docs/archive/sessions.md`.

<!-- newest first -->

## 2026-10-11 · cowork · PR #6 merged

**Did**
- Noel checked PR #6's preview, the 3D ring through all five cards included, and it was merged as `44b7126`. www.noel-sebastian.com serves the Saanjh ring card (`/images/ring/saanjh-480w.avif` 200) and the Saanjh card on `/websites/`, and no longer mentions Ezytrack.
- Figures moved from the branch to live. The previous entry's two Open items are settled: the five-card ring has been seen, and the branch is merged.

**Open**
- `ezytrack.noel-sebastian.com` is still live, and its Upwork listing untouched (carried from 2026-10-10, Noel's call).

**Next**
The sound plan's Tasks 1 and 3 on `feat/sound-track`, once the track file and its licence are in hand.

**Numbers** — build green · 352 tests · JS on `/` 64,987 gzip (±0, live) · `/websites` 58,752 (live) · ring chunk 5,547 (live) · lint WARN as before: BUILD-PLAN 61.5 KB, nothing closed to archive

## 2026-10-11 · cowork · Saanjh joins the ring

**Did**
- Added Saanjh, a concept restaurant site live at `saanjh.noel-sebastian.com` (repo `noelsebastian22/saanjh`), as the fifth `ringProjects` card and a fourth `websitesWork` card. New master `gallery-masters/saanjh.jpg` plus `RING` and `CARDS` entries in `scripts/optimise-gallery.mjs`; the other captures came out byte-identical.
- `/websites` work grid picks its columns from the card count (`Work.astro` `columns`): 2 × 2 for four cards.

**Decided**
- Saanjh takes Ezytrack's place on the ring and joins `/websites`.
- The `/websites` work grid fills its rows: three columns for a multiple of three cards, otherwise two.

**Didn't work**
- Checking the 3D ring through Claude's browser pane or an automated Chrome tab. `.ring--3d` never appears there, on `localhost:4321` or on the live site (pane at 1280×800, Chrome at 1337×643; the gate passes and `stage.ts` loads). Those tabs are in the background, so the stage never ticks into 3D. The ring has to be checked by hand.
- Capturing Saanjh full-page with motion on: its sky is fixed and parallaxed, so a scroll-and-stitch seamed at every viewport. Under reduced motion with a flat sky colour the frames tile cleanly; that is the master.

**Open**
- The 3D ring with five cards (Saanjh last) has not been looked at in a browser, tests only. Nor was the four-card version.
- `chore/ring-projects` (Ezytrack removal plus Saanjh) is pushed with a PR to `master`, not merged.

**Next**
Open the PR's Vercel preview on desktop at 1280×800, scroll section 04's 3D ring through all five cards and check `/websites` reads 2 × 2; if both look right, merge.

**Numbers** — build green · 352 tests (+1) · JS on `/` 64,987 gzip (+5) · `/websites` 58,752 (±0) · ring chunk 5,547 (+146, the fifth project) · lint WARN: BUILD-PLAN 61.4 KB (limit 60,000), +0.6 KB for today's two Decisions; still nothing closed to archive, as on 2026-10-10

## 2026-10-10 · claude-code · Ezytrack removed, ring dynamic

**Did**
- Removed Ezytrack (client work Noel won't present): its `ringProjects` entry, the "FleetPoint" card in `data/websites.ts`, its `ring-captures.json` key, both scripts' lists, and the master, card and four ring captures.
- `/websites` work grid is one column, then three from 960px (was two from 768px) so three cards sit in one row, as `Pricing.astro` does.
- `RING_CARD_COUNT` is now `ringProjects.length`; `radiusPerCardWidth(count)` widens the ring from six cards; `mountRingStage` keeps the 2D rail below `MIN_RING_CARDS` (4). `ring-geometry.test.ts` no longer hard-codes five-card angles; new clearance test for 4–12 cards.

**Decided**
- Ezytrack is off the site; replacements to come.
- The ring's card count follows `ringProjects`.

**Open**
- The 3D ring with four cards (sides at ±90°) has not been looked at in a browser — tests only.
- `ezytrack.noel-sebastian.com` is still live, and the Upwork entry 2 listing itself is untouched — Noel's call.
- This work sits on `chore/ring-projects`, branched from `feat/sound-track` (docs-only ahead of `master`); not pushed, no PR.

**Next**
Scroll the 3D ring on desktop (1280×800) in `npm run dev`; if it reads right, push `chore/ring-projects` and open a PR to `master`. The sound plan's Tasks 1 and 3 still wait on `feat/sound-track`.

**Numbers** — build green · 351 tests (+9) · JS on `/` 64,982 gzip (−2) · `/websites` 58,752 (±0) · ring chunk 5,401 (+863, `ringProjects` now in it) · lint WARN: BUILD-PLAN 60.8 KB (limit 60,000), up from ~60.1 by today's two Decisions — still nothing closed to archive; the sound gap's archiving on merge brings it under · verify: one line, the ring chunk figure, replaced on purpose
