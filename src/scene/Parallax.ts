import { clamp, damp } from '../utils/math';

type DOEWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Normalised pointer/tilt input in -1..1 on both axes, smoothed.
 * Mouse and touch move it directly; device orientation drives it on phones.
 */
export class Parallax {
  x = 0;
  y = 0;
  /** Raw pointer in NDC for raycasting (y up). */
  ndcX = 0;
  ndcY = 0;
  /** True once a real mouse has moved (hover interactions are mouse-only). */
  mouse = false;
  private tx = 0;
  private ty = 0;
  private baseBeta: number | null = null;

  constructor() {
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    window.addEventListener('pointerdown', this.onPointer, { passive: true });
  }

  private onPointer = (e: PointerEvent) => {
    this.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    this.ndcY = -((e.clientY / window.innerHeight) * 2 - 1);
    if (e.pointerType === 'mouse') this.mouse = true;
    if (e.pointerType === 'mouse' || this.baseBeta === null) {
      this.tx = this.ndcX;
      this.ty = this.ndcY;
    }
  };

  private onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (this.baseBeta === null) this.baseBeta = e.beta;
    this.tx = clamp(e.gamma / 25, -1, 1);
    this.ty = clamp(-(e.beta - this.baseBeta) / 25, -1, 1);
  };

  /** True when iOS needs a user gesture before orientation events flow. */
  static needsPermission() {
    const D = window.DeviceOrientationEvent as DOEWithPermission | undefined;
    return !!D && typeof D.requestPermission === 'function';
  }

  async enableOrientation(): Promise<boolean> {
    const D = window.DeviceOrientationEvent as DOEWithPermission | undefined;
    if (!D) return false;
    try {
      if (typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') return false;
    } catch {
      return false;
    }
    window.addEventListener('deviceorientation', this.onOrient, { passive: true });
    return true;
  }

  update(dt: number) {
    this.x = damp(this.x, this.tx, 3.5, dt);
    this.y = damp(this.y, this.ty, 3.5, dt);
  }
}
