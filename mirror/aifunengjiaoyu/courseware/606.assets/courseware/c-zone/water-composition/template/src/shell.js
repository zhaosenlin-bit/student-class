(() => {
  const app = document.querySelector('.app')
  const loading = document.querySelector('#loading')
  const fallback = document.querySelector('#fallback')
  const fullscreenButton = document.querySelector('#fullscreenButton')

  if (!app) return

  const syncBusy = () => {
    const loadingVisible = loading && !loading.classList.contains('hidden')
    const fallbackVisible = fallback && fallback.classList.contains('show')
    app.setAttribute('aria-busy', String(Boolean(loadingVisible && !fallbackVisible)))
  }

  const syncFullscreen = () => {
    if (!fullscreenButton) return
    const active = Boolean(document.fullscreenElement)
    fullscreenButton.textContent = active ? '退出全屏' : '全屏'
    fullscreenButton.setAttribute('aria-pressed', String(active))
  }

  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await app.requestFullscreen()
    } catch (error) {
      console.warn('无法切换全屏模式。', error)
    }
  })

  document.addEventListener('fullscreenchange', syncFullscreen)

  const observer = new MutationObserver(syncBusy)
  if (loading) observer.observe(loading, { attributes: true, attributeFilter: ['class'] })
  if (fallback) observer.observe(fallback, { attributes: true, attributeFilter: ['class'] })

  syncBusy()
  syncFullscreen()
})()
