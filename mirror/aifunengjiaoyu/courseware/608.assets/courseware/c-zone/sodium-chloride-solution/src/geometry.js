import {
  CanvasTexture,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from '../vendor/three.module.js'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'

export function roundedBox(width, height, depth, radius, material, segments = 5) {
  const mesh = new Mesh(new RoundedBoxGeometry(width, height, depth, segments, radius), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.closePath()
}

/** Canvas-backed front-facing label. updateText keeps readings crisp without DOM overlays. */
export function textPlane(initialText, width, height, options = {}) {
  const scale = options.scale || 3
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(192, Math.round(width * 180 * scale))
  canvas.height = Math.max(96, Math.round(height * 180 * scale))
  const context = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
  const mesh = new Mesh(new PlaneGeometry(width, height), material)
  mesh.renderOrder = options.renderOrder || 50
  let cachedText = ''

  mesh.updateText = (text, overrides = {}) => {
    if (text === cachedText && !Object.keys(overrides).length) return
    cachedText = text
    const settings = { ...options, ...overrides }
    const background = settings.background ?? 'rgba(255,255,255,0)'
    const foreground = settings.color || '#173126'
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (background !== 'transparent') {
      context.fillStyle = background
      roundedRect(context, 2, 2, canvas.width - 4, canvas.height - 4, canvas.height * (settings.radius ?? 0.14))
      context.fill()
      if (settings.border) {
        context.lineWidth = Math.max(2, canvas.height * 0.028)
        context.strokeStyle = settings.border
        context.stroke()
      }
    }
    const fontSize = settings.fontSize || Math.round(canvas.height * 0.38)
    context.font = `${settings.weight || 700} ${fontSize}px ${settings.monospace ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'}`
    context.textAlign = settings.align || 'center'
    context.textBaseline = 'middle'
    context.fillStyle = foreground
    const x = settings.align === 'left' ? canvas.height * 0.24 : canvas.width / 2
    context.fillText(text, x, canvas.height / 2, canvas.width - canvas.height * 0.35)
    texture.needsUpdate = true
  }
  mesh.updateText(initialText)
  return mesh
}

export function setOpacity(object, opacity) {
  object.traverse((child) => {
    if (!child.material) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = material.opacity ?? 1
      material.transparent = opacity < 0.999 || material.transparent
      material.opacity = material.userData.baseOpacity * opacity
    })
  })
}

export function colorMix(a, b, amount) {
  return new Color(a).lerp(new Color(b), amount)
}
