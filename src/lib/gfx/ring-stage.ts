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
  pinLength,
  rawSteps,
  ringRadius,
  stageLayout,
  stickyTop,
  turnSteps,
} from './ring';

/** How far below its place a card starts before its drop lands, px. */
const ARRIVAL_RISE_PX = 24;

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
  const track = section.querySelector<HTMLElement>('[data-signal-split]');
  if (!rail || !track || cards.length !== RING_CARD_COUNT) return null;

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
    refreshScroll();
    if (wasInsideRing) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  }

  function update(): RingFrame | null {
    if (!isOn || isDropped) return null;
    const { railTop, frontPageX, frontY, floorY, pin, viewportHeight } = measured;
    const scrollY = window.scrollY;
    const stageTop = stickyTop(scrollY, railTop, pin);
    const frontPageY = stageTop + frontY;

    // The perspective origin is the viewport's centre, wherever the stage is (parity with the camera).
    const stageLeft = rail!.getBoundingClientRect().left;
    section.style.setProperty('--ring-origin-x', `${(document.documentElement.clientWidth / 2 - stageLeft).toFixed(2)}px`);
    section.style.setProperty('--ring-origin-y', `${(viewportHeight / 2 - (stageTop - scrollY)).toFixed(2)}px`);

    const raw = rawSteps(scrollY - railTop, viewportHeight);
    const steps = turnSteps(raw);
    const splitY = railTop + frontY;
    const arrived = arrival(tipFraction(signalTipY(), splitY, ARRIVAL_DRAW_VH * viewportHeight));
    const tiltDeg = RING_TILT_DEG;

    const poses = cards.map((card, i) => {
      const angleDeg = cardAngle(i, steps);
      const pose = cardPose(angleDeg);
      const opacity = pose.opacity * arrived.cards;
      const rise = (1 - arrived.cards) * ARRIVAL_RISE_PX;
      card.style.transform = cssMatrix3d(cardMatrix(angleDeg, radius, tiltDeg, rise));
      card.style.opacity = opacity.toFixed(4);
      card.classList.toggle('card--inert', pose.isInert || arrived.cards < 0.3);
      card.classList.toggle('card--front', pose.isFront);
      return { angleDeg, opacity };
    });

    return { frontPageX, frontPageY, radius, tiltDeg, floorY, steps, raw, arrival: arrived, cards: poses };
  }

  return { update, unmount };
}
