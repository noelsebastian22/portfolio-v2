/**
 * The wiring every island that draws off the signal repeats: measure where its marks sit
 * against the drawn curve, paint them from the tip, and re-measure when the curve or the
 * viewport changes. Section 04's split (`ring.ts`) and section 05's nodes (`stack.ts`)
 * both follow it; section 03's `work.ts` predates it and also re-measures its diagrams on
 * resize, so it keeps its own.
 *
 * - **Measure** runs now, whenever the renderer re-measures the curve (`onSignalCurve`),
 *   and after a resize settles on the renderer's own beat (`RESIZE_DEBOUNCE_MS`).
 * - **Paint** runs on every tip move, and after every measure with the current tip.
 *
 * Under reduced motion only the measure runs: whatever the island draws stays exactly as
 * the server drew it, and nothing follows the tip.
 */

import { RESIZE_DEBOUNCE_MS } from './draw';
import { onSignalCurve, onSignalTip, signalTipY } from './tip';

export interface SignalFollower {
  /** Reads the layout and the curve (`signalXAtPageY`). Called with no tip. */
  measure: () => void;
  /** Paints from the tip's page `y`; `null` means the renderer has not drawn yet. */
  paint: (tipY: number | null) => void;
}

/**
 * A local `matchMedia` rather than `reducedMotion()` from `../motion/scroll`: that module
 * imports gsap and lenis at module scope, and importing it from an island split the motion
 * layer's chunk in two (Task 7.2, +163 gzip). The renderer makes the same choice.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function followSignal({ measure, paint }: SignalFollower, reduce: boolean): void {
  const remeasure = (): void => {
    measure();
    if (!reduce) paint(signalTipY());
  };

  measure();
  onSignalCurve(remeasure);

  // Nothing moves off the server state until the renderer publishes its first tip. With
  // no renderer at all, none ever arrives, and the marks stay drawn rather than stranded.
  if (!reduce) onSignalTip(paint);

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = undefined;
      remeasure();
    }, RESIZE_DEBOUNCE_MS);
  });
}
