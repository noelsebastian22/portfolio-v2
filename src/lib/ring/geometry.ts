/**
 * The 3D ring's geometry (Phase 12) — the only place it is defined, as `path.ts` is for the
 * curve. The ring is the DOM cards, turned by CSS `matrix3d` (stage.ts); every position comes
 * from here, so adding a renderer never means redefining the ring (design D5).
 *
 * **Front space.** Every point here is relative to the front point — the front card's
 * top-centre, where the line lands on its dot (revision R4). x right, y *down*, z toward the
 * viewer, in CSS px: the card's own coordinates, so a matrix from here is a CSS transform as it
 * stands.
 *
 * The cards hang by their top-centres from an invisible circle centred at z = −R, so the front
 * card sits on the page plane, 1:1 with CSS px at full size (D9). The look-down (D8) tilts the
 * circle about the front point; the cards hang plumb from it, so at full size the front card's
 * transform is the identity and its text stays crisp.
 *
 * **Scale.** A window too short for the full-size ring gets the whole ring scaled about the front
 * point down to `MIN_RING_SCALE` (revision R3). Callers pass the radius already scaled; the card
 * takes `scale` itself.
 *
 * Pure: no DOM.
 */

import { unit } from '../signal/draw';

export type Vec3 = readonly [x: number, y: number, z: number];
/** 16 numbers, column-major — CSS `matrix3d` order. */
export type Mat4 = readonly number[];

export const RING_CARD_COUNT = 5;
export const STEP_DEG = 360 / RING_CARD_COUNT;
/**
 * The look-down, degrees (D8), tuned by eye (revision R4). The eye sits below the ring (the
 * perspective origin is the viewport's centre), so with none the side cards' tops fall below the
 * front card's and the ring droops; at 8° they sit ~10px above it, a gentle arc, at all three
 * checked windows. More reads as looking down on a table.
 */
export const RING_TILT_DEG = 8;
/** How far the pointer can add to the look-down, either way, degrees. */
export const POINTER_TILT_DEG = 3;
/** Radius per card width: clears the side cards from the front one with room for a focus ring. */
export const RADIUS_PER_CARD_WIDTH = 1.1;
/**
 * The pin, in viewport heights: a lead-in on the first card, a step per turn, a tail. Short, so
 * the ring turns at once under the reader's scroll and a step is a flick, not a stretch
 * (revision R4).
 */
export const PIN_LEAD_VH = 0.15;
export const PIN_STEP_VH = 0.4;
export const PIN_TAIL_VH = 0.15;
/** How far the tip travels past the split while the cards arrive, in viewport heights. */
export const ARRIVAL_DRAW_VH = 0.35;
/** Clear space above the ring's highest card top, px: the stage sits under the sticky nav (67px), so this clears it by 8. */
export const STAGE_MARGIN_PX = 75;
/** Clear space below the nav's bottom for the stage to fit, px. */
export const FIT_MARGIN_PX = 8;
/**
 * The counter and dots under the front card (revision R4), flat in the stage — never scaled
 * with the ring. A row as tall as a dot's hit area (WCAG 2.2's 24px target; Ring.astro's
 * `.ring__nav` height), this far under the front card's bottom edge.
 */
export const NAV_HEIGHT_PX = 24;
export const NAV_GAP_PX = 24;
/**
 * The stage's CSS `perspective`, px. Chosen for the look, no longer the WebGL camera's distance
 * (revision R4): the front card sits on the page plane, so it is exact under any perspective.
 * Tuned by eye: at 1200 the side cards pinch into trapezoids, at 2200 the ring flattens into a
 * strip; 1600 reads as a circle with the side cards still plainly cards.
 */
export const PERSPECTIVE_PX = 1600;
/**
 * The smallest the ring scales to fit a short window. At 70% a card's 15px description is 10.5px,
 * about as small as body text still reads; below it the rail, at full size, is the better page
 * (revision R3).
 */
export const MIN_RING_SCALE = 0.7;
/**
 * A card turns this share of its angle round the ring, so the side cards still read as cards —
 * a carousel, not a drum (revision R1).
 */
export const CARD_FACING_SHARE = 0.5;

/**
 * Opacity is 1 out to the side cards' place, and 0 past `FADE_GONE_DEG` (D3): only the back two
 * fade. The sides recede under the overlay instead (`recede`) — a see-through side card would
 * show the line and the cards behind it.
 */
const FADE_FULL_DEG = STEP_DEG;
const FADE_GONE_DEG = 110;
/** Below this a faded card takes no pointer events, so it never eats the front card's click. */
const INERT_BELOW_OPACITY = 0.3;

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

/** Pin offset → steps turned, linear, clamped to 0..cards−1. The turn eases it. */
export function rawSteps(pinOffset: number, viewportHeight: number): number {
  const raw = (pinOffset - viewportHeight * PIN_LEAD_VH) / (viewportHeight * PIN_STEP_VH);
  return Math.min(lastCard, Math.max(0, Number.isFinite(raw) ? raw : 0));
}

/**
 * Steps turned: the scroll itself, 1:1 (revision R4 — a dwell on every card made the ring feel
 * late). The settle, not the turn, is what lands a card dead front — and the page scrolls in
 * whole pixels, so it lands up to half a pixel short: within `SETTLE_ON_CARD_PX` of a card is
 * on it, exactly, so a resting front card's transform is the identity and its text stays crisp.
 */
export function turnSteps(raw: number, viewportHeight: number): number {
  const card = Math.round(raw);
  const isOnCard = Math.abs(raw - card) * PIN_STEP_VH * viewportHeight <= SETTLE_ON_CARD_PX;
  return isOnCard ? card : raw;
}

/** The card nearest the front at this pin offset. */
export function nearestCard(pinOffset: number, viewportHeight: number): number {
  return Math.round(rawSteps(pinOffset, viewportHeight));
}

/**
 * A move off a resting card smaller than this share of a step is a nudge, and settles back to
 * the nearest card. Anything larger was the reader going somewhere: a single wheel notch (100px
 * against a 480px step at 800 tall) is ~21%, well past it; trackpad jitter is well under.
 */
export const SETTLE_NUDGE_SHARE = 0.08;

/** A scroll within this many px of a card is on it (the page scrolls in whole pixels). */
export const SETTLE_ON_CARD_PX = 1;

/**
 * Where the settle goes once the scroll stops at `pinOffset`, having last rested at
 * `restOffset`: the card index, or `null` to leave the scroll where it is. It follows the
 * direction of travel (spec Revision R2), so a reader who scrolls one notch at a time still
 * moves on a card per notch, and one who scrolls out through the lead or the tail is let go.
 */
export function settleTarget(pinOffset: number, restOffset: number, viewportHeight: number): number | null {
  const stepPx = PIN_STEP_VH * viewportHeight;
  const moved = pinOffset - restOffset;
  const raw = rawSteps(pinOffset, viewportHeight);
  // The page scrolls in whole (device) pixels, so a scroll "at" a card can sit a fraction of a
  // pixel short of it: within this many steps is on the card, never past it.
  const onCard = SETTLE_ON_CARD_PX / stepPx;
  const clampCard = (card: number) => Math.min(lastCard, Math.max(0, card));
  if (Math.abs(moved) < SETTLE_NUDGE_SHARE * stepPx) return nearestCard(pinOffset, viewportHeight);
  if (moved > 0) {
    const isLeavingThroughTail = pinOffset > stepOffset(lastCard, viewportHeight) + SETTLE_ON_CARD_PX;
    return isLeavingThroughTail ? null : clampCard(Math.ceil(raw - onCard));
  }
  const isLeavingThroughLead = pinOffset < stepOffset(0, viewportHeight) - SETTLE_ON_CARD_PX;
  return isLeavingThroughLead ? null : clampCard(Math.floor(raw + onCard));
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

/**
 * How far card at `angleDeg` is the front one: 1 dead front, easing to 0 half a step round, so
 * the lit front state hands over smoothly as the ring turns.
 */
export function frontness(angleDeg: number): number {
  return 1 - smooth(Math.abs(angleDeg) / (STEP_DEG / 2));
}

/**
 * How far a side card recedes under the `--ground` overlay, at most: enough that the front card
 * is plainly the one being shown, not so much that the sides stop reading as the next sites.
 */
export const SIDE_DIM = 0.6;

/**
 * The overlay's strength on card at `angleDeg`: none at the front, `SIDE_DIM` a step round and
 * beyond. Over the whole step, not half (`frontness`), so mid-turn the two cards either side of
 * the front are half dimmed, not both dark.
 */
export function recede(angleDeg: number): number {
  return SIDE_DIM * smooth(Math.abs(angleDeg) / STEP_DEG);
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

/** The invisible circle at angle `phi`: radius R round (0, 0, −R), tilted. */
export function ringPoint(phiDeg: number, radius: number, tiltDeg: number): Vec3 {
  const phi = radians(phiDeg);
  return tiltPoint([radius * Math.sin(phi), 0, radius * Math.cos(phi) - radius], tiltDeg);
}

/** Where card at `phi` hangs by its top-centre: on the circle itself — there is no drop (revision R4). */
export function cardTop(phiDeg: number, radius: number, tiltDeg: number): Vec3 {
  return ringPoint(phiDeg, radius, tiltDeg);
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

const scaleMatrix = (s: number): Mat4 => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];

/** CSS `rotateY(phi)`: carries the card's normal (0, 0, 1) to (sin φ, 0, cos φ). */
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

const NO_OFFSET: Vec3 = [0, 0, 0];

/**
 * A card's CSS transform, applied about its top-centre (`transform-origin: 50% 0`, placed on
 * the front point): its top-centre on `cardTop`, moved by `offset` (the pointer's lift, the
 * stack's order), turned `facingShare` of the way to facing outward, at the ring's `scale`
 * (`radius` is already scaled). At scale 1 and no offset the front card's is the identity.
 *
 * The fan-out passes `CARD_FACING_SHARE × spread`: within ~26° of the front a card turned the
 * full share swings its near edge in front of the front card's plane and cuts through it, and
 * in the fan all five are that close at once.
 */
export function cardMatrix(
  phiDeg: number,
  radius: number,
  tiltDeg: number,
  scale = 1,
  offset: Vec3 = NO_OFFSET,
  facingShare = CARD_FACING_SHARE,
): Mat4 {
  const [x, y, z] = cardTop(phiDeg, radius, tiltDeg);
  const placed = translate(x + offset[0], y + offset[1], z + offset[2]);
  return multiply(multiply(placed, rotateY(phiDeg * facingShare)), scaleMatrix(scale));
}

/**
 * The move that brings a point `lift` px toward the viewer along its own line of sight to
 * `eye` (the perspective origin, `distance` in front of the page), so it grows on screen but
 * stays where it is: a card lifted by its top-centre keeps that point — and on the front card,
 * the line's landing on its dot — exactly in place. `point` and `eye` share front space.
 */
export function liftOffset([x, y, z]: Vec3, [eyeX, eyeY, eyeZ]: Vec3, lift: number): Vec3 {
  if (lift === 0) return NO_OFFSET;
  const along = lift / (eyeZ - z);
  return [(eyeX - x) * along, (eyeY - y) * along, lift];
}

/** Rounded to 1e-6 with no `-0`, so a front card's transform prints as exactly the identity. */
export function cssMatrix3d(m: Mat4): string {
  const tidy = (v: number) => String(tidyZero(Math.round(v * 1e6) / 1e6));
  return `matrix3d(${m.map(tidy).join(',')})`;
}

// ── Projection and layout ──────────────────────────────────────────────────────────

/**
 * A point (viewport px, z toward the viewer) as CSS `perspective` places it on screen with the
 * perspective origin at `origin` and `distance` the perspective. `p` and `origin` share
 * coordinates.
 */
export function project([x, y, z]: Vec3, origin: { x: number; y: number }, distance: number): { x: number; y: number } {
  const scale = distance / (distance - z);
  return { x: origin.x + (x - origin.x) * scale, y: origin.y + (y - origin.y) * scale };
}

interface RiseInputs {
  viewportHeight: number;
  /** The card's full-size width, px; the ring's radius follows from it. */
  cardWidth: number;
  scale: number;
  tiltDeg: number;
  distance: number;
}

/**
 * How far each point that can be the ring's highest on screen projects above the front point,
 * as a line in the front point's height: `rise = a · frontY + b`. The candidates are the front
 * card's top (always 0: it is the front point) and the side cards' top corners at ±72°. A card's
 * top edge is level, but its near corner is nearer the viewer than its top-centre, so through a
 * perspective origin below it the corner projects higher. Projected through the true eye, at the
 * viewport's centre (the stage's perspective origin while stuck, revision R1).
 */
function riseLines({ viewportHeight, cardWidth, scale, tiltDeg, distance }: RiseInputs): { a: number; b: number }[] {
  const radius = ringRadius(cardWidth) * scale;
  const eye = { x: 0, y: viewportHeight / 2 };
  const lines = [{ a: 0, b: 0 }];
  for (const side of [1, -1]) {
    const m = cardMatrix(side * STEP_DEG, radius, tiltDeg, scale);
    for (const cornerX of [cardWidth / 2, -cardWidth / 2]) {
      const [x, y, z] = applyMatrix(m, [cornerX, 0, 0]);
      const riseAt = (frontY: number) => frontY - project([x, frontY + y, z], eye, distance).y;
      const b = riseAt(0);
      lines.push({ a: riseAt(1) - b, b });
    }
  }
  return lines;
}

/**
 * How far the ring's highest card top projects above the front point on screen, px, with the
 * front point `frontY` down a viewport-tall stage: what the stage clears above. Never below 0 —
 * the front card's own top is the front point.
 */
export function ringRiseAt({ frontY, ...inputs }: RiseInputs & { frontY: number }): number {
  return Math.max(...riseLines(inputs).map(({ a, b }) => a * frontY + b));
}

/**
 * How far the pointer may add to the look-down, degrees, 0..`POINTER_TILT_DEG`: as far as the
 * side cards' tops still clear `STAGE_MARGIN_PX` from the stage top. The rise grows with the
 * tilt, so a bisection finds it. A window with room to spare gets the full tilt; one where the
 * layout already sits on the margin gets less, or none upward.
 */
export function pointerTiltRoom({
  frontY,
  viewportHeight,
  cardWidth,
  scale,
  distance,
}: {
  frontY: number;
  viewportHeight: number;
  cardWidth: number;
  scale: number;
  distance: number;
}): number {
  const clears = (extra: number) =>
    frontY - ringRiseAt({ frontY, viewportHeight, cardWidth, scale, tiltDeg: RING_TILT_DEG + extra, distance }) >=
    STAGE_MARGIN_PX - 1e-6;
  if (clears(POINTER_TILT_DEG)) return POINTER_TILT_DEG;
  if (!clears(0)) return 0;
  let low = 0;
  let high = POINTER_TILT_DEG;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (clears(mid)) low = mid;
    else high = mid;
  }
  return low;
}

/** Bisection steps for the fit's scale: 24 halvings of 0.3 is well under a thousandth of a pixel. */
const FIT_SEARCH_STEPS = 24;

/**
 * Where the front point sits in a one-viewport stage: the ring's highest card top and the nav's
 * bottom (`NAV_GAP_PX` under the cards, `NAV_HEIGHT_PX` tall) centred as one block, never closer
 * than `STAGE_MARGIN_PX` to the top. `navY` is the nav's top. `cardWidth` and `cardHeight` are
 * full size; `scale` is 1 where that fits, else the largest scale down to `MIN_RING_SCALE` that
 * does (revision R3). `fits` is false when even at the floor scale the nav would run off the
 * bottom — the rail stays (D12).
 */
export function stageLayout({
  viewportHeight,
  cardWidth,
  cardHeight,
  distance,
  tiltDeg,
}: {
  viewportHeight: number;
  cardWidth: number;
  cardHeight: number;
  distance: number;
  tiltDeg: number;
}): { frontY: number; navY: number; fits: boolean; scale: number } {
  const layoutAt = (scale: number) => {
    // Each candidate's rise is a line in frontY (riseLines), and the block's top is frontY less
    // the highest of them. Centred, 2·top = vh − rise − below, so frontY = (vh − below + b) /
    // (2 − a); at the margin, frontY = (margin + b) / (1 − a). The top moves down with frontY on
    // every line, so the block's top reaches each target only once the last line does: the
    // largest of the lines' answers. Of centred and margin, the lower on screen wins.
    const lines = riseLines({ viewportHeight, cardWidth, scale, tiltDeg, distance });
    // The nav keeps its size whatever the ring's scale: only the cards shrink.
    const cardsBelow = cardHeight * scale;
    const below = cardsBelow + NAV_GAP_PX + NAV_HEIGHT_PX;
    const centredY = Math.max(...lines.map(({ a, b }) => (viewportHeight - below + b) / (2 - a)));
    const marginY = Math.max(...lines.map(({ a, b }) => (STAGE_MARGIN_PX + b) / (1 - a)));
    const frontY = Math.max(centredY, marginY);
    const navY = frontY + cardsBelow + NAV_GAP_PX;
    return { frontY, navY, fits: frontY + below + FIT_MARGIN_PX <= viewportHeight, scale };
  };
  const full = layoutAt(1);
  if (full.fits) return full;
  const smallest = layoutAt(MIN_RING_SCALE);
  if (!smallest.fits) return smallest;
  // The block shrinks with the scale, so whether it fits flips once between the floor and 1.
  let low = MIN_RING_SCALE;
  let high = 1;
  for (let i = 0; i < FIT_SEARCH_STEPS; i++) {
    const mid = (low + high) / 2;
    if (layoutAt(mid).fits) low = mid;
    else high = mid;
  }
  return layoutAt(low);
}

// ── Choreography ───────────────────────────────────────────────────────────────────

/** The stacked cards' depth apart, px, so they sort by DOM order — card 0 on top — before they spread. */
export const STACK_GAP_PX = 2;

/** The share of the fan-out by which the cards are fully opaque: before they reach the circle. */
const FAN_OPAQUE_AT = 0.5;

/**
 * The arrival, from tip travel `a` (0..1) past the split: the cards fan out from one stack at
 * the front into the circle (each card's angle is its `cardAngle × spread`), coming up out of
 * the ground as they go (the stage shows `opacity` through the ground overlay, so the stack is
 * never see-through). Driven by the tip, so a reversed scroll gathers them back. The opacity leads — the stack
 * is seen before it opens — and is full a little before the cards arrive, so the end of the
 * move is the cards easing onto the circle, not appearing.
 */
export function fanOut(a: number): { spread: number; opacity: number } {
  const t = unit(a);
  return { spread: smooth(t), opacity: smooth(t / FAN_OPAQUE_AT) };
}

/** The stacked card `card`'s nudge back, in front space, while `spread` < 1. */
export function stackOffset(card: number, spread: number): Vec3 {
  return [0, 0, tidyZero(-card * STACK_GAP_PX * (1 - spread))];
}
