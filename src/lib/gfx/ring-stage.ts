/**
 * The 3D ring's DOM side (Phase 12): decides whether the ring can mount, switches section 04
 * into it, and each drawn frame turns the cards from the scroll. The cards are the
 * server-rendered rail cards, never moved in the DOM — only restyled (`.ring--3d`) and given a
 * `matrix3d` from ring.ts — so every link, the hover-scroll and the focus ring stay native.
 *
 * Everything here is a function of the scroll, the tip and the pointer (design §4). The
 * meshes (ring-mesh.ts) are drawn from the `RingFrame` this returns, so the two renderers read
 * one set of numbers per frame.
 */

import { scrollToY } from '../motion/scroll';
import { refreshScroll } from '../motion/timeline';
import { onSignalCurve, signalTipY, signalXAtPageY } from '../signal/tip';
import { tipFraction } from '../signal/draw';
import {
  ARRIVAL_DRAW_VH,
  RING_CARD_COUNT,
  RING_TILT_DEG,
  arrival,
  cardAngle,
  cardMatrix,
  cardPose,
  cssMatrix3d,
  nearestCard,
  PIN_STEP_VH,
  POINTER_TILT_DEG,
  pinLength,
  pulseAt,
  rawSteps,
  SETTLE_ON_CARD_PX,
  ringRadius,
  settleTarget,
  stageLayout,
  stepOffset,
  stickyTop,
  turnSteps,
} from './ring';

/** How far below its place a card starts before its drop lands, px. */
const ARRIVAL_RISE_PX = 24;

/** A turn the reader asked for by focusing a card, not choreography, s. */
const FOCUS_TURN_S = 0.6;

/** A drag past this many px is a drag, and the click that ends it is swallowed. */
const DRAG_THRESHOLD_PX = 6;

/** Scroll that has been still this long has stopped. */
const SETTLE_AFTER_MS = 140;
const SETTLE_S = 0.4;

/** The pointer tilt's ease per drawn frame (the portrait's push), and when it has arrived, degrees. */
const POINTER_TILT_EASE = 0.18;
const POINTER_TILT_SETTLED_DEG = 0.01;
/** How much bigger the emission grows at the height of its flare. */
const FLARE_GROWTH = 0.6;

export interface RingFrame {
  /** Front point, page px — where the hoop meets the line this frame. */
  frontPageX: number;
  frontPageY: number;
  radius: number;
  tiltDeg: number;
  floorY: number;
  /** Steps turned (eased) and linear, for the cards and the pulse. */
  steps: number;
  raw: number;
  arrival: { hoop: number; drops: number; cards: number };
  /** Per card, in DOM order. */
  cards: { angleDeg: number; opacity: number }[];
}

export interface RingStage {
  /** Reads scroll and tip; writes the cards; returns the frame for the meshes, or null when not mounted. */
  update(): RingFrame | null;
  /** Restores the rail. Safe to call twice. */
  unmount(): void;
}

interface Options {
  section: HTMLElement;
  /** The camera's distance for the current viewport — CSS perspective must equal it. */
  cameraDistance: () => number;
  /** Something changed that needs a draw. */
  markDirty: () => void;
  /** Called once if the stage gives up (resize below the fit, an exception). */
  onDrop: () => void;
}

export function mountRingStage({ section, cameraDistance, markDirty, onDrop }: Options): RingStage | null {
  const rail = section.querySelector<HTMLElement>('.ring__rail');
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.card'));
  const emits = cards.map((card) => card.querySelector<HTMLElement>('[data-emit]'));
  const track = section.querySelector<HTMLElement>('[data-signal-split]');
  const stage = section.querySelector<HTMLElement>('.ring__scroller');
  if (!rail || !track || !stage || cards.length !== RING_CARD_COUNT) return null;

  // The rail's cards share one height (flex stretch), so any card's is the tallest.
  const cardWidth = cards[0].getBoundingClientRect().width;
  const cardHeight = cards[0].getBoundingClientRect().height;
  const radius = ringRadius(cardWidth);

  const layoutFor = (viewportHeight: number) =>
    stageLayout({ viewportHeight, cardHeight, radius, distance: cameraDistance(), tiltDeg: RING_TILT_DEG });
  if (!layoutFor(window.innerHeight).fits) return null;

  let isOn = false;
  let isDropped = false;
  /** Measured once the class is on: the rail's page top, the front point's page x. */
  const measured = { railTop: 0, frontPageX: 0, frontY: 0, floorY: 0, pin: 0, viewportHeight: 0 };
  /** The page scroll the ring last came to rest at — the settle reads the reader's direction from it. */
  let restY = 0;

  function measure(): void {
    const viewportHeight = window.innerHeight;
    const layout = layoutFor(viewportHeight);
    if (!layout.fits) {
      drop();
      return;
    }
    const pin = pinLength(viewportHeight);
    section.style.setProperty('--ring-pin', `${pin.toFixed(2)}px`);
    section.style.setProperty('--ring-front-y', `${layout.frontY.toFixed(2)}px`);
    section.style.setProperty('--ring-perspective', `${cameraDistance().toFixed(3)}px`);
    const railBox = rail!.getBoundingClientRect();
    const railTop = railBox.top + window.scrollY;
    const splitY = railTop + layout.frontY;
    // The curve's own x at the split, as the rail's track reads it — never the viewport centre.
    const curveX = signalXAtPageY(splitY);
    const frontPageX = curveX ?? railBox.left + window.scrollX + railBox.width / 2;
    section.style.setProperty('--ring-front-x', `${(frontPageX - (railBox.left + window.scrollX)).toFixed(2)}px`);
    Object.assign(measured, { railTop, frontPageX, frontY: layout.frontY, floorY: layout.floorY, pin, viewportHeight });
    markDirty();
  }

  function switchOn(): void {
    if (isOn || isDropped) return;
    isOn = true;
    // Off screen above — the reader has scrolled past — the rail grows above them. Chrome's
    // scroll anchoring did not hold their place (the next section jumped by the growth), so
    // the scroll moves by exactly what the section grew.
    const isAboveViewport = section.getBoundingClientRect().bottom <= 0;
    const heightBefore = section.offsetHeight;
    section.classList.add('ring--3d');
    measure();
    if (isAboveViewport && !isDropped) scrollToY(window.scrollY + section.offsetHeight - heightBefore, { immediate: true });
    restY = window.scrollY;
    refreshScroll();
  }

  // D14: turning 3D on changes the page's height, so only while the ring is off screen.
  const visibility = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      visibility.disconnect();
      switchOn();
    }
  });
  visibility.observe(section);

  const onResize = () => {
    if (isOn) measure();
  };
  window.addEventListener('resize', onResize);
  // Turning 3D on grows the page, the SVG renderer re-measures the curve, and the split's x is
  // only right once it has: follow every re-measure. Unchanged values write unchanged
  // properties, so this cannot feed back into another re-measure.
  const stopCurve = onSignalCurve(() => {
    if (isOn) measure();
  });

  /** Focus moves the ring (spec §9.04): any card focused, by any key, comes to the front. */
  const onFocusIn = (event: FocusEvent) => {
    if (!isOn) return;
    const card = (event.target as Element).closest<HTMLElement>('.card');
    const index = card ? cards.indexOf(card) : -1;
    if (index < 0) return;
    const target = measured.railTop + stepOffset(index, measured.viewportHeight);
    restY = target;
    if (Math.abs(window.scrollY - target) < 1) return;
    scrollToY(target, { duration: FOCUS_TURN_S });
  };
  section.addEventListener('focusin', onFocusIn);

  // Drag: mouse and pen only (touch scrolls natively). A drag of one card width turns one step.
  let drag: { startX: number; startScroll: number; isDragging: boolean } | null = null;
  let swallowNextClick = false;
  const onPointerDown = (event: PointerEvent) => {
    // A drag released outside the stage never gets its click here: never let it eat this one.
    swallowNextClick = false;
    if (!isOn || event.pointerType === 'touch' || event.button !== 0) return;
    drag = { startX: event.clientX, startScroll: window.scrollY, isDragging: false };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    if (!drag.isDragging && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    drag.isDragging = true;
    // Dragging left brings the next card in from the right.
    const pxPerStep = PIN_STEP_VH * measured.viewportHeight;
    scrollToY(drag.startScroll - (dx / cardWidth) * pxPerStep, { immediate: true });
  };
  const onPointerUp = () => {
    const wasDragging = drag?.isDragging ?? false;
    drag = null;
    if (wasDragging) {
      // A drag is its own aim: it settles on the card nearest where it was let go.
      restY = window.scrollY;
      settle();
    }
    swallowNextClick = wasDragging;
  };
  // The cards are links and links drag natively: a native drag cancels the pointer stream
  // (pointercancel) before the turn starts. CSS -webkit-user-drag would cover Chrome and Safari only.
  const onDragStart = (event: DragEvent) => {
    if (isOn) event.preventDefault();
  };
  const onClickCapture = (event: MouseEvent) => {
    if (!swallowNextClick) return;
    swallowNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  };
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('dragstart', onDragStart);
  stage.addEventListener('click', onClickCapture, true);

  // The pointer tilt (D13): mouse and pen over the stage add up to POINTER_TILT_DEG to the
  // look-down, eased per drawn frame in update(). Pointer-driven, so a still pointer goes quiet.
  const pointer = { clientX: 0, clientY: 0, isInWindow: false };
  let pointerTilt = 0;
  /** Whether a pointer at viewport y is in the stage's band — from measured numbers, no layout. */
  const isInStageBand = (clientY: number) => {
    const stageTop = stickyTop(window.scrollY, measured.railTop, measured.pin) - window.scrollY;
    return clientY >= stageTop && clientY <= stageTop + measured.viewportHeight;
  };
  const onPointerTilt = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.isInWindow = true;
    // Only a pointer that can move the ring draws: over the stage, or easing back from it.
    if (isOn && (pointerTilt !== 0 || isInStageBand(event.clientY))) markDirty();
  };
  const onPointerLeave = () => {
    pointer.isInWindow = false;
    if (isOn && pointerTilt !== 0) markDirty();
  };
  window.addEventListener('pointermove', onPointerTilt, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);

  // Settle (D10, Revision R2): when scrolling stops inside the pin, ease to a card in the
  // direction the reader was going.
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  function settle(): void {
    if (!isOn || isDropped || drag) return;
    const { railTop, pin, viewportHeight } = measured;
    const offset = window.scrollY - railTop;
    const isInsidePin = offset > 0 && offset < pin;
    if (!isInsidePin) {
      // Stopped outside the pin: that is the rest, or a reader who comes back in would read
      // as travelling from the card they left.
      restY = window.scrollY;
      return;
    }
    // Leaving through the lead or the tail keeps the card left as the rest: Lenis's ease ends in
    // 1px moves more than 140ms apart, and measured from a rest moved to the first of them, the last
    // reads as a nudge and pulls the reader back.
    const card = settleTarget(offset, restY - railTop, viewportHeight);
    if (card === null) return;
    const target = railTop + stepOffset(card, viewportHeight);
    restY = target;
    if (Math.abs(window.scrollY - target) > 1) scrollToY(target, { duration: SETTLE_S });
  }
  // Lenis drives native scroll, so this fires for wheel, keys, drag and Lenis's own easing; the
  // settle's own scroll ends on its target, where the next settle is a no-op.
  const onScroll = () => {
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, SETTLE_AFTER_MS);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  function drop(): void {
    if (isDropped) return;
    unmount();
    onDrop();
  }

  function unmount(): void {
    if (isDropped) return;
    isDropped = true;
    visibility.disconnect();
    window.removeEventListener('resize', onResize);
    stopCurve();
    section.removeEventListener('focusin', onFocusIn);
    stage.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    stage.removeEventListener('dragstart', onDragStart);
    stage.removeEventListener('click', onClickCapture, true);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onPointerTilt);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    drag = null;
    if (!isOn) return;
    // Mid-pin, the page is about to lose the pin's height: land the reader on the rail.
    const wasInsideRing = window.scrollY > measured.railTop - window.innerHeight && window.scrollY < measured.railTop + measured.pin;
    section.classList.remove('ring--3d');
    for (const name of ['--ring-pin', '--ring-front-y', '--ring-front-x', '--ring-perspective', '--ring-origin-x', '--ring-origin-y']) {
      section.style.removeProperty(name);
    }
    for (const card of cards) {
      card.style.removeProperty('transform');
      card.style.removeProperty('opacity');
      card.classList.remove('card--inert', 'card--front');
    }
    for (const emit of emits) emit?.style.removeProperty('transform');
    refreshScroll();
    if (wasInsideRing) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  }

  function update(): RingFrame | null {
    if (!isOn || isDropped) return null;
    const { railTop, frontPageX, frontY, floorY, pin, viewportHeight } = measured;
    const scrollY = window.scrollY;
    const stageTop = stickyTop(scrollY, railTop, pin);
    const frontPageY = stageTop + frontY;

    // Reads first, then writes: the stage's box is where the pointer tilt looks for the pointer.
    const stageLeft = rail!.getBoundingClientRect().left;
    const stageBox = stage!.getBoundingClientRect();
    const isPointerOverStage =
      pointer.isInWindow &&
      pointer.clientX >= stageBox.left &&
      pointer.clientX <= stageBox.right &&
      pointer.clientY >= stageBox.top &&
      pointer.clientY <= stageBox.bottom;

    // The perspective origin is the viewport's centre, wherever the stage is (parity with the camera).
    section.style.setProperty('--ring-origin-x', `${(document.documentElement.clientWidth / 2 - stageLeft).toFixed(2)}px`);
    section.style.setProperty('--ring-origin-y', `${(viewportHeight / 2 - (stageTop - scrollY)).toFixed(2)}px`);

    // The page scrolls in whole pixels, so a reader resting on a card can sit a fraction of a
    // pixel short of it (settleTarget's reasoning): within SETTLE_ON_CARD_PX is on it. Otherwise
    // the pulse parks, lit, at the foot of the drop instead of flaring — at 1280×800 on every card.
    const pinOffset = scrollY - railTop;
    const nearest = nearestCard(pinOffset, viewportHeight);
    const isOnCard = Math.abs(pinOffset - stepOffset(nearest, viewportHeight)) <= SETTLE_ON_CARD_PX;
    const raw = isOnCard ? nearest : rawSteps(pinOffset, viewportHeight);
    const steps = turnSteps(raw);
    const splitY = railTop + frontY;
    const arrived = arrival(tipFraction(signalTipY(), splitY, ARRIVAL_DRAW_VH * viewportHeight));
    // Pointer high opens the ellipse, low closes it. Eased toward the target, and drawing again
    // until it gets there; then it snaps, so it is exactly 0 once the pointer has gone.
    const targetTilt = isPointerOverStage ? -(pointer.clientY / viewportHeight - 0.5) * 2 * POINTER_TILT_DEG : 0;
    pointerTilt += (targetTilt - pointerTilt) * POINTER_TILT_EASE;
    if (Math.abs(targetTilt - pointerTilt) > POINTER_TILT_SETTLED_DEG) markDirty();
    else pointerTilt = targetTilt;
    const tiltDeg = RING_TILT_DEG + pointerTilt;
    const pulse = pulseAt(raw);

    const poses = cards.map((card, i) => {
      const angleDeg = cardAngle(i, steps);
      const pose = cardPose(angleDeg);
      const opacity = pose.opacity * arrived.cards;
      const rise = (1 - arrived.cards) * ARRIVAL_RISE_PX;
      card.style.transform = cssMatrix3d(cardMatrix(angleDeg, radius, tiltDeg, rise));
      card.style.opacity = opacity.toFixed(4);
      card.classList.toggle('card--inert', pose.isInert || arrived.cards < 0.3);
      card.classList.toggle('card--front', pose.isFront);
      // The emission flares as the pulse lands on it (design §4), and is its own size otherwise.
      const isFlaring = i === pulse.card && pulse.flare > 0;
      const emit = emits[i];
      if (emit) emit.style.transform = isFlaring ? `scale(${(1 + FLARE_GROWTH * pulse.flare).toFixed(3)})` : '';
      return { angleDeg, opacity };
    });

    return { frontPageX, frontPageY, radius, tiltDeg, floorY, steps, raw, arrival: arrived, cards: poses };
  }

  return { update, unmount };
}
