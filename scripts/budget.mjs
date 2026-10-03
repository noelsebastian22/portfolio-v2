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
 *
 * Phase 10: this script also fails the build if any page's initial script graph contains
 * Three.js (`containsThree`, lib/budget.mjs) — the WebGL tube is only ever behind a dynamic
 * `import()`, never in a page's own closure. Separately, it finds the enhanced chunk — every
 * chunk no page loads up front that a late (dynamic-import) entry point reaches on its way to
 * Three.js — sums its gzip size, reports it, and gates it at 256,000 bytes (250 KB gzip,
 * spec §12).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { containsThree, pageScripts, resolveSpecifier, staticImports } from './lib/budget.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BUDGET_BYTES = 81_920; // 80 KB gzip, spec §12 — copied verbatim, never re-derived.
const ENHANCED_BUDGET_BYTES = 256_000; // 250 KB gzip, spec §12 — the post-interactive WebGL chunk.
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
    files.push({ path: urlPath, raw: raw.length, gzip: gzip.length, hasThree: containsThree(raw.toString('utf8')) });

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

  return { page: pagePath(htmlFile), rows, total, files };
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

  // Spec §11.3: Three.js lives behind a dynamic import and is never in an initial chunk.
  const pagesLoadingThree = pages.filter((result) => result.files.some((file) => file.hasThree));
  for (const result of pagesLoadingThree) {
    console.error(`\n${result.page} loads Three.js before interaction.`);
  }

  // The enhanced chunk: every built chunk no page loads up front, closed over its static
  // imports, that reaches Three.js — minus anything a page already loaded.
  const initialPaths = new Set(pages.flatMap((result) => result.files.map((file) => file.path)));
  const astroDir = path.join(DIST, '_astro');
  const lateEntries = readdirSync(astroDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => `/_astro/${name}`)
    .filter((urlPath) => !initialPaths.has(urlPath));
  const enhanced = new Map();
  for (const entry of lateEntries) {
    const closure = walkClosure([entry]);
    if (!closure.some((file) => file.hasThree)) continue;
    for (const file of closure) if (!initialPaths.has(file.path)) enhanced.set(file.path, file);
  }
  // Finding none is a failure, not a pass: if a Three upgrade drops `__THREE__` or the chunk
  // stops being emitted, both Three.js checks above would otherwise go green measuring nothing.
  if (enhanced.size === 0) {
    console.error('\nNo enhanced chunk containing Three.js (`__THREE__`) found in dist/_astro — the Three.js checks cannot run.');
    process.exit(1);
  }
  const enhancedTotal = [...enhanced.values()].reduce((sum, file) => sum + file.gzip, 0);
  const pct = ((enhancedTotal / ENHANCED_BUDGET_BYTES) * 100).toFixed(1);
  console.log(`\nEnhanced WebGL chunk (after interaction): ${enhancedTotal} gzip, ${pct}% of ${ENHANCED_BUDGET_BYTES}.`);
  const enhancedOverBudget = enhancedTotal > ENHANCED_BUDGET_BYTES;
  if (enhancedOverBudget) console.error(`Enhanced chunk exceeds ${ENHANCED_BUDGET_BYTES} bytes.`);
  if (pagesLoadingThree.length > 0 || enhancedOverBudget) process.exit(1);

  if (overBudget) {
    console.error(`\n${GATED_PAGE} exceeds the ${BUDGET_BYTES}-byte budget.`);
    process.exit(1);
  }
}

main();
