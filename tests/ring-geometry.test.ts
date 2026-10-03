import { describe, expect, it } from 'vitest';
import {
  CARD_FACING_SHARE,
  FIT_MARGIN_PX,
  MIN_RING_SCALE,
  PERSPECTIVE_PX,
  PIN_LEAD_VH,
  PIN_STEP_VH,
  PIN_TAIL_VH,
  RING_CARD_COUNT,
  RING_TILT_DEG,
  SETTLE_NUDGE_SHARE,
  STAGE_MARGIN_PX,
  STEP_DEG,
  POINTER_TILT_DEG,
  SIDE_DIM,
  STACK_GAP_PX,
  applyMatrix,
  fanOut,
  liftOffset,
  recede,
  stackOffset,
  cardAngle,
  cardMatrix,
  cardPose,
  cardTop,
  cssMatrix3d,
  frontness,
  multiply,
  nearestCard,
  pinLength,
  pointerTiltRoom,
  project,
  rawSteps,
  ringPoint,
  ringRadius,
  ringRiseAt,
  settleTarget,
  stageLayout,
  stepOffset,
  stickyTop,
  tiltMatrix,
  tiltPoint,
  turnSteps,
} from '../src/lib/ring/geometry';
import { ringProjects } from '../src/data/content';

const CARD = 400;
const R = ringRadius(CARD);
const VH = 900;
/** The checkpoint viewport. */
const CHECK_W = 1280;
const CHECK_H = 800;
const D = PERSPECTIVE_PX;
const layoutAt = (viewportHeight: number, cardHeight = 560) =>
  stageLayout({ viewportHeight, cardWidth: CARD, cardHeight, distance: D, tiltDeg: RING_TILT_DEG });
const checkLayout = (cardHeight = 560) => layoutAt(CHECK_H, cardHeight);
/** How far the ring's highest card top projects above the front point, for a layout. */
const riseOf = (frontY: number, viewportHeight: number, scale = 1, tiltDeg = RING_TILT_DEG) =>
  ringRiseAt({ frontY, viewportHeight, cardWidth: CARD, scale, tiltDeg, distance: D });

describe('the ring holds the shipped sites', () => {
  it('has one card per ring project', () => {
    expect(RING_CARD_COUNT).toBe(ringProjects.length);
    expect(STEP_DEG).toBe(360 / RING_CARD_COUNT);
  });
});

describe('ringRadius', () => {
  // Side cards at ±72° must clear the front card on screen, with room for a focus ring.
  it('keeps the side cards clear of the front card', () => {
    const sideNearEdge = applyMatrix(cardMatrix(STEP_DEG, R, 0), [-CARD / 2, 0, 0])[0];
    expect(sideNearEdge - CARD / 2).toBeGreaterThan(24);
  });

  it('keeps the side cards clear of the front card on screen, at the checkpoint', () => {
    const { frontY } = checkLayout();
    const frontX = CHECK_W / 2;
    const eye = { x: CHECK_W / 2, y: CHECK_H / 2 };
    for (const side of [1, -1]) {
      const [x, y, z] = applyMatrix(cardMatrix(side * STEP_DEG, R, RING_TILT_DEG), [(-side * CARD) / 2, 0, 0]);
      const nearEdge = project([frontX + x, frontY + y, z], eye, D).x;
      const frontEdge = frontX + (side * CARD) / 2;
      expect(side * (nearEdge - frontEdge)).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('the pin', () => {
  it('is lead + four steps + tail', () => {
    expect(pinLength(VH)).toBeCloseTo(VH * (PIN_LEAD_VH + 4 * PIN_STEP_VH + PIN_TAIL_VH), 9);
  });

  it('puts card i dead front at stepOffset(i)', () => {
    for (let i = 0; i < RING_CARD_COUNT; i++) {
      const steps = turnSteps(rawSteps(stepOffset(i, VH), VH), VH);
      expect(steps).toBeCloseTo(i, 9);
      expect(cardAngle(i, steps)).toBeCloseTo(0, 9);
    }
  });

  it('holds the front card still across the lead and the tail', () => {
    expect(turnSteps(rawSteps(0, VH), VH)).toBe(0);
    expect(turnSteps(rawSteps(stepOffset(0, VH) * 0.5, VH), VH)).toBe(0);
    expect(turnSteps(rawSteps(pinLength(VH), VH), VH)).toBe(RING_CARD_COUNT - 1);
  });

  it('shows a card dead front within a pixel of its place — the page scrolls in whole pixels', () => {
    for (let i = 0; i < RING_CARD_COUNT; i++) {
      for (const px of [-0.9, -0.4, 0.4, 0.9]) {
        const raw = rawSteps(stepOffset(i, VH) + px, VH);
        expect(turnSteps(raw, VH)).toBe(i);
      }
    }
    const justOff = rawSteps(stepOffset(2, VH) + 3, VH);
    expect(turnSteps(justOff, VH)).toBeCloseTo(justOff, 12);
  });

  it('tracks the scroll 1:1 — no dwell: a share of a step scrolled is that share of a step turned', () => {
    const stepPx = PIN_STEP_VH * VH;
    for (let i = 0; i < RING_CARD_COUNT - 1; i++) {
      for (const share of [0.05, 0.25, 0.5, 0.9]) {
        expect(turnSteps(rawSteps(stepOffset(i, VH) + share * stepPx, VH), VH)).toBeCloseTo(i + share, 9);
      }
    }
  });

  it('is short: a step of 0.4 of a viewport, a lead and a tail of 0.15 (revision R4)', () => {
    expect(PIN_STEP_VH).toBe(0.4);
    expect(PIN_LEAD_VH).toBe(0.15);
    expect(PIN_TAIL_VH).toBe(0.15);
  });

  it('clamps outside the pin', () => {
    expect(rawSteps(-500, VH)).toBe(0);
    expect(rawSteps(pinLength(VH) + 500, VH)).toBe(RING_CARD_COUNT - 1);
  });

  it('turns monotonically, so scrolling back reverses it exactly', () => {
    let previous = -Infinity;
    for (let offset = 0; offset <= pinLength(VH); offset += 3) {
      const steps = turnSteps(rawSteps(offset, VH), VH);
      expect(steps).toBeGreaterThanOrEqual(previous);
      previous = steps;
    }
  });

  it('settles on the nearest card', () => {
    expect(nearestCard(0, VH)).toBe(0);
    expect(nearestCard(stepOffset(2, VH) + 10, VH)).toBe(2);
    expect(nearestCard(stepOffset(2, VH) + 0.49 * PIN_STEP_VH * VH, VH)).toBe(2);
    expect(nearestCard(stepOffset(2, VH) + 0.51 * PIN_STEP_VH * VH, VH)).toBe(3);
    expect(nearestCard(pinLength(VH) + 500, VH)).toBe(RING_CARD_COUNT - 1);
  });

  describe('settleTarget follows the direction of travel', () => {
    const vh = 800;
    const notch = 100;
    const at = (card: number) => stepOffset(card, vh);

    it('settles a nudge back to the nearest card', () => {
      const nudge = SETTLE_NUDGE_SHARE * PIN_STEP_VH * vh - 1;
      expect(settleTarget(at(1) + nudge, at(1), vh)).toBe(1);
      expect(settleTarget(at(1) - nudge, at(1), vh)).toBe(1);
    });

    it('moves on a card for one wheel notch down, and back one for a notch up', () => {
      expect(settleTarget(at(1) + notch, at(1), vh)).toBe(2);
      expect(settleTarget(at(2) - notch, at(2), vh)).toBe(1);
    });

    it('lands one card on from a stop past halfway, either way', () => {
      expect(settleTarget(at(1) + 0.65 * PIN_STEP_VH * vh, at(1), vh)).toBe(2);
      expect(settleTarget(at(3) - 0.65 * PIN_STEP_VH * vh, at(3), vh)).toBe(2);
    });

    it('counts a scroll a fraction of a pixel short of a card as on it', () => {
      // At 1280×800 the page came to rest at 5687 for a card at 5687.34: never one card past it.
      expect(settleTarget(at(1) - 0.34, at(2), vh)).toBe(1);
      expect(settleTarget(at(1) + 0.34, at(0), vh)).toBe(1);
      expect(settleTarget(at(4) + 0.34, at(3), vh)).toBe(4);
      expect(settleTarget(at(0) - 0.34, at(1), vh)).toBe(0);
    });

    it('lets a reader leave through the tail and the lead', () => {
      expect(settleTarget(at(4) + notch, at(4), vh)).toBeNull();
      expect(settleTarget(at(0) - notch, at(0), vh)).toBeNull();
    });

    it('settles a reader coming in from either side on the first card they meet', () => {
      expect(settleTarget(at(0) - notch, -vh, vh)).toBe(0);
      expect(settleTarget(at(4) + notch, pinLength(vh) + vh, vh)).toBe(4);
    });

    it('never names a card outside the ring', () => {
      for (let offset = 1; offset < pinLength(vh); offset += 7) {
        for (const rest of [-vh, 0, at(0), at(2), at(4), pinLength(vh) + vh]) {
          const card = settleTarget(offset, rest, vh);
          if (card !== null) {
            expect(card).toBeGreaterThanOrEqual(0);
            expect(card).toBeLessThanOrEqual(RING_CARD_COUNT - 1);
            expect(Number.isInteger(card)).toBe(true);
          }
        }
      }
    });
  });

  it('places the stage by sticky arithmetic, as a page top', () => {
    expect(stickyTop(100, 2000, 2610)).toBe(2000);
    expect(stickyTop(3000, 2000, 2610)).toBe(3000);
    expect(stickyTop(9000, 2000, 2610)).toBe(4610);
  });
});

describe('cardAngle and cardPose', () => {
  it('starts with card 1 on the right and turns it to the front', () => {
    expect(cardAngle(1, 0)).toBeCloseTo(STEP_DEG, 9);
    expect(cardAngle(1, 1)).toBeCloseTo(0, 9);
    expect(ringPoint(cardAngle(1, 0), R, 0)[0]).toBeGreaterThan(0);
  });

  it('wraps to (-180, 180]', () => {
    for (let s = 0; s <= 4; s += 0.25) {
      for (let i = 0; i < RING_CARD_COUNT; i++) {
        const a = cardAngle(i, s);
        expect(a).toBeGreaterThan(-180);
        expect(a).toBeLessThanOrEqual(180);
      }
    }
  });

  it('is full strength at the front and the sides, gone at the back, and symmetric', () => {
    expect(cardPose(0)).toEqual({ opacity: 1, isFront: true, isInert: false });
    expect(cardPose(30).opacity).toBe(1);
    // The sides recede under the overlay (recede), not by opacity: a see-through card shows the line and the cards behind it.
    expect(cardPose(STEP_DEG).opacity).toBe(1);
    expect(cardPose(110).opacity).toBe(0);
    expect(cardPose(144).opacity).toBe(0);
    for (const a of [40, 60, 72, 90, 100]) expect(cardPose(a).opacity).toBeCloseTo(cardPose(-a).opacity, 12);
    expect(cardPose(72).opacity).toBeGreaterThan(0.3);
    expect(cardPose(144).isInert).toBe(true);
    expect(cardPose(72).isFront).toBe(false);
    // Front until it is halfway to the next card's place.
    expect(cardPose(35).isFront).toBe(true);
    expect(cardPose(37).isFront).toBe(false);
  });

  it('fades on an S-curve, not a ramp — still near full strength just past 30°', () => {
    expect(cardPose(40).opacity).toBeGreaterThan(0.95);
  });
});

describe('the look-down', () => {
  it('pivots on the front point, so the front card never moves with tilt', () => {
    expect(ringPoint(0, R, RING_TILT_DEG)).toEqual([0, 0, 0]);
    expect(cardTop(0, R, RING_TILT_DEG)).toEqual(cardTop(0, R, 0));
    expect(cardTop(0, R, 13)).toEqual([0, 0, 0]);
  });

  it('lifts the back of the circle', () => {
    const [, backY] = ringPoint(180, R, RING_TILT_DEG);
    expect(backY).toBeLessThan(0);
  });

  it('hangs each card by its top-centre from its point on the circle — no drop', () => {
    for (const phi of [-144, -72, 36, 72]) {
      expect(cardTop(phi, R, RING_TILT_DEG)).toEqual(ringPoint(phi, R, RING_TILT_DEG));
    }
  });

  it('tiltMatrix agrees with tiltPoint', () => {
    const p: [number, number, number] = [120, -40, -300];
    const a = applyMatrix(tiltMatrix(RING_TILT_DEG), p);
    const b = tiltPoint(p, RING_TILT_DEG);
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));
  });
});

describe('ringRiseAt', () => {
  /** The side cards' top corners, projected through the eye at the viewport's centre. */
  const sideCornerRise = (frontY: number, viewportHeight: number, tiltDeg: number) => {
    const rises: number[] = [];
    for (const side of [1, -1]) {
      const m = cardMatrix(side * STEP_DEG, R, tiltDeg);
      for (const corner of [CARD / 2, -CARD / 2]) {
        const [x, y, z] = applyMatrix(m, [corner, 0, 0]);
        rises.push(frontY - project([x, frontY + y, z], { x: 0, y: viewportHeight / 2 }, D).y);
      }
    }
    return Math.max(...rises);
  };

  it('is how far the side cards’ top corners project above the front point, through the eye', () => {
    for (const frontY of [0, 150, 400]) {
      expect(riseOf(frontY, 800)).toBeCloseTo(Math.max(0, sideCornerRise(frontY, 800, RING_TILT_DEG)), 9);
    }
    // The higher the ring sits above the eye, the more we look up at it and the less its sides rise.
    expect(riseOf(150, 800)).toBeLessThan(riseOf(400, 800));
  });

  it('rises higher than the side cards’ top-centres: the near corner is nearer the viewer', () => {
    const [, y, z] = cardTop(STEP_DEG, R, RING_TILT_DEG);
    const centreRise = 150 - project([0, 150 + y, z], { x: 0, y: 400 }, D).y;
    expect(riseOf(150, 800)).toBeGreaterThan(centreRise);
  });

  it('is never below the front card’s own top, whatever the tilt', () => {
    expect(riseOf(150, 800, 1, 0)).toBe(0);
    expect(riseOf(150, 800, 1, -5)).toBe(0);
  });
});

describe('cardMatrix', () => {
  it('is the identity for the front card at full size — pixel-crisp, its top-centre on the front point', () => {
    const m = cardMatrix(0, R, RING_TILT_DEG);
    expect(cssMatrix3d(m)).toBe('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
  });

  it('carries the card top-centre to its place, moved by the offset', () => {
    const offset: [number, number, number] = [3, -5, 18];
    for (const phi of [-144, -72, 0, 36, 72, 144]) {
      const top = cardTop(phi, R, RING_TILT_DEG);
      const placed = applyMatrix(cardMatrix(phi, R, RING_TILT_DEG), [0, 0, 0]);
      placed.forEach((v, i) => expect(v).toBeCloseTo(top[i], 9));
      const moved = applyMatrix(cardMatrix(phi, R, RING_TILT_DEG, 1, offset), [0, 0, 0]);
      moved.forEach((v, i) => expect(v).toBeCloseTo(top[i] + offset[i], 9));
    }
  });

  it('moves the whole card by the offset, without turning or scaling it', () => {
    const plain = cardMatrix(72, R, RING_TILT_DEG, 0.9);
    const moved = cardMatrix(72, R, RING_TILT_DEG, 0.9, [0, 0, -4]);
    for (let i = 0; i < 12; i++) expect(moved[i]).toBeCloseTo(plain[i], 12);
    expect(moved[14]).toBeCloseTo(plain[14] - 4, 12);
  });

  it('scales the card about its top-centre', () => {
    const scale = 0.8;
    for (const phi of [-144, -72, 0, 36, 72, 144]) {
      const m = cardMatrix(phi, R * scale, RING_TILT_DEG, scale);
      const origin = applyMatrix(m, [0, 0, 0]);
      const widthTip = applyMatrix(m, [1, 0, 0]);
      expect(Math.hypot(...widthTip.map((v, i) => v - origin[i]))).toBeCloseTo(scale, 9);
    }
    expect(cssMatrix3d(cardMatrix(0, R * scale, RING_TILT_DEG, scale))).toBe(
      'matrix3d(0.8,0,0,0,0,0.8,0,0,0,0,0.8,0,0,0,0,1)',
    );
  });

  it('turns the card part of the way to its angle', () => {
    const m = cardMatrix(72, R, RING_TILT_DEG);
    const origin = applyMatrix(m, [0, 0, 0]);
    const normalTip = applyMatrix(m, [0, 0, 1]);
    const normal = normalTip.map((v, i) => v - origin[i]);
    const turned = (72 * CARD_FACING_SHARE * Math.PI) / 180;
    expect(normal[0]).toBeCloseTo(Math.sin(turned), 9);
    expect(normal[1]).toBeCloseTo(0, 9);
    expect(normal[2]).toBeCloseTo(Math.cos(turned), 9);
  });
});

describe('parity — the CSS transform puts every card’s top-centre on its place', () => {
  it.each([1, 0.8])('at scale %f', (scale) => {
    for (const phi of [-144, -72, 0, 50, 72, 144]) {
      for (const tilt of [RING_TILT_DEG, RING_TILT_DEG + POINTER_TILT_DEG, 0]) {
        const placed = applyMatrix(cardMatrix(phi, R * scale, tilt, scale), [0, 0, 0]);
        const top = cardTop(phi, R * scale, tilt);
        placed.forEach((v, i) => expect(v).toBeCloseTo(top[i], 9));
      }
    }
  });

  it('multiply composes right-to-left like CSS', () => {
    const a = tiltMatrix(10);
    const b = cardMatrix(30, R, 0, 1, [0, 12, 0]);
    const p: [number, number, number] = [3, 4, 5];
    const once = applyMatrix(multiply(b, a), p);
    const twice = applyMatrix(b, applyMatrix(a, p));
    once.forEach((v, i) => expect(v).toBeCloseTo(twice[i], 9));
  });
});

describe('stageLayout', () => {
  it('fits a 560px card in a 900px viewport, the side cards’ tops clear of the top', () => {
    const layout = layoutAt(900);
    expect(layout.fits).toBe(true);
    expect(layout.scale).toBe(1);
    expect(layout.frontY - riseOf(layout.frontY, 900)).toBeGreaterThanOrEqual(STAGE_MARGIN_PX - 1e-9);
  });

  it('fits a 560px card at the checkpoint, 1280×800, cards inside the window', () => {
    const layout = checkLayout();
    expect(layout.fits).toBe(true);
    expect(layout.frontY - riseOf(layout.frontY, CHECK_H)).toBeGreaterThanOrEqual(STAGE_MARGIN_PX - 1e-9);
    expect(layout.frontY + 560 + FIT_MARGIN_PX).toBeLessThanOrEqual(CHECK_H);
  });

  it('centres the block when there is room', () => {
    const layout = layoutAt(1080);
    const top = layout.frontY - riseOf(layout.frontY, 1080);
    const bottom = layout.frontY + 560;
    expect(top).toBeGreaterThan(STAGE_MARGIN_PX);
    expect(top).toBeCloseTo(1080 - bottom, 9);
  });

  it('sits on the margin when centring would put the ring under the nav', () => {
    const layout = layoutAt(700);
    expect(layout.frontY - riseOf(layout.frontY, 700)).toBeCloseTo(STAGE_MARGIN_PX, 9);
  });

  it('centres on the front card when nothing rises above it (no look-down)', () => {
    const layout = stageLayout({ viewportHeight: 1080, cardWidth: CARD, cardHeight: 560, distance: D, tiltDeg: 0 });
    expect(layout.frontY).toBeCloseTo((1080 - 560) / 2, 9);
  });

  it('does not fit a 560px card in a 640px viewport at full size', () => {
    expect(layoutAt(640).scale).toBeLessThan(1);
  });
});

describe('stageLayout scales the ring to fit a short window', () => {
  const CARD_H = 563;

  it('keeps full size where the ring fits — 1440×900 and a laptop’s 1440×760', () => {
    for (const height of [900, 760]) {
      const layout = layoutAt(height, CARD_H);
      expect(layout.fits).toBe(true);
      expect(layout.scale).toBe(1);
    }
  });

  it('scales down to fit a shorter window, 1440×650', () => {
    const { frontY, fits, scale } = layoutAt(650, CARD_H);
    expect(fits).toBe(true);
    expect(scale).toBeGreaterThanOrEqual(MIN_RING_SCALE);
    expect(scale).toBeLessThan(1);
    expect(frontY + CARD_H * scale + FIT_MARGIN_PX).toBeLessThanOrEqual(650 + 0.5);
    // The largest scale that fits: the cards sit on the bottom margin.
    expect(frontY + CARD_H * scale + FIT_MARGIN_PX).toBeGreaterThan(650 - 0.5);
    expect(frontY - riseOf(frontY, 650, scale)).toBeGreaterThanOrEqual(STAGE_MARGIN_PX - 1e-6);
  });

  it('scales further for a shorter window still, 1440×600', () => {
    const at600 = layoutAt(600, CARD_H);
    expect(at600.fits).toBe(true);
    expect(at600.scale).toBeGreaterThanOrEqual(MIN_RING_SCALE);
    expect(at600.scale).toBeLessThan(layoutAt(650, CARD_H).scale);
  });

  it('gives up below the floor scale — the rail stays', () => {
    const layout = layoutAt(470, CARD_H);
    expect(layout.fits).toBe(false);
    expect(layout.scale).toBe(MIN_RING_SCALE);
  });
});

describe('fanOut', () => {
  it('starts stacked and transparent, ends on the circle and opaque', () => {
    expect(fanOut(0)).toEqual({ spread: 0, opacity: 0 });
    expect(fanOut(1)).toEqual({ spread: 1, opacity: 1 });
  });

  it('spreads and fades in monotonically, so a reversed scroll gathers the stack exactly', () => {
    let previous = fanOut(0);
    for (let a = 0; a <= 1.0001; a += 0.01) {
      const now = fanOut(a);
      expect(now.spread).toBeGreaterThanOrEqual(previous.spread);
      expect(now.opacity).toBeGreaterThanOrEqual(previous.opacity);
      previous = now;
    }
  });

  it('is fully opaque a little before the cards reach the circle', () => {
    const opaqueEarly = [0.6, 0.7, 0.8].some((a) => fanOut(a).opacity === 1 && fanOut(a).spread < 1);
    expect(opaqueEarly).toBe(true);
    // The stack shows before it opens.
    expect(fanOut(0.3).opacity).toBeGreaterThan(fanOut(0.3).spread);
  });

  it('clamps outside 0..1', () => {
    expect(fanOut(-1)).toEqual(fanOut(0));
    expect(fanOut(2)).toEqual(fanOut(1));
  });
});

describe('the fan stays in depth order', () => {
  it('turns the cards outward only as they spread, so no fanned card cuts through the front one', () => {
    for (let card = 1; card < RING_CARD_COUNT; card++) {
      for (let spread = 0.01; spread <= 1; spread += 0.01) {
        const shown = cardAngle(card, 0) * spread;
        const m = cardMatrix(shown, R, RING_TILT_DEG, 1, stackOffset(card, spread), CARD_FACING_SHARE * spread);
        for (const corner of [-CARD / 2, CARD / 2]) {
          for (const down of [0, 560]) {
            const [, , z] = applyMatrix(m, [corner, down, 0]);
            // The front card is the page plane, z = 0 (tilt raises the back, never the front).
            expect(z).toBeLessThan(1e-9);
          }
        }
      }
    }
  });

  it('a card turned the full share at a small angle would cut through — why the facing follows the spread', () => {
    const m = cardMatrix(13, R, 0, 1);
    expect(applyMatrix(m, [-CARD / 2, 0, 0])[2]).toBeGreaterThan(0);
  });

  it('is the ordinary pose once spread', () => {
    expect(cssMatrix3d(cardMatrix(72, R, RING_TILT_DEG, 1, stackOffset(1, 1), CARD_FACING_SHARE))).toBe(
      cssMatrix3d(cardMatrix(72, R, RING_TILT_DEG)),
    );
  });
});

describe('stackOffset', () => {
  it('sorts the stack by DOM order — card 0 on top — and is gone once spread', () => {
    expect(stackOffset(0, 0)).toEqual([0, 0, 0]);
    expect(stackOffset(1, 0)[2]).toBe(-STACK_GAP_PX);
    expect(stackOffset(4, 0)[2]).toBe(-4 * STACK_GAP_PX);
    expect(stackOffset(3, 0.5)[2]).toBeCloseTo(-1.5 * STACK_GAP_PX, 12);
    for (let i = 0; i < RING_CARD_COUNT; i++) expect(stackOffset(i, 1)).toEqual([0, 0, 0]);
  });
});

describe('recede', () => {
  it('leaves the front card clear and dims the side cards by SIDE_DIM', () => {
    expect(recede(0)).toBe(0);
    expect(recede(STEP_DEG)).toBeCloseTo(SIDE_DIM, 12);
    expect(recede(-STEP_DEG)).toBeCloseTo(SIDE_DIM, 12);
    expect(recede(STEP_DEG / 2)).toBeCloseTo(SIDE_DIM / 2, 9);
  });

  it('ramps over a whole step, so mid-turn neither card is fully dimmed', () => {
    let previous = -1;
    for (let a = 0; a <= STEP_DEG; a += 2) {
      expect(recede(a)).toBeGreaterThanOrEqual(previous);
      previous = recede(a);
    }
    expect(recede(STEP_DEG / 2)).toBeLessThan(SIDE_DIM);
    expect(recede(144)).toBeCloseTo(SIDE_DIM, 12);
  });
});

describe('liftOffset', () => {
  const eye: [number, number, number] = [80, 320, D];
  const viewAt = ([x, y, z]: readonly number[]) => project([x, y, z], { x: eye[0], y: eye[1] }, eye[2]);

  it('moves a point toward the viewer by `lift` without moving it on screen', () => {
    for (const top of [
      [0, 0, 0],
      [400, -30, -300],
      [-420, -20, -310],
    ] as [number, number, number][]) {
      const offset = liftOffset(top, eye, 18);
      expect(offset[2]).toBeCloseTo(18, 12);
      const lifted: [number, number, number] = [top[0] + offset[0], top[1] + offset[1], top[2] + offset[2]];
      const before = viewAt(top);
      const after = viewAt(lifted);
      expect(after.x).toBeCloseTo(before.x, 9);
      expect(after.y).toBeCloseTo(before.y, 9);
    }
  });

  it('is nothing at no lift', () => {
    expect(liftOffset([10, 20, -30], eye, 0)).toEqual([0, 0, 0]);
  });

  it('keeps the front card’s top-centre — the line’s landing point — on screen through a card matrix', () => {
    const top = cardTop(0, R, RING_TILT_DEG);
    const m = cardMatrix(0, R, RING_TILT_DEG, 1, liftOffset(top, eye, 18));
    const after = viewAt(applyMatrix(m, [0, 0, 0]));
    expect(after.x).toBeCloseTo(0, 9);
    expect(after.y).toBeCloseTo(0, 9);
  });
});

describe('frontness', () => {
  it('is 1 dead front, 0 from half a step round, and the same either side', () => {
    expect(frontness(0)).toBe(1);
    expect(frontness(STEP_DEG / 2)).toBe(0);
    expect(frontness(STEP_DEG)).toBe(0);
    expect(frontness(180)).toBe(0);
    expect(frontness(STEP_DEG / 4)).toBeCloseTo(0.5, 9);
    expect(frontness(-20)).toBeCloseTo(frontness(20), 12);
  });
});

describe('pointerTiltRoom', () => {
  const roomAt = (h: number, cardHeight = 560) => {
    const { frontY, scale } = layoutAt(h, cardHeight);
    return { frontY, scale, room: pointerTiltRoom({ frontY, viewportHeight: h, cardWidth: CARD, scale, distance: D }) };
  };

  it('gives the full tilt where the stage has room above the ring', () => {
    expect(roomAt(1080).room).toBe(POINTER_TILT_DEG);
  });

  it('keeps the tilted side cards clear of the margin where the layout sits on it', () => {
    const { frontY, scale, room } = roomAt(720);
    expect(room).toBeGreaterThanOrEqual(0);
    expect(room).toBeLessThan(POINTER_TILT_DEG);
    const top = frontY - riseOf(frontY, 720, scale, RING_TILT_DEG + room);
    expect(top).toBeGreaterThanOrEqual(STAGE_MARGIN_PX - 1e-3);
  });
});
