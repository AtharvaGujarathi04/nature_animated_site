import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, VignetteEffect } from 'postprocessing';
import gsap from 'gsap';
import { Background } from './Background';
import { Trees } from './Trees';
import { GodRays } from './GodRays';
import { Fireflies } from './Fireflies';
import { Foreground } from './Foreground';
import { Fog } from './Fog';
import { Burst } from './Burst';
import { Mascot } from './Mascot';
import { Parallax } from './Parallax';
import { damp } from '../utils/math';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  background: HTMLVideoElement | HTMLImageElement;
  mascotPoster: HTMLImageElement;
  pixelRatio: number;
  fireflies: number;
  bloom: boolean;
  animate: boolean;
}

/** Values the scroll choreography writes every frame. */
export interface SceneState {
  camZ: number;
  camX: number;
  camY: number;
  rays: number;
  sun: number;
  fog: number;
}

export const CAM_START_Z = 14;
export const CAM_END_Z = -24;

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  rig = new THREE.Group();
  parallax = new Parallax();
  background: Background;
  trees = new Trees();
  rays = new GodRays();
  fireflies?: Fireflies;
  foreground = new Foreground();
  fog = new Fog();
  burst?: Burst;
  mascot: Mascot;
  state: SceneState = { camZ: CAM_START_Z, camX: 0, camY: 0.6, rays: 0.6, sun: 0.75, fog: 0.55 };

  private composer?: EffectComposer;
  private bloom?: BloomEffect;
  private bloomBase = 0.9;
  private bloomBoost = { v: 0 };
  private time = 0;
  private running = false;
  private raycaster = new THREE.Raycaster();
  private hovering = false;
  private camPos = new THREE.Vector3();
  private readonly animate: boolean;
  private needsRender = true;
  onMascotHover?: (hovering: boolean) => void;
  onFrame?: (dt: number) => void;

  constructor(private opts: StageOptions) {
    this.animate = opts.animate;
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: !opts.bloom,
    });
    this.renderer.setPixelRatio(opts.pixelRatio);
    this.renderer.setClearColor('#0b1f14');

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.rig.add(this.camera);
    this.scene.add(this.rig);
    this.scene.fog = new THREE.FogExp2('#0b1f14', 0.012);

    this.background = new Background(opts.background);
    this.scene.add(this.background.mesh, this.trees.group, this.rays.group, this.fog.mesh);

    if (opts.fireflies > 0) {
      this.fireflies = new Fireflies(opts.fireflies, opts.pixelRatio);
      this.scene.add(this.fireflies.points);
      this.burst = new Burst(opts.fireflies > 100 ? 180 : 70, opts.pixelRatio);
      this.camera.add(this.burst.points);
    }
    this.camera.add(this.foreground.group);

    const posterTex = new THREE.Texture(opts.mascotPoster);
    posterTex.needsUpdate = true;
    this.mascot = new Mascot(posterTex);
    this.camera.add(this.mascot.group);

    if (opts.bloom) {
      this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType });
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new BloomEffect({ mipmapBlur: true, intensity: this.bloomBase, luminanceThreshold: 0.55, luminanceSmoothing: 0.3, radius: 0.7 });
      this.composer.addPass(new EffectPass(this.camera, this.bloom, new VignetteEffect({ darkness: 0.55, offset: 0.3 })));
    }

    // Compile every shader now (behind the preloader) instead of on the first visible frame.
    this.mascot.group.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.mascot.group.visible = false;

    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.background.fit(this.camera, CAM_START_Z + 2);
    this.foreground.layout(this.camera);
    this.mascot.layout(this.camera);
    this.needsRender = true;
    if (!this.running) this.render(0);
  };

  private onVisibility = () => {
    const bg = this.opts.background;
    if (document.hidden) {
      this.stop();
      if (bg instanceof HTMLVideoElement) bg.pause();
      this.mascot.video?.pause();
    } else if (this.animate) {
      if (bg instanceof HTMLVideoElement) bg.play().catch(() => {});
      this.start();
    }
  };

  start() {
    if (this.running || !this.animate) return;
    this.running = true;
    gsap.ticker.add(this.tick);
  }

  stop() {
    this.running = false;
    gsap.ticker.remove(this.tick);
  }

  /** Brief bloom surge (or nothing on mobile, where the CSS flash covers it). */
  flash() {
    if (!this.bloom) return;
    gsap.fromTo(this.bloomBoost, { v: 3.2 }, { v: 0, duration: 1.4, ease: 'power2.out' });
  }

  /** Fire the burst at a screen position (px). */
  fireBurstAt(sx: number, sy: number) {
    if (!this.burst) return;
    const ndc = new THREE.Vector3((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1, 0.5);
    ndc.unproject(this.camera);
    const local = this.camera.worldToLocal(ndc);
    local.multiplyScalar(5 / -local.z); // put it 5 units in front of the lens
    this.burst.points.position.copy(local);
    this.burst.fire(this.time);
  }

  private tick = (_t: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.render(dt);
  };

  /** Mascot hit-test against the inner part of its plane (ignores the empty corners). */
  private updateHover() {
    if (!this.parallax.mouse) return;
    this.setHover(this.hitNdc(this.parallax.ndcX, this.parallax.ndcY));
  }

  private hitNdc(x: number, y: number) {
    if (!this.mascot.group.visible || this.mascot.presence < 0.6) return false;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const uv = this.raycaster.intersectObject(this.mascot.mesh, false)[0]?.uv;
    return !!uv && uv.x > 0.15 && uv.x < 0.85 && uv.y > 0.05 && uv.y < 0.95;
  }

  /** Hit-test in client pixels (used for taps). */
  hitMascot(clientX: number, clientY: number) {
    return this.hitNdc((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  }

  private setHover(v: boolean) {
    if (v === this.hovering) return;
    this.hovering = v;
    this.onMascotHover?.(v);
  }

  get isHoveringMascot() {
    return this.hovering;
  }

  render(dt: number) {
    this.time += dt;
    const t = this.time;
    const s = this.state;
    this.parallax.update(dt);
    const px = this.parallax.x;
    const py = this.parallax.y;

    // Camera: scroll dolly on the rig, pointer parallax on top (max ~0.4 units).
    this.rig.position.set(s.camX, s.camY, s.camZ);
    this.camera.position.x = damp(this.camera.position.x, px * 0.4, 4, dt || 1);
    this.camera.position.y = damp(this.camera.position.y, py * 0.25, 4, dt || 1);
    this.camera.rotation.y = -px * 0.02;
    this.camera.rotation.x = py * 0.015;
    this.camera.getWorldPosition(this.camPos);

    this.trees.update(this.camPos.z);
    this.rays.intensity = s.rays;
    this.rays.update(t);
    this.background.material.uniforms.uBrightness.value = s.sun;
    this.fog.material.uniforms.uOpacity.value = s.fog;
    this.fog.update(t, this.camPos);
    this.fireflies?.update(t);
    this.burst?.update(t);
    this.foreground.update(t, px, py);
    this.updateHover();
    this.mascot.update(t, dt || 0.016, px, py, this.hovering);
    this.onFrame?.(dt);

    if (this.bloom) this.bloom.intensity = this.bloomBase * (0.8 + s.rays * 0.35) + this.bloomBoost.v;
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  }

  /** For reduced-motion mode: draw a frame only when something changed. */
  requestRender() {
    if (this.running) return;
    this.needsRender = true;
    requestAnimationFrame(() => this.needsRender && this.render(0));
  }
}
