/** Page-level accessibility state; experiment state remains in scene.js. */
(() => {
  const app = document.querySelector('.app')
  const loading = document.querySelector('#loading')
  const fallback = document.querySelector('#fallback')
  if (!app) return

  const syncBusyState = () => {
    const loadingVisible = loading && !loading.classList.contains('hidden')
    const fallbackVisible = fallback?.classList.contains('show')
    app.setAttribute('aria-busy', String(Boolean(loadingVisible && !fallbackVisible)))
  }

  const observer = new MutationObserver(syncBusyState)
  if (loading) observer.observe(loading, { attributes: true, attributeFilter: ['class'] })
  if (fallback) observer.observe(fallback, { attributes: true, attributeFilter: ['class'] })
  syncBusyState()
})()
