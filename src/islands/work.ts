/**
 * Section 03's behaviour: each card's diagram resolving on scroll, and each card's branch
 * drawing off the signal as the line reaches it. Neither runs on a timer.
 *
 * Two clocks, on purpose, because they follow different things:
 *
 * - **The diagram follows its card.** One `onSection('work', card, …)` registration per
 *   card; the card's own progress is cut down to the stretch where its figure crosses the
 *   middle of the viewport, so the chart resolves while it can be seen.
 * - **The branch follows the line.** It starts drawing when the signal's drawn tip
 *   (`onSignalTip`) passes the branch's origin height, and is fully drawn
 *   `BRANCH_DRAW_PX` further down. The line visibly reaches the card and then branches,
 *   rather than each branch running on a clock of its own.
 *
 * The branch starts exactly on the drawn curve: its origin `x` is `signalXAtPageY`, which
 * the renderer publishes from the same pixel points it draws (`tip.ts`). This island never
 * samples the curve or measures a section anchor itself. The branch is its own small path;
 * it is not part of the curve and never redefines it.
 *
 * Renders no content. Every word and every final diagram state is in the HTML; this moves
 * the diagrams back to their start on mount and scrubs them forward. The branch `<svg>` is
 * server-rendered empty and decorative — this only gives it a position and a `d`.
 */

import { onSection } from '../lib/motion/timeline';
import { reducedMotion } from '../lib/motion/scroll';
import { onSignalCurve, onSignalTip, signalTipY, signalXAtPageY } from '../lib/signal/tip';
import {
  bundleFrame,
  deployFrame,
  easeEmission,
  easeLine,
  repoSegments,
  unit,
} from '../lib/diagrams/figure';
import type { CaseStudyDiagram } from '../lib/diagrams/types';

/**
 * How far the tip travels past a branch's origin while the branch draws, in px of page
 * height. `--s-9` on the spacing ramp: long enough to read as the line turning into the
 * card, short enough that the branch is complete well before the card's text is reached.
 */
const BRANCH_DRAW_PX = 96;

/**
 * The stretch of the viewport a figure's centre crosses while its diagram resolves, as
 * fractions of the viewport height from the top: it starts as the figure comes up past
 * 90% and is resolved by the time it reaches 45%, a little above the middle.
 */
const RESOLVE_FROM = 0.9;
const RESOLVE_TO = 0.45;

/** Where in the diagram's own progress its emission arrives. */
const EMISSION_FROM = 0.75;

/** Same debounce as the signal layer's re-measure (`svg-signal.ts`). */
const RESIZE_DEBOUNCE_MS = 150;

interface Branch {
  svg: SVGSVGElement;
  path: SVGPathElement;
  anchor: HTMLElement;
  /** Page `y` the branch starts at; `null` while it has nowhere honest to start from. */
  originY: number | null;
  length: number;
  painted: number;
}

interface Figure {
  card: HTMLElement;
  figure: HTMLElement;
  diagram: CaseStudyDiagram;
  /** Figure centre, px below the card's top. */
  centreOffset: number;
  cardHeight: number;
  local: number;
  painted: number;
}

function numberAttr(el: Element, name: string, value: number): void {
  el.setAttribute(name, String(value));
}

/** The signal's stroke weight, read from CSS so tokens.css stays its one definition. */
function signalStroke(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--signal-stroke'));
}

/**
 * The line's reach toward content — half the stroke plus the clearance — read from CSS,
 * the same quantity the renderer's gutter probe measures for the dim rule.
 */
function signalReach(): number {
  const root = getComputedStyle(document.documentElement);
  return signalStroke() / 2 + parseFloat(root.getPropertyValue('--signal-clearance'));
}

/** Moves a diagram to its state at linear progress `p`, 0..1. */
function paintDiagram(fig: Figure, p: number): void {
  const eased = easeLine(p);
  const svg = fig.figure;

  const emit = svg.querySelector<SVGElement>('[data-part="emit"]');
  if (emit) {
    const scale = p >= 1 ? 1 : easeEmission((p - EMISSION_FROM) / (1 - EMISSION_FROM));
    emit.style.transform = p >= 1 ? '' : `scale(${Math.max(0, scale)})`;
  }

  const diagram = fig.diagram;
  switch (diagram.kind) {
    case 'bundle': {
      const frame = bundleFrame(diagram, eased);
      const bar = svg.querySelector('[data-part="bar"]');
      const label = svg.querySelector('[data-part="bar-label"]');
      if (bar) numberAttr(bar, 'width', frame.width);
      if (label) {
        numberAttr(label, 'x', frame.endX);
        label.textContent = frame.label;
      }
      break;
    }
    case 'repos': {
      const segments = repoSegments(diagram, eased);
      svg.querySelectorAll('[data-part="repo"]').forEach((line, i) => {
        const segment = segments[i];
        if (!segment) return;
        numberAttr(line, 'x2', segment.x2);
        numberAttr(line, 'y2', segment.y2);
      });
      const frame = deployFrame(diagram, eased);
      const bar = svg.querySelector('[data-part="bar"]');
      const label = svg.querySelector('[data-part="bar-label"]');
      if (bar) numberAttr(bar, 'width', frame.width);
      if (label) {
        numberAttr(label, 'x', frame.endX);
        label.textContent = frame.label;
      }
      break;
    }
    case 'frametime': {
      // `pathLength="1"` on the trace, so the dash is in fractions of its length.
      const trace = svg.querySelector<SVGElement>('[data-part="trace"]');
      if (trace) {
        trace.style.strokeDasharray = p >= 1 ? '' : '1';
        trace.style.strokeDashoffset = p >= 1 ? '' : String(1 - eased);
      }
      break;
    }
    case 'scatter': {
      const coarse = svg.querySelector('[data-part="coarse"]');
      const fine = svg.querySelector('[data-part="fine"]');
      if (coarse) numberAttr(coarse, 'opacity', Number((1 - eased).toFixed(3)));
      if (fine) numberAttr(fine, 'opacity', Number(eased.toFixed(3)));
      break;
    }
  }
}

export function mountWork(): void {
  const section = document.querySelector<HTMLElement>('[data-work]');
  if (!section) return;

  const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-study]'));
  const reduce = reducedMotion();

  const figures: Figure[] = [];
  const branches: Branch[] = [];

  for (const card of cards) {
    const figure = card.querySelector<HTMLElement>('[data-figure]');
    const raw = figure?.dataset.diagram;
    if (figure && raw) {
      try {
        const diagram = JSON.parse(raw) as CaseStudyDiagram;
        figures.push({ card, figure, diagram, centreOffset: 0, cardHeight: 0, local: 1, painted: 1 });
      } catch {
        // A figure whose data will not parse keeps its server-rendered end state.
      }
    }

    const svg = card.querySelector<SVGSVGElement>('[data-branch]');
    const path = svg?.querySelector<SVGPathElement>('[data-branch-path]');
    const anchor = card.querySelector<HTMLElement>('[data-attach]');
    if (svg && path && anchor) {
      branches.push({ svg, path, anchor, originY: null, length: 0, painted: -1 });
    }
  }

  // ── Diagrams ──────────────────────────────────────────────────────────────────────

  let viewportHeight = window.innerHeight;

  function measureFigures(): void {
    viewportHeight = window.innerHeight;
    for (const fig of figures) {
      const cardRect = fig.card.getBoundingClientRect();
      const figRect = fig.figure.getBoundingClientRect();
      fig.cardHeight = cardRect.height;
      fig.centreOffset = figRect.top - cardRect.top + figRect.height / 2;
    }
  }

  /**
   * The card's `onSection` progress, cut down to the diagram's own 0..1: `local` runs
   * from the card's top at the viewport's bottom to its bottom at the viewport's top,
   * which places the figure's centre at a known viewport `y` for any `local`.
   */
  function diagramProgress(fig: Figure): number {
    const travelled = fig.local * (fig.cardHeight + viewportHeight);
    const centreY = viewportHeight - travelled + fig.centreOffset;
    const from = RESOLVE_FROM * viewportHeight;
    const to = RESOLVE_TO * viewportHeight;
    return unit((from - centreY) / (from - to));
  }

  function updateFigure(fig: Figure): void {
    const p = diagramProgress(fig);
    if (p === fig.painted) return;
    fig.painted = p;
    paintDiagram(fig, p);
  }

  measureFigures();

  for (const fig of figures) {
    // To the start state before registering, not after: under reduced motion `onSection`
    // calls back synchronously at progress 1, so the start state is set and resolved in
    // this same task and never reaches a frame — those visitors see only the end state.
    if (!reduce) {
      fig.local = 0;
      fig.painted = 0;
      paintDiagram(fig, 0);
    }
    onSection('work', fig.card, (local) => {
      fig.local = local;
      if (reduce) {
        fig.painted = 1;
        paintDiagram(fig, 1);
        return;
      }
      updateFigure(fig);
    });
  }

  // ── Branches ──────────────────────────────────────────────────────────────────────

  function paintBranch(branch: Branch, tipY: number | null): void {
    if (branch.originY === null || branch.length <= 0) return;
    const drawn = reduce || tipY === null ? (reduce ? 1 : 0) : easeLine((tipY - branch.originY) / BRANCH_DRAW_PX);
    if (drawn === branch.painted) return;
    branch.painted = drawn;
    if (drawn >= 1) {
      branch.path.style.strokeDasharray = 'none';
      branch.path.style.strokeDashoffset = '0';
      return;
    }
    branch.path.style.strokeDasharray = String(branch.length);
    branch.path.style.strokeDashoffset = String(branch.length * (1 - drawn));
  }

  /**
   * Places each branch from the curve to the card's left edge, at the card's attachment
   * height — the centre of its index numeral. A branch exists only where the curve at that
   * height clears the content by the same margin the dim rule uses: there the line is lit
   * and the branch crosses open gutter. Anywhere else the line runs behind the content
   * (phone width, or the sweep that opens the section), and a branch would have to run
   * backwards through the card to reach it.
   */
  function measureBranches(): void {
    const reach = signalReach();
    for (const branch of branches) {
      const card = branch.svg.parentElement;
      if (!card) continue;
      const anchorRect = branch.anchor.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const originY = anchorRect.top + window.scrollY + anchorRect.height / 2;
      const cardLeft = cardRect.left + window.scrollX;
      const curveX = signalXAtPageY(originY);

      const clearsContent = curveX !== null && curveX + reach <= cardLeft + 0.5;
      if (!clearsContent || curveX === null) {
        branch.originY = null;
        branch.length = 0;
        branch.painted = -1;
        branch.path.removeAttribute('d');
        branch.svg.style.width = '0px';
        continue;
      }

      // The svg's own box is the origin the path is drawn in; measure it where it sits
      // with no offset, then move it so its origin lands on the curve.
      branch.svg.style.left = '0px';
      branch.svg.style.top = '0px';
      const svgRect = branch.svg.getBoundingClientRect();
      const originX = svgRect.left + window.scrollX;
      const originTop = svgRect.top + window.scrollY;
      // A zero-size outer <svg> is not rendered at all, so the box is the branch's own:
      // as long as the branch and one stroke tall, centred on the origin height. The
      // round caps overflow it, which `overflow: visible` allows.
      const length = cardLeft - curveX;
      const stroke = signalStroke();
      branch.svg.style.left = `${curveX - originX}px`;
      branch.svg.style.top = `${originY - originTop - stroke / 2}px`;
      branch.svg.style.width = `${length}px`;
      branch.svg.style.height = `${stroke}px`;

      branch.originY = originY;
      branch.length = length;
      branch.painted = -1;
      branch.path.setAttribute('d', `M0 ${stroke / 2}H${length.toFixed(2)}`);
      paintBranch(branch, signalTipY());
    }
  }

  onSignalCurve(measureBranches);
  if (!reduce) {
    onSignalTip((tipY) => {
      for (const branch of branches) paintBranch(branch, tipY);
    });
  }

  // ── Resize ────────────────────────────────────────────────────────────────────────

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = undefined;
      measureFigures();
      if (!reduce) for (const fig of figures) updateFigure(fig);
      measureBranches();
    }, RESIZE_DEBOUNCE_MS);
  });
}
