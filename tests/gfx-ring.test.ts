import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  applyMatrix,
  arrival,
  cardAngle,
  cardMatrix,
  cardPose,
  cssMatrix3d,
  dropEnd,
  DWELL_SHARE,
  FLOOR_GAP_PX,
  frontToWorld,
  hoopPoint,
  hoopRise,
  HOOP_DROP_PX,
  mirrorMatrix,
  multiply,
  nearestCard,
  PIN_LEAD_VH,
  PIN_STEP_VH,
  PIN_TAIL_VH,
  pinLength,
  project,
  pulseAt,
  RADIUS_PER_CARD_WIDTH,
  rawSteps,
  RING_CARD_COUNT,
  ringRadius,
  STAGE_MARGIN_PX,
  stageLayout,
  STEP_DEG,
  stepOffset,
  stickyTop,
  tiltMatrix,
  tiltPoint,
  turnSteps,
  type Mat4,
  type Vec3,
} from '../src/lib/gfx/ring';
import { cameraRig } from '../src/lib/gfx/camera';
import { easeLine } from '../src/lib/signal/draw';
import { ringProjects } from '../src/data/content';

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const lastCard = RING_CARD_COUNT - 1;

describe('RING_CARD_COUNT', () => {
  it('matches the number of shipped cards (content.ts), not a number invented here', () => {
    expect(RING_CARD_COUNT).toBe(ringProjects.length);
  });
});

describe('ringRadius', () => {
  it('keeps adjacent cards (STEP_DEG apart) from overlapping, at several widths', () => {
    for (const cardWidth of [280, 400, 540]) {
      const radius = ringRadius(cardWidth);
      expect(radius).toBe(cardWidth * RADIUS_PER_CARD_WIDTH);
      // Chord length between two hoop points STEP_DEG apart (flat, before any tilt).
      const chord = 2 * radius * Math.sin((STEP_DEG / 2) * (Math.PI / 180));
      expect(chord).toBeGreaterThan(cardWidth);
    }
  });
});

describe('pinLength', () => {
  it('is LEAD + (cards − 1) × STEP + TAIL, scaled by the viewport', () => {
    const vhShare = PIN_LEAD_VH + lastCard * PIN_STEP_VH + PIN_TAIL_VH;
    for (const viewportHeight of [700, 900, 1200]) {
      expect(pinLength(viewportHeight)).toBeCloseTo(vhShare * viewportHeight, 9);
    }
  });

  it('scales linearly with viewport height', () => {
    expect(pinLength(1800)).toBeCloseTo(2 * pinLength(900), 9);
  });
});

describe('stepOffset / rawSteps', () => {
  it('round-trip: rawSteps lands exactly back on the card stepOffset was built for', () => {
    for (const viewportHeight of [700, 900, 1200]) {
      for (let card = 0; card <= lastCard; card++) {
        const offset = stepOffset(card, viewportHeight);
        expect(rawSteps(offset, viewportHeight)).toBeCloseTo(card, 9);
      }
    }
  });

  it('is unclamped — before the lead or past the last step reads as negative or past lastCard', () => {
    expect(rawSteps(0, 900)).toBeLessThan(0);
    expect(rawSteps(stepOffset(lastCard, 900) + 900, 900)).toBeGreaterThan(lastCard);
  });
});

describe('turnSteps', () => {
  it('starts on card 0 and ends on the last card', () => {
    expect(turnSteps(0)).toBe(0);
    expect(turnSteps(lastCard)).toBe(lastCard);
  });

  it('clamps outside the cards’ range', () => {
    expect(turnSteps(-5)).toBe(0);
    expect(turnSteps(lastCard + 5)).toBe(lastCard);
  });

  it('is flat across each dwell window, centred on every interior card', () => {
    const half = DWELL_SHARE / 2;
    for (let card = 1; card < lastCard; card++) {
      expect(turnSteps(card - half)).toBeCloseTo(card, 9);
      expect(turnSteps(card)).toBe(card);
      expect(turnSteps(card + half)).toBeCloseTo(card, 9);
    }
  });

  it('never decreases as raw increases (monotonic — scrolling back retraces it exactly)', () => {
    const samples = Array.from({ length: 401 }, (_, i) => (i / 400) * lastCard);
    const values = samples.map(turnSteps);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
  });

  it('stays strictly between two cards while travelling, never jumping past the next', () => {
    const half = DWELL_SHARE / 2;
    const travelStart = 1 + half;
    const travelSpan = 1 - DWELL_SHARE;
    const samples = Array.from({ length: 49 }, (_, i) => travelStart + ((i + 1) / 50) * travelSpan);
    for (const raw of samples) {
      const value = turnSteps(raw);
      expect(value).toBeGreaterThan(1);
      expect(value).toBeLessThan(2);
    }
  });

  it('eases the travel window with easeLine, the module’s one ease function', () => {
    const half = DWELL_SHARE / 2;
    const travelStart = 1 + half;
    const travelSpan = 1 - DWELL_SHARE;
    const raw = travelStart + 0.4 * travelSpan;
    expect(turnSteps(raw)).toBeCloseTo(1 + easeLine(0.4), 9);
  });
});

describe('cardAngle', () => {
  it('is 0 when the card has exactly turned into front', () => {
    for (let card = 0; card <= lastCard; card++) {
      expect(cardAngle(card, card)).toBe(0);
    }
  });

  it('wraps to (-180, 180]', () => {
    for (const [card, steps] of [[4, 0], [0, 4], [3, 0], [1, 4]] as const) {
      const angle = cardAngle(card, steps);
      expect(angle).toBeGreaterThan(-180);
      expect(angle).toBeLessThanOrEqual(180);
    }
  });

  it('matches STEP_DEG × the card/step gap before wrapping', () => {
    expect(cardAngle(1, 0)).toBeCloseTo(STEP_DEG, 9);
    expect(cardAngle(0, 1)).toBeCloseTo(-STEP_DEG, 9);
  });
});

describe('cardPose', () => {
  it('is full strength within 30°, symmetric either side of front', () => {
    expect(cardPose(0).opacity).toBe(1);
    expect(cardPose(30).opacity).toBe(1);
    expect(cardPose(-30)).toEqual(cardPose(30));
  });

  it('fades to 0 by 110° and stays 0 beyond it', () => {
    expect(cardPose(110).opacity).toBe(0);
    expect(cardPose(170).opacity).toBe(0);
  });

  it('isFront only within the full-strength band', () => {
    expect(cardPose(29).isFront).toBe(true);
    expect(cardPose(31).isFront).toBe(false);
  });

  it('isInert exactly where opacity drops below 0.3, and never while isFront', () => {
    for (let angle = 0; angle <= 180; angle += 1) {
      const pose = cardPose(angle);
      expect(pose.isInert).toBe(pose.opacity < 0.3);
      if (pose.isFront) expect(pose.isInert).toBe(false);
    }
  });
});

describe('nearestCard', () => {
  it('round-trips through stepOffset and clamps outside the cards’ range', () => {
    for (let card = 0; card <= lastCard; card++) {
      expect(nearestCard(stepOffset(card, 900), 900)).toBe(card);
    }
    expect(nearestCard(-10_000, 900)).toBe(0);
    expect(nearestCard(10_000_000, 900)).toBe(lastCard);
  });
});

describe('tiltPoint', () => {
  it('leaves the origin (the pivot) exactly put, at any tilt', () => {
    for (const tiltDeg of [0, 3, 10, -10, 45]) {
      expect(tiltPoint([0, 0, 0], tiltDeg)).toEqual([0, 0, 0]);
    }
  });

  it('is the identity at tiltDeg 0, with no stray -0', () => {
    const p: Vec3 = [12, -340, -58];
    expect(tiltPoint(p, 0)).toEqual(p);
  });

  it('preserves distance from the origin (it is a rotation)', () => {
    const p: Vec3 = [40, -120, -300];
    const length = Math.hypot(...p);
    for (const tiltDeg of [3, 10, 37]) {
      const tilted = tiltPoint(p, tiltDeg);
      expect(Math.hypot(...tilted)).toBeCloseTo(length, 9);
    }
  });

  it('tips the far side (negative z) up (negative y), for a positive tilt', () => {
    const far: Vec3 = [0, 0, -500];
    const tilted = tiltPoint(far, 10);
    expect(tilted[1]).toBeLessThan(0);
  });
});

describe('hoopPoint', () => {
  it('is exactly the front point at phi 0, whatever the radius or tilt', () => {
    for (const radius of [300, 500]) {
      for (const tiltDeg of [0, 10]) {
        expect(hoopPoint(0, radius, tiltDeg)).toEqual([0, 0, 0]);
      }
    }
  });

  it('stays radius away from the tilted centre, all the way round', () => {
    const radius = 440;
    for (const tiltDeg of [0, 10]) {
      const centre = tiltPoint([0, 0, -radius], tiltDeg);
      for (let phi = -180; phi <= 180; phi += 15) {
        const p = hoopPoint(phi, radius, tiltDeg);
        const distance = Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]);
        expect(distance).toBeCloseTo(radius, 6);
      }
    }
  });

  it('with no tilt, is the flat circle in the x–z plane', () => {
    const radius = 440;
    expect(hoopPoint(90, radius, 0)[0]).toBeCloseTo(radius, 9);
    expect(hoopPoint(90, radius, 0)[1]).toBe(0);
    expect(hoopPoint(180, radius, 0)[2]).toBeCloseTo(-2 * radius, 9);
  });
});

describe('dropEnd', () => {
  it('is exactly HOOP_DROP_PX from its hoopPoint, at any angle or tilt', () => {
    const radius = 440;
    for (const tiltDeg of [0, 10]) {
      for (let phi = -180; phi <= 180; phi += 30) {
        const hoop = hoopPoint(phi, radius, tiltDeg);
        const end = dropEnd(phi, radius, tiltDeg);
        const distance = Math.hypot(end[0] - hoop[0], end[1] - hoop[1], end[2] - hoop[2]);
        expect(distance).toBeCloseTo(HOOP_DROP_PX, 9);
      }
    }
  });

  it('hangs straight down (page y) from the front point when the ring is untilted', () => {
    const end = dropEnd(0, 440, 0);
    expect(end).toEqual([0, HOOP_DROP_PX, 0]);
  });
});

describe('tiltMatrix agrees with tiltPoint', () => {
  it('applying the matrix matches tiltPoint, for several points and tilts', () => {
    const points: Vec3[] = [[0, 0, 0], [50, -20, -300], [0, 0, -880]];
    for (const tiltDeg of [0, 3, 10, -10]) {
      const m = tiltMatrix(tiltDeg);
      for (const p of points) {
        const viaMatrix = applyMatrix(m, p);
        const viaPoint = tiltPoint(p, tiltDeg);
        expect(viaMatrix[0]).toBeCloseTo(viaPoint[0], 9);
        expect(viaMatrix[1]).toBeCloseTo(viaPoint[1], 9);
        expect(viaMatrix[2]).toBeCloseTo(viaPoint[2], 9);
      }
    }
  });

  it('is exactly the identity at tiltDeg 0 — no stray -0 in the matrix', () => {
    expect(tiltMatrix(0)).toEqual(IDENTITY);
  });
});

describe('mirrorMatrix', () => {
  it('reflects y across the floor, leaving x and z untouched', () => {
    const m = mirrorMatrix(100);
    expect(applyMatrix(m, [5, 20, -7])).toEqual([5, 180, -7]);
    expect(applyMatrix(m, [5, 100, -7])).toEqual([5, 100, -7]);
  });

  it('is clean at floorY 0 — no stray -0', () => {
    expect(applyMatrix(mirrorMatrix(0), [3, 0, -9])[1]).toBe(0);
  });
});

describe('frontToWorld', () => {
  it('offsets x by frontPageX and negates (y + frontPageY)', () => {
    const m = frontToWorld(100, 200);
    expect(applyMatrix(m, [10, 20, 5])).toEqual([110, -220, 5]);
  });

  it('is clean at the page origin — no stray -0', () => {
    expect(applyMatrix(frontToWorld(0, 0), [0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('multiply + applyMatrix', () => {
  it('identity leaves a matrix unchanged', () => {
    const m = frontToWorld(37, 211);
    expect(multiply(m, IDENTITY)).toEqual(m);
    expect(multiply(IDENTITY, m)).toEqual(m);
  });

  it('multiply(a, b) applied to a point matches applying b then a (b first)', () => {
    const a = frontToWorld(80, 500);
    const b = cardMatrix(36, 440, 10, -12);
    const p: Vec3 = [15, -40, 3];
    const combined = applyMatrix(multiply(a, b), p);
    const sequential = applyMatrix(a, applyMatrix(b, p));
    expect(combined[0]).toBeCloseTo(sequential[0], 6);
    expect(combined[1]).toBeCloseTo(sequential[1], 6);
    expect(combined[2]).toBeCloseTo(sequential[2], 6);
  });
});

describe('cardMatrix', () => {
  it('at phi 0 is an unrotated translation to dropEnd (D9 — the front card is flat)', () => {
    const m = cardMatrix(0, 440, 10, 0);
    const origin = applyMatrix(m, [0, 0, 0]);
    expect(origin).toEqual(dropEnd(0, 440, 10));
    // A step along the card's own x should land purely in x — no rotation leaking into z.
    const stepX = applyMatrix(m, [1, 0, 0]);
    expect(stepX[2] - origin[2]).toBe(0);
  });

  it('nudges the card up by `rise`, independent of its angle', () => {
    const atRest = applyMatrix(cardMatrix(36, 440, 10, 0), [0, 0, 0]);
    const rising = applyMatrix(cardMatrix(36, 440, 10, -20), [0, 0, 0]);
    expect(atRest[1] - rising[1]).toBeCloseTo(20, 9);
  });

  it('faces the card outward: its own +z normal matches the hoop point’s own radial direction', () => {
    const radius = 440;
    for (const phi of [36, 90, 144]) {
      const m = cardMatrix(phi, radius, 0, 0);
      const origin = applyMatrix(m, [0, 0, 0]);
      const normalTip = applyMatrix(m, [0, 0, 1]);
      const normal = [normalTip[0] - origin[0], normalTip[1] - origin[1], normalTip[2] - origin[2]];
      // The card hangs below the hoop, so "outward" is read off the hoop point, not the card's
      // own (lower) position — the drop adds a y offset that has nothing to do with facing.
      const hoop = hoopPoint(phi, radius, 0);
      const centre: Vec3 = [0, 0, -radius];
      const outward = [hoop[0] - centre[0], hoop[1] - centre[1], hoop[2] - centre[2]];
      const outwardLength = Math.hypot(...outward);
      const dot = (normal[0] * outward[0] + normal[1] * outward[1] + normal[2] * outward[2]) / outwardLength;
      expect(dot).toBeCloseTo(1, 6);
    }
  });
});

describe('cssMatrix3d', () => {
  it('formats sixteen comma-separated numbers, column-major, in order', () => {
    expect(cssMatrix3d(IDENTITY)).toBe('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');
  });

  it('never prints a stray minus on a clean zero', () => {
    const m = tiltMatrix(0);
    expect(cssMatrix3d(m)).not.toContain('-0');
  });
});

describe('project', () => {
  it('is 1:1 at z = 0, offset only by origin', () => {
    expect(project([120, -45, 0], { x: 700, y: 450 }, 1600)).toEqual({ x: 820, y: 405 });
  });

  it('agrees with a real THREE.PerspectiveCamera at the page plane and behind it', () => {
    const width = 1440;
    const height = 900;
    const rig = cameraRig(width, height, 0, 0);
    const camera = new PerspectiveCamera(rig.fov, rig.aspect, rig.near, rig.far);
    camera.position.set(...rig.position);
    camera.updateMatrixWorld();
    const origin = { x: width / 2, y: height / 2 };

    for (const z of [0, -300, -800]) {
      for (const [dx, dy] of [[0, 0], [250, -150], [-400, 300]] as const) {
        const expected = project([dx, dy, z], origin, rig.distance);
        const world = new Vector3(width / 2 + dx, -(height / 2 + dy), z);
        const ndc = world.clone().project(camera);
        const actual = { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
        expect(actual.x).toBeCloseTo(expected.x, 4);
        expect(actual.y).toBeCloseTo(expected.y, 4);
      }
    }
  });
});

describe('hoopRise', () => {
  it('is 0 with no tilt — the hoop is flat, nothing rises', () => {
    expect(hoopRise(440, 0, 1600)).toBe(0);
  });

  it('grows with more tilt and with a larger radius', () => {
    expect(hoopRise(440, 20, 1600)).toBeGreaterThan(hoopRise(440, 10, 1600));
    expect(hoopRise(600, 10, 1600)).toBeGreaterThan(hoopRise(440, 10, 1600));
  });
});

describe('stageLayout', () => {
  const base = { cardHeight: 540, radius: 440, distance: 1600, tiltDeg: 10 };

  it('fits a generous viewport and not a tiny one', () => {
    expect(stageLayout({ ...base, viewportHeight: 1400 }).fits).toBe(true);
    expect(stageLayout({ ...base, viewportHeight: 300 }).fits).toBe(false);
  });

  it('spaces the floor below the front point by exactly the drop, the card and the gap', () => {
    const { frontY, floorY } = stageLayout({ ...base, viewportHeight: 1400 });
    expect(floorY - frontY).toBeCloseTo(HOOP_DROP_PX + base.cardHeight + FLOOR_GAP_PX, 9);
  });

  it('leaves at least the stage margin above the front point', () => {
    const { frontY } = stageLayout({ ...base, viewportHeight: 1400 });
    expect(frontY).toBeGreaterThanOrEqual(STAGE_MARGIN_PX);
  });
});

describe('stickyTop', () => {
  it('is 0 before the rail and the pin length once past it, clamped between', () => {
    expect(stickyTop(0, 1000, 2600)).toBe(0);
    expect(stickyTop(1000, 1000, 2600)).toBe(0);
    expect(stickyTop(1000 + 2600 + 5000, 1000, 2600)).toBe(2600);
    expect(stickyTop(1000 + 1300, 1000, 2600)).toBe(1300);
  });
});

describe('arrival', () => {
  it('runs hoop, then drops, then cards, each its own full 0…1 beat', () => {
    expect(arrival(0)).toEqual({ hoop: 0, drops: 0, cards: 0 });
    expect(arrival(1)).toEqual({ hoop: 1, drops: 1, cards: 1 });
    // 1/3 and 2/3 are not exact in binary floating point, so check each field within tolerance
    // rather than the whole object at once.
    const atFirstThird = arrival(1 / 3);
    expect(atFirstThird.hoop).toBeCloseTo(1, 9);
    expect(atFirstThird.drops).toBeCloseTo(0, 9);
    expect(atFirstThird.cards).toBeCloseTo(0, 9);
    const atSecondThird = arrival(2 / 3);
    expect(atSecondThird.hoop).toBeCloseTo(1, 9);
    expect(atSecondThird.drops).toBeCloseTo(1, 9);
    expect(atSecondThird.cards).toBeCloseTo(0, 9);
  });

  it('clamps outside 0…1, so a reversed scroll never goes negative', () => {
    expect(arrival(-1)).toEqual({ hoop: 0, drops: 0, cards: 0 });
    expect(arrival(2)).toEqual({ hoop: 1, drops: 1, cards: 1 });
  });

  it('is monotonic in every beat as a rises', () => {
    const samples = Array.from({ length: 101 }, (_, i) => i / 100);
    let prev = arrival(0);
    for (const a of samples.slice(1)) {
      const next = arrival(a);
      expect(next.hoop).toBeGreaterThanOrEqual(prev.hoop);
      expect(next.drops).toBeGreaterThanOrEqual(prev.drops);
      expect(next.cards).toBeGreaterThanOrEqual(prev.cards);
      prev = next;
    }
  });
});

describe('pulseAt', () => {
  const half = DWELL_SHARE / 2;

  it('is quiescent before the first dwell ends — no hoop travel, no flare', () => {
    const before = pulseAt(0);
    expect(before.hoopDeg).toBe(0);
    expect(before.hoopStrength).toBe(0);
    expect(before.flare).toBe(0);
  });

  it('flares fully the instant a card lands, with no hoop strength left', () => {
    const landed = pulseAt(1);
    expect(landed.card).toBe(1);
    expect(landed.dropAt).toBe(1);
    expect(landed.hoopStrength).toBe(0);
    expect(landed.flare).toBe(1);
  });

  it('keeps the flare on the card that just landed, before the next pulse leaves', () => {
    const after = pulseAt(1 + DWELL_SHARE / 4);
    expect(after.card).toBe(1);
    expect(after.hoopStrength).toBe(0);
    expect(after.flare).toBeGreaterThan(0);
  });

  it('fades the flare to 0 by the end of the landed card’s dwell', () => {
    expect(pulseAt(1 + half).flare).toBeCloseTo(0, 9);
  });

  it('hoopStrength runs 1 → 0 as the pulse drops into the arriving card', () => {
    const dropStart = 2 - half; // card 2's incoming dwell begins here
    const samples = Array.from({ length: 21 }, (_, i) => dropStart + (i / 20) * half);
    const values = samples.map((raw) => pulseAt(raw).hoopStrength);
    expect(values[0]).toBeCloseTo(1, 6);
    expect(values[values.length - 1]).toBeCloseTo(0, 6);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1e-9);
  });

  it('never reports a card past the last one, even scrolled far beyond the pin', () => {
    expect(pulseAt(50).card).toBe(lastCard);
    expect(pulseAt(50).hoopDeg).toBe(0);
  });

  it('hoopDeg is never negative', () => {
    for (let raw = -1; raw <= RING_CARD_COUNT; raw += 0.05) {
      expect(pulseAt(raw).hoopDeg).toBeGreaterThanOrEqual(0);
    }
  });
});
