/**
 * The 2D SVG renderer for the signal.
 *
 * Draws the whole canonical curve (`path.ts`) as a single `<path>` into one page-height
 * layer, and reveals it with `stroke-dashoffset`: page progress sets a page-`y` playhead
 * that stays inside the viewport, and the line is drawn down to it (see `playhead.ts`).
 * This is the fast, always-available path — the Phase 10 Three.js tube samples the same
 * curve so the two are identically choreographed rather than one approximating the other.
 *
 * One renderer, one layer, one `<path>`. It draws the whole curve into the whole box, so
 * the line is continuous by construction. Splitting the line across per-section mounts
 * would mean six independently scaled spans meeting at six seams, which is six lines
 * that look like one until a seam disagrees — and §6 asks for a continuous line.
 *
 * The curve is pinned to the page's sections: each `SECTION_SPANS` seam lands on the top of
 * the element carrying `data-signal-section="<id>"`, and the curve scales linearly between
 * them (see `anchors.ts`). A seam with no such element falls back to the whole-box linear
 * position, which is what a page with no sections — `/dev/signal` — gets throughout.
 *
 * No framework: the `<svg>` and `<path>` are built with `document.createElementNS` and
 * torn down explicitly in `destroy()`. Geometry is sampled once from `path.ts` at
 * creation time — resize only re-measures the section anchors, re-scales those points into
 * pixels and rebuilds the length table; it never re-samples the curve.
 *
 * The dim rule (see `gutter.ts`): the line is full strength only where it clears the
 * content, and `--signal-dim-alpha` everywhere else. It is one `<path>` stroked
 * with a vertical gradient whose stops carry the strength, not a mask and not two paths.
 * A CSS `mask-image` would clip the end caps the `overflow: visible` below exists to
 * save — a mask stops at the element's border box — while a gradient paint server simply
 * pads past its ends. The bands come from the same pixel points the path is drawn from.
 */

import { SECTION_SPANS, sampleSignalRange, type SignalPoint } from './path';
import { resolveSeamPixels, toPixelPath, toPixelPoints, type PixelPoint } from './anchors';
import { gutterBands, strengthStops, type GutterRegion } from './gutter';
import { cumulativeLengths, lengthAtY, playheadPageY } from './playhead';
import { publishSignalTip } from './tip';

export interface SvgSignalOptions {
  /**
   * The mount is the page-height `#signal-layer` rather than an isolated box. On by
   * default. It turns on the two behaviours that only mean anything against a page:
   *
   * - the dim rule — a page's text crosses the line, and full strength under text fails AA;
   * - the playhead reveal (`playhead.ts`) — the tip follows the viewport, and its page `y`
   *   is published through `tip.ts`.
   *
   * `/dev/signal` turns it off: its mount is a fixed box, there is no text to protect, a
   * harness drawn at 15% cannot be debugged, and its `?t=` screenshots want the plain
   * length-fraction reveal.
   */
  pageLayer?: boolean;
}

export interface SvgSignal {
  /**
   * Reveals the curve for `t`, where `t` is progress across the **whole document**,
   * 0..1 — the value `onPageProgress` reports, not a section-local one. On the page layer
   * the line is drawn down to the playhead (see `playhead.ts`); in an isolated mount, to
   * the fraction `t` of its length.
   */
  setProgress(t: number): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * How far, in px of page height, the line crossfades from dim to full strength at each
 * band edge, laid inside the band. Long enough that the sweep into the spine reads as the
 * line arriving rather than a switch, short against a spine hundreds of px tall.
 */
const BAND_FADE_PX = 32;

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

/** The first section that reserves the gutter (§7.3): above it, nothing is inside one. */
const GUTTER_FROM_SECTION = 'work';

let gradientCount = 0;

export function createSvgSignal(mount: HTMLElement, options: SvgSignalOptions = {}): SvgSignal {
  const pageLayer = options.pageLayer ?? true;

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
  // on the top edge wherever the page has no hero anchor — and a round cap is a disc
  // centred on the point, so the UA stylesheet's `svg:root { overflow: hidden }` slices
  // both of them in half. Verified by pixel: without this, paint starts abruptly at the box's
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

  // The dim rule's paint server and the probe that measures the gutter. userSpaceOnUse
  // with y1 0 and y2 the box height, so a stop's offset is simply its pixel y / height.
  const gradient = document.createElementNS(SVG_NS, 'linearGradient');
  let gutterProbe: HTMLElement | undefined;
  if (pageLayer) {
    const defs = document.createElementNS(SVG_NS, 'defs');
    const gradientId = `signal-strength-${++gradientCount}`;
    gradient.id = gradientId;
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y1', '0');
    defs.appendChild(gradient);
    svg.insertBefore(defs, path);
    path.style.stroke = `url(#${gradientId})`;

    gutterProbe = document.createElement('div');
    gutterProbe.className = 'signal-gutter-probe';
    mount.appendChild(gutterProbe);
  }

  let currentT = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  // Re-measured on every resize pass, read on every progress update. Caching them keeps
  // setProgress free of layout reads, which would otherwise force a reflow per frame.
  let pixelPoints: PixelPoint[] = [];
  let lengthTable: number[] = [];
  let docHeight = 0;
  let viewportHeight = 0;
  let boxTopInPage = 0;

  /**
   * Draws the line down to the current progress. The dash is the whole length, shifted by
   * the undrawn part — and once the line is complete, no dash at all, so the rounded `d`
   * can never leave a sliver undrawn past the table's own total.
   */
  function applyReveal(): void {
    const total = lengthTable.length > 0 ? lengthTable[lengthTable.length - 1] : 0;
    if (total <= 0) return;

    let drawn: number;
    if (pageLayer) {
      const playhead = playheadPageY(currentT, docHeight, viewportHeight) - boxTopInPage;
      drawn = lengthAtY(pixelPoints, lengthTable, playhead);
      const first = pixelPoints[0].y;
      const last = pixelPoints[pixelPoints.length - 1].y;
      publishSignalTip(boxTopInPage + Math.min(last, Math.max(first, playhead)));
    } else {
      drawn = currentT * total;
    }

    if (drawn >= total) {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      return;
    }
    path.style.strokeDasharray = String(total);
    path.style.strokeDashoffset = String(total - drawn);
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
   * The gutter in the `<svg>`'s coordinates, read off the probe so the CSS stays the one
   * definition of it. `null` when the page has no section that reserves one.
   */
  function measureGutter(gutterTop: number | null): GutterRegion | null {
    if (!gutterProbe || gutterTop === null) return null;
    const probeStyle = getComputedStyle(gutterProbe);
    const probeLeft = gutterProbe.getBoundingClientRect().left - svg.getBoundingClientRect().left;
    return {
      top: gutterTop,
      contentLeft: probeLeft + parseFloat(probeStyle.width),
      reach: parseFloat(probeStyle.paddingRight),
    };
  }

  /** Rewrites the gradient's stops: dim everywhere, full strength inside the gutter. */
  function applyStrength(
    pixelPoints: readonly PixelPoint[],
    gutter: GutterRegion | null,
    height: number,
  ): void {
    const bands = gutter ? gutterBands(pixelPoints, gutter) : [];
    gradient.setAttribute('y2', String(height));
    gradient.replaceChildren(
      ...strengthStops(bands, height, BAND_FADE_PX).map(({ offset, full }) => {
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', String(offset));
        stop.style.stopColor = 'var(--signal)';
        stop.style.stopOpacity = full ? '1' : 'var(--signal-dim-alpha)';
        return stop;
      }),
    );
  }

  /**
   * Re-measures the section anchors, re-scales the cached points into the `<svg>`'s
   * current pixel box, sets the viewBox to match, and rebuilds the cumulative length table
   * the reveal reads — the lengths change with the box even though the curve did not.
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
    const sectionTops = measureSectionTops();
    const seamPixels = resolveSeamPixels(sectionTops, height);
    pixelPoints = toPixelPoints(points, width, seamPixels);
    lengthTable = cumulativeLengths(pixelPoints);
    path.setAttribute('d', toPixelPath(pixelPoints));

    docHeight = document.documentElement.scrollHeight;
    viewportHeight = window.innerHeight;
    boxTopInPage = svg.getBoundingClientRect().top + window.scrollY;

    // Before the reduced-motion early return on purpose: dimming is contrast, not motion.
    if (pageLayer) {
      const gutterIndex = SECTION_SPANS.findIndex((span) => span.id === GUTTER_FROM_SECTION);
      applyStrength(pixelPoints, measureGutter(sectionTops[gutterIndex] ?? null), height);
    }

    if (reduceMotion) {
      // Fully drawn, permanently. No dasharray at all rather than a dasharray equal to
      // the length, so no length measurement can ever leave a sliver undrawn.
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      if (pageLayer) publishSignalTip(boxTopInPage + pixelPoints[pixelPoints.length - 1].y);
      return;
    }

    applyReveal();
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
  // The playhead also depends on the viewport's height, which can change without the
  // layer changing size at all (a browser's toolbar, a window dragged taller).
  if (pageLayer) window.addEventListener('resize', scheduleRemeasure);

  // Draw synchronously on creation rather than waiting for the observer's first
  // (asynchronous) callback, so a caller that calls setProgress() immediately after
  // construction does not race an empty path.
  measureAndDraw();

  function setProgress(t: number): void {
    if (reduceMotion) return; // stays fully drawn, does not respond to progress
    if (!Number.isFinite(t)) return; // never let NaN reach the DOM
    currentT = clamp01(t);
    applyReveal();
  }

  function destroy(): void {
    resizeObserver.disconnect();
    window.removeEventListener('resize', scheduleRemeasure);
    if (resizeTimer !== undefined) {
      clearTimeout(resizeTimer);
      resizeTimer = undefined;
    }
    svg.remove();
    gutterProbe?.remove();
  }

  return { setProgress, destroy };
}
