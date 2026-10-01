import { describe, expect, it } from 'vitest';
import { createFrameWatch } from '../src/lib/gfx/frame';
import { createRenderSchedule } from '../src/lib/gfx/render-schedule';

/** gsap.ticker's shape: listeners run in the order they were added, once per tick. */
function fakeTicker() {
  const listeners: (() => void)[] = [];
  let time = 0;
  return {
    now: () => time,
    subscribe(onTick: () => void) {
      listeners.push(onTick);
      return () => listeners.splice(listeners.indexOf(onTick), 1);
    },
    tick(atMs: number) {
      time = atMs;
      for (const listener of [...listeners]) listener();
    },
    get listenerCount() {
      return listeners.length;
    },
  };
}

const FRAME_60HZ = 1000 / 60;

/** A scroll driver registered first, as Lenis is in scroll.ts, then the schedule. */
function scrollingScene() {
  const ticker = fakeTicker();
  let isScrolling = false;
  const draws: (number | null)[] = [];
  ticker.subscribe(() => {
    if (isScrolling) schedule.markDirty(); // Lenis → ScrollTrigger → publishSignalTip
  });
  const schedule = createRenderSchedule({
    subscribe: ticker.subscribe,
    now: ticker.now,
    draw: (sinceLastDrawMs) => draws.push(sinceLastDrawMs),
  });
  return {
    ticker,
    schedule,
    draws,
    setScrolling: (value: boolean) => (isScrolling = value),
  };
}

describe('createRenderSchedule', () => {
  it('draws a change marked earlier in a tick in that same tick', () => {
    const { ticker, draws, setScrolling } = scrollingScene();
    setScrolling(true);
    ticker.tick(0);
    expect(draws).toHaveLength(1);
    ticker.tick(FRAME_60HZ);
    expect(draws).toHaveLength(2);
  });

  it('draws once per tick while scrolling — never every other frame', () => {
    const { ticker, draws, setScrolling } = scrollingScene();
    setScrolling(true);
    for (let frame = 0; frame < 120; frame++) ticker.tick(frame * FRAME_60HZ);
    expect(draws).toHaveLength(120);
  });

  it('draws nothing on a tick with no change', () => {
    const { ticker, draws } = scrollingScene();
    for (let frame = 0; frame < 30; frame++) ticker.tick(frame * FRAME_60HZ);
    expect(draws).toHaveLength(0);
  });

  it('draws a change from outside the ticker (a resize, a re-measure) on the next tick, once', () => {
    const { ticker, schedule, draws } = scrollingScene();
    schedule.markDirty();
    schedule.markDirty();
    expect(draws).toHaveLength(0);
    ticker.tick(0);
    ticker.tick(FRAME_60HZ);
    expect(draws).toHaveLength(1);
  });

  it('reports the interval between drawn ticks, so the watchdog sees 16.7ms at 60Hz, not 33', () => {
    const { ticker, draws, setScrolling } = scrollingScene();
    setScrolling(true);
    for (let frame = 0; frame < 200; frame++) ticker.tick(frame * FRAME_60HZ);
    expect(draws[0]).toBeNull();
    for (const interval of draws.slice(1)) expect(interval).toBeCloseTo(FRAME_60HZ, 6);

    // Three seconds of continuous 60Hz scrolling: the watchdog must not retire the tube.
    const watch = createFrameWatch();
    const tripped = draws.slice(1).map((interval) => watch.push(interval!));
    expect(tripped.some(Boolean)).toBe(false);
  });

  it('measures from the last draw, so a pause between scrolls reads as an idle gap', () => {
    const { ticker, draws, setScrolling } = scrollingScene();
    setScrolling(true);
    ticker.tick(0);
    setScrolling(false);
    for (let frame = 1; frame < 60; frame++) ticker.tick(frame * FRAME_60HZ);
    setScrolling(true);
    ticker.tick(60 * FRAME_60HZ);
    expect(draws).toEqual([null, expect.closeTo(1000, 6)]);
  });

  it('stops listening to the ticker', () => {
    const { ticker, schedule, draws } = scrollingScene();
    expect(ticker.listenerCount).toBe(2);
    schedule.stop();
    expect(ticker.listenerCount).toBe(1);
    schedule.markDirty();
    ticker.tick(0);
    expect(draws).toHaveLength(0);
  });
});
