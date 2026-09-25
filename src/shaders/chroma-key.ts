/**
 * Black-background key for the mascot.
 *
 * 1. Soft luminance key: smoothstep(uLow, uHigh, luma). Brows (dark brown, luma
 *    ~0.2) and red-brown irises sit well above uHigh, so they stay opaque.
 * 2. The pupils are almost pure black, so a luma key alone would punch holes in
 *    them. An "enclosure" test marches 8 rays outward; if every ray hits an
 *    opaque pixel within uReach, the pixel is inside the character, so it stays.
 * 3. A cyan rim glow is added in the soft band just outside the alpha edge.
 */
export const chromaKeyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const chromaKeyFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLow;
  uniform float uHigh;
  uniform float uReach;
  uniform float uAspect;   // texture width / height
  uniform vec3 uRim;
  uniform float uRimStrength;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;

  // Textures are sampled raw (sRGB-encoded values), so thresholds match what you see.
  float lumaAt(vec2 uv) {
    vec3 c = texture2D(uMap, uv).rgb;
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }
  float keyAt(vec2 uv) { return smoothstep(uLow, uHigh, lumaAt(uv)); }

  vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float alpha = keyAt(vUv);

    // Enclosure test (only for dark pixels, so most fragments skip the loop).
    float hits = 0.0;
    float nearest = 1.0;
    float enclosed = 0.0;
    if (alpha < 0.99) {
      for (int d = 0; d < 8; d++) {
        float a = float(d) * 0.78539816;
        vec2 dir = vec2(cos(a) / uAspect, sin(a));
        float hit = 0.0;
        for (int s = 1; s <= 10; s++) {
          float t = float(s) / 10.0;
          vec2 p = vUv + dir * uReach * t;
          if (keyAt(p) > 0.5) { hit = 1.0; nearest = min(nearest, t); break; }
        }
        hits += hit;
      }
      enclosed = step(7.5, hits);
      alpha = max(alpha, enclosed);
    }

    // Rim: pixels just outside the silhouette (some rays hit quickly) glow cyan.
    float rimBand = (1.0 - alpha) * smoothstep(0.0, 4.0, hits) * (1.0 - smoothstep(0.1, 0.45, nearest));
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
    // Edge pixels were blended over black: divide the matte back out so the
    // silhouette doesn't get a dark fringe (skip for enclosed pupils).
    float key = keyAt(vUv);
    vec3 base = (enclosed < 0.5 && key < 0.999) ? min(tex.rgb / max(key, 0.35), vec3(1.0)) : tex.rgb;
    vec3 rgb = srgbToLinear(base);
    // Slight edge light on the inside of the silhouette too.
    float innerEdge = alpha * (1.0 - enclosed) * (1.0 - smoothstep(0.55, 1.0, key));
    rgb += uRim * innerEdge * 0.35 * uRimStrength;

    float rimA = rimBand * 0.55 * uRimStrength * pulse;
    vec3 outRgb = mix(uRim * 1.4, rgb, alpha / max(alpha + rimA, 1e-4));
    float outA = clamp(alpha + rimA, 0.0, 1.0) * uOpacity;
    if (outA < 0.004) discard;
    gl_FragColor = vec4(outRgb, outA);
    #include <colorspace_fragment>
  }
`;
