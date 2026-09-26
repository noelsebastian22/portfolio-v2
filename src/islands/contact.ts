/**
 * Section 06's line: the final emission (spec §6, "terminates in a final emission, then a
 * `|` completion bar into the footer"). The form's own behaviour is `contact-form.ts`,
 * which `/websites` will mount without any of this.
 *
 * The emission sits on a track below the section's content, at a `y` fixed by layout,
 * directly above — not on — the footer's bar (72px centre to centre, Task 9.1). As served
 * it is lit and centred, so with JS off (no line at all) the page still ends `●` then `|`,
 * close together. This adds what Section 05's nodes get (`stack.ts`):
 *
 * 1. **It lands on the curve.** The node moves along its track to the drawn curve's `x` at
 *    the track's centre line (`signalXAtPageY`). `transform` only, re-placed whenever the
 *    renderer re-measures and after a resize settles (`follow.ts`); with no answer it keeps
 *    its served position.
 * 2. **It fills as the tip reaches it**, over `EMISSION_FILL_PX` of tip travel, on the
 *    emission easing. The clock is tip travel, never a timer.
 *
 * Under reduced motion it is placed but stays lit, and nothing follows the tip.
 *
 * Renders no content.
 */

import { easeEmission, tipFraction } from '../lib/signal/draw';
import { followSignal, prefersReducedMotion } from '../lib/signal/follow';
import { signalXAtPageY } from '../lib/signal/tip';

/** Tip travel over which the emission fills — the Stack's node distance, `--s-8`. */
const EMISSION_FILL_PX = 64;

export function mountContactEmission(): void {
  const track = document.querySelector<HTMLElement>('[data-final-emission]');
  const node = track?.querySelector<HTMLElement>('[data-final-emission-node]');
  const fill = node?.querySelector<HTMLElement>('[data-final-emission-fill]');
  if (!track || !node || !fill) return;
  followEmission(track, node, fill);
}

function followEmission(track: HTMLElement, node: HTMLElement, fill: HTMLElement): void {
  let trackY: number | null = null;
  let painted = -1;

  /** The node to the curve's `x` at the track's centre line, held wholly on the track. */
  function measure(): void {
    const rect = track.getBoundingClientRect();
    trackY = rect.top + window.scrollY + rect.height / 2;
    painted = -1;
    const curveX = signalXAtPageY(trackY);
    if (curveX === null) return;
    const half = node.offsetWidth / 2;
    const along = curveX - (rect.left + window.scrollX);
    const onTrack = Math.min(rect.width - half, Math.max(half, along));
    // Served centred, so the offset is from the track's middle.
    node.style.transform = `translateX(${(onTrack - rect.width / 2).toFixed(2)}px)`;
  }

  /** Fills to the tip; at full progress the inline state is cleared back to served. */
  function paint(tipY: number | null): void {
    if (trackY === null) return;
    const p = tipFraction(tipY, trackY, EMISSION_FILL_PX);
    if (p === painted) return;
    painted = p;
    fill.style.transform = p >= 1 ? '' : `scale(${Math.max(0, easeEmission(p)).toFixed(4)})`;
  }

  followSignal({ measure, paint }, prefersReducedMotion());
}
