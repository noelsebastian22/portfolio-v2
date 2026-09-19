/**
 * Turn the full-page screenshots in gallery-masters/ into web-sized WebP in
 * public/images/gallery/.
 *
 * The masters are 3024px-wide PNGs straight out of a device screenshot —
 * plumping.png alone is 14.4MB, and the three biggest together are 36MB. They
 * are used as CSS background images, so Astro's asset pipeline never touches
 * them: previously they sat in public/ and shipped byte-for-byte to every
 * visitor. On /websites, a page whose whole pitch is "loads in about a second",
 * that was self-refuting.
 *
 * Hence the split. `gallery-masters/` is OUTSIDE public/ so nothing in it is
 * ever deployed; only the generated files below are.
 *
 * Two outputs per master:
 *   - `*-scroll.webp` — full height at 900px wide, for the homepage gallery
 *     tiles that scroll the whole page on hover.
 *   - `*-card.webp`   — the top 900x495 only, for the /websites work cards,
 *     which crop to the hero anyway and never reveal the rest.
 *
 *   npm run images
 *
 * Re-run after adding or replacing a screenshot in gallery-masters/. The
 * generated files are committed, so a fresh clone builds without running this.
 */

import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'gallery-masters');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'gallery');

/** Tiles render at ~450px CSS width; 900 covers 2x displays without waste. */
const SCROLL_WIDTH = 900;
const CARD_WIDTH = 900;
const CARD_HEIGHT = 495;

const MASTER_EXT = /\.(png|jpe?g)$/i;

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(SRC_DIR)).filter((f) => MASTER_EXT.test(f));
  let before = 0;
  let after = 0;

  for (const file of files) {
    const base = file.replace(MASTER_EXT, '');
    const src = path.join(SRC_DIR, file);
    // sharp's metadata().size is only populated for buffer inputs, so stat the
    // file rather than silently reporting every master as 0 MB.
    const srcBytes = (await stat(src)).size;
    before += srcBytes;

    // Full-height scroll version.
    const scroll = await sharp(src)
      .resize({ width: SCROLL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    await sharp(scroll).toFile(path.join(OUT_DIR, `${base}-scroll.webp`));

    // Top-of-page card crop. `position: 'top'` keeps the hero, not the middle.
    const card = await sharp(src)
      .resize({
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        fit: 'cover',
        position: 'top',
        withoutEnlargement: true,
      })
      .webp({ quality: 76 })
      .toBuffer();
    await sharp(card).toFile(path.join(OUT_DIR, `${base}-card.webp`));

    after += scroll.length + card.length;
    console.log(
      `${file.padEnd(28)} ${(srcBytes / 1048576).toFixed(1)} MB  →  ` +
        `scroll ${(scroll.length / 1024).toFixed(0)} kB, card ${(card.length / 1024).toFixed(0)} kB`
    );
  }

  console.log(
    `\n${(before / 1048576).toFixed(1)} MB of masters → ${(after / 1048576).toFixed(2)} MB shipped.`
  );
}

run().catch((err) => {
  console.error(`optimise-gallery failed: ${err.message}`);
  process.exitCode = 1;
});
