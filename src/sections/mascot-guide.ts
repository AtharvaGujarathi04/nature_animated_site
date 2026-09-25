import * as THREE from 'three';
import type { Stage } from '../scene/Stage';
import { createVideo, whenVideoReady } from '../utils/loader';

/**
 * Mascot interactions: lazy-loads the wave video, replays it on hover/tap,
 * and shows the holographic speech bubble above its head.
 */
export function initMascotGuide(stage: Stage, currentLine: () => string) {
  const bubble = document.querySelector<HTMLElement>('#bubble')!;
  const text = document.querySelector<HTMLElement>('#bubble-text')!;
  const anchor = new THREE.Vector2();
  let hideTimer = 0;
  let showing = false;

  const show = (autoHideMs = 0) => {
    text.textContent = currentLine();
    showing = true;
    bubble.classList.add('is-visible');
    window.clearTimeout(hideTimer);
    if (autoHideMs) hideTimer = window.setTimeout(hide, autoHideMs);
  };
  const hide = () => {
    showing = false;
    bubble.classList.remove('is-visible');
  };

  // Lazy-load the wave loop once the hero is scrolled past or the browser is idle.
  const video = createVideo('/media/character-loop.mp4', false);
  video.preload = 'metadata';
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    video.preload = 'auto';
    video.load();
    whenVideoReady(video).then(() => {
      if (!video.videoWidth) return; // keep the static poster
      stage.mascot.setVideo(video);
      if (stage.mascot.presence > 0.5) stage.mascot.wave();
    });
  };
  const idleLoad = () => window.setTimeout(load, 1200);
  if (document.readyState === 'complete') idleLoad();
  else window.addEventListener('load', idleLoad, { once: true });

  stage.onMascotHover = (h) => {
    document.documentElement.style.cursor = h ? 'pointer' : '';
    if (h) {
      stage.mascot.wave();
      show();
    } else hide();
  };

  // Touch: tap the mascot to wave + talk.
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (stage.hitMascot(e.clientX, e.clientY)) {
      stage.mascot.wave();
      show(2600);
    }
  });

  const prev = stage.onFrame;
  stage.onFrame = (dt) => {
    prev?.(dt);
    if (!showing) return;
    if (stage.mascot.presence < 0.5) return hide();
    stage.mascot.headScreen(stage.camera, anchor, window.innerWidth, window.innerHeight);
    const x = Math.min(Math.max(anchor.x, 120), window.innerWidth - 120);
    const y = Math.max(anchor.y - 8, 90);
    bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  };
}
