/**
 * The particles' source is the still the page already shows (Phase 11 design D8): its own
 * pixels, read once after load. No baked sample data, no second request.
 *
 * Drawn at a fixed 320×320 whatever the browser picked from the `srcset` — AVIF or WebP or
 * JPEG, 640 or 1280 — so the sample is the same face on every display. The mask on
 * `.hero__face` is CSS and does not reach `drawImage`; the sampler applies it (`maskAt`).
 */

import type { BrightnessGrid } from './portrait-sample';

export const GRID_SIZE = 320;

/**
 * The still dissolves to `--ground`, which reads ~10 on every channel. Below that is ground,
 * not picture, and must weigh nothing.
 */
const GROUND_LEVEL = 10;

export async function readPortraitGrid(still: HTMLImageElement): Promise<BrightnessGrid> {
  await still.decode();
  const canvas = document.createElement('canvas');
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('no 2D context to read the portrait');
  context.drawImage(still, 0, 0, GRID_SIZE, GRID_SIZE);
  const { data } = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE);

  const values = new Float32Array(GRID_SIZE * GRID_SIZE);
  for (let i = 0; i < values.length; i++) {
    const level = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    values[i] = Math.min(1, Math.max(0, (level - GROUND_LEVEL) / (255 - GROUND_LEVEL)));
  }
  return { width: GRID_SIZE, height: GRID_SIZE, values };
}
