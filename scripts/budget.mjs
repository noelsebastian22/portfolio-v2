#!/usr/bin/env node
/**
 * npm run budget — every script a built page loads before interaction, gzipped, summed
 * against the 80 KB (81,920 byte) base-path budget (spec §12, AGENTS.md "Performance is
 * the pitch").
 *
 * Walks `dist/**\/*.html` (run this after `npm run build`, not chained into it — the build
 * has to finish and the files have to exist on disk first). For each page:
 *
 *   1. `pageScripts()` finds every external `src`/`modulepreload` and every inline
 *      executable body the page loads.
 *   2. Each external file is read from `dist/`, gzipped, and walked for its own static
 *      import closure (`staticImports` + `resolveSpecifier`) so a shared chunk discovered
 *      three hops deep still gets counted — visited once, no matter how many chunks import
 *      it, so a fan-in chunk (`tip`, `timeline`) is never double-charged.
 *   3. Every inline body is gzipped on its own.
 *
 * Dynamic `import()` is excluded by `staticImports` — that code loads after interaction and
 * is not part of the "before the page is usable" budget this script measures.
 *
 * Caveat on inline bodies: each is gzipped standalone, separately from the surrounding HTML.
 * Gzip has per-stream overhead and no shared dictionary with the page's other bytes, so this
 * slightly *overstates* an inline script's true marginal cost versus what gzipping it in
 * place inside the HTML response would show. Accepted: it is a stable, page-independent
 * number, and it errs conservative rather than optimistic against the budget.
 *
 * Only `/` is gated (exit 1 over budget) — `/websites` is reported, not gated, until Phase
 * 14 restyles it (BUILD-PLAN.md, Phase 9 "Deliberately not in Phase 9").
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { pageScripts, resolveSpecifier, staticImports } from './lib/budget.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BUDGET_BYTES = 81_920; // 80 KB gzip, spec §12 — copied verbatim, never re-derived.
const GATED_PAGE = '/';

/** Every `*.html` file under `dist/`, as absolute filesystem paths. */
function findHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

/** `dist/index.html` → '/', `dist/websites/index.html` → '/websites'. */
function pagePath(htmlFile) {
  const rel = path.relative(DIST, htmlFile).replace(/\\/g, '/');
  const trimmed = rel.replace(/(^|\/)index\.html$/, '');
  return '/' + trimmed;
}

/** A dist-relative URL path ('/_astro/x.js') as bytes on disk. */
function readDistFile(urlPath) {
  return readFileSync(path.join(DIST, urlPath));
}

/**
 * Every external file reachable from `entryPaths` by static import, each visited once, as
 * `{ path, raw, gzip }`. Shared chunks fan in from several entries; the `visited` set is
 * what keeps them single-counted.
 */
function walkClosure(entryPaths) {
  const visited = new Set();
  const files = [];
  const queue = [...entryPaths];

  while (queue.length > 0) {
    const urlPath = queue.shift();
    if (visited.has(urlPath)) continue;
    visited.add(urlPath);

    const raw = readDistFile(urlPath);
    const gzip = gzipSync(raw);
    files.push({ path: urlPath, raw: raw.length, gzip: gzip.length });

    for (const specifier of staticImports(raw.toString('utf8'))) {
      queue.push(resolveSpecifier(urlPath, specifier));
    }
  }

  return files;
}

/** One page's report: every file and inline body, its total, and its share of the budget. */
function measurePage(htmlFile) {
  const html = readFileSync(htmlFile, 'utf8');
  const { external, inline } = pageScripts(html);

  const files = walkClosure(external);
  const inlineBodies = inline.map((body, i) => {
    const raw = Buffer.byteLength(body, 'utf8');
    const gzip = gzipSync(body).length;
    return { path: `(inline #${i + 1})`, raw, gzip };
  });

  const rows = [...files, ...inlineBodies].sort((a, b) => b.gzip - a.gzip);
  const total = rows.reduce((sum, row) => sum + row.gzip, 0);

  return { page: pagePath(htmlFile), rows, total };
}

function printReport({ page, rows, total }) {
  console.log(`\n${page}`);
  const nameWidth = Math.max(4, ...rows.map((r) => r.path.length));
  console.log(`  ${'file'.padEnd(nameWidth)}  ${'raw'.padStart(8)}  ${'gzip'.padStart(8)}`);
  for (const row of rows) {
    console.log(`  ${row.path.padEnd(nameWidth)}  ${String(row.raw).padStart(8)}  ${String(row.gzip).padStart(8)}`);
  }
  const pct = ((total / BUDGET_BYTES) * 100).toFixed(1);
  console.log(`  ${'TOTAL'.padEnd(nameWidth)}  ${''.padStart(8)}  ${String(total).padStart(8)}`);
  console.log(`  ${pct}% of the ${BUDGET_BYTES}-byte (80 KB gzip) budget.`);
}

function main() {
  if (!statSync(DIST, { throwIfNoEntry: false })) {
    console.error(`dist/ not found at ${DIST} — run \`npm run build\` first.`);
    process.exit(1);
  }

  const pages = findHtmlFiles(DIST).map(measurePage).sort((a, b) => a.page.localeCompare(b.page));

  let overBudget = false;
  for (const result of pages) {
    printReport(result);
    if (result.page === GATED_PAGE && result.total > BUDGET_BYTES) {
      overBudget = true;
    }
  }

  if (overBudget) {
    console.error(`\n${GATED_PAGE} exceeds the ${BUDGET_BYTES}-byte budget.`);
    process.exit(1);
  }
}

main();
