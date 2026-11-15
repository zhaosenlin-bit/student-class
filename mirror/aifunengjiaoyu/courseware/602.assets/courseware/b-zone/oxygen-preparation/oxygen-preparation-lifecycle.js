/**
 * Keeps the static courseware shell accessible without coupling it to the
 * generated Three.js runtime. This file deliberately owns only document-level
 * semantics; scene state remains the runtime's responsibility.
 */

(() => {
  'use strict'

  const app = document.querySelector('.app')
  const loading = document.querySelector('#loading')
  const fallback = document.querySelector('#fallback')
  const playButton = document.querySelector('#playButton')
  const viewButton = document.querySelector('#viewButton')

  if (!app) return

  function syncBusyState() {
    const isLoading = !loading?.classList.contains('hidden') && !fallback?.classList.contains('show')
    app.setAttribute('aria-busy', String(isLoading))
  }

  function syncToggleButtons() {
    const state = window.__OXYGEN_PREPARATION__?.state
    if (!state) return

    const autoPlaying = Boolean(state.autoPlaying)
    const autoView = Boolean(state.autoView)
    playButton?.setAttribute('aria-pressed', String(autoPlaying))
    playButton?.setAttribute('aria-label', autoPlaying ? '暂停实验自动播放' : '开始实验自动播放')
    viewButton?.setAttribute('aria-pressed', String(autoView))
    viewButton?.setAttribute('aria-label', autoView ? '关闭缓慢环视' : '开启缓慢环视')
  }

  const shellObserver = new MutationObserver(syncBusyState)
  if (loading) shellObserver.observe(loading, { attributes: true, attributeFilter: ['class'] })
  if (fallback) shellObserver.observe(fallback, { attributes: true, attributeFilter: ['class'] })

  ;[playButton, viewButton].filter(Boolean).forEach((button) => {
    button.addEventListener('click', () => requestAnimationFrame(syncToggleButtons))
  })

  syncBusyState()
  syncToggleButtons()
})()
