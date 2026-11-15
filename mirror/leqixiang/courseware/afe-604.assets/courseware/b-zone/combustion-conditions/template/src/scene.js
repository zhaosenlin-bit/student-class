import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  RectAreaLight,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from '../vendor/three.module.js'
import { OrbitControls } from '../vendor/OrbitControls.js'
import { RoomEnvironment } from '../vendor/RoomEnvironment.js'
import { createLabMaterials } from './materials.js'
import { buildCombustionApparatus, roundedBox } from './apparatus.js'
import { createLessonController } from './lesson.js'
import {
  createOxygenLabEnvironment,
  createOxygenLabPanorama,
} from '../../../../shared/oxygen-lab-environment.js'

const STEP_VIEWS = Object.freeze([
  { x: 0, y: 1.18, zoom: 1 },
  { x: -4.75, y: .95, zoom: 2.25 },
  { x: 0, y: 1.15, zoom: 2.15 },
  { x: 0, y: 1.15, zoom: 2.15 },
  { x: 4.75, y: 1.4, zoom: 2.05 },
  { x: 0, y: 1.18, zoom: 1 },
])

export function createCombustionScene() {
  const sceneElement = document.querySelector('#scene')
  const loadingElement = document.querySelector('#loading')
  const fallbackElement = document.querySelector('#fallback')
  const appElement = document.querySelector('#app')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let renderer

  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (error) {
    fallbackElement?.classList.add('show')
    loadingElement?.classList.add('hidden')
    appElement?.setAttribute('aria-busy', 'false')
    console.error('Unable to initialize the combustion conditions WebGL runtime.', error)
    return null
  }

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = .92
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '三维燃烧条件对照实验：水和酒精棉球、罩内外蜡烛、同一铜片上的乒乓球材料与滤纸')
  sceneElement.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = null
  scene.fog = new Fog(0xe9ede7, 16, 30)

  const camera = new OrthographicCamera(-7, 7, 4.3, -4.3, .1, 60)
  const frontPosition = { x: 0, y: 4.45, z: 14.8 }
  const frontTarget = { x: 0, y: 1.18, z: 0 }
  camera.position.set(frontPosition.x, frontPosition.y, frontPosition.z)
  camera.lookAt(frontTarget.x, frontTarget.y, frontTarget.z)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(frontTarget.x, frontTarget.y, frontTarget.z)
  controls.enableDamping = true
  controls.dampingFactor = .065
  controls.enablePan = false
  controls.minZoom = .86
  controls.maxZoom = 2.6
  controls.minPolarAngle = Math.PI * .34
  controls.maxPolarAngle = Math.PI * .5
  controls.minAzimuthAngle = -.72
  controls.maxAzimuthAngle = .95
  let viewGoal = null
  controls.addEventListener('start', () => { viewGoal = null })

  const panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 14.7,
    name: 'combustion-oxygen-lab-panorama',
  })

  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture
  pmrem.dispose()

  const hemisphere = new HemisphereLight(0xfffbeb, 0x53615a, 1.2)
  scene.add(hemisphere)
  scene.add(new AmbientLight(0xffffff, .22))

  const key = new DirectionalLight(0xfff3d9, 2.35)
  key.position.set(-5.5, 9, 7.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -9
  key.shadow.camera.right = 9
  key.shadow.camera.top = 7
  key.shadow.camera.bottom = -5
  key.shadow.bias = -.00045
  scene.add(key)

  const fill = new DirectionalLight(0xcbe8ee, .75)
  fill.position.set(7, 5, 8)
  scene.add(fill)
  const rim = new DirectionalLight(0xffd7ad, .72)
  rim.position.set(-5, 4, -7)
  scene.add(rim)

  const upperPanel = new RectAreaLight(0xfff2d7, 1.65, 9, 5)
  upperPanel.position.set(-2, 7, 6)
  upperPanel.lookAt(0, 1.4, 0)
  scene.add(upperPanel)
  const coolPanel = new RectAreaLight(0xc7e7e3, 1.15, 6, 4)
  coolPanel.position.set(6, 4, -3)
  coolPanel.lookAt(1, 1.2, 0)
  scene.add(coolPanel)

  const apparatusRoot = new Group()
  apparatusRoot.name = 'combustion-conditions-apparatus'
  apparatusRoot.position.set(0, -.1, .18)
  scene.add(apparatusRoot)
  const environment = createOxygenLabEnvironment({
    root: scene,
    roundedBox,
    width: 14.7,
    depth: 4.25,
    topY: -.13,
    name: 'combustion-oxygen-lab-environment',
  })
  const materials = createLabMaterials()
  const objects = buildCombustionApparatus(apparatusRoot, materials)

  const stepsElement = document.querySelector('#steps')
  const metricStep = document.querySelector('#metricStep')
  const metricVariable = document.querySelector('#metricVariable')
  const evidenceText = document.querySelector('#evidenceText')
  const safetyText = document.querySelector('#safetyText')
  const playButton = document.querySelector('#playButton')
  const frontButton = document.querySelector('#frontButton')
  const resetButton = document.querySelector('#resetButton')
  const conclusion = document.querySelector('#conclusion')
  const zoneLabels = Array.from(document.querySelectorAll('.zone-label'))
  let lastUiStep = -1
  let lastPlaying = null

  function frontView() {
    viewGoal = null
    camera.position.set(frontPosition.x, frontPosition.y, frontPosition.z)
    controls.target.set(frontTarget.x, frontTarget.y, frontTarget.z)
    camera.zoom = 1
    camera.updateProjectionMatrix()
    controls.update()
  }

  function focusStep(index) {
    const preset = STEP_VIEWS[index] || STEP_VIEWS[0]
    viewGoal = {
      x: preset.x,
      y: preset.y,
      cameraY: preset.y + (frontPosition.y - frontTarget.y),
      zoom: preset.zoom,
    }
  }

  function updateView(dt) {
    if (!viewGoal) return
    const k = 1 - Math.exp(-dt * 7.5)
    camera.position.x += (viewGoal.x - camera.position.x) * k
    camera.position.y += (viewGoal.cameraY - camera.position.y) * k
    camera.position.z += (frontPosition.z - camera.position.z) * k
    controls.target.x += (viewGoal.x - controls.target.x) * k
    controls.target.y += (viewGoal.y - controls.target.y) * k
    controls.target.z += (frontTarget.z - controls.target.z) * k
    camera.zoom += (viewGoal.zoom - camera.zoom) * k
    camera.updateProjectionMatrix()
    if (Math.abs(camera.zoom - viewGoal.zoom) < .003
      && Math.abs(controls.target.x - viewGoal.x) < .008
      && Math.abs(controls.target.y - viewGoal.y) < .008) viewGoal = null
  }

  const controller = createLessonController({
    objects,
    camera,
    controls,
    frontView,
    onRenderState({ state, step, progress }) {
      if (lastUiStep !== state.step) {
        focusStep(state.step)
        metricStep.textContent = step.name
        metricVariable.textContent = step.variable
        evidenceText.textContent = step.evidence
        safetyText.textContent = step.safety
        Array.from(stepsElement.children).forEach((button, index) => {
          button.classList.toggle('active', index === state.step)
          button.classList.toggle('done', index < state.step)
          button.setAttribute('aria-current', index === state.step ? 'step' : 'false')
        })
        zoneLabels.forEach((label, index) => {
          label.classList.toggle('active', step.zone === -1 || step.zone === index)
        })
        lastUiStep = state.step
      }

      const showConclusion = state.step === window.__COMBUSTION_SPEC__.steps.length - 1 && progress > .28
      conclusion.classList.toggle('show', showConclusion)
      conclusion.setAttribute('aria-hidden', String(!showConclusion))

      if (lastPlaying !== state.playing) {
        playButton.textContent = state.playing ? '暂停' : (state.stepTime > 0 && progress < 1 ? '继续' : '自动播放')
        playButton.setAttribute('aria-pressed', String(state.playing))
        playButton.setAttribute('aria-label', state.playing ? '暂停实验' : '继续或自动播放实验')
        lastPlaying = state.playing
      }
    },
  })

  window.__COMBUSTION_SPEC__.steps.forEach((step, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'step'
    button.innerHTML = `<span class="step-num">${index + 1}</span><strong>${step.name}</strong><small>${step.copy}</small>`
    button.addEventListener('click', () => {
      controller.setStep(index, { play: true, at: step.previewAt })
      controls.update()
      renderer.render(scene, camera)
    })
    stepsElement.appendChild(button)
  })
  lastUiStep = -1
  controller.applyStep(0)

  playButton.addEventListener('click', () => controller.togglePlay())
  frontButton.addEventListener('click', frontView)
  resetButton.addEventListener('click', () => controller.reset())

  function resize() {
    const width = sceneElement.clientWidth || window.innerWidth
    const height = sceneElement.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    const aspect = width / Math.max(height, 1)
    const halfHeight = Math.max(aspect < 1 ? 7.3 : aspect < 1.35 ? 5.6 : 4.3, 7.55 / aspect)
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
    panorama.fitCamera(camera)
  }
  window.addEventListener('resize', resize, { passive: true })
  resize()
  frontView()

  let lastTime = performance.now()
  function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, .05)
    lastTime = now
    const time = reducedMotion.matches ? 0 : now / 1000
    controller.update(reducedMotion.matches ? 0 : delta, time)
    updateView(delta)
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  window.__COMBUSTION_LAB__ = {
    state: controller.state,
    spec: controller.spec,
    scene,
    camera,
    controls,
    renderer,
    panorama,
    environment,
    root: apparatusRoot,
    objects,
    controller,
    frontView,
  }

  controls.update()
  renderer.render(scene, camera)
  loadingElement?.classList.add('hidden')
  appElement?.setAttribute('aria-busy', 'false')

  return window.__COMBUSTION_LAB__
}
