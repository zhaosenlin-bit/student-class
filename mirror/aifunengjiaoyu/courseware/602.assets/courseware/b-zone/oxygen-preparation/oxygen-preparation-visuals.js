/**
 * [INPUT]: 依赖氧气制取页内联 Three.js 场景暴露的 __OXYGEN_PREPARATION__。
 * [OUTPUT]: 重做前景器材的玻璃、水体、液面、集气瓶与无色氧气泡视觉。
 * [POS]: B 区氧气制取第一批视觉升级；刻意不修改实验室背景、柜体与 UI。
 */

(() => {
  const lab = window.__OXYGEN_PREPARATION__
  if (!lab) return

  const {
    THREE,
    makeRoundedBox,
    materials,
    objects,
    state,
  } = lab
  const {
    CircleGeometry,
    Color,
    CylinderGeometry,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    ShaderMaterial,
    IcosahedronGeometry,
    TorusGeometry,
  } = THREE

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const shaderTime = () => reducedMotion.matches ? 0 : performance.now() / 1000

  function tuneMaterial(material, values) {
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'color' || key === 'emissive' || key === 'attenuationColor' || key === 'specularColor') {
        material[key]?.setHex(value)
        return
      }
      material[key] = value
    })
    material.needsUpdate = true
  }

  // Water Lab 的核心做法是低透明玻璃壳叠加边缘高光，而不是把低 opacity
  // 与高 transmission 混在同一材质里。这样在明亮实验室里不会出现灰奶雾。
  tuneMaterial(materials.glass, {
    color: 0xa9d2da,
    transmission: 0,
    transparent: true,
    opacity: 0.17,
    roughness: 0.045,
    metalness: 0,
    ior: 1.46,
    thickness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 1.45,
    side: DoubleSide,
    depthWrite: false,
  })
  tuneMaterial(materials.glassInner, {
    color: 0xbfe7ef,
    transmission: 0,
    transparent: true,
    opacity: 0.035,
    roughness: 0.07,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.04,
    side: DoubleSide,
    depthWrite: false,
  })
  tuneMaterial(materials.glassEdge, {
    color: 0x78a6b1,
    transparent: true,
    opacity: 0.88,
    roughness: 0.13,
    metalness: 0.02,
    depthWrite: false,
  })
  tuneMaterial(materials.steel, {
    color: 0x7f8d90,
    roughness: 0.2,
    metalness: 0.82,
  })
  tuneMaterial(materials.darkSteel, {
    color: 0x1c2426,
    roughness: 0.28,
    metalness: 0.74,
  })
  tuneMaterial(materials.brass, {
    color: 0xb9853f,
    roughness: 0.24,
    metalness: 0.72,
  })
  tuneMaterial(materials.rubber, {
    color: 0x151a1b,
    roughness: 0.72,
    metalness: 0,
  })
  tuneMaterial(materials.amber, {
    color: 0xd5a15a,
    transmission: 0,
    transparent: true,
    opacity: 0.38,
    roughness: 0.18,
    clearcoat: 0.62,
    clearcoatRoughness: 0.08,
    depthWrite: false,
  })

  function createGlassFresnelMaterial(opacity = 0.42) {
    return new ShaderMaterial({
      uniforms: {
        uEdgeColor: { value: new Color(0x70a8b6) },
        uCoreColor: { value: new Color(0x4f8998) },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDirection = normalize(cameraPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uEdgeColor;
        uniform vec3 uCoreColor;
        uniform float uOpacity;
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        void main() {
          float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
          float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.35);
          vec3 color = mix(uCoreColor, uEdgeColor, 0.55 + rim * 0.45);
          float alpha = uOpacity * (0.035 + rim * 0.78);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: 1,
    })
  }

  function createLiquidVolumeMaterial({ minY, maxY, bottom, top, bottomAlpha, topAlpha }) {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMinY: { value: minY },
        uMaxY: { value: maxY },
        uBottom: { value: new Color(bottom) },
        uTop: { value: new Color(top) },
        uHighlight: { value: new Color(0xdffcff) },
        uBottomAlpha: { value: bottomAlpha },
        uTopAlpha: { value: topAlpha },
      },
      vertexShader: `
        varying vec3 vLocalPosition;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vLocalPosition = position;
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDirection = normalize(cameraPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uMinY;
        uniform float uMaxY;
        uniform vec3 uBottom;
        uniform vec3 uTop;
        uniform vec3 uHighlight;
        uniform float uBottomAlpha;
        uniform float uTopAlpha;
        varying vec3 vLocalPosition;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        void main() {
          float depth = smoothstep(uMinY, uMaxY, vLocalPosition.y);
          float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
          float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), 2.45);
          float bandA = sin(vWorldPosition.x * 2.15 + vWorldPosition.z * 1.35 + uTime * 0.42);
          float bandB = sin(vWorldPosition.x * -1.1 + vWorldPosition.z * 2.8 - uTime * 0.31);
          float flow = smoothstep(0.48, 0.96, 0.5 + 0.25 * bandA + 0.25 * bandB);
          vec3 color = mix(uBottom, uTop, depth);
          color = mix(color, uHighlight, fresnel * 0.22 + flow * (0.035 + depth * 0.045));
          float alpha = mix(uBottomAlpha, uTopAlpha, depth) + fresnel * 0.13;
          gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })
  }

  function createLiquidSurfaceMaterial(amplitude) {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColor: { value: new Color(0x83deef) },
        uHighlight: { value: new Color(0xf2ffff) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAmplitude;
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        varying float vWave;
        void main() {
          vec3 transformed = position;
          float waveA = sin(position.x * 3.2 + uTime * 0.72);
          float waveB = sin(position.y * 4.4 - uTime * 0.55);
          vWave = 0.5 + 0.25 * waveA + 0.25 * waveB;
          transformed.z += (waveA + waveB) * uAmplitude;
          vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDirection = normalize(cameraPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uHighlight;
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        varying float vWave;
        void main() {
          float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
          float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), 2.1);
          float glint = smoothstep(0.76, 1.0, vWave);
          vec3 color = mix(uColor, uHighlight, 0.18 + fresnel * 0.5 + glint * 0.18);
          float alpha = 0.36 + fresnel * 0.28 + glint * 0.08;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })
  }

  function bindShaderTime(mesh) {
    mesh.onBeforeRender = () => {
      if (mesh.material.uniforms?.uTime) mesh.material.uniforms.uTime.value = shaderTime()
    }
  }

  // 硬质试管沿用已校准的 12° 管口下倾和药品位置，只替换玻璃层次。
  const tubeFresnel = new Mesh(objects.tubeOuter.geometry, createGlassFresnelMaterial(0.62))
  tubeFresnel.name = 'tube-fresnel-shell'
  tubeFresnel.position.copy(objects.tubeOuter.position)
  tubeFresnel.rotation.copy(objects.tubeOuter.rotation)
  tubeFresnel.scale.copy(objects.tubeOuter.scale)
  tubeFresnel.renderOrder = 19
  objects.tubeGroup.add(tubeFresnel)
  objects.tubeOuter.renderOrder = 12
  objects.tubeInner.renderOrder = 13
  objects.tubeOuterLip.renderOrder = 20
  objects.tubeInnerLip.renderOrder = 21
  objects.tubeClampRing.visible = false
  const clampPadMaterial = materials.rubber.clone()
  ;[objects.tubeClampTop, objects.tubeClampBottom].forEach((pad) => {
    pad.material = clampPadMaterial
    pad.scale.set(0.9, 0.85, 2.45)
  })
  const clampJawMaterial = materials.darkSteel.clone()
  ;[-0.385, 0.385].forEach((y, index) => {
    const jaw = makeRoundedBox(0.15, 0.065, 0.62, 0.022, clampJawMaterial)
    jaw.name = `tube-clamp-jaw-${index}`
    jaw.position.set(0.36, y, 0)
    jaw.castShadow = true
    objects.tubeGroup.add(jaw)
  })
  tuneMaterial(objects.deliveryCore.material, {
    color: 0xf4feff,
    transmission: 0,
    transparent: true,
    opacity: 0.045,
    roughness: 0.05,
    depthWrite: false,
  })

  // 水槽保留原位与外形尺寸，换成低透明玻璃墙，并补齐四边厚口沿和 Fresnel 高光。
  const troughWalls = [
    objects.troughFloor,
    objects.troughBack,
    objects.troughFront,
    objects.troughLeft,
    objects.troughRight,
  ]
  troughWalls.forEach((part, index) => {
    const shell = new Mesh(part.geometry, createGlassFresnelMaterial(index === 0 ? 0.18 : 0.3))
    shell.name = `trough-fresnel-${index}`
    shell.position.copy(part.position)
    shell.rotation.copy(part.rotation)
    shell.scale.copy(part.scale)
    shell.renderOrder = 20 + index
    objects.trough.add(shell)
  })

  const rimMaterial = new MeshBasicMaterial({
    color: 0xcdf8ff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: 2,
    toneMapped: false,
  })
  const troughRimParts = [
    [3.46, 0.024, 0.026, 0, 1.348, -1.025],
    [3.46, 0.024, 0.026, 0, 1.348, 1.025],
    [0.026, 0.024, 2.05, -1.725, 1.348, 0],
    [0.026, 0.024, 2.05, 1.725, 1.348, 0],
  ]
  troughRimParts.forEach(([width, height, depth, x, y, z], index) => {
    const rim = makeRoundedBox(width, height, depth, 0.01, rimMaterial)
    rim.name = `trough-lip-${index}`
    rim.position.set(x, y, z)
    rim.renderOrder = 30
    objects.trough.add(rim)
  })

  const troughVolumeMaterial = createLiquidVolumeMaterial({
    minY: -0.42,
    maxY: 0.42,
    bottom: 0x07529a,
    top: 0x4fc3e5,
    bottomAlpha: 0.9,
    topAlpha: 0.64,
  })
  objects.troughWater.material = troughVolumeMaterial
  objects.troughWater.renderOrder = 14
  bindShaderTime(objects.troughWater)

  objects.troughSurface.geometry.dispose()
  objects.troughSurface.geometry = new PlaneGeometry(3.28, 1.88, 48, 24)
  objects.troughSurface.material = createLiquidSurfaceMaterial(0.006)
  objects.troughSurface.renderOrder = 27
  bindShaderTime(objects.troughSurface)

  const waterlineParts = [
    [3.25, 0.012, 0.018, 0, 1.03, -0.94],
    [3.25, 0.012, 0.018, 0, 1.03, 0.94],
    [0.018, 0.012, 1.88, -1.625, 1.03, 0],
    [0.018, 0.012, 1.88, 1.625, 1.03, 0],
  ]
  waterlineParts.forEach(([width, height, depth, x, y, z], index) => {
    const line = makeRoundedBox(width, height, depth, 0.006, rimMaterial)
    line.name = `trough-meniscus-${index}`
    line.position.set(x, y, z)
    line.renderOrder = 31
    objects.trough.add(line)
  })

  // 原集气瓶肩部会像细颈药剂瓶。这里换成等径宽口圆筒、平厚底和水下双卷边。
  objects.jarOuter.visible = false
  objects.jarInner.visible = false
  objects.jarOuterLip.visible = false
  objects.jarInnerLip.visible = false
  objects.jarHighlight.visible = false

  const jarShellMaterial = materials.glass.clone()
  tuneMaterial(jarShellMaterial, { opacity: 0.095 })
  const jarWallGeometry = new CylinderGeometry(0.49, 0.49, 1.86, 64, 1, true)
  const jarWall = new Mesh(jarWallGeometry, jarShellMaterial)
  jarWall.name = 'collector-jar-wall'
  jarWall.position.y = 0.02
  jarWall.renderOrder = 18
  objects.jar.add(jarWall)

  const jarFresnel = new Mesh(jarWallGeometry, createGlassFresnelMaterial(0.52))
  jarFresnel.name = 'collector-jar-fresnel'
  jarFresnel.position.y = 0.02
  jarFresnel.renderOrder = 22
  objects.jar.add(jarFresnel)

  const jarCap = new Mesh(
    new CylinderGeometry(0.465, 0.49, 0.075, 64, 1, false),
    jarShellMaterial.clone(),
  )
  jarCap.name = 'collector-jar-closed-bottom'
  jarCap.position.y = 0.962
  jarCap.renderOrder = 19
  objects.jar.add(jarCap)

  function addJarRing(name, radius, tube, y, material, renderOrder) {
    const ring = new Mesh(new TorusGeometry(radius, tube, 12, 64), material)
    ring.name = name
    ring.rotation.x = Math.PI / 2
    ring.position.y = y
    ring.renderOrder = renderOrder
    objects.jar.add(ring)
    return ring
  }

  addJarRing('collector-jar-top-edge', 0.475, 0.018, 0.987, materials.glassEdge, 26)
  addJarRing('collector-jar-mouth-outer', 0.505, 0.038, -0.915, materials.glassEdge, 27)
  addJarRing('collector-jar-mouth-inner', 0.445, 0.014, -0.916, rimMaterial, 28)

  const jarVolumeMaterial = createLiquidVolumeMaterial({
    minY: -0.81,
    maxY: 0.81,
    bottom: 0x084b91,
    top: 0x4dc2e4,
    bottomAlpha: 0.86,
    topAlpha: 0.6,
  })
  objects.jarWater.material = jarVolumeMaterial
  objects.jarWater.scale.x = 1.055
  objects.jarWater.scale.z = 1.055
  objects.jarWater.renderOrder = 14
  objects.jarWater.onBeforeRender = () => {
    jarVolumeMaterial.uniforms.uTime.value = shaderTime()
    const waterBottom = -0.82
    const waterTop = 0.89 - state.collectProgress * 1.264
    const waterHeight = Math.max(0.12, waterTop - waterBottom)
    objects.jarWater.scale.y = waterHeight / 1.62
    objects.jarWater.position.y = waterBottom + waterHeight / 2
    objects.jarSurface.position.y = waterTop
  }

  objects.jarSurface.geometry.dispose()
  objects.jarSurface.geometry = new CircleGeometry(0.438, 64)
  objects.jarSurface.material = createLiquidSurfaceMaterial(0.004)
  objects.jarSurface.renderOrder = 27
  bindShaderTime(objects.jarSurface)

  const jarMeniscus = addJarRing(
    'collector-jar-meniscus',
    0.438,
    0.012,
    objects.jarSurface.position.y,
    rimMaterial,
    31,
  )
  jarMeniscus.onBeforeRender = () => {
    jarMeniscus.position.y = objects.jarSurface.position.y
  }

  // 氧气本体无色。这里只在已排开水的空间保留极弱的边缘折光，不做蓝色烟雾。
  const gasMaterial = new ShaderMaterial({
    uniforms: {
      uFill: { value: 0 },
      uEdgeColor: { value: new Color(0xf3ffff) },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uFill;
      uniform vec3 uEdgeColor;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;
      void main() {
        float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
        float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.8);
        gl_FragColor = vec4(uEdgeColor, (0.004 + rim * 0.075) * uFill);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  const gasVolume = new Mesh(
    new CylinderGeometry(0.432, 0.432, 1, 48, 1, false),
    gasMaterial,
  )
  gasVolume.name = 'colorless-oxygen-volume'
  gasVolume.renderOrder = 25
  gasVolume.onBeforeRender = () => {
    const waterTop = objects.jarSurface.position.y
    const gasTop = 0.91
    const height = Math.max(0.001, gasTop - waterTop)
    const fill = Math.min(1, Math.max(0, state.collectProgress))
    gasVolume.position.y = waterTop + height / 2
    gasVolume.scale.y = height
    gasMaterial.uniforms.uFill.value = fill
  }
  objects.jar.add(gasVolume)

  // 空心、无色、尺寸随机的氧气泡；主动画仍负责真实的导管路径和步骤显隐。
  const previousBubbleGeometry = objects.bubbles[0]?.geometry
  const bubbleGeometry = new IcosahedronGeometry(0.062, 3)
  objects.bubbles.forEach((bubble, index) => {
    const bubbleMaterial = new ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.22 },
        uEdgeColor: { value: new Color(0xf6ffff) },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDirection = normalize(cameraPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uEdgeColor;
        varying vec3 vWorldNormal;
        varying vec3 vViewDirection;
        void main() {
          vec3 normal = normalize(vWorldNormal);
          vec3 viewDirection = normalize(vViewDirection);
          float facing = abs(dot(normal, viewDirection));
          float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.7);
          float highlight = pow(max(dot(normal, normalize(viewDirection + vec3(-0.25, 0.85, 0.3))), 0.0), 16.0);
          float alpha = uOpacity * (0.025 + rim * 0.78 + highlight * 0.48);
          gl_FragColor = vec4(uEdgeColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: 2,
      toneMapped: false,
    })
    bubbleMaterial.opacity = 0.3
    bubble.geometry = bubbleGeometry
    bubble.material = bubbleMaterial
    bubble.userData.baseScale = 0.58 + ((index * 7) % 12) * 0.055
    bubble.userData.offset = Math.sin(index * 4.73) * 0.078
    bubble.userData.speed = 0.86 + ((index * 5) % 9) * 0.055
    bubble.onBeforeRender = () => {
      const time = shaderTime()
      let opacity = Math.min(0.48, Math.max(0.08, bubbleMaterial.opacity * 0.58))
      bubble.scale.y = bubble.scale.x * (0.92 + Math.sin(time * 2.2 + index) * 0.14)
      bubble.scale.z = bubble.scale.x * (0.88 + Math.cos(time * 1.7 + index * 0.7) * 0.1)
      if (state.step === 3 && bubble.position.x > 2) {
        const surfaceWorldY = objects.jar.position.y + objects.jarSurface.position.y
        const distanceToSurface = surfaceWorldY - bubble.position.y
        opacity *= Math.min(1, Math.max(0, distanceToSurface / 0.12))
        if (distanceToSurface > 0) {
          bubble.position.x += Math.sin(time * 1.65 + index * 2.1) * 0.024
          bubble.position.z += Math.cos(time * 1.38 + index * 1.7) * 0.065
        }
      }
      bubbleMaterial.uniforms.uOpacity.value = opacity
    }
  })
  previousBubbleGeometry?.dispose()

  objects.ripples.forEach((ripple, index) => {
    tuneMaterial(ripple.material, {
      color: index % 2 ? 0xe8ffff : 0x9eeafa,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: 2,
    })
  })
})()
