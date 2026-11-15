/**
 * [INPUT]: mats.js 的材质与辅助函数。
 * [OUTPUT]: 非玻璃器材构建器：托盘天平、称量纸、药匙、铁架台（带铁圈）、
 *           酒精灯与火焰、灯帽、蒸汽、液流与液滴等动效载体。
 * [POS]: 纯器材层；不包含课程状态与动画时序。
 */
import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from '../lib.js'
import {
  addEdges,
  cylinderBetween,
  lathe,
  ringTorus,
  roundedBox,
} from '../mats.js'

/* ---------- 称量纸（四边微翘的方形纸） ---------- */

export function buildWeighPaper(mats) {
  const group = new Group()
  group.name = 'weigh-paper'
  const sheet = roundedBox(0.46, 0.008, 0.46, 0.004, mats.paperDry.clone())
  sheet.position.y = 0.008
  group.add(sheet)
  const flapGeometryLong = [0.46, 0.007, 0.085]
  ;[
    { p: [0, 0.03, 0.255], r: [-0.5, 0, 0] },
    { p: [0, 0.03, -0.255], r: [0.5, 0, 0] },
    { p: [0.255, 0.03, 0], r: [0, 0, 0.5], swap: true },
    { p: [-0.255, 0.03, 0], r: [0, 0, -0.5], swap: true },
  ].forEach((cfg) => {
    const flap = roundedBox(
      cfg.swap ? flapGeometryLong[2] : flapGeometryLong[0],
      flapGeometryLong[1],
      cfg.swap ? flapGeometryLong[0] : flapGeometryLong[2],
      0.003, mats.paperDry.clone(),
    )
    flap.position.set(cfg.p[0], cfg.p[1], cfg.p[2])
    flap.rotation.set(cfg.r[0], cfg.r[1], cfg.r[2])
    flap.castShadow = false
    group.add(flap)
  })
  return { group, topY: 0.014 }
}

/* ---------- 药匙（牛角匙：柄 + 浅勺） ---------- */

export function buildSpoon(mats) {
  const group = new Group()
  group.name = 'spoon'
  const handle = new Mesh(new CylinderGeometry(0.02, 0.024, 0.72, 12), mats.ivory)
  handle.rotation.z = Math.PI / 2
  handle.castShadow = true
  group.add(handle)
  const scoop = new Mesh(new SphereGeometry(0.085, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.ivory)
  scoop.position.set(-0.42, 0.028, 0)
  scoop.rotation.x = Math.PI
  scoop.scale.set(1, 0.55, 0.72)
  scoop.castShadow = true
  group.add(scoop)
  const scoopInner = new Mesh(new SphereGeometry(0.078, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.ivory.clone())
  scoopInner.material.color.setHex(0xdcd4bd)
  scoopInner.position.set(-0.42, 0.03, 0)
  scoopInner.rotation.x = Math.PI
  scoopInner.scale.set(0.92, 0.5, 0.66)
  group.add(scoopInner)
  return { group, scoopTip: new Vector3(-0.46, 0.02, 0) }
}

/* ---------- 托盘天平 ---------- */

export function buildBalance(mats) {
  const group = new Group()
  group.name = 'platform-balance'

  const base = roundedBox(1.66, 0.15, 0.86, 0.05, mats.darkSteel)
  base.position.y = 0.075
  group.add(base)
  addEdges(base, 0x9ca6a2, 0.3, 30)
  const baseTop = roundedBox(1.5, 0.04, 0.72, 0.02, mats.steel)
  baseTop.position.y = 0.16
  group.add(baseTop)
  ;[-0.7, 0.7].forEach((x) => {
    const foot = new Mesh(new CylinderGeometry(0.05, 0.06, 0.05, 14), mats.brass)
    foot.position.set(x, 0.03, 0.32)
    group.add(foot)
  })

  const pillar = new Mesh(new CylinderGeometry(0.05, 0.062, 0.9, 18), mats.steel)
  pillar.position.y = 0.62
  pillar.castShadow = true
  group.add(pillar)

  // 分度盘：白面板 + 中线 + 两侧刻度
  const dial = roundedBox(0.34, 0.24, 0.02, 0.01, mats.label)
  dial.position.set(0, 0.5, 0.09)
  group.add(dial)
  for (let i = -2; i <= 2; i += 1) {
    const tick = roundedBox(0.008, i === 0 ? 0.14 : 0.08, 0.008, 0.003, mats.darkSteel)
    tick.position.set(i * 0.06, 0.47 + (i === 0 ? 0.026 : 0), 0.102)
    tick.castShadow = false
    group.add(tick)
  }

  // 横梁组：绕支点转动；两端托盘随动但保持水平（Roberval 结构的教学近似）
  const beamGroup = new Group()
  beamGroup.position.y = 1.07
  group.add(beamGroup)
  const beam = roundedBox(1.62, 0.055, 0.075, 0.02, mats.steel)
  beamGroup.add(beam)
  addEdges(beam, 0xcfd8d4, 0.35, 30)
  const fulcrum = new Mesh(new CylinderGeometry(0.05, 0.05, 0.14, 14), mats.brass)
  fulcrum.rotation.x = Math.PI / 2
  beamGroup.add(fulcrum)

  // 游码导轨与游码
  const rail = roundedBox(1.3, 0.018, 0.03, 0.008, mats.darkSteel)
  rail.position.y = 0.048
  beamGroup.add(rail)
  const rider = roundedBox(0.06, 0.075, 0.06, 0.012, mats.brass)
  rider.position.set(-0.6, 0.07, 0)
  beamGroup.add(rider)

  // 指针：由梁中心垂下，随梁摆动扫过分度盘
  const pointer = roundedBox(0.02, 0.52, 0.014, 0.006, mats.darkSteel)
  pointer.position.y = -0.29
  beamGroup.add(pointer)
  const pointerTip = new Mesh(new CylinderGeometry(0.004, 0.02, 0.09, 8), mats.rubberRed)
  pointerTip.position.y = -0.56
  beamGroup.add(pointerTip)

  // 托盘组件（左右各一）：短柱 + 浅盘；counter-rotate 保持水平
  const pans = {}
  ;[-1, 1].forEach((side) => {
    const carrier = new Group()
    carrier.position.x = side * 0.77
    beamGroup.add(carrier)
    const post = new Mesh(new CylinderGeometry(0.026, 0.03, 0.16, 12), mats.steel)
    post.position.y = 0.1
    carrier.add(post)
    const pan = lathe([[0.02, 0.0], [0.2, 0.005], [0.29, 0.03], [0.305, 0.055]], 36, mats.steel)
    pan.position.y = 0.18
    carrier.add(pan)
    const panRim = ringTorus(0.3, 0.011, mats.steel, 40)
    panRim.position.y = 0.234
    carrier.add(panRim)
    pans[side === -1 ? 'left' : 'right'] = { carrier, topY: 0.19 }
  })

  // 砝码（5 g）：带提钮的小圆柱，初始放在台面砝码座上
  const weight = new Group()
  weight.name = 'balance-weight'
  const weightBody = new Mesh(new CylinderGeometry(0.088, 0.095, 0.13, 22), mats.brass)
  weightBody.position.y = 0.065
  weightBody.castShadow = true
  weight.add(weightBody)
  const knob = new Mesh(new CylinderGeometry(0.028, 0.036, 0.05, 12), mats.brass)
  knob.position.y = 0.152
  weight.add(knob)

  const api = {
    group, beamGroup, pointer, rider, weight, pans,
    pivotY: 1.07,
    panTopWorldY: 1.07 + 0.19, // 梁水平时托盘面高度
    setTilt(angle) {
      beamGroup.rotation.z = angle
      pans.left.carrier.rotation.z = -angle
      pans.right.carrier.rotation.z = -angle
    },
    setRider(offset01) {
      rider.position.x = -0.6 + MathUtils.clamp(offset01, 0, 1) * 0.34
    },
  }
  api.setTilt(0)
  return api
}

/* ---------- 铁架台（底座 + 立杆 + 十字夹 + 铁圈） ---------- */

export function buildIronStand(mats, opts) {
  const o = opts || {}
  const ringR = o.ringR === undefined ? 0.36 : o.ringR
  const ringY = o.ringY === undefined ? 1.7 : o.ringY
  const uprightH = o.uprightH === undefined ? 2.6 : o.uprightH
  // 立杆在铁圈中心的 +x / -z 后方，正视时不遮挡器材
  const upright = new Vector3(o.uprightX === undefined ? 0.8 : o.uprightX, 0, o.uprightZ === undefined ? -0.66 : o.uprightZ)

  const group = new Group()
  group.name = o.name || 'iron-stand'

  const base = roundedBox(1.12, 0.16, 0.7, 0.05, mats.darkSteel)
  base.position.set(upright.x - 0.1, 0.08, upright.z + 0.06)
  group.add(base)
  addEdges(base, 0x99a3a0, 0.32, 30)
  const baseInset = roundedBox(0.96, 0.045, 0.55, 0.02, mats.steel)
  baseInset.position.set(upright.x - 0.1, 0.17, upright.z + 0.06)
  group.add(baseInset)

  const rod = new Mesh(new CylinderGeometry(0.045, 0.052, uprightH, 20), mats.steel)
  rod.position.set(upright.x, uprightH / 2 + 0.16, upright.z)
  rod.castShadow = true
  group.add(rod)
  const rodCap = new Mesh(new SphereGeometry(0.05, 14, 10), mats.steel)
  rodCap.position.set(upright.x, uprightH + 0.16, upright.z)
  group.add(rodCap)

  // 十字夹（bosshead）+ 前伸横臂 → 铁圈
  const boss = roundedBox(0.15, 0.2, 0.15, 0.03, mats.brass)
  boss.position.set(upright.x, ringY, upright.z)
  group.add(boss)
  const bossScrew = new Mesh(new CylinderGeometry(0.026, 0.026, 0.12, 10), mats.brass)
  bossScrew.rotation.x = Math.PI / 2
  bossScrew.position.set(upright.x, ringY + 0.02, upright.z - 0.12)
  group.add(bossScrew)

  const ringCenter = new Vector3(0, ringY, 0)
  const toCenter = new Vector3().subVectors(ringCenter, new Vector3(upright.x, ringY, upright.z))
  const armEnd = ringCenter.clone().add(toCenter.clone().normalize().multiplyScalar(-ringR + 0.02))
  const arm = cylinderBetween(new Vector3(upright.x, ringY, upright.z), armEnd, 0.036, mats.steel, 14)
  group.add(arm)

  const ring = ringTorus(ringR, 0.032, mats.steel, 52)
  ring.position.set(0, ringY, 0)
  group.add(ring)

  return { group, ringR, ringY, upright, uprightTopY: uprightH + 0.16 }
}

/* ---------- 酒精灯（母版轮廓 · 缩放至小火稳定形态） ---------- */

export function buildAlcoholLamp(mats) {
  const group = new Group()
  group.name = 'alcohol-lamp'
  const scale = 0.85
  group.scale.setScalar(scale)

  const body = lathe([
    [0.06, 0.0], [0.35, 0.02], [0.48, 0.15], [0.5, 0.37], [0.44, 0.62], [0.28, 0.76], [0.19, 0.8],
  ], 36, mats.glass)
  body.renderOrder = 10
  group.add(body)
  const alcohol = new Mesh(new CylinderGeometry(0.4, 0.43, 0.32, 28), mats.amber)
  alcohol.position.y = 0.24
  alcohol.renderOrder = 12
  group.add(alcohol)
  const bodyEdge = ringTorus(0.35, 0.022, mats.glassEdge, 36)
  bodyEdge.position.y = 0.03
  group.add(bodyEdge)

  const collar = new Mesh(new CylinderGeometry(0.2, 0.22, 0.2, 24), mats.porcelain)
  collar.position.y = 0.85
  collar.castShadow = true
  group.add(collar)
  const collarRing = ringTorus(0.215, 0.022, mats.glassEdge, 30)
  collarRing.position.y = 0.76
  group.add(collarRing)
  const wick = new Mesh(new CylinderGeometry(0.045, 0.055, 0.28, 14), mats.rubber.clone())
  wick.material.color.setHex(0xd8d2c2)
  wick.material.roughness = 1
  wick.position.y = 1.06
  wick.castShadow = true
  group.add(wick)
  const wickTip = new Mesh(new CylinderGeometry(0.04, 0.045, 0.05, 12), mats.rubber.clone())
  wickTip.material.color.setHex(0x4c4438)
  wickTip.position.y = 1.2
  group.add(wickTip)

  // 三层焰（母版轮廓 × 0.72：小而稳定），含灯芯上的自然收腰
  const flame = new Group()
  flame.name = 'flame'
  flame.position.y = 1.5
  flame.scale.setScalar(0.72)
  group.add(flame)
  const outer = lathe([
    [0.018, -0.42], [0.19, -0.34], [0.28, -0.06], [0.24, 0.3], [0.14, 0.64], [0.016, 1.02],
  ], 28, mats.flameOuter)
  outer.castShadow = false
  outer.renderOrder = 24
  flame.add(outer)
  const mid = lathe([
    [0.012, -0.38], [0.13, -0.3], [0.185, -0.06], [0.14, 0.2], [0.07, 0.5], [0.012, 0.76],
  ], 24, mats.flameMid)
  mid.castShadow = false
  mid.renderOrder = 25
  flame.add(mid)
  const inner = lathe([
    [0.008, -0.37], [0.075, -0.3], [0.1, -0.13], [0.064, 0.04], [0.01, 0.28],
  ], 22, mats.flameInner)
  inner.castShadow = false
  inner.renderOrder = 26
  flame.add(inner)
  const light = new PointLight(0xffa042, 0, 3.4, 2)
  light.position.y = 0.4
  flame.add(light)

  const glow = new Mesh(
    new CircleGeometry(0.58, 32),
    new MeshBasicMaterial({ color: 0x30313a, transparent: true, opacity: 0.12, depthWrite: false }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.y = 0.012
  glow.renderOrder = 2
  group.add(glow)

  return {
    group, flame, light, scale,
    wickTopWorldOffset: new Vector3(0, 1.22 * scale, 0),
    flameTipLocalY: 1.02, // flame 组内
  }
}

/* ---------- 灯帽 ---------- */

export function buildLampCap(mats) {
  const cap = new Group()
  cap.name = 'lamp-cap'
  const body = new Mesh(new CylinderGeometry(0.19, 0.225, 0.32, 24), mats.darkSteel)
  body.castShadow = true
  cap.add(body)
  const rim = ringTorus(0.232, 0.024, mats.steel, 28)
  rim.position.y = -0.16
  rim.rotation.x = Math.PI / 2
  cap.add(rim)
  const top = new Mesh(new CylinderGeometry(0.05, 0.07, 0.1, 14), mats.steel)
  top.position.y = 0.21
  cap.add(top)
  return { group: cap }
}

/* ---------- 蒸汽（径向柔边四边形，正对相机由 lesson 控制） ---------- */

const steamMaterial = () => new ShaderMaterial({
  uniforms: { uAlpha: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uAlpha;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv - 0.5;
      float d = length(p * vec2(1.0, 1.35));
      float soft = smoothstep(0.5, 0.06, d);
      gl_FragColor = vec4(vec3(0.97, 0.985, 1.0), soft * uAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
})

export function buildSteamSet(count) {
  const group = new Group()
  group.name = 'steam'
  const puffs = []
  for (let i = 0; i < count; i += 1) {
    const puff = new Mesh(new PlaneGeometry(0.42, 0.5), steamMaterial())
    puff.renderOrder = 30
    puff.castShadow = false
    puff.userData.phase = i / count
    puff.userData.drift = Math.sin(i * 3.7) * 0.1
    group.add(puff)
    puffs.push(puff)
  }
  return { group, puffs }
}

/* ---------- 液流 / 液滴 / 溅落涟漪 ---------- */

export function makeStream(material, radius) {
  const mesh = new Mesh(new CylinderGeometry(1, 1, 1, 12, 1, true), material)
  mesh.castShadow = false
  mesh.renderOrder = 22
  mesh.visible = false
  const up = new Vector3(0, 1, 0)
  const dir = new Vector3()
  return {
    mesh,
    set(a, b, rTop, rBottom) {
      dir.subVectors(b, a)
      const len = dir.length()
      if (len < 0.01) { mesh.visible = false; return }
      mesh.visible = true
      mesh.position.copy(a).add(b).multiplyScalar(0.5)
      mesh.quaternion.setFromUnitVectors(up, dir.normalize())
      const r = rTop === undefined ? radius : rTop
      mesh.scale.set(r, len, rBottom === undefined ? r : (r + rBottom) / 2)
    },
    hide() { mesh.visible = false },
  }
}

export function buildDrops(mats, count) {
  const drops = []
  for (let i = 0; i < count; i += 1) {
    const drop = new Mesh(new SphereGeometry(0.028, 10, 8), mats.glassEdge.clone())
    drop.material.opacity = 0.9
    drop.scale.y = 1.4
    drop.visible = false
    drop.renderOrder = 23
    drops.push(drop)
  }
  return drops
}

export function buildRippleSet(count) {
  const ripples = []
  for (let i = 0; i < count; i += 1) {
    const ripple = new Mesh(
      new CircleGeometry(0.09, 24),
      new MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0, depthWrite: false }),
    )
    ripple.rotation.x = -Math.PI / 2
    ripple.renderOrder = 21
    ripple.userData.phase = i / count
    ripple.visible = false
    ripples.push(ripple)
  }
  return ripples
}
