/**
 * [INPUT]: 承载容器 DOM。
 * [OUTPUT]: createStage(container) —— 渲染器、正交正视相机、灯光、薄台面与
 *           OrbitControls；提供 frontView() 回正、resize 与 setLoop。
 * [POS]: 呈现层。不认识课程与器材；只保证"正视即教材插图"的取景基线。
 */
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MathUtils,
  OrbitControls,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  RoomEnvironment,
  Scene,
  Vector3,
  WebGLRenderer,
} from './lib.js'
import { roundedBox } from './mats.js'
import {
  createOxygenLabEnvironment,
  createOxygenLabPanorama,
} from '../../../shared/oxygen-lab-environment.js'

// 取景基线：正视时完整框住四个工位（x -6.5..6.2，y -0.9..4.4）
const FRAME = { width: 13.4, height: 6.8 } // 正视基线取景（世界宽×高）
const AUTO_ORBIT_SPEED = 0.055
const HOME = {
  position: new Vector3(0, 2.55, 16),
  target: new Vector3(0, 1.62, 0),
}
const STEP_VIEWS = [
  { x: -4.25, y: 1.1, zoom: 1.65 },
  { x: -2.35, y: 1.25, zoom: 1.65 },
  { x: .85, y: 1.55, zoom: 1.85 },
  { x: .85, y: 1.55, zoom: 2.0 },
  { x: 3.4, y: 1.65, zoom: 1.8 },
  { x: 3.62, y: 1.65, zoom: 2.0 },
]

export function createStage(container) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  container.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = null
  scene.fog = new Fog(0xe8eeea, 26, 44)

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 60)
  camera.position.copy(HOME.position)
  camera.lookAt(HOME.target)

  /* ---------- 灯光：柔和天光 + 带影主光 + 冷补光 ---------- */
  scene.add(new HemisphereLight(0xf6faf2, 0x9aa89c, 0.9))
  const key = new DirectionalLight(0xfff6e8, 1.55)
  key.position.set(6.5, 9.5, 7)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -7.6
  key.shadow.camera.right = 7.6
  key.shadow.camera.top = 7
  key.shadow.camera.bottom = -3
  key.shadow.camera.far = 34
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.015
  scene.add(key)
  const fill = new DirectionalLight(0xdfeaff, 0.42)
  fill.position.set(-7, 5.5, 5)
  scene.add(fill)

  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  /* ---------- 氧气实验室共享岛台（台面顶 y=0） ---------- */
  const environment = createOxygenLabEnvironment({
    root: scene,
    roundedBox,
    width: 13.6,
    depth: 5.1,
    topY: 0,
    name: 'salt-oxygen-lab-environment',
  })

  /* ---------- 交互：自由观察 + 正视回正 ---------- */
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(HOME.target)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.enablePan = false
  controls.minZoom = 0.62
  controls.maxZoom = 2.3
  controls.minPolarAngle = Math.PI * 0.34
  controls.maxPolarAngle = Math.PI * 0.5
  controls.minAzimuthAngle = -0.72
  controls.maxAzimuthAngle = 0.95

  const panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 13.6,
    name: 'salt-oxygen-lab-panorama',
  })

  let viewGoal = null
  let autoOrbiting = false
  let autoOrbitAngle = 0
  let autoOrbitDirection = 1
  let autoOrbitListener = () => {}
  let lockedView = null
  let viewLockListener = () => {}
  const orbitOffset = new Vector3()
  const lockedOffset = new Vector3()

  function setAutoOrbit(active) {
    const next = Boolean(active)
    if (next === autoOrbiting) return autoOrbiting
    if (next) {
      viewGoal = null
      orbitOffset.copy(camera.position).sub(controls.target)
      autoOrbitAngle = Math.atan2(orbitOffset.x, orbitOffset.z)
      autoOrbitDirection = autoOrbitAngle >= controls.maxAzimuthAngle - 0.01 ? -1 : 1
    }
    autoOrbiting = next
    autoOrbitListener(autoOrbiting)
    return autoOrbiting
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

  function setViewLocked(active) {
    const next = Boolean(active)
    if (next === Boolean(lockedView)) return next
    if (next) {
      viewGoal = null
      lockedView = {
        distance: camera.position.distanceTo(controls.target),
        zoom: camera.zoom,
      }
      controls.enableZoom = false
      enforceLockedViewDistance()
    } else {
      lockedView = null
      controls.enableZoom = true
    }
    viewLockListener(next)
    return next
  }

  controls.addEventListener('start', () => {
    viewGoal = null
    setAutoOrbit(false)
  })

  function setViewGoal(target, zoom) {
    viewGoal = {
      position: new Vector3(target.x, target.y + 0.93, HOME.position.z),
      target: new Vector3(target.x, target.y, target.z ?? 0),
      zoom,
    }
  }

  function resize() {
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    renderer.setSize(w, h)
    const aspect = w / h
    // contain-fit：保证基线取景框完整可见（对称视锥，构图由 HOME.target 决定）
    let halfW = FRAME.width / 2
    let halfH = halfW / aspect
    if (halfH < FRAME.height / 2) { halfH = FRAME.height / 2; halfW = halfH * aspect }
    camera.left = -halfW
    camera.right = halfW
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
    panorama.fitCamera(camera)
  }
  resize()
  window.addEventListener('resize', resize)

  const stage = {
    renderer,
    scene,
    camera,
    controls,
    panorama,
    environment,
    root: scene,
    frontView() {
      if (lockedView) return
      setAutoOrbit(false)
      viewGoal = {
        position: HOME.position.clone(),
        target: HOME.target.clone(),
        zoom: 1,
      }
    },
    viewStep(index) {
      if (lockedView) return
      setAutoOrbit(false)
      const preset = STEP_VIEWS[MathUtils.clamp(Math.round(index), 0, STEP_VIEWS.length - 1)]
      setViewGoal(preset, preset.zoom)
    },
    toggleAutoOrbit() { return setAutoOrbit(!autoOrbiting) },
    onAutoOrbitChange(listener) {
      autoOrbitListener = typeof listener === 'function' ? listener : () => {}
      autoOrbitListener(autoOrbiting)
    },
    get autoOrbiting() { return autoOrbiting },
    toggleViewLock() { return setViewLocked(!lockedView) },
    onViewLockChange(listener) {
      viewLockListener = typeof listener === 'function' ? listener : () => {}
      viewLockListener(Boolean(lockedView))
    },
    get viewLocked() { return Boolean(lockedView) },
    isHoming() { return Boolean(viewGoal) },
    tick(dt) {
      if (viewGoal) {
        const k = 1 - Math.exp(-dt * 7)
        camera.position.lerp(viewGoal.position, k)
        controls.target.lerp(viewGoal.target, k)
        camera.zoom = MathUtils.lerp(camera.zoom, viewGoal.zoom, k)
        camera.updateProjectionMatrix()
        if (camera.position.distanceTo(viewGoal.position) < 0.01
          && controls.target.distanceTo(viewGoal.target) < 0.01
          && Math.abs(camera.zoom - viewGoal.zoom) < 0.005) viewGoal = null
      }
      controls.update()
      updateAutoOrbit(dt)
      enforceLockedViewDistance()
      renderer.render(scene, camera)
    },
    setLoop(fn) {
      let last = 0
      renderer.setAnimationLoop((ms) => {
        const time = ms / 1000
        const dt = Math.min(0.05, last ? time - last : 0.016)
        last = time
        fn(dt, time)
      })
    },
    dispose() {
      window.removeEventListener('resize', resize)
      panorama.dispose()
      renderer.dispose()
    },
  }
  return stage
}
