/**
 * Wires the engine to the page (Phase 13): emissions from the bus through the note gate,
 * scroll speed from the shared GSAP ticker, hover ticks from a delegated `pointerover`.
 * The lazy chunk's entry — `islands/sound.ts` imports it with `import()`.
 *
 * Speed is read from `scrollY` deltas rather than from Lenis, so it works the same under
 * reduced motion, where Lenis never runs (spec D5).
 */

import { onTick } from '../motion/timeline';
import { onEmission } from '../signal/emissions';
import { createAudioEngine } from './engine';
import { createNoteGate, normaliseSpeed } from './score';

export interface AudioControl {
  start(): void;
  stop(): void;
}

const HOVER_TARGETS = 'a, button, [data-card-link]';
/** Per-frame smoothing of the measured speed: one frame's spike should not slam the filter open. */
const SPEED_SMOOTHING = 0.15;

export function connectAudio(ctx: AudioContext): AudioControl {
  const engine = createAudioEngine(ctx);
  const gate = createNoteGate();

  let unsubscribe: (() => void) | undefined;
  let lastScrollY = 0;
  let speed = 0;
  let hovered: Element | null = null;
  let stopSampling: (() => void) | undefined;

  function sampleSpeed(deltaMs: number): void {
    const scrollY = window.scrollY;
    const pxPerSecond = deltaMs > 0 ? ((scrollY - lastScrollY) / deltaMs) * 1000 : 0;
    lastScrollY = scrollY;
    speed += (Math.abs(pxPerSecond) - speed) * SPEED_SMOOTHING;
    engine.setVelocity(normaliseSpeed(speed));
  }

  function tickOnHover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return; // a tap is not a hover
    const target = event.target instanceof Element ? event.target.closest(HOVER_TARGETS) : null;
    if (target === hovered) return; // moving within one link is one hover
    hovered = target;
    if (target) engine.tick();
  }

  return {
    start() {
      if (unsubscribe) return;
      lastScrollY = window.scrollY;
      speed = 0;
      unsubscribe = onEmission((event) => {
        const startAt = gate.schedule(`${event.section}:${event.index}`, ctx.currentTime);
        if (startAt !== null) engine.emit(event, startAt);
      });
      stopSampling = onTick(sampleSpeed);
      document.addEventListener('pointerover', tickOnHover);
      engine.start();
    },
    stop() {
      if (!unsubscribe) return;
      unsubscribe();
      unsubscribe = undefined;
      stopSampling?.();
      stopSampling = undefined;
      document.removeEventListener('pointerover', tickOnHover);
      hovered = null;
      engine.stop();
    },
  };
}
