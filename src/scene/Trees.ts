import * as THREE from 'three';
import { treeLayerTexture } from './textures';

interface TreeLayer {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseOpacity: number;
}

/** Mid layers: silhouette planes the camera walks through as you scroll. */
export class Trees {
  group = new THREE.Group();
  private layers: TreeLayer[] = [];

  constructor() {
    const defs = [
      { z: -34, haze: 0.75, w: 78, seed: 11 },
      { z: -16, haze: 0.45, w: 48, seed: 23 },
      { z: -4, haze: 0.2, w: 34, seed: 37 },
      { z: 5, haze: 0.0, w: 26, seed: 41 },
    ];
    for (const d of defs) {
      const material = new THREE.MeshBasicMaterial({
        map: treeLayerTexture(d.seed, d.haze),
        transparent: true,
        depthWrite: false,
      });
      const h = d.w * (640 / 1024);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w, h), material);
      mesh.position.set(0, h * 0.5 - 5.2, d.z);
      this.group.add(mesh);
      this.layers.push({ mesh, material, baseOpacity: 1 });
    }
  }

  /** Fade layers out just before the camera passes through them. */
  update(camZ: number) {
    for (const l of this.layers) {
      const d = camZ - l.mesh.position.z; // positive = layer is in front of camera
      const o = THREE.MathUtils.smoothstep(d, 0.4, 2.2);
      l.material.opacity = l.baseOpacity * o;
      l.mesh.visible = o > 0.01;
    }
  }
}
