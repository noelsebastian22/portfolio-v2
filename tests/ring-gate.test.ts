import { describe, expect, it } from 'vitest';
import { MIN_VIEWPORT_WIDTH } from '../src/lib/gfx/gate';
import { canTurnRing } from '../src/lib/ring/gate';

const capable = { viewportWidth: 1440, reducedMotion: false, mode: null } as const;

describe('canTurnRing', () => {
  it('lets a wide, moving window load the ring', () => {
    expect(canTurnRing(capable)).toBe(true);
    expect(canTurnRing({ ...capable, viewportWidth: MIN_VIEWPORT_WIDTH })).toBe(true);
  });

  it('keeps the rail on a narrow window, under reduced motion, and when 2D is forced', () => {
    expect(canTurnRing({ ...capable, viewportWidth: MIN_VIEWPORT_WIDTH - 1 })).toBe(false);
    expect(canTurnRing({ ...capable, reducedMotion: true })).toBe(false);
    expect(canTurnRing({ ...capable, mode: '2d' })).toBe(false);
  });

  it('does not depend on the tube: a forced tube changes nothing', () => {
    expect(canTurnRing({ ...capable, mode: 'tube' })).toBe(true);
    expect(canTurnRing({ ...capable, mode: 'tube', reducedMotion: true })).toBe(false);
  });
});
