/**
 * Turn the full-page screenshots in gallery-masters/ into the two families of
 * image the site actually uses.
 *
 * The masters are device screenshots up to 3024x17020 and 16 MB each. They sit
 * in gallery-masters/, OUTSIDE public/, so nothing in that folder is ever
 * deployed; only the files below are.
 *
 *   npm run images
 *
 * ── 1. The ring captures — public/images/ring/ ────────────────────────────────
 *
 * Section 04's cards (spec §9.04) scroll a full-height capture inside their
 * frame on hover. Each capture is printed in two tones, --ground to --type, so
 * nine mismatched screenshots read as one system (spec §10). The stops are not
 * --ground to --signal as the portrait's are: in §6 red means "live, the signal
 * is here", and five red slabs would compete with the line for it. These are
 * shipped sites, so they print warm monochrome.
 *
 *   <slug>-480w.avif / .webp   1x, for cards of roughly 360-440 CSS px
 *   <slug>-960w.avif / .webp   2x
 *
 * Two things the spec once listed are deliberately NOT baked in. Grain: the page
 * grain layer (global.css, --z-grain) already paints over every card, and noise
 * is what AVIF and WebP compress worst, so baking it into 5,000px captures would
 * multiply their weight. Browser chrome: the capture scrolls inside the frame on
 * hover, so the chrome has to hold still while the page moves. That makes it
 * markup (Ring.astro), which also lets the real domain appear as text.
 *
 * Each capture's size goes into src/data/ring-captures.json, so the <img> gets
 * real width/height (CLS, spec §12) and the hover-scroll can run at a constant
 * px/s whatever the page length. tests/ring-captures.test.ts fails if a ring
 * card has no entry.
 *
 * ── 2. The /websites cards — public/images/gallery/ ───────────────────────────
 *
 *   <master>-card.webp   the top 900x495 in plain colour
 *
 * /websites gets the lighter treatment (spec §14), so its four cards stay
 * untreated. They crop to the hero and never reveal the rest of the page.
 *
 * Both lists are explicit tables below: this script writes only what something
 * consumes. Re-run after adding or replacing a screenshot. The generated files
 * are committed, so a fresh clone builds without running this.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readTokens, readTone } from './lib/tokens.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'gallery-masters');
const RING_DIR = path.join(ROOT, 'public', 'images', 'ring');
const CARD_DIR = path.join(ROOT, 'public', 'images', 'gallery');
const MANIFEST = path.join(ROOT, 'src', 'data', 'ring-captures.json');

/** URL prefix of RING_DIR as the browser sees it, for the manifest. */
const RING_URL = '/images/ring';

/**
 * The ring's five cards, keyed by `galleryProjects[].slug` in content.ts. The
 * key names the output. The master is whatever file holds that site: PLUMBER.
 * was screenshotted as plumping.png.
 */
const RING = {
  daybook: 'daybook.png',
  ezytrack: 'ezytrack.png',
  plumber: 'plumping.png',
  'topdel-renovations': 'topdel-renovations.png',
  laserclinic: 'laserclinic.png',
};

/** Masters whose `-card.webp` src/data/websites.ts → websitesWork references. */
const CARDS = ['topdel-renovations.png', 'plumping.png', 'laserclinic.png', 'ezytrack.png'];

/** 1x and 2x for a card of roughly 360-440 CSS px. */
const RING_WIDTHS = [480, 960];

const CARD_WIDTH = 900;
const CARD_HEIGHT = 495;

/**
 * The tallest side any output may have. sharp's AVIF (heif) encoder rejects
 * anything over 16384 and WebP stops at 16383, so the tighter of the two holds.
 */
const MAX_DIMENSION = 16383;

/** sharp sniffs the bytes rather than trusting the extension; this names what it found. */
const ACCEPTED_FORMATS = new Set(['png', 'jpeg', 'webp']);

/**
 * The tone step, applied to greyscale before the gradient map.
 *
 * Web pages are not photographs: most of every capture is flat paper-white or a
 * flat dark band, and what matters is the small type on it. Most of that type is
 * grey copy on a light section, #666 to #999, which sits in the upper midtones.
 * A plain S-curve pushes it UP toward the paper and costs it contrast (#888 on
 * white fell from 3.5:1 to 3.0:1 in the first pass). So `gamma` darkens the
 * midtones first and `contrast` is only a gentle S on top.
 *
 * Measured through the whole map, against the treated paper: #666 is 6.6:1 (5.7
 * in the original), #888 is 3.9:1 (3.5), #999 is 2.9:1 (2.9). Every light-ground
 * pair keeps or gains contrast. The cost falls on the dark bands: #999 on #111
 * goes from 6.6:1 to 5.0:1, still over AA. `black` and `white` clip only the
 * last 4%, so near-white sections still read as a surface and navy bands still
 * separate from black.
 *
 * `ceiling` stops the paper at 92% of the way to --type. A full-strength cream
 * slab 5,000px tall would be the brightest thing on the page by far and pull the
 * eye off the line. The ratios above already include it.
 */
const TONE = { black: 0.04, white: 0.96, gamma: 1.2, contrast: 0.2, ceiling: 0.92 };

const ENCODERS = [
  ['avif', (img) => img.avif({ quality: 60, effort: 6 })],
  ['webp', (img) => img.webp({ quality: 80 })],
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const kB = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;

/** The tone curve and gradient map, precomputed per grey level: one lookup per pixel. */
function buildDuotone(ground, type) {
  const lut = Buffer.alloc(256 * 3);
  for (let grey = 0; grey < 256; grey++) {
    let v = clamp01((grey / 255 - TONE.black) / (TONE.white - TONE.black));
    v = Math.pow(v, TONE.gamma);
    // S-curve that leaves both ends fixed and only steepens the midtones.
    v = clamp01(v + TONE.contrast * (v - 0.5) * (1 - Math.abs(2 * v - 1)));
    v *= TONE.ceiling;
    for (let c = 0; c < 3; c++) {
      lut[grey * 3 + c] = Math.round(ground[c] + v * (type[c] - ground[c]));
    }
  }
  return lut;
}

async function checkMaster(file) {
  const src = path.join(SRC_DIR, file);
  const meta = await sharp(src).metadata();
  if (!ACCEPTED_FORMATS.has(meta.format)) {
    throw new Error(
      `${file} holds ${meta.format} data; expected one of ${[...ACCEPTED_FORMATS].join(', ')}`
    );
  }
  return { src, meta };
}

/**
 * Resize, then tone, as portrait.mjs does: each scale is toned from its own
 * greyscale instead of resampling colour that has already been mapped.
 */
async function bakeCapture(src, width, lut) {
  const { data, info } = await sharp(src)
    // An unstyled page is painted white; the masters are opaque anyway.
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // withoutEnlargement keeps a narrow master from being upscaled, but then the
  // file would not be the width its srcset descriptor claims.
  if (info.width !== width) {
    throw new Error(`${path.basename(src)} is only ${info.width}px wide; the ring needs at least ${width}px`);
  }
  if (info.height > MAX_DIMENSION) {
    throw new Error(
      `${path.basename(src)} at ${width}w would be ${info.height}px tall; AVIF/WebP stop at ${MAX_DIMENSION}px`
    );
  }

  const pixels = info.width * info.height;
  const rgb = Buffer.alloc(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    lut.copy(rgb, i * 3, data[i * info.channels] * 3, data[i * info.channels] * 3 + 3);
  }

  return {
    image: sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } }),
    height: info.height,
  };
}

async function writeRing(lut) {
  await mkdir(RING_DIR, { recursive: true });
  const manifest = {};
  let total = 0;

  for (const [slug, file] of Object.entries(RING)) {
    const { src, meta } = await checkMaster(file);
    const entry = { width: 0, height: 0, avif: {}, webp: {} };
    const written = [];

    for (const width of RING_WIDTHS) {
      const { image, height } = await bakeCapture(src, width, lut);
      for (const [ext, encode] of ENCODERS) {
        const name = `${slug}-${width}w.${ext}`;
        const buffer = await encode(image.clone()).toBuffer();
        // Written straight out, never via sharp(buffer).toFile(): re-opening an
        // encoded buffer re-encodes it at sharp's defaults and discards the
        // settings above. That was this script's double-encode until Task 7.1.
        await writeFile(path.join(RING_DIR, name), buffer);
        entry[ext][width] = `${RING_URL}/${name}`;
        total += buffer.length;
        written.push(`${width}w ${ext} ${kB(buffer.length)}`);
      }
      // The manifest records the largest width. The 1x is half of it, to within
      // the half-pixel the resize rounds away: aspect is all width/height carry.
      entry.width = width;
      entry.height = height;
    }

    manifest[slug] = entry;
    console.log(
      `${slug.padEnd(20)} ${meta.format} ${meta.width}x${meta.height}  →  ` +
        `${entry.width}x${entry.height}  ${written.join(', ')}`
    );
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  return total;
}

async function writeCards() {
  await mkdir(CARD_DIR, { recursive: true });
  let total = 0;

  for (const file of CARDS) {
    const { src, meta } = await checkMaster(file);
    const name = `${file.replace(/\.[a-z]+$/i, '')}-card.webp`;
    // `position: 'top'` keeps the hero, not the middle of the page.
    const buffer = await sharp(src)
      .resize({
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        fit: 'cover',
        position: 'top',
        withoutEnlargement: true,
      })
      .webp({ quality: 76 })
      .toBuffer();
    await writeFile(path.join(CARD_DIR, name), buffer);
    total += buffer.length;
    console.log(`${name.padEnd(32)} ${meta.format} ${meta.width}x${meta.height}  →  ${kB(buffer.length)}`);
  }

  return total;
}

async function run() {
  const css = await readTokens();
  const ground = readTone(css, 'ground');
  const type = readTone(css, 'type');
  const lut = buildDuotone(ground, type);

  const masters = new Set([...Object.values(RING), ...CARDS]);
  let masterBytes = 0;
  // sharp's metadata().size is only populated for buffer inputs, so stat instead.
  for (const file of masters) masterBytes += (await stat(path.join(SRC_DIR, file))).size;

  console.log(`Ring captures — duotone rgb(${ground}) → rgb(${type})\n`);
  const ringBytes = await writeRing(lut);
  console.log(`\n/websites cards — plain colour\n`);
  const cardBytes = await writeCards();

  console.log(
    `\n${(masterBytes / 1048576).toFixed(1)} MB of masters → ` +
      `ring ${kB(ringBytes)} + cards ${kB(cardBytes)} shipped. ` +
      `Wrote ${path.relative(ROOT, MANIFEST)}.`
  );
}

run().catch((err) => {
  console.error(`optimise-gallery failed: ${err.message}`);
  process.exitCode = 1;
});
