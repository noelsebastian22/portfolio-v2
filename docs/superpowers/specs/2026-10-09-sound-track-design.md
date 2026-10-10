# Sound rework — a licensed track: design

**Date:** 2026-10-09 · **Status:** approved in conversation (Noel: "Okay, that sounds all right,
I guess") · **Blocked on:** Noel's Epidemic Sound account — the file, and the licence check of
D11 · **Supersedes:** the voice of `2026-10-06-phase-13-audio-design.md` (D3, D4, D7, D12, D14 —
see §6) · **Parent spec:** `2026-09-19-signal-path-design.md` (§7, §8, §9.00, §10)

## 1. Intent

The synthesised voice is retired. Noel heard it on PR #4's preview and it read as a horror or
sci-fi score (Deferred, 2026-10-07); a lo-fi re-voicing on 2026-10-08 was not it either. What he
wants is the feel of saifullah.dev's "Ambient / Lo-fi" track, and he found the music he wants:
**"A New Daydream" by DEX 1200, from Epidemic Sound.**

So sound becomes that track, looping, with two things kept from Phase 13 that make it this site's
rather than a background player: **scroll speed is heard as brightness** (a lowpass on the track
opens as the reader scrolls faster), and **a quiet tick on hovering anything interactive**. The
emission notes go — a fixed scale over a recorded track in an unknown key would clash.

Nothing about the zero-JS page, first paint or LCP changes. A visitor who never presses the toggle
downloads no music and no audio code.

**Not taken from saifullah.dev:** its files. They are its author's, or licensed to its author;
this site uses its own licensed copy of its own chosen track.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **The track is "A New Daydream" — DEX 1200 (Epidemic Sound)**, licensed under Noel's subscription. | Noel's choice, by ear, after comparing against saifullah.dev. |
| D2 | **The repo never holds the track.** Source (`assets-src/audio/`) and transcode output (`assets-src/audio/out/`) are gitignored. The served copy lives in **Vercel Blob**. | `portfolio-v2` is a public GitHub repo; committing the file to `public/` would redistribute the full track from the source tree, which is not "playing it on my website". Noel's choice over making the repo private. |
| D3 | **`scripts/audio.mjs` (ffmpeg) prepares it:** EBU R128 loudness normalisation (`loudnorm=I=-20:TP=-2:LRA=11`), a 15 ms fade at each end so the loop seam does not click, AAC-LC 128 kbps stereo 44.1 kHz in `.m4a` with `-movflags +faststart` so it streams. `npm run audio`; fails with a clear message if the source is missing. | AAC plays in every target browser; `+faststart` puts the index first so playback starts before the file finishes. Normalising once means the runtime level is one constant. |
| D4 | **Streamed, not decoded.** An `HTMLAudioElement` (`loop`) feeds the Web Audio graph through a `MediaElementAudioSourceNode`. | Plays within about a second. Decoding a ~3 min track would wait for the whole file and hold ~60 MB of PCM. Cost: a tiny seam where `loop` wraps (AAC priming) — once per play-through, accepted. |
| D5 | **The island creates the element and its source node inside the gesture.** `islands/sound.ts`, in the same synchronous call that already creates the `AudioContext` (Phase 13 D8): `new Audio()`, `crossOrigin = 'anonymous'`, `loop = true`, `src = TRACK_URL`, `ctx.createMediaElementSource(audio)`, then `audio.play()`. Element and source are handed to `connectAudio`. | Safari unlocks a media element only by a `play()` inside the gesture. Routing it into the graph *before* `play()` keeps it silent until the lazy engine connects it, so no full-volume blip while the chunk loads. |
| D6 | **Never fetched unless toggled.** No element exists, and so no request is made, until the toggle (or, with `on` stored, the first gesture — Phase 13 D9). | Spec §8: never fetched if never pressed. |
| D7 | **Graph:** `track ─► lowpass (speed) ─► master ─► out`, `tick ─► bandpass ─► master`. The drone, notes and reverb are deleted — the track has its own mix. Track level `TRACK_LEVEL`, starting 0.6, tuned by ear. | Smallest graph that keeps both reactive layers. |
| D8 | **Speed → cutoff, retuned for a full mix.** Measurement unchanged (Phase 13 D5: `scrollY` deltas on `onTick`, smoothed, 3,000 px/s = 1). Cutoff from **2 kHz at rest to 18 kHz at full speed**, exponential, `setTargetAtTime` τ 0.25 s. Starting values, tuned by ear. | At rest the track sits warm but clear, not muffled — a reader spends most of the visit not scrolling. Fast scrolling opens it fully. |
| D9 | **Hover tick unchanged** (Phase 13 D6). | Noel chose to keep it. |
| D10 | **Off fades out (0.4 s), then pauses the track and suspends the context; on resumes from where it stopped.** Hidden tab → off, visible → on (Phase 13 D10). First start fades in over 1.5 s. | No click, no music from a background tab; resuming mid-track rather than restarting is what a player does. |
| D11 | **Failure is visible** (Phase 13 D11): no `AudioContext`, the import fails, or the element fires `error` (network, CORS, decode) → `Sound · unavailable`. A `play()` rejected with `NotAllowedError` is not failure: it re-arms for the next gesture, as a suspended context already does. | The button never claims a state that is not true. |
| D12 | **Licence gate.** Not merged until Noel confirms in writing (Epidemic's terms or support) that his plan covers: background music on a personal/portfolio website; what happens to that use if the subscription lapses; and serving the file to browsers. The answer is recorded in BUILD-PLAN Decisions. | Never ship what cannot be traced — the same rule as "never invent a number". |
| D13 | **Credit in the footer colophon**, on pages that show it (`/`, 404 — not `/websites`, which hides the colophon and has no audio): "Music: A New Daydream — DEX 1200 (Epidemic Sound)". Server-rendered from `TRACK_CREDIT`. | Cheap and honest; Epidemic does not require it. Noel may veto. |
| D14 | **The emissions bus stays**, now with no subscriber. | Removing it touches six islands; it is ~100 B of inert code. Recorded as a Known Gap, not removed here. |
| D15 | **Reduced motion: track, cutoff and ticks** — the same as everyone. | With no emission notes, reduced motion loses nothing (supersedes Phase 13 D12). |
| D16 | **Preloader (Phase 15):** on completion, if sound is on, the track fades in — there is no "first note" any more. | Parent spec §9.00 is amended. |

## 3. Units

| File | Ships | Job |
|---|---|---|
| `scripts/audio.mjs` | — | D3. Reads `assets-src/audio/a-new-daydream.(wav\|mp3)`, writes `assets-src/audio/out/a-new-daydream.m4a`, prints its duration and size. |
| `src/lib/audio/track.ts` | main (URL) / build (credit) | `TRACK_URL` (the Blob URL, set once after upload) and `TRACK_CREDIT`. Two named exports, so the island's import pulls only the URL. |
| `src/islands/sound.ts` | main | As Phase 13, plus D5: creates the element and source node in the gesture, handles `NotAllowedError` and `error` (D11), passes `{ track, source }` to `connectAudio`. |
| `src/lib/audio/brightness.ts` | lazy | Renamed from `score.ts` — with the notes gone it is not a score. Keeps `cutoffFor(v)` (new range, D8) and `normaliseSpeed`. `SCALE_HZ`, `RESOLVE_HZ`, `notesFor`, `createNoteGate` and the timing constants are deleted. |
| `src/lib/audio/engine.ts` | lazy | `createAudioEngine(ctx, track, source): AudioEngine` — D7, D10. `start()` (play + fade in), `stop()` (fade out, then pause + suspend), `setVelocity(v)`, `tick()`. No `emit`. |
| `src/lib/audio/connect.ts` | lazy | `connectAudio(ctx, track, source)`: builds the engine, samples speed through `onTick`, adds the hover listener. No longer subscribes to the bus. |
| `src/components/Footer.astro` | — | The D13 credit line in the colophon. |
| `.gitignore` | — | `assets-src/audio/`. |

## 4. Data flow

```
click ─► sound.ts ─ new AudioContext() · new Audio(TRACK_URL) · createMediaElementSource · play()
                    └─► import('lib/audio/connect') ─► connectAudio(ctx, track, source) ─► engine.start()
onTick (timeline.ts) ─► scrollY delta ─► normaliseSpeed ─► cutoffFor ─► lowpass.frequency
pointerover a/button/card ─► engine.tick
Blob (HTTPS, CORS *, byte ranges) ─► <audio> ─► MediaElementSource ─► lowpass ─► master ─► out
```

## 5. Budget and hosting checks

- **Main bundle on `/`:** about +150 B gzip expected (element creation, two handlers, the URL
  string). Measured and recorded.
- **Lazy chunk:** shrinks (the score and note voice go). Still ≤ 5,120 B; measured and recorded.
- **Track:** not JS and not in `dist/`. Expected 2–3 MB; recorded under Current figures as
  "track, fetched only once sound is on". Cap: 4 MB — over that, drop to 96 kbps.
- **Blob must answer three things before any code depends on it**, checked with `curl` on the
  uploaded URL: `Access-Control-Allow-Origin` present (without it `MediaElementSource` outputs
  silence); a `Range: bytes=0-1` request returns `206` (Safari will not play media without byte
  ranges); `Content-Type: audio/mp4`. **Fallback** if CORS or ranges fail: a `vercel.json`
  rewrite, `/audio/a-new-daydream.m4a` → the Blob URL, making it same-origin.

## 6. Superseded and amended

- **Phase 13 spec:** D3 (score), D4 (voice), D7 (note timing), D12 (reduced motion) and D14
  (preloader's first note) are superseded by this document; D1–D2 (the bus) stand, inert (D14
  here); D5, D6, D8–D11, D13 stand as amended above.
- **Parent spec §8** is rewritten: a licensed track, streamed and lazy; scroll speed heard as
  brightness; the hover tick. "The music is not ambient decoration… it is the same signal being
  watched" becomes: the music is chosen, but the reader still plays it — the scroll is the
  transport for its brightness.
- **Parent spec §7, AGENTS.md, BUILD-PLAN Global Constraints:** "nothing animates on a timer
  except the audio drone" → "except the music".
- **Parent spec §9.00:** "the first note sounds" → "the music fades in" (D16).
- **Parent spec §10 assets table:** a row for the track — "Licensed — Epidemic Sound, hosted on
  Vercel Blob".

## 7. Verification

- **Vitest:** `brightness.ts` — cutoff endpoints (2 kHz, 18 kHz), monotonic, clamped; speed
  normalisation. The note and gate tests are deleted with the code they tested.
- **Build:** `npm run build` green; `npm run budget` numbers recorded; the lazy chunk absent from
  every built page's `modulepreload` and HTML.
- **Network:** a headless load of `/` with no click requests no `.m4a` and no audio chunk.
- **Hosting:** the three `curl` checks of §5 pass on the real Blob URL.
- **Noel listens** — Chrome and Safari on the PR preview: starts on toggle, resumes on toggle,
  silent in a background tab, brightens on fast scroll, tick on hover, credit in the footer.
  `TRACK_LEVEL` and the cutoff range are tuned there.
- **Licence gate (D12)** recorded before merge.
