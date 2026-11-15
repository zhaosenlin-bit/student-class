(() => {
  'use strict'

  const pathSegments = new URL(window.location.href).pathname.split('/').filter(Boolean)
  // 课件以 `<course>/index.html` 目录形式部署。
  let courseId = pathSegments.at(-1)?.replace(/\.html$/, '')
  if (courseId === 'index') courseId = pathSegments.at(-2)
  const scene = document.querySelector('.scene')
  const fallbackPanorama = '../../../assets/courseware-prototypes/b-zone-lab-panorama-1792x768-v2.png'
  const supportedCourses = new Set([
    'air-composition',
    'oxygen-preparation',
    'combustion-conditions',
    'fire-extinguishing',
  ])
  if (!scene || !supportedCourses.has(courseId)) return

  function resolvePanorama(candidate) {
    try {
      const url = new URL(candidate, document.baseURI)
      const assetPathMarker = ['assets', 'courseware-prototypes'].join('/')
      const isSameOriginAsset = url.origin === window.location.origin
        && url.pathname.includes(assetPathMarker)
        && url.pathname.endsWith('.png')
      return isSameOriginAsset ? url.href : null
    } catch {
      return null
    }
  }

  // 只接受同源课件静态资源，避免把全局配置拼进动态 <style> 造成 CSS 注入。
  const panorama = resolvePanorama(window.__LAB_PANORAMA__)
    || resolvePanorama(document.querySelector('.app')?.dataset.panorama)
    || resolvePanorama(fallbackPanorama)
  scene.style.backgroundColor = '#e8eeea'
  scene.style.backgroundImage = panorama ? `url("${panorama}")` : 'none'
  scene.style.backgroundPosition = 'center 48%'
  scene.style.backgroundRepeat = 'no-repeat'
  scene.style.backgroundSize = 'cover'
})()
