---
name: session-handoff
description: Record what happened this session into docs/SESSIONS.md so the next session — in Cowork, Claude Code or Command Code — can pick up cleanly. Use when the user says "wrap up", "handoff", "log this session", "I'm done for today", or before ending a work session. Also use at the START of a session to read the last entry and re-establish context.
argument-hint: "[start|end] (defaults to end)"
---

# Session handoff

No agent can see another's conversation. `docs/SESSIONS.md` is the shared memory for **intent,
dead ends and open threads**; `BUILD-PLAN.md` is current state; git is the changelog. The
document map is in `AGENTS.md` — read it only if your surface did not load it automatically.

`check.mjs` in this folder does the reading, so every agent pulls the same bounded slice rather
than paging through the docs:

```bash
node .agents/skills/session-handoff/check.mjs start    # start mode
node .agents/skills/session-handoff/check.mjs facts    # end mode, gather
node .agents/skills/session-handoff/check.mjs lint     # end mode, before commit
node .agents/skills/session-handoff/check.mjs verify   # end mode, no line lost since HEAD
```

## Mode: start

1. Run `check.mjs start`. It prints the newest entry, the Phase Status table, the first line of
   every Known Gap, the branch, the last 10 commits, `git status`, and the build's last 15 lines.
   Read nothing else yet.
2. If the output shows a red build, stop and say so: that is the session's first job.
3. Open a full Known Gaps bullet, a Decision, the spec or `docs/archive/` only when the work
   you are about to propose touches it — by `grep -n` and a line range, never a whole file.
4. Report in three lines: where things stand, what the last session left open, what you propose
   now. Then stop and wait — do not start work off the log alone.

If the entry's **Next** and the git state disagree, say so. That gap is the most useful thing the
log produces.

## Mode: end (default)

Read `end.md` in this folder and follow it. Do not write the entry from memory, and do not skip
steps because the session felt small.
