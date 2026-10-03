/**
 * The WebGL capability gate (spec §12) — whether this visit gets the Phase 10 tube.
 *
 * In the base bundle, so it has to stay small: the decision is pure (`checkCapability`, given
 * an `Environment`), and the DOM is read in one place (`readEnvironment`). Three.js is never
 * imported here; `BaseLayout` only reaches for `import('./scene')` when this says yes.
 *
 * The checks run cheapest first, and WebGL2 last, because testing for it creates a context.
 */

export type SignalMode = '2d' | 'tube' | null;

export interface Environment {
  reducedMotion: boolean;
  viewportWidth: number;
  saveData: boolean;
  hardwareConcurrency: number;
  /** Only the home page has the hero the line begins below; `/websites` and `/404` do not. */
  hasHero: boolean;
  /** The tube already handed back to 2D once this session (see `rememberFallback`). */
  fallbackRemembered: boolean;
  /** Lazy, because it creates a WebGL context. */
  webgl2: () => boolean;
}

export interface Capability {
  enabled: boolean;
  reason?: string;
  skipProbe: boolean;
}

export const MIN_VIEWPORT_WIDTH = 900;
export const MIN_CORES = 4;
export const FALLBACK_KEY = 'signal-tube-fallback';

/** `?signal=2d` forces the flat line, `?signal=tube` forces the tube — for checks and demos. */
export function forcedMode(search: string): SignalMode {
  const value = new URLSearchParams(search).get('signal');
  return value === '2d' || value === 'tube' ? value : null;
}

const off = (reason: string): Capability => ({ enabled: false, reason, skipProbe: false });

export function checkCapability(env: Environment, mode: SignalMode): Capability {
  if (mode === '2d') return off('forced-2d');
  if (!env.hasHero) return off('no-hero');

  // A forced tube is for demos and checks: it skips the static checks and the frame probe,
  // but a browser without WebGL2 still cannot draw it.
  const isForced = mode === 'tube';
  if (!isForced) {
    if (env.reducedMotion) return off('reduced-motion');
    if (env.viewportWidth < MIN_VIEWPORT_WIDTH) return off('narrow-viewport');
    if (env.saveData) return off('save-data');
    if (env.hardwareConcurrency < MIN_CORES) return off('few-cores');
    if (env.fallbackRemembered) return off('fell-back-this-session');
  }
  if (!env.webgl2()) return off('no-webgl2');
  return { enabled: true, skipProbe: isForced };
}

function hasWebGL2(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    if (!context) return false;
    // Hand the context straight back; the scene makes its own.
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function readFallbackFlag(): boolean {
  try {
    return sessionStorage.getItem(FALLBACK_KEY) === '1';
  } catch {
    return false;
  }
}

export function readEnvironment(): Environment {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    viewportWidth: document.documentElement.clientWidth,
    saveData: connection?.saveData === true,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
    hasHero: document.querySelector('[data-signal-section="hero"]') !== null,
    fallbackRemembered: readFallbackFlag(),
    webgl2: hasWebGL2,
  };
}

/** One-way per visit: a reload in this tab does not retry a tube that just failed. */
export function rememberFallback(): void {
  try {
    sessionStorage.setItem(FALLBACK_KEY, '1');
  } catch {
    // Private mode or blocked storage: the fallback still happens, it just is not remembered.
  }
}
