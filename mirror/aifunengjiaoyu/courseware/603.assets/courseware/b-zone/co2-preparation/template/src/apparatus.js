/**
 * [INPUT]: three、materials.js 的调色板与着色器工厂。
 * [OUTPUT]: 二氧化碳课件全部器材节点（rig），含可动画的液体、气体、火焰与粒子。
 * [POS]: 只负责“建出正确的器材与连接关系”；状态与动画由 lesson.js 从唯一 state 派生。
 *
 * 世界坐标约定：台面顶面 y = BENCH_TOP；所有器材底部落在同一基准面。
 * 正视验收（-z 方向看向 +z）时从左到右依次为：
 *   稀盐酸试剂瓶 → 发生装置（锥形瓶+长颈漏斗）→ 收集位（一号瓶）→ 备用二号瓶
 *   → 石灰水试剂瓶 → 性质实验位 → 阶梯蜡烛烧杯。玻璃片与木条平放在台面前沿。
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import {
  createGasVolumeMaterial,
  createGlassFresnelMaterial,
  createLabelMaterial,
  createLiquidSurfaceMaterial,
  createLiquidVolumeMaterial,
} from './materials.js'

/* ---------- 布局常量：正视验收的水平基准 ---------- */
export const LAYOUT = Object.freeze({
  BENCH_TOP: 0.062,
  ACID_BOTTLE_X: -4.42,
  FLASK_X: -3.05,
  FUNNEL_DX: -0.18,       // 长颈漏斗穿过双孔塞的孔位
  DELIVERY_DX: 0.18,      // 导气管穿过双孔塞的孔位
  PIPE_Y: 2.62,           // 外部水平导气管高度（绝对）
  RUBBER_START_X: -1.72,  // 黑色橡胶连接段
  RUBBER_END_X: -1.18,
  SWING_PIVOT_X: -1.22,   // 导管摆出/放回的枢轴（橡胶段末端）
  COLLECT_X: -0.7,        // 收集位（导管下探到瓶底附近）
  COLLECT_TIP_Y: 0.3,     // 收集导管管口的绝对高度（接近瓶底）
  STAGE_X: 0.95,          // 二号瓶初始备用位
  LIME_BOTTLE_X: 1.85,
  TEST_X: 2.65,           // 性质实验位
  BEAKER_X: 4.1,
  REAGENT_MOUTH_Y: 0.9,   // 细口试剂瓶瓶口相对台面的高度
  REAGENT_SCALE: 1.25,    // 放大试剂瓶与瓶塞，保证全景镜头下标签和密闭结构可辨
  ACID_LEVEL_MAX: 0.66,   // 反应液面（锥形瓶局部高度）
  FUNNEL_TIP_LOCAL: 0.26, // 漏斗下端（锥形瓶局部高度）——必须低于液面形成液封
  FUNNEL_MOUTH_LOCAL: 3.155, // 漏斗口中心（锥形瓶局部高度），供倾倒位姿精确对齐
  INNER_TUBE_BOTTOM: 1.7, // 瓶内短导气管下端（锥形瓶局部高度）——必须高于液面
  JAR_HEIGHT: 1.36,
  JAR_INNER_R: 0.44,
})

const UP = new Vector3(0, 1, 0)

function lathe(points, material, segments = 40) {
  const geometry = new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), segments)
  geometry.computeVertexNormals()
  const mesh = new Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function cylinderBetween(a, b, radius, material, segments = 14) {
  const dir = new Vector3().subVectors(b, a)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, dir.length(), segments), material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, dir.clone().normalize())
  return mesh
}

/** 单位流束（顶端为原点，向 -y 延伸 1），运行时用 poseStream 摆到两点之间。 */
function makeStream(radius, material) {
  const geometry = new CylinderGeometry(radius, radius * 0.72, 1, 10, 1, true)
  geometry.translate(0, -0.5, 0)
  const mesh = new Mesh(geometry, material)
  mesh.visible = false
  mesh.renderOrder = 9
  return mesh
}

export function poseStream(mesh, from, to, on) {
  mesh.visible = Boolean(on)
  if (!on) return
  const dir = new Vector3().subVectors(to, from)
  mesh.position.copy(from)
  mesh.scale.set(1, dir.length(), 1)
  mesh.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), dir.clone().normalize())
}

/** 三层火焰：外橙 / 中黄 / 内焰蓝，带一盏微弱点光。 */
function makeFlame(materials, scale = 1) {
  const flame = new Group()
  const outer = new Mesh(new SphereGeometry(0.085, 18, 18), materials.flameOuter)
  outer.scale.set(0.72, 1.9, 0.72)
  outer.position.y = 0.13
  const mid = new Mesh(new SphereGeometry(0.06, 16, 16), materials.flameMid)
  mid.scale.set(0.68, 1.7, 0.68)
  mid.position.y = 0.1
  const inner = new Mesh(new SphereGeometry(0.032, 12, 12), materials.flameInner)
  inner.scale.set(0.8, 1.35, 0.8)
  inner.position.y = 0.035
  const light = new PointLight(0xffb04d, 0, 2.4, 2)
  light.position.y = 0.14
  ;[outer, mid, inner].forEach((layer, index) => { layer.renderOrder = 30 + index })
  flame.add(outer, mid, inner, light)
  flame.userData = { outer, mid, inner, light, baseScale: scale, level: 0 }
  flame.scale.setScalar(0.001)
  flame.visible = false
  return flame
}

export function setFlame(flame, level, time) {
  const data = flame.userData
  data.level = level
  if (level <= 0.002) {
    flame.visible = false
    data.light.intensity = 0
    return
  }
  flame.visible = true
  const flicker = 1 + Math.sin(time * 17.3 + flame.position.x * 5) * 0.06 + Math.sin(time * 29.7) * 0.04
  flame.scale.set(data.baseScale * level, data.baseScale * level * flicker, data.baseScale * level)
  data.light.intensity = 1.5 * level
}

/** 一次性烟缕：熄灭瞬间的小灰团，progress 0..1。 */
function makeSmoke(materials, count = 3) {
  const smoke = new Group()
  for (let i = 0; i < count; i += 1) {
    const puff = new Mesh(new IcosahedronGeometry(0.045 + i * 0.012, 1), materials.smoke.clone())
    puff.renderOrder = 34
    smoke.add(puff)
  }
  smoke.visible = false
  return smoke
}

export function setSmoke(smoke, progress) {
  if (progress <= 0 || progress >= 1) {
    smoke.visible = false
    return
  }
  smoke.visible = true
  smoke.children.forEach((puff, index) => {
    const local = Math.min(1, Math.max(0, progress * 1.25 - index * 0.12))
    puff.position.set(Math.sin(index * 2.4 + progress * 5) * 0.05, local * 0.5 + index * 0.05, 0)
    puff.scale.setScalar(0.4 + local * 1.5)
    puff.material.opacity = 0.3 * (1 - local)
  })
}

/* ---------- 密闭细口试剂瓶（标签、无色液体与独立瓶塞） ---------- */
function makeReagentBottle(materials, { name, label, formula, storage }) {
  const bottle = new Group()
  bottle.name = name
  const profile = [
    [0.04, 0.005], [0.19, 0.01], [0.245, 0.06], [0.25, 0.18], [0.25, 0.52],
    [0.205, 0.62], [0.11, 0.7], [0.082, 0.75], [0.082, 0.85], [0.112, 0.88], [0.118, 0.9],
  ]
  const body = lathe(profile, materials.glass, 36)
  body.renderOrder = 10
  const fresnel = lathe(profile, createGlassFresnelMaterial(0.32), 36)
  fresnel.renderOrder = 12
  const lip = new Mesh(new TorusGeometry(0.112, 0.014, 10, 26), materials.glassEdge)
  lip.rotation.x = Math.PI / 2
  lip.position.y = LAYOUT.REAGENT_MOUTH_Y
  lip.renderOrder = 14
  const liquid = new Mesh(
    new CylinderGeometry(0.215, 0.18, 0.38, 28),
    createLiquidVolumeMaterial({ minY: -0.19, maxY: 0.19, bottomAlpha: 0.3, topAlpha: 0.18 }),
  )
  liquid.position.y = 0.23
  liquid.renderOrder = 5
  const paperLabel = new Mesh(new PlaneGeometry(0.38, 0.25), createLabelMaterial(label, formula, storage))
  paperLabel.position.set(0, 0.34, 0.252)
  paperLabel.renderOrder = 16
  bottle.add(body, fresnel, lip, liquid, paperLabel)
  bottle.scale.setScalar(LAYOUT.REAGENT_SCALE)
  bottle.userData = { mouthLocal: new Vector3(0, LAYOUT.REAGENT_MOUTH_Y, 0) }
  return bottle
}

function makeReagentClosure(materials, type, name) {
  const closure = new Group()
  closure.name = name
  if (type === 'glass') {
    const plug = new Mesh(new CylinderGeometry(0.067, 0.057, 0.14, 24), materials.glass)
    plug.position.y = -0.035
    plug.renderOrder = 12
    const collar = new Mesh(new CylinderGeometry(0.115, 0.084, 0.08, 28), materials.glassEdge)
    collar.position.y = 0.075
    collar.renderOrder = 14
    const knob = new Mesh(new SphereGeometry(0.086, 22, 16), materials.glassEdge)
    knob.scale.y = 0.72
    knob.position.y = 0.16
    knob.renderOrder = 14
    closure.add(plug, collar, knob)
  } else {
    const cap = new Mesh(new CylinderGeometry(0.126, 0.116, 0.16, 28), materials.plasticCap)
    cap.position.y = -0.005
    cap.castShadow = true
    closure.add(cap)
    ;[-0.05, 0, 0.05].forEach((y) => {
      const ridge = new Mesh(new TorusGeometry(0.126, 0.008, 8, 28), materials.rubber)
      ridge.rotation.x = Math.PI / 2
      ridge.position.y = y
      closure.add(ridge)
    })
  }
  closure.scale.setScalar(LAYOUT.REAGENT_SCALE)
  closure.userData.closedY = LAYOUT.BENCH_TOP + LAYOUT.REAGENT_MOUTH_Y * LAYOUT.REAGENT_SCALE + 0.015
  return closure
}

/** 试剂瓶口的世界坐标（随倾倒姿态更新）。 */
export function bottleMouthWorld(bottle, target = new Vector3()) {
  return bottle.localToWorld(target.copy(bottle.userData.mouthLocal))
}

/* ---------- 集气瓶（圆柱厚壁 + 磨口厚沿） ---------- */
function makeGasJar(materials, name) {
  const jar = new Group()
  jar.name = name
  const H = LAYOUT.JAR_HEIGHT
  const folded = [
    [0.04, 0.032], [0.4, 0.032], [0.455, 0.058], [0.48, 0.1],
    [0.48, H - 0.12], [0.545, H - 0.06], [0.545, H],
    [0.5, H], [0.455, H - 0.06], [0.44, H - 0.14],
    [0.44, 0.115], [0.41, 0.09], [0.05, 0.09],
  ]
  const glassBody = lathe(folded, materials.glass, 44)
  glassBody.renderOrder = 10
  const outerOnly = [
    [0.04, 0.03], [0.44, 0.036], [0.48, 0.1], [0.48, H - 0.12], [0.545, H - 0.06], [0.545, H],
  ]
  const fresnel = lathe(outerOnly, createGlassFresnelMaterial(0.32), 44)
  fresnel.renderOrder = 12
  const rim = new Mesh(new TorusGeometry(0.52, 0.022, 10, 40), materials.glassEdge)
  rim.rotation.x = Math.PI / 2
  rim.position.y = H
  rim.renderOrder = 14
  const baseRing = new Mesh(new TorusGeometry(0.46, 0.014, 8, 40), materials.glassEdge)
  baseRing.rotation.x = Math.PI / 2
  baseRing.position.y = 0.05
  baseRing.renderOrder = 14

  // 无色 CO₂ 占据范围：极弱透明体积（单位圆柱，底部为原点，scale.y 表示占据高度）
  const gasGeometry = new CylinderGeometry(0.41, 0.41, 1, 30, 1, false)
  gasGeometry.translate(0, 0.5, 0)
  const gas = new Mesh(gasGeometry, createGasVolumeMaterial())
  gas.position.y = 0.1
  gas.scale.set(1, 0.001, 1)
  gas.visible = false
  gas.renderOrder = 6

  // 细小气体微粒：进一步提示无色气体的存在
  const motes = new Group()
  for (let i = 0; i < 12; i += 1) {
    const mote = new Mesh(new IcosahedronGeometry(0.014 + Math.random() * 0.012, 0), materials.gasMote)
    mote.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: 0.08 + Math.random() * 0.3,
      speed: 0.24 + Math.random() * 0.3,
      phase: Math.random() * 10,
    }
    mote.renderOrder = 7
    motes.add(mote)
  }
  motes.visible = false

  jar.add(glassBody, fresnel, rim, baseRing, gas, motes)
  jar.userData = { gas, motes, fill: 0 }
  return jar
}

export function setJarGas(jar, fill, time) {
  const { gas, motes } = jar.userData
  jar.userData.fill = fill
  const H = LAYOUT.JAR_HEIGHT
  if (fill <= 0.005) {
    gas.visible = false
    motes.visible = false
    return
  }
  gas.visible = true
  gas.scale.set(1, Math.max(0.02, fill * (H - 0.24)), 1)
  motes.visible = true
  const top = 0.12 + fill * (H - 0.26)
  motes.children.forEach((mote) => {
    const d = mote.userData
    const y = 0.14 + ((time * d.speed * 0.18 + d.phase) % 1) * Math.max(0.05, top - 0.16)
    mote.position.set(
      Math.cos(d.angle + time * 0.2) * d.radius,
      y,
      Math.sin(d.angle + time * 0.2) * d.radius,
    )
  })
}

/* ---------- 发生装置：锥形瓶 + 石灰石 + 双孔塞 + 长颈漏斗 + 瓶内短管 ---------- */
function buildGenerator(root, materials, rig) {
  const flask = new Group()
  flask.name = 'conical-flask'
  flask.position.set(LAYOUT.FLASK_X, LAYOUT.BENCH_TOP, 0)
  root.add(flask)

  const outerProfile = [
    [0.03, 0.001], [0.5, 0.008], [0.74, 0.04], [0.8, 0.12], [0.78, 0.3],
    [0.62, 0.72], [0.44, 1.1], [0.33, 1.35], [0.31, 1.5],
    [0.31, 1.92], [0.345, 1.98], [0.35, 2.02],
  ]
  const flaskOuter = lathe(outerProfile, materials.glass, 48)
  flaskOuter.renderOrder = 10
  const innerProfile = outerProfile.slice(0, 10).map(([r, y]) => [Math.max(0.02, r - 0.045), y + 0.02])
  const flaskInner = lathe(innerProfile, materials.glassInner, 48)
  flaskInner.renderOrder = 8
  const flaskFresnel = lathe(outerProfile, createGlassFresnelMaterial(0.3), 48)
  flaskFresnel.renderOrder = 12
  const flaskLip = new Mesh(new TorusGeometry(0.34, 0.016, 10, 30), materials.glassEdge)
  flaskLip.rotation.x = Math.PI / 2
  flaskLip.position.y = 2.01
  flaskLip.renderOrder = 14
  flask.add(flaskOuter, flaskInner, flaskFresnel, flaskLip)

  // 块状石灰石：不规则灰白色块，避开长颈漏斗下端的位置
  const marbleSpots = [
    [0.3, 0.14, 0.1, 0.2], [0.5, 0.17, -0.22, 0.17], [-0.45, 0.15, 0.24, 0.19],
    [0.05, 0.14, 0.34, 0.16], [-0.18, 0.15, -0.32, 0.18], [0.24, 0.32, -0.06, 0.15],
    [-0.44, 0.14, -0.1, 0.16], [0.02, 0.3, -0.28, 0.13], [-0.15, 0.33, 0.1, 0.14],
  ]
  const marbles = new Group()
  marbleSpots.forEach(([x, y, z, r], index) => {
    const chunk = new Mesh(
      new DodecahedronGeometry(r, 0),
      index % 3 === 0 ? materials.limestoneDark : materials.limestone,
    )
    chunk.position.set(x, y, z)
    chunk.rotation.set(index * 1.3, index * 2.1, index * 0.7)
    chunk.scale.set(1, 0.72 + (index % 3) * 0.14, 0.88)
    chunk.castShadow = true
    marbles.add(chunk)
  })
  flask.add(marbles)

  // 反应液（稀盐酸）：随加酸动态重建的锥台体积 + 液面
  const acidVolume = new Mesh(
    new CylinderGeometry(0.7, 0.7, 0.1, 40),
    createLiquidVolumeMaterial({ minY: -0.3, maxY: 0.3, bottomAlpha: 0.42, topAlpha: 0.24 }),
  )
  acidVolume.visible = false
  acidVolume.renderOrder = 4
  const acidSurface = new Mesh(new CircleGeometry(1, 40), createLiquidSurfaceMaterial(0.006))
  acidSurface.rotation.x = -Math.PI / 2
  acidSurface.visible = false
  acidSurface.renderOrder = 5
  flask.add(acidVolume, acidSurface)

  // 双孔橡皮塞：两条气路清楚可见（左孔=长颈漏斗，右孔=导气管）
  const stopper = new Mesh(new CylinderGeometry(0.35, 0.25, 0.3, 30), materials.rubber)
  stopper.position.y = 1.98
  stopper.castShadow = true
  const holeL = new Mesh(new TorusGeometry(0.062, 0.012, 8, 18), materials.rubberTube)
  holeL.rotation.x = Math.PI / 2
  holeL.position.set(LAYOUT.FUNNEL_DX, 2.135, 0)
  const holeR = holeL.clone()
  holeR.position.x = LAYOUT.DELIVERY_DX
  flask.add(stopper, holeL, holeR)

  // 长颈漏斗：加液口→梨形储液球→细长直管，一体连续 lathe
  const funnelProfile = [
    [0.03, 0], [0.055, 0.02], [0.055, 2.02],
    [0.1, 2.1], [0.185, 2.2], [0.26, 2.33], [0.27, 2.42],
    [0.235, 2.55], [0.16, 2.64], [0.085, 2.72],
    [0.068, 2.78], [0.068, 2.84], [0.1, 2.87], [0.125, 2.9],
  ]
  const funnel = new Group()
  funnel.name = 'thistle-funnel'
  funnel.position.set(LAYOUT.FUNNEL_DX, LAYOUT.FUNNEL_TIP_LOCAL, 0)
  const funnelOuter = lathe(funnelProfile, materials.glass, 40)
  funnelOuter.renderOrder = 11
  const funnelInner = lathe(funnelProfile.map(([r, y]) => [Math.max(0.02, r * 0.84), y]), materials.glassInner, 40)
  funnelInner.renderOrder = 9
  const funnelFresnel = lathe(funnelProfile, createGlassFresnelMaterial(0.32), 40)
  funnelFresnel.renderOrder = 13
  const funnelMouth = new Mesh(new TorusGeometry(0.12, 0.012, 8, 24), materials.glassEdge)
  funnelMouth.rotation.x = Math.PI / 2
  funnelMouth.position.y = LAYOUT.FUNNEL_MOUTH_LOCAL - LAYOUT.FUNNEL_TIP_LOCAL
  funnelMouth.renderOrder = 14
  const funnelTip = new Mesh(new TorusGeometry(0.05, 0.009, 8, 18), materials.glassEdge)
  funnelTip.rotation.x = Math.PI / 2
  funnelTip.position.y = 0.012
  funnelTip.renderOrder = 14
  funnel.add(funnelOuter, funnelInner, funnelFresnel, funnelMouth, funnelTip)
  flask.add(funnel)

  // 漏斗内的加酸流束（加酸阶段沿长颈下行的提示）
  const funnelStream = makeStream(0.032, materials.pourStream)
  flask.add(funnelStream)

  // 石灰石表面的无色小气泡
  const bubbles = new Group()
  for (let i = 0; i < 26; i += 1) {
    const bubble = new Mesh(new SphereGeometry(0.022 + Math.random() * 0.02, 8, 8), materials.bubble)
    bubble.userData = {
      x: (Math.random() - 0.5) * 0.9,
      z: (Math.random() - 0.5) * 0.8,
      start: 0.16 + Math.random() * 0.26,
      speed: 0.4 + Math.random() * 0.4,
      phase: Math.random() * 8,
      wobble: Math.random() * Math.PI * 2,
    }
    bubble.renderOrder = 6
    bubbles.add(bubble)
  }
  bubbles.visible = false
  flask.add(bubbles)

  Object.assign(rig, {
    flask, funnel, funnelStream, bubbles, acidVolume, acidSurface, marbles,
    acid: { level: 0, meshLevel: -1 },
  })
}

/** 锥形瓶内壁在局部高度 y 处的半径（用于液体锥台）。 */
function flaskInnerRadius(y) {
  if (y <= 0.12) return 0.73
  return 0.73 + ((0.285 - 0.73) * (y - 0.12)) / (1.35 - 0.12)
}

export function setAcidLevel(rig, level) {
  rig.acid.level = level
  const { acidVolume, acidSurface } = rig
  if (level <= 0.02) {
    acidVolume.visible = false
    acidSurface.visible = false
    return
  }
  const h = level * LAYOUT.ACID_LEVEL_MAX
  if (Math.abs(h - rig.acid.meshLevel) > 0.008) {
    rig.acid.meshLevel = h
    const rTop = flaskInnerRadius(h)
    acidVolume.geometry.dispose()
    acidVolume.geometry = new CylinderGeometry(rTop, 0.71, Math.max(0.04, h - 0.02), 40)
    acidVolume.position.y = 0.02 + Math.max(0.04, h - 0.02) / 2
    acidSurface.scale.set(rTop, rTop, 1)
    acidSurface.position.y = h
  }
  acidVolume.visible = true
  acidSurface.visible = true
}

export function setBubbles(rig, intensity, time) {
  const { bubbles } = rig
  const top = Math.max(0.2, rig.acid.level * LAYOUT.ACID_LEVEL_MAX - 0.02)
  bubbles.visible = intensity > 0.01
  if (!bubbles.visible) return
  const shown = Math.floor(bubbles.children.length * Math.min(1, intensity))
  bubbles.children.forEach((bubble, index) => {
    if (index >= shown) { bubble.visible = false; return }
    const d = bubble.userData
    if (d.start >= top) { bubble.visible = false; return }
    const span = top - d.start
    const cycle = ((time * d.speed + d.phase) % 1)
    bubble.visible = true
    bubble.position.set(
      d.x + Math.sin(time * 2 + d.wobble) * 0.03,
      d.start + cycle * span,
      d.z,
    )
    const grow = 0.7 + cycle * 0.5
    bubble.scale.setScalar(grow)
  })
}

/* ---------- 导气管：固定段 + 橡胶段 + 可摆出的收集段 ---------- */
function buildDelivery(root, materials, rig) {
  const pipes = new Group()
  pipes.name = 'delivery-fixed'
  root.add(pipes)

  const riserX = LAYOUT.FLASK_X + LAYOUT.DELIVERY_DX
  const glassR = 0.05
  // 瓶内短导气管：只稍微露出橡皮塞，绝不伸入反应液
  const riser = cylinderBetween(
    new Vector3(riserX, LAYOUT.BENCH_TOP + LAYOUT.INNER_TUBE_BOTTOM, 0),
    new Vector3(riserX, LAYOUT.PIPE_Y, 0),
    glassR, materials.glass, 14,
  )
  riser.renderOrder = 11
  const riserCore = cylinderBetween(
    new Vector3(riserX, LAYOUT.BENCH_TOP + LAYOUT.INNER_TUBE_BOTTOM + 0.01, 0),
    new Vector3(riserX, LAYOUT.PIPE_Y - 0.01, 0),
    glassR * 0.55, materials.glassInner, 10,
  )
  riserCore.renderOrder = 9
  const riserTip = new Mesh(new TorusGeometry(glassR, 0.009, 8, 16), materials.glassEdge)
  riserTip.rotation.x = Math.PI / 2
  riserTip.position.set(riserX, LAYOUT.BENCH_TOP + LAYOUT.INNER_TUBE_BOTTOM, 0)
  riserTip.renderOrder = 14
  const elbowA = new Mesh(new SphereGeometry(glassR * 1.15, 14, 14), materials.glassEdge)
  elbowA.position.set(riserX, LAYOUT.PIPE_Y, 0)
  elbowA.renderOrder = 14
  const level = cylinderBetween(
    new Vector3(riserX, LAYOUT.PIPE_Y, 0),
    new Vector3(LAYOUT.RUBBER_START_X + 0.04, LAYOUT.PIPE_Y, 0),
    glassR, materials.glass, 14,
  )
  level.renderOrder = 11
  // 黑色橡胶连接管：明显比玻璃粗、哑光
  const rubber = cylinderBetween(
    new Vector3(LAYOUT.RUBBER_START_X, LAYOUT.PIPE_Y, 0),
    new Vector3(LAYOUT.RUBBER_END_X, LAYOUT.PIPE_Y, 0),
    0.078, materials.rubberTube, 16,
  )
  rubber.castShadow = true
  pipes.add(riser, riserCore, riserTip, elbowA, level, rubber)

  // 可摆出的收集段：绕橡胶末端小幅上摆（模拟移开导管），放回时复位
  const swing = new Group()
  swing.name = 'delivery-swing'
  swing.position.set(LAYOUT.SWING_PIVOT_X, LAYOUT.PIPE_Y, 0)
  const armLen = LAYOUT.COLLECT_X - LAYOUT.SWING_PIVOT_X
  const arm = cylinderBetween(new Vector3(-0.05, 0, 0), new Vector3(armLen, 0, 0), glassR, materials.glass, 14)
  arm.renderOrder = 11
  const elbowB = new Mesh(new SphereGeometry(glassR * 1.15, 14, 14), materials.glassEdge)
  elbowB.position.set(armLen, 0, 0)
  elbowB.renderOrder = 14
  const dropLen = LAYOUT.PIPE_Y - LAYOUT.COLLECT_TIP_Y
  const drop = cylinderBetween(new Vector3(armLen, 0, 0), new Vector3(armLen, -dropLen, 0), glassR, materials.glass, 14)
  drop.renderOrder = 11
  const dropCore = cylinderBetween(
    new Vector3(armLen, -0.02, 0), new Vector3(armLen, -dropLen + 0.01, 0),
    glassR * 0.55, materials.glassInner, 10,
  )
  dropCore.renderOrder = 9
  const dropTip = new Mesh(new TorusGeometry(glassR, 0.009, 8, 16), materials.glassEdge)
  dropTip.rotation.x = Math.PI / 2
  dropTip.position.set(armLen, -dropLen, 0)
  dropTip.renderOrder = 14
  swing.add(arm, elbowB, drop, dropCore, dropTip)
  root.add(swing)

  Object.assign(rig, { pipes, swing })
}

/* ---------- 阶梯蜡烛烧杯 ---------- */
function buildCandleBeaker(root, materials, rig) {
  const beaker = new Group()
  beaker.name = 'candle-beaker'
  beaker.position.set(LAYOUT.BEAKER_X, LAYOUT.BENCH_TOP, 0)
  root.add(beaker)

  const H = 1.2
  const folded = [
    [0.04, 0.03], [0.64, 0.03], [0.695, 0.055], [0.72, 0.11],
    [0.72, H - 0.07], [0.752, H - 0.03], [0.752, H],
    [0.706, H], [0.672, H - 0.06], [0.67, 0.115], [0.64, 0.085], [0.05, 0.085],
  ]
  const glassBody = lathe(folded, materials.glass, 44)
  glassBody.renderOrder = 10
  const fresnel = lathe(
    [[0.04, 0.028], [0.66, 0.034], [0.72, 0.11], [0.72, H - 0.07], [0.752, H - 0.03], [0.752, H]],
    createGlassFresnelMaterial(0.3), 44,
  )
  fresnel.renderOrder = 12
  const rim = new Mesh(new TorusGeometry(0.732, 0.016, 8, 44), materials.glassEdge)
  rim.rotation.x = Math.PI / 2
  rim.position.y = H
  rim.renderOrder = 14
  beaker.add(glassBody, fresnel, rim)

  // 阶梯：两级陶瓷阶座
  const stepLow = new Mesh(new RoundedBoxGeometry(0.36, 0.16, 0.32, 3, 0.02), materials.ceramicStep)
  stepLow.position.set(-0.17, 0.165, 0)
  stepLow.castShadow = true
  const stepHigh = new Mesh(new RoundedBoxGeometry(0.36, 0.46, 0.32, 3, 0.02), materials.ceramicStep)
  stepHigh.position.set(0.19, 0.315, 0)
  stepHigh.castShadow = true
  beaker.add(stepLow, stepHigh)

  // 蜡烛：圆柱蜡体 + 灯芯 + 自然火焰
  function makeCandle(x, baseY) {
    const candle = new Group()
    candle.position.set(x, baseY, 0)
    const wax = new Mesh(new CylinderGeometry(0.075, 0.082, 0.3, 20), materials.wax)
    wax.position.y = 0.15
    wax.castShadow = true
    const pool = new Mesh(new CylinderGeometry(0.062, 0.062, 0.012, 16), materials.wax)
    pool.position.y = 0.302
    const wick = new Mesh(new CylinderGeometry(0.011, 0.013, 0.075, 8), materials.wick)
    wick.position.y = 0.335
    wick.rotation.z = 0.08
    const flame = makeFlame(materials, 0.85)
    flame.position.y = 0.375
    const smoke = makeSmoke(materials)
    smoke.position.y = 0.4
    candle.add(wax, pool, wick, flame, smoke)
    candle.userData = { flame, smoke }
    return candle
  }
  const candleLow = makeCandle(-0.17, 0.245)
  const candleHigh = makeCandle(0.19, 0.545)
  beaker.add(candleLow, candleHigh)

  // 烧杯内逐渐升高的无色 CO₂ 层
  const co2Geometry = new CylinderGeometry(0.6, 0.6, 1, 30, 1, false)
  co2Geometry.translate(0, 0.5, 0)
  const co2Layer = new Mesh(co2Geometry, createGasVolumeMaterial())
  co2Layer.material.uniforms.uAlpha.value = 0.12
  co2Layer.position.y = 0.1
  co2Layer.scale.set(1, 0.001, 1)
  co2Layer.visible = false
  co2Layer.renderOrder = 6
  beaker.add(co2Layer)

  // CO₂ 无色：倾倒时只用极淡的下沉微粒提示路径，不画实体管状气流。
  const pourCurve = new CatmullRomCurve3([
    new Vector3(3.76, 1.9, 0),
    new Vector3(3.56, 1.45, 0),
    new Vector3(3.5, 1.05, 0),
    new Vector3(3.56, 0.6, 0),
    new Vector3(3.8, 0.3, 0),
  ])
  const pourMotes = new Group()
  for (let i = 0; i < 12; i += 1) {
    const mote = new Mesh(new IcosahedronGeometry(0.012 + (i % 3) * 0.003, 0), materials.gasMote.clone())
    mote.userData = { offset: i / 12, jitter: 0.008 + (i % 4) * 0.005 }
    mote.renderOrder = 9
    pourMotes.add(mote)
  }
  pourMotes.visible = false
  root.add(pourMotes)

  Object.assign(rig, { beaker, candleLow, candleHigh, co2Layer, pourCurve, pourMotes })
}

/* ---------- 火柴盒与火柴：验满、阶梯蜡烛共用 ---------- */
function buildMatchKit(root, materials, rig) {
  const matchbox = new Group()
  matchbox.name = 'matchbox'
  const sleeve = new Mesh(new RoundedBoxGeometry(0.72, 0.16, 0.44, 4, 0.035), materials.matchboxPaper)
  sleeve.position.y = 0.08
  sleeve.castShadow = true
  const tray = new Mesh(new RoundedBoxGeometry(0.62, 0.11, 0.36, 3, 0.025), materials.wax)
  tray.position.set(0.04, 0.075, 0)
  const topMark = new Mesh(new RoundedBoxGeometry(0.48, 0.018, 0.27, 3, 0.025), materials.matchboxRed)
  topMark.position.set(-0.02, 0.169, 0)
  const striker = new Mesh(new RoundedBoxGeometry(0.54, 0.065, 0.018, 2, 0.006), materials.matchboxStriker)
  striker.position.set(0, 0.08, 0.225)
  matchbox.add(sleeve, tray, topMark, striker)
  matchbox.visible = false
  root.add(matchbox)

  const matchStick = new Group()
  matchStick.name = 'match-stick'
  const stick = new Mesh(new BoxGeometry(0.66, 0.025, 0.025), materials.wood)
  stick.position.x = -0.34
  stick.castShadow = true
  const head = new Mesh(new SphereGeometry(0.047, 16, 12), materials.matchHead)
  head.scale.set(1.15, 0.92, 0.92)
  const flame = makeFlame(materials, 0.34)
  flame.position.set(0.008, 0.045, 0)
  const smoke = makeSmoke(materials, 2)
  smoke.position.set(0.008, 0.055, 0)
  const sparks = new Group()
  for (let i = 0; i < 7; i += 1) {
    const spark = new Mesh(new IcosahedronGeometry(0.012 + (i % 3) * 0.004, 0), materials.flameMid.clone())
    spark.userData = { angle: -0.9 + i * 0.3, reach: 0.05 + (i % 4) * 0.025 }
    spark.renderOrder = 36
    sparks.add(spark)
  }
  sparks.visible = false
  matchStick.add(stick, head, flame, smoke, sparks)
  matchStick.visible = false
  root.add(matchStick)

  rig.matchKit = { matchbox, matchStick, flame, smoke, sparks }
}

export function setBeakerCO2(rig, level) {
  const { co2Layer } = rig
  if (level <= 0.005) {
    co2Layer.visible = false
    return
  }
  co2Layer.visible = true
  co2Layer.scale.set(1, Math.max(0.02, level * 1.0), 1)
}

export function setPourFlow(rig, strength, time) {
  const { pourMotes, pourCurve } = rig
  pourMotes.visible = strength > 0.02
  if (!pourMotes.visible) return
  pourMotes.children.forEach((mote) => {
    const d = mote.userData
    const s = (time * 0.32 + d.offset) % 1
    pourCurve.getPoint(s, mote.position)
    mote.position.x += Math.sin(time * 3 + d.offset * 20) * d.jitter
    mote.material.opacity = 0.14 * strength * (1 - s * 0.65)
  })
}

/* ---------- 石灰水层与白色沉淀（一号集气瓶内） ---------- */
function buildLimewaterKit(materials, jarA) {
  const limeVolume = new Mesh(
    new CylinderGeometry(0.42, 0.42, 1, 30),
    createLiquidVolumeMaterial({ minY: -0.5, maxY: 0.5, bottomAlpha: 0.44, topAlpha: 0.24 }),
  )
  limeVolume.visible = false
  limeVolume.renderOrder = 5
  const limeSurface = new Mesh(new CircleGeometry(0.42, 30), createLiquidSurfaceMaterial(0.004))
  limeSurface.rotation.x = -Math.PI / 2
  limeSurface.visible = false
  limeSurface.renderOrder = 6
  jarA.add(limeVolume, limeSurface)

  const precipitate = new Group()
  for (let i = 0; i < 44; i += 1) {
    const grain = new Mesh(new IcosahedronGeometry(0.011 + Math.random() * 0.011, 0), materials.precipitate)
    grain.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 0.36,
      height: Math.random(),
      spin: 0.4 + Math.random() * 0.8,
    }
    grain.renderOrder = 7
    precipitate.add(grain)
  }
  precipitate.visible = false
  jarA.add(precipitate)
  jarA.userData.lime = { limeVolume, limeSurface, precipitate, level: 0, turbidity: 0 }
}

export function setLimewater(jarA, level, turbidity, time) {
  const kit = jarA.userData.lime
  kit.level = level
  kit.turbidity = turbidity
  const { limeVolume, limeSurface, precipitate } = kit
  if (level <= 0.01) {
    limeVolume.visible = false
    limeSurface.visible = false
    precipitate.visible = false
    return
  }
  const h = 0.06 + level * 0.2
  limeVolume.visible = true
  limeVolume.scale.set(1, h, 1)
  limeVolume.position.y = 0.06 + h / 2
  limeVolume.material.uniforms.uTurbidity.value = turbidity
  limeSurface.visible = true
  limeSurface.position.y = 0.06 + h
  limeSurface.material.uniforms.uTurbidity.value = turbidity
  precipitate.visible = turbidity > 0.08
  if (precipitate.visible) {
    const settle = Math.min(1, Math.max(0, (turbidity - 0.35) / 0.65))
    precipitate.children.forEach((grain, index) => {
      const d = grain.userData
      if (index / precipitate.children.length > turbidity * 1.1) { grain.visible = false; return }
      grain.visible = true
      const swirl = (1 - settle) * 0.5
      const y = 0.075 + d.height * (h - 0.045) * (1 - settle * 0.75)
      grain.position.set(
        Math.cos(d.angle + time * d.spin * swirl) * d.radius,
        y,
        Math.sin(d.angle + time * d.spin * swirl) * d.radius,
      )
      grain.material.opacity = 0.5 + turbidity * 0.42
    })
  }
}

/* ---------- 木条（验满用） ---------- */
function buildSplint(root, materials, rig) {
  const splint = new Group()
  splint.name = 'wood-splint'
  const stick = new Mesh(new BoxGeometry(0.86, 0.034, 0.034), materials.wood)
  stick.position.x = 0.6
  stick.castShadow = true
  const tip = new Mesh(new BoxGeometry(0.22, 0.037, 0.037), materials.charredWood)
  tip.position.x = 0.11
  const flame = makeFlame(materials, 0.62)
  flame.position.set(0.06, 0.02, 0)
  const smoke = makeSmoke(materials)
  smoke.position.set(0.06, 0.05, 0)
  splint.add(stick, tip, flame, smoke)
  splint.userData = { flame, smoke }
  root.add(splint)
  rig.splint = splint
}

/* ---------- 玻璃片 ---------- */
function buildGlassPlate(root, materials, rig) {
  const plate = new Group()
  plate.name = 'glass-plate'
  const slab = new Mesh(new RoundedBoxGeometry(1.16, 0.045, 1.16, 3, 0.018), materials.glass)
  slab.renderOrder = 16
  const fresnel = new Mesh(new RoundedBoxGeometry(1.16, 0.045, 1.16, 3, 0.018), createGlassFresnelMaterial(0.35))
  fresnel.renderOrder = 17
  plate.add(slab, fresnel)
  root.add(plate)
  rig.plate = plate
}

/* ---------- 总装 ---------- */
export function buildApparatus(root, materials) {
  const rig = { root, materials }

  buildGenerator(root, materials, rig)
  buildDelivery(root, materials, rig)

  rig.jarA = makeGasJar(materials, 'gas-jar-1')
  rig.jarB = makeGasJar(materials, 'gas-jar-2')
  root.add(rig.jarA, rig.jarB)
  buildLimewaterKit(materials, rig.jarA)

  buildGlassPlate(root, materials, rig)
  buildSplint(root, materials, rig)

  rig.acidBottle = makeReagentBottle(materials, {
    name: 'dilute-hydrochloric-acid-bottle',
    label: '稀盐酸',
    formula: 'HCl(aq)',
    storage: '透明玻璃 · 密闭',
  })
  rig.limeBottle = makeReagentBottle(materials, {
    name: 'clear-limewater-bottle',
    label: '澄清石灰水',
    formula: 'Ca(OH)₂(aq)',
    storage: '密闭 · 隔绝 CO₂',
  })
  rig.acidStopper = makeReagentClosure(materials, 'glass', 'acid-ground-glass-stopper')
  rig.limeStopper = makeReagentClosure(materials, 'plastic', 'limewater-polyethylene-cap')
  root.add(rig.acidBottle, rig.limeBottle, rig.acidStopper, rig.limeStopper)

  rig.acidStream = makeStream(0.024, materials.pourStream)
  rig.limeStream = makeStream(0.022, materials.pourStream)
  root.add(rig.acidStream, rig.limeStream)

  buildCandleBeaker(root, materials, rig)
  buildMatchKit(root, materials, rig)

  return rig
}
