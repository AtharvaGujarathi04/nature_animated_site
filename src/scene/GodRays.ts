import * as THREE from 'three';
import { godRayFragment, godRayVertex } from '../shaders/godrays';

/** Additive volumetric light cones slanting down from the upper right. */
export class GodRays {
  group = new THREE.Group();
  private materials: THREE.ShaderMaterial[] = [];
  intensity = 0.6;

  constructor() {
    const defs = [
      { x: 4, z: -12, r: 2.2, len: 26, rot: 0.32, seed: 0.1 },
      { x: 9, z: -20, r: 3.2, len: 34, rot: 0.38, seed: 0.4 },
      { x: -2, z: -26, r: 2.6, len: 34, rot: 0.3, seed: 0.7 },
      { x: 14, z: -30, r: 4.0, len: 40, rot: 0.42, seed: 0.9 },
      { x: 1, z: -6, r: 1.4, len: 20, rot: 0.28, seed: 0.25 },
    ];
    for (const d of defs) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: godRayVertex,
        fragmentShader: godRayFragment,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0.6 },
          uColor: { value: new THREE.Color('#ffd98a').multiplyScalar(0.28) },
          uSeed: { value: d.seed },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const geo = new THREE.CylinderGeometry(0.15, d.r, d.len, 24, 1, true);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.len * 0.35 - 3, d.z);
      mesh.rotation.z = d.rot;
      mesh.rotation.x = -0.12;
      this.group.add(mesh);
      this.materials.push(mat);
    }
  }

  update(time: number) {
    for (const m of this.materials) {
      m.uniforms.uTime.value = time;
      m.uniforms.uIntensity.value = this.intensity;
    }
  }
}
