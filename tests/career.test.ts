import { describe, it, expect } from 'vitest';
import { yearsElapsed, CAREER_START } from '../src/lib/career';

describe('yearsElapsed', () => {
  it('starts from October 2016', () => {
    expect(CAREER_START.getUTCFullYear()).toBe(2016);
    expect(CAREER_START.getUTCMonth()).toBe(9); // 0-indexed October
  });

  it('is 9 the day before the tenth anniversary', () => {
    expect(yearsElapsed(new Date('2026-09-30T00:00:00Z'))).toBe(9);
  });

  it('ticks to 10 on the tenth anniversary', () => {
    expect(yearsElapsed(new Date('2026-10-01T00:00:00Z'))).toBe(10);
  });

  it('does not tick early in the anniversary month', () => {
    expect(yearsElapsed(new Date('2027-09-30T00:00:00Z'))).toBe(10);
  });
});
