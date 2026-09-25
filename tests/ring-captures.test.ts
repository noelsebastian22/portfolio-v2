import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { galleryProjects } from '../src/data/content';
import captures from '../src/data/ring-captures.json';

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const manifest: Record<string, (typeof captures)[keyof typeof captures]> = captures;

// A ring card without a capture should break here, not render an empty frame.
// The fix is an entry in optimise-gallery.mjs → RING and `npm run images`.
describe('ring-captures.json', () => {
  it.each(galleryProjects.map((project) => project.slug))('has a capture for %s', (slug) => {
    const entry = manifest[slug];
    expect(entry, `no capture for "${slug}"; add it to RING and run npm run images`).toBeDefined();
    expect(entry.width).toBeGreaterThan(0);
    expect(entry.height).toBeGreaterThan(0);
  });

  it('points only at files that exist in public/', () => {
    const urls = Object.values(manifest).flatMap((entry) => [
      ...Object.values(entry.avif),
      ...Object.values(entry.webp),
    ]);
    const missing = urls.filter((url) => !existsSync(path.join(PUBLIC_DIR, url)));
    expect(missing).toEqual([]);
  });
});
