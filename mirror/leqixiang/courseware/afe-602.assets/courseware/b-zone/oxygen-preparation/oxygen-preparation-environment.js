/**
 * [INPUT]: 氧气制取页暴露的 Three.js 场景和单独配置的全景背景图。
 * [OUTPUT]: 用深石墨耐酸台面、暖灰柜体、鼠尾草柜门与暖光踢脚线替换旧的纯白底座。
 * [POS]: 只处理环境与台岛；前景玻璃、水体和步骤动画继续由 oxygen-preparation-visuals.js 管理。
 */

(() => {
  const lab = window.__OXYGEN_PREPARATION__
  if (!lab) return

  const { root, makeRoundedBox, THREE } = lab
  const {
    CircleGeometry,
    CylinderGeometry,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
  } = THREE

  const near = (value, target, tolerance = 0.035) => Math.abs(value - target) <= tolerance
  const isOldBasePart = (object) => {
    const { x, y, z } = object.position
    return (
      (near(x, 0) && near(y, -2.38) && near(z, 0.02)) ||
      (near(y, -1.89) && near(z, 2.14)) ||
      (near(y, -0.48) && near(z, 2.19)) ||
      (near(x, 0) && near(y, -4.58) && near(z, 0.12)) ||
      (near(x, 0) && near(y, -1.68) && near(z, 1.3)) ||
      (near(x, 0) && near(y, -4.675) && near(z, 1.3)) ||
      (near(x, 0) && near(y, -0.12) && near(z, 0)) ||
      (near(x, 0) && near(y, 0.075) && near(z, 0)) ||
      (near(x, 0) && near(y, 0.11) && near(z, -2.05))
    )
  }

  // 原台面顶面是 y = 0.05；保留这一不变量，避免打断既有器材与动画锚点。
  root.children.filter(isOldBasePart).forEach((object) => {
    object.visible = false
  })

  // 让窗外树影退到器材之后，避免高亮全景吞掉透明玻璃与讲解标注。
  ;['labPanoramaFront', 'labPanoramaBack'].forEach((name) => {
    const panorama = root.parent?.getObjectByName(name)
    const panoramaMaterials = panorama ? (Array.isArray(panorama.material) ? panorama.material : [panorama.material]) : []
    panoramaMaterials.forEach((material) => {
      material?.color?.setHex(0xd5d7cf)
      if (material) material.needsUpdate = true
    })
  })

  const island = new root.constructor()
  island.name = 'oxygen-preparation-warm-lab-island'
  root.add(island)

  const materials = {
    counter: new MeshPhysicalMaterial({
      color: 0x38352f,
      roughness: 0.42,
      metalness: 0.18,
      clearcoat: 0.16,
      clearcoatRoughness: 0.24,
    }),
    counterInset: new MeshStandardMaterial({
      color: 0x6a6258,
      roughness: 0.38,
      metalness: 0.2,
    }),
    counterEdge: new MeshStandardMaterial({
      color: 0x27251f,
      roughness: 0.36,
      metalness: 0.52,
    }),
    cabinet: new MeshStandardMaterial({
      color: 0x93897d,
      roughness: 0.5,
      metalness: 0.04,
    }),
    cabinetSide: new MeshStandardMaterial({
      color: 0x6f6558,
      roughness: 0.47,
      metalness: 0.05,
    }),
    sageDoor: new MeshStandardMaterial({
      color: 0x3c4e3f,
      roughness: 0.44,
      metalness: 0.04,
    }),
    sageInset: new MeshStandardMaterial({
      color: 0x6e806b,
      roughness: 0.5,
      metalness: 0.02,
    }),
    drawer: new MeshStandardMaterial({
      color: 0x5f584e,
      roughness: 0.46,
      metalness: 0.04,
    }),
    drawerInset: new MeshStandardMaterial({
      color: 0x938a78,
      roughness: 0.48,
      metalness: 0.02,
    }),
    rail: new MeshStandardMaterial({
      color: 0x8b714f,
      roughness: 0.3,
      metalness: 0.78,
    }),
    woodTrim: new MeshStandardMaterial({
      color: 0x936b46,
      roughness: 0.42,
      metalness: 0.06,
    }),
    toeKick: new MeshStandardMaterial({
      color: 0x293130,
      roughness: 0.32,
      metalness: 0.44,
    }),
    warmLight: new MeshBasicMaterial({
      color: 0xffcb7f,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      toneMapped: false,
    }),
  }

  function addRounded(name, width, height, depth, radius, material, x, y, z, options = {}) {
    const part = makeRoundedBox(width, height, depth, radius, material)
    part.name = name
    part.position.set(x, y, z)
    part.castShadow = options.castShadow ?? true
    part.receiveShadow = options.receiveShadow ?? true
    island.add(part)
    return part
  }

  // 上方两层采用低反射、耐酸石墨台面；台面最上方严格保持在 y=0.05。
  addRounded('island-counter-slab', 10.04, 0.22, 4.86, 0.08, materials.counter, 0, -0.06, 0)
  addRounded('island-counter-inset', 9.72, 0.012, 4.48, 0.045, materials.counterInset, 0, 0.052, 0, {
    castShadow: false,
  })
  addRounded('island-counter-front-edge', 9.88, 0.12, 0.1, 0.025, materials.counterEdge, 0, -0.11, 2.39)
  addRounded('island-counter-back-edge', 9.88, 0.07, 0.08, 0.02, materials.counterEdge, 0, -0.1, -2.37)

  // 柜体以暖灰作为结构，鼠尾草门板和金属框架在木色实验室中形成柔和焦点。
  addRounded('island-cabinet-core', 9.62, 3.7, 4.22, 0.07, materials.cabinet, 0, -2.02, 0)
  addRounded('island-left-side', 0.1, 3.48, 4.04, 0.025, materials.cabinetSide, -4.72, -2, 0)
  addRounded('island-right-side', 0.1, 3.48, 4.04, 0.025, materials.cabinetSide, 4.72, -2, 0)
  addRounded('island-front-frame', 9.46, 3.06, 0.055, 0.03, materials.cabinetSide, 0, -1.9, 2.125)

  const frontZ = 2.175
  const insetZ = 2.226
  const handleZ = 2.27
  const doorY = -1.9
  const doorHeight = 2.82
  const sideDoors = [
    [-3.76, 1.7],
    [-1.88, 1.7],
    [1.88, 1.7],
    [3.76, 1.7],
  ]

  sideDoors.forEach(([x, width], index) => {
    const door = addRounded(`island-door-${index}`, width, doorHeight, 0.085, 0.06, materials.sageDoor, x, doorY, frontZ)
    addRounded(`island-door-inset-${index}`, width - 0.18, doorHeight - 0.2, 0.018, 0.035, materials.sageInset, x, doorY, insetZ, {
      castShadow: false,
    })
    addRounded(`island-door-pull-${index}`, 0.48, 0.04, 0.075, 0.012, materials.rail, x, -0.92, handleZ, {
      castShadow: false,
    })
    door.userData.kind = 'cabinet-door'
  })

  const drawerSpecs = [
    [-0.86, 0.56],
    [-1.54, 0.68],
    [-2.48, 1.16],
  ]
  drawerSpecs.forEach(([y, height], index) => {
    addRounded(`island-drawer-${index}`, 1.98, height, 0.085, 0.055, materials.drawer, 0, y, frontZ)
    addRounded(`island-drawer-inset-${index}`, 1.78, height - 0.16, 0.018, 0.03, materials.drawerInset, 0, y, insetZ, {
      castShadow: false,
    })
    addRounded(`island-drawer-pull-${index}`, 0.62, 0.04, 0.075, 0.012, materials.rail, 0, y + height * 0.18, handleZ, {
      castShadow: false,
    })
  })

  ;[-2.82, -0.99, 0.99, 2.82].forEach((x, index) => {
    addRounded(`island-front-rail-${index}`, 0.035, 2.78, 0.04, 0.01, materials.rail, x, -1.9, 2.235, {
      castShadow: false,
    })
  })

  addRounded('island-front-wood-trim', 9.06, 0.085, 0.06, 0.02, materials.woodTrim, 0, -0.39, 2.24, {
    castShadow: false,
  })
  ;[-4.45, 4.45].forEach((x, index) => {
    addRounded(`island-wood-trim-${index}`, 0.07, 2.78, 0.06, 0.018, materials.woodTrim, x, -1.9, 2.24, {
      castShadow: false,
    })
  })

  addRounded('island-toe-kick', 9.24, 0.22, 3.78, 0.04, materials.toeKick, 0, -3.77, 0.05)
  addRounded('island-warm-underlight-left', 3.86, 0.045, 0.04, 0.012, materials.warmLight, -2.1, -3.63, 2.23, {
    castShadow: false,
    receiveShadow: false,
  })
  addRounded('island-warm-underlight-right', 3.86, 0.045, 0.04, 0.012, materials.warmLight, 2.1, -3.63, 2.23, {
    castShadow: false,
    receiveShadow: false,
  })

  ;[-4.18, 4.18].forEach((x, index) => {
    ;[-1.56, 1.56].forEach((z, depthIndex) => {
      const foot = new Mesh(new CylinderGeometry(0.13, 0.15, 0.16, 16), materials.toeKick)
      foot.name = `island-foot-${index}-${depthIndex}`
      foot.position.set(x, -3.96, z)
      foot.castShadow = true
      foot.receiveShadow = true
      island.add(foot)
    })
  })

  const contactShadow = new Mesh(
    new CircleGeometry(1, 64),
    new MeshBasicMaterial({ color: 0x29302a, transparent: true, opacity: 0.13, depthWrite: false }),
  )
  contactShadow.name = 'island-contact-shadow'
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.scale.set(5.12, 2.48, 1)
  contactShadow.position.set(0, -3.98, 0.35)
  contactShadow.renderOrder = -4
  island.add(contactShadow)
})()
