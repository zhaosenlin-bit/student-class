import * as THREE from 'three'

export const COLORS = Object.freeze({
  clear: new THREE.Color(0xdbe6e2),
  litmusPurple: new THREE.Color(0x72528b),
  acidRed: new THREE.Color(0xb84e55),
  baseBlue: new THREE.Color(0x3f6f9a),
  phenolPink: new THREE.Color(0xd56f91),
  copperBlue: new THREE.Color(0x438bad),
  precipitateBlue: new THREE.Color(0x68a9c6),
  copperOxide: new THREE.Color(0x181a1a),
  zinc: new THREE.Color(0x909b9e),
})

export function glassMaterial(opacity = 0.28) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf1f7f4,
    roughness: 0.045,
    metalness: 0,
    transmission: 0.97,
    thickness: 0.12,
    transparent: true,
    opacity: Math.max(opacity, 0.42),
    ior: 1.46,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
    specularIntensity: 1,
    attenuationColor: 0xe8f2ee,
    attenuationDistance: 2.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function liquidMaterial(color = COLORS.clear, opacity = 0.72) {
  const colorless = color.r > 0.82 && color.g > 0.86 && color.b > 0.84
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.075,
    transmission: colorless ? 0.91 : 0.46,
    transparent: true,
    opacity: colorless ? opacity * 0.34 : opacity,
    thickness: 0.24,
    ior: 1.34,
    clearcoat: 0.55,
    clearcoatRoughness: 0.09,
    envMapIntensity: 0.9,
    attenuationColor: color,
    attenuationDistance: colorless ? 4.5 : 1.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function porcelainMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: 0xf5f4ed, roughness: 0.24, clearcoat: 0.55, clearcoatRoughness: 0.2 })
}

export function metalMaterial(color = 0x778183, roughness = 0.27) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.82, envMapIntensity: 1.25 })
}

export function woodMaterial() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 192
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#c69b68')
  gradient.addColorStop(0.5, '#ae7f4f')
  gradient.addColorStop(1, '#c0925e')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const random = seededRandom(5261)
  for (let index = 0; index < 46; index += 1) {
    const y = random() * canvas.height
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.025 + random() * 2) * (1.5 + random() * 2.5))
    }
    ctx.strokeStyle = `rgba(81, 48, 25, ${0.035 + random() * 0.07})`
    ctx.lineWidth = 0.8 + random() * 1.4
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.5, 1)
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.5, metalness: 0.02, envMapIntensity: 0.75 })
}

export function softShadowMaterial(opacity = 0.13) {
  return new THREE.MeshBasicMaterial({ color: 0x29443a, transparent: true, opacity, depthWrite: false })
}

export function labelTexture(text, options = {}) {
  const { width = 512, height = 180, ink = '#244238', paper = '#f8f4e8', accent = '#6b8d78' } = options
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  const margin = 13
  const radius = Math.min(34, height * 0.22)
  const roundedPath = () => {
    ctx.beginPath()
    ctx.moveTo(margin + radius, margin)
    ctx.lineTo(width - margin - radius, margin)
    ctx.quadraticCurveTo(width - margin, margin, width - margin, margin + radius)
    ctx.lineTo(width - margin, height - margin - radius)
    ctx.quadraticCurveTo(width - margin, height - margin, width - margin - radius, height - margin)
    ctx.lineTo(margin + radius, height - margin)
    ctx.quadraticCurveTo(margin, height - margin, margin, height - margin - radius)
    ctx.lineTo(margin, margin + radius)
    ctx.quadraticCurveTo(margin, margin, margin + radius, margin)
    ctx.closePath()
  }
  ctx.save()
  ctx.shadowColor = 'rgba(28, 46, 34, .2)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 5
  roundedPath()
  ctx.fillStyle = paper
  ctx.fill()
  ctx.restore()
  roundedPath()
  ctx.strokeStyle = 'rgba(55, 78, 62, .18)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.save()
  roundedPath()
  ctx.clip()
  ctx.fillStyle = accent
  ctx.fillRect(margin, margin, 13, height - margin * 2)
  ctx.restore()
  ctx.fillStyle = ink
  const fontSize = text.length > 17 ? 34 : text.length > 12 ? 40 : 50
  ctx.font = `700 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2 + 5, height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function makeLabel(text, width = 1.04, height = 0.38, options) {
  const material = new THREE.MeshBasicMaterial({ map: labelTexture(text, options), transparent: true, side: THREE.DoubleSide })
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
}

export function makeCaption(text, width = 2.15, height = 0.48) {
  const texture = labelTexture(text, { width: 700, height: 150, paper: 'rgba(247,250,247,0.96)', accent: '#6b9b7e' })
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width, height, 1)
  sprite.renderOrder = 20
  return sprite
}

export function setLiquidColor(material, from, to, t) {
  material.color.copy(from).lerp(to, THREE.MathUtils.clamp(t, 0, 1))
  const max = Math.max(material.color.r, material.color.g, material.color.b)
  const min = Math.min(material.color.r, material.color.g, material.color.b)
  const chroma = THREE.MathUtils.clamp((max - min) * 1.85, 0, 1)
  material.transmission = THREE.MathUtils.lerp(0.91, 0.44, chroma)
  material.attenuationColor?.copy(material.color)
  material.attenuationDistance = THREE.MathUtils.lerp(4.5, 1.65, chroma)
}

export function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}
