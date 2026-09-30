/**
 * The tube's geometry, built straight from the points the SVG line is drawn through
 * (`SignalGeometry`, tip.ts). Not `THREE.TubeGeometry`: that needs its own `Curve` and
 * re-samples it — a second definition of the line (Phase 10 design, D4).
 *
 * One ring of vertices per published point, flat on the page (world z = 0, camera.ts) and
 * one radius the whole way (revision R2, R4), oriented by rotation-minimising frames (the
 * double-reflection method), which never twist or flip at a tight turn the way Frenet frames
 * do. Pure: typed arrays out, no Three.js — tube-signal.ts turns them into buffers.
 */

import type { SignalGeometry } from '../signal/tip';

export interface TubeProfile {
  /** Half of `--signal-stroke`, px. */
  radius: number;
  radialSegments: number;
}

export interface TubeArrays {
  positions: Float32Array;
  normals: Float32Array;
  lengths: Float32Array;
  indices: Uint32Array;
  centres: Float32Array;
  ringLengths: Float32Array;
}

type Vec3 = [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalise = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length > 0 ? scale(a, 1 / length) : [0, 0, 1];
};
/** `v` reflected in the plane through the origin with normal `n` (`nn` = n·n). */
const reflect = (v: Vec3, n: Vec3, nn: number): Vec3 => sub(v, scale(n, (2 * dot(n, v)) / nn));

export function buildTube(
  geometry: SignalGeometry,
  profile: TubeProfile,
  radiusScale = 1,
  radiusPad = 0,
): TubeArrays {
  const rings = geometry.points.length;
  const segments = profile.radialSegments;
  const radius = profile.radius * radiusScale + radiusPad;
  // Page px → world: x as is, y negated, on the page plane (camera.ts convention).
  const centres: Vec3[] = geometry.points.map((p) => [p.x, -p.y, 0]);

  const tangents: Vec3[] = centres.map((_, i) =>
    normalise(sub(centres[Math.min(i + 1, rings - 1)], centres[Math.max(i - 1, 0)])),
  );

  // First frame: any vector perpendicular to the first tangent. After that each frame is the
  // previous one carried along by two reflections — the rotation-minimising frame.
  const frames: Vec3[] = new Array(rings);
  const seed: Vec3 = Math.abs(tangents[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  frames[0] = normalise(cross(tangents[0], seed));
  for (let i = 0; i < rings - 1; i++) {
    const step = sub(centres[i + 1], centres[i]);
    const stepLength = dot(step, step);
    if (!(stepLength > 0)) {
      frames[i + 1] = frames[i];
      continue;
    }
    const carried = reflect(frames[i], step, stepLength);
    const carriedTangent = reflect(tangents[i], step, stepLength);
    const correction = sub(tangents[i + 1], carriedTangent);
    const correctionLength = dot(correction, correction);
    frames[i + 1] = normalise(correctionLength > 1e-18 ? reflect(carried, correction, correctionLength) : carried);
  }

  const vertexCount = rings * segments;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const lengths = new Float32Array(vertexCount);
  const centreArray = new Float32Array(rings * 3);

  for (let i = 0; i < rings; i++) {
    centreArray.set(centres[i], i * 3);
    const across = frames[i];
    const around = cross(tangents[i], across);
    for (let j = 0; j < segments; j++) {
      const angle = (2 * Math.PI * j) / segments;
      const out: Vec3 = [
        across[0] * Math.cos(angle) + around[0] * Math.sin(angle),
        across[1] * Math.cos(angle) + around[1] * Math.sin(angle),
        across[2] * Math.cos(angle) + around[2] * Math.sin(angle),
      ];
      const v = i * segments + j;
      positions.set([centres[i][0] + out[0] * radius, centres[i][1] + out[1] * radius, centres[i][2] + out[2] * radius], v * 3);
      normals.set(out, v * 3);
      lengths[v] = geometry.lengths[i];
    }
  }

  const indices = new Uint32Array((rings - 1) * segments * 6);
  let k = 0;
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j;
      const b = i * segments + ((j + 1) % segments);
      const c = a + segments;
      const d = b + segments;
      // Counter-clockwise seen from outside, so the default front-face culling keeps the
      // outer surface only (the ring runs right-handed about the tangent).
      indices.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }

  return { positions, normals, lengths, indices, centres: centreArray, ringLengths: Float32Array.from(geometry.lengths) };
}

/** The tube's centre at `length` px along it — where the tip's cap sits. */
export function pointAtLength(tube: TubeArrays, length: number): { x: number; y: number; z: number } {
  const last = tube.ringLengths.length - 1;
  const ringAt = (i: number) => ({ x: tube.centres[i * 3], y: tube.centres[i * 3 + 1], z: tube.centres[i * 3 + 2] });
  if (!(length > tube.ringLengths[0])) return ringAt(0);
  if (length >= tube.ringLengths[last]) return ringAt(last);

  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tube.ringLengths[mid] < length) lo = mid + 1;
    else hi = mid;
  }
  const [before, after] = [ringAt(lo - 1), ringAt(lo)];
  const span = tube.ringLengths[lo] - tube.ringLengths[lo - 1];
  const t = span > 0 ? (length - tube.ringLengths[lo - 1]) / span : 1;
  const mix = (a: number, b: number) => a + (b - a) * t;
  return { x: mix(before.x, after.x), y: mix(before.y, after.y), z: mix(before.z, after.z) };
}

/**
 * A `#RRGGBB` token as sRGB channels 0..1. The shaders write these straight to the canvas,
 * which is sRGB — going through THREE.Color would convert to linear and darken the red.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.trim().replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
