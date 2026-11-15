/**
 * [INPUT]: 当前 B 区课程 ID、课程 micro.canvas.atomSize / bondLength 默认值。
 * [OUTPUT]: 开发阶段微观球体调参器；按课程保存并广播球体、字号与键长倍率。
 * [POS]: 纯开发辅助层。正式发布时将 ENABLED 改为 false 即可统一隐藏。
 */

(() => {
  'use strict'

  const ENABLED = true
  if (!ENABLED || document.querySelector('.micro-tuner')) return

  const pathParts = location.pathname.split('/').filter(Boolean)
  const courseId = window.__B_ZONE_COURSE__?.id
    || pathParts[pathParts.indexOf('b-zone') + 1]
    || 'oxygen-preparation'
  const courseName = document.querySelector('h1')?.textContent?.trim() || courseId
  const courseFile = `b-zone/${courseId}/index.html`
  const configuredCanvas = window.__B_ZONE_COURSE__?.micro?.canvas || window.__B_ZONE_MICRO_CONFIG__ || {}
  const configured = configuredCanvas.atomSize || {}
  const defaults = {
    hero: Number(configured.hero) || 1,
    batch: Number(configured.batch) || 1,
    symbol: Number(configured.symbol) || 1,
    bond: Number(configuredCanvas.bondLength) || 1,
  }
  const storageKey = `fable:b-zone:${courseId}:micro-tuning`

  function readStored() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
      return {
        hero: Number(stored.hero) || defaults.hero,
        batch: Number(stored.batch) || defaults.batch,
        symbol: Number(stored.symbol) || defaults.symbol,
        bond: Number(stored.bond) || defaults.bond,
      }
    } catch {
      return { ...defaults }
    }
  }

  let values = readStored()
  window.__B_ZONE_MICRO_TUNING__ = { ...values }

  const root = document.createElement('aside')
  root.className = 'micro-tuner'
  root.dataset.course = courseId
  root.dataset.open = 'false'
  root.setAttribute('aria-label', '微观球体开发调参器')

  const toggle = document.createElement('button')
  toggle.className = 'micro-tuner__toggle'
  toggle.type = 'button'
  toggle.setAttribute('aria-label', '打开微观球体调参器')
  toggle.setAttribute('aria-expanded', 'false')
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'

  const panel = document.createElement('div')
  panel.className = 'micro-tuner__panel'
  panel.hidden = true
  const title = document.createElement('div')
  title.className = 'micro-tuner__head'
  title.innerHTML = '<strong>微观球体调参</strong><span>DEV · ' + courseId + '</span>'
  panel.appendChild(title)

  const controls = new Map()
  const definitions = [
    ['hero', '顶部球体', 0.55, 1.8, 0.05],
    ['batch', '底部球体', 0.45, 1.8, 0.05],
    ['symbol', '元素字号', 0.7, 1.5, 0.05],
    ['bond', '化学键长度', 0.7, 1.5, 0.05],
  ]

  definitions.forEach(([key, label, min, max, step]) => {
    const row = document.createElement('label')
    row.className = 'micro-tuner__row'
    const caption = document.createElement('span')
    caption.textContent = label
    const output = document.createElement('output')
    output.value = values[key].toFixed(2) + '×'
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(values[key])
    input.setAttribute('aria-label', label)
    input.addEventListener('input', () => {
      values[key] = Number(input.value)
      output.value = values[key].toFixed(2) + '×'
      persistAndBroadcast()
    })
    row.append(caption, output, input)
    panel.appendChild(row)
    controls.set(key, { input, output })
  })

  const actions = document.createElement('div')
  actions.className = 'micro-tuner__actions'
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.textContent = '重置'
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.textContent = '复制配置'
  actions.append(reset, copy)
  panel.appendChild(actions)
  root.append(panel, toggle)
  document.body.appendChild(root)

  function persistAndBroadcast() {
    localStorage.setItem(storageKey, JSON.stringify(values))
    window.__B_ZONE_MICRO_TUNING__ = { ...values }
    window.dispatchEvent(new CustomEvent('b-zone:micro-tuning', {
      detail: { courseId, ...values },
    }))
  }

  function syncControls() {
    controls.forEach(({ input, output }, key) => {
      input.value = String(values[key])
      output.value = values[key].toFixed(2) + '×'
    })
  }

  toggle.addEventListener('click', () => {
    const open = root.dataset.open !== 'true'
    root.dataset.open = String(open)
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? '关闭微观球体调参器' : '打开微观球体调参器')
  })

  reset.addEventListener('click', () => {
    values = { ...defaults }
    localStorage.removeItem(storageKey)
    syncControls()
    persistAndBroadcast()
  })

  copy.addEventListener('click', async () => {
    const text = [
      `课件：${courseName}`,
      `课程 ID：${courseId}`,
      `目标文件：${courseFile}`,
      `球体配置：atomSize: { hero: ${values.hero.toFixed(2)}, batch: ${values.batch.toFixed(2)}, symbol: ${values.symbol.toFixed(2)} }`,
      `键长配置：bondLength: ${values.bond.toFixed(2)}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      copy.textContent = '已复制'
      setTimeout(() => { copy.textContent = '复制配置' }, 900)
    } catch {
      copy.textContent = '复制失败'
    }
  })

  requestAnimationFrame(persistAndBroadcast)
})()
