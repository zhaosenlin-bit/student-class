import * as THREE from 'three'
import { COLORS, setLiquidColor } from './materials.js'

const clamp = THREE.MathUtils.clamp
const smooth = THREE.MathUtils.smoothstep
const PALE_COPPER_SUPERNATANT = COLORS.copperBlue.clone().lerp(COLORS.clear, 0.72)

function updateFallingDrop(drop, from, to, phase) {
  const local = clamp(phase, 0, 1)
  drop.visible = local > 0.035 && local < 0.965
  if (!drop.visible) return
  const eased = local * local
  drop.position.lerpVectors(from, to, eased)
  drop.scale.set(1, 1.18 + local * 0.82, 1)
}

function localCycle(progress, start, end, drops = 1) {
  if (progress < start || progress >= end) return -1
  const local = (progress - start) / (end - start)
  return (local * drops) % 1
}

function dropperTip(dropper) {
  return dropper.position.clone().add(new THREE.Vector3(0, -0.2 * dropper.scale.y, 0))
}

function setDropperFill(dropper, factor) {
  const column = dropper.userData.innerColumn
  if (!column) return
  const fill = clamp(factor, 0.12, 1)
  column.scale.y = fill
  column.position.y = 0.24 + 0.38 * fill
}

function setLiquidLevel(vessel, factor) {
  const data = vessel.userData
  const surface = data.liquidSurface || data.surface
  const height = data.liquidHeight * factor
  data.liquid.scale.y = factor
  data.liquid.position.y = data.liquidBottomY + height / 2
  const surfaceY = data.liquidBottomY + height + 0.003
  surface.position.y = surfaceY
  if (data.meniscus) data.meniscus.position.y = surfaceY + 0.006
  if (data.ripple) data.ripple.position.y = surfaceY + 0.014
  return surfaceY
}

function updateRipple(vessel, cycle) {
  const ripple = vessel.userData.ripple
  if (!ripple) return
  const impact = cycle >= 0.7 ? clamp((cycle - 0.7) / 0.3, 0, 1) : -1
  ripple.visible = impact >= 0
  if (!ripple.visible) return
  const scale = 0.4 + impact * 1.15
  ripple.scale.set(scale, scale, scale)
}

function updateIndicators(station, progress) {
  station.droppers.forEach((dropper) => {
    const operating = dropper.userData.operatingPosition || dropper.position
    dropper.position.copy(operating)
    dropper.rotation.copy(dropper.userData.operatingRotation || new THREE.Euler())
  })
  station.wells.forEach((well, index) => {
    const start = index * 0.19
    const colorProgress = smooth(progress, start + 0.1, start + 0.27)
    setLiquidColor(well.liquid.material, COLORS.clear, well.target, colorProgress)
    const isColorChange = well.target !== COLORS.clear
    well.liquid.material.opacity = isColorChange ? THREE.MathUtils.lerp(0.28, 0.7, colorProgress) : 0.19
    well.rings.forEach((ring, ringIndex) => {
      const spread = clamp((progress - start - 0.075 - ringIndex * 0.035) / 0.19, 0, 1)
      ring.visible = spread > 0 && spread < 1
      const ringScale = 0.38 + spread * (2.25 + ringIndex * 0.42)
      ring.scale.set(ringScale, ringScale, 1)
      ring.material.opacity = Math.sin(spread * Math.PI) * (isColorChange ? 0.34 : 0.12)
    })
    const dropState = station.droplets[index]
    const atWell = smooth(progress, start, start + 0.045) * (1 - smooth(progress, start + 0.17, start + 0.225))
    if (atWell > 0.001) {
      const homeX = dropState.dropper.userData.operatingPosition?.x ?? dropState.dropper.position.x
      const homeZ = dropState.dropper.userData.operatingPosition?.z ?? 0.82
      dropState.dropper.position.x = THREE.MathUtils.lerp(homeX, dropState.to.x, atWell)
      dropState.dropper.position.z = THREE.MathUtils.lerp(homeZ, dropState.targetZ, atWell)
    }
    updateFallingDrop(dropState.droplet, dropperTip(dropState.dropper), dropState.to, (progress - start - 0.045) / 0.125)
  })
}

function updateMetal(station, progress, elapsed) {
  const addition = smooth(progress, 0.02, 0.18)
  // 胶头滴管只加入小量稀盐酸：终态液面仅刚好浸没锌粒。
  const surfaceY = setLiquidLevel(station.tube, 0.018 + addition * 0.322)
  setDropperFill(station.dropper, 1 - addition * 0.54)
  const reaction = smooth(progress, 0.14, 0.96)
  station.zinc.particles.forEach((particle, index) => {
    const shrink = 1 - reaction * (0.38 + (index % 3) * 0.06)
    particle.scale.copy(particle.userData.initialScale).multiplyScalar(shrink)
  })
  station.bubbles.bubbles.forEach((bubble) => {
    const data = bubble.userData
    bubble.visible = progress > 0.14 && progress < 0.985
    if (!bubble.visible) return
    const maxRise = Math.max(0.35, station.tube.position.y + surfaceY - station.bubbles.group.position.y - 0.06)
    const age = ((elapsed * data.speed + data.phase * 1.7) % 1.35) / 1.35
    const rise = Math.pow(age, 0.82) * maxRise
    const wobble = Math.sin(elapsed * (4.4 + data.speed) + data.phase * 11) * (0.012 + age * 0.025)
    bubble.position.set(data.x + wobble, 0.045 + rise, data.z + Math.cos(elapsed * 3.7 + data.phase * 9) * 0.012)
    const nucleation = smooth(age, 0, 0.14)
    const pop = 1 - smooth(age, 0.86, 1)
    const scale = data.size * (0.42 + age * 0.5) * nucleation * pop
    bubble.scale.setScalar(scale)
  })
  const atTube = smooth(progress, 0, 0.04) * (1 - smooth(progress, 0.18, 0.23))
  const homeX = station.dropper.userData.operatingPosition?.x ?? 0.34
  station.dropper.position.x = THREE.MathUtils.lerp(homeX, 0.1, atTube)
  const cycle = localCycle(progress, 0.035, 0.175, 6)
  const dropFrom = dropperTip(station.dropper)
  const dropTo = new THREE.Vector3(0.01, station.tube.position.y + surfaceY + 0.02, 0)
  updateFallingDrop(station.droplet, dropFrom, dropTo, cycle)
  updateRipple(station.tube, cycle)
}

function updateOxide(station, progress, elapsed) {
  const addition = smooth(progress, 0.035, 0.21)
  // 稀硫酸保持课堂小量原则，只形成覆盖 CuO 粉末的浅液层。
  const surfaceY = setLiquidLevel(station.tube, 0.018 + addition * 0.34)
  setDropperFill(station.dropper, 1 - addition * 0.58)
  const dissolve = smooth(progress, 0.28, 0.94)
  setLiquidColor(station.tube.userData.liquid.material, COLORS.clear, COLORS.copperBlue, dissolve)
  station.tube.userData.liquid.material.opacity = THREE.MathUtils.lerp(0.36, 0.62, dissolve)
  station.cuo.particles.forEach((particle, index) => {
    const remaining = clamp(1 - dissolve * 1.08 + (index % 5) * 0.018, 0, 1)
    particle.visible = remaining > 0.03
    particle.scale.copy(particle.userData.initialScale).multiplyScalar(Math.max(remaining, 0.04))
    particle.position.copy(particle.userData.initialPosition)
    particle.position.x += Math.sin(elapsed * 1.7 + index) * dissolve * 0.012
    particle.rotation.copy(particle.userData.initialRotation)
    particle.rotation.y += Math.sin(elapsed * 1.35 + index) * dissolve * 0.08
  })
  const convection = smooth(progress, 0.28, 0.48) * (1 - smooth(progress, 0.88, 0.98))
  station.dissolvedCopper.material.opacity = 0.12 + convection * 0.3
  station.dissolvedCopper.particles.forEach((particle) => {
    const data = particle.userData
    particle.visible = convection > 0.025 && data.threshold < dissolve
    if (!particle.visible) return
    const loop = (elapsed * data.speed * 0.18 + data.threshold) % 1
    const angle = data.angle + elapsed * data.speed * 1.45
    const radial = data.radial * (0.45 + loop * 0.55)
    particle.position.set(Math.cos(angle) * radial, 0.28 + loop * 1.02, Math.sin(angle) * radial * 0.55)
    particle.scale.setScalar(data.size * (0.55 + Math.sin(loop * Math.PI) * 0.65) * convection)
  })
  const atTube = smooth(progress, 0.01, 0.05) * (1 - smooth(progress, 0.21, 0.25))
  const homeX = station.dropper.userData.operatingPosition?.x ?? 0.76
  station.dropper.position.x = THREE.MathUtils.lerp(homeX, 0.58, atTube)
  const cycle = localCycle(progress, 0.045, 0.205, 7)
  const dropFrom = dropperTip(station.dropper)
  const tubeTilt = -station.tube.rotation.z
  const rotatedSurfaceX = station.tube.position.x + Math.sin(tubeTilt) * surfaceY
  const rotatedSurfaceY = station.tube.position.y + Math.cos(tubeTilt) * surfaceY
  updateFallingDrop(station.droplet, dropFrom, new THREE.Vector3(rotatedSurfaceX, rotatedSurfaceY + 0.03, 0), cycle)
  updateRipple(station.tube, cycle)

  const heatOn = progress > 0.2 && progress < 0.93
  station.burner.userData.outerFlame.visible = heatOn
  station.burner.userData.innerFlame.visible = heatOn
  if (heatOn) {
    const flicker = 1 + Math.sin(elapsed * 11) * 0.04
    station.burner.userData.outerFlame.scale.set(1 / flicker, flicker, 1 / flicker)
    station.burner.userData.innerFlame.scale.set(1, 0.96 + Math.sin(elapsed * 13) * 0.035, 1)
  }
}

function updateNeutralization(station, progress, elapsed) {
  const levelFactor = 0.84 + smooth(progress, 0.08, 0.9) * 0.16
  const surfaceY = setLiquidLevel(station.beaker, levelFactor)
  const fade = smooth(progress, 0.22, 0.9)
  setLiquidColor(station.beaker.userData.liquid.material, COLORS.phenolPink, COLORS.clear, fade)
  station.beaker.userData.liquid.material.opacity = THREE.MathUtils.lerp(0.54, 0.2, fade)
  const stirring = smooth(progress, 0.08, 0.2) * (1 - smooth(progress, 0.91, 0.98))
  station.rodPivot.rotation.y = Math.sin(elapsed * 4.6) * 0.13 * stirring
  station.rodPivot.position.x = 0.24 + Math.sin(elapsed * 3.2) * 0.08 * stirring
  station.rodPivot.position.z = Math.cos(elapsed * 3.2) * 0.055 * stirring
  station.mixingCloud.material.opacity = 0.08 + (1 - fade) * stirring * 0.28
  station.mixingCloud.particles.forEach((particle) => {
    const data = particle.userData
    const persistence = 1 - fade * (0.74 + data.threshold * 0.34)
    particle.visible = stirring > 0.025 && persistence > 0.04
    if (!particle.visible) return
    const angle = data.angle + elapsed * (1.45 + data.speed * 0.72)
    const pulse = 0.78 + Math.sin(elapsed * 2.2 + data.phase) * 0.16
    const radial = data.radial * pulse * (0.62 + data.y * 0.28)
    particle.position.set(
      Math.cos(angle) * radial,
      0.18 + ((data.y + elapsed * data.speed * 0.055) % 0.72),
      Math.sin(angle) * radial * 0.7,
    )
    const parcel = data.size * persistence * (0.65 + Math.sin(data.phase + elapsed * 3) * 0.16)
    particle.scale.set(parcel * 1.35, parcel * 0.52, parcel)
  })
  const atBeaker = smooth(progress, 0.01, 0.07) * (1 - smooth(progress, 0.91, 0.98))
  station.dropper.position.x = THREE.MathUtils.lerp(0.58, 0.16, atBeaker)
  const cycle = localCycle(progress, 0.08, 0.9, 8)
  const from = dropperTip(station.dropper)
  const target = new THREE.Vector3(0.15, station.beaker.position.y + surfaceY + 0.025, 0)
  updateFallingDrop(station.droplet, from, target, cycle)
  updateRipple(station.beaker, cycle)
}

function updateSalt(station, progress, elapsed) {
  const form = smooth(progress, 0.12, 0.5)
  const dissolve = smooth(progress, 0.6, 0.96)
  const amount = clamp(form * (1 - dissolve), 0, 1)
  const surfaceY = setLiquidLevel(station.tube, 0.86 + form * 0.08 + dissolve * 0.08)
  const settle = smooth(progress, 0.28, 0.54)
  station.precipitate.particles.forEach((particle) => {
    const data = particle.userData
    const formation = clamp((form - data.threshold * 0.16) / 0.84, 0, 1)
    const erosion = clamp((dissolve - data.threshold * 0.2) / 0.8, 0, 1)
    const particleAmount = formation * (1 - erosion)
    particle.visible = particleAmount > 0.025
    if (!particle.visible) return
    const settledY = 0.14 + data.y * 0.34
    particle.position.set(
      data.x + Math.sin(elapsed * 1.2 + data.drift) * 0.012 * (1 - settle),
      THREE.MathUtils.lerp(data.y, settledY, clamp(settle * data.fallSpeed, 0, 1)),
      data.z + Math.cos(elapsed * 0.9 + data.drift) * 0.008 * (1 - settle),
    )
    const flocculation = 0.22 + formation * (0.92 + data.threshold * 0.28)
    particle.scale.setScalar(data.scale * flocculation * smooth(particleAmount, 0, 0.34))
  })
  const nucleiActivity = form * (1 - smooth(progress, 0.46, 0.58)) + dissolve * (1 - dissolve) * 0.45
  station.reactionNuclei.material.opacity = 0.18 + nucleiActivity * 0.34
  station.reactionNuclei.particles.forEach((particle) => {
    const data = particle.userData
    particle.visible = nucleiActivity > 0.025 && data.threshold < clamp(form + 0.18, 0, 1)
    if (!particle.visible) return
    const fall = clamp(form * data.fallSpeed, 0, 1)
    particle.position.set(
      Math.cos(data.angle + elapsed * 0.65) * data.radial,
      THREE.MathUtils.lerp(data.y, 0.18 + data.y * 0.26, fall),
      Math.sin(data.angle + elapsed * 0.65) * data.radial,
    )
    particle.scale.setScalar(data.size * (0.55 + nucleiActivity * 0.8))
  })
  if (progress < 0.58) {
    setLiquidColor(station.tube.userData.liquid.material, COLORS.copperBlue, PALE_COPPER_SUPERNATANT, form)
  } else {
    setLiquidColor(station.tube.userData.liquid.material, PALE_COPPER_SUPERNATANT, COLORS.copperBlue, dissolve * 0.9)
  }
  station.tube.userData.liquid.material.opacity = THREE.MathUtils.lerp(0.54, 0.62, dissolve)

  const baseAtTube = smooth(progress, 0.02, 0.1) * (1 - smooth(progress, 0.5, 0.58))
  const acidAtTube = smooth(progress, 0.54, 0.62) * (1 - smooth(progress, 0.96, 1))
  const baseHomeX = station.baseDropper.userData.operatingPosition?.x ?? -0.62
  const acidHomeX = station.acidDropper.userData.operatingPosition?.x ?? 0.62
  station.baseDropper.position.x = THREE.MathUtils.lerp(baseHomeX, -0.08, baseAtTube)
  station.acidDropper.position.x = THREE.MathUtils.lerp(acidHomeX, 0.08, acidAtTube)
  const baseCycle = localCycle(progress, 0.08, 0.5, 5)
  const acidCycle = localCycle(progress, 0.62, 0.96, 5)
  const target = new THREE.Vector3(0, station.tube.position.y + surfaceY + 0.02, 0)
  updateFallingDrop(
    station.baseDroplet,
    dropperTip(station.baseDropper),
    target,
    baseCycle,
  )
  updateFallingDrop(
    station.acidDroplet,
    dropperTip(station.acidDropper),
    target,
    acidCycle,
  )
  updateRipple(station.tube, acidCycle >= 0 ? acidCycle : baseCycle)
}

function updateSummary(summary, progress) {
  const capMove = smooth(progress, 0.08, 0.3)
  summary.burner.userData.cap.position.lerpVectors(new THREE.Vector3(0.62, 0.24, 0), new THREE.Vector3(0, 1.06, 0), capMove)
  summary.burner.userData.cap.rotation.z = THREE.MathUtils.lerp(Math.PI / 2, 0, capMove)
  summary.burner.userData.outerFlame.visible = capMove < 0.82
  summary.burner.userData.innerFlame.visible = capMove < 0.82

  const capBottles = smooth(progress, 0.28, 0.58)
  summary.bottles.forEach((bottle, index) => {
    bottle.userData.stopper.visible = true
    bottle.userData.stopper.position.y = 2.0 + (1 - capBottles) * (0.34 + index * 0.018)
  })
  const returnDroppers = smooth(progress, 0.5, 0.86)
  summary.droppers.forEach((dropper) => {
    dropper.position.lerpVectors(dropper.userData.operatingPosition, dropper.userData.homePosition, returnDroppers)
    dropper.rotation.copy(dropper.userData.operatingRotation)
    dropper.rotation.z = THREE.MathUtils.lerp(dropper.userData.operatingRotation.z, dropper.userData.homeRotationZ, returnDroppers)
  })
  summary.caption.visible = progress > 0.86
}

function updateStation(apparatus, step, progress, elapsed) {
  const station = apparatus.stations[step]
  if (step === 0) updateIndicators(station, progress)
  if (step === 1) updateMetal(station, progress, elapsed)
  if (step === 2) updateOxide(station, progress, elapsed)
  if (step === 3) updateNeutralization(station, progress, elapsed)
  if (step === 4) updateSalt(station, progress, elapsed)
}

function restoreOperatingPoses(apparatus) {
  apparatus.summary.droppers.forEach((dropper) => {
    dropper.position.copy(dropper.userData.operatingPosition)
    dropper.rotation.copy(dropper.userData.operatingRotation)
  })
  apparatus.summary.bottles.forEach((bottle) => {
    bottle.userData.stopper.position.y = 2.0
    bottle.userData.stopper.visible = false
  })
  const burner = apparatus.summary.burner
  burner.userData.cap.position.set(0.62, 0.24, 0)
  burner.userData.cap.rotation.z = Math.PI / 2
  burner.userData.outerFlame.visible = false
  burner.userData.innerFlame.visible = false
  apparatus.summary.caption.visible = false
}

export function restoreNarrativeState(apparatus, activeStep) {
  restoreOperatingPoses(apparatus)
  for (let step = 0; step < 5; step += 1) {
    const snapshotProgress = activeStep === 5 || step < activeStep ? 1 : 0
    updateStation(apparatus, step, snapshotProgress, 0)
  }
}

export function updatePhenomena(apparatus, step, progress, elapsed) {
  if (step < 5) updateStation(apparatus, step, progress, elapsed)
  else updateSummary(apparatus.summary, progress)
}
