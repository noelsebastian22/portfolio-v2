/**
 * The 2D SVG renderer for the signal.
 *
 * Draws one section's span of the canonical curve (`path.ts`) as a single `<path>` and
 * reveals it by animating `stroke-dashoffset` against `setProgress`. This is the fast,
 * always-available path — the Phase 10 Three.js tube samples the same curve so the two
 * are identically choreographed rather than one approximating the other.
 *
 * No framework: the `<svg>` and `<path>` are built with `document.createElementNS` and
 * torn down explicitly in `destroy()`. Geometry is sampled once from `path.ts` at
 * creation time — resize only re-scales those points into pixels and re-measures the
 * rendered length; it never re-samples the curve.
 */

import { SECTION_SPANS, sampleSignalRange, toSvgPath, type SectionId } from './path';

export interface SvgSignal {
  setProgress(t: number): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Resize re-measurement is debounced — the viewBox and total length both change. */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Points sampled per unit of global `t`. A section gets a share of this proportional to
 * its own span width (`sectionWidth * CURVE_SAMPLE_DENSITY`), so point density — and
 * therefore visual smoothness — stays consistent whether a section owns 8% or 24% of the
 * curve. `MIN_SAMPLES` is a floor for the very short sections.
 */
const CURVE_SAMPLE_DENSITY = 240;
const MIN_SAMPLES = 16;

function clamp01(value: number): number {
  if (!(value > 0)) return 0; // also catches NaN
  if (value > 1) return 1;
  return value;
}

export function createSvgSignal(mount: HTMLElement, section: SectionId): SvgSignal {
  const span = SECTION_SPANS.find((s) => s.id === section);
  if (!span) {
    throw new Error(`signal/svg-signal: unknown section "${section}"`);
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sampled once: this is geometry from path.ts and does not depend on pixel size, so a
  // resize never re-samples the curve — only `toSvgPath` re-scales these same points.
  const sampleCount = Math.max(
    MIN_SAMPLES,
    Math.round((span.tEnd - span.tStart) * CURVE_SAMPLE_DENSITY),
  );
  const points = sampleSignalRange(span.tStart, span.tEnd, sampleCount);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.setAttribute('aria-hidden', 'true'); // decorative — a marble diagram, not content

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.style.stroke = 'var(--signal)';
  path.style.strokeWidth = 'var(--s-1)';
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
   * Re-scales the cached points into the mount's current pixel box, sets the viewBox to
   * match, and re-measures `getTotalLength()` — the length changes with the box even
   * though the underlying curve did not.
   */
  function measureAndDraw(): void {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
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

  // ResizeObserver over a window resize listener: it also catches the mount's own box
  // changing size for reasons unrelated to the viewport (layout shifts, sidebar toggles).
  const resizeObserver = new ResizeObserver(scheduleRemeasure);
  resizeObserver.observe(mount);

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
