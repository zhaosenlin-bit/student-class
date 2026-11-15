import { createAcidBaseScene } from './scene.js'

try {
  createAcidBaseScene()
} catch (error) {
  console.error('[AcidBaseCourseware] startup failed', error)
  document.querySelector('#fallback')?.classList.add('show')
  document.querySelector('#loading')?.classList.add('hidden')
}
