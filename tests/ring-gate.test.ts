import { describe, expect, it } from 'vitest';
import { MIN_VIEWPORT_WIDTH } from '../src/lib/gfx/gate';
import { RING_MIN_VIEWPORT_WIDTH, canTurnRing } from '../src/lib/ring/gate';

const capable = { viewportWidth: 1440, reducedMotion: false, search: '' } as const;

describe('canTurnRing', () => {
  it('uses the tube gate’s minimum width, duplicated to keep the shared gate out of the base', () => {
    expect(RING_MIN_VIEWPORT_WIDTH).toBe(MIN_VIEWPORT_WIDTH);
  });

  it('lets a wide, moving window load the ring', () => {
    expect(canTurnRing(capable)).toBe(true);
    expect(canTurnRing({ ...capable, viewportWidth: RING_MIN_VIEWPORT_WIDTH })).toBe(true);
  });

  it('keeps the rail on a narrow window, under reduced motion, and when 2D is forced', () => {
    expect(canTurnRing({ ...capable, viewportWidth: RING_MIN_VIEWPORT_WIDTH - 1 })).toBe(false);
    expect(canTurnRing({ ...capable, reducedMotion: true })).toBe(false);
    expect(canTurnRing({ ...capable, search: '?signal=2d' })).toBe(false);
    expect(canTurnRing({ ...capable, search: '?utm=x&signal=2d' })).toBe(false);
  });

  it('does not depend on the tube: a forced tube changes nothing', () => {
    expect(canTurnRing({ ...capable, search: '?signal=tube' })).toBe(true);
    expect(canTurnRing({ ...capable, search: '?signal=tube', reducedMotion: true })).toBe(false);
  });
});
