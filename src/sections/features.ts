import gsap from 'gsap';

/** Holographic cards tilt toward the pointer in 3D. */
export function initTiltCards(enabled: boolean) {
  if (!enabled) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
      card.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/** Fade-up reveals. Reduced motion gets a plain opacity fade via IntersectionObserver. */
export function initReveals(animate: boolean) {
  const els = gsap.utils.toArray<HTMLElement>('.reveal');
  if (!animate) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')),
      { threshold: 0.2 },
    );
    els.forEach((el) => io.observe(el));
    return;
  }
  els.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });
}
