import * as THREE from 'three'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import {
  COLORS,
  glassMaterial,
  liquidMaterial,
  makeCaption,
  makeLabel,
  metalMaterial,
  porcelainMaterial,
  seededRandom,
  softShadowMaterial,
  woodMaterial,
} from './materials.js'

const glass = glassMaterial()
const rimGlass = glassMaterial(0.5)
const porcelain = porcelainMaterial()
const darkRubber = new THREE.MeshStandardMaterial({ color: 0x34413d, roughness: 0.52 })
const paleWood = woodMaterial()
const whitePlastic = new THREE.MeshStandardMaterial({ color: 0xe8ede8, roughness: 0.45 })

function mesh(geometry, material, castShadow = true, receiveShadow = true) {
  const object = new THREE.Mesh(geometry, material)
  object.castShadow = castShadow
  object.receiveShadow = receiveShadow
  return object
}

function addContactShadow(group, width, depth, x = 0, z = 0, opacity = 0.12) {
  const shadow = mesh(new THREE.CircleGeometry(1, 48), softShadowMaterial(opacity * 0.42), false, false)
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(width, depth, 1)
  shadow.position.set(x, 0.015, z)
  group.add(shadow)
  return shadow
}

function createBottle(label, color = COLORS.clear, options = {}) {
  const { capped = true, scale = 1, accent = '#6b8d78' } = options
  const group = new THREE.Group()
  const bottle = mesh(new THREE.CylinderGeometry(0.38, 0.43, 1.22, 36, 1, true), glass)
  bottle.position.y = 0.72
  group.add(bottle)
  const shoulder = mesh(new THREE.CylinderGeometry(0.2, 0.37, 0.28, 36, 1, true), glass)
  shoulder.position.y = 1.47
  group.add(shoulder)
  const neck = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 32, 1, true), glass)
  neck.position.y = 1.74
  group.add(neck)
  const base = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 36), rimGlass)
  base.position.y = 0.12
  group.add(base)
  const liquid = mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.66, 32), liquidMaterial(color, 0.54), false, false)
  liquid.position.y = 0.46
  liquid.renderOrder = 1
  group.add(liquid)
  const stopper = mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.26, 24), darkRubber)
  stopper.position.y = 2.0
  stopper.visible = capped
  group.add(stopper)
  const bottleLabel = makeLabel(label, 0.7, 0.3, { accent })
  bottleLabel.position.set(0, 0.83, 0.421)
  group.add(bottleLabel)
  group.scale.setScalar(scale)
  group.userData = { liquid, stopper, label }
  return group
}

function createDropper(accent = 0x6d7780, label = '') {
  const group = new THREE.Group()
  let tag = null
  const bulbMaterial = new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.38, clearcoat: 0.42, clearcoatRoughness: 0.28 })
  const bulbProfile = [
    new THREE.Vector2(0.065, -0.34), new THREE.Vector2(0.14, -0.28), new THREE.Vector2(0.2, -0.12),
    new THREE.Vector2(0.21, 0.12), new THREE.Vector2(0.16, 0.3), new THREE.Vector2(0.08, 0.41), new THREE.Vector2(0.035, 0.46),
  ]
  const bulb = mesh(new THREE.LatheGeometry(bulbProfile, 28), bulbMaterial)
  bulb.position.y = 1.38
  group.add(bulb)
  const collar = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.23, 20), darkRubber)
  collar.position.y = 1.13
  group.add(collar)
  const tube = mesh(new THREE.CylinderGeometry(0.045, 0.028, 1.12, 18), rimGlass, false, false)
  tube.position.y = 0.52
  group.add(tube)
  const innerColumn = mesh(new THREE.CylinderGeometry(0.015, 0.011, 0.76, 12), new THREE.MeshPhysicalMaterial({ color: accent, transparent: true, opacity: 0.24, roughness: 0.1 }), false, false)
  innerColumn.position.y = 0.62
  group.add(innerColumn)
  const tip = mesh(new THREE.ConeGeometry(0.03, 0.16, 16), rimGlass, false, false)
  tip.position.y = -0.12
  group.add(tip)
  if (label) {
    tag = makeCaption(label, 0.9, 0.24)
    tag.position.set(0.48, 1.42, 0)
    group.add(tag)
  }
  group.userData.tip = new THREE.Vector3(0, -0.2, 0)
  group.userData.innerColumn = innerColumn
  group.userData.tag = tag
  return group
}

function createDroplet(color = COLORS.clear, radius = 0.065) {
  const drop = mesh(new THREE.SphereGeometry(Math.min(radius, 0.047), 18, 14), liquidMaterial(color, 0.82), false, false)
  drop.scale.y = 1.35
  drop.visible = false
  drop.renderOrder = 5
  return drop
}

function createTestTube(options = {}) {
  const { liquidColor = COLORS.clear, liquidHeight = 0.85, label = '' } = options
  const group = new THREE.Group()
  let caption = null
  const body = mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.62, 40, 1, true), glass)
  body.position.y = 1.44
  group.add(body)
  const bottom = mesh(new THREE.SphereGeometry(0.42, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass)
  bottom.position.y = 0.13
  group.add(bottom)
  const rim = mesh(new THREE.TorusGeometry(0.43, 0.045, 12, 40), rimGlass)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 2.77
  group.add(rim)
  const liquid = mesh(new THREE.CylinderGeometry(0.355, 0.355, liquidHeight, 36), liquidMaterial(liquidColor, 0.54), false, false)
  liquid.position.y = 0.34 + liquidHeight / 2
  liquid.renderOrder = 2
  group.add(liquid)
  const liquidSurface = mesh(new THREE.CircleGeometry(0.355, 36), liquid.material, false, false)
  liquidSurface.rotation.x = -Math.PI / 2
  liquidSurface.position.y = liquid.position.y + liquidHeight / 2 + 0.003
  liquidSurface.renderOrder = 3
  group.add(liquidSurface)
  const meniscus = mesh(new THREE.TorusGeometry(0.345, 0.012, 8, 36), liquid.material, false, false)
  meniscus.rotation.x = Math.PI / 2
  meniscus.position.y = liquidSurface.position.y + 0.006
  meniscus.renderOrder = 4
  group.add(meniscus)
  const ripple = mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 28), liquid.material, false, false)
  ripple.rotation.x = Math.PI / 2
  ripple.position.y = liquidSurface.position.y + 0.012
  ripple.visible = false
  ripple.renderOrder = 5
  group.add(ripple)
  if (label) {
    caption = makeCaption(label, 1.25, 0.3)
    caption.position.set(0, 3.18, 0)
    group.add(caption)
  }
  group.userData = { body, bottom, rim, liquid, liquidSurface, meniscus, ripple, caption, liquidHeight, liquidBottomY: 0.34 }
  return group
}

function createRack(width = 3.2) {
  const group = new THREE.Group()
  const base = mesh(new RoundedBoxGeometry(width, 0.22, 1.25, 5, 0.1), paleWood)
  base.position.y = 0.13
  group.add(base)
  const bar = mesh(new RoundedBoxGeometry(width - 0.12, 0.2, 0.72, 5, 0.08), paleWood)
  bar.position.y = 1.12
  group.add(bar)
  for (const x of [-width / 2 + 0.24, width / 2 - 0.24]) {
    const post = mesh(new CylinderGeometrySafe(0.07, 0.07, 1.1, 16), metalMaterial(0x7d8684))
    post.position.set(x, 0.65, 0)
    group.add(post)
  }
  return group
}

function CylinderGeometrySafe(...args) {
  return new THREE.CylinderGeometry(...args)
}

function createBurner() {
  const group = new THREE.Group()
  const reservoir = mesh(new THREE.SphereGeometry(0.48, 32, 22), glassMaterial(0.38))
  reservoir.scale.y = 0.72
  reservoir.position.y = 0.38
  group.add(reservoir)
  const fuel = mesh(new THREE.SphereGeometry(0.42, 32, 20), liquidMaterial(0xd6bf8e, 0.42), false, false)
  fuel.scale.y = 0.38
  fuel.position.y = 0.27
  group.add(fuel)
  const neck = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 24), metalMaterial(0x8e9490))
  neck.position.y = 0.75
  group.add(neck)
  const wick = mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 12), darkRubber)
  wick.position.y = 0.98
  group.add(wick)
  const outerProfile = [new THREE.Vector2(0.06, 0), new THREE.Vector2(0.17, 0.14), new THREE.Vector2(0.15, 0.31), new THREE.Vector2(0.09, 0.5), new THREE.Vector2(0.015, 0.7)]
  const outerFlame = mesh(new THREE.LatheGeometry(outerProfile, 28), new THREE.MeshBasicMaterial({ color: 0x9bd4df, transparent: true, opacity: 0.38, depthWrite: false }))
  outerFlame.position.y = 1.02
  const innerProfile = [new THREE.Vector2(0.035, 0), new THREE.Vector2(0.085, 0.1), new THREE.Vector2(0.07, 0.24), new THREE.Vector2(0.01, 0.43)]
  const innerFlame = mesh(new THREE.LatheGeometry(innerProfile, 24), new THREE.MeshBasicMaterial({ color: 0x4b8da9, transparent: true, opacity: 0.64, depthWrite: false }))
  innerFlame.position.y = 1.02
  group.add(outerFlame, innerFlame)
  const cap = mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.46, 24), metalMaterial(0x7b8583))
  cap.position.set(0.62, 0.24, 0)
  cap.rotation.z = Math.PI / 2
  group.add(cap)
  group.userData = { outerFlame, innerFlame, cap }
  return group
}

function createGlassRod() {
  const rod = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 18), rimGlass, false, false)
  rod.rotation.z = -0.18
  return rod
}

function createBeaker() {
  const group = new THREE.Group()
  const body = mesh(new THREE.CylinderGeometry(1.05, 0.96, 1.72, 48, 1, true), glass)
  body.position.y = 0.92
  group.add(body)
  const bottom = mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.08, 48), rimGlass)
  bottom.position.y = 0.07
  group.add(bottom)
  const rim = mesh(new THREE.TorusGeometry(1.055, 0.045, 12, 48), rimGlass)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 1.79
  group.add(rim)
  const spout = mesh(new THREE.ConeGeometry(0.16, 0.28, 16), glassMaterial(0.46), false, false)
  spout.rotation.z = -Math.PI / 2
  spout.position.set(1.12, 1.7, 0)
  group.add(spout)
  const liquid = mesh(new THREE.CylinderGeometry(0.93, 0.9, 0.94, 44), liquidMaterial(COLORS.phenolPink, 0.5), false, false)
  liquid.position.y = 0.55
  liquid.renderOrder = 2
  group.add(liquid)
  const surface = mesh(new THREE.CircleGeometry(0.93, 44), liquid.material, false, false)
  surface.rotation.x = -Math.PI / 2
  surface.position.y = 1.025
  surface.renderOrder = 3
  group.add(surface)
  const meniscus = mesh(new THREE.TorusGeometry(0.91, 0.018, 10, 44), liquid.material, false, false)
  meniscus.rotation.x = Math.PI / 2
  meniscus.position.y = surface.position.y + 0.008
  meniscus.renderOrder = 4
  group.add(meniscus)
  const ripple = mesh(new THREE.TorusGeometry(0.34, 0.018, 10, 36), liquid.material, false, false)
  ripple.rotation.x = Math.PI / 2
  ripple.position.y = surface.position.y + 0.015
  ripple.visible = false
  ripple.renderOrder = 5
  group.add(ripple)
  const graduationMaterial = new THREE.MeshBasicMaterial({ color: 0x60736c, transparent: true, opacity: 0.36 })
  ;[0.58, 0.96, 1.34].forEach((y, index) => {
    const tick = mesh(new THREE.BoxGeometry(0.18 + index * 0.045, 0.012, 0.012), graduationMaterial, false, false)
    tick.position.set(0.78, y, 0.86)
    group.add(tick)
  })
  group.userData = { liquid, surface, meniscus, ripple, liquidHeight: 0.94, liquidBottomY: 0.08 }
  return group
}

function createSolidParticles({ count, color, radius = 0.09, spread = 0.42, seed = 1 }) {
  const random = seededRandom(seed)
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: color === COLORS.zinc ? 0.55 : 0 })
  const geometry = new THREE.IcosahedronGeometry(radius, 1)
  const particles = []
  const group = new THREE.Group()
  for (let i = 0; i < count; i += 1) {
    const particle = mesh(geometry, material)
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random()) * spread
    particle.position.set(Math.cos(angle) * distance, 0.12 + random() * 0.16, Math.sin(angle) * distance * 0.48)
    particle.rotation.set(random() * 2, random() * 2, random() * 2)
    particle.scale.set(0.7 + random() * 0.7, 0.55 + random() * 0.6, 0.7 + random() * 0.7)
    particle.userData.initialScale = particle.scale.clone()
    particle.userData.initialPosition = particle.position.clone()
    particle.userData.initialRotation = particle.rotation.clone()
    particles.push(particle)
    group.add(particle)
  }
  return { group, particles }
}

function createBubblePool(count = 34, seed = 4) {
  const random = seededRandom(seed)
  const material = new THREE.MeshPhysicalMaterial({ color: 0xe4f1ef, transmission: 0.45, transparent: true, opacity: 0.54, roughness: 0.025, thickness: 0.025, clearcoat: 1, depthWrite: false })
  const geometry = new THREE.SphereGeometry(0.048, 18, 12)
  const group = new THREE.Group()
  const bubbles = []
  for (let i = 0; i < count; i += 1) {
    const bubble = mesh(geometry, material, false, false)
    bubble.visible = false
    bubble.renderOrder = 4
    bubble.userData = {
      phase: random(),
      speed: 0.55 + random() * 0.72,
      x: (random() - 0.5) * 0.46,
      z: (random() - 0.5) * 0.24,
      size: 0.62 + random() * 0.56,
    }
    group.add(bubble)
    bubbles.push(bubble)
  }
  return { group, bubbles }
}

function createPrecipitatePool(count = 260, seed = 8) {
  const random = seededRandom(seed)
  const material = new THREE.MeshStandardMaterial({ color: COLORS.precipitateBlue, roughness: 0.75, transparent: true, opacity: 0.9 })
  const geometry = new THREE.SphereGeometry(0.014, 7, 5)
  const group = new THREE.Group()
  const particles = []
  for (let i = 0; i < count; i += 1) {
    const particle = mesh(geometry, material, false, false)
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random()) * 0.31
    particle.userData = {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      y: 0.17 + Math.pow(random(), 1.8) * 0.86,
      scale: 0.45 + random() * 1.2,
      drift: random() * Math.PI * 2,
      threshold: random(),
      fallSpeed: 0.55 + random() * 0.85,
    }
    particle.visible = false
    group.add(particle)
    particles.push(particle)
  }
  return { group, particles, material }
}

function createReactionMotes({ count = 48, color, seed = 1, radius = 0.022, spread = 0.32, height = 0.9, opacity = 0.3 }) {
  const random = seededRandom(seed)
  const material = new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.12,
    transmission: 0.08,
    depthWrite: false,
  })
  const geometry = new THREE.SphereGeometry(radius, 8, 6)
  const group = new THREE.Group()
  const particles = []
  for (let index = 0; index < count; index += 1) {
    const particle = mesh(geometry, material, false, false)
    const angle = random() * Math.PI * 2
    const radial = Math.sqrt(random()) * spread
    particle.userData = {
      angle,
      radial,
      y: 0.2 + random() * height,
      phase: random() * Math.PI * 2,
      speed: 0.55 + random() * 0.9,
      fallSpeed: 0.55 + random() * 0.85,
      threshold: random(),
      size: 0.55 + random() * 1.1,
    }
    particle.position.set(Math.cos(angle) * radial, particle.userData.y, Math.sin(angle) * radial)
    particle.visible = false
    group.add(particle)
    particles.push(particle)
  }
  return { group, particles, material }
}

function createIndicatorStation() {
  const group = new THREE.Group()
  addContactShadow(group, 1.48, 1.3, 0, 0.05, 0.11)
  const plate = mesh(new RoundedBoxGeometry(2.85, 0.22, 2.42, 8, 0.18), porcelain)
  plate.position.y = 0.18
  group.add(plate)

  const wellData = [
    { x: -0.72, z: 0.68, base: '盐酸', indicator: '石蕊', target: COLORS.acidRed, dropperIndex: 0 },
    { x: -0.46, z: -0.68, base: 'NaOH', indicator: '石蕊', target: COLORS.baseBlue, dropperIndex: 0 },
    { x: 0.46, z: 0.68, base: '盐酸', indicator: '酚酞', target: COLORS.clear, dropperIndex: 1 },
    { x: 0.72, z: -0.68, base: 'NaOH', indicator: '酚酞', target: COLORS.phenolPink, dropperIndex: 1 },
  ]
  const wells = []
  const droplets = []
  const droppers = [
    createDropper(0x6f557f, '紫色石蕊'),
    createDropper(0xd6d4cd, '无色酚酞'),
  ]
  droppers.forEach((dropper, index) => {
    dropper.scale.setScalar(0.82)
    dropper.position.set(index === 0 ? -0.66 : 0.66, 1.88, 0.82)
    group.add(dropper)
  })
  wellData.forEach((data, index) => {
    const basin = mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.16, 40), new THREE.MeshStandardMaterial({ color: 0xd9ddd8, roughness: 0.38 }))
    basin.position.set(data.x, 0.32, data.z)
    group.add(basin)
    const liquid = mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.065, 36), liquidMaterial(COLORS.clear, 0.58), false, false)
    liquid.position.set(data.x, 0.425, data.z)
    liquid.renderOrder = 3
    group.add(liquid)
    const outline = mesh(new THREE.TorusGeometry(0.385, 0.022, 10, 40), new THREE.MeshStandardMaterial({ color: 0xb9c0ba, roughness: 0.4 }))
    outline.rotation.x = Math.PI / 2
    outline.position.set(data.x, 0.43, data.z)
    group.add(outline)
    const caption = makeCaption(data.base, 0.78, 0.22)
    caption.position.set(data.x, 0.72, data.z)
    group.add(caption)
    const rings = [0, 1].map((ringIndex) => {
      const ringColor = data.target === COLORS.clear ? 0xdfe5df : data.target
      const ring = mesh(
        new THREE.RingGeometry(0.08 + ringIndex * 0.03, 0.11 + ringIndex * 0.03, 40),
        new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
        false,
        false,
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(data.x, 0.466 + ringIndex * 0.002, data.z)
      ring.visible = false
      ring.renderOrder = 5
      group.add(ring)
      return ring
    })
    const dropper = droppers[data.dropperIndex]
    const droplet = createDroplet(data.dropperIndex === 0 ? COLORS.litmusPurple : COLORS.clear)
    group.add(droplet)
    droplets.push({ droplet, dropper, targetZ: data.z, to: new THREE.Vector3(data.x, 0.55, data.z), start: index * 0.19 })
    wells.push({ liquid, target: data.target, indicator: data.indicator, rings })
  })
  return { group, wells, droplets, droppers }
}

function createMetalStation() {
  const group = new THREE.Group()
  addContactShadow(group, 2.35, 1.2, 0, 0)
  const rack = createRack(2.4)
  group.add(rack)
  const tube = createTestTube({ liquidColor: COLORS.clear, liquidHeight: 1.2, label: '锌粒 + 稀盐酸' })
  tube.position.set(0, 0.25, 0)
  tube.rotation.z = -0.035
  group.add(tube)
  const zinc = createSolidParticles({ count: 10, color: COLORS.zinc, radius: 0.13, spread: 0.29, seed: 19 })
  zinc.group.position.set(0, 0.43, 0)
  group.add(zinc.group)
  const bubbles = createBubblePool(52, 9)
  bubbles.group.position.set(0, 0.42, 0)
  group.add(bubbles.group)
  const dropper = createDropper(0xd8d8cf, '稀盐酸专用')
  dropper.scale.setScalar(0.62)
  dropper.position.set(0.34, 3.29, 0.05)
  group.add(dropper)
  const droplet = createDroplet(COLORS.clear)
  group.add(droplet)
  const bottle = createBottle('稀盐酸', COLORS.clear, { capped: false, accent: '#b18568', scale: 0.86 })
  bottle.position.set(-1.35, 0.02, 0.2)
  group.add(bottle)
  return { group, tube, zinc, bubbles, dropper, droplet, bottle }
}

function createOxideStation() {
  const group = new THREE.Group()
  addContactShadow(group, 3.0, 1.45, 0, 0.05)
  const standBase = mesh(new RoundedBoxGeometry(1.5, 0.18, 1.0, 5, 0.08), metalMaterial(0x66716f))
  standBase.position.set(-1.0, 0.1, 0)
  group.add(standBase)
  const stand = mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.5, 16), metalMaterial(0x596563))
  stand.position.set(-1.0, 1.82, 0)
  group.add(stand)
  const arm = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.72, 16), metalMaterial(0x596563))
  arm.rotation.z = Math.PI / 2
  arm.position.set(-0.2, 2.25, 0)
  group.add(arm)
  const tube = createTestTube({ liquidColor: COLORS.clear, liquidHeight: 1.16, label: '黑色 CuO + 稀硫酸' })
  tube.position.set(0.32, 0.34, 0)
  tube.rotation.z = -0.13
  group.add(tube)
  const clamp = mesh(new THREE.TorusGeometry(0.49, 0.055, 10, 30, Math.PI * 1.5), metalMaterial(0x596563))
  clamp.rotation.x = Math.PI / 2
  clamp.position.set(0.52, 2.1, 0)
  group.add(clamp)
  const cuo = createSolidParticles({ count: 34, color: COLORS.copperOxide, radius: 0.055, spread: 0.3, seed: 33 })
  cuo.group.position.set(0, 0.18, 0)
  tube.add(cuo.group)
  const dissolvedCopper = createReactionMotes({ count: 68, color: COLORS.copperBlue, seed: 73, radius: 0.024, spread: 0.28, height: 0.92, opacity: 0.3 })
  tube.add(dissolvedCopper.group)
  const burner = createBurner()
  burner.position.set(0.4, -0.06, 0.36)
  group.add(burner)
  const bottle = createBottle('稀硫酸', COLORS.clear, { capped: false, accent: '#a17a72', scale: 0.82 })
  bottle.position.set(1.55, 0, 0.12)
  group.add(bottle)
  const dropper = createDropper(0xb89a91, '稀硫酸专用')
  dropper.scale.setScalar(0.62)
  dropper.position.set(0.76, 3.44, 0.05)
  group.add(dropper)
  const droplet = createDroplet(COLORS.clear)
  group.add(droplet)
  const spatula = createSpatula()
  spatula.position.set(1.12, 0.28, -0.42)
  spatula.rotation.z = -0.06
  group.add(spatula)
  return { group, tube, cuo, dissolvedCopper, burner, bottle, dropper, droplet, spatula }
}

function createNeutralizationStation() {
  const group = new THREE.Group()
  addContactShadow(group, 2.75, 1.38, 0, 0.05)
  const beaker = createBeaker()
  beaker.position.set(0, 0.05, 0)
  group.add(beaker)
  const mixingCloud = createReactionMotes({ count: 46, color: COLORS.clear, seed: 91, radius: 0.058, spread: 0.82, height: 0.7, opacity: 0.18 })
  mixingCloud.group.position.y = 0.1
  beaker.add(mixingCloud.group)
  const rodPivot = new THREE.Group()
  rodPivot.position.set(0.24, 0.15, 0)
  const rod = createGlassRod()
  rod.position.y = 1.42
  rodPivot.add(rod)
  group.add(rodPivot)
  const dropper = createDropper(0xd9d8cf, '稀盐酸专用')
  dropper.position.set(0.58, 2.55, 0)
  group.add(dropper)
  const droplet = createDroplet(COLORS.clear)
  group.add(droplet)
  const acidBottle = createBottle('稀盐酸', COLORS.clear, { capped: false, accent: '#b18568', scale: 0.85 })
  acidBottle.position.set(1.45, 0, 0.14)
  group.add(acidBottle)
  const alkaliBottle = createBottle('NaOH', COLORS.clear, { capped: false, accent: '#6789a1', scale: 0.85 })
  alkaliBottle.position.set(-1.45, 0, 0.14)
  group.add(alkaliBottle)
  return { group, beaker, mixingCloud, rodPivot, dropper, droplet, acidBottle, alkaliBottle }
}

function createSaltStation() {
  const group = new THREE.Group()
  addContactShadow(group, 2.8, 1.4, 0, 0.05)
  const rack = createRack(2.6)
  group.add(rack)
  const tube = createTestTube({ liquidColor: COLORS.copperBlue, liquidHeight: 1.36, label: 'CuSO₄ 溶液' })
  tube.position.set(0, 0.25, 0)
  group.add(tube)
  const precipitate = createPrecipitatePool(180, 42)
  precipitate.group.position.set(0, 0.42, 0)
  group.add(precipitate.group)
  const reactionNuclei = createReactionMotes({ count: 64, color: COLORS.precipitateBlue, seed: 118, radius: 0.012, spread: 0.3, height: 0.96, opacity: 0.42 })
  reactionNuclei.group.position.set(0, 0.42, 0)
  group.add(reactionNuclei.group)
  const baseDropper = createDropper(0x6789a1, 'NaOH 专用')
  baseDropper.scale.setScalar(0.67)
  baseDropper.position.set(-0.62, 3.28, 0)
  group.add(baseDropper)
  const acidDropper = createDropper(0xb18568, '稀盐酸专用')
  acidDropper.scale.setScalar(0.67)
  acidDropper.position.set(0.62, 3.28, 0)
  group.add(acidDropper)
  const baseDroplet = createDroplet(COLORS.clear)
  const acidDroplet = createDroplet(COLORS.clear)
  group.add(baseDroplet, acidDroplet)
  const caption = makeCaption('同一试管：先加碱，再加酸', 2.45, 0.4)
  caption.position.set(0, 3.56, 0)
  group.add(caption)
  return { group, tube, precipitate, reactionNuclei, baseDropper, acidDropper, baseDroplet, acidDroplet, caption }
}

function createEvaporationDish() {
  const group = new THREE.Group()
  const dish = mesh(new THREE.SphereGeometry(0.62, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), porcelain)
  dish.scale.y = 0.36
  group.add(dish)
  const rim = mesh(new THREE.TorusGeometry(0.61, 0.045, 10, 36), porcelain)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.02
  group.add(rim)
  return group
}

function createTongs() {
  const group = new THREE.Group()
  const material = metalMaterial(0x747c7a)
  for (const z of [-0.07, 0.07]) {
    const arm = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.65, 12), material)
    arm.rotation.z = Math.PI / 2 - 0.12
    arm.position.set(0, 0, z)
    group.add(arm)
  }
  const joint = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 16), material)
  joint.rotation.x = Math.PI / 2
  joint.position.x = -0.78
  group.add(joint)
  return group
}

function createSpatula() {
  const group = new THREE.Group()
  const material = metalMaterial(0x89918f, 0.34)
  const handle = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.32, 12), material)
  handle.rotation.z = Math.PI / 2
  group.add(handle)
  const bowl = mesh(new THREE.SphereGeometry(0.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), material)
  bowl.scale.set(1.45, 0.38, 0.72)
  bowl.rotation.z = -Math.PI / 2
  bowl.position.x = 0.72
  group.add(bowl)
  return group
}

function createSummaryController() {
  const group = new THREE.Group()
  const caption = makeCaption('整理完成 · 同一桌面上的器材均已归位', 4.25, 0.5)
  caption.position.set(0, 2.82, 0)
  caption.visible = false
  group.add(caption)
  return { group, caption }
}

function createFocusMarker(width, depth, position) {
  const marker = mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({ color: 0x77aa6b, transparent: true, opacity: 0.035, depthWrite: false }),
    false,
    false,
  )
  marker.rotation.x = -Math.PI / 2
  marker.position.set(position.x, 0.026, position.z)
  marker.scale.set(width, depth, 1)
  marker.renderOrder = 1
  return marker
}

function rememberDropperPoses(dropper, homePosition, homeRotationZ = 0) {
  dropper.userData.operatingPosition = dropper.position.clone()
  dropper.userData.operatingRotation = dropper.rotation.clone()
  dropper.userData.homePosition = homePosition.clone()
  dropper.userData.homeRotationZ = homeRotationZ
}

export function createApparatus() {
  const root = new THREE.Group()
  root.name = 'AcidBaseApparatus'
  const stations = [
    createIndicatorStation(),
    createMetalStation(),
    createOxideStation(),
    createNeutralizationStation(),
    createSaltStation(),
    createSummaryController(),
  ]
  const layouts = [
    { x: -4.3, z: 0.22, scale: 0.64 },
    { x: -2.62, z: 0.1, scale: 0.58 },
    { x: -0.82, z: 0.04, scale: 0.52 },
    { x: 1.72, z: 0.1, scale: 0.62 },
    { x: 4.04, z: 0.12, scale: 0.56 },
  ]
  stations.slice(0, 5).forEach((station, index) => {
    station.group.name = `station-${index + 1}`
    station.group.position.set(layouts[index].x, 0.03, layouts[index].z)
    station.group.scale.setScalar(layouts[index].scale)
    station.group.visible = true
    root.add(station.group)
  })
  stations[5].group.name = 'summary-controller'
  stations[5].group.visible = true
  root.add(stations[5].group)

  const sharedReagents = new THREE.Group()
  sharedReagents.name = 'shared-reagents'
  const bottles = [stations[1].bottle, stations[2].bottle, stations[3].alkaliBottle]
  ;[stations[1].group, stations[2].group, stations[3].group].forEach((group, index) => group.remove(bottles[index]))
  stations[3].group.remove(stations[3].acidBottle)
  stations[3].acidBottle.visible = false
  bottles.forEach((bottle, index) => {
    bottle.scale.setScalar(0.62)
    bottle.position.set(-0.8 + index * 0.8, 0.04, -1.32)
    bottle.userData.stopper.visible = false
    sharedReagents.add(bottle)
  })
  root.add(sharedReagents)

  const accessories = new THREE.Group()
  accessories.name = 'shared-accessories'
  const dish = createEvaporationDish()
  dish.scale.setScalar(0.42)
  dish.position.set(0.78, 0.18, 1.12)
  accessories.add(dish)
  const tongs = createTongs()
  tongs.scale.setScalar(0.48)
  tongs.position.set(0.05, 0.2, 1.08)
  tongs.rotation.y = -0.08
  accessories.add(tongs)
  root.add(accessories)

  const focusSizes = [[1.12, 1.0], [0.86, 0.78], [0.98, 0.86], [1.0, 0.84], [0.94, 0.82]]
  const activeMarkers = layouts.map((layout, index) => {
    const marker = createFocusMarker(focusSizes[index][0], focusSizes[index][1], layout)
    root.add(marker)
    return marker
  })
  const zoneTexts = ['01 指示剂', '02 锌 + 酸', '03 CuO + 酸', '04 酸碱中和', '05 碱与盐']
  const zoneLabels = layouts.map((layout, index) => {
    const label = makeCaption(zoneTexts[index], 1.42, 0.3)
    label.position.set(layout.x, 0.35, 1.62)
    root.add(label)
    return label
  })

  const summaryDroppers = [
    ...stations[0].droppers,
    stations[1].dropper,
    stations[2].dropper,
    stations[3].dropper,
    stations[4].baseDropper,
    stations[4].acidDropper,
  ]
  stations[0].droppers.forEach((dropper) => rememberDropperPoses(dropper, dropper.position.clone(), 0))
  rememberDropperPoses(stations[1].dropper, new THREE.Vector3(0.78, 0.55, 0.72), Math.PI / 2)
  rememberDropperPoses(stations[2].dropper, new THREE.Vector3(0.94, 0.55, 0.72), Math.PI / 2)
  rememberDropperPoses(stations[3].dropper, new THREE.Vector3(1.0, 0.5, 0.72), Math.PI / 2)
  rememberDropperPoses(stations[4].baseDropper, new THREE.Vector3(-0.7, 0.55, 0.72), Math.PI / 2)
  rememberDropperPoses(stations[4].acidDropper, new THREE.Vector3(0.7, 0.55, 0.72), -Math.PI / 2)

  const summary = {
    ...stations[5],
    bottles,
    burner: stations[2].burner,
    droppers: summaryDroppers,
  }
  const secondaryLabels = [
    stations[0].droppers.map((dropper) => dropper.userData.tag),
    [stations[1].dropper.userData.tag, stations[1].tube.userData.caption],
    [stations[2].dropper.userData.tag, stations[2].tube.userData.caption],
    [stations[3].dropper.userData.tag],
    [stations[4].baseDropper.userData.tag, stations[4].acidDropper.userData.tag, stations[4].tube.userData.caption, stations[4].caption],
  ].map((labels) => labels.filter(Boolean))
  return { root, stations, summary, sharedReagents, accessories, activeMarkers, zoneLabels, secondaryLabels }
}

export function showStation(apparatus, index) {
  apparatus.stations.slice(0, 5).forEach((station) => {
    station.group.visible = true
  })
  apparatus.activeMarkers.forEach((marker, markerIndex) => {
    marker.material.opacity = index === 5 ? 0.105 : markerIndex === index ? 0.2 : 0.035
  })
  apparatus.zoneLabels.forEach((label, labelIndex) => {
    label.visible = false
  })
  apparatus.secondaryLabels.forEach((labels, stationIndex) => {
    labels.forEach((label) => {
      label.visible = index < 5 && stationIndex === index
    })
  })
}
