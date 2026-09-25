/** Far video plane: cheap 9-tap blur, darkening, warm grade and vignette. */
export const backgroundVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const backgroundFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform float uBlur;
  uniform float uBrightness;
  uniform vec3 uTint;
  varying vec2 vUv;

  void main() {
    vec2 o = uTexel * uBlur;
    vec3 c = texture2D(uMap, vUv).rgb * 0.2270270;
    c += (texture2D(uMap, vUv + vec2(o.x, 0.0)).rgb + texture2D(uMap, vUv - vec2(o.x, 0.0)).rgb) * 0.1581081;
    c += (texture2D(uMap, vUv + vec2(0.0, o.y)).rgb + texture2D(uMap, vUv - vec2(0.0, o.y)).rgb) * 0.1581081;
    c += (texture2D(uMap, vUv + o).rgb + texture2D(uMap, vUv - o).rgb) * 0.0702703;
    c += (texture2D(uMap, vUv + vec2(o.x, -o.y)).rgb + texture2D(uMap, vUv + vec2(-o.x, o.y)).rgb) * 0.0702703;
    // Grade toward the forest palette so the sky reads as a sunlit canopy gap.
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(l) * uTint, 0.35);
    float vig = smoothstep(0.95, 0.25, distance(vUv, vec2(0.5, 0.55)));
    gl_FragColor = vec4(c * uBrightness * mix(0.45, 1.0, vig), 1.0);
    #include <colorspace_fragment>
  }
`;
