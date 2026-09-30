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
 * the element carrying `data-signal-section="<id>"`, and the curve is stretched between
 * them along a monotone cubic (see `anchors.ts`). A seam with no such element falls back to the whole-box linear
 * position, which is what a page with no sections — `/websites` — gets throughout.
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
import {
  ANCHOR_T,
  IN_SECTION_ANCHORS,
  pageCurveLookup,
  resolveAnchorPixels,
  resolveSeamPixels,
  toPixelPath,
  toPixelPoints,
  type PixelPoint,
} from './anchors';
import { gutterBands, strengthStops, type GutterRegion } from './gutter';
import { cumulativeLengths, lengthAtY, playheadPageY } from './playhead';
import { publishSignalCurve, publishSignalTip } from './tip';
// Resize re-measurement is debounced — the viewBox and total length both change. Shared
// with the section islands that follow the line, so they re-measure on the same beat.
import { RESIZE_DEBOUNCE_MS } from './draw';

export interface SvgSignal {
  /**
   * Reveals the curve for `t`, where `t` is progress across the **whole document**,
   * 0..1 — the value `onPageProgress` reports, not a section-local one. The line is
   * drawn down to the playhead (see `playhead.ts`).
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
 * Re-measured in Task 6.3, with the spine pinned to the case studies (anchors.ts), which
 * compresses the work section's sweep into its head — about 460px of page at 1440 instead
 * of ~1330px. Worst case over the whole curve at n=480, and in brackets the worst inside
 * the sweep and spine alone:
 *
 *   1024 x 11531   0.47px (0.36)      1920 x 10739   0.88px (0.59)
 *   1440 x 10340   0.66px (0.48)      2560 x 10752   1.17px (0.65)
 *   375 x 12240    0.17px
 *
 * The sharper sweep is still not the worst corner — the years → work corner is — and
 * everything stays under half the stroke, so 480 holds.
 *
 * Re-measured in Task 7.2, with the ring's split point (control point 34) pinned to the
 * rail's track as a third in-section anchor and a cut. The worst case is unchanged at
 * every width (1024 0.47px · 1440 0.66px · 1920 0.88px · 2560 1.17px · 375 0.17px), still
 * at the years → work corner; inside the ring span it is 0.34px at 1440 and 0.58px at
 * 2560. The extra cut costs no vertices: the ring span's 115 intervals split 67 + 48.
 *
 * Re-measured 2026-09-30, after the curve cleanup (a monotone cubic between anchors, a
 * straight spine, opened-up years turns), on knots measured from the built page: 1440
 * window (1425 box) 0.65 → 0.47px, the ~485px layout 0.22 → 0.17px. The years → work
 * corner is no longer the worst — the stack's first operator (control point 41) is.
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
 * every anchor — each seam and each in-section anchor — is a vertex of the drawn polyline.
 * The anchors are where the curve is pinned to the page, so they are exactly where a chord
 * cutting a corner would show.
 */
function sampleWholeCurve(): SignalPoint[] {
  // The in-section anchors (see anchors.ts) are split points exactly like the seams: the
  // work span is sampled as sweep, spine and exit, and the ring span as arc and hold.
  const cuts = [...SECTION_SPANS.map((span) => span.tStart), ...ANCHOR_T, 1].sort(
    (a, b) => a - b,
  );

  const points: SignalPoint[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [tStart, tEnd] = [cuts[i], cuts[i + 1]];
    const intervals = Math.max(1, Math.round(CURVE_SAMPLE_DENSITY * (tEnd - tStart)));
    const spanPoints = sampleSignalRange(tStart, tEnd, intervals + 1);
    // Each run starts on the previous run's last point; keep one copy of the split.
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
  // The curve's first point lands on this box's top edge wherever the page has no hero
  // anchor (`/websites`), and, on a page with no measured terminus — one that renders no
  // `[data-signal-terminus]` element — its last point lands on the box's bottom edge too —
  // a round cap is a disc centred on the point, so the UA stylesheet's `svg:root {
  // overflow: hidden }` slices it in half wherever that happens. Verified by pixel: without
  // this, paint starts or stops abruptly at the box's edge. Since Task 9.1 the real page's
  // terminus (the footer's bar) sits well inside the box, clear of the bottom edge, but the
  // rule stays: it costs nothing, and a hero-less page or one without a footer bar still
  // puts an end exactly on an edge.
  //
  // Safe because the mount is inset by half the stroke (see #signal-layer in
  // global.css): whatever overflows at either edge paints inside the document rather than
  // past its last pixel, so it cannot grow scrollHeight. The curve's horizontal extremes
  // are interior (13.0%–77.6% of the box), so nothing overflows sideways.
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

  const gutterProbe = document.createElement('div');
  gutterProbe.className = 'signal-gutter-probe';
  mount.appendChild(gutterProbe);

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

    const playhead = playheadPageY(currentT, docHeight, viewportHeight) - boxTopInPage;
    const drawn = lengthAtY(pixelPoints, lengthTable, playhead);
    const first = pixelPoints[0].y;
    const last = pixelPoints[pixelPoints.length - 1].y;
    publishSignalTip(boxTopInPage + Math.min(last, Math.max(first, playhead)));

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
   * The footer's completion bar's centre line, in the `<svg>`'s own coordinates — the
   * curve's terminus (Footer.astro). `null` on a page that renders no such element, which
   * leaves `resolveSeamPixels` to fall back to the box's bottom edge exactly as before.
   */
  function measureTerminus(): number | null {
    const bar = document.querySelector('[data-signal-terminus]');
    if (!bar) return null;
    const boxTop = svg.getBoundingClientRect().top;
    const rect = bar.getBoundingClientRect();
    return rect.top + rect.height / 2 - boxTop;
  }

  /**
   * Each in-section anchor in the `<svg>`'s coordinates — on the home page, the first case
   * study's top, the last one's bottom, and the ring track's centre line. `null` for any
   * the page does not have.
   */
  function measureInSectionAnchors(): (number | null)[] {
    const boxTop = svg.getBoundingClientRect().top;
    return IN_SECTION_ANCHORS.map(({ selector, edge }) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const y = edge === 'top' ? rect.top : edge === 'bottom' ? rect.bottom : rect.top + rect.height / 2;
      return y - boxTop;
    });
  }

  /**
   * The gutter in the `<svg>`'s coordinates, read off the probe so the CSS stays the one
   * definition of it. `null` when the page has no section that reserves one.
   */
  function measureGutter(gutterTop: number | null): GutterRegion | null {
    if (gutterTop === null) return null;
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
    const seamPixels = resolveSeamPixels(sectionTops, height, measureTerminus());
    const anchorPixels = resolveAnchorPixels(measureInSectionAnchors(), seamPixels);
    pixelPoints = toPixelPoints(points, width, seamPixels, anchorPixels);
    lengthTable = cumulativeLengths(pixelPoints);
    path.setAttribute('d', toPixelPath(pixelPoints));

    docHeight = document.documentElement.scrollHeight;
    viewportHeight = window.innerHeight;
    const boxRect = svg.getBoundingClientRect();
    boxTopInPage = boxRect.top + window.scrollY;

    // The curve's page x at a page y, for the work section's branches (tip.ts). Published
    // on every re-measure, after the points it reads are final, so a listener that asks
    // straight away gets the line as it is now drawn.
    publishSignalCurve(pageCurveLookup(pixelPoints, boxRect.left + window.scrollX, boxTopInPage));

    // Before the reduced-motion early return on purpose: dimming is contrast, not motion.
    const gutterIndex = SECTION_SPANS.findIndex((span) => span.id === GUTTER_FROM_SECTION);
    applyStrength(pixelPoints, measureGutter(sectionTops[gutterIndex] ?? null), height);

    if (reduceMotion) {
      // Fully drawn, permanently. No dasharray at all rather than a dasharray equal to
      // the length, so no length measurement can ever leave a sliver undrawn.
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      publishSignalTip(boxTopInPage + pixelPoints[pixelPoints.length - 1].y);
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
  window.addEventListener('resize', scheduleRemeasure);

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
    gutterProbe.remove();
  }

  return { setProgress, destroy };
}
