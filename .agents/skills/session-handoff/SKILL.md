---
name: session-handoff
description: Record what happened this session into docs/SESSIONS.md so the next session — in Cowork, Claude Code or Command Code — can pick up cleanly. Use when the user says "wrap up", "handoff", "log this session", "I'm done for today", or before ending a work session. Also use at the START of a session to read the last entry and re-establish context.
argument-hint: "[start|end] (defaults to end)"
---

# Session handoff

This portfolio is built across agents and surfaces — Cowork, Claude Code, Command Code —
used interchangeably. None of them can see another's conversation history. `docs/SESSIONS.md`
is the only shared memory. It is not a changelog; git already does that. It records
**intent, dead ends, and open threads** — the things that live in a conversation and die
with it.

## Orientation

Three documents matter, and they do different jobs. Do not let them drift.

| File | Job |
|---|---|
| `docs/superpowers/specs/2026-09-19-signal-path-design.md` | The design. What we are building and why. Changes rarely. |
| `BUILD-PLAN.md` | Current state. Phase status, remaining work, decisions. **The source of truth.** |
| `docs/SESSIONS.md` | Chronological. What happened, what failed, what is open. |

`PRODUCT.md` and `DESIGN.md` are **retired** and describe a dead direction. If either is
still present in the repo, that is a bug — they contradict the spec.

## Mode: start

Run when opening a session.

1. Read the **first entry** in `docs/SESSIONS.md` (newest is at the top).
2. Read `AGENTS.md`, and the **Phase status** table in `BUILD-PLAN.md`.
3. Skim the design spec only if the session will touch design decisions. It is long and
   stable; the plan is the thing that moves.
4. Run `git log --oneline -10` and `git status --short` to see what actually landed versus
   what the last entry claimed.
5. Run `npm run build` to confirm the tree is green before changing anything. A session
   that starts on a broken build and does not know it will waste an hour.
6. Report back in three lines: where things stand, what the last session left open, and
   what you propose doing now. Then stop and wait — do not start work off the log alone.

If the log's "Next" and the git state disagree, say so. That gap is the most useful thing
the log produces.

## Mode: end (default)

Run before finishing. Do not skip steps because the session felt small.

### 1. Gather the facts

Run these and read the output — do not write the entry from memory:

```bash
git log --oneline "$(git log -1 --format=%H --before=@{6.hours.ago} 2>/dev/null || echo HEAD~10)"..HEAD 2>/dev/null | head -30
git status --short
git diff --stat HEAD
npm run build 2>&1 | tail -15
du -sh dist 2>/dev/null
find dist -name '*.js' -exec du -ch {} + 2>/dev/null | tail -1
```

Record the **real** build result and the **real** shipped JS weight. Performance is the
pitch on this project, so a session that moved the bundle must say by how much. If a build
was not run this session, say that rather than quoting the last known numbers.

### 2. Write the entry

Prepend to `docs/SESSIONS.md`, directly under the `<!-- newest first -->` marker. Never
append to the bottom, never edit a previous entry — if something in an old entry turned
out wrong, say so in the new one.

Use exactly this shape:

```markdown
## YYYY-MM-DD · <agent> · <2–5 word topic>

**Did**
- Terse, factual, one line each. What changed and where.

**Decided**
- Only decisions that outlive this session. Include the reasoning, briefly.
- Omit this section entirely if nothing was decided.

**Didn't work**
- Approaches tried and abandoned, and why. This is the highest-value section —
  it is what stops the next agent burning an hour rediscovering the same wall.
- Omit if genuinely nothing was abandoned.

**Open**
- Unfinished threads, known-broken things, questions for Noel.
- Say "nothing open" rather than deleting the heading.

**Next**
- The single most sensible next action, specific enough to start from cold.

**Touched** — `path/one.ts`, `path/two.astro`
```

`<agent>` is `cowork`, `claude-code` or `command-code`. Get the date from `date +%F`, not
from memory.

### 3. Rules for the entry

- **Terse.** Six lines beats sixteen. If it reads like prose, cut it.
- **No praise, no summary of how well it went.** Facts only.
- **Name files and functions**, not vague areas. "Fixed the hero" is useless; "moved the
  curve sampling out of `TubeSignal` into `lib/signal/path.ts` so `SvgSignal` reads the
  same control points" is usable.
- **Record the false starts.** An entry with no "Didn't work" section on a hard session is
  a sign the entry is too shallow.
- **Record anything that moved the performance budget**, in either direction, with the
  number. §12 of the spec is a commitment, not an aspiration.
- **Any decision that outlives the session goes in `BUILD-PLAN.md` too.** The log records
  that a decision was made; the plan records what the decision *is*.
- If a change contradicts `AGENTS.md` or the design spec, update that file in the same
  commit — or say explicitly in the entry why the spec is now wrong.

### 4. Update BUILD-PLAN.md

`BUILD-PLAN.md` is the single source of truth. The log is chronological; the plan is
current state. Both are needed, and the plan is the one that goes stale silently.

In the same commit, update whichever of these the session moved:

- **Phase status** if a phase advanced.
- **Remaining work** if an item was finished, or a new one was discovered.
- **Decisions** if something was decided.
- **Known gaps** if a gap opened or closed.

### 5. Commit

```bash
git add -A && git commit -m "session: <same topic as the entry heading>"
```

Do not push unless asked.

## Keeping the file usable

Once `docs/SESSIONS.md` passes roughly 40 entries, fold everything older than the current
phase into a single `## Archive — <period>` block at the bottom, keeping only the Decided
and Didn't-work lines. Never delete a "Didn't work" line.
