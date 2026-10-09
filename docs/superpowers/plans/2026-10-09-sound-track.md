# Sound Rework — A Licensed Track: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthesised drone and emission notes with the licensed track "A New Daydream" (DEX 1200, Epidemic Sound), streamed from Vercel Blob, with scroll speed still heard as brightness and the hover tick kept.

**Architecture:** `scripts/audio.mjs` (ffmpeg) prepares a gitignored `.m4a` that Noel uploads to Vercel Blob. The toggle island creates an `<audio>` element and its `MediaElementAudioSourceNode` inside the click, then the lazy chunk routes it `track → gain → lowpass (speed) → master`, beside the existing tick. The score module is replaced by a pure `brightness.ts`.

**Tech Stack:** Astro 5 (static), TypeScript, Web Audio API, ffmpeg/ffprobe (local only), Vercel Blob, Vitest (pure modules only).

**Spec:** `docs/superpowers/specs/2026-10-09-sound-track-design.md` — read it with this plan. Parent: `docs/superpowers/specs/2026-09-19-signal-path-design.md` §7–§10.

**Blocked on Noel:** the source file (Task 2) and the licence check (Task 5, spec D12). Tasks 1 and 3 need neither and may run first.

## Global Constraints

- **No UI framework.** No React, Preact, Vue, Svelte, Tailwind.
- **The repo never holds the track** — `assets-src/audio/` is gitignored; nothing under `public/` is audio (spec D2).
- **Never fetched unless toggled** — no `<audio>` element, no `.m4a` request and no audio chunk until the toggle or, with `sound=on` stored, the first gesture (spec D6).
- **Performance budget:** base-path JS ≤ 81,920 B gzip (`npm run budget`); lazy audio chunk ≤ 5,120 B gzip; track ≤ 4 MB. Every change to a JS number is recorded with its number.
- **Zero render-blocking JS above the fold;** LCP unchanged.
- **The scroll is the transport.** Nothing animates on a timer except the music and idle particle drift.
- **Accessibility:** the toggle stays a real `<button>` with `aria-pressed`; labels exactly `Sound · off` / `Sound · on` / `Sound · unavailable`.
- **`/websites` gets no audio.**
- **Gate before any commit:** `npm run build` green. Tests: `npx vitest run`.
- **Code style:** descriptive names; comment *why*, not *what*; follow the file you are editing.

## Review Focus

1. **Toggled off before the chunk or the track has loaded** → the track must pause, not keep downloading and playing unheard. Pinned in Task 4, Step 3 (`track?.pause()` when there is no `control` yet) and Task 5, Step 2.
2. **The track request fails** (offline, Blob 404, CORS header missing) → `Sound · unavailable`, unpressed, `off` stored — never a pressed button over silence. Pinned in Task 4, Step 3 (`error` listener) and Task 5, Step 2 (a deliberately wrong URL).
3. **Reload with `sound=on` stored** → nothing fetched until the first gesture anywhere; that gesture starts the music (in Safari too, because `play()` runs inside it). Task 5, Step 2.
4. **Hidden tab, then back** → the music pauses and resumes from where it was, not from the start. Task 5, Step 2.
5. **Junk velocity reaching the filter** (`NaN` / `Infinity`) → `cutoffFor` returns the rest cutoff rather than `NaN`, which `setTargetAtTime` would throw on. Pinned in Task 3, Step 1.

---

### Task 1: The transcode script

**Files:**
- Create: `scripts/audio.mjs`
- Modify: `.gitignore`, `package.json` (scripts)

**Interfaces:**
- Consumes: `assets-src/audio/a-new-daydream.wav` or `.mp3` (Noel's download).
- Produces: `assets-src/audio/out/a-new-daydream.m4a` — AAC-LC 128 kbps, 44.1 kHz stereo, `moov` before `mdat`. `npm run audio`.

- [ ] **Step 1: Ignore the audio directory**

Append to `.gitignore`:

```gitignore

# the licensed track — source and transcode both; the repo is public (sound rework spec D2)
assets-src/audio/
```

- [ ] **Step 2: Write `scripts/audio.mjs`**

```js
/**
 * Prepare the licensed track for Vercel Blob (sound rework spec D2, D3).
 *
 * The source and the output are both gitignored: the repo is public, and the track is
 * licensed to Noel, not to the repo. After downloading "A New Daydream" (DEX 1200) from
 * Epidemic Sound into assets-src/audio/:
 *
 *   npm run audio            # 128 kbps
 *   npm run audio -- --small # 96 kbps, if the result is over the 4 MB cap
 *
 * then upload assets-src/audio/out/a-new-daydream.m4a to Vercel Blob and put its URL in
 * src/lib/audio/track.ts. Needs ffmpeg and ffprobe on PATH (local only, never in CI).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'assets-src', 'audio');
const SOURCE_NAMES = ['a-new-daydream.wav', 'a-new-daydream.mp3'];
const OUT_FILE = path.join(SOURCE_DIR, 'out', 'a-new-daydream.m4a');
const MAX_BYTES = 4 * 1024 * 1024; // spec §5
const BITRATE = process.argv.includes('--small') ? '96k' : '128k';
// Long enough to stop the loop seam clicking, short enough not to be heard as a dip.
const SEAM_FADE_S = 0.015;

const source = SOURCE_NAMES.map((name) => path.join(SOURCE_DIR, name)).find((file) => existsSync(file));
if (!source) {
  console.error(
    `No source track. Download "A New Daydream" (DEX 1200) from Epidemic Sound into ` +
      `${path.relative(ROOT, SOURCE_DIR)}/ as one of: ${SOURCE_NAMES.join(', ')}.`,
  );
  process.exit(1);
}

const durationS = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', source], {
    encoding: 'utf8',
  }).trim(),
);

const filters = [
  // One loudness for every source, so the runtime level is a single constant (TRACK_LEVEL).
  'loudnorm=I=-20:TP=-2:LRA=11',
  `afade=t=in:d=${SEAM_FADE_S}`,
  `afade=t=out:st=${(durationS - SEAM_FADE_S).toFixed(3)}:d=${SEAM_FADE_S}`,
].join(',');

mkdirSync(path.dirname(OUT_FILE), { recursive: true });
execFileSync(
  'ffmpeg',
  // loudnorm upsamples internally, so the rate is set back explicitly; +faststart puts the
  // index first so the browser can play before the file has finished downloading.
  ['-y', '-v', 'error', '-i', source, '-af', filters, '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', BITRATE, '-movflags', '+faststart', OUT_FILE],
  { stdio: 'inherit' },
);

const bytes = statSync(OUT_FILE).size;
console.log(`${path.relative(ROOT, OUT_FILE)} — ${durationS.toFixed(1)} s, ${BITRATE}, ${bytes} bytes`);
if (bytes > MAX_BYTES) {
  console.error(`Over the ${MAX_BYTES}-byte cap (spec §5). Re-run with: npm run audio -- --small`);
  process.exit(1);
}
```

- [ ] **Step 3: Add the npm script**

In `package.json` `"scripts"`, after `"images"`:

```json
    "audio": "node scripts/audio.mjs",
```

- [ ] **Step 4: Check the missing-source message**

Run: `npm run audio`
Expected: exit 1, `No source track. Download "A New Daydream" (DEX 1200) from Epidemic Sound into assets-src/audio/ as one of: a-new-daydream.wav, a-new-daydream.mp3.`

- [ ] **Step 5: Run it on a generated test tone**

```bash
mkdir -p assets-src/audio
ffmpeg -y -v error -f lavfi -i "sine=frequency=440:duration=20" -ac 2 assets-src/audio/a-new-daydream.wav
npm run audio
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=nw=1 assets-src/audio/out/a-new-daydream.m4a
node -e "const b=require('fs').readFileSync('assets-src/audio/out/a-new-daydream.m4a');console.log(b.indexOf('moov')<b.indexOf('mdat')?'faststart OK':'moov AFTER mdat')"
git status --short assets-src
```

Expected: the script prints `assets-src/audio/out/a-new-daydream.m4a — 20.0 s, 128k, <n> bytes`; ffprobe prints `codec_name=aac`, `sample_rate=44100`, `channels=2`; `faststart OK`; `git status` prints nothing (ignored).

- [ ] **Step 6: Delete the test tone** — it must never be mistaken for the real track.

```bash
rm -rf assets-src/audio
```

- [ ] **Step 7: Commit**

```bash
npm run build
git add .gitignore package.json scripts/audio.mjs
git commit -m "feat: scripts/audio.mjs — transcode the licensed track for Blob, never into the repo"
```

---

### Task 2: Host the track (Noel + controller)

**Files:**
- Create: `src/lib/audio/track.ts`
- Modify (fallback only): `vercel.json`

**Interfaces:**
- Consumes: `npm run audio` (Task 1).
- Produces: `export const TRACK_URL: string`, `export const TRACK_CREDIT: string` from `src/lib/audio/track.ts`.

- [ ] **Step 1 (Noel): Download and transcode.** Download "A New Daydream" — DEX 1200 from Epidemic Sound (WAV preferred) to `assets-src/audio/a-new-daydream.wav`, then `npm run audio`. Over 4 MB → `npm run audio -- --small`.

- [ ] **Step 2 (Noel): Upload to Vercel Blob.** Vercel dashboard → the `portfolio-v2` project → Storage → Create → Blob (public) → connect to the project → Browse → Upload `assets-src/audio/out/a-new-daydream.m4a`. Copy the file's public URL.

- [ ] **Step 3: Check the URL answers what the browser needs** (spec §5). With `URL` set to the copied URL:

```bash
curl -sI -H "Origin: https://www.noel-sebastian.com" "$URL" | grep -iE "^(HTTP|access-control-allow-origin|content-type|accept-ranges)"
curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=0-1" "$URL"
```

Expected: `HTTP/2 200`; `access-control-allow-origin: *` (or the site's origin); `content-type: audio/mp4`; the range request prints `206`.

If CORS or `206` fails, use the same-origin fallback: replace `vercel.json` with

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/audio/a-new-daydream.m4a", "destination": "<the Blob URL>" }]
}
```

and use `TRACK_URL = '/audio/a-new-daydream.m4a'` below; re-run the two `curl`s against the PR preview's `/audio/a-new-daydream.m4a` once deployed.

- [ ] **Step 4: Write `src/lib/audio/track.ts`** — `TRACK_URL` is the URL from Step 2 (or the fallback path), verbatim:

```ts
/**
 * The licensed track (sound rework spec D1, D2): "A New Daydream" — DEX 1200, from Epidemic
 * Sound, under Noel's subscription. Hosted on Vercel Blob, never in this repo: the repo is
 * public and the licence is Noel's. Prepared by scripts/audio.mjs.
 *
 * Two exports so the toggle island's import carries only the URL; the credit is rendered by
 * the footer at build time.
 */

export const TRACK_URL = 'https://<store-id>.public.blob.vercel-storage.com/a-new-daydream.m4a';

export const TRACK_CREDIT = 'Music: A New Daydream — DEX 1200 (Epidemic Sound)';
```

(Replace the whole `TRACK_URL` string with the real URL — the `<store-id>` form above is only its shape.)

- [ ] **Step 5: Commit**

```bash
npm run build
git add src/lib/audio/track.ts   # and vercel.json if the fallback was used
git commit -m "feat: the track's Blob URL and credit"
```

---

### Task 3: `brightness.ts` — speed as brightness (pure)

**Files:**
- Create: `src/lib/audio/brightness.ts`
- Test: `tests/audio-brightness.test.ts`

`score.ts` is left in place in this task, so the build stays green; Task 4 switches the engine over and deletes it.

**Interfaces:**
- Produces: `CUTOFF_MIN_HZ = 2000`, `CUTOFF_MAX_HZ = 18000`, `cutoffFor(velocity: number): number`, `FULL_SPEED_PX_PER_S = 3000`, `normaliseSpeed(pxPerSecond: number): number`.

- [ ] **Step 1: Write the failing test** — `tests/audio-brightness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CUTOFF_MAX_HZ, CUTOFF_MIN_HZ, cutoffFor, normaliseSpeed } from '../src/lib/audio/brightness';

describe('cutoffFor — speed heard as brightness (sound rework D8)', () => {
  it('sits at 2 kHz at rest and opens to 18 kHz at full speed', () => {
    expect(CUTOFF_MIN_HZ).toBe(2000);
    expect(CUTOFF_MAX_HZ).toBe(18000);
    expect(cutoffFor(0)).toBeCloseTo(2000);
    expect(cutoffFor(1)).toBeCloseTo(18000);
  });

  it('rises exponentially, because pitch is heard as a ratio — halfway is the geometric mean', () => {
    expect(cutoffFor(0.5)).toBeGreaterThan(cutoffFor(0.25));
    expect(cutoffFor(0.5)).toBeCloseTo(Math.sqrt(2000 * 18000), 6);
  });

  it('clamps out-of-range velocity', () => {
    expect(cutoffFor(-2)).toBeCloseTo(CUTOFF_MIN_HZ);
    expect(cutoffFor(9)).toBeCloseTo(CUTOFF_MAX_HZ);
  });

  it('reads junk velocity as rest — setTargetAtTime throws on NaN', () => {
    expect(cutoffFor(Number.NaN)).toBeCloseTo(CUTOFF_MIN_HZ);
    expect(cutoffFor(Number.POSITIVE_INFINITY)).toBeCloseTo(CUTOFF_MIN_HZ);
  });
});

describe('normaliseSpeed', () => {
  it('normalises scroll speed in either direction, clamped, and survives junk', () => {
    expect(normaliseSpeed(0)).toBe(0);
    expect(normaliseSpeed(1500)).toBe(0.5);
    expect(normaliseSpeed(-1500)).toBe(0.5);
    expect(normaliseSpeed(99999)).toBe(1);
    expect(normaliseSpeed(Number.NaN)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/audio-brightness.test.ts`
Expected: FAIL — cannot resolve `../src/lib/audio/brightness`.

- [ ] **Step 3: Write `src/lib/audio/brightness.ts`**

```ts
/**
 * Speed heard as brightness (sound rework spec D8): how scroll speed becomes the lowpass
 * cutoff on the track. The measurement is Phase 13's (D5); the range is retuned for a full
 * mix — warm but clear at rest, fully open at speed.
 *
 * Pure module: no DOM, no Web Audio — so it is tested; `engine.ts` only applies it.
 */

export const CUTOFF_MIN_HZ = 2000;
export const CUTOFF_MAX_HZ = 18000;

/** Velocity 0..1 → lowpass cutoff, exponentially, because pitch is heard as a ratio. */
export function cutoffFor(velocity: number): number {
  const v = Number.isFinite(velocity) ? Math.min(1, Math.max(0, velocity)) : 0;
  return CUTOFF_MIN_HZ * (CUTOFF_MAX_HZ / CUTOFF_MIN_HZ) ** v;
}

/** Scroll speed at which the mix is fully open. */
export const FULL_SPEED_PX_PER_S = 3000;

export function normaliseSpeed(pxPerSecond: number): number {
  if (!Number.isFinite(pxPerSecond)) return 0;
  return Math.min(1, Math.abs(pxPerSecond) / FULL_SPEED_PX_PER_S);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: all pass (342 existing + 5 new = 347).

- [ ] **Step 5: Commit**

```bash
npm run build
git add src/lib/audio/brightness.ts tests/audio-brightness.test.ts
git commit -m "feat: brightness.ts — scroll speed to cutoff, retuned for a full mix"
```

---

### Task 4: The track in the graph — engine, wiring, toggle, credit, spec

**Files:**
- Modify: `src/lib/audio/engine.ts` (rewrite), `src/lib/audio/connect.ts` (rewrite), `src/islands/sound.ts`, `src/components/Footer.astro`
- Delete: `src/lib/audio/score.ts`, `tests/audio-score.test.ts`
- Modify (docs, same commit — AGENTS.md: the spec changes with the code that contradicts it): `docs/superpowers/specs/2026-09-19-signal-path-design.md` §7, §8, §9.00, §10; `docs/superpowers/specs/2026-10-06-phase-13-audio-design.md` header; `AGENTS.md`; `BUILD-PLAN.md` Global Constraints

**Interfaces:**
- Consumes: `TRACK_URL`, `TRACK_CREDIT` (Task 2); `cutoffFor`, `normaliseSpeed` (Task 3); `onTick(fn: (deltaMs: number) => void): () => void` from `src/lib/motion/timeline.ts` (existing).
- Produces: `createAudioEngine(ctx: AudioContext, track: HTMLAudioElement, source: MediaElementAudioSourceNode): AudioEngine` with `start()`, `stop()`, `setVelocity(v: number)`, `tick()`; `connectAudio(ctx: AudioContext, track: HTMLAudioElement, source: MediaElementAudioSourceNode): AudioControl` with `start()`, `stop()`.

No unit tests: these modules are DOM and Web Audio, which Vitest does not cover in this repo (AGENTS.md). They are verified by `tsc`, the build, the budget and Task 5's browser pass.

- [ ] **Step 1: Rewrite `src/lib/audio/engine.ts`**

```ts
/**
 * The Web Audio graph (sound rework spec D7–D10; the tick is Phase 13 D6). Lazy: only
 * `connect.ts` imports it, and only `islands/sound.ts` imports that, with `import()`, once
 * sound is turned on.
 *
 *   track ─► gain ─► lowpass (speed) ─► master ─► out
 *   tick ─► bandpass ─► gain ──────────────┘
 *
 * The track is a licensed recording streamed through an <audio> element (`track.ts`); the
 * island creates it and its source node inside the gesture and hands both over. The tick is
 * generated noise. TRACK_LEVEL and the cutoff range are tuned by ear on the preview.
 */

import { cutoffFor } from './brightness';

export interface AudioEngine {
  start(): void;
  stop(): void;
  /** 0..1 — scroll speed, heard as the lowpass opening. */
  setVelocity(velocity: number): void;
  tick(): void;
}

const TRACK_LEVEL = 0.6;
const FADE_IN_S = 1.5;
const FADE_OUT_S = 0.4;

const CUTOFF_GLIDE_S = 0.25;
const CUTOFF_STEP = 0.005; // velocity changes smaller than this are not worth an automation event

const TICK_S = 0.012;
const TICK_HZ = 3200;
const TICK_LEVEL = 0.016; // Phase 13's 0.02 under its 0.8 master, now that master opens to 1
const TICK_MIN_GAP_S = 0.06;

function noiseBurst(ctx: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.round(ctx.sampleRate * TICK_S));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  return buffer;
}

export function createAudioEngine(
  ctx: AudioContext,
  track: HTMLAudioElement,
  source: MediaElementAudioSourceNode,
): AudioEngine {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.7;
  lowpass.frequency.value = cutoffFor(0);
  lowpass.connect(master);

  const trackGain = ctx.createGain();
  trackGain.gain.value = TRACK_LEVEL;
  source.connect(trackGain).connect(lowpass);

  const tickNoise = noiseBurst(ctx);
  const tickFilter = ctx.createBiquadFilter();
  tickFilter.type = 'bandpass';
  tickFilter.frequency.value = TICK_HZ;
  tickFilter.Q.value = 2;
  const tickGain = ctx.createGain();
  tickGain.gain.value = TICK_LEVEL;
  tickFilter.connect(tickGain).connect(master);
  let lastTickAt = Number.NEGATIVE_INFINITY;

  let shownVelocity = 0;
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;

  function rampMaster(target: number, seconds: number): void {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + seconds);
  }

  return {
    start() {
      if (pauseTimer !== undefined) clearTimeout(pauseTimer);
      pauseTimer = undefined;
      void ctx.resume();
      // The first play() is the island's, inside the gesture; this one resumes after a stop,
      // which Safari allows once that first play() has unlocked the element.
      if (track.paused) void track.play().catch(() => {});
      rampMaster(1, FADE_IN_S);
    },
    stop() {
      rampMaster(0, FADE_OUT_S);
      // Pause once silent, so the track resumes where it faded rather than playing on unheard,
      // and suspend so there is no audio thread while sound is off.
      pauseTimer = setTimeout(() => {
        pauseTimer = undefined;
        track.pause();
        void ctx.suspend();
      }, FADE_OUT_S * 1000 + 50);
    },
    setVelocity(velocity) {
      if (Math.abs(velocity - shownVelocity) < CUTOFF_STEP) return;
      shownVelocity = velocity;
      lowpass.frequency.setTargetAtTime(cutoffFor(velocity), ctx.currentTime, CUTOFF_GLIDE_S);
    },
    tick() {
      const now = ctx.currentTime;
      if (now - lastTickAt < TICK_MIN_GAP_S) return;
      lastTickAt = now;
      const burst = ctx.createBufferSource();
      burst.buffer = tickNoise;
      burst.connect(tickFilter);
      burst.start(now);
    },
  };
}
```

- [ ] **Step 2: Rewrite `src/lib/audio/connect.ts`**

```ts
/**
 * Wires the engine to the page: scroll speed from the shared GSAP ticker, hover ticks from a
 * delegated `pointerover`. The lazy chunk's entry — `islands/sound.ts` imports it with
 * `import()` and hands over the context, the <audio> element and its source node, all made
 * inside the gesture (sound rework spec D5).
 *
 * Speed is read from `scrollY` deltas rather than from Lenis, so it works the same under
 * reduced motion, where Lenis never runs (Phase 13 D5).
 */

import { onTick } from '../motion/timeline';
import { normaliseSpeed } from './brightness';
import { createAudioEngine } from './engine';

export interface AudioControl {
  start(): void;
  stop(): void;
}

const HOVER_TARGETS = 'a, button, [data-card-link]';
/** Per-frame smoothing of the measured speed: one frame's spike should not slam the filter open. */
const SPEED_SMOOTHING = 0.15;

export function connectAudio(
  ctx: AudioContext,
  track: HTMLAudioElement,
  source: MediaElementAudioSourceNode,
): AudioControl {
  const engine = createAudioEngine(ctx, track, source);

  let isStarted = false;
  let lastScrollY = 0;
  let speed = 0;
  let hovered: Element | null = null;
  let stopSampling: (() => void) | undefined;

  function sampleSpeed(deltaMs: number): void {
    const scrollY = window.scrollY;
    const pxPerSecond = deltaMs > 0 ? ((scrollY - lastScrollY) / deltaMs) * 1000 : 0;
    lastScrollY = scrollY;
    speed += (Math.abs(pxPerSecond) - speed) * SPEED_SMOOTHING;
    engine.setVelocity(normaliseSpeed(speed));
  }

  function tickOnHover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return; // a tap is not a hover
    const target = event.target instanceof Element ? event.target.closest(HOVER_TARGETS) : null;
    if (target === hovered) return; // moving within one link is one hover
    hovered = target;
    if (target) engine.tick();
  }

  return {
    start() {
      if (isStarted) return;
      isStarted = true;
      lastScrollY = window.scrollY;
      speed = 0;
      stopSampling = onTick(sampleSpeed);
      document.addEventListener('pointerover', tickOnHover);
      engine.start();
    },
    stop() {
      if (!isStarted) return;
      isStarted = false;
      stopSampling?.();
      stopSampling = undefined;
      document.removeEventListener('pointerover', tickOnHover);
      hovered = null;
      engine.stop();
    },
  };
}
```

- [ ] **Step 3: Update `src/islands/sound.ts`**

3a. Replace the header comment's second paragraph and the imports:

```ts
/**
 * The sound toggle (Phase 13, spec D8–D11; sound rework spec D5, D6, D11). Small and in the
 * main bundle; everything that makes a sound is behind the `import()` below and is never
 * fetched until sound is turned on.
 *
 * The `AudioContext`, the <audio> element and its source node are created here, synchronously
 * inside the gesture, and handed to the lazy chunk: Safari unlocks audio — the context and
 * the element's play() — only inside the gesture's own call stack.
 */

import type { AudioControl } from '../lib/audio/connect';
import { TRACK_URL } from '../lib/audio/track';
```

3b. After `let loading: Promise<AudioControl> | undefined;` add:

```ts
  let track: HTMLAudioElement | undefined;
  let source: MediaElementAudioSourceNode | undefined;
```

3c. In `becomeUnavailable()`, after `control?.stop();` add:

```ts
    track?.pause();
```

3d. Replace the whole `play()` function with:

```ts
  /** Must be called inside a user gesture. */
  function play(): void {
    try {
      ctx ??= new AudioContextClass!();
      if (!track) {
        track = new Audio();
        track.crossOrigin = 'anonymous'; // without CORS a MediaElementSource outputs silence
        track.loop = true;
        // Network, CORS or decode failure — the toggle must not stay pressed over silence.
        track.addEventListener('error', () => becomeUnavailable());
        track.src = TRACK_URL;
        // Into the graph before play(), so it is silent until the engine connects it.
        source = ctx.createMediaElementSource(track);
      }
    } catch {
      becomeUnavailable();
      return;
    }
    const context = ctx;
    const media = track;
    const node = source!;
    void context.resume().then(() => {
      // Not every event unlocks audio everywhere; if this one did not, wait for the next.
      if (isOn && context.state !== 'running') arm();
    });
    media.play().catch((error: unknown) => {
      // Refused for want of a gesture: the next one tries again. An AbortError only means a
      // pause() overtook this play() — the reader turned it off again.
      const isRefused = error instanceof DOMException && error.name === 'NotAllowedError';
      if (isRefused && isOn) arm();
    });
    loading ??= import('../lib/audio/connect').then(({ connectAudio }) => connectAudio(context, media, node));
    loading.then(
      (loaded) => {
        control = loaded;
        // The reader may have turned it off again while the chunk was on its way.
        if (isOn && !document.hidden) loaded.start();
      },
      () => becomeUnavailable(),
    );
  }
```

3e. In the click handler, replace `else control?.stop();` with:

```ts
    else if (control) control.stop();
    // Off before the chunk arrived: nothing will fade it, so stop the (still silent) track here.
    else track?.pause();
```

- [ ] **Step 4: Delete the score**

```bash
git rm src/lib/audio/score.ts tests/audio-score.test.ts
grep -rn "audio/score\|notesFor\|createNoteGate\|onEmission" src/lib/audio src/islands/sound.ts
```

Expected: no output.

- [ ] **Step 5: The credit in the footer colophon** (`src/components/Footer.astro`)

In the frontmatter, with the other imports:

```ts
import { TRACK_CREDIT } from '../lib/audio/track';
```

Replace the colophon paragraph:

```astro
    {showColophon && (
      <p class="site-footer__colophon">
        Astro · TypeScript · GSAP · Lenis · self-hosted variable fonts. No UI framework.
        <br />
        {TRACK_CREDIT}
      </p>
    )}
```

- [ ] **Step 6: Amend the docs that the code now contradicts**

`docs/superpowers/specs/2026-09-19-signal-path-design.md`:

- §7: `nothing animates on a timer except the audio drone and the idle particle` → `nothing animates on a timer except the music and the idle particle`.
- §8: replace from `When enabled:` to the end of the section with:

```markdown
When enabled:

- A licensed track loops — "A New Daydream" by DEX 1200 (Epidemic Sound), streamed from
  Vercel Blob and never committed to the repo.
- Scroll velocity maps to a lowpass filter cutoff on it. Scrolling fast brightens the mix.
- A short tick on interactive hover.

The track, and the code that plays it, are fetched on first toggle and never if the toggle is
never pressed. Design and decisions: `2026-10-09-sound-track-design.md`, which replaced the
synthesised drone and emission notes after Noel heard them as a film score.

The music is chosen, not generated, but the reader still plays it: the scroll is the transport
for its brightness.
```

- §9.00: `On completion the first note sounds (if audio is on) and the hero resolves.` → `On completion the music fades in (if sound is on) and the hero resolves.`
- §10 assets table: add a row after `OG image`: `| Music | Licensed — "A New Daydream", DEX 1200 (Epidemic Sound), on Vercel Blob |`.

`docs/superpowers/specs/2026-10-06-phase-13-audio-design.md` — after the `**Date:**` paragraph, add:

```markdown
> **Superseded in part (2026-10-09)** by `2026-10-09-sound-track-design.md`: D3, D4, D7, D12 and
> D14 no longer hold — a licensed track replaced the drone and the emission notes. D1–D2 (the
> bus) stand with no subscriber; D5, D6, D8–D11 and D13 stand as amended there.
```

`AGENTS.md` and `BUILD-PLAN.md` Global Constraints: `Nothing animates on a timer except the audio drone and` → `Nothing animates on a timer except the music and`.

- [ ] **Step 7: Typecheck, test, build, budget**

```bash
npx tsc --noEmit -p .
npx vitest run
npm run build
npm run budget
grep -l "\.m4a\|blob.vercel-storage" dist/*.html dist/**/*.html
grep -o 'modulepreload[^>]*connect[^>]*' dist/index.html
```

Expected: `tsc` silent; tests pass (347 − 10 deleted score tests = 337); build green; `/` within 81,920 (record the number and its delta from 64,984); both `grep`s print nothing (the URL lives only in the island's JS, and the audio chunk is not preloaded). Record the `connect` chunk's gzip size (≤ 5,120) from `npm run budget`'s "Other late chunks" line.

- [ ] **Step 8: Commit**

```bash
git add -A src/lib/audio src/islands/sound.ts src/components/Footer.astro tests docs/superpowers/specs AGENTS.md BUILD-PLAN.md
git commit -m "feat: the licensed track replaces the drone and notes — streamed, speed as brightness"
```

---

### Task 5: Verify in the browser, record, open the PR (controller)

**Files:**
- Modify: `BUILD-PLAN.md` (Decisions, Current figures, Known Gaps), `docs/archive/` (the closed gap, verbatim)

- [ ] **Step 1: Network, with no click.** `npm run build && npm run preview`; load `/` in Chrome with DevTools Network open. Expected: no `.m4a`, no `connect` chunk.

- [ ] **Step 2: The behaviour pass** — Chrome, then Safari:
  - Click `Sound · off` → `Sound · on`, one `.m4a` request (status 206), one `connect` chunk; music fades in over ~1.5 s.
  - Scroll slowly (warm, clear) then fast (opens up); hover links → tick.
  - Off → fades and pauses; on → resumes from the same place, not the start.
  - Switch tabs for 10 s and back → silent while hidden, resumes on return (Review Focus 4).
  - Click on, then off within 100 ms (before the chunk lands); wait 5 s → nothing audible, and in the Network panel the `.m4a` stops growing (Review Focus 1).
  - Reload with sound on → label `Sound · on`, no `.m4a` until a click anywhere, which starts it (Review Focus 3).
  - Temporarily set `TRACK_URL` to the same URL with `-missing` appended, rebuild, click → `Sound · unavailable`, unpressed, `localStorage.sound === 'off'` (Review Focus 2). Revert.
  - `/websites` → no toggle, no audio requests. Footer on `/` shows the credit; `/websites` does not.

- [ ] **Step 3 (Noel): Listen and tune.** On the PR preview, Noel adjusts by ear; the knobs are `TRACK_LEVEL` (`engine.ts`) and `CUTOFF_MIN_HZ` / `CUTOFF_MAX_HZ` (`brightness.ts` — update its test with them). Each change: tests, build, commit, push.

- [ ] **Step 4: Licence gate (spec D12, Noel).** Noel confirms from Epidemic's terms or support that his plan covers background music on a portfolio website, what happens if the subscription lapses, and serving the file to browsers. Record the answer, with its source and date, as a BUILD-PLAN Decision. Without it, do not merge.

- [ ] **Step 5: Record in `BUILD-PLAN.md`**
  - **Decisions (2026-10-09):** the track (D1), Blob not repo (D2), streamed (D4), elements in the gesture (D5), cutoff 2–18 kHz (D8, or the tuned values), the credit (D13), the licence answer (D12).
  - **Current figures:** base-path JS on `/` (number, % of budget, delta from 64,984); audio chunk gzip (was 1,783); a new row "Track (fetched only once sound is on)" with its bytes and bitrate. `/websites` unchanged at 58,752 — confirm.
  - **Known Gaps:** move "The sound reads like a horror or sci-fi film score" from Deferred 2026-10-07 to `docs/archive/` verbatim, with a one-line closing note pointing at this plan. Add under Cosmetic: "The emissions bus has no subscriber since the sound rework (spec D14) — ~100 B of inert code in `tip`; remove, or give it a listener."

- [ ] **Step 6: Push and open the PR**

```bash
npm run build
git add BUILD-PLAN.md docs/archive
git commit -m "docs: sound rework recorded — figures, decisions, licence"
git push -u origin feat/sound-track
gh pr create --title "Sound: a licensed track replaces the synthesised voice" --body "<summary of the five tasks, the figures, the licence answer>"
```
