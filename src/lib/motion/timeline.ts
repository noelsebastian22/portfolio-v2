/**
 * Section registration on top of the shared scroll driver (`scroll.ts`).
 *
 * `onSection` is the only place in the codebase allowed to create a `ScrollTrigger` —
 * sections describe *what* moves, this module owns *how* it is wired to scroll. One
 * trigger per registered element is correct and is not a violation of "no section uses
 * its own ScrollTrigger": the rule is about ownership, not count. A caller never imports
 * `ScrollTrigger` itself.
 *
 * Under `prefers-reduced-motion`, no trigger is created at all: `fn` fires once,
 * synchronously, at its end state (local progress 1), and the returned unsubscribe is a
 * no-op — there is nothing to tear down.
 *
 * SSR safety: `onSection` only ever runs from a browser-side call site (a section mounts
 * and calls it with a real element), but it still touches no DOM/BOM state at module
 * scope, matching every other module in this layer.
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
    id,
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
