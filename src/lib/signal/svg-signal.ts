/**
 * The 2D SVG renderer for the signal.
 *
 * Draws the whole canonical curve (`path.ts`) as a single `<path>` into one page-height
 * layer, and reveals it by animating `stroke-dashoffset` against global page progress.
 * This is the fast, always-available path — the Phase 10 Three.js tube samples the same
 * curve so the two are identically choreographed rather than one approximating the other.
 *
 * One renderer, one layer, one `<path>`. It draws the whole curve because `toSvgPath`
 * maps whatever points it is given across the whole box it is given: hand it the whole
 * curve and the whole page and the mapping is right by construction. Splitting the line
 * across per-section mounts would mean six independently scaled spans meeting at six
 * seams, which is six lines that look like one until a seam disagrees — and §6 asks for
 * a continuous line.
 *
 * No framework: the `<svg>` and `<path>` are built with `document.createElementNS` and
 * torn down explicitly in `destroy()`. Geometry is sampled once from `path.ts` at
 * creation time — resize only re-scales those points into pixels and re-measures the
 * rendered length; it never re-samples the curve.
 */

import { sampleSignalRange, toSvgPath } from './path';

export interface SvgSignal {
  /**
   * Reveals the curve up to `t`, where `t` is progress across the **whole document**,
   * 0..1 — the value `onPageProgress` reports, not a section-local one. Passing a
   * section's own progress here draws the wrong fraction of the line.
   */
  setProgress(t: number): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Resize re-measurement is debounced — the viewBox and total length both change. */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * How many points the whole curve is sampled at. The path is a plain polyline, so this
 * is what smoothness costs: the drawn chords deviate from the true curve by an amount
 * that grows with the box the curve is stretched into.
 *
 * Measured deviation against a 4px stroke, worst case over the whole curve (it peaks at
 * t ≈ 0.30, the corner where `years` hands over to `work`):
 *
 *   box            n=240    n=320    n=480
 *   1440 x 9163    2.70px   1.54px   0.69px   ← a 1440 viewport, the real page
 *   2560 x 14000   4.81px   2.73px   1.22px   ← a wide desktop, a longer page
 *   375 x 14000    0.71px   0.40px   0.18px   ← phone; the narrow box dominates
 *
 * 240 was set in Task 2.2 against a 1000x480 mount and no longer holds: at the page
 * scale it is two thirds of the stroke width. 480 keeps the worst case under half the
 * stroke out past a 2560px-wide window, and doubles the `d` string rather than tripling
 * it. Deviation falls roughly as 1/n², so raising this further buys very little.
 */
const CURVE_SAMPLE_DENSITY = 480;

function clamp01(value: number): number {
  if (!(value > 0)) return 0; // also catches NaN
  if (value > 1) return 1;
  return value;
}

export function createSvgSignal(mount: HTMLElement): SvgSignal {
  // Deliberately not `reducedMotion()` from ../motion/scroll: that module imports gsap
  // and lenis at module scope, so importing it here would pull ~50 KB gzip into the 2D
  // fallback's own graph and couple it to the motion layer. A local matchMedia is the
  // whole of what is needed.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sampled once: this is geometry from path.ts and does not depend on pixel size, so a
  // resize never re-samples the curve — only `toSvgPath` re-scales these same points.
  const points = sampleSignalRange(0, 1, CURVE_SAMPLE_DENSITY);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = '100%';
  // `toSvgPath` maps y 0..1 onto 0..height, so the curve's first and last points land
  // exactly on this box's top and bottom edges — and a round cap is a disc centred on
  // the point, so the UA stylesheet's `svg:root { overflow: hidden }` slices both of
  // them in half. Verified by pixel: without this, paint starts abruptly at the box's
  // first row and stops abruptly at its last.
  //
  // Safe because the mount is inset by half the stroke (see #signal-layer in
  // global.css): the 2px that now overflows paints inside the document rather than past
  // its last pixel, so it cannot grow scrollHeight. The curve's horizontal extremes are
  // interior (11.5%–81.0% of the box), so nothing overflows sideways.
  svg.style.overflow = 'visible';
  svg.setAttribute('aria-hidden', 'true'); // decorative — a marble diagram, not content

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.style.stroke = 'var(--signal)';
  path.style.strokeWidth = 'var(--signal-stroke)';
  path.style.strokeLinecap = 'round';
  path.style.strokeLinejoin = 'round';

  svg.appendChild(path);
  mount.appendChild(svg);

  let currentT = 0;
  let totalLength = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  /** Writes stroke-dashoffset for the current progress at the current measured length. */
  function applyDashoffset(): void {
    if (totalLength <= 0) return;
    path.style.strokeDashoffset = String(totalLength * (1 - currentT));
  }

  /**
   * Re-scales the cached points into the `<svg>`'s current pixel box, sets the viewBox
   * to match, and re-measures `getTotalLength()` — the length changes with the box even
   * though the underlying curve did not.
   *
   * The `<svg>`'s box, not the mount's: the `<svg>` is `width: 100%`, so any padding on
   * the mount would make `mount.clientWidth` larger than the space the curve actually
   * has and silently scale it down.
   */
  function measureAndDraw(): void {
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    // Not laid out yet (zero-size mount). The next resize/observer tick retries; there is
    // nothing honest to draw into a box with no area.
    if (width <= 0 || height <= 0) return;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    path.setAttribute('d', toSvgPath(points, width, height));

    if (reduceMotion) {
      // Fully drawn, permanently. No dasharray at all rather than a dasharray equal to
      // the length — that way an imprecise getTotalLength() can never leave a sliver
      // undrawn.
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      return;
    }

    totalLength = path.getTotalLength();
    path.style.strokeDasharray = String(totalLength);
    applyDashoffset();
  }

  function scheduleRemeasure(): void {
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = undefined;
      measureAndDraw();
    }, RESIZE_DEBOUNCE_MS);
  }

  // Observes the `<svg>` for the same reason it is measured rather than the mount, and
  // over a window resize listener because a page-height layer also changes size when the
  // document does — images loading, fonts swapping, a section expanding.
  const resizeObserver = new ResizeObserver(scheduleRemeasure);
  resizeObserver.observe(svg);

  // Draw synchronously on creation rather than waiting for the observer's first
  // (asynchronous) callback, so a caller that calls setProgress() immediately after
  // construction does not race an empty path.
  measureAndDraw();

  function setProgress(t: number): void {
    if (reduceMotion) return; // stays fully drawn, does not respond to progress
    if (!Number.isFinite(t)) return; // never let NaN reach the DOM
    currentT = clamp01(t);
    applyDashoffset();
  }

  function destroy(): void {
    resizeObserver.disconnect();
    if (resizeTimer !== undefined) {
      clearTimeout(resizeTimer);
      resizeTimer = undefined;
    }
    svg.remove();
  }

  return { setProgress, destroy };
}
