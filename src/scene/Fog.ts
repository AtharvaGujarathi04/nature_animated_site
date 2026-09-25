import * as THREE from 'three';
import { fogFragment, fogVertex } from '../shaders/fog';

/** Low noise fog lying across the forest floor. */
export class Fog {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: fogVertex,
      fragmentShader: fogFragment,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.55 },
        uColor: { value: new THREE.Color('#6fae86') },
        uCamPos: { value: new THREE.Vector3() },
      },
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 80), this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(0, -3.2, -18);
  }

  update(time: number, camPos: THREE.Vector3) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uCamPos.value.copy(camPos);
  }
}
