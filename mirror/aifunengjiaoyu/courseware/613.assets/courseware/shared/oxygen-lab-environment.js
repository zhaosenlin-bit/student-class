/**
 * [INPUT]: 现有 Three.js scene/root、课件圆角盒工厂，以及台面宽深和顶面 Y。
 * [OUTPUT]: 与氧气制取课件一致的暖木实验室岛台（石墨台面、暖灰柜体、鼠尾草门板、接触阴影）。
 * [POS]: 独立课件共享环境层；不认识具体器材、步骤或课程状态。
 */
import {
  BackSide,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from 'three'

export const OXYGEN_LAB_PANORAMA = new URL(
  '../../assets/courseware-prototypes/oxygen-preparation-lab-panorama-1912x823-v4.png',
  import.meta.url,
).href
export const OXYGEN_LAB_PANORAMA_ASPECT = 1912 / 823

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/**
 * 复刻「氧气制取」的 AR 式实验室环绕壳。
 *
 * 全景、桌台和器材都留在固定世界坐标中；观察交互只能移动相机。
 * 两个 180° 半圆柱沿用原课件的纹理方向与渲染顺序，不能改成相机子节点或每帧跟随相机。
 */
export function createOxygenLabPanorama({
  scene,
  camera,
  target,
  renderer,
  width = 10,
  radius = Math.max(9, width * 0.9),
  panoramaUrl,
  imageAspect = OXYGEN_LAB_PANORAMA_ASPECT,
  name = 'oxygen-lab-panorama-rig',
} = {}) {
  if (!scene || !camera || !target) {
    throw new TypeError('createOxygenLabPanorama requires scene, camera and target')
  }

  const resolvedPanoramaUrl = panoramaUrl
    || document.querySelector('.app')?.dataset.panorama
    || OXYGEN_LAB_PANORAMA
  let material
  const texture = new TextureLoader().load(
    resolvedPanoramaUrl,
    undefined,
    undefined,
    () => {
      if (!material) return
      material.map = null
      material.needsUpdate = true
    },
  )
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.repeat.x = -1
  texture.offset.x = 1
  const maxAnisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 1
  texture.anisotropy = Math.min(8, maxAnisotropy)

  material = new MeshBasicMaterial({
    map: texture,
    color: 0xd5d7cf,
    side: BackSide,
    fog: false,
    toneMapped: false,
    depthWrite: false,
  })

  const baseHeight = radius * Math.PI / imageAspect
  const group = new Group()
  group.name = name
  group.position.set(0.2, 0.5, 0.6)
  group.rotation.y = Math.atan2(
    camera.position.x - target.x,
    camera.position.z - target.z,
  )
  group.userData.fixedWorld = true
  group.userData.baseRotationY = group.rotation.y
  group.userData.baseHeight = baseHeight
  group.userData.radius = radius

  const makeHalf = (thetaStart, meshName) => {
    const mesh = new Mesh(
      new CylinderGeometry(radius, radius, baseHeight, 128, 1, true, thetaStart, Math.PI),
      material,
    )
    mesh.name = meshName
    mesh.frustumCulled = false
    mesh.renderOrder = -1000
    group.add(mesh)
    return mesh
  }

  const front = makeHalf(Math.PI / 2, 'labPanoramaFront')
  const back = makeHalf(Math.PI * 1.5, 'labPanoramaBack')
  scene.add(group)

  const fitCamera = (activeCamera = camera, padding = 1.12) => {
    const viewHeight = Math.abs(activeCamera.top - activeCamera.bottom)
    const scaleY = Math.max(1, viewHeight * padding / baseHeight)
    group.scale.y = scaleY
    return scaleY
  }

  const dispose = () => {
    scene.remove(group)
    front.geometry.dispose()
    back.geometry.dispose()
    material.dispose()
    texture.dispose()
  }

  return {
    group,
    front,
    back,
    texture,
    material,
    radius,
    baseHeight,
    fitCamera,
    dispose,
  }
}

export function createOxygenLabEnvironment({
  root,
  roundedBox,
  width,
  depth,
  topY = 0,
  cabinetHeight = 3.55,
  name = 'oxygen-lab-environment',
}) {
  if (!root || typeof roundedBox !== 'function') {
    throw new TypeError('createOxygenLabEnvironment requires root and roundedBox')
  }

  const island = new Group()
  island.name = name
  island.userData.fixedWorld = true
  island.userData.supportTopY = topY
  // `topY` 表示器材实际落脚的内衬顶面；岛台主体下移一层内衬厚度，避免器材轻微穿模。
  const insetThickness = 0.014
  island.position.y = topY - insetThickness
  root.add(island)

  const materials = {
    counter: new MeshPhysicalMaterial({
      color: 0x38352f,
      roughness: 0.42,
      metalness: 0.18,
      clearcoat: 0.16,
      clearcoatRoughness: 0.24,
    }),
    counterInset: new MeshStandardMaterial({ color: 0x6a6258, roughness: 0.38, metalness: 0.2 }),
    counterEdge: new MeshStandardMaterial({ color: 0x27251f, roughness: 0.36, metalness: 0.52 }),
    cabinet: new MeshStandardMaterial({ color: 0x93897d, roughness: 0.5, metalness: 0.04 }),
    cabinetSide: new MeshStandardMaterial({ color: 0x6f6558, roughness: 0.47, metalness: 0.05 }),
    sageDoor: new MeshStandardMaterial({ color: 0x3c4e3f, roughness: 0.44, metalness: 0.04 }),
    sageInset: new MeshStandardMaterial({ color: 0x6e806b, roughness: 0.5, metalness: 0.02 }),
    drawer: new MeshStandardMaterial({ color: 0x5f584e, roughness: 0.46, metalness: 0.04 }),
    drawerInset: new MeshStandardMaterial({ color: 0x938a78, roughness: 0.48, metalness: 0.02 }),
    rail: new MeshStandardMaterial({ color: 0x8b714f, roughness: 0.3, metalness: 0.78 }),
    woodTrim: new MeshStandardMaterial({ color: 0x936b46, roughness: 0.42, metalness: 0.06 }),
    toeKick: new MeshStandardMaterial({ color: 0x293130, roughness: 0.32, metalness: 0.44 }),
    warmLight: new MeshBasicMaterial({
      color: 0xffcb7f,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      toneMapped: false,
    }),
  }

  const addRounded = (partName, partWidth, height, partDepth, radius, material, x, y, z, options = {}) => {
    const part = roundedBox(partWidth, height, partDepth, radius, material)
    part.name = partName
    part.position.set(x, y, z)
    part.castShadow = options.castShadow ?? true
    part.receiveShadow = options.receiveShadow ?? true
    island.add(part)
    return part
  }

  const counterThickness = 0.22
  const cabinetDepth = Math.max(2.8, depth - 0.62)
  const cabinetTop = -counterThickness - 0.04
  const cabinetCenterY = cabinetTop - cabinetHeight / 2
  const frontZ = cabinetDepth / 2 + 0.035
  const panelZ = frontZ + 0.05
  const pullZ = panelZ + 0.055

  const counter = addRounded('lab-counter-slab', width, counterThickness, depth, 0.08, materials.counter, 0, -counterThickness / 2, 0)
  const inset = addRounded('lab-counter-inset', width - 0.32, insetThickness, depth - 0.38, 0.045, materials.counterInset, 0, insetThickness / 2, 0, { castShadow: false })
  addRounded('lab-counter-front-edge', width - 0.16, 0.12, 0.11, 0.026, materials.counterEdge, 0, -0.08, depth / 2 - 0.045)
  addRounded('lab-counter-back-edge', width - 0.16, 0.07, 0.08, 0.02, materials.counterEdge, 0, -0.09, -depth / 2 + 0.045)

  addRounded('lab-cabinet-core', width - 0.42, cabinetHeight, cabinetDepth, 0.07, materials.cabinet, 0, cabinetCenterY, 0)
  addRounded('lab-cabinet-left-side', 0.1, cabinetHeight - 0.18, cabinetDepth - 0.18, 0.025, materials.cabinetSide, -width / 2 + 0.28, cabinetCenterY, 0)
  addRounded('lab-cabinet-right-side', 0.1, cabinetHeight - 0.18, cabinetDepth - 0.18, 0.025, materials.cabinetSide, width / 2 - 0.28, cabinetCenterY, 0)
  addRounded('lab-front-frame', width - 0.58, cabinetHeight - 0.42, 0.055, 0.03, materials.cabinetSide, 0, cabinetCenterY + 0.06, frontZ)

  const centerWidth = clamp(width * 0.18, 1.65, 2.15)
  const sideGap = 0.15
  const sideSpan = (width - 0.92 - centerWidth - sideGap * 2) / 2
  const doorsPerSide = clamp(Math.round(sideSpan / 1.85), 1, 3)
  const doorGap = 0.12
  const doorWidth = (sideSpan - doorGap * (doorsPerSide - 1)) / doorsPerSide
  const doorHeight = cabinetHeight - 0.78
  const doorY = cabinetTop - 0.22 - doorHeight / 2

  ;[-1, 1].forEach((side) => {
    const spanCenter = side * (centerWidth / 2 + sideGap + sideSpan / 2)
    for (let index = 0; index < doorsPerSide; index += 1) {
      const x = spanCenter + (index - (doorsPerSide - 1) / 2) * (doorWidth + doorGap)
      const key = side < 0 ? `left-${index}` : `right-${index}`
      addRounded(`lab-door-${key}`, doorWidth, doorHeight, 0.085, 0.055, materials.sageDoor, x, doorY, panelZ)
      addRounded(`lab-door-inset-${key}`, Math.max(0.3, doorWidth - 0.17), doorHeight - 0.18, 0.018, 0.032, materials.sageInset, x, doorY, panelZ + 0.052, { castShadow: false })
      addRounded(`lab-door-pull-${key}`, Math.min(0.48, doorWidth * 0.34), 0.04, 0.075, 0.012, materials.rail, x, doorY + doorHeight * 0.32, pullZ, { castShadow: false })
    }
  })

  const drawerHeights = [0.54, 0.68, Math.max(0.72, cabinetHeight - 1.66)]
  let drawerTop = cabinetTop - 0.18
  drawerHeights.forEach((height, index) => {
    const y = drawerTop - height / 2
    addRounded(`lab-drawer-${index}`, centerWidth, height - 0.06, 0.085, 0.05, materials.drawer, 0, y, panelZ)
    addRounded(`lab-drawer-inset-${index}`, centerWidth - 0.18, height - 0.2, 0.018, 0.028, materials.drawerInset, 0, y, panelZ + 0.052, { castShadow: false })
    addRounded(`lab-drawer-pull-${index}`, Math.min(0.64, centerWidth * 0.4), 0.04, 0.075, 0.012, materials.rail, 0, y + height * 0.16, pullZ, { castShadow: false })
    drawerTop -= height
  })

  addRounded('lab-front-wood-trim', width - 0.95, 0.085, 0.06, 0.02, materials.woodTrim, 0, cabinetTop - 0.08, pullZ - 0.02, { castShadow: false })
  const toeY = cabinetTop - cabinetHeight + 0.14
  addRounded('lab-toe-kick', width - 0.8, 0.22, cabinetDepth - 0.4, 0.04, materials.toeKick, 0, toeY, 0)
  addRounded('lab-warm-underlight', width - 1.22, 0.045, 0.04, 0.012, materials.warmLight, 0, toeY + 0.16, frontZ + 0.04, { castShadow: false, receiveShadow: false })

  const contactShadow = new Mesh(
    new CircleGeometry(1, 64),
    new MeshBasicMaterial({ color: 0x29302a, transparent: true, opacity: 0.13, depthWrite: false }),
  )
  contactShadow.name = 'lab-island-contact-shadow'
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.scale.set(width * 0.51, depth * 0.5, 1)
  contactShadow.position.set(0, toeY - 0.12, 0.28)
  contactShadow.renderOrder = -4
  island.add(contactShadow)

  return { group: island, counter, inset, contactShadow, materials, topY }
}
