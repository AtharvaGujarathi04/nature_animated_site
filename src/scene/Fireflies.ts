import * as THREE from 'three';
import { firefliesFragment, firefliesVertex } from '../shaders/fireflies';
import { rng } from '../utils/math';

/** Floating spores / fireflies spread through the whole walk-through volume. */
export class Fireflies {
  points: THREE.Points;
  material: THREE.ShaderMaterial;

  constructor(count: number, pixelRatio: number) {
    const r = rng(7);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const palette = [new THREE.Color('#b6f23d'), new THREE.Color('#3df2e0'), new THREE.Color('#ffd98a')];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 30;
      pos[i * 3 + 1] = -3.5 + r() * 11;
      pos[i * 3 + 2] = 14 - r() * 52;
      const c = palette[r() < 0.5 ? 0 : r() < 0.7 ? 1 : 2];
      col.set([c.r, c.g, c.b], i * 3);
      seed[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: firefliesVertex,
      fragmentShader: firefliesFragment,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 26 },
        uPixelRatio: { value: pixelRatio },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  update(time: number) {
    this.material.uniforms.uTime.value = time;
  }
}
