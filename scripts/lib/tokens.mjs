/**
 * Read colour tokens out of src/styles/tokens.css for the image scripts.
 *
 * The tokens are the source of truth for the palette. The baked images take their
 * colours from here at build time rather than typing hex values into each script,
 * so retuning tokens.css and re-running `npm run images` moves every treated image
 * with it. Shared by portrait.mjs and optimise-gallery.mjs.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TOKENS = path.join(ROOT, 'src', 'styles', 'tokens.css');

/** The whole stylesheet, read once and handed to readTone for each token. */
export function readTokens() {
  return readFile(TOKENS, 'utf8');
}

/** One custom property as `[r, g, b]`. Throws if the token is missing or not a 6-digit hex. */
export function readTone(css, name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`--${name} not found in ${path.relative(ROOT, TOKENS)}`);
  const hex = match[1];
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
