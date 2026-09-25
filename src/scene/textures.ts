import * as THREE from 'three';
import { rng } from '../utils/math';

/**
 * Canvas-drawn tree silhouettes. Trunks hug the left/right edges and a canopy
 * fringe hangs from the top, leaving the centre open so the camera can walk
 * "between" layers. `haze` 0..1 pushes the colours toward the sunlit sky for
 * aerial perspective on far layers.
 */
export function treeLayerTexture(seed: number, haze: number): THREE.CanvasTexture {
  const W = 1024;
  const H = 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = rng(seed);
  // Far layers are slightly out of focus.
  g.filter = haze > 0.1 ? `blur(${(haze * 3).toFixed(1)}px)` : 'none';

  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const deep = mix([6, 18, 11], [58, 92, 62], haze);
  const mid = mix([20, 46, 28], [96, 132, 84], haze);
  const rgb = (a: number[], alpha = 1) => `rgba(${a[0]},${a[1]},${a[2]},${alpha})`;

  const trunk = (x: number, w: number, lean: number) => {
    const grad = g.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, rgb(deep));
    grad.addColorStop(0.55, rgb(mid));
    grad.addColorStop(1, rgb(deep));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x - w * 0.42 + lean, 0);
    g.bezierCurveTo(x - w * 0.5, H * 0.45, x - w * 0.45 - lean * 0.5, H * 0.7, x - w * 1.3, H);
    g.lineTo(x + w * 1.3, H);
    g.bezierCurveTo(x + w * 0.45 - lean * 0.5, H * 0.7, x + w * 0.5, H * 0.45, x + w * 0.42 + lean, 0);
    g.closePath();
    g.save();
    g.fill();
    g.clip();
    // Bark: thin darker streaks running down the trunk.
    g.strokeStyle = rgb(deep, 0.55);
    g.lineWidth = 1.5;
    for (let s = 0; s < w / 6; s++) {
      const sx = x - w * 0.45 + r() * w * 0.9;
      g.beginPath();
      g.moveTo(sx + lean * 0.5, r() * H * 0.3);
      g.quadraticCurveTo(sx + (r() - 0.5) * 8, H * 0.5, sx + (r() - 0.5) * 12, H * (0.6 + r() * 0.3));
      g.stroke();
    }
    g.restore();
    // Sunlit rim on the side facing the clearing (the centre of the frame).
    const facing = x < W / 2 ? 1 : -1;
    const rim = g.createLinearGradient(x + facing * w * 0.2, 0, x + facing * w * 0.55, 0);
    rim.addColorStop(0, 'rgba(182,242,61,0)');
    rim.addColorStop(1, `rgba(182,242,61,${0.22 * (1 - haze * 0.7)})`);
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rim;
    g.fillRect(x - w * 1.3, 0, w * 2.6, H);
    g.restore();
  };

  // Trunks: denser at the edges, a few thin ones further in.
  const count = 3 + Math.floor(r() * 2);
  for (let i = 0; i < count; i++) {
    const w = 30 + r() * 55;
    trunk(60 + r() * 300, w, (r() - 0.5) * 40);
    trunk(W - 60 - r() * 300, w, (r() - 0.5) * 40);
  }
  if (haze > 0.3) for (let i = 0; i < 2; i++) trunk(300 + r() * 420, 8 + r() * 10, (r() - 0.5) * 20);

  // Canopy fringe: clusters of soft blobs along the top and down the sides.
  const blob = (x: number, y: number, rad: number, col: number[], a: number) => {
    const gr = g.createRadialGradient(x, y - rad * 0.3, rad * 0.1, x, y, rad);
    gr.addColorStop(0, rgb(mix(col, [182, 242, 61], 0.25 * (1 - haze)), a));
    gr.addColorStop(0.7, rgb(col, a));
    gr.addColorStop(1, rgb(col, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  };
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    const edge = Math.min(x, W - x) / (W / 2); // 0 at edges, 1 in centre
    const y = r() * (H * (0.12 + (1 - edge) * 0.45));
    blob(x, y, 30 + r() * 70 * (1.2 - edge * 0.5), r() > 0.5 ? deep : mid, 0.95);
  }
  // Undergrowth ferns at the bottom corners.
  for (let i = 0; i < 40; i++) {
    const side = r() > 0.5 ? r() * 260 : W - r() * 260;
    blob(side, H * 0.8 - r() * 90, 20 + r() * 45, deep, 0.9);
  }

  // Fade the bottom into the fog so the plane edge never shows.
  g.filter = 'none';
  g.save();
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(0, H * 0.62, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(0, H * 0.62, W, H * 0.38);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A single soft, pre-blurred leaf for the depth-of-field foreground frame. */
export function leafTexture(seed: number, blurPx: number): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  const r = rng(seed);
  g.filter = `blur(${blurPx}px)`;
  g.translate(S / 2, S / 2);
  g.rotate((r() - 0.5) * 0.6);
  const len = S * 0.4;
  const wid = len * (0.38 + r() * 0.15);
  const grad = g.createLinearGradient(-wid, 0, wid, 0);
  grad.addColorStop(0, '#0f2e19');
  grad.addColorStop(0.5, '#2f6b35');
  grad.addColorStop(1, '#14381f');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, -len);
  g.bezierCurveTo(wid, -len * 0.5, wid, len * 0.5, 0, len);
  g.bezierCurveTo(-wid, len * 0.5, -wid, -len * 0.5, 0, -len);
  g.fill();
  g.strokeStyle = 'rgba(182,242,61,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, -len * 0.9);
  g.lineTo(0, len * 0.95);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
