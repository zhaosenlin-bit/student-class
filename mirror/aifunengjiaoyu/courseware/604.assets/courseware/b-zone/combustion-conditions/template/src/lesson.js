import { Color, MathUtils } from '../vendor/three.module.js'

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const smooth = (from, to, value) => {
  if (from === to) return value >= to ? 1 : 0
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}
const lerp = (from, to, value) => from + (to - from) * clamp(value)

function pulse(time, seed = 0) {
  return 1 + Math.sin(time * 12.7 + seed) * .035 + Math.sin(time * 19.1 + seed * 1.8) * .018
}

function setFlame(group, strength, time, seed = 0) {
  const amount = clamp(strength)
  const base = group.userData.baseScale || 1
  group.visible = amount > .012
  if (!group.visible) return
  const flicker = pulse(time, seed)
  group.scale.set(base * amount * (1 + Math.sin(time * 9 + seed) * .025), base * amount * flicker, base * amount)
  group.rotation.z = Math.sin(time * 7.3 + seed) * .025 * amount
  group.children.forEach((child) => {
    if (child.isLight) child.intensity = .65 * amount
  })
}

function setSmoke(group, amount, time, seed = 0) {
  const strength = clamp(amount)
  group.visible = strength > .01
  if (!group.visible) return
  group.children.forEach((puff, index) => {
    const phase = (time * .18 + index / group.children.length + seed) % 1
    puff.position.y = index * .13 + phase * .35
    puff.position.x = Math.sin(time * 1.4 + index * 1.3) * (.025 + phase * .035)
    puff.material.opacity = strength * (.18 - index * .023) * (1 - phase * .5)
    puff.scale.setScalar(.85 + phase * .72)
  })
}

export function createLessonController({ objects, camera, controls, frontView, onRenderState }) {
  const spec = window.__COMBUSTION_SPEC__
  const state = {
    step: 0,
    stepTime: 0,
    playing: false,
    autoSequence: false,
    finished: false,
    elapsed: 0,
  }

  const colors = {
    pingFresh: new Color(0xcf7138),
    pingChar: new Color(0x49342a),
    paperFresh: new Color(0xf2eee0),
    paperChar: new Color(0x4a4640),
  }

  function progress() {
    return clamp(state.stepTime / spec.steps[state.step].duration)
  }

  function resetMaterialState() {
    objects.openCandle.wax.scale.y = 1
    objects.coveredCandle.wax.scale.y = 1
    objects.pingPiece.material.color.copy(colors.pingFresh)
    objects.paperPiece.material.color.copy(colors.paperFresh)
    objects.pingPiece.scale.set(1, 1, 1)
    objects.paperPiece.scale.set(1, 1, 1)
    objects.copper.material.emissiveIntensity = 0
    objects.copper.material.color.setHex(0x98482d)
  }

  function applyStep(time) {
    const p = progress()
    const step = state.step
    resetMaterialState()

    let alcoholFire = 0
    let openCandleFire = 0
    let coveredCandleFire = 0
    let lampFire = 0
    let pingFire = 0
    let paperFire = 0
    let coveredSmoke = 0
    let pingSmoke = 0
    let paperSmoke = 0
    let clocheX = 1.22
    let clocheY = .15
    let clocheZ = .7
    let mist = 0
    let copperHeat = 0

    objects.igniter.visible = false
    objects.igniter.position.set(-1.78, .92, .28)
    objects.dishSnuffer.position.set(1.3, .3, .64)
    objects.lampCap.position.set(1.06, .34, .73)
    objects.lampCap.rotation.z = -.12

    if (step === 1) {
      const toAlcohol = smooth(.26, .48, p)
      objects.igniter.visible = p > .04 && p < .58
      objects.igniter.position.x = lerp(-1.78, -.34, toAlcohol)
      objects.igniter.position.y = .92 + Math.sin(p * Math.PI) * .06
      objects.igniter.position.z = .28 - smooth(.08, .5, p) * .12
      alcoholFire = smooth(.42, .54, p) * (1 - smooth(.77, .95, p))
      const snuff = smooth(.68, .9, p)
      objects.dishSnuffer.position.x = lerp(1.3, .72, snuff)
      objects.dishSnuffer.position.z = lerp(.64, -.1, snuff)
      objects.dishSnuffer.position.y = lerp(.3, .53, snuff) + Math.sin(snuff * Math.PI) * .82
      objects.dishSnuffer.rotation.z = lerp(-.08, 0, snuff)
    }

    if (step === 2) {
      const ignition = smooth(.08, .22, p)
      openCandleFire = ignition
      coveredCandleFire = ignition
      const cover = smooth(.4, .82, p)
      clocheX = lerp(1.22, .72, cover)
      clocheZ = lerp(.7, -.1, cover)
      clocheY = .15 + Math.sin(cover * Math.PI) * .46
      const burn = smooth(.18, 1, p)
      objects.openCandle.wax.scale.y = 1 - burn * .018
      objects.coveredCandle.wax.scale.y = 1 - burn * .018
    }

    if (step === 3) {
      clocheY = .15
      clocheX = .72
      clocheZ = -.1
      openCandleFire = 1
      coveredCandleFire = 1 - smooth(.12, .84, p)
      coveredSmoke = smooth(.82, .94, p) * (1 - smooth(.94, 1, p) * .4)
      mist = smooth(.28, .86, p)
      objects.openCandle.wax.scale.y = 1 - p * .035
      objects.coveredCandle.wax.scale.y = 1 - smooth(0, .78, p) * .022
    }

    if (step === 4) {
      lampFire = smooth(.04, .16, p)
      copperHeat = smooth(.1, .76, p)
      pingFire = smooth(.31, .42, p) * (1 - smooth(.78, .98, p) * .42)
      paperFire = smooth(.63, .74, p) * (1 - smooth(.91, 1, p) * .22)
      pingSmoke = smooth(.68, .9, p) * .5
      paperSmoke = smooth(.86, 1, p) * .3
      const pingChar = smooth(.38, .92, p)
      const paperChar = smooth(.68, 1, p)
      objects.pingPiece.material.color.lerpColors(colors.pingFresh, colors.pingChar, pingChar)
      objects.paperPiece.material.color.lerpColors(colors.paperFresh, colors.paperChar, paperChar)
      objects.pingPiece.scale.set(1 - pingChar * .18, 1 - pingChar * .28, 1 - pingChar * .12)
      objects.paperPiece.scale.set(1 - paperChar * .1, 1 - paperChar * .08, 1 - paperChar * .14)
    }

    if (step === 5) {
      const snuff = smooth(.08, .46, p)
      lampFire = 1 - snuff
      copperHeat = 1 - smooth(.18, .9, p) * .82
      objects.lampCap.position.x = lerp(1.06, 0, snuff)
      objects.lampCap.position.y = lerp(.34, 1.12, snuff)
      objects.lampCap.position.z = lerp(.73, .12, snuff)
      objects.lampCap.rotation.z = lerp(-.12, 0, snuff)
      // 第一次盖灭后轻提，再盖一次，符合酒精灯规范操作。
      const secondCover = Math.sin(Math.PI * smooth(.5, .82, p))
      objects.lampCap.position.y += secondCover * .26
      objects.pingPiece.material.color.lerpColors(colors.pingFresh, colors.pingChar, .86)
      objects.paperPiece.material.color.lerpColors(colors.paperFresh, colors.paperChar, .74)
      objects.pingPiece.scale.set(.84, .74, .88)
      objects.paperPiece.scale.set(.92, .94, .86)
      pingSmoke = (1 - smooth(.08, .7, p)) * .4
      paperSmoke = (1 - smooth(.08, .7, p)) * .3
    }

    objects.cloche.group.position.set(clocheX, clocheY, clocheZ)
    objects.cloche.mist.children.forEach((drop, index) => {
      drop.material.opacity = mist * (.045 + (index % 3) * .012)
    })
    objects.copper.material.emissiveIntensity = copperHeat * .08
    objects.copper.material.color.setRGB(
      lerp(.32, .21, copperHeat),
      lerp(.08, .03, copperHeat),
      lerp(.03, .015, copperHeat),
    )

    setFlame(objects.alcoholFlame, alcoholFire, time, .5)
    setFlame(objects.igniterFlame, objects.igniter.visible ? 1 : 0, time, 1.1)
    setFlame(objects.openCandle.flame, openCandleFire, time, 1.7)
    setFlame(objects.coveredCandle.flame, coveredCandleFire, time, 2.2)
    setFlame(objects.lamp.flame, lampFire, time, 3.1)
    setFlame(objects.pingFlame, pingFire, time, 3.8)
    setFlame(objects.paperFlame, paperFire, time, 4.4)
    setSmoke(objects.coveredCandle.smoke, coveredSmoke, time, .1)
    setSmoke(objects.pingSmoke, pingSmoke, time, .3)
    setSmoke(objects.paperSmoke, paperSmoke, time, .6)

    const activeZone = spec.steps[step].zone
    objects.zonePlates.forEach((stripe, index) => {
      const active = activeZone === -1 || activeZone === index
      stripe.material.emissiveIntensity = active ? .38 : .04
      stripe.material.opacity = active ? 1 : .72
    })

    onRenderState({ state, step: spec.steps[step], progress: p })
  }

  function setStep(index, { play = true, autoSequence = false, at = 0 } = {}) {
    state.step = MathUtils.clamp(index, 0, spec.steps.length - 1)
    state.stepTime = spec.steps[state.step].duration * clamp(at)
    state.playing = play
    state.autoSequence = autoSequence
    state.finished = false
    applyStep(state.elapsed)
  }

  function togglePlay() {
    if (state.playing) {
      state.playing = false
      applyStep(state.elapsed)
      return
    }
    if (state.step === spec.steps.length - 1 && progress() >= .999) {
      state.step = 0
      state.stepTime = 0
    }
    state.playing = true
    state.autoSequence = true
    state.finished = false
    applyStep(state.elapsed)
  }

  function reset() {
    state.step = 0
    state.stepTime = 0
    state.playing = false
    state.autoSequence = false
    state.finished = false
    frontView()
    applyStep(state.elapsed)
  }

  function update(delta, time) {
    state.elapsed = time
    if (state.playing) {
      state.stepTime += delta
      const duration = spec.steps[state.step].duration
      if (state.stepTime >= duration) {
        state.stepTime = duration
        if (state.autoSequence && state.step < spec.steps.length - 1) {
          state.step += 1
          state.stepTime = 0
        } else {
          state.playing = false
          state.finished = state.step === spec.steps.length - 1
        }
      }
    }
    applyStep(time)
  }

  applyStep(0)
  return { state, spec, update, setStep, togglePlay, reset, progress, applyStep }
}
