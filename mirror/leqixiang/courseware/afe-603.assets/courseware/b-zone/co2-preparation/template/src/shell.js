/**
 * shell.js —— 只负责文档级语义（aria-busy 等），场景状态归运行时管。
 */
(() => {
  'use strict'

  const app = document.querySelector('.app')
  const loading = document.querySelector('#loading')
  const fallback = document.querySelector('#fallback')
  if (!app) return

  function syncBusyState() {
    const isLoading = !loading?.classList.contains('hidden') && !fallback?.classList.contains('show')
    app.setAttribute('aria-busy', String(isLoading))
  }

  const observer = new MutationObserver(syncBusyState)
  if (loading) observer.observe(loading, { attributes: true, attributeFilter: ['class'] })
  if (fallback) observer.observe(fallback, { attributes: true, attributeFilter: ['class'] })
  syncBusyState()
})()
