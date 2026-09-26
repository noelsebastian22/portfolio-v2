import { describe, expect, it } from 'vitest';
import { pageScripts, resolveSpecifier, staticImports } from '../scripts/lib/budget.mjs';

describe('pageScripts', () => {
  const html = `<head>
    <link rel="modulepreload" href="/_astro/tip.a1.js">
    <link rel="stylesheet" href="/_astro/index.css">
    <script type="application/ld+json">{"@type":"Person"}</script>
  </head><body>
    <script type="module">const a = 1;</script>
    <script>console.log(2)</script>
    <script type="module" src="/_astro/Ring.b2.js"></script>
  </body>`;

  it('collects external module scripts and modulepreloads', () => {
    expect(pageScripts(html).external.sort()).toEqual(['/_astro/Ring.b2.js', '/_astro/tip.a1.js']);
  });

  it('collects inline executable scripts and skips JSON-LD', () => {
    expect(pageScripts(html).inline).toEqual(['const a = 1;', 'console.log(2)']);
  });
});

describe('staticImports', () => {
  it('reads minified static imports, bare imports and re-exports', () => {
    const js = 'import{a as b}from"./timeline.x.js";import"./side.y.js";import*as c from"./ns.z.js";export{d}from"./re.w.js";';
    expect(staticImports(js)).toEqual(['./timeline.x.js', './side.y.js', './ns.z.js', './re.w.js']);
  });

  it('reads default-plus-named imports with whitespace', () => {
    expect(staticImports('import def, { e } from "./mixed.js";')).toEqual(['./mixed.js']);
  });

  it('excludes dynamic import()', () => {
    expect(staticImports('const m = await import("./lazy.js"); import{x}from"./eager.js";')).toEqual(['./eager.js']);
  });

  it('ignores bare package specifiers (the build leaves none)', () => {
    expect(staticImports('import{x}from"gsap";')).toEqual([]);
  });
});

describe('resolveSpecifier', () => {
  it('resolves against the importing chunk', () => {
    expect(resolveSpecifier('/_astro/Ring.b2.js', './tip.a1.js')).toBe('/_astro/tip.a1.js');
    expect(resolveSpecifier('/_astro/deep/x.js', '../y.js')).toBe('/_astro/y.js');
  });
});
