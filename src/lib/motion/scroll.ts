/**
 * Smooth scroll and the single shared RAF driver for the site's motion layer.
 *
 * Lenis owns the smoothing; GSAP's ticker drives both Lenis and `ScrollTrigger` off one
 * `requestAnimationFrame` loop, per Lenis's documented GSAP integration. Two independent
 * tickers produce visible jitter between the smoothed scroll and anything pinned to it —
 * this is also why both libraries are in the bundle rather than one being reimplemented
 * on top of the other.
 *
 * `initScroll()` never instantiates Lenis under `prefers-reduced-motion`: smooth-scroll
 * hijacking is itself a motion effect, and the one people with vestibular disorders
 * complain about most. Native scrolling handles the page instead — `onSection` in
 * `timeline.ts` mirrors this by skipping animation and jumping straight to end state.
 *
 * SSR safety: Astro evaluates this module's top-level code during the static build,
 * where `window` does not exist. Every DOM/BOM access lives inside a function, guarded.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

let lenis: Lenis | undefined;
let initialized = false;

/**
 * True when the user has asked for reduced motion. False when there is no `matchMedia`
 * to ask — during SSR, and in any environment that simply lacks it.
 */
export function reducedMotion(): boolean {
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Starts Lenis and wires it to GSAP's ticker and `ScrollTrigger`. Idempotent — safe to
 * call from every layout mount, including after an Astro view transition re-mounts it,
 * without ever spinning up a second Lenis instance.
 */
export function initScroll(): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  initialized = true;

  if (reducedMotion()) return; // Lenis is never instantiated; native scroll takes over.

  gsap.registerPlugin(ScrollTrigger);

  // `anchors` defaults to false, and Lenis only attaches its click handler when it is
  // set (lenis.mjs: `if (this.options.anchors || this.options.stopInertiaOnNavigate)`).
  // Without it every in-page nav link jumps instantly — and Task 4.1 removed
  // `scroll-behavior: smooth` deliberately, because it fights Lenis. On a site whose
  // premise is that the scroll is the transport, the nav must travel along it.
  //
  // No reduced-motion guard is owed: this branch is unreachable under reduced motion, so
  // anchors stay native and instant there, which is the correct behaviour.
  lenis = new Lenis({ anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000); // gsap.ticker's time is seconds; Lenis wants milliseconds.
  });
  gsap.ticker.lagSmoothing(0);
}

/**
 * Scrolls the page to `y` along the same transport as everything else: Lenis when it runs,
 * native otherwise. The 3D ring (Phase 12) turns by moving the scroll, so focus, drag and the
 * settle all come through here and the angle has one source of truth.
 */
export function scrollToY(y: number, { immediate = false, duration }: { immediate?: boolean; duration?: number } = {}): void {
  if (typeof window === 'undefined') return;
  if (lenis) {
    // Lenis clamps to the page height it last measured, and its own observer is debounced:
    // after the document has just grown (the ring's pin) a target past the old end would stop short.
    lenis.dimensions.resize();
    lenis.scrollTo(y, { immediate, ...(duration === undefined ? {} : { duration }) });
    return;
  }
  window.scrollTo({ top: y, behavior: 'instant' });
}

/**
 * Page scroll progress, 0..1. Pulled out of `globalProgress()` as pure arithmetic so it
 * can be unit tested without a browser — everything else in this module only a browser
 * can exercise.
 */
export function progressFromScroll(
  scrollY: number,
  scrollHeight: number,
  innerHeight: number,
): number {
  const scrollableHeight = scrollHeight - innerHeight;
  // A page no taller than the viewport — nothing has loaded yet, or the content is
  // genuinely shorter than the screen — has nothing to scroll through. 0 rather than a
  // division by zero or a negative ratio.
  if (scrollableHeight <= 0) return 0;

  const raw = scrollY / scrollableHeight;
  if (!(raw > 0)) return 0; // also catches NaN
  if (raw > 1) return 1;
  return raw;
}

/** Thin wrapper reading the three values `progressFromScroll` needs off `window`/`document`. */
export function globalProgress(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  return progressFromScroll(
    window.scrollY,
    document.documentElement.scrollHeight,
    window.innerHeight,
  );
}
