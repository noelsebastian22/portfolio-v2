# Sessions

Chronological log for the Signal Path rebuild. Newest first. Written by the
`session-handoff` skill — see `.agents/skills/session-handoff/SKILL.md`.

This is not a changelog; git does that. It records intent, dead ends, and open threads.

<!-- newest first -->

## 2026-09-19 · claude-code · Signal Path spec and plan

**Did**
- Wrote `docs/superpowers/specs/2026-09-19-signal-path-design.md` — 17 sections, the full design.
- Wrote `BUILD-PLAN.md` — 16 phases. Phases 0–2 have code-level detail; 3–15 are phase-level.
- Ported `session-handoff` from `todo/daybook`, adapted: `npm run build` not `ng build`, no Supabase step.
- Rewrote `AGENTS.md` — was a stub pointing at a non-existent `README.md`.
- Extracted `Resume.pdf`; found four things absent from the site: Ernst & Young (10/2016–05/2020), MCP + Figma Code Connect work, mentoring 6 devs, Australian PR status.
- No application code written. Phase 0 has not started.

**Decided**
- Anchor concept is **Signal Path** — one line, both a marble diagram and a waveform. Rejected The Build (clinical) and Dead Reckoning (metaphor about travelling, not building).
- Astro + vanilla TS + Three/GSAP/Lenis. No React, no Tailwind. Angular and Next both rejected — see `BUILD-PLAN.md` → Decisions for the reasoning on each.
- **Phase 9 is the shippable milestone.** Do not start Phase 10 until it is signed off.
- `PRODUCT.md` and `DESIGN.md` retired; deleting them is Phase 0 work.

**Didn't work**
- `pdftotext` on `Resume.pdf` returns **2 characters**. The file has no text layer — `pdffonts` shows zero embedded fonts; it is Quartz-generated vector art. Do not retry text extraction on it. It required `brew install poppler` and reading the rendered pages as images.
- Chrome/`claude-in-chrome` was unavailable the whole session, so the four reference sites could never be screenshotted — design analysis came from `WebFetch` text summaries only. If a visual re-check of saifullah.dev / manishkr.xyz / brandonbartram.dev / lukebaffait.fr is ever needed, the browser has to be reconnected first.
- `agent-browser` CLI is not installed on this machine. Not globally installed without asking.

**Open**
- `Resume.pdf` (repo root, now tracked) and `public/noel-sebastian.pdf` (the file the site serves) differ. Only one should survive — Phase 1, Task 1.2, Step 6.
- `gallery-masters/ezytrack2.jpg` is **PNG data with a `.jpg` extension**, 16MB, now tracked. The Phase 7 sharp pipeline must sniff the real format rather than trust the extension.
- Noel has not picked an execution mode — subagent-driven or inline.
- Branch `feat/signal-path-rebuild` is not merged and not pushed.

**Next**
Phase 0, Task 0.1 — the dependency swap. **Expect `npm run build` to FAIL immediately afterwards**: `index.astro` still imports `ContactForm` and every component still carries Tailwind classes. That failure list is not a problem to fix on the spot; it *is* the Phase 4–8 worklist, and it should be recorded in the next session's entry.

**Touched** — `BUILD-PLAN.md`, `AGENTS.md`, `docs/SESSIONS.md`, `docs/superpowers/specs/2026-09-19-signal-path-design.md`, `.agents/skills/session-handoff/SKILL.md`, `.claude/skills/session-handoff`, `Resume.pdf`, `gallery-masters/ezytrack2.jpg`

