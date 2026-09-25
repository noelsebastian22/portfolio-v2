/** Shared numeric helpers for the diagram modules. Pure, no DOM. */

export function clamp01(value: number): number {
  if (!(value > 0)) return 0; // also catches NaN
  if (value > 1) return 1;
  return value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
