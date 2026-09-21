import { describe, it, expect, afterEach } from 'vitest';
import { progressFromScroll, reducedMotion } from '../src/lib/motion/scroll';

describe('progressFromScroll', () => {
  it('is 0 at the top of the page', () => {
    expect(progressFromScroll(0, 2000, 800)).toBe(0);
  });

  it('is 1 at the bottom of the page', () => {
    expect(progressFromScroll(1200, 2000, 800)).toBe(1);
  });

  it('clamps below 0', () => {
    expect(progressFromScroll(-500, 2000, 800)).toBe(0);
  });

  it('clamps above 1', () => {
    expect(progressFromScroll(5000, 2000, 800)).toBe(1);
  });

  it('is 0, not NaN or Infinity, when the page is no taller than the viewport', () => {
    // The /dev/signal harness before content loads: scrollHeight === innerHeight.
    expect(progressFromScroll(0, 800, 800)).toBe(0);
    expect(progressFromScroll(100, 800, 800)).toBe(0);
  });
});

describe('reducedMotion', () => {
  const originalMatchMedia = globalThis.matchMedia;

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  function stubMatchMedia(matches: boolean): void {
    globalThis.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  it('is true when matchMedia reports the query matches', () => {
    stubMatchMedia(true);
    expect(reducedMotion()).toBe(true);
  });

  it('is false when matchMedia reports the query does not match', () => {
    stubMatchMedia(false);
    expect(reducedMotion()).toBe(false);
  });
});
