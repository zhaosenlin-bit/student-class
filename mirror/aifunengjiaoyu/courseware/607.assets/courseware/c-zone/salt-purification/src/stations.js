/**
 * [INPUT]: parts-glass.js / parts-lab.js 的器材构建器。
 * [OUTPUT]: 四个工位（称量 → 溶解 → 过滤 → 蒸发）的精确摆位，
 *           以及 lesson.js 驱动的 rig 对象（器材引用 + 液体 / 颗粒 / 动效载体）。
 * [POS]: 布局层；只做“摆在哪里”，不做“何时发生”。
 *
 * 正视布局（x 从左到右）：试剂瓶+天平 | 烧杯A+量筒 | 铁架台+漏斗+烧杯B | 铁架台+蒸发皿+酒精灯。
 * 立杆全部退到 z=-0.66 的后排，保证正视时过滤与蒸发关系无遮挡。
 */
import { CircleGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, Vector3 } from './lib.js'
import {
  grainPile, labelSticker, lathe, liquidVolumeMaterial, streamMaterial,
} from './mats.js'
import {
  buildBeaker, buildDropper, buildEvaporatingDish, buildFilterPaperSet, buildFunnel,
  buildGraduatedCylinder, buildReagentBottle, buildStirringRod, makeCylinderLiquid,
} from './apparatus/parts-glass.js'
import {
  buildAlcoholLamp, buildBalance, buildDrops, buildIronStand, buildLampCap,
  buildRippleSet, buildSpoon, buildSteamSet, buildWeighPaper, makeStream,
} from './apparatus/parts-lab.js'

export const LAYOUT = {
  bottle: new Vector3(-5.32, 0, -0.08),
  stopperRest: new Vector3(-4.86, 0.045, 0.5),
  spoonRest: new Vector3(-4.52, 0.052, 0.62),
  balance: new Vector3(-3.95, 0, 0),
  weightHome: new Vector3(-3.12, 0.02, 0.52),
  paperBenchRest: new Vector3(-3.45, 0.002, 0.68),
  beakerA: new Vector3(-2.0, 0, 0.05),
  cylinder: new Vector3(-2.88, 0, -0.3),
  dropperRest: new Vector3(-2.42, 0.062, 0.66),
  rodRestBench1: new Vector3(-1.32, 0.033, 0.6),
  funnelAxis: new Vector3(0.85, 0, 0),
  beakerBGap: new Vector3(0.64, 0, 0),      // 组装前：留有缝隙
  beakerBContact: new Vector3(0.503, 0, 0), // 组装后：内壁贴住尖嘴
  beakerBRest: new Vector3(2.34, 0, 0.4),   // 倒入蒸发皿后的停放位
  rodRestBench2: new Vector3(3.18, 0.033, 0.62),
  dish: new Vector3(3.62, 1.773, 0),
  ringY2: 1.84,
  lamp: new Vector3(3.62, 0, 0),
  capRest: new Vector3(2.92, 0.16, 0.62),
  stand1Upright: { x: 1.62, z: -0.66 },
  stand2Upright: { x: 4.42, z: -0.66 },
}

export function buildStations(mats, root) {
  const rig = { mats, root, LAYOUT }

  /* ---------- 工位一：称量 ---------- */
  const bottle = buildReagentBottle(mats)
  bottle.group.position.copy(LAYOUT.bottle)
  root.add(bottle.group)
  const bottleLabel = labelSticker('粗盐', 0.36, 0.24, mats.label)
  bottleLabel.position.set(0, 0.4, bottle.r + 0.004)
  bottle.group.add(bottleLabel)
  bottle.stopper.position.copy(LAYOUT.stopperRest)
  bottle.stopper.rotation.z = Math.PI // 瓶塞倒放
  root.add(bottle.stopper)
  const bottleSalt = grainPile({ count: 30, spread: 0.24, height: 0.3, scale: 0.9, seed: 11 })
  bottleSalt.position.set(0, 0.08, 0)
  bottle.group.add(bottleSalt)

  const spoon = buildSpoon(mats)
  spoon.group.position.copy(LAYOUT.spoonRest)
  root.add(spoon.group)
  const spoonSalt = grainPile({ count: 7, spread: 0.055, height: 0.05, scale: 0.62, seed: 21 })
  spoonSalt.position.set(-0.42, 0.05, 0)
  spoon.group.add(spoonSalt)

  const balance = buildBalance(mats)
  balance.group.position.copy(LAYOUT.balance)
  root.add(balance.group)
  balance.weight.position.copy(LAYOUT.weightHome)
  root.add(balance.weight)

  // 称量纸是可移动的“样品载体”：挂在自身组里，随步骤在托盘 / 烧杯 / 台面间移动
  const weighPaper = buildWeighPaper(mats)
  root.add(weighPaper.group)
  // 两盘都垫称量纸；右盘纸固定在托盘上并随横梁轻微倾斜。
  const rightPanPaper = buildWeighPaper(mats)
  rightPanPaper.group.name = 'right-pan-weigh-paper'
  rightPanPaper.group.position.y = balance.pans.right.topY + 0.004
  balance.pans.right.carrier.add(rightPanPaper.group)
  const paperSalt = grainPile({ count: 30, spread: 0.155, height: 0.12, scale: 0.85, seed: 5 })
  paperSalt.position.y = 0.014
  weighPaper.group.add(paperSalt)
  const fallingSalt = grainPile({ count: 9, spread: 0.05, height: 0.55, scale: 0.7, seed: 31, flatten: 1 })
  fallingSalt.visible = false
  root.add(fallingSalt)

  /* ---------- 工位二：溶解 ---------- */
  const beakerA = buildBeaker(mats, { name: 'beaker-A', r: 0.46, h: 1.0 })
  beakerA.group.position.copy(LAYOUT.beakerA)
  root.add(beakerA.group)
  const beakerASalt = grainPile({ count: 26, spread: 0.3, height: 0.1, scale: 0.8, seed: 8, depthScale: 0.8 })
  beakerASalt.position.y = 0.05
  beakerA.group.add(beakerASalt)
  const beakerASand = grainPile({
    count: 20, spread: 0.3, height: 0.06, scale: 0.66, seed: 14, depthScale: 0.8,
    colors: [[0x8b7c66, 4], [0x6e6353, 3], [0x9a8a70, 2]],
  })
  beakerASand.position.y = 0.05
  beakerA.group.add(beakerASand)
  // 悬浮泥沙微粒（搅拌后在液体中打旋，静置 / 倾倒时下沉消隐）
  const specks = grainPile({
    count: 16, spread: 0.3, height: 0.4, scale: 0.24, seed: 17, flatten: 1, depthScale: 0.8,
    colors: [[0x8b7c66, 4], [0x776b58, 3]],
  })
  specks.position.y = 0.14
  specks.children.forEach((grain, i) => {
    grain.userData.orbitR = 0.08 + (i % 5) * 0.045
    grain.userData.orbitPhase = i * 1.7
    grain.userData.baseY = grain.position.y
  })
  beakerA.group.add(specks)

  const cylinder = buildGraduatedCylinder(mats)
  cylinder.group.position.copy(LAYOUT.cylinder)
  root.add(cylinder.group)

  const dropper = buildDropper(mats)
  dropper.group.position.copy(LAYOUT.dropperRest)
  root.add(dropper.group)

  const rod = buildStirringRod(mats, 1.5)
  root.add(rod.group)

  /* ---------- 工位三：过滤 ---------- */
  const stand1 = buildIronStand(mats, {
    name: 'stand-filtration', ringR: 0.36, ringY: 1.68,
    uprightX: LAYOUT.stand1Upright.x - LAYOUT.funnelAxis.x, uprightZ: LAYOUT.stand1Upright.z,
  })
  stand1.group.position.set(LAYOUT.funnelAxis.x, 0, 0)
  root.add(stand1.group)

  const funnel = buildFunnel(mats, { mouthR: 0.52, mouthY: 2.06, coneBottomY: 1.2, stemBottomY: 0.62 })
  funnel.group.position.set(LAYOUT.funnelAxis.x, 0, 0)
  root.add(funnel.group)

  const paperSet = buildFilterPaperSet(mats, funnel)
  funnel.group.add(paperSet.inFunnel)
  funnel.group.add(paperSet.montageCone)
  root.add(paperSet.flat)
  root.add(paperSet.half)
  root.add(paperSet.quarter)

  // 漏斗内的（浑浊）液锥：uCut 裁剪液面，始终低于滤纸边缘
  const coneLiquidMaterial = liquidVolumeMaterial({
    minY: paperSet.bottomY, maxY: paperSet.rimY, bottom: 0x7fa0ae, top: 0xb7d6de,
    alphaB: 0.5, alphaT: 0.36,
  })
  const coneLiquid = lathe([
    [0.05, paperSet.bottomY + 0.012],
    [paperSet.innerR(paperSet.rimY) - 0.006, paperSet.rimY - 0.006],
  ], 40, coneLiquidMaterial)
  coneLiquid.castShadow = false
  coneLiquid.renderOrder = 15
  coneLiquid.visible = false
  funnel.group.add(coneLiquid)
  const coneSurface = new Mesh(new CircleGeometry(1, 36), new MeshBasicMaterial({
    color: 0xbfae8f, transparent: true, opacity: 0.55, depthWrite: false,
  }))
  coneSurface.rotation.x = -Math.PI / 2
  coneSurface.visible = false
  coneSurface.renderOrder = 16
  funnel.group.add(coneSurface)

  // 滤渣：滤纸锥下部的灰色湿润细颗粒 + 湿渍色带
  const residue = grainPile({
    count: 26, spread: 0.17, height: 0.1, scale: 0.6, seed: 23,
    colors: [[0x84776a, 4], [0x6b6156, 3], [0x94897a, 2]],
  })
  residue.position.y = paperSet.bottomY + 0.015
  funnel.group.add(residue)
  const residueStain = lathe([
    [paperSet.innerR(paperSet.bottomY + 0.02) + 0.004, paperSet.bottomY + 0.02],
    [paperSet.innerR(paperSet.bottomY + 0.3) + 0.004, paperSet.bottomY + 0.3],
  ], 36, mats.paperWet.clone())
  residueStain.material.transparent = true
  residueStain.material.opacity = 0
  residueStain.material.color.setHex(0x9a8b74)
  residueStain.castShadow = false
  residueStain.renderOrder = 14
  funnel.group.add(residueStain)

  const beakerB = buildBeaker(mats, { name: 'beaker-B', r: 0.43, h: 0.92 })
  beakerB.group.position.copy(LAYOUT.beakerBGap)
  root.add(beakerB.group)

  // 尖嘴接触点提示微光（组装完成时脉冲一次）
  const tipGlow = new Mesh(new CircleGeometry(0.075, 20), new MeshBasicMaterial({
    color: 0xbfffe0, transparent: true, opacity: 0, depthWrite: false,
  }))
  tipGlow.position.set(
    LAYOUT.funnelAxis.x + funnel.tip.x - 0.01, funnel.tip.y + 0.02, 0.062,
  )
  tipGlow.renderOrder = 28
  root.add(tipGlow)

  /* ---------- 工位四：蒸发 ---------- */
  const stand2 = buildIronStand(mats, {
    name: 'stand-evaporation', ringR: 0.5, ringY: LAYOUT.ringY2,
    uprightX: LAYOUT.stand2Upright.x - LAYOUT.dish.x, uprightZ: LAYOUT.stand2Upright.z,
  })
  stand2.group.position.set(LAYOUT.dish.x, 0, 0)
  root.add(stand2.group)

  const dish = buildEvaporatingDish(mats)
  dish.group.position.copy(LAYOUT.dish)
  root.add(dish.group)

  const dishLiquidMaterial = liquidVolumeMaterial({
    minY: 0.045, maxY: 0.3, bottom: 0x8fbecb, top: 0xc4e4ea, alphaB: 0.5, alphaT: 0.34,
  })
  const dishLiquid = lathe([
    [0.03, 0.048], [0.27, 0.052], [0.43, 0.1], [0.55, 0.2], [0.615, 0.293],
  ], 40, dishLiquidMaterial)
  dishLiquid.castShadow = false
  dishLiquid.renderOrder = 12
  dishLiquid.visible = false
  dish.group.add(dishLiquid)
  const dishSurface = new Mesh(new CircleGeometry(1, 40), new MeshBasicMaterial({
    color: 0xdef2f5, transparent: true, opacity: 0.5, depthWrite: false,
  }))
  dishSurface.rotation.x = -Math.PI / 2
  dishSurface.visible = false
  dishSurface.renderOrder = 13
  dish.group.add(dishSurface)

  // 结晶：边缘晶环 + 中心晶粒 + 白色晶膜
  const crystalRing = grainPile({
    count: 30, spread: 0.5, height: 0.045, scale: 0.5, seed: 27, minRadius: 0.3,
    colors: [[0xf8f6ef, 5], [0xefece2, 3], [0xffffff, 2]],
  })
  crystalRing.position.y = 0.052
  dish.group.add(crystalRing)
  const crystalCenter = grainPile({
    count: 22, spread: 0.3, height: 0.05, scale: 0.46, seed: 33,
    colors: [[0xf8f6ef, 5], [0xefece2, 3], [0xffffff, 2]],
  })
  crystalCenter.position.y = 0.05
  dish.group.add(crystalCenter)
  const crust = new Mesh(new CircleGeometry(0.5, 40), new MeshBasicMaterial({
    color: 0xf7f4ea, transparent: true, opacity: 0, depthWrite: false,
  }))
  crust.rotation.x = -Math.PI / 2
  crust.position.y = 0.055
  crust.renderOrder = 11
  dish.group.add(crust)

  const lamp = buildAlcoholLamp(mats)
  lamp.group.position.copy(LAYOUT.lamp)
  root.add(lamp.group)
  const cap = buildLampCap(mats)
  cap.group.position.copy(LAYOUT.capRest)
  root.add(cap.group)

  const steam = buildSteamSet(6)
  steam.group.position.set(LAYOUT.dish.x, LAYOUT.dish.y + 0.42, 0.05)
  root.add(steam.group)

  /* ---------- 动效载体：液流 / 液滴 / 涟漪 ---------- */
  const streams = {
    cylPour: makeStream(streamMaterial(false)),
    beakerPour: makeStream(streamMaterial(true)),
    alongRod: makeStream(streamMaterial(true)),
    stemDrip: makeStream(streamMaterial(false)),
    wall: makeStream(streamMaterial(false)),
    dishPour: makeStream(streamMaterial(false)),
    saltDump: makeStream(streamMaterial(true)),
  }
  Object.values(streams).forEach((s) => root.add(s.mesh))
  streams.saltDump.mesh.material.color.setHex(0xcdc3ac)
  streams.saltDump.mesh.material.opacity = 0.5

  const drops = buildDrops(mats, 3)
  drops.forEach((d) => root.add(d))
  const ripples = buildRippleSet(6)
  ripples.forEach((r) => root.add(r))

  /* ---------- 接触阴影（各工位下的柔和椭圆） ---------- */
  ;[
    [LAYOUT.bottle.x, -0.05, 1.4, 0.9], [LAYOUT.balance.x, 0, 2.2, 1.1],
    [LAYOUT.beakerA.x, 0.05, 1.3, 0.9], [LAYOUT.cylinder.x, -0.3, 0.8, 0.6],
    [LAYOUT.funnelAxis.x - 0.12, 0, 1.9, 1.0], [LAYOUT.dish.x, 0, 2.3, 1.1],
  ].forEach(([x, z, sx, sz]) => {
    const blob = new Mesh(new CircleGeometry(0.5, 40), new MeshBasicMaterial({
      color: 0x27352d, transparent: true, opacity: 0.1, depthWrite: false,
    }))
    blob.rotation.x = -Math.PI / 2
    blob.scale.set(sx, sz, 1)
    blob.position.set(x, 0.006, z)
    blob.renderOrder = 1
    root.add(blob)
  })

  /* ---------- rig ---------- */
  Object.assign(rig, {
    bottle, spoon, spoonSalt, balance, weighPaper, rightPanPaper, paperSalt, fallingSalt,
    beakerA, beakerASalt, beakerASand, specks, cylinder, dropper, rod,
    stand1, funnel, paperSet, coneLiquid, coneLiquidMaterial, coneSurface,
    residue, residueStain, beakerB, tipGlow,
    stand2, dish, dishLiquid, dishLiquidMaterial, dishSurface,
    crystalRing, crystalCenter, crust, lamp, cap, steam,
    streams, drops, ripples,
    anchors: {
      calloutBalance: new Vector3(LAYOUT.balance.x, 2.02, 0.1),
      calloutBeaker: new Vector3(LAYOUT.beakerA.x + 0.1, 1.5, 0.1),
      calloutFunnel: new Vector3(LAYOUT.funnelAxis.x + 0.16, 2.5, 0.1),
      calloutDish: new Vector3(LAYOUT.dish.x - 0.05, 2.75, 0.1),
    },
  })
  return rig
}

/** 供校验脚本使用的关键几何关系（世界坐标）。 */
export function keyGeometry(rig) {
  const L = rig.LAYOUT
  return {
    funnelRimY: rig.funnel.mouthY,
    paperRimY: rig.paperSet.rimY,
    stemTipWorld: new Vector3(
      L.funnelAxis.x + rig.funnel.tip.x, rig.funnel.tip.y, 0,
    ),
    beakerBInnerWallX: (center) => center.x + rig.beakerB.innerR,
    beakerBRimY: rig.beakerB.rimY,
    dishRimWorldY: L.dish.y + rig.dish.rimY,
    dishBottomWorldY: L.dish.y,
    flameTipWorldY: (1.5 + rig.lamp.flameTipLocalY * 0.72) * rig.lamp.scale,
  }
}
