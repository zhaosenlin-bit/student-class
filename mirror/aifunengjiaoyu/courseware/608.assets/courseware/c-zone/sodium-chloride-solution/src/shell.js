/** 页面级可访问性、全屏与加载状态；三维实验状态只由 scene.js 管理。 */
(() => {
  const app = document.querySelector('.app')
  const loading = document.getElementById('loading')
  const fallback = document.getElementById('fallback')
  const fullscreenButton = document.getElementById('fullscreenButton')
  if (!app) return

  const syncBusy = () => {
    const busy = !loading?.classList.contains('hidden') && !fallback?.classList.contains('show')
    app.setAttribute('aria-busy', String(busy))
  }
  const syncFullscreen = () => {
    const active = Boolean(document.fullscreenElement)
    fullscreenButton.textContent = active ? '退出全屏' : '全屏'
    fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '进入全屏')
  }

  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await app.requestFullscreen()
    } catch (error) {
      console.warn('Fullscreen request was not available.', error)
    }
  })
  document.addEventListener('fullscreenchange', syncFullscreen)
  const observer = new MutationObserver(syncBusy)
  if (loading) observer.observe(loading, { attributes: true, attributeFilter: ['class'] })
  if (fallback) observer.observe(fallback, { attributes: true, attributeFilter: ['class'] })
  syncBusy()
  syncFullscreen()
})()
