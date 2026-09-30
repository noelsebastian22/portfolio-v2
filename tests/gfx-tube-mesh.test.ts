import { describe, expect, it } from 'vitest';
import { controlPointT, sampleSignal, sampleSignalRange } from '../src/lib/signal/path';
import { toPixelPoints } from '../src/lib/signal/anchors';
import { cumulativeLengths } from '../src/lib/signal/playhead';
import type { SignalGeometry } from '../src/lib/signal/tip';
import {
  buildTube,
  heroWeight,
  hexToRgb,
  pointAtLength,
  radiusAt,
  worldPoint,
  type TubeProfile,
} from '../src/lib/gfx/tube-mesh';

/** The line as the SVG draws it on the real 1440 page (tests/signal-anchors.test.ts). */
function referenceGeometry(): SignalGeometry {
  const samples = sampleSignalRange(0, 1, 481);
  const pixels = toPixelPoints(samples, 1425, [65, 923.4, 1975.9, 4762.1, 6041.9, 7239.9, 8494.9], [2435, 4589.3, 5223.2]);
  return {
    points: pixels.map((p, i) => ({ x: p.x, y: p.y, z: samples[i].z, curveY: samples[i].y })),
    lengths: cumulativeLengths(pixels),
    strength: pixels.map((_, i) => (i % 2 === 0 ? 1 : 0)),
  };
}

const profile: TubeProfile = { heroRadius: 12, baseRadius: 2, heroDepth: 2500, radialSegments: 12 };
const heroEndY = sampleSignal(controlPointT(7)).y;

describe('the hero profile', () => {
  it('is full depth through the hero and exactly flat from the Nine Years seam on', () => {
    expect(heroWeight(0)).toBe(1);
    expect(heroWeight(sampleSignal(controlPointT(5)).y)).toBe(1);
    expect(heroWeight(heroEndY)).toBe(0);
    for (const y of [heroEndY + 1e-9, 0.3, 0.68, 1]) expect(heroWeight(y)).toBe(0);
  });

  it('is thick at the headline and the 2D width from the seam on', () => {
    expect(radiusAt(0.06, profile)).toBe(12);
    expect(radiusAt(heroEndY, profile)).toBe(2);
    expect(radiusAt(0.5, profile)).toBe(2);
    const mid = radiusAt((sampleSignal(controlPointT(5)).y + heroEndY) / 2, profile);
    expect(mid).toBeGreaterThan(2);
    expect(mid).toBeLessThan(12);
  });

  it('puts a flat point on the page and a hero point behind it', () => {
    expect(worldPoint({ x: 10, y: 5000, z: 0.37, curveY: 0.68 }, 2500)).toEqual([10, -5000, 0]);
    expect(worldPoint({ x: 10, y: 20, z: -1, curveY: 0 }, 2500)).toEqual([10, -20, -2500]);
  });
});

describe('buildTube', () => {
  const geometry = referenceGeometry();
  const tube = buildTube(geometry, profile);
  const rings = geometry.points.length;
  const segments = profile.radialSegments;

  it('has one ring per published point, centred exactly on it', () => {
    expect(tube.centres.length).toBe(rings * 3);
    geometry.points.forEach((p, i) => {
      const [x, y, z] = worldPoint(p, profile.heroDepth);
      // Float32 buffers: ~1e-4 px of rounding at page scale, far below a pixel.
      expect(tube.centres[i * 3]).toBeCloseTo(x, 2);
      expect(tube.centres[i * 3 + 1]).toBeCloseTo(y, 2);
      expect(tube.centres[i * 3 + 2]).toBeCloseTo(z, 2);
    });
  });

  it('sizes its buffers to rings × segments', () => {
    expect(tube.positions.length).toBe(rings * segments * 3);
    expect(tube.normals.length).toBe(rings * segments * 3);
    expect(tube.lengths.length).toBe(rings * segments);
    expect(tube.indices.length).toBe((rings - 1) * segments * 6);
  });

  it('puts every vertex at its ring radius, with a unit normal pointing out', () => {
    for (let ring = 0; ring < rings; ring += 37) {
      for (let j = 0; j < segments; j++) {
        const v = (ring * segments + j) * 3;
        const offset = [0, 1, 2].map((k) => tube.positions[v + k] - tube.centres[ring * 3 + k]);
        expect(Math.hypot(...offset)).toBeCloseTo(tube.radii[ring], 2);
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

  it('carries length and strength per vertex from the geometry', () => {
    const ring = 200;
    expect(tube.lengths[ring * segments + 3]).toBeCloseTo(geometry.lengths[ring], 3);
    expect(tube.strengths[ring * segments + 3]).toBe(geometry.strength[ring]);
  });

  it('scales and pads the radius for the glow shell', () => {
    const halo = buildTube(geometry, profile, 3, 2);
    expect(halo.radii[300]).toBeCloseTo(tube.radii[300] * 3 + 2, 4);
  });

  // Front faces must face out: the materials cull back faces, and a tube drawn from both
  // sides would double the dim rule's alpha — the SVG's 0.15 becoming ~0.28 over text.
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
    const at = pointAtLength(tube, tube.ringLengths[100]);
    expect(at.x).toBeCloseTo(tube.centres[300], 6);
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
