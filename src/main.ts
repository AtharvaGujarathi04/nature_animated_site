import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Stage } from './scene/Stage';
import { Parallax } from './scene/Parallax';
import { dpr, finePointer, isMobile, quality, reducedMotion } from './utils/device';
import { fetchBlobUrl, createVideo, loadImage, loadSequence, whenVideoReady } from './utils/loader';
import { Preloader } from './sections/preloader';
import { initHero } from './sections/hero';
import { initJourney } from './sections/journey';
import { initReveals, initTiltCards } from './sections/features';
import { initShowcase } from './sections/showcase';
import { initNav } from './sections/nav';
import { initCursor } from './sections/cursor';
import { initMascotGuide } from './sections/mascot-guide';

gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const SPROUT_FRAMES = 73;
const animate = !reducedMotion;

async function boot() {
  const preloader = new Preloader();
  const pFonts = preloader.track('fonts', 0.05);
  const pBg = preloader.track('background', 0.35);
  const pSeq = preloader.track('sprout', 0.5);
  const pPoster = preloader.track('mascot', 0.1);

  const fonts = document.fonts.ready.then(() => pFonts(1));
  const mascotPoster = loadImage('/media/character-poster.png').then((img) => (pPoster(1), img));

  // Background: the looping video (720p on mobile), or just the poster for reduced motion.
  const background: Promise<HTMLVideoElement | HTMLImageElement> = animate
    ? fetchBlobUrl(quality.bgVideo, pBg)
        .then(async (url) => {
          const v = createVideo(url);
          await whenVideoReady(v);
          // Browsers without H.264 get the still poster instead of a black plane.
          if (!v.videoWidth) throw new Error('background video not decodable');
          return v as HTMLVideoElement | HTMLImageElement;
        })
        .catch(() => loadImage('/media/forest-bg-poster.jpg'))
    : loadImage('/media/forest-bg-poster.jpg').then((img) => (pBg(1), img));

  const frames = animate
    ? loadSequence((i) => `/media/sprout/${String(i + 1).padStart(3, '0')}.webp`, SPROUT_FRAMES, pSeq)
    : Promise.resolve(null).then((v) => (pSeq(1), v));

  const [bg, seq, poster] = await Promise.all([background, frames, mascotPoster, fonts]);

  // ---------------------------------------------------------------- scene
  let stage: Stage | null = null;
  try {
    stage = new Stage({
      canvas: document.querySelector('#webgl')!,
      background: bg,
      mascotPoster: poster,
      pixelRatio: dpr,
      fireflies: animate ? quality.fireflies : 0,
      bloom: animate && quality.bloom,
      animate,
    });
  } catch (err) {
    // No WebGL: the blurred poster image behind the canvas stays visible.
    console.warn('WebGL unavailable, using static background', err);
  }

  // ---------------------------------------------------------------- scrolling
  let lenis: Lenis | null = null;
  if (animate) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // ---------------------------------------------------------------- sections
  const hero = initHero({ frames: seq, stage });
  initShowcase(animate, !isMobile);
  initReveals(animate);
  initTiltCards(animate && finePointer);
  initNav(lenis);
  if (stage) {
    const journey = initJourney(stage, hero.trigger, animate);
    initMascotGuide(stage, journey.currentLine);
  }
  if (animate && finePointer) initCursor();

  // iOS needs a tap before device orientation flows; Android just works.
  if (stage && animate && isMobile) {
    const btn = document.querySelector<HTMLButtonElement>('#tilt-btn')!;
    if (Parallax.needsPermission()) {
      btn.hidden = false;
      btn.addEventListener('click', async () => {
        btn.hidden = !(await stage!.parallax.enableOrientation()) ? false : true;
      });
    } else stage.parallax.enableOrientation();
  }

  if (import.meta.env.DEV) (window as unknown as { stage: Stage | null }).stage = stage;

  ScrollTrigger.refresh();
  window.scrollTo(0, 0);
  await preloader.done();

  if (bg instanceof HTMLVideoElement && !document.hidden) bg.play().catch(() => {});
  stage?.start();
  stage?.requestRender();
  hero.intro();
}

boot().catch((err) => {
  console.error(err);
  document.documentElement.classList.remove('is-loading');
  document.querySelector('#preloader')?.remove();
});
