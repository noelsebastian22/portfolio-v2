# AGENTS.md

Orientation for any agent working on this repo — Cowork, Claude Code, or Command Code.

## Start here

Run the `session-handoff` skill in `start` mode before doing anything else. It reads the
last session entry, the phase status, and the git state, and tells you where things stand.

```
.claude/skills/session-handoff  →  .agents/skills/session-handoff/SKILL.md
```

## The three documents

| File | Job | Changes |
|---|---|---|
| `docs/superpowers/specs/2026-09-19-signal-path-design.md` | The design. What we are building and why. | Rarely |
| `BUILD-PLAN.md` | Current state — phase status, decisions, known gaps. **Source of truth.** | Every session |
| `docs/SESSIONS.md` | Chronological log — what happened, what failed, what is open. | Every session |

If the plan and the spec disagree, the spec is wrong and must be updated in the same commit
as the code that contradicts it.

## What this project is

A total rebuild of the portfolio as **Signal Path**: a dark, animation-led site built around
one continuous line that is both a marble diagram of Noel's career and a waveform driving
the sound design. Recruitment-first — the audience is hiring managers and tech leads
evaluating Noel for senior frontend / Angular roles.

**`PRODUCT.md` and `DESIGN.md` are retired.** They describe the old warm-cream "Technical
Letterpress" direction and actively contradict the spec. If they are still in the tree,
deleting them is Phase 0 work.

## Hard rules

- **No UI framework.** No React, Preact, Vue, Svelte. No Tailwind. A site selling Angular
  depth ships no React.
- **Astro renders content; islands only add behaviour.** An island that renders content is
  a bug — it breaks the zero-JS readability requirement.
- **One canonical curve.** `src/lib/signal/path.ts` is the only place the signal's geometry
  is defined. Adding a renderer must never mean redefining the curve.
- **Never invent a number.** Every metric on the site traces to `public/noel-sebastian.pdf`.
  Derive elapsed years from `CAREER_START`; never hard-code a year count.
- **Performance is the pitch.** The budget in `BUILD-PLAN.md` → Global Constraints is a
  commitment. Any change that moves the JS bundle gets recorded with its number.
- **The scroll is the transport.** Nothing animates on a timer except the audio drone and
  idle particle drift.

## Commands

```bash
npm run dev        # astro dev
npm run build      # astro build — the gate before any commit
npm run images     # sharp pipeline for gallery assets
npx vitest run     # pure-module tests only: career.ts, signal/path.ts
```

## Code style

- Descriptive names. Extract complex conditions into named booleans.
- Follow the patterns already in the file you are editing.
- Comment *why*, not *what* — and only where the reason is not obvious from the code.
