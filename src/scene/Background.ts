import * as THREE from 'three';
import { backgroundFragment, backgroundVertex } from '../shaders/background';

/** Far layer: the looping forest/sky video on a large plane. */
export class Background {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  private readonly aspect: number;

  constructor(source: HTMLVideoElement | HTMLImageElement, readonly z = -60) {
    const isVideo = source instanceof HTMLVideoElement;
    const tex = isVideo ? new THREE.VideoTexture(source) : new THREE.Texture(source);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    if (!isVideo) tex.needsUpdate = true;
    const w = isVideo ? source.videoWidth || 1920 : source.naturalWidth;
    const h = isVideo ? source.videoHeight || 1080 : source.naturalHeight;
    this.aspect = w / h;

    this.material = new THREE.ShaderMaterial({
      vertexShader: backgroundVertex,
      fragmentShader: backgroundFragment,
      uniforms: {
        uMap: { value: tex },
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
        uBlur: { value: 2.2 },
        uBrightness: { value: 0.7 },
        uTint: { value: new THREE.Color('#bfe39a') },
      },
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.mesh.position.z = z;
    this.mesh.renderOrder = -10;
  }

  /** Scale so the plane covers the frustum from the farthest camera position, plus parallax margin. */
  fit(camera: THREE.PerspectiveCamera, farthestCamZ: number) {
    const dist = farthestCamZ - this.z;
    const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25;
    const vw = vh * camera.aspect;
    const h = Math.max(vh, vw / this.aspect);
    this.mesh.scale.set(h * this.aspect, h, 1);
  }
}
