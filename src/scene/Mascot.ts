import * as THREE from 'three';
import { chromaKeyFragment, chromaKeyVertex } from '../shaders/chroma-key';
import { damp } from '../utils/math';

/**
 * The seed mascot: a keyed video plane parented to the camera so it travels
 * with the reader. Target position/side come from the scroll choreography;
 * the actual position is damped toward it with a small hop when switching sides.
 */
export class Mascot {
  group = new THREE.Group(); // lives in camera space
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  video?: HTMLVideoElement;

  /** 0 = hidden off-screen, 1 = in place. */
  presence = 0;
  /** -1 = left, +1 = right. */
  side = 1;
  /** 0..1: sink toward the bottom edge (used where content spans the full width). */
  drop = 0;
  /** Jump straight to targets (reduced motion). */
  snap = false;
  private x = 6;
  private y = -1;
  private viewW = 8;
  private viewH = 5;
  private readonly depth = 6;
  private height = 2.3;
  private hover = 0;

  constructor(poster: THREE.Texture) {
    poster.colorSpace = THREE.NoColorSpace;
    this.material = new THREE.ShaderMaterial({
      vertexShader: chromaKeyVertex,
      fragmentShader: chromaKeyFragment,
      uniforms: {
        uMap: { value: poster },
        uLow: { value: 0.035 },
        uHigh: { value: 0.11 },
        uReach: { value: 0.07 },
        uAspect: { value: 536 / 720 },
        uRim: { value: new THREE.Color('#3df2e0') },
        uRimStrength: { value: 1 },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(536 / 720, 1), this.material);
    this.mesh.renderOrder = 20;
    this.group.add(this.mesh);
    this.group.position.z = -this.depth;
    this.group.visible = false;
  }

  /** Swap from the static poster to the (lazy-loaded) wave video. */
  setVideo(video: HTMLVideoElement) {
    this.video = video;
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    this.material.uniforms.uMap.value = tex;
  }

  /** Plays the (ping-pong) wave loop once, from the start. */
  wave() {
    const v = this.video;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  layout(camera: THREE.PerspectiveCamera) {
    this.viewH = 2 * this.depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    this.viewW = this.viewH * camera.aspect;
    const narrow = camera.aspect < 0.9;
    this.height = this.viewH * (narrow ? 0.26 : 0.46);
    this.mesh.scale.setScalar(this.height);
  }

  get halfWidth() {
    return (this.height * (536 / 720)) / 2;
  }

  private targetX() {
    const narrow = this.viewW / this.viewH < 0.9;
    const margin = narrow ? 0.05 : this.viewW * 0.04;
    return this.side * (this.viewW / 2 - this.halfWidth - margin);
  }

  private targetY() {
    const narrow = this.viewW / this.viewH < 0.9;
    return narrow ? -this.viewH / 2 + this.height * 0.55 : -this.height * 0.12;
  }

  update(time: number, dt: number, px: number, py: number, hovering: boolean) {
    this.group.visible = this.presence > 0.001;
    if (!this.group.visible) return;
    const offscreen = this.side * (this.viewW / 2 + this.halfWidth * 2);
    const tx = THREE.MathUtils.lerp(offscreen, this.targetX(), this.presence);
    const prevX = this.x;
    const ty = this.targetY() - this.drop * this.height * 0.45;
    if (this.snap) {
      this.x = tx;
      this.y = ty;
      this.mesh.position.set(tx, ty, 0);
      this.mesh.scale.setScalar(this.height);
      this.material.uniforms.uTime.value = time;
      return;
    }
    this.x = damp(this.x, tx, 4, dt);
    const travel = Math.min(Math.abs(tx - this.x) / (this.viewW * 0.5), 1);
    this.y = damp(this.y, ty, 4, dt);
    this.hover = damp(this.hover, hovering ? 1 : 0, 8, dt);

    const bob = Math.sin(time * 1.6) * 0.06 * this.height;
    const hop = Math.sin(travel * Math.PI) * this.height * 0.35;
    this.mesh.position.set(this.x, this.y + bob + hop, 0);
    // Lean into the direction of travel, and tilt toward the pointer.
    const vx = (this.x - prevX) / Math.max(dt, 1e-3);
    this.mesh.rotation.z = THREE.MathUtils.clamp(-vx * 0.02, -0.35, 0.35) + Math.sin(time * 1.1) * 0.03;
    this.mesh.rotation.y = damp(this.mesh.rotation.y, px * 0.35 - this.side * 0.12, 5, dt);
    this.mesh.rotation.x = damp(this.mesh.rotation.x, -py * 0.15, 5, dt);
    this.mesh.scale.setScalar(this.height * (1 + this.hover * 0.05));

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uRimStrength.value = 1 + this.hover * 1.2;
  }

  /** Screen-space anchor above the mascot's head, for the speech bubble. */
  headScreen(camera: THREE.Camera, out: THREE.Vector2, w: number, h: number) {
    const v = new THREE.Vector3(0, 0.5, 0);
    this.mesh.localToWorld(v);
    v.project(camera);
    out.set((v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h);
    return out;
  }
}
