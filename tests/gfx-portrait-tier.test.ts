import { describe, expect, it } from 'vitest';
import { createPortraitTiers, PORTRAIT_COUNTS } from '../src/lib/gfx/portrait-tier';

const pushAll = (tiers: ReturnType<typeof createPortraitTiers>, ms: number, n: number) =>
  Array.from({ length: n }, () => tiers.push(ms));

describe('createPortraitTiers', () => {
  it('starts at the full count', () => {
    expect(createPortraitTiers().count).toBe(PORTRAIT_COUNTS[0]);
  });

  it('holds on a healthy 60Hz display, and through one bad frame', () => {
    const tiers = createPortraitTiers();
    const verdicts = [...pushAll(tiers, 16.7, 59), tiers.push(40), ...pushAll(tiers, 16.7, 60)];
    expect(verdicts.every((v) => v === 'hold')).toBe(true);
    expect(tiers.count).toBe(PORTRAIT_COUNTS[0]);
  });

  it('steps down one tier on sustained strain, then judges the new tier from scratch', () => {
    const tiers = createPortraitTiers();
    const first = pushAll(tiers, 30, 60);
    expect(first.slice(0, 59).every((v) => v === 'hold')).toBe(true);
    expect(first[59]).toBe('step');
    expect(tiers.count).toBe(PORTRAIT_COUNTS[1]);
    // A fresh window: 59 more slow frames are not yet a verdict on the 20k tier.
    expect(pushAll(tiers, 30, 59).every((v) => v === 'hold')).toBe(true);
    expect(tiers.push(30)).toBe('step');
    expect(tiers.count).toBe(PORTRAIT_COUNTS[2]);
  });

  it('falls back once the last tier strains too', () => {
    const tiers = createPortraitTiers();
    pushAll(tiers, 30, 120);
    const last = pushAll(tiers, 30, 60);
    expect(last[59]).toBe('fallBack');
    expect(tiers.count).toBe(PORTRAIT_COUNTS[2]);
  });
});
