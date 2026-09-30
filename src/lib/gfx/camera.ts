/**
 * The tube's camera: a perspective camera placed so the page plane (world z = 0) projects
 * 1:1 onto CSS pixels at the current scroll. The tube lies on the page plane everywhere
 * (revision R4), so this is 1:1 at every point on the line, not just below the hero — which
 * is what keeps every island's emissions, drops and nodes attached (Phase 10 design, D1). A
 * perspective camera is kept so that depth (Phase 12's ring) needs no new rig.
 *
 * World units are CSS px: x = page x, y = −page y, z = 0 on the page and negative away from
 * the viewer. Pure — the scene copies these numbers onto a THREE.PerspectiveCamera.
 */

export interface CameraRig {
  fov: number;
  aspect: number;
  distance: number;
  near: number;
  far: number;
  position: readonly [x: number, y: number, z: number];
}

/** Vertical field of view, degrees. Narrow enough that the hero's depth reads as depth, not distortion. */
export const CAMERA_FOV = 30;

export function cameraRig(width: number, height: number, scrollX: number, scrollY: number): CameraRig {
  // At this distance the viewport's height exactly fills the field of view at z = 0.
  const distance = height / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360);
  return {
    fov: CAMERA_FOV,
    aspect: width / height,
    distance,
    near: Math.max(1, distance * 0.05),
    far: distance * 2,
    position: [scrollX + width / 2, -(scrollY + height / 2), distance],
  };
}
