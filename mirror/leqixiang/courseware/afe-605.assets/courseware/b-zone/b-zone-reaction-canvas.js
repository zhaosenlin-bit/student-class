/**
 * [INPUT]: 课程 config.micro 中的稳定原子 ID、键、阶段与课程专属 Canvas 文案。
 * [OUTPUT]: 对齐「氧气制取」的二维微观教学场：主反应单元 + 精简守恒/证据区。
 * [POS]: B 区氧气性质、燃烧条件、灭火原理共享的 Canvas 2D 绘制骨架；
 *        化学对象与阶段数据仍由每课自己声明。
 */

(() => {
  'use strict'

  const COLORS = {
    O: ['#f27d70', '#cf3f38'], N: ['#5f8ed8', '#28539c'], C: ['#74706d', '#3f3c3a'],
    S: ['#f0c759', '#bc8b19'], Fe: ['#d39a68', '#98623b'], P: ['#e6a24a', '#b66d20'],
  }
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
  const ease = (value) => { const t = clamp(value); return t * t * (3 - 2 * t) }
  const mix = (a, b, t) => a + (b - a) * t

  function compileStage(stage = {}) {
    const atoms = new Map()
    ;(stage.atoms || []).forEach(([id, element, x, y, z, options]) => {
      atoms.set(id, { id, element, x, y, z: z || 0, opacity: options?.o ?? 1 })
    })
    return { atoms, bonds: stage.bonds || [], paths: stage.paths || [], shapes: stage.shapes || [], conserve: stage.conserve || '' }
  }

  function mount(host, micro, panelStages = []) {
    const canvas = document.createElement('canvas')
    canvas.className = 'reaction-pool__canvas b-zone-reaction-canvas'
    canvas.dataset.renderer = 'canvas-2d'
    canvas.setAttribute('aria-hidden', 'true')
    host.prepend(canvas)
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return { ok: false, setStage() {}, setContext() {}, pause() {}, resume() {}, dispose() {} }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contexts = micro.contexts || { default: { stages: micro.stages || [] } }
    let contextKey = micro.defaultContext || Object.keys(contexts)[0]
    let stages = (contexts[contextKey]?.stages || []).map(compileStage)
    let stageIndex = 0
    let fromStage = stages[0] || compileStage()
    let targetStage = fromStage
    let transitionAt = performance.now()
    let width = 1
    let height = 1
    let dpr = 1
    let raf = 0
    let running = true
    let needsDraw = true
    const configuredAtomSize = micro.canvas?.atomSize || {}
    let atomSize = {
      hero: Number(configuredAtomSize.hero) || 1,
      batch: Number(configuredAtomSize.batch) || 1,
      symbol: Number(configuredAtomSize.symbol) || 1,
      bond: Number(micro.canvas?.bondLength) || 1,
    }
    const atomQueue = []

    function resize() {
      const rect = host.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return
      width = rect.width
      height = rect.height
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      requestDraw()
    }

    function roundedRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
    }

    function label(text, x, y, align = 'left', size = 10, color = '#4e6c59', weight = 750) {
      ctx.fillStyle = color
      ctx.font = `${weight} ${size}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`
      ctx.textAlign = align
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(text, x, y)
    }

    function line(x1, y1, x2, y2, color, lineWidth = 1, alpha = 1) {
      ctx.save(); ctx.globalAlpha = alpha
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
    }

    function queueAtom(x, y, element, radius, alpha = 1, showSymbol = true) {
      atomQueue.push({ x, y, element, radius, alpha, showSymbol })
    }

    function flushAtoms() {
      atomQueue.forEach(({ x, y, element, radius, alpha }) => {
        const colors = COLORS[element] || ['#9bad9f', '#66796b']
        ctx.save(); ctx.globalAlpha = alpha
        const gradient = ctx.createRadialGradient(x - radius * .32, y - radius * .35, radius * .08, x, y, radius)
        gradient.addColorStop(0, '#fff'); gradient.addColorStop(.22, colors[0]); gradient.addColorStop(1, colors[1])
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(37,61,48,.28)'; ctx.lineWidth = .65; ctx.stroke(); ctx.restore()
      })
      atomQueue.forEach(({ x, y, radius, alpha }) => {
        ctx.save(); ctx.globalAlpha = alpha * .68; ctx.fillStyle = 'rgba(255,255,255,.82)'
        ctx.beginPath(); ctx.arc(x - radius * .28, y - radius * .3, Math.max(.55, radius * .18), 0, Math.PI * 2); ctx.fill(); ctx.restore()
      })
      atomQueue.forEach(({ x, y, element, radius, alpha, showSymbol }) => {
        if (!showSymbol) return
        const fontSize = Math.max(5.4, radius * .92) * atomSize.symbol
        ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(.65, fontSize * .12)
        ctx.strokeStyle = 'rgba(28,43,35,.58)'; ctx.strokeText(element, x, y + .2)
        ctx.fillStyle = '#fff'; ctx.fillText(element, x, y + .2); ctx.restore()
      })
      atomQueue.length = 0
    }

    function stageMix(now) {
      if (reducedMotion.matches) return 1
      return ease((now - transitionAt) / 760)
    }

    function interpolateAtoms(progress) {
      const ids = new Set([...fromStage.atoms.keys(), ...targetStage.atoms.keys()])
      const atoms = new Map()
      ids.forEach((id) => {
        const from = fromStage.atoms.get(id)
        const to = targetStage.atoms.get(id)
        const start = from || to
        const end = to || from
        atoms.set(id, {
          id, element: end.element,
          x: mix(start.x, end.x, progress), y: mix(start.y, end.y, progress), z: mix(start.z, end.z, progress),
          opacity: mix(from?.opacity ?? 0, to?.opacity ?? 0, progress),
        })
      })
      return atoms
    }

    function boundsFor(atoms) {
      const visible = [...atoms.values()].filter((atom) => atom.opacity > .02)
      if (!visible.length) return { minX: -2, maxX: 2, minY: -2, maxY: 2 }
      return visible.reduce((b, atom) => ({
        minX: Math.min(b.minX, atom.x), maxX: Math.max(b.maxX, atom.x),
        minY: Math.min(b.minY, atom.y), maxY: Math.max(b.maxY, atom.y),
      }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
    }

    function mapper(atoms, rect, padding = 8, zoom = 1) {
      const bounds = boundsFor(atoms)
      const rangeX = Math.max(.8, bounds.maxX - bounds.minX)
      const rangeY = Math.max(.8, bounds.maxY - bounds.minY)
      const scale = Math.min((rect.w - padding * 2) / rangeX, (rect.h - padding * 2) / rangeY) * zoom
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2
      return (x, y) => ({ x: rect.x + rect.w / 2 + (x - cx) * scale, y: rect.y + rect.h / 2 - (y - cy) * scale })
    }

    function drawBondList(bonds, atoms, map, alpha, mini = false) {
      bonds.forEach(([aId, bId, order = 1, kind]) => {
        const a = atoms.get(aId); const b = atoms.get(bId)
        if (!a || !b || a.opacity < .02 || b.opacity < .02) return
        const pa = map(a.x, a.y); const pb = map(b.x, b.y)
        const dx = pb.x - pa.x; const dy = pb.y - pa.y; const length = Math.max(1, Math.hypot(dx, dy))
        const px = -dy / length; const py = dx / length
        const offsets = kind === 'dots' ? [0] : order === 3 ? [-1.5, 0, 1.5] : order === 2 ? [-1, 1] : [0]
        if (kind === 'dots') {
          for (let i = 1; i < 5; i += 1) {
            const f = i / 5; queueAtom(mix(pa.x, pb.x, f), mix(pa.y, pb.y, f), 'C', mini ? .55 : 1.25, alpha * .55, false)
          }
          return
        }
        offsets.forEach((offset) => line(pa.x + px * offset, pa.y + py * offset, pb.x + px * offset, pb.y + py * offset, 'rgba(61,79,69,.58)', mini ? .45 : .85, alpha * Math.min(a.opacity, b.opacity)))
      })
    }

    function drawScene(stage, atoms, rect, progress, mini = false) {
      const baseMap = mapper(atoms, rect, mini ? 2 : 13, mini ? 1 : (micro.canvas?.heroZoom || 1))
      const bondScale = atomSize.bond
      const map = (x, y) => {
        const point = baseMap(x, y)
        return {
          x: rect.x + rect.w / 2 + (point.x - rect.x - rect.w / 2) * bondScale,
          y: rect.y + rect.h / 2 + (point.y - rect.y - rect.h / 2) * bondScale,
        }
      }
      const miniRadius = clamp(Math.min(rect.w, rect.h) * .05, 2.7, 5.2) * (4 / 3) * atomSize.batch
      const heroRadius = clamp(Math.min(rect.w, rect.h) * .055, 6.8, 8.2) * (4 / 3) * atomSize.hero
      if (!mini) {
        stage.shapes.forEach((shape) => {
          const center = map(shape.at[0], shape.at[1])
          ctx.save(); ctx.globalAlpha = shape.o ?? .2; ctx.fillStyle = shape.color || '#75b6cf'
          ctx.beginPath(); ctx.ellipse(center.x, center.y, Math.max(18, shape.size[0] * 24), Math.max(8, shape.size[1] * 15), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
        })
        stage.paths.forEach((path) => {
          const points = (path.pts || []).map(([x, y]) => map(x, y))
          ctx.save(); ctx.strokeStyle = path.color || '#d45647'; ctx.lineWidth = path.style === 'blocked' ? 1.1 : 1.25
          ctx.setLineDash(path.style === 'blocked' ? [3, 4] : [6, 4]); ctx.beginPath()
          points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke(); ctx.restore()
        })
      }
      if (progress < .999) drawBondList(fromStage.bonds, atoms, map, 1 - progress, mini)
      drawBondList(stage.bonds, atoms, map, progress < .999 ? progress : 1, mini)
      atoms.forEach((atom) => {
        if (atom.opacity < .02) return
        const point = map(atom.x, atom.y)
        queueAtom(point.x, point.y, atom.element, mini ? miniRadius : heroRadius, atom.opacity, !mini)
      })
    }

    function heroBottomForLayout() {
      const hasEvidence = Boolean(micro.canvas?.evidenceItems?.length || micro.canvas?.evidenceItemsByStage?.length)
      return hasEvidence
        ? clamp(height * .62, 188, Math.max(188, height - 160))
        : clamp(height * .51, 188, 214)
    }

    function drawHero(now, atoms, progress) {
      const top = 58
      const bottom = heroBottomForLayout()
      const rect = { x: 17, y: top, w: width - 34, h: bottom - top }
      label(micro.canvas?.heroLabel || '原子级主观察区', 17, 49, 'left', 10, '#315a3c', 850)
      label(micro.canvas?.heroMeta || '原子守恒 · 连续重排', width - 17, 49, 'right', 8.5, '#62796a', 760)
      roundedRect(rect.x, rect.y, rect.w, rect.h, 14)
      ctx.fillStyle = 'rgba(255,255,251,.58)'; ctx.fill(); ctx.strokeStyle = 'rgba(75,116,84,.18)'; ctx.lineWidth = 1; ctx.stroke()
      const groups = micro.canvas?.groupLabelsByStage?.[stageIndex] || micro.canvas?.groupLabels || []
      if (groups.length === 2) {
        line(width / 2, top + 8, width / 2, bottom - 8, 'rgba(79,112,87,.14)', .8)
        label(groups[0], 27, top + 17, 'left', 8.5, '#607769', 820)
        label(groups[1], width - 27, top + 17, 'right', 8.5, '#607769', 820)
      }
      const heroPrefixes = micro.canvas?.heroPrefixesByStage?.[stageIndex]
      const heroAtoms = heroPrefixes?.length
        ? new Map([...atoms].filter(([id]) => heroPrefixes.some((prefix) => id.startsWith(prefix))))
        : atoms
      if (micro.canvas?.splitX !== undefined) {
        const splitX = micro.canvas.splitX
        const leftAtoms = new Map([...heroAtoms].filter(([, atom]) => atom.x < splitX))
        const rightAtoms = new Map([...heroAtoms].filter(([, atom]) => atom.x >= splitX))
        const halfWidth = (rect.w - 26) / 2
        drawScene(targetStage, leftAtoms, { x: rect.x + 10, y: rect.y + 23, w: halfWidth, h: rect.h - 30 }, progress)
        flushAtoms()
        drawScene(targetStage, rightAtoms, { x: rect.x + 16 + halfWidth, y: rect.y + 23, w: halfWidth, h: rect.h - 30 }, progress)
      } else {
        drawScene(targetStage, heroAtoms, { x: rect.x + 10, y: rect.y + 23, w: rect.w - 20, h: rect.h - 30 }, progress)
      }
      flushAtoms()
    }

    function drawEvidenceItems(y0) {
      const items = micro.canvas?.evidenceItemsByStage?.[stageIndex] || micro.canvas?.evidenceItems || []
      if (!items.length) return false
      label(micro.canvas?.batchLabel || '条件证据', 17, y0 - 10, 'left', 10, '#315a3c', 850)
      label(panelStages[stageIndex]?.field || '结论映射', width - 17, y0 - 10, 'right', 9, '#607868', 760)
      const gap = 8
      const cellW = (width - 34 - gap * (items.length - 1)) / items.length
      const cellH = Math.max(58, height - y0 - 54)
      items.forEach((item, index) => {
        const text = typeof item === 'string' ? item : item.label
        const state = typeof item === 'string' ? 'neutral' : (item.state || 'neutral')
        const x = 17 + index * (cellW + gap)
        roundedRect(x, y0, cellW, cellH, 13)
        ctx.fillStyle = state === 'off' ? 'rgba(246,235,225,.76)' : state === 'on' ? 'rgba(232,246,233,.82)' : 'rgba(249,252,246,.68)'
        ctx.fill()
        ctx.strokeStyle = state === 'off' ? 'rgba(190,111,69,.28)' : state === 'on' ? 'rgba(82,146,91,.28)' : 'rgba(76,111,82,.17)'
        ctx.lineWidth = .8; ctx.stroke()
        ctx.fillStyle = state === 'off' ? '#c67545' : state === 'on' ? '#5f9a65' : '#8ba18f'
        ctx.beginPath(); ctx.arc(x + cellW / 2, y0 + cellH * .34, 4.5, 0, Math.PI * 2); ctx.fill()
        label(text, x + cellW / 2, y0 + cellH * .62, 'center', 9.5, '#315343', 850)
      })
      return true
    }

    function drawBatches(atoms, progress) {
      const heroBottom = heroBottomForLayout()
      const y0 = heroBottom + 30
      if (drawEvidenceItems(y0)) return
      const batchCount = micro.canvas?.batchCount || 6
      const batchPrefixes = micro.canvas?.batchPrefixesByStage?.[stageIndex]
      const batchAtoms = batchPrefixes?.length
        ? new Map([...atoms].filter(([id]) => batchPrefixes.some((prefix) => id.startsWith(prefix))))
        : atoms
      const cols = micro.canvas?.batchColumns || (batchCount <= 6 ? 3 : 5)
      const rows = Math.ceil(batchCount / cols); const gap = batchCount <= 6 ? 8 : 4
      label(micro.canvas?.batchLabel || `${batchCount} 组原子守恒验证`, 17, y0 - 10, 'left', 10, '#315a3c', 850)
      label(panelStages[stageIndex]?.field || '守恒验证', width - 17, y0 - 10, 'right', 9, '#607868', 760)
      const cellW = (width - 34 - gap * (cols - 1)) / cols
      const available = Math.max(48, height - y0 - 44)
      const cellH = (available - gap * (rows - 1)) / rows
      for (let index = 0; index < batchCount; index += 1) {
        const col = index % cols; const row = Math.floor(index / cols)
        const rect = { x: 17 + col * (cellW + gap), y: y0 + row * (cellH + gap), w: cellW, h: cellH }
        ctx.beginPath(); ctx.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, rect.w * .47, rect.h * .43, 0, 0, Math.PI * 2)
        const plate = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
        plate.addColorStop(0, 'rgba(255,255,250,.76)'); plate.addColorStop(1, 'rgba(219,235,220,.5)')
        ctx.fillStyle = plate; ctx.fill(); ctx.strokeStyle = 'rgba(105,153,121,.28)'; ctx.lineWidth = .8; ctx.stroke()
        drawScene(targetStage, batchAtoms, { x: rect.x + 8, y: rect.y + 7, w: rect.w - 16, h: rect.h - 14 }, progress, true)
        flushAtoms()
      }
    }

    function drawConclusion() {
      ctx.fillStyle = 'rgba(247,250,243,.94)'; ctx.fillRect(8, height - 38, width - 16, 24)
      const text = micro.canvas?.conclusions?.[stageIndex] || micro.canvas?.conclusion || panelStages[stageIndex]?.field || '观察键的断裂、生成与原子守恒'
      label(text, width / 2, height - 20, 'center', 10.5, '#315343', 900)
    }

    function draw(now = performance.now()) {
      raf = 0
      if (!running || width < 4 || height < 4) return
      ctx.clearRect(0, 0, width, height); atomQueue.length = 0
      const progress = stageMix(now)
      const atoms = interpolateAtoms(progress)
      drawHero(now, atoms, progress)
      drawBatches(atoms, progress)
      drawConclusion()
      needsDraw = false
      if (progress < .999) raf = requestAnimationFrame(draw)
      else fromStage = targetStage
    }

    function requestDraw() {
      needsDraw = true
      if (running && !raf) raf = requestAnimationFrame(draw)
    }

    function applyStage(next, instant = false) {
      const index = clamp(Number(next) || 0, 0, Math.max(0, stages.length - 1))
      const nextStage = stages[index]
      if (!nextStage) return
      const currentProgress = stageMix(performance.now())
      if (currentProgress < .999) {
        const currentAtoms = interpolateAtoms(currentProgress)
        fromStage = { ...targetStage, atoms: currentAtoms }
      } else fromStage = targetStage
      stageIndex = index; targetStage = nextStage
      transitionAt = instant || reducedMotion.matches ? performance.now() - 1000 : performance.now()
      requestDraw()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    const onMotionChange = () => applyStage(stageIndex, true)
    const onMicroTuning = (event) => {
      atomSize = {
        hero: Number(event.detail?.hero) || 1,
        batch: Number(event.detail?.batch) || 1,
        symbol: Number(event.detail?.symbol) || 1,
        bond: Number(event.detail?.bond) || 1,
      }
      requestDraw()
    }
    reducedMotion.addEventListener?.('change', onMotionChange)
    window.addEventListener('b-zone:micro-tuning', onMicroTuning)
    resize(); applyStage(0, true)

    return {
      ok: true,
      setStage(next) { if (Number(next) !== stageIndex) applyStage(next) },
      setContext(key) {
        if (!contexts[key] || key === contextKey) return
        contextKey = key; stages = (contexts[key].stages || []).map(compileStage)
        fromStage = stages[clamp(stageIndex, 0, stages.length - 1)] || compileStage()
        targetStage = fromStage; applyStage(stageIndex, true)
      },
      setOrbit() {}, resetCamera() {},
      pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 },
      resume() { if (!running) { running = true; requestDraw() } },
      dispose() {
        running = false; if (raf) cancelAnimationFrame(raf); observer.disconnect()
        reducedMotion.removeEventListener?.('change', onMotionChange)
        window.removeEventListener('b-zone:micro-tuning', onMicroTuning)
        canvas.remove()
      },
    }
  }

  window.BZoneReactionCanvas = { mount }
})()
