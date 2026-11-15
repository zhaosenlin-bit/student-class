import {
  BackSide,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  Vector2,
} from '../vendor/three.module.js'

export function createLabMaterials() {
  return {
    bench: new MeshPhysicalMaterial({ color: 0x5e645f, roughness: 0.52, metalness: 0.06, clearcoat: 0.12 }),
    benchInset: new MeshPhysicalMaterial({ color: 0x8c918a, roughness: 0.38, metalness: 0.08, clearcoat: 0.16 }),
    ceramic: new MeshPhysicalMaterial({ color: 0xf6f2e6, roughness: 0.24, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    ceramicEdge: new MeshStandardMaterial({ color: 0x9ca39f, roughness: 0.34, metalness: 0.02 }),
    ceramicInner: new MeshPhysicalMaterial({ color: 0xd7d8d1, roughness: 0.2, clearcoat: 0.62, side: DoubleSide }),
    steel: new MeshStandardMaterial({ color: 0x7f8985, roughness: 0.24, metalness: 0.84 }),
    darkSteel: new MeshStandardMaterial({ color: 0x252b29, roughness: 0.36, metalness: 0.72 }),
    brass: new MeshStandardMaterial({ color: 0xa8783d, roughness: 0.25, metalness: 0.74 }),
    brassHighlight: new MeshStandardMaterial({ color: 0xd2a45d, roughness: 0.2, metalness: 0.78 }),
    copper: new MeshStandardMaterial({ color: 0xb77443, roughness: 0.28, metalness: 0.78 }),
    copperHot: new MeshStandardMaterial({ color: 0x98482d, emissive: 0x5c1b0d, emissiveIntensity: 0, roughness: 0.3, metalness: 0.76 }),
    copperHighlight: new MeshStandardMaterial({ color: 0xc96f45, roughness: 0.2, metalness: 0.78 }),
    glass: new MeshPhysicalMaterial({
      color: 0xcbe2e2,
      transmission: 0.78,
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      ior: 1.47,
      thickness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      side: DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.25,
    }),
    glassInner: new MeshPhysicalMaterial({ color: 0x9fc6c8, transparent: true, opacity: 0.08, roughness: 0.09, side: BackSide, depthWrite: false }),
    glassHighlight: new MeshBasicMaterial({ color: 0xf5ffff, transparent: true, opacity: .34, depthWrite: false }),
    glassEdge: new MeshStandardMaterial({ color: 0x99b8b7, transparent: true, opacity: .62, roughness: .16, metalness: .04, depthWrite: false }),
    lampGlass: new MeshPhysicalMaterial({ color: 0xb8d0cd, transmission: .48, transparent: true, opacity: .24, roughness: .08, side: DoubleSide, depthWrite: false }),
    wax: new MeshPhysicalMaterial({ color: 0xd9bd7c, roughness: 0.42, clearcoat: 0.2 }),
    waxMelt: new MeshPhysicalMaterial({ color: 0xe8d29f, roughness: .3, clearcoat: .34 }),
    waxPool: new MeshPhysicalMaterial({ color: 0xcba65d, roughness: .16, clearcoat: .55 }),
    candleHolder: new MeshStandardMaterial({ color: 0x9da49e, roughness: .25, metalness: .68 }),
    wick: new MeshStandardMaterial({ color: 0x292724, roughness: 0.9 }),
    cottonDry: new MeshStandardMaterial({ color: 0xf6f1e7, roughness: 1, emissive: 0x988f7c, emissiveIntensity: 0.035 }),
    cottonWet: new MeshPhysicalMaterial({ color: 0xa9cbd5, roughness: 0.8, clearcoat: 0.24, clearcoatRoughness: 0.22 }),
    cottonAlcohol: new MeshPhysicalMaterial({ color: 0xe8d2ae, roughness: 0.78, clearcoat: 0.16 }),
    water: new MeshPhysicalMaterial({ color: 0x8ab9c8, transparent: true, opacity: 0.58, roughness: 0.12, transmission: 0.22, depthWrite: false }),
    alcohol: new MeshPhysicalMaterial({ color: 0xe8d2a8, transparent: true, opacity: 0.42, roughness: 0.16, transmission: 0.26, depthWrite: false }),
    paper: new MeshStandardMaterial({ color: 0xf2eee0, roughness: 0.96, side: DoubleSide }),
    pingPong: new MeshPhysicalMaterial({ color: 0xcf7138, roughness: 0.48, clearcoat: 0.12, side: DoubleSide }),
    rubber: new MeshStandardMaterial({ color: 0x272b2a, roughness: 0.88 }),
    soot: new MeshStandardMaterial({ color: 0x373531, roughness: 0.98, side: DoubleSide }),
    plateAccent: new MeshStandardMaterial({ color: 0xb56b37, emissive: 0x7a3218, emissiveIntensity: 0.08, roughness: 0.55, metalness: 0.12 }),
    tray: new MeshPhysicalMaterial({ color: 0x777f7b, roughness: 0.32, metalness: 0.62, clearcoat: 0.16 }),
    trayInner: new MeshPhysicalMaterial({ color: 0x9ba19c, roughness: .38, metalness: .52, clearcoat: .1 }),
    trayEdge: new MeshStandardMaterial({ color: 0x4f5653, roughness: .28, metalness: .76 }),
    fastener: new MeshStandardMaterial({ color: 0xc0c6c0, roughness: .2, metalness: .88 }),
    standBase: new MeshStandardMaterial({ color: 0x3c423f, roughness: .42, metalness: .68 }),
  }
}

function flameGeometry() {
  const profile = [
    new Vector2(0, 0),
    new Vector2(.13, .03),
    new Vector2(.2, .18),
    new Vector2(.17, .34),
    new Vector2(.1, .52),
    new Vector2(.035, .72),
    new Vector2(0, .86),
  ]
  return new LatheGeometry(profile, 28)
}

export function createFlame({ scale = 1, blue = false, light = true } = {}) {
  const group = new Group()
  group.name = 'controlled-flame'
  group.userData.baseScale = scale

  const outer = new Mesh(flameGeometry(), new MeshBasicMaterial({
    color: blue ? 0xf2a345 : 0xf3a13d,
    transparent: true,
    opacity: blue ? .68 : .78,
    depthWrite: false,
  }))
  outer.name = 'outer-flame'
  outer.renderOrder = 20
  outer.scale.set(1, 1.04, 1)

  const inner = new Mesh(flameGeometry(), new MeshBasicMaterial({
    color: blue ? 0x72aee8 : 0xffd867,
    transparent: true,
    opacity: .88,
    depthWrite: false,
  }))
  inner.name = 'inner-flame'
  inner.renderOrder = 21
  inner.scale.set(blue ? .68 : .55, blue ? .36 : .66, blue ? .68 : .55)
  inner.position.y = .015

  const core = new Mesh(flameGeometry(), new MeshBasicMaterial({
    color: blue ? 0xffedaf : 0xfff0a0,
    depthWrite: false,
  }))
  core.name = 'flame-core'
  core.renderOrder = 22
  core.scale.set(blue ? .3 : .38, blue ? .52 : .48, blue ? .3 : .38)
  core.position.y = .018

  group.add(outer, inner, core)
  if (light) {
    const point = new PointLight(blue ? 0x9cc8ff : 0xffab55, 0.65, 3.4, 2)
    point.name = 'flame-light'
    point.position.y = .32
    group.add(point)
  }
  group.scale.setScalar(scale)
  return group
}

export function createSmoke() {
  const group = new Group()
  const smokeMaterial = new MeshBasicMaterial({ color: new Color(0xb8b9b4), transparent: true, opacity: .18, depthWrite: false })
  for (let index = 0; index < 5; index += 1) {
    const puff = new Mesh(new SphereGeometry(.07 + index * .018, 12, 8), smokeMaterial.clone())
    puff.position.set(Math.sin(index * 1.7) * .045, index * .17, Math.cos(index) * .025)
    puff.material.opacity = .2 - index * .027
    group.add(puff)
  }
  group.visible = false
  return group
}
