import * as THREE from 'three'
import { OrbitControls } from '../vendor/OrbitControls.js'
import { RoomEnvironment } from '../vendor/RoomEnvironment.js'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import { createApparatus, showStation } from './apparatus.js'
import { restoreNarrativeState, updatePhenomena } from './phenomena.js'
import {
  createOxygenLabEnvironment,
  createOxygenLabPanorama,
} from '../../../shared/oxygen-lab-environment.js'

const FRONT_CAMERA = new THREE.Vector3(0, 5.15, 12.4)
const FRONT_TARGET = new THREE.Vector3(0, 1.2, 0)
const FOCUS_TARGETS = [
  { target: new THREE.Vector3(-4.3, 1.02, 0.12), zoom: 1.34 },
  { target: new THREE.Vector3(-2.62, 1.18, 0.08), zoom: 1.38 },
  { target: new THREE.Vector3(-0.82, 1.2, 0.04), zoom: 1.34 },
  { target: new THREE.Vector3(1.72, 1.12, 0.08), zoom: 1.32 },
  { target: new THREE.Vector3(4.04, 1.16, 0.1), zoom: 1.38 },
]

export function createAcidBaseScene() {
  const host = document.querySelector('#scene')
  const loading = document.querySelector('#loading')
  const fallback = document.querySelector('#fallback')
  const spec = window.__ACID_BASE_SPEC__
  if (!host || !spec) throw new Error('Course shell or course specification is missing.')

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  } catch (error) {
    fallback?.classList.add('show')
    loading?.classList.add('hidden')
    throw error
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.94
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xcfcbbf)
  scene.fog = new THREE.Fog(0xcfcbbf, 20, 34)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const camera = new THREE.OrthographicCamera(-6, 6, 3.7, -3.7, 0.1, 60)
  camera.position.copy(FRONT_CAMERA)
  camera.lookAt(FRONT_TARGET)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(FRONT_TARGET)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.enablePan = false
  controls.minZoom = 0.72
  controls.maxZoom = 2.35
  controls.minPolarAngle = Math.PI * 0.18
  controls.maxPolarAngle = Math.PI * 0.54
  controls.autoRotate = false

  scene.add(new THREE.HemisphereLight(0xfff8e9, 0x776e61, 1.5))
  const key = new THREE.DirectionalLight(0xfff4dc, 2.75)
  key.position.set(-4.5, 8.5, 7.2)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -7
  key.shadow.camera.right = 7
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -4
  key.shadow.bias = -0.00025
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xd7e5de, 1.15)
  fill.position.set(5, 4, 2)
  scene.add(fill)

  const roundedBox = (width, height, depth, radius, material) => new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, 6, radius),
    material,
  )
  const panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 11.05,
    radius: 10.5,
    name: 'acid-base-oxygen-lab-panorama',
  })
  const environment = createOxygenLabEnvironment({
    root: scene,
    roundedBox,
    width: 11.05,
    depth: 4.55,
    topY: 0.03,
    name: 'acid-base-oxygen-lab-environment',
  })

  const apparatus = createApparatus()
  apparatus.root.position.set(0, 0.03, 0)
  scene.add(apparatus.root)

  const state = {
    step: 0,
    progress: 0,
    elapsed: 0,
    playing: false,
    paused: false,
    autoSequence: false,
    focusEnabled: true,
  }

  const dom = {
    steps: document.querySelector('#steps'),
    play: document.querySelector('#playButton'),
    focus: document.querySelector('#focusButton'),
    front: document.querySelector('#frontButton'),
    reset: document.querySelector('#resetButton'),
    fullscreen: document.querySelector('#fullscreenButton'),
    metricStep: document.querySelector('#metricStep'),
    metricAction: document.querySelector('#metricAction'),
    observation: document.querySelector('#observationText'),
    equation: document.querySelector('#equationText'),
    summary: document.querySelector('#stepSummary'),
    evidence: document.querySelector('#stageEvidence'),
    stageLabel: document.querySelector('#stageLabel'),
    counter: document.querySelector('#stepCounter'),
    callout: document.querySelector('#reactionCallout'),
    calloutKicker: document.querySelector('#calloutKicker'),
    calloutTitle: document.querySelector('#calloutTitle'),
    calloutDetail: document.querySelector('#calloutDetail'),
    app: document.querySelector('.app'),
  }

  let activePhaseKey = ''
  const cameraMotion = {
    active: false,
    startedAt: 0,
    duration: 720,
    fromPosition: camera.position.clone(),
    toPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: controls.target.clone(),
    fromZoom: camera.zoom,
    toZoom: camera.zoom,
  }

  function requestCameraPose(position, target, zoom, duration = 720) {
    cameraMotion.active = true
    cameraMotion.startedAt = performance.now()
    cameraMotion.duration = duration
    cameraMotion.fromPosition.copy(camera.position)
    cameraMotion.toPosition.copy(position)
    cameraMotion.fromTarget.copy(controls.target)
    cameraMotion.toTarget.copy(target)
    cameraMotion.fromZoom = camera.zoom
    cameraMotion.toZoom = zoom
  }

  function focusStep(index, duration = 720) {
    if (!state.focusEnabled || index >= FOCUS_TARGETS.length) {
      requestCameraPose(FRONT_CAMERA, FRONT_TARGET, 1, duration)
      return
    }
    const pose = FOCUS_TARGETS[index]
    const position = FRONT_CAMERA.clone()
    position.x = pose.target.x
    position.y += pose.target.y - FRONT_TARGET.y
    position.z = 11.7
    requestCameraPose(position, pose.target, pose.zoom, duration)
  }

  function updateCameraMotion(frameTime) {
    if (!cameraMotion.active) return
    const raw = THREE.MathUtils.clamp((frameTime - cameraMotion.startedAt) / cameraMotion.duration, 0, 1)
    const eased = raw * raw * (3 - 2 * raw)
    camera.position.lerpVectors(cameraMotion.fromPosition, cameraMotion.toPosition, eased)
    controls.target.lerpVectors(cameraMotion.fromTarget, cameraMotion.toTarget, eased)
    camera.zoom = THREE.MathUtils.lerp(cameraMotion.fromZoom, cameraMotion.toZoom, eased)
    camera.updateProjectionMatrix()
    if (raw >= 1) cameraMotion.active = false
  }

  function getPhase(step, progress) {
    const phases = step.phases || []
    let phaseIndex = 0
    phases.forEach((phase, index) => {
      if (progress >= phase.at) phaseIndex = index
    })
    return { phase: phases[phaseIndex] || { kicker: '当前操作', title: step.action, detail: step.evidence, anchor: [69, 45] }, phaseIndex }
  }

  function buildStepButtons() {
    dom.steps.innerHTML = ''
    spec.steps.forEach((step, index) => {
      const button = document.createElement('button')
      button.className = 'step'
      button.type = 'button'
      button.innerHTML = `<span class="step-num">${String(index + 1).padStart(2, '0')}</span><strong>${step.name}</strong><span class="step-copy">${step.short || step.action}</span><span class="step-progress" aria-hidden="true"></span>`
      button.setAttribute('aria-label', `${index + 1}. ${step.name}`)
      button.addEventListener('click', () => startSequence(index))
      dom.steps.appendChild(button)
    })
  }

  function syncUI() {
    const step = spec.steps[state.step]
    const { phase, phaseIndex } = getPhase(step, state.progress)
    const phaseKey = `${state.step}-${phaseIndex}`
    dom.metricStep.textContent = step.name
    dom.metricAction.textContent = step.action
    dom.observation.textContent = step.observation
    dom.equation.textContent = step.equation
    dom.summary.textContent = step.summary
    dom.evidence.textContent = step.evidence
    dom.counter.textContent = `${String(state.step + 1).padStart(2, '0')} / ${String(spec.steps.length).padStart(2, '0')}`
    dom.stageLabel.textContent = `${step.name} · 观察要点`
    dom.calloutKicker.textContent = phase.kicker
    dom.calloutTitle.textContent = phase.title
    dom.calloutDetail.textContent = phase.detail
    const focused = state.focusEnabled && state.step < FOCUS_TARGETS.length
    dom.callout.style.setProperty('--label-x', `${focused ? 66 : (phase.anchor?.[0] ?? 69)}%`)
    dom.callout.style.setProperty('--label-y', `${focused ? 43 : (phase.anchor?.[1] ?? 45)}%`)
    if (phaseKey !== activePhaseKey) {
      activePhaseKey = phaseKey
      dom.callout.classList.remove('phase-change')
      requestAnimationFrame(() => dom.callout.classList.add('phase-change'))
    }
    dom.play.innerHTML = state.playing ? '<span aria-hidden="true">Ⅱ</span> 暂停' : state.paused ? '<span aria-hidden="true">▶</span> 继续完整播放' : '<span aria-hidden="true">▶</span> 完整播放'
    dom.play.setAttribute('aria-label', state.playing ? '暂停完整播放' : state.paused ? '继续完整播放' : '从头完整播放全部实验')
    dom.play.setAttribute('aria-pressed', String(state.playing))
    dom.focus.classList.toggle('active', state.focusEnabled)
    dom.focus.innerHTML = state.focusEnabled ? '<span aria-hidden="true">◉</span> 聚焦开' : '<span aria-hidden="true">○</span> 聚焦关'
    dom.focus.setAttribute('aria-label', state.focusEnabled ? '自动聚焦已开启' : '自动聚焦已关闭')
    dom.focus.setAttribute('aria-pressed', String(state.focusEnabled))
    Array.from(dom.steps.children).forEach((button, index) => {
      button.classList.toggle('active', index === state.step)
      button.classList.toggle('done', index < state.step || (index === state.step && state.progress >= 1))
      button.setAttribute('aria-current', index === state.step ? 'step' : 'false')
      button.style.setProperty('--progress', index === state.step ? `${state.progress * 100}%` : index < state.step ? '100%' : '0%')
    })
    dom.app.setAttribute('aria-busy', 'false')
  }

  function setStep(index, options = {}) {
    const { keepPlaying = false, progress = 0 } = options
    state.step = THREE.MathUtils.clamp(index, 0, spec.steps.length - 1)
    state.progress = THREE.MathUtils.clamp(progress, 0, 1)
    state.elapsed = state.progress * spec.steps[state.step].duration
    if (!keepPlaying) {
      state.playing = false
      state.paused = false
      state.autoSequence = false
    }
    activePhaseKey = ''
    restoreNarrativeState(apparatus, state.step)
    showStation(apparatus, state.step)
    updatePhenomena(apparatus, state.step, state.progress, state.elapsed)
    focusStep(state.step)
    syncUI()
  }

  function startSequence(index = 0) {
    setStep(index, { keepPlaying: true })
    state.playing = true
    state.paused = false
    state.autoSequence = true
    syncUI()
  }

  function setProgress(progress) {
    state.progress = THREE.MathUtils.clamp(progress, 0, 1)
    state.elapsed = state.progress * spec.steps[state.step].duration
    updatePhenomena(apparatus, state.step, state.progress, state.elapsed)
    syncUI()
  }

  function togglePlay() {
    if (state.playing) {
      state.playing = false
      state.paused = true
    } else if (state.paused) {
      state.playing = true
      state.paused = false
    } else {
      startSequence(0)
      return
    }
    syncUI()
  }

  function resetCurrent() {
    setStep(state.step)
  }

  function frontView() {
    requestCameraPose(FRONT_CAMERA, FRONT_TARGET, 1, 620)
  }

  function toggleFocus() {
    state.focusEnabled = !state.focusEnabled
    if (state.focusEnabled) focusStep(state.step)
    else frontView()
    syncUI()
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await dom.app.requestFullscreen?.()
    else await document.exitFullscreen?.()
  }

  buildStepButtons()
  dom.play.addEventListener('click', togglePlay)
  dom.focus.addEventListener('click', toggleFocus)
  dom.front.addEventListener('click', frontView)
  dom.reset.addEventListener('click', resetCurrent)
  dom.fullscreen.addEventListener('click', toggleFullscreen)
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement)
    dom.fullscreen.innerHTML = active ? '<span aria-hidden="true">⛶</span> 退出' : '<span aria-hidden="true">⛶</span> 全屏'
    dom.fullscreen.setAttribute('aria-label', active ? '退出全屏' : '进入全屏')
  })
  controls.addEventListener('start', () => {
    cameraMotion.active = false
  })

  function resize() {
    const width = host.clientWidth
    const height = host.clientHeight
    const aspect = width / Math.max(height, 1)
    const viewHeight = Math.max(5.9, 11.9 / aspect)
    camera.left = (-viewHeight * aspect) / 2
    camera.right = (viewHeight * aspect) / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    panorama.fitCamera(camera)
  }
  window.addEventListener('resize', resize)
  resize()
  startSequence(0)

  let lastFrameTime = performance.now()
  let firstFrame = true
  function animate(frameTime = performance.now()) {
    requestAnimationFrame(animate)
    const delta = Math.min((frameTime - lastFrameTime) / 1000, 0.05)
    lastFrameTime = frameTime
    if (state.playing) {
      state.elapsed += delta
      const duration = spec.steps[state.step].duration
      state.progress = THREE.MathUtils.clamp(state.elapsed / duration, 0, 1)
      if (state.progress >= 1) {
        if (state.autoSequence && state.step < spec.steps.length - 1) {
          setStep(state.step + 1, { keepPlaying: true })
          state.playing = true
        } else {
          state.playing = false
          state.paused = false
          state.autoSequence = false
        }
      }
      updatePhenomena(apparatus, state.step, state.progress, state.elapsed)
      syncUI()
    } else {
      updatePhenomena(apparatus, state.step, state.progress, state.elapsed)
    }
    updateCameraMotion(frameTime)
    controls.update()
    renderer.render(scene, camera)
    if (firstFrame) {
      firstFrame = false
      loading?.classList.add('hidden')
      setTimeout(() => loading?.remove(), 520)
    }
  }
  animate()

  window.__ACID_BASE_LAB__ = {
    state,
    setStep,
    setProgress,
    frontView,
    focusStep,
    apparatus,
    camera,
    renderer,
    environment,
    panorama,
    spec,
  }
}
