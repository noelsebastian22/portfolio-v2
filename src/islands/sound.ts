/**
 * The sound toggle (Phase 13, spec D8–D11). Small and in the main bundle; everything that
 * makes a sound is behind the `import()` below and is never fetched until sound is turned on.
 *
 * The `AudioContext` is created here, synchronously inside the gesture, and handed to the
 * lazy chunk: Safari unlocks audio only inside the gesture's own call stack, and creating
 * the context after an `await import()` can leave it suspended for good.
 */

import type { AudioControl } from '../lib/audio/connect';

const STORAGE_KEY = 'sound';
const LABEL = { off: 'Sound · off', on: 'Sound · on', unavailable: 'Sound · unavailable' } as const;
/** The first events a browser lets start audio (spec D9). */
const UNLOCKING_GESTURES = ['pointerdown', 'keydown', 'touchend'] as const;

function readStoredOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false; // storage blocked: off, as on a first visit
  }
}

function storeOn(isOn: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, isOn ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice lasts this page only.
  }
}

export function mountSound(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
  if (!button) return;

  const AudioContextClass: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  let isOn = readStoredOn();
  let ctx: AudioContext | undefined;
  let control: AudioControl | undefined;
  let loading: Promise<AudioControl> | undefined;

  function render(): void {
    button!.setAttribute('aria-pressed', String(isOn));
    button!.textContent = isOn ? LABEL.on : LABEL.off;
  }

  /** The toggle never claims a state that is not true (spec D11). */
  function becomeUnavailable(): void {
    isOn = false;
    storeOn(false);
    disarm();
    control?.stop();
    button!.setAttribute('aria-pressed', 'false');
    button!.setAttribute('aria-disabled', 'true');
    button!.textContent = LABEL.unavailable;
  }

  /** Must be called inside a user gesture. */
  function play(): void {
    try {
      ctx ??= new AudioContextClass!();
    } catch {
      becomeUnavailable();
      return;
    }
    const context = ctx;
    void context.resume().then(() => {
      // Not every event unlocks audio everywhere; if this one did not, wait for the next.
      if (isOn && context.state !== 'running') arm();
    });
    loading ??= import('../lib/audio/connect').then(({ connectAudio }) => connectAudio(context));
    loading.then(
      (loaded) => {
        control = loaded;
        // The reader may have turned it off again while the chunk was on its way.
        if (isOn && !document.hidden) loaded.start();
      },
      () => becomeUnavailable(),
    );
  }

  function onUnlockingGesture(event: Event): void {
    // A press on the toggle is the toggle's to handle — with `on` stored it turns sound off.
    if (event.target instanceof Node && button!.contains(event.target)) return;
    disarm();
    if (isOn) play();
  }

  function arm(): void {
    for (const type of UNLOCKING_GESTURES) document.addEventListener(type, onUnlockingGesture, { capture: true });
  }

  function disarm(): void {
    for (const type of UNLOCKING_GESTURES) document.removeEventListener(type, onUnlockingGesture, { capture: true });
  }

  if (!AudioContextClass) {
    becomeUnavailable();
    return;
  }

  render();
  if (isOn) arm();

  button.addEventListener('click', () => {
    if (button.getAttribute('aria-disabled') === 'true') return;
    isOn = !isOn;
    storeOn(isOn);
    render();
    disarm();
    if (isOn) play();
    else control?.stop();
  });

  // No sound from a background tab (spec D10).
  document.addEventListener('visibilitychange', () => {
    if (!control || !isOn) return;
    if (document.hidden) control.stop();
    else control.start();
  });
}
