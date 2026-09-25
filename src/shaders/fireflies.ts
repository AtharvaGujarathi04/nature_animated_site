/** Glowing spores: drift is computed on the GPU from a per-particle seed. */
export const firefliesVertex = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime * (0.25 + aSeed * 0.35);
    // Layered sines approximate a smooth noise field and avoid texture lookups.
    p.x += sin(t + aSeed * 40.0) * 0.9 + sin(t * 0.37 + aSeed * 13.0) * 0.6;
    p.y += cos(t * 0.8 + aSeed * 21.0) * 0.7 + sin(t * 0.23 + aSeed * 7.0) * 0.9;
    p.z += sin(t * 0.5 + aSeed * 31.0) * 0.8;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float flicker = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 60.0);
    float depthFade = smoothstep(0.4, 2.5, -mv.z) * (1.0 - smoothstep(30.0, 55.0, -mv.z));
    vAlpha = flicker * depthFade;
    vColor = aColor;
    gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio * (10.0 / -mv.z);
  }
`;

export const firefliesFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 3.0) * 1.6 + core * 0.35;
    gl_FragColor = vec4(vColor * glow * 1.8, glow * vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** One-shot radial burst when the sprout awakens. uProgress runs 0 -> 1. */
export const burstVertex = /* glsl */ `
  attribute vec3 aDir;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float t = clamp(uProgress * (0.8 + aSeed * 0.4), 0.0, 1.0);
    float ease = 1.0 - pow(1.0 - t, 3.0);
    vec3 p = position + aDir * ease * (1.2 + aSeed * 2.2);
    p.y += ease * 0.6 - t * t * 0.8;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = (1.0 - t) * smoothstep(0.0, 0.05, uProgress);
    vSeed = aSeed;
    gl_PointSize = uSize * (0.4 + aSeed) * (1.0 - t * 0.6) * uPixelRatio * (8.0 / -mv.z);
  }
`;

export const burstFragment = /* glsl */ `
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float g = pow(smoothstep(0.5, 0.0, d), 2.2);
    vec3 lime = vec3(0.71, 0.95, 0.24), cyan = vec3(0.24, 0.95, 0.88), gold = vec3(1.0, 0.85, 0.54);
    vec3 c = vSeed < 0.45 ? lime : (vSeed < 0.8 ? cyan : gold);
    gl_FragColor = vec4(c * 2.2 * g, g * vAlpha);
    #include <colorspace_fragment>
  }
`;
