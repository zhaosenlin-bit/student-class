/**
 * [INPUT]: src/lib.js 暴露的 Three.js。
 * [OUTPUT]: 全课件共享的材质库、几何辅助函数、液体/菲涅尔着色器与颗粒堆生成器。
 * [POS]: 器材层之下的基础层；不包含任何课程状态。
 *
 * 玻璃沿用氧气母版验证过的做法：低透明外壳 + 高 clearcoat + 独立的
 * 菲涅尔边缘壳，而不是把低 opacity 和高 transmission 混在同一材质里。
 */
import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RoundedBoxGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from './lib.js'

export function createMaterials() {
  return {
    glass: new MeshPhysicalMaterial({
      color: 0xa9d2da, transparent: true, opacity: 0.17, roughness: 0.045,
      metalness: 0, ior: 1.46, clearcoat: 1, clearcoatRoughness: 0.025,
      envMapIntensity: 1.45, side: DoubleSide, depthWrite: false,
    }),
    glassInner: new MeshPhysicalMaterial({
      color: 0xbfe7ef, transparent: true, opacity: 0.05, roughness: 0.07,
      clearcoat: 0.8, clearcoatRoughness: 0.04, side: DoubleSide, depthWrite: false,
    }),
    glassEdge: new MeshStandardMaterial({
      color: 0x78a6b1, transparent: true, opacity: 0.85, roughness: 0.13,
      metalness: 0.02, depthWrite: false,
    }),
    glassRod: new MeshPhysicalMaterial({
      color: 0xd7ecef, transparent: true, opacity: 0.66, roughness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2, depthWrite: false,
    }),
    steel: new MeshStandardMaterial({ color: 0x7f8d90, roughness: 0.2, metalness: 0.82 }),
    darkSteel: new MeshStandardMaterial({ color: 0x1c2426, roughness: 0.28, metalness: 0.74 }),
    brass: new MeshStandardMaterial({ color: 0xb9853f, roughness: 0.24, metalness: 0.72 }),
    rubber: new MeshStandardMaterial({ color: 0x151a1b, roughness: 0.72, metalness: 0 }),
    rubberRed: new MeshStandardMaterial({ color: 0x8e3d33, roughness: 0.62, metalness: 0.02 }),
    // 干 / 湿滤纸与称量纸：湿润后颜色加深并出现轻微光泽（贴合感）。
    paperDry: new MeshStandardMaterial({
      color: 0xf5f0e2, roughness: 0.94, metalness: 0, side: DoubleSide,
    }),
    paperWet: new MeshPhysicalMaterial({
      color: 0xd9d0ba, roughness: 0.42, metalness: 0, clearcoat: 0.5,
      clearcoatRoughness: 0.22, side: DoubleSide,
    }),
    porcelain: new MeshPhysicalMaterial({
      color: 0xf4f2ec, roughness: 0.24, metalness: 0, clearcoat: 0.72,
      clearcoatRoughness: 0.14, envMapIntensity: 1.05,
    }),
    porcelainInner: new MeshPhysicalMaterial({
      color: 0xfbfaf5, roughness: 0.3, metalness: 0, clearcoat: 0.5,
      clearcoatRoughness: 0.2, side: DoubleSide,
    }),
    ivory: new MeshStandardMaterial({ color: 0xe8e1cd, roughness: 0.55, metalness: 0.02 }),
    amber: new MeshPhysicalMaterial({
      color: 0xd5a15a, transparent: true, opacity: 0.38, roughness: 0.18,
      clearcoat: 0.62, clearcoatRoughness: 0.08, depthWrite: false,
    }),
    label: new MeshStandardMaterial({ color: 0xfdfcf7, roughness: 0.6, metalness: 0 }),
    flameOuter: new MeshStandardMaterial({
      color: 0xff6e2d, emissive: 0xff4818, emissiveIntensity: 1.85, transparent: true,
      opacity: 0.46, roughness: 0.25, side: DoubleSide, depthWrite: false,
    }),
    flameMid: new MeshStandardMaterial({
      color: 0xffc94a, emissive: 0xffa625, emissiveIntensity: 2.15, transparent: true,
      opacity: 0.66, roughness: 0.2, side: DoubleSide, depthWrite: false,
    }),
    flameInner: new MeshStandardMaterial({
      color: 0x53c8ff, emissive: 0x168fff, emissiveIntensity: 3.4, transparent: true,
      opacity: 0.95, roughness: 0.12, side: DoubleSide, depthWrite: false,
    }),
  }
}

/* ---------- 几何辅助 ---------- */

export function lathe(points, segments, material, phiStart, phiLength) {
  const geometry = new LatheGeometry(
    points.map((p) => new Vector2(p[0], p[1])),
    segments || 28,
    phiStart === undefined ? 0 : phiStart,
    phiLength === undefined ? Math.PI * 2 : phiLength,
  )
  if (geometry.computeVertexNormals) geometry.computeVertexNormals()
  const mesh = new Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function roundedBox(w, h, d, r, material) {
  const mesh = new Mesh(new RoundedBoxGeometry(w, h, d, 5, r), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function cylinderBetween(a, b, radius, material, segments) {
  const dir = new Vector3().subVectors(b, a)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, dir.length(), segments || 16), material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize())
  mesh.castShadow = true
  return mesh
}

export function ringTorus(R, r, material, segments) {
  const mesh = new Mesh(new TorusGeometry(R, r, 12, segments || 48), material)
  mesh.rotation.x = Math.PI / 2 // 水平环
  mesh.castShadow = true
  return mesh
}

export function addEdges(mesh, color, opacity, threshold) {
  const lines = new LineSegments(
    new EdgesGeometry(mesh.geometry, threshold === undefined ? 35 : threshold),
    new LineBasicMaterial({ color, transparent: true, opacity }),
  )
  lines.renderOrder = (mesh.renderOrder || 0) + 1
  mesh.add(lines)
  return lines
}

/* ---------- 液体与玻璃着色器 ---------- */

const LIQUID_VERT = `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vLocalY = position.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

/**
 * 竖直渐变液体体：uMurk 把清液混向浑浊盐水（灰褐、更不透明）。
 * uCut 用于圆锥 / 蒸发皿等按液面裁剪的容器（丢弃液面以上片元）。
 */
export function liquidVolumeMaterial(opts) {
  const o = opts || {}
  return new ShaderMaterial({
    uniforms: {
      uMinY: { value: o.minY === undefined ? -0.5 : o.minY },
      uMaxY: { value: o.maxY === undefined ? 0.5 : o.maxY },
      uCut: { value: o.cut === undefined ? 1e3 : o.cut },
      uBottom: { value: new Color(o.bottom === undefined ? 0x6fa9c4 : o.bottom) },
      uTop: { value: new Color(o.top === undefined ? 0xaadbe8 : o.top) },
      uAlphaB: { value: o.alphaB === undefined ? 0.5 : o.alphaB },
      uAlphaT: { value: o.alphaT === undefined ? 0.34 : o.alphaT },
      uMurk: { value: 0 },
      uMurkColor: { value: new Color(0x9d8d6e) },
      uTime: { value: 0 },
    },
    vertexShader: LIQUID_VERT,
    fragmentShader: `
      uniform float uMinY; uniform float uMaxY; uniform float uCut;
      uniform vec3 uBottom; uniform vec3 uTop;
      uniform float uAlphaB; uniform float uAlphaT;
      uniform float uMurk; uniform vec3 uMurkColor; uniform float uTime;
      varying vec3 vWorldNormal; varying vec3 vViewDir; varying float vLocalY;
      void main() {
        if (vLocalY > uCut) discard;
        float h = clamp((vLocalY - uMinY) / max(0.0001, uMaxY - uMinY), 0.0, 1.0);
        vec3 base = mix(uBottom, uTop, h);
        base = mix(base, uMurkColor * (0.86 + h * 0.22), uMurk);
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDir)));
        float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.2);
        float murkGrain = uMurk * 0.05 * sin(vLocalY * 46.0 + uTime * 1.4);
        float alpha = mix(uAlphaB, uAlphaT, h);
        alpha = mix(alpha, 0.8, uMurk * 0.55) + rim * mix(0.2, 0.06, uMurk) + murkGrain;
        gl_FragColor = vec4(base + rim * mix(0.16, 0.03, uMurk), clamp(alpha, 0.0, 0.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

/** 液面圆片：极浅的环形微光；uMurk 同步变浑。 */
export function liquidSurfaceMaterial(opts) {
  const o = opts || {}
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(o.color === undefined ? 0xcdeef4 : o.color) },
      uMurkColor: { value: new Color(0xb0a184) },
      uAlpha: { value: o.alpha === undefined ? 0.5 : o.alpha },
      uMurk: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uMurkColor;
      uniform float uAlpha; uniform float uMurk; uniform float uTime;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float ringGlint = smoothstep(0.2, 0.0, abs(sin(r * 9.0 - uTime * 0.9)) - 0.12) * 0.1;
        vec3 base = mix(uColor, uMurkColor, uMurk);
        float edge = smoothstep(1.0, 0.86, r);
        float alpha = (uAlpha + uMurk * 0.3) * edge + ringGlint * (1.0 - uMurk);
        gl_FragColor = vec4(base + ringGlint, clamp(alpha, 0.0, 0.9));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

/** 独立菲涅尔玻璃边缘壳（叠在玻璃外壳上，只提供边缘高光）。 */
export function fresnelShellMaterial(opacity, edgeHex) {
  return new ShaderMaterial({
    uniforms: {
      uEdgeColor: { value: new Color(edgeHex === undefined ? 0x70a8b6 : edgeHex) },
      uOpacity: { value: opacity === undefined ? 0.42 : opacity },
    },
    vertexShader: LIQUID_VERT,
    fragmentShader: `
      uniform vec3 uEdgeColor; uniform float uOpacity;
      varying vec3 vWorldNormal; varying vec3 vViewDir; varying float vLocalY;
      void main() {
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDir)));
        float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.6);
        gl_FragColor = vec4(uEdgeColor, (0.012 + rim) * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

/** 倾倒 / 沿壁液流：细透明柱体材质，uMurk 控制浑浊。 */
export function streamMaterial(murky) {
  const material = new MeshPhysicalMaterial({
    color: murky ? 0xa8977a : 0xbfe2ea,
    transparent: true, opacity: murky ? 0.66 : 0.44, roughness: 0.14,
    clearcoat: 0.5, depthWrite: false, side: DoubleSide,
  })
  return material
}

/* ---------- 颗粒堆：粗盐 / 泥沙 / 滤渣 / 晶体 ---------- */

const GRAIN_GEOMETRY = new DodecahedronGeometry(0.045, 0)

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * 生成一堆不规则颗粒；返回的 group.userData.setAmount(a) 让颗粒随进度出现，
 * 用于“同一份样品”的转移与生长。colors 数组按 weight 混合（粗盐 = 灰白 + 泥沙）。
 */
export function grainPile(opts) {
  const o = opts || {}
  const count = o.count === undefined ? 26 : o.count
  const spread = o.spread === undefined ? 0.2 : o.spread
  const height = o.height === undefined ? 0.09 : o.height
  const scale = o.scale === undefined ? 1 : o.scale
  const flatten = o.flatten === undefined ? 0.72 : o.flatten
  const colors = o.colors || [
    [0xe9e4d6, 5], [0xdcd4c2, 3], [0xf2eee4, 3], // 灰白氯化钠
    [0x8b7c66, 2], [0x6e6353, 1.4],               // 泥沙
  ]
  const rand = seededRandom(o.seed === undefined ? 7 : o.seed)
  const palette = []
  colors.forEach((c) => { for (let i = 0; i < Math.round(c[1] * 4); i += 1) palette.push(c[0]) })

  const minRadius = o.minRadius === undefined ? 0 : o.minRadius
  const group = new Group()
  const grains = []
  for (let i = 0; i < count; i += 1) {
    const material = new MeshStandardMaterial({
      color: palette[Math.floor(rand() * palette.length)],
      roughness: 0.88, metalness: 0.01,
    })
    const grain = new Mesh(GRAIN_GEOMETRY, material)
    const angle = rand() * Math.PI * 2
    const radial = minRadius + Math.sqrt(rand()) * Math.max(0.002, spread - minRadius)
    const s = scale * (0.55 + rand() * 0.7)
    grain.position.set(
      Math.cos(angle) * radial,
      rand() * height * (1 - radial / (spread + 0.001)) + 0.018 * scale,
      Math.sin(angle) * radial * (o.depthScale === undefined ? 1 : o.depthScale),
    )
    grain.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    grain.scale.set(s, s * flatten, s)
    grain.castShadow = true
    grain.userData.appearAt = i / count
    grain.userData.baseScale = s
    grain.userData.flatten = flatten
    group.add(grain)
    grains.push(grain)
  }
  group.userData.setAmount = (amount) => {
    const a = MathUtils.clamp(amount, 0, 1)
    grains.forEach((grain) => {
      const local = MathUtils.clamp((a - grain.userData.appearAt) / 0.14, 0, 1)
      grain.visible = local > 0.001
      const s = grain.userData.baseScale * local
      grain.scale.set(s, s * grain.userData.flatten, s)
    })
    group.visible = a > 0.001
  }
  group.userData.setAmount(o.amount === undefined ? 1 : o.amount)
  return group
}

/** 画布文字标签贴纸（试剂瓶等）；无 DOM 环境时静默降级为素色。 */
export function labelSticker(text, w, h, material) {
  const sticker = roundedBox(w, h, 0.012, 0.006, material.clone())
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = Math.round((256 * h) / w)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fdfcf6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#a9b4a6'
    ctx.lineWidth = 6
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14)
    ctx.fillStyle = '#3c4a3f'
    ctx.font = `700 ${Math.round(canvas.height * 0.44)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
    const texture = new CanvasTexture(canvas)
    sticker.material.map = texture
    sticker.material.needsUpdate = true
  } catch (error) { /* 无画布环境（离线校验）时忽略贴图 */ }
  return sticker
}
