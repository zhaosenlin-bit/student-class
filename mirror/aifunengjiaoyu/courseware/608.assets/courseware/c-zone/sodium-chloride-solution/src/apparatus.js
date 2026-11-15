import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  LinearFilter,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  SRGBColorSpace,
} from '../vendor/three.module.js'
import { roundedBox, textPlane } from './geometry.js'

const FRONT_Z = 0.62

function lathe(points, material, segments = 48) {
  const geometry = new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), segments)
  geometry.computeVertexNormals()
  return new Mesh(geometry, material)
}

function alignCylinder(mesh, start, end) {
  const direction = new Vector3().subVectors(end, start)
  const length = direction.length()
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize())
  mesh.scale.y = length
  mesh.userData.baseScaleY = length
}

function shadowDisc(radiusX, radiusZ, opacity = 0.12) {
  const disc = new Mesh(
    new CircleGeometry(1, 64),
    new MeshBasicMaterial({ color: 0x294238, transparent: true, opacity, depthWrite: false }),
  )
  disc.rotation.x = -Math.PI / 2
  disc.scale.set(radiusX, radiusZ, 1)
  disc.position.y = 0.018
  disc.renderOrder = -2
  return disc
}

function canvasScaleTexture(draw) {
  const canvas = document.createElement('canvas')
  // 较宽的周向纹理把印刷区域压缩到器皿正面约 25°，避免文字横跨半个杯壁。
  canvas.width = 2048
  canvas.height = 2048
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  draw(context, canvas.width, canvas.height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function printedScaleMaterial(texture) {
  return new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  })
}

function createCylinderScaleShell(radius, height) {
  const texture = canvasScaleTexture((context, width, canvasHeight) => {
    const top = 54
    const bottom = canvasHeight - 54
    const tickRight = width * 0.48
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    for (let ml = 0; ml <= 50; ml += 1) {
      const y = bottom - (ml / 50) * (bottom - top)
      const major = ml % 10 === 0
      const middle = ml % 5 === 0
      const length = major ? 132 : middle ? 94 : 58
      context.strokeStyle = ml === 47 ? '#c97820' : '#29483d'
      context.lineWidth = ml === 47 ? 13 : major ? 10 : 7
      context.beginPath()
      context.moveTo(tickRight - length, y)
      context.lineTo(tickRight, y)
      context.stroke()
      if (major && ml > 0) {
        context.fillStyle = '#244238'
        context.font = '800 74px ui-monospace, SFMono-Regular, Menlo, monospace'
        context.fillText(String(ml), tickRight + 24, y)
      }
    }
    context.fillStyle = '#49665b'
    context.font = '750 54px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.fillText('50 mL', width * 0.525, canvasHeight - 124)
  })
  const shell = new Mesh(
    new CylinderGeometry(radius + 0.008, radius + 0.008, height, 128, 1, true, -Math.PI, Math.PI * 2),
    printedScaleMaterial(texture),
  )
  shell.name = 'curved-one-millilitre-scale'
  shell.renderOrder = 30
  return shell
}

function createBeakerScaleShell(radius, height) {
  const texture = canvasScaleTexture((context, width, canvasHeight) => {
    const tickRight = width * 0.48
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    for (let ml = 20; ml <= 80; ml += 20) {
      const localY = 0.17 + ml * 0.0125
      const y = canvasHeight * (1 - localY / height)
      context.strokeStyle = '#34584b'
      context.lineWidth = 11
      context.beginPath()
      context.moveTo(tickRight - 132, y)
      context.lineTo(tickRight, y)
      context.stroke()
      context.fillStyle = '#34584b'
      context.font = '800 76px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.fillText(String(ml), tickRight + 24, y)
    }
    context.fillStyle = '#34584b'
    context.font = '800 66px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.fillText('100 mL', width * 0.525, canvasHeight * 0.18)
  })
  const shell = new Mesh(
    new CylinderGeometry(radius + 0.008, radius * 0.94 + 0.008, height, 128, 1, true, -Math.PI, Math.PI * 2),
    printedScaleMaterial(texture),
  )
  shell.name = 'curved-beaker-scale'
  shell.renderOrder = 30
  return shell
}

function makeCrystalCloud(material, count, radiusX, radiusZ, height = 0.12) {
  const group = new Group()
  const geometry = new DodecahedronGeometry(0.045, 0)
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963
    const radial = Math.sqrt((index + 0.5) / count)
    const crystal = new Mesh(geometry, material)
    crystal.position.set(
      Math.cos(angle) * radiusX * radial,
      (index % 5) * height * 0.22,
      Math.sin(angle) * radiusZ * radial,
    )
    const scale = 0.52 + ((index * 7) % 9) * 0.055
    crystal.scale.set(scale * 1.15, scale * 0.78, scale)
    crystal.rotation.set(index * 0.71, index * 0.43, index * 0.29)
    crystal.castShadow = true
    crystal.userData.home = crystal.position.clone()
    crystal.userData.baseScale = crystal.scale.clone()
    group.add(crystal)
  }
  return group
}

function createElectronicBalance(materials) {
  const group = new Group()
  group.name = 'electronic-balance'
  group.position.set(-3.55, 0, 0.1)
  group.add(shadowDisc(1.32, 0.8, 0.14))

  const base = roundedBox(2.35, 0.34, 1.38, 0.13, materials.whitePlastic)
  base.position.y = 0.2
  group.add(base)

  const upperDeck = roundedBox(2.1, 0.12, 1.2, 0.1, materials.whitePlastic)
  upperDeck.position.set(0, 0.38, -0.03)
  group.add(upperDeck)

  const front = roundedBox(1.72, 0.3, 0.1, 0.05, materials.dark)
  front.position.set(0, 0.22, 0.72)
  group.add(front)

  const display = textPlane('0.0 g', 0.88, 0.22, {
    background: '#16231f',
    color: '#bff48f',
    border: 'rgba(210,255,184,.3)',
    monospace: true,
    fontSize: 72,
    weight: 800,
  })
  display.position.set(-0.28, 0.22, 0.78)
  group.add(display)

  const tare = textPlane('TARE', 0.38, 0.16, {
    background: '#6ea553',
    color: '#ffffff',
    fontSize: 38,
    weight: 800,
  })
  tare.position.set(0.64, 0.22, 0.78)
  group.add(tare)

  const tray = new Mesh(new CylinderGeometry(0.86, 0.8, 0.07, 64), materials.metal)
  tray.scale.z = 0.68
  tray.position.y = 0.48
  tray.castShadow = true
  tray.receiveShadow = true
  group.add(tray)

  ;[-0.84, 0.84].forEach((x) => {
    const foot = new Mesh(new CylinderGeometry(0.12, 0.13, 0.09, 24), materials.rubber)
    foot.position.set(x, 0.01, 0.44)
    group.add(foot)
  })

  const brand = textPlane('电子天平', 0.8, 0.14, { color: '#52655d', fontSize: 42, weight: 650 })
  brand.position.set(0.65, 0.43, 0.69)
  group.add(brand)
  return { group, display, tare }
}

function createWeighingPaper(materials) {
  const group = new Group()
  group.name = 'weighing-paper-cargo'
  group.position.set(-3.55, 0.54, 0.08)
  // 尺寸受天平椭圆托盘约束，四角不再悬出托盘边缘。
  const paper = roundedBox(1.2, 0.018, 0.68, 0.02, materials.paper, 3)
  paper.position.y = 0.02
  group.add(paper)
  const foldA = roundedBox(1.14, 0.025, 0.035, 0.01, materials.paper, 3)
  foldA.position.set(0, 0.065, -0.3)
  foldA.rotation.x = 0.35
  group.add(foldA)
  const foldB = foldA.clone()
  foldB.position.z = 0.3
  foldB.rotation.x = -0.35
  group.add(foldB)
  const crystals = makeCrystalCloud(materials.salt, 54, 0.43, 0.2, 0.16)
  crystals.position.y = 0.085
  group.add(crystals)
  return { group, paper, crystals }
}

function createSpatula(materials) {
  const group = new Group()
  group.name = 'medicine-spatula'
  group.position.set(-1.95, 0.19, 0.72)
  const handle = roundedBox(1.28, 0.055, 0.12, 0.025, materials.metal)
  handle.position.x = -0.5
  group.add(handle)
  const bowl = new Mesh(new SphereGeometry(0.25, 32, 16), materials.metal)
  bowl.scale.set(1.4, 0.16, 0.55)
  bowl.position.x = 0.25
  group.add(bowl)
  group.rotation.z = 0.08
  return group
}

function createSaltBottle(materials) {
  const group = new Group()
  group.name = 'sodium-chloride-reagent-bottle'
  group.position.set(-1.72, 0.06, -0.22)
  group.add(shadowDisc(0.55, 0.48, 0.1))
  const body = lathe([
    [0, 0], [0.38, 0], [0.43, 0.12], [0.43, 1.15], [0.35, 1.28], [0.23, 1.36], [0.23, 1.55], [0, 1.55],
  ], materials.reagentGlass)
  body.renderOrder = 8
  group.add(body)
  const storedSalt = new Mesh(new CylinderGeometry(0.34, 0.34, 0.68, 36), materials.salt)
  storedSalt.position.y = 0.38
  storedSalt.scale.z = 0.92
  storedSalt.castShadow = true
  group.add(storedSalt)
  const innerCrystals = makeCrystalCloud(materials.salt, 36, 0.3, 0.25, 0.1)
  innerCrystals.position.y = 0.74
  group.add(innerCrystals)
  const cap = new Mesh(new CylinderGeometry(0.27, 0.29, 0.25, 32), materials.blackPlastic)
  cap.position.y = 1.5
  cap.castShadow = true
  group.add(cap)
  const label = textPlane('氯化钠', 0.68, 0.38, {
    background: '#f7f3e7', color: '#303d36', border: '#d8cfaf', fontSize: 76, weight: 850,
  })
  label.position.set(0, 0.91, 0.43)
  group.add(label)
  const formula = textPlane('NaCl · 固体', 0.58, 0.18, { background: 'rgba(255,255,255,.82)', color: '#66756d', fontSize: 46, weight: 750 })
  formula.position.set(0, 0.65, 0.44)
  group.add(formula)
  const typeLabel = textPlane('广口试剂瓶', 0.82, 0.18, { background: 'rgba(248,250,244,.9)', color: '#446252', border: '#cdd9cb', fontSize: 44, weight: 750 })
  typeLabel.position.set(0, 0.31, 0.48)
  group.add(typeLabel)
  return { group, cap }
}

function createWashBottle(materials) {
  const group = new Group()
  group.name = 'distilled-water-wash-bottle'
  group.position.set(1.05, 0.04, -0.78)
  const body = lathe([
    [0, 0], [0.38, 0], [0.48, 0.13], [0.46, 1.02], [0.34, 1.22], [0.18, 1.3], [0.18, 1.48], [0, 1.48],
  ], materials.whitePlastic)
  body.material = body.material.clone()
  body.material.transparent = true
  body.material.opacity = 0.78
  body.renderOrder = 9
  group.add(body)
  const storedWater = new Mesh(new CylinderGeometry(0.38, 0.38, 0.72, 40), materials.water)
  storedWater.position.y = 0.42
  storedWater.renderOrder = 8
  group.add(storedWater)
  const neck = new Mesh(new CylinderGeometry(0.12, 0.15, 0.22, 24), materials.whitePlastic)
  neck.position.y = 1.51
  group.add(neck)
  const nozzle = new Mesh(new CylinderGeometry(0.035, 0.045, 0.82, 16), materials.whitePlastic)
  nozzle.position.set(0.32, 1.78, 0)
  nozzle.rotation.z = -0.86
  group.add(nozzle)
  const nozzleTip = new Group()
  nozzleTip.name = 'wash-bottle-nozzle-tip'
  nozzleTip.position.set(0.631, 2.047, 0)
  group.add(nozzleTip)
  const label = textPlane('蒸馏水', 0.62, 0.28, { background: '#eef6f1', color: '#4d6d60', border: '#c7ded3', fontSize: 58 })
  label.position.set(0, 0.78, 0.48)
  group.add(label)
  const typeLabel = textPlane('洗瓶', 0.46, 0.17, { background: 'rgba(248,250,244,.9)', color: '#4a6659', border: '#cad8ce', fontSize: 46, weight: 760 })
  typeLabel.position.set(0, 0.28, 0.5)
  group.add(typeLabel)
  return { group, nozzle, nozzleTip }
}

function createGraduatedCylinder(materials) {
  const rig = new Group()
  rig.name = '50ml-graduated-cylinder'
  rig.position.set(0.05, 0.08, 0.2)
  rig.add(shadowDisc(0.62, 0.42, 0.1))
  const innerBottom = 0.27
  const scaleHeight = 2.08
  const outerHeight = 2.35
  const radius = 0.34

  const foot = new Mesh(new CylinderGeometry(0.56, 0.56, 0.075, 64), materials.glass)
  foot.position.y = 0.07
  foot.renderOrder = 8
  rig.add(foot)
  const stem = new Mesh(new CylinderGeometry(0.12, 0.14, 0.16, 32), materials.glass)
  stem.position.y = 0.17
  rig.add(stem)
  const wall = new Mesh(new CylinderGeometry(radius, radius, outerHeight, 64, 1, true), materials.glass)
  wall.position.y = innerBottom + outerHeight / 2 - 0.1
  wall.renderOrder = 12
  rig.add(wall)
  const bottom = new Mesh(new CircleGeometry(radius, 64), materials.glass)
  bottom.rotation.x = -Math.PI / 2
  bottom.position.y = innerBottom - 0.1
  bottom.renderOrder = 11
  rig.add(bottom)
  const rim = new Mesh(new TorusGeometry(radius + 0.006, 0.022, 12, 64), materials.glassEdge)
  rim.rotation.x = Math.PI / 2
  rim.position.y = innerBottom + outerHeight - 0.1
  rim.renderOrder = 16
  rig.add(rim)
  const spout = roundedBox(0.16, 0.028, 0.12, 0.012, materials.glass)
  spout.position.set(radius + 0.045, innerBottom + outerHeight - 0.105, 0.04)
  spout.rotation.y = -0.18
  rig.add(spout)

  // 刻线与数字使用圆柱 UV 贴印层，侧视时会随筒壁弯曲，不再像平面卡片悬浮。
  const scaleShell = createCylinderScaleShell(radius, scaleHeight)
  scaleShell.position.y = innerBottom + scaleHeight / 2
  rig.add(scaleShell)

  const fillTarget = new Group()
  fillTarget.name = 'graduated-cylinder-fill-target'
  fillTarget.position.set(0, innerBottom + outerHeight - 0.13, 0)
  rig.add(fillTarget)
  const pourAnchor = new Group()
  pourAnchor.name = 'graduated-cylinder-pour-anchor'
  pourAnchor.position.set(radius + 0.055, innerBottom + outerHeight - 0.105, 0.04)
  rig.add(pourAnchor)

  const liquid = new Mesh(new CylinderGeometry(0.3, 0.3, 1, 48), materials.water)
  liquid.renderOrder = 13
  rig.add(liquid)
  const meniscus = lathe([[0, -0.035], [0.1, -0.031], [0.2, -0.018], [0.3, 0]], materials.waterSurface, 64)
  meniscus.renderOrder = 17
  rig.add(meniscus)
  const marker47 = textPlane('47 mL', 0.56, 0.2, { background: '#fff5df', color: '#9b5d18', border: '#e5b369', monospace: true, fontSize: 56, weight: 850 })
  marker47.position.set(0.55, innerBottom + (47 / 50) * scaleHeight, radius + 0.03)
  rig.add(marker47)
  return { rig, liquid, meniscus, marker47, fillTarget, pourAnchor, innerBottom, scaleHeight, radius }
}

function createEyeLine(materials, cylinder) {
  const group = new Group()
  group.name = 'horizontal-eye-line'
  group.position.copy(cylinder.rig.position)
  const readY = cylinder.innerBottom + (47 / 50) * cylinder.scaleHeight
  const line = new Line(
    new BufferGeometry().setFromPoints([new Vector3(-0.03, readY, FRONT_Z), new Vector3(-1.05, readY, FRONT_Z)]),
    new LineDashedMaterial({ color: 0xd58b32, dashSize: 0.08, gapSize: 0.045, linewidth: 1, transparent: true, opacity: 0.95 }),
  )
  line.computeLineDistances()
  line.renderOrder = 40
  group.add(line)
  const eyeWhite = new Mesh(new SphereGeometry(0.18, 32, 16), materials.whitePlastic)
  eyeWhite.scale.set(1.28, 0.48, 0.34)
  eyeWhite.position.set(-1.22, readY, FRONT_Z)
  group.add(eyeWhite)
  const pupil = new Mesh(new SphereGeometry(0.055, 24, 12), materials.dark)
  pupil.position.set(-1.22, readY, FRONT_Z + 0.08)
  group.add(pupil)
  const label = textPlane('视线与凹液面最低处水平', 1.55, 0.22, { background: 'rgba(255,250,237,.92)', color: '#8a5a25', border: '#e5bd84', fontSize: 48, weight: 750 })
  label.position.set(-0.62, readY + 0.24, FRONT_Z)
  group.add(label)
  return group
}

function createDropper(materials) {
  const group = new Group()
  group.name = 'vertical-suspended-dropper'
  group.position.set(0.05, 3.66, 0.24)
  const bulb = lathe([[0, 0], [0.12, 0.03], [0.17, 0.15], [0.13, 0.33], [0.06, 0.4], [0, 0.4]], materials.dropperRubber, 32)
  bulb.position.y = 0.06
  group.add(bulb)
  const collar = new Mesh(new CylinderGeometry(0.09, 0.1, 0.1, 24), materials.dropperRubber)
  collar.position.y = 0.02
  group.add(collar)
  const tube = new Mesh(new CylinderGeometry(0.035, 0.055, 0.58, 24), materials.glass)
  tube.position.y = -0.33
  tube.renderOrder = 18
  group.add(tube)
  const tip = new Mesh(new CylinderGeometry(0.012, 0.032, 0.22, 20), materials.glass)
  tip.position.y = -0.73
  group.add(tip)
  const droplet = new Mesh(new SphereGeometry(0.045, 24, 16), materials.water)
  droplet.scale.y = 1.35
  droplet.position.y = -0.89
  droplet.renderOrder = 22
  group.add(droplet)
  return { group, bulb, droplet }
}

function createBeaker(materials) {
  const group = new Group()
  group.name = 'mixing-beaker'
  group.position.set(2.28, 0.07, 0.18)
  group.add(shadowDisc(0.83, 0.68, 0.12))
  const radius = 0.68
  const height = 1.5
  const wall = new Mesh(new CylinderGeometry(radius, radius * 0.94, height, 64, 1, true), materials.glass)
  wall.position.y = height / 2 + 0.05
  wall.renderOrder = 12
  group.add(wall)
  const base = new Mesh(new CircleGeometry(radius * 0.94, 64), materials.glass)
  base.rotation.x = -Math.PI / 2
  base.position.y = 0.05
  base.renderOrder = 11
  group.add(base)
  const rim = new Mesh(new TorusGeometry(radius, 0.025, 12, 64), materials.glassEdge)
  rim.rotation.x = Math.PI / 2
  rim.position.y = height + 0.05
  rim.renderOrder = 18
  group.add(rim)
  const spout = roundedBox(0.18, 0.035, 0.14, 0.018, materials.glass)
  spout.position.set(radius + 0.035, height + 0.04, 0.08)
  spout.rotation.y = -0.2
  group.add(spout)
  const pourAnchor = new Group()
  pourAnchor.name = 'beaker-pour-anchor'
  pourAnchor.position.set(radius + 0.075, height + 0.04, 0.08)
  group.add(pourAnchor)
  const innerWallTarget = new Group()
  innerWallTarget.name = 'beaker-inner-wall-target'
  innerWallTarget.position.set(-0.6, 1.4, 0.05)
  group.add(innerWallTarget)
  // 烧杯刻度、容量和用途字样同样直接印在锥形杯壁上。
  const scaleShell = createBeakerScaleShell(radius, height)
  scaleShell.position.y = height / 2 + 0.05
  group.add(scaleShell)

  const liquid = new Mesh(new CylinderGeometry(0.61, 0.57, 1, 48), materials.water)
  liquid.position.y = 0.12
  liquid.renderOrder = 13
  group.add(liquid)
  const surface = new Mesh(new CircleGeometry(0.61, 64), materials.waterSurface)
  surface.rotation.x = -Math.PI / 2
  surface.renderOrder = 16
  group.add(surface)
  const salt = makeCrystalCloud(materials.salt, 48, 0.48, 0.42, 0.12)
  salt.position.y = 0.12
  group.add(salt)
  return { group, liquid, surface, salt, pourAnchor, innerWallTarget, radius, height }
}

function createGlassRod(materials, beaker) {
  const pivot = new Group()
  pivot.name = 'glass-rod-stirrer'
  pivot.position.set(beaker.group.position.x, 0.17, beaker.group.position.z)
  const rod = new Mesh(new CylinderGeometry(0.032, 0.032, 1.82, 24), materials.glass)
  rod.position.set(0.12, 0.87, 0.02)
  rod.rotation.z = -0.11
  rod.renderOrder = 20
  pivot.add(rod)
  const top = new Mesh(new SphereGeometry(0.033, 20, 10), materials.glassEdge)
  top.position.set(0.22, 1.77, 0.02)
  pivot.add(top)
  return { pivot, rod }
}

function createProductBottle(materials) {
  const group = new Group()
  group.name = 'finished-reagent-bottle'
  group.position.set(4.12, 0.06, 0.02)
  group.add(shadowDisc(0.62, 0.53, 0.11))

  // 成品容器是细口试剂瓶，不是容量瓶：直筒瓶身、短颈、明显瓶肩，
  // 且不出现容量瓶特有的梨形腹部、长颈单标线和校准温度字样。
  const body = lathe([
    [0, 0],
    [0.43, 0],
    [0.49, 0.08],
    [0.49, 1.08],
    [0.46, 1.18],
    [0.34, 1.31],
    [0.2, 1.38],
    [0.2, 1.62],
    [0.23, 1.66],
    [0.23, 1.72],
    [0, 1.72],
  ], materials.reagentGlass, 64)
  body.renderOrder = 10
  group.add(body)
  const bottomRing = new Mesh(new TorusGeometry(0.45, 0.025, 12, 64), materials.glassEdge)
  bottomRing.rotation.x = Math.PI / 2
  bottomRing.position.y = 0.05
  group.add(bottomRing)
  const shoulderRing = new Mesh(new TorusGeometry(0.47, 0.014, 10, 64), materials.glassEdge)
  shoulderRing.rotation.x = Math.PI / 2
  shoulderRing.position.y = 1.09
  group.add(shoulderRing)
  const neckRing = new Mesh(new TorusGeometry(0.235, 0.022, 12, 48), materials.glassEdge)
  neckRing.rotation.x = Math.PI / 2
  neckRing.position.y = 1.7
  group.add(neckRing)
  const fillTarget = new Group()
  fillTarget.name = 'product-bottle-fill-target'
  fillTarget.position.set(0, 1.68, 0)
  group.add(fillTarget)
  const liquid = new Mesh(new CylinderGeometry(0.405, 0.405, 1, 48), materials.water)
  liquid.position.y = 0.12
  liquid.renderOrder = 11
  group.add(liquid)
  const surface = new Mesh(new CircleGeometry(0.405, 48), materials.waterSurface)
  surface.rotation.x = -Math.PI / 2
  surface.renderOrder = 12
  group.add(surface)
  const label = textPlane('氯化钠溶液 6%', 0.9, 0.4, {
    background: '#f9f7e9', color: '#254b37', border: '#9db99e', fontSize: 62, weight: 850,
  })
  label.position.set(0, 0.83, 0.495)
  group.add(label)
  const massLabel = textPlane('净质量 50 g', 0.76, 0.19, {
    background: '#eef5ea', color: '#477044', border: '#b8ccb2', fontSize: 50, weight: 800,
  })
  massLabel.position.set(0, 0.54, 0.5)
  group.add(massLabel)
  const namePlate = textPlane('细口试剂瓶 · 成品瓶', 1.12, 0.21, {
    background: 'rgba(250,249,239,.94)', color: '#355947', border: '#c5d1bf', fontSize: 46, weight: 780,
  })
  namePlate.position.set(0, 0.21, 0.51)
  group.add(namePlate)
  const cap = new Group()
  cap.name = 'reagent-bottle-cap'
  const capBody = new Mesh(new CylinderGeometry(0.255, 0.255, 0.22, 32), materials.blackPlastic)
  cap.add(capBody)
  const capTop = new Mesh(new CylinderGeometry(0.27, 0.27, 0.055, 32), materials.dark)
  capTop.position.y = 0.135
  cap.add(capTop)
  for (let index = 0; index < 12; index += 1) {
    const ridge = new Mesh(new BoxGeometry(0.025, 0.18, 0.035), materials.dark)
    const angle = (index / 12) * Math.PI * 2
    ridge.position.set(Math.cos(angle) * 0.257, 0, Math.sin(angle) * 0.257)
    ridge.rotation.y = -angle
    cap.add(ridge)
  }
  cap.position.set(0.72, 0.22, 0.12)
  group.add(cap)
  return { group, body, liquid, surface, label, massLabel, namePlate, cap, fillTarget }
}

function createTable(materials) {
  const group = new Group()
  group.name = 'laboratory-surface'
  const slab = roundedBox(10.4, 0.18, 4.45, 0.08, materials.table)
  slab.position.set(0, -0.12, 0)
  group.add(slab)
  const inset = roundedBox(10.05, 0.025, 4.1, 0.055, materials.tableInset)
  inset.position.set(0, -0.015, 0)
  inset.receiveShadow = true
  group.add(inset)
  const edge = roundedBox(10.2, 0.08, 0.14, 0.025, materials.tableEdge)
  edge.position.set(0, -0.01, 2.08)
  group.add(edge)
  return group
}

export function buildApparatus(root, materials) {
  const table = createTable(materials)
  root.add(table)
  const balance = createElectronicBalance(materials)
  root.add(balance.group)
  const paper = createWeighingPaper(materials)
  root.add(paper.group)
  const spatula = createSpatula(materials)
  root.add(spatula)
  const saltBottle = createSaltBottle(materials)
  root.add(saltBottle.group)
  const washBottle = createWashBottle(materials)
  root.add(washBottle.group)
  const cylinder = createGraduatedCylinder(materials)
  root.add(cylinder.rig)
  const eyeLine = createEyeLine(materials, cylinder)
  root.add(eyeLine)
  const dropper = createDropper(materials)
  root.add(dropper.group)
  const beaker = createBeaker(materials)
  root.add(beaker.group)
  const rod = createGlassRod(materials, beaker)
  root.add(rod.pivot)
  const product = createProductBottle(materials)
  root.add(product.group)

  const measureStream = new Mesh(new CylinderGeometry(0.018, 0.032, 1, 18), materials.water)
  alignCylinder(measureStream, new Vector3(-0.02, 2.78, 0.3), new Vector3(0.05, 2.52, 0.3))
  measureStream.renderOrder = 22
  root.add(measureStream)
  const transferStream = new Mesh(new CylinderGeometry(0.025, 0.04, 1, 18), materials.water)
  alignCylinder(transferStream, new Vector3(2.2, 2.34, 0.32), new Vector3(1.78, 1.45, 0.32))
  transferStream.renderOrder = 22
  root.add(transferStream)
  const bottlingStream = new Mesh(new CylinderGeometry(0.025, 0.045, 1, 18), materials.water)
  alignCylinder(bottlingStream, new Vector3(4.12, 2.27, 0.28), new Vector3(4.12, 1.71, 0.28))
  bottlingStream.renderOrder = 22
  root.add(bottlingStream)

  const looseLabel = textPlane('标签纸', 0.64, 0.27, {
    background: '#fbf8e9', color: '#607266', border: '#c2ccb9', fontSize: 54, weight: 780,
  })
  looseLabel.position.set(3.38, 0.18, 0.78)
  looseLabel.rotation.z = -0.08
  root.add(looseLabel)

  const benchLabel = textPlane('正视器材校验 · 量筒竖直放在水平桌面', 3.3, 0.3, {
    background: 'rgba(255,255,255,.76)', color: '#537064', border: 'rgba(93,128,111,.24)', fontSize: 54, weight: 700,
  })
  benchLabel.position.set(0.3, -0.38, 2.25)
  root.add(benchLabel)

  return {
    table,
    balance,
    paper,
    spatula,
    saltBottle,
    washBottle,
    cylinder,
    eyeLine,
    dropper,
    beaker,
    rod,
    product,
    measureStream,
    transferStream,
    bottlingStream,
    looseLabel,
    benchLabel,
  }
}
