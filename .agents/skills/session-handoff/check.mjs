#!/usr/bin/env node
/**
 * session-handoff helper. One bounded command per job, so every agent — Cowork, Claude Code,
 * Command Code — reads the same small slice of the docs instead of paging through them.
 *
 *   node .agents/skills/session-handoff/check.mjs start [--no-build]
 *   node .agents/skills/session-handoff/check.mjs facts          # end mode, step 1
 *   node .agents/skills/session-handoff/check.mjs lint           # end mode, before commit
 *   node .agents/skills/session-handoff/check.mjs verify [ref]   # no line lost since ref (HEAD)
 *
 * lint and verify exit 1 when they find something, so a skipped warning is visible.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
process.chdir(ROOT);

const PLAN = 'BUILD-PLAN.md';
const LOG = 'docs/SESSIONS.md';
const ARCHIVE_DIR = 'docs/archive';
const LOG_MARKER = '<!-- newest first -->';
const LIVE_ENTRY_LIMIT = 3;
const ENTRY_LINE_LIMIT = 30;
const PLAN_BYTE_LIMIT = 60_000;

const read = (file) => readFileSync(file, 'utf8');
const sh = (cmd) => {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trimEnd();
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}`.trimEnd() || `(failed: ${cmd})`;
  }
};
const heading = (title) => console.log(`\n== ${title} ==`);

/** Lines from the first line matching `start` up to (not including) the next matching `stop`. */
function section(lines, start, stop) {
  const from = lines.findIndex((line) => start.test(line));
  if (from === -1) return [];
  const rest = lines.slice(from + 1).findIndex((line) => stop.test(line));
  return lines.slice(from, rest === -1 ? undefined : from + 1 + rest);
}

function logEntries() {
  const lines = read(LOG).split('\n');
  const body = lines.slice(lines.indexOf(LOG_MARKER) + 1);
  const entries = [];
  for (const line of body) {
    if (/^## \d{4}-\d{2}-\d{2} /.test(line)) entries.push([]);
    entries.at(-1)?.push(line);
  }
  return entries.map((entry) => entry.join('\n').trimEnd());
}

function lastSessionCommit() {
  return sh(`git log -1 --format=%h --grep='^session:'`);
}

function budgetSummary() {
  const out = sh('npm run budget --silent 2>&1');
  const keep = out.split('\n').filter((line) => /^\/|TOTAL|% of the|FAIL|over/i.test(line));
  return keep.join('\n') || out.split('\n').slice(-5).join('\n');
}

function start(runBuild) {
  heading(`Newest entry — ${LOG}`);
  console.log(logEntries()[0] ?? '(no entries)');

  const plan = read(PLAN).split('\n');
  heading(`Phase Status — ${PLAN}`);
  console.log(section(plan, /^## Phase Status/, /^###? /).join('\n').trimEnd());

  heading('Known Gaps — first line of each (read the full bullet only if the session touches it)');
  const gaps = section(plan, /^## Known Gaps/, /^## (?!Known Gaps)/);
  for (const line of gaps) {
    if (/^### /.test(line)) console.log(line);
    else if (/^- /.test(line)) console.log(`  ${line.length > 118 ? `${line.slice(0, 115)}…` : line}`);
  }

  heading('Git');
  console.log(sh('git branch --show-current'));
  console.log(sh('git log --oneline -10'));
  console.log(sh('git status --short') || '(clean)');

  if (runBuild) {
    heading('Build (last 15 lines)');
    console.log(sh('npm run build 2>&1 | tail -15'));
  }
}

function facts() {
  const since = lastSessionCommit();
  heading(`Commits since the last session commit (${since || 'none found — last 15'})`);
  console.log(sh(since ? `git log --oneline ${since}..HEAD` : 'git log --oneline -15') || '(none)');
  heading('Uncommitted');
  console.log(sh('git status --short') || '(clean)');
  console.log(sh('git diff --stat HEAD | tail -1'));
  heading('Build (last 10 lines)');
  console.log(sh('npm run build 2>&1 | tail -10'));
  heading('JS budget (npm run budget)');
  console.log(budgetSummary());
  heading('Tests');
  console.log(sh('npx vitest run 2>&1 | grep -E "Test Files|Tests " | tail -2'));
  heading('Date');
  console.log(sh('date +%F'));
}

function lint() {
  const warnings = [];
  const warn = (message) => warnings.push(message);

  const entries = logEntries();
  if (entries.length > LIVE_ENTRY_LIMIT) {
    warn(`${LOG} has ${entries.length} entries; move the oldest ${entries.length - LIVE_ENTRY_LIMIT} verbatim to the TOP of ${ARCHIVE_DIR}/sessions.md (under its marker).`);
  }
  const newest = entries[0] ?? '';
  const newestLines = newest.split('\n').filter((line) => line.trim());
  const [title] = newestLines;
  if (!/^## \d{4}-\d{2}-\d{2} · (cowork|claude-code|command-code) · \S/.test(title ?? '')) {
    warn(`Newest entry heading does not match "## YYYY-MM-DD · <agent> · <topic>": ${title}`);
  }
  for (const required of ['**Did**', '**Open**', '**Next**', '**Numbers**']) {
    if (!newest.includes(required)) warn(`Newest entry is missing ${required}.`);
  }
  if (/see (the )?(previous|last|earlier) entry|from the last entry/i.test(newest)) {
    warn('Newest entry points back at an older entry. Restate the item, or name its Known Gaps bullet.');
  }
  if (newestLines.length > ENTRY_LINE_LIMIT) {
    warn(`Newest entry is ${newestLines.length} non-blank lines (limit ${ENTRY_LINE_LIMIT}). Cut "Did"; keep "Didn't work".`);
  }

  const planText = read(PLAN);
  const plan = planText.split('\n');
  const bytes = Buffer.byteLength(planText);
  if (bytes > PLAN_BYTE_LIMIT) warn(`${PLAN} is ${bytes} B (limit ${PLAN_BYTE_LIMIT}). Archive finished phases or closed gaps.`);

  const gapsStart = plan.findIndex((line) => /^## Known Gaps/.test(line));
  plan.forEach((line, index) => {
    const inGaps = gapsStart !== -1 && index > gapsStart;
    if (inGaps && /^- \*\*(RESOLVED|CLOSED|DECIDED)\b|\*\*Closed by /.test(line)) {
      warn(`${PLAN}:${index + 1} closed gap still live — move the whole bullet to ${ARCHIVE_DIR}/plan-closed-gaps.md.`);
    }
    if (/^### Measured (after|baseline)/.test(line)) {
      warn(`${PLAN}:${index + 1} "${line}" — update "Current figures" instead, and move this to ${ARCHIVE_DIR}/plan-phases.md.`);
    }
  });

  const completePhases = new Set(
    plan.filter((line) => /^\| \d+ \|.*\|\s*\*\*complete/.test(line)).map((line) => Number(line.split('|')[1])),
  );
  plan.forEach((line, index) => {
    const phase = line.match(/^#{1,2} PHASE (\d+)\b/);
    if (phase && completePhases.has(Number(phase[1]))) {
      warn(`${PLAN}:${index + 1} Phase ${phase[1]} is complete but its detail is still live — move it to ${ARCHIVE_DIR}/plan-phases.md, keep only what is carried forward.`);
    }
  });

  if (warnings.length === 0) {
    console.log('lint: OK');
    return 0;
  }
  console.log(warnings.map((message) => `WARN ${message}`).join('\n'));
  return 1;
}

/** Every file the handoff owns: the two live docs plus the archive. */
function trackedDocs(listArchive) {
  return [PLAN, LOG, ...listArchive().map((name) => `${ARCHIVE_DIR}/${name}`)];
}

// Lines too generic to prove anything by their presence: blanks, rules, table separators.
const isTrivial = (line) => line.trim().length < 4 || /^\|[\s|:-]+\|$/.test(line.trim());

function countLines(texts) {
  const counts = new Map();
  for (const text of texts) {
    for (const raw of text.split('\n')) {
      const line = raw.trimEnd();
      if (!isTrivial(line)) counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  return counts;
}

function verify(ref) {
  const archivedAtRef = sh(`git ls-tree --name-only ${ref} ${ARCHIVE_DIR}/`)
    .split('\n')
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.basename(file));
  const before = trackedDocs(() => archivedAtRef).map((file) => ({
    file,
    text: sh(`git cat-file -e ${ref}:${file} 2>/dev/null && git show ${ref}:${file}`),
  }));

  const archiveNow = existsSync(ARCHIVE_DIR)
    ? readdirSync(ARCHIVE_DIR).filter((name) => name.endsWith('.md') && statSync(`${ARCHIVE_DIR}/${name}`).isFile())
    : [];
  const after = countLines(trackedDocs(() => archiveNow).filter(existsSync).map(read));

  const missing = [];
  for (const { file, text } of before) {
    text.split('\n').forEach((raw, index) => {
      const line = raw.trimEnd();
      if (isTrivial(line)) return;
      const left = after.get(line) ?? 0;
      if (left > 0) after.set(line, left - 1);
      else missing.push(`${file}:${index + 1}: ${line.length > 140 ? `${line.slice(0, 137)}…` : line}`);
    });
  }

  if (missing.length === 0) {
    console.log(`verify: OK — every line of the handoff docs at ${ref} is still present (live or archived).`);
    return 0;
  }
  console.log(`verify: ${missing.length} line(s) present at ${ref} are gone from both the live docs and ${ARCHIVE_DIR}/.`);
  console.log('Each must be a line you rewrote on purpose (a status cell, a figure). Anything else is lost data — restore it.\n');
  console.log(missing.join('\n'));
  return 1;
}

const [mode = 'start', ...args] = process.argv.slice(2);
const exitCode = {
  start: () => (start(!args.includes('--no-build')), 0),
  facts: () => (facts(), 0),
  lint,
  verify: () => verify(args[0] ?? 'HEAD'),
}[mode]?.();

if (exitCode === undefined) {
  console.error(`unknown mode "${mode}" — use start | facts | lint | verify [ref]`);
  process.exit(2);
}
process.exit(exitCode);
