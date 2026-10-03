/**
 * The portrait as GPU particles (Phase 11): one `Points`, one shader, every motion in the
 * vertex stage — the dissolve (portrait-dissolve.ts is its tested reference, and its constants
 * are injected here as defines), the cream → red shift as a particle joins the line (D5), idle
 * drift (D7) and the cursor's push (D6). The scene only sets uniforms.
 *
 * World units are CSS px on the page plane, `y` negated (camera.ts) — the same space as the
 * tube, so the stream lands on the line's first point exactly.
 */

import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { DISSOLVE } from './portrait-dissolve';
import type { PortraitSample } from './portrait-sample';

export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PortraitLook {
  /** `--type` as 0..1 channels (tube-mesh.ts `hexToRgb`). */
  cream: [number, number, number];
  /** `--signal` as 0..1 channels. */
  signal: [number, number, number];
}

export interface PortraitParticles {
  points: Points;
  /** The still's box, page px. */
  setBox(box: PageBox): void;
  /** The line's first point, page px. */
  setStart(x: number, y: number): void;
  /** Dissolve progress, 0..1 (portrait-dissolve.ts `dissolveProgress`). */
  setProgress(progress: number): void;
  /** Page px; `strength` 0..1 eases the push in and out. */
  setPointer(x: number, y: number, strength: number): void;
  setTime(seconds: number): void;
  setPixelRatio(ratio: number): void;
  /** How many of the sample to draw — a prefix is an even thinning (portrait-tier.ts). */
  setCount(count: number): void;
  dispose(): void;
}

/** Tuned at the checkpoint with Noel. CSS px unless stated. */
const LOOK = {
  sizePx: 2,
  driftPx: 1.5,
  /** Radians per second. */
  driftSpeed: 0.6,
  pushRadiusPx: 80,
  pushPx: 18,
};

const glslFloat = (value: number) => value.toFixed(4);

const VERTEX = /* glsl */ `
  uniform vec4 uBox;
  uniform vec2 uStart;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec2 aHome;
  attribute float aBright;
  attribute float aSeed;
  varying float vTravelled;
  varying float vAlpha;

  void main() {
    vec2 home = uBox.xy + aHome * uBox.zw;

    // portrait-dissolve.ts particleProgress — keep the two identical.
    float leaves = (1.0 - aHome.y) * (LAST_ARRIVAL - WINDOW);
    float travelled = smoothstep(0.0, 1.0, clamp((uProgress - leaves) / WINDOW, 0.0, 1.0));

    // portrait-dissolve.ts particleAt.
    vec2 middle = (home + uStart) * 0.5;
    vec2 control = middle + (vec2(home.x, uStart.y) - middle) * BOW;
    float rest = 1.0 - travelled;
    vec2 page = rest * rest * home + 2.0 * rest * travelled * control + travelled * travelled * uStart;

    float phase = aSeed * 6.2831853;
    page += DRIFT_PX * rest * vec2(sin(uTime * DRIFT_SPEED + phase), cos(uTime * DRIFT_SPEED * 0.83 + phase * 1.7));

    vec2 away = page - uPointer;
    float pointerDistance = length(away);
    float push = uPointerStrength * rest * (1.0 - smoothstep(0.0, PUSH_RADIUS, pointerDistance));
    if (pointerDistance > 0.001) page += normalize(away) * PUSH_PX * push;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(page.x, -page.y, 0.0, 1.0);
    gl_PointSize = SIZE_PX * mix(0.6 + 0.6 * aBright, 0.5, travelled) * uPixelRatio;
    vTravelled = travelled;
    vAlpha = (0.35 + 0.65 * aBright) * (1.0 - smoothstep(0.8, 1.0, travelled));
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uCream;
  uniform vec3 uSignal;
  varying float vTravelled;
  varying float vAlpha;

  void main() {
    float radius = length(gl_PointCoord - 0.5);
    if (radius > 0.5) discard;
    float edge = 1.0 - smoothstep(0.35, 0.5, radius);
    // Cream at home, the signal's red by the time it joins the line (D5).
    vec3 color = mix(uCream, uSignal, smoothstep(0.15, 0.7, vTravelled));
    gl_FragColor = vec4(color, vAlpha * edge);
  }
`;

export function createPortraitParticles(sample: PortraitSample, look: PortraitLook): PortraitParticles {
  const geometry = new BufferGeometry();
  geometry.setAttribute('aHome', new BufferAttribute(sample.homes, 2));
  geometry.setAttribute('aBright', new BufferAttribute(sample.brightness, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(sample.seeds, 1));
  // Three needs a `position` to size the draw; the shader never reads it.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(sample.count * 3), 3));

  const uniforms = {
    uBox: { value: new Vector4() },
    uStart: { value: new Vector2() },
    uProgress: { value: 0 },
    uPointer: { value: new Vector2(-1e5, -1e5) },
    uPointerStrength: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uCream: { value: new Vector3(...look.cream) },
    uSignal: { value: new Vector3(...look.signal) },
  };

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: {
      WINDOW: glslFloat(DISSOLVE.window),
      LAST_ARRIVAL: glslFloat(DISSOLVE.lastArrival),
      BOW: glslFloat(DISSOLVE.bow),
      SIZE_PX: glslFloat(LOOK.sizePx),
      DRIFT_PX: glslFloat(LOOK.driftPx),
      DRIFT_SPEED: glslFloat(LOOK.driftSpeed),
      PUSH_RADIUS: glslFloat(LOOK.pushRadiusPx),
      PUSH_PX: glslFloat(LOOK.pushPx),
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const points = new Points(geometry, material);
  // The shader moves every vertex; Three's bounds would be of the unused `position` buffer.
  points.frustumCulled = false;
  // Drawn after the tube's glow (renderOrder 1), so a particle arriving on the line sits on it.
  points.renderOrder = 2;

  return {
    points,
    setBox: (box) => uniforms.uBox.value.set(box.x, box.y, box.width, box.height),
    setStart: (x, y) => uniforms.uStart.value.set(x, y),
    setProgress(progress) {
      uniforms.uProgress.value = progress;
      // Fully dissolved, every particle sits on the start at zero alpha: skip the draw.
      points.visible = progress < 1;
    },
    setPointer(x, y, strength) {
      uniforms.uPointer.value.set(x, y);
      uniforms.uPointerStrength.value = strength;
    },
    setTime: (seconds) => {
      uniforms.uTime.value = seconds;
    },
    setPixelRatio: (ratio) => {
      uniforms.uPixelRatio.value = ratio;
    },
    setCount: (count) => geometry.setDrawRange(0, Math.min(count, sample.count)),
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
