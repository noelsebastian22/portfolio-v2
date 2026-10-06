import { describe, expect, it } from 'vitest';
import { sampleSignalRange } from '../src/lib/signal/path';
import { DRAWN_FROM_T } from '../src/lib/signal/path';
import { toPixelPoints } from '../src/lib/signal/anchors';
import { cumulativeLengths } from '../src/lib/signal/playhead';
import type { SignalGeometry } from '../src/lib/signal/tip';
import { buildTube, hexToRgb, pointAtLength, type TubeProfile } from '../src/lib/gfx/tube-mesh';

/** The line as the SVG draws it on the real 1440 page, from the hero's bottom edge down. */
function referenceGeometry(): SignalGeometry {
  const samples = sampleSignalRange(DRAWN_FROM_T, 1, 413);
  const pixels = toPixelPoints(samples, 1425, [65, 923.4, 1975.9, 4762.1, 6041.9, 7239.9, 8494.9], [2435, 4589.3, 5223.2]);
  return { points: pixels, lengths: cumulativeLengths(pixels) };
}

const profile: TubeProfile = { radius: 4, radialSegments: 12 };

describe('buildTube', () => {
  const geometry = referenceGeometry();
  const tube = buildTube(geometry, profile);
  const rings = geometry.points.length;
  const segments = profile.radialSegments;

  it('has one ring per published point, centred on it, flat on the page', () => {
    geometry.points.forEach((p, i) => {
      // Float32 buffers: ~1e-4 px of rounding at page scale, far below a pixel.
      expect(tube.centres[i * 3]).toBeCloseTo(p.x, 2);
      expect(tube.centres[i * 3 + 1]).toBeCloseTo(-p.y, 2);
      expect(tube.centres[i * 3 + 2]).toBe(0);
    });
  });

  it('sizes its buffers to rings × segments', () => {
    expect(tube.positions.length).toBe(rings * segments * 3);
    expect(tube.normals.length).toBe(rings * segments * 3);
    expect(tube.lengths.length).toBe(rings * segments);
    expect(tube.indices.length).toBe((rings - 1) * segments * 6);
  });

  it('is one radius the whole way — the 2D stroke, halved', () => {
    for (let ring = 0; ring < rings; ring += 37) {
      for (let j = 0; j < segments; j++) {
        const v = (ring * segments + j) * 3;
        const offset = [0, 1, 2].map((k) => tube.positions[v + k] - tube.centres[ring * 3 + k]);
        expect(Math.hypot(...offset)).toBeCloseTo(4, 2);
        const normal = [0, 1, 2].map((k) => tube.normals[v + k]);
        expect(Math.hypot(...normal)).toBeCloseTo(1, 5);
        expect(offset.reduce((sum, o, k) => sum + o * normal[k], 0)).toBeGreaterThan(0);
      }
    }
  });

  it('never flips its frame from ring to ring, through the tightest turns on the line', () => {
    for (let ring = 0; ring < rings - 1; ring++) {
      const a = ring * segments * 3;
      const b = (ring + 1) * segments * 3;
      const dot = tube.normals[a] * tube.normals[b] + tube.normals[a + 1] * tube.normals[b + 1] + tube.normals[a + 2] * tube.normals[b + 2];
      expect(dot).toBeGreaterThan(0.5);
    }
  });

  it('carries length per vertex from the geometry', () => {
    expect(tube.lengths[200 * segments + 3]).toBeCloseTo(geometry.lengths[200], 3);
  });

  it('scales and pads the radius for the glow shell', () => {
    const halo = buildTube(geometry, profile, 3, 2);
    const v = 300 * segments * 3;
    const offset = [0, 1, 2].map((k) => halo.positions[v + k] - halo.centres[300 * 3 + k]);
    expect(Math.hypot(...offset)).toBeCloseTo(4 * 3 + 2, 2);
  });

  // Front faces must face out: the materials cull back faces.
  it('winds every triangle to face away from its ring centre', () => {
    const vertex = (n: number) => [0, 1, 2].map((k) => tube.positions[n * 3 + k]);
    for (let t = 0; t < tube.indices.length; t += 6 * 97) {
      const [a, b, c] = [tube.indices[t], tube.indices[t + 1], tube.indices[t + 2]].map(vertex);
      const ab = [0, 1, 2].map((k) => b[k] - a[k]);
      const ac = [0, 1, 2].map((k) => c[k] - a[k]);
      const face = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const ring = Math.floor(tube.indices[t] / segments);
      const outward = [0, 1, 2].map((k) => a[k] - tube.centres[ring * 3 + k]);
      expect(face.reduce((sum, f, k) => sum + f * outward[k], 0)).toBeGreaterThan(0);
    }
  });
});

describe('pointAtLength', () => {
  const tube = buildTube(referenceGeometry(), profile);

  it('lands on a ring at its own length, and between rings in proportion', () => {
    expect(pointAtLength(tube, tube.ringLengths[100]).x).toBeCloseTo(tube.centres[300], 6);
    const halfway = (tube.ringLengths[100] + tube.ringLengths[101]) / 2;
    expect(pointAtLength(tube, halfway).y).toBeCloseTo((tube.centres[301] + tube.centres[304]) / 2, 6);
  });

  it('clamps before the start and past the end', () => {
    expect(pointAtLength(tube, -50).x).toBe(tube.centres[0]);
    const last = tube.ringLengths.length - 1;
    expect(pointAtLength(tube, 1e9).y).toBe(tube.centres[last * 3 + 1]);
  });
});

describe('hexToRgb', () => {
  it('reads the palette token as sRGB channels', () => {
    const [r, g, b] = hexToRgb('#FF4B54');
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0x4b / 255, 9);
    expect(b).toBeCloseTo(0x54 / 255, 9);
    expect(hexToRgb('  #ff4b54 ')).toEqual([r, g, b]);
  });
});
