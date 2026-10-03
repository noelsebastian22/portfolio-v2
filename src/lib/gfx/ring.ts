/**
 * The 3D ring's geometry (Phase 12) — the only place it is defined, as `path.ts` is for the
 * curve. Two renderers draw the ring: the cards are DOM, turned by CSS `matrix3d`
 * (ring-stage.ts), and the hoop, drops and glow are Three.js (ring-mesh.ts). Both read every
 * position from here, so adding a renderer never means redefining the ring (design D5).
 *
 * **Front space.** Every point here is relative to the hoop's front point — where the line
 * meets the hoop, and where the front card hangs from. x right, y *down*, z toward the viewer,
 * in CSS px: the card's own coordinates, so a matrix from here is a CSS transform as it stands.
 * `frontToWorld` turns it into the scene's world (camera.ts: y up).
 *
 * The ring's centre is at z = −R, so the front point and the front card sit on the page plane,
 * 1:1 with CSS px (D9). The look-down (D8) tilts the hoop about the front point; the cards hang
 * plumb from it, so the front card is a pure translation and its text stays crisp.
 *
 * Pure: no DOM, no Three.js.
 */

import { easeLine, unit } from '../signal/draw';

export type Vec3 = readonly [x: number, y: number, z: number];
/** 16 numbers, column-major — CSS `matrix3d` order and `THREE.Matrix4.fromArray` order. */
export type Mat4 = readonly number[];

export const RING_CARD_COUNT = 5;
export const STEP_DEG = 360 / RING_CARD_COUNT;
/** The look-down, degrees (D8). Starting value; tuned at the checkpoint. */
export const RING_TILT_DEG = 10;
/** How far the pointer can add to the look-down, either way, degrees. */
export const POINTER_TILT_DEG = 3;
/** Radius per card width: clears the side cards from the front one with room for a focus ring. */
export const RADIUS_PER_CARD_WIDTH = 1.1;
/** How far each card hangs below the hoop, px. */
export const HOOP_DROP_PX = 72;
/** The share of each step the arriving card holds at the front (D10). */
export const DWELL_SHARE = 0.35;
/** The pin, in viewport heights: a lead-in on the first card, a step per turn, a tail. */
export const PIN_LEAD_VH = 0.25;
export const PIN_STEP_VH = 0.6;
export const PIN_TAIL_VH = 0.25;
/** How far the tip travels past the split while the hoop, drops and cards arrive, in viewport heights. */
export const ARRIVAL_DRAW_VH = 0.35;
/** Clear space above the hoop's back, px. */
export const STAGE_MARGIN_PX = 32;
/** From the cards' bottom to the floor, px. */
export const FLOOR_GAP_PX = 24;

/** Opacity is 1 within this many degrees of the front, and 0 past `FADE_GONE_DEG` (D3). */
const FADE_FULL_DEG = 30;
const FADE_GONE_DEG = 110;
/** Below this a faded card takes no pointer events, so it never eats the front card's click. */
const INERT_BELOW_OPACITY = 0.3;
/** Where in a step the hoop pulse reaches the arriving card. */
const PULSE_MEETS = 0.5;

const radians = (deg: number) => (deg * Math.PI) / 180;
const smooth = (t: number) => {
  const u = unit(t);
  return u * u * (3 - 2 * u);
};
/** −0 → 0, so a matrix prints `0` and a point compares equal to its untilted self. */
const tidyZero = (v: number) => (v === 0 ? 0 : v);
const lastCard = RING_CARD_COUNT - 1;

export function ringRadius(cardWidth: number): number {
  return cardWidth * RADIUS_PER_CARD_WIDTH;
}

// ── The pin ────────────────────────────────────────────────────────────────────────

export function pinLength(viewportHeight: number): number {
  return viewportHeight * (PIN_LEAD_VH + lastCard * PIN_STEP_VH + PIN_TAIL_VH);
}

/** How far into the pin card `card` is dead front, px — the settle's and focus's target. */
export function stepOffset(card: number, viewportHeight: number): number {
  return viewportHeight * (PIN_LEAD_VH + card * PIN_STEP_VH);
}

/** Pin offset → steps turned, linear, clamped to 0..cards−1. The pulse reads this; the turn eases it. */
export function rawSteps(pinOffset: number, viewportHeight: number): number {
  const raw = (pinOffset - viewportHeight * PIN_LEAD_VH) / (viewportHeight * PIN_STEP_VH);
  return Math.min(lastCard, Math.max(0, Number.isFinite(raw) ? raw : 0));
}

/**
 * Steps turned with a dwell either side of every card: within `DWELL_SHARE / 2` of a whole
 * step the ring holds, and between dwells it eases across. Monotonic, so a reversed scroll
 * unturns it exactly.
 */
export function turnSteps(raw: number): number {
  const step = Math.min(Math.floor(raw), lastCard - 1);
  const within = raw - step;
  const half = DWELL_SHARE / 2;
  return step + smooth((within - half) / (1 - DWELL_SHARE));
}

/** The card nearest the front at this pin offset. */
export function nearestCard(pinOffset: number, viewportHeight: number): number {
  return Math.round(rawSteps(pinOffset, viewportHeight));
}

/** The sticky stage's page top: `position: sticky; top: 0` in a rail `pin` taller than it. */
export function stickyTop(scrollY: number, railTop: number, pin: number): number {
  return Math.min(railTop + pin, Math.max(railTop, scrollY));
}

// ── Cards ──────────────────────────────────────────────────────────────────────────

/** Card `card`'s angle round the ring, degrees, (−180, 180]: 0 at the front, positive to the right. */
export function cardAngle(card: number, steps: number): number {
  const deg = (card - steps) * STEP_DEG;
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
  return tidyZero(wrapped === -180 ? 180 : wrapped);
}

export function cardPose(angleDeg: number): { opacity: number; isFront: boolean; isInert: boolean } {
  const away = Math.abs(angleDeg);
  const opacity = 1 - smooth((away - FADE_FULL_DEG) / (FADE_GONE_DEG - FADE_FULL_DEG));
  return { opacity, isFront: away < STEP_DEG / 2, isInert: opacity < INERT_BELOW_OPACITY };
}

// ── Points ─────────────────────────────────────────────────────────────────────────

/** Tilts about the front point's x axis so the back rises: the look-down. */
export function tiltPoint([x, y, z]: Vec3, tiltDeg: number): Vec3 {
  const c = Math.cos(radians(tiltDeg));
  const s = Math.sin(radians(tiltDeg));
  return [tidyZero(x), tidyZero(y * c + z * s), tidyZero(-y * s + z * c)];
}

/** The hoop at angle `phi`: a circle of radius R round (0, 0, −R), tilted. */
export function hoopPoint(phiDeg: number, radius: number, tiltDeg: number): Vec3 {
  const phi = radians(phiDeg);
  return tiltPoint([radius * Math.sin(phi), 0, radius * Math.cos(phi) - radius], tiltDeg);
}

/** The bottom of a card's drop — its top-centre. Drops hang plumb, whatever the tilt. */
export function dropEnd(phiDeg: number, radius: number, tiltDeg: number): Vec3 {
  const [x, y, z] = hoopPoint(phiDeg, radius, tiltDeg);
  return [x, y + HOOP_DROP_PX, z];
}

// ── Matrices ───────────────────────────────────────────────────────────────────────

/** `a · b`: apply `b`, then `a` — the order CSS lists transforms in. */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** Affine only: every matrix here has a last row of (0, 0, 0, 1). */
export function applyMatrix(m: Mat4, [x, y, z]: Vec3): Vec3 {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

const translate = (x: number, y: number, z: number): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

/** CSS `rotateY(phi)`: carries the card's normal (0, 0, 1) to (sin φ, 0, cos φ) — outward. */
function rotateY(phiDeg: number): Mat4 {
  const c = Math.cos(radians(phiDeg));
  const s = Math.sin(radians(phiDeg));
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

/** `tiltPoint` as a matrix. */
export function tiltMatrix(tiltDeg: number): Mat4 {
  const c = Math.cos(radians(tiltDeg));
  const s = Math.sin(radians(tiltDeg));
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}

/** Reflects front space in the horizontal plane y = floorY. */
export function mirrorMatrix(floorY: number): Mat4 {
  return [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 2 * floorY, 0, 1];
}

/** Front space → the scene's world (camera.ts): page x, −page y. */
export function frontToWorld(frontPageX: number, frontPageY: number): Mat4 {
  return [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, frontPageX, -frontPageY, 0, 1];
}

/**
 * A card's CSS transform, applied about its top-centre (`transform-origin: 50% 0`, placed on
 * the front point): hang from the drop end, `rise` px lower while it arrives, facing outward.
 */
export function cardMatrix(phiDeg: number, radius: number, tiltDeg: number, rise: number): Mat4 {
  const [x, y, z] = dropEnd(phiDeg, radius, tiltDeg);
  return multiply(translate(x, y + rise, z), rotateY(phiDeg));
}

/** Rounded to 1e-6 with no `-0`, so a front card's transform prints as exactly a translation. */
export function cssMatrix3d(m: Mat4): string {
  const tidy = (v: number) => String(tidyZero(Math.round(v * 1e6) / 1e6));
  return `matrix3d(${m.map(tidy).join(',')})`;
}

// ── Projection and layout ──────────────────────────────────────────────────────────

/**
 * A point (viewport px, z toward the viewer) as CSS `perspective` places it on screen with the
 * perspective origin at `origin` — and as the camera rig does with the origin at the viewport
 * centre and `distance` its own. `p` and `origin` share coordinates.
 */
export function project([x, y, z]: Vec3, origin: { x: number; y: number }, distance: number): { x: number; y: number } {
  const scale = distance / (distance - z);
  return { x: origin.x + (x - origin.x) * scale, y: origin.y + (y - origin.y) * scale };
}

/** How far above the front point the hoop's back projects, px — what the stage clears above. */
export function hoopRise(radius: number, tiltDeg: number, distance: number): number {
  return -project(hoopPoint(180, radius, tiltDeg), { x: 0, y: 0 }, distance).y;
}

/**
 * Where the front point sits in a one-viewport stage: the hoop, drops and cards centred as one
 * block, never closer than `STAGE_MARGIN_PX` to the top. `floorY` is in front space. `fits` is
 * false when the cards would run off the bottom — the rail stays (D12).
 */
export function stageLayout({
  viewportHeight,
  cardHeight,
  radius,
  distance,
  tiltDeg,
}: {
  viewportHeight: number;
  cardHeight: number;
  radius: number;
  distance: number;
  tiltDeg: number;
}): { frontY: number; floorY: number; fits: boolean } {
  const rise = hoopRise(radius, tiltDeg, distance);
  const block = rise + HOOP_DROP_PX + cardHeight;
  const top = Math.max(STAGE_MARGIN_PX, (viewportHeight - block) / 2);
  const frontY = top + rise;
  const floorY = HOOP_DROP_PX + cardHeight + FLOOR_GAP_PX;
  return { frontY, floorY, fits: frontY + floorY <= viewportHeight };
}

// ── Choreography ───────────────────────────────────────────────────────────────────

/**
 * The arrival, from tip travel `a` (0..1) past the split: the hoop draws round from the front
 * point, then the drops fall, then the cards rise into place as their drops land.
 */
export function arrival(a: number): { hoop: number; drops: number; cards: number } {
  return {
    hoop: easeLine(unit(a / 0.5)),
    drops: easeLine(unit((a - 0.45) / 0.35)),
    cards: smooth((a - 0.6) / 0.4),
  };
}

/**
 * The pulse for linear steps `raw`. During each turn a pulse leaves the front point along the
 * hoop toward the arriving card, meets it halfway through the step and rides it in; as the card
 * reaches the front it runs down the card's drop, and the emission flares when it lands — at
 * the dwell's centre. Before the first turn begins (card 0 was lit by the arrival) all quiet.
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
