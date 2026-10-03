/**
 * The 3D ring's WebGL side (Phase 12): the hoop the line meets, the drops the cards hang from,
 * the glow round each emission, the floor and the hoop's reflection on it. Built once in front
 * space (ring.ts) and placed each frame by matrices from the same module, so it can never
 * disagree with the CSS cards about where the ring is.
 *
 * Shading follows tube-signal.ts — round without lights, an additive shell for the glow, no
 * post-processing — plus two things only the ring has: depth fog toward `--ground` round the
 * back of the hoop, and the pulse (design §4).
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three';
import { buildTubeFromCentres, type TubeArrays, type Vec3 } from './tube-mesh';
import { HOOP_DROP_PX, RING_CARD_COUNT, frontToWorld, hoopPoint, tiltMatrix } from './ring';
import type { RingFrame } from './ring-stage';

const HOOP_SEGMENTS = 192;
const DROP_SEGMENTS = 12;
const RADIAL_SEGMENTS = 12;
const GLOW_SCALE = 3;
const GLOW_PAD = 2;
const GLOW_STRENGTH = 0.35;
/** How far round from the front the fog starts and is full, degrees; and how strong it gets. */
const FOG_FROM_DEG = 50;
const FOG_FULL_DEG = 170;
const FOG_STRENGTH = 0.78;
/** The pulse's half-width along the hoop, degrees, and along a drop, as a share of it. */
const PULSE_WIDTH_DEG = 9;
const PULSE_WIDTH_DROP = 0.18;

export interface RingLook {
  signal: [number, number, number];
  ground: [number, number, number];
  type: [number, number, number];
  shipped: [number, number, number];
  /** Half of `--signal-stroke`. */
  radius: number;
}

export interface RingMesh {
  group: Group;
  setFrame(frame: RingFrame): void;
  dispose(): void;
}

const VERTEX = /* glsl */ `
  attribute float aArc;
  varying float vArc;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vArc = aArc;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// aArc: degrees round the hoop from the front (signed), or 0..1 down a drop.
// uDrawn: how far it is drawn, in the same unit — the hoop draws both ways from the front.
// uFog: a drop's fog is its card's; the hoop's comes from its own arc (uFogFromArc = 1).
const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uGround;
  uniform vec3 uHot;
  uniform float uDrawn;
  uniform float uFog;
  uniform float uFogFromArc;
  uniform float uPulseAt;
  uniform float uPulseWidth;
  uniform float uPulseStrength;
  uniform float uAlpha;
  uniform float uIsGlow;
  varying float vArc;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    if (abs(vArc) > uDrawn) discard;
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float fog = mix(uFog, smoothstep(${FOG_FROM_DEG.toFixed(1)}, ${FOG_FULL_DEG.toFixed(1)}, abs(vArc)) * ${FOG_STRENGTH.toFixed(2)}, uFogFromArc);
    float pulse = uPulseStrength * exp(-pow((vArc - uPulseAt) / uPulseWidth, 2.0));
    vec3 base = mix(uColor, uHot, pulse * 0.85);
    if (uIsGlow > 0.5) {
      gl_FragColor = vec4(base, pow(facing, 2.0) * uAlpha * (1.0 - fog) * (1.0 + pulse * 2.0));
      return;
    }
    vec3 shaded = base * mix(0.45, 1.0, pow(facing, 0.6)) + vec3(pow(facing, 12.0) * 0.25);
    gl_FragColor = vec4(mix(shaded, uGround, fog), uAlpha);
  }
`;

function toBufferGeometry(arrays: TubeArrays, arc: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(arrays.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(arrays.normals, 3));
  geometry.setAttribute('aArc', new BufferAttribute(arc, 1));
  geometry.setIndex(new BufferAttribute(arrays.indices, 1));
  return geometry;
}

/** Per-vertex arc: each ring of vertices carries its centre's value. */
function perVertex(values: readonly number[], segments: number): Float32Array {
  const out = new Float32Array(values.length * segments);
  values.forEach((value, i) => out.fill(value, i * segments, (i + 1) * segments));
  return out;
}

export function createRingMesh(look: RingLook, radius: number): RingMesh {
  const group = new Group();
  group.matrixAutoUpdate = false;

  const material = (isGlow: boolean, fogFromArc: boolean) =>
    new ShaderMaterial({
      uniforms: {
        uColor: { value: new Vector3(...look.signal) },
        uGround: { value: new Vector3(...look.ground) },
        uHot: { value: new Vector3(...look.type) },
        uDrawn: { value: 0 },
        uFog: { value: 0 },
        uFogFromArc: { value: fogFromArc ? 1 : 0 },
        uPulseAt: { value: 0 },
        uPulseWidth: { value: fogFromArc ? PULSE_WIDTH_DEG : PULSE_WIDTH_DROP },
        uPulseStrength: { value: 0 },
        uAlpha: { value: isGlow ? GLOW_STRENGTH : 1 },
        uIsGlow: { value: isGlow ? 1 : 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      // Front space is y-down, and frontToWorld flips it, which turns every triangle inside
      // out — both sides, rather than re-winding the shared tube builder.
      side: DoubleSide,
      transparent: isGlow,
      depthWrite: !isGlow,
      ...(isGlow ? { blending: AdditiveBlending } : {}),
    });

  // ── The hoop: untilted front space, tilted and placed by its group's matrix ─────────
  const hoopCentres: Vec3[] = [];
  const hoopArc: number[] = [];
  for (let i = 0; i <= HOOP_SEGMENTS; i++) {
    const deg = -180 + (360 * i) / HOOP_SEGMENTS;
    hoopCentres.push([...hoopPoint(deg, radius, 0)] as Vec3);
    hoopArc.push(deg);
  }
  const profile = { radius: look.radius, radialSegments: RADIAL_SEGMENTS };
  const hoopArcs = perVertex(hoopArc, RADIAL_SEGMENTS);
  const hoopCore = new Mesh(toBufferGeometry(buildTubeFromCentres(hoopCentres, hoopArc, profile), hoopArcs), material(false, true));
  const hoopGlow = new Mesh(
    toBufferGeometry(buildTubeFromCentres(hoopCentres, hoopArc, profile, GLOW_SCALE, GLOW_PAD), hoopArcs),
    material(true, true),
  );
  hoopGlow.renderOrder = 1;
  const hoop = new Group();
  hoop.matrixAutoUpdate = false;
  hoop.add(hoopCore, hoopGlow);

  // ── The drops: one plumb tube each, from the hoop down to the card's top-centre ─────
  const dropCentres: Vec3[] = [];
  const dropAlong: number[] = [];
  for (let i = 0; i <= DROP_SEGMENTS; i++) {
    dropCentres.push([0, (HOOP_DROP_PX * i) / DROP_SEGMENTS, 0]);
    dropAlong.push(i / DROP_SEGMENTS);
  }
  const dropArcs = perVertex(dropAlong, RADIAL_SEGMENTS);
  const dropCoreGeometry = toBufferGeometry(buildTubeFromCentres(dropCentres, dropAlong, profile), dropArcs);
  const dropGlowGeometry = toBufferGeometry(buildTubeFromCentres(dropCentres, dropAlong, profile, GLOW_SCALE, GLOW_PAD), dropArcs);
  const drops = Array.from({ length: RING_CARD_COUNT }, () => {
    const core = new Mesh(dropCoreGeometry, material(false, false));
    const glow = new Mesh(dropGlowGeometry, material(true, false));
    glow.renderOrder = 1;
    const holder = new Group();
    holder.add(core, glow);
    group.add(holder);
    return { holder, core, glow };
  });
  group.add(hoop);

  const toWorld = new Matrix4();
  const hoopMatrix = new Matrix4();

  function setFrame(frame: RingFrame): void {
    toWorld.fromArray(frontToWorld(frame.frontPageX, frame.frontPageY) as number[]);
    group.matrix.copy(toWorld);
    group.matrixWorldNeedsUpdate = true;
    hoopMatrix.fromArray(tiltMatrix(frame.tiltDeg) as number[]);
    hoop.matrix.copy(hoopMatrix);

    // Drawn in degrees each way from the front, so the hoop closes at the back at 180.
    for (const mesh of [hoopCore, hoopGlow]) {
      (mesh.material as ShaderMaterial).uniforms.uDrawn.value = frame.arrival.hoop * 180 + 1e-3;
    }

    frame.cards.forEach((card, i) => {
      const drop = drops[i];
      const [x, y, z] = hoopPoint(card.angleDeg, frame.radius, frame.tiltDeg);
      drop.holder.position.set(x, y, z);
      // A drop is as faded as its card, and fogged as its angle: the back ones barely there.
      const away = Math.abs(card.angleDeg);
      const fog = Math.min(1, Math.max(0, (away - FOG_FROM_DEG) / (FOG_FULL_DEG - FOG_FROM_DEG))) * FOG_STRENGTH;
      for (const mesh of [drop.core, drop.glow]) {
        const uniforms = (mesh.material as ShaderMaterial).uniforms;
        uniforms.uDrawn.value = frame.arrival.drops + 1e-3;
        uniforms.uFog.value = fog;
      }
      drop.holder.visible = frame.arrival.drops > 0;
    });
  }

  function dispose(): void {
    hoopCore.geometry.dispose();
    hoopGlow.geometry.dispose();
    dropCoreGeometry.dispose();
    dropGlowGeometry.dispose();
    for (const mesh of [hoopCore, hoopGlow, ...drops.flatMap((d) => [d.core, d.glow])]) {
      (mesh.material as ShaderMaterial).dispose();
    }
  }

  return { group, setFrame, dispose };
}
