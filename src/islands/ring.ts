/**
 * Section 04's behaviour. The rail works with JS off — it is server-rendered cards in a
 * native scroll-snap scroller, with the split drawn in full — so this adds three things:
 *
 * 1. **The split draws from the tip.** When the signal's drawn tip passes the track, the
 *    track draws outward from the point where the curve meets it to both ends, then the
 *    drops draw down to their cards and each emission arrives. The clock is tip travel, as
 *    for section 03's branches (`draw.ts`), never a timer.
 * 2. **Arrow keys** move focus between the cards' primary links. A shortcut, not a
 *    roving-tabindex trap: every link stays in the Tab order. Focus, by any key, also
 *    snaps a partly hidden card fully into the rail (`mountFocusSnap`).
 * 3. **Re-measuring** on the renderer's re-measure and on the same debounced resize
 *    (`follow.ts`, shared with section 05).
 *
 * The meeting point is read off the curve (`signalXAtPageY`) at the track's centre line,
 * which is where the renderer pins the curve's split point. This never assumes the centre
 * of the viewport, never samples the curve and never measures a section anchor.
 *
 * Renders no content, and draws with `transform` only (`scaleX` on the track's halves,
 * `scaleY` on the drops, `scale` on the emissions).
 */

import { easeEmission, easeLine, tipFraction, unit } from '../lib/signal/draw';
import { followSignal, prefersReducedMotion } from '../lib/signal/follow';
import { announceEmission, hasArrived } from '../lib/signal/emissions';
import { signalXAtPageY } from '../lib/signal/tip';

/**
 * How far the tip travels past the track while the split draws, in px of page height.
 * `--s-10` on the spacing ramp: a little longer than a work branch's 96px, because this
 * is two moves — the track, then the drops.
 */
const SPLIT_DRAW_PX = 128;

/** The share of that travel the track takes; the drops take the rest. */
const TRACK_SHARE = 0.6;

/** Where in the drops' own progress the emissions arrive. */
const EMISSION_FROM = 0.5;

export function mountRing(): void {
  const section = document.querySelector<HTMLElement>('[data-ring]');
  if (!section) return;

  const track = section.querySelector<HTMLElement>('[data-signal-split]');
  const left = track?.querySelector<HTMLElement>('[data-track-half="left"]');
  const right = track?.querySelector<HTMLElement>('[data-track-half="right"]');
  const drops = Array.from(section.querySelectorAll<HTMLElement>('[data-drop]'));
  const emits = Array.from(section.querySelectorAll<HTMLElement>('[data-emit]'));
  const links = Array.from(section.querySelectorAll<HTMLAnchorElement>('[data-card-link]'));

  mountArrowKeys(section, links);
  const scroller = section.querySelector<HTMLElement>('.ring__scroller');
  if (scroller) mountFocusSnap(scroller);

  if (!track || !left || !right) return;
  const reduce = prefersReducedMotion();

  // ── The meeting point ─────────────────────────────────────────────────────────────

  /** The track's centre line, page `y`; `null` until measured. */
  let trackY: number | null = null;

  /**
   * Where the curve meets the track, from the curve itself. Until the renderer has
   * measured, the halves keep meeting mid-track — the server-drawn state.
   */
  function measure(): void {
    const rect = track!.getBoundingClientRect();
    trackY = rect.top + window.scrollY + rect.height / 2;
    const curveX = signalXAtPageY(trackY);
    if (curveX === null) return;
    const meet = Math.min(rect.width, Math.max(0, curveX - (rect.left + window.scrollX)));
    track!.style.setProperty('--split-x', `${meet.toFixed(2)}px`);
  }

  // ── The draw ──────────────────────────────────────────────────────────────────────

  let painted = -1;

  /** Draws the split to linear progress `p`, 0..1; at 1 the inline styles are cleared. */
  function paint(p: number): void {
    // In the 3D ring (Phase 12) lib/ring/stage.ts owns the emissions, and the track and drops are hidden.
    if (section!.classList.contains('ring--3d')) return;
    if (p === painted) return;
    // The drops land together, so the 2D split is one note.
    if (hasArrived(painted, p)) announceEmission('ring', 0);
    painted = p;
    const done = p >= 1;
    const trackDrawn = easeLine(p / TRACK_SHARE);
    const dropProgress = unit((p - TRACK_SHARE) / (1 - TRACK_SHARE));
    const dropDrawn = easeLine(dropProgress);
    const emitScale = Math.max(0, easeEmission((dropProgress - EMISSION_FROM) / (1 - EMISSION_FROM)));

    left!.style.transform = done ? '' : `scaleX(${trackDrawn})`;
    right!.style.transform = done ? '' : `scaleX(${trackDrawn})`;
    for (const drop of drops) drop.style.transform = done ? '' : `scaleY(${dropDrawn})`;
    for (const emit of emits) emit.style.transform = done ? '' : `scale(${emitScale})`;
  }

  function paintFromTip(tipY: number | null): void {
    if (trackY === null) return;
    paint(tipFraction(tipY, trackY, SPLIT_DRAW_PX));
  }

  // Reduced motion: the split stays exactly as the server drew it. Otherwise the first
  // tip the renderer publishes moves it back to undrawn (the section is far below the
  // fold on load) and every later one scrubs it (`followSignal`).
  followSignal({ measure, paint: paintFromTip }, reduce);
}

/**
 * Left and Right move focus to the previous and next card's primary link, Home and End to
 * the first and last. Focusing a link scrolls it into view natively and the scroll-snap
 * settles it. At either end the key does nothing, rather than wrapping: a rail has ends.
 */
function mountArrowKeys(section: HTMLElement, links: HTMLAnchorElement[]): void {
  section.addEventListener('keydown', (event) => {
    const hasModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (hasModifier) return;
    const current = links.indexOf(event.target as HTMLAnchorElement);
    if (current < 0) return;

    const last = links.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        next = current - 1;
        break;
      case 'ArrowRight':
        next = current + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    // Consumed even at an end, so the key never falls through to scrolling the rail or
    // the page out from under the focused card.
    event.preventDefault();
    if (next < 0 || next > last || next === current) return;
    links[next].focus();
  });
}

/**
 * Brings a focused card fully into the rail. Native focus scrolling alone does not: it
 * scrolls a partly visible card just far enough (57px at 1440), and the mandatory snap
 * then settles on the nearest snap position — the one it came from — leaving the card,
 * and its focus ring, clipped at the rail's edge. Scrolling the card to its own snap
 * position instead is a position the snap keeps. Instant, like the native focus scroll.
 */
function mountFocusSnap(scroller: HTMLElement): void {
  scroller.addEventListener('focusin', (event) => {
    // In the 3D ring (Phase 12) focus turns the ring through the scroll instead.
    if (scroller.closest('.ring--3d')) return;
    const card = (event.target as Element).closest<HTMLElement>('.card');
    if (!card) return;
    const view = scroller.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const snapLeft = view.left + parseFloat(getComputedStyle(scroller).scrollPaddingLeft);
    const isFullyVisible = box.left >= snapLeft - 0.5 && box.right <= view.right + 0.5;
    if (isFullyVisible) return;
    scroller.scrollLeft += box.left - snapLeft;
  });
}
