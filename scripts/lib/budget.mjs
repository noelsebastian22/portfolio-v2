/**
 * Pure parsing helpers for the JS budget (scripts/budget.mjs) and for the modulepreload
 * integration (src/integrations/modulepreload.ts). One parser for both, so a change to how
 * Astro/Vite emits scripts only has to be taught to this file once.
 *
 * No IO here — these are string-in, data-out, so they are unit-testable without a build.
 */

/**
 * Every script a page runs before interaction: external `src`s (`<script type="module" src>`
 * and `<link rel="modulepreload">`), and inline executable bodies (`<script type="module">`
 * with no `src`, and classic `<script>` with no `type`/`src`). JSON-LD (`type="application/
 * ld+json"`) and other non-JS `<script>` types are not scripts and are excluded.
 *
 * @param {string} html
 * @returns {{ external: string[], inline: string[] }}
 */
export function pageScripts(html) {
  const external = [];
  const inline = [];

  const linkRe = /<link\b([^>]*)>/gi;
  let linkMatch;
  while ((linkMatch = linkRe.exec(html))) {
    const attrs = linkMatch[1];
    if (!/\brel\s*=\s*["']modulepreload["']/i.test(attrs)) continue;
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i);
    if (hrefMatch) external.push(hrefMatch[1]);
  }

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRe.exec(html))) {
    const attrs = scriptMatch[1];
    const body = scriptMatch[2];

    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']*)["']/i);
    const type = typeMatch ? typeMatch[1] : null;

    // A JS-executing script is either untyped (classic script) or explicitly a module.
    // Anything else (application/ld+json, importmap, etc.) never runs as a script.
    const isJs = type === null || type === 'module';
    if (!isJs) continue;

    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
    if (srcMatch) {
      external.push(srcMatch[1]);
    } else {
      const trimmed = body.trim();
      if (trimmed) inline.push(trimmed);
    }
  }

  return { external, inline };
}

/**
 * Relative specifiers of a chunk's *static* imports and re-exports, minified or not.
 * `import("./x.js")` is dynamic — it loads after interaction — and is excluded, as are bare
 * package specifiers (the build leaves none in emitted chunks, so anything that isn't a
 * relative path is someone else's problem to resolve, not a local file to walk).
 *
 * Matches `import`/`export` followed either directly by a quote (a bare `import "./x.js"`)
 * or by bindings (`[\w*{}\s,$]`, i.e. names, `*`, braces, commas, whitespace) and then `from`
 * and a quote.
 *
 * @param {string} js
 * @returns {string[]}
 */
export function staticImports(js) {
  const specifiers = [];
  const re = /\b(?:import|export)\s*(?:"|'|(?:[\w*{}\s,$]+from\s*)(?:"|'))/g;
  let match;
  while ((match = re.exec(js))) {
    const quoteStart = match[0].slice(-1);
    const start = match.index + match[0].length;
    const end = js.indexOf(quoteStart, start);
    if (end === -1) continue;
    const specifier = js.slice(start, end);
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

/**
 * A specifier resolved against the URL path of the chunk that imports it.
 *
 * @param {string} fromPath e.g. '/_astro/Ring.b2.js'
 * @param {string} specifier e.g. './tip.a1.js'
 * @returns {string} e.g. '/_astro/tip.a1.js'
 */
export function resolveSpecifier(fromPath, specifier) {
  return new URL(specifier, 'https://x' + fromPath).pathname;
}
