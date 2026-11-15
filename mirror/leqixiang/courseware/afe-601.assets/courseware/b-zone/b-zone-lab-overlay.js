/**
 * [INPUT]: 各课件在 window.__B_ZONE_COURSE__ 中声明的课程叙事配置，
 *          以及页面既有的 .topbar/.telemetry/#steps/#loading/#fallback 结构。
 * [OUTPUT]: 与「氧气制取」课件一致的桌面端壳层交互：
 *           左侧实时实验状态看板（可折叠）、标题卡全屏按钮、
 *           右侧二维 Canvas 微观反应场（阶段配色、步骤预览轨道）与 aria-busy 同步。
 * [POS]: B 区共享逻辑；不触碰主实验状态，仅监听 #steps 的 active 变化与
 *        课程状态指标（如材料/场景）文本。微观渲染优先委托二维 Canvas 教学场。
 *        视觉类名与 oxygen-preparation-reaction-pool.* 保持同一套系统。
 */

(() => {
  'use strict'

  const config = window.__B_ZONE_COURSE__
  const app = document.querySelector('.app')
  if (!config || !app || document.querySelector('.chemical-bond-panel')) return

  const topbar = document.querySelector('.topbar')
  const titleBlock = topbar?.querySelector('.title-block')
  const telemetry = topbar?.querySelector('.telemetry')
  const controls = document.querySelector('.controls')
  const stepsHost = document.querySelector('#steps')
  const loading = document.querySelector('#loading')
  const fallback = document.querySelector('#fallback')
  if (!topbar || !titleBlock || !telemetry) return

  const stages = config.panel?.stages ?? []
  const stageCount = stages.length
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const compactViewport = window.matchMedia('(max-width: 1119px)')

  const disclosureIconPath = 'm6.5 14.5 5.5-5 5.5 5'
  const enterFullscreenIconPath = 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'
  const exitFullscreenIconPath = 'M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5'

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (text !== undefined) element.textContent = text
    return element
  }

  const createIcon = (pathData) => {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    icon.setAttribute('viewBox', '0 0 24 24')
    icon.setAttribute('aria-hidden', 'true')
    icon.setAttribute('focusable', 'false')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData)
    icon.appendChild(path)
    return icon
  }

  const setIconButtonContent = (button, pathData, label) => {
    button.replaceChildren(createIcon(pathData), makeElement('span', '', label))
  }

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

  // ---- 文档忙碌状态：与加载层/兼容层同步，避免读屏器过早进入场景。 ----
  function syncBusyState() {
    const isLoading = !loading?.classList.contains('hidden') && !fallback?.classList.contains('show')
    app.setAttribute('aria-busy', String(isLoading))
  }
  const busyObserver = new MutationObserver(syncBusyState)
  if (loading) busyObserver.observe(loading, { attributes: true, attributeFilter: ['class'] })
  if (fallback) busyObserver.observe(fallback, { attributes: true, attributeFilter: ['class'] })
  syncBusyState()

  // ---- 左侧实时实验状态看板（折叠行为与氧气制取一致）。 ----
  telemetry.setAttribute('aria-live', 'off')
  const overview = makeElement('aside', 'experiment-overview-panel')
  overview.setAttribute('aria-label', config.overview?.ariaLabel || '实时实验状态与操作提示')
  if (!app.id) app.id = config.id + '-experiment-app'

  const content = makeElement('div', 'experiment-overview-panel__content')
  content.id = config.id + '-overview-content'
  content.append(telemetry)

  const dashboard = makeElement('div', 'experiment-overview-dashboard')
  const checklistSection = makeElement('section', 'overview-section')
  checklistSection.appendChild(makeElement('h3', 'overview-section__title', config.overview?.checklistTitle || '操作要点'))
  const checklist = makeElement('ul', 'overview-checklist')
  const checklistItems = (config.overview?.checklist ?? []).map(([label, threshold]) => {
    const item = makeElement('li', 'overview-check is-pending', label)
    item.dataset.threshold = String(threshold)
    checklist.appendChild(item)
    return item
  })
  checklistSection.appendChild(checklist)

  const observationSection = makeElement('section', 'overview-section')
  observationSection.appendChild(makeElement('h3', 'overview-section__title', '关键现象'))
  const observation = makeElement('p', 'overview-observation')
  observationSection.appendChild(observation)
  dashboard.append(checklistSection, observationSection)
  content.appendChild(dashboard)

  const compactLabel = makeElement('div', 'experiment-overview-panel__compact')
  compactLabel.appendChild(makeElement('strong', '', '实时实验状态'))

  const overviewToggle = makeElement('button', 'experiment-overview-panel__toggle')
  overviewToggle.type = 'button'
  setIconButtonContent(overviewToggle, disclosureIconPath, '收起')
  overviewToggle.setAttribute('aria-controls', content.id)
  overviewToggle.setAttribute('aria-expanded', 'true')
  const overviewHeader = makeElement('div', 'experiment-overview-panel__header')
  const panelKicker = telemetry.querySelector('.panel-kicker')
  panelKicker?.before(overviewHeader)
  overviewHeader.append(panelKicker ?? makeElement('p', 'panel-kicker', '实时实验状态'), overviewToggle)

  const heading = makeElement('div', 'title-heading')
  const title = titleBlock.querySelector('h1')
  title?.before(heading)
  if (title) heading.append(title)

  const fullscreenButton = makeElement('button', 'experiment-overview-panel__tool experiment-overview-panel__fullscreen')
  fullscreenButton.type = 'button'
  fullscreenButton.setAttribute('aria-controls', app.id)
  fullscreenButton.setAttribute('aria-pressed', 'false')
  heading.append(fullscreenButton)

  overview.append(compactLabel, content)
  app.appendChild(overview)

  const announcement = makeElement('p', 'experiment-overview-panel__sr')
  announcement.setAttribute('aria-live', 'polite')
  app.appendChild(announcement)

  let overviewExpanded = true
  let announcementFrame = 0

  function announce(message) {
    if (!message) return
    if (announcementFrame) cancelAnimationFrame(announcementFrame)
    announcement.textContent = ''
    announcementFrame = requestAnimationFrame(() => {
      announcement.textContent = message
      announcementFrame = 0
    })
  }

  function applyOverviewState(expanded, returnFocus = false) {
    overviewExpanded = expanded
    overview.classList.toggle('is-collapsed', !expanded)
    overviewToggle.setAttribute('aria-expanded', String(expanded))
    overviewToggle.setAttribute('aria-label', expanded ? '收起实时实验状态看板' : '展开实时实验状态看板')
    overviewToggle.title = expanded ? '收起实时实验状态看板' : '展开实时实验状态看板'
    setIconButtonContent(overviewToggle, disclosureIconPath, expanded ? '收起' : '展开')
    // 折叠态仍保留同一头部的按钮，确保键盘与屏幕阅读器可以再次展开。
    content.setAttribute('aria-hidden', 'false')
    content.inert = false
    if (returnFocus) overviewToggle.focus()
  }

  function updateOverviewStep(stepIndex) {
    checklistItems.forEach((item) => {
      const done = stepIndex >= Number(item.dataset.threshold)
      item.classList.toggle('is-done', done)
      item.classList.toggle('is-pending', !done)
    })
    const text = (config.overview?.observations ?? [])[stepIndex]
    if (text) observation.textContent = text
  }

  overviewToggle.addEventListener('click', () => applyOverviewState(!overviewExpanded, true))

  function syncOverviewPosition() {
    const titleRect = titleBlock.getBoundingClientRect()
    overview.style.setProperty('--overview-top', Math.ceil(titleRect.bottom + 14) + 'px')
  }
  window.addEventListener('resize', syncOverviewPosition)
  if ('ResizeObserver' in window) new ResizeObserver(syncOverviewPosition).observe(titleBlock)

  // ---- 全屏切换：优先原生全屏，失败时退化为页面沉浸模式。 ----
  const fullscreenRoot = document.documentElement
  const nativeFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null

  function syncFullscreenState() {
    const active = Boolean(nativeFullscreenElement()) || fullscreenRoot.classList.contains('is-immersive-fallback')
    setIconButtonContent(fullscreenButton, active ? exitFullscreenIconPath : enterFullscreenIconPath, active ? '退出全屏' : '全屏')
    fullscreenButton.setAttribute('aria-pressed', String(active))
    fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '进入全屏')
    fullscreenButton.title = active ? '退出全屏' : '进入全屏'
    fullscreenButton.disabled = false
  }

  async function toggleFullscreen() {
    fullscreenButton.disabled = true
    try {
      if (fullscreenRoot.classList.contains('is-immersive-fallback')) {
        fullscreenRoot.classList.remove('is-immersive-fallback')
        announce('已退出页面沉浸模式。')
      } else if (nativeFullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen
        if (exit) await Promise.resolve(exit.call(document))
      } else {
        const request = fullscreenRoot.requestFullscreen || fullscreenRoot.webkitRequestFullscreen
        if (!request) throw new Error('fullscreen unavailable')
        await Promise.resolve(request.call(fullscreenRoot))
      }
    } catch {
      fullscreenRoot.classList.add('is-immersive-fallback')
      announce('浏览器不支持原生全屏，已切换为页面沉浸模式。')
    } finally {
      syncFullscreenState()
    }
  }

  fullscreenButton.addEventListener('click', toggleFullscreen)
  document.addEventListener('fullscreenchange', syncFullscreenState)
  document.addEventListener('webkitfullscreenchange', syncFullscreenState)
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !fullscreenRoot.classList.contains('is-immersive-fallback')) return
    fullscreenRoot.classList.remove('is-immersive-fallback')
    syncFullscreenState()
    fullscreenButton.focus()
    announce('已退出页面沉浸模式。')
    event.preventDefault()
    event.stopImmediatePropagation()
  }, true)

  // ---- 右侧课程观察面板：承载本课自己的微观/原理叙事。 ----
  const panel = makeElement('aside', 'chemical-bond-panel')
  panel.dataset.stage = '0'
  panel.setAttribute('aria-label', config.panel?.ariaLabel || '课程观察面板')

  const head = makeElement('header', 'bond-panel__head')
  const kicker = makeElement('p', 'bond-panel__kicker', config.panel?.kicker || '课程观察')
  const titleRow = makeElement('div', 'bond-panel__title-row')
  const panelTitle = makeElement('h2', 'bond-panel__title', config.panel?.title || '课程观察')
  const stateBadge = makeElement('span', 'bond-panel__state', stages[0]?.name ?? '')
  const subtitle = makeElement('p', 'bond-panel__subtitle', config.panel?.subtitle || '')
  const current = makeElement('p', 'bond-panel__current', stages[0]?.copy ?? '')
  const toolRow = makeElement('div', 'bond-panel__tools')
  const followButton = makeElement('button', 'bond-panel__follow', '跟随实验')
  const compactButton = makeElement('button', 'bond-panel__compact-toggle')
  followButton.type = 'button'
  followButton.hidden = true
  compactButton.type = 'button'
  setIconButtonContent(compactButton, disclosureIconPath, '收起')
  compactButton.setAttribute('aria-expanded', 'false')
  compactButton.setAttribute('aria-controls', config.id + '-insight-content')
  toolRow.append(followButton, compactButton)
  titleRow.append(panelTitle, stateBadge)
  head.append(kicker, titleRow, subtitle, current, toolRow)

  const body = makeElement('div', 'bond-panel__body')
  const pool = makeElement('figure', 'reaction-pool')
  pool.setAttribute('role', 'img')
  pool.setAttribute('aria-label', config.panel?.boardLabel || '二维微观反应示意区')
  const liveMark = makeElement('span', 'reaction-pool__live', config.panel?.liveLabel || '课堂观察')
  const fieldLabel = makeElement('span', 'reaction-pool__field-label', stages[0]?.field ?? '')
  pool.append(liveMark, fieldLabel)
  body.appendChild(pool)

  const footer = makeElement('footer', 'bond-panel__footer')
  const stepRail = makeElement('nav', 'reaction-steps')
  stepRail.setAttribute('aria-label', '预览课程观察步骤')
  const stepButtons = stages.map((stage, index) => {
    const button = makeElement('button', 'reaction-step', stage.name)
    button.type = 'button'
    button.setAttribute('aria-pressed', 'false')
    button.setAttribute('aria-label', '预览观察步骤：' + stage.name)
    button.addEventListener('click', () => previewStage(index))
    stepRail.appendChild(button)
    return button
  })
  const formula = makeElement('p', 'bond-panel__formula', config.panel?.formula || '')
  const meta = makeElement('div', 'bond-panel__meta')
  const legend = makeElement('div', 'atom-legend')
  ;(config.panel?.legend ?? []).forEach((key) => {
    legend.appendChild(makeElement('span', 'atom-key' + (key.cls ? ' ' + key.cls : ''), key.label))
  })
  meta.append(legend)
  footer.append(stepRail, formula, meta)

  const liveDescription = makeElement('p', 'bond-panel__sr')
  liveDescription.setAttribute('aria-live', 'polite')
  const panelContent = makeElement('div', 'bond-panel__content')
  panelContent.id = config.id + '-insight-content'
  panelContent.append(body, footer)
  panel.append(head, panelContent, liveDescription)
  app.appendChild(panel)

  // ---- 右侧微观反应场：优先使用与「氧气制取」同结构的 Canvas 2D 教学场。 ----
  const customMicro = config.micro?.renderer === 'air-metering-canvas' && window.BZoneAirMeteringCanvas
  const reactionCanvas = config.micro?.renderer === 'reaction-canvas' && window.BZoneReactionCanvas
  const micro = customMicro
    ? window.BZoneAirMeteringCanvas.mount(pool, config.micro)
    : reactionCanvas
    ? window.BZoneReactionCanvas.mount(pool, config.micro, stages)
    : (window.BZoneMicroWebGL && config.micro)
    ? window.BZoneMicroWebGL.mount(pool, config.micro)
    : { ok: false, setStage: () => {}, setContext: () => {}, pause: () => {}, resume: () => {}, dispose: () => {}, setOrbit: () => {}, resetCamera: () => {} }

  // 课程状态联动（如氧气性质的材料切换）：监听状态面板指标文本，不改动宏观场景。
  const contextSource = config.micro?.contextFrom
  if (micro.ok && contextSource?.selector && contextSource.map) {
    const sourceNode = document.querySelector(contextSource.selector)
    if (sourceNode) {
      const applyContext = () => {
        const key = contextSource.map[sourceNode.textContent.trim()]
        if (key) micro.setContext(key)
      }
      new MutationObserver(applyContext).observe(sourceNode, { childList: true, characterData: true, subtree: true })
      applyContext()
    }
  }

  // 页面隐藏时暂停微观渲染；离开页面时完整释放绘图资源。
  const onVisibilityChange = () => {
    if (document.hidden) micro.pause()
    else if (panel.classList.contains('is-open')) micro.resume()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', () => micro.dispose(), { once: true })

  let rightDesktopExpanded = true
  let rightCompactExpanded = false
  let previewStageIndex = null
  let liveStageIndex = 0
  let lastCopyKey = ''

  function renderStage(stageIndex, isPreviewing) {
    const stage = stages[stageIndex]
    if (!stage) return
    const key = stageIndex + '-' + isPreviewing
    if (key === lastCopyKey) return
    lastCopyKey = key
    panel.dataset.stage = String(stageIndex)
    stateBadge.textContent = stage.name
    current.textContent = stage.copy ?? ''
    fieldLabel.textContent = stage.field ?? ''
    followButton.hidden = !isPreviewing
    stepButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stageIndex)))
    micro.setStage(stageIndex)
    updateOverviewStep(stageIndex)
    liveDescription.setAttribute('aria-live', isPreviewing ? 'polite' : 'off')
    liveDescription.textContent = isPreviewing ? '正在预览：' + stage.name + '。' + (stage.copy ?? '') : ''
  }

  function previewStage(index) {
    previewStageIndex = index
    renderStage(index, true)
  }

  function followExperiment() {
    previewStageIndex = null
    renderStage(liveStageIndex, false)
  }
  followButton.addEventListener('click', followExperiment)

  function setCompactState(open, returnFocus = false, remember = true) {
    if (remember) {
      if (compactViewport.matches) rightCompactExpanded = open
      else rightDesktopExpanded = open
    }
    if (!open && panelContent.contains(document.activeElement)) compactButton.focus()
    panel.classList.toggle('is-open', open)
    compactButton.setAttribute('aria-expanded', String(open))
    compactButton.setAttribute('aria-label', open ? '收起课程观察面板' : '展开课程观察面板')
    compactButton.title = open ? '收起课程观察面板' : '展开课程观察面板'
    setIconButtonContent(compactButton, disclosureIconPath, open ? '收起' : '展开')
    panelContent.setAttribute('aria-hidden', String(!open))
    panelContent.inert = !open
    // 折叠时停止微观绘图空转，展开时恢复。
    if (open && !document.hidden) micro.resume()
    else micro.pause()
    if (returnFocus) compactButton.focus()
  }
  compactButton.addEventListener('click', () => setCompactState(!panel.classList.contains('is-open')))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && compactViewport.matches && panel.classList.contains('is-open')) {
      setCompactState(false, true)
    }
  })
  compactViewport.addEventListener?.('change', (event) => {
    setCompactState(event.matches ? rightCompactExpanded : rightDesktopExpanded, false, false)
  })

  // ---- 底部安全间距：两侧面板都不遮挡步骤轨道。 ----
  function updateSafeBottom() {
    if (!controls) return
    const rect = controls.getBoundingClientRect()
    const viewportGap = Math.max(0, window.innerHeight - rect.bottom)
    const safeBottom = Math.ceil(rect.height + viewportGap + 14)
    panel.style.setProperty('--bond-safe-bottom', safeBottom + 'px')
    overview.style.setProperty('--left-safe-bottom', safeBottom + 'px')
    app.style.setProperty('--controls-safe-bottom', safeBottom + 'px')
  }
  window.addEventListener('resize', updateSafeBottom)
  if (controls && 'ResizeObserver' in window) new ResizeObserver(updateSafeBottom).observe(controls)

  // ---- 与主实验步骤同步：观察 #steps 内 .active 的迁移，不接管实验状态。 ----
  function currentLiveStep() {
    if (!stepsHost) return 0
    const items = Array.from(stepsHost.querySelectorAll('.step'))
    const activeIndex = items.findIndex((item) => item.classList.contains('active'))
    return clamp(activeIndex < 0 ? 0 : activeIndex, 0, Math.max(0, stageCount - 1))
  }

  function syncLiveStage(announceChange) {
    const next = currentLiveStep()
    if (next === liveStageIndex && lastCopyKey !== '') return
    const changed = next !== liveStageIndex
    liveStageIndex = next
    if (previewStageIndex === null) renderStage(liveStageIndex, false)
    if (announceChange && changed) {
      const stage = stages[liveStageIndex]
      if (stage) announce('实验进入' + stage.name + '。' + (stage.copy ?? ''))
    }
  }

  if (stepsHost) {
    const stepObserver = new MutationObserver(() => syncLiveStage(true))
    stepObserver.observe(stepsHost, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true })
  }

  // ---- 初始状态。 ----
  syncOverviewPosition()
  applyOverviewState(true)
  syncFullscreenState()
  setCompactState(!compactViewport.matches, false, false)
  updateSafeBottom()
  syncLiveStage(false)
  renderStage(currentLiveStep(), false)
})()
