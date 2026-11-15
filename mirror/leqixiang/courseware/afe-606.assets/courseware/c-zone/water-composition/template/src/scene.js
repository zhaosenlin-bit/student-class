import {
  ACESFilmicToneMapping,
  BackSide,
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Fog,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from '../vendor/three.module.js'
import { OrbitControls } from '../vendor/OrbitControls.js'
import { RoomEnvironment } from '../vendor/RoomEnvironment.js'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import {
  createOxygenLabEnvironment,
  createOxygenLabPanorama,
} from '../../../../shared/oxygen-lab-environment.js'

const FRONT_CAMERA = new Vector3(0, 2.55, 13.5)
const FRONT_TARGET = new Vector3(0, 1.45, 0)
const AUTO_ORBIT_SPEED = 0.055
const STEP_VIEWS = Object.freeze([
  { x: 0, y: 1.45, zoom: .82 },
  { x: 0, y: 2.65, zoom: 1 },
  { x: 0, y: 2.25, zoom: 1.12 },
  { x: 0, y: 3.15, zoom: 1.22 },
  { x: -3.75, y: 2.05, zoom: 1.65 },
  { x: 3.55, y: 2.05, zoom: 1.65 },
])
const TUBE_BOTTOM = 0.82
const TUBE_TOP = 5.02
const TUBE_WATER_HEIGHT = TUBE_TOP - TUBE_BOTTOM

export function createWaterCompositionScene() {
  const sceneElement = document.querySelector('#scene')
  const loadingElement = document.querySelector('#loading')
  const fallbackElement = document.querySelector('#fallback')
  const spec = window.__WATER_COMPOSITION_SPEC__
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const state = {
    step: 0,
    stepElapsed: 0,
    motionTime: 0,
    autoPlaying: false,
    paused: false,
    sequenceStarted: false,
    lastFrame: 0,
    liquidFill: 0.08,
    gasProgress: 0,
    powerOn: false,
  }

  let renderer
  try {
    renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
  } catch (error) {
    fallbackElement?.classList.add('show')
    loadingElement?.classList.add('hidden')
    console.error('无法初始化水电解课件的 WebGL 场景。', error)
    return
  }

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute(
    'aria-label',
    '水电解三维装置：左侧阴极连接负极并收集氢气，右侧阳极连接正极并收集氧气，两支集气管带刻度并与中央储液结构连通。',
  )
  sceneElement.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = null
  scene.fog = new Fog(0xe8efec, 15, 28)

  const camera = new OrthographicCamera(-6, 6, 4, -4, 0.1, 60)
  camera.position.copy(FRONT_CAMERA)
  camera.lookAt(FRONT_TARGET)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(FRONT_TARGET)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.enablePan = false
  controls.enableRotate = true
  controls.enableZoom = true
  controls.autoRotate = false
  // 2∶1 超宽屏下也不能让最大全貌越出有限的全景壳。
  controls.minZoom = STEP_VIEWS[0].zoom
  controls.maxZoom = 2.2
  controls.minPolarAngle = Math.PI * 0.34
  controls.maxPolarAngle = Math.PI * 0.5
  controls.minAzimuthAngle = -0.72
  controls.maxAzimuthAngle = 0.95
  let viewGoal = null
  let autoOrbiting = false
  let autoOrbitAngle = 0
  let autoOrbitDirection = 1
  let lockedView = null
  const orbitOffset = new Vector3()
  const lockedOffset = new Vector3()
  const frontButton = document.querySelector('#frontButton')
  const orbitButton = document.querySelector('#orbitButton')
  const lockViewButton = document.querySelector('#lockViewButton')

  function syncAutoOrbitUI() {
    orbitButton?.setAttribute('aria-pressed', String(autoOrbiting))
    if (!orbitButton) return
    orbitButton.textContent = autoOrbiting ? '停止环绕' : '环绕'
    orbitButton.setAttribute('aria-label', autoOrbiting
      ? '停止左右往返环绕运镜'
      : '开启左右往返环绕运镜')
  }

  function stopAutoOrbit() {
    if (!autoOrbiting) return
    autoOrbiting = false
    syncAutoOrbitUI()
  }

  function toggleAutoOrbit() {
    if (autoOrbiting) {
      stopAutoOrbit()
      return false
    }
    viewGoal = null
    orbitOffset.copy(camera.position).sub(controls.target)
    autoOrbitAngle = Math.atan2(orbitOffset.x, orbitOffset.z)
    autoOrbitDirection = autoOrbitAngle >= controls.maxAzimuthAngle - 0.01 ? -1 : 1
    autoOrbiting = true
    syncAutoOrbitUI()
    return true
  }

  function updateAutoOrbit(dt) {
    if (!autoOrbiting || reducedMotion.matches) return
    autoOrbitAngle += AUTO_ORBIT_SPEED * dt * autoOrbitDirection
    if (autoOrbitAngle >= controls.maxAzimuthAngle) {
      autoOrbitAngle = controls.maxAzimuthAngle
      autoOrbitDirection = -1
    } else if (autoOrbitAngle <= controls.minAzimuthAngle) {
      autoOrbitAngle = controls.minAzimuthAngle
      autoOrbitDirection = 1
    }
    orbitOffset.copy(camera.position).sub(controls.target)
    const horizontalDistance = Math.hypot(orbitOffset.x, orbitOffset.z)
    orbitOffset.x = Math.sin(autoOrbitAngle) * horizontalDistance
    orbitOffset.z = Math.cos(autoOrbitAngle) * horizontalDistance
    camera.position.copy(controls.target).add(orbitOffset)
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

  function syncViewLockUI() {
    const isLocked = Boolean(lockedView)
    lockViewButton?.setAttribute('aria-pressed', String(isLocked))
    if (lockViewButton) {
      lockViewButton.textContent = isLocked ? '解除锁定' : '锁定视角'
      lockViewButton.setAttribute('aria-label', isLocked
        ? '解除当前观察距离锁定'
        : '锁定当前观察距离，保持正常环绕')
    }
    if (frontButton) frontButton.disabled = isLocked
  }

  function toggleViewLock() {
    if (lockedView) {
      lockedView = null
      controls.enableZoom = true
      syncViewLockUI()
      return false
    }
    viewGoal = null
    lockedView = {
      distance: camera.position.distanceTo(controls.target),
      zoom: camera.zoom,
    }
    controls.enableZoom = false
    enforceLockedViewDistance()
    syncViewLockUI()
    return true
  }

  controls.addEventListener('start', () => {
    viewGoal = null
    stopAutoOrbit()
  })

  const panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 10.9,
    name: 'water-oxygen-lab-panorama',
  })

  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const hemisphere = new HemisphereLight(0xf8fffc, 0x72837c, 1.35)
  scene.add(hemisphere)

  const keyLight = new DirectionalLight(0xfff9ec, 2.75)
  keyLight.position.set(-4.5, 9.5, 8)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.left = -7
  keyLight.shadow.camera.right = 7
  keyLight.shadow.camera.top = 8
  keyLight.shadow.camera.bottom = -3
  keyLight.shadow.bias = -0.0005
  scene.add(keyLight)

  const fillLight = new DirectionalLight(0xcceeff, 1.1)
  fillLight.position.set(6, 5, 7)
  scene.add(fillLight)

  const rimLight = new DirectionalLight(0xffdfc6, 0.75)
  rimLight.position.set(-4, 4, -6)
  scene.add(rimLight)

  const materials = {
    bench: new MeshPhysicalMaterial({ color: 0x64736e, roughness: 0.42, metalness: 0.12, clearcoat: 0.18 }),
    benchTop: new MeshPhysicalMaterial({ color: 0xa9b5b1, roughness: 0.32, metalness: 0.08, clearcoat: 0.22 }),
    steel: new MeshStandardMaterial({ color: 0x667579, roughness: 0.25, metalness: 0.75 }),
    darkSteel: new MeshStandardMaterial({ color: 0x263237, roughness: 0.34, metalness: 0.66 }),
    brass: new MeshStandardMaterial({ color: 0xa9834e, roughness: 0.28, metalness: 0.72 }),
    ceramic: new MeshPhysicalMaterial({ color: 0xebe9df, roughness: 0.42, metalness: 0.02, clearcoat: 0.18 }),
    rubberSeal: new MeshStandardMaterial({ color: 0x364142, roughness: 0.88, metalness: 0.01 }),
    graphite: new MeshStandardMaterial({ color: 0x202629, roughness: 0.72, metalness: 0.08 }),
    glass: new MeshPhysicalMaterial({
      color: 0xc5e7e8,
      transparent: true,
      opacity: 0.17,
      transmission: 0.06,
      roughness: 0.035,
      ior: 1.46,
      thickness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      side: DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.5,
    }),
    glassEdge: new MeshBasicMaterial({
      color: 0x76a6aa,
      transparent: true,
      opacity: 0.72,
      side: DoubleSide,
      depthWrite: false,
    }),
    glassHighlight: new MeshBasicMaterial({
      color: 0xf7ffff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      toneMapped: false,
    }),
    water: new MeshPhysicalMaterial({
      color: 0xd6ecea,
      transparent: true,
      opacity: 0.42,
      transmission: 0.12,
      roughness: 0.08,
      ior: 1.333,
      thickness: 0.22,
      clearcoat: 0.45,
      side: DoubleSide,
      depthWrite: false,
    }),
    waterSurface: new MeshBasicMaterial({
      color: 0xeafffd,
      transparent: true,
      opacity: 0.76,
      side: DoubleSide,
      depthWrite: false,
    }),
    gas: new MeshPhysicalMaterial({
      color: 0xf7ffff,
      transparent: true,
      opacity: 0.055,
      transmission: 0.16,
      roughness: 0.025,
      side: DoubleSide,
      depthWrite: false,
    }),
    scale: new MeshBasicMaterial({ color: 0x3f6f70, transparent: true, opacity: 0.78, depthWrite: false }),
    blackWire: new MeshStandardMaterial({ color: 0x20282b, roughness: 0.58, metalness: 0.05 }),
    redWire: new MeshStandardMaterial({ color: 0xb8423b, roughness: 0.52, metalness: 0.04 }),
    powerBody: new MeshPhysicalMaterial({ color: 0x34464a, roughness: 0.28, metalness: 0.24, clearcoat: 0.35 }),
    powerFace: new MeshPhysicalMaterial({ color: 0xd9e2df, roughness: 0.32, metalness: 0.08, clearcoat: 0.4 }),
    wood: new MeshStandardMaterial({ color: 0xa16d3d, roughness: 0.84, metalness: 0 }),
  }

  const makeRoundedBox = (width, height, depth, radius, material) => {
    const mesh = new Mesh(new RoundedBoxGeometry(width, height, depth, 5, radius), material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  const addEdges = (mesh, color = 0x7d918b, opacity = 0.28) => {
    const edges = new LineSegments(
      new EdgesGeometry(mesh.geometry, 32),
      new LineBasicMaterial({ color, transparent: true, opacity }),
    )
    edges.renderOrder = (mesh.renderOrder || 0) + 1
    mesh.add(edges)
    return edges
  }

  const makeCurvedTube = (points, radius, material, segments = 72) => {
    const curve = new CatmullRomCurve3(points, false, 'centripetal')
    const tube = new Mesh(new TubeGeometry(curve, segments, radius, 14, false), material)
    tube.castShadow = material !== materials.glass && material !== materials.water
    return tube
  }

  const root = new Group()
  root.name = 'water-electrolysis-apparatus'
  scene.add(root)

  const environment = createOxygenLabEnvironment({
    root: scene,
    roundedBox: makeRoundedBox,
    width: 10.9,
    depth: 4.8,
    topY: 0.193,
    name: 'water-oxygen-lab-environment',
  })

  const stand = new Group()
  stand.name = 'support-frame'
  root.add(stand)

  const standBase = makeRoundedBox(7.1, 0.16, 1.0, 0.07, materials.darkSteel)
  standBase.position.set(0, 0.31, -0.75)
  stand.add(standBase)

  ;[-2.72, 2.72].forEach((x) => {
    const foot = makeRoundedBox(0.62, 0.08, 0.72, 0.045, materials.rubberSeal)
    foot.name = 'support-frame-rubber-foot'
    foot.position.set(x, 0.205, -0.74)
    stand.add(foot)
  })

  ;[-3.05, 3.05].forEach((x) => {
    const post = new Mesh(new CylinderGeometry(0.055, 0.07, 4.55, 20), materials.steel)
    post.position.set(x, 2.54, -0.72)
    post.castShadow = true
    stand.add(post)
  })

  ;[1.12, 4.28].forEach((y) => {
    const rail = makeRoundedBox(6.2, 0.09, 0.12, 0.035, materials.steel)
    rail.position.set(0, y, -0.7)
    stand.add(rail)
  })

  const collectionTubes = {}

  function createCollectionTube({ x, kind }) {
    const direction = x < 0 ? -1 : 1
    const group = new Group()
    group.name = `${kind}-collection-tube`
    group.position.set(x, (TUBE_BOTTOM + TUBE_TOP) / 2, 0)
    root.add(group)

    const tubeHeight = TUBE_TOP - TUBE_BOTTOM + 0.28
    const wall = new Mesh(new CylinderGeometry(0.56, 0.56, tubeHeight, 64, 1, true), materials.glass)
    wall.name = `${kind}-glass-wall`
    wall.renderOrder = 12
    group.add(wall)

    const edgeShell = new Mesh(
      new CylinderGeometry(0.565, 0.565, tubeHeight, 64, 1, true),
      materials.glassEdge.clone(),
    )
    edgeShell.material.opacity = 0.16
    edgeShell.name = `${kind}-glass-edge-shell`
    edgeShell.renderOrder = 17
    group.add(edgeShell)

    const topCap = new Mesh(new CircleGeometry(0.56, 64), materials.glass)
    topCap.rotation.x = -Math.PI / 2
    topCap.position.y = tubeHeight / 2
    topCap.renderOrder = 14
    group.add(topCap)

    const topRim = new Mesh(new TorusGeometry(0.56, 0.025, 12, 64), materials.glassEdge)
    topRim.rotation.x = Math.PI / 2
    topRim.position.y = tubeHeight / 2
    topRim.renderOrder = 19
    group.add(topRim)

    const valveNeck = new Mesh(
      new CylinderGeometry(0.12, 0.17, 0.28, 32),
      materials.glass,
    )
    valveNeck.name = `${kind}-sampling-valve-neck`
    valveNeck.position.y = tubeHeight / 2 + 0.14
    valveNeck.renderOrder = 16
    group.add(valveNeck)

    const valveBody = new Mesh(
      new CylinderGeometry(0.135, 0.135, 0.42, 32),
      materials.glassEdge,
    )
    valveBody.name = `${kind}-sampling-stopcock-body`
    valveBody.rotation.z = Math.PI / 2
    valveBody.position.set(0, tubeHeight / 2 + 0.32, 0)
    valveBody.renderOrder = 20
    group.add(valveBody)

    const valvePlug = new Mesh(
      new CylinderGeometry(0.072, 0.072, 0.49, 24),
      materials.ceramic,
    )
    valvePlug.name = `${kind}-sampling-stopcock-plug`
    valvePlug.rotation.z = Math.PI / 2
    valvePlug.position.set(0, tubeHeight / 2 + 0.32, 0.015)
    valvePlug.castShadow = true
    group.add(valvePlug)

    const valveHandle = makeRoundedBox(0.42, 0.075, 0.13, 0.025, materials.darkSteel)
    valveHandle.name = `${kind}-sampling-stopcock-handle`
    valveHandle.position.set(0, tubeHeight / 2 + 0.32, 0.14)
    valveHandle.renderOrder = 23
    group.add(valveHandle)

    const outletPath = [
      new Vector3(direction * 0.16, tubeHeight / 2 + 0.32, 0),
      new Vector3(direction * 0.38, tubeHeight / 2 + 0.31, 0),
      new Vector3(direction * 0.54, tubeHeight / 2 + 0.2, 0),
    ]
    const samplingOutlet = makeCurvedTube(outletPath, 0.065, materials.glass, 34)
    samplingOutlet.name = `${kind}-sampling-outlet`
    samplingOutlet.renderOrder = 17
    group.add(samplingOutlet)

    const bottomRim = new Mesh(new TorusGeometry(0.56, 0.025, 12, 64), materials.glassEdge)
    bottomRim.rotation.x = Math.PI / 2
    bottomRim.position.y = -tubeHeight / 2
    bottomRim.renderOrder = 19
    group.add(bottomRim)

    const wallHighlight = makeRoundedBox(
      0.025,
      tubeHeight * 0.78,
      0.018,
      0.008,
      materials.glassHighlight,
    )
    wallHighlight.name = `${kind}-glass-highlight`
    wallHighlight.position.set(-0.38, 0, 0.555)
    wallHighlight.castShadow = false
    wallHighlight.receiveShadow = false
    wallHighlight.renderOrder = 23
    group.add(wallHighlight)

    const water = new Mesh(new CylinderGeometry(0.495, 0.495, TUBE_WATER_HEIGHT, 48), materials.water)
    water.name = `${kind}-water-column`
    water.renderOrder = 10
    root.add(water)

    const surface = new Mesh(new CircleGeometry(0.495, 48), materials.waterSurface)
    surface.name = `${kind}-water-surface`
    surface.rotation.x = -Math.PI / 2
    surface.renderOrder = 21
    root.add(surface)

    const meniscus = new Mesh(new TorusGeometry(0.49, 0.012, 8, 48), materials.waterSurface)
    meniscus.name = `${kind}-meniscus`
    meniscus.rotation.x = Math.PI / 2
    meniscus.renderOrder = 22
    root.add(meniscus)

    const gas = new Mesh(new CylinderGeometry(0.49, 0.49, 1, 48), materials.gas.clone())
    gas.name = `${kind}-colorless-gas-volume`
    gas.renderOrder = 13
    gas.visible = false
    root.add(gas)

    const gasTopLine = new Mesh(new TorusGeometry(0.49, 0.008, 8, 48), materials.waterSurface.clone())
    gasTopLine.material.opacity = 0.28
    gasTopLine.rotation.x = Math.PI / 2
    gasTopLine.position.set(x, TUBE_TOP, 0)
    gasTopLine.renderOrder = 20
    root.add(gasTopLine)

    const electrode = new Mesh(new CylinderGeometry(0.085, 0.095, 0.82, 24), materials.graphite)
    electrode.name = `${kind}-graphite-electrode`
    electrode.position.set(x, 1.05, 0.03)
    electrode.castShadow = true
    root.add(electrode)

    const electrodeCap = new Mesh(
      new CylinderGeometry(0.105, 0.125, 0.22, 24),
      materials.darkSteel,
    )
    electrodeCap.name = `${kind}-electrode-terminal-pin`
    electrodeCap.position.set(x, 0.58, 0.03)
    electrodeCap.castShadow = true
    root.add(electrodeCap)

    const electrodeSeal = new Mesh(
      new CylinderGeometry(0.16, 0.19, 0.18, 28),
      materials.ceramic,
    )
    electrodeSeal.name = `${kind}-electrode-ceramic-seal`
    electrodeSeal.position.set(x, 0.73, 0.03)
    electrodeSeal.castShadow = true
    root.add(electrodeSeal)

    const sealGasket = new Mesh(
      new TorusGeometry(0.16, 0.026, 10, 32),
      materials.rubberSeal,
    )
    sealGasket.name = `${kind}-electrode-sealing-gasket`
    sealGasket.rotation.x = Math.PI / 2
    sealGasket.position.set(x, 0.82, 0.03)
    sealGasket.castShadow = true
    root.add(sealGasket)

    const connectorMaterial = kind === 'hydrogen' ? materials.blackWire : materials.redWire
    const connectorSleeve = new Mesh(
      new CylinderGeometry(0.135, 0.135, 0.18, 24),
      connectorMaterial,
    )
    connectorSleeve.name = `${kind}-electrode-connector-sleeve`
    connectorSleeve.position.set(x, 0.45, 0.03)
    connectorSleeve.castShadow = true
    root.add(connectorSleeve)

    const clamp = new Mesh(new TorusGeometry(0.67, 0.045, 10, 40), materials.steel)
    clamp.name = `${kind}-tube-clamp`
    clamp.rotation.x = Math.PI / 2
    clamp.position.set(x, 4.28, 0)
    clamp.scale.z = 0.78
    clamp.castShadow = true
    root.add(clamp)

    const clampArm = makeRoundedBox(0.86, 0.075, 0.08, 0.025, materials.steel)
    clampArm.position.set(x + (x < 0 ? -0.77 : 0.77), 4.28, -0.37)
    root.add(clampArm)

    const clampScrew = new Mesh(
      new CylinderGeometry(0.038, 0.038, 0.3, 16),
      materials.brass,
    )
    clampScrew.name = `${kind}-clamp-tightening-screw`
    clampScrew.rotation.z = Math.PI / 2
    clampScrew.position.set(x + direction * 0.67, 4.28, -0.22)
    clampScrew.castShadow = true
    root.add(clampScrew)

    const clampKnob = new Mesh(new SphereGeometry(0.075, 18, 12), materials.brass)
    clampKnob.name = `${kind}-clamp-tightening-knob`
    clampKnob.position.set(x + direction * 0.83, 4.28, -0.22)
    clampKnob.castShadow = true
    root.add(clampKnob)

    for (let index = 0; index <= 20; index += 1) {
      const major = index % 5 === 0
      const medium = !major && index % 2 === 0
      const width = major ? 0.27 : medium ? 0.19 : 0.12
      const mark = new Mesh(new BoxGeometry(width, major ? 0.024 : 0.017, 0.018), materials.scale)
      mark.position.set(0.43 - width / 2, -1.93 + index * 0.1925, 0.57)
      mark.renderOrder = 24
      group.add(mark)
    }

    collectionTubes[kind] = {
      x,
      group,
      water,
      surface,
      meniscus,
      gas,
      electrode,
      valveHandle,
      valvePlug,
      samplingOutlet,
    }
  }

  createCollectionTube({ x: -1.65, kind: 'hydrogen' })
  createCollectionTube({ x: 1.65, kind: 'oxygen' })

  const reservoir = new Group()
  reservoir.name = 'central-reservoir'
  reservoir.position.set(0, 2.25, -0.36)
  root.add(reservoir)

  const reservoirWall = new Mesh(new CylinderGeometry(0.72, 0.72, 2.58, 64, 1, true), materials.glass)
  reservoirWall.renderOrder = 11
  reservoir.add(reservoirWall)

  const reservoirEdge = new Mesh(new CylinderGeometry(0.725, 0.725, 2.58, 64, 1, true), materials.glassEdge.clone())
  reservoirEdge.material.opacity = 0.15
  reservoirEdge.renderOrder = 15
  reservoir.add(reservoirEdge)

  const reservoirRim = new Mesh(new TorusGeometry(0.73, 0.035, 12, 64), materials.glassEdge)
  reservoirRim.rotation.x = Math.PI / 2
  reservoirRim.position.y = 1.29
  reservoirRim.renderOrder = 18
  reservoir.add(reservoirRim)

  const reservoirFunnel = new Mesh(
    new CylinderGeometry(0.91, 0.71, 0.34, 64, 1, true),
    materials.glass,
  )
  reservoirFunnel.name = 'central-reservoir-flared-filling-cup'
  reservoirFunnel.position.y = 1.44
  reservoirFunnel.renderOrder = 12
  reservoir.add(reservoirFunnel)

  const reservoirFunnelEdge = new Mesh(
    new CylinderGeometry(0.915, 0.715, 0.34, 64, 1, true),
    materials.glassEdge.clone(),
  )
  reservoirFunnelEdge.material.opacity = 0.16
  reservoirFunnelEdge.position.y = 1.44
  reservoirFunnelEdge.renderOrder = 16
  reservoir.add(reservoirFunnelEdge)

  const reservoirMouthRim = new Mesh(
    new TorusGeometry(0.92, 0.035, 12, 64),
    materials.glassEdge,
  )
  reservoirMouthRim.name = 'central-reservoir-filling-rim'
  reservoirMouthRim.rotation.x = Math.PI / 2
  reservoirMouthRim.position.y = 1.61
  reservoirMouthRim.renderOrder = 19
  reservoir.add(reservoirMouthRim)

  const reservoirBaseRim = new Mesh(
    new TorusGeometry(0.71, 0.024, 10, 56),
    materials.glassEdge,
  )
  reservoirBaseRim.name = 'central-reservoir-base-rim'
  reservoirBaseRim.rotation.x = Math.PI / 2
  reservoirBaseRim.position.y = -1.29
  reservoirBaseRim.renderOrder = 18
  reservoir.add(reservoirBaseRim)

  const reservoirHighlight = makeRoundedBox(
    0.026,
    1.92,
    0.018,
    0.008,
    materials.glassHighlight,
  )
  reservoirHighlight.name = 'central-reservoir-glass-highlight'
  reservoirHighlight.position.set(-0.48, -0.04, 0.69)
  reservoirHighlight.castShadow = false
  reservoirHighlight.receiveShadow = false
  reservoirHighlight.renderOrder = 22
  reservoir.add(reservoirHighlight)

  const reservoirWater = new Mesh(new CylinderGeometry(0.655, 0.655, 2.42, 48), materials.water)
  reservoirWater.name = 'reservoir-water'
  reservoirWater.renderOrder = 9
  root.add(reservoirWater)

  const reservoirSurface = new Mesh(new CircleGeometry(0.655, 48), materials.waterSurface)
  reservoirSurface.rotation.x = -Math.PI / 2
  reservoirSurface.renderOrder = 20
  root.add(reservoirSurface)

  const reservoirMeniscus = new Mesh(new TorusGeometry(0.65, 0.012, 8, 48), materials.waterSurface)
  reservoirMeniscus.rotation.x = Math.PI / 2
  reservoirMeniscus.renderOrder = 21
  root.add(reservoirMeniscus)

  const bridgeWaterMeshes = []
  ;[-1, 1].forEach((direction) => {
    const points = [
      new Vector3(direction * 0.56, 1.13, -0.31),
      new Vector3(direction * 0.92, 0.93, -0.24),
      new Vector3(direction * 1.35, 0.79, -0.1),
      new Vector3(direction * 1.65, 0.82, 0),
    ]
    const glassBridge = makeCurvedTube(points, 0.19, materials.glass, 56)
    glassBridge.name = direction < 0 ? 'cathode-glass-bridge' : 'anode-glass-bridge'
    glassBridge.renderOrder = 12
    root.add(glassBridge)

    const waterBridge = makeCurvedTube(points, 0.125, materials.water, 56)
    waterBridge.name = direction < 0 ? 'cathode-water-bridge' : 'anode-water-bridge'
    waterBridge.renderOrder = 10
    root.add(waterBridge)
    bridgeWaterMeshes.push(waterBridge)
  })

  const powerSupply = new Group()
  powerSupply.name = 'low-voltage-dc-power-supply'
  powerSupply.position.set(0, 0.71, 1.05)
  root.add(powerSupply)

  const powerBody = makeRoundedBox(1.95, 0.98, 1.05, 0.12, materials.powerBody)
  powerBody.castShadow = true
  powerSupply.add(powerBody)

  ;[-0.7, 0.7].forEach((x) => {
    const foot = makeRoundedBox(0.34, 0.1, 0.42, 0.04, materials.rubberSeal)
    foot.name = 'power-supply-rubber-foot'
    foot.position.set(x, -0.53, 0)
    powerSupply.add(foot)
  })

  const powerFace = makeRoundedBox(1.72, 0.72, 0.035, 0.07, materials.powerFace)
  powerFace.position.z = 0.545
  powerSupply.add(powerFace)

  const powerScreenMaterial = new MeshStandardMaterial({
    color: 0x19372f,
    emissive: 0x153c31,
    emissiveIntensity: 0.2,
    roughness: 0.28,
  })
  const powerScreen = makeRoundedBox(0.56, 0.27, 0.025, 0.035, powerScreenMaterial)
  powerScreen.position.set(0, 0.15, 0.58)
  powerSupply.add(powerScreen)

  const powerScreenGlass = makeRoundedBox(0.62, 0.32, 0.012, 0.04, materials.glass)
  powerScreenGlass.name = 'power-supply-display-cover'
  powerScreenGlass.position.set(0, 0.15, 0.605)
  powerScreenGlass.castShadow = false
  powerScreenGlass.renderOrder = 21
  powerSupply.add(powerScreenGlass)

  const indicatorMaterial = new MeshStandardMaterial({
    color: 0x46665b,
    emissive: 0x51d8aa,
    emissiveIntensity: 0,
    roughness: 0.26,
  })
  const powerIndicator = new Mesh(new SphereGeometry(0.06, 20, 16), indicatorMaterial)
  powerIndicator.position.set(0, 0.15, 0.625)
  powerSupply.add(powerIndicator)

  const terminalData = [
    { x: -0.67, material: materials.blackWire, name: 'negative-terminal' },
    { x: 0.67, material: materials.redWire, name: 'positive-terminal' },
  ]
  terminalData.forEach(({ x, material, name }) => {
    const bezel = new Mesh(
      new CylinderGeometry(0.155, 0.155, 0.075, 28),
      materials.brass,
    )
    bezel.name = `${name}-metal-bezel`
    bezel.rotation.x = Math.PI / 2
    bezel.position.set(x, -0.17, 0.585)
    bezel.castShadow = true
    powerSupply.add(bezel)

    const terminal = new Mesh(new CylinderGeometry(0.105, 0.105, 0.18, 24), material)
    terminal.name = name
    terminal.rotation.x = Math.PI / 2
    terminal.position.set(x, -0.17, 0.62)
    terminal.castShadow = true
    powerSupply.add(terminal)

    const terminalGrip = new Mesh(new TorusGeometry(0.108, 0.022, 8, 24), material)
    terminalGrip.name = `${name}-knurled-grip`
    terminalGrip.position.set(x, -0.17, 0.715)
    terminalGrip.castShadow = true
    powerSupply.add(terminalGrip)
  })

  ;[-0.76, 0.76].forEach((x) => {
    ;[-0.32, 0.32].forEach((y) => {
      const screw = new Mesh(new CylinderGeometry(0.028, 0.028, 0.025, 16), materials.steel)
      screw.name = 'power-supply-face-fastener'
      screw.rotation.x = Math.PI / 2
      screw.position.set(x, y, 0.59)
      powerSupply.add(screw)
    })
  })

  const minusSign = makeRoundedBox(0.21, 0.035, 0.025, 0.012, materials.blackWire)
  minusSign.position.set(-0.67, -0.39, 0.59)
  powerSupply.add(minusSign)

  const plusHorizontal = makeRoundedBox(0.21, 0.035, 0.025, 0.012, materials.redWire)
  plusHorizontal.position.set(0.67, -0.39, 0.59)
  powerSupply.add(plusHorizontal)

  const plusVertical = makeRoundedBox(0.035, 0.21, 0.025, 0.012, materials.redWire)
  plusVertical.position.set(0.67, -0.39, 0.59)
  powerSupply.add(plusVertical)

  const switchBase = makeRoundedBox(0.36, 0.18, 0.09, 0.04, materials.darkSteel)
  switchBase.position.set(0, -0.27, 0.59)
  powerSupply.add(switchBase)

  const switchHandle = makeRoundedBox(0.09, 0.25, 0.08, 0.03, materials.steel)
  switchHandle.position.set(0, -0.2, 0.67)
  switchHandle.rotation.z = -0.32
  powerSupply.add(switchHandle)

  const negativeWirePoints = [
    new Vector3(-0.67, 0.54, 1.68),
    new Vector3(-1.02, 0.35, 1.46),
    new Vector3(-1.45, 0.36, 0.72),
    new Vector3(-1.65, 0.62, 0.03),
  ]
  const negativeWire = makeCurvedTube(negativeWirePoints, 0.055, materials.blackWire, 72)
  negativeWire.name = 'negative-wire-to-cathode'
  root.add(negativeWire)

  const positiveWirePoints = [
    new Vector3(0.67, 0.54, 1.68),
    new Vector3(1.02, 0.35, 1.46),
    new Vector3(1.45, 0.36, 0.72),
    new Vector3(1.65, 0.62, 0.03),
  ]
  const positiveWire = makeCurvedTube(positiveWirePoints, 0.055, materials.redWire, 72)
  positiveWire.name = 'positive-wire-to-anode'
  root.add(positiveWire)

  const bubbleMaterial = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(0x6f9f9f) },
      uOpacity: { value: 0.62 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
        float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.35);
        float highlight = pow(max(dot(normalize(vWorldNormal), normalize(vViewDirection + vec3(-0.35, 0.8, 0.25))), 0.0), 18.0);
        gl_FragColor = vec4(uColor, uOpacity * (0.035 + rim * 0.92 + highlight * 0.3));
      }
    `,
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
  })
  const bubbleGeometry = new SphereGeometry(0.058, 20, 14)
  const bubbles = []

  function createBubbles(kind, count) {
    const tube = collectionTubes[kind]
    for (let index = 0; index < count; index += 1) {
      const bubble = new Mesh(bubbleGeometry, bubbleMaterial.clone())
      bubble.name = `${kind}-electrode-bubble-${index}`
      bubble.visible = false
      bubble.renderOrder = 25
      bubble.userData = {
        kind,
        phase: index / count,
        speed: 0.18 + (index % 6) * 0.016 + (kind === 'hydrogen' ? 0.035 : 0),
        offsetX: Math.sin(index * 2.73) * (kind === 'hydrogen' ? 0.18 : 0.13),
        offsetZ: Math.cos(index * 3.17) * 0.1,
        baseScale: 0.6 + (index % 5) * 0.1,
        tubeX: tube.x,
      }
      root.add(bubble)
      bubbles.push(bubble)
    }
  }

  createBubbles('hydrogen', 30)
  createBubbles('oxygen', 16)

  const createTestTube = (name) => {
    const group = new Group()
    group.name = name

    const wall = new Mesh(new CylinderGeometry(0.32, 0.32, 1.58, 48, 1, true), materials.glass)
    wall.position.y = 0.79
    wall.renderOrder = 14
    group.add(wall)

    const bottom = new Mesh(
      new SphereGeometry(0.32, 48, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      materials.glass,
    )
    bottom.renderOrder = 14
    group.add(bottom)

    const lip = new Mesh(new TorusGeometry(0.325, 0.025, 10, 48), materials.glassEdge)
    lip.rotation.x = Math.PI / 2
    lip.position.y = 1.58
    lip.renderOrder = 20
    group.add(lip)

    const innerLip = new Mesh(new TorusGeometry(0.285, 0.012, 8, 48), materials.glassHighlight)
    innerLip.rotation.x = Math.PI / 2
    innerLip.position.y = 1.58
    innerLip.renderOrder = 22
    group.add(innerLip)

    const highlight = makeRoundedBox(0.018, 1.18, 0.012, 0.006, materials.glassHighlight)
    highlight.position.set(-0.21, 0.82, 0.3)
    highlight.castShadow = false
    highlight.receiveShadow = false
    highlight.renderOrder = 21
    group.add(highlight)

    const gas = new Mesh(new CylinderGeometry(0.275, 0.275, 1.38, 40), materials.gas.clone())
    gas.position.y = 0.75
    gas.renderOrder = 12
    group.add(gas)
    return group
  }

  const createTestStand = (side, clampY = 0.82) => {
    const base = makeRoundedBox(1.2, 0.13, 0.72, 0.06, materials.darkSteel)
    base.position.set(0, -0.74, -0.18)
    side.add(base)

    const rodHeight = clampY + 1.55
    const rod = new Mesh(new CylinderGeometry(0.035, 0.045, rodHeight, 16), materials.steel)
    rod.position.set(-0.52, -0.74 + rodHeight / 2, -0.22)
    rod.castShadow = true
    side.add(rod)

    const clamp = makeRoundedBox(0.55, 0.065, 0.08, 0.025, materials.steel)
    clamp.position.set(-0.25, clampY, -0.13)
    side.add(clamp)

    const clampRing = new Mesh(new TorusGeometry(0.36, 0.032, 10, 36), materials.steel)
    clampRing.name = 'sample-tube-clamp-ring'
    clampRing.rotation.x = Math.PI / 2
    clampRing.position.set(0, clampY, -0.03)
    clampRing.scale.z = 0.82
    clampRing.castShadow = true
    side.add(clampRing)

    const clampPad = makeRoundedBox(0.12, 0.08, 0.14, 0.022, materials.rubberSeal)
    clampPad.name = 'sample-tube-clamp-pad'
    clampPad.position.set(-0.29, clampY, 0.02)
    side.add(clampPad)
  }

  const hydrogenTest = new Group()
  hydrogenTest.name = 'hydrogen-ignition-test'
  hydrogenTest.position.set(-4.28, 1.02, 0.08)
  hydrogenTest.visible = false
  root.add(hydrogenTest)
  createTestStand(hydrogenTest, 1.46)

  const hydrogenTube = createTestTube('hydrogen-sample-test-tube')
  hydrogenTube.position.set(0, 2.4, 0)
  hydrogenTube.rotation.z = Math.PI - 0.12
  hydrogenTest.add(hydrogenTube)

  const ignitionSplintGroup = new Group()
  ignitionSplintGroup.name = 'hydrogen-ignition-splint'
  ignitionSplintGroup.position.set(-1.35, 0.65, 0.035)
  ignitionSplintGroup.rotation.z = -Math.PI / 2 + 0.25
  hydrogenTest.add(ignitionSplintGroup)

  const ignitionSplint = makeRoundedBox(0.055, 1.25, 0.05, 0.016, materials.wood)
  ignitionSplint.name = 'hydrogen-test-burning-splint'
  ignitionSplintGroup.add(ignitionSplint)

  const ignitionChar = makeRoundedBox(0.074, 0.19, 0.065, 0.018, materials.graphite)
  ignitionChar.name = 'hydrogen-test-splint-charred-tip'
  ignitionChar.position.y = 0.56
  ignitionSplintGroup.add(ignitionChar)

  const ignitionEmberMaterial = new MeshStandardMaterial({
    color: 0xffc06a,
    emissive: 0xff6a2c,
    emissiveIntensity: 2.25,
    roughness: 0.4,
  })
  const ignitionEmber = new Mesh(new SphereGeometry(0.07, 18, 12), ignitionEmberMaterial)
  ignitionEmber.name = 'hydrogen-test-splint-ember'
  ignitionEmber.position.y = 0.675
  ignitionSplintGroup.add(ignitionEmber)

  const ignitionFlameMaterial = new MeshStandardMaterial({
    color: 0xffc15f,
    emissive: 0xff7a2d,
    emissiveIntensity: 2.1,
    transparent: true,
    opacity: 0.78,
    side: DoubleSide,
    depthWrite: false,
  })
  const ignitionFlame = new Mesh(new ConeGeometry(0.085, 0.24, 20), ignitionFlameMaterial)
  ignitionFlame.name = 'hydrogen-test-ignition-flame'
  ignitionFlame.position.y = 0.79
  ignitionFlame.renderOrder = 27
  ignitionSplintGroup.add(ignitionFlame)

  const blueFlame = new Group()
  blueFlame.name = 'pale-blue-hydrogen-flame'
  blueFlame.position.set(-0.22, 0.84, 0.02)
  hydrogenTest.add(blueFlame)

  const blueOuterMaterial = new MeshStandardMaterial({
    color: 0x56bad2,
    emissive: 0x268da9,
    emissiveIntensity: 1.15,
    transparent: true,
    opacity: 0.66,
    side: DoubleSide,
    depthWrite: false,
  })
  const blueInnerMaterial = new MeshStandardMaterial({
    color: 0xdcffff,
    emissive: 0x76d9e9,
    emissiveIntensity: 1.65,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
    depthWrite: false,
  })
  const blueOuter = new Mesh(new ConeGeometry(0.22, 0.55, 28), blueOuterMaterial)
  blueOuter.renderOrder = 26
  blueFlame.add(blueOuter)
  const blueInner = new Mesh(new ConeGeometry(0.09, 0.3, 24), blueInnerMaterial)
  blueInner.position.y = -0.1
  blueInner.renderOrder = 27
  blueFlame.add(blueInner)
  const blueLight = new PointLight(0x75ddeb, 0.45, 2.1, 2)
  blueFlame.add(blueLight)

  const oxygenTest = new Group()
  oxygenTest.name = 'oxygen-glowing-splint-test'
  oxygenTest.position.set(4.28, 1.02, 0.08)
  oxygenTest.visible = false
  root.add(oxygenTest)
  createTestStand(oxygenTest)

  const oxygenTube = createTestTube('oxygen-sample-test-tube')
  oxygenTube.rotation.z = 0.07
  oxygenTest.add(oxygenTube)

  const splintGroup = new Group()
  splintGroup.name = 'glowing-splint'
  splintGroup.position.set(0.09, 2.65, 0.05)
  splintGroup.rotation.z = -0.08
  oxygenTest.add(splintGroup)

  const splint = makeRoundedBox(0.08, 1.75, 0.07, 0.018, materials.wood)
  splintGroup.add(splint)

  const charredTip = makeRoundedBox(0.105, 0.24, 0.09, 0.025, materials.graphite)
  charredTip.name = 'glowing-splint-charred-tip'
  charredTip.position.y = -0.79
  splintGroup.add(charredTip)

  const emberMaterial = new MeshStandardMaterial({
    color: 0xff8b3d,
    emissive: 0xff4b21,
    emissiveIntensity: 2.6,
    roughness: 0.42,
  })
  const ember = new Mesh(new SphereGeometry(0.105, 20, 14), emberMaterial)
  ember.position.y = -0.88
  splintGroup.add(ember)

  const relightFlame = new Group()
  relightFlame.name = 'oxygen-relight-flame'
  relightFlame.position.y = -0.73
  splintGroup.add(relightFlame)

  const relightOuterMaterial = new MeshStandardMaterial({
    color: 0xffa13b,
    emissive: 0xff5f24,
    emissiveIntensity: 2.1,
    transparent: true,
    opacity: 0.74,
    side: DoubleSide,
    depthWrite: false,
  })
  const relightInnerMaterial = new MeshStandardMaterial({
    color: 0xfff2a6,
    emissive: 0xffb84c,
    emissiveIntensity: 2.7,
    transparent: true,
    opacity: 0.9,
    side: DoubleSide,
    depthWrite: false,
  })
  const relightOuter = new Mesh(new ConeGeometry(0.2, 0.58, 28), relightOuterMaterial)
  relightOuter.renderOrder = 26
  relightFlame.add(relightOuter)
  const relightInner = new Mesh(new ConeGeometry(0.08, 0.31, 20), relightInnerMaterial)
  relightInner.position.y = -0.09
  relightInner.renderOrder = 27
  relightFlame.add(relightInner)
  const relightLight = new PointLight(0xff7d32, 0.62, 2.2, 2)
  relightFlame.add(relightLight)

  const stepsElement = document.querySelector('#steps')
  const playButton = document.querySelector('#playButton')
  const resetButton = document.querySelector('#resetButton')
  const stepMetric = document.querySelector('#metricStep')
  const powerMetric = document.querySelector('#metricPower')
  const cathodeMetric = document.querySelector('#metricCathode')
  const anodeMetric = document.querySelector('#metricAnode')
  const observationText = document.querySelector('#observationText')
  const safetyText = document.querySelector('#safetyText')
  const ratioCard = document.querySelector('#ratioCard')
  const molecularPanel = document.querySelector('#molecularPanel')

  const labelAnchors = {
    labelHydrogen: new Vector3(-1.65, 5.35, 0),
    labelOxygen: new Vector3(1.65, 5.35, 0),
    labelReservoir: new Vector3(0, 3.48, -0.3),
    labelPower: new Vector3(0, 1.2, 1.55),
  }

  function buildStepButtons() {
    stepsElement.innerHTML = ''
    spec.steps.forEach((step, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'step'
      button.dataset.step = String(index)
      button.setAttribute('aria-label', `步骤 ${index + 1}：${step.name}`)
      button.innerHTML = `<span class="step-num">${String(index + 1).padStart(2, '0')}</span><strong>${step.name}</strong><span>${step.copy}</span>`
      button.addEventListener('click', () => {
        setStep(index)
        state.autoPlaying = true
        state.sequenceStarted = true
        renderInterface()
      })
      stepsElement.appendChild(button)
    })
  }

  function setStep(index, fromAuto = false) {
    if (!fromAuto) stopAutoOrbit()
    state.step = Math.max(0, Math.min(spec.steps.length - 1, index))
    state.stepElapsed = 0
    state.motionTime = 0
    if (!fromAuto) {
      state.autoPlaying = false
      state.paused = false
      state.sequenceStarted = false
    }
    setViewPreset(state.step)
    renderInterface()
  }

  function resetFrontView() {
    if (lockedView) return
    stopAutoOrbit()
    viewGoal = null
    camera.position.copy(FRONT_CAMERA)
    camera.zoom = STEP_VIEWS[0].zoom
    camera.updateProjectionMatrix()
    controls.target.copy(FRONT_TARGET)
    controls.update()
  }

  function setViewPreset(index) {
    if (lockedView) return
    const preset = STEP_VIEWS[index] || STEP_VIEWS[0]
    viewGoal = {
      x: preset.x,
      y: preset.y,
      cameraY: preset.y + 1.1,
      zoom: preset.zoom,
    }
  }

  function updateView(dt) {
    if (lockedView) return
    if (!viewGoal) return
    const k = 1 - Math.exp(-dt * 7.5)
    camera.position.x += (viewGoal.x - camera.position.x) * k
    camera.position.y += (viewGoal.cameraY - camera.position.y) * k
    camera.position.z += (13.5 - camera.position.z) * k
    controls.target.x += (viewGoal.x - controls.target.x) * k
    controls.target.y += (viewGoal.y - controls.target.y) * k
    controls.target.z += (0 - controls.target.z) * k
    camera.zoom += (viewGoal.zoom - camera.zoom) * k
    camera.updateProjectionMatrix()
    if (Math.abs(camera.zoom - viewGoal.zoom) < .003
      && Math.abs(controls.target.x - viewGoal.x) < .008
      && Math.abs(controls.target.y - viewGoal.y) < .008) viewGoal = null
  }

  function resetLesson() {
    state.step = 0
    state.stepElapsed = 0
    state.motionTime = 0
    state.autoPlaying = false
    state.paused = false
    state.sequenceStarted = false
    state.lastFrame = 0
    resetFrontView()
    renderInterface()
  }

  const smooth = (value) => {
    const clamped = MathUtils.clamp(value, 0, 1)
    return clamped * clamped * (3 - 2 * clamped)
  }

  function getStepVisualState() {
    const { step, stepElapsed } = state
    let liquidFill = 0.08
    let gasProgress = 0

    if (step === 1) liquidFill = 0.08 + 0.92 * smooth(stepElapsed / 2.6)
    if (step >= 2) liquidFill = 1

    if (step === 2) gasProgress = 0.04 + 0.24 * smooth(stepElapsed / 3.6)
    if (step === 3) gasProgress = 0.28 + 0.72 * smooth(stepElapsed / 4.8)
    if (step >= 4) gasProgress = 1

    return {
      liquidFill,
      gasProgress,
      powerOn: step === 2 || step === 3,
      hydrogenTestVisible: step === 4,
      oxygenTestVisible: step === 5,
    }
  }

  function updateTubeLiquid(tube, gasHeight, liquidFill) {
    const maxAvailableHeight = Math.max(0.05, TUBE_WATER_HEIGHT * liquidFill - gasHeight)
    const waterHeight = liquidFill < 0.98
      ? Math.max(0.04, TUBE_WATER_HEIGHT * liquidFill)
      : maxAvailableHeight
    const waterTop = TUBE_BOTTOM + waterHeight

    tube.water.scale.y = waterHeight / TUBE_WATER_HEIGHT
    tube.water.position.set(tube.x, TUBE_BOTTOM + waterHeight / 2, 0)
    tube.surface.position.set(tube.x, waterTop, 0)
    tube.meniscus.position.set(tube.x, waterTop, 0)

    tube.gas.visible = gasHeight > 0.015
    tube.gas.scale.y = Math.max(0.001, gasHeight)
    tube.gas.position.set(tube.x, TUBE_TOP - gasHeight / 2, 0)
    tube.gas.material.opacity = 0.025 + Math.min(0.045, gasHeight * 0.016)
    return waterTop
  }

  function updateReservoir(liquidFill, gasProgress) {
    const reservoirBottom = 0.97
    const reservoirMaxHeight = 2.42
    const initialFill = liquidFill * 0.62
    const displacedRise = gasProgress * 0.22
    const fill = MathUtils.clamp(initialFill + displacedRise, 0.04, 0.86)
    const height = reservoirMaxHeight * fill
    const top = reservoirBottom + height

    reservoirWater.scale.y = height / reservoirMaxHeight
    reservoirWater.position.set(0, reservoirBottom + height / 2, -0.36)
    reservoirSurface.position.set(0, top, -0.36)
    reservoirMeniscus.position.set(0, top, -0.36)
    bridgeWaterMeshes.forEach((mesh) => {
      mesh.visible = liquidFill > 0.1
      mesh.material.opacity = 0.26 + liquidFill * 0.16
    })
  }

  function updateBubbles(powerOn, waterTops) {
    bubbles.forEach((bubble, index) => {
      if (!powerOn) {
        bubble.visible = false
        return
      }

      const data = bubble.userData
      const phase = (state.motionTime * data.speed + data.phase) % 1
      const waterTop = waterTops[data.kind]
      const electrodeSurfaceY = 1.44
      const riseHeight = Math.max(0.1, waterTop - electrodeSurfaceY)
      const y = electrodeSurfaceY + phase * riseHeight
      bubble.visible = y < waterTop - 0.025
      bubble.position.set(
        data.tubeX + data.offsetX * (0.55 + phase * 0.45) + Math.sin(state.motionTime * 2.2 + index) * 0.025,
        y,
        0.05 + data.offsetZ,
      )
      const pulse = 0.88 + Math.sin(state.motionTime * 3.1 + index * 0.7) * 0.12
      const scale = data.baseScale * pulse
      bubble.scale.set(scale, scale * (0.92 + phase * 0.2), scale)
      bubble.material.uniforms.uOpacity.value = 0.4 + (1 - phase) * 0.28
    })
  }

  function updateTestAnimations(visual) {
    hydrogenTest.visible = visual.hydrogenTestVisible
    oxygenTest.visible = visual.oxygenTestVisible

    if (hydrogenTest.visible) {
      const entrance = smooth(state.stepElapsed / 0.75)
      hydrogenTest.position.x = MathUtils.lerp(-5.0, -4.28, entrance)
      const ignitionApproach = smooth(state.stepElapsed / 0.65)
      ignitionSplintGroup.position.x = MathUtils.lerp(-1.35, -0.9, ignitionApproach)
      const hydrogenIgnition = smooth(MathUtils.clamp((state.stepElapsed - 0.42) / 0.34, 0, 1))
      const flamePulse = reducedMotion.matches ? 1 : 1 + Math.sin(state.motionTime * 9.5) * 0.055
      blueFlame.visible = hydrogenIgnition > 0.02
      blueFlame.scale.set(hydrogenIgnition / flamePulse, hydrogenIgnition * flamePulse, hydrogenIgnition)
      blueFlame.rotation.z = reducedMotion.matches ? 0 : Math.sin(state.motionTime * 7.2) * 0.035
      blueLight.intensity = hydrogenIgnition * (0.42 + Math.sin(state.motionTime * 8.2) * 0.04)
      const ignitionPulse = reducedMotion.matches ? 1 : 1 + Math.sin(state.motionTime * 11.5) * 0.08
      ignitionFlame.scale.set(1 / ignitionPulse, ignitionPulse, 1)
      // 火焰跟随木条端点移动，但始终受浮力向上，不继承倾斜木条的朝向。
      ignitionFlame.rotation.z = -ignitionSplintGroup.rotation.z
      ignitionEmberMaterial.emissiveIntensity = 2.1 + Math.sin(state.motionTime * 8.8) * 0.18
    }

    if (oxygenTest.visible) {
      const insertion = smooth(state.stepElapsed / 1.45)
      splintGroup.position.y = MathUtils.lerp(2.65, 1.55, insertion)
      const relit = smooth(MathUtils.clamp((state.stepElapsed - 0.75) / 0.8, 0, 1))
      relightFlame.scale.set(relit, relit * (reducedMotion.matches ? 1 : 1 + Math.sin(state.motionTime * 10) * 0.05), relit)
      relightFlame.rotation.z = -splintGroup.rotation.z
      relightFlame.visible = relit > 0.02
      relightLight.intensity = relit * (0.58 + Math.sin(state.motionTime * 7.5) * 0.04)
      emberMaterial.emissiveIntensity = 1.4 + relit * 1.8
    }
  }

  function updateExperiment(deltaSeconds) {
    if (!state.paused) {
      state.stepElapsed += deltaSeconds
      state.motionTime += deltaSeconds
    }

    if (state.autoPlaying && state.stepElapsed >= spec.steps[state.step].duration) {
      if (state.step < spec.steps.length - 1) {
        setStep(state.step + 1, true)
        state.autoPlaying = true
        state.sequenceStarted = true
      } else {
        state.autoPlaying = false
        state.paused = false
      }
    }

    const visual = getStepVisualState()
    state.liquidFill = visual.liquidFill
    state.gasProgress = visual.gasProgress
    state.powerOn = visual.powerOn

    const hydrogenGasHeight = 1.72 * visual.gasProgress
    const oxygenGasHeight = 0.86 * visual.gasProgress
    const waterTops = {
      hydrogen: updateTubeLiquid(collectionTubes.hydrogen, hydrogenGasHeight, visual.liquidFill),
      oxygen: updateTubeLiquid(collectionTubes.oxygen, oxygenGasHeight, visual.liquidFill),
    }

    updateReservoir(visual.liquidFill, visual.gasProgress)
    updateBubbles(visual.powerOn, waterTops)
    updateTestAnimations(visual)

    powerIndicator.material.emissiveIntensity = visual.powerOn
      ? 2.4 + (reducedMotion.matches ? 0 : Math.sin(state.motionTime * 4.5) * 0.15)
      : 0
    powerIndicator.material.color.setHex(visual.powerOn ? 0x73e0b8 : 0x46665b)
    powerScreenMaterial.emissiveIntensity = visual.powerOn ? 0.95 : 0.2
    switchHandle.rotation.z += ((visual.powerOn ? 0.32 : -0.32) - switchHandle.rotation.z) * (1 - Math.exp(-deltaSeconds * 8))

    const hydrogenValveRotation = state.step === 4 ? Math.PI / 2 : 0
    const oxygenValveRotation = state.step === 5 ? Math.PI / 2 : 0
    collectionTubes.hydrogen.valveHandle.rotation.z += (
      hydrogenValveRotation - collectionTubes.hydrogen.valveHandle.rotation.z
    ) * (1 - Math.exp(-deltaSeconds * 7))
    collectionTubes.oxygen.valveHandle.rotation.z += (
      oxygenValveRotation - collectionTubes.oxygen.valveHandle.rotation.z
    ) * (1 - Math.exp(-deltaSeconds * 7))

    ratioCard?.classList.toggle('show', state.step >= 3)
    molecularPanel?.classList.toggle('show', state.step === 5 && state.stepElapsed > 1.35)
    renderInterface()
  }

  function renderInterface() {
    Array.from(stepsElement.children).forEach((button, index) => {
      button.classList.toggle('active', index === state.step)
      button.classList.toggle('done', index < state.step)
      button.setAttribute('aria-current', index === state.step ? 'step' : 'false')
    })

    stepMetric.textContent = spec.steps[state.step].name
    powerMetric.textContent = state.powerOn ? '已接通 · 低压直流' : '关闭'
    cathodeMetric.textContent = `H₂ · ${(state.gasProgress * 2).toFixed(1)} 份`
    anodeMetric.textContent = `O₂ · ${state.gasProgress.toFixed(1)} 份`
    observationText.textContent = spec.observations[state.step]
    safetyText.textContent = spec.safety[state.step]

    if (state.autoPlaying) playButton.textContent = '暂停'
    else if (state.paused) playButton.textContent = '继续'
    else if (state.step === spec.steps.length - 1 && state.sequenceStarted) playButton.textContent = '重新播放'
    else playButton.textContent = '自动播放'
    playButton.setAttribute('aria-pressed', String(state.autoPlaying))
  }

  function updateLabels() {
    const width = sceneElement.clientWidth
    const height = sceneElement.clientHeight
    Object.entries(labelAnchors).forEach(([id, anchor]) => {
      const element = document.querySelector(`#${id}`)
      if (!element) return
      const projected = anchor.clone().project(camera)
      const overviewRelevant = state.step <= 3 && (
        (state.step > 0 && (id === 'labelHydrogen' || id === 'labelOxygen'))
        || (state.step <= 1 && id === 'labelReservoir')
        || (state.step <= 2 && id === 'labelPower')
      )
      const relevant = overviewRelevant
        || (state.step === 4 && id === 'labelHydrogen')
        || (state.step === 5 && id === 'labelOxygen')
      const visible = projected.z > -1 && projected.z < 1 && relevant
      element.style.opacity = visible ? '1' : '0'
      element.style.setProperty('--x', `${((projected.x * 0.5 + 0.5) * width).toFixed(1)}px`)
      element.style.setProperty('--y', `${((-projected.y * 0.5 + 0.5) * height).toFixed(1)}px`)
    })

    const reservoirLabel = document.querySelector('#labelReservoir')
    if (reservoirLabel) reservoirLabel.style.filter = state.step <= 1 ? 'none' : 'saturate(.75) opacity(.74)'
  }

  function resizeScene() {
    const width = sceneElement.clientWidth
    const height = sceneElement.clientHeight
    renderer.setSize(width, height, false)
    const aspect = width / Math.max(1, height)
    const frustumHeight = width < 760 ? 9.1 : width < 1100 ? 8.45 : 7.65
    camera.left = (-frustumHeight * aspect) / 2
    camera.right = (frustumHeight * aspect) / 2
    camera.top = frustumHeight / 2
    camera.bottom = -frustumHeight / 2
    camera.updateProjectionMatrix()
    panorama.fitCamera(camera)
  }

  playButton.addEventListener('click', () => {
    if (state.autoPlaying) {
      state.autoPlaying = false
      state.paused = true
      state.sequenceStarted = true
    } else if (state.paused) {
      state.autoPlaying = true
      state.paused = false
      state.sequenceStarted = true
    } else {
      if (state.step === spec.steps.length - 1) {
        state.step = 0
        state.stepElapsed = 0
        state.motionTime = 0
      }
      state.autoPlaying = true
      state.paused = false
      state.sequenceStarted = true
    }
    renderInterface()
  })

  frontButton.addEventListener('click', resetFrontView)
  orbitButton?.addEventListener('click', toggleAutoOrbit)
  lockViewButton?.addEventListener('click', toggleViewLock)
  resetButton.addEventListener('click', resetLesson)
  window.addEventListener('resize', resizeScene)

  buildStepButtons()
  resizeScene()
  resetLesson()

  window.__WATER_COMPOSITION__ = {
    state,
    scene,
    camera,
    controls,
    renderer,
    panorama,
    environment,
    root,
    setStep,
    resetLesson,
    resetFrontView,
    toggleAutoOrbit,
    toggleViewLock,
    get autoOrbiting() { return autoOrbiting },
    get viewLocked() { return Boolean(lockedView) },
    objects: {
      collectionTubes,
      reservoir,
      powerSupply,
      negativeWire,
      positiveWire,
      bubbles,
      hydrogenTest,
      oxygenTest,
    },
  }

  let firstFrame = true
  renderer.setAnimationLoop((timestamp) => {
    const deltaSeconds = state.lastFrame
      ? Math.min((timestamp - state.lastFrame) / 1000, 0.05)
      : 0
    state.lastFrame = timestamp

    updateExperiment(reducedMotion.matches ? Math.min(deltaSeconds, 0.016) : deltaSeconds)
    updateView(deltaSeconds)
    controls.update()
    updateAutoOrbit(deltaSeconds)
    enforceLockedViewDistance()
    updateLabels()
    renderer.render(scene, camera)

    if (firstFrame) {
      firstFrame = false
      requestAnimationFrame(() => loadingElement?.classList.add('hidden'))
    }
  })
}
