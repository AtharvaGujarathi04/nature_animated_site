/** Capability flags, read once at startup. */
const mq = (q: string) => window.matchMedia(q).matches;

export const reducedMotion = mq('(prefers-reduced-motion: reduce)');
export const isMobile = mq('(max-width: 768px)') || mq('(pointer: coarse)');
export const finePointer = mq('(pointer: fine) and (hover: hover)');
export const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

export const quality = {
  fireflies: isMobile ? 80 : 300,
  bloom: !isMobile,
  bgVideo: isMobile ? '/media/forest-bg-720.mp4' : '/media/forest-bg.mp4',
};
