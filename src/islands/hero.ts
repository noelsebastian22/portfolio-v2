/**
 * Section 01's only behaviour: the numerals in the status rail's clock.
 *
 * A clock is the one timer this site is allowed. Spec §7.4 — "nothing animates on a
 * timer" — governs choreography: it is about how the page moves, and a wall-clock
 * reading is information rather than movement. So this is a plain timer, it is not
 * registered through `onSection()`, and it keeps running under
 * `prefers-reduced-motion`, where stopping it would only make the page wrong.
 *
 * Everything else in the rail is server-rendered text. This island fills numerals into
 * a slot that already holds a word of the same width, so the page reads complete with
 * JavaScript off and nothing shifts when the numerals arrive.
 *
 * `mountHeroClock()` is idempotent: nothing re-mounts it today, but a module-level stop
 * function lets a second call cancel the first one's timer and listener rather than
 * leaking one of each, so it survives a future Astro view transition re-mount for free.
 */

/** The rail's clock slot, server-rendered with its timezone on it. */
const CLOCK_SELECTOR = '[data-hero-clock]';

/** The running clock's teardown, or `null` between mounts — see the module comment. */
let stopClock: (() => void) | null = null;

export function mountHeroClock(): void {
  stopClock?.();
  stopClock = null;

  const slot = document.querySelector<HTMLElement>(CLOCK_SELECTOR);
  if (!slot) return;

  const timeZone = slot.dataset.timezone;
  if (!timeZone) return;

  let clockFormat: Intl.DateTimeFormat;
  try {
    clockFormat = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // `hourCycle` rather than `hour12: false`, which resolves to h24 in some locales
      // and prints midnight as 24:00:00. Sydney's DST comes free: the offset is the
      // zone's, looked up per call, never a constant.
      hourCycle: 'h23',
    });
  } catch {
    // An engine without this zone in its ICU data. The server-rendered word stays —
    // better than a wrong time or an empty slot.
    return;
  }

  function paint(): void {
    slot!.textContent = clockFormat.format(new Date());
  }

  let tickTimer: ReturnType<typeof setTimeout>;

  /**
   * Re-armed onto the next wall-clock second instead of `setInterval(fn, 1000)`. An
   * interval drifts against the clock it is displaying, and a drifted interval makes
   * the seconds digit visibly stall and then skip.
   */
  function scheduleTick(): void {
    tickTimer = setTimeout(() => {
      paint();
      scheduleTick();
    }, 1000 - (Date.now() % 1000));
  }

  // A backgrounded tab has its timers throttled to as little as once a minute, so the
  // first thing a returning reader would otherwise see is a stale reading presented as
  // the current one.
  function onVisibilityChange(): void {
    if (!document.hidden) paint();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  paint();
  scheduleTick();

  stopClock = () => {
    clearTimeout(tickTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
