# Sprig: forest parallax landing page

A 3D, scroll-driven landing page: a sunlit Pixar-style forest with a bioluminescent, holographic layer on top. Built with Vite, vanilla TypeScript, Three.js, GSAP ScrollTrigger, Lenis and `postprocessing` (bloom).

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/
```

The processed media is already in `public/media`, so you only need ffmpeg if you change the source clips.

## Project structure

```
index.html              page markup and all placeholder copy
src/main.ts             boot: preloader -> scene -> Lenis -> sections
src/scene/              Three.js layers
  Stage.ts              renderer, camera rig, bloom composer, render loop, tab-visibility pause
  Background.ts         far layer: looping video on a plane (blurred and graded in a shader)
  Trees.ts, textures.ts canvas-drawn silhouette tree layers and blurred foreground leaves
  GodRays.ts            additive light cones
  Fireflies.ts          GPU-animated spores (Points)
  Fog.ts                scrolling fbm ground fog
  Foreground.ts         depth-of-field leaves glued to the camera
  Burst.ts              particle burst when the sprout awakens
  Mascot.ts             keyed character plane that follows the reader
  Parallax.ts           pointer / touch / device-orientation input
src/sections/           DOM + scroll choreography
  hero.ts               pinned 250vh sprout scrub, split-text headline, awakening burst
  journey.ts            whole-page camera and mascot keyframes tied to section positions
  mascot-guide.ts       lazy-loads the wave video, hover/tap wave, speech bubble
  features.ts           3D tilt cards and scroll reveals
  showcase.ts           pinned horizontal strip with depth parallax
  nav.ts, cursor.ts, preloader.ts
src/shaders/            GLSL (chroma key, background, fireflies/burst, god rays, fog)
src/utils/              device capabilities, loaders, math, text splitting
scripts/process-media.sh  ffmpeg pipeline: media-src/ -> public/media/
media-src/              original clips (kept because the CloudFront link can expire)
```

## Swapping copy

All text is in `index.html`. Hero headline lines are `.hero__line` elements; update the `data-text` attribute to match, since the glitch effect draws its ghost copy from it. The mascot's speech-bubble lines are the `line:` fields in `src/sections/journey.ts`, one per section.

## Swapping colours

- **DOM**: CSS custom properties at the top of `src/styles/main.css` (`--forest-900`, `--lime`, `--cyan`, `--gold`, and so on).
- **3D scene**: colours live in the layer files:
  - firefly palette: `Fireflies.ts`
  - god-ray tint: `GodRays.ts` (`#ffd98a`)
  - mascot rim light: `Mascot.ts` (`uRim`)
  - fog: `Fog.ts`
  - background grade: `Background.ts` (`uTint`)
  - tree tones: `treeLayerTexture()` in `textures.ts`
  - clear colour: `Stage.ts`
- **Scroll mood** (camera depth, god-ray intensity, sunlight and fog per section): the `keys` table in `src/sections/journey.ts`.

## Media processing

```bash
npm run media      # = bash scripts/process-media.sh (needs ffmpeg + ffprobe)
```

Inputs in `media-src/`: `forest-bg.mp4`, `plant.mp4`, `character.mp4`. If `forest-bg.mp4` is missing, the script tries the original CloudFront URL.

| Output | How |
| --- | --- |
| `forest-bg.mp4` (1080p) / `forest-bg-720.mp4` (mobile) / `forest-bg-poster.jpg` | The source doesn't loop (the plane jumps back at the cut), so the last 1s is crossfaded into the first and the first second is trimmed. The result is a 6.04s seamless loop. |
| `sprout/001–073.webp` (1080px tall) + `sprout-first/last.{webp,jpg}` | `delogo` over the KlingAI watermark, then a WebP sequence for canvas scrubbing. |
| `character-loop.mp4` (720p) + `character/*.png` (480p) + `character-poster.png` | The watermark sits on pure black below the leaf, so a black `drawbox` removes it without touching the leaf. The loop is ping-pong (forward + reverse), so the wave repeats without a hard cut. |

Watermark boxes are hard-coded for the current clips (`delogo=x=610:y=1120:w=154:h=38` and `drawbox=x=654:y=1062:w=150:h=34`). If you replace a clip, re-check them.

### The chroma key (`src/shaders/chroma-key.ts`)

- **Soft luminance key**: `smoothstep(0.035, 0.11, luma)`. The dark-brown brows (luma about 0.2) and red-brown irises stay fully opaque.
- **Pupils**: these are nearly pure black, so a luma key alone would punch holes in them. An enclosure test marches 8 short rays out from each dark pixel. If all 8 hit the character, the pixel counts as inside and stays opaque.
- **Edge colour**: soft edge pixels are divided by the matte to remove the dark fringe left by the black background.
- **Rim light**: a pulsing cyan rim is drawn in the band just outside the silhouette.

The tuning uniforms (`uLow`, `uHigh`, `uReach`) are in `Mascot.ts`.

## Behaviour by device

- **Desktop**: 300 fireflies, bloom and vignette, a spore cursor with a trail, 3D tilt cards, and devicePixelRatio capped at 1.5.
- **Mobile** (≤768px or coarse pointer): 80 fireflies, the 720p background, no bloom, and device-orientation parallax. On iOS, an "Enable tilt parallax" chip asks for motion permission behind a tap.
- **`prefers-reduced-motion`**: no Lenis, no scrubbing or pinning, no particles or render loop. The page shows posters with opacity fades and renders the scene only when you move between sections.
- **Hidden tab**: the render loop and all videos pause.
- **No WebGL / no H.264**: a blurred poster image stays behind the page, and the mascot falls back to its keyed still frame.

Assets below the hero load lazily: the mascot video loads after `window.load`. The preloader waits for fonts, the background video, the 73 sprout frames and the mascot poster, about 4.8MB on desktop, including about 210KB of gzipped JS.
