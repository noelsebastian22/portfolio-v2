/**
 * Every shared chunk (`timeline`, `tip`) is discovered only after the entry chunk that
 * imports it has been fetched and parsed — one extra round trip per shared chunk, on every
 * page load. Vite injects `modulepreload` links automatically when it owns the HTML entry
 * point, but Astro's static build renders page HTML itself and hands Vite only the client
 * script graph, so that automatic injection never runs. Checked Vite's `build.modulePreload`
 * option and Astro's own integration hooks: neither rewrites HTML Astro has already
 * written to disk, so this integration does it directly, as an `astro:build:done` pass
 * (Task 9.4).
 *
 * `astro:build:done` runs after every page's HTML is on disk. For each page, this walks the
 * static import closure of its entry scripts (the same `pageScripts` / `staticImports` /
 * `resolveSpecifier` the budget script uses — one parser for both, so a change to how
 * Astro/Vite emits scripts only has to be taught in one place) and adds a
 * `<link rel="modulepreload">` in `<head>` for every chunk in that closure that is not
 * itself an entry — the entries are already found immediately from their own
 * `<script type="module" src>` tag.
 *
 * **`fetchpriority="low"`, measured, not assumed.** The naive version (no `fetchpriority`)
 * does remove the round trip — Lighthouse's network-dependency-tree-insight confirms
 * `timeline`/`tip` no longer appear as chain children at all, discovered alongside the HTML
 * instead of after an entry parses — but a plain `modulepreload` is high-priority by
 * default, and `timeline` is 50.84 KB gzip of GSAP that nothing needs before first paint (no
 * section registers a scroll trigger until after interaction). Pulling it forward at high
 * priority measurably cost FCP: three-run Lighthouse medians went 1,282.5ms (chunking-merge
 * only, no preload) → 1,656.0ms (`modulepreload`, default priority) — a real, reproducible
 * +373.5ms, not noise (the three preloaded runs clustered within 7ms of each other). LCP
 * moved the same direction, 2,404.9ms → 2,479.3ms. Adding `fetchpriority="low"` keeps the
 * round-trip fix and *improves* on the no-preload baseline: FCP 1,054.8ms, LCP 2,404.8ms —
 * the browser still starts the fetch immediately (no round trip), just without competing at
 * high priority against the fonts and CSS actually on the critical path.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { pageScripts, resolveSpecifier, staticImports } from '../../scripts/lib/budget.mjs';

/** Every `*.html` file under `dir`, as absolute filesystem paths. */
function findHtmlFiles(dir: string): string[] {
  const out: string[] = [];
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

/** Every chunk reachable from `entryPaths` by static import, entries themselves excluded. */
function closureBeyondEntries(distDir: string, entryPaths: string[]): string[] {
  const visited = new Set(entryPaths);
  const beyond: string[] = [];
  const queue = [...entryPaths];

  while (queue.length > 0) {
    const urlPath = queue.shift()!;
    const js = readFileSync(path.join(distDir, urlPath), 'utf8');
    for (const specifier of staticImports(js)) {
      const resolved = resolveSpecifier(urlPath, specifier);
      if (visited.has(resolved)) continue;
      visited.add(resolved);
      beyond.push(resolved);
      queue.push(resolved);
    }
  }

  return beyond;
}

export default function modulePreload(): AstroIntegration {
  return {
    name: 'modulepreload',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const distDir = fileURLToPath(dir);

        for (const htmlFile of findHtmlFiles(distDir)) {
          const html = readFileSync(htmlFile, 'utf8');
          const { external } = pageScripts(html);
          const toPreload = closureBeyondEntries(distDir, external);
          if (toPreload.length === 0) continue;

          const links = toPreload
            .map((href) => `<link rel="modulepreload" href="${href}" fetchpriority="low">`)
            .join('');
          const withLinks = html.replace('</head>', `${links}</head>`);
          writeFileSync(htmlFile, withLinks);
        }
      },
    },
  };
}
