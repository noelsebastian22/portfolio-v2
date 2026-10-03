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
import { playheadPageY } from '../signal/playhead';
import { createTubeSignal } from '../signal/tube-signal';
import { onSignalGeometry, onSignalTip } from '../signal/tip';
import { cameraRig } from './camera';
import { createFrameWatch, probeVerdict, PROBE_FRAMES, shouldFallBack, type ProbeVerdict } from './frame';
import { rememberFallback } from './gate';
import { createPortraitParticles, type PortraitParticles } from './particles';
import { dissolveProgress, stillErosion } from './portrait-dissolve';
import { PORTRAIT_SEED, samplePortrait } from './portrait-sample';
import { readPortraitGrid } from './portrait-source';
import { createPortraitTiers, PORTRAIT_COUNTS, type PortraitTiers } from './portrait-tier';
import { createRenderSchedule } from './render-schedule';
import { mountRingStage, type RingStage } from './ring-stage';
import { hexToRgb } from './tube-mesh';

const MAX_PIXEL_RATIO = 2;
/** Per drawn frame: how far the pushed field's centre and strength close on the real pointer. */
const POINTER_EASE = 0.18;

const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn) : setTimeout(fn, 0);

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

  // The portrait (Phase 11) — null until it has sampled, and again after it is dropped.
  let portrait: PortraitParticles | null = null;
  let tiers: PortraitTiers | null = null;
  let pageProgress = 0;
  // Client px, so a page that scrolls under a still mouse moves the push with it. `hasMoved`
  // lets the first move place the eased centre outright instead of sweeping it in from nowhere.
  const pointer = { clientX: 0, clientY: 0, isInWindow: false, hasMoved: false, easedX: 0, easedY: 0, strength: 0 };
  const portraitFrame = {
    start: { x: 0, y: 0 },
    heroTop: 0,
    heroBottom: 0,
    heroHeight: 0,
    docHeight: 0,
    viewportHeight: 0,
    /** The hero the erosion is written to — set by `mountPortrait`, cleared by its unmount. */
    hero: null as HTMLElement | null,
    /** The last `--portrait-erosion` written; a drift frame that changes nothing writes nothing. */
    erosion: -1,
  };

  // The 3D ring (Phase 12) — null until mounted, and again after it is dropped.
  let ring: RingStage | null = null;

  /** Everything the portrait's uniforms need for this frame; called just before `render()`. */
  function updatePortrait(): void {
    if (!portrait) return;
    const { start, heroHeight, docHeight, viewportHeight } = portraitFrame;
    const playheadY = playheadPageY(pageProgress, docHeight, viewportHeight);
    const restPlayheadY = playheadPageY(0, docHeight, viewportHeight);
    const progress = dissolveProgress(playheadY, restPlayheadY, start.y, heroHeight);
    portrait.setProgress(progress);
    const erosion = stillErosion(progress);
    if (erosion !== portraitFrame.erosion && portraitFrame.hero) {
      portraitFrame.erosion = erosion;
      portraitFrame.hero.style.setProperty('--portrait-erosion', erosion.toFixed(4));
    }
    portrait.setTime(gsap.ticker.time);
    const pageX = pointer.clientX + window.scrollX;
    const pageY = pointer.clientY + window.scrollY;
    const isOverHero =
      pointer.isInWindow && pointer.hasMoved && pageY >= portraitFrame.heroTop && pageY <= portraitFrame.heroBottom;
    pointer.strength += ((isOverHero ? 1 : 0) - pointer.strength) * POINTER_EASE;
    pointer.easedX += (pageX - pointer.easedX) * POINTER_EASE;
    pointer.easedY += (pageY - pointer.easedY) * POINTER_EASE;
    portrait.setPointer(pointer.easedX, pointer.easedY, pointer.strength);
  }

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
      let tripped = false;
      if (isLive && sinceLastDrawMs !== null) {
        if (tiers && portrait) {
          const verdict = tiers.push(sinceLastDrawMs);
          if (verdict === 'step') portrait.setCount(tiers.count);
          tripped = verdict === 'fallBack';
        } else {
          tripped = watch.push(sinceLastDrawMs);
        }
      }
      if (!checkHealth(tripped)) return;
      try {
        updatePortrait();
      } catch {
        dropPortrait();
      }
      try {
        ring?.update();
      } catch {
        dropRing();
      }
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

  /** Undo everything `mountPortrait` did; the still fades back. The tube is untouched. */
  let unmountPortrait: (() => void) | null = null;
  function dropPortrait(): void {
    unmountPortrait?.();
    unmountPortrait = null;
    schedule.markDirty();
  }

  function dropRing(): void {
    ring?.unmount();
    ring = null;
    schedule.markDirty();
  }

  /** After the portrait's mount is booked: the ring never delays the tube or the face. */
  function mountRing(): void {
    const section = document.querySelector<HTMLElement>('[data-ring]');
    if (!section || !canvas.isConnected) return;
    try {
      ring = mountRingStage({
        section,
        cameraDistance: () => cameraRig(viewport().width, viewport().height, 0, 0).distance,
        markDirty: () => schedule.markDirty(),
        onDrop: () => {
          ring = null;
          schedule.markDirty();
        },
      });
    } catch {
      ring = null;
    }
    if (ring) onHandBack(() => dropRing());
  }

  /**
   * After the tube is live, in an idle callback: sample the still, put the particles on it, then
   * fade the still. Any failure here leaves the still and the tube exactly as they were (design
   * §5) — the portrait never hands the tube back.
   */
  async function mountPortrait(hero: HTMLElement, still: HTMLImageElement): Promise<void> {
    let particles: PortraitParticles;
    try {
      const grid = await readPortraitGrid(still);
      if (!canvas.isConnected) return;
      particles = createPortraitParticles(samplePortrait(grid, PORTRAIT_COUNTS[0], PORTRAIT_SEED), {
        cream: hexToRgb(tokens.getPropertyValue('--type')),
        signal: hexToRgb(tokens.getPropertyValue('--signal')),
      });
    } catch {
      return;
    }

    // Layout reads, kept out of the draw: the box, the hero, the document and the viewport.
    const measure = () => {
      const box = still.getBoundingClientRect();
      particles.setBox({ x: box.left + window.scrollX, y: box.top + window.scrollY, width: box.width, height: box.height });
      particles.setPixelRatio(renderer.getPixelRatio());
      const heroBox = hero.getBoundingClientRect();
      portraitFrame.heroTop = heroBox.top + window.scrollY;
      portraitFrame.heroBottom = heroBox.bottom + window.scrollY;
      portraitFrame.heroHeight = heroBox.height;
      portraitFrame.docHeight = document.documentElement.scrollHeight;
      portraitFrame.viewportHeight = window.innerHeight;
      schedule.markDirty();
    };

    let heroVisible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
    });
    visibility.observe(hero);

    // The drift loop (design D7): dirty every tick while the hero is on screen and the tab is
    // visible. Appended after the schedule's own listener, so it draws on the following tick.
    const keepDrifting = () => {
      if (heroVisible && !document.hidden) schedule.markDirty();
    };
    gsap.ticker.add(keepDrifting);

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.isInWindow = true;
      if (!pointer.hasMoved) {
        pointer.hasMoved = true;
        pointer.easedX = event.clientX + window.scrollX;
        pointer.easedY = event.clientY + window.scrollY;
      }
    };
    const onPointerLeave = () => {
      pointer.isInWindow = false;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', measure);
    const stopGeometry = onSignalGeometry((geometry) => {
      const first = geometry.points[0];
      if (first) portraitFrame.start = { x: first.x, y: first.y };
      if (first) particles.setStart(first.x, first.y);
      measure();
    });

    unmountPortrait = () => {
      stopGeometry();
      window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      gsap.ticker.remove(keepDrifting);
      visibility.disconnect();
      scene.remove(particles.points);
      particles.dispose();
      hero.classList.remove('hero--particles');
      hero.style.removeProperty('--portrait-erosion');
      portraitFrame.hero = null;
      portrait = null;
      tiers = null;
    };
    onHandBack(() => unmountPortrait?.());

    portraitFrame.hero = hero;
    portraitFrame.erosion = -1;
    tiers = createPortraitTiers();
    particles.setCount(tiers.count);
    scene.add(particles.points);
    portrait = particles;
    measure();
    // Three logs a failed shader compile and draws nothing — it never throws — so without this
    // a broken program would fade the still out over an empty hero.
    let portraitFailed = false;
    renderer.debug.onShaderError = () => {
      portraitFailed = true;
    };
    try {
      updatePortrait();
      render();
    } catch {
      portraitFailed = true;
    } finally {
      renderer.debug.onShaderError = null;
    }
    if (portraitFailed) {
      dropPortrait();
      return;
    }
    // The particles are on screen under the still; now the still can go (D10).
    hero.classList.add('hero--particles');
  }

  onHandBack(
    onSignalGeometry(whileLive((geometry) => tube.rebuild(geometry))),
    onSignalTip(whileLive((pageY) => tube.setTip(pageY))),
    onPageProgress((t) => {
      pageProgress = t;
      schedule.markDirty();
    }),
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

  // Phase 11: the portrait follows the tube and never delays it.
  const hero = document.getElementById('hero');
  const still = hero?.querySelector<HTMLImageElement>('img[data-portrait-still]');
  if (hero && still) whenIdle(() => void mountPortrait(hero, still));

  // Phase 12: the ring follows the tube, and never delays it.
  whenIdle(mountRing);
}
