import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from '../vendor/three.module.js'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import { createFlame, createSmoke } from './materials.js'

const cast = (mesh, receive = true) => {
  mesh.castShadow = true
  mesh.receiveShadow = receive
  return mesh
}

export function roundedBox(width, height, depth, radius, material) {
  return cast(new Mesh(new RoundedBoxGeometry(width, height, depth, 5, radius), material))
}

function createSafetyTray(width, depth, materials) {
  const group = new Group()
  const base = roundedBox(width, .12, depth, .09, materials.tray)
  base.position.y = .13
  const bed = roundedBox(width - .24, .035, depth - .24, .055, materials.trayInner)
  bed.position.y = .205

  const longRail = roundedBox(width - .12, .15, .13, .04, materials.trayEdge)
  const longRailBack = longRail.clone()
  longRail.position.set(0, .265, depth / 2 - .085)
  longRailBack.position.set(0, .265, -depth / 2 + .085)
  const shortRail = roundedBox(.13, .15, depth - .3, .04, materials.trayEdge)
  const shortRailRight = shortRail.clone()
  shortRail.position.set(-width / 2 + .085, .265, 0)
  shortRailRight.position.set(width / 2 - .085, .265, 0)

  const fasteners = new Group()
  for (const x of [-width / 2 + .18, width / 2 - .18]) {
    for (const z of [-depth / 2 + .17, depth / 2 - .17]) {
      const screw = new Mesh(new CylinderGeometry(.035, .035, .022, 18), materials.fastener)
      screw.position.set(x, .356, z)
      fasteners.add(screw)
    }
  }
  group.add(base, bed, longRail, longRailBack, shortRail, shortRailRight, fasteners)
  return group
}

function createDish(kind, materials) {
  const group = new Group()
  const foot = new Mesh(new TorusGeometry(.29, .028, 9, 40), materials.ceramicEdge)
  foot.rotation.x = Math.PI / 2
  foot.position.y = .255
  const bowl = new Mesh(new CylinderGeometry(.49, .36, .18, 48), materials.ceramic)
  bowl.position.y = .34
  const innerBowl = new Mesh(new CylinderGeometry(.415, .32, .115, 48, 1, true), materials.ceramicInner)
  innerBowl.position.y = .405
  const lip = new Mesh(new TorusGeometry(.475, .038, 10, 48), materials.ceramicEdge)
  lip.rotation.x = Math.PI / 2
  lip.position.y = .435
  const liquidMaterial = kind === 'water' ? materials.water : materials.alcohol
  const liquid = new Mesh(new CylinderGeometry(.39, .39, .022, 48), liquidMaterial)
  liquid.position.y = .432

  const cotton = new Group()
  cotton.position.y = .49
  const cottonMaterial = kind === 'water' ? materials.cottonWet : materials.cottonAlcohol
  const offsets = [
    [-.18, .035, -.06, .18], [.03, .06, -.1, .21], [.2, .045, -.03, .17],
    [-.13, .09, .1, .19], [.1, .105, .1, .2], [0, .18, 0, .18],
    [-.24, .055, .02, .125], [.24, .06, .08, .12],
  ]
  offsets.forEach(([x, y, z, size], index) => {
    const tuft = new Mesh(new IcosahedronGeometry(size, 2), cottonMaterial)
    tuft.position.set(x, y, z)
    tuft.scale.y = kind === 'water' ? .62 + (index % 2) * .08 : .76 + (index % 3) * .06
    tuft.scale.z = .88 + (index % 2) * .08
    tuft.castShadow = true
    cotton.add(tuft)
  })
  group.add(foot, bowl, innerBowl, lip, liquid, cotton)
  return { group, bowl, liquid, cotton }
}

function createIgniter(materials) {
  const group = new Group()
  group.rotation.z = -.08
  const handle = roundedBox(.62, .22, .22, .06, materials.rubber)
  handle.position.x = 0
  const tube = new Mesh(new CylinderGeometry(.045, .045, .78, 18), materials.steel)
  tube.rotation.z = Math.PI / 2
  tube.position.x = .67
  const flame = createFlame({ scale: .38, blue: true, light: false })
  flame.position.x = 1.06
  flame.rotation.z = -Math.PI / 2
  group.add(handle, tube, flame)
  group.visible = false
  return { group, flame }
}

function createSnuffer(materials, radius = .34) {
  const group = new Group()
  const cap = new Mesh(new CylinderGeometry(radius * .72, radius, .33, 32, 1, false), materials.brass)
  cap.position.y = .16
  const handle = new Mesh(new CylinderGeometry(.035, .035, .58, 16), materials.darkSteel)
  handle.rotation.z = Math.PI / 2
  handle.position.set(.36, .29, 0)
  group.add(cap, handle)
  return group
}

function createCandle(materials) {
  const group = new Group()
  const base = new Mesh(new CylinderGeometry(.35, .43, .095, 40), materials.candleHolder)
  base.position.y = .29
  const baseRim = new Mesh(new TorusGeometry(.39, .035, 9, 40), materials.trayEdge)
  baseRim.rotation.x = Math.PI / 2
  baseRim.position.y = .335
  const wax = new Mesh(new CylinderGeometry(.22, .24, .92, 40), materials.wax)
  wax.position.y = .79
  wax.castShadow = true
  const top = new Mesh(new CylinderGeometry(.2, .215, .035, 40), materials.waxMelt)
  top.position.y = 1.26
  const meltRim = new Mesh(new TorusGeometry(.205, .018, 8, 40), materials.waxMelt)
  meltRim.rotation.x = Math.PI / 2
  meltRim.position.y = 1.275
  const pool = new Mesh(new CylinderGeometry(.12, .12, .012, 32), materials.waxPool)
  pool.position.y = 1.288
  const drips = new Group()
  for (const [angle, length] of [[.2, .25], [2.25, .18], [4.3, .29]]) {
    const drip = new Mesh(new SphereGeometry(.03, 14, 10), materials.waxMelt)
    drip.scale.set(.7, length / .06, .7)
    drip.position.set(Math.cos(angle) * .222, 1.2 - length / 2, Math.sin(angle) * .222)
    drips.add(drip)
  }
  const wick = new Mesh(new CylinderGeometry(.025, .025, .19, 12), materials.wick)
  wick.position.y = 1.37
  const flame = createFlame({ scale: .56 })
  flame.position.y = 1.43
  const smoke = createSmoke()
  smoke.position.y = 1.6
  group.add(base, baseRim, wax, top, meltRim, pool, drips, wick, flame, smoke)
  return { group, wax, flame, smoke }
}

function createCloche(materials) {
  const group = new Group()
  const shell = new Mesh(new CylinderGeometry(.72, .78, 2.08, 64, 1, true), materials.glass)
  shell.position.y = 1.12
  shell.renderOrder = 8
  const inner = new Mesh(new CylinderGeometry(.68, .73, 1.98, 64, 1, true), materials.glassInner)
  inner.position.y = 1.12
  inner.renderOrder = 7
  const top = new Mesh(new CircleGeometry(.72, 64), materials.glass)
  top.rotation.x = -Math.PI / 2
  top.position.y = 2.16
  top.renderOrder = 8
  const topRim = new Mesh(new TorusGeometry(.7, .026, 8, 64), new MeshStandardMaterial({ color: 0x8ba9aa, transparent: true, opacity: .66, roughness: .18, depthWrite: false }))
  topRim.rotation.x = Math.PI / 2
  topRim.position.y = 2.15
  const bottomRim = topRim.clone()
  bottomRim.scale.set(1.08, 1.08, 1.08)
  bottomRim.position.y = .08

  const highlights = new Group()
  for (const [x, z, height, opacity] of [[-.48, .5, 1.62, .42], [.54, .39, 1.18, .28], [-.62, -.25, .86, .2]]) {
    const stripMaterial = materials.glassHighlight.clone()
    stripMaterial.opacity = opacity
    const strip = roundedBox(.035, height, .018, .009, stripMaterial)
    strip.position.set(x, 1.15, z)
    strip.rotation.y = Math.atan2(x, z)
    strip.renderOrder = 9
    highlights.add(strip)
  }

  const mist = new Group()
  const mistMaterial = new MeshBasicMaterial({ color: 0xe9f0ef, transparent: true, opacity: 0, depthWrite: false })
  for (let index = 0; index < 16; index += 1) {
    const drop = new Mesh(new SphereGeometry(.025 + (index % 3) * .009, 10, 8), mistMaterial.clone())
    const angle = index * 2.399
    drop.position.set(Math.cos(angle) * .66, .85 + (index % 6) * .19, Math.sin(angle) * .66)
    mist.add(drop)
  }
  group.add(shell, inner, top, topRim, bottomRim, highlights, mist)
  group.position.y = 0
  return { group, shell, mist }
}

function createAlcoholLamp(materials) {
  const group = new Group()
  const reservoir = new Mesh(new SphereGeometry(.43, 40, 24), new MeshPhysicalMaterial({
    color: 0xb7d2cf,
    transparent: true,
    opacity: .42,
    roughness: .08,
    transmission: .4,
    thickness: .12,
    depthWrite: false,
  }))
  reservoir.scale.y = .82
  reservoir.position.y = .55
  const baseRing = new Mesh(new TorusGeometry(.32, .025, 8, 40), materials.glassEdge)
  baseRing.rotation.x = Math.PI / 2
  baseRing.position.y = .235
  const liquid = new Mesh(new SphereGeometry(.36, 36, 20), materials.alcohol)
  liquid.scale.y = .64
  liquid.position.y = .49
  const shoulder = new Mesh(new CylinderGeometry(.22, .34, .2, 36), materials.lampGlass)
  shoulder.position.y = .8
  const collar = new Mesh(new CylinderGeometry(.18, .22, .22, 28), materials.brass)
  collar.position.y = .94
  const collarRim = new Mesh(new TorusGeometry(.205, .025, 8, 32), materials.brassHighlight)
  collarRim.rotation.x = Math.PI / 2
  collarRim.position.y = 1.055
  const wickTube = new Mesh(new CylinderGeometry(.08, .09, .16, 20), materials.darkSteel)
  wickTube.position.y = 1.09
  const wick = new Mesh(new CylinderGeometry(.055, .055, .2, 14), materials.wick)
  wick.position.y = 1.13
  const flame = createFlame({ scale: .67, blue: true })
  flame.position.y = 1.21
  const highlight = roundedBox(.035, .46, .018, .008, materials.glassHighlight)
  highlight.position.set(-.23, .58, .35)
  highlight.renderOrder = 9
  group.add(reservoir, baseRing, liquid, shoulder, collar, collarRim, wickTube, wick, flame, highlight)
  return { group, flame, wick }
}

function createPlateSupport(materials, x) {
  const group = new Group()
  const base = roundedBox(.76, .14, .72, .07, materials.standBase)
  base.position.set(x, .31, -.36)
  const baseFoot = roundedBox(.46, .06, .43, .045, materials.darkSteel)
  baseFoot.position.set(x, .23, -.36)
  const pole = new Mesh(new CylinderGeometry(.052, .052, 2.55, 20), materials.steel)
  pole.position.set(x, 1.56, -.46)
  const boss = new Mesh(new CylinderGeometry(.13, .13, .22, 20), materials.darkSteel)
  boss.rotation.x = Math.PI / 2
  boss.position.set(x, 2.27, -.38)
  const arm = new Mesh(new CylinderGeometry(.035, .035, .7, 16), materials.steel)
  arm.rotation.x = Math.PI / 2
  arm.position.set(x, 2.27, -.12)
  const lowerJaw = roundedBox(.24, .1, .28, .025, materials.darkSteel)
  lowerJaw.position.set(x, 2.2, .1)
  const upperJaw = roundedBox(.24, .08, .28, .025, materials.darkSteel)
  upperJaw.position.set(x, 2.34, .1)
  const screw = new Mesh(new CylinderGeometry(.025, .025, .28, 14), materials.steel)
  screw.position.set(x, 2.49, .1)
  const knob = new Mesh(new CylinderGeometry(.07, .07, .07, 18), materials.rubber)
  knob.rotation.z = Math.PI / 2
  knob.position.set(x, 2.62, .1)
  group.add(base, baseFoot, pole, boss, arm, lowerJaw, upperJaw, screw, knob)
  return group
}

function createPingPongFragment(materials) {
  const fragment = new Mesh(
    new SphereGeometry(.27, 36, 14, 0, Math.PI * 1.35, 0, Math.PI * .42),
    materials.pingPong,
  )
  fragment.scale.set(1, .16, .78)
  fragment.rotation.y = -.24
  fragment.rotation.z = .08
  fragment.castShadow = true
  return fragment
}

function createFilterPaper(materials) {
  const geometry = new PlaneGeometry(.58, .45, 4, 3)
  const positions = geometry.attributes.position
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    positions.setZ(index, Math.sin((x + .3) * 8) * .012 + Math.abs(y) * .035)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  const paper = new Mesh(geometry, materials.paper)
  paper.rotation.x = -Math.PI / 2
  paper.rotation.z = .09
  paper.castShadow = true
  return paper
}

function createCrucibleTongs(materials) {
  const group = new Group()
  for (const z of [-.06, .06]) {
    const arm = new Mesh(new CylinderGeometry(.018, .018, 1.5, 10), materials.steel)
    arm.rotation.z = Math.PI / 2
    arm.rotation.y = z * 2.2
    arm.position.z = z
    group.add(arm)
  }
  const ring = new Mesh(new TorusGeometry(.15, .022, 8, 28), materials.steel)
  ring.rotation.y = Math.PI / 2
  ring.position.x = -.73
  group.add(ring)
  return group
}

function createZonePlate(width, materials, accent) {
  const group = new Group()
  const base = roundedBox(width, .12, 3.42, .1, materials.benchInset)
  base.position.y = .02
  const stripeMaterial = materials.plateAccent.clone()
  stripeMaterial.color.setHex(accent)
  stripeMaterial.emissive.setHex(accent)
  stripeMaterial.emissiveIntensity = .07
  const stripe = roundedBox(width - .18, .025, .12, .03, stripeMaterial)
  stripe.position.set(0, .095, 1.53)
  group.add(base, stripe)
  return { group, stripe }
}

export function buildCombustionApparatus(root, materials) {
  const objects = { zoneRoots: [], zonePlates: [] }

  const zonePositions = [-4.75, 0, 4.75]
  const accents = [0x6f9baf, 0xa27d56, 0xb26c45]
  zonePositions.forEach((x, index) => {
    const zone = new Group()
    zone.name = `comparison-zone-${index + 1}`
    zone.position.x = x
    const plate = createZonePlate(index === 2 ? 4.2 : 4.05, materials, accents[index])
    zone.add(plate.group)
    root.add(zone)
    objects.zoneRoots.push(zone)
    objects.zonePlates.push(plate.stripe)
  })

  // 对照一：水棉球与酒精棉球。
  const zoneOne = objects.zoneRoots[0]
  const trayOne = createSafetyTray(3.5, 2.5, materials)
  trayOne.position.z = -.12
  zoneOne.add(trayOne)
  const waterDish = createDish('water', materials)
  waterDish.group.position.set(-.72, -.005, -.1)
  waterDish.group.scale.setScalar(1.08)
  const alcoholDish = createDish('alcohol', materials)
  alcoholDish.group.position.set(.72, -.005, -.1)
  alcoholDish.group.scale.setScalar(1.08)
  const alcoholFlame = createFlame({ scale: .68, blue: true })
  alcoholFlame.position.set(.72, .615, -.1)
  const igniter = createIgniter(materials)
  igniter.group.position.set(-1.78, .92, .28)
  const dishSnuffer = createSnuffer(materials, .48)
  dishSnuffer.position.set(1.3, .3, .64)
  zoneOne.add(waterDish.group, alcoholDish.group, alcoholFlame, igniter.group, dishSnuffer)
  objects.waterDish = waterDish
  objects.alcoholDish = alcoholDish
  objects.alcoholFlame = alcoholFlame
  objects.igniter = igniter.group
  objects.igniterFlame = igniter.flame
  objects.dishSnuffer = dishSnuffer

  // 对照二：相同蜡烛，右侧用透明玻璃罩隔绝持续氧气供应。
  const zoneTwo = objects.zoneRoots[1]
  const trayTwo = createSafetyTray(3.5, 2.5, materials)
  trayTwo.position.z = -.12
  zoneTwo.add(trayTwo)
  const openCandle = createCandle(materials)
  openCandle.group.position.set(-.72, .12, -.1)
  const coveredCandle = createCandle(materials)
  coveredCandle.group.position.set(.72, .12, -.1)
  const cloche = createCloche(materials)
  cloche.group.position.x = 1.22
  cloche.group.position.z = .7
  zoneTwo.add(openCandle.group, coveredCandle.group, cloche.group)
  objects.openCandle = openCandle
  objects.coveredCandle = coveredCandle
  objects.cloche = cloche

  // 对照三：同一铜片上相近大小的两种材料，中央下方统一加热。
  const zoneThree = objects.zoneRoots[2]
  const trayThree = createSafetyTray(3.75, 2.65, materials)
  trayThree.position.z = -.08
  const leftSupport = createPlateSupport(materials, -1.48)
  const rightSupport = createPlateSupport(materials, 1.48)
  const lamp = createAlcoholLamp(materials)
  lamp.group.position.set(0, .025, .12)
  const copper = roundedBox(3.12, .12, .88, .025, materials.copperHot)
  copper.position.set(0, 2.27, .1)
  const copperEdge = roundedBox(3.04, .018, .035, .008, materials.copperHighlight)
  copperEdge.position.set(0, 2.34, .535)

  const pingPiece = createPingPongFragment(materials)
  pingPiece.position.set(-.72, 2.36, .1)
  const paperPiece = createFilterPaper(materials)
  paperPiece.position.set(.72, 2.35, .1)
  const pingFlame = createFlame({ scale: .64 })
  pingFlame.position.set(-.72, 2.44, .1)
  const paperFlame = createFlame({ scale: .58 })
  paperFlame.position.set(.72, 2.4, .28)
  const pingSmoke = createSmoke()
  pingSmoke.position.set(-.72, 2.58, .1)
  const paperSmoke = createSmoke()
  paperSmoke.position.set(.72, 2.56, .1)

  const lampCap = createSnuffer(materials, .25)
  lampCap.position.set(1.06, .34, .73)
  lampCap.rotation.z = -.12
  const tongs = createCrucibleTongs(materials)
  tongs.position.set(-.12, .35, .83)
  tongs.rotation.y = -.08

  zoneThree.add(trayThree, leftSupport, rightSupport, lamp.group, copper, copperEdge, pingPiece, paperPiece, pingFlame, paperFlame, pingSmoke, paperSmoke, lampCap, tongs)
  objects.lamp = lamp
  objects.copper = copper
  objects.pingPiece = pingPiece
  objects.paperPiece = paperPiece
  objects.pingFlame = pingFlame
  objects.paperFlame = paperFlame
  objects.pingSmoke = pingSmoke
  objects.paperSmoke = paperSmoke
  objects.lampCap = lampCap

  const dividerMaterial = new MeshBasicMaterial({ color: 0x52625a, transparent: true, opacity: .12 })
  for (const x of [-2.38, 2.38]) {
    const line = new Mesh(new PlaneGeometry(.018, 3.08), dividerMaterial)
    line.rotation.x = -Math.PI / 2
    line.position.set(x, .12, .08)
    root.add(line)
  }

  return objects
}
