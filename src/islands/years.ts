/**
 * Section 02's behaviour: emissions arriving and statistics counting, both on scroll
 * position and neither on a timer.
 *
 * One registration through `onSection()` drives both — the section's own 0..1 progress
 * is the playhead, and everything here is a window cut out of it. No ScrollTrigger is
 * created here; `src/lib/motion/timeline.ts` owns that, and under
 * `prefers-reduced-motion` it creates none at all and calls back once at progress 1, so
 * the emissions are present and the numbers final with no animation to sit through.
 *
 * This island renders nothing. Every word and every final number is in the HTML before
 * it runs; it moves what is already there.
 */

import { onSection } from '../lib/motion/timeline';
import { announceEmission } from '../lib/signal/emissions';

/** Where on the section's progress the first emission arrives, and the step between. */
const EMISSION_FIRST = 0.12;
const EMISSION_STEP = 0.055;

/**
 * The statistics start after the emissions have finished ticking past and finish while
 * the row is still comfortably on screen. Measured against the geometry rather than
 * guessed: `onSection` spans the section's height plus one viewport, so with the stats
 * row sitting near the section's end it enters the viewport at roughly 0.3 and is still
 * visible at 0.8 for any section/viewport pair in the range this page produces.
 */
const COUNT_FIRST = 0.42;
const COUNT_STEP = 0.045;
const COUNT_SPAN = 0.18;

interface Counter {
  digits: HTMLElement;
  target: number;
  painted: string;
}

/** Ease-out, so a statistic decelerates into its final value instead of stopping dead. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** `local` mapped onto one statistic's own window, clamped to 0..1 outside it. */
function windowProgress(local: number, start: number, span: number): number {
  if (local <= start) return 0;
  if (local >= start + span) return 1;
  return (local - start) / span;
}

export function mountYears(): void {
  const section = document.querySelector<HTMLElement>('[data-years]');
  if (!section) return;

  const emissions = Array.from(section.querySelectorAll<HTMLElement>('[data-emission]'));

  const counters: Counter[] = Array.from(section.querySelectorAll<HTMLElement>('[data-count-to]'))
    .map((digits) => ({ digits, target: Number(digits.dataset.countTo), painted: digits.textContent ?? '' }))
    .filter((counter) => Number.isFinite(counter.target));

  // Hands the stylesheet its from-states. Set before registering, not after: under
  // reduced motion `onSection` calls back synchronously at progress 1, so the
  // un-arrived state is established and resolved inside this same task and never
  // reaches a frame.
  section.dataset.motion = '';

  // Nine Years toggles a class rather than painting a progress, so it keeps its own
  // previous state. The first callback only records it: a load mid-page, or reduced
  // motion's synchronous call at progress 1, must not announce every emission at once.
  const isArrived = emissions.map(() => false);
  let hasRecordedState = false;

  onSection('years', section, (local) => {
    emissions.forEach((emission, index) => {
      const arrivedNow = local >= EMISSION_FIRST + index * EMISSION_STEP;
      emission.classList.toggle('is-arrived', arrivedNow);
      if (hasRecordedState && arrivedNow && !isArrived[index]) announceEmission('years', index);
      isArrived[index] = arrivedNow;
    });
    hasRecordedState = true;

    counters.forEach((counter, index) => {
      const eased = easeOutCubic(windowProgress(local, COUNT_FIRST + index * COUNT_STEP, COUNT_SPAN));
      const next = String(Math.round(counter.target * eased));
      // Only the digits ever change, and only when they actually differ: a scroll tick
      // that lands on the same number should not touch the DOM at all. The element is
      // `aria-hidden` and its accessible twin is never written to, which is the whole
      // point — spec §13.
      if (next === counter.painted) return;
      counter.painted = next;
      counter.digits.textContent = next;
    });
  });
}
