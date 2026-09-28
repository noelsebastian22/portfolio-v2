# Session handoff — end mode

## 1. Gather the facts

```bash
node .agents/skills/session-handoff/check.mjs facts
```

It prints the commits since the last `session:` commit, uncommitted changes, the build, the JS
budget from `npm run budget` (the real measure — never sum `dist/*.js`), the test count and
today's date. Quote those numbers. If you skipped a build, say so instead of reusing old numbers.

## 2. Put each fact in exactly one place

Everything below is the rule, not a suggestion. Writing the same fact into two files is how
these docs grew to 180 KB.

| The session produced… | It goes in | The log entry says |
|---|---|---|
| A decision that outlives the session | `BUILD-PLAN.md` → Decisions, in full, with the reasoning | one line under **Decided** |
| An issue that outlives the session | `BUILD-PLAN.md` → Known Gaps, under the right heading | its bold title under **Open** |
| A gap closed | the whole bullet, verbatim, moved to the bottom of `docs/archive/plan-closed-gaps.md` under a dated heading, plus one line saying what closed it | one line under **Did** |
| A new measurement | `BUILD-PLAN.md` → Current figures (replace the value and its date); add a Measurement history row only when a phase completes or JS moves | the **Numbers** line, with the delta |
| A phase completed | shorten its Phase Status note to one clause; move the phase's section verbatim to the bottom of `docs/archive/plan-phases.md`; copy anything still owed into "Carried forward" | one line under **Did** |
| An approach that failed | the entry's **Didn't work** — nowhere else | in full |
| How work is split between agents, personal preferences | agent memory, not the repo | nothing |

Never add a "Measured after …" section, and never leave a Known Gap marked RESOLVED in place:
`lint` flags both.

## 3. Write the entry

Prepend it to `docs/SESSIONS.md` directly under `<!-- newest first -->`. Never edit an older
entry — if one turned out wrong, say so in the new one.

```markdown
## YYYY-MM-DD · <agent> · <2–5 word topic>

**Did**
- At most five lines. Intent and outcome, not the commit list — git has that.

**Decided**
- One line each; the full text is in BUILD-PLAN → Decisions. Omit if nothing was decided.

**Didn't work**
- Approaches tried and abandoned, and why, with the evidence. The highest-value section: it
  stops the next agent burning an hour on the same wall. Omit only if nothing was abandoned.

**Open**
- New threads only, each self-contained. Anything that will outlive the next session goes in
  Known Gaps and is named here by its bold title. Never "see the previous entry".
- Say "nothing open" rather than deleting the heading.

**Next**
- The single most sensible next action, specific enough to start from cold.

**Numbers** — build green/red · N tests · JS on `/` N gzip (±delta) · anything else that moved
```

`<agent>` is `cowork`, `claude-code` or `command-code`. The date comes from `facts`, not memory.

Rules: 30 non-blank lines at most — cut **Did** first, never **Didn't work**. Facts only, no
praise. Name files and functions ("moved curve sampling out of `TubeSignal` into
`lib/signal/path.ts`"), not areas ("fixed the hero"). If a change contradicts `AGENTS.md` or the
spec, update that file in the same commit or say why the spec is now wrong.

## 4. Archive when the docs grow

Keep the live docs small: `docs/SESSIONS.md` holds the three newest entries.

- Move any older entry, verbatim and whole, to the **top** of `docs/archive/sessions.md`, under
  its `<!-- archived, newest first -->` marker.
- Move closed gaps and finished phases as step 2 says.

Moves are cut-and-paste of whole blocks. Never summarise while moving, and never delete a line
from `docs/archive/` — it is append-only.

## 5. Check, then commit

```bash
node .agents/skills/session-handoff/check.mjs lint     # fix every WARN, or say in the entry why not
node .agents/skills/session-handoff/check.mjs verify   # every line at HEAD is still live or archived
```

`verify` lists every line that existed at `HEAD` and is now in neither the live docs nor the
archive. Each one must be a line you rewrote on purpose, such as a status cell or a figure you
replaced. Anything else is lost data: restore it before committing.

```bash
git add -A && git commit -m "session: <same topic as the entry heading>"
```

Do not push unless asked.
