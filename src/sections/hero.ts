import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars } from '../utils/split-text';
import type { Stage } from '../scene/Stage';
import { dpr } from '../utils/device';

/** Frame at which the sprout's face appears (see README > media notes). */
const AWAKEN_FRAME = 50;

/** Draws one frame of the image sequence, object-fit: cover, only when it changes. */
class SproutPlayer {
  private ctx: CanvasRenderingContext2D;
  private current = -1;

  constructor(private canvas: HTMLCanvasElement, private frames: HTMLImageElement[]) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  get count() {
    return this.frames.length;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    const i = this.current;
    this.current = -1;
    this.draw(Math.max(0, i));
  }

  draw(i: number) {
    i = Math.round(Math.min(this.frames.length - 1, Math.max(0, i)));
    if (i === this.current) return;
    this.current = i;
    const img = this.frames[i];
    const { width: cw, height: ch } = this.canvas;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
}

/** Sweeps the accent line from lime through cyan to gold, one colour per char. */
function colorAccent(line: HTMLElement, chars: HTMLElement[]) {
  line.classList.add('is-split');
  const stops = ['#b6f23d', '#3df2e0', '#ffd98a'].map((c) => gsap.utils.splitColor(c) as number[]);
  chars.forEach((c, i) => {
    const t = Math.min((i / Math.max(1, chars.length - 1)) * 2, 1.999);
    const k = Math.floor(t);
    const f = t - k;
    const rgb = stops[k].map((v, j) => Math.round(v + (stops[k + 1][j] - v) * f));
    c.style.setProperty('--c', `rgb(${rgb.join(',')})`);
    c.style.setProperty('--i', String(i));
  });
}

export interface HeroOptions {
  frames: HTMLImageElement[] | null; // null in reduced-motion mode
  stage: Stage | null;
  onAwaken?: () => void;
}

export function initHero({ frames, stage, onAwaken }: HeroOptions) {
  const hero = document.querySelector<HTMLElement>('#hero')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#sprout-canvas')!;
  const [line1, line2] = gsap.utils.toArray<HTMLElement>('.hero__line');
  const sub = hero.querySelector('.hero__sub');
  const cue = hero.querySelector('#scroll-cue');
  const growth = hero.querySelector<HTMLElement>('#growth-pct')!;
  const flash = document.querySelector<HTMLElement>('#flash')!;

  if (!frames) {
    // Reduced motion: posters + simple fades, no scrubbing, no pin.
    colorAccent(line2, splitChars(line2));
    canvas.hidden = true;
    growth.textContent = '100';
    gsap.set([line1, line2, sub], { opacity: 0 });
    const intro = () => gsap.to([line1, line2, sub], { opacity: 1, duration: 0.8, stagger: 0.15 });
    return { intro };
  }

  const player = new SproutPlayer(canvas, frames);
  const chars1 = splitChars(line1);
  const chars2 = splitChars(line2);
  colorAccent(line2, chars2);
  gsap.set(chars1, { opacity: 0, yPercent: 60, rotateX: -80, filter: 'blur(8px)' });
  gsap.set(chars2, { opacity: 0, yPercent: 60, rotateX: -80 });
  gsap.set(sub, { opacity: 0, y: 20 });

  const state = { frame: 0 };
  let lastFrame = 0;
  const awaken = () => {
    const r = canvas.getBoundingClientRect();
    const x = r.left + r.width * 0.5;
    const y = r.top + r.height * 0.6;
    stage?.fireBurstAt(x, y);
    stage?.flash();
    flash.style.setProperty('--fx', `${x}px`);
    flash.style.setProperty('--fy', `${y}px`);
    gsap.fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 1.1, ease: 'power2.out' });
    onAwaken?.();
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=250%',
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
    },
  });

  tl.to(state, {
    frame: player.count - 1,
    duration: 0.82,
    onUpdate: () => {
      player.draw(state.frame);
      growth.textContent = String(Math.round((state.frame / (player.count - 1)) * 100)).padStart(3, '0');
      // Fire the awakening only when scrubbing forward across the threshold.
      if (lastFrame < AWAKEN_FRAME && state.frame >= AWAKEN_FRAME) awaken();
      lastFrame = state.frame;
    },
  }, 0);
  tl.to(chars2, { opacity: 1, yPercent: 0, rotateX: 0, stagger: 0.012, duration: 0.14, ease: 'power2.out' }, 0.12);
  tl.to(line2, { '--glitch': 1, duration: 0.05 }, 0.5);
  tl.to(sub, { opacity: 1, y: 0, duration: 0.12 }, 0.45);
  tl.to(cue, { opacity: 0, y: 10, duration: 0.08 }, 0.02);
  tl.to('.portal', { scale: 1.04, duration: 0.18 }, 0.82);

  /** Plays once after the preloader: first line in, glitch on. */
  const intro = () => {
    gsap.to(chars1, {
      opacity: 1, yPercent: 0, rotateX: 0, filter: 'blur(0px)',
      stagger: 0.035, duration: 0.9, ease: 'power3.out',
      onComplete: () => gsap.to(line1, { '--glitch': 1, duration: 0.3 }),
    });
    gsap.from('.portal', { opacity: 0, scale: 0.94, duration: 1.4, ease: 'power2.out' });
    gsap.from([hero.querySelector('.eyebrow'), cue], { opacity: 0, y: 12, duration: 0.8, stagger: 0.2, delay: 0.3 });
  };

  return { intro, trigger: tl.scrollTrigger as ScrollTrigger };
}
