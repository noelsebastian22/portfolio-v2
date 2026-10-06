# Phase 13 — Audio engine: design

**Date:** 2026-10-06 · **Status:** approved in conversation (Noel: "go with all the recommended
approaches, make the best decision for this website") · **Parent spec:**
`2026-09-19-signal-path-design.md` (§8 Sound Design, §9.00 Preloader, §11 Accessibility, §12
Performance Budget, §14 `/websites`)

## 1. Intent

Sound is off until the reader asks for it. Once on, the page plays itself: a warm, low drone sits
under everything, every emission on the line sounds one note as the tip lands on it, the phrase
climbs as the career does, and the final emission in Contact resolves it. Scrolling fast opens a
lowpass filter, so speed is heard as brightness. Hovering anything interactive gives a quiet tick.

The music is not decoration on top of the line — it is driven by the same numbers that draw it.
A note sounds on the frame its emission visibly lands, because the island that lands it is the
one that announces it.

Nothing about the zero-JS page, first paint or LCP changes: the engine is never fetched unless
the toggle is pressed.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Emissions reach audio through a tiny bus**, `lib/signal/emissions.ts`: `announceEmission(section, index)` and `onEmission(fn)`. Each island calls it from the paint it already runs. | Sight and sound come from one number per emission (Noel chose A over the audio chunk re-deriving six islands' arrival rules). With no subscriber the call is a loop over an empty set. |
| D2 | **Down only.** An emission is announced when its progress crosses into "arrived" from a *painted* not-arrived state: `prev ≥ 0 && prev < 1 && p ≥ 1` (or `false → true` for Nine Years' class toggle). Unmeasured (`-1`) → arrived never announces. | Noel's choice. The scroll is the transport, so the sound follows the playhead forward. The unmeasured rule keeps a reload mid-page, a resize re-measure or reduced motion's synchronous final state from firing a burst. |
| D3 | **Deterministic score.** A minor pentatonic over two octaves, ten degrees, A3 → G5. Each section's emissions climb from a section start degree; the final emission resolves to A2 under A3. | The page plays the same phrase every read — the line *is* the score. Minor pentatonic cannot clash in any order; major reads cheerful. |
| D4 | **Warm analogue voice.** Drone: two saws ±7 cents at A1 plus a triangle at A2, through the master lowpass, about −26 dB, with a 0.07 Hz LFO breathing the detune. Notes: triangle + sine an octave up, 5 ms attack, ~1.4 s exponential decay. Reverb: a generated 2 s noise impulse, 25% wet. | Noel's choice (warm analogue over clinical or telemetry). Generated, so no file ships. The drone's LFO is the one timer §7 permits. |
| D5 | **Velocity → cutoff.** Scroll speed is measured in the lazy chunk from `scrollY` deltas on the shared GSAP ticker, smoothed, normalised to 0..1 (3,000 px/s = 1), and moves the master lowpass from 450 Hz to 2.8 kHz with `setTargetAtTime` (τ 0.25 s). | Works with Lenis and with native reduced-motion scroll; `scroll.ts` is untouched. The time constant makes it glide. |
| D6 | **Hover tick** — `tick()`: a 12 ms band-passed noise click at about −34 dB on mouse `pointerover` of `a`, `button`, `[data-card-link]`; once per element entered, at most one per 60 ms. | Noel's choice (A: in this phase). Mouse only — a tap is not a hover. |
| D7 | **Note timing.** A 150 ms cooldown per emission, and a global spacing of 70 ms: a note asked for too soon is scheduled at the next slot; one that would sound more than 350 ms late is dropped. | A nav jump through the whole page plays a fast run, not a cluster; a jittery trackpad cannot machine-gun one note. |
| D8 | **The `AudioContext` is created in the main bundle, inside the gesture.** `islands/sound.ts` makes it (and calls `resume()`) synchronously in the click, then `import()`s the engine and hands it the context: `createAudioEngine(ctx)`. | Safari only unlocks audio inside the gesture's own call stack; creating the context after an `await import()` can leave it suspended. The constructor is a few bytes; the graph is the lazy part. |
| D9 | **State persists in `localStorage`** (`sound` = `on` / `off`). On a load with `on` stored, the button shows pressed and nothing is fetched until the first `pointerdown`, `keydown` or `touchend` anywhere — the first moment a browser allows sound. A gesture on the toggle itself is left to the toggle. | Spec §8. Browsers forbid sound before interaction; showing "on" and starting at the first gesture is honest about both. |
| D10 | **Off fades out (0.4 s) and suspends**; the chunk stays loaded. A hidden tab suspends, a visible one resumes (if on). On first start the master fades in over 1.5 s. | No click on toggle; no audio from a background tab. |
| D11 | **Failure is visible.** No `AudioContext`, or the import fails: the button returns to unpressed, `off` is stored, and the label reads `Sound · unavailable`. | The button never claims a state that is not true. |
| D12 | **Reduced motion: drone, cutoff and ticks, no emission notes.** Under reduced motion the emissions are final from the start, so none ever arrives (D2). | Sound follows sight; there is no arrival to hear. |
| D13 | **`/websites` gets no audio** (§14): the toggle lives in `Nav.astro`, which `/websites` does not use, and nothing there subscribes. | Parent spec. |
| D14 | **The preloader's first note and its one-off toggle offer stay in Phase 15.** | They belong to a component that does not exist yet. |

## 3. Units

| File | Ships | Job |
|---|---|---|
| `src/lib/signal/emissions.ts` | main | The bus. Types `EmissionSection = 'years' \| 'work' \| 'stack' \| 'ring' \| 'contact'`, `EmissionEvent = { section, index }`. `announceEmission`, `onEmission` (returns an unsubscribe). Pure, no DOM. |
| `src/islands/sound.ts` | main | `mountSound()`: reads/writes `localStorage`, owns `aria-pressed` and the label, creates the `AudioContext` in the gesture, `import()`s `lib/audio/connect`, arms the first-gesture start (D9), suspends on hidden tabs (D10), reverts on failure (D11). |
| `src/lib/audio/score.ts` | lazy | Pure: `SCALE_HZ` (ten degrees), `noteFor({ section, index })` → Hz, `cutoffFor(v)` → Hz, `normaliseSpeed(pxPerSecond)` → 0..1, and a `createNoteGate()` with the cooldown and spacing of D7 (`schedule(key, now)` → start time or `null`). |
| `src/lib/audio/engine.ts` | lazy | `createAudioEngine(ctx): AudioEngine` — the graph of D4/D5/D6. `start()`, `stop()`, `emit(event)`, `setVelocity(v)`, `tick()`. |
| `src/lib/audio/connect.ts` | lazy | `connectAudio(ctx)`: builds the engine, subscribes it to the bus, samples velocity on `gsap.ticker`, adds the hover listener; returns `{ start, stop }` for the toggle. |

`Nav.astro` loses `aria-disabled` and its inert styling, and gains `<script>` mounting the island.
The label is `Sound · off` / `Sound · on` (`Sound · unavailable` on failure, D11); the state is in
`aria-pressed` too, so it is never colour- or text-only.

### The score (D3)

`SCALE_HZ`: A3 220.00, C4 261.63, D4 293.66, E4 329.63, G4 392.00, A4 440.00, C5 523.25,
D5 587.33, E5 659.26, G5 783.99.

| Section | Emissions | Start degree | Notes |
|---|---|---|---|
| `years` | 5, one per engagement | 0 | A3 → G4 |
| `work` | one per diagram with an emit (3 today) | 2 | D4 → … |
| `stack` | one per operator | 4 | G4 → … |
| `ring` | 2D: the drops land together → index 0. 3D: the line's arrival → 0, then each card turned to the front → its index | 5 | A4 → E5 |
| `contact` | 1 | — | A2 + A3, the resolve |

`degree = min(9, start + index)`. Counts come from the DOM; nothing in the score hard-codes them.

### Where each island announces (D2)

- **`years.ts`** — per emission, the `is-arrived` boolean; announce on `false → true` after the
  first callback (the first callback only records state).
- **`work.ts`** — per figure, its diagram progress `p` against the figure's previous painted value.
- **`stack.ts`**, **`contact.ts`** — `op.painted` / `painted` already hold the previous `p` (`-1`
  unmeasured); announce on the crossing before it is overwritten.
- **`ring.ts`** (2D) — the split's `painted` → one announce at index 0. Skipped in 3D, as its
  paint already is.
- **`ring/stage.ts`** (3D) — `fan.opacity` crossing to 1 → index 0; `nearestCard` increasing from
  a shown card → the new front's index. Decreasing (scrolling back) is silent.

## 4. Data flow

```
click ─► sound.ts ─ new AudioContext() + resume() ─► import('lib/audio/connect') ─► connectAudio(ctx)
                                                                                    │
island paint ─► announceEmission(section, i) ─► onEmission ─► gate.schedule ─► engine.emit
gsap.ticker ─► scrollY delta ─► normaliseSpeed ─► engine.setVelocity
pointerover a/button/card ─► engine.tick
```

## 5. Budget

- Main bundle on `/`: ≤ +1 KB gzip (bus + toggle island). Recorded with its number.
- Lazy chunk (`connect` + `engine` + `score`): ≤ 5 KB gzip. Recorded.
- The lazy chunk must not appear in any page's `modulepreload` links — the integration walks
  static imports only, so a dynamic `import()` stays out; the build check confirms it.
- No audio file ships.

## 6. Verification

- **Vitest:** `emissions.ts` (subscribe, unsubscribe, no subscriber is a no-op) and `score.ts`
  (degree mapping and clamp, the resolve, cutoff endpoints and monotonicity, speed
  normalisation, gate cooldown/spacing/drop).
- **Build:** `npm run build` green; `npm run budget` numbers recorded; `grep` the built
  `index.html` for the lazy chunk's name — absent.
- **Network:** a headless load of `/` with no click fetches no audio chunk.
- **Noel listens** on the preview deployment before merge — the voice values in D4 are starting
  values, tuned by ear there.
