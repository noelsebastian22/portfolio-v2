/** Noel's first professional role: Analyst, Ernst & Young, Kakkanad — 10/2016. */
export const CAREER_START = new Date(Date.UTC(2016, 9, 1));

/** Whole years elapsed since CAREER_START. Never hard-code this number. */
export function yearsElapsed(now: Date = new Date()): number {
  let years = now.getUTCFullYear() - CAREER_START.getUTCFullYear();
  const beforeAnniversary =
    now.getUTCMonth() < CAREER_START.getUTCMonth() ||
    (now.getUTCMonth() === CAREER_START.getUTCMonth() &&
     now.getUTCDate() < CAREER_START.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

/**
 * Spec §9.02: from ten years the copy should say "a decade" rather than a number that
 * would need finding and re-editing every year past ten. Every place that states the span
 * in words (not the numeral stat, which keeps counting) branches on this. Takes the year
 * count `yearsElapsed()` already produced, not a Date, so it stays a one-line boundary
 * check with nothing of its own to get wrong about anniversaries.
 */
export function isDecadeOrMore(years: number): boolean {
  return years >= 10;
}
