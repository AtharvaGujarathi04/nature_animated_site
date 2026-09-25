/** Asset loading with byte/count-based progress for the preloader. */

export type Progress = (p: number) => void;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve(img)) : resolve(img));
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Loads a numbered image sequence with limited concurrency. */
export async function loadSequence(
  pattern: (i: number) => string,
  count: number,
  onProgress: Progress,
  concurrency = 8,
): Promise<HTMLImageElement[]> {
  const out: HTMLImageElement[] = new Array(count);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < count) {
      const i = next++;
      out[i] = await loadImage(pattern(i));
      onProgress(++done / count);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

/** Fetches a file with progress and returns an object URL (for small looping videos). */
export async function fetchBlobUrl(src: string, onProgress: Progress): Promise<string> {
  const res = await fetch(src);
  if (!res.ok || !res.body) throw new Error(`Failed to load ${src}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(received / total);
  }
  onProgress(1);
  return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'video/mp4' }));
}

export function createVideo(src: string, loop = true): HTMLVideoElement {
  const v = document.createElement('video');
  v.src = src;
  v.muted = true;
  v.loop = loop;
  v.playsInline = true;
  v.preload = 'auto';
  v.crossOrigin = 'anonymous';
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  return v;
}

export function whenVideoReady(v: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (v.readyState >= 2) return resolve();
    v.addEventListener('loadeddata', () => resolve(), { once: true });
    v.addEventListener('error', () => resolve(), { once: true });
  });
}

