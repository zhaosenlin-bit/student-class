/**
 * 空气组成右侧二维教学计量场。
 * 固定复用同一批粒子：3 组主观察单元（每组 4N₂ + 1O₂）和 6 组守恒验证模型。
 */
(() => {
  'use strict'

  const COLORS = { N: '#4f7fce', O: '#dc4b43', P: '#e6a234', ink: '#315343', paper: '#f7faf3' }
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
  const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v) }
  const mix = (a, b, t) => a + (b - a) * t

  function mount(host) {
    const canvas = document.createElement('canvas')
    canvas.className = 'reaction-pool__canvas air-metering-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    host.prepend(canvas)
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return { ok: false }

    let width = 1
    let height = 1
    let dpr = 1
    let stage = 0
    let fromStage = 0
    let transitionAt = performance.now()
    let running = true
    let motion = true
    let raf = 0
    let lastRenderAt = 0
    const configuredAtomSize = window.__B_ZONE_COURSE__?.micro?.canvas?.atomSize || {}
    let atomSize = {
      hero: Number(configuredAtomSize.hero) || 1,
      batch: Number(configuredAtomSize.batch) || 1,
      symbol: Number(configuredAtomSize.symbol) || 1,
      bond: Number(window.__B_ZONE_COURSE__?.micro?.canvas?.bondLength) || 1,
    }
    let currentAtomScale = atomSize.hero
    const atomQueue = []

    const heroOffsets = [
      [[-.23,-.24],[.23,-.24],[-.23,.24],[.23,.24],[0,0]],
      [[-.23,-.24],[.23,-.24],[-.23,.24],[.23,.24],[0,0]],
      [[-.23,-.24],[.23,-.24],[-.23,.24],[.23,.24],[0,0]],
    ]

    function resize() {
      const rect = host.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function roundedRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
    }

    function line(x1, y1, x2, y2, color, lineWidth = 1) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke()
    }

    function atom(x, y, element, radius, alpha = 1, showSymbol = true) {
      atomQueue.push({ x, y, element, radius: radius * (4 / 3) * currentAtomScale, alpha, showSymbol })
    }

    function flushAtoms() {
      // 全场严格分层：所有键已完成 → 所有球体 → 所有高光 → 所有元素字母。
      atomQueue.forEach(({ x, y, element, radius, alpha }) => {
        ctx.save(); ctx.globalAlpha = alpha
        const g = ctx.createRadialGradient(x - radius * .32, y - radius * .35, radius * .08, x, y, radius)
        g.addColorStop(0, '#fff'); g.addColorStop(.2, COLORS[element]); g.addColorStop(1, element === 'N' ? '#315caa' : element === 'O' ? '#a92b28' : '#b66b13')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(34,64,48,.24)'; ctx.lineWidth = .7; ctx.stroke(); ctx.restore()
      })
      atomQueue.forEach(({ x, y, radius, alpha }) => {
        ctx.save(); ctx.globalAlpha = alpha * .68
        ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.beginPath()
        ctx.arc(x - radius * .28, y - radius * .3, Math.max(.55, radius * .18), 0, Math.PI * 2); ctx.fill(); ctx.restore()
      })
      atomQueue.forEach(({ x, y, element, radius, alpha, showSymbol }) => {
        if (!showSymbol) return
        const fontSize = Math.max(4, radius * .9) * atomSize.symbol
        ctx.save(); ctx.globalAlpha = alpha
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(.55, fontSize * .12)
        ctx.strokeStyle = element === 'P' ? 'rgba(91,55,12,.7)' : 'rgba(24,45,67,.46)'
        ctx.strokeText(element, x, y + fontSize * .03)
        ctx.fillStyle = '#fff'; ctx.fillText(element, x, y + fontSize * .03)
        ctx.restore()
      })
    }

    function molecule(x, y, element, angle, scale = 1, alpha = 1, split = 0, showSymbol = true) {
      const radius = 5.3 * scale
      const distance = (12.6 + split * 15) * scale * atomSize.bond
      const dx = Math.cos(angle) * distance * .5
      const dy = Math.sin(angle) * distance * .5
      const px = -Math.sin(angle) * 1.45 * scale
      const py = Math.cos(angle) * 1.45 * scale
      const bondColor = element === 'N' ? 'rgba(42,76,127,.82)' : 'rgba(139,42,37,.84)'
      const bonds = element === 'N' ? [-1.5, 0, 1.5] : [-1.1, 1.1]
      ctx.save(); ctx.globalAlpha = alpha
      bonds.forEach((offset) => line(x - dx + px * offset, y - dy + py * offset, x + dx + px * offset, y + dy + py * offset, bondColor, .85 * scale))
      ctx.restore()
      atom(x - dx, y - dy, element, radius, alpha, showSymbol); atom(x + dx, y + dy, element, radius, alpha, showSymbol)
    }

    function label(text, x, y, align = 'left', size = 10, color = '#4e6c59', weight = 750) {
      ctx.fillStyle = color; ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(text, x, y)
    }

    function solidOxygenTargets(y) {
      const center = width / 2
      return Array.from({ length: 6 }, (_, i) => ({
        x: center - 38 + i * 15.2,
        y: y - 3 + (i % 2) * 8,
      }))
    }

    function drawSolid(y, heat, oxygen, alpha = 1) {
      const center = width / 2
      ctx.save(); ctx.globalAlpha = alpha
      ctx.fillStyle = heat > .1 ? `rgba(238,157,46,${.08 + heat * .14})` : 'rgba(229,164,55,.07)'
      ctx.beginPath(); ctx.ellipse(center, y + 8, width * .29, 28 + heat * 6, 0, 0, Math.PI * 2); ctx.fill()
      const count = 22
      const phosphorus = []
      for (let i = 0; i < count; i += 1) {
        const col = i % 11; const row = Math.floor(i / 11)
        const x = center - 72 + col * 14 + (row % 2) * 7
        const py = y + row * 10 + Math.sin(i * 2.4) * 1.4
        phosphorus.push({ x, y: py })
      }
      // 所有化学键先画，确保后绘制的球、高光和字母永远位于键线上层。
      phosphorus.forEach((p, i) => { if (i) line(phosphorus[i - 1].x, phosphorus[i - 1].y, p.x, p.y, 'rgba(154,98,24,.34)', .7) })
      const oxygenTargets = solidOxygenTargets(y)
      oxygenTargets.forEach((o, i) => {
        if (oxygen <= .02) return
        const p = phosphorus[5 + i]
        ctx.save(); ctx.globalAlpha = oxygen
        line(o.x, o.y + 2, p.x, p.y, 'rgba(139,66,31,.58)', .85)
        ctx.restore()
      })
      phosphorus.forEach((p) => atom(p.x, p.y, 'P', 5, .95, true))
      ctx.restore()
    }

    function stageProgress(now) {
      const t = ease((now - transitionAt) / 820)
      return { visual: mix(fromStage, stage, t), settled: t >= .999 }
    }

    function observationBottom() {
      return clamp(height * .52, 188, 205)
    }

    function drawHero(now, visual) {
      const top = 62
      // 面板正文约 300px 高：主观察区与统计区都必须在第一屏完整出现。
      const bottom = observationBottom()
      const groupGap = 7
      const groupW = (width - 34 - groupGap * 2) / 3
      label('原子级主观察区', 17, 51, 'left', 10, '#315a3c', 850)
      label('N₂：N≡N  ·  O₂：O=O', width - 17, 51, 'right', 8.5, '#5f7566', 760)

      const reaction = clamp(visual - 1, 0, 1)
      const cooled = clamp(visual - 2, 0, 1)
      const water = clamp(visual - 3, 0, 1)
      const heat = visual >= 1 && visual < 3 ? Math.sin(Math.min(1, visual - 1) * Math.PI) : 0

      const movingOxygen = []
      const solidY = bottom - 25
      const oxygenTargets = solidOxygenTargets(solidY)
      for (let g = 0; g < 3; g += 1) {
        const gx = 17 + g * (groupW + groupGap)
        roundedRect(gx, top, groupW, bottom - top, 12)
        ctx.fillStyle = 'rgba(255,255,251,.58)'; ctx.fill()
        ctx.strokeStyle = 'rgba(75,116,84,.18)'; ctx.lineWidth = 1; ctx.stroke()
        label(`代表单元 ${g + 1}`, gx + 8, top + 15, 'left', 8.5, '#668071', 800)

        const time = motion ? now * .001 : 0
        heroOffsets[g].forEach(([ox, oy], i) => {
          const isO = i === 4
          const baseX = gx + groupW * (.5 + ox)
          const baseY = top + 31 + (bottom - top - 76) * (.5 + oy)
          const amp = (isO ? 3.5 : 2.4) * (1 - cooled * .7)
          const driftX = Math.sin(time * (1.2 + i * .08) + g * 2 + i) * amp
          const driftY = Math.cos(time * (1.05 + i * .07) + g + i * 1.7) * amp
          if (!isO) molecule(baseX + driftX, baseY + driftY, 'N', (i * .72 + g * .38) % Math.PI, 1.16, 1, 0, true)
          else {
            const targetY = bottom - 34
            const y = mix(baseY + driftY, targetY, clamp(visual - .75, 0, 1))
            const angle = -.16 + g * .12
            const radius = 5.3 * 1.16
            const distance = 12.6 * 1.16 * atomSize.bond
            const dx = Math.cos(angle) * distance * .5
            const dy = Math.sin(angle) * distance * .5
            const centerX = baseX + driftX * (1 - reaction)
            const migration = ease(clamp((visual - 1.05) / .9, 0, 1))
            const starts = [{ x: centerX - dx, y: y - dy }, { x: centerX + dx, y: y + dy }]
            starts.forEach((start, atomIndex) => {
              const target = oxygenTargets[g * 2 + atomIndex]
              movingOxygen.push({
                x: mix(start.x, target.x, migration),
                y: mix(start.y, target.y, migration),
                radius,
                molecule: g,
                atomIndex,
              })
            })
          }
        })
      }

      if (heat > .05) {
        label('电热区', width / 2, bottom - 48, 'center', 8.5, '#b77823', 850)
        for (let i = 0; i < 3; i += 1) {
          ctx.strokeStyle = `rgba(229,137,33,${.22 + heat * .42})`; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.arc(width / 2, bottom - 26, 40 + i * 12 + Math.sin(now * .006 + i) * 2, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke()
        }
      }
      drawSolid(solidY, heat, reaction)
      // O=O 键随断裂过程淡出；两个带 O 字母的原子始终连续移动且从不消失。
      for (let g = 0; g < 3; g += 1) {
        const a = movingOxygen[g * 2]; const b = movingOxygen[g * 2 + 1]
        const bondAlpha = 1 - ease(clamp((visual - 1.35) / .48, 0, 1))
        if (a && b && bondAlpha > .01) {
          const vx = b.x - a.x; const vy = b.y - a.y; const length = Math.max(1, Math.hypot(vx, vy))
          const px = -vy / length * .9; const py = vx / length * .9
          ctx.save(); ctx.globalAlpha = bondAlpha
          line(a.x + px, a.y + py, b.x + px, b.y + py, 'rgba(139,42,37,.84)', .75)
          line(a.x - px, a.y - py, b.x - px, b.y - py, 'rgba(139,42,37,.84)', .75)
          ctx.restore()
        }
      }
      movingOxygen.forEach((o) => atom(o.x, o.y, 'O', o.radius, 1, true))
      label(reaction > .55 ? '磷氧固体（O 进入固体）' : '红磷固体', width / 2, bottom - 3, 'center', 8.5, '#775526', 820)

      if (water > .01) {
        const advance = width * .19 * water
        ctx.fillStyle = 'rgba(90,177,205,.16)'; ctx.fillRect(17, top + 20, advance, bottom - top - 21)
        line(17 + advance, top + 20, 17 + advance, bottom, 'rgba(50,139,173,.7)', 1.4)
        label('液面推进 ≈ 1/5', 22, top + 32, 'left', 8.5, '#277b9b', 850)
        for (let i = 0; i <= 5; i += 1) {
          const x = 17 + (width - 34) * i / 5
          line(x, top + 2, x, top + 10, i === 1 ? '#2f8faf' : 'rgba(67,96,76,.38)', i === 1 ? 1.5 : .8)
          label(String(i), x, top - 3, 'center', 7.5, '#6a8070', 720)
        }
      }
    }

    function drawBatches(visual) {
      // 统计批次紧接主观察区，避免竖屏/高面板在两层之间留下大块空白。
      const y0 = Math.min(height - 92, observationBottom() + 30)
      label('6 组固定空气模型', 17, y0 - 10, 'left', 10, '#315a3c', 850)
      label(visual < 1.8 ? '每批：4N₂ + 1O₂' : '反应后每批：仅剩 4N₂', width - 17, y0 - 10, 'right', 8.5, '#607868', 760)
      const cols = 3; const rows = 2; const gap = 8
      const cellW = (width - 34 - gap * (cols - 1)) / cols
      const available = Math.max(48, height - y0 - 42)
      const cellH = (available - gap * (rows - 1)) / rows
      const miniScale = clamp(Math.min(cellW, cellH) / 120, .52, .82)
      const oxygenAlpha = 1 - clamp((visual - 1.38) / .52, 0, 1)
      for (let i = 0; i < 6; i += 1) {
        const col = i % cols; const row = Math.floor(i / cols)
        const x = 17 + col * (cellW + gap); const y = y0 + row * (cellH + gap)
        ctx.beginPath(); ctx.ellipse(x + cellW / 2, y + cellH / 2 + 1, cellW * .47, cellH * .43, 0, 0, Math.PI * 2)
        const plate = ctx.createLinearGradient(x, y, x, y + cellH)
        plate.addColorStop(0, 'rgba(255,255,250,.76)'); plate.addColorStop(1, 'rgba(219,235,220,.5)')
        ctx.fillStyle = plate; ctx.fill(); ctx.strokeStyle = 'rgba(105,153,121,.28)'; ctx.lineWidth = .8; ctx.stroke()
        const cy = y + cellH * .57
        for (let n = 0; n < 4; n += 1) {
          const mx = x + cellW * (.16 + n * .21)
          molecule(mx, cy + (n % 2 ? 2.2 : -2.2), 'N', n % 2 ? .5 : -.4, miniScale, .72, 0, false)
        }
        if (oxygenAlpha > .02) molecule(x + cellW * .89, cy, 'O', .1, miniScale, .78 * oxygenAlpha, clamp((visual - 1.45) / .5, 0, 1), false)
      }
    }

    function draw(now) {
      if (!running) return
      raf = requestAnimationFrame(draw)
      if (now - lastRenderAt < 32) return
      lastRenderAt = now
      ctx.clearRect(0, 0, width, height)
      atomQueue.length = 0
      const { visual } = stageProgress(now)
      currentAtomScale = atomSize.hero
      drawHero(now, visual)
      currentAtomScale = atomSize.batch
      drawBatches(visual)
      const conclusionY = height - 20
      ctx.fillStyle = 'rgba(247,250,243,.94)'; ctx.fillRect(8, height - 38, width - 16, 24)
      label('氧气约占空气体积的1/5，氮气约占4/5。', width / 2, conclusionY, 'center', 10.5, COLORS.ink, 900)
      flushAtoms()
    }

    const observer = new ResizeObserver(resize)
    const onMicroTuning = (event) => {
      atomSize = {
        hero: Number(event.detail?.hero) || 1,
        batch: Number(event.detail?.batch) || 1,
        symbol: Number(event.detail?.symbol) || 1,
        bond: Number(event.detail?.bond) || 1,
      }
    }
    observer.observe(host); resize(); raf = requestAnimationFrame(draw)
    window.addEventListener('b-zone:micro-tuning', onMicroTuning)
    return {
      ok: true,
      setStage(next) { fromStage = stage; stage = clamp(Number(next) || 0, 0, 4); transitionAt = performance.now() },
      setContext() {},
      setOrbit(on) { motion = Boolean(on) },
      resetCamera() { motion = true },
      pause() { running = false; cancelAnimationFrame(raf); lastRenderAt = 0 },
      resume() { if (!running) { running = true; lastRenderAt = 0; raf = requestAnimationFrame(draw) } },
      dispose() { running = false; cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('b-zone:micro-tuning', onMicroTuning); canvas.remove() },
    }
  }

  window.BZoneAirMeteringCanvas = { mount }
})()
