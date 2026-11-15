/**
 * [INPUT]: stations.js 的 rig、timeline.js 的 pose()。
 * [OUTPUT]: applyPose —— 把纯状态施加到三维对象；createLesson —— 播放 / 暂停 /
 *           跳步 / 重置的教学状态机（点击任一步骤都从该步 t=0 的确定状态开始）。
 * [POS]: 状态机层。所有可见变化都必须来自 pose()，本文件只负责“施加”，
 *        以及不影响状态正确性的时间性微动（火焰摆动、蒸汽漂移、搅拌圆周等）。
 */
import { MathUtils, Vector3 } from './lib.js'
import { LEVELS, POSE, SPOUTS, metrics, pose, sm, spoutWorld } from './timeline.js'

const UP = new Vector3(0, 1, 0)
const tmpA = new Vector3()
const tmpB = new Vector3()
const tmpDir = new Vector3()

function setPose(object, p) {
  object.position.set(p.p[0], p.p[1], p.p[2])
  object.rotation.set(p.r[0], p.r[1], p.r[2])
}

/** 由两端点摆放玻璃棒（下端优先精确落位）。 */
function placeRod(rig, bottom, top) {
  tmpA.set(bottom[0], bottom[1], bottom[2])
  tmpB.set(top[0], top[1], top[2])
  tmpDir.subVectors(tmpB, tmpA).normalize()
  rig.rod.group.quaternion.setFromUnitVectors(UP, tmpDir)
  rig.rod.group.position.copy(tmpA).add(tmpDir.multiplyScalar(rig.rod.halfLength))
}

/** 天平托盘顶面的世界坐标（跟随梁的倾斜）。 */
function panTopWorld(rig, side, tilt) {
  const bx = rig.balance.group.position.x
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return [bx + side * 0.77 * c, 1.07 + side * 0.77 * s + 0.19, rig.balance.group.position.z]
}

export function applyPose(rig, P, time, camera) {
  const L = rig.LAYOUT

  /* ---- 称量工位 ---- */
  const tilt = P.balanceTilt + Math.sin(time * 7.4) * P.balanceOsc
  rig.balance.setTilt(tilt)
  setPose(rig.spoon.group, P.spoon)
  rig.spoonSalt.userData.setAmount(P.spoonLoad)

  if (P.weight.onPan) {
    const [wx, wy, wz] = panTopWorld(rig, 1, tilt)
    rig.balance.weight.position.set(wx, wy, wz)
    rig.balance.weight.rotation.set(0, 0, 0)
  } else setPose(rig.balance.weight, P.weight)

  if (P.paperMode === 'pan') {
    const [px, py, pz] = panTopWorld(rig, -1, tilt)
    rig.weighPaper.group.position.set(px, py, pz)
    rig.weighPaper.group.rotation.set(0, 0, 0)
  } else setPose(rig.weighPaper.group, P.paper)
  rig.paperSalt.userData.setAmount(P.paperSalt)

  if (P.saltFall) {
    rig.streams.saltDump.set(
      tmpA.set(P.saltFall.from[0], P.saltFall.from[1], P.saltFall.from[2]),
      tmpB.set(P.saltFall.to[0], P.saltFall.to[1], P.saltFall.to[2]),
      0.045 * P.saltFall.k,
    )
    rig.fallingSalt.visible = true
    rig.fallingSalt.userData.setAmount(P.saltFall.k)
    rig.fallingSalt.children.forEach((grain, i) => {
      const cyc = (time * 1.7 + i * 0.13) % 1
      grain.position.set(
        MathUtils.lerp(P.saltFall.from[0], P.saltFall.to[0], cyc) + Math.sin(i * 3.1) * 0.05,
        MathUtils.lerp(P.saltFall.from[1], P.saltFall.to[1], cyc),
        MathUtils.lerp(P.saltFall.from[2], P.saltFall.to[2], cyc) + Math.cos(i * 2.3) * 0.04,
      )
    })
  } else {
    rig.streams.saltDump.hide()
    rig.fallingSalt.visible = false
  }

  /* ---- 溶解工位 ---- */
  setPose(rig.beakerA.group, P.beakerA)
  rig.beakerASalt.userData.setAmount(P.beakerASalt)
  rig.beakerASand.userData.setAmount(P.beakerASand)
  rig.beakerA.liquid.setLevel(P.beakerALevel)
  rig.beakerA.liquid.setMurk(P.beakerAMurk)
  rig.beakerA.liquid.setTime(time)

  rig.specks.userData.setAmount(P.speckAmount)
  rig.specks.children.forEach((grain, i) => {
    const swirlAngle = time * (0.9 + (i % 4) * 0.32) + grain.userData.orbitPhase
    const settle = MathUtils.lerp(0.3, 1, P.speckSwirl)
    grain.position.x = Math.cos(swirlAngle) * grain.userData.orbitR * (0.4 + P.speckSwirl)
    grain.position.z = Math.sin(swirlAngle) * grain.userData.orbitR * (0.4 + P.speckSwirl) * 0.8
    grain.position.y = grain.userData.baseY * settle
      * Math.min(1, P.beakerALevel / LEVELS.beakerAFull + 0.15)
      + Math.sin(time * 1.6 + i) * 0.02 * P.speckSwirl
  })

  setPose(rig.cylinder.group, P.cylinder)
  rig.cylinder.liquid.setLevel(P.cylLevel)
  rig.cylinder.liquid.setTime(time)
  if (P.cylPourOn) {
    const lip = spoutWorld(P.cylinder, SPOUTS.cylinder)
    rig.streams.cylPour.set(
      tmpA.set(lip[0], lip[1], lip[2]),
      tmpB.set(L.beakerA.x + 0.14, 0.08 + P.beakerALevel * 0.9, L.beakerA.z),
      0.035, 0.05,
    )
  } else rig.streams.cylPour.hide()

  /* ---- 玻璃棒（含搅拌圆周） ---- */
  let rodBottom = P.rod.b
  if (P.stirA > 0.01) {
    const a = time * 3.1
    rodBottom = [P.rod.b[0] + Math.cos(a) * 0.13 * P.stirA, P.rod.b[1], P.rod.b[2] + Math.sin(a) * 0.1 * P.stirA]
  } else if (P.stirDish > 0.01) {
    const a = time * 2.6
    rodBottom = [P.rod.b[0] + Math.cos(a) * 0.26 * P.stirDish, P.rod.b[1], P.rod.b[2] + Math.sin(a) * 0.16 * P.stirDish]
  }
  placeRod(rig, rodBottom, P.rod.t)

  /* ---- 过滤工位 ---- */
  const fold = P.fold
  const montageAnchor = [L.funnelAxis.x, 2.86, 0.42]
  ;[['flat', rig.paperSet.flat], ['half', rig.paperSet.half], ['quarter', rig.paperSet.quarter]]
    .forEach(([key, object]) => {
      const k = fold[key]
      object.visible = k > 0.01
      object.position.set(montageAnchor[0], montageAnchor[1], montageAnchor[2])
      object.rotation.x = -1.18
      object.rotation.z = key === 'quarter' ? 0.4 : 0
      const s = 0.85 + 0.15 * k
      object.scale.set(s, s, s)
      object.traverse((child) => {
        if (child.material) { child.material.transparent = true; child.material.opacity = k }
      })
    })
  rig.paperSet.montageCone.visible = fold.cone > 0.01
  rig.paperSet.montageCone.material.opacity = fold.cone * 0.96
  rig.paperSet.montageCone.position.y = MathUtils.lerp(1.05, 0, fold.coneY)
  rig.paperSet.inFunnel.visible = P.paperInFunnel > 0.5
  rig.paperSet.setWet(P.paperWet)

  setPose(rig.dropper.group, P.dropper)
  rig.drops.forEach((drop, i) => {
    if (P.dropT < 0) { drop.visible = false; return }
    const cyc = (P.dropT * 2.2 + i * 0.34) % 1
    drop.visible = cyc < 0.82
    drop.position.set(
      L.funnelAxis.x + Math.sin(i * 2.4) * 0.08,
      MathUtils.lerp(2.16, 1.62, cyc / 0.82),
      0.1,
    )
  })

  setPose(rig.beakerB.group, P.beakerB)
  rig.beakerB.liquid.setLevel(P.beakerBLevel)
  rig.beakerB.liquid.setMurk(P.beakerBMurk)
  rig.beakerB.liquid.setTime(time)
  rig.tipGlow.material.opacity = P.tipPulse * (0.55 + Math.sin(time * 9) * 0.2)
  rig.tipGlow.scale.setScalar(1 + P.tipPulse * 0.5)

  // 漏斗内液锥（uCut 裁剪液面；液面必须低于滤纸边缘，由 timeline 保证）
  const coneOn = P.funnelLiquidY > rig.paperSet.bottomY + 0.03
  rig.coneLiquid.visible = coneOn
  rig.coneSurface.visible = coneOn
  if (coneOn) {
    rig.coneLiquidMaterial.uniforms.uCut.value = P.funnelLiquidY
    rig.coneLiquidMaterial.uniforms.uMurk.value = P.funnelMurk
    rig.coneLiquidMaterial.uniforms.uTime.value = time
    rig.coneSurface.position.y = P.funnelLiquidY + 0.004
    const r = Math.max(0.03, rig.paperSet.innerR(P.funnelLiquidY) - 0.012)
    rig.coneSurface.scale.set(r, r, 1)
  }
  rig.residue.userData.setAmount(P.residue)
  rig.residueStain.material.opacity = P.residue * 0.5

  if (P.pourA > 0.01) {
    const spout = spoutWorld(P.beakerA, SPOUTS.beakerA)
    const rodPoint = [
      MathUtils.lerp(P.rod.b[0], P.rod.t[0], 0.72),
      MathUtils.lerp(P.rod.b[1], P.rod.t[1], 0.72),
      MathUtils.lerp(P.rod.b[2], P.rod.t[2], 0.72) + 0.02,
    ]
    rig.streams.beakerPour.set(
      tmpA.set(spout[0], spout[1], spout[2]),
      tmpB.set(rodPoint[0], rodPoint[1], rodPoint[2]),
      0.05 * P.pourA, 0.04,
    )
    rig.streams.alongRod.set(
      tmpA.set(rodPoint[0], rodPoint[1], rodPoint[2]),
      tmpB.set(P.rod.b[0] + 0.01, P.rod.b[1] - 0.02, P.rod.b[2] + 0.02),
      0.034 * P.pourA, 0.03,
    )
  } else {
    rig.streams.beakerPour.hide()
    rig.streams.alongRod.hide()
  }

  if (P.wallStream > 0.01) {
    const wallX = P.beakerB.p[0] + rig.beakerB.innerR - 0.012
    rig.streams.stemDrip.set(
      tmpA.set(L.funnelAxis.x, rig.funnel.coneBottomY + 0.02, 0),
      tmpB.set(L.funnelAxis.x + rig.funnel.tip.x - 0.01, rig.funnel.stemBottomY - 0.02, 0),
      0.024 * P.wallStream,
    )
    rig.streams.wall.set(
      tmpA.set(wallX, rig.funnel.stemBottomY - 0.02, 0),
      tmpB.set(wallX, 0.07 + P.beakerBLevel * 0.82, 0),
      0.02 * P.wallStream,
    )
  } else {
    rig.streams.stemDrip.hide()
    rig.streams.wall.hide()
  }

  /* ---- 蒸发工位 ---- */
  if (P.dishPour > 0.01) {
    const spout = spoutWorld(P.beakerB, SPOUTS.beakerB)
    rig.streams.dishPour.set(
      tmpA.set(spout[0], spout[1], spout[2]),
      tmpB.set(L.dish.x - 0.1, L.dish.y + 0.08 + P.dishLevel * 0.22, 0.04),
      0.04 * P.dishPour, 0.032,
    )
  } else rig.streams.dishPour.hide()

  const dishCut = 0.048 + P.dishLevel * (0.285 - 0.048)
  const dishOn = P.dishLevel > 0.03
  rig.dishLiquid.visible = dishOn
  rig.dishSurface.visible = dishOn
  rig.dishLiquidMaterial.uniforms.uCut.value = dishCut
  rig.dishLiquidMaterial.uniforms.uTime.value = time
  if (dishOn) {
    rig.dishSurface.position.y = dishCut + 0.004
    const r = Math.max(0.05, rig.dish.innerR(dishCut) - 0.015)
    rig.dishSurface.scale.set(r, r, 1)
    rig.dishSurface.material.opacity = 0.5 - P.crystal * 0.2
  }
  rig.crystalRing.userData.setAmount(P.crystal)
  rig.crystalCenter.userData.setAmount(Math.max(0, (P.crystal - 0.3) / 0.7))
  rig.crust.material.opacity = P.crust * 0.85

  setPose(rig.cap.group, P.cap)
  const flameLive = P.flame > 0.01
  rig.lamp.flame.visible = flameLive
  if (flameLive) {
    const fs = P.flame * 0.72
    rig.lamp.flame.scale.set(
      fs * (1 + Math.sin(time * 10.5) * 0.028),
      fs * (1 + Math.sin(time * 12.1 + 1.2) * 0.05),
      fs * (1 - Math.sin(time * 10.5) * 0.028),
    )
    rig.lamp.flame.rotation.z = Math.sin(time * 7.5) * 0.02
  }
  rig.lamp.light.intensity = P.flame * (0.55 + Math.sin(time * 8.2) * 0.05)

  rig.steam.puffs.forEach((puff, i) => {
    const cyc = (time * 0.2 * (0.85 + puff.userData.phase * 0.5) + puff.userData.phase) % 1
    puff.position.set(
      puff.userData.drift + Math.sin(time * 0.6 + i * 2.1) * 0.08 * cyc,
      0.12 + cyc * 1.15,
      0.03 * i,
    )
    const s = 0.5 + cyc * 1.05
    puff.scale.set(s, s, s)
    puff.material.uniforms.uAlpha.value = P.steam * Math.pow(Math.sin(Math.PI * cyc), 0.85) * 0.5
    if (camera) puff.quaternion.copy(camera.quaternion)
  })

  rig.ripples.forEach((ripple) => {
    if (!P.ripple) { ripple.visible = false; return }
    const cyc = (time * 0.85 + ripple.userData.phase) % 1
    ripple.visible = true
    ripple.position.set(
      P.ripple.c[0] + Math.sin(ripple.userData.phase * 12) * 0.05,
      P.ripple.c[1] + 0.012,
      P.ripple.c[2] + Math.cos(ripple.userData.phase * 9) * 0.05,
    )
    const s = 0.5 + cyc * 1.9
    ripple.scale.set(s, s, 1)
    ripple.material.opacity = (1 - cyc) * 0.45 * P.ripple.k
  })
}

/* ---------- 教学状态机 ---------- */

export function createLesson(rig, spec) {
  const steps = spec.steps
  const state = {
    step: 0,
    stepTime: 0,
    playing: false,
    holdTimer: 0,
    finished: false,
  }
  let lastPose = pose(0, 0)
  const listeners = []

  const api = {
    state,
    steps,
    onChange(fn) { listeners.push(fn) },
    notify() { listeners.forEach((fn) => fn(api)) },
    currentT() {
      return MathUtils.clamp(state.stepTime / steps[state.step].duration, 0, 1)
    },
    setStep(index, { auto } = {}) {
      state.step = MathUtils.clamp(Math.round(index), 0, steps.length - 1)
      state.stepTime = 0
      state.holdTimer = 0
      state.finished = false
      if (!auto) state.playing = false
      api.notify()
    },
    reset() {
      state.step = 0
      state.stepTime = 0
      state.playing = false
      state.holdTimer = 0
      state.finished = false
      api.notify()
    },
    togglePlay() {
      if (state.finished && !state.playing) {
        api.reset()
        state.playing = true
      } else {
        state.playing = !state.playing
      }
      api.notify()
    },
    tick(dt, time, camera) {
      if (state.playing) {
        const duration = steps[state.step].duration
        if (state.stepTime < duration) {
          state.stepTime = Math.min(duration, state.stepTime + dt)
          if (state.stepTime >= duration) api.notify()
        } else if (state.step < steps.length - 1) {
          state.holdTimer += dt
          if (state.holdTimer > 0.5) api.setStep(state.step + 1, { auto: true })
        } else {
          state.playing = false
          state.finished = true
          api.notify()
        }
      }
      lastPose = pose(state.step, api.currentT())
      applyPose(rig, lastPose, time, camera)
      return lastPose
    },
    getPose() { return lastPose },
    getMetrics() { return metrics(lastPose, spec) },
  }
  return api
}

export { pose, metrics, POSE, LEVELS, sm }
