import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CAM_END_Z, CAM_START_Z, type SceneState, type Stage } from '../scene/Stage';
import { lerp, smoothstep } from '../utils/math';

interface Key {
  at: () => number; // scroll position in px
  state: SceneState;
  mascot: { presence: number; side: 1 | -1; drop: number };
  line: string; // what the mascot says in this stretch
}

/**
 * Whole-page scroll choreography: key states pinned to section positions,
 * interpolated every frame. Positions are re-read on every ScrollTrigger refresh,
 * so pins and resizes stay in sync.
 */
export function initJourney(stage: Stage, heroTrigger: ScrollTrigger | undefined, animate: boolean) {
  const at = (sel: string, start: string) => {
    const st = ScrollTrigger.create({ trigger: sel, start });
    return () => st.start;
  };
  const heroEnd = () => heroTrigger?.end ?? window.innerHeight;
  const showcase = ScrollTrigger.getById('showcase');
  const S = (camZ: number, camX: number, rays: number, sun: number, fog: number): SceneState => ({ camZ, camX, camY: 0.6, rays, sun, fog });

  const keys: Key[] = [
    { at: () => 0, state: S(CAM_START_Z, 0, 0.55, 0.75, 0.55), mascot: { presence: 0, side: 1, drop: 0 }, line: "Hi! I'm Sprig." },
    { at: heroEnd, state: S(10.5, 0, 0.65, 0.8, 0.55), mascot: { presence: 0, side: 1, drop: 0 }, line: "Hi! I'm Sprig." },
    { at: at('#about', 'top 25%'), state: S(6, 0.4, 0.7, 0.85, 0.5), mascot: { presence: 1, side: 1, drop: 0 }, line: "Hi! I'm Sprig. Welcome to my forest!" },
    { at: at('#features', 'top 25%'), state: S(0.5, -0.4, 0.8, 0.9, 0.45), mascot: { presence: 1, side: -1, drop: 0 }, line: 'Hover the cards. They grow!' },
    { at: () => showcase?.start ?? 0, state: S(-5.5, -2.5, 0.9, 0.95, 0.4), mascot: { presence: 1, side: 1, drop: 0.55 }, line: 'Deeper into the canopy...' },
    { at: () => showcase?.end ?? 0, state: S(-11, 2.5, 1.0, 1.0, 0.38), mascot: { presence: 1, side: 1, drop: 0.55 }, line: 'Almost at the clearing!' },
    { at: at('#grow', 'top 40%'), state: S(-19, 0, 1.5, 1.05, 0.3), mascot: { presence: 1, side: -1, drop: 0 }, line: 'Go on, plant your seed!' },
    { at: () => ScrollTrigger.maxScroll(window), state: S(CAM_END_Z, 0, 1.9, 1.1, 0.25), mascot: { presence: 1, side: -1, drop: 0 }, line: 'Go on, plant your seed!' },
  ];

  let positions: number[] = [];
  const measure = () => {
    positions = keys.map((k) => k.at());
    // Guarantee monotonic order even if a section is very short on some screens.
    for (let i = 1; i < positions.length; i++) positions[i] = Math.max(positions[i], positions[i - 1] + 1);
  };
  ScrollTrigger.addEventListener('refresh', measure);
  measure();

  let waved = false;
  let line = keys[0].line;

  const apply = () => {
    const y = window.scrollY;
    let i = 0;
    while (i < keys.length - 2 && y >= positions[i + 1]) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const raw = (y - positions[i]) / (positions[i + 1] - positions[i]);
    // Reduced motion snaps between section states instead of gliding.
    const t = animate ? smoothstep(0, 1, raw) : raw < 0.5 ? 0 : 1;
    const s = stage.state;
    (Object.keys(s) as (keyof SceneState)[]).forEach((k) => (s[k] = lerp(a.state[k], b.state[k], t)));
    // Showcase leg is linear so the sideways truck tracks the horizontal strip.
    if (i === 4) s.camX = lerp(a.state.camX, b.state.camX, Math.min(Math.max(raw, 0), 1));

    const m = stage.mascot;
    m.presence = lerp(a.mascot.presence, b.mascot.presence, t);
    m.side = raw < 0.5 ? a.mascot.side : b.mascot.side;
    m.drop = lerp(a.mascot.drop, b.mascot.drop, t);
    line = raw < 0.5 ? a.line : b.line;

    if (!waved && m.presence > 0.5) {
      waved = true;
      m.wave();
    }
  };

  if (animate) {
    const prev = stage.onFrame;
    stage.onFrame = (dt) => {
      apply();
      prev?.(dt);
    };
  } else {
    stage.mascot.snap = true;
    const onScroll = () => {
      apply();
      stage.requestRender();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    ScrollTrigger.addEventListener('refresh', onScroll);
    onScroll();
  }

  return { currentLine: () => line };
}
