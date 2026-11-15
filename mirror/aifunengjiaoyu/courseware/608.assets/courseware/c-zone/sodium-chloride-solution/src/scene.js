import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  RectAreaLight,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from '../vendor/three.module.js'
import { OrbitControls } from '../vendor/OrbitControls.js'
import { RoomEnvironment } from '../vendor/RoomEnvironment.js'
import { buildApparatus } from './apparatus.js'
import { createLabMaterials } from './materials.js'
import {
  createOxygenLabEnvironment,
  createOxygenLabPanorama,
} from '../../../shared/oxygen-lab-environment.js'
import { roundedBox } from './geometry.js'

const clamp01 = (value) => MathUtils.clamp(value, 0, 1)
const smooth = (value) => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}
const phase = (progress, start, end) => smooth((progress - start) / (end - start))
const lerp = MathUtils.lerp
const AUTO_ORBIT_SPEED = 0.055
const DEFAULT_CAMERA_ZOOM = 0.82
const SKINS = {
  original: {
    panorama: '../../../assets/courseware-prototypes/oxygen-preparation-lab-panorama-1912x823-v4.png',
    background: 0xddd6c5,
    fog: 0xddd6c5,
    counter: 0x38352f,
    counterInset: 0x6a6258,
    counterEdge: 0x27251f,
    surface: 0x777d7b,
    surfaceInset: 0x929896,
    surfaceEdge: 0xaab2af,
    surfaceRoughness: 0.3,
    surfaceMetalness: 0.28,
    surfaceClearcoat: 0.28,
    surfaceInsetRoughness: 0.27,
    surfaceInsetMetalness: 0.2,
    surfaceInsetClearcoat: 0.25,
    cabinet: 0x93897d,
    cabinetSide: 0x6f6558,
    door: 0x3c4e3f,
    doorInset: 0x6e806b,
    drawer: 0x5f584e,
    drawerInset: 0x938a78,
    rail: 0x8b714f,
    trim: 0x936b46,
    toe: 0x293130,
    light: 0xffcb7f,
    shadow: 0x29302a,
    counterRoughness: 0.42,
    counterMetalness: 0.18,
    counterClearcoat: 0.16,
    insetRoughness: 0.38,
    insetMetalness: 0.2,
    trimMetalness: 0.06,
    trimRoughness: 0.42,
    lightOpacity: 0.32,
  },
  glacier: {
    panorama: '../../../assets/courseware-prototypes/sodium-chloride-glacier-lab-panorama-v2.png',
    background: 0xdce9ef,
    fog: 0xdce9ef,
    counter: 0x1e3550,
    counterInset: 0x294463,
    counterEdge: 0xb8c5cc,
    surface: 0x1d3552,
    surfaceInset: 0x294766,
    surfaceEdge: 0xb8c5cc,
    cabinet: 0x425b68,
    cabinetSide: 0x2d4653,
    door: 0x334f5e,
    doorInset: 0x527080,
    drawer: 0x3a5361,
    drawerInset: 0x607a87,
    trim: 0xaebbc2,
    toe: 0x1d2d36,
    light: 0xb9e4f4,
    shadow: 0x1d3440,
  },
  forest: {
    panorama: '../../../assets/courseware-prototypes/sodium-chloride-forest-lab-panorama-v2.png',
    background: 0xeee7d7,
    fog: 0xeee7d7,
    counter: 0x102d26,
    counterInset: 0x1e3e34,
    counterEdge: 0x9b7a42,
    surface: 0x112d25,
    surfaceInset: 0x1b3a30,
    surfaceEdge: 0xb08b50,
    cabinet: 0xb1885f,
    cabinetSide: 0x866345,
    door: 0xa77d55,
    doorInset: 0xc09a71,
    drawer: 0x9a704d,
    drawerInset: 0xc39e76,
    trim: 0xb38a4d,
    toe: 0x3a2c23,
    light: 0xffdda0,
    shadow: 0x2b2d21,
  },
  violet: {
    panorama: '../../../assets/courseware-prototypes/sodium-chloride-violet-lab-panorama-v2.png',
    background: 0x11172b,
    fog: 0x11172b,
    counter: 0x211f3c,
    counterInset: 0x35314f,
    counterEdge: 0xa87043,
    surface: 0x211f3c,
    surfaceInset: 0x312d4b,
    surfaceEdge: 0xa87043,
    cabinet: 0x151c35,
    cabinetSide: 0x0d142a,
    door: 0x17203c,
    doorInset: 0x28304e,
    drawer: 0x141b34,
    drawerInset: 0x292f4c,
    trim: 0xaa7148,
    toe: 0x090f20,
    light: 0xffb66c,
    shadow: 0x080d1a,
  },
  lava: {
    panorama: '../../../assets/courseware-prototypes/sodium-chloride-lava-lab-panorama.png',
    background: 0x21140d,
    fog: 0x21140d,
    counter: 0x090807,
    counterInset: 0x12100e,
    counterEdge: 0xa6532b,
    surface: 0x080706,
    surfaceInset: 0x100e0c,
    surfaceEdge: 0xb15b2d,
    surfaceRoughness: 0.82,
    surfaceMetalness: 0.01,
    surfaceClearcoat: 0.03,
    cabinet: 0x4d1b10,
    cabinetSide: 0x2a120c,
    door: 0x46180e,
    doorInset: 0x642615,
    drawer: 0x3d160e,
    drawerInset: 0x5a2114,
    trim: 0xb76632,
    toe: 0x160c08,
    light: 0xff8f43,
    shadow: 0x120806,
    counterRoughness: 0.76,
    counterMetalness: 0.02,
    counterClearcoat: 0.04,
    insetRoughness: 0.7,
    insetMetalness: 0.02,
  },
}

function setPathPosition(object, progress, points) {
  const t = clamp01(progress)
  const span = points.length - 1
  const scaled = t * span
  const index = Math.min(span - 1, Math.floor(scaled))
  object.position.lerpVectors(points[index], points[index + 1], smooth(scaled - index))
}

export function createSolutionPreparationScene() {
  const spec = window.__SOLUTION_PREPARATION_SPEC__
  const sceneElement = document.getElementById('scene')
  const loadingElement = document.getElementById('loading')
  const fallbackElement = document.getElementById('fallback')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let renderer

  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (error) {
    fallbackElement.classList.add('show')
    loadingElement.classList.add('hidden')
    console.error('Unable to initialize the solution preparation WebGL runtime.', error)
    return
  }

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.86
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '氯化钠溶液配制三维实验台：电子天平上的称量纸、50 mL量筒、胶头滴管、烧杯、玻璃棒、洗瓶和成品试剂瓶')
  sceneElement.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = new Color(0xddd6c5)
  scene.fog = new Fog(0xddd6c5, 17, 36)
  const camera = new OrthographicCamera(-7, 7, 3.5, -3.5, 0.1, 60)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.enablePan = false
  controls.minZoom = 0.7
  controls.maxZoom = 1.55
  controls.minPolarAngle = Math.PI * 0.24
  controls.maxPolarAngle = Math.PI * 0.53
  controls.minAzimuthAngle = -1.0
  controls.maxAzimuthAngle = 1.0
  let autoOrbitAngle = 0
  let autoOrbitDirection = 1
  let lockedView = null
  const autoOrbitOffset = new Vector3()
  const lockedOffset = new Vector3()

  function setFrontView() {
    if (lockedView) return
    camera.position.set(0, 3.65, 13.8)
    controls.target.set(0, 1.18, 0)
    camera.zoom = DEFAULT_CAMERA_ZOOM
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()
    controls.update()
  }
  setFrontView()

  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture
  pmrem.dispose()
  scene.add(new HemisphereLight(0xf5fbff, 0x596a72, 1.18))
  const key = new DirectionalLight(0xf7fbff, 2.4)
  key.position.set(-4.8, 8.8, 7.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -7
  key.shadow.camera.right = 7
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -4
  key.shadow.bias = -0.00035
  scene.add(key)
  const fill = new DirectionalLight(0xdcecff, 0.68)
  fill.position.set(6, 4.5, 7)
  scene.add(fill)
  const rim = new DirectionalLight(0xd8eaff, 0.9)
  rim.position.set(-3, 5, -7)
  scene.add(rim)
  const softbox = new RectAreaLight(0xf4f9ff, 1.5, 7, 4)
  softbox.position.set(1.5, 6.5, 4.5)
  softbox.lookAt(0, 1.2, 0)
  scene.add(softbox)

  const materials = createLabMaterials()
  const panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 10.15,
    radius: 9.8,
    name: 'solution-oxygen-lab-panorama',
  })
  const environment = createOxygenLabEnvironment({
    root: scene,
    roundedBox,
    width: 10.15,
    depth: 3.65,
    topY: -0.05,
    name: 'solution-oxygen-lab-environment',
  })
  const forestDecor = new Group()
  forestDecor.name = 'forest-workbench-architecture'
  const violetDecor = new Group()
  violetDecor.name = 'violet-workbench-architecture'
  const lavaDecor = new Group()
  lavaDecor.name = 'lava-workbench-architecture'
  environment.group.add(forestDecor, violetDecor, lavaDecor)

  const forestWood = environment.materials.cabinet.clone()
  forestWood.color.setHex(0xa97c52)
  forestWood.roughness = 0.58
  const forestWoodLight = forestWood.clone()
  forestWoodLight.color.setHex(0xc39a70)
  const forestBrass = environment.materials.rail.clone()
  forestBrass.color.setHex(0xb58a4c)
  forestBrass.metalness = 0.72
  const forestFront = roundedBox(9.55, 3.08, 0.2, 0.1, forestWood)
  forestFront.position.set(0, -1.92, 1.66)
  forestFront.receiveShadow = true
  forestDecor.add(forestFront)
  for (let index = 0; index < 25; index += 1) {
    const slat = roundedBox(0.075, 2.86, 0.045, 0.015, index % 2 ? forestWood : forestWoodLight)
    slat.position.set(-4.5 + index * 0.375, -1.92, 1.79)
    forestDecor.add(slat)
  }
  const forestBrassEdge = roundedBox(9.72, 0.055, 0.08, 0.014, forestBrass)
  forestBrassEdge.position.set(0, -0.2, 1.82)
  forestDecor.add(forestBrassEdge)
  const terrazzoSpeck = environment.materials.counterInset.clone()
  terrazzoSpeck.color.setHex(0xb2a47e)
  terrazzoSpeck.roughness = 0.7
  for (let index = 0; index < 38; index += 1) {
    const speck = roundedBox(0.045 + (index % 4) * 0.018, 0.006, 0.035 + (index % 3) * 0.015, 0.01, terrazzoSpeck)
    speck.position.set(-4.65 + ((index * 1.37) % 9.3), 0.026, -1.48 + ((index * 0.83) % 2.96))
    speck.rotation.y = index * 0.71
    forestDecor.add(speck)
  }

  const violetBase = environment.materials.cabinetSide.clone()
  violetBase.color.setHex(0x10172f)
  violetBase.roughness = 0.32
  violetBase.metalness = 0.34
  const violetCopper = environment.materials.rail.clone()
  violetCopper.color.setHex(0xb16f43)
  violetCopper.metalness = 0.84
  const violetFront = roundedBox(9.55, 3.08, 0.22, 0.035, violetBase)
  violetFront.position.set(0, -1.92, 1.67)
  violetDecor.add(violetFront)
  ;[-3.75, -2.25, -0.75, 0.75, 2.25, 3.75].forEach((x, index) => {
    const diagonal = roundedBox(1.8, 0.035, 0.055, 0.012, violetCopper)
    diagonal.position.set(x, -1.88, 1.81)
    diagonal.rotation.z = index % 2 ? -0.82 : 0.82
    violetDecor.add(diagonal)
  })
  const violetCopperEdge = roundedBox(9.72, 0.045, 0.075, 0.012, violetCopper)
  violetCopperEdge.position.set(0, -0.2, 1.82)
  violetDecor.add(violetCopperEdge)
  const mineralVein = environment.materials.counterEdge.clone()
  mineralVein.color.setHex(0xb3a8bf)
  mineralVein.metalness = 0.04
  mineralVein.roughness = 0.62
  for (let index = 0; index < 13; index += 1) {
    const vein = roundedBox(0.72 + (index % 4) * 0.22, 0.004, 0.012, 0.005, mineralVein)
    vein.position.set(-4.2 + ((index * 1.61) % 8.4), 0.028, -1.35 + ((index * 0.91) % 2.7))
    vein.rotation.y = -0.55 + (index % 5) * 0.23
    violetDecor.add(vein)
  }

  const lavaRust = environment.materials.cabinetSide.clone()
  lavaRust.color.setHex(0x42180e)
  lavaRust.roughness = 0.7
  lavaRust.metalness = 0.34
  const lavaDark = lavaRust.clone()
  lavaDark.color.setHex(0x160b08)
  const lavaCopper = environment.materials.rail.clone()
  lavaCopper.color.setHex(0xb85c2d)
  lavaCopper.metalness = 0.74
  const lavaFront = roundedBox(9.55, 3.08, 0.22, 0.04, lavaRust)
  lavaFront.position.set(0, -1.92, 1.67)
  lavaDecor.add(lavaFront)
  ;[-3.6, -1.8, 0, 1.8, 3.6].forEach((x, panelIndex) => {
    const y = -1.82 + (panelIndex % 2) * 0.08
    const top = roundedBox(0.88, 0.045, 0.055, 0.012, lavaDark)
    top.position.set(x, y + 0.66, 1.81)
    const bottom = top.clone()
    bottom.position.y = y - 0.66
    lavaDecor.add(top, bottom)
    ;[-1, 1].forEach((side) => {
      const upper = roundedBox(0.78, 0.045, 0.055, 0.012, lavaDark)
      upper.position.set(x + side * 0.58, y + 0.33, 1.81)
      upper.rotation.z = side * Math.PI / 3
      const lower = upper.clone()
      lower.position.y = y - 0.33
      lower.rotation.z = -side * Math.PI / 3
      lavaDecor.add(upper, lower)
    })
  })
  const lavaCopperEdge = roundedBox(9.72, 0.05, 0.08, 0.014, lavaCopper)
  lavaCopperEdge.position.set(0, -0.2, 1.82)
  lavaDecor.add(lavaCopperEdge)
  const basaltSpeck = environment.materials.counterInset.clone()
  basaltSpeck.color.setHex(0x6b5b50)
  basaltSpeck.roughness = 0.92
  for (let index = 0; index < 46; index += 1) {
    const speck = roundedBox(0.035 + (index % 5) * 0.014, 0.006, 0.028 + (index % 4) * 0.012, 0.008, basaltSpeck)
    speck.position.set(-4.65 + ((index * 1.73) % 9.3), 0.027, -1.48 + ((index * 1.07) % 2.96))
    speck.rotation.y = index * 0.83
    lavaDecor.add(speck)
  }
  const appElement = document.querySelector('.app')
  const skinButtons = [...document.querySelectorAll('[data-skin-option]')]
  const textureLoader = new TextureLoader()
  const skinTextures = new Map([['glacier', panorama.texture]])
  let activeSkin = 'glacier'

  const preparePanoramaTexture = (texture) => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.repeat.x = -1
    texture.offset.x = 1
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    return texture
  }

  const applyWorkbenchSkin = (skin) => {
    const { materials: benchMaterials, contactShadow } = environment
    materials.table.color.setHex(skin.surface ?? skin.counter)
    materials.table.roughness = skin.surfaceRoughness ?? 0.5
    materials.table.metalness = skin.surfaceMetalness ?? 0.08
    materials.table.clearcoat = skin.surfaceClearcoat ?? 0.16
    materials.tableInset.color.setHex(skin.surfaceInset ?? skin.counterInset)
    materials.tableInset.roughness = skin.surfaceInsetRoughness ?? skin.surfaceRoughness ?? 0.48
    materials.tableInset.metalness = skin.surfaceInsetMetalness ?? skin.surfaceMetalness ?? 0.06
    materials.tableInset.clearcoat = skin.surfaceInsetClearcoat ?? skin.surfaceClearcoat ?? 0.14
    materials.tableEdge.color.setHex(skin.surfaceEdge ?? skin.counterEdge)
    benchMaterials.counter.color.setHex(skin.counter)
    benchMaterials.counter.roughness = skin.counterRoughness ?? 0.54
    benchMaterials.counter.metalness = skin.counterMetalness ?? 0.08
    benchMaterials.counter.clearcoat = skin.counterClearcoat ?? 0.18
    benchMaterials.counterInset.color.setHex(skin.counterInset)
    benchMaterials.counterInset.roughness = skin.insetRoughness ?? 0.5
    benchMaterials.counterInset.metalness = skin.insetMetalness ?? 0.06
    benchMaterials.counterEdge.color.setHex(skin.counterEdge)
    benchMaterials.cabinet.color.setHex(skin.cabinet)
    benchMaterials.cabinetSide.color.setHex(skin.cabinetSide)
    benchMaterials.sageDoor.color.setHex(skin.door)
    benchMaterials.sageInset.color.setHex(skin.doorInset)
    benchMaterials.drawer.color.setHex(skin.drawer)
    benchMaterials.drawerInset.color.setHex(skin.drawerInset)
    benchMaterials.rail.color.setHex(skin.rail ?? skin.counterEdge)
    benchMaterials.woodTrim.color.setHex(skin.trim)
    benchMaterials.woodTrim.metalness = skin.trimMetalness ?? 0.72
    benchMaterials.woodTrim.roughness = skin.trimRoughness ?? 0.28
    benchMaterials.toeKick.color.setHex(skin.toe)
    benchMaterials.warmLight.color.setHex(skin.light)
    benchMaterials.warmLight.opacity = skin.lightOpacity ?? 0.2
    contactShadow.material.color.setHex(skin.shadow)
    scene.background.setHex(skin.background)
    scene.fog.color.setHex(skin.fog)
  }

  const applySkin = (skinKey) => {
    const skin = SKINS[skinKey]
    if (!skin) return
    activeSkin = skinKey
    appElement.dataset.skin = skinKey
    forestDecor.visible = skinKey === 'forest'
    violetDecor.visible = skinKey === 'violet'
    lavaDecor.visible = skinKey === 'lava'
    applyWorkbenchSkin(skin)
    skinButtons.forEach((button) => {
      const selected = button.dataset.skinOption === skinKey
      button.classList.toggle('active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    if (skinTextures.has(skinKey)) {
      panorama.material.map = skinTextures.get(skinKey)
      panorama.material.needsUpdate = true
      return
    }
    textureLoader.load(skin.panorama, (texture) => {
      preparePanoramaTexture(texture)
      skinTextures.set(skinKey, texture)
      if (activeSkin !== skinKey) return
      panorama.material.map = texture
      panorama.material.needsUpdate = true
    }, undefined, (error) => {
      console.warn(`Unable to load the ${skinKey} laboratory skin.`, error)
    })
  }

  skinButtons.forEach((button) => {
    button.addEventListener('click', () => applySkin(button.dataset.skinOption))
  })
  applySkin('glacier')
  const apparatusRoot = new Group()
  apparatusRoot.name = 'solution-preparation-apparatus'
  apparatusRoot.position.set(0, -0.05, 0)
  scene.add(apparatusRoot)
  const apparatus = buildApparatus(apparatusRoot, materials)

  const state = {
    step: 0,
    stepTime: 0,
    isPlaying: false,
    autoSequence: false,
    autoView: false,
    lastFrame: 0,
  }

  const homes = {
    paper: new Vector3(-3.55, 0.505, 0.1),
    paperPark: new Vector3(-3.65, 0.02, 1.35),
    spatula: new Vector3(-1.75, 0.19, 1.08),
    washBottle: new Vector3(1.05, 0.04, -0.78),
    cylinder: new Vector3(0.05, 0.08, 0.2),
    dropperPark: new Vector3(0.2, 0.16, 1.45),
    dropperMeasure: new Vector3(0.05, 3.66, 0.24),
    beaker: new Vector3(2.28, 0.07, 0.18),
    rod: new Vector3(1.52, 0.14, 0.76),
    product: new Vector3(4.12, 0.06, 0.02),
  }

  const paths = {
    paperPlace: [
      homes.paperPark,
      new Vector3(-3.65, 0.78, 1.35),
      new Vector3(-3.55, 0.78, 0.1),
      homes.paper,
    ],
    saltCap: [
      new Vector3(0, 1.5, 0),
      new Vector3(0, 1.83, 0),
      new Vector3(0.82, 1.83, 0.38),
      new Vector3(0.82, 0.08, 0.38),
    ],
    washBottle: [
      homes.washBottle,
      new Vector3(1.05, 1.9, -0.78),
      new Vector3(-0.89, 1.9, -0.78),
      new Vector3(-0.89, 0.82, 0.3),
    ],
    paperToBeaker: [
      homes.paper,
      new Vector3(-3.55, 1.3, 0.1),
      new Vector3(-3.55, 1.3, 1.15),
      new Vector3(1.75, 2.35, 1.15),
      new Vector3(1.75, 2.25, 0.22),
    ],
    paperReturn: [
      new Vector3(1.75, 2.25, 0.22),
      new Vector3(1.75, 2.35, 1.15),
      new Vector3(-3, 1.3, 1.35),
      new Vector3(-3, 0.02, 1.35),
    ],
    cylinderPour: [
      homes.cylinder,
      new Vector3(0.05, 0.58, 0.72),
      new Vector3(-0.2, 0.58, 0.72),
      new Vector3(-0.2, 0.54, 0.18),
    ],
  }

  const streamStart = new Vector3()
  const streamEnd = new Vector3()
  const streamDirection = new Vector3()
  const streamUp = new Vector3(0, 1, 0)

  function alignStreamToAnchors(stream, startAnchor, endAnchor) {
    apparatusRoot.updateWorldMatrix(true, false)
    startAnchor.getWorldPosition(streamStart)
    endAnchor.getWorldPosition(streamEnd)
    apparatusRoot.worldToLocal(streamStart)
    apparatusRoot.worldToLocal(streamEnd)
    streamDirection.subVectors(streamEnd, streamStart)
    const length = streamDirection.length()
    stream.position.copy(streamStart).add(streamEnd).multiplyScalar(0.5)
    stream.quaternion.setFromUnitVectors(streamUp, streamDirection.normalize())
    stream.scale.y = length
  }

  const ui = {
    steps: document.getElementById('steps'),
    metricStep: document.getElementById('metricStep'),
    metricSalt: document.getElementById('metricSalt'),
    metricWater: document.getElementById('metricWater'),
    operationNote: document.getElementById('operationNote'),
    knowledgePanel: document.getElementById('knowledgePanel'),
    knowledgeKicker: document.getElementById('knowledgeKicker'),
    knowledgeContent: document.getElementById('knowledgeContent'),
    errorPanel: document.getElementById('errorPanel'),
    errorList: document.getElementById('errorList'),
    captionIndex: document.querySelector('.caption-index'),
    captionTitle: document.getElementById('captionTitle'),
    captionCopy: document.getElementById('captionCopy'),
    play: document.getElementById('playButton'),
    front: document.getElementById('frontButton'),
    rotate: document.getElementById('rotateButton'),
    lockView: document.getElementById('lockViewButton'),
    reset: document.getElementById('resetButton'),
  }

  const lessonCopy = [
    {
      kicker: '计算依据',
      html: '<div class="formula"><span>m<sub>NaCl</sub> = 50 g × 6%</span><strong>= 3.0 g</strong></div><div class="formula"><span>m<sub>水</sub> = 50 g − 3.0 g</span><strong>= 47.0 g</strong></div><div class="formula"><span>V<sub>水</sub> ≈ 47.0 g ÷ 1 g/mL</span><strong>≈ 47 mL</strong></div>',
      title: '先计算，再操作',
      caption: '氯化钠 3.0 g；蒸馏水约 47 mL',
      note: '根据溶质质量分数公式确定溶质与水的用量。',
    },
    {
      kicker: '称量要点',
      html: '<div class="tip-row"><b>①</b><span>称量纸放在天平托盘上，先去皮</span></div><div class="tip-row"><b>②</b><span>用药匙逐步加入氯化钠</span></div><div class="tip-row"><b>③</b><span>过量时用药匙取回，不得用手</span></div>',
      title: '称量纸隔离药品与托盘',
      caption: '药匙少量多次添加，读数稳定在 3.0 g',
      note: '称量纸已去皮；氯化钠不得直接接触天平托盘。',
    },
    {
      kicker: '读数校验',
      html: '<div class="reading-value"><span>量筒规格</span><strong>50 mL</strong></div><div class="reading-value"><span>最小分度</span><strong>1 mL</strong></div><div class="reading-value accent"><span>凹液面最低处</span><strong>47 mL</strong></div><p class="micro-copy">量筒竖直放在水平桌面；视线保持水平。滴管垂直悬空，不伸入量筒。</p>',
      title: '粗量后逐滴调整',
      caption: '先加至接近刻度，再用胶头滴管调到 47 mL',
      note: '正在量取蒸馏水：视线与凹液面最低处保持水平。',
    },
    {
      kicker: '转移顺序',
      html: '<div class="sequence"><span>称量纸上的 3.0 g NaCl</span><i>→</i><span>烧杯</span></div><div class="sequence"><span>量筒中的 47 mL 水</span><i>→</i><span>沿烧杯内壁</span></div><p class="micro-copy">两份药品均完整转移；不得在量筒内溶解氯化钠。</p>',
      title: '盐先入杯，水后沿壁加入',
      caption: '同一份氯化钠和水连续转移到烧杯中',
      note: '先完整转移固体，再让量筒中的水沿烧杯内壁缓慢流入。',
    },
    {
      kicker: '溶解要点',
      html: '<div class="tip-row"><b>✓</b><span>玻璃棒轻轻搅拌</span></div><div class="tip-row"><b>✓</b><span>棒端始终位于烧杯内部</span></div><div class="tip-row"><b>✓</b><span>晶体逐渐变小直至消失</span></div><p class="micro-copy">不加热；不出现气泡、沉淀或温度特效。</p>',
      title: '轻轻搅拌至完全溶解',
      caption: '最终得到无色透明的氯化钠溶液',
      note: '玻璃棒在烧杯内轻轻搅拌，白色晶体逐渐消失。',
    },
    {
      kicker: '成品确认',
      html: '<div class="final-label"><small>细口试剂瓶 · 成品标签</small><strong>氯化钠溶液 6%</strong><em>净质量 50 g</em></div><div class="tip-row"><b>①</b><span>将同一份溶液转入清洁细口试剂瓶</span></div><div class="tip-row"><b>②</b><span>贴签、盖紧瓶塞并整理实验台</span></div>',
      title: '装入细口试剂瓶，贴签并盖塞',
      caption: '成品标签：氯化钠溶液 6% · 净质量 50 g',
      note: '配制完成：无色透明溶液已装入细口试剂瓶。',
    },
  ]

  function buildInterface() {
    ui.steps.replaceChildren()
    spec.steps.forEach((step, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'step'
      button.dataset.step = String(index)
      button.setAttribute('aria-label', `步骤 ${index + 1}：${step.name}。${step.copy}`)
      button.innerHTML = `<span class="step-num">${index + 1}</span><strong>${step.name}</strong><small class="step-copy">${step.copy}</small>`
      button.addEventListener('click', () => setStep(index, { play: true, autoSequence: true }))
      ui.steps.appendChild(button)
    })
    ui.errorList.replaceChildren()
    spec.errorAnalysis.forEach(([cause, result]) => {
      const row = document.createElement('div')
      row.className = 'error-row'
      row.innerHTML = `<strong>${cause}</strong><span>${result}</span>`
      ui.errorList.appendChild(row)
    })
  }

  function setCrystalFraction(group, fraction, shrink = false) {
    const count = group.children.length
    group.children.forEach((crystal, index) => {
      const threshold = (index + 0.25) / count
      crystal.visible = fraction > threshold * 0.94
      crystal.position.copy(crystal.userData.home)
      const dissolveScale = shrink ? clamp01((fraction - threshold * 0.28) / 0.72) : 1
      crystal.scale.copy(crystal.userData.baseScale).multiplyScalar(dissolveScale)
    })
  }

  function setCylinderVolume(volumeMl) {
    const volume = MathUtils.clamp(volumeMl, 0, 50)
    const height = Math.max(0.001, (volume / 50) * apparatus.cylinder.scaleHeight)
    const bottom = apparatus.cylinder.innerBottom
    apparatus.cylinder.liquid.scale.y = height
    apparatus.cylinder.liquid.position.y = bottom + height / 2
    const lowestPointY = bottom + height
    apparatus.cylinder.meniscus.position.y = lowestPointY + 0.035
    apparatus.cylinder.liquid.visible = volume > 0.05
    apparatus.cylinder.meniscus.visible = volume > 0.05
  }

  function setBeakerVolume(fraction) {
    const amount = clamp01(fraction)
    const height = Math.max(0.001, 0.72 * amount)
    apparatus.beaker.liquid.scale.y = height
    apparatus.beaker.liquid.position.y = 0.1 + height / 2
    apparatus.beaker.surface.position.y = 0.1 + height
    apparatus.beaker.liquid.visible = amount > 0.01
    apparatus.beaker.surface.visible = amount > 0.01
  }

  function setProductVolume(fraction) {
    const amount = clamp01(fraction)
    // 留出瓶肩下方的头空，使无色液面与瓶肩轮廓保持可辨。
    const height = Math.max(0.001, 0.84 * amount)
    apparatus.product.liquid.scale.y = height
    apparatus.product.liquid.position.y = 0.1 + height / 2
    apparatus.product.surface.position.y = 0.1 + height
    apparatus.product.liquid.visible = amount > 0.01
    apparatus.product.surface.visible = amount > 0.01
  }

  function resetApparatus() {
    apparatus.paper.group.position.copy(homes.paper)
    apparatus.paper.group.rotation.set(0, 0, 0)
    apparatus.paper.group.visible = true
    apparatus.paper.crystals.children.forEach((crystal) => {
      crystal.position.copy(crystal.userData.home)
      crystal.scale.copy(crystal.userData.baseScale)
    })
    apparatus.spatula.position.copy(homes.spatula)
    apparatus.spatula.rotation.set(0, 0, 0.05)
    apparatus.washBottle.group.position.copy(homes.washBottle)
    apparatus.washBottle.group.rotation.set(0, 0, 0)
    apparatus.washBottle.group.visible = true
    apparatus.cylinder.rig.position.copy(homes.cylinder)
    apparatus.cylinder.rig.rotation.set(0, 0, 0)
    apparatus.dropper.group.position.copy(homes.dropperPark)
    apparatus.dropper.group.rotation.set(0, 0, 1.42)
    apparatus.dropper.droplet.visible = false
    apparatus.eyeLine.visible = false
    apparatus.cylinder.marker47.visible = false
    apparatus.beaker.group.position.copy(homes.beaker)
    apparatus.beaker.group.rotation.set(0, 0, 0)
    apparatus.rod.pivot.position.copy(homes.rod)
    apparatus.rod.pivot.rotation.set(0, 0, Math.PI / 2 - 0.08)
    apparatus.rod.pivot.visible = true
    apparatus.transferStream.visible = false
    apparatus.transferStream.scale.set(1, 1, 1)
    apparatus.bottlingStream.visible = false
    apparatus.bottlingStream.scale.set(1, 1, 1)
    apparatus.measureStream.visible = false
    apparatus.measureStream.scale.set(1, 1, 1)
    apparatus.looseLabel.visible = true
    apparatus.product.label.visible = false
    apparatus.product.label.scale.setScalar(1)
    apparatus.product.massLabel.visible = false
    apparatus.product.massLabel.scale.setScalar(1)
    apparatus.product.namePlate.visible = true
    apparatus.product.cap.position.set(0.72, 0.22, 0.12)
    apparatus.product.group.position.copy(homes.product)
    apparatus.product.group.scale.setScalar(1)
    apparatus.saltBottle.cap.position.set(0, 1.5, 0)
    setCylinderVolume(0)
    setBeakerVolume(0)
    setProductVolume(0)
    setCrystalFraction(apparatus.paper.crystals, 0)
    setCrystalFraction(apparatus.beaker.salt, 0)
  }

  function updateApparatus(progress, elapsedSeconds) {
    const step = state.step
    const p = clamp01(progress)
    resetApparatus()

    if (step === 0) {
      apparatus.paper.group.position.copy(homes.paperPark)
      apparatus.balance.display.updateText('0.0 g')
      return
    }

    if (step === 1) {
      // 称量纸先竖直抬起，再高位平移并落到托盘，禁止斜线穿越天平。
      setPathPosition(apparatus.paper.group, phase(p, 0, 0.2), paths.paperPlace)

      const addProgress = clamp01((p - 0.36) / 0.32)
      const cycleCount = 3
      const scaledCycle = addProgress * cycleCount
      const completedScoops = Math.min(cycleCount, Math.floor(scaledCycle))
      const scoopLocal = completedScoops >= cycleCount ? 1 : scaledCycle - completedScoops
      const depositLocal = phase(scoopLocal, 0.5, 0.66)
      const added = Math.min(1, (completedScoops + depositLocal) / cycleCount)
      const correction = phase(p, 0.68, 0.78)
      const mass = correction > 0 ? lerp(3.2, 3.0, correction) : 3.2 * added
      apparatus.balance.display.updateText(`${mass.toFixed(1)} g`)
      setCrystalFraction(apparatus.paper.crystals, Math.min(1, mass / 3.2))

      // 瓶盖严格按“提起—侧移—落下”路径开合，关盖时原路返回。
      const bottleOpen = phase(p, 0.2, 0.3) * (1 - phase(p, 0.86, 0.98))
      setPathPosition(apparatus.saltBottle.cap, bottleOpen, paths.saltCap)

      const spatulaParkHigh = new Vector3(-1.75, 2.2, 1.08)
      const bottleAbove = new Vector3(-1.72, 2.2, -0.22)
      const bottleDip = new Vector3(-1.72, 1.5, -0.22)
      const paperAbove = new Vector3(-3.4, 2.2, 0.1)
      const paperDeposit = new Vector3(-3.4, 0.92, 0.1)
      const paperScoop = new Vector3(-3.4, 0.8, 0.1)
      const bottleAngle = -1.35
      const paperAngle = -Math.PI + 0.08

      if (p < 0.3) {
        apparatus.spatula.position.copy(homes.spatula)
      } else if (p < 0.36) {
        const approach = phase(p, 0.3, 0.36)
        setPathPosition(apparatus.spatula, approach, [homes.spatula, spatulaParkHigh, bottleAbove, bottleDip])
        apparatus.spatula.rotation.z = lerp(0.05, bottleAngle, phase(approach, 0.28, 0.78))
      } else if (p < 0.68) {
        setPathPosition(apparatus.spatula, scoopLocal, [
          bottleDip,
          bottleAbove,
          paperAbove,
          paperDeposit,
          paperAbove,
          bottleAbove,
          bottleDip,
        ])
        const facePaper = phase(scoopLocal, 0.24, 0.44) * (1 - phase(scoopLocal, 0.7, 0.9))
        apparatus.spatula.rotation.z = lerp(bottleAngle, paperAngle, facePaper)
      } else if (p < 0.78) {
        setPathPosition(apparatus.spatula, correction, [
          bottleDip,
          bottleAbove,
          paperAbove,
          paperScoop,
          paperAbove,
          bottleAbove,
          bottleDip,
        ])
        const facePaper = phase(correction, 0.2, 0.42) * (1 - phase(correction, 0.68, 0.9))
        apparatus.spatula.rotation.z = lerp(bottleAngle, paperAngle, facePaper)
      } else {
        const returnToPark = phase(p, 0.78, 0.86)
        setPathPosition(apparatus.spatula, returnToPark, [bottleDip, bottleAbove, spatulaParkHigh, homes.spatula])
        apparatus.spatula.rotation.z = lerp(bottleAngle, 0.05, phase(returnToPark, 0.3, 0.9))
      }
      return
    }

    if (step === 2) {
      apparatus.balance.display.updateText('3.0 g')
      setCrystalFraction(apparatus.paper.crystals, 3 / 3.2)
      const coarse = phase(p, 0.3, 0.55)
      const fine = phase(p, 0.82, 0.94)
      const volume = 44 * coarse + 3 * fine
      setCylinderVolume(volume)

      // 洗瓶先在后景竖直抬高，越过器材后横移，再从量筒左侧下降。
      const washPose = phase(p, 0.06, 0.28) * (1 - phase(p, 0.55, 0.66))
      setPathPosition(apparatus.washBottle.group, washPose, paths.washBottle)
      apparatus.washBottle.group.rotation.z = -0.12 * phase(washPose, 0.82, 1)
      apparatus.measureStream.visible = p >= 0.3 && p < 0.55
      if (apparatus.measureStream.visible) {
        alignStreamToAnchors(apparatus.measureStream, apparatus.washBottle.nozzleTip, apparatus.cylinder.fillTarget)
      }

      // 洗瓶完全退出后，再把滴管从前侧停放位抬到高处、转正并垂直下降。
      if (p < 0.64) {
        apparatus.dropper.group.position.copy(homes.dropperPark)
        apparatus.dropper.group.rotation.set(0, 0, 1.42)
      } else if (p < 0.7) {
        const liftDropper = phase(p, 0.64, 0.7)
        apparatus.dropper.group.position.lerpVectors(homes.dropperPark, new Vector3(0.2, 3.9, 1.45), liftDropper)
        apparatus.dropper.group.rotation.set(0, 0, 1.42)
      } else if (p < 0.77) {
        const moveDropper = phase(p, 0.7, 0.77)
        apparatus.dropper.group.position.lerpVectors(new Vector3(0.2, 3.9, 1.45), new Vector3(0.05, 3.96, 0.24), moveDropper)
        apparatus.dropper.group.rotation.set(0, 0, lerp(1.42, 0, moveDropper))
      } else {
        apparatus.dropper.group.position.lerpVectors(new Vector3(0.05, 3.96, 0.24), homes.dropperMeasure, phase(p, 0.77, 0.81))
        apparatus.dropper.group.rotation.set(0, 0, 0)
      }
      const dropCycle = (elapsedSeconds * 3.1) % 1
      apparatus.dropper.droplet.position.y = -0.89 - dropCycle * 0.17
      apparatus.dropper.droplet.visible = p > 0.82 && p < 0.94 && dropCycle < 0.72
      apparatus.eyeLine.visible = p >= 0.94
      apparatus.cylinder.marker47.visible = p >= 0.94
      return
    }

    if (step === 3) {
      apparatus.washBottle.group.visible = false
      const paperMove = phase(p, 0.04, 0.3)
      const paperUnload = phase(p, 0.04, 0.09)
      apparatus.balance.display.updateText(`${lerp(3, 0, paperUnload).toFixed(1)} g`)
      setPathPosition(apparatus.paper.group, paperMove, paths.paperToBeaker)
      const paperTilt = phase(p, 0.28, 0.36)
      const paperUntil = phase(p, 0.48, 0.53)
      apparatus.paper.group.rotation.z = -0.58 * paperTilt * (1 - paperUntil)
      const saltTransfer = phase(p, 0.34, 0.48)
      setCrystalFraction(apparatus.paper.crystals, (3 / 3.2) * (1 - saltTransfer))
      apparatus.paper.crystals.children.forEach((crystal, index) => {
        if (!crystal.visible || p < 0.34) return
        const fall = phase(p, 0.34 + (index % 7) * 0.006, 0.48 + (index % 5) * 0.006)
        crystal.position.x = crystal.userData.home.x + fall * 0.62
        crystal.position.y = crystal.userData.home.y - fall * 1.18
      })
      setCrystalFraction(apparatus.beaker.salt, phase(p, 0.38, 0.5))

      const paperReturn = phase(p, 0.5, 0.55)
      if (paperReturn > 0) setPathPosition(apparatus.paper.group, paperReturn, paths.paperReturn)

      // 量筒先离桌并走前侧安全通道，到位后才倾斜；倒液时嘴口保持固定。
      const cylinderPose = phase(p, 0.55, 0.68) * (1 - phase(p, 0.94, 1))
      setPathPosition(apparatus.cylinder.rig, cylinderPose, paths.cylinderPour)
      const cylinderTilt = phase(p, 0.68, 0.76) * (1 - phase(p, 0.9, 0.94))
      apparatus.cylinder.rig.rotation.z = -0.72 * cylinderTilt
      const pour = phase(p, 0.76, 0.9)
      setCylinderVolume(47 * (1 - pour))
      if (cylinderTilt > 0.04) apparatus.cylinder.meniscus.visible = false
      setBeakerVolume(pour)
      apparatus.transferStream.visible = p >= 0.76 && p < 0.9
      if (apparatus.transferStream.visible) {
        alignStreamToAnchors(apparatus.transferStream, apparatus.cylinder.pourAnchor, apparatus.beaker.innerWallTarget)
        apparatus.transferStream.scale.x = 0.96 + Math.sin(elapsedSeconds * 13) * 0.04
        apparatus.transferStream.scale.z = apparatus.transferStream.scale.x
      }
      return
    }

    if (step === 4) {
      apparatus.washBottle.group.visible = false
      apparatus.balance.display.updateText('0.0 g')
      apparatus.paper.group.visible = false
      setBeakerVolume(1)
      const remaining = 1 - phase(p, 0.12, 0.91)
      setCrystalFraction(apparatus.beaker.salt, remaining, true)
      apparatus.rod.pivot.position.set(homes.beaker.x, 0.18, homes.beaker.z)
      apparatus.rod.pivot.rotation.set(0, reducedMotion.matches ? 0.3 : elapsedSeconds * 2.2, 0)
      return
    }

    apparatus.balance.display.updateText('0.0 g')
    apparatus.washBottle.group.visible = false
    apparatus.paper.group.visible = false
    const lift = phase(p, 0.08, 0.32)
    const tilt = phase(p, 0.26, 0.42)
    const pour = phase(p, 0.38, 0.65)
    const returnHome = phase(p, 0.66, 0.8)
    apparatus.beaker.group.position.set(
      lerp(lerp(homes.beaker.x, 2.55, lift), homes.beaker.x, returnHome),
      lerp(lerp(homes.beaker.y, 1.72, lift), homes.beaker.y, returnHome),
      lerp(homes.beaker.z, 0.18, lift),
    )
    apparatus.beaker.group.rotation.z = -0.75 * tilt * (1 - returnHome)
    setBeakerVolume(1 - pour)
    setProductVolume(pour)
    apparatus.bottlingStream.visible = p > 0.38 && p < 0.65
    if (apparatus.bottlingStream.visible) {
      alignStreamToAnchors(apparatus.bottlingStream, apparatus.beaker.pourAnchor, apparatus.product.fillTarget)
      const pulse = 0.96 + Math.sin(elapsedSeconds * 12) * 0.04
      apparatus.bottlingStream.scale.x = pulse
      apparatus.bottlingStream.scale.z = pulse
    }
    const productFocus = phase(p, 0.68, 0.9)
    apparatus.product.group.position.z = lerp(homes.product.z, 0.34, productFocus)
    apparatus.product.group.scale.setScalar(1 + productFocus * 0.055)
    apparatus.product.label.visible = p > 0.74
    apparatus.looseLabel.visible = p < 0.74
    const labelAttach = phase(p, 0.74, 0.87)
    apparatus.product.label.scale.setScalar(Math.max(0.001, labelAttach))
    apparatus.product.massLabel.visible = p > 0.78
    apparatus.product.massLabel.scale.setScalar(Math.max(0.001, phase(p, 0.78, 0.89)))
    apparatus.product.namePlate.visible = p < 0.74
    const capClose = phase(p, 0.88, 0.98)
    apparatus.product.cap.position.set(
      lerp(0.72, 0, capClose),
      lerp(0.22, 1.82, capClose),
      lerp(0.12, 0, capClose),
    )
    if (p >= 0.98) {
      setBeakerVolume(0)
      setProductVolume(1)
      apparatus.product.label.visible = true
      apparatus.product.label.scale.setScalar(1)
      apparatus.product.massLabel.visible = true
      apparatus.product.massLabel.scale.setScalar(1)
    }
  }

  function renderInterface() {
    const progress = spec.steps[state.step].duration ? clamp01(state.stepTime / spec.steps[state.step].duration) : 1
    const copy = lessonCopy[state.step]
    Array.from(ui.steps.children).forEach((button, index) => {
      button.classList.toggle('active', index === state.step)
      button.classList.toggle('done', index < state.step || (index === state.step && progress >= 0.999))
      button.setAttribute('aria-current', index === state.step ? 'step' : 'false')
      button.style.setProperty('--step-progress', index === state.step ? String(progress) : index < state.step ? '1' : '0')
    })
    ui.metricStep.textContent = spec.steps[state.step].name
    ui.metricSalt.textContent = state.step === 4 && progress < 0.94 ? '3.0 g · 溶解中' : '3.0 g'
    if (state.step === 2) {
      const liveVolume = 44 * phase(progress, 0.3, 0.55) + 3 * phase(progress, 0.82, 0.94)
      ui.metricWater.textContent = `${Math.min(47, Math.round(liveVolume))} mL / 47 mL`
    } else ui.metricWater.textContent = '47 mL'
    ui.operationNote.textContent = copy.note
    if (ui.knowledgePanel.dataset.step !== String(state.step)) {
      ui.knowledgePanel.dataset.step = String(state.step)
      ui.knowledgeKicker.textContent = copy.kicker
      ui.knowledgeContent.innerHTML = copy.html
    }
    ui.captionIndex.textContent = String(state.step + 1).padStart(2, '0')
    ui.captionTitle.textContent = copy.title
    ui.captionCopy.textContent = copy.caption
    const showErrors = state.step === 5 && progress >= 0.94
    ui.errorPanel.hidden = !showErrors
    ui.errorPanel.classList.toggle('show', showErrors)
    ui.play.textContent = state.isPlaying
      ? '暂停'
      : state.stepTime > 0 && progress < 1
        ? '继续完整播放'
        : state.step === spec.steps.length - 1 && progress >= 1
          ? '重新完整播放'
          : '完整播放'
    ui.play.setAttribute('aria-pressed', String(state.isPlaying))
    ui.rotate.setAttribute('aria-pressed', String(state.autoView))
    ui.rotate.textContent = state.autoView ? '停止环绕' : '环绕'
    ui.rotate.setAttribute('aria-label', state.autoView
      ? '停止左右往返环绕运镜'
      : '开启左右往返环绕运镜')
    const isViewLocked = Boolean(lockedView)
    ui.lockView.setAttribute('aria-pressed', String(isViewLocked))
    ui.lockView.textContent = isViewLocked ? '解除锁定' : '锁定视角'
    ui.lockView.setAttribute('aria-label', isViewLocked
      ? '解除当前观察距离锁定'
      : '锁定当前观察距离，保持正常环绕')
    ui.front.disabled = isViewLocked
  }

  function setStep(index, options = {}) {
    state.step = Math.max(0, Math.min(spec.steps.length - 1, index))
    state.stepTime = options.complete ? spec.steps[state.step].duration : 0
    state.isPlaying = Boolean(options.play) && !options.complete
    state.autoSequence = Boolean(options.autoSequence)
    updateApparatus(state.stepTime / spec.steps[state.step].duration, state.stepTime)
    renderInterface()
  }

  function resetLesson() {
    state.step = 0
    state.stepTime = 0
    state.isPlaying = false
    state.autoSequence = false
    state.autoView = false
    state.lastFrame = 0
    setFrontView()
    updateApparatus(0, 0)
    renderInterface()
  }

  ui.play.addEventListener('click', () => {
    if (state.isPlaying) {
      state.isPlaying = false
    } else if (state.stepTime > 0 && state.stepTime < spec.steps[state.step].duration) {
      state.isPlaying = true
      state.autoSequence = true
    } else {
      setStep(0, { play: true, autoSequence: true })
    }
    renderInterface()
  })
  ui.front.addEventListener('click', () => {
    state.autoView = false
    setFrontView()
    renderInterface()
  })
  ui.rotate.addEventListener('click', () => {
    state.autoView = !state.autoView
    if (state.autoView) {
      autoOrbitOffset.copy(camera.position).sub(controls.target)
      autoOrbitAngle = Math.atan2(autoOrbitOffset.x, autoOrbitOffset.z)
      autoOrbitDirection = autoOrbitAngle >= controls.maxAzimuthAngle - 0.01 ? -1 : 1
    }
    renderInterface()
  })
  ui.lockView.addEventListener('click', () => {
    if (lockedView) {
      lockedView = null
      controls.enableZoom = true
    } else {
      lockedView = {
        distance: camera.position.distanceTo(controls.target),
        zoom: camera.zoom,
      }
      controls.enableZoom = false
    }
    renderInterface()
  })
  ui.reset.addEventListener('click', resetLesson)
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      state.autoView = false
      renderInterface()
    }
  })

  controls.addEventListener('start', () => {
    if (!state.autoView) return
    state.autoView = false
    renderInterface()
  })

  function updateAutoOrbit(delta) {
    if (!state.autoView || reducedMotion.matches) return
    autoOrbitAngle += AUTO_ORBIT_SPEED * delta * autoOrbitDirection
    if (autoOrbitAngle >= controls.maxAzimuthAngle) {
      autoOrbitAngle = controls.maxAzimuthAngle
      autoOrbitDirection = -1
    } else if (autoOrbitAngle <= controls.minAzimuthAngle) {
      autoOrbitAngle = controls.minAzimuthAngle
      autoOrbitDirection = 1
    }
    autoOrbitOffset.copy(camera.position).sub(controls.target)
    const horizontalDistance = Math.hypot(autoOrbitOffset.x, autoOrbitOffset.z)
    autoOrbitOffset.x = Math.sin(autoOrbitAngle) * horizontalDistance
    autoOrbitOffset.z = Math.cos(autoOrbitAngle) * horizontalDistance
    camera.position.copy(controls.target).add(autoOrbitOffset)
    camera.lookAt(controls.target)
  }

  function enforceLockedViewDistance() {
    if (!lockedView) return
    lockedOffset.copy(camera.position).sub(controls.target)
    if (lockedOffset.lengthSq() > 0) {
      camera.position.copy(controls.target).add(lockedOffset.setLength(lockedView.distance))
    }
    if (camera.zoom !== lockedView.zoom) {
      camera.zoom = lockedView.zoom
      camera.updateProjectionMatrix()
    }
  }

  function resizeScene() {
    const width = sceneElement.clientWidth
    const height = sceneElement.clientHeight
    renderer.setSize(width, height, false)
    const aspect = width / Math.max(1, height)
    const viewHeight = aspect < 1.35 ? 8.4 : aspect < 1.75 ? 7.2 : 6.45
    camera.left = (-viewHeight * aspect) / 2
    camera.right = (viewHeight * aspect) / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
    panorama.fitCamera(camera)
  }
  window.addEventListener('resize', resizeScene)

  buildInterface()
  resizeScene()
  resetLesson()
  setStep(0, { play: true, autoSequence: true })
  window.__SOLUTION_PREPARATION__ = {
    state,
    scene,
    camera,
    controls,
    renderer,
    apparatus,
    environment,
    panorama,
    setFrontView,
    toggleViewLock() { ui.lockView.click() },
    get viewLocked() { return Boolean(lockedView) },
    reset: resetLesson,
    goToStep(index, complete = false) {
      setStep(index, { complete, play: !complete, autoSequence: false })
    },
    seek(fraction) {
      state.stepTime = clamp01(fraction) * spec.steps[state.step].duration
      state.isPlaying = false
      updateApparatus(fraction, state.stepTime)
      renderInterface()
    },
  }

  let firstFrame = true
  renderer.setAnimationLoop((timestamp) => {
    const seconds = timestamp / 1000
    const delta = state.lastFrame ? Math.min((timestamp - state.lastFrame) / 1000, 0.05) : 0
    state.lastFrame = timestamp
    if (state.isPlaying) {
      state.stepTime += reducedMotion.matches ? Math.min(delta, 0.016) : delta
      const duration = spec.steps[state.step].duration
      if (state.stepTime >= duration) {
        state.stepTime = duration
        if (state.autoSequence && state.step < spec.steps.length - 1) {
          const next = state.step + 1
          setStep(next, { play: true, autoSequence: true })
        } else {
          state.isPlaying = false
          state.autoSequence = false
        }
      }
    }
    const progress = clamp01(state.stepTime / spec.steps[state.step].duration)
    updateApparatus(progress, seconds)
    renderInterface()
    controls.update()
    updateAutoOrbit(delta)
    enforceLockedViewDistance()
    renderer.render(scene, camera)
    if (firstFrame) {
      firstFrame = false
      requestAnimationFrame(() => loadingElement.classList.add('hidden'))
    }
  })
}
