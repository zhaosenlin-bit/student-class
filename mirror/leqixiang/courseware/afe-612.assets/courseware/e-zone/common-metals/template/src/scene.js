import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
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
import { createMaterials } from './materials.js'
import { createApparatus, roundedBox } from './apparatus.js'
import {
  createOxygenLabEnvironment,
  createOxygenLabPanorama,
} from '../../../../shared/oxygen-lab-environment.js'

const FRONT_CAMERA = Object.freeze({ position: [0, 4.35, 15.4], target: [0, 0.88, 0] })
const STEP_FOCUS = Object.freeze([
  { y: .48, zoom: 2.05 },
  { y: .65, zoom: 2.05 },
  { y: 1.35, zoom: 1.75 },
  { y: 1.0, zoom: 1.85 },
  { y: 1.05, zoom: 2.1 },
  { y: .9, zoom: 1.9 },
])
const clamp = MathUtils.clamp

export function createCommonMetalsScene() {
  const sceneElement = document.querySelector('#scene')
  const loadingElement = document.querySelector('#loading')
  const fallbackElement = document.querySelector('#fallback')
  const spec = window.__METALS_COURSE_SPEC__
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let renderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (error) {
    fallbackElement?.classList.add('show')
    loadingElement?.classList.add('hidden')
    console.error('Unable to initialize the common-metals WebGL runtime.', error)
    return null
  }

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.94
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.setClearColor(0xe6eeeb, 0)
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '常见金属物理性质、导电性、金属与酸、铁与硫酸铜及铜片加热的三维对比实验')
  sceneElement.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = null
  scene.fog = new Fog(0xe6eeeb, 14, 28)

  const camera = new OrthographicCamera(-6.5, 6.5, 3.75, -3.75, 0.1, 60)
  camera.position.set(...FRONT_CAMERA.position)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(...FRONT_CAMERA.target)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.enablePan = false
  controls.enableRotate = true
  controls.enableZoom = true
  controls.minZoom = 0.82
  controls.maxZoom = 2.8
  controls.minPolarAngle = Math.PI * 0.34
  controls.maxPolarAngle = Math.PI * 0.5
  controls.minAzimuthAngle = -0.72
  controls.maxAzimuthAngle = 0.95
  controls.autoRotate = false
  controls.update()

  const panorama = createOxygenLabPanorama({
    scene,
    camera,
    target: controls.target,
    renderer,
    width: 15.2,
    name: 'metals-oxygen-lab-panorama',
  })

  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const hemisphere = new HemisphereLight(0xf4fffb, 0x66736f, 1.22)
  scene.add(hemisphere)
  const ambient = new AmbientLight(0xffffff, 0.28)
  scene.add(ambient)
  const key = new DirectionalLight(0xfff4dc, 2.35)
  key.position.set(-5.8, 9.2, 7.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -8
  key.shadow.camera.right = 8
  key.shadow.camera.top = 7
  key.shadow.camera.bottom = -4
  key.shadow.bias = -0.00045
  scene.add(key)
  const fill = new DirectionalLight(0xc9e9ff, 0.82)
  fill.position.set(7, 5, 8)
  scene.add(fill)
  const rim = new DirectionalLight(0xffd6bd, 0.74)
  rim.position.set(-3, 4, -7)
  scene.add(rim)
  const softboxA = new RectAreaLight(0xd8fff4, 1.35, 7, 4)
  softboxA.position.set(-3.2, 6.5, 5)
  softboxA.lookAt(0, 1.4, 0)
  scene.add(softboxA)
  const softboxB = new RectAreaLight(0xffe6cc, 0.75, 4, 5)
  softboxB.position.set(5.5, 4, -2.5)
  softboxB.lookAt(0, 1.3, 0)
  scene.add(softboxB)

  const materials = createMaterials()
  const stage = new Group()
  stage.name = 'common-metals-stage'
  scene.add(stage)

  const environment = createOxygenLabEnvironment({
    root: scene,
    roundedBox,
    width: 15.2,
    depth: 5.75,
    topY: 0.05,
    name: 'metals-oxygen-lab-environment',
  })

  const apparatus = createApparatus(materials)
  apparatus.root.position.y = 0
  stage.add(apparatus.root)

  const state = {
    step: 0,
    stepTime: 0,
    autoPlaying: false,
    paused: false,
    completed: false,
    lastTime: performance.now() / 1000,
    detail: {},
    legendStep: -1,
    legendCurrent: -2,
    focused: false,
    activeStation: 0,
    manualMetal: null,
    selectedTube: null,
    orbiting: false,
    orbitStarted: 0,
    orbitRadius: 0,
    orbitHeight: 4.35,
  }

  const dom = {
    app: document.querySelector('.app'),
    steps: document.querySelector('#steps'),
    play: document.querySelector('#playButton'),
    pause: document.querySelector('#pauseButton'),
    reset: document.querySelector('#resetButton'),
    view: document.querySelector('#viewButton'),
    focus: document.querySelector('#focusButton'),
    orbit: document.querySelector('#orbitButton'),
    fullscreen: document.querySelector('#fullscreenButton'),
    metricStep: document.querySelector('#metricStep'),
    metricFocus: document.querySelector('#metricFocus'),
    metricState: document.querySelector('#metricState'),
    metricProgress: document.querySelector('#metricProgress'),
    progressBar: document.querySelector('#progressBar'),
    observation: document.querySelector('#observationText'),
    stageIndex: document.querySelector('#stageIndex'),
    stageTitle: document.querySelector('#stageTitle'),
    stageCopy: document.querySelector('#stageCopy'),
    legend: document.querySelector('#stageLegend'),
    comparison: document.querySelector('#comparisonPanel'),
    rateGrid: document.querySelector('#rateGrid'),
  }

  const legendSets = [
    spec.metals.map((metal) => ({ title: `${metal.symbol} · ${metal.name}`, copy: `${metal.appearance} · 点击观察`, className: metal.key === 'copper' ? 'copper' : '' })),
    spec.metals.map((metal) => ({ title: `${metal.symbol} · ${metal.name}`, copy: '点击接入闭合电路', className: metal.key === 'copper' ? 'copper' : '' })),
    spec.acidRates.map((metal) => ({ title: `${metal.symbol} · ${metal.name}`, copy: '点击聚焦该试管', className: metal.symbol === 'Cu' ? 'copper' : '' })),
    spec.acidRates.map((metal) => ({ title: `${metal.symbol} · ${metal.name}`, copy: `${metal.label} · 点击聚焦`, className: metal.symbol === 'Cu' ? 'copper' : '' })),
    [
      { title: 'Fe · 清洁铁钉', copy: '同一根铁钉' },
      { title: 'CuSO₄ · 蓝色溶液', copy: '溶液逐渐变浅' },
      { title: 'Cu · 红色固体', copy: '只附着在铁钉表面', className: 'copper' },
    ],
    [
      { title: 'Cu · 紫红色铜片', copy: '坩埚钳夹持', className: 'copper' },
      { title: 'CuO · 黑色表层', copy: '受热后逐渐生成' },
      { title: '耐热承托面', copy: '停止加热后冷却' },
    ],
  ]

  const stepButtons = spec.steps.map((step, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'step'
    button.dataset.step = String(index)
    button.innerHTML = `<span class="step-num">${String(index + 1).padStart(2, '0')}</span><strong>${step.name}</strong><span>${step.copy}</span>`
    button.setAttribute('aria-label', `第${index + 1}步：${step.name}。${step.copy}`)
    button.addEventListener('click', () => setStep(index, { stopAuto: true }))
    dom.steps.appendChild(button)
    return button
  })

  spec.acidRates.forEach((metal) => {
    const item = document.createElement('div')
    item.className = `rate-item${metal.rate === 0 ? ' zero' : ''}`
    item.dataset.symbol = metal.symbol
    item.innerHTML = `<strong>${metal.symbol}</strong><span class="rate-bar"><span style="--rate: 0%"></span></span>`
    dom.rateGrid.appendChild(item)
  })

  function renderLegend(currentIndex = -1) {
    if (state.legendStep === state.step && state.legendCurrent === currentIndex) return
    state.legendStep = state.step
    state.legendCurrent = currentIndex
    dom.legend.replaceChildren()
    const interactive = state.step <= 3
    dom.legend.classList.toggle('interactive', interactive)
    legendSets[state.step].forEach((item, index) => {
      const chip = document.createElement(interactive ? 'button' : 'div')
      if (interactive) chip.type = 'button'
      chip.className = `legend-chip${interactive ? ' selector' : ''} ${item.className || ''}${index === currentIndex ? ' current' : ''}`
      chip.innerHTML = `<strong>${item.title}</strong><span>${item.copy}</span>`
      if (interactive) {
        chip.setAttribute('aria-pressed', String(index === currentIndex))
        chip.setAttribute('aria-label', state.step <= 1
          ? `${state.step === 0 ? '观察' : '接入'}${spec.metals[index].name}`
          : `聚焦${spec.acidRates[index].name}试管`)
        chip.addEventListener('click', () => {
          if (state.step <= 1) selectMetal(index)
          else focusAcidTube(index)
        })
      }
      dom.legend.appendChild(chip)
    })
  }

  function stateText(progress, detail) {
    if (state.paused) return '实验已暂停'
    if (state.manualMetal !== null && state.step === 0) return `正在观察${spec.metals[state.manualMetal].name}并比较打磨前后光泽`
    if (state.manualMetal !== null && state.step === 1) return `${spec.metals[state.manualMetal].name}已接入闭合电路，灯泡点亮`
    if (state.completed) return state.step === 5 ? '铜片已置于耐热面冷却' : '本步观察完成'
    switch (state.step) {
      case 0:
        return progress < 0.08 ? '准备观察' : `正在打磨第 ${Math.min(5, Math.floor(progress * 5) + 1)} 种金属的局部表面`
      case 1:
        return detail.closed ? `${spec.metals[detail.metalIndex]?.name}已接通，灯泡点亮` : `${spec.metals[detail.metalIndex]?.name || '金属'}正在接入低压电路`
      case 2:
        return `向第 ${Math.min(4, (detail.currentTube ?? 0) + 1)} 支敞口试管滴加稀盐酸`
      case 3:
        return '正视比较气泡数量与金属消耗'
      case 4:
        return detail.reaction < 0.08 ? '清洁铁钉正在浸入蓝色溶液' : '红色铜正在铁钉表面析出'
      case 5:
        return detail.cooling ? '已停止加热，移至耐热面冷却' : '铜片受热，表面逐渐变黑'
      default:
        return '实验进行中'
    }
  }

  function updateDom(progress, detail = {}) {
    const step = spec.steps[state.step]
    const manualProgress = state.manualMetal === null ? progress : (state.manualMetal + 1) / spec.metals.length
    dom.metricStep.textContent = step.name
    dom.metricFocus.textContent = step.focus
    dom.metricState.textContent = stateText(progress, detail)
    dom.metricProgress.textContent = state.manualMetal === null ? `${Math.round(progress * 100)}%` : '手动'
    dom.progressBar.style.width = `${manualProgress * 100}%`
    dom.observation.textContent = step.observation
    dom.stageIndex.textContent = String(state.step + 1).padStart(2, '0')
    dom.stageTitle.textContent = step.name
    dom.stageCopy.textContent = step.copy
    dom.comparison.hidden = state.step !== 3
    dom.legend.hidden = state.step === 3

    stepButtons.forEach((button, index) => {
      button.classList.toggle('active', index === state.step)
      button.classList.toggle('done', index < state.step)
      button.setAttribute('aria-current', index === state.step ? 'step' : 'false')
    })
    dom.play.textContent = state.autoPlaying ? '停止自动' : '自动播放'
    dom.play.setAttribute('aria-pressed', String(state.autoPlaying))
    dom.pause.textContent = state.paused ? '继续' : '暂停'
    dom.pause.setAttribute('aria-pressed', String(state.paused))
    dom.pause.setAttribute('aria-label', state.paused ? '继续当前实验动画' : '暂停当前实验动画')
    dom.focus.setAttribute('aria-pressed', String(state.focused))
    dom.orbit.textContent = state.orbiting ? '停止环绕' : '环绕'
    dom.orbit.setAttribute('aria-pressed', String(state.orbiting))
    dom.orbit.setAttribute('aria-label', state.orbiting ? '停止环绕观察' : '环绕观察当前实验区域')

    if (state.step === 0 || state.step === 1) renderLegend(state.manualMetal ?? detail.metalIndex ?? 0)
    if (state.step === 2) renderLegend(state.selectedTube ?? detail.currentTube ?? 0)
    if (state.step === 3) renderLegend(state.selectedTube ?? -1)
    if (state.step === 3) {
      document.querySelectorAll('.rate-item').forEach((item, index) => {
        const fill = spec.acidRates[index].rate * Math.max(0.22, progress)
        item.querySelector('.rate-bar span').style.setProperty('--rate', `${fill * 100}%`)
      })
    }
  }

  function applyStep(progress, visualTime) {
    let detail = {}
    if (state.step === 0) detail = apparatus.updateObservation(progress, visualTime, state.manualMetal)
    else if (state.step === 1) detail = apparatus.updateCircuit(progress, visualTime, state.manualMetal)
    else if (state.step === 2 || state.step === 3) detail = apparatus.updateAcid(state.step, progress, visualTime)
    else if (state.step === 4) detail = apparatus.updateDisplacement(progress, visualTime)
    else if (state.step === 5) detail = apparatus.updateHeating(progress, visualTime)
    state.detail = detail
    updateDom(progress, detail)
  }

  function setStep(index, options = {}) {
    const nextStep = clamp(Math.round(index), 0, spec.steps.length - 1)
    state.step = nextStep
    state.stepTime = 0
    state.completed = false
    state.paused = false
    state.manualMetal = null
    state.selectedTube = null
    state.legendStep = -1
    state.legendCurrent = -2
    if (options.stopAuto) state.autoPlaying = false
    apparatus.resetAll()
    state.activeStation = apparatus.showStation(nextStep)
    renderLegend()
    applyStep(0, reducedMotion.matches ? 0 : performance.now() / 1000)
    dom.app.dataset.step = String(nextStep + 1)
    focusCurrent()
  }

  function stopOrbit() {
    state.orbiting = false
    dom.orbit.textContent = '环绕'
    dom.orbit.setAttribute('aria-pressed', 'false')
    dom.orbit.setAttribute('aria-label', '环绕观察当前实验区域')
  }

  function goFront() {
    stopOrbit()
    state.focused = false
    camera.position.set(...FRONT_CAMERA.position)
    controls.target.set(...FRONT_CAMERA.target)
    camera.zoom = 1
    camera.updateProjectionMatrix()
    controls.update()
    dom.focus?.setAttribute('aria-pressed', 'false')
  }

  function focusCurrent() {
    if ((state.step === 2 || state.step === 3) && state.selectedTube !== null) {
      focusAcidTube(state.selectedTube)
      return
    }
    state.focused = true
    const layout = apparatus.stationLayouts[state.activeStation]
    const [x, , z] = layout.position
    const preset = STEP_FOCUS[state.step] || STEP_FOCUS[0]
    camera.position.set(x, preset.y + 3.43, 15.4 + z)
    controls.target.set(x, preset.y, z)
    camera.zoom = preset.zoom
    camera.updateProjectionMatrix()
    controls.update()
    dom.focus?.setAttribute('aria-pressed', 'true')
    if (state.orbiting) prepareOrbitPath()
  }

  function focusAcidTube(index) {
    const tubeIndex = clamp(Math.round(index), 0, apparatus.acid.positions.length - 1)
    state.selectedTube = tubeIndex
    state.focused = true
    state.legendStep = -1
    const layout = apparatus.stationLayouts[2]
    const x = layout.position[0] + apparatus.acid.positions[tubeIndex] * layout.scale
    const z = layout.position[2]
    camera.position.set(x, 4.15, 15.1 + z)
    controls.target.set(x, 1.04, z)
    camera.zoom = state.step === 2 ? 2.1 : 2.3
    camera.updateProjectionMatrix()
    controls.update()
    dom.focus?.setAttribute('aria-pressed', 'true')
    renderLegend(tubeIndex)
    if (state.orbiting) prepareOrbitPath()
  }

  function selectMetal(index) {
    if (state.step > 1) return
    state.manualMetal = clamp(Math.round(index), 0, spec.metals.length - 1)
    state.autoPlaying = false
    state.paused = false
    state.completed = false
    state.stepTime = spec.steps[state.step].duration * ((state.manualMetal + 0.6) / spec.metals.length)
    state.legendStep = -1
    applyStep(clamp(state.stepTime / spec.steps[state.step].duration, 0, 1), reducedMotion.matches ? 0 : performance.now() / 1000)
  }

  function prepareOrbitPath() {
    state.orbitStarted = performance.now() / 1000
    state.orbitRadius = Math.hypot(camera.position.x - controls.target.x, camera.position.z - controls.target.z)
    state.orbitHeight = camera.position.y
  }

  function toggleOrbit() {
    if (state.orbiting) {
      stopOrbit()
      return
    }
    if (reducedMotion.matches) {
      focusCurrent()
      return
    }
    state.orbiting = true
    focusCurrent()
    prepareOrbitPath()
    updateDom(clamp(state.stepTime / spec.steps[state.step].duration, 0, 1), state.detail)
  }

  function resetLesson() {
    state.autoPlaying = false
    setStep(0)
    goFront()
  }

  dom.play.addEventListener('click', () => {
    if (state.autoPlaying) {
      state.autoPlaying = false
      updateDom(clamp(state.stepTime / spec.steps[state.step].duration, 0, 1), state.detail)
      return
    }
    if (state.manualMetal !== null) {
      state.manualMetal = null
      state.stepTime = 0
      state.completed = false
      state.legendStep = -1
      apparatus.resetAll()
      apparatus.showStation(state.step)
      applyStep(0, reducedMotion.matches ? 0 : performance.now() / 1000)
    }
    if (state.completed) {
      if (state.step === spec.steps.length - 1) setStep(0)
      else setStep(state.step + 1)
    }
    state.autoPlaying = true
    state.paused = false
    updateDom(clamp(state.stepTime / spec.steps[state.step].duration, 0, 1), state.detail)
  })
  dom.pause.addEventListener('click', () => {
    state.paused = !state.paused
    updateDom(clamp(state.stepTime / spec.steps[state.step].duration, 0, 1), state.detail)
  })
  dom.reset.addEventListener('click', resetLesson)
  dom.view.addEventListener('click', goFront)
  dom.focus.addEventListener('click', focusCurrent)
  dom.orbit.addEventListener('click', toggleOrbit)
  controls.addEventListener('start', () => {
    if (state.orbiting) stopOrbit()
  })
  dom.fullscreen.addEventListener('click', async () => {
    if (!document.fullscreenElement) await dom.app.requestFullscreen?.()
    else await document.exitFullscreen?.()
  })
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement)
    dom.fullscreen.textContent = active ? '退出全屏' : '全屏'
    dom.fullscreen.setAttribute('aria-label', active ? '退出全屏' : '进入全屏')
    dom.fullscreen.setAttribute('aria-pressed', String(active))
  })

  function resize() {
    const width = sceneElement.clientWidth || window.innerWidth
    const height = sceneElement.clientHeight || window.innerHeight
    const aspect = width / Math.max(height, 1)
    const viewHeight = Math.max(width < 700 ? 9.2 : width < 1050 ? 8.5 : 8.6, 15.4 / aspect)
    camera.left = -viewHeight * aspect / 2
    camera.right = viewHeight * aspect / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
    panorama.fitCamera(camera)
    renderer.setSize(width, height, false)
  }
  window.addEventListener('resize', resize)
  resize()

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    fallbackElement?.classList.add('show')
    loadingElement?.classList.add('hidden')
  })

  setStep(0)
  goFront()
  loadingElement?.classList.add('hidden')
  dom.app?.setAttribute('aria-busy', 'false')

  function animate(nowMs) {
    const now = nowMs / 1000
    const delta = Math.min(0.05, Math.max(0, now - state.lastTime))
    state.lastTime = now
    const stepSpec = spec.steps[state.step]

    const manualSelection = state.manualMetal !== null && state.step <= 1
    if (!state.paused && !state.completed && !manualSelection) {
      state.stepTime = Math.min(stepSpec.duration, state.stepTime + delta)
      if (state.stepTime >= stepSpec.duration) {
        state.completed = true
        if (state.autoPlaying) {
          if (state.step < spec.steps.length - 1) setStep(state.step + 1)
          else state.autoPlaying = false
        }
      }
    }

    const progress = clamp(state.stepTime / stepSpec.duration, 0, 1)
    const visualTime = reducedMotion.matches ? 0 : now
    applyStep(progress, visualTime)
    if (state.orbiting && !reducedMotion.matches) {
      const angle = Math.sin((now - state.orbitStarted) * 0.48) * 0.62
      camera.position.x = controls.target.x + Math.sin(angle) * state.orbitRadius
      camera.position.z = controls.target.z + Math.cos(angle) * state.orbitRadius
      camera.position.y = state.orbitHeight
      camera.lookAt(controls.target)
    }
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)

  const api = {
    state,
    scene,
    camera,
    controls,
    renderer,
    materials,
    panorama,
    environment,
    apparatus,
    spec,
    setStep,
    selectMetal,
    goFront,
    focusCurrent,
    focusAcidTube,
    toggleOrbit,
    reset: resetLesson,
  }
  window.__COMMON_METALS__ = api
  return api
}
