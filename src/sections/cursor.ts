/** Glowing spore cursor with a short particle trail (fine pointers only). */
export function initCursor() {
  const canvas = document.querySelector<HTMLCanvasElement>('#cursor')!;
  const ctx = canvas.getContext('2d')!;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  document.documentElement.classList.add('has-spore-cursor');

  const pos = { x: -100, y: -100 };
  const dot = { x: -100, y: -100 };
  let hot = 0; // grows over links/buttons
  let hotTarget = 0;
  type P = { x: number; y: number; vx: number; vy: number; life: number; hue: number };
  const parts: P[] = [];

  const resize = () => {
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
  };
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const dx = e.clientX - pos.x;
    const dy = e.clientY - pos.y;
    pos.x = e.clientX;
    pos.y = e.clientY;
    const speed = Math.hypot(dx, dy);
    const n = Math.min(3, Math.floor(speed / 8));
    for (let i = 0; i < n && parts.length < 60; i++) {
      parts.push({
        x: pos.x, y: pos.y,
        vx: (Math.random() - 0.5) * 0.6 - dx * 0.02,
        vy: (Math.random() - 0.5) * 0.6 - dy * 0.02 - 0.2,
        life: 1,
        hue: Math.random() < 0.7 ? 0 : 1,
      });
    }
    const t = e.target as HTMLElement | null;
    hotTarget = t?.closest('a, button, [data-tilt]') ? 1 : 0;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pos.x = pos.y = -100; });

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= 0.035 * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.fillStyle = p.hue ? `rgba(61,242,224,${p.life * 0.8})` : `rgba(182,242,61,${p.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1 + p.life * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    dot.x += (pos.x - dot.x) * 0.35 * dt;
    dot.y += (pos.y - dot.y) * 0.35 * dt;
    hot += (hotTarget - hot) * 0.2 * dt;
    const r = 5 + hot * 6;
    const g = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, r * 3.5);
    g.addColorStop(0, 'rgba(240,255,210,1)');
    g.addColorStop(0.25, 'rgba(182,242,61,0.9)');
    g.addColorStop(0.6, 'rgba(61,242,224,0.25)');
    g.addColorStop(1, 'rgba(61,242,224,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r * 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (hot > 0.05) {
      ctx.strokeStyle = `rgba(61,242,224,${hot * 0.7})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 14 + hot * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!document.hidden) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); }
  });
}
