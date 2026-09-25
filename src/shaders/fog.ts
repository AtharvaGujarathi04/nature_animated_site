import { noiseGLSL } from './common';

/** Low ground fog: two scrolling fbm layers, faded at the edges of the plane. */
export const fogVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const fogFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uCamPos;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${noiseGLSL}
  void main() {
    vec2 p = vWorld.xz * 0.08;
    float n = fbm(p + vec2(uTime * 0.02, uTime * 0.01));
    n = n * 0.6 + 0.4 * fbm(p * 2.3 - vec2(uTime * 0.035, 0.0));
    float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x)
               * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    // Fade out right under the camera so it never becomes a flat wall.
    float dist = length(vWorld.xz - uCamPos.xz);
    float near = smoothstep(2.0, 9.0, dist);
    float a = smoothstep(0.35, 0.9, n) * edge * near * uOpacity * 0.6;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;
