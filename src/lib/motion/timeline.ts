/**
 * Scroll registration on top of the shared scroll driver (`scroll.ts`).
 *
 * This module is the only place in the codebase allowed to create a `ScrollTrigger` —
 * callers describe *what* moves, this module owns *how* it is wired to scroll. One
 * trigger per registration is correct and is not a violation of "no section uses its own
 * ScrollTrigger": the rule is about ownership, not count. A caller never imports
 * `ScrollTrigger` itself.
 *
 * Two registrations, one contract. `onSection` reports progress across one element's own
 * span; `onPageProgress` reports it across the whole document. Everything else about them
 * is identical, including the reduced-motion behaviour below.
 *
 * Under `prefers-reduced-motion`, no trigger is created at all: `fn` fires once,
 * synchronously, at its end state (progress 1), and the returned unsubscribe is a
 * no-op — there is nothing to tear down.
 *
 * SSR safety: both only ever run from a browser-side call site, but the module still
 * touches no DOM/BOM state at module scope, matching every other module in this layer.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SectionId } from '../signal/path';
import { reducedMotion } from './scroll';

let pluginRegistered = false;

/** `gsap.registerPlugin` is idempotent internally, but there is no reason to repeat it. */
function ensurePluginRegistered(): void {
  if (pluginRegistered) return;
  pluginRegistered = true;
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Registrations seen per scope, so multiple elements sharing a `SectionId` (the Ring's
 * five cards, all `id: 'ring'`) get distinct trigger ids instead of colliding. GSAP's
 * registry is last-write-wins on a duplicate id, and `kill()` deletes its registry entry
 * unconditionally — with a shared id, killing one trigger silently unregisters a sibling
 * that is still alive. The suffix keeps the label readable in devtools while making each
 * one unique.
 *
 * `'page'` shares the counter for exactly the same reason: a second page-progress
 * registration after a view transition must not be able to kill the first one's entry.
 */
type TriggerScope = SectionId | 'page';

const registrationsPerScope = new Map<TriggerScope, number>();

function nextTriggerId(scope: TriggerScope): string {
  const count = (registrationsPerScope.get(scope) ?? 0) + 1;
  registrationsPerScope.set(scope, count);
  return `${scope}-${count}`;
}

/**
 * Registers `fn` to receive a section's local scroll progress (0..1 across `el`'s own
 * span, from entering the viewport at the bottom to leaving it at the top) as the page
 * scrolls. Returns an unsubscribe that kills the underlying trigger.
 */
export function onSection(
  id: SectionId,
  el: HTMLElement,
  fn: (local: number) => void,
): () => void {
  if (reducedMotion()) {
    fn(1); // End state immediately: no animation, no trigger to leak.
    return () => {};
  }

  ensurePluginRegistered();

  const trigger = ScrollTrigger.create({
    id: nextTriggerId(id),
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => fn(self.progress),
  });

  // Kills the trigger rather than merely dropping the callback — six sections
  // registering and unregistering across view transitions would otherwise leak one
  // ScrollTrigger apiece every time the page navigates.
  return () => trigger.kill();
}

/**
 * Registers `fn` to receive progress across the whole document (0..1, from the page at
 * the top of the scroll to the page at the bottom of it) as the page scrolls. Returns an
 * unsubscribe that kills the underlying trigger.
 *
 * The sibling of `onSection` for anything spanning the page rather than one section —
 * the signal layer, above all. Driven by a `ScrollTrigger` rather than by polling
 * `globalProgress()` on the ticker: that reads `window.scrollY`, which is accurate under
 * Lenis, but it is a second scroll pathway running alongside `ScrollTrigger` and it would
 * drift from anything a later phase pins.
 */
export function onPageProgress(fn: (t: number) => void): () => void {
  if (reducedMotion()) {
    fn(1); // End state immediately: no animation, no trigger to leak.
    return () => {};
  }

  ensurePluginRegistered();

  const trigger = ScrollTrigger.create({
    id: nextTriggerId('page'),
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => fn(self.progress),
  });

  return () => trigger.kill();
}

/**
 * Re-measures every trigger after the document changed height without a resize — the 3D
 * ring adding or removing its pin (Phase 12). ScrollTrigger only refreshes on its own events.
 */
export function refreshScroll(): void {
  ensurePluginRegistered();
  ScrollTrigger.refresh();
}

/**
 * Calls `fn` with the frame's elapsed milliseconds on every tick of the one GSAP ticker that
 * drives Lenis and ScrollTrigger (Phase 13: the audio's scroll-speed sampling). Returns the
 * unsubscribe. Exported here, not imported from `gsap` by callers, so GSAP has one importer
 * and stays in one shared chunk.
 */
export function onTick(fn: (deltaMs: number) => void): () => void {
  const tick = (_time: number, deltaMs: number): void => fn(deltaMs);
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}
