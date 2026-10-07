import { describe, it, expect, vi } from 'vitest';
import { announceEmission, hasArrived, onEmission } from '../src/lib/signal/emissions';

describe('the emissions bus', () => {
  it('delivers an announcement to every subscriber', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onEmission(a);
    const offB = onEmission(b);
    announceEmission('stack', 2);
    expect(a).toHaveBeenCalledWith({ section: 'stack', index: 2 });
    expect(b).toHaveBeenCalledWith({ section: 'stack', index: 2 });
    offA();
    offB();
  });

  it('stops delivering once unsubscribed', () => {
    const fn = vi.fn();
    const off = onEmission(fn);
    off();
    announceEmission('years', 0);
    expect(fn).not.toHaveBeenCalled();
  });

  it('is a no-op with no subscriber', () => {
    expect(() => announceEmission('contact', 0)).not.toThrow();
  });
});

describe('hasArrived — down only, and only from a painted state (spec D2)', () => {
  it('is true when a painted, not-arrived progress reaches 1', () => {
    expect(hasArrived(0, 1)).toBe(true);
    expect(hasArrived(0.97, 1)).toBe(true);
  });

  it('is false from the unmeasured sentinel — a reload or re-measure mid-page', () => {
    expect(hasArrived(-1, 1)).toBe(false);
  });

  it('is false while not yet arrived, once already arrived, and going back up', () => {
    expect(hasArrived(0.2, 0.9)).toBe(false);
    expect(hasArrived(1, 1)).toBe(false);
    expect(hasArrived(1, 0.4)).toBe(false);
  });
});
