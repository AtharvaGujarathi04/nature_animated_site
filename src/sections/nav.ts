import type Lenis from 'lenis';

/** Fixed glass nav: smooth-scroll links (Lenis when available) and a mobile toggle. */
export function initNav(lenis: Lenis | null) {
  const toggle = document.querySelector<HTMLButtonElement>('#nav-toggle')!;
  const links = document.querySelector<HTMLElement>('#nav-links')!;
  const close = () => {
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = !links.classList.contains('is-open');
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-scroll-to], a[href="#top"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const sel = a.dataset.scrollTo || a.getAttribute('href') || '#top';
      const target = sel === '#top' ? 0 : document.querySelector<HTMLElement>(sel);
      if (target === null) return;
      e.preventDefault();
      close();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else if (target === 0) window.scrollTo({ top: 0 });
      else target.scrollIntoView();
    });
  });
}
