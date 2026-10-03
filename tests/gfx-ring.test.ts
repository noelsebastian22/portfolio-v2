import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraRig } from '../src/lib/gfx/camera';
import {
  CARD_FACING_SHARE,
  DWELL_SHARE,
  FIT_MARGIN_PX,
  HOOP_DROP_PX,
  PIN_LEAD_VH,
  PIN_STEP_VH,
  PIN_TAIL_VH,
  RING_CARD_COUNT,
  RING_TILT_DEG,
  SETTLE_NUDGE_SHARE,
  STAGE_MARGIN_PX,
  STEP_DEG,
  applyMatrix,
  arrival,
  cardAngle,
  cardMatrix,
  cardPose,
  cssMatrix3d,
  dropEnd,
  frontToWorld,
  hoopPoint,
  hoopRiseAt,
  mirrorMatrix,
  multiply,
  nearestCard,
  pinLength,
  project,
  pulseAt,
  rawSteps,
  ringRadius,
  settleTarget,
  stageLayout,
  stepOffset,
  stickyTop,
  tiltMatrix,
  tiltPoint,
  turnSteps,
} from '../src/lib/gfx/ring';
import { ringProjects } from '../src/data/content';

const CARD = 400;
const R = ringRadius(CARD);
const VH = 900;
/** The checkpoint viewport. */
const CHECK_W = 1280;
const CHECK_H = 800;
const CHECK_D = cameraRig(CHECK_W, CHECK_H, 0, 0).distance;
const checkLayout = (cardHeight = 560) =>
  stageLayout({ viewportHeight: CHECK_H, cardHeight, radius: R, distance: CHECK_D, tiltDeg: RING_TILT_DEG });

describe('the ring holds the shipped sites', () => {
  it('has one card per ring project', () => {
    expect(RING_CARD_COUNT).toBe(ringProjects.length);
    expect(STEP_DEG).toBe(360 / RING_CARD_COUNT);
  });
});

describe('ringRadius', () => {
  // Side cards at ±72° must clear the front card on screen, with room for a focus ring.
  it('keeps the side cards clear of the front card', () => {
    const sideNearEdge = applyMatrix(cardMatrix(STEP_DEG, R, 0, 0), [-CARD / 2, 0, 0])[0];
    expect(sideNearEdge - CARD / 2).toBeGreaterThan(24);
  });

  it('keeps the side cards clear of the front card on screen, at the checkpoint', () => {
    const { frontY } = checkLayout();
    const frontX = CHECK_W / 2;
    const eye = { x: CHECK_W / 2, y: CHECK_H / 2 };
    for (const side of [1, -1]) {
      const [x, y, z] = applyMatrix(cardMatrix(side * STEP_DEG, R, RING_TILT_DEG, 0), [(-side * CARD) / 2, 0, 0]);
      const nearEdge = project([frontX + x, frontY + y, z], eye, CHECK_D).x;
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
      const steps = turnSteps(rawSteps(stepOffset(i, VH), VH));
      expect(steps).toBeCloseTo(i, 9);
      expect(cardAngle(i, steps)).toBeCloseTo(0, 9);
    }
  });

  it('holds the front card still across the lead, the tail and every dwell', () => {
    expect(turnSteps(rawSteps(0, VH))).toBe(0);
    expect(turnSteps(rawSteps(pinLength(VH), VH))).toBe(RING_CARD_COUNT - 1);
    for (let i = 1; i < RING_CARD_COUNT - 1; i++) {
      const halfDwell = (DWELL_SHARE / 2) * PIN_STEP_VH * VH;
      expect(turnSteps(rawSteps(stepOffset(i, VH) - halfDwell * 0.9, VH))).toBeCloseTo(i, 9);
      expect(turnSteps(rawSteps(stepOffset(i, VH) + halfDwell * 0.9, VH))).toBeCloseTo(i, 9);
    }
  });

  it('clamps outside the pin', () => {
    expect(rawSteps(-500, VH)).toBe(0);
    expect(rawSteps(pinLength(VH) + 500, VH)).toBe(RING_CARD_COUNT - 1);
  });

  it('turns monotonically, so scrolling back reverses it exactly', () => {
    let previous = -Infinity;
    for (let offset = 0; offset <= pinLength(VH); offset += 3) {
      const steps = turnSteps(rawSteps(offset, VH));
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
    expect(hoopPoint(cardAngle(1, 0), R, 0)[0]).toBeGreaterThan(0);
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

  it('is full strength at the front, gone at the back, and symmetric', () => {
    expect(cardPose(0)).toEqual({ opacity: 1, isFront: true, isInert: false });
    expect(cardPose(30).opacity).toBe(1);
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
  it('lifts the back of the hoop above the front point — on screen, at the checkpoint', () => {
    expect(hoopPoint(0, R, RING_TILT_DEG)).toEqual([0, 0, 0]);
    const { frontY } = checkLayout();
    const [, backY, backZ] = hoopPoint(180, R, RING_TILT_DEG);
    const back = project([0, frontY + backY, backZ], { x: 0, y: CHECK_H / 2 }, CHECK_D);
    expect(frontY - back.y).toBeGreaterThanOrEqual(40);
  });

  it('pivots on the front point, so the front card never moves with tilt', () => {
    expect(dropEnd(0, R, RING_TILT_DEG)).toEqual(dropEnd(0, R, 0));
    expect(dropEnd(0, R, 13)).toEqual([0, HOOP_DROP_PX, 0]);
  });

  it('hangs every drop plumb below its hoop point', () => {
    for (const phi of [-144, -72, 36, 72]) {
      const top = hoopPoint(phi, R, RING_TILT_DEG);
      const end = dropEnd(phi, R, RING_TILT_DEG);
      expect(end[0]).toBe(top[0]);
      expect(end[1]).toBeCloseTo(top[1] + HOOP_DROP_PX, 9);
      expect(end[2]).toBe(top[2]);
    }
  });

  it('tiltMatrix agrees with tiltPoint', () => {
    const p: [number, number, number] = [120, -40, -300];
    const a = applyMatrix(tiltMatrix(RING_TILT_DEG), p);
    const b = tiltPoint(p, RING_TILT_DEG);
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));
  });

  it('mirrorMatrix reflects in the floor', () => {
    const [x, y, z] = applyMatrix(mirrorMatrix(600), [10, 100, -50]);
    expect([x, y, z]).toEqual([10, 1100, -50]);
  });

  it('hoopRiseAt is how far the back projects above the front point, through the eye', () => {
    const d = 1000;
    const [, backY, backZ] = hoopPoint(180, R, RING_TILT_DEG);
    for (const frontY of [0, 150, 400, 620]) {
      const onScreen = project([0, frontY + backY, backZ], { x: 0, y: 400 }, d);
      expect(hoopRiseAt(frontY, 800, R, RING_TILT_DEG, d)).toBeCloseTo(frontY - onScreen.y, 9);
    }
    // The higher the hoop sits above the eye, the more we look up at it and the less its back rises.
    expect(hoopRiseAt(150, 800, R, RING_TILT_DEG, d)).toBeLessThan(hoopRiseAt(400, 800, R, RING_TILT_DEG, d));
  });
});

describe('cardMatrix', () => {
  it('is a pure translation for the front card — pixel-crisp', () => {
    const m = cardMatrix(0, R, RING_TILT_DEG, 0);
    expect(cssMatrix3d(m)).toBe('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,72,0,1)');
  });

  it('carries the card top-centre to its drop end, lowered by the rise', () => {
    for (const phi of [-144, -72, 0, 36, 72, 144]) {
      const end = dropEnd(phi, R, RING_TILT_DEG);
      const top = applyMatrix(cardMatrix(phi, R, RING_TILT_DEG, 0), [0, 0, 0]);
      top.forEach((v, i) => expect(v).toBeCloseTo(end[i], 9));
      const risen = applyMatrix(cardMatrix(phi, R, RING_TILT_DEG, 24), [0, 0, 0]);
      expect(risen[1]).toBeCloseTo(end[1] + 24, 9);
    }
  });

  it('turns the card part of the way to its angle', () => {
    const m = cardMatrix(72, R, RING_TILT_DEG, 0);
    const origin = applyMatrix(m, [0, 0, 0]);
    const normalTip = applyMatrix(m, [0, 0, 1]);
    const normal = normalTip.map((v, i) => v - origin[i]);
    const turned = (72 * CARD_FACING_SHARE * Math.PI) / 180;
    expect(normal[0]).toBeCloseTo(Math.sin(turned), 9);
    expect(normal[1]).toBeCloseTo(0, 9);
    expect(normal[2]).toBeCloseTo(Math.cos(turned), 9);
  });
});

describe('parity — CSS perspective and the camera put a card where its drop ends', () => {
  function cameraProject(width: number, height: number, scrollY: number, world: Vector3) {
    const rig = cameraRig(width, height, 0, scrollY);
    const camera = new PerspectiveCamera(rig.fov, rig.aspect, rig.near, rig.far);
    camera.position.set(...rig.position);
    camera.updateMatrixWorld();
    const ndc = world.clone().project(camera);
    return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
  }

  it.each([
    [900, 760, 5000],
    [1280, 800, 5200],
    [1920, 1080, 6100.5],
  ])('agrees to 0.5px at %ix%i', (width, height, scrollY) => {
    // The stage is stuck at the viewport top; the front point is at stage (fx, fy).
    const fx = width / 2 + 37;
    const fy = 180;
    const frontPageY = scrollY + fy;
    const toWorld = frontToWorld(fx, frontPageY);
    const rig = cameraRig(width, height, 0, scrollY);
    for (const phi of [-72, 0, 50, 72]) {
      for (const tilt of [RING_TILT_DEG, RING_TILT_DEG + 3]) {
        // CSS: the card's top-centre, transformed, then projected through the stage's
        // perspective with its origin at the viewport centre.
        const local = applyMatrix(cardMatrix(phi, R, tilt, 0), [0, 0, 0]);
        const css = project([fx + local[0], fy + local[1], local[2]], { x: width / 2, y: height / 2 }, rig.distance);
        // WebGL: the drop end, through the scene's camera.
        const end = applyMatrix(toWorld, dropEnd(phi, R, tilt));
        const gl = cameraProject(width, height, scrollY, new Vector3(...end));
        expect(Math.abs(css.x - gl.x)).toBeLessThan(0.5);
        expect(Math.abs(css.y - gl.y)).toBeLessThan(0.5);
      }
    }
  });

  it('multiply composes right-to-left like CSS', () => {
    const a = tiltMatrix(10);
    const b = frontToWorld(5, 7);
    const p: [number, number, number] = [3, 4, 5];
    const once = applyMatrix(multiply(b, a), p);
    const twice = applyMatrix(b, applyMatrix(a, p));
    once.forEach((v, i) => expect(v).toBeCloseTo(twice[i], 9));
  });
});

describe('stageLayout', () => {
  it('fits a 560px card in a 900px viewport, with the hoop back clear of the top', () => {
    const d = 900 / 2 / Math.tan((15 * Math.PI) / 180);
    const layout = stageLayout({ viewportHeight: 900, cardHeight: 560, radius: R, distance: d, tiltDeg: RING_TILT_DEG });
    expect(layout.fits).toBe(true);
    expect(layout.frontY - hoopRiseAt(layout.frontY, 900, R, RING_TILT_DEG, d)).toBeGreaterThanOrEqual(STAGE_MARGIN_PX - 1e-9);
    expect(layout.floorY).toBe(HOOP_DROP_PX + 560 + 24);
  });

  it('fits a 560px card at the checkpoint, 1280×800 — the floor may run off, the cards may not', () => {
    const layout = checkLayout();
    expect(layout.fits).toBe(true);
    expect(layout.frontY - hoopRiseAt(layout.frontY, CHECK_H, R, RING_TILT_DEG, CHECK_D)).toBeCloseTo(STAGE_MARGIN_PX, 9);
    expect(layout.frontY + HOOP_DROP_PX + 560 + FIT_MARGIN_PX).toBeLessThanOrEqual(CHECK_H);
  });

  it('centres the block when there is room', () => {
    const d = 1080 / 2 / Math.tan((15 * Math.PI) / 180);
    const layout = stageLayout({ viewportHeight: 1080, cardHeight: 560, radius: R, distance: d, tiltDeg: RING_TILT_DEG });
    const top = layout.frontY - hoopRiseAt(layout.frontY, 1080, R, RING_TILT_DEG, d);
    const bottom = layout.frontY + HOOP_DROP_PX + 560;
    expect(top).toBeGreaterThan(STAGE_MARGIN_PX);
    expect(top).toBeCloseTo(1080 - bottom, 9);
  });

  it('does not fit a 560px card in a 700px viewport', () => {
    const d = 700 / 2 / Math.tan((15 * Math.PI) / 180);
    expect(stageLayout({ viewportHeight: 700, cardHeight: 560, radius: R, distance: d, tiltDeg: RING_TILT_DEG }).fits).toBe(false);
  });
});

describe('arrival', () => {
  it('draws the hoop, then the drops, then raises the cards', () => {
    expect(arrival(0)).toEqual({ hoop: 0, drops: 0, cards: 0 });
    expect(arrival(1)).toEqual({ hoop: 1, drops: 1, cards: 1 });
    const early = arrival(0.3);
    expect(early.hoop).toBeGreaterThan(0);
    expect(early.drops).toBe(0);
    let previous = arrival(0);
    for (let a = 0; a <= 1; a += 0.01) {
      const now = arrival(a);
      expect(now.hoop).toBeGreaterThanOrEqual(previous.hoop);
      expect(now.drops).toBeGreaterThanOrEqual(previous.drops);
      expect(now.cards).toBeGreaterThanOrEqual(previous.cards);
      previous = now;
    }
  });
});

describe('pulseAt', () => {
  it('is quiet before the first turn', () => {
    expect(pulseAt(0).hoopStrength).toBe(0);
    expect(pulseAt(0).flare).toBe(0);
  });

  it('leaves the front point and reaches the arriving card on its side of the hoop', () => {
    const start = pulseAt(DWELL_SHARE / 2 + 0.001);
    expect(start.card).toBe(1);
    expect(start.hoopDeg).toBeLessThan(5);
    const mid = pulseAt(0.5);
    expect(mid.hoopDeg).toBeCloseTo(cardAngle(1, turnSteps(0.5)), 6);
    expect(mid.hoopDeg).toBeGreaterThan(0);
  });

  it('runs down the drop and flares as the card arrives', () => {
    const arriving = pulseAt(1 - DWELL_SHARE / 4);
    expect(arriving.card).toBe(1);
    expect(arriving.dropAt).toBeGreaterThan(0);
    expect(arriving.dropAt).toBeLessThan(1);
    expect(pulseAt(1).flare).toBeCloseTo(1, 9);
    expect(pulseAt(1).dropAt).toBe(1);
  });

  it('keeps the flare on the card that just landed, before the next pulse leaves', () => {
    const after = pulseAt(1 + DWELL_SHARE / 4);
    expect(after.card).toBe(1);
    expect(after.hoopStrength).toBe(0);
    expect(after.flare).toBeGreaterThan(0);
  });

  it('is a pure function of scroll — the same raw gives the same pulse', () => {
    expect(pulseAt(2.37)).toEqual(pulseAt(2.37));
  });
});
