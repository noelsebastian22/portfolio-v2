#!/usr/bin/env node
/**
 * npm run fonts — cut the two self-hosted variable fonts down to what the site sets.
 *
 * The untouched masters live in font-masters/, OUTSIDE public/, so nothing in that
 * folder is ever deployed (the gallery-masters/ pattern). This script is the only thing
 * that writes public/fonts/*.woff2, and it keeps their names, so the @font-face URLs in
 * src/styles/tokens.css and the two preloads in BaseLayout.astro never move.
 *
 *   npm run build && npm run fonts && npm run build
 *
 * The first build is what gets scanned; the second ships the new files. The fonts do
 * not change a single character of the HTML, so one scan is enough.
 *
 * Why it matters: both files are preloaded, and Lighthouse's simulator charges preload
 * bytes to LCP — the LCP element is hero text (Task 9.8).
 *
 * ── What is kept ──────────────────────────────────────────────────────────────────────
 *
 * CODEPOINTS. Google Fonts' "latin" range plus every codepoint that actually appears in
 * the built site: all of dist/**\/*.html (text, attributes, inline <style> — so CSS
 * `content:` strings too) and every built .css/.js file (islands write status text such as
 * the contact form's "Sending…"). Only non-ASCII characters need collecting; printable
 * ASCII is inside the latin range already. Scanning whole files over-collects slightly
 * (a <title> or a comment), which is harmless: a codepoint the master lacks costs nothing.
 *
 * Note the masters are ALREADY Google's latin subset (Fontsource ships them that way) —
 * so the codepoint cut alone saves little. The bytes come from the two cuts below.
 *
 * AXES. Every axis is kept and stays variable. Archivo's `wdth` is narrowed from 62–125 to
 * 100–125: the site only ever sets 100% (the default), 112% and 125%, and the condensed
 * half of the design space was roughly a third of the file. The script checks every
 * `font-stretch` in the build against the kept range and fails if one falls outside it.
 * `wght` keeps its full range on both fonts.
 *
 * LAYOUT FEATURES. Everything the master carries, minus the few in DROP_FEATURES — only
 * features the site never switches on (nothing sets `font-variant-numeric: diagonal-
 * fractions` or `font-feature-settings`). The script fails if the build starts using
 * either property, so this list gets re-examined instead of silently going stale.
 *
 * ── Failing loudly ────────────────────────────────────────────────────────────────────
 *
 * The output is re-read after writing and checked: every required codepoint the master
 * can render is in the subset's cmap, and every axis is still present. A used codepoint
 * the MASTER cannot render is not a subsetting problem — no subset can add a glyph — but
 * it does render in a fallback face, so it fails too unless it is listed in
 * KNOWN_MASTER_GAPS with where it appears.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontverter from 'fontverter';
import opentype from 'opentype.js';
import subsetFont from 'subset-font';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MASTERS = path.join(ROOT, 'font-masters');
const OUT = path.join(ROOT, 'public', 'fonts');

/** Google Fonts' "latin" unicode-range, verbatim. */
const LATIN_RANGE = [
  [0x0000, 0x00ff], [0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc], [0x02c6], [0x02da],
  [0x02dc], [0x0304], [0x0308], [0x0329], [0x2000, 0x206f], [0x20ac], [0x2122],
  [0x2191], [0x2193], [0x2212], [0x2215], [0xfeff], [0xfffd],
];

/**
 * Used codepoints that neither master contains, so they render in a fallback face on the
 * live site regardless of subsetting. Each is accepted knowingly; anything new fails.
 */
const KNOWN_MASTER_GAPS = new Map([
  [0x2192, '→ — Selected Work study caption ("Bundle size, 100% → 40%")'],
  [0x2197, '↗ — /websites only (redirected until the Phase 14 restyle)'],
  [0x2500, '─ — /websites only (redirected until the Phase 14 restyle)'],
  [0x2713, '✓ — /websites only (redirected until the Phase 14 restyle)'],
]);

const FONTS = [
  {
    file: 'archivo-var.woff2',
    dropFeatures: ['frac', 'numr', 'dnom'],
    // Narrowed, not pinned: the axis stays variable across every width the site sets.
    // Must match `font-stretch` in the @font-face in src/styles/tokens.css.
    axisRanges: { wdth: { min: 100, max: 125, default: 100 } },
  },
  {
    file: 'jetbrains-mono-var.woff2',
    dropFeatures: [],
    axisRanges: {},
  },
];

const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

function fail(message) {
  console.error(`\nnpm run fonts: FAILED — ${message}\n`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Parse any woff2/ttf buffer into an opentype.js font. */
async function parse(buffer) {
  const sfnt = await fontverter.convert(buffer, 'truetype');
  return opentype.parse(sfnt.buffer.slice(sfnt.byteOffset, sfnt.byteOffset + sfnt.byteLength));
}

const cmapOf = (font) => new Set(Object.keys(font.tables.cmap.glyphIndexMap).map(Number));
const axesOf = (font) =>
  Object.fromEntries((font.tables.fvar?.axes ?? []).map((a) => [a.tag, [a.minValue, a.maxValue]]));
const featuresOf = (font) =>
  new Set([...(font.tables.gsub?.features ?? []), ...(font.tables.gpos?.features ?? [])].map((f) => f.tag));

// ── 1. Scan the build ──────────────────────────────────────────────────────────────────

if (!existsSync(path.join(DIST, 'index.html'))) {
  fail('no dist/index.html — run `npm run build` first; the build is what gets scanned.');
}

const builtFiles = walk(DIST).filter((file) => /\.(html|css|js)$/.test(file));
const usedCodepoints = new Map(); // codepoint → first file it was seen in
const stretchValues = new Set();
const usesUnkeptFeatureSwitch = [];

for (const file of builtFiles) {
  const source = readFileSync(file, 'utf8');
  for (const char of source) {
    const cp = char.codePointAt(0);
    const isOutsidePrintableAscii = cp > 0x7e;
    if (isOutsidePrintableAscii && !usedCodepoints.has(cp)) {
      usedCodepoints.set(cp, path.relative(DIST, file));
    }
  }
  for (const match of source.matchAll(/font-stretch\s*:\s*([^;}"]+)/g)) stretchValues.add(match[1].trim());
  if (/font-feature-settings|diagonal-fractions|stacked-fractions/.test(source)) {
    usesUnkeptFeatureSwitch.push(path.relative(DIST, file));
  }
}

if (usesUnkeptFeatureSwitch.length > 0) {
  fail(
    `the build now sets font-feature-settings or a fraction variant (${usesUnkeptFeatureSwitch.join(', ')}). ` +
      'Re-examine dropFeatures in scripts/fonts.mjs before shipping.',
  );
}

// font-stretch keywords, as CSS Fonts 4 maps them to percentages.
const STRETCH_KEYWORDS = {
  'ultra-condensed': 50, 'extra-condensed': 62.5, condensed: 75, 'semi-condensed': 87.5,
  normal: 100, 'semi-expanded': 112.5, expanded: 125, 'extra-expanded': 150, 'ultra-expanded': 200,
};
const wdthRange = FONTS[0].axisRanges.wdth;
for (const value of stretchValues) {
  const isInheritKeyword = ['inherit', 'initial', 'unset', 'revert'].includes(value);
  if (isInheritKeyword) continue;
  // The @font-face descriptor itself ("100% 125%") is a range; check both ends.
  for (const part of value.split(/\s+/)) {
    const percent = STRETCH_KEYWORDS[part] ?? parseFloat(part);
    const isOutsideKeptRange = !(percent >= wdthRange.min && percent <= wdthRange.max);
    if (isOutsideKeptRange) {
      fail(`the build sets font-stretch: ${value}, outside Archivo's kept wdth ${wdthRange.min}–${wdthRange.max}.`);
    }
  }
}

const required = new Set(usedCodepoints.keys());
for (const [start, end = start] of LATIN_RANGE) {
  for (let cp = start; cp <= end; cp++) required.add(cp);
}
const subsetText = [...required].map((cp) => String.fromCodePoint(cp)).join('');

// ── 2. Subset, then re-read and verify ──────────────────────────────────────────────────

const masterCmaps = [];
const outputs = []; // written only once every check below has passed
const rows = [];

for (const { file, dropFeatures, axisRanges } of FONTS) {
  const masterBytes = readFileSync(path.join(MASTERS, file));
  const master = await parse(masterBytes);
  const masterCmap = cmapOf(master);
  const keepFeatures = [...featuresOf(master)].filter((tag) => !dropFeatures.includes(tag));

  const subsetBytes = await subsetFont(masterBytes, subsetText, {
    targetFormat: 'woff2',
    keepFeatures,
    variationAxes: axisRanges,
  });

  const subset = await parse(subsetBytes);
  const subsetCmap = cmapOf(subset);

  const dropped = [...required].filter((cp) => masterCmap.has(cp) && !subsetCmap.has(cp));
  if (dropped.length > 0) fail(`${file} lost codepoints the master has: ${dropped.map(hex).join(' ')}`);

  masterCmaps.push(masterCmap);

  const masterAxes = axesOf(master);
  const subsetAxes = axesOf(subset);
  for (const tag of Object.keys(masterAxes)) {
    if (!subsetAxes[tag]) fail(`${file} lost its ${tag} axis.`);
    const expected = axisRanges[tag] ? [axisRanges[tag].min, axisRanges[tag].max] : masterAxes[tag];
    const [min, max] = subsetAxes[tag];
    if (min !== expected[0] || max !== expected[1]) {
      fail(`${file} ${tag} is ${min}–${max}, expected ${expected[0]}–${expected[1]}.`);
    }
  }

  const lostFeatures = keepFeatures.filter((tag) => !featuresOf(subset).has(tag));
  if (lostFeatures.length > 0) fail(`${file} lost layout features: ${lostFeatures.join(', ')}`);

  outputs.push([file, subsetBytes]);
  rows.push({
    file,
    master: masterBytes.length,
    subset: subsetBytes.length,
    glyphs: `${master.numGlyphs} → ${subset.numGlyphs}`,
    axes: Object.entries(subsetAxes).map(([tag, [min, max]]) => `${tag} ${min}–${max}`).join(', '),
  });
}

// Only a gap BOTH faces lack is certain to fall back — the scan cannot tell which face a
// character is set in, and mono text may use a codepoint Archivo lacks.
const masterGaps = [...usedCodepoints].filter(([cp]) => masterCmaps.every((cmap) => !cmap.has(cp)));
const unexplainedGaps = masterGaps.filter(([cp]) => !KNOWN_MASTER_GAPS.has(cp));
if (unexplainedGaps.length > 0) {
  fail(
    'the build uses codepoints the master fonts cannot render (they fall back to a system face):\n' +
      unexplainedGaps.map(([cp, seenIn]) => `  ${hex(cp)} ${String.fromCodePoint(cp)}  in ${seenIn}`).join('\n') +
      '\nEither change the copy, or add the codepoint to KNOWN_MASTER_GAPS with where it appears.',
  );
}

for (const [file, bytes] of outputs) writeFileSync(path.join(OUT, file), bytes);

console.table(rows);
console.log(
  `Scanned ${builtFiles.length} built files; ${usedCodepoints.size} non-ASCII codepoints in use; ` +
    `font-stretch values: ${[...stretchValues].join(', ') || 'none'}.`,
);
for (const [cp] of masterGaps) {
  console.log(`  known fallback: ${hex(cp)} ${KNOWN_MASTER_GAPS.get(cp)}`);
}
console.log('Wrote public/fonts/. Run `npm run build` again to ship them.');
