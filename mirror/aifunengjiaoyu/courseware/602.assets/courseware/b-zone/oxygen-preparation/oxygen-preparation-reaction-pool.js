/**
 * [INPUT]: 氧气制取页暴露的 __OXYGEN_PREPARATION__.state。
 * [输出]: 高密度微观反应场与五步预览控制，服务于高锰酸钾受热分解的教学说明。
 * [约束]: 仅在本面板使用一个 Canvas 2D 图层；不新建 WebGL 上下文，不改写主实验状态。
 */

(() => {
  'use strict'

  const lab = window.__OXYGEN_PREPARATION__
  const app = document.querySelector('.app')
  if (!lab?.state || !app || document.querySelector('.chemical-bond-panel')) return

  const { state } = lab
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const compactViewport = window.matchMedia('(max-width: 1119px)')
  const controls = document.querySelector('.controls')
  const reactionCanvas = document.createElement('canvas')
  const reactionContext = reactionCanvas.getContext('2d', { alpha: true, desynchronized: true })
  const microDefaults = {
    atomSize: { hero: 0.9, batch: 1.05, symbol: 1.1 },
    bondLength: 1.35,
  }
  window.__B_ZONE_MICRO_CONFIG__ = microDefaults
  let atomSize = { ...microDefaults.atomSize, bond: microDefaults.bondLength }
  // 每批代表 2KMnO₄：2 个 K、2 个 Mn、8 个 O，共 12 个原子。
  const BATCH_COUNT = 6
  const ATOMS_PER_BATCH = 12
  const TOTAL_ATOMS = BATCH_COUNT * ATOMS_PER_BATCH

  const stepDefinitions = [
    {
      title: '装置检查',
      copy: '六组 2KMnO₄ 反应模型保持稳定，原子种类和数目不变。',
      progress: 0,
      heat: 0,
      gas: 0,
      trail: 0,
      field: '稳定结构场',
    },
    {
      title: '均匀预热',
      copy: '先均匀预热试管，再集中加热固体所在的试管底部。',
      progress: 0,
      heat: 0.78,
      gas: 0,
      trail: 0.16,
      field: '热能传递',
    },
    {
      title: '排出空气',
      copy: '先将装置内原有空气（含少量氧气）顶出；本阶段微观示意中 KMnO₄ 保持原结构。',
      progress: 0.62,
      heat: 1,
      gas: 0.46,
      trail: 0.9,
      field: '空气（含 O₂）被顶出 · KMnO₄ 保持',
    },
    {
      title: '排水集气',
      copy: '气泡连续均匀后开始收集；氧气难溶于水，适合排水集气。',
      progress: 0.98,
      heat: 0.86,
      gas: 1,
      trail: 1,
      field: 'O₂ 持续逸出',
    },
    {
      title: '安全收尾',
      copy: '先将导管移出水面，再熄灭酒精灯，防止水倒吸。',
      progress: 1,
      heat: 0,
      gas: 0.16,
      trail: 0.08,
      field: '产物保留',
    },
  ]

  const palette = {
    K: { light: '#fff0b7', base: '#dfa328', dark: '#8e5708', halo: 'rgba(225,164,39,.24)', radius: 8.2 },
    Mn: { light: '#e1c6ff', base: '#8c4bc5', dark: '#452066', halo: 'rgba(128,66,182,.24)', radius: 10.7 },
    O: { light: '#ffc0b8', base: '#df463f', dark: '#841f1c', halo: 'rgba(220,66,58,.23)', radius: 7.4 },
  }

  const beforeBonds = [
    { a: 'mn1', b: 'o1', kind: 'structure' },
    { a: 'mn1', b: 'o2', kind: 'structure' },
    { a: 'mn1', b: 'o3', kind: 'structure' },
    { a: 'mn1', b: 'o4', kind: 'structure' },
    { a: 'mn2', b: 'o5', kind: 'structure' },
    { a: 'mn2', b: 'o6', kind: 'structure' },
    { a: 'mn2', b: 'o7', kind: 'structure' },
    { a: 'mn2', b: 'o8', kind: 'structure' },
  ]

  const afterBonds = [
    { a: 'mn1', b: 'o1', kind: 'structure' },
    { a: 'mn1', b: 'o2', kind: 'structure' },
    { a: 'mn1', b: 'o3', kind: 'structure' },
    { a: 'mn1', b: 'o4', kind: 'structure' },
    { a: 'mn2', b: 'o5', kind: 'structure' },
    { a: 'mn2', b: 'o6', kind: 'structure' },
    { a: 'o7', b: 'o8', kind: 'double' },
  ]

  const beforeAssociations = [
    { a: 'k1', b: 'mn1' },
    { a: 'k2', b: 'mn2' },
  ]

  const afterAssociations = [
    { a: 'k1', b: 'mn1' },
    { a: 'k2', b: 'mn1' },
  ]

  const batchSeeds = [
    { x: 58, y: 244, depth: 0.69, opacity: 0.78, delay: 0, lane: 0, layer: 'far', rotation: -0.2 },
    { x: 128, y: 208, depth: 0.76, opacity: 0.84, delay: 0.08, lane: 2, layer: 'far', rotation: 0.16 },
    { x: 204, y: 236, depth: 0.72, opacity: 0.81, delay: 0.16, lane: 4, layer: 'far', rotation: -0.13 },
    { x: 282, y: 204, depth: 0.74, opacity: 0.82, delay: 0.24, lane: 7, layer: 'far', rotation: 0.19 },
    { x: 354, y: 242, depth: 0.67, opacity: 0.76, delay: 0.32, lane: 9, layer: 'far', rotation: -0.18 },
    { x: 100, y: 314, depth: 0.88, opacity: 0.94, delay: 0.42, lane: 1, layer: 'mid', rotation: 0.13 },
  ]

  const gasDocks = [
    { x: 18, y: 176 },
    { x: 62, y: 204 },
    { x: 104, y: 166 },
    { x: 148, y: 198 },
    { x: 190, y: 164 },
    { x: 234, y: 207 },
    { x: 278, y: 170 },
    { x: 322, y: 202 },
    { x: 366, y: 165 },
    { x: 410, y: 196 },
    { x: 30, y: 228 }, { x: 72, y: 252 }, { x: 114, y: 222 }, { x: 156, y: 254 }, { x: 198, y: 226 },
    { x: 240, y: 250 }, { x: 282, y: 224 }, { x: 324, y: 256 }, { x: 366, y: 228 }, { x: 408, y: 252 },
  ]

  // 右侧面板同时承担“原子级反应”和“六组计量守恒”两种信息：
  // 仅 Hero 展示完整键合，其余 6 组作为规则的守恒验证单元。
  const GAS_LANES = [145, 210, 275]
  // 课堂观察区同时呈现三组完整计量单元，而不是把单一结构放大。
  const HERO_UNITS = [
    { x: 90, y: 222, scale: 1, gasLane: GAS_LANES[0] },
    { x: 210, y: 222, scale: 1, gasLane: GAS_LANES[1] },
    { x: 330, y: 222, scale: 1, gasLane: GAS_LANES[2] },
  ]
  const CONTEXT_CENTERS = Array.from({ length: BATCH_COUNT }, (_, index) => ({
    x: 80 + (index % 3) * 130,
    y: 440 + Math.floor(index / 3) * 88,
  }))
  const WORLD = { width: 420, height: 600 }



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
  const lerp = (from, to, amount) => from + (to - from) * amount
  const smoothstep = (edgeA, edgeB, value) => {
    const normalized = clamp((value - edgeA) / Math.max(0.0001, edgeB - edgeA), 0, 1)
    return normalized * normalized * (3 - 2 * normalized)
  }
  const easeInOut = (value) => {
    const normalized = clamp(value, 0, 1)
    return normalized < 0.5 ? 2 * normalized * normalized : 1 - Math.pow(-2 * normalized + 2, 2) / 2
  }

  function hashString(value) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }

  function rotatePoint(x, y, rotation) {
    const cosine = Math.cos(rotation)
    const sine = Math.sin(rotation)
    return { x: x * cosine - y * sine, y: x * sine + y * cosine }
  }

  function cubicPoint(from, controlA, controlB, to, amount) {
    const inverse = 1 - amount
    const inverseSquared = inverse * inverse
    const amountSquared = amount * amount
    return {
      x: inverseSquared * inverse * from.x
        + 3 * inverseSquared * amount * controlA.x
        + 3 * inverse * amountSquared * controlB.x
        + amountSquared * amount * to.x,
      y: inverseSquared * inverse * from.y
        + 3 * inverseSquared * amount * controlA.y
        + 3 * inverse * amountSquared * controlB.y
        + amountSquared * amount * to.y,
    }
  }

  // 72 个守恒验证原子的持续运动使用 Canvas 2D 绘制；避免在每帧刷新大量 SVG 节点。
  let canvasWidth = 0
  let canvasHeight = 0
  let canvasPixelRatio = 1

  function syncCanvasSize() {
    if (!reactionCanvas || !reactionContext) return
    const rect = reactionCanvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    if (width !== canvasWidth || height !== canvasHeight || pixelRatio !== canvasPixelRatio) {
      canvasWidth = width
      canvasHeight = height
      canvasPixelRatio = pixelRatio
      reactionCanvas.width = Math.round(width * pixelRatio)
      reactionCanvas.height = Math.round(height * pixelRatio)
    }
  }

  function prepareCanvasFrame() {
    if (!reactionCanvas || !reactionContext) return false
    if (!canvasWidth || !canvasHeight) syncCanvasSize()
    reactionContext.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0)
    reactionContext.clearRect(0, 0, canvasWidth, canvasHeight)
    const scale = Math.min(canvasWidth / WORLD.width, canvasHeight / WORLD.height)
    const offsetX = (canvasWidth - WORLD.width * scale) / 2
    const offsetY = (canvasHeight - WORLD.height * scale) / 2
    reactionContext.setTransform(
      canvasPixelRatio * scale,
      0,
      0,
      canvasPixelRatio * scale,
      canvasPixelRatio * offsetX,
      canvasPixelRatio * offsetY,
    )
    return true
  }

  function canvasAtomRadius(position, detail = 'context') {
    const baseRadius = ({ K: 6.1, Mn: 8.1, O: 6.2 }[position.el] || 6) * (position.scale || 1)
    const tuning = detail === 'hero' ? atomSize.hero : atomSize.batch
    return (detail === 'hero' ? baseRadius * 1.14 : baseRadius) * (4 / 3) * tuning
  }

  function drawCanvasBond(ref, positions, opacity, detail = 'context') {
    if (!reactionContext || opacity < 0.015) return
    const first = positions.get(ref.a)
    const second = positions.get(ref.b)
    if (!first || !second) return
    const dx = second.x - first.x
    const dy = second.y - first.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const nx = dx / length
    const ny = dy / length
    const isHero = detail === 'hero'
    const startInset = Math.min(length * 0.36, canvasAtomRadius(first, detail) * 0.82)
    const endInset = Math.min(length * 0.36, canvasAtomRadius(second, detail) * 0.82)
    const offset = ref.kind === 'double' ? (isHero ? 2.4 : 1.1) : 0
    const paint = (direction) => {
      reactionContext.beginPath()
      reactionContext.moveTo(first.x + nx * startInset - ny * offset * direction, first.y + ny * startInset + nx * offset * direction)
      reactionContext.lineTo(second.x - nx * endInset - ny * offset * direction, second.y - ny * endInset + nx * offset * direction)
      reactionContext.stroke()
    }
    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)
    reactionContext.strokeStyle = ref.kind === 'double'
      ? (isHero ? 'rgba(170, 52, 67, .96)' : 'rgba(184, 65, 76, .78)')
      : (isHero ? 'rgba(52, 64, 82, .9)' : 'rgba(104, 72, 139, .72)')
    reactionContext.lineWidth = ref.kind === 'double' ? (isHero ? 1.45 : 1.25) : (isHero ? 2.05 : 1.45)
    reactionContext.lineCap = 'round'
    paint(ref.kind === 'double' ? -1 : 0)
    if (ref.kind === 'double') paint(1)
    reactionContext.restore()
  }

  function drawCanvasAtom(position, opacityMultiplier = 1, detail = 'context') {
    const opacity = position.opacity * opacityMultiplier
    if (!reactionContext || opacity < 0.015) return
    const colors = palette[position.el]
    const radius = canvasAtomRadius(position, detail)
    const isHero = detail === 'hero'

    reactionContext.save()
    reactionContext.globalAlpha = opacity

    const gradient = reactionContext.createRadialGradient(
      position.x - radius * 0.34,
      position.y - radius * 0.38,
      Math.max(.5, radius * 0.1),
      position.x,
      position.y,
      radius,
    )
    gradient.addColorStop(0, colors.light)
    gradient.addColorStop(.52, colors.base)
    gradient.addColorStop(1, colors.dark)

    // 径向渐变与高光足以表达球体，避免逐原子执行实时模糊和阴影。
    reactionContext.fillStyle = gradient
    reactionContext.beginPath()
    reactionContext.arc(position.x, position.y, radius, 0, Math.PI * 2)
    reactionContext.fill()
    reactionContext.strokeStyle = isHero ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.68)'
    reactionContext.lineWidth = isHero ? .75 : .5
    reactionContext.stroke()
    reactionContext.fillStyle = isHero ? 'rgba(255,255,255,.72)' : 'rgba(255,255,255,.62)'
    reactionContext.beginPath()
    reactionContext.ellipse(position.x - radius * .28, position.y - radius * .32, Math.max(1, radius * .22), Math.max(.8, radius * .14), -0.45, 0, Math.PI * 2)
    reactionContext.fill()
    if (isHero) {
      reactionContext.fillStyle = '#fff'
      const symbolSize = (position.el === 'Mn' ? 10.4 : position.el === 'K' ? 9.1 : 10.9) * atomSize.symbol
      reactionContext.font = '800 ' + symbolSize + 'px Inter, system-ui, sans-serif'
      reactionContext.textAlign = 'center'
      reactionContext.textBaseline = 'middle'
      reactionContext.fillText(position.el === 'K' ? 'K⁺' : position.el, position.x, position.y + .4)
    }
    reactionContext.restore()
  }

  function drawCanvasAssociation(ref, positions, opacity, dashOffset, detail = 'context') {
    if (!reactionContext || opacity < 0.015) return
    const first = positions.get(ref.a)
    const second = positions.get(ref.b)
    if (!first || !second) return
    const dx = second.x - first.x
    const dy = second.y - first.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const isHero = detail === 'hero'
    const startInset = Math.min(length * 0.3, canvasAtomRadius(first, detail) * 0.74)
    const endInset = Math.min(length * 0.3, canvasAtomRadius(second, detail) * 0.74)

    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)
    reactionContext.strokeStyle = isHero ? 'rgba(178, 126, 42, .82)' : 'rgba(178, 126, 42, .38)'
    reactionContext.lineWidth = isHero ? 1.15 : 0.7
    reactionContext.lineCap = 'round'
    reactionContext.setLineDash(isHero ? [2, 3.6] : [1.4, 3])
    reactionContext.lineDashOffset = dashOffset * 3
    reactionContext.beginPath()
    reactionContext.moveTo(first.x + (dx / length) * startInset, first.y + (dy / length) * startInset)
    reactionContext.lineTo(second.x - (dx / length) * endInset, second.y - (dy / length) * endInset)
    reactionContext.stroke()
    reactionContext.restore()
  }

  function traceCanvasCurve(path, amount = 1) {
    if (!reactionContext) return
    const cappedAmount = clamp(amount, 0, 1)
    const steps = Math.max(2, Math.ceil(18 * cappedAmount))
    reactionContext.beginPath()
    for (let index = 0; index <= steps; index += 1) {
      const point = cubicPoint(path.from, path.controlA, path.controlB, path.to, cappedAmount * index / steps)
      if (index === 0) reactionContext.moveTo(point.x, point.y)
      else reactionContext.lineTo(point.x, point.y)
    }
  }

  function drawCanvasTransitionTrail(path, amount, opacity, dashOffset) {
    if (!reactionContext || opacity < 0.015 || amount <= 0) return
    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)
    reactionContext.strokeStyle = 'rgba(229, 151, 55, .84)'
    reactionContext.lineWidth = 1.15
    reactionContext.lineCap = 'round'
    reactionContext.setLineDash([1.4, 3.8])
    reactionContext.lineDashOffset = dashOffset * 6
    traceCanvasCurve(path, amount)
    reactionContext.stroke()
    reactionContext.restore()
  }

  function drawCanvasGasTrail(path, amount, opacity, dashOffset) {
    if (!reactionContext || opacity < 0.015 || amount <= 0) return
    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)
    reactionContext.strokeStyle = 'rgba(97, 214, 230, .98)'
    reactionContext.lineWidth = 1.75
    reactionContext.lineCap = 'round'
    reactionContext.setLineDash([0.7, 3.3])
    reactionContext.lineDashOffset = dashOffset * 8
    traceCanvasCurve(path, amount)
    reactionContext.stroke()
    reactionContext.restore()
  }

  function drawCanvasOxygenMolecule(center, opacity, scale = 1, angle = 0) {
    if (!reactionContext || opacity < 0.015) return
    const radius = (4.7 * 4 / 3) * scale * atomSize.hero
    const halfDistance = 8.2 * scale * atomSize.bond
    const dx = Math.cos(angle) * halfDistance
    const dy = Math.sin(angle) * halfDistance
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    const first = { x: center.x - dx, y: center.y - dy }
    const second = { x: center.x + dx, y: center.y + dy }

    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)
    reactionContext.strokeStyle = 'rgba(196, 67, 74, .88)'
    reactionContext.lineWidth = 1.15 * scale
    reactionContext.lineCap = 'round'
    reactionContext.beginPath()
    for (const offset of [-1.55 * scale, 1.55 * scale]) {
      reactionContext.moveTo(first.x + nx * offset, first.y + ny * offset)
      reactionContext.lineTo(second.x + nx * offset, second.y + ny * offset)
    }
    reactionContext.stroke()
    reactionContext.fillStyle = '#df463f'
    reactionContext.beginPath()
    reactionContext.arc(first.x, first.y, radius, 0, Math.PI * 2)
    reactionContext.arc(second.x, second.y, radius, 0, Math.PI * 2)
    reactionContext.fill()
    reactionContext.restore()
  }

  function drawCanvasOxygenSource(batch, phase, gasFlow, opacity, now) {
    const sourceOpacity = smoothstep(0.44, 0.8, phase.formation)
      * Math.max(0.46, gasFlow)
      * opacity
    if (sourceOpacity < 0.015) return
    const pulse = reducedMotion.matches ? 0 : Math.sin(now * 0.003 + batch.batchIndex) * 0.08
    drawCanvasOxygenMolecule(batch.gasPath.from, sourceOpacity, 1.08, -Math.PI / 2 + pulse)
  }

  function drawCanvasPulse(pulse, amount, opacity) {
    if (!reactionContext || opacity < 0.015 || amount <= 0) return
    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)
    reactionContext.strokeStyle = 'rgba(236, 158, 57, .8)'
    reactionContext.fillStyle = 'rgba(244, 177, 72, .07)'
    reactionContext.lineWidth = 1.1
    reactionContext.beginPath()
    reactionContext.arc(pulse.x, pulse.y, 7 + amount * (25 + pulse.depth * 9), 0, Math.PI * 2)
    reactionContext.fill()
    reactionContext.stroke()
    reactionContext.restore()
  }

  function drawCanvasEnvironment(stepIndex, progress, heat, gasFlow, now) {
    if (!reactionContext) return
    const gasPresence = smoothstep(0.34, 0.9, progress)
    const formedMolecules = Math.round(clamp(progress, 0, 1) * BATCH_COUNT)
    reactionContext.save()

    const gasGradient = reactionContext.createLinearGradient(0, 74, 0, 0)
    gasGradient.addColorStop(0, 'rgba(141, 207, 203, .08)')
    gasGradient.addColorStop(0.58, 'rgba(113, 193, 205, ' + (0.13 + gasPresence * 0.14).toFixed(3) + ')')
    gasGradient.addColorStop(1, 'rgba(232, 250, 247, ' + (0.72 + gasPresence * 0.14).toFixed(3) + ')')
    reactionContext.fillStyle = gasGradient
    reactionContext.fillRect(0, 0, WORLD.width, 74)
    reactionContext.strokeStyle = 'rgba(80, 146, 142, .38)'
    reactionContext.lineWidth = 1
    reactionContext.beginPath()
    reactionContext.moveTo(18, 74)
    reactionContext.lineTo(WORLD.width - 18, 74)
    reactionContext.stroke()

    const isAirPurge = stepIndex === 2
    reactionContext.fillStyle = 'rgba(39, 83, 73, .88)'
    reactionContext.font = '800 10px Inter, system-ui, sans-serif'
    reactionContext.textAlign = 'left'
    reactionContext.textBaseline = 'middle'
    reactionContext.fillText(isAirPurge ? '原有空气 · O₂' : '气相 · O₂(g)', 18, 24)
    reactionContext.textAlign = 'right'
    reactionContext.fillStyle = 'rgba(43, 104, 111, .8)'
    reactionContext.fillText(
      isAirPurge ? '空气 O₂ 正在排出' : '已形成 O₂ · ' + formedMolecules + ' / ' + BATCH_COUNT,
      WORLD.width - 18,
      24,
    )

    GAS_LANES.forEach((lane, index) => {
      const laneOpacity = 0.1 + gasPresence * (0.16 + gasFlow * 0.16)
      reactionContext.save()
      reactionContext.globalAlpha = laneOpacity
      reactionContext.strokeStyle = 'rgba(43, 146, 166, .9)'
      reactionContext.lineWidth = 1.15
      reactionContext.setLineDash([2.5, 5])
      reactionContext.lineDashOffset = reducedMotion.matches ? 0 : -now * 0.006 - index * 2
      reactionContext.beginPath()
      reactionContext.moveTo(lane, 68)
      reactionContext.bezierCurveTo(lane - 8, 56, lane + 8, 42, lane, 30)
      reactionContext.stroke()
      reactionContext.restore()
    })

    if (gasPresence > 0.04) {
      // 排空气不是“氧气消失”：三条气路中持续可见 O₂ 分子包，明确其正在置换空气。
      const moleculeCount = stepIndex === 2
        ? 6
        : Math.min(3, Math.max(1, Math.ceil(gasFlow * 3)))
      for (let index = 0; index < moleculeCount; index += 1) {
        const laneIndex = index % GAS_LANES.length
        const laneRow = Math.floor(index / GAS_LANES.length)
        const cycle = reducedMotion.matches
          ? (laneIndex + 1) / (GAS_LANES.length + 1)
          : (now * 0.00018 + laneIndex / GAS_LANES.length) % 1
        const x = GAS_LANES[laneIndex]
        const y = stepIndex === 2
          ? 64 - laneRow * 16 - cycle * 6
          : 62 - cycle * 30
        drawCanvasOxygenMolecule(
          { x, y },
          0.48 + gasPresence * 0.48,
          stepIndex === 2 ? 1.06 : 1,
          laneRow === 0 ? 0 : Math.PI / 2,
        )
      }
    }

    reactionContext.fillStyle = 'rgba(255, 255, 252, .64)'
    reactionContext.fillRect(16, 86, 388, 268)
    reactionContext.strokeStyle = 'rgba(68, 126, 92, .34)'
    reactionContext.lineWidth = 1
    reactionContext.strokeRect(16, 86, 388, 268)
    reactionContext.fillStyle = 'rgba(41, 90, 65, .82)'
    reactionContext.textAlign = 'left'
    reactionContext.font = '800 9px Inter, system-ui, sans-serif'
    reactionContext.fillText('原子级观察 · 3 组 2KMnO₄ 代表单元', 32, 104)

    reactionContext.strokeStyle = 'rgba(82, 139, 103, .28)'
    reactionContext.beginPath()
    reactionContext.moveTo(18, 370)
    reactionContext.lineTo(WORLD.width - 18, 370)
    reactionContext.stroke()
    reactionContext.fillStyle = 'rgba(52, 103, 75, .78)'
    reactionContext.fillText('原子守恒验证 · 6 组反应模型', 18, 389)

    if (!reducedMotion.matches && heat > 0.02) {
      for (let index = 0; index < 3; index += 1) {
        const wave = Math.sin(now * 0.004 + index * 1.9) * 3
        reactionContext.save()
        reactionContext.globalAlpha = heat * (0.16 - index * 0.025)
        reactionContext.strokeStyle = 'rgba(242, 174, 75, .9)'
        reactionContext.lineWidth = 1.1
        reactionContext.setLineDash([3, 6])
        reactionContext.lineDashOffset = -now * 0.012 - index * 4
        reactionContext.beginPath()
        reactionContext.moveTo(100, 330 + index * 5)
        reactionContext.bezierCurveTo(155, 320 + wave, 265, 341 - wave, 320, 330 + index * 5)
        reactionContext.stroke()
        reactionContext.restore()
      }
    }

    reactionContext.restore()
  }

  function drawCanvasMeasurementCell(batch, opacity, detail, phase) {
    if (!reactionContext || opacity < 0.015) return
    const isHero = detail === 'hero'
    const activation = phase.formation
    const radiusX = (isHero ? 48 : 44) * batch.seed.depth
    const radiusY = (isHero ? 35 : 29) * batch.seed.depth
    reactionContext.save()
    reactionContext.globalAlpha = Math.min(1, opacity)

    if (!isHero) {
      // 参考生成稿的浅玻璃托盘，仅用渐变和亮边表达层次。
      const plateGradient = reactionContext.createLinearGradient(
        batch.seed.x,
        batch.seed.y - radiusY,
        batch.seed.x,
        batch.seed.y + radiusY,
      )
      plateGradient.addColorStop(0, 'rgba(255, 255, 250, .72)')
      plateGradient.addColorStop(.62, 'rgba(246, 250, 240, .62)')
      plateGradient.addColorStop(1, 'rgba(202, 225, 208, .48)')
      reactionContext.fillStyle = plateGradient
      reactionContext.strokeStyle = 'rgba(126, 171, 143, .34)'
      reactionContext.lineWidth = .85
      reactionContext.beginPath()
      reactionContext.ellipse(batch.seed.x, batch.seed.y + 1.8, radiusX, radiusY, 0, 0, Math.PI * 2)
      reactionContext.fill()
      reactionContext.stroke()

      reactionContext.strokeStyle = 'rgba(255, 255, 255, .72)'
      reactionContext.lineWidth = .75
      reactionContext.beginPath()
      reactionContext.ellipse(batch.seed.x, batch.seed.y - .8, radiusX * .94, radiusY * .88, 0, Math.PI * 1.08, Math.PI * 1.92)
      reactionContext.stroke()
      reactionContext.restore()
      return
    }

    reactionContext.fillStyle = 'rgba(255, 255, 255, .56)'
    reactionContext.strokeStyle = `rgba(51, 126, 83, ${(0.28 + activation * 0.28).toFixed(3)})`
    reactionContext.lineWidth = 1.1
    reactionContext.beginPath()
    reactionContext.ellipse(batch.seed.x, batch.seed.y, radiusX, radiusY, 0, 0, Math.PI * 2)
    reactionContext.fill()
    reactionContext.stroke()
    reactionContext.restore()
  }

  function drawCanvasHeroAnnotations(batch, phase, opacity) {
    if (!reactionContext || opacity < 0.015) return
    const beforeOpacity = (1 - smoothstep(0.34, 0.66, phase.formation)) * opacity
    const productOpacity = smoothstep(0.44, 0.82, phase.formation) * opacity
    const labelY = batch.seed.y + 48 * batch.seed.depth

    reactionContext.save()
    reactionContext.textAlign = 'center'
    reactionContext.textBaseline = 'middle'
    reactionContext.font = '800 7.4px Inter, system-ui, sans-serif'

    if (beforeOpacity > 0.015) {
      reactionContext.globalAlpha = beforeOpacity * 0.72
      reactionContext.fillStyle = 'rgba(41, 87, 66, .86)'
      reactionContext.fillText('2 KMnO₄', batch.seed.x, labelY)
    }

    if (productOpacity > 0.015) {
      reactionContext.globalAlpha = productOpacity * 0.84
      reactionContext.fillStyle = 'rgba(37, 83, 63, .92)'
      reactionContext.fillText('K₂MnO₄', batch.seed.x - 25 * batch.seed.depth, labelY)
      reactionContext.fillText('MnO₂', batch.seed.x + 28 * batch.seed.depth, labelY)
    }

    reactionContext.restore()
  }

  function scaleBondedPositions(positions, refs) {
    if (Math.abs(atomSize.bond - 1) < 0.001) return positions
    const scaled = new Map(Array.from(positions, ([id, position]) => [id, { ...position }]))
    const adjacency = new Map()
    refs.forEach((ref) => {
      if (!positions.has(ref.a) || !positions.has(ref.b)) return
      if (!adjacency.has(ref.a)) adjacency.set(ref.a, new Set())
      if (!adjacency.has(ref.b)) adjacency.set(ref.b, new Set())
      adjacency.get(ref.a).add(ref.b)
      adjacency.get(ref.b).add(ref.a)
    })
    const visited = new Set()
    adjacency.forEach((_, root) => {
      if (visited.has(root)) return
      const component = []
      const pending = [root]
      while (pending.length) {
        const id = pending.pop()
        if (visited.has(id)) continue
        visited.add(id); component.push(id)
        adjacency.get(id)?.forEach((next) => pending.push(next))
      }
      if (component.length < 2) return
      const center = component.reduce((sum, id) => {
        const position = positions.get(id)
        return { x: sum.x + position.x, y: sum.y + position.y }
      }, { x: 0, y: 0 })
      center.x /= component.length; center.y /= component.length
      component.forEach((id) => {
        const source = positions.get(id)
        const target = scaled.get(id)
        target.x = center.x + (source.x - center.x) * atomSize.bond
        target.y = center.y + (source.y - center.y) * atomSize.bond
      })
    })
    return scaled
  }

  function drawCanvasBatch(batch, positions, visualState) {
    if (!reactionContext) return
    const {
      beforeOpacity,
      afterOpacity,
      local,
      phase,
      gasFlow,
      trailPower,
      now,
      stepIndex,
      transform,
      detail = 'context',
      opacity = 1,
      showGas = false,
      showAnnotations = false,
    } = visualState
    const isHero = detail === 'hero'
    const layerOpacity = isHero
      ? (batch.seed.layer === 'far'
          ? batch.seed.opacity * 0.44
          : batch.seed.layer === 'mid'
            ? batch.seed.opacity * 0.74
            : batch.seed.opacity) * opacity
      : opacity
    const migrationFlash = Math.sin(phase.migration * Math.PI)
    const activeRefs = beforeOpacity >= afterOpacity
      ? [...batch.beforeRefs, ...batch.beforeAssociationRefs]
      : [...batch.afterRefs, ...batch.afterAssociationRefs]
    const drawPositions = scaleBondedPositions(positions, activeRefs)

    reactionContext.save()
    reactionContext.translate(transform.x, transform.y)
    reactionContext.translate(batch.seed.x, batch.seed.y)
    reactionContext.rotate(transform.rotation)
    reactionContext.scale(transform.scale || 1, transform.scale || 1)
    reactionContext.translate(-batch.seed.x, -batch.seed.y)

    drawCanvasMeasurementCell(batch, layerOpacity, detail, phase)

    if (isHero) {
      batch.transitionPaths.forEach((trail, index) => {
        const trailOpacity = migrationFlash * trailPower * (0.56 + (index % 2) * 0.16) * layerOpacity
        drawCanvasTransitionTrail(trail, phase.migration, trailOpacity, 1 - phase.migration * 1.7 - index * 0.07)
      })
      batch.pulses.forEach((pulse) => {
        const pulseValue = smoothstep(pulse.start, pulse.end, local)
        const pulseOpacity = Math.sin(pulseValue * Math.PI) * (0.52 + visualState.heat * 0.22) * layerOpacity
        drawCanvasPulse(pulse, pulseValue, pulseOpacity)
      })
      if (showGas) {
        const gasTrailOpacity = smoothstep(0.06, 0.48, phase.release)
          * (0.48 + gasFlow * 0.52)
          * layerOpacity
        drawCanvasGasTrail(batch.gasTrail, phase.release, gasTrailOpacity, 1 - phase.release * 1.9 - now * 0.00016)
      }
    }

    batch.beforeAssociationRefs.forEach((ref) => drawCanvasAssociation(ref, drawPositions, beforeOpacity * 0.62 * layerOpacity, phase.breakage, detail))
    batch.afterAssociationRefs.forEach((ref) => drawCanvasAssociation(ref, drawPositions, afterOpacity * 0.62 * layerOpacity, 1 - phase.formation, detail))
    batch.beforeRefs.forEach((ref) => drawCanvasBond(ref, drawPositions, beforeOpacity * layerOpacity, detail))
    batch.afterRefs.forEach((ref) => drawCanvasBond(ref, drawPositions, afterOpacity * layerOpacity, detail))
    Array.from(drawPositions.values())
      .sort((first, second) => first.y - second.y)
      .forEach((position) => drawCanvasAtom(position, layerOpacity, detail))
    if (isHero && showGas && stepIndex === 3) {
      drawCanvasOxygenSource(batch, phase, gasFlow, layerOpacity, now)
    }
    if (isHero && showAnnotations) drawCanvasHeroAnnotations(batch, phase, layerOpacity)
    reactionContext.restore()
  }

  function prefixItems(items, batchIndex) {
    return items.map((item) => ({
      ...item,
      a: 'b' + batchIndex + '-' + item.a,
      b: 'b' + batchIndex + '-' + item.b,
    }))
  }

  function motionProfile(atomId) {
    const hash = hashString(atomId)
    return {
      phaseX: ((hash % 360) * Math.PI) / 180,
      phaseY: ((((hash >>> 5) % 360) * Math.PI) / 180) + 0.7,
      phaseZ: ((((hash >>> 11) % 360) * Math.PI) / 180) + 1.2,
      frequencyX: 0.00125 + (hash % 17) * 0.000055,
      frequencyY: 0.00145 + ((hash >>> 7) % 19) * 0.00005,
      amplitudeX: 0.72 + ((hash >>> 12) % 12) / 10,
      amplitudeY: 0.68 + ((hash >>> 18) % 13) / 10,
    }
  }

  function createInitialPositions(seed, batchIndex) {
    const positions = []
    const unitOffset = 19 * seed.depth
    const createUnit = (center, ids, oxygenOffset, unitIndex) => {
      const oxygenRadius = 18.5 * seed.depth
      const oxygen = [
        [0, -oxygenRadius],
        [oxygenRadius, 0],
        [0, oxygenRadius],
        [-oxygenRadius, 0],
      ]
      // K⁺ 与 [MnO₄]⁻ 同处固体离子结构中，不把它画成游离原子或共价键。
      const kPoint = rotatePoint(20 * center.kSide * seed.depth, 5 * seed.depth, center.rotation)
      const push = (id, elementName, x, y) => {
        const atomId = 'b' + batchIndex + '-' + id
        positions.push({
          id: atomId,
          el: elementName,
          x,
          y,
          scale: seed.depth,
          unitIndex,
          motion: motionProfile(atomId),
        })
      }
      push(ids.k, 'K', center.x + kPoint.x, center.y + kPoint.y)
      push(ids.mn, 'Mn', center.x, center.y)
      oxygen.forEach(([x, y], oxygenIndex) => {
        const point = rotatePoint(x, y, center.rotation)
        push('o' + (oxygenOffset + oxygenIndex), 'O', center.x + point.x, center.y + point.y)
      })
    }

    createUnit(
      { x: seed.x - unitOffset, y: seed.y - 5 * seed.depth, rotation: seed.rotation - 0.08, kSide: -1 },
      { k: 'k1', mn: 'mn1' },
      1,
      0,
    )
    createUnit(
      { x: seed.x + unitOffset, y: seed.y + 5 * seed.depth, rotation: seed.rotation + 0.1, kSide: 1 },
      { k: 'k2', mn: 'mn2' },
      5,
      1,
    )
    return positions
  }

  function createFinalPositions(seed, batchIndex) {
    const depth = seed.depth
    // 2KMnO₄(s) → K₂MnO₄(s) + MnO₂(s) + O₂(g)：
    // 两个 K⁺ 靠近 [MnO₄]²⁻，MnO₂ 保持 O—Mn—O 单元，O₂ 单独离开固体区。
    const manganate = { x: seed.x - 20 * depth, y: seed.y + 9 * depth }
    const dioxide = { x: seed.x + 25 * depth, y: seed.y + 13 * depth }
    const gas = { x: seed.x + 4 * depth, y: seed.y - 30 * depth }
    const manganateOffsets = {
      k1: [-18, 15],
      k2: [18, 15],
      mn1: [0, 0],
      o1: [0, -17],
      o2: [17, 0],
      o3: [0, 17],
      o4: [-17, 0],
    }
    const result = []
    Object.entries(manganateOffsets).forEach(([id, [x, y]]) => {
      result.push({
        id: 'b' + batchIndex + '-' + id,
        el: id.startsWith('k') ? 'K' : id.startsWith('mn') ? 'Mn' : 'O',
        x: manganate.x + x * depth,
        y: manganate.y + y * depth,
        scale: depth,
      })
    })
    result.push(
      { id: 'b' + batchIndex + '-mn2', el: 'Mn', x: dioxide.x, y: dioxide.y, scale: depth },
      { id: 'b' + batchIndex + '-o5', el: 'O', x: dioxide.x - 13 * depth, y: dioxide.y, scale: depth },
      { id: 'b' + batchIndex + '-o6', el: 'O', x: dioxide.x + 13 * depth, y: dioxide.y, scale: depth },
      { id: 'b' + batchIndex + '-o7', el: 'O', x: gas.x - 8.5 * depth, y: gas.y, scale: depth },
      { id: 'b' + batchIndex + '-o8', el: 'O', x: gas.x + 8.5 * depth, y: gas.y, scale: depth },
    )
    return { atoms: result, gas }
  }

  function createTrajectory(initial, final) {
    const hash = hashString(initial.id + '-trajectory')
    const direction = hash % 2 === 0 ? 1 : -1
    const bendA = 9 + (hash % 14)
    const bendB = 7 + ((hash >>> 8) % 12)
    return {
      from: initial,
      controlA: {
        x: lerp(initial.x, final.x, 0.31) + direction * bendA,
        y: lerp(initial.y, final.y, 0.31) - 10 - ((hash >>> 4) % 12),
      },
      controlB: {
        x: lerp(initial.x, final.x, 0.69) - direction * bendB,
        y: lerp(initial.y, final.y, 0.69) + 8 + ((hash >>> 12) % 11),
      },
      to: final,
    }
  }

  const disclosureIconPath = 'm6.5 14.5 5.5-5 5.5 5'
  const enterFullscreenIconPath = 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'
  const exitFullscreenIconPath = 'M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5'

  function setupExperimentOverviewPanel() {
    const topbar = document.querySelector('.topbar')
    const titleBlock = topbar?.querySelector('.title-block')
    const telemetry = topbar?.querySelector('.telemetry')
    if (!topbar || !titleBlock || !telemetry) return null
    // 主场景会在每帧更新数值；容器不能作为 live region，否则读屏器会持续播报。
    telemetry.setAttribute('aria-live', 'off')

    const overview = makeElement('aside', 'experiment-overview-panel')
    overview.setAttribute('aria-label', '实时实验状态与操作提示')
    if (!app.id) app.id = 'oxygen-experiment-app'

    const content = makeElement('div', 'experiment-overview-panel__content')
    content.id = 'oxygen-experiment-overview-content'
    content.append(telemetry)

    const dashboard = makeElement('div', 'experiment-overview-dashboard')
    const checklistSection = makeElement('section', 'overview-section')
    checklistSection.appendChild(makeElement('h3', 'overview-section__title', '装置检查'))
    const checklist = makeElement('ul', 'overview-checklist')
    const checklistItems = [
      ['装置连接紧密', 0],
      ['试管口略向下', 0],
      ['集气瓶装满水并倒置', 0],
      ['导管已伸入水下', 0],
      ['先排尽装置内空气', 3],
    ].map(([label, threshold]) => {
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
    overviewToggle.setAttribute('aria-label', '收起实时实验状态看板')
    overviewToggle.title = '收起实时实验状态看板'
    // 标题和折叠操作属于同一行：避免用绝对定位为按钮预留整条空白区域。
    const overviewHeader = makeElement('div', 'experiment-overview-panel__header')
    const panelKicker = telemetry.querySelector('.panel-kicker')
    panelKicker?.before(overviewHeader)
    overviewHeader.append(panelKicker, overviewToggle)

    const heading = makeElement('div', 'title-heading')
    const title = titleBlock.querySelector('h1')
    title?.before(heading)
    title && heading.append(title)

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
      observation.textContent = [
        '装置已连接，集气瓶装满水并倒置。',
        '高锰酸钾受热，固体颗粒热运动增强。',
        '导管口持续冒泡，先排出装置内空气。',
        '氧气沿导管进入集气瓶，水面逐渐下降。',
        '先将导管移出水面，再停止加热。',
      ][stepIndex]
    }

    overviewToggle.addEventListener('click', () => applyOverviewState(!overviewExpanded, true))

    function syncOverviewPosition() {
      const titleRect = titleBlock.getBoundingClientRect()
      overview.style.setProperty('--overview-top', Math.ceil(titleRect.bottom + 14) + 'px')
    }

    window.addEventListener('resize', syncOverviewPosition)
    if ('ResizeObserver' in window) new ResizeObserver(syncOverviewPosition).observe(titleBlock)

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

    syncOverviewPosition()
    updateOverviewStep(0)
    applyOverviewState(true)
    syncFullscreenState()
    return { panel: overview, content, fullscreenButton, updateOverviewStep, announce }
  }

  const overviewPanel = setupExperimentOverviewPanel()

  const panel = makeElement('aside', 'chemical-bond-panel')
  panel.dataset.stage = '0'
  panel.setAttribute('aria-label', '高锰酸钾受热分解的高密度微观结构变化')

  const head = makeElement('header', 'bond-panel__head')
  const kicker = makeElement('p', 'bond-panel__kicker', '微观反应示意')
  const titleRow = makeElement('div', 'bond-panel__title-row')
  const title = makeElement('h2', 'bond-panel__title', '微观结构变化')
  const stateBadge = makeElement('span', 'bond-panel__state', '装置检查')
  const subtitle = makeElement('p', 'bond-panel__subtitle', '3 组重点反应模型 · 6 组原子守恒验证')
  const current = makeElement('p', 'bond-panel__current', stepDefinitions[0].copy)
  const toolRow = makeElement('div', 'bond-panel__tools')
  const followButton = makeElement('button', 'bond-panel__follow', '跟随实验')
  const compactButton = makeElement('button', 'bond-panel__compact-toggle')
  followButton.type = 'button'
  followButton.hidden = true
  compactButton.type = 'button'
  setIconButtonContent(compactButton, disclosureIconPath, '收起')
  compactButton.setAttribute('aria-expanded', 'false')
  compactButton.setAttribute('aria-controls', 'oxygen-reaction-panel-content')
  compactButton.setAttribute('aria-label', '展开微观结构变化面板')
  compactButton.title = '展开微观结构变化面板'
  toolRow.append(followButton, compactButton)
  titleRow.append(title, stateBadge)
  head.append(kicker, titleRow, subtitle, current, toolRow)

  const body = makeElement('div', 'bond-panel__body')
  body.id = 'oxygen-reaction-pool-body'
  const pool = makeElement('figure', 'reaction-pool')
  pool.setAttribute('role', 'img')
  pool.setAttribute('aria-label', '三组高锰酸钾主反应单元，以及六组反应模型在热运动、结构重排和氧气逸出过程中的守恒示意')
  reactionCanvas.className = 'reaction-pool__canvas'
  reactionCanvas.setAttribute('aria-hidden', 'true')
  const liveMark = makeElement('span', 'reaction-pool__live', '动态演示 · 6 组 · 72 原子')
  const fieldLabel = makeElement('span', 'reaction-pool__field-label', stepDefinitions[0].field)

  function createBatch(seed, batchIndex) {
    const initial = createInitialPositions(seed, batchIndex)
    const finalResult = createFinalPositions(seed, batchIndex)
    const finalMap = new Map(finalResult.atoms.map((atom) => [atom.id, atom]))
    const trajectories = new Map(initial.map((atom) => [
      atom.id,
      createTrajectory(atom, finalMap.get(atom.id)),
    ]))

    const beforeRefs = prefixItems(beforeBonds, batchIndex)
    const afterRefs = prefixItems(afterBonds, batchIndex)
    const beforeAssociationRefs = prefixItems(beforeAssociations, batchIndex)
    const afterAssociationRefs = prefixItems(afterAssociations, batchIndex)
    // 只保留 O₂ 产物形成所需的两条局部能量导向，不把所有原子画成游离迁移。
    const transitionPaths = ['o7', 'o8']
      .map((atomId) => trajectories.get('b' + batchIndex + '-' + atomId))
      .filter(Boolean)

    const gasDock = seed.gasDock ?? gasDocks[seed.lane]
    const gasHash = hashString('gas-' + batchIndex)
    const gasPath = {
      from: finalResult.gas,
      controlA: {
        x: finalResult.gas.x - 18 - (gasHash % 12),
        y: finalResult.gas.y - 72,
      },
      controlB: {
        x: gasDock.x + 18 + ((gasHash >>> 7) % 18),
        y: gasDock.y + 58,
      },
      to: gasDock,
    }
    const gasTrail = gasPath
    const pulses = [
      { x: seed.x - 19 * seed.depth, y: seed.y - 5 * seed.depth, depth: seed.depth, start: 0.06, end: 0.5 },
      { x: seed.x + 19 * seed.depth, y: seed.y + 5 * seed.depth, depth: seed.depth, start: 0.36, end: 0.86 },
    ]
    const currentPositions = new Map(initial.map((atom) => [atom.id, {
      x: atom.x,
      y: atom.y,
      scale: atom.scale,
      opacity: 1,
    }]))

    return {
      seed,
      batchIndex,
      initial,
      trajectories,
      beforeRefs,
      afterRefs,
      beforeAssociationRefs,
      afterAssociationRefs,
      transitionPaths,
      gasPath,
      gasTrail,
      pulses,
      currentPositions,
    }
  }

  const batches = batchSeeds.map(createBatch)
  const heroBatches = HERO_UNITS.map((hero, index) => createBatch({
    x: hero.x,
    y: hero.y,
    depth: 1.15,
    opacity: 1,
    delay: 0.12 + index * 0.04,
    duration: 0.62,
    lane: index,
    layer: 'front',
    rotation: 0,
    // drawCanvasBatch 会围绕主单元中心缩放，终点需反算回原始坐标。
    gasDock: {
      x: hero.x + (hero.gasLane - hero.x) / hero.scale,
      y: hero.y + (48 - hero.y) / hero.scale,
    },
  }, BATCH_COUNT + index))
  pool.append(reactionCanvas, liveMark, fieldLabel)
  body.appendChild(pool)

  const footer = makeElement('footer', 'bond-panel__footer')
  const stepRail = makeElement('nav', 'reaction-steps')
  stepRail.setAttribute('aria-label', '预览微观反应步骤')
  const stepButtons = stepDefinitions.map((definition, index) => {
    const button = makeElement('button', 'reaction-step', definition.title)
    button.type = 'button'
    button.setAttribute('aria-pressed', 'false')
    button.setAttribute('aria-label', '预览微观步骤：' + definition.title)
    button.addEventListener('click', () => previewStep(index))
    stepRail.appendChild(button)
    return button
  })
  const formula = makeElement('p', 'bond-panel__formula', '2KMnO₄(s)  △  →  K₂MnO₄(s) + MnO₂(s) + O₂(g)↑')
  const meta = makeElement('div', 'bond-panel__meta')
  const legend = makeElement('div', 'atom-legend')
  legend.append(
    makeElement('span', 'atom-key atom-key--k', 'K⁺'),
    makeElement('span', 'atom-key atom-key--mn', 'Mn'),
    makeElement('span', 'atom-key atom-key--o', 'O'),
  )
  const replayButton = makeElement('button', 'bond-panel__replay', '重播反应波')
  replayButton.type = 'button'
  meta.append(legend, replayButton)
  footer.append(stepRail, formula, meta)

  const liveDescription = makeElement('p', 'bond-panel__sr')
  liveDescription.setAttribute('aria-live', 'polite')
  const reactionContent = makeElement('div', 'bond-panel__content')
  reactionContent.id = 'oxygen-reaction-panel-content'
  reactionContent.append(body, footer)
  panel.append(head, reactionContent, liveDescription)
  app.appendChild(panel)
  syncCanvasSize()
  if ('ResizeObserver' in window) new ResizeObserver(syncCanvasSize).observe(pool)
  else window.addEventListener('resize', syncCanvasSize)

  let rightDesktopExpanded = true
  let rightCompactExpanded = false
  let previewStepIndex = null
  let lastMainStep = clamp(Number(state.step) || 0, 0, 4)
  let lastSelectedStep = lastMainStep
  let displayedProgress = stepDefinitions[lastMainStep].progress
  let displayedHeat = stepDefinitions[lastMainStep].heat
  let displayedGas = stepDefinitions[lastMainStep].gas
  let displayedTrail = stepDefinitions[lastMainStep].trail
  let replayStart = 0
  let replayFrom = displayedProgress
  let replayTo = displayedProgress
  let pointerX = 0
  let pointerY = 0
  let pointerTargetX = 0
  let pointerTargetY = 0
  let lastFrame = 0
  let lastRenderAt = 0
  let lastStaticKey = ''
  let lastCopyKey = ''
  let frameHandle = 0
  let running = false

  function phaseForBatch(progress, batch) {
    const { delay = 0, duration = 0.24 } = batch.seed
    return easeInOut(clamp((progress - delay) / duration, 0, 1))
  }

  function phaseBreakdown(localProgress) {
    return {
      approach: smoothstep(0, 0.18, localProgress),
      breakage: smoothstep(0.16, 0.38, localProgress),
      migration: smoothstep(0.25, 0.68, localProgress),
      formation: smoothstep(0.5, 0.82, localProgress),
      release: smoothstep(0.68, 1, localProgress),
    }
  }

  function targetValuesForStep(stepIndex, previewing) {
    const definition = stepDefinitions[stepIndex]
    if (previewing) {
      return {
        progress: definition.progress,
        heat: definition.heat,
        gas: definition.gas,
        trail: definition.trail,
      }
    }
    if (stepIndex === 2) {
      const normalizedReaction = clamp(((state.reactionProgress || 0.28) - 0.28) / 0.72, 0, 1)
      return {
        progress: 0.34 + normalizedReaction * 0.38,
        heat: 1,
        gas: 0.24 + normalizedReaction * 0.26,
        trail: 0.72 + normalizedReaction * 0.22,
      }
    }
    if (stepIndex === 3) {
      const normalizedReaction = clamp(((state.reactionProgress || 0.72) - 0.72) / 0.28, 0, 1)
      const collection = clamp(state.collectProgress || 0, 0, 1)
      const activity = Math.max(normalizedReaction, collection)
      return {
        progress: 0.54 + activity * 0.44,
        heat: 0.86,
        gas: 0.64 + collection * 0.36,
        trail: 1,
      }
    }
    return {
      progress: definition.progress,
      heat: definition.heat,
      gas: definition.gas,
      trail: definition.trail,
    }
  }

  function setCompactState(open, returnFocus = false, remember = true) {
    if (remember) {
      if (compactViewport.matches) rightCompactExpanded = open
      else rightDesktopExpanded = open
    }
    if (!open && reactionContent.contains(document.activeElement)) compactButton.focus()
    panel.classList.toggle('is-open', open)
    app.classList.toggle('reaction-panel-open', open && compactViewport.matches)
    compactButton.setAttribute('aria-expanded', String(open))
    compactButton.setAttribute('aria-label', open ? '收起微观结构变化面板' : '展开微观结构变化面板')
    compactButton.title = open ? '收起微观结构变化面板' : '展开微观结构变化面板'
    setIconButtonContent(compactButton, disclosureIconPath, open ? '收起' : '展开')
    reactionContent.setAttribute('aria-hidden', String(!open))
    reactionContent.inert = !open
    if (returnFocus) compactButton.focus()
    lastStaticKey = ''
    if (open) {
      lastFrame = 0
      lastRenderAt = 0
      startAnimation()
    } else {
      stopAnimation()
    }
  }

  function startReplay(stepIndex) {
    const definition = stepDefinitions[stepIndex]
    replayTo = definition.progress
    replayFrom = stepIndex < 2 ? definition.progress : Math.max(0, definition.progress - 0.48)
    displayedProgress = replayFrom
    displayedHeat = definition.heat
    displayedGas = stepIndex < 2 ? definition.gas : 0.08
    displayedTrail = definition.trail
    replayStart = performance.now()
    lastStaticKey = ''
  }

  function previewStep(index) {
    const target = stepDefinitions[index]
    previewStepIndex = index
    followButton.hidden = false
    if (target.progress < displayedProgress) {
      replayStart = 0
      displayedProgress = target.progress
      displayedHeat = target.heat
      displayedGas = target.gas
      displayedTrail = target.trail
    } else {
      startReplay(index)
    }
  }

  function followExperiment() {
    previewStepIndex = null
    replayStart = 0
    followButton.hidden = true
    const target = targetValuesForStep(lastMainStep, false)
    if (target.progress < displayedProgress) {
      displayedProgress = target.progress
      displayedHeat = target.heat
      displayedGas = target.gas
      displayedTrail = target.trail
    }
    lastStaticKey = ''
  }

  function updateSafeBottom() {
    if (!controls) return
    const rect = controls.getBoundingClientRect()
    const viewportGap = Math.max(0, window.innerHeight - rect.bottom)
    const safeBottom = Math.ceil(rect.height + viewportGap + 14)
    panel.style.setProperty('--bond-safe-bottom', safeBottom + 'px')
    overviewPanel?.panel.style.setProperty('--left-safe-bottom', safeBottom + 'px')
    app.style.setProperty('--controls-safe-bottom', safeBottom + 'px')
  }

  compactButton.addEventListener('click', () => setCompactState(!panel.classList.contains('is-open')))
  followButton.addEventListener('click', followExperiment)
  replayButton.addEventListener('click', () => startReplay(previewStepIndex ?? lastMainStep))
  pool.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches) return
    const rect = pool.getBoundingClientRect()
    pointerTargetX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1)
    pointerTargetY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1)
  })
  pool.addEventListener('pointerleave', () => {
    pointerTargetX = 0
    pointerTargetY = 0
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && compactViewport.matches && panel.classList.contains('is-open')) {
      setCompactState(false, true)
    }
  })
  window.addEventListener('resize', updateSafeBottom)
  if (controls && 'ResizeObserver' in window) new ResizeObserver(updateSafeBottom).observe(controls)
  reducedMotion.addEventListener?.('change', () => {
    lastStaticKey = ''
    pointerTargetX = 0
    pointerTargetY = 0
  })
  compactViewport.addEventListener?.('change', (event) => {
    setCompactState(event.matches ? rightCompactExpanded : rightDesktopExpanded, false, false)
  })

  function updateCopy(stepIndex, isPreviewing) {
    const definition = stepDefinitions[stepIndex]
    const key = stepIndex + '-' + isPreviewing
    if (key === lastCopyKey) return
    lastCopyKey = key
    panel.dataset.stage = String(stepIndex)
    stateBadge.textContent = definition.title
    current.textContent = definition.copy
    overviewPanel?.updateOverviewStep(stepIndex)
    fieldLabel.textContent = definition.field
    followButton.hidden = !isPreviewing
    stepButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stepIndex)))
    liveDescription.setAttribute('aria-live', isPreviewing ? 'polite' : 'off')
    liveDescription.textContent = isPreviewing
      ? '正在预览：' + definition.title + '。' + definition.copy + '六组反应模型、共七十二个原子全程守恒。'
      : ''
  }

  function announceExperimentStage(stepIndex) {
    const definition = stepDefinitions[stepIndex]
    const message = '实验进入' + definition.title + '。' + definition.copy
    if (overviewPanel?.announce) {
      overviewPanel.announce(message)
      return
    }
    liveDescription.setAttribute('aria-live', 'polite')
    liveDescription.textContent = message
  }

  function advanceBatch(batch, progress, heat, gasFlow, trailPower, now, stepIndex, releaseGas = false) {
    const local = phaseForBatch(progress, batch)
    const phase = phaseBreakdown(local)
    const targetPositions = new Map()
    const positions = new Map()
    // 固体中的原子是热振动而非四散游离；用低幅振动保留键合单元的稳定感。
    const baseVibration = stepIndex === 4
      ? 0.1
      : 0.32 + heat * 0.68 + Math.sin(local * Math.PI) * 0.22

    batch.initial.forEach((initialAtom) => {
      const trajectory = batch.trajectories.get(initialAtom.id)
      // 不展示“单个原子沿曲线飞行”的虚构中间体；固体结构在局部区域内紧凑重排。
      const rearrangement = smoothstep(0.36, 0.7, phase.migration)
      const migrated = {
        x: lerp(trajectory.from.x, trajectory.to.x, rearrangement),
        y: lerp(trajectory.from.y, trajectory.to.y, rearrangement),
      }
      const profile = initialAtom.motion
      const vibration = reducedMotion.matches ? 0 : baseVibration
      const wobbleX = Math.sin(now * profile.frequencyX + profile.phaseX)
        * profile.amplitudeX * vibration
        + Math.sin(now * profile.frequencyY * 0.55 + profile.phaseZ) * vibration * 0.22
      const wobbleY = Math.cos(now * profile.frequencyY + profile.phaseY)
        * profile.amplitudeY * vibration
        + Math.sin(now * profile.frequencyX * 0.62 + profile.phaseZ) * vibration * 0.19
      const visualPulse = reducedMotion.matches
        ? 1
        : 1 + Math.sin(now * 0.0012 + profile.phaseX * 4 + batch.batchIndex) * (0.012 + heat * 0.032)
      targetPositions.set(initialAtom.id, {
        el: initialAtom.el,
        x: migrated.x + wobbleX,
        y: migrated.y + wobbleY,
        scale: lerp(initialAtom.scale, trajectory.to.scale, phase.migration) * visualPulse,
        opacity: 1,
      })
    })

    if (releaseGas && phase.release > 0) {
      const gasTravel = phase.release
      const gasCenter = cubicPoint(
        batch.gasPath.from,
        batch.gasPath.controlA,
        batch.gasPath.controlB,
        batch.gasPath.to,
        gasTravel,
      )
      const dockDrift = reducedMotion.matches ? 0 : gasTravel * gasTravel
      gasCenter.x += Math.sin(now * 0.0011 + batch.batchIndex * 1.41) * 3.6 * dockDrift
      gasCenter.y += Math.cos(now * 0.0009 + batch.batchIndex * 0.93) * 2.4 * dockDrift
      const turns = 0.62 + batch.batchIndex * 0.073
      const angle = batch.seed.rotation + gasTravel * turns * Math.PI * 2
        + (reducedMotion.matches ? 0 : Math.sin(now * 0.0013 + batch.batchIndex) * 0.08 * gasTravel)
      const halfDistance = lerp(8.5 * batch.seed.depth, 6.8, gasTravel) * atomSize.bond
      const collectionScale = stepIndex === 3 ? 0.94 : 0.76
      const collectionOpacity = stepIndex === 3 ? 0.98 : 0.82
      const gasScale = lerp(batch.seed.depth, collectionScale, gasTravel)
      const gasOpacity = lerp(1, collectionOpacity, gasTravel)
      const oxygenA = targetPositions.get('b' + batch.batchIndex + '-o7')
      const oxygenB = targetPositions.get('b' + batch.batchIndex + '-o8')
      oxygenA.x = gasCenter.x - Math.cos(angle) * halfDistance
      oxygenA.y = gasCenter.y - Math.sin(angle) * halfDistance
      oxygenA.scale = gasScale
      oxygenA.opacity = gasOpacity
      oxygenB.x = gasCenter.x + Math.cos(angle) * halfDistance
      oxygenB.y = gasCenter.y + Math.sin(angle) * halfDistance
      oxygenB.scale = gasScale
      oxygenB.opacity = gasOpacity
    }

    // 采用 Water Lab 的阻尼追随：化学结构并非瞬移，而是缓慢向反应目标重排。
    const followRate = reducedMotion.matches ? 1 : 0.075 + heat * 0.1 + phase.migration * 0.075
    targetPositions.forEach((target, atomId) => {
      const current = batch.currentPositions.get(atomId)
      current.x = lerp(current.x, target.x, followRate)
      current.y = lerp(current.y, target.y, followRate)
      current.scale = lerp(current.scale, target.scale, followRate)
      current.opacity = lerp(current.opacity, target.opacity, followRate)
      current.el = target.el
      positions.set(atomId, current)
    })

    const beforeOpacity = 1 - phase.breakage
    const afterOpacity = phase.formation
    const parallaxStrength = batch.seed.layer === 'far' ? 3.5 : batch.seed.layer === 'mid' ? 7.5 : 11.5
    const slowDriftX = reducedMotion.matches
      ? 0
      : Math.sin(now * 0.00028 + batch.batchIndex * 1.34) * (1.2 + batch.seed.depth)
    const slowDriftY = reducedMotion.matches
      ? 0
      : Math.cos(now * 0.00024 + batch.batchIndex * 0.91) * (0.8 + batch.seed.depth * 0.7)
    const groupRotation = reducedMotion.matches
      ? 0
      : Math.sin(now * 0.00048 + batch.batchIndex * 1.17)
        * (1.35 + heat * 3.7)
        * (1 - phase.release * 0.62)
    return {
      batch,
      positions,
      visualState: {
        beforeOpacity,
        afterOpacity,
        local,
        phase,
        gasFlow,
        trailPower,
        heat,
        now,
        stepIndex,
        transform: {
          x: pointerX * parallaxStrength + slowDriftX,
          y: pointerY * parallaxStrength * 0.7 + slowDriftY,
          rotation: groupRotation * Math.PI / 180,
        },
      },
    }
  }

  function drawBatchSnapshot(snapshot, anchor, options) {
    const { batch, positions, visualState } = snapshot
    drawCanvasBatch(batch, positions, {
      ...visualState,
      detail: options.detail,
      opacity: options.opacity,
      showGas: Boolean(options.showGas),
      showAnnotations: Boolean(options.showAnnotations),
      transform: {
        x: anchor.x - batch.seed.x + (options.parallax ? visualState.transform.x : 0),
        y: anchor.y - batch.seed.y + (options.parallax ? visualState.transform.y : 0),
        rotation: options.rotation ?? visualState.transform.rotation,
        scale: options.scale ?? 1,
      },
    })
  }

  function renderField(stepIndex, progress, heat, gasFlow, trailPower, now) {
    if (!prepareCanvasFrame()) return
    drawCanvasEnvironment(stepIndex, progress, heat, gasFlow, now)
    // “排出空气”先展示装置内原有空气被顶出，避免把 KMnO₄ 的分解提前到该教学阶段。
    const preservePermanganate = stepIndex === 2
    const structureProgress = preservePermanganate ? 0 : progress
    batches.forEach((batch, index) => {
      const row = Math.floor(index / 3)
      const column = index % 3
      const snapshot = advanceBatch(batch, structureProgress, heat, gasFlow, trailPower, now, stepIndex)
      const visualDepth = 0.82 + row * 0.025 + (column === 1 ? 0.008 : 0)
      drawBatchSnapshot(snapshot, CONTEXT_CENTERS[index], {
        detail: 'context',
        opacity: 0.94,
        // 抵消旧种子中的随机深度，保持 3×2 阵列稳定，只留下极轻微的行间层次。
        scale: visualDepth / batch.seed.depth,
        parallax: false,
        rotation: 0,
      })
    })
    heroBatches.forEach((heroBatch, index) => {
      const hero = HERO_UNITS[index]
      const heroSnapshot = advanceBatch(
        heroBatch,
        structureProgress,
        heat,
        gasFlow,
        trailPower,
        now,
        stepIndex,
        !preservePermanganate,
      )
      drawBatchSnapshot(heroSnapshot, hero, {
        detail: 'hero',
        opacity: 1,
        scale: hero.scale,
        showGas: !preservePermanganate,
        showAnnotations: index === 1,
        parallax: true,
        rotation: 0,
      })
    })
  }

  function animationFrame(now) {
    if (!running || document.hidden || !panel.classList.contains('is-open')) {
      running = false
      frameHandle = 0
      lastFrame = 0
      lastRenderAt = 0
      return
    }
    frameHandle = requestAnimationFrame(animationFrame)
    if (now - lastRenderAt < 32) return
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0.033
    lastFrame = now
    lastRenderAt = now

    const mainStep = clamp(Number(state.step) || 0, 0, 4)
    if (mainStep !== lastMainStep) {
      if (previewStepIndex === null && mainStep < lastMainStep) {
        const snapTarget = targetValuesForStep(mainStep, false)
        displayedProgress = snapTarget.progress
        displayedHeat = snapTarget.heat
        displayedGas = snapTarget.gas
        displayedTrail = snapTarget.trail
        replayStart = 0
      }
      lastMainStep = mainStep
      announceExperimentStage(mainStep)
    }

    const selectedStep = previewStepIndex ?? mainStep
    const previewing = previewStepIndex !== null
    if (selectedStep !== lastSelectedStep) {
      const snapTarget = targetValuesForStep(selectedStep, previewing)
      if (snapTarget.progress < displayedProgress) {
        displayedProgress = snapTarget.progress
        displayedHeat = snapTarget.heat
        displayedGas = snapTarget.gas
        displayedTrail = snapTarget.trail
        replayStart = 0
      }
      lastSelectedStep = selectedStep
    }

    let target = targetValuesForStep(selectedStep, previewing)
    if (replayStart > 0) {
      const replayAmount = clamp((now - replayStart) / 2300, 0, 1)
      const easedReplay = easeInOut(replayAmount)
      target = {
        ...target,
        progress: lerp(replayFrom, replayTo, easedReplay),
        gas: target.gas * smoothstep(0.16, 0.84, replayAmount),
        trail: Math.max(target.trail, Math.sin(replayAmount * Math.PI)),
      }
      if (replayAmount >= 1) replayStart = 0
    }

    if (reducedMotion.matches) {
      displayedProgress = target.progress
      displayedHeat = target.heat
      displayedGas = target.gas
      displayedTrail = target.trail
    } else {
      const response = 1 - Math.exp(-delta * 3.35)
      displayedProgress = lerp(displayedProgress, target.progress, response)
      displayedHeat = lerp(displayedHeat, target.heat, response * 1.15)
      displayedGas = lerp(displayedGas, target.gas, response)
      displayedTrail = lerp(displayedTrail, target.trail, response)
      pointerX = lerp(pointerX, pointerTargetX, 1 - Math.exp(-delta * 5.8))
      pointerY = lerp(pointerY, pointerTargetY, 1 - Math.exp(-delta * 5.8))
    }

    updateCopy(selectedStep, previewing)
    const staticKey = [
      selectedStep,
      displayedProgress.toFixed(3),
      displayedHeat.toFixed(3),
      displayedGas.toFixed(3),
      displayedTrail.toFixed(3),
    ].join('-')
    if (!reducedMotion.matches || staticKey !== lastStaticKey) {
      renderField(
        selectedStep,
        displayedProgress,
        displayedHeat,
        displayedGas,
        displayedTrail,
        now,
      )
      lastStaticKey = staticKey
    }
  }

  function startAnimation() {
    if (running || document.hidden || !panel.classList.contains('is-open')) return
    running = true
    frameHandle = requestAnimationFrame(animationFrame)
  }

  function stopAnimation() {
    if (frameHandle) cancelAnimationFrame(frameHandle)
    frameHandle = 0
    running = false
    lastFrame = 0
    lastRenderAt = 0
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation()
    else if (panel.classList.contains('is-open')) {
      lastFrame = 0
      lastRenderAt = 0
      startAnimation()
    }
  })

  window.addEventListener('b-zone:micro-tuning', (event) => {
    atomSize = {
      hero: Number(event.detail?.hero) || 1,
      batch: Number(event.detail?.batch) || 1,
      symbol: Number(event.detail?.symbol) || 1,
      bond: Number(event.detail?.bond) || 1,
    }
    lastStaticKey = ''
    renderField(
      previewStepIndex ?? lastMainStep,
      displayedProgress,
      displayedHeat,
      displayedGas,
      displayedTrail,
      performance.now(),
    )
    startAnimation()
  })

  updateSafeBottom()
  setCompactState(compactViewport.matches ? rightCompactExpanded : rightDesktopExpanded, false, false)
  updateCopy(lastMainStep, false)
  renderField(
    lastMainStep,
    displayedProgress,
    displayedHeat,
    displayedGas,
    displayedTrail,
    performance.now(),
  )
  startAnimation()
})()
