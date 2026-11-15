/**
 * [INPUT]: 课程 spec、lesson 状态机、stage、rig（取 anchors 世界锚点）。
 * [OUTPUT]: createShell —— 六步按钮、播放/暂停、重置、正视、全屏、实时状态
 *           面板与随镜头投影的世界标注。只操作 DOM，不直接改三维状态。
 * [POS]: 界面层。所有实验事实都来自 lesson.getMetrics 与 spec，不在此杜撰。
 */
import { Vector3 } from './lib.js'

const CALLOUT_BY_STEP = [
  ['calloutBalance'],
  ['calloutBeaker'],
  ['calloutFunnel'],
  ['calloutFunnel'],
  ['calloutDish'],
  ['calloutDish'],
]

export function createShell({ spec, lesson, stage, rig }) {
  const $ = (sel) => document.querySelector(sel)
  const app = $('.app')
  const stepsHost = $('#steps')
  const playButton = $('#playButton')
  const frontButton = $('#frontButton')
  const orbitButton = $('#orbitButton')
  const lockViewButton = $('#lockViewButton')
  const fullscreenButton = $('#fullscreenButton')
  const resetButton = $('#resetButton')
  const metricStep = $('#metricStep')
  const metricSample = $('#metricSample')
  const metricFiltrate = $('#metricFiltrate')
  const metricHeat = $('#metricHeat')
  const safetyText = $('#safetyText')
  const loading = $('#loading')

  /* ---------- 六步按钮（固定顺序，可任意跳转） ---------- */
  const stepButtons = spec.steps.map((step, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'step'
    button.setAttribute('aria-label', `跳到步骤${index + 1}：${step.name}`)
    button.innerHTML = `<span class="step-num">${index + 1}</span><strong>${step.name}</strong><span>${step.copy}</span>`
    button.addEventListener('click', () => {
      lesson.setStep(index)
      lesson.togglePlay()
      stage.viewStep(index)
    })
    stepsHost.appendChild(button)
    return button
  })

  playButton.addEventListener('click', () => lesson.togglePlay())
  let viewedStep = lesson.state.step
  resetButton.addEventListener('click', () => {
    lesson.reset()
    viewedStep = lesson.state.step
    stage.frontView()
  })
  frontButton.addEventListener('click', () => stage.frontView())
  orbitButton?.addEventListener('click', () => stage.toggleAutoOrbit())
  stage.onAutoOrbitChange((active) => {
    orbitButton?.setAttribute('aria-pressed', String(active))
    if (!orbitButton) return
    orbitButton.textContent = active ? '停止环绕' : '环绕'
    orbitButton.setAttribute('aria-label', active
      ? '停止左右往返环绕运镜'
      : '开启左右往返环绕运镜')
  })
  lockViewButton?.addEventListener('click', () => stage.toggleViewLock())
  stage.onViewLockChange((active) => {
    lockViewButton?.setAttribute('aria-pressed', String(active))
    if (lockViewButton) {
      lockViewButton.textContent = active ? '解除锁定' : '锁定视角'
      lockViewButton.setAttribute('aria-label', active
        ? '解除当前观察距离锁定'
        : '锁定当前观察距离，保持正常环绕')
    }
    if (frontButton) frontButton.disabled = active
  })
  fullscreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else app.requestFullscreen?.()
  })
  document.addEventListener('fullscreenchange', () => {
    const on = Boolean(document.fullscreenElement)
    fullscreenButton.textContent = on ? '退出全屏' : '全屏'
    fullscreenButton.setAttribute('aria-pressed', String(on))
  })

  /* ---------- 状态同步（步进/播放态变化时） ---------- */
  function syncControls() {
    const { step, playing, finished } = lesson.state
    if (step !== viewedStep) {
      stage.viewStep(step)
      viewedStep = step
    }
    stepButtons.forEach((button, index) => {
      button.classList.toggle('active', index === step)
      button.classList.toggle('done', index < step || (finished && index === step))
      if (index === step) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    })
    playButton.textContent = playing ? '暂停' : (finished ? '重新播放' : '播放')
    playButton.setAttribute('aria-pressed', String(playing))
    metricStep.textContent = `${step + 1} · ${spec.steps[step].name}`
    safetyText.textContent = spec.steps[step].safety
    Object.keys(rig.anchors).forEach((key) => {
      $(`#${key}`)?.classList.toggle('hidden', !CALLOUT_BY_STEP[step].includes(key))
    })
  }
  lesson.onChange(syncControls)
  syncControls()

  /* ---------- 每帧：慢速指标 + 世界标注投影 ---------- */
  const projected = new Vector3()
  let metricClock = 0
  const shell = {
    frame(dt) {
      metricClock += dt
      if (metricClock > 0.24) {
        metricClock = 0
        const m = lesson.getMetrics()
        metricSample.textContent = m.sample
        metricFiltrate.textContent = m.filtrate
        metricHeat.textContent = m.heat
      }
      const { clientWidth: w, clientHeight: h } = stage.renderer.domElement
      Object.entries(rig.anchors).forEach(([key, anchor]) => {
        const el = $(`#${key}`)
        if (!el || el.classList.contains('hidden')) return
        projected.copy(anchor).project(stage.camera)
        el.style.setProperty('--x', `${((projected.x + 1) / 2) * w}px`)
        el.style.setProperty('--y', `${((1 - projected.y) / 2) * h}px`)
      })
    },
    ready() {
      loading?.classList.add('hidden')
      app?.setAttribute('aria-busy', 'false')
    },
  }
  return shell
}
