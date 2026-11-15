import {
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from '../vendor/three.module.js'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import { SOLUTION_COLORS } from './materials.js'

const clamp = MathUtils.clamp
const smooth = MathUtils.smoothstep

function roundedBox(width, height, depth, radius, material, segments = 5) {
  const mesh = new Mesh(new RoundedBoxGeometry(width, height, depth, segments, radius), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function tubeBetween(points, radius, material, tubularSegments = 48) {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)))
  const mesh = new Mesh(new TubeGeometry(curve, tubularSegments, radius, 10, false), material)
  mesh.castShadow = true
  return mesh
}

function cylinderBetween(start, end, radius, material, radialSegments = 20) {
  const from = new Vector3(...start)
  const to = new Vector3(...end)
  const direction = to.clone().sub(from)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, direction.length(), radialSegments), material)
  mesh.position.copy(from).add(to).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize())
  mesh.castShadow = true
  return mesh
}

function setShadow(root) {
  root.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

export function makeNail(material, rustMaterial, length = 1.55, radius = 0.085) {
  const nail = new Group()
  const shaft = new Mesh(new CylinderGeometry(radius, radius * 0.94, length, 24), material)
  shaft.name = 'iron-nail-shaft'
  nail.add(shaft)

  const point = new Mesh(new ConeGeometry(radius * 0.98, 0.28, 24), material)
  point.position.y = -length / 2 - 0.14
  nail.add(point)

  const head = new Mesh(new CylinderGeometry(radius * 2.45, radius * 2.15, 0.09, 28), material)
  head.position.y = length / 2 + 0.045
  nail.add(head)

  if (rustMaterial) {
    const rustA = new Mesh(new TorusGeometry(radius * 1.02, 0.018, 8, 18), rustMaterial)
    rustA.rotation.x = Math.PI / 2
    rustA.position.y = -length * 0.18
    nail.add(rustA)
    const rustB = new Mesh(new SphereGeometry(radius * 0.48, 10, 8), rustMaterial)
    rustB.scale.set(1, 0.28, 0.34)
    rustB.position.set(radius * 0.72, length * 0.22, radius * 0.42)
    nail.add(rustB)
  }
  return setShadow(nail)
}

function makeRibbon(material, length = 1.48, width = 0.33, thickness = 0.045) {
  const ribbon = new Group()
  const count = 18
  for (let i = 0; i < count; i += 1) {
    const u = i / (count - 1)
    const nextU = Math.min(1, (i + 1) / (count - 1))
    const x = (u - 0.5) * length
    const y = Math.sin(u * Math.PI * 1.6) * 0.1 + u * u * 0.15
    const nextY = Math.sin(nextU * Math.PI * 1.6) * 0.1 + nextU * nextU * 0.15
    const segment = roundedBox(length / count * 1.12, thickness, width, 0.018, material, 3)
    segment.position.set(x, y, Math.sin(u * Math.PI) * 0.035)
    segment.rotation.z = Math.atan2(nextY - y, length / count)
    ribbon.add(segment)
  }
  return ribbon
}

function makeZincGranules(material, count = 7) {
  const root = new Group()
  for (let i = 0; i < count; i += 1) {
    const granule = new Mesh(new DodecahedronGeometry(0.16 + (i % 3) * 0.018, 0), material)
    granule.position.set((i % 4 - 1.5) * 0.28, Math.floor(i / 4) * 0.23, ((i * 7) % 3 - 1) * 0.11)
    granule.rotation.set(i * 0.31, i * 0.67, i * 0.23)
    granule.castShadow = true
    root.add(granule)
  }
  return root
}

function makePlate(material, width = 1.35, height = 0.58, depth = 0.075) {
  return roundedBox(width, height, depth, Math.min(height * 0.12, 0.055), material, 4)
}

function createObservationStation(materials) {
  const root = new Group()
  root.name = 'station-observe-metals'

  const tray = roundedBox(10.4, 0.18, 2.65, 0.15, materials.tray)
  tray.position.y = 0.22
  root.add(tray)
  const trayInset = roundedBox(10.05, 0.04, 2.3, 0.12, materials.trayDark)
  trayInset.position.y = 0.33
  root.add(trayInset)

  const positions = [-4.1, -2.05, 0, 2.05, 4.1]
  const wells = []
  positions.forEach((x) => {
    const well = roundedBox(1.72, 0.06, 1.72, 0.13, materials.tray)
    well.position.set(x, 0.39, 0)
    root.add(well)
    wells.push(well)
  })

  const samples = []
  const polishedPatches = []

  const magnesium = makeRibbon(materials.metals.magnesium)
  magnesium.position.set(positions[0], 0.55, 0)
  root.add(magnesium)
  samples.push(magnesium)
  const mgPatch = makeRibbon(materials.polished.magnesium, 0.52, 0.34, 0.052)
  mgPatch.position.set(positions[0] - 0.28, 0.57, 0.005)
  root.add(mgPatch)
  polishedPatches.push(mgPatch)

  const zinc = makeZincGranules(materials.metals.zinc)
  zinc.position.set(positions[1], 0.56, 0)
  root.add(zinc)
  samples.push(zinc)
  const znPatch = new Mesh(new DodecahedronGeometry(0.19, 0), materials.polished.zinc)
  znPatch.position.set(positions[1] - 0.14, 0.79, 0.12)
  root.add(znPatch)
  polishedPatches.push(znPatch)

  const iron = makeNail(materials.metals.iron, materials.rust, 1.45, 0.085)
  iron.rotation.z = Math.PI / 2
  iron.position.set(positions[2], 0.66, 0)
  root.add(iron)
  samples.push(iron)
  const fePatch = new Mesh(new CylinderGeometry(0.09, 0.09, 0.48, 24), materials.polished.iron)
  fePatch.rotation.z = Math.PI / 2
  fePatch.position.set(positions[2] - 0.18, 0.665, 0.06)
  root.add(fePatch)
  polishedPatches.push(fePatch)

  const copper = makePlate(materials.metals.copper, 1.34, 0.64, 0.09)
  copper.rotation.z = -0.08
  copper.position.set(positions[3], 0.69, 0)
  root.add(copper)
  samples.push(copper)
  const cuPatch = makePlate(materials.polished.copper, 0.56, 0.62, 0.024)
  cuPatch.rotation.z = -0.08
  cuPatch.position.set(positions[3] - 0.36, 0.69, 0.058)
  root.add(cuPatch)
  polishedPatches.push(cuPatch)

  const aluminum = makePlate(materials.metals.aluminum, 1.42, 0.5, 0.045)
  aluminum.rotation.z = 0.09
  aluminum.position.set(positions[4], 0.69, 0)
  root.add(aluminum)
  samples.push(aluminum)
  const alPatch = makePlate(materials.polished.aluminum, 0.62, 0.48, 0.018)
  alPatch.rotation.z = 0.09
  alPatch.position.set(positions[4] - 0.36, 0.69, 0.032)
  root.add(alPatch)
  polishedPatches.push(alPatch)

  polishedPatches.forEach((patch) => {
    patch.userData.baseScale = patch.scale.clone()
    patch.scale.setScalar(0.001)
    patch.visible = false
  })

  const sandpaper = new Group()
  const paper = roundedBox(0.92, 0.54, 0.06, 0.05, materials.sandpaper)
  const paperEdge = roundedBox(0.94, 0.56, 0.018, 0.05, materials.sandpaperEdge)
  paperEdge.position.z = -0.04
  sandpaper.add(paper, paperEdge)
  sandpaper.position.set(positions[0], 0.73, 0.2)
  sandpaper.rotation.z = -0.08
  root.add(sandpaper)

  return { root, positions, samples, polishedPatches, sandpaper }
}

function makeCircuitSample(material, kind) {
  const sample = new Group()
  if (kind === 'iron') {
    const nail = makeNail(material, null, 2.08, 0.075)
    nail.rotation.z = Math.PI / 2
    sample.add(nail)
  } else if (kind === 'zinc') {
    const plate = makePlate(material, 2.18, 0.35, 0.11)
    sample.add(plate)
  } else if (kind === 'magnesium') {
    const ribbon = makeRibbon(material, 2.16, 0.32, 0.05)
    ribbon.position.y = -0.05
    sample.add(ribbon)
  } else {
    sample.add(makePlate(material, 2.18, kind === 'copper' ? 0.44 : 0.38, kind === 'aluminum' ? 0.055 : 0.085))
  }
  return sample
}

function createCircuitStation(materials) {
  const root = new Group()
  root.name = 'station-conductivity-circuit'

  const board = roundedBox(11.4, 0.18, 3.35, 0.16, materials.tray)
  board.position.y = 0.2
  root.add(board)
  const boardInset = roundedBox(11.05, 0.025, 3.02, 0.12, materials.trayDark)
  boardInset.position.y = 0.305
  root.add(boardInset)

  const battery = new Group()
  const batteryBody = roundedBox(2.05, 1.0, 1.38, 0.16, materials.battery)
  batteryBody.position.y = 0.83
  battery.add(batteryBody)
  const batteryTop = roundedBox(1.66, 0.12, 1.05, 0.08, materials.rackDark)
  batteryTop.position.y = 1.39
  battery.add(batteryTop)
  ;[-0.48, 0.48].forEach((x, i) => {
    const terminal = new Mesh(new CylinderGeometry(0.11, 0.11, 0.18, 24), i === 0 ? materials.brass : materials.rackDark)
    terminal.position.set(x, 1.54, 0)
    battery.add(terminal)
  })
  battery.position.x = -4.35
  root.add(battery)

  const bulb = new Group()
  const bulbBase = new Mesh(new CylinderGeometry(0.43, 0.5, 0.58, 32), materials.brass)
  bulbBase.position.y = 0.6
  bulb.add(bulbBase)
  const bulbGlass = new Mesh(new SphereGeometry(0.63, 40, 28), materials.bulbGlass)
  bulbGlass.scale.y = 1.14
  bulbGlass.position.y = 1.35
  bulbGlass.renderOrder = 12
  bulb.add(bulbGlass)
  const filament = new Mesh(new TorusGeometry(0.2, 0.035, 10, 30, Math.PI), materials.bulbOff.clone())
  filament.rotation.z = Math.PI
  filament.position.y = 1.28
  bulb.add(filament)
  const bulbGlow = new Mesh(new SphereGeometry(0.7, 32, 22), new MeshBasicMaterial({
    color: 0xffbd55,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }))
  bulbGlow.scale.y = 1.18
  bulbGlow.position.y = 1.35
  bulbGlow.renderOrder = 20
  bulb.add(bulbGlow)
  const glow = new PointLight(0xffbf57, 0, 6, 2)
  glow.position.y = 1.4
  bulb.add(glow)
  bulb.position.x = 4.35
  root.add(bulb)

  const samples = ['magnesium', 'zinc', 'iron', 'copper', 'aluminum'].map((key) => {
    const sample = makeCircuitSample(materials.metals[key], key)
    sample.position.set(0, 0.88, 0.02)
    sample.visible = false
    root.add(sample)
    return sample
  })

  const leftContact = new Group()
  const leftPost = new Mesh(new CylinderGeometry(0.105, 0.105, 0.62, 24), materials.brass)
  leftPost.position.y = 0.54
  leftContact.add(leftPost)
  const leftPad = roundedBox(0.32, 0.14, 0.38, 0.035, materials.brass)
  leftPad.position.set(0, 0.84, 0)
  leftContact.add(leftPad)
  leftContact.position.x = -1.14
  root.add(leftContact)

  const rightContact = new Group()
  const rightPost = new Mesh(new CylinderGeometry(0.105, 0.105, 0.62, 24), materials.brass)
  rightPost.position.y = 0.54
  rightContact.add(rightPost)
  const rightPad = roundedBox(0.32, 0.14, 0.38, 0.035, materials.brass)
  rightPad.position.set(0, 0.84, 0)
  rightContact.add(rightPad)
  rightContact.position.x = 1.14
  root.add(rightContact)

  const redWire = tubeBetween([
    [-4.83, 1.55, 0], [-4.72, 2.14, 0], [-2.6, 2.22, 0], [-1.14, 0.86, 0],
  ], 0.052, materials.redWire, 56)
  root.add(redWire)
  const blueWireA = tubeBetween([
    [1.14, 0.86, 0], [2.2, 2.22, 0], [3.85, 2.18, 0], [4.35, 0.58, 0],
  ], 0.052, materials.blueWire, 56)
  root.add(blueWireA)
  const blueWireB = tubeBetween([
    [4.35, 0.45, 0], [4.4, -0.02, 0], [-3.87, -0.02, 0], [-3.87, 1.54, 0],
  ], 0.052, materials.blueWire, 72)
  root.add(blueWireB)

  const lowVoltageBadge = roundedBox(1.18, 0.08, 0.6, 0.06, materials.label)
  lowVoltageBadge.position.set(-4.35, 1.4, 0.71)
  root.add(lowVoltageBadge)

  return { root, samples, rightContact, filament, bulbGlow, glow }
}

function createTestTube(materials, radius = 0.46, wallHeight = 2.82) {
  const group = new Group()
  const bottomCenter = radius
  const wall = new Mesh(new CylinderGeometry(radius, radius, wallHeight, 48, 1, true), materials.glass)
  wall.position.y = bottomCenter + wallHeight / 2
  wall.renderOrder = 14
  group.add(wall)

  const innerWall = new Mesh(new CylinderGeometry(radius * 0.91, radius * 0.91, wallHeight * 0.98, 48, 1, true), materials.glassInner)
  innerWall.position.y = bottomCenter + wallHeight / 2
  innerWall.renderOrder = 13
  group.add(innerWall)

  const bottom = new Mesh(new SphereGeometry(radius, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), materials.glass)
  bottom.position.y = bottomCenter
  bottom.renderOrder = 14
  group.add(bottom)

  const rim = new Mesh(new TorusGeometry(radius, 0.036, 10, 48), materials.glassEdge)
  rim.rotation.x = Math.PI / 2
  rim.position.y = bottomCenter + wallHeight
  rim.renderOrder = 18
  group.add(rim)

  return { group, radius, bottomCenter, top: bottomCenter + wallHeight }
}

function createLiquid(materials, radius, maxHeight, material) {
  const root = new Group()
  const volume = new Mesh(new CylinderGeometry(radius, radius * 0.98, maxHeight, 40), material)
  volume.renderOrder = 8
  root.add(volume)
  const surfaceMaterial = materials.liquidSurface.clone()
  surfaceMaterial.color.copy(material.color)
  const surface = new Mesh(new CircleGeometry(radius, 40), surfaceMaterial)
  surface.rotation.x = -Math.PI / 2
  surface.renderOrder = 10
  root.add(surface)
  return { root, volume, surface, maxHeight, baseY: 0 }
}

function createAcidMetal(kind, materials) {
  const root = new Group()
  if (kind === 'magnesium') {
    const ribbon = makeRibbon(materials.metals.magnesium, 0.72, 0.16, 0.035)
    ribbon.rotation.y = 0.24
    root.add(ribbon)
  } else if (kind === 'zinc') {
    const granules = makeZincGranules(materials.metals.zinc, 4)
    granules.scale.setScalar(0.58)
    root.add(granules)
  } else if (kind === 'iron') {
    const nail = makeNail(materials.metals.iron, null, 0.72, 0.055)
    nail.rotation.z = Math.PI / 2
    root.add(nail)
  } else {
    const plate = makePlate(materials.metals.copper, 0.72, 0.24, 0.05)
    plate.rotation.z = -0.16
    root.add(plate)
  }
  return root
}

function createBubbleField(materials, count, seedOffset) {
  const root = new Group()
  const bubbles = []
  for (let i = 0; i < count; i += 1) {
    const size = 0.035 + ((i * 13 + seedOffset) % 5) * 0.009
    const bubble = new Mesh(new SphereGeometry(size, 14, 10), materials.bubble)
    const angle = (i * 2.399 + seedOffset) % (Math.PI * 2)
    const radius = 0.08 + ((i * 7 + seedOffset) % 10) / 10 * 0.2
    bubble.userData.phase = ((i * 17 + seedOffset * 11) % 97) / 97
    bubble.userData.x = Math.cos(angle) * radius
    bubble.userData.z = Math.sin(angle) * radius
    bubble.visible = false
    bubble.renderOrder = 22
    root.add(bubble)
    bubbles.push(bubble)
  }
  return { root, bubbles }
}

function createAcidStation(materials) {
  const root = new Group()
  root.name = 'station-metals-with-acid'
  const rack = new Group()
  const rackBase = roundedBox(7.6, 0.18, 2.1, 0.14, materials.rack)
  rackBase.position.y = 0.18
  rack.add(rackBase)
  const rackBar = roundedBox(7.0, 0.18, 0.46, 0.08, materials.rackDark)
  rackBar.position.set(0, 1.72, -0.3)
  rack.add(rackBar)
  ;[-3.15, 3.15].forEach((x) => {
    const support = new Mesh(new CylinderGeometry(0.075, 0.075, 1.55, 18), materials.rackDark)
    support.position.set(x, 0.95, -0.3)
    rack.add(support)
  })
  root.add(rack)

  const positions = [-2.4, -0.8, 0.8, 2.4]
  const kinds = ['magnesium', 'zinc', 'iron', 'copper']
  const bubbleCounts = [15, 10, 5, 0]
  const tubes = positions.map((x, index) => {
    const tube = createTestTube(materials, 0.47, 2.88)
    tube.group.position.set(x, 0.28, 0)
    root.add(tube.group)

    const acidMaterial = materials.acid.clone()
    const liquid = createLiquid(materials, 0.38, 1.62, acidMaterial)
    liquid.baseY = tube.bottomCenter * 0.92
    liquid.root.position.set(x, 0.28, 0)
    root.add(liquid.root)

    const metal = createAcidMetal(kinds[index], materials)
    metal.position.set(x, 0.78, 0.02)
    metal.userData.baseScale = metal.scale.clone()
    root.add(metal)

    const field = createBubbleField(materials, bubbleCounts[index], index + 1)
    field.root.position.set(x, 0.54, 0.03)
    root.add(field.root)

    return { ...tube, liquid, metal, bubbles: field.bubbles, rate: [1, 0.64, 0.23, 0][index], kind: kinds[index] }
  })

  const dropper = new Group()
  const bulb = new Mesh(new SphereGeometry(0.22, 24, 16), materials.rubber)
  bulb.scale.y = 1.35
  bulb.position.y = 0.46
  dropper.add(bulb)
  const glassStem = new Mesh(new CylinderGeometry(0.055, 0.035, 0.82, 18), materials.dropperGlass)
  glassStem.position.y = -0.05
  dropper.add(glassStem)
  const droplet = new Mesh(new SphereGeometry(0.055, 18, 12), materials.acid)
  droplet.scale.y = 1.3
  droplet.position.y = -0.54
  dropper.add(droplet)
  dropper.position.set(positions[0], 4.45, 0.05)
  root.add(dropper)

  const bottle = new Group()
  const bottleBody = roundedBox(1.22, 1.56, 1.0, 0.18, materials.glass)
  bottleBody.position.y = 1.02
  bottle.add(bottleBody)
  const bottleLiquid = roundedBox(1.02, 0.66, 0.78, 0.12, materials.acid)
  bottleLiquid.position.y = 0.72
  bottle.add(bottleLiquid)
  const neck = new Mesh(new CylinderGeometry(0.28, 0.34, 0.5, 30, 1, true), materials.glass)
  neck.position.y = 2.02
  bottle.add(neck)
  const cap = new Mesh(new CylinderGeometry(0.34, 0.34, 0.24, 30), materials.rubber)
  cap.position.y = 2.34
  bottle.add(cap)
  const labelBand = roundedBox(1.24, 0.34, 0.03, 0.05, materials.label)
  labelBand.position.set(0, 1.12, 0.51)
  bottle.add(labelBand)
  bottle.position.set(-3.65, 0.3, -0.15)
  root.add(bottle)

  return { root, positions, tubes, dropper, droplet, bottle }
}

function createDisplacementStation(materials) {
  const root = new Group()
  root.name = 'station-iron-copper-sulfate'
  const standBase = roundedBox(6.4, 0.18, 2.35, 0.15, materials.rack)
  standBase.position.y = 0.18
  root.add(standBase)

  const tube = createTestTube(materials, 0.76, 3.65)
  tube.group.position.set(0, 0.27, 0)
  root.add(tube.group)

  const solutionMaterial = materials.copperSulfate.clone()
  const liquid = createLiquid(materials, 0.65, 2.38, solutionMaterial)
  liquid.baseY = tube.bottomCenter * 0.9
  liquid.root.position.set(0, 0.27, 0)
  root.add(liquid.root)

  const standBar = roundedBox(4.8, 0.18, 0.5, 0.08, materials.rackDark)
  standBar.position.set(0, 2.22, -0.38)
  root.add(standBar)
  ;[-2.05, 2.05].forEach((x) => {
    const support = new Mesh(new CylinderGeometry(0.075, 0.075, 2.04, 18), materials.rackDark)
    support.position.set(x, 1.18, -0.38)
    root.add(support)
  })

  const nail = makeNail(materials.metals.iron, null, 2.35, 0.11)
  nail.position.set(0.05, 4.3, 0.02)
  root.add(nail)

  const deposits = []
  for (let i = 0; i < 48; i += 1) {
    const size = 0.025 + (i % 5) * 0.008
    const particle = new Mesh(new DodecahedronGeometry(size, 0), materials.copperDeposit)
    const angle = i * 2.399
    const radius = 0.115 + (i % 3) * 0.012
    particle.position.set(Math.cos(angle) * radius, -0.92 + ((i * 19) % 170) / 100, Math.sin(angle) * radius)
    particle.rotation.set(i * 0.2, i * 0.41, i * 0.17)
    particle.scale.setScalar(0.001)
    particle.visible = false
    nail.add(particle)
    deposits.push(particle)
  }

  const solutionHalo = new Mesh(new RingGeometry(0.8, 1.04, 48), new MeshBasicMaterial({
    color: 0x3a9bd0,
    transparent: true,
    opacity: 0.16,
    side: DoubleSide,
    depthWrite: false,
  }))
  solutionHalo.rotation.x = -Math.PI / 2
  solutionHalo.position.y = 0.34
  root.add(solutionHalo)

  return { root, tube, liquid, solutionMaterial, nail, deposits, solutionHalo }
}

function createFlame(materials) {
  const root = new Group()
  const outer = new Mesh(new SphereGeometry(0.44, 28, 20), materials.flameOuter)
  outer.scale.set(0.78, 1.75, 0.65)
  outer.position.y = 0.42
  root.add(outer)
  const mid = new Mesh(new SphereGeometry(0.31, 28, 20), materials.flameMid)
  mid.scale.set(0.78, 1.72, 0.68)
  mid.position.y = 0.31
  root.add(mid)
  const inner = new Mesh(new SphereGeometry(0.18, 24, 16), materials.flameInner)
  inner.scale.set(0.74, 1.6, 0.62)
  inner.position.y = 0.17
  root.add(inner)
  return { root, outer, mid, inner }
}

function createHeatingStation(materials) {
  const root = new Group()
  root.name = 'station-heat-copper'

  const platform = roundedBox(9.2, 0.18, 3.0, 0.16, materials.tray)
  platform.position.y = 0.18
  root.add(platform)

  const lamp = new Group()
  const reservoir = new Mesh(new SphereGeometry(0.72, 40, 28), materials.glass)
  reservoir.scale.y = 0.78
  reservoir.position.y = 0.74
  lamp.add(reservoir)
  const alcohol = new Mesh(new SphereGeometry(0.59, 36, 24), materials.acid.clone())
  alcohol.material.color.setHex(0xd9e8df)
  alcohol.material.opacity = 0.3
  alcohol.scale.y = 0.56
  alcohol.position.y = 0.64
  lamp.add(alcohol)
  const metalTop = new Mesh(new CylinderGeometry(0.29, 0.35, 0.25, 30), materials.brass)
  metalTop.position.y = 1.35
  lamp.add(metalTop)
  const wick = new Mesh(new CylinderGeometry(0.085, 0.085, 0.32, 18), materials.rubber)
  wick.position.y = 1.62
  lamp.add(wick)
  const flame = createFlame(materials)
  flame.root.position.y = 1.72
  lamp.add(flame.root)
  const flameLight = new PointLight(0xff8a35, 1.4, 5.5, 2)
  flameLight.position.y = 2.15
  lamp.add(flameLight)
  lamp.position.x = -0.8
  root.add(lamp)

  const coolingPad = roundedBox(3.1, 0.2, 1.7, 0.14, materials.ceramic)
  coolingPad.position.set(3.0, 0.38, 0)
  root.add(coolingPad)
  const padInset = roundedBox(2.65, 0.035, 1.28, 0.1, materials.trayDark)
  padInset.position.set(3.0, 0.5, 0)
  root.add(padInset)

  const heldAssembly = new Group()
  const copperPlate = makePlate(materials.metals.copper, 1.7, 0.82, 0.12)
  copperPlate.position.z = 0.02
  heldAssembly.add(copperPlate)
  const oxide = makePlate(materials.copperOxide, 1.64, 0.76, 0.035)
  oxide.position.set(-0.81, 0, 0.092)
  oxide.scale.x = 0.001
  oxide.visible = false
  heldAssembly.add(oxide)

  const tongUpper = cylinderBetween([0.78, 0.2, 0], [3.55, 0.48, 0], 0.065, materials.rackDark)
  const tongLower = cylinderBetween([0.78, -0.2, 0], [3.55, -0.48, 0], 0.065, materials.rackDark)
  const upperTip = roundedBox(0.5, 0.13, 0.28, 0.035, materials.rackDark)
  upperTip.position.set(0.78, 0.2, 0)
  const lowerTip = roundedBox(0.5, 0.13, 0.28, 0.035, materials.rackDark)
  lowerTip.position.set(0.78, -0.2, 0)
  const handle = new Mesh(new TorusGeometry(0.5, 0.075, 12, 36, Math.PI), materials.rackDark)
  handle.rotation.z = Math.PI / 2
  handle.position.x = 3.62
  heldAssembly.add(tongUpper, tongLower, upperTip, lowerTip, handle)
  heldAssembly.position.set(-0.8, 3.05, 0)
  root.add(heldAssembly)

  return { root, lamp, flame, flameLight, heldAssembly, copperPlate, oxide, coolingPad }
}

function updateLiquid(liquid, fraction) {
  const height = Math.max(0.001, liquid.maxHeight * fraction)
  liquid.volume.scale.y = height / liquid.maxHeight
  liquid.volume.position.y = liquid.baseY + height / 2
  liquid.surface.position.y = liquid.baseY + height
  liquid.root.visible = fraction > 0.005
}

export function createApparatus(materials) {
  const root = new Group()
  root.name = 'common-metals-apparatus'

  const observation = createObservationStation(materials)
  const circuit = createCircuitStation(materials)
  const acid = createAcidStation(materials)
  const displacement = createDisplacementStation(materials)
  const heating = createHeatingStation(materials)
  const stations = [observation.root, circuit.root, acid.root, displacement.root, heating.root]
  const stationLayouts = [
    { position: [-5.05, 0.003, 0.82], scale: 0.36, label: '金属样品' },
    { position: [-4.65, 0.017, -1.05], scale: 0.3, label: '低压电路' },
    { position: [-0.62, 0, 0], scale: 0.56, label: '金属与酸' },
    { position: [2.45, 0.012, 0.08], scale: 0.42, label: '铁与硫酸铜' },
    { position: [4.65, 0.014, 0.02], scale: 0.4, label: '铜片加热' },
  ]
  const haloSizes = [
    [3.35, 2.0],
    [3.1, 2.25],
    [4.65, 2.5],
    [2.85, 2.35],
    [3.65, 2.25],
  ]
  const focusHalos = stationLayouts.map((layout, index) => {
    const material = new MeshBasicMaterial({
      color: 0x65bca6,
      transparent: true,
      opacity: 0.018,
      depthWrite: false,
    })
    const halo = roundedBox(haloSizes[index][0], 0.018, haloSizes[index][1], 0.18, material)
    halo.name = `station-focus-${index}`
    halo.position.set(layout.position[0], 0.059, layout.position[2])
    halo.castShadow = false
    halo.receiveShadow = false
    halo.renderOrder = -1
    root.add(halo)
    return halo
  })

  stations.forEach((station, index) => {
    const layout = stationLayouts[index]
    station.visible = true
    station.position.set(...layout.position)
    station.scale.setScalar(layout.scale)
    station.userData.baseScale = layout.scale
    station.userData.stationLabel = layout.label
    root.add(station)
  })

  function showStation(step) {
    const stationIndex = step === 0 ? 0 : step === 1 ? 1 : step <= 3 ? 2 : step === 4 ? 3 : 4
    stations.forEach((station, index) => {
      station.visible = true
      const emphasis = index === stationIndex ? 1.035 : 1
      station.scale.setScalar(station.userData.baseScale * emphasis)
    })
    focusHalos.forEach((halo, index) => {
      halo.material.opacity = index === stationIndex ? 0.12 : 0.014
      halo.material.color.setHex(index === stationIndex ? 0x62bda5 : 0xa6b9b3)
    })
    return stationIndex
  }

  function updateObservation(progress, time, selectedMetal = null) {
    observation.samples.forEach((sample) => { sample.visible = true })
    const manual = Number.isInteger(selectedMetal)
    const stage = manual ? clamp(selectedMetal, 0, 4) + 0.5 : clamp(progress * 5, 0, 4.999)
    const index = Math.min(4, Math.floor(stage))
    const local = stage - index
    const sandingOffset = manual ? Math.sin(time * 4.8) * 0.14 : Math.sin(local * Math.PI * 5) * 0.28
    observation.sandpaper.position.x = observation.positions[index] + sandingOffset
    observation.sandpaper.position.y = 0.73 + (manual ? 0.04 : Math.sin(local * Math.PI) * 0.04)
    observation.sandpaper.rotation.z = -0.12 + Math.sin(time * 6) * 0.04
    observation.polishedPatches.forEach((patch, patchIndex) => {
      const reveal = manual ? Number(patchIndex === index) : clamp(progress * 5 - patchIndex, 0, 1)
      patch.visible = reveal > 0.02
      patch.scale.copy(patch.userData.baseScale).multiplyScalar(Math.max(0.001, smooth(reveal, 0.05, 0.85)))
    })
    return { metalIndex: index, manual }
  }

  function updateCircuit(progress, time, selectedMetal = null) {
    const manual = Number.isInteger(selectedMetal)
    const stage = manual ? clamp(selectedMetal, 0, 4) + 0.999 : clamp(progress * 5, 0, 4.999)
    const index = Math.min(4, Math.floor(stage))
    const local = manual || progress >= 0.999 ? 1 : stage - index
    circuit.samples.forEach((sample, sampleIndex) => { sample.visible = sampleIndex === index })
    observation.samples.forEach((sample, sampleIndex) => { sample.visible = sampleIndex !== index })
    const closure = manual || progress >= 0.999 ? 1 : smooth(local, 0.08, 0.28) * (1 - smooth(local, 0.9, 0.99))
    circuit.rightContact.position.y = MathUtils.lerp(0.5, 0, closure)
    circuit.rightContact.rotation.z = MathUtils.lerp(-0.25, 0, closure)
    const on = closure > 0.88
    circuit.filament.material.color.setHex(on ? 0xffe0a0 : 0x4f4638)
    circuit.filament.material.emissive.setHex(on ? 0xffa52d : 0x1f160b)
    circuit.filament.material.emissiveIntensity = on ? 3.2 + Math.sin(time * 8) * 0.08 : 0.05
    circuit.glow.intensity = on ? 2.6 : 0
    circuit.bulbGlow.material.opacity = on ? 0.18 + Math.sin(time * 7) * 0.012 : 0
    return { metalIndex: index, closed: on, manual }
  }

  function updateAcid(step, progress, time) {
    acid.dropper.visible = step === 2
    acid.bottle.visible = step === 2
    const ratesMode = step === 3
    let currentTube = 0

    acid.tubes.forEach((tube, index) => {
      const fill = ratesMode ? 1 : clamp(progress * 4 - index, 0, 1)
      updateLiquid(tube.liquid, fill)
      const reaction = ratesMode
        ? 0.18 + progress * 0.82
        : clamp((progress * 4 - index - 0.62) / 1.5, 0, 1)
      const consumption = [0.5, 0.32, 0.11, 0][index] * reaction
      tube.metal.scale.copy(tube.metal.userData.baseScale).multiplyScalar(1 - consumption)
      tube.liquid.volume.material.color.copy(SOLUTION_COLORS.acidClear)
      tube.liquid.surface.material.color.copy(SOLUTION_COLORS.acidClear)
      if (index === 2) {
        tube.liquid.volume.material.color.lerp(SOLUTION_COLORS.acidIronPaleGreen, reaction * 0.72)
        tube.liquid.surface.material.color.copy(tube.liquid.volume.material.color)
      }
      tube.bubbles.forEach((bubble, bubbleIndex) => {
        const allowed = fill > 0.72 && tube.rate > 0 && bubbleIndex < Math.ceil(tube.bubbles.length * Math.max(tube.rate, 0.35))
        bubble.visible = allowed
        if (!allowed) return
        const speed = 0.28 + tube.rate * 0.78
        const cycle = (time * speed + bubble.userData.phase) % 1
        bubble.position.set(
          bubble.userData.x + Math.sin(time * 1.5 + bubbleIndex) * 0.018,
          0.16 + cycle * 1.35,
          bubble.userData.z,
        )
        bubble.scale.setScalar(0.82 + cycle * 0.38)
      })
      if (fill > 0.02 && fill < 1) currentTube = index
    })

    if (!ratesMode) {
      const fillStage = clamp(progress * 4, 0, 3.999)
      currentTube = Math.min(3, Math.floor(fillStage))
      const local = fillStage - currentTube
      acid.dropper.position.x = acid.positions[currentTube]
      acid.dropper.position.y = 4.35 - Math.sin(clamp(local, 0, 1) * Math.PI) * 0.28
      acid.droplet.visible = local > 0.25 && local < 0.82
    }
    return { currentTube }
  }

  function updateDisplacement(progress) {
    const immersion = smooth(progress, 0, 0.2)
    displacement.nail.position.y = MathUtils.lerp(4.3, 2.43, immersion)
    const reaction = smooth(progress, 0.16, 1)
    displacement.deposits.forEach((particle, index) => {
      const reveal = clamp(reaction * 1.35 - index / displacement.deposits.length * 0.42, 0, 1)
      particle.visible = reveal > 0.02
      particle.scale.setScalar(Math.max(0.001, smooth(reveal, 0.03, 0.88)))
    })
    displacement.solutionMaterial.color.copy(SOLUTION_COLORS.copperSulfate).lerp(SOLUTION_COLORS.paleIronSulfate, reaction * 0.82)
    displacement.liquid.surface.material.color.copy(displacement.solutionMaterial.color)
    displacement.solutionHalo.material.color.copy(displacement.solutionMaterial.color)
    updateLiquid(displacement.liquid, 1)
    return { reaction }
  }

  function updateHeating(progress, time) {
    const oxidation = smooth(progress, 0.12, 0.7)
    heating.oxide.visible = oxidation > 0.01
    heating.oxide.scale.x = Math.max(0.001, oxidation)
    heating.oxide.position.x = -0.81 * (1 - oxidation)
    const moving = smooth(progress, 0.72, 0.93)
    heating.heldAssembly.position.x = MathUtils.lerp(-0.8, 2.2, moving)
    heating.heldAssembly.position.y = MathUtils.lerp(3.05, 0.86, moving)
    heating.heldAssembly.rotation.x = MathUtils.lerp(0, -0.72, moving)
    heating.heldAssembly.rotation.z = MathUtils.lerp(0, -0.08, moving)
    const flameOn = progress < 0.76
    heating.flame.root.visible = flameOn
    heating.flameLight.intensity = flameOn ? 1.25 + Math.sin(time * 9) * 0.14 : 0
    if (flameOn) {
      const flicker = 1 + Math.sin(time * 10.5) * 0.05 + Math.sin(time * 6.2) * 0.035
      heating.flame.outer.scale.y = 1.75 * flicker
      heating.flame.mid.scale.y = 1.72 * (2 - flicker)
      heating.flame.root.rotation.z = Math.sin(time * 7.3) * 0.025
    }
    return { oxidation, cooling: progress >= 0.76 }
  }

  function resetAll() {
    observation.samples.forEach((sample) => { sample.visible = true })
    observation.polishedPatches.forEach((patch) => { patch.visible = false })
    observation.sandpaper.position.set(observation.positions[0], 0.73, 0.2)
    circuit.samples.forEach((sample) => { sample.visible = false })
    circuit.rightContact.position.y = 0.5
    circuit.rightContact.rotation.z = -0.25
    circuit.filament.material.color.setHex(0x4f4638)
    circuit.filament.material.emissive.setHex(0x1f160b)
    circuit.filament.material.emissiveIntensity = 0.05
    circuit.glow.intensity = 0
    circuit.bulbGlow.material.opacity = 0
    acid.tubes.forEach((tube) => {
      tube.bubbles.forEach((bubble) => { bubble.visible = false })
      tube.metal.scale.copy(tube.metal.userData.baseScale)
      updateLiquid(tube.liquid, 0)
    })
    acid.dropper.visible = false
    acid.bottle.visible = false
    displacement.deposits.forEach((particle) => { particle.visible = false })
    displacement.solutionMaterial.color.copy(SOLUTION_COLORS.copperSulfate)
    displacement.liquid.surface.material.color.copy(SOLUTION_COLORS.copperSulfate)
    displacement.solutionHalo.material.color.copy(SOLUTION_COLORS.copperSulfate)
    updateLiquid(displacement.liquid, 1)
    displacement.nail.position.y = 4.3
    heating.oxide.visible = false
    heating.oxide.scale.x = 0.001
    heating.heldAssembly.position.set(2.2, 0.86, 0)
    heating.heldAssembly.rotation.set(-0.72, 0, -0.08)
    heating.flame.root.visible = false
    heating.flameLight.intensity = 0
  }

  return {
    root,
    stations,
    stationLayouts,
    focusHalos,
    observation,
    circuit,
    acid,
    displacement,
    heating,
    showStation,
    resetAll,
    updateObservation,
    updateCircuit,
    updateAcid,
    updateDisplacement,
    updateHeating,
  }
}

export { roundedBox }
