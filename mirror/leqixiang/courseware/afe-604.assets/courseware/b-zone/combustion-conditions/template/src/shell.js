(() => {
  'use strict'

  const app = document.querySelector('#app')
  const fullscreenButton = document.querySelector('#fullscreenButton')
  if (!app || !fullscreenButton) return

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await app.requestFullscreen()
      else await document.exitFullscreen()
    } catch (error) {
      console.warn('Fullscreen is unavailable in this browser context.', error)
    }
  }

  function syncFullscreen() {
    const active = Boolean(document.fullscreenElement)
    fullscreenButton.textContent = active ? '退出全屏' : '全屏'
    fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '进入全屏')
    fullscreenButton.setAttribute('aria-pressed', String(active))
  }

  fullscreenButton.addEventListener('click', toggleFullscreen)
  document.addEventListener('fullscreenchange', syncFullscreen)
  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '6' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      window.__COMBUSTION_LAB__?.controller.setStep(Number(event.key) - 1, { play: true })
    }
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault()
      window.__COMBUSTION_LAB__?.controller.togglePlay()
    }
    if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      window.__COMBUSTION_LAB__?.frontView()
    }
  })
  syncFullscreen()
})()
