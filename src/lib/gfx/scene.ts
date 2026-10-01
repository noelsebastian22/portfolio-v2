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
 * When it draws is render-schedule.ts's call: in the scroll driver's own tick.
 */

import { gsap } from 'gsap';
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { onPageProgress } from '../motion/timeline';
import { createTubeSignal } from '../signal/tube-signal';
import { onSignalGeometry, onSignalTip } from '../signal/tip';
import { cameraRig } from './camera';
import { createFrameWatch, probeVerdict, PROBE_FRAMES, shouldFallBack, type ProbeVerdict } from './frame';
import { rememberFallback } from './gate';
import { createRenderSchedule } from './render-schedule';
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

  // The renderer first, the canvas into the page only once it exists: a renderer that will
  // not start then leaves nothing behind (BaseLayout's catch has nothing to undo), and it
  // will not start next load either.
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    rememberFallback();
    throw error;
  }
  layer.after(canvas);
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

  // The pixel ratio too: browser zoom changes devicePixelRatio, and fires `resize`.
  const resize = () => {
    const { width, height } = viewport();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
  };
  resize();

  let contextLost = false;
  let isLive = false;
  const watch = createFrameWatch();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups: (() => void)[] = [];

  /** One way: `remember` is false only when the probe could not reach a verdict. */
  function fallBack(remember = true): void {
    if (!canvas.isConnected) return; // already handed back
    isLive = false;
    layer.classList.remove('signal-layer--tube');
    for (const cleanup of cleanups) cleanup();
    tube.dispose();
    renderer.dispose();
    // dispose() frees the GPU objects but leaves the context alive until GC, and browsers
    // cap live contexts; Phases 11 and 12 add their own.
    renderer.forceContextLoss();
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

  /** A cleanup registered after a hand-back (a listener's replay can cause one) runs at once. */
  function onHandBack(...more: (() => void)[]): void {
    if (canvas.isConnected) cleanups.push(...more);
    else for (const cleanup of more) cleanup();
  }

  const schedule = createRenderSchedule({
    // gsap.ticker.add appends, and listeners run in order, so this draws after scroll.ts's
    // Lenis listener in every tick — the tip and progress it draws are the ones Lenis →
    // ScrollTrigger published this tick. Guaranteed: BaseLayout's script calls initScroll(),
    // which registers that listener synchronously, while this module is imported only after
    // `load` and an idle callback, and initScroll() never registers again.
    subscribe: (onTick) => {
      gsap.ticker.add(onTick);
      return () => gsap.ticker.remove(onTick);
    },
    now: () => gsap.ticker.time * 1000, // gsap.ticker's time is seconds; the watch wants ms.
    draw: (sinceLastDrawMs) => {
      const tripped = isLive && sinceLastDrawMs !== null && watch.push(sinceLastDrawMs);
      if (!checkHealth(tripped)) return;
      render();
    },
  });
  onHandBack(schedule.stop);

  // The tube must never take the 2D line down with it: these run inside svg-signal.ts's
  // publish loops, so an exception here would stop its reveal too. Hand back instead.
  const whileLive =
    <Args extends unknown[]>(update: (...args: Args) => void) =>
    (...args: Args): void => {
      if (!canvas.isConnected) return;
      try {
        update(...args);
      } catch {
        fallBack();
        return;
      }
      schedule.markDirty();
    };

  onHandBack(
    onSignalGeometry(whileLive((geometry) => tube.rebuild(geometry))),
    onSignalTip(whileLive((pageY) => tube.setTip(pageY))),
    onPageProgress(() => schedule.markDirty()),
  );
  const onResize = whileLive(resize);
  const onContextLost = () => {
    contextLost = true;
    checkHealth(false);
  };
  const onMotionChange = () => checkHealth(false);
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', onContextLost);
  reducedMotion.addEventListener('change', onMotionChange);
  onHandBack(
    () => window.removeEventListener('resize', onResize),
    () => canvas.removeEventListener('webglcontextlost', onContextLost),
    () => reducedMotion.removeEventListener('change', onMotionChange),
  );

  if (!skipProbe) {
    let verdict: ProbeVerdict = 'inconclusive';
    for (let attempt = 0; attempt < PROBE_ATTEMPTS && verdict === 'inconclusive'; attempt++) {
      // After every await: a fallback while waiting (context loss, reduced motion, a narrow
      // window) has already handed back, and nothing below may swap over it.
      await whenVisible();
      if (!canvas.isConnected) return;
      const intervals: number[] = [];
      let previous = await nextFrame();
      if (!canvas.isConnected) return;
      for (let i = 0; i < PROBE_FRAMES; i++) {
        render();
        const now = await nextFrame();
        if (!canvas.isConnected) return;
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

  // Hiding the SVG line with no canvas left would leave no line at all (final review, I1).
  if (!canvas.isConnected) return;
  // The tube and the SVG line now share every pixel (revision R4), so the swap is instant.
  render();
  isLive = true;
  layer.classList.add('signal-layer--tube');
  canvas.classList.add('signal-canvas--on');
}
