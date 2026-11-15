/**
 * [INPUT]: mats.js 的材质与辅助函数。
 * [OUTPUT]: 玻璃器皿参数化构建器（烧杯、量筒、玻璃棒、滴管、试剂瓶、漏斗、滤纸组）
 *           以及容器内液体（可设液位 / 浑浊度）。
 * [POS]: 纯器材层；不包含课程状态与动画时序。
 */
import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from '../lib.js'
import {
  cylinderBetween,
  fresnelShellMaterial,
  lathe,
  liquidSurfaceMaterial,
  liquidVolumeMaterial,
  ringTorus,
  roundedBox,
} from '../mats.js'

/* ---------- 容器液体（圆柱容器：缩放式液位） ---------- */

export function makeCylinderLiquid(mats, opts) {
  const o = opts || {}
  const rIn = o.rIn
  const hMax = o.hMax
  const y0 = o.y0 === undefined ? 0.03 : o.y0
  const group = new Group()
  group.name = 'liquid'

  const volumeMaterial = liquidVolumeMaterial({
    minY: -hMax / 2, maxY: hMax / 2,
    bottom: o.bottom === undefined ? 0x7fb4c8 : o.bottom,
    top: o.top === undefined ? 0xbde2ec : o.top,
    alphaB: o.alphaB === undefined ? 0.46 : o.alphaB,
    alphaT: o.alphaT === undefined ? 0.3 : o.alphaT,
  })
  const volume = new Mesh(new CylinderGeometry(rIn, rIn * 0.985, hMax, 40), volumeMaterial)
  volume.renderOrder = 12
  group.add(volume)

  const surfaceMaterial = liquidSurfaceMaterial({ color: o.surface === undefined ? 0xd6f0f5 : o.surface })
  const surface = new Mesh(new CircleGeometry(rIn * 0.995, 40), surfaceMaterial)
  surface.rotation.x = -Math.PI / 2
  surface.renderOrder = 14
  group.add(surface)

  const meniscus = ringTorus(rIn * 0.99, 0.008, mats.glassEdge.clone(), 40)
  meniscus.castShadow = false
  meniscus.renderOrder = 15
  group.add(meniscus)

  const api = {
    group, volumeMaterial, surfaceMaterial, level: 0, murk: 0,
    setLevel(level01) {
      const level = MathUtils.clamp(level01, 0, 1)
      api.level = level
      const h = Math.max(0.001, level * hMax)
      volume.scale.y = h / hMax
      volume.position.y = y0 + h / 2
      surface.position.y = y0 + h
      meniscus.position.y = y0 + h
      group.visible = level > 0.012
    },
    setMurk(murk01) {
      api.murk = MathUtils.clamp(murk01, 0, 1)
      volumeMaterial.uniforms.uMurk.value = api.murk
      surfaceMaterial.uniforms.uMurk.value = api.murk
    },
    setTime(t) {
      volumeMaterial.uniforms.uTime.value = t
      surfaceMaterial.uniforms.uTime.value = t
    },
  }
  api.setLevel(o.level === undefined ? 0 : o.level)
  return api
}

/* ---------- 烧杯 ---------- */

export function buildBeaker(mats, opts) {
  const o = opts || {}
  const r = o.r === undefined ? 0.46 : o.r      // 外半径
  const h = o.h === undefined ? 1.0 : o.h       // 杯口高度
  const wall = 0.03
  const group = new Group()
  group.name = o.name || 'beaker'

  const outer = lathe([
    [0.06, 0.012], [r - 0.1, 0.016], [r - 0.02, 0.05], [r, 0.12], [r, h - 0.07],
    [r + 0.017, h - 0.02], [r + 0.022, h],
  ], 44, mats.glass)
  outer.renderOrder = 10
  group.add(outer)

  const inner = lathe([
    [0.05, 0.05], [r - 0.12, 0.052], [r - wall, 0.1], [r - wall, h - 0.02],
  ], 40, mats.glassInner)
  inner.renderOrder = 11
  group.add(inner)

  const fresnel = lathe([
    [r - 0.02, 0.05], [r, 0.12], [r, h - 0.07], [r + 0.017, h - 0.02],
  ], 44, fresnelShellMaterial(0.5))
  fresnel.castShadow = false
  fresnel.renderOrder = 20
  group.add(fresnel)

  const lip = ringTorus(r + 0.012, 0.02, mats.glassEdge, 48)
  lip.position.y = h
  lip.renderOrder = 16
  group.add(lip)

  const base = ringTorus(r - 0.03, 0.014, mats.glassEdge.clone(), 44)
  base.material.opacity = 0.5
  base.position.y = 0.03
  base.renderOrder = 15
  group.add(base)

  // 小尖嘴：两片微斜玻璃在杯口 +x 侧形成 V 形槽，倾倒时紧靠玻璃棒。
  const spout = new Group()
  spout.position.set(r - 0.015, h, 0)
  ;[-1, 1].forEach((side) => {
    const flap = roundedBox(0.16, 0.014, 0.1, 0.006, mats.glassEdge)
    flap.position.set(0.055, 0.028, side * 0.052)
    flap.rotation.z = 0.62
    flap.rotation.y = side * -0.5
    flap.castShadow = false
    flap.renderOrder = 17
    spout.add(flap)
  })
  group.add(spout)

  // 竖向高光条
  const highlight = new Mesh(
    new CylinderGeometry(0.014, 0.02, h * 0.72, 8),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }),
  )
  highlight.position.set(-r * 0.62, h * 0.5, r * 0.62)
  highlight.renderOrder = 18
  group.add(highlight)

  const liquid = makeCylinderLiquid(mats, {
    rIn: r - wall - 0.012, hMax: h - 0.1, y0: 0.05,
    bottom: o.liqBottom, top: o.liqTop, alphaB: o.alphaB, alphaT: o.alphaT,
  })
  group.add(liquid.group)

  return {
    group, liquid, r, h, wall,
    rimY: h,
    innerR: r - wall,
    spoutTip: new Vector3(r + 0.12, h + 0.05, 0), // 本地坐标：倾倒轴心参考
  }
}

/* ---------- 量筒 ---------- */

export function buildGraduatedCylinder(mats, opts) {
  const o = opts || {}
  const r = 0.145
  const h = o.h === undefined ? 1.52 : o.h
  const group = new Group()
  group.name = 'graduated-cylinder'

  const foot = lathe([[0.03, 0.01], [0.24, 0.015], [0.26, 0.045], [0.2, 0.075], [0.09, 0.09]], 36, mats.glass)
  foot.renderOrder = 10
  group.add(foot)
  const footEdge = ringTorus(0.245, 0.014, mats.glassEdge, 40)
  footEdge.position.y = 0.032
  footEdge.renderOrder = 15
  group.add(footEdge)

  const body = lathe([
    [0.1, 0.08], [r, 0.13], [r, h - 0.1], [r + 0.012, h - 0.03], [r + 0.015, h],
  ], 36, mats.glass)
  body.renderOrder = 10
  group.add(body)
  const bodyInner = lathe([[0.09, 0.12], [r - 0.024, 0.16], [r - 0.024, h - 0.04]], 32, mats.glassInner)
  bodyInner.renderOrder = 11
  group.add(bodyInner)
  const bodyFresnel = lathe([[r, 0.13], [r, h - 0.1], [r + 0.012, h - 0.03]], 36, fresnelShellMaterial(0.46))
  bodyFresnel.castShadow = false
  bodyFresnel.renderOrder = 20
  group.add(bodyFresnel)

  const lip = ringTorus(r + 0.01, 0.014, mats.glassEdge, 40)
  lip.position.y = h
  lip.renderOrder = 16
  group.add(lip)

  // 刻度：正面细白线
  for (let i = 0; i < 6; i += 1) {
    const tick = roundedBox(i % 2 === 0 ? 0.11 : 0.07, 0.008, 0.006, 0.003, mats.label)
    tick.position.set(0, 0.34 + i * 0.19, r + 0.004)
    tick.castShadow = false
    tick.renderOrder = 17
    group.add(tick)
  }

  const liquid = makeCylinderLiquid(mats, { rIn: r - 0.03, hMax: h - 0.2, y0: 0.14 })
  group.add(liquid.group)

  return { group, liquid, r, h, rimY: h }
}

/* ---------- 玻璃棒 ---------- */

export function buildStirringRod(mats, length) {
  const len = length === undefined ? 1.5 : length
  const group = new Group()
  group.name = 'stirring-rod'
  const body = new Mesh(new CylinderGeometry(0.028, 0.028, len - 0.056, 18), mats.glassRod)
  body.castShadow = true
  body.renderOrder = 13
  group.add(body)
  ;[-1, 1].forEach((side) => {
    const cap = new Mesh(new SphereGeometry(0.028, 14, 12), mats.glassRod)
    cap.position.y = side * (len / 2 - 0.028)
    cap.renderOrder = 13
    group.add(cap)
  })
  const sheen = new Mesh(
    new CylinderGeometry(0.008, 0.008, len * 0.8, 6),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }),
  )
  sheen.position.x = 0.016
  sheen.renderOrder = 14
  group.add(sheen)
  return { group, length: len, halfLength: len / 2 }
}

/* ---------- 胶头滴管 ---------- */

export function buildDropper(mats) {
  const group = new Group()
  group.name = 'dropper'
  const bulb = lathe([[0.012, 0.52], [0.062, 0.5], [0.082, 0.4], [0.07, 0.3], [0.045, 0.26]], 24, mats.rubberRed)
  group.add(bulb)
  const tube = lathe([[0.012, -0.42], [0.02, -0.36], [0.034, -0.1], [0.036, 0.27]], 20, mats.glass)
  tube.renderOrder = 12
  group.add(tube)
  const tubeEdge = new Mesh(new CylinderGeometry(0.014, 0.008, 0.66, 12), mats.glassEdge)
  tubeEdge.position.y = -0.06
  tubeEdge.renderOrder = 13
  group.add(tubeEdge)
  return { group, tipLocal: new Vector3(0, -0.42, 0) }
}

/* ---------- 广口试剂瓶（粗盐）+ 倒放瓶塞 ---------- */

export function buildReagentBottle(mats) {
  const group = new Group()
  group.name = 'reagent-bottle'
  const r = 0.34
  const body = lathe([
    [0.05, 0.012], [r - 0.06, 0.018], [r, 0.1], [r, 0.62], [r - 0.05, 0.74],
    [0.21, 0.8], [0.19, 0.9], [0.21, 0.96],
  ], 36, mats.glass)
  body.renderOrder = 10
  group.add(body)
  const inner = lathe([
    [0.05, 0.05], [r - 0.08, 0.06], [r - 0.035, 0.13], [r - 0.035, 0.6], [0.17, 0.74], [0.17, 0.95],
  ], 32, mats.glassInner)
  inner.renderOrder = 11
  group.add(inner)
  const fresnel = lathe([[r, 0.1], [r, 0.62], [r - 0.05, 0.74], [0.21, 0.8]], 36, fresnelShellMaterial(0.42))
  fresnel.castShadow = false
  fresnel.renderOrder = 20
  group.add(fresnel)
  const mouth = ringTorus(0.215, 0.018, mats.glassEdge, 36)
  mouth.position.y = 0.96
  mouth.renderOrder = 15
  group.add(mouth)

  // 磨砂玻璃瓶塞（可整体移动；开盖后倒放在台面上）
  const stopper = new Group()
  stopper.name = 'bottle-stopper'
  const plug = lathe([[0.02, -0.14], [0.15, -0.12], [0.17, 0.02], [0.2, 0.05], [0.24, 0.13], [0.05, 0.17]], 28, mats.glassEdge)
  plug.renderOrder = 14
  stopper.add(plug)
  return { group, stopper, mouthY: 0.96, r }
}

/* ---------- 漏斗（含斜口尖嘴） ---------- */

export function buildFunnel(mats, opts) {
  const o = opts || {}
  const mouthR = o.mouthR === undefined ? 0.52 : o.mouthR
  const coneBottomY = o.coneBottomY === undefined ? 1.2 : o.coneBottomY
  const mouthY = o.mouthY === undefined ? 2.06 : o.mouthY
  const stemR = 0.048
  const stemBottomY = o.stemBottomY === undefined ? 0.8 : o.stemBottomY

  const group = new Group()
  group.name = 'funnel'

  const cone = lathe([
    [stemR + 0.015, coneBottomY - 0.02], [0.1, coneBottomY + 0.03],
    [mouthR - 0.012, mouthY - 0.03], [mouthR, mouthY],
  ], 48, mats.glass)
  cone.renderOrder = 10
  group.add(cone)
  const coneInner = lathe([
    [stemR + 0.002, coneBottomY], [0.085, coneBottomY + 0.05], [mouthR - 0.03, mouthY - 0.02],
  ], 44, mats.glassInner)
  coneInner.renderOrder = 11
  group.add(coneInner)
  const coneFresnel = lathe([
    [0.1, coneBottomY + 0.03], [mouthR - 0.012, mouthY - 0.03],
  ], 48, fresnelShellMaterial(0.5))
  coneFresnel.castShadow = false
  coneFresnel.renderOrder = 21
  group.add(coneFresnel)

  const rim = ringTorus(mouthR + 0.006, 0.02, mats.glassEdge, 52)
  rim.position.y = mouthY
  rim.renderOrder = 16
  group.add(rim)

  const stem = new Mesh(
    new CylinderGeometry(stemR, stemR - 0.006, coneBottomY - stemBottomY, 24, 1, true),
    mats.glass,
  )
  stem.position.y = (coneBottomY + stemBottomY) / 2
  stem.renderOrder = 12
  group.add(stem)
  const stemCore = new Mesh(
    new CylinderGeometry(stemR - 0.018, stemR - 0.022, coneBottomY - stemBottomY, 16, 1, true),
    mats.glassInner,
  )
  stemCore.position.copy(stem.position)
  stemCore.renderOrder = 13
  group.add(stemCore)

  // 斜口：椭圆片表示切面，长侧在 +x（贴烧杯内壁的一侧）
  const bevel = new Mesh(new CircleGeometry(stemR + 0.004, 20), mats.glassEdge)
  bevel.position.set(0, stemBottomY + 0.028, 0)
  bevel.rotation.x = -Math.PI / 2
  bevel.rotation.y = 0.0
  bevel.rotation.z = -0.62
  bevel.scale.y = 1.55
  bevel.renderOrder = 15
  group.add(bevel)
  const stemLip = ringTorus(stemR, 0.011, mats.glassEdge, 24)
  stemLip.position.y = stemBottomY + 0.028
  stemLip.rotation.x = Math.PI / 2 + 0.0
  stemLip.rotation.y = 0.0
  stemLip.renderOrder = 15
  stemLip.rotation.z = 0
  group.add(stemLip)

  // 尖嘴接触点（本地）：斜口长侧最低点，贴烧杯内壁
  const tip = new Vector3(stemR, stemBottomY - 0.03, 0)

  return {
    group, mouthR, mouthY, coneBottomY, stemR, stemBottomY, tip,
    innerConeR: (y) => {
      const t = MathUtils.clamp((y - coneBottomY) / (mouthY - 0.02 - coneBottomY), 0, 1)
      return (stemR + 0.002) + t * ((mouthR - 0.03) - (stemR + 0.002))
    },
  }
}

/* ---------- 滤纸组：折叠示意 + 入斗滤纸（含三层侧与折痕） ---------- */

export function buildFilterPaperSet(mats, funnel) {
  const set = { }
  const rFlat = 0.5

  // 1) 平展圆滤纸
  const flat = new Mesh(new CircleGeometry(rFlat, 40), mats.paperDry.clone())
  flat.name = 'filter-paper-flat'
  flat.rotation.x = -Math.PI / 2
  flat.castShadow = true
  set.flat = flat

  // 1b) 对折一次的半圆
  const half = new Group()
  half.name = 'filter-paper-half'
  ;[0, 0.01].forEach((offset) => {
    const piece = new Mesh(new CircleGeometry(rFlat, 30, 0, Math.PI), mats.paperDry.clone())
    piece.rotation.x = -Math.PI / 2
    piece.position.y = offset
    half.add(piece)
  })
  set.half = half

  // 2) 对折两次的四分之一扇形（两片微错开表现层次）
  const quarter = new Group()
  quarter.name = 'filter-paper-quarter'
  ;[0, 0.012].forEach((offset, i) => {
    const wedge = new Mesh(new CircleGeometry(rFlat, 22, 0, Math.PI / 2), mats.paperDry.clone())
    wedge.rotation.x = -Math.PI / 2
    wedge.position.y = offset
    wedge.material.opacity = 1
    if (i === 1) wedge.scale.setScalar(0.985)
    quarter.add(wedge)
  })
  set.quarter = quarter

  // 3) 入斗滤纸：与漏斗内壁同锥角、留边 0.02 → “一贴”
  const paperTopY = funnel.mouthY - 0.14        // “二低”：滤纸边缘低于漏斗边缘
  const paperBottomY = funnel.coneBottomY + 0.04
  const rTop = funnel.innerConeR(paperTopY) - 0.02
  const rBottom = funnel.innerConeR(paperBottomY) - 0.018
  const inFunnel = new Group()
  inFunnel.name = 'filter-paper-in-funnel'

  const single = lathe([[rBottom, paperBottomY], [rTop, paperTopY]], 44, mats.paperDry.clone())
  single.material.transparent = true
  single.material.opacity = 0.96
  single.renderOrder = 12
  inFunnel.add(single)

  // 三层一侧：+x 半周再叠两层（微内缩），玻璃棒倚靠这一侧
  const triple = lathe(
    [[rBottom - 0.008, paperBottomY + 0.004], [rTop - 0.01, paperTopY - 0.004]],
    26, mats.paperDry.clone(), -Math.PI * 0.52, Math.PI * 1.04,
  )
  triple.material.color.setHex(0xefe9d8)
  triple.renderOrder = 13
  inFunnel.add(triple)
  const tripleInner = lathe(
    [[rBottom - 0.015, paperBottomY + 0.008], [rTop - 0.019, paperTopY - 0.01]],
    22, mats.paperDry.clone(), -Math.PI * 0.4, Math.PI * 0.8,
  )
  tripleInner.material.color.setHex(0xeae3d0)
  tripleInner.renderOrder = 14
  inFunnel.add(tripleInner)

  // 折痕：±z 两条竖向细脊
  ;[1, -1].forEach((side) => {
    const seam = cylinderBetween(
      new Vector3(0, paperBottomY + 0.01, side * (rBottom - 0.004)),
      new Vector3(0, paperTopY, side * (rTop - 0.006)),
      0.006, mats.paperDry.clone(), 8,
    )
    seam.material.color.setHex(0xe4dcc7)
    seam.renderOrder = 14
    inFunnel.add(seam)
  })

  // 3b) 折叠演示用的下落锥（落座后由真正的入斗滤纸接替）
  const montageCone = lathe([[rBottom, paperBottomY], [rTop, paperTopY]], 36, mats.paperDry.clone())
  montageCone.material.transparent = true
  montageCone.material.opacity = 0.96
  montageCone.renderOrder = 24
  set.montageCone = montageCone

  const paperMeshes = [single, triple, tripleInner]
  set.inFunnel = inFunnel
  set.rimY = paperTopY
  set.bottomY = paperBottomY
  set.rTop = rTop
  set.innerR = (y) => rBottom + ((y - paperBottomY) / (paperTopY - paperBottomY)) * (rTop - rBottom) - 0.02
  set.setWet = (wet01) => {
    const w = MathUtils.clamp(wet01, 0, 1)
    paperMeshes.forEach((mesh) => {
      const dry = mesh.userData.dryColor || (mesh.userData.dryColor = mesh.material.color.clone())
      mesh.material.color.copy(dry).lerp(mats.paperWet.color, w * 0.85)
      mesh.material.roughness = 0.94 - w * 0.5
      if (mesh.material.clearcoat !== undefined) mesh.material.clearcoat = w * 0.5
    })
  }
  return set
}

/* ---------- 蒸发皿（白瓷 · 圆底浅皿 · 带小嘴） ---------- */

export function buildEvaporatingDish(mats) {
  const group = new Group()
  group.name = 'evaporating-dish'
  const outer = lathe([
    [0.03, 0.0], [0.3, 0.008], [0.46, 0.062], [0.58, 0.17], [0.645, 0.27], [0.66, 0.315],
  ], 48, mats.porcelain)
  outer.renderOrder = 8
  group.add(outer)
  const inner = lathe([
    [0.02, 0.035], [0.28, 0.042], [0.44, 0.095], [0.56, 0.2], [0.625, 0.295], [0.638, 0.318],
  ], 44, mats.porcelainInner)
  inner.renderOrder = 9
  group.add(inner)
  const rim = ringTorus(0.649, 0.014, mats.porcelain, 52)
  rim.position.y = 0.316
  rim.renderOrder = 10
  group.add(rim)
  // 倾倒小嘴：+x 侧rim 局部外扬
  const spout = roundedBox(0.16, 0.02, 0.12, 0.01, mats.porcelain)
  spout.position.set(0.68, 0.322, 0)
  spout.rotation.z = -0.34
  group.add(spout)

  return {
    group,
    innerBottomY: 0.04,
    rimY: 0.315,
    innerR: (y) => 0.03 + MathUtils.clamp((y - 0.035) / 0.28, 0, 1) * 0.6,
  }
}
