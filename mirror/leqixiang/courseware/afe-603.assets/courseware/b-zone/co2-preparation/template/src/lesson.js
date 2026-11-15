/**
 * lesson.js —— 课程状态机与六步连续动画。
 *
 * 设计原则：不保存任何“残留动画状态”。每一帧都由 (step, tNorm, time)
 * 重新派生全部器材的位姿与效果，因此点击任意步骤按钮都会完整重建
 * 该阶段的器材状态（集气瓶位置、导管摆角、液面、火焰……）。
 */
import { Vector3 } from 'three'
import {
  LAYOUT,
  poseStream,
  setFlame,
  setSmoke,
  bottleMouthWorld,
  setJarGas,
  setAcidLevel,
  setBubbles,
  setBeakerCO2,
  setPourFlow,
  setLimewater,
} from './apparatus.js'

const B = LAYOUT.BENCH_TOP
const JAR_TOP = B + LAYOUT.JAR_HEIGHT

/* ---------- 小工具 ---------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (t, a, b) => clamp01((t - a) / (b - a))
const ez = (k) => { const t = clamp01(k); return t * t * (3 - 2 * t) }
const lerp = (a, b, k) => a + (b - a) * k

/** 台面搬运弧线：k 0..1，从 from 移到 to，中途抬起 lift。 */
function arc(out, from, to, k, lift) {
  const e = ez(k)
  out.x = lerp(from.x, to.x, e)
  out.y = lerp(from.y, to.y, e) + Math.sin(Math.PI * e) * lift
  out.z = lerp(from.z ?? 0, to.z ?? 0, e)
  return out
}

/* ---------- 固定位姿常量 ---------- */
const ACID_REST = { x: LAYOUT.ACID_BOTTLE_X, y: B, z: 0 }
const ACID_TILT = -2.2
const ACID_MOUTH_OFFSET = LAYOUT.REAGENT_MOUTH_Y * LAYOUT.REAGENT_SCALE
const ACID_POUR_TARGET = {
  x: LAYOUT.FLASK_X + LAYOUT.FUNNEL_DX,
  y: B + LAYOUT.FUNNEL_MOUTH_LOCAL + 0.1,
  z: 0,
}
const ACID_POUR = {
  x: ACID_POUR_TARGET.x + Math.sin(ACID_TILT) * ACID_MOUTH_OFFSET,
  y: ACID_POUR_TARGET.y - Math.cos(ACID_TILT) * ACID_MOUTH_OFFSET,
  z: 0,
}
const LIME_REST = { x: LAYOUT.LIME_BOTTLE_X, y: B, z: 0 }
const LIME_POUR = { x: 1.81, y: 2.35, z: 0 }
const LIME_TILT = -1.95
const JAR_A_COLLECT = { x: LAYOUT.COLLECT_X, y: B, z: 0 }
const JAR_A_TEST = { x: LAYOUT.TEST_X, y: B, z: 0 }
const JAR_B_STAGE = { x: LAYOUT.STAGE_X, y: B, z: 0 }
const JAR_B_COLLECT_POSE = { x: LAYOUT.COLLECT_X, y: B, z: 0 }
const JAR_B_POUR = { x: 2.62, y: 2.62, z: 0 } // 倾倒姿态下瓶口≈(3.79,1.92)，正对烧杯左内壁气流曲线起点
const JAR_B_TILT = -2.11
const PLATE_REST = { x: 1.7, y: B + 0.0225, z: 0.95 }
const SPLINT_REST = { x: -1.9, y: B + 0.03, z: 1.25 }
const SPLINT_HOLD = { x: LAYOUT.COLLECT_X - 0.04, y: JAR_TOP + 0.16, z: 0 }
const SWING_OUT = 0.35 // 收集段导管摆出角（rad）
const SWING_LIFT = 1.25 // 先竖直提出瓶口，再横向摆开，避免斜穿瓶壁
const REAGENT_CLOSED_Y = B + LAYOUT.REAGENT_MOUTH_Y * LAYOUT.REAGENT_SCALE + 0.015
const ACID_STOPPER_CLOSED = { x: LAYOUT.ACID_BOTTLE_X, y: REAGENT_CLOSED_Y, z: 0 }
const ACID_STOPPER_REST = { x: LAYOUT.ACID_BOTTLE_X - 0.43, y: B + 0.1, z: 0.28 }
const LIME_STOPPER_CLOSED = { x: LAYOUT.LIME_BOTTLE_X, y: REAGENT_CLOSED_Y, z: 0 }
const LIME_STOPPER_REST = { x: LAYOUT.LIME_BOTTLE_X - 0.42, y: B + 0.1, z: 0.28 }

const MATCH_VERIFY = Object.freeze({
  box: { x: -2.55, y: B, z: 0.94 },
  rest: { x: -2.78, y: B + 0.24, z: 1.08 },
  strikeStart: { x: -2.82, y: B + 0.13, z: 1.17 },
  strikeEnd: { x: -2.25, y: B + 0.13, z: 1.17 },
  firstWick: { x: -1.84, y: B + 0.09, z: 1.25 },
  exit: { x: -1.35, y: B + 0.56, z: 1.05 },
})

const MATCH_CANDLES = Object.freeze({
  box: { x: 3.08, y: B, z: 0.92 },
  rest: { x: 2.82, y: B + 0.25, z: 1.02 },
  strikeStart: { x: 2.78, y: B + 0.13, z: 1.15 },
  strikeEnd: { x: 3.4, y: B + 0.13, z: 1.15 },
  firstWick: { x: 3.93, y: B + 0.62, z: 0.06 },
  secondWick: { x: 4.29, y: B + 0.92, z: 0.06 },
  exit: { x: 4.82, y: B + 1.34, z: 0.66 },
})

const V = { a: new Vector3(), b: new Vector3(), c: new Vector3() }

function poseClosure(closure, closed, rest, t, { openStart, openEnd, closeStart, closeEnd, active }) {
  if (!active || t <= openStart) {
    closure.position.set(closed.x, closed.y, closed.z)
    closure.rotation.set(0, 0, 0)
    return
  }
  if (t < openEnd) {
    const k = ez(seg(t, openStart, openEnd))
    arc(closure.position, closed, rest, k, 0.18)
    closure.rotation.z = -Math.PI * 0.5 * k
    return
  }
  if (t < closeStart) {
    closure.position.set(rest.x, rest.y, rest.z)
    closure.rotation.set(0, 0, -Math.PI * 0.5)
    return
  }
  if (t < closeEnd) {
    const k = ez(seg(t, closeStart, closeEnd))
    arc(closure.position, rest, closed, k, 0.18)
    closure.rotation.z = -Math.PI * 0.5 * (1 - k)
    return
  }
  closure.position.set(closed.x, closed.y, closed.z)
  closure.rotation.set(0, 0, 0)
}

function poseMatchKit(rig, mode, t, time) {
  const kit = rig.matchKit
  const config = mode === 'verify' ? MATCH_VERIFY : mode === 'candles' ? MATCH_CANDLES : null
  if (!config) {
    kit.matchbox.visible = false
    kit.matchStick.visible = false
    kit.sparks.visible = false
    setFlame(kit.flame, 0, time)
    setSmoke(kit.smoke, 0)
    return
  }

  kit.matchbox.visible = true
  kit.matchbox.position.set(config.box.x, config.box.y, config.box.z)
  kit.matchbox.rotation.set(0, 0, 0)

  const timing = mode === 'verify'
    ? { strikeStart: 0.02, strikeEnd: 0.09, wickEnd: 0.2, exitEnd: 0.26, flameOn: 0.075, flameFull: 0.11, flameOff: 0.22, flameEnd: 0.26 }
    : { strikeStart: 0.06, strikeEnd: 0.12, wickEnd: 0.23, secondEnd: 0.3, exitEnd: 0.36, flameOn: 0.105, flameFull: 0.145, flameOff: 0.31, flameEnd: 0.35 }

  kit.matchStick.visible = t < timing.exitEnd
  if (t <= timing.strikeStart) {
    arc(kit.matchStick.position, config.rest, config.strikeStart, seg(t, 0, timing.strikeStart), 0.08)
  } else if (t < timing.strikeEnd) {
    arc(kit.matchStick.position, config.strikeStart, config.strikeEnd, seg(t, timing.strikeStart, timing.strikeEnd), 0)
  } else if (t < timing.wickEnd) {
    arc(kit.matchStick.position, config.strikeEnd, config.firstWick, seg(t, timing.strikeEnd, timing.wickEnd), 0.24)
  } else if (mode === 'candles' && t < timing.secondEnd) {
    arc(kit.matchStick.position, config.firstWick, config.secondWick, seg(t, timing.wickEnd, timing.secondEnd), 0.16)
  } else {
    const from = mode === 'candles' ? config.secondWick : config.firstWick
    const start = mode === 'candles' ? timing.secondEnd : timing.wickEnd
    arc(kit.matchStick.position, from, config.exit, seg(t, start, timing.exitEnd), 0.2)
  }
  kit.matchStick.rotation.set(0, 0, mode === 'candles' && t >= timing.wickEnd ? 0.14 : -0.04)

  const matchFlame = ez(seg(t, timing.flameOn, timing.flameFull))
    * (1 - ez(seg(t, timing.flameOff, timing.flameEnd)))
  setFlame(kit.flame, matchFlame, time)
  setSmoke(kit.smoke, seg(t, timing.flameOff, timing.exitEnd))

  const sparkProgress = seg(t, timing.strikeStart, timing.strikeEnd)
  kit.sparks.visible = sparkProgress > 0 && sparkProgress < 1
  kit.sparks.children.forEach((spark, index) => {
    const data = spark.userData
    const reach = data.reach * Math.sin(Math.PI * sparkProgress)
    spark.position.set(Math.cos(data.angle) * reach, Math.sin(data.angle) * reach, (index - 3) * 0.006)
    spark.scale.setScalar(0.45 + (1 - sparkProgress) * 0.8)
    spark.material.opacity = 0.7 * (1 - sparkProgress)
  })
}

/* ---------- 每步的派生姿态 ---------- */

/** 导管摆角：按步骤基线 + 本步动画。 */
function swingAngle(step, t) {
  switch (step) {
    case 0:
    case 1: return 0
    case 2: return SWING_OUT * ez(seg(t, 0.16, 0.34))
    case 3: return SWING_OUT
    case 4: return SWING_OUT * (1 - ez(seg(t, 0.08, 0.28)))
    case 5: return SWING_OUT * ez(seg(t, 0.27, 0.35))
    default: return 0
  }
}

function swingLift(step, t) {
  if (step === 2) return SWING_LIFT * ez(seg(t, 0, 0.16))
  if (step === 5) return SWING_LIFT * ez(seg(t, 0.22, 0.27))
  if (step === 3) return SWING_LIFT
  if (step === 4) return SWING_LIFT * (1 - ez(seg(t, 0.28, 0.48)))
  return 0
}

function acidLevel(step, t) {
  if (step < 0) return 0
  if (step === 0) return ez(seg(t, 0.25, 0.68))
  return 1
}

function bubbleIntensity(step, t) {
  if (step === 0) return ez(seg(t, 0.3, 0.82))
  if (step >= 1) return step >= 5 ? 0.85 : 1
  return 0
}

function jarAGas(step, t) {
  if (step < 1) return 0
  if (step === 1) return ez(seg(t, 0.08, 0.9))
  if (step === 2) return 1
  if (step === 3) return 1 - 0.85 * ez(seg(t, 0.6, 0.95)) // CO₂ 被石灰水吸收
  return 0.15
}

function jarBGas(step, t) {
  if (step < 4) return 0
  if (step === 4) return ez(seg(t, 0.48, 0.95))
  return 1 - 0.85 * ez(seg(t, 0.49, 0.91)) // 两支蜡烛点燃后再倾倒
}

function limeState(step, t) {
  if (step < 3) return { level: 0, turbidity: 0 }
  if (step === 3) {
    return { level: ez(seg(t, 0.31, 0.43)), turbidity: ez(seg(t, 0.6, 0.95)) }
  }
  return { level: 1, turbidity: 1 }
}

export function createLesson({ rig, spec, onFrontView, onStepView }) {
  const steps = spec.steps
  const state = { step: 0, stepTime: 0, playing: false }

  /* ---------- DOM ---------- */
  const stepsHost = document.getElementById('steps')
  const metricStage = document.getElementById('metric-stage')
  const metricJar1 = document.getElementById('metric-jar1')
  const metricJar2 = document.getElementById('metric-jar2')
  const metricLime = document.getElementById('metric-lime')
  const observation = document.getElementById('observation')
  const btnPlay = document.getElementById('btn-play')
  const btnFront = document.getElementById('btn-front')
  const btnReset = document.getElementById('btn-reset')

  const stepButtons = steps.map((stepSpec, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'step'
    button.innerHTML = `<span class="step-index">${index + 1}</span><span class="step-name">${stepSpec.name}</span>`
    button.addEventListener('click', () => setStep(index, { play: true, focus: true }))
    stepsHost.appendChild(button)
    return button
  })

  function refreshChrome() {
    stepButtons.forEach((button, index) => {
      button.classList.toggle('is-active', index === state.step)
      button.classList.toggle('is-done', index < state.step)
    })
    btnPlay.textContent = state.playing ? '暂停' : '播放'
    btnPlay.setAttribute('aria-pressed', state.playing ? 'true' : 'false')
  }

  function setStep(index, { play = state.playing, focus = true } = {}) {
    state.step = Math.min(steps.length - 1, Math.max(0, index))
    state.stepTime = 0
    state.playing = play
    if (focus) onStepView?.(state.step)
    refreshChrome()
  }

  btnPlay.addEventListener('click', () => {
    const startsCurrentStep = !state.playing && state.stepTime === 0
    state.playing = !state.playing
    if (state.playing && startsCurrentStep) onStepView?.(state.step)
    refreshChrome()
  })
  btnFront.addEventListener('click', () => onFrontView && onFrontView())
  btnReset.addEventListener('click', () => {
    setStep(0, { play: false, focus: false })
    onFrontView?.()
  })

  /* ---------- 姿态应用 ---------- */
  function applyPose(step, t, time) {
    const M = rig

    /* 发生装置：液面 / 液封 / 气泡 */
    setAcidLevel(M, acidLevel(step, t))
    setBubbles(M, bubbleIntensity(step, t), time)

    /* 稀盐酸试剂瓶 */
    const acid = M.acidBottle
    if (step === 0) {
      const kUp = seg(t, 0.1, 0.25)
      const kBack = seg(t, 0.7, 0.88)
      if (kBack > 0) {
        arc(acid.position, ACID_POUR, ACID_REST, kBack, 0.35)
        acid.rotation.z = ACID_TILT * (1 - ez(seg(t, 0.7, 0.82)))
      } else {
        arc(acid.position, ACID_REST, ACID_POUR, kUp, 0.4)
        acid.rotation.z = ACID_TILT * ez(seg(t, 0.18, 0.25))
        if (kUp >= 1) acid.position.y = ACID_POUR.y + Math.sin(time * 1.7) * 0.012
      }
    } else {
      acid.position.set(ACID_REST.x, ACID_REST.y, 0)
      acid.rotation.z = 0
    }
    poseClosure(M.acidStopper, ACID_STOPPER_CLOSED, ACID_STOPPER_REST, t, {
      openStart: 0.02,
      openEnd: 0.1,
      closeStart: 0.88,
      closeEnd: 0.98,
      active: step === 0,
    })
    const acidPourOn = step === 0 && t > 0.25 && t < 0.68
    if (acidPourOn) {
      bottleMouthWorld(acid, V.a)
      M.flask.worldToLocal(V.a)
      V.b.set(LAYOUT.FUNNEL_DX, 2.42, 0)
      poseStream(M.funnelStream, V.a, V.b, true)
    } else {
      poseStream(M.funnelStream, V.a, V.b, false)
    }

    /* 导管摆角 */
    M.swing.rotation.z = swingAngle(step, t)
    M.swing.position.y = LAYOUT.PIPE_Y + swingLift(step, t)
    // 可拆收集段离开橡胶接头后收至台外，避免后续性质实验中出现悬空玻璃管。
    M.swing.visible = step < 2
      || (step === 2 && t < 0.02)
      || (step === 4 && t >= 0.48)
      || (step === 5 && t < 0.22)

    /* 一号集气瓶 */
    const jarA = M.jarA
    if (step < 3) {
      jarA.position.set(JAR_A_COLLECT.x, JAR_A_COLLECT.y, 0)
      jarA.rotation.z = 0
    } else if (step === 3) {
      arc(jarA.position, JAR_A_COLLECT, JAR_A_TEST, seg(t, 0, 0.2), 0.5)
      const wiggle = Math.sin(Math.PI * seg(t, 0.58, 0.78))
      jarA.rotation.z = Math.sin(time * 11) * 0.055 * wiggle
      jarA.position.x += Math.sin(time * 14) * 0.03 * wiggle
    } else {
      jarA.position.set(JAR_A_TEST.x, JAR_A_TEST.y, 0)
      jarA.rotation.z = 0
    }
    setJarGas(jarA, jarAGas(step, t), time)
    const lime = limeState(step, t)
    setLimewater(jarA, lime.level, lime.turbidity, time)

    /* 二号集气瓶 */
    const jarB = M.jarB
    if (step < 4) {
      jarB.position.set(JAR_B_STAGE.x, JAR_B_STAGE.y, 0)
      jarB.rotation.z = 0
    } else if (step === 4) {
      arc(jarB.position, JAR_B_STAGE, JAR_B_COLLECT_POSE, seg(t, 0, 0.22), 0.45)
      jarB.rotation.z = 0
    } else {
      arc(jarB.position, JAR_B_COLLECT_POSE, JAR_B_POUR, seg(t, 0.35, 0.49), 0.9)
      jarB.rotation.z = JAR_B_TILT * ez(seg(t, 0.41, 0.49))
    }
    setJarGas(jarB, jarBGas(step, t), time)

    /* 玻璃片 */
    const plate = M.plate
    if (step < 3 || (step === 3 && t < 0.44)) {
      plate.position.set(PLATE_REST.x, PLATE_REST.y, PLATE_REST.z)
      plate.rotation.set(0, 0, 0)
    } else if (step === 3 && t < 0.56) {
      const target = { x: jarA.position.x, y: JAR_TOP + 0.026, z: 0 }
      arc(plate.position, PLATE_REST, target, seg(t, 0.44, 0.56), 0.28)
      plate.rotation.set(0, 0, 0)
    } else {
      plate.position.set(jarA.position.x, jarA.position.y + LAYOUT.JAR_HEIGHT + 0.026, 0)
      plate.rotation.set(0, 0, jarA.rotation.z)
    }

    /* 木条（验满） */
    poseMatchKit(M, step === 2 ? 'verify' : step === 5 ? 'candles' : null, t, time)
    const splint = M.splint
    let splintFlame = 0
    let splintSmoke = 0
    if (step === 2) {
      const kUp = seg(t, 0.27, 0.45)
      const kBack = seg(t, 0.7, 0.95)
      if (kBack > 0) {
        arc(splint.position, SPLINT_HOLD, SPLINT_REST, kBack, 0.3)
        splint.rotation.z = 0.42 * (1 - ez(kBack))
      } else {
        arc(splint.position, SPLINT_REST, SPLINT_HOLD, kUp, 0.35)
        splint.rotation.z = 0.42 * ez(kUp)
        if (kUp >= 1) splint.position.y = SPLINT_HOLD.y + Math.sin(time * 2.1) * 0.012
      }
      splintFlame = ez(seg(t, 0.18, 0.23)) * (1 - ez(seg(t, 0.52, 0.62)))
      splintSmoke = seg(t, 0.54, 0.86)
    } else {
      splint.position.set(SPLINT_REST.x, SPLINT_REST.y, SPLINT_REST.z)
      splint.rotation.set(0, 0, 0)
    }
    setFlame(splint.userData.flame, splintFlame, time)
    setSmoke(splint.userData.smoke, splintSmoke)

    /* 石灰水试剂瓶 */
    const limeBottle = M.limeBottle
    if (step === 3) {
      const kUp = seg(t, 0.22, 0.31)
      const kBack = seg(t, 0.43, 0.53)
      if (kBack > 0) {
        arc(limeBottle.position, LIME_POUR, LIME_REST, kBack, 0.25)
        limeBottle.rotation.z = LIME_TILT * (1 - ez(kBack))
      } else {
        arc(limeBottle.position, LIME_REST, LIME_POUR, kUp, 0.3)
        limeBottle.rotation.z = LIME_TILT * ez(seg(t, 0.26, 0.31))
        if (kUp >= 1) limeBottle.position.y = LIME_POUR.y + Math.sin(time * 1.9) * 0.01
      }
    } else {
      limeBottle.position.set(LIME_REST.x, LIME_REST.y, 0)
      limeBottle.rotation.z = 0
    }
    poseClosure(M.limeStopper, LIME_STOPPER_CLOSED, LIME_STOPPER_REST, t, {
      openStart: 0.16,
      openEnd: 0.22,
      closeStart: 0.53,
      closeEnd: 0.6,
      active: step === 3,
    })
    const limePourOn = step === 3 && t > 0.31 && t < 0.43
    if (limePourOn) {
      bottleMouthWorld(limeBottle, V.a)
      V.b.set(LAYOUT.TEST_X, JAR_TOP - 0.12, 0)
      poseStream(M.limeStream, V.a, V.b, true)
    } else {
      poseStream(M.limeStream, V.a, V.b, false)
    }

    /* 阶梯蜡烛 / 烧杯 CO₂ / 倾倒气流 */
    let lowFlame = 0
    let highFlame = 0
    let lowSmoke = 0
    let highSmoke = 0
    if (step === 5) {
      const lowLit = ez(seg(t, 0.19, 0.23))
      const highLit = ez(seg(t, 0.27, 0.31))
      lowFlame = lowLit * (1 - ez(seg(t, 0.64, 0.7)))
      highFlame = highLit * (1 - ez(seg(t, 0.79, 0.85)))
      lowSmoke = seg(t, 0.66, 0.86)
      highSmoke = seg(t, 0.81, 0.98)
      setBeakerCO2(M, ez(seg(t, 0.49, 0.91)))
      const pour = ez(seg(t, 0.49, 0.55)) * (1 - ez(seg(t, 0.88, 0.94)))
      setPourFlow(M, pour, time)
    } else {
      setBeakerCO2(M, 0)
      setPourFlow(M, 0, time)
    }
    setFlame(M.candleLow.userData.flame, lowFlame, time)
    setFlame(M.candleHigh.userData.flame, highFlame, time)
    setSmoke(M.candleLow.userData.smoke, lowSmoke)
    setSmoke(M.candleHigh.userData.smoke, highSmoke)
  }

  /* ---------- 遥测文案 ---------- */
  function refreshTelemetry(step, t) {
    metricStage.textContent = `${step + 1}/6 · ${steps[step].name}`

    const gasA = jarAGas(step, t)
    if (step < 1) metricJar1.textContent = '空瓶待用（收集位）'
    else if (step === 1) metricJar1.textContent = gasA < 0.995 ? `收集中 ${Math.round(gasA * 100)}%` : '已集满'
    else if (step === 2) metricJar1.textContent = '已集满 · 验满中'
    else if (step === 3) metricJar1.textContent = t < 0.2 ? '移至性质实验位' : '石灰水检验中'
    else metricJar1.textContent = '已完成石灰水检验'

    const gasB = jarBGas(step, t)
    if (step < 4) metricJar2.textContent = '备用空瓶（右侧待用）'
    else if (step === 4) metricJar2.textContent = gasB < 0.995 ? `收集中 ${Math.round(gasB * 100)}%` : '已集满'
    else if (t < 0.12) metricJar2.textContent = '等待火柴擦燃'
    else if (t < 0.31) metricJar2.textContent = '等待两支蜡烛点燃'
    else if (t < 0.49) metricJar2.textContent = '移向阶梯蜡烛'
    else if (t < 0.91) metricJar2.textContent = '沿烧杯内壁倾倒中'
    else metricJar2.textContent = '已倒入烧杯 · 蜡烛熄灭'

    const lime = limeState(step, t)
    if (lime.level <= 0.01) metricLime.textContent = '澄清 · 未加入'
    else if (lime.turbidity < 0.1) metricLime.textContent = '已加入 · 澄清'
    else if (lime.turbidity < 0.85) metricLime.textContent = '正在变浑浊……'
    else metricLime.textContent = '浑浊 · 白色沉淀'

    observation.textContent = steps[step].evidence
  }

  /* ---------- 主循环 ---------- */
  function tick(dt, time) {
    const duration = steps[state.step].duration
    if (state.playing) {
      state.stepTime += dt
      if (state.stepTime >= duration + 0.7) {
        if (state.step < steps.length - 1) {
          setStep(state.step + 1)
        } else {
          state.playing = false
          state.stepTime = duration
          refreshChrome()
        }
      }
    }
    const t = clamp01(state.stepTime / duration)
    applyPose(state.step, t, time)
    refreshTelemetry(state.step, t)
  }

  refreshChrome()
  return { state, setStep, tick }
}
