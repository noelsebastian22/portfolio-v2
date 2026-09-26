/**
 * Section 05's behaviour. The chain reads completely with JS off — every word is in the
 * HTML, and each node sits lit at the start of its rule — so this adds two things:
 *
 * 1. **The nodes land on the curve.** Each row's rule is a hairline at a `y` fixed by
 *    layout; the node moves along it to wherever the drawn curve crosses that `y`
 *    (`signalXAtPageY`). `transform` only, re-placed whenever the renderer re-measures and
 *    after a resize settles (`follow.ts`). Where the lookup has no answer, the node keeps
 *    its server position.
 * 2. **Each node lights as the tip passes its rule.** Before the tip arrives the node is
 *    an outline and the row's identifier is `--type-dim`; over `NODE_FILL_PX` of tip
 *    travel the fill arrives (the emission easing, so it lands with a slight overshoot)
 *    and the identifier comes up to `--type`. The clock is tip travel, never a timer.
 *
 * Under reduced motion the nodes are still placed on the curve — that is position, not
 * motion — but every node stays lit as served and nothing follows the tip.
 *
 * Renders no content.
 */

import { easeEmission, easeLine, tipFraction } from '../lib/signal/draw';
import { followSignal, prefersReducedMotion } from '../lib/signal/follow';
import { signalXAtPageY } from '../lib/signal/tip';

/**
 * How far the tip travels past a rule while its node lights, in px of page height.
 * `--s-8` on the spacing ramp: short enough that the node is lit before the tip reaches
 * the row's items, long enough to read as the line arriving and the node responding.
 */
const NODE_FILL_PX = 64;

interface Operator {
  row: HTMLElement;
  rule: HTMLElement;
  node: HTMLElement;
  fill: HTMLElement;
  /** The rule's centre line, page `y`; `null` until measured. */
  ruleY: number | null;
  /** Last painted linear progress; -1 forces the next paint. */
  painted: number;
}

export function mountStack(): void {
  const section = document.querySelector<HTMLElement>('[data-stack]');
  if (!section) return;

  const operators: Operator[] = [];
  for (const row of section.querySelectorAll<HTMLElement>('[data-op]')) {
    const rule = row.querySelector<HTMLElement>('[data-op-rule]');
    const node = rule?.querySelector<HTMLElement>('[data-op-node]');
    const fill = node?.querySelector<HTMLElement>('[data-op-fill]');
    if (rule && node && fill) operators.push({ row, rule, node, fill, ruleY: null, painted: -1 });
  }
  if (operators.length === 0) return;

  const reduce = prefersReducedMotion();

  /**
   * Each node to the curve's `x` at its rule's centre line, held wholly on the rule. The
   * stack span's `x` stays well inside the content column at every width, so the hold is
   * a guard, not a layout tool.
   */
  function measure(): void {
    for (const op of operators) {
      const rect = op.rule.getBoundingClientRect();
      op.ruleY = rect.top + window.scrollY + rect.height / 2;
      op.painted = -1;
      const curveX = signalXAtPageY(op.ruleY);
      if (curveX === null) continue;
      const half = op.node.offsetWidth / 2;
      const along = curveX - (rect.left + window.scrollX);
      const onRule = Math.min(rect.width - half, Math.max(half, along));
      op.node.style.transform = `translateX(${(onRule - half).toFixed(2)}px)`;
    }
  }

  /** Lights every node to the tip; at full progress the inline state is cleared. */
  function paint(tipY: number | null): void {
    for (const op of operators) {
      if (op.ruleY === null) continue;
      const p = tipFraction(tipY, op.ruleY, NODE_FILL_PX);
      if (p === op.painted) continue;
      op.painted = p;
      if (p >= 1) {
        op.fill.style.transform = '';
        op.row.style.removeProperty('--lit');
        continue;
      }
      op.fill.style.transform = `scale(${Math.max(0, easeEmission(p)).toFixed(4)})`;
      op.row.style.setProperty('--lit', easeLine(p).toFixed(4));
    }
  }

  followSignal({ measure, paint }, reduce);
}
