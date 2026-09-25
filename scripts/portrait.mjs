/**
 * Bake the duotone still portrait from public/images/noel-sebastian.jpeg.
 *
 * Phase 11 turns this photograph into ~40,000 GPU particles, but the particle
 * portrait is the enhancement, not the baseline: mobile, reduced-motion and any
 * visitor whose WebGL gate fails (spec §12, §14) get this still instead. That is
 * most visitors. It has to look like a decision, not like the thing you see when
 * something failed to load.
 *
 *   npm run images
 *
 * The output replaces the ad-hoc portrait-400w/800w derivatives that used to sit
 * in public/images/portrait/ in plain colour with no script behind them. Those
 * are gone; these six files are the portrait, and this script is the only thing
 * that writes them.
 *
 * ── What the treatment does, and why ──────────────────────────────────────────
 *
 * 1. CROP. The master is a full 3960x3960 environmental shot — a stone doorway
 *    behind a man in a jumper. Measured on the source, the lit side of the face
 *    reads 168-220 and the background stone reads 94-104, but the door arch
 *    directly behind the head reads 170: as bright as the face. No tone curve
 *    can separate those, so the crop does the first half of the work — head and
 *    shoulders, eyes on the upper third, head about 40% of the frame width.
 *
 * 2. TONE. Greyscale, black/white points, a mild S-curve. Deliberately NOT a
 *    hard black point: the shadow side of the face reads 93 against stone at 94,
 *    so crushing the blacks to separate subject from ground would dissolve half
 *    the head with it. The curve keeps that edge and lets lighting do the rest.
 *
 * 3. KEY LIGHT + EDGE DISSOLVE. An elliptical falloff centred on the head, with
 *    a floor rather than a hard vignette, plus a separable fade that carries the
 *    frame's border to exactly --ground. The edges therefore meet the page
 *    background with no seam — the portrait has no box around it, it emerges out
 *    of the ground, which is the same idea Phase 11 animates. It assumes it is
 *    mounted ON --ground (or --ground-lift, a 9-value difference nobody sees).
 *
 * 4. DUOTONE. A two-stop gradient map, --ground to --signal, read out of
 *    src/styles/tokens.css at build time rather than typed in here. Retune the
 *    palette in tokens.css, re-run `npm run images`, and the portrait follows.
 *    Note that --signal is a mid-luminance red (~0.27), so the brightest pixel
 *    in the result is a bright red and never a white — that is the point of a
 *    duotone, not a lost highlight.
 *
 * Two scales for a portrait panel of roughly 600 CSS px: 640 (1x) and 1280 (2x),
 * each as AVIF, WebP and a JPEG fallback. The generated files are committed, so
 * a fresh clone builds without running this.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readTokens, readTone } from './lib/tokens.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public', 'images', 'noel-sebastian.jpeg');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'portrait');

/** Spec §9.01. Anything else means the wrong file is in public/images/. */
const SOURCE_SIZE = 3960;

/** 1x for a ~600px portrait panel, 2x for the same panel on a retina display. */
const SCALES = [640, 1280];

/**
 * Head-and-shoulders crop, as fractions of the square master. Derived by
 * measuring the face in the source: eyes at x 0.557 / y 0.321, head 0.31 of the
 * frame wide. These place the eyes on the upper third and the head at ~40% of
 * the output width.
 */
const CROP = { x: 0.169, y: 0.063, size: 0.775 };

/** Black/white points and S-curve strength — see note 2 above. */
const TONE = { black: 0.12, white: 0.95, gamma: 0.95, contrast: 0.45 };

/**
 * The key light. `floor` is what the darkest corner of the falloff keeps, so
 * the shoulders stay readable instead of snapping off at the ellipse.
 */
const KEY = { cx: 0.53, cy: 0.38, rx: 0.52, ry: 0.62, inner: 0.3, outer: 1.15, floor: 0.22 };

/**
 * Frame dissolve. `top` stops at 0.05 because the skull starts at 0.086 — fading
 * further would slice the top of his head off and read as a bug, not a choice.
 */
const EDGE = { side: 0.12, top: 0.05, topFloor: 0.5, bottomStart: 0.68, bottomFloor: 0.06 };

const ENCODERS = [
  ['avif', (img) => img.avif({ quality: 58, effort: 6 })],
  ['webp', (img) => img.webp({ quality: 80 })],
  // 4:4:4 because the whole image is red: chroma subsampling puts its error
  // exactly where every edge in this picture lives.
  ['jpg', (img) => img.jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' })],
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Hermite fade, so the falloffs have no visible start or end. */
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function applyTone(value) {
  let v = clamp01((value - TONE.black) / (TONE.white - TONE.black));
  v = Math.pow(v, TONE.gamma);
  // S-curve that leaves both ends fixed and only steepens the midtones.
  return clamp01(v + TONE.contrast * (v - 0.5) * (1 - Math.abs(2 * v - 1)));
}

function lightingAt(fx, fy) {
  const distance = Math.hypot((fx - KEY.cx) / KEY.rx, (fy - KEY.cy) / KEY.ry);
  const key = KEY.floor + (1 - KEY.floor) * (1 - smoothstep(KEY.inner, KEY.outer, distance));

  const sides = smoothstep(0, EDGE.side, Math.min(fx, 1 - fx));
  const top = EDGE.topFloor + (1 - EDGE.topFloor) * smoothstep(0, EDGE.top, fy);
  const bottom = 1 - (1 - EDGE.bottomFloor) * smoothstep(EDGE.bottomStart, 1, fy);

  return key * sides * top * bottom;
}

/**
 * Greyscale, tone, light, then map — in that order and at the final resolution,
 * so each scale is toned identically instead of resampling already-mapped colour.
 */
async function bake(width, ground, signal) {
  const extract = {
    left: Math.round(CROP.x * SOURCE_SIZE),
    top: Math.round(CROP.y * SOURCE_SIZE),
    width: Math.round(CROP.size * SOURCE_SIZE),
    height: Math.round(CROP.size * SOURCE_SIZE),
  };

  const { data, info } = await sharp(SRC)
    .extract(extract)
    .resize(width, width, { kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgb = Buffer.alloc(width * width * 3);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const lit = applyTone(data[i * info.channels] / 255) * lightingAt(x / (width - 1), y / (width - 1));
      for (let c = 0; c < 3; c++) {
        rgb[i * 3 + c] = Math.round(ground[c] + clamp01(lit) * (signal[c] - ground[c]));
      }
    }
  }

  return sharp(rgb, { raw: { width, height: width, channels: 3 } });
}

async function run() {
  const meta = await sharp(SRC).metadata();
  if (meta.width !== SOURCE_SIZE || meta.height !== SOURCE_SIZE) {
    throw new Error(
      `${path.relative(ROOT, SRC)} is ${meta.width}x${meta.height}; ` +
        `the crop and lighting are calibrated for ${SOURCE_SIZE}x${SOURCE_SIZE} (spec §9.01)`
    );
  }

  const css = await readTokens();
  const ground = readTone(css, 'ground');
  const signal = readTone(css, 'signal');

  await mkdir(OUT_DIR, { recursive: true });

  const srcBytes = (await stat(SRC)).size;
  console.log(
    `${path.relative(ROOT, SRC)}  ${meta.width}x${meta.height}  ` +
      `${(srcBytes / 1048576).toFixed(1)} MB  →  duotone rgb(${ground}) → rgb(${signal})\n`
  );

  for (const width of SCALES) {
    const duotone = await bake(width, ground, signal);
    const written = [];

    for (const [ext, encode] of ENCODERS) {
      const buffer = await encode(duotone.clone()).toBuffer();
      // Written straight out, NOT via sharp(buffer).toFile() as the gallery
      // script once did: re-opening an encoded buffer re-encodes it at sharp's
      // defaults and quietly discards the settings above. On the JPEG that was
      // a 43 kB 4:4:4 mozjpeg landing on disk as a 27 kB 4:2:0 baseline.
      await writeFile(path.join(OUT_DIR, `portrait-${width}w.${ext}`), buffer);
      written.push(`${ext} ${(buffer.length / 1024).toFixed(0)} kB`);
    }

    console.log(`portrait-${width}w  ${String(width).padStart(4)}x${width}  ${written.join(', ')}`);
  }

  console.log(`\nWrote to ${path.relative(ROOT, OUT_DIR)}/ — mount on --ground; the frame dissolves into it.`);
}

run().catch((err) => {
  console.error(`portrait failed: ${err.message}`);
  process.exitCode = 1;
});
