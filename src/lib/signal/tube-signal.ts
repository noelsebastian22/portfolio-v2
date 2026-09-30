/**
 * The 3D renderer for the signal (Phase 10): Three.js meshes over `tube-mesh.ts`'s arrays.
 * It measures nothing and samples nothing — the SVG renderer publishes the line
 * (`SignalGeometry`, tip.ts) and this paints it, so the two can never disagree about where
 * the line is (Phase 10 design, D3).
 *
 * Two meshes share the geometry's shape: the core, shaded round by its normal against the
 * view, and an additive glow shell around it (design D5 — no post-processing). Both cut off
 * at the tip in the fragment shader, so the reveal is exact rather than ring by ring, and a
 * sphere caps the tip like the SVG's round linecap.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { buildTube, pointAtLength, type TubeArrays, type TubeProfile } from '../gfx/tube-mesh';
import { lengthAtY } from './playhead';
import type { SignalGeometry } from './tip';

export interface TubeLook {
  /** `--signal` as sRGB channels (tube-mesh.ts `hexToRgb`). */
  color: [number, number, number];
  /** `--signal-dim-alpha`. */
  dimAlpha: number;
  heroRadius: number;
  /** Half of `--signal-stroke`. */
  baseRadius: number;
}

export interface TubeSignal {
  group: Group;
  rebuild(geometry: SignalGeometry, heroDepth: number): void;
  /** The published tip's page y (tip.ts). */
  setTip(pageY: number): void;
  dispose(): void;
}

const RADIAL_SEGMENTS = 12;
/** The glow shell: this many times the core's radius, plus this many px. Tuned at the checkpoint. */
const GLOW_SCALE = 3;
const GLOW_PAD = 2;
const GLOW_STRENGTH = 0.35;

const VERTEX = /* glsl */ `
  attribute float aLength;
  attribute float aStrength;
  varying float vLength;
  varying float vStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vLength = aLength;
    vStrength = aStrength;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// Round without lights: bright where the surface faces the camera, darker toward the rim.
const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDim;
  uniform float uDrawn;
  uniform float uCapStrength;
  varying float vLength;
  varying float vStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #ifdef CAP
      float strength = uCapStrength;
    #else
      if (vLength > uDrawn) discard;
      float strength = vStrength;
    #endif
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    vec3 shaded = uColor * mix(0.45, 1.0, pow(facing, 0.6)) + vec3(pow(facing, 12.0) * 0.25);
    gl_FragColor = vec4(shaded, mix(uDim, 1.0, strength));
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDim;
  uniform float uDrawn;
  uniform float uGlow;
  uniform float uCapStrength;
  varying float vLength;
  varying float vStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #ifdef CAP
      float strength = uCapStrength;
    #else
      if (vLength > uDrawn) discard;
      float strength = vStrength;
    #endif
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    gl_FragColor = vec4(uColor, pow(facing, 2.0) * uGlow * mix(uDim, 1.0, strength));
  }
`;

export function createTubeSignal(look: TubeLook): TubeSignal {
  const group = new Group();
  const uniforms = {
    uColor: { value: new Vector3(...look.color) },
    uDim: { value: look.dimAlpha },
    uDrawn: { value: 0 },
    uGlow: { value: GLOW_STRENGTH },
    uCapStrength: { value: 1 },
  };

  const material = (fragmentShader: string, isGlow: boolean, isCap: boolean) =>
    new ShaderMaterial({
      uniforms, // shared: one uDrawn moves every part
      vertexShader: VERTEX,
      fragmentShader,
      defines: isCap ? { CAP: '' } : {},
      transparent: true,
      depthWrite: !isGlow,
      // Front faces only (tube-mesh.ts winds them outward): drawing both sides would double
      // the dim rule's alpha. Spread, not `blending: undefined`, which Three warns about.
      ...(isGlow ? { blending: AdditiveBlending } : {}),
    });

  const coreMesh = new Mesh(new BufferGeometry(), material(CORE_FRAGMENT, false, false));
  const glowMesh = new Mesh(new BufferGeometry(), material(GLOW_FRAGMENT, true, false));
  const capGeometry = new SphereGeometry(1, 16, 12);
  const coreCap = new Mesh(capGeometry, material(CORE_FRAGMENT, false, true));
  const glowCap = new Mesh(capGeometry, material(GLOW_FRAGMENT, true, true));
  glowMesh.renderOrder = 1;
  glowCap.renderOrder = 1;
  group.add(coreMesh, glowMesh, coreCap, glowCap);

  let core: TubeArrays | null = null;
  let points: SignalGeometry['points'] = [];
  let lengths: SignalGeometry['lengths'] = [];
  let tipY: number | null = null;

  function toBufferGeometry(arrays: TubeArrays): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(arrays.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(arrays.normals, 3));
    geometry.setAttribute('aLength', new BufferAttribute(arrays.lengths, 1));
    geometry.setAttribute('aStrength', new BufferAttribute(arrays.strengths, 1));
    geometry.setIndex(new BufferAttribute(arrays.indices, 1));
    return geometry;
  }

  function placeCaps(): void {
    if (!core || tipY === null) return;
    const drawn = lengthAtY(points, lengths, tipY);
    uniforms.uDrawn.value = drawn;
    const tip = pointAtLength(core, drawn);
    uniforms.uCapStrength.value = tip.strength;
    coreCap.position.set(tip.x, tip.y, tip.z);
    coreCap.scale.setScalar(tip.radius);
    glowCap.position.set(tip.x, tip.y, tip.z);
    glowCap.scale.setScalar(tip.radius * GLOW_SCALE + GLOW_PAD);
  }

  function rebuild(geometry: SignalGeometry, heroDepth: number): void {
    const profile: TubeProfile = {
      heroRadius: look.heroRadius,
      baseRadius: look.baseRadius,
      heroDepth,
      radialSegments: RADIAL_SEGMENTS,
    };
    core = buildTube(geometry, profile);
    points = geometry.points;
    lengths = geometry.lengths;
    coreMesh.geometry.dispose();
    glowMesh.geometry.dispose();
    coreMesh.geometry = toBufferGeometry(core);
    glowMesh.geometry = toBufferGeometry(buildTube(geometry, profile, GLOW_SCALE, GLOW_PAD));
    placeCaps();
  }

  function setTip(pageY: number): void {
    tipY = pageY;
    placeCaps();
  }

  function dispose(): void {
    for (const mesh of [coreMesh, glowMesh, coreCap, glowCap]) (mesh.material as ShaderMaterial).dispose();
    coreMesh.geometry.dispose();
    glowMesh.geometry.dispose();
    capGeometry.dispose();
  }

  return { group, rebuild, setTip, dispose };
}
