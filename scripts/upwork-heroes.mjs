/**
 * Generate Upwork portfolio hero images from the full-page masters.
 *
 * Upwork renders each portfolio item's grid thumbnail from image #1, and an
 * entry with no image shows an empty tile — which on a profile with no reviews
 * reads as abandoned rather than new. Their guidance is a desktop hero at
 * 1200x900 or larger.
 *
 * The masters in gallery-masters/ are full-page captures — 3024px wide and up
 * to 15,000px tall. Resizing those whole would produce a thumbnail-shaped
 * sliver, so this crops the TOP of each (the hero, which is what the entry is
 * selling) to 4:3 and scales it to 1600x1200 — comfortably above Upwork's
 * minimum, with headroom for their own downscaling.
 *
 * Two formats per entry. Upwork's uploader has been inconsistent about WebP
 * over the years; upload the .webp, and if it's rejected upload the .jpg.
 *
 *   node scripts/upwork-heroes.mjs
 *
 * Output goes to upwork-heroes/ at the project root — deliberately NOT under
 * public/, because these are upload artifacts for a third-party platform and
 * have no business being deployed with the site. Add upwork-heroes/ to
 * .gitignore if you'd rather not commit them.
 *
 * Masters narrower than 1200px are skipped with a warning rather than upscaled:
 * a blurry hero on a profile selling "loads in about a second" is worse than a
 * missing one. Re-capture those at 1600x1200 in Chrome DevTools' device
 * toolbar instead — see upwork-portfolio-entries.md.
 */

import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'gallery-masters');
const OUT_DIR = path.join(ROOT, 'upwork-heroes');

/** Upwork's stated minimum is 1200x900. 1600x1200 is the same 4:3 with headroom. */
const WIDTH = 1600;
const HEIGHT = 1200;
const MIN_SOURCE_WIDTH = 1200;

const MASTER_EXT = /\.(png|jpe?g)$/i;

/**
 * Only the masters that back a published or drafted Upwork entry. The employer
 * screenshots (winning, directline, qburst, srtmarine) are deliberately absent:
 * entry 4 is employment work and gets no screenshot at all.
 */
const WANTED = new Set([
  'topdel-renovations', // Entry 1
  'ezytrack', // Entry 2
  'plumping', //           Entry 3
  'menzone', //            Entry 5 — add the master once the site is deployed
]);

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(SRC_DIR))
    .filter((f) => MASTER_EXT.test(f))
    .filter((f) => WANTED.has(f.replace(MASTER_EXT, '')));

  if (files.length === 0) {
    console.warn(`No matching masters in ${SRC_DIR}. Nothing to do.`);
    return;
  }

  const skipped = [];

  for (const file of files) {
    const base = file.replace(MASTER_EXT, '');
    const src = path.join(SRC_DIR, file);
    const meta = await sharp(src).metadata();

    if ((meta.width ?? 0) < MIN_SOURCE_WIDTH) {
      skipped.push(`${file} (${meta.width}x${meta.height})`);
      continue;
    }

    // `position: 'top'` keeps the hero. `fit: 'cover'` handles the aspect
    // change by trimming height, which on a 12,000px-tall page capture means
    // it simply stops after the first screenful — exactly what's wanted.
    const pipeline = sharp(src).resize({
      width: WIDTH,
      height: HEIGHT,
      fit: 'cover',
      position: 'top',
    });

    const webp = await pipeline.clone().webp({ quality: 82 }).toBuffer();
    const jpeg = await pipeline.clone().jpeg({ quality: 86, mozjpeg: true }).toBuffer();

    await sharp(webp).toFile(path.join(OUT_DIR, `${base}-hero.webp`));
    await sharp(jpeg).toFile(path.join(OUT_DIR, `${base}-hero.jpg`));

    const srcMb = ((await stat(src)).size / 1048576).toFixed(1);
    console.log(
      `${file.padEnd(26)} ${String(meta.width).padStart(4)}x${meta.height}  ${srcMb} MB  →  ` +
        `${WIDTH}x${HEIGHT}  webp ${(webp.length / 1024).toFixed(0)} kB, ` +
        `jpg ${(jpeg.length / 1024).toFixed(0)} kB`
    );
  }

  console.log(`\nWrote to ${path.relative(ROOT, OUT_DIR)}/ — upload as image #1 on each entry.`);

  if (skipped.length) {
    console.warn(
      `\nSkipped ${skipped.length} master(s) narrower than ${MIN_SOURCE_WIDTH}px:\n` +
        skipped.map((s) => `  - ${s}`).join('\n') +
        `\n\nRe-capture in Chrome: DevTools → device toolbar → viewport ${WIDTH}x${HEIGHT},` +
        `\nthen Cmd+Shift+P → "Capture screenshot". Save into gallery-masters/ and re-run.`
    );
  }
}

run().catch((err) => {
  console.error(`upwork-heroes failed: ${err.message}`);
  process.exitCode = 1;
});
