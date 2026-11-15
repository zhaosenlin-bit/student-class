/**
 * [INPUT]: window.__SALT_PURIFICATION_SPEC__（经典脚本 course-spec.js 提供）。
 * [OUTPUT]: 装配 stage → stations → lesson → shell 并启动渲染循环；
 *           WebGL 不可用时切换文字教学 fallback。
 * [POS]: 组装层。除装配与容错外不含任何业务逻辑。
 */
import { createStage } from './stage.js'
import { createMaterials } from './mats.js'
import { buildStations } from './stations.js'
import { createLesson } from './lesson.js'
import { createShell } from './shell.js'

const spec = window.__SALT_PURIFICATION_SPEC__

function showFallback(error) {
  console.error('三维实验台启动失败，已切换文字模式：', error)
  document.querySelector('#loading')?.classList.add('hidden')
  document.querySelector('#fallback')?.classList.add('show')
  document.querySelector('.app')?.setAttribute('aria-busy', 'false')
}

try {
  const stage = createStage(document.querySelector('#scene'))
  const rig = buildStations(createMaterials(), stage.root)
  const lesson = createLesson(rig, spec)
  const shell = createShell({ spec, lesson, stage, rig })

  let firstFrames = 0
  stage.setLoop((dt, time) => {
    lesson.tick(dt, time, stage.camera)
    stage.tick(dt)
    shell.frame(dt)
    if (firstFrames < 2 && (firstFrames += 1) === 2) shell.ready()
  })

  window.__SALT_PURIFICATION__ = { spec, stage, rig, lesson, state: lesson.state }
} catch (error) {
  showFallback(error)
}
