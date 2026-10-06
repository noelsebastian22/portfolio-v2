/**
 * The Web Audio graph (Phase 13, spec D4–D6, D10). Lazy: only `connect.ts` imports it, and
 * only `islands/sound.ts` imports that, with `import()`, once sound is turned on.
 *
 *   drone ─┐
 *   notes ─┴─► lowpass ─┬──────────────► master ─► out
 *                       └─► reverb ─► wet ─┘  ▲
 *   tick ─► bandpass ─────────────────────────┘
 *
 * Every voice is an oscillator or generated noise, so no audio file ships. The values are
 * starting values, tuned by ear on the preview (spec §6).
 */

import type { EmissionEvent } from '../signal/emissions';
import { cutoffFor, notesFor } from './score';

export interface AudioEngine {
  start(): void;
  stop(): void;
  /** Plays the event's notes at audio-clock time `at`. */
  emit(event: EmissionEvent, at: number): void;
  /** 0..1 — scroll speed, heard as the lowpass opening. */
  setVelocity(velocity: number): void;
  tick(): void;
}

const MASTER_LEVEL = 0.8;
const FADE_IN_S = 1.5;
const FADE_OUT_S = 0.4;

const DRONE_HZ = 55; // A1
const DRONE_LEVEL = 0.05; // about −26 dB
const DRONE_DETUNE_CENTS = 7;
const DRONE_BREATH_HZ = 0.07;
const DRONE_BREATH_CENTS = 4;

const NOTE_LEVEL = 0.18;
const NOTE_ATTACK_S = 0.005;
const NOTE_DECAY_S = 1.4;
const NOTE_OVERTONE_LEVEL = 0.3;

const REVERB_S = 2;
const REVERB_WET = 0.25;

const CUTOFF_GLIDE_S = 0.25;
const CUTOFF_STEP = 0.005; // velocity changes smaller than this are not worth an automation event

const TICK_S = 0.012;
const TICK_HZ = 3200;
const TICK_LEVEL = 0.02; // about −34 dB
const TICK_MIN_GAP_S = 0.06;

/** Noise with an exponential tail: a room, generated rather than downloaded. */
function impulseResponse(ctx: AudioContext): AudioBuffer {
  const length = Math.round(ctx.sampleRate * REVERB_S);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp((-6 * i) / length);
  }
  return buffer;
}

function noiseBurst(ctx: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.round(ctx.sampleRate * TICK_S));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  return buffer;
}

export function createAudioEngine(ctx: AudioContext): AudioEngine {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.7;
  lowpass.frequency.value = cutoffFor(0);
  lowpass.connect(master);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulseResponse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = REVERB_WET;
  lowpass.connect(reverb).connect(wet).connect(master);

  // The drone: two saws a few cents apart beating slowly, a triangle an octave up for body,
  // and a very slow LFO pulling the saws' detune in opposite directions so it breathes.
  const drone = ctx.createGain();
  drone.gain.value = DRONE_LEVEL;
  drone.connect(lowpass);
  const sawHigh = ctx.createOscillator();
  const sawLow = ctx.createOscillator();
  const body = ctx.createOscillator();
  sawHigh.type = sawLow.type = 'sawtooth';
  sawHigh.frequency.value = sawLow.frequency.value = DRONE_HZ;
  sawHigh.detune.value = DRONE_DETUNE_CENTS;
  sawLow.detune.value = -DRONE_DETUNE_CENTS;
  body.type = 'triangle';
  body.frequency.value = DRONE_HZ * 2;
  const breath = ctx.createOscillator();
  breath.frequency.value = DRONE_BREATH_HZ;
  const breathUp = ctx.createGain();
  const breathDown = ctx.createGain();
  breathUp.gain.value = DRONE_BREATH_CENTS;
  breathDown.gain.value = -DRONE_BREATH_CENTS;
  breath.connect(breathUp).connect(sawHigh.detune);
  breath.connect(breathDown).connect(sawLow.detune);
  for (const osc of [sawHigh, sawLow, body]) osc.connect(drone);
  for (const osc of [sawHigh, sawLow, body, breath]) osc.start();

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
  let suspendTimer: ReturnType<typeof setTimeout> | undefined;

  function rampMaster(target: number, seconds: number): void {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + seconds);
  }

  function playNote(hz: number, at: number, level: number): void {
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + NOTE_ATTACK_S);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_ATTACK_S + NOTE_DECAY_S);
    envelope.connect(lowpass);

    const fundamental = ctx.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.value = hz;
    fundamental.connect(envelope);

    const overtone = ctx.createOscillator();
    overtone.frequency.value = hz * 2;
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = NOTE_OVERTONE_LEVEL;
    overtone.connect(overtoneGain).connect(envelope);

    const end = at + NOTE_ATTACK_S + NOTE_DECAY_S + 0.05;
    for (const osc of [fundamental, overtone]) {
      osc.start(at);
      osc.stop(end);
    }
    // Disconnect when done so a long read does not accumulate silent nodes.
    fundamental.onended = () => envelope.disconnect();
  }

  return {
    start() {
      if (suspendTimer !== undefined) clearTimeout(suspendTimer);
      suspendTimer = undefined;
      void ctx.resume();
      rampMaster(MASTER_LEVEL, FADE_IN_S);
    },
    stop() {
      rampMaster(0, FADE_OUT_S);
      // Suspend once silent: no CPU and no audio thread while sound is off.
      suspendTimer = setTimeout(() => {
        suspendTimer = undefined;
        void ctx.suspend();
      }, FADE_OUT_S * 1000 + 50);
    },
    emit(event, at) {
      const notes = notesFor(event);
      for (const hz of notes) playNote(hz, at, NOTE_LEVEL / notes.length);
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
      const source = ctx.createBufferSource();
      source.buffer = tickNoise;
      source.connect(tickFilter);
      source.start(now);
    },
  };
}
