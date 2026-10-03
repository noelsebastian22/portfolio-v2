import { describe, expect, it } from 'vitest';
import { createFrameWatch, probeVerdict, shouldFallBack } from '../src/lib/gfx/frame';

const repeat = (ms: number, n: number) => Array.from({ length: n }, () => ms);

describe('probeVerdict', () => {
  it('passes a steady 60Hz and a steady 120Hz display', () => {
    expect(probeVerdict(repeat(16.7, 20))).toBe('pass');
    expect(probeVerdict(repeat(8.3, 20))).toBe('pass');
  });

  it('fails a slow median, and a fast median with a slow tail', () => {
    expect(probeVerdict(repeat(24, 20))).toBe('fail');
    expect(probeVerdict([...repeat(16, 16), ...repeat(40, 4)])).toBe('fail');
  });

  it('is inconclusive when the tab was hidden mid-probe — one huge gap is not a slow GPU', () => {
    expect(probeVerdict([...repeat(16.7, 10), 1800, ...repeat(16.7, 9)])).toBe('inconclusive');
  });

  it('is inconclusive with no frames at all', () => {
    expect(probeVerdict([])).toBe('inconclusive');
  });
});

describe('createFrameWatch', () => {
  it('trips once the median of the last 60 rendered frames is over 25ms', () => {
    const watch = createFrameWatch();
    const tripped = repeat(30, 60).map((ms) => watch.push(ms));
    expect(tripped.slice(0, 59).every((t) => !t)).toBe(true);
    expect(tripped[59]).toBe(true);
  });

  it('ignores idle gaps between scrolls — rendering only on change leaves long pauses', () => {
    const watch = createFrameWatch();
    const pushes = [...repeat(16, 30), 2000, 5000, ...repeat(16, 30)].map((ms) => watch.push(ms));
    expect(pushes.some(Boolean)).toBe(false);
  });

  it('does not trip on a short burst of slow frames inside a healthy window', () => {
    const watch = createFrameWatch();
    const pushes = [...repeat(16, 40), ...repeat(40, 20)].map((ms) => watch.push(ms));
    expect(pushes.some(Boolean)).toBe(false);
  });
});

describe('shouldFallBack', () => {
  const healthy = { viewportWidth: 1440, reducedMotion: false, contextLost: false, watchTripped: false };

  it('keeps the tube while healthy', () => {
    expect(shouldFallBack(healthy)).toBe(false);
  });

  it.each([
    // A window dragged narrower than the gate's floor mid-visit.
    ['viewport below 900px', { viewportWidth: 899 }],
    ['reduced motion switched on', { reducedMotion: true }],
    ['WebGL context lost', { contextLost: true }],
    ['slow frames', { watchTripped: true }],
  ])('hands back on %s', (_, override) => {
    expect(shouldFallBack({ ...healthy, ...override })).toBe(true);
  });
});
