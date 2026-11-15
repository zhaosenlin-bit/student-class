/**
 * [INPUT]: three（经 importmap 固定到 vendor/three.module.js, r184）。
 * [OUTPUT]: 二氧化碳课件的材质调色板、Fresnel 玻璃壳与液体/气体着色器工厂。
 * [POS]: 器材建模（apparatus.js）与课程动画（lesson.js）共同的视觉基础。
 *
 * 玻璃方案沿用氧气母版校准结论：低透明玻璃壳 + Fresnel 边缘壳叠加，
 * 而不是把低 opacity 与高 transmission 混在同一材质里，避免灰奶雾。
 */
import {
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three'

export function createMaterials() {
  const materials = {
    glass: new MeshPhysicalMaterial({
      color: 0xa9d2da,
      transparent: true,
      opacity: 0.16,
      roughness: 0.045,
      metalness: 0,
      ior: 1.46,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      envMapIntensity: 1.45,
      side: DoubleSide,
      depthWrite: false,
    }),
    glassInner: new MeshPhysicalMaterial({
      color: 0xbfe7ef,
      transparent: true,
      opacity: 0.04,
      roughness: 0.07,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.04,
      side: BackSide,
      depthWrite: false,
    }),
    glassEdge: new MeshStandardMaterial({
      color: 0x78a6b1,
      transparent: true,
      opacity: 0.85,
      roughness: 0.13,
      metalness: 0.02,
      depthWrite: false,
    }),
    rubber: new MeshStandardMaterial({
      color: 0x141819,
      roughness: 0.86,
      metalness: 0,
    }),
    rubberTube: new MeshStandardMaterial({
      color: 0x1b1f20,
      roughness: 0.62,
      metalness: 0.02,
    }),
    plasticCap: new MeshStandardMaterial({
      color: 0x50645d,
      roughness: 0.72,
      metalness: 0.01,
    }),
    limestone: new MeshStandardMaterial({
      color: 0xd6d0c2,
      roughness: 0.94,
      metalness: 0.01,
      flatShading: true,
    }),
    limestoneDark: new MeshStandardMaterial({
      color: 0xb9b2a2,
      roughness: 0.96,
      metalness: 0.01,
      flatShading: true,
    }),
    wood: new MeshStandardMaterial({
      color: 0xc9a06a,
      roughness: 0.82,
      metalness: 0,
    }),
    charredWood: new MeshStandardMaterial({
      color: 0x33302c,
      roughness: 0.92,
      metalness: 0,
    }),
    wax: new MeshStandardMaterial({
      color: 0xf6f1e2,
      roughness: 0.55,
      metalness: 0,
      emissive: 0xe8dcc2,
      emissiveIntensity: 0.05,
    }),
    wick: new MeshStandardMaterial({
      color: 0x2c2620,
      roughness: 0.95,
      metalness: 0,
    }),
    ceramicStep: new MeshStandardMaterial({
      color: 0xdad7cf,
      roughness: 0.66,
      metalness: 0.04,
    }),
    matchboxPaper: new MeshStandardMaterial({
      color: 0xd9bd86,
      roughness: 0.86,
      metalness: 0,
    }),
    matchboxRed: new MeshStandardMaterial({
      color: 0xa84c3e,
      roughness: 0.78,
      metalness: 0,
    }),
    matchboxStriker: new MeshStandardMaterial({
      color: 0x5a3a32,
      roughness: 0.96,
      metalness: 0,
    }),
    matchHead: new MeshStandardMaterial({
      color: 0x8d3028,
      emissive: 0x4a120d,
      emissiveIntensity: 0.18,
      roughness: 0.9,
      metalness: 0,
    }),
    precipitate: new MeshStandardMaterial({
      color: 0xfbfbf6,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
    smoke: new MeshBasicMaterial({
      color: 0x9aa0a0,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
    bubble: new MeshPhysicalMaterial({
      color: 0xe9fbff,
      transparent: true,
      opacity: 0.62,
      roughness: 0.08,
      ior: 1.12,
      side: DoubleSide,
      depthWrite: false,
    }),
    gasMote: new MeshBasicMaterial({
      color: 0xf2f8f8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
    flameOuter: new MeshStandardMaterial({
      color: 0xff6a2d, emissive: 0xff4b18, emissiveIntensity: 1.85,
      transparent: true, opacity: 0.46, roughness: 0.25, side: DoubleSide, depthWrite: false,
    }),
    flameMid: new MeshStandardMaterial({
      color: 0xffc84a, emissive: 0xffa425, emissiveIntensity: 2.15,
      transparent: true, opacity: 0.64, roughness: 0.2, side: DoubleSide, depthWrite: false,
    }),
    flameInner: new MeshStandardMaterial({
      color: 0x53ccff, emissive: 0x168fff, emissiveIntensity: 3.2,
      transparent: true, opacity: 0.95, roughness: 0.12, side: DoubleSide, depthWrite: false,
    }),
    pourStream: new MeshPhysicalMaterial({
      color: 0xdff2f4,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      clearcoat: 0.6,
      side: DoubleSide,
      depthWrite: false,
    }),
  }
  return materials
}

/** Fresnel 边缘壳：套在玻璃外壳几何上，只提亮轮廓，不糊住内容物。 */
export function createGlassFresnelMaterial(opacity = 0.42, edgeHex = 0x70a8b6, coreHex = 0x4f8998) {
  return new ShaderMaterial({
    uniforms: {
      uEdgeColor: { value: new Color(edgeHex) },
      uCoreColor: { value: new Color(coreHex) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uEdgeColor;
      uniform vec3 uCoreColor;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
        float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.35);
        vec3 color = mix(uCoreColor, uEdgeColor, 0.55 + rim * 0.45);
        float alpha = uOpacity * (0.035 + rim * 0.78);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: NormalBlending,
  })
}

/**
 * 液体体积：底浅顶亮的柔和渐变，稀盐酸与石灰水都保持无色透明。
 * uTurbidity 用于石灰水变浑浊：整体推向乳白并抬高不透明度。
 */
export function createLiquidVolumeMaterial({ minY, maxY, bottomAlpha = 0.2, topAlpha = 0.1 }) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMinY: { value: minY },
      uMaxY: { value: maxY },
      uBottom: { value: new Color(0xbfd9dd) },
      uTop: { value: new Color(0xe9f6f7) },
      uHighlight: { value: new Color(0xffffff) },
      uMilk: { value: new Color(0xf3f4ec) },
      uTurbidity: { value: 0 },
      uBottomAlpha: { value: bottomAlpha },
      uTopAlpha: { value: topAlpha },
    },
    vertexShader: `
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vLocalPosition = position;
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uMinY;
      uniform float uMaxY;
      uniform vec3 uBottom;
      uniform vec3 uTop;
      uniform vec3 uHighlight;
      uniform vec3 uMilk;
      uniform float uTurbidity;
      uniform float uBottomAlpha;
      uniform float uTopAlpha;
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        float depth = smoothstep(uMinY, uMaxY, vLocalPosition.y);
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
        float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), 2.45);
        float bandA = sin(vWorldPosition.x * 2.4 + vWorldPosition.z * 1.3 + uTime * 0.4);
        float bandB = sin(vWorldPosition.x * -1.2 + vWorldPosition.z * 2.7 - uTime * 0.3);
        float flow = smoothstep(0.5, 0.95, 0.5 + 0.25 * bandA + 0.25 * bandB);
        vec3 color = mix(uBottom, uTop, depth);
        color = mix(color, uHighlight, fresnel * 0.22 + flow * 0.04);
        color = mix(color, uMilk, uTurbidity * 0.92);
        float alpha = mix(uBottomAlpha, uTopAlpha, depth) + fresnel * 0.12;
        alpha = mix(alpha, 0.9 + fresnel * 0.06, uTurbidity);
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

/** 液面：轻微起伏 + 高光，同样支持浑浊插值。 */
export function createLiquidSurfaceMaterial(amplitude = 0.008) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: amplitude },
      uColor: { value: new Color(0xd9eef0) },
      uHighlight: { value: new Color(0xffffff) },
      uMilk: { value: new Color(0xf4f5ee) },
      uTurbidity: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uAmplitude;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      varying float vWave;
      void main() {
        vec3 transformed = position;
        float waveA = sin(position.x * 3.4 + uTime * 0.7);
        float waveB = sin(position.y * 4.6 - uTime * 0.55);
        vWave = 0.5 + 0.25 * waveA + 0.25 * waveB;
        transformed.z += (waveA + waveB) * uAmplitude;
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uHighlight;
      uniform vec3 uMilk;
      uniform float uTurbidity;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      varying float vWave;
      void main() {
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
        float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), 2.1);
        float glint = smoothstep(0.76, 1.0, vWave);
        vec3 color = mix(uColor, uHighlight, 0.18 + fresnel * 0.45 + glint * 0.16);
        color = mix(color, uMilk, uTurbidity * 0.9);
        float alpha = 0.3 + fresnel * 0.26 + glint * 0.08;
        alpha = mix(alpha, 0.88, uTurbidity);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

/**
 * 无色二氧化碳体积：极弱的透明渐变，只提示“气体占据到哪里”。
 * 上边界处略亮，形成一条含蓄的气/空气分界。
 */
export function createGasVolumeMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(0xeef6f6) },
      uEdge: { value: new Color(0xffffff) },
      uAlpha: { value: 0.085 },
    },
    vertexShader: `
      varying vec3 vLocalPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vLocalPosition = position;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uEdge;
      uniform float uAlpha;
      varying vec3 vLocalPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
        float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), 2.0);
        float topBand = smoothstep(0.86, 1.0, vLocalPosition.y);
        float shimmer = 0.5 + 0.5 * sin(vLocalPosition.y * 20.0 - uTime * 0.9);
        vec3 color = mix(uColor, uEdge, topBand * 0.7 + fresnel * 0.2);
        float alpha = uAlpha * (0.45 + fresnel * 0.75 + topBand * (0.9 + shimmer * 0.25));
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

/** 试剂瓶标签：名称、化学式和储存要点分行，便于在全景镜头中辨认。 */
export function createLabelMaterial(text, detail = '', storage = '') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f7f5ee'
  ctx.fillRect(0, 0, 256, 160)
  ctx.strokeStyle = 'rgba(90, 110, 100, 0.55)'
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, 236, 140)
  ctx.fillStyle = '#2f4038'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (detail && storage) {
    ctx.font = '700 34px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(text, 128, 45)
    ctx.fillStyle = '#52645d'
    ctx.font = '700 24px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(detail, 128, 91)
    ctx.fillStyle = '#6a4d36'
    ctx.font = '700 18px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(storage, 128, 130)
  } else if (detail) {
    ctx.font = '700 39px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(text, 128, 61)
    ctx.fillStyle = '#52645d'
    ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(detail, 128, 112)
  } else {
    ctx.font = '700 52px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(text, 128, 84)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return new MeshBasicMaterial({ map: texture, toneMapped: false })
}
