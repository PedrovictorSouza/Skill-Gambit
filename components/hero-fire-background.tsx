"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import swordImage from "@/Images/UI/sword.png";
import { cn } from "@/lib/utils";

const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uPointer;

  varying vec2 vUv;

  #define PARTICLE_SCALE vec2(0.5, 1.6)
  #define PARTICLE_SCALE_VAR vec2(0.25, 0.2)
  #define PARTICLE_BLOOM_SCALE vec2(0.5, 0.8)
  #define PARTICLE_BLOOM_SCALE_VAR vec2(0.3, 0.1)
  #define SIZE_MOD 1.05
  #define ALPHA_MOD 0.9
  #define LAYERS_COUNT 14

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(
      permute(
        permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
          i.y +
          vec4(0.0, i1.y, i2.y, 1.0)
      ) +
        i.x +
        vec4(0.0, i1.x, i2.x, 1.0)
    );

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = inversesqrt(
      vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))
    );
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(
      0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)),
      0.0
    );
    m = m * m;

    return 42.0 * dot(
      m * m,
      vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))
    );
  }

  float prng(vec2 seed) {
    seed = fract(seed * vec2(5.3983, 5.4427));
    seed += dot(seed.yx, seed.xy + vec2(21.5351, 14.3137));
    return fract(seed.x * seed.y);
  }

  float hash1_2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 hash2_2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float noise1_2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash1_2(i + vec2(0.0, 0.0)), hash1_2(i + vec2(1.0, 0.0)), u.x),
      mix(hash1_2(i + vec2(0.0, 1.0)), hash1_2(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  vec2 noise2_2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash2_2(i + vec2(0.0, 0.0)), hash2_2(i + vec2(1.0, 0.0)), u.x),
      mix(hash2_2(i + vec2(0.0, 1.0)), hash2_2(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float noiseStack(vec3 pos, int octaves, float falloff) {
    float noise = snoise(pos);
    float off = 1.0;

    if (octaves > 1) {
      pos *= 2.0;
      off *= falloff;
      noise = (1.0 - off) * noise + off * snoise(pos);
    }

    if (octaves > 2) {
      pos *= 2.0;
      off *= falloff;
      noise = (1.0 - off) * noise + off * snoise(pos);
    }

    if (octaves > 3) {
      pos *= 2.0;
      off *= falloff;
      noise = (1.0 - off) * noise + off * snoise(pos);
    }

    return (1.0 + noise) / 2.0;
  }

  vec2 noiseStackUV(vec3 pos, int octaves, float falloff) {
    float displaceA = noiseStack(pos, octaves, falloff);
    float displaceB = noiseStack(
      pos + vec3(3984.293, 423.21, 5235.19),
      octaves,
      falloff
    );
    return vec2(displaceA, displaceB);
  }

  mat2 rot2(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  float layeredNoise1_2(
    vec2 uv,
    float sizeMod,
    float alphaMod,
    int layers,
    float animation,
    vec2 movementDirection,
    float atmosTime
  ) {
    float noise = 0.0;
    float alpha = 1.0;
    float size = 1.0;
    vec2 offset = vec2(0.0);

    for (int i = 0; i < 30; i++) {
      if (i >= layers) {
        break;
      }

      offset += hash2_2(vec2(alpha, size + float(i) * 0.13)) * 10.0;
      noise += noise1_2(
        uv * size + atmosTime * animation * 8.0 * movementDirection + offset
      ) * alpha;

      alpha *= alphaMod;
      size *= sizeMod;
    }

    noise *= (1.0 - alphaMod) / max(1.0 - pow(alphaMod, float(layers)), 0.0001);
    return noise;
  }

  vec2 rotate(vec2 point, float deg) {
    float s = sin(deg);
    float c = cos(deg);
    return mat2(c, -s, s, c) * point;
  }

  vec2 voronoiPointFromRoot(vec2 root, float deg) {
    vec2 point = hash2_2(root) - 0.5;
    float s = sin(deg);
    float c = cos(deg);
    point = mat2(c, -s, s, c) * point * 0.66;
    point += root + 0.5;
    return point;
  }

  float degFromRootUV(vec2 uv, float atmosTime) {
    return atmosTime * 1.35 * (hash1_2(uv) - 0.5) * 2.0;
  }

  vec2 randomAround2_2(vec2 point, vec2 range, vec2 uv) {
    return point + (hash2_2(uv) - 0.5) * range;
  }

  vec3 fireParticles(vec2 uv, vec2 originalUV, float atmosTime) {
    vec3 particles = vec3(0.0);
    vec2 rootUV = floor(uv);
    float deg = degFromRootUV(rootUV, atmosTime);
    vec2 pointUV = voronoiPointFromRoot(rootUV, deg);
    vec2 tempUV = uv;

    tempUV +=
      (noise2_2(uv * 1.3 + vec2(atmosTime * 0.35, -atmosTime * 0.18)) - 0.5) *
      0.18;
    tempUV -= (noise2_2(uv * 2.7 + atmosTime) - 0.5) * 0.08;

    float dist = length(
      rotate(tempUV - pointUV, 0.7) *
      randomAround2_2(PARTICLE_SCALE, PARTICLE_SCALE_VAR, rootUV)
    );
    float distBloom = length(
      rotate(tempUV - pointUV, 0.7) *
      randomAround2_2(
        PARTICLE_BLOOM_SCALE,
        PARTICLE_BLOOM_SCALE_VAR,
        rootUV + 0.73
      )
    );

    particles +=
      (1.0 - smoothstep(0.0025, 0.02, dist)) * vec3(1.0, 0.52, 0.12);
    particles +=
      pow(max(1.0 - smoothstep(0.0, 0.036, distBloom), 0.0), 3.0) *
      vec3(1.0, 0.8, 0.36) *
      0.7;

    float border = (hash1_2(rootUV) - 0.5) * 2.0;
    float disappear = 1.0 - smoothstep(border, border + 0.5, originalUV.y);

    border = (hash1_2(rootUV + 0.214) - 1.8) * 0.7;
    float appear = smoothstep(border, border + 0.4, originalUV.y);

    return particles * disappear * appear;
  }

  vec3 layeredParticles(
    vec2 uv,
    float smoke,
    vec2 movementDirection,
    float atmosTime
  ) {
    vec3 particles = vec3(0.0);
    float size = 1.0;
    float alpha = 1.0;
    vec2 offset = vec2(0.0);

    for (int i = 0; i < 30; i++) {
      if (i >= LAYERS_COUNT) {
        break;
      }

      vec2 noiseOffset = (noise2_2(uv * size * 2.0 + 0.5) - 0.5) * 0.15;
      vec2 bokehUV =
        uv * size +
        atmosTime * movementDirection * 0.11 +
        offset +
        noiseOffset;

      particles +=
        fireParticles(bokehUV, uv, atmosTime) *
        alpha *
        (
          1.0 -
          smoothstep(0.0, 1.0, smoke) * (float(i) / float(LAYERS_COUNT))
        );

      offset += hash2_2(vec2(alpha, alpha + float(i) * 0.071)) * 10.0;
      alpha *= ALPHA_MOD;
      size *= SIZE_MOD;
    }

    return particles;
  }

  void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 pointer = clamp(uPointer, 0.0, 1.0);
    float time = uTime * 0.72;
    float atmosTime = uTime * 0.62;

    float xpart = fragCoord.x / uResolution.x;
    float ypart = fragCoord.y / uResolution.y;
    float xpartShifted =
      clamp((xpart - 0.1 - pointer.x * 0.08) / 0.78, 0.0, 1.0);

    float clip = 240.0 + 90.0 * (1.0 - pointer.y);
    float ypartClip = fragCoord.y / clip;
    float ypartClippedFalloff = clamp(2.0 - ypartClip, 0.0, 1.0);
    float ypartClipped = min(ypartClip, 1.0);
    float ypartClippedn = 1.0 - ypartClipped;
    float xfuel = 1.0 - abs(2.0 * xpartShifted - 1.0);

    float realTime = 0.45 * time;
    vec2 coordScaled =
      0.012 * fragCoord - vec2(0.65 + pointer.x * 0.75, 0.0);
    vec3 position = vec3(coordScaled, 0.0) + vec3(1223.0, 6434.0, 8425.0);
    vec3 flow = vec3(
      4.2 * (0.5 - xpartShifted) * pow(ypartClippedn, 4.0),
      -2.2 * xfuel * pow(ypartClippedn, 42.0),
      0.0
    );
    vec3 timing = realTime * vec3(0.0, -1.7, 1.1) + flow;

    vec3 displacePos =
      vec3(1.0, 0.5, 1.0) * 2.4 * position +
      realTime * vec3(0.02, -0.7, 1.3);
    vec3 displace3 = vec3(noiseStackUV(displacePos, 2, 0.45), 0.0);

    vec3 noiseCoord =
      vec3(2.0, 1.0, 1.0) * position + timing + 0.35 * displace3;
    float noise = noiseStack(noiseCoord, 3, 0.45);

    float flames =
      pow(max(ypartClipped, 0.0001), 0.28 * xfuel + 0.12) *
      pow(max(noise, 0.0001), 0.34 * xfuel + 0.12);

    float f = ypartClippedFalloff * pow(1.0 - flames * flames * flames, 7.0);
    float fff = f * f * f;
    vec3 fire = 1.65 * vec3(f, fff * 0.86, fff * fff * 0.42);

    float smokeNoise =
      0.5 + snoise(0.42 * position + timing * vec3(1.0, 1.0, 0.25)) / 2.0;
    vec3 smoke = vec3(
      0.22 *
        pow(xfuel, 3.0) *
        pow(ypart, 1.8) *
        (smokeNoise + 0.35 * (1.0 - noise))
    );

    float sparkGridSize = 34.0;
    vec2 sparkCoord =
      fragCoord - vec2(160.0 * pointer.x, 210.0 * realTime);
    sparkCoord -=
      36.0 *
      noiseStackUV(0.012 * vec3(sparkCoord, 30.0 * time), 1, 0.45);
    sparkCoord += 96.0 * flow.xy;

    if (mod(sparkCoord.y / sparkGridSize, 2.0) < 1.0) {
      sparkCoord.x += 0.5 * sparkGridSize;
    }

    vec2 sparkGridIndex = floor(sparkCoord / sparkGridSize);
    float sparkRandom = prng(sparkGridIndex);
    float sparkLife = min(
      10.0 *
        (1.0 -
          min(
            (sparkGridIndex.y + (220.0 * realTime / sparkGridSize)) /
              (26.0 - 20.0 * sparkRandom),
            1.0
          )),
      1.0
    );

    vec3 sparks = vec3(0.0);
    if (sparkLife > 0.0) {
      float sparkSize = xfuel * xfuel * sparkRandom * 0.08;
      float sparkRadians = 999.0 * sparkRandom * 6.2831853 + 2.0 * time;
      vec2 sparkCircular = vec2(sin(sparkRadians), cos(sparkRadians));
      vec2 sparkOffset = (0.5 - sparkSize) * sparkGridSize * sparkCircular;
      vec2 sparkModulus =
        mod(sparkCoord + sparkOffset, sparkGridSize) -
        0.5 * vec2(sparkGridSize);
      float sparkLength = length(sparkModulus);
      float sparksGray = max(
        0.0,
        1.0 - sparkLength / (max(sparkSize, 0.001) * sparkGridSize)
      );
      sparks = sparkLife * sparksGray * vec3(1.0, 0.44, 0.08);
    }

    vec2 hotspot = vec2(
      mix(0.68, 0.84, pointer.x),
      mix(0.12, 0.24, pointer.y)
    );
    float bottomMask = 1.0 - smoothstep(0.22, 0.88, ypart);
    float rightMask = smoothstep(0.22, 0.62, xpart);
    float radialMask = 1.0 - smoothstep(0.14, 0.78, distance(vUv, hotspot));
    float region = clamp(max(bottomMask * rightMask, radialMask), 0.0, 1.0);

    vec2 particleUv = (2.0 * fragCoord - uResolution.xy) / uResolution.x;
    particleUv.x += mix(0.18, -0.1, pointer.x);
    particleUv.y -= mix(0.18, -0.06, pointer.y);
    particleUv *= 1.7;
    particleUv = rot2(length(particleUv) * 0.12) * particleUv;

    vec2 movementDirection = normalize(
      vec2(0.75 + pointer.x * 0.4, -1.05 + pointer.y * 0.15)
    );
    float plumeNoise = layeredNoise1_2(
      particleUv * 8.0 + atmosTime * 2.4 * movementDirection,
      1.7,
      0.7,
      6,
      0.22,
      movementDirection,
      atmosTime
    );
    plumeNoise *= pow(1.0 - smoothstep(-1.0, 1.4, particleUv.y), 2.0);

    vec3 plumeSmoke = plumeNoise * vec3(0.18, 0.11, 0.08) * 0.95;
    plumeSmoke *=
      pow(
        layeredNoise1_2(
          particleUv * 4.0 + atmosTime * 0.55 * movementDirection,
          1.8,
          0.5,
          3,
          0.2,
          movementDirection,
          atmosTime
        ),
        2.0
      ) *
      1.45;

    vec3 emberField = layeredParticles(
      particleUv,
      plumeNoise,
      movementDirection,
      atmosTime
    );

    float emberPlume =
      smoothstep(0.12, 0.52, xpart) * (1.0 - smoothstep(0.05, 0.96, ypart));
    emberPlume = max(emberPlume, radialMask * 0.75);

    vec3 color = (max(fire, sparks) + smoke) * region;
    color += plumeSmoke * emberPlume;
    color += emberField * emberPlume;

    float alpha =
      clamp(max(max(color.r, color.g), color.b) * 1.18, 0.0, 1.0) *
      max(region, emberPlume);

    gl_FragColor = vec4(color, alpha);
  }
`;

type HeroFireBackgroundProps = {
  className?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
) => {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Could not create shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
};

const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) => {
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Could not create shader program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown linking error";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
};

export const HeroFireBackground = ({ className }: HeroFireBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });

    if (!gl) {
      return;
    }

    let animationFrameId = 0;
    let positionBuffer: WebGLBuffer | null = null;
    let shaderProgram: WebGLProgram | null = null;
    const heroCard = (canvas.closest("[data-hero-card]") ??
      document.querySelector("[data-hero-card]")) as HTMLElement | null;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const pointer = {
      currentX: 0.72,
      currentY: 0.32,
      targetX: 0.72,
      targetY: 0.32,
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = (heroCard ?? canvas).getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      pointer.targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      pointer.targetY = clamp(
        1 - (event.clientY - rect.top) / rect.height,
        0,
        1
      );
    };

    const handlePointerLeave = () => {
      pointer.targetX = 0.72;
      pointer.targetY = 0.32;
    };

    try {
      const vertexShader = createShader(
        gl,
        gl.VERTEX_SHADER,
        vertexShaderSource
      );
      const fragmentShader = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentShaderSource
      );

      shaderProgram = createProgram(gl, vertexShader, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      positionBuffer = gl.createBuffer();

      if (!positionBuffer) {
        throw new Error("Could not create vertex buffer.");
      }

      gl.useProgram(shaderProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );

      const positionLocation = gl.getAttribLocation(shaderProgram, "position");
      const timeLocation = gl.getUniformLocation(shaderProgram, "uTime");
      const resolutionLocation = gl.getUniformLocation(
        shaderProgram,
        "uResolution"
      );
      const pointerLocation = gl.getUniformLocation(shaderProgram, "uPointer");

      if (
        positionLocation < 0 ||
        !timeLocation ||
        !resolutionLocation ||
        !pointerLocation
      ) {
        throw new Error("Missing shader bindings for hero fire background.");
      }

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const startedAt = performance.now();
      const resizeObserver = new ResizeObserver(resizeCanvas);

      const drawFrame = (now: number) => {
        resizeCanvas();

        pointer.currentX += (pointer.targetX - pointer.currentX) * 0.05;
        pointer.currentY += (pointer.targetY - pointer.currentY) * 0.05;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(timeLocation, (now - startedAt) * 0.001);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(pointerLocation, pointer.currentX, pointer.currentY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (!reducedMotionQuery.matches) {
          animationFrameId = window.requestAnimationFrame(drawFrame);
        }
      };

      const handleMotionPreferenceChange = () => {
        window.cancelAnimationFrame(animationFrameId);
        drawFrame(performance.now());
      };

      resizeObserver.observe(canvas);
      heroCard?.addEventListener("pointermove", handlePointerMove);
      heroCard?.addEventListener("pointerleave", handlePointerLeave);
      reducedMotionQuery.addEventListener(
        "change",
        handleMotionPreferenceChange
      );

      drawFrame(startedAt);

      return () => {
        window.cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        heroCard?.removeEventListener("pointermove", handlePointerMove);
        heroCard?.removeEventListener("pointerleave", handlePointerLeave);
        reducedMotionQuery.removeEventListener(
          "change",
          handleMotionPreferenceChange
        );

        if (positionBuffer) {
          gl.deleteBuffer(positionBuffer);
        }

        if (shaderProgram) {
          gl.deleteProgram(shaderProgram);
        }
      };
    } catch (error) {
      console.error("Failed to initialize hero fire background.", error);
      return;
    }
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(44%_46%_at_78%_88%,rgba(255,129,51,0.22),transparent_58%),radial-gradient(26%_28%_at_84%_78%,rgba(255,205,116,0.14),transparent_50%),radial-gradient(32%_34%_at_72%_94%,rgba(255,78,23,0.1),transparent_60%)] blur-2xl" />
      <div className="absolute inset-0 [perspective:1600px]">
        <div className="absolute inset-0 origin-top [transform:translateX(20vw)_rotateY(-30deg)_scale(2.6)]">
          <Image
            src={swordImage}
            alt=""
            fill
            priority
            className="absolute inset-0 h-screen w-screen object-contain object-top opacity-30"
          />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-90"
      />
    </div>
  );
};
