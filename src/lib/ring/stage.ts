/**
 * The 3D ring (Phase 12, revision R4): decides whether the ring fits, switches section 04 into
 * it, and each drawn frame turns the cards from the scroll. The cards are the server-rendered
 * rail cards, never moved in the DOM — only restyled (`.ring--3d`) and given a `matrix3d` from
 * geometry.ts — so every link, the hover-scroll and the focus ring stay native.
 *
 * Its own chunk, loaded by section 04's script after its gate (gate.ts) — not by the WebGL
 * scene: the ring is CSS 3D and needs no WebGL. Everything here is a function of the scroll,
 * the tip and the pointer (design §4), drawn on change only, in the scroll driver's tick
 * (render-schedule.ts) — never a free loop.
 */

import { gsap } from 'gsap';
import { createRenderSchedule } from '../gfx/render-schedule';
import { scrollToY } from '../motion/scroll';
import { onPageProgress, refreshScroll } from '../motion/timeline';
import { onSignalCurve, onSignalTip, signalTipY, signalXAtPageY } from '../signal/tip';
import { tipFraction } from '../signal/draw';
import {
  ARRIVAL_DRAW_VH,
  CARD_FACING_SHARE,
  PERSPECTIVE_PX,
  RING_CARD_COUNT,
  RING_TILT_DEG,
  cardAngle,
  cardMatrix,
  cardPose,
  cardTop,
  cssMatrix3d,
  fanOut,
  frontness,
  liftOffset,
  nearestCard,
  PIN_STEP_VH,
  POINTER_TILT_DEG,
  pinLength,
  pointerTiltRoom,
  rawSteps,
  recede,
  ringRadius,
  settleTarget,
  stackOffset,
  stageLayout,
  stepOffset,
  stickyTop,
  turnSteps,
} from './geometry';
import { RING_MIN_VIEWPORT_WIDTH } from './gate';

/** A turn the reader asked for by focusing a card, not choreography, s. */
const FOCUS_TURN_S = 0.45;

/** A drag past this many px is a drag, and the click that ends it is swallowed. */
const DRAG_THRESHOLD_PX = 6;

/**
 * Scroll that has been still this long has stopped; the snap then lands the card in the
 * direction of travel over `SETTLE_S`, on a crisp ease-out — it starts at speed, as the scroll
 * it follows was moving, and slows onto the card (revision R4).
 */
const SETTLE_AFTER_MS = 110;
const SETTLE_S = 0.3;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** The pointer float's ease per drawn frame (the portrait's push), and when each part has arrived. */
const POINTER_EASE = 0.18;
const POINTER_TILT_SETTLED_DEG = 0.01;
const POINTER_LIFT_SETTLED_PX = 0.05;
/**
 * How far a side card under the pointer lifts toward the viewer, px at full size. Along its
 * top-centre's line of sight (liftOffset), so it grows a little on screen about the point it
 * hangs from. Side cards only, fading out with `frontness`: any lift takes the front card off
 * the identity matrix, and its text visibly softens (checked at 1440×900) — the front card
 * answers the pointer with its hover-scroll instead.
 */
const POINTER_LIFT_PX = 18;
/** How much of its overlay a fully lifted side card sheds, so the lift reads as coming forward. */
const LIFT_BRIGHTEN = 0.35;

export interface RingStage {
  /** Reads scroll and tip; writes the cards. A no-op when not switched on. */
  update(): void;
  /** Restores the rail. Safe to call twice. */
  unmount(): void;
}

/**
 * Mounts the ring over section 04's rail, or returns null when it does not fit this window
 * (D12, R3) — the rail stays. Any exception afterwards, in a draw or a re-measure, unmounts it:
 * the rail comes back and the reader keeps their place (design §5).
 */
export function mountRingStage({ section }: { section: HTMLElement }): RingStage | null {
  const rail = section.querySelector<HTMLElement>('.ring__rail');
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.card'));
  const emits = Array.from(section.querySelectorAll<HTMLElement>('[data-emit]'));
  const track = section.querySelector<HTMLElement>('[data-signal-split]');
  const stage = section.querySelector<HTMLElement>('.ring__scroller');
  const nav = section.querySelector<HTMLElement>('[data-ring-nav]');
  const count = section.querySelector<HTMLElement>('[data-ring-count]');
  const dots = Array.from(section.querySelectorAll<HTMLButtonElement>('[data-ring-dot]'));
  if (!rail || !track || !stage || !nav || !count || cards.length !== RING_CARD_COUNT || dots.length !== RING_CARD_COUNT) {
    return null;
  }

  // The rail's cards share one height (flex stretch), so any card's is the tallest.
  const cardWidth = cards[0].getBoundingClientRect().width;
  const cardHeight = cards[0].getBoundingClientRect().height;
  const fullRadius = ringRadius(cardWidth);

  const layoutFor = (viewportHeight: number) =>
    stageLayout({ viewportHeight, cardWidth, cardHeight, distance: PERSPECTIVE_PX, tiltDeg: RING_TILT_DEG });
  if (!layoutFor(window.innerHeight).fits) return null;

  let isOn = false;
  let isDropped = false;
  /** Measured once the class is on: the rail's page top, the front point's place in the stage. */
  const measured = { railTop: 0, frontX: 0, frontY: 0, pin: 0, viewportHeight: 0, tiltRoom: 0, scale: 1, radius: fullRadius };

  // Draws on the scroll driver's tick, only when something marked it dirty. gsap.ticker.add
  // appends, and this chunk loads long after BaseLayout's initScroll() registered Lenis's
  // listener, so the draw reads the scroll and tip Lenis published this tick.
  const schedule = createRenderSchedule({
    subscribe: (onTick) => {
      gsap.ticker.add(onTick);
      return () => gsap.ticker.remove(onTick);
    },
    now: () => gsap.ticker.time * 1000,
    draw: () => drawFrame(),
  });
  const markDirty = () => schedule.markDirty();
  const drawFrame = guarded(() => update());

  /** Any exception gives the ring up and restores the rail; the page carries on. */
  function guarded<Args extends unknown[]>(fn: (...args: Args) => void): (...args: Args) => void {
    return (...args) => {
      try {
        fn(...args);
      } catch {
        unmount();
      }
    };
  }

  /** The page scroll the ring last came to rest at — the settle reads the reader's direction from it. */
  let restY = 0;
  /** The card the counter and dots last showed; −1 until the first draw. */
  let shownFront = -1;

  function measure(): void {
    const viewportHeight = window.innerHeight;
    const layout = layoutFor(viewportHeight);
    // A window resized below the gate's width or the fit gives the ring up, one way (design §5).
    // The tube's fallback used to drop it for a narrow window; the ring is its own now.
    const isTooNarrow = document.documentElement.clientWidth < RING_MIN_VIEWPORT_WIDTH;
    if (isTooNarrow || !layout.fits) {
      unmount();
      return;
    }
    const pin = pinLength(viewportHeight);
    section.style.setProperty('--ring-pin', `${pin.toFixed(2)}px`);
    section.style.setProperty('--ring-front-y', `${layout.frontY.toFixed(2)}px`);
    section.style.setProperty('--ring-nav-y', `${layout.navY.toFixed(2)}px`);
    section.style.setProperty('--ring-perspective', `${PERSPECTIVE_PX}px`);
    const railBox = rail!.getBoundingClientRect();
    const railTop = railBox.top + window.scrollY;
    const splitY = railTop + layout.frontY;
    // The curve's own x at the split, as the rail's track reads it — never the viewport centre.
    const curveX = signalXAtPageY(splitY);
    const frontPageX = curveX ?? railBox.left + window.scrollX + railBox.width / 2;
    const frontX = Number((frontPageX - (railBox.left + window.scrollX)).toFixed(2));
    section.style.setProperty('--ring-front-x', `${frontX}px`);
    const { scale } = layout;
    section.style.setProperty('--ring-scale', scale.toFixed(4));
    const radius = fullRadius * scale;
    // How far up the pointer may tilt the ring before the side cards' tops run under the nav.
    const tiltRoom = pointerTiltRoom({ frontY: layout.frontY, viewportHeight, cardWidth, scale, distance: PERSPECTIVE_PX });
    Object.assign(measured, { railTop, frontX, frontY: layout.frontY, pin, viewportHeight, tiltRoom, scale, radius });
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
    // The rail's island draws the emissions off the tip with an inline scale, and stands down
    // in 3D wherever it left them: here they are lit by Ring.astro's CSS from `--ring-lit`.
    for (const emit of emits) emit.style.removeProperty('transform');
    measure();
    if (isAboveViewport && !isDropped) scrollToY(window.scrollY + section.offsetHeight - heightBefore, { immediate: true });
    restY = window.scrollY;
    refreshScroll();
  }

  // D14: turning 3D on changes the page's height, so only while the ring is off screen.
  const visibility = new IntersectionObserver(
    guarded(([entry]: IntersectionObserverEntry[]) => {
      if (!entry.isIntersecting) {
        visibility.disconnect();
        switchOn();
      }
    }),
  );
  visibility.observe(section);

  const onResize = guarded(() => {
    if (isOn) measure();
  });
  window.addEventListener('resize', onResize);
  // Turning 3D on grows the page, the SVG renderer re-measures the curve, and the split's x is
  // only right once it has: follow every re-measure. Unchanged values write unchanged
  // properties, so this cannot feed back into another re-measure.
  const stopCurve = onSignalCurve(
    guarded(() => {
      if (isOn) measure();
    }),
  );
  // The turn follows the scroll, the arrival follows the tip: either moving needs a draw.
  const stopProgress = onPageProgress(markDirty);
  const stopTip = onSignalTip(markDirty);

  /** Turns card `index` to the front through the scroll — the one source of the angle — and makes it the settle's rest. */
  function turnTo(index: number): void {
    const target = measured.railTop + stepOffset(index, measured.viewportHeight);
    restY = target;
    if (Math.abs(window.scrollY - target) < 1) return;
    scrollToY(target, { duration: FOCUS_TURN_S, easing: easeOutCubic });
  }

  /** Focus moves the ring (spec §9.04): any card focused, by any key, comes to the front. */
  const onFocusIn = (event: FocusEvent) => {
    if (!isOn) return;
    const card = (event.target as Element).closest<HTMLElement>('.card');
    const index = card ? cards.indexOf(card) : -1;
    if (index < 0) return;
    turnTo(index);
  };
  section.addEventListener('focusin', onFocusIn);

  /** A dot turns its card to the front; focus stays on the dot. Enter and Space click a button natively. */
  const onDotClick = (event: MouseEvent) => {
    if (!isOn) return;
    const dot = (event.target as Element).closest<HTMLButtonElement>('[data-ring-dot]');
    const index = dot ? dots.indexOf(dot) : -1;
    if (index < 0) return;
    turnTo(index);
  };
  nav.addEventListener('click', onDotClick);

  // Drag: mouse and pen only (touch scrolls natively). A drag of one (scaled) card width turns one step.
  let drag: { startX: number; startScroll: number; isDragging: boolean } | null = null;
  let swallowNextClick = false;
  const onPointerDown = (event: PointerEvent) => {
    // A drag released outside the stage never gets its click here: never let it eat this one.
    swallowNextClick = false;
    if (!isOn || event.pointerType === 'touch' || event.button !== 0) return;
    // The dots are buttons: a press on one is a click, never the start of a drag.
    if (nav!.contains(event.target as Node)) return;
    drag = { startX: event.clientX, startScroll: window.scrollY, isDragging: false };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    if (!drag.isDragging && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    drag.isDragging = true;
    // Dragging left brings the next card in from the right.
    const pxPerStep = PIN_STEP_VH * measured.viewportHeight;
    scrollToY(drag.startScroll - (dx / (cardWidth * measured.scale)) * pxPerStep, { immediate: true });
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

  // The pointer float: mouse and pen over the stage add up to POINTER_TILT_DEG to the
  // look-down and lift the card under them, both eased per drawn frame in update().
  // Pointer-driven, so a still pointer goes quiet.
  const pointer = { clientX: 0, clientY: 0, isInWindow: false };
  let pointerTilt = 0;
  const lifts = cards.map(() => 0);
  /** Still easing back from a pointer that has gone: it must keep drawing until it arrives. */
  const isFloating = () => pointerTilt !== 0 || lifts.some((lift) => lift !== 0);
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
    if (isOn && (isFloating() || isInStageBand(event.clientY))) markDirty();
  };
  const onPointerLeave = () => {
    pointer.isInWindow = false;
    if (isOn && isFloating()) markDirty();
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
    if (Math.abs(window.scrollY - target) > 1) scrollToY(target, { duration: SETTLE_S, easing: easeOutCubic });
  }
  // Lenis drives native scroll, so this fires for wheel, keys, drag and Lenis's own easing; the
  // settle's own scroll ends on its target, where the next settle is a no-op.
  const onScroll = () => {
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, SETTLE_AFTER_MS);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  function unmount(): void {
    if (isDropped) return;
    isDropped = true;
    schedule.stop();
    visibility.disconnect();
    window.removeEventListener('resize', onResize);
    stopCurve();
    stopProgress();
    stopTip();
    section.removeEventListener('focusin', onFocusIn);
    nav!.removeEventListener('click', onDotClick);
    stage!.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    stage!.removeEventListener('dragstart', onDragStart);
    stage!.removeEventListener('click', onClickCapture, true);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onPointerTilt);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    drag = null;
    if (!isOn) return;
    // The page is about to lose the pin's height. Mid-pin, land the reader on the rail. Past
    // the pin, the section shrinks above them — Chrome's scroll anchoring did not hold their
    // place on the way in (switchOn), so neither is it trusted on the way out: the scroll moves
    // back by exactly what the section lost, and what they were reading stays put. Read the
    // scroll first: refreshScroll() below clamps it to the shorter page.
    const scrollYBefore = window.scrollY;
    const wasInsideRing = scrollYBefore > measured.railTop - window.innerHeight && scrollYBefore < measured.railTop + measured.pin;
    const wasPastPin = scrollYBefore >= measured.railTop + measured.pin;
    const heightBefore = section.offsetHeight;
    section.classList.remove('ring--3d');
    for (const name of ['--ring-pin', '--ring-front-y', '--ring-front-x', '--ring-nav-y', '--ring-scale', '--ring-perspective', '--ring-origin-x', '--ring-origin-y']) {
      section.style.removeProperty(name);
    }
    nav!.style.removeProperty('--ring-arrive');
    for (const dot of dots) dot.removeAttribute('aria-current');
    shownFront = -1;
    for (const card of cards) {
      for (const name of ['transform', 'opacity', '--ring-dim', '--ring-lit']) card.style.removeProperty(name);
      card.classList.remove('card--inert', 'card--front');
    }
    for (const emit of emits) emit.style.removeProperty('transform');
    refreshScroll();
    if (wasInsideRing) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    else if (wasPastPin) scrollToY(scrollYBefore - (heightBefore - section.offsetHeight), { immediate: true });
  }

  function update(): void {
    if (!isOn || isDropped) return;
    const { railTop, frontX, frontY, pin, viewportHeight, tiltRoom, scale, radius } = measured;
    const scrollY = window.scrollY;
    const stageTop = stickyTop(scrollY, railTop, pin);

    // Reads first, then writes: the stage's box is where the pointer float looks for the
    // pointer, and the hit test which card it is over (last frame's transforms, inert cards
    // excluded by their pointer-events).
    const stageLeft = rail!.getBoundingClientRect().left;
    const stageBox = stage!.getBoundingClientRect();
    const isPointerOverStage =
      pointer.isInWindow &&
      pointer.clientX >= stageBox.left &&
      pointer.clientX <= stageBox.right &&
      pointer.clientY >= stageBox.top &&
      pointer.clientY <= stageBox.bottom;
    const cardUnderPointer = isPointerOverStage
      ? document.elementFromPoint(pointer.clientX, pointer.clientY)?.closest<HTMLElement>('.card')
      : null;
    const hovered = cardUnderPointer ? cards.indexOf(cardUnderPointer) : -1;

    // The perspective origin is the viewport's centre, wherever the stage is: the eye stageLayout
    // fits through. In front space too, for the lift.
    const originX = document.documentElement.clientWidth / 2 - stageLeft;
    const originY = viewportHeight / 2 - (stageTop - scrollY);
    section.style.setProperty('--ring-origin-x', `${originX.toFixed(2)}px`);
    section.style.setProperty('--ring-origin-y', `${originY.toFixed(2)}px`);
    const eye = [originX - frontX, originY - frontY, PERSPECTIVE_PX] as const;

    const steps = turnSteps(rawSteps(scrollY - railTop, viewportHeight), viewportHeight);
    const splitY = railTop + frontY;
    const fan = fanOut(tipFraction(signalTipY(), splitY, ARRIVAL_DRAW_VH * viewportHeight));
    // Pointer high opens the ellipse (as far as the stage has room above the ring), low closes
    // it. Eased toward the target, and drawing again until it gets there; then it snaps, so it
    // is exactly 0 once the pointer has gone.
    const pointerTarget = isPointerOverStage ? -(pointer.clientY / viewportHeight - 0.5) * 2 * POINTER_TILT_DEG : 0;
    const targetTilt = Math.min(tiltRoom, pointerTarget);
    pointerTilt += (targetTilt - pointerTilt) * POINTER_EASE;
    if (Math.abs(targetTilt - pointerTilt) > POINTER_TILT_SETTLED_DEG) markDirty();
    else pointerTilt = targetTilt;
    const tiltDeg = RING_TILT_DEG + pointerTilt;

    cards.forEach((card, i) => {
      const angleDeg = cardAngle(i, steps);
      // Where the fan-out has it: all five stacked at the front, opening onto the circle.
      const shownDeg = angleDeg * fan.spread;
      const pose = cardPose(shownDeg);
      const isInert = pose.isInert || fan.opacity < 0.3;
      const fullLift = POINTER_LIFT_PX * scale;
      const liftTarget = i === hovered && !isInert ? fullLift * (1 - frontness(angleDeg)) : 0;
      lifts[i] += (liftTarget - lifts[i]) * POINTER_EASE;
      if (Math.abs(liftTarget - lifts[i]) > POINTER_LIFT_SETTLED_PX) markDirty();
      else lifts[i] = liftTarget;
      const [liftX, liftY, liftZ] = liftOffset(cardTop(shownDeg, radius, tiltDeg), eye, lifts[i]);
      const offset = [liftX, liftY, liftZ + stackOffset(i, fan.spread)[2]] as const;
      // The cards turn outward only as they spread, so none cuts through the front one.
      const facing = CARD_FACING_SHARE * fan.spread;
      card.style.transform = cssMatrix3d(cardMatrix(shownDeg, radius, tiltDeg, scale, offset, facing));
      // Opacity only for the back two (D3). The side cards recede under the ground overlay, and
      // the arrival comes up out of it too: a card faded by opacity is see-through, and the
      // stack would show the line and each other through the front card.
      card.style.opacity = pose.opacity.toFixed(4);
      const visibility = (1 - recede(shownDeg) * (1 - (LIFT_BRIGHTEN * lifts[i]) / fullLift)) * fan.opacity;
      card.style.setProperty('--ring-dim', (1 - visibility).toFixed(3));
      // The front card is lit — its shadow and its dot — handing over smoothly as the ring turns
      // (Ring.astro's CSS reads both).
      card.style.setProperty('--ring-lit', (frontness(angleDeg) * fan.opacity).toFixed(3));
      card.classList.toggle('card--inert', isInert);
      card.classList.toggle('card--front', cardPose(angleDeg).isFront);
    });

    // The counter and dots: the card nearest the front, by the rule the settle lands by, so at
    // rest they agree with the card in front. Written only when it changes.
    const front = nearestCard(scrollY - railTop, viewportHeight);
    if (front !== shownFront) {
      shownFront = front;
      count!.textContent = String(front + 1).padStart(2, '0');
      dots.forEach((dot, i) => {
        if (i === front) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }
    nav!.style.setProperty('--ring-arrive', fan.opacity.toFixed(3));
  }

  return { update, unmount };
}
