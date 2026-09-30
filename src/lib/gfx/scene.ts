/**
 * The enhanced layer's entry — the dynamic-import boundary (spec §11.3). Nothing here is in
 * any initial chunk: `BaseLayout` imports this only after the gate (gate.ts) says yes.
 *
 * Owns the renderer, the fixed canvas, the camera, the frame probe, the instant swap over
 * the SVG line, the watchdog and the one-way fallback. The SVG renderer keeps running
 * underneath throughout, only hidden, so handing back is one class removed (Phase 10 design, §6).
 *
 * Renders on change only — a scroll, a tip move, a re-measure, a resize — never in a free
 * loop: the scroll is the transport, and an idle page costs the GPU nothing (design D6).
 */

import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { onPageProgress } from '../motion/timeline';
import { createTubeSignal } from '../signal/tube-signal';
import { onSignalGeometry, onSignalTip } from '../signal/tip';
import { cameraRig } from './camera';
import { createFrameWatch, probeVerdict, PROBE_FRAMES, shouldFallBack, type ProbeVerdict } from './frame';
import { rememberFallback } from './gate';
import { hexToRgb } from './tube-mesh';

const MAX_PIXEL_RATIO = 2;
/** The probe is retried this many times if the tab was hidden while it ran. */
const PROBE_ATTEMPTS = 3;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

function whenVisible(): Promise<void> {
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

export async function loadEnhanced({ skipProbe }: { skipProbe: boolean }): Promise<void> {
  const layer = document.getElementById('signal-layer')!;
  const tokens = getComputedStyle(document.documentElement);
  const tube = createTubeSignal({
    color: hexToRgb(tokens.getPropertyValue('--signal')),
    radius: parseFloat(tokens.getPropertyValue('--signal-stroke')) / 2,
  });

  const canvas = document.createElement('canvas');
  canvas.className = 'signal-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.after(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  const scene = new Scene();
  scene.add(tube.group);
  const camera = new PerspectiveCamera();

  // The canvas's own box, not innerWidth: a fixed element excludes the scrollbar, and the
  // page-px ↔ world mapping has to use the width the canvas actually covers.
  const viewport = () => ({ width: canvas.clientWidth, height: canvas.clientHeight });

  function render(): void {
    const { width, height } = viewport();
    const rig = cameraRig(width, height, window.scrollX, window.scrollY);
    camera.fov = rig.fov;
    camera.aspect = rig.aspect;
    camera.near = rig.near;
    camera.far = rig.far;
    camera.position.set(...rig.position);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  const resize = () => {
    const { width, height } = viewport();
    renderer.setSize(width, height, false);
  };
  resize();

  let contextLost = false;
  let isLive = false;
  let pendingFrame = 0;
  let lastFrameAt = 0;
  const watch = createFrameWatch();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups: (() => void)[] = [];

  /** One way: `remember` is false only when the probe could not reach a verdict. */
  function fallBack(remember = true): void {
    if (!canvas.isConnected) return; // already handed back
    isLive = false;
    layer.classList.remove('signal-layer--tube');
    cancelAnimationFrame(pendingFrame);
    for (const cleanup of cleanups) cleanup();
    tube.dispose();
    renderer.dispose();
    canvas.remove();
    if (remember) rememberFallback();
  }

  function checkHealth(watchTripped: boolean): boolean {
    const mustHandBack = shouldFallBack({
      viewportWidth: document.documentElement.clientWidth,
      reducedMotion: reducedMotion.matches,
      contextLost,
      watchTripped,
    });
    if (mustHandBack) fallBack();
    return !mustHandBack;
  }

  function requestRender(): void {
    if (pendingFrame !== 0 || !canvas.isConnected) return;
    pendingFrame = requestAnimationFrame((now) => {
      pendingFrame = 0;
      const tripped = isLive && lastFrameAt > 0 && watch.push(now - lastFrameAt);
      lastFrameAt = now;
      if (!checkHealth(tripped)) return;
      render();
    });
  }

  cleanups.push(
    onSignalGeometry((geometry) => {
      tube.rebuild(geometry);
      requestRender();
    }),
    onSignalTip((pageY) => {
      tube.setTip(pageY);
      requestRender();
    }),
    onPageProgress(() => requestRender()),
  );
  const onResize = () => {
    resize();
    requestRender();
  };
  const onContextLost = () => {
    contextLost = true;
    checkHealth(false);
  };
  const onMotionChange = () => checkHealth(false);
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', onContextLost);
  reducedMotion.addEventListener('change', onMotionChange);
  cleanups.push(
    () => window.removeEventListener('resize', onResize),
    () => canvas.removeEventListener('webglcontextlost', onContextLost),
    () => reducedMotion.removeEventListener('change', onMotionChange),
  );

  if (!skipProbe) {
    let verdict: ProbeVerdict = 'inconclusive';
    for (let attempt = 0; attempt < PROBE_ATTEMPTS && verdict === 'inconclusive'; attempt++) {
      await whenVisible();
      const intervals: number[] = [];
      let previous = await nextFrame();
      for (let i = 0; i < PROBE_FRAMES; i++) {
        render();
        const now = await nextFrame();
        intervals.push(now - previous);
        previous = now;
      }
      verdict = probeVerdict(intervals);
    }
    if (verdict !== 'pass') {
      // A tab hidden through every attempt proves nothing about the GPU: stay 2D this time,
      // but let the next load try again.
      fallBack(verdict === 'fail');
      return;
    }
  }

  // The tube and the SVG line now share every pixel (revision R4), so the swap is instant.
  render();
  isLive = true;
  layer.classList.add('signal-layer--tube');
  canvas.classList.add('signal-canvas--on');
}
