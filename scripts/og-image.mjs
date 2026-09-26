/**
 * Bake the share card at public/og-image.png.
 *
 * Committed raster, not a build step, for two reasons: Vercel's build image has no brand
 * fonts installed, and a committed file is reviewable in a diff the way a build artifact
 * never is. Re-run `npm run images` (or this script alone) after a tokens.css palette
 * change, a path.ts control-point edit, or a font swap, and the card follows.
 *
 *   node scripts/og-image.mjs
 *
 * Three things feed it, none of them duplicated here:
 *   - the curve: sampleSignalRange() from src/lib/signal/path.ts — the one canonical
 *     geometry, the same the favicon and the live signal layer sample.
 *   - the colours: readTone() against src/styles/tokens.css — no hex literals below.
 *   - the faces: scripts/og/fonts/ — see SOURCE.md there for exactly where each TTF came
 *     from and why it has to be a static instance rather than the site's variable WOFF2.
 *
 * ── Why this shapes text into paths instead of asking sharp to render <text> ──────────
 *
 * The plan going in was sharp's ordinary route: an SVG string with <text font-family="…">,
 * rendered through a FONTCONFIG_FILE scoped to this directory so librsvg's Pango can only
 * ever see these three faces. That is the right plan on Linux, where fontconfig is Pango's
 * only backend. It does not work on this machine, and the failure is worth recording so
 * nobody re-discovers it by way of a silently wrong card:
 *
 *   - With FONTCONFIG_FILE pointed at this directory (any directory — even one holding
 *     only a single, unambiguous, exactly-named font), sharp's SVG <text> path renders
 *     every request identically, byte-for-byte, to a request for a font name that does not
 *     exist anywhere. No warning, no error. Confirmed with `md5`, not by eye.
 *   - `sharp({ text: { font, fontfile } })` — libvips' other text path — at least *tries*:
 *     it logs `Pango-CRITICAL: Unknown $PANGOCAIRO_BACKEND value. Available backends are:
 *     coretext` the moment FONTCONFIG_FILE's sibling switch, PANGOCAIRO_BACKEND=fontconfig,
 *     is set. This sharp/libvips prebuild's Pango was compiled with CoreText as its only
 *     backend — fontconfig support was never linked in, on this platform, so no environment
 *     variable can reach it. (Filed upstream against lovell/sharp#4577 by another user
 *     hitting the same wall on Apple Silicon.) Forcing the switch anyway doesn't warn, it
 *     segfaults the process.
 *   - CoreText can't be pointed at an arbitrary directory the way fontconfig can — it only
 *     sees fonts actually registered with the OS (Font Book, ~/Library/Fonts, or an
 *     explicit CTFontManager registration call). Doing that from a build script means
 *     either a native addon or leaving files in the user's font library, neither of
 *     which belongs in this repo's build step.
 *
 * So: no OS text-shaping stack at all. `opentype.js` reads each TTF directly and turns
 * each string into actual glyph outlines — the exact contours these fonts define — which
 * get handed to sharp as plain <path> data. sharp/librsvg only ever rasterises geometry,
 * never resolves a font by name, so there is nothing here for a fallback face to hide in:
 * either the glyph is the right one or the path is visibly wrong. The one thing given up
 * is full Pango shaping (bidi, complex scripts); what's kept by hand is what these four
 * plain, short, left-to-right Latin lines actually need — per-glyph advance widths and
 * kerning-table lookups, both straight out of the font (`buildTextPath` below). Also:
 * opentype.js's own high-level `font.getPath(text, …)` throws on one of Archivo's GSUB
 * lookup formats ("substFormat: 2 is not yet supported") — `charToGlyph` + manual layout
 * sidesteps that shaping engine entirely rather than working around it.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { sampleSignalRange } from '../src/lib/signal/path.ts';
import { readTokens, readTone } from './lib/tokens.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_DIR = path.join(ROOT, 'scripts', 'og', 'fonts');
const OUT_FILE = path.join(ROOT, 'public', 'og-image.png');

const CARD = { width: 1200, height: 630 };

/**
 * Layout is computed from these, not from pixels measured off a render: a font swap or a
 * copy change must shrink the name or shrink the glyph, on its own, rather than silently
 * re-crowding the card the way the previous hand-tuned position could.
 */
const MARGIN = 80; // left margin = right margin, both sides of the card
const GLYPH_GAP = 64; // minimum clear space between the name's right edge and the glyph's box
const GLYPH_BOX_MIN = 200; // smallest the signal glyph may render at and still read as a glyph
const NAME_FONT_SIZE = 78; // preferred size (the old card's); shrinks only if the layout demands it
const NAME_LETTER_SPACING_EM = -3 / 78; // the old card's tracking, as a fraction of its own size, so it scales with the font

const NAME_Y = 268;
const ROLE_Y = 326;
const MONO_Y = 392;
const DOMAIN_Y = 533;
const BAR = { y: 500, width: 4, height: 44 };

const rgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

/**
 * Fits `points` into a `size`×`size` box at (originX, originY), independently normalising
 * each axis to its own min/max — the exact method in favicon.svg's <metadata> command,
 * generalised so this script doesn't hand-carry a second copy of the curve's numbers.
 * Aspect is deliberately not preserved: it's what turns the years+work span's mostly-flat
 * geometry into a glyph that reads as tall and specific rather than a flat squiggle.
 */
function fitSignalPath(points, size, originX, originY) {
  const xs = points.map((p) => (p.x + 1) / 2);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const px = ((xs[i] - x0) / (x1 - x0)) * size + originX;
    const py = ((ys[i] - y0) / (y1 - y0)) * size + originY;
    d += `${i === 0 ? 'M' : ' L'}${px.toFixed(2)} ${py.toFixed(2)}`;
  }
  return d;
}

/** An ArrayBuffer view over `buf` without copying — what opentype.parse() wants. */
function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function loadFont(relativePath) {
  const buf = await readFile(path.join(FONTS_DIR, relativePath));
  return opentype.parse(toArrayBuffer(buf));
}

/**
 * One string, in one font, as a single SVG path's `d`, plus the line's total advance width
 * — see the header comment for why this walks glyphs by hand instead of asking opentype.js
 * or Pango to lay the text out. `letterSpacing` (px, already scaled to this call's fontSize
 * by the caller) is added after every glyph including the last, so `width` is exactly the
 * space this line occupies from `x`, usable to lay out whatever sits next to it.
 */
function buildTextPath(font, text, x, y, fontSize, letterSpacing = 0) {
  const scale = fontSize / font.unitsPerEm;
  let cursor = x;
  let d = '';
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    d += `${glyph.getPath(cursor, y, fontSize).toPathData(2)} `;
    let advance = glyph.advanceWidth * scale + letterSpacing;
    if (i < text.length - 1) {
      advance += font.getKerningValue(glyph, font.charToGlyph(text[i + 1])) * scale;
    }
    cursor += advance;
  }
  return { d, width: cursor - x };
}

/**
 * The name's size and the glyph's box, solved together instead of picked: the name wants
 * NAME_FONT_SIZE, the glyph wants at least GLYPH_BOX_MIN, and GLYPH_GAP must separate them
 * inside the MARGIN..CARD.width-MARGIN span. Both advance widths and kerning scale linearly
 * with fontSize (and letterSpacing is defined as a fraction of it, above), so the name's
 * width at any size is exactly proportional to its width at NAME_FONT_SIZE — no search, one
 * division. Only shrinks the name if it has to; otherwise the glyph just takes whatever
 * room is left.
 */
function solveNameAndGlyphLayout(archivoDisplay, name) {
  const preferred = buildTextPath(
    archivoDisplay,
    name,
    MARGIN,
    NAME_Y,
    NAME_FONT_SIZE,
    NAME_LETTER_SPACING_EM * NAME_FONT_SIZE
  );
  const spaceForGlyph = CARD.width - 2 * MARGIN - GLYPH_GAP - preferred.width;

  if (spaceForGlyph >= GLYPH_BOX_MIN) {
    return { name: preferred, fontSize: NAME_FONT_SIZE, boxSize: spaceForGlyph };
  }

  const boxSize = GLYPH_BOX_MIN;
  const targetWidth = CARD.width - 2 * MARGIN - GLYPH_GAP - boxSize;
  const fontSize = NAME_FONT_SIZE * (targetWidth / preferred.width);
  const shrunk = buildTextPath(archivoDisplay, name, MARGIN, NAME_Y, fontSize, NAME_LETTER_SPACING_EM * fontSize);
  return { name: shrunk, fontSize, boxSize };
}

async function buildSvg({ ground, signal, type, typeDim }) {
  const archivoDisplay = await loadFont('archivo/ArchivoExpanded-ExtraBold.ttf');
  const archivoBody = await loadFont('archivo/Archivo-Regular.ttf');
  const mono = await loadFont('jetbrains-mono/JetBrainsMono-Regular.ttf');

  const { name, boxSize } = solveNameAndGlyphLayout(archivoDisplay, 'NOEL SEBASTIAN');
  const originX = CARD.width - MARGIN - boxSize; // the glyph's box sits against the right margin

  // Centred on the text block, name top to mono line's bottom — both edges read off the
  // fonts' own ascender/descender metrics at the sizes actually used, not eyeballed.
  const nameAscent = (archivoDisplay.ascender / archivoDisplay.unitsPerEm) * NAME_FONT_SIZE;
  const monoFontSize = 19;
  const monoDescent = (Math.abs(mono.descender) / mono.unitsPerEm) * monoFontSize;
  const textBlockTop = NAME_Y - nameAscent;
  const textBlockBottom = MONO_Y + monoDescent;
  const originY = (textBlockTop + textBlockBottom) / 2 - boxSize / 2;

  const points = Math.round(boxSize); // one sample point per rendered pixel, so smoothness scales with size
  const strokeWidth = boxSize / 12; // the ratio the old card's glyph used (stroke 2 at box 24)

  const signalPoints = sampleSignalRange(0.14, 0.54, points);
  const signalPath = fitSignalPath(signalPoints, boxSize, originX, originY);

  const rolePath = buildTextPath(archivoBody, 'Senior Web Engineer & Angular Specialist', MARGIN, ROLE_Y, 30).d;
  const monoPath = buildTextPath(mono, 'SYDNEY, AU · OPEN TO SENIOR FRONTEND ROLES', MARGIN, MONO_Y, monoFontSize, 3).d;
  const domainPath = buildTextPath(mono, 'www.noel-sebastian.com', MARGIN + 24, DOMAIN_Y, 20).d;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.width} ${CARD.height}" width="${CARD.width}" height="${CARD.height}">
  <!--
    Share card on the Signal Path palette (spec §7.1). Raster of the design that
    public/og-image.svg used to hand-author — see scripts/og-image.mjs for why this is a
    baked PNG rather than an SVG asset most crawlers won't render, and why every letter
    below is a <path>, not a <text> element.

    The line is the canonical curve (src/lib/signal/path.ts), the years+work span, fitted
    the way favicon.svg fits it. Colours come from tokens.css, read at build time, not typed
    in here.

    No year count anywhere: this script cannot call yearsElapsed() without importing the
    Astro/DOM-adjacent career module, and a hard-coded one would be wrong within twelve
    months regardless. The old card said "9+ YEARS".
  -->
  <rect width="${CARD.width}" height="${CARD.height}" fill="${rgb(ground)}"/>

  <path
    d="${signalPath}"
    fill="none"
    stroke="${rgb(signal)}"
    stroke-width="${strokeWidth}"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.92"
  />

  <path d="${name.d}" fill="${rgb(type)}"/>
  <path d="${rolePath}" fill="${rgb(typeDim)}"/>
  <path d="${monoPath}" fill="${rgb(typeDim)}"/>
  <path d="${domainPath}" fill="${rgb(type)}"/>

  <!-- The completion bar, as it terminates the signal in the footer (spec §6). -->
  <rect x="${MARGIN}" y="${BAR.y}" width="${BAR.width}" height="${BAR.height}" fill="${rgb(signal)}"/>
</svg>`;
}

async function run() {
  const css = await readTokens();
  const tones = {
    ground: readTone(css, 'ground'),
    signal: readTone(css, 'signal'),
    type: readTone(css, 'type'),
    typeDim: readTone(css, 'type-dim'),
  };

  const svg = await buildSvg(tones);

  // Written straight out, NOT via sharp(buffer).toFile() — see portrait.mjs's comment on
  // why re-opening an encoded buffer re-encodes it at sharp's defaults. The SVG's own
  // width/height (1200x630) are what sharp rasterises at; no resize step needed, and no
  // font matching happens here at all (every glyph already arrived as a path — see above).
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(OUT_FILE, png);

  console.log(
    `${path.relative(ROOT, OUT_FILE)}  ${CARD.width}x${CARD.height}  ${(png.length / 1024).toFixed(1)} kB`
  );
}

run().catch((err) => {
  console.error(`og-image failed: ${err.message}`);
  process.exitCode = 1;
});
