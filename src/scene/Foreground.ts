import * as THREE from 'three';
import { leafTexture } from './textures';

/**
 * Blurred leaves glued to the camera at the screen edges (depth-of-field frame).
 * They shift opposite to the pointer more than anything else, selling depth.
 */
export class Foreground {
  group = new THREE.Group();
  private leaves: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number; rot: number }[] = [];

  constructor() {
    // x/y in "viewport units" (-1..1), resolved to world units in layout().
    const defs = [
      { u: -1.02, v: 0.8, s: 1.7, rot: -2.3, blur: 10 },
      { u: -0.98, v: -0.7, s: 2.1, rot: 0.9, blur: 12 },
      { u: 1.03, v: 0.9, s: 1.5, rot: 2.4, blur: 9 },
      { u: 0.97, v: -0.85, s: 2.3, rot: -0.7, blur: 13 },
      { u: -0.55, v: 1.08, s: 1.1, rot: 3.0, blur: 7 },
      { u: 0.6, v: -1.1, s: 1.3, rot: 0.1, blur: 8 },
    ];
    defs.forEach((d, i) => {
      const mat = new THREE.MeshBasicMaterial({ map: leafTexture(100 + i, d.blur), transparent: true, depthWrite: false, opacity: 0.92 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.s, d.s), mat);
      mesh.userData = { u: d.u, v: d.v };
      mesh.rotation.z = d.rot;
      mesh.renderOrder = 10;
      this.group.add(mesh);
      this.leaves.push({ mesh, base: new THREE.Vector3(), phase: i * 1.7, rot: d.rot });
    });
    this.group.position.z = -2.2;
  }

  layout(camera: THREE.PerspectiveCamera) {
    const dist = -this.group.position.z;
    const h = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const w = h * camera.aspect;
    const narrow = camera.aspect < 0.8 ? 0.6 : 1;
    for (const l of this.leaves) {
      const { u, v } = l.mesh.userData as { u: number; v: number };
      l.base.set((u * w) / 2, (v * h) / 2, 0);
      l.mesh.scale.setScalar(narrow);
    }
  }

  update(time: number, px: number, py: number) {
    for (const l of this.leaves) {
      l.mesh.position.set(l.base.x - px * 0.25, l.base.y - py * 0.2, 0);
      l.mesh.rotation.z = l.rot + Math.sin(time * 0.6 + l.phase) * 0.05;
    }
  }
}
