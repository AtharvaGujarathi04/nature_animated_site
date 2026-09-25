import * as THREE from 'three';
import { burstFragment, burstVertex } from '../shaders/fireflies';
import { rng } from '../utils/math';

/** Particle burst fired when the sprout becomes the character. */
export class Burst {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  private start = -1;
  private readonly duration = 1.8;

  constructor(count: number, pixelRatio: number) {
    const r = rng(99);
    const pos = new Float32Array(count * 3);
    const dir = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      dir.set([Math.sin(ph) * Math.cos(th), Math.abs(Math.cos(ph)) * 0.8 + 0.2, Math.sin(ph) * Math.sin(th) * 0.4], i * 3);
      pos.set([(r() - 0.5) * 0.3, (r() - 0.5) * 0.3, 0], i * 3);
      seed[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: burstVertex,
      fragmentShader: burstFragment,
      uniforms: { uProgress: { value: 0 }, uPixelRatio: { value: pixelRatio }, uSize: { value: 20 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  fire(time: number) {
    this.start = time;
    this.points.visible = true;
  }

  update(time: number) {
    if (this.start < 0) return;
    const p = (time - this.start) / this.duration;
    this.material.uniforms.uProgress.value = p;
    if (p >= 1) {
      this.points.visible = false;
      this.start = -1;
    }
  }
}
