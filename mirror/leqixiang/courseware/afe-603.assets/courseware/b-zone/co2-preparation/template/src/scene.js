/**
 * scene.js —— 渲染器 / 正交相机（正视校验版）/ 灯光环境 / 主循环。
 *
 * 正视验收要求：
 *  - 初始即为固定正视镜头，不自动旋转；
 *  - 用户可小幅拖动检查，但“正视”按钮随时瞬时恢复固定验收镜头；
 *  - 所有器材完整落在画面内，占实验可用区域约 65%~75%。
 */
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TOUCH,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from '../vendor/OrbitControls.js'
import { RoomEnvironment } from '../vendor/RoomEnvironment.js'
import { createMaterials } from './materials.js'
import { buildApparatus } from './apparatus.js'
import { buildSurface } from './surface.js'
import { createLesson } from './lesson.js'
import { createOxygenLabPanorama } from '../../../../shared/oxygen-lab-environment.js'

const FRONT_POSITION = Object.freeze({ x: 0, y: 2.13, z: 16 })
const FRONT_TARGET = Object.freeze({ x: 0, y: 1.8, z: 0 })
const HALF_WIDTH = 5.5
const MIN_HALF_HEIGHT = 2.95
const AUTO_ORBIT_SPEED = 0.055
const OVERVIEW_VIEW = Object.freeze({ x: FRONT_TARGET.x, y: FRONT_TARGET.y, zoom: 1 })
const STEP_VIEWS = Object.freeze([
  { x: -3.4, y: 2.25, zoom: 1.28 },
  null,
  { x: -0.7, y: 1.05, zoom: 1.55 },
  { x: 1.7, y: 1.15, zoom: 1.4 },
  null,
  { x: 2, y: 1.25, zoom: 1.35 },
])

export function createCo2PreparationScene() {
  const app = document.querySelector('.app')
  const host = document.getElementById('scene')
  const loading = document.getElementById('loading')
  const fallback = document.getElementById('fallback')
  const btnFront = document.getElementById('btn-front')
  const btnAutoOrbit = document.getElementById('btn-auto-orbit')
  const btnLockView = document.getElementById('btn-lock-view')
  const btnFullscreen = document.getElementById('btn-fullscreen')
  const spec = window.__CO2_TEMPLATE_SPEC__

  let renderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true })
    if (!renderer.getContext()) throw new Error('no webgl context')
  } catch (error) {
    console.error('[co2] WebGL 启动失败，切换文字教学模式', error)
    loading?.classList.add('hidden')
    fallback?.classList.add('show')
    return null
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.82
  renderer.outputColorSpace = SRGBColorSpace
  host.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = null

  /* ---------- 正交相机与正视复位 ---------- */
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 60)
  let panorama = null
  function applyFrustum() {
    const aspect = host.clientWidth / Math.max(1, host.clientHeight)
    const halfH = Math.max(HALF_WIDTH / aspect, MIN_HALF_HEIGHT)
    const halfW = halfH * aspect
    camera.left = -halfW
    camera.right = halfW
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
  }

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.enableZoom = true
  controls.rotateSpeed = 0.42
  controls.zoomSpeed = 0.85
  controls.zoomToCursor = false
  controls.touches.ONE = TOUCH.ROTATE
  // DOLLY_PAN 在关闭 enablePan 后只保留双指捏合缩放，不会拖走实验台中心。
  controls.touches.TWO = TOUCH.DOLLY_PAN
  controls.minZoom = 0.6
  controls.maxZoom = 4.5
  controls.minPolarAngle = Math.PI * 0.43
  controls.maxPolarAngle = Math.PI * 0.5
  controls.minAzimuthAngle = -0.32
  controls.maxAzimuthAngle = 0.32
  controls.autoRotate = false
  let viewGoal = null
  let lockedView = null
  let autoOrbiting = false
  let autoOrbitAngle = 0
  let autoOrbitDirection = 1
  const lockedOffset = new Vector3()
  const orbitOffset = new Vector3()

  controls.addEventListener('start', () => {
    viewGoal = null
    stopAutoOrbit()
  })

  function frontView() {
    if (lockedView) return
    stopAutoOrbit()
    viewGoal = null
    camera.position.set(FRONT_POSITION.x, FRONT_POSITION.y, FRONT_POSITION.z)
    camera.zoom = 1
    camera.updateProjectionMatrix()
    controls.target.set(FRONT_TARGET.x, FRONT_TARGET.y, FRONT_TARGET.z)
    controls.update()
  }

  function focusStep(index) {
    if (lockedView) return
    stopAutoOrbit()
    const preset = STEP_VIEWS[index] ?? OVERVIEW_VIEW
    viewGoal = {
      position: { x: preset.x, y: preset.y + 0.33, z: FRONT_POSITION.z },
      target: { x: preset.x, y: preset.y, z: 0 },
      zoom: preset.zoom,
    }
  }

  function updateView(dt) {
    if (lockedView) return
    if (!viewGoal) return
    const k = 1 - Math.exp(-dt * 7.5)
    camera.position.x += (viewGoal.position.x - camera.position.x) * k
    camera.position.y += (viewGoal.position.y - camera.position.y) * k
    camera.position.z += (viewGoal.position.z - camera.position.z) * k
    controls.target.x += (viewGoal.target.x - controls.target.x) * k
    controls.target.y += (viewGoal.target.y - controls.target.y) * k
    controls.target.z += (viewGoal.target.z - controls.target.z) * k
    camera.zoom += (viewGoal.zoom - camera.zoom) * k
    camera.updateProjectionMatrix()
    if (Math.abs(camera.zoom - viewGoal.zoom) < 0.003
      && Math.abs(controls.target.x - viewGoal.target.x) < 0.006
      && Math.abs(controls.target.y - viewGoal.target.y) < 0.006) viewGoal = null
  }

  function syncAutoOrbitUI() {
    btnAutoOrbit?.setAttribute('aria-pressed', String(autoOrbiting))
    if (!btnAutoOrbit) return
    btnAutoOrbit.textContent = autoOrbiting ? '停止环绕' : '环绕'
    btnAutoOrbit.setAttribute('aria-label', autoOrbiting
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
    if (!autoOrbiting) return
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
      camera.position.copy(controls.target)
        .add(lockedOffset.setLength(lockedView.distance))
    }
    if (camera.zoom !== lockedView.zoom) {
      camera.zoom = lockedView.zoom
      camera.updateProjectionMatrix()
    }
  }

  function syncViewLockUI() {
    const isLocked = Boolean(lockedView)
    app?.classList.toggle('is-view-locked', isLocked)
    btnLockView?.setAttribute('aria-pressed', String(isLocked))
    if (btnLockView) {
      btnLockView.textContent = isLocked ? '解除锁定' : '锁定视角'
      btnLockView.setAttribute('aria-label', isLocked
        ? '解除当前观察距离锁定'
        : '锁定当前观察距离，保持正常环绕')
    }
    if (btnFront) btnFront.disabled = isLocked
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

  btnLockView?.addEventListener('click', toggleViewLock)
  btnAutoOrbit?.addEventListener('click', toggleAutoOrbit)

  const requestFullscreen = app?.requestFullscreen?.bind(app)
    ?? app?.webkitRequestFullscreen?.bind(app)
  const exitFullscreen = document.exitFullscreen?.bind(document)
    ?? document.webkitExitFullscreen?.bind(document)

  function fullscreenElement() {
    return document.fullscreenElement ?? document.webkitFullscreenElement ?? null
  }

  function syncFullscreenUI() {
    const isFullscreen = fullscreenElement() === app
    btnFullscreen?.setAttribute('aria-pressed', String(isFullscreen))
    btnFullscreen?.setAttribute('aria-label', isFullscreen ? '退出全屏' : '进入全屏')
    if (btnFullscreen) btnFullscreen.title = isFullscreen ? '退出全屏' : '进入全屏'
  }

  async function toggleFullscreen() {
    try {
      if (fullscreenElement()) await exitFullscreen?.()
      else await requestFullscreen?.()
    } catch (error) {
      console.warn('[co2] 无法切换全屏模式', error)
    }
  }

  if (btnFullscreen) btnFullscreen.hidden = !requestFullscreen
  btnFullscreen?.addEventListener('click', toggleFullscreen)
  document.addEventListener('fullscreenchange', syncFullscreenUI)
  document.addEventListener('webkitfullscreenchange', syncFullscreenUI)
  syncFullscreenUI()

  function resize() {
    renderer.setSize(host.clientWidth, host.clientHeight)
    applyFrustum()
    enforceLockedViewDistance()
    panorama?.fitCamera(camera)
  }
  window.addEventListener('resize', resize)
  frontView()
  panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 10.9,
    name: 'co2-oxygen-lab-panorama',
  })
  resize()

  /* ---------- 灯光与环境 ---------- */
  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const hemi = new HemisphereLight(0xf8fbff, 0x707a79, 0.9)
  scene.add(hemi)

  const key = new DirectionalLight(0xfff4d4, 2.05)
  key.position.set(-4.5, 8.5, 6.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -7
  key.shadow.camera.right = 7
  key.shadow.camera.top = 7
  key.shadow.camera.bottom = -5
  key.shadow.bias = -0.0006
  scene.add(key)

  const fillCool = new DirectionalLight(0xdce9ff, 0.6)
  fillCool.position.set(6, 4, 8)
  scene.add(fillCool)

  const rim = new DirectionalLight(0xffedd8, 0.72)
  rim.position.set(-4, 4, -7)
  scene.add(rim)

  /* ---------- 器材 ---------- */
  const root = new Group()
  root.name = 'co2-lab-root'
  scene.add(root)

  const environment = buildSurface(scene)
  const materials = createMaterials()
  const rig = buildApparatus(root, materials)

  const lesson = createLesson({ rig, spec, onFrontView: frontView, onStepView: focusStep })

  /* ---------- uTime 收集 ---------- */
  const timedMaterials = []
  root.traverse((object) => {
    const material = object.material
    if (material && material.uniforms && material.uniforms.uTime) timedMaterials.push(material)
  })

  /* ---------- 主循环 ---------- */
  const timer = new Timer()
  timer.connect(document)
  let firstFrame = true
  renderer.setAnimationLoop(() => {
    timer.update()
    const dt = Math.min(0.05, timer.getDelta())
    const time = timer.getElapsed()
    timedMaterials.forEach((material) => { material.uniforms.uTime.value = time })
    lesson.tick(dt, time)
    updateView(dt)
    controls.update()
    updateAutoOrbit(dt)
    enforceLockedViewDistance()
    renderer.render(scene, camera)
    if (firstFrame) {
      firstFrame = false
      loading?.classList.add('hidden')
    }
  })

  const lab = {
    THREE: null,
    renderer,
    scene,
    camera,
    controls,
    panorama,
    environment,
    root,
    rig,
    lesson,
    state: lesson.state,
    frontView,
    toggleAutoOrbit,
    toggleViewLock,
    toggleFullscreen,
    get autoOrbiting() { return autoOrbiting },
    get viewLocked() { return Boolean(lockedView) },
    setStep: lesson.setStep,
  }
  window.__CO2_PREPARATION__ = lab
  return lab
}
