import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Pinned horizontal strip. Each card has a data-depth: near cards (>1) move
 * faster and sit closer, far cards (<1) lag, shrink and soften, so the strip
 * reads as cards drifting through the forest's depth layers.
 */
export function initShowcase(animate: boolean, softBlur: boolean) {
  const section = document.querySelector<HTMLElement>('#showcase')!;
  const track = document.querySelector<HTMLElement>('#showcase-track')!;
  const cards = gsap.utils.toArray<HTMLElement>('.show-card', track);
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  if (!animate) {
    // Reduced motion: no pin, let the strip scroll natively.
    track.style.overflowX = 'auto';
    track.style.width = '100%';
    track.style.paddingBottom = '16px';
    ScrollTrigger.create({ id: 'showcase', trigger: section, start: 'top top', end: 'bottom top' });
    return;
  }

  const depthFx = () => {
    const vw = window.innerWidth;
    for (const card of cards) {
      const depth = Number(card.dataset.depth || 1);
      const r = card.getBoundingClientRect();
      const d = (r.left + r.width / 2 - vw / 2) / vw; // -0.5..0.5 when on screen
      const ad = Math.min(Math.abs(d), 1);
      gsap.set(card, {
        x: d * (depth - 1) * 260,
        z: (depth - 1) * 220 - ad * 160,
        rotateY: -d * 28,
        opacity: 1 - ad * 0.55,
        filter: softBlur && depth < 0.9 ? `blur(${((0.9 - depth) * 6 + ad * 2).toFixed(1)}px)` : 'none',
        zIndex: Math.round(depth * 10),
      });
    }
  };

  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      id: 'showcase',
      trigger: section,
      start: 'top top',
      end: () => `+=${distance() + window.innerHeight * 0.3}`,
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: depthFx,
      onRefresh: depthFx,
    },
  });
  depthFx();
}
