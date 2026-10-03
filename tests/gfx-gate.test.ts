import { describe, expect, it } from 'vitest';
import { checkCapability, forcedMode, type Environment } from '../src/lib/gfx/gate';

const capable: Environment = {
  reducedMotion: false,
  viewportWidth: 1440,
  saveData: false,
  hardwareConcurrency: 8,
  hasHero: true,
  fallbackRemembered: false,
  webgl2: () => true,
};

describe('checkCapability', () => {
  it('enables the tube when every condition passes, with the probe', () => {
    expect(checkCapability(capable, null)).toEqual({ enabled: true, skipProbe: false });
  });

  it.each([
    ['reduced-motion', { reducedMotion: true }],
    ['narrow-viewport', { viewportWidth: 899 }],
    ['save-data', { saveData: true }],
    ['few-cores', { hardwareConcurrency: 2 }],
    ['fell-back-this-session', { fallbackRemembered: true }],
    ['no-webgl2', { webgl2: () => false }],
    // /websites and /404 share BaseLayout and have no hero: never the tube.
    ['no-hero', { hasHero: false }],
  ] as const)('fails on %s alone', (reason, override) => {
    expect(checkCapability({ ...capable, ...override }, null)).toEqual({
      enabled: false,
      reason,
      skipProbe: false,
    });
  });

  it('accepts exactly 900px and exactly 4 cores', () => {
    expect(checkCapability({ ...capable, viewportWidth: 900, hardwareConcurrency: 4 }, null).enabled).toBe(true);
  });

  it('never creates a WebGL context when a cheaper check already failed', () => {
    let probed = false;
    const env = { ...capable, saveData: true, webgl2: () => ((probed = true), true) };
    checkCapability(env, null);
    expect(probed).toBe(false);
  });

  it('?signal=2d forces the flat line even on a capable machine', () => {
    expect(checkCapability(capable, '2d')).toEqual({ enabled: false, reason: 'forced-2d', skipProbe: false });
  });

  it('?signal=tube skips the static checks and the probe, but not WebGL2 or the hero', () => {
    const weak = { ...capable, viewportWidth: 600, hardwareConcurrency: 2, fallbackRemembered: true };
    expect(checkCapability(weak, 'tube')).toEqual({ enabled: true, skipProbe: true });
    expect(checkCapability({ ...weak, webgl2: () => false }, 'tube').reason).toBe('no-webgl2');
    expect(checkCapability({ ...weak, hasHero: false }, 'tube').reason).toBe('no-hero');
  });
});

describe('forcedMode', () => {
  it('reads ?signal=2d and ?signal=tube and ignores anything else', () => {
    expect(forcedMode('?signal=2d')).toBe('2d');
    expect(forcedMode('?a=1&signal=tube')).toBe('tube');
    expect(forcedMode('?signal=3d')).toBeNull();
    expect(forcedMode('')).toBeNull();
  });
});
