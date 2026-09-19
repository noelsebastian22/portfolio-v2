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
