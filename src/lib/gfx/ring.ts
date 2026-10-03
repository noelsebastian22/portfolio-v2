/**
 * The 3D ring's geometry (Phase 12 design D5): the only place section 04's radius, tilt, turn
 * angle, hoop, drops, pulse and stage layout are computed. `ring-stage.ts` reads this for the
 * cards' CSS transforms; `ring-mesh.ts` reads it for the hoop/drop tube and the emissions. Both
 * must agree, so both read the same numbers from here rather than each deriving their own.
 *
 * **Front space.** Every point and matrix here lives in one local frame: the origin is the
 * hoop's front point (where the signal's line meets it, D9), `x` right, `y` DOWN and `z` toward
 * the viewer — all CSS px. `y` down matches the page (and CSS `matrix3d`); `z` toward the viewer
 * matches `camera.ts`'s world space, where `z = 0` is the page plane and the camera sits at
 * positive `z`. `frontToWorld` is the one place front space is anchored into a page position and
 * flipped into that world space (`y` negated) for the Three.js scene; everything else — the
 * hoop, the drops, the cards — is built in front space first, so the ring's shape never depends
 * on where its front point happens to be on the page.
 *
 * **The hoop is a circle in the `x`–`z` plane**, centred `radius` behind the front point
 * (`z = −radius`), turned about the vertical axis by `phiDeg` (0 at the front, closer to the
 * viewer as `phi → 0`). D8's 10° "look-down" is a separate rotation, about `x` through the same
 * front point, applied on top — a rigid tilt of the whole assembly (hoop, drops, cards'
 * position), never of a card's own face: a card's *rotation* only ever turns with its own `phi`
 * (D2's carousel — each card stays tangent to the hoop, facing outward), which is what keeps the
 * front card (`phi = 0`) flat and undistorted (D9) regardless of the ring's tilt.
 *
 * **Matrices are column-major 16-number arrays** — `CSS matrix3d()`'s order and
 * `THREE.Matrix4.fromArray`'s, so the same array drives both a card's CSS transform and (via
 * `applyMatrix`) a parity check against the mesh's own points.
 *
 * Pure throughout: no DOM, no Three.js.
 */

import { easeLine, unit } from '../signal/draw';

export type Vec3 = readonly [x: number, y: number, z: number];
export type Mat4 = readonly number[];

export const RING_CARD_COUNT = 5;
export const STEP_DEG = 72;
export const RING_TILT_DEG = 10;
export const POINTER_TILT_DEG = 3;
export const RADIUS_PER_CARD_WIDTH = 1.1;
export const HOOP_DROP_PX = 72;
export const DWELL_SHARE = 0.35;
export const PIN_LEAD_VH = 0.25;
export const PIN_STEP_VH = 0.6;
export const PIN_TAIL_VH = 0.25;
export const ARRIVAL_DRAW_VH = 0.35;
export const STAGE_MARGIN_PX = 32;
export const FLOOR_GAP_PX = 24;

/** The last card's index — turning never goes further than this (D1: five cards, four steps). */
const lastCard = RING_CARD_COUNT - 1;
/** Half the dwell sits either side of a card's exact front angle (D10) — `turnSteps` and
 *  `pulseAt` both hold flat across this window, so the ring and its pulse agree on when a card
 *  is "at rest". */
const HALF_DWELL = DWELL_SHARE / 2;
/** Where, within a step, the pulse reaches the hoop and starts riding the card in (D1's beat 2):
 *  literally halfway through the step, not halfway through the travel between dwells. */
const PULSE_MEETS = 0.5;
/** `cardPose`'s fade band (D3): full strength to here, zero by the second number. */
const FULL_STRENGTH_DEG = 30;
const FADED_OUT_DEG = 110;
/** Below this opacity a back card stops taking pointer events (D3), though it stays focusable. */
const INERT_OPACITY = 0.3;
/** Arrival's three beats — draw, fall, rise (design §4, beat 1) — share the clock in order. */
const ARRIVAL_BEATS = 3;

/** `-0` prints and `toEqual`s differently from `0`; this keeps exact-zero geometry (the front
 *  point, a tilt of 0°) clean of the sign flips rotation and reflection formulas produce. */
function clean(n: number): number {
  return n === 0 ? 0 : n;
}

/** `deg` wrapped to (-180, 180], the range `cardAngle` promises. */
function wrapDeg(deg: number): number {
  const wrapped = ((deg % 360) + 360) % 360; // [0, 360)
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/** The hoop's radius for a card this wide: wide enough that adjacent cards (`STEP_DEG` apart)
 *  never overlap. */
export function ringRadius(cardWidth: number): number {
  return cardWidth * RADIUS_PER_CARD_WIDTH;
}

/** The rail's extra height while 3D is on: one step's worth of scroll per card after the first,
 *  plus a lead-in and a tail-out (design §4 — "`PIN = LEAD + 4 × STEP + TAIL`", generalised past
 *  five cards). */
export function pinLength(viewportHeight: number): number {
  return (PIN_LEAD_VH + lastCard * PIN_STEP_VH + PIN_TAIL_VH) * viewportHeight;
}

/** The pin offset at which `card`'s dwell is centred. */
export function stepOffset(card: number, viewportHeight: number): number {
  return (PIN_LEAD_VH + card * PIN_STEP_VH) * viewportHeight;
}

/** `pinOffset` as a continuous step count — 0 at card 0's dwell centre, `lastCard` at the
 *  last's. Unclamped: callers (`turnSteps`, `nearestCard`) decide what to do outside that range. */
export function rawSteps(pinOffset: number, viewportHeight: number): number {
  return (pinOffset / viewportHeight - PIN_LEAD_VH) / PIN_STEP_VH;
}

/**
 * `raw` turned into the ring's actual angle, in step units: flat across each dwell (D10) —
 * `HALF_DWELL` either side of every card's exact position — and eased between them, so scrubbing
 * `raw` back and forth retraces the same turn exactly (it is a pure function of it, no clock).
 * Clamped to the five cards' range; never runs past the first or the last.
 */
export function turnSteps(raw: number): number {
  const clamped = Math.min(lastCard, Math.max(0, raw));
  const card = Math.floor(clamped);
  if (card >= lastCard) return lastCard;
  const fraction = clamped - card;
  if (fraction <= HALF_DWELL) return card;
  if (fraction >= 1 - HALF_DWELL) return card + 1;
  const travel = (fraction - HALF_DWELL) / (1 - DWELL_SHARE);
  return card + easeLine(travel);
}

/** `card`'s angle from the front, degrees, once the ring has turned `steps` (continuous, as
 *  `turnSteps` returns) — 0 when `card` is exactly at the front. */
export function cardAngle(card: number, steps: number): number {
  return wrapDeg(STEP_DEG * (card - steps));
}

/**
 * A card's look and interactivity at `angleDeg` from the front (D3): full strength within
 * `FULL_STRENGTH_DEG`, faded to nothing by `FADED_OUT_DEG`, linear between. `isInert` cards keep
 * their focusability — only pointer events are withheld.
 */
export function cardPose(angleDeg: number): { opacity: number; isFront: boolean; isInert: boolean } {
  const abs = Math.abs(angleDeg);
  const span = FADED_OUT_DEG - FULL_STRENGTH_DEG;
  const opacity = abs <= FULL_STRENGTH_DEG ? 1 : abs >= FADED_OUT_DEG ? 0 : 1 - (abs - FULL_STRENGTH_DEG) / span;
  return {
    opacity: clean(opacity),
    isFront: abs <= FULL_STRENGTH_DEG,
    isInert: opacity < INERT_OPACITY,
  };
}

/** The card index (0 … `lastCard`) nearest `pinOffset` — where a settle (D10) or a focus
 *  (Task 6) lands the scroll. */
export function nearestCard(pinOffset: number, viewportHeight: number): number {
  const raw = rawSteps(pinOffset, viewportHeight);
  return Math.min(lastCard, Math.max(0, Math.round(raw)));
}

/**
 * `p` rotated `tiltDeg` about the `x`-axis through the origin. Positive `tiltDeg` tips the far
 * side (negative `z`) up (negative `y`) — the "look down on the circle from above" read D8 asks
 * for — while leaving anything already at the origin (the front point, the pivot) exactly there.
 */
export function tiltPoint(p: Vec3, tiltDeg: number): Vec3 {
  const rad = (tiltDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const [x, y, z] = p;
  return [clean(x), clean(y * cos + z * sin), clean(z * cos - y * sin)];
}

/** The hoop point at angle `phiDeg` (0 at the front) on a circle of `radius`, tilted `tiltDeg`. */
export function hoopPoint(phiDeg: number, radius: number, tiltDeg: number): Vec3 {
  const phi = (phiDeg * Math.PI) / 180;
  const flat: Vec3 = [radius * Math.sin(phi), 0, radius * (Math.cos(phi) - 1)];
  return tiltPoint(flat, tiltDeg);
}

/** Where a card hanging from `hoopPoint(phiDeg, radius, tiltDeg)` ends its drop: rotation is
 *  linear, so tilting the hoop point and the (locally straight-down) drop vector separately and
 *  adding them is the same as tilting the whole rigid piece at once. */
export function dropEnd(phiDeg: number, radius: number, tiltDeg: number): Vec3 {
  const hoop = hoopPoint(phiDeg, radius, tiltDeg);
  const drop = tiltPoint([0, HOOP_DROP_PX, 0], tiltDeg);
  return [clean(hoop[0] + drop[0]), clean(hoop[1] + drop[1]), clean(hoop[2] + drop[2])];
}

/**
 * A card's full transform: faces outward from the ring (rotated about `y` by its own `phiDeg`,
 * D2's carousel — 0° at the front leaves it flat and undistorted, D9), positioned at its drop's
 * end, nudged up by `rise` px while it is still landing (design §4 beat 1: "each card rises into
 * place as its drop lands").
 */
export function cardMatrix(phiDeg: number, radius: number, tiltDeg: number, rise: number): Mat4 {
  const end = dropEnd(phiDeg, radius, tiltDeg);
  const rad = (phiDeg * Math.PI) / 180;
  const cos = clean(Math.cos(rad));
  const sin = clean(Math.sin(rad));
  return [
    cos, 0, clean(-sin), 0,
    0, 1, 0, 0,
    sin, 0, cos, 0,
    end[0], clean(end[1] + rise), end[2], 1,
  ];
}

/** `tiltPoint`, as a matrix — so a card's position and the hoop/drop meshes can be carried by
 *  the same tilt without re-deriving it. */
export function tiltMatrix(tiltDeg: number): Mat4 {
  const rad = (tiltDeg * Math.PI) / 180;
  const cos = clean(Math.cos(rad));
  const sin = clean(Math.sin(rad));
  return [
    1, 0, 0, 0,
    0, cos, clean(-sin), 0,
    0, sin, cos, 0,
    0, 0, 0, 1,
  ];
}

/** Reflects across the horizontal plane `y = floorY` — the hoop's floor reflection (D13). */
export function mirrorMatrix(floorY: number): Mat4 {
  return [
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, 1, 0,
    0, clean(2 * floorY), 0, 1,
  ];
}

/**
 * Anchors front space into the page at `(frontPageX, frontPageY)` and flips it into
 * `camera.ts`'s world space (`y` negated; `z` already agrees — both put the page plane at 0).
 */
export function frontToWorld(frontPageX: number, frontPageY: number): Mat4 {
  return [
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, 1, 0,
    frontPageX, clean(-frontPageY), 0, 1,
  ];
}

/** `a * b`: applying the result to a point applies `b` first, then `a` (THREE.Matrix4's own
 *  `multiply` order), both column-major. */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array(16).fill(0) as number[];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = clean(sum);
    }
  }
  return out;
}

/** `m` applied to `p` (implicit `w = 1`). Divides by the resulting `w` — always 1 for the affine
 *  matrices this module builds, but correct if a projective matrix is ever composed in. */
export function applyMatrix(m: Mat4, p: Vec3): Vec3 {
  const [x, y, z] = p;
  const rx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const ry = m[1] * x + m[5] * y + m[9] * z + m[13];
  const rz = m[2] * x + m[6] * y + m[10] * z + m[14];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  return [clean(rx / w), clean(ry / w), clean(rz / w)];
}

/** `m`, as a CSS `matrix3d()` value. */
export function cssMatrix3d(m: Mat4): string {
  return `matrix3d(${m.join(', ')})`;
}

/**
 * `p` projected onto the screen through a pinhole `distance` px from the `z = 0` plane (the
 * camera rig's own `distance`, `camera.ts`) — the same scale-by-depth `cameraRig`'s comment
 * describes, so a CSS card (`cardMatrix` + this) and a mesh point (world space + the real
 * camera) land on the same pixel.
 */
export function project(p: Vec3, origin: { x: number; y: number }, distance: number): { x: number; y: number } {
  const scale = distance / (distance - p[2]);
  return { x: origin.x + p[0] * scale, y: origin.y + p[1] * scale };
}

/** How far above the front point, in screen px, the hoop's farthest point (`phi = 180`) reads
 *  once tilted and projected — the room `stageLayout` must leave above the front point. */
export function hoopRise(radius: number, tiltDeg: number, distance: number): number {
  const back = hoopPoint(180, radius, tiltDeg);
  const scale = distance / (distance - back[2]);
  return clean(-back[1] * scale);
}

/**
 * Where the stage puts the hoop's front point (`frontY`, leaving `hoopRise` of room above it)
 * and the floor reflection (`floorY`, below the front point by the drop, the tallest card and a
 * gap) — and whether the lot fits `viewportHeight` (D12: 3D needs a window the ring fits in).
 */
export function stageLayout(input: {
  viewportHeight: number;
  cardHeight: number;
  radius: number;
  distance: number;
  tiltDeg: number;
}): { frontY: number; floorY: number; fits: boolean } {
  const { viewportHeight, cardHeight, radius, distance, tiltDeg } = input;
  const frontY = STAGE_MARGIN_PX + hoopRise(radius, tiltDeg, distance);
  const floorY = frontY + HOOP_DROP_PX + cardHeight + FLOOR_GAP_PX;
  return { frontY, floorY, fits: floorY + STAGE_MARGIN_PX <= viewportHeight };
}

/** How far the scroll has gone into the sticky stage's pin: `scrollY` past the rail's top,
 *  clamped to the pin's own length. */
export function stickyTop(scrollY: number, railTop: number, pin: number): number {
  return Math.min(pin, Math.max(0, scrollY - railTop));
}

/**
 * Arrival's three beats (design §4, beat 1 — the hoop draws, the drops fall, the cards rise)
 * share `a`'s 0…1 clock evenly and in that order, each itself 0…1, so every beat is a pure
 * function of scroll and reverses exactly.
 */
export function arrival(a: number): { hoop: number; drops: number; cards: number } {
  const progress = unit(a) * ARRIVAL_BEATS;
  return {
    hoop: unit(progress),
    drops: unit(progress - 1),
    cards: unit(progress - 2),
  };
}

/**
 * The arrival pulse at raw step-progress `raw` (design §4, beat 2): it leaves the front point
 * partway through the card it just left's dwell, rides out along the hoop to meet the arriving
 * card halfway through the step, then rides the rest of the way in and flares on arrival, the
 * flare fading over the back half of that card's own dwell.
 */
export function pulseAt(raw: number): { card: number; hoopDeg: number; hoopStrength: number; dropAt: number; flare: number } {
  const half = DWELL_SHARE / 2;
  // The card the turn is bringing in: raw in (c − 1, c] belongs to card c.
  const arriving = Math.min(lastCard, Math.max(1, Math.ceil(raw)));
  // 0 as the pulse leaves the front point — the end of the previous card's dwell.
  const sinceLeft = raw - (arriving - 1) - half;
  const hasLeft = sinceLeft > 0;
  // Out along the hoop until it meets the card halfway through the step, then riding it in.
  const out = easeLine(unit(sinceLeft / (PULSE_MEETS - half)));
  const hoopDeg = hasLeft ? Math.max(0, cardAngle(arriving, turnSteps(raw)) * out) : 0;
  const dropAt = unit((raw - (arriving - half)) / half);
  // The flare belongs to the card whose dwell this is, and fades over the dwell's second half.
  const landed = Math.round(raw);
  const flare = landed >= 1 && raw >= landed ? 1 - unit((raw - landed) / half) : 0;
  const isFlaringPastLanding = flare > 0 && raw > landed;
  return {
    card: isFlaringPastLanding ? landed : arriving,
    hoopDeg,
    hoopStrength: hasLeft ? 1 - dropAt : 0,
    dropAt,
    flare,
  };
}
