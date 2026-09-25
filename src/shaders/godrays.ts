import { noiseGLSL } from './common';

/** Additive light shafts on open cones; soft edges come from the view angle. */
export const godRayVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;

export const godRayFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uSeed;
  varying vec2 vUv;
  varying float vFacing;
  ${noiseGLSL}
  void main() {
    // vUv.y runs 0 (wide bottom) -> 1 (narrow top, near the "sun").
    float along = smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
    float streaks = 0.55 + 0.45 * fbm(vec2(vUv.x * 9.0 + uSeed * 10.0, vUv.y * 1.5 - uTime * 0.06));
    float shimmer = 0.8 + 0.2 * sin(uTime * 0.7 + uSeed * 6.0);
    float a = pow(vFacing, 5.0) * along * streaks * shimmer * uIntensity;
    gl_FragColor = vec4(uColor * a, 1.0);
    #include <colorspace_fragment>
  }
`;
