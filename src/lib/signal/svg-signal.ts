/**
 * The 2D SVG renderer for the signal.
 *
 * Draws the whole canonical curve (`path.ts`) as a single `<path>` into one page-height
 * layer, and reveals it by animating `stroke-dashoffset` against global page progress.
 * This is the fast, always-available path — the Phase 10 Three.js tube samples the same
 * curve so the two are identically choreographed rather than one approximating the other.
 *
 * One renderer, one layer, one `<path>`. It draws the whole curve into the whole box, so
 * the line is continuous by construction. Splitting the line
 * across per-section mounts would mean six independently scaled spans meeting at six
 * seams, which is six lines that look like one until a seam disagrees — and §6 asks for
 * a continuous line.
 *
 * The curve is pinned to the page's sections: each `SECTION_SPANS` seam lands on the top of
 * the element carrying `data-signal-section="<id>"`, and the curve scales linearly between
 * them (see `anchors.ts`). A seam with no such element falls back to the whole-box linear
 * position, which is what a page with no sections — `/dev/signal` — gets throughout.
 *
 * No framework: the `<svg>` and `<path>` are built with `document.createElementNS` and
 * torn down explicitly in `destroy()`. Geometry is sampled once from `path.ts` at
 * creation time — resize only re-measures the section anchors, re-scales those points into
 * pixels and re-measures the rendered length; it never re-samples the curve.
 */

import { SECTION_SPANS, sampleSignalRange, type SignalPoint } from './path';
import { resolveSeamPixels, toPixelPath, toPixelPoints } from './anchors';

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
 * How many intervals the whole curve is sampled at (distributed across the sections by
 * their share of `t`, so the seams are vertices — see `sampleWholeCurve`). The path is a
 * plain polyline, so this is what smoothness costs: the drawn chords deviate from the true
 * curve by an amount that grows with the box the curve is stretched into.
 *
 * Measured deviation against a 4px stroke, worst case over the whole curve. It peaks at
 * the corner where `years` hands over to `work`, just above the `work` seam:
 *
 *   box                              n=240    n=320    n=480
 *   1440 x 8568, pinned to sections  2.49px   1.45px   0.66px   ← the real page, Task 6.1
 *   2560 x 8708, pinned to sections  4.35px   2.56px   1.17px   ← a wide desktop
 *   375 x 9392, pinned to sections   0.66px   0.38px   0.18px   ← phone
 *   2560 x 14000, whole-box linear   4.41px   2.57px   1.17px   ← the old stress case
 *
 * Pinning the curve to the sections (Task 6.1) stretches some spans more than the old
 * whole-document mapping did, but on the real page the worst corner sits in spans that are
 * stretched about as much as before, so the figures barely moved (1440: 0.69 → 0.66).
 * 240 was set in Task 2.2 against a 1000x480 mount and no longer holds: at the page
 * scale it is two thirds of the stroke width. 480 keeps the worst case under a third of
 * the stroke out past a 2560px-wide window. Deviation falls roughly as 1/n², so raising
 * this further buys very little. Re-measure if a section's height changes a lot: a span
 * squeezed or stretched far past these proportions moves the worst case.
 */
const CURVE_SAMPLE_DENSITY = 480;

/**
 * Samples the whole curve at roughly `CURVE_SAMPLE_DENSITY` intervals, span by span, so
 * every seam is a vertex of the drawn polyline. The seams are where the curve is pinned to
 * the page, so they are exactly where a chord cutting a corner would show.
 */
function sampleWholeCurve(): SignalPoint[] {
  const points: SignalPoint[] = [];
  for (const span of SECTION_SPANS) {
    const intervals = Math.max(1, Math.round(CURVE_SAMPLE_DENSITY * (span.tEnd - span.tStart)));
    const spanPoints = sampleSignalRange(span.tStart, span.tEnd, intervals + 1);
    // Each span starts on the previous span's last point; keep one copy of the seam.
    points.push(...(points.length === 0 ? spanPoints : spanPoints.slice(1)));
  }
  return points;
}

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
  // resize never re-samples the curve — it only re-scales these same points.
  const points = sampleWholeCurve();

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = '100%';
  // The curve's last point always lands exactly on this box's bottom edge, and its first
  // lands on the top edge wherever the page has no hero anchor — and a round cap is a disc centred on
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
   * The top of each section's anchor element, in the `<svg>`'s own coordinates, or `null`
   * where the page has none. Both rects are viewport-relative, so the difference does not
   * depend on the scroll position.
   */
  function measureSectionTops(): (number | null)[] {
    const boxTop = svg.getBoundingClientRect().top;
    return SECTION_SPANS.map((span) => {
      const anchor = document.querySelector(`[data-signal-section="${span.id}"]`);
      return anchor ? anchor.getBoundingClientRect().top - boxTop : null;
    });
  }

  /**
   * Re-measures the section anchors, re-scales the cached points into the `<svg>`'s
   * current pixel box, sets the viewBox to match, and re-measures `getTotalLength()` — the
   * length changes with the box even though the underlying curve did not.
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
    const seamPixels = resolveSeamPixels(measureSectionTops(), height);
    const pixelPoints = toPixelPoints(points, width, seamPixels);
    path.setAttribute('d', toPixelPath(pixelPoints));

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
