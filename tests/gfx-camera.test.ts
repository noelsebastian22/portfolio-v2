import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraRig } from '../src/lib/gfx/camera';

/** Where a world point lands on screen, in CSS px from the viewport's top-left. */
function project(rig: ReturnType<typeof cameraRig>, width: number, height: number, world: Vector3) {
  const camera = new PerspectiveCamera(rig.fov, rig.aspect, rig.near, rig.far);
  camera.position.set(...rig.position);
  camera.updateMatrixWorld();
  const ndc = world.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
}

describe('cameraRig — the page plane is 1:1 with CSS px', () => {
  it.each([
    // width, height, scrollY — the top, mid-page after a reload, and a small window
    [1425, 900, 0],
    [1425, 900, 6000],
    [1905, 1080, 3210.5],
    [985, 700, 8200],
  ])('maps z = 0 page points onto their own pixels at %ix%i, scrollY %d', (width, height, scrollY) => {
    const rig = cameraRig(width, height, 0, scrollY);
    for (const [pageX, offsetY] of [[0, 0], [width / 2, height / 2], [width, height], [137, 611]]) {
      const pageY = scrollY + offsetY;
      const onScreen = project(rig, width, height, new Vector3(pageX, -pageY, 0));
      expect(onScreen.x).toBeCloseTo(pageX, 6);
      expect(onScreen.y).toBeCloseTo(offsetY, 6);
    }
  });
});
