/**
 * [INPUT]: stations.js 的 LAYOUT 常量（世界坐标）。
 * [OUTPUT]: 纯函数 pose(step, t)：给定步骤与步骤内进度，返回全部可观察状态
 *           （样品量、液位、浑浊度、火焰、以及每个可动器材的位姿与液流端点）。
 * [POS]: 课程状态机的“真值层”。不接触 Three.js 对象，可在无渲染环境下自检。
 *
 * 连续性约定：pose(i, 1) 必须等于 pose(i+1, 0)。所有跨步骤共享的数值都由
 * 同一组常量推出；tools/check 会自动断言这一点，保证“同一份样品”的连续叙事，
 * 也保证点击任一步骤即可完整恢复该阶段状态。
 */
import { MathUtils } from './lib.js'
import { LAYOUT } from './stations.js'

/* ---------- 小工具 ---------- */

const clamp01 = (v) => MathUtils.clamp(v, 0, 1)
/** 区间平滑：t 在 [a,b] 内从 0 平滑到 1。 */
export const sm = (t, a, b) => {
  const x = clamp01((t - a) / Math.max(1e-6, b - a))
  return x * x * (3 - 2 * x)
}
const lerp = MathUtils.lerp
const V = (x, y, z) => [x, y, z]
const mixV = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]

/** 关键帧插值：frames = [[t0, {p,r}], ...]，段内 smoothstep。 */
function kf(t, frames) {
  if (t <= frames[0][0]) return frames[0][1]
  const last = frames[frames.length - 1]
  if (t >= last[0]) return last[1]
  for (let i = 0; i < frames.length - 1; i += 1) {
    const [t0, a] = frames[i]
    const [t1, b] = frames[i + 1]
    if (t >= t0 && t <= t1) {
      const k = sm(t, t0, t1)
      return { p: mixV(a.p, b.p, k), r: mixV(a.r, b.r, k) }
    }
  }
  return last[1]
}

/** 玻璃棒专用：按两端点插值（保证下端接触点精确可控）。 */
function kfTips(t, frames) {
  if (t <= frames[0][0]) return frames[0][1]
  const last = frames[frames.length - 1]
  if (t >= last[0]) return last[1]
  for (let i = 0; i < frames.length - 1; i += 1) {
    const [t0, a] = frames[i]
    const [t1, b] = frames[i + 1]
    if (t >= t0 && t <= t1) {
      const k = sm(t, t0, t1)
      return { b: mixV(a.b, b.b, k), t: mixV(a.t, b.t, k) }
    }
  }
  return last[1]
}

/* ---------- 位姿常量（世界坐标；跨步骤共享以保证连续） ---------- */

const L = LAYOUT
export const POSE = {
  // 药匙
  spoonRest: { p: V(L.spoonRest.x, L.spoonRest.y, L.spoonRest.z), r: V(0, 0.32, 0) },
  spoonDip: { p: V(-4.8, 1.18, -0.06), r: V(0, 0.1, -0.55) },
  spoonLift: { p: V(-4.66, 1.62, 0.0), r: V(0, 0.05, -0.12) },
  spoonDump: { p: V(-4.28, 1.78, 0.02), r: V(0, 0, 0.98) },
  // 称量纸（'pan' 模式下由 apply 吸附到左托盘）
  paperPan: { p: V(-4.72, 1.262, 0), r: V(0, 0, 0) },
  paperLift: { p: V(-4.3, 2.05, 0.12), r: V(0, 0, -0.25) },
  paperOverBeaker: { p: V(-2.16, 2.3, 0.1), r: V(0, 0, -0.7) },
  paperDump: { p: V(-2.1, 2.32, 0.1), r: V(0.05, 0, -2.1) },
  paperBench: { p: V(L.paperBenchRest.x, L.paperBenchRest.y, L.paperBenchRest.z), r: V(0, 0.2, 0) },
  // 砝码
  weightHome: { p: V(L.weightHome.x, L.weightHome.y, L.weightHome.z), r: V(0, 0, 0) },
  weightLift: { p: V(-3.14, 1.72, 0.28), r: V(0, 0, 0.06) },
  weightPan: { p: V(-3.18, 1.262, 0), r: V(0, 0, 0) },
  // 量筒
  cylHome: { p: V(L.cylinder.x, 0, L.cylinder.z), r: V(0, 0, 0) },
  cylLift: { p: V(-3.2, 1.15, -0.14), r: V(0, 0, -0.35) },
  cylPour: { p: V(-3.3, 1.44, -0.05), r: V(0, 0, -1.35) },
  // 胶头滴管
  dropperRest: { p: V(L.dropperRest.x, L.dropperRest.y, L.dropperRest.z), r: V(0, 0.4, 1.52) },
  dropperUp: { p: V(0.62, 2.3, 0.3), r: V(0, 0, 0.2) },
  dropperOverPaper: { p: V(0.85, 2.6, 0.12), r: V(0, 0, 0.04) },
  // 烧杯 A（倾倒姿态的杯口点由同一组数值推出，见 spoutWorld）
  beakerAHome: { p: V(L.beakerA.x, 0, L.beakerA.z), r: V(0, 0, 0) },
  beakerALift: { p: V(-1.05, 2.05, 0.1), r: V(0, 0, -0.42) },
  beakerAPourIn: { p: V(-0.408, 3.442, 0.08), r: V(0, 0, -1.72) },
  beakerAPourEnd: { p: V(-0.217, 3.64, 0.08), r: V(0, 0, -1.95) },
  // 烧杯 B
  beakerBGap: { p: V(L.beakerBGap.x, 0, 0), r: V(0, 0, 0) },
  beakerBContact: { p: V(L.beakerBContact.x, 0, 0), r: V(0, 0, 0) },
  beakerBLift: { p: V(1.15, 1.7, 0.22), r: V(0, 0, -0.3) },
  beakerBPour: { p: V(2.464, 3.214, 0.1), r: V(0, 0, -1.75) },
  beakerBRest: { p: V(L.beakerBRest.x, 0, L.beakerBRest.z), r: V(0, 0, 0) },
  // 灯帽
  capOnLamp: { p: V(L.lamp.x, 1.04, 0), r: V(0, 0, 0) },
  capLift: { p: V(3.16, 1.78, 0.34), r: V(0, 0, -0.14) },
  capRest: { p: V(L.capRest.x, L.capRest.y, L.capRest.z), r: V(0, 0, 0) },
  capApproach: { p: V(3.62, 1.52, 0.02), r: V(0, 0, 0) },
}

// 玻璃棒端点（世界坐标）。rodTips.filter 的下端 = 三层滤纸一侧的接触点。
export const ROD = {
  bench1: { b: V(-2.06, 0.033, 0.63), t: V(-0.566, 0.033, 0.5) },
  overA: { b: V(-2.0, 1.05, 0.05), t: V(-1.86, 2.54, 0.12) },
  stirA: { b: V(-1.99, 0.17, 0.06), t: V(-1.85, 1.66, 0.1) },
  leanA: { b: V(-2.24, 0.1, 0.02), t: V(-1.345, 1.302, 0.3) },
  filterLift: { b: V(-0.6, 1.3, 0.05), t: V(-0.05, 2.7, 0.12) },
  filter: { b: V(1.09, 1.625, 0.09), t: V(0.419, 2.963, 0.15) },
  nearDish: { b: V(2.6, 0.033, 0.58), t: V(4.094, 0.033, 0.45) },
  overDish: { b: V(3.62, 2.3, 0.05), t: V(3.5, 3.79, 0.15) },
  stirDish: { b: V(3.62, 1.86, 0.02), t: V(3.53, 3.35, 0.12) },
  acrossDish: { b: V(2.92, 2.15, 0.1), t: V(4.4, 2.2, 0.16) },
}

// 倾倒器皿的杯口 / 筒口（本地坐标，供液流端点推导与校验共用）
export const SPOUTS = {
  beakerA: [0.58, 1.05],
  beakerB: [0.55, 0.97],
  cylinder: [0.16, 1.52],
}
export const LEVELS = {
  beakerAFull: 0.63, beakerARemain: 0.03,
  cylStart: 0.62, cylEnd: 0.07,
  beakerBFull: 0.55, beakerBRemain: 0.03,
  dishFull: 0.72, dishMid: 0.4, dishLow: 0.16,
  funnelHighY: 1.76, funnelLowY: 1.3,   // 漏斗内液面（世界 y），滤纸边缘 1.92
}

/** 由组位置 + 绕 z 转角推出本地点的世界坐标（倾倒器皿的杯口）。 */
export function spoutWorld(pose, local) {
  const c = Math.cos(pose.r[2])
  const s = Math.sin(pose.r[2])
  return [
    pose.p[0] + local[0] * c - local[1] * s,
    pose.p[1] + local[0] * s + local[1] * c,
    pose.p[2],
  ]
}

/* ---------- 六步位姿 ---------- */

function basePose() {
  return {
    // 天平与称量
    paperSalt: 0, spoon: POSE.spoonRest, spoonLoad: 0, balanceTilt: 0, balanceOsc: 0,
    weight: POSE.weightHome, paperMode: 'kf', paper: POSE.paperPan,
    saltFall: null,
    // 溶解
    beakerASalt: 0, beakerASand: 0, beakerALevel: 0, beakerAMurk: 0,
    speckAmount: 0, speckSwirl: 0, cylLevel: LEVELS.cylStart,
    cylinder: POSE.cylHome, dropper: POSE.dropperRest,
    beakerA: POSE.beakerAHome, rod: ROD.bench1, stirA: 0, ripple: null, cylPourOn: 0,
    // 过滤
    fold: { flat: 0, half: 0, quarter: 0, cone: 0, coneY: 0 },
    paperInFunnel: 0, paperWet: 0, dropT: -1,
    beakerB: POSE.beakerBGap, tipPulse: 0,
    pourA: 0, funnelLiquidY: 0, funnelMurk: 1, residue: 0, wallStream: 0,
    beakerBLevel: 0, beakerBMurk: 0,
    // 蒸发
    dishPour: 0, dishLevel: 0, crystal: 0, crust: 0, steam: 0,
    flame: 0, heat: 0, stirDish: 0, cap: POSE.capOnLamp,
    // 界面
    stepNote: '',
  }
}

const STEP_POSES = [
  /* 0 · 称量粗盐 */
  (t, P) => {
    P.weight = kf(t, [[0.03, POSE.weightHome], [0.09, POSE.weightLift], [0.17, POSE.weightPan]])
    if (t >= 0.17) P.weight = { ...POSE.weightPan, onPan: true }
    // 药匙两次取样：cycle ∈ [0,2)，每次 取样(瓶) → 提起 → 倾倒(称量纸)
    const cycles = sm(t, 0.2, 0.74) * 2
    const cyc = cycles % 1
    const cyclePose = kf(cyc, [
      [0.0, POSE.spoonDip], [0.16, POSE.spoonDip], [0.32, POSE.spoonLift],
      [0.5, POSE.spoonDump], [0.66, POSE.spoonDump], [0.84, POSE.spoonLift], [1, POSE.spoonDip],
    ])
    const inCycle = sm(t, 0.16, 0.22) * (1 - sm(t, 0.76, 0.84))
    P.spoon = { p: mixV(POSE.spoonRest.p, cyclePose.p, inCycle), r: mixV(POSE.spoonRest.r, cyclePose.r, inCycle) }
    P.spoonLoad = inCycle * sm(cyc, 0.14, 0.24) * (1 - sm(cyc, 0.48, 0.6))
    P.paperMode = 'pan' // 称量全程纸随左托盘（含梁倾斜）
    P.paperSalt = sm(t, 0.3, 0.5) * 0.55 + sm(t, 0.55, 0.74) * 0.45
    // 梁的倾斜：放砝码右倾，加盐渐回，settle 段小幅摆动并精确归零
    const weightOn = sm(t, 0.13, 0.2)
    P.balanceTilt = -0.085 * weightOn * (1 - P.paperSalt * 0.97) * (1 - sm(t, 0.86, 0.98))
    P.balanceOsc = sm(t, 0.72, 0.8) * (1 - sm(t, 0.82, 0.97)) * 0.02
    P.stepNote = t < 0.2 ? '把 5 g 砝码放上右盘' : (t < 0.78 ? '药匙向称量纸添加粗盐' : '指针停在分度盘中央，恰好 5.0 g')
  },
  /* 1 · 加水溶解 */
  (t, P) => {
    P.paperSalt = 1 - sm(t, 0.22, 0.38)
    P.weight = kf(t, [[0.08, { ...POSE.weightPan }], [0.14, POSE.weightLift], [0.22, POSE.weightHome]])
    if (t < 0.08) P.weight = { ...POSE.weightPan, onPan: true }
    P.balanceTilt = -0.06 * sm(t, 0.02, 0.08) * (1 - sm(t, 0.12, 0.22))
    P.paperMode = 'kf'
    P.paper = kf(t, [
      [0.0, POSE.paperPan], [0.08, POSE.paperLift], [0.2, POSE.paperOverBeaker],
      [0.3, POSE.paperDump], [0.4, POSE.paperDump], [0.48, POSE.paperOverBeaker], [0.58, POSE.paperBench],
    ])
    if (t < 0.02) P.paperMode = 'pan'
    P.saltFall = t > 0.24 && t < 0.42
      ? { k: sm(t, 0.24, 0.28) * (1 - sm(t, 0.38, 0.42)), from: V(-1.98, 2.14, 0.1), to: V(-1.98, 0.5, 0.06) }
      : null
    P.beakerASalt = sm(t, 0.26, 0.44) * (1 - sm(t, 0.7, 0.96) * 1) // 搅拌后溶解归零
    P.beakerASand = sm(t, 0.28, 0.46) * 0.35
    P.cylinder = kf(t, [
      [0.42, POSE.cylHome], [0.52, POSE.cylLift], [0.6, POSE.cylPour],
      [0.74, POSE.cylPour], [0.84, POSE.cylHome],
    ])
    const pourWater = sm(t, 0.58, 0.76)
    P.cylLevel = lerp(LEVELS.cylStart, LEVELS.cylEnd, pourWater)
    P.beakerALevel = LEVELS.beakerAFull * pourWater
    P.cylPourOn = t > 0.585 && t < 0.755 ? 1 : 0
    P.ripple = P.cylPourOn ? { c: V(-1.86, 0.05 + P.beakerALevel * 0.9, 0.05), k: 1 } : null
    P.rod = kfTips(t, [
      [0.72, ROD.bench1], [0.82, ROD.overA], [0.88, ROD.stirA], [0.93, ROD.stirA], [0.99, ROD.leanA],
    ])
    P.stirA = sm(t, 0.86, 0.92) * (1 - sm(t, 0.93, 0.98))
    P.beakerAMurk = sm(t, 0.86, 0.99)
    P.speckAmount = sm(t, 0.87, 0.99)
    P.speckSwirl = P.stirA
    P.stepNote = t < 0.45 ? '同一份粗盐转移入烧杯' : (t < 0.8 ? '量筒量取 50 mL 水倒入' : '玻璃棒搅拌：NaCl 溶解，泥沙悬浮变浑浊')
  },
  /* 2 · 组装过滤 */
  (t, P) => {
    P.fold.flat = sm(t, 0.02, 0.08) * (1 - sm(t, 0.13, 0.17))
    P.fold.half = sm(t, 0.13, 0.17) * (1 - sm(t, 0.22, 0.26))
    P.fold.quarter = sm(t, 0.22, 0.26) * (1 - sm(t, 0.31, 0.35))
    P.fold.cone = sm(t, 0.31, 0.35) * (1 - sm(t, 0.42, 0.46))
    P.fold.coneY = sm(t, 0.34, 0.44) * (1 - sm(t, 0.52, 0.6)) // 锥隐去后归零，保证跨步连续
    P.paperInFunnel = sm(t, 0.42, 0.46)
    P.dropper = kf(t, [
      [0.46, POSE.dropperRest], [0.56, POSE.dropperUp], [0.62, POSE.dropperOverPaper],
      [0.76, POSE.dropperOverPaper], [0.86, POSE.dropperRest],
    ])
    P.dropT = t > 0.62 && t < 0.78 ? (t - 0.62) / 0.16 : -1
    P.paperWet = sm(t, 0.63, 0.8)
    P.beakerB = kf(t, [[0.8, POSE.beakerBGap], [0.94, POSE.beakerBContact]])
    P.tipPulse = sm(t, 0.9, 0.94) * (1 - sm(t, 0.96, 1))
    P.stepNote = t < 0.45 ? '滤纸对折两次，展开成锥形放入漏斗' : (t < 0.8 ? '滴管润湿，使滤纸紧贴内壁（一贴）' : '尖嘴紧靠烧杯内壁（三靠之一）')
  },
  /* 3 · 过滤混合物 */
  (t, P) => {
    P.rod = kfTips(t, [
      [0.02, ROD.leanA], [0.08, ROD.filterLift], [0.15, ROD.filter],
      [0.86, ROD.filter], [0.96, ROD.nearDish],
    ])
    P.beakerA = kf(t, [
      [0.04, POSE.beakerAHome], [0.11, POSE.beakerALift], [0.19, POSE.beakerAPourIn],
      [0.68, POSE.beakerAPourIn], [0.8, POSE.beakerAPourEnd], [0.88, POSE.beakerALift], [0.97, POSE.beakerAHome],
    ])
    P.pourA = sm(t, 0.2, 0.24) * (1 - sm(t, 0.8, 0.84))
    const drain = sm(t, 0.2, 0.8)
    P.beakerALevel = lerp(LEVELS.beakerAFull, LEVELS.beakerARemain, drain)
    P.beakerASand = 0.35 * (1 - drain * 0.85)
    P.speckAmount = 1 - drain
    P.speckSwirl = 0
    const wave = Math.sin(t * 21) * 0.035 // 小幅波动，峰值仍距滤纸边缘 ≥0.12
    const fillY = lerp(LEVELS.funnelLowY, LEVELS.funnelHighY, sm(t, 0.2, 0.34)) + wave * P.pourA
    P.funnelLiquidY = t < 0.205 ? 0 : (t < 0.82 ? fillY : lerp(fillY, 0, sm(t, 0.82, 0.98)))
    P.residue = sm(t, 0.26, 0.88)
    P.wallStream = sm(t, 0.24, 0.28) * (1 - sm(t, 0.9, 0.96))
    P.beakerBLevel = LEVELS.beakerBFull * sm(t, 0.26, 0.9)
    P.stepNote = t < 0.25 ? '玻璃棒下端轻靠三层滤纸一侧' : (t < 0.82 ? '沿玻璃棒缓慢倾倒，液面低于滤纸边缘（二低）' : '滤液澄清，泥沙留在滤纸上')
  },
  /* 4 · 蒸发结晶 */
  (t, P) => {
    P.beakerB = kf(t, [
      [0.02, POSE.beakerBContact], [0.08, POSE.beakerBLift], [0.16, POSE.beakerBPour],
      [0.3, POSE.beakerBPour], [0.38, POSE.beakerBLift], [0.46, POSE.beakerBRest],
    ])
    P.dishPour = sm(t, 0.17, 0.2) * (1 - sm(t, 0.3, 0.34))
    const transfer = sm(t, 0.17, 0.32)
    P.beakerBLevel = lerp(LEVELS.beakerBFull, LEVELS.beakerBRemain, transfer)
    P.dishLevel = LEVELS.dishFull * transfer
    P.cap = kf(t, [[0.34, POSE.capOnLamp], [0.42, POSE.capLift], [0.5, POSE.capRest]])
    P.flame = sm(t, 0.5, 0.62)
    P.heat = P.flame
    P.rod = kfTips(t, [
      [0.36, ROD.nearDish], [0.46, ROD.overDish], [0.54, ROD.stirDish],
    ])
    P.stirDish = sm(t, 0.54, 0.6)
    const boil = sm(t, 0.6, 1)
    P.dishLevel = lerp(P.dishLevel, LEVELS.dishMid, boil)
    P.crystal = sm(t, 0.68, 1) * 0.32
    P.steam = sm(t, 0.6, 0.72) * 0.72
    P.ripple = P.dishPour ? { c: V(3.55, L.dish.y + 0.06 + P.dishLevel * 0.24, 0.05), k: 0.7 } : null
    P.stepNote = t < 0.35 ? '同一份滤液转移入蒸发皿' : (t < 0.55 ? '取下灯帽，点燃酒精灯' : '边加热边搅拌，防止液滴飞溅')
  },
  /* 5 · 停止加热 */
  (t, P) => {
    const boil = sm(t, 0.0, 0.42)
    P.dishLevel = lerp(LEVELS.dishMid, LEVELS.dishLow, boil)
    P.crystal = lerp(0.32, 0.7, boil)
    P.cap = kf(t, [
      [0.28, POSE.capRest], [0.36, POSE.capLift], [0.44, POSE.capApproach],
      [0.5, POSE.capOnLamp], [0.58, POSE.capApproach], [0.66, POSE.capOnLamp],
    ])
    P.flame = 1 - sm(t, 0.46, 0.52)
    P.heat = Math.max(P.flame, 0.35 * (1 - sm(t, 0.6, 0.95))) // 余热
    const residualDry = sm(t, 0.5, 0.88)
    P.dishLevel = lerp(P.dishLevel, 0, residualDry)
    P.crystal = lerp(P.crystal, 1, residualDry)
    P.crust = sm(t, 0.3, 0.9)
    P.steam = (1 - sm(t, 0.5, 0.78)) * (0.72 - 0.3 * boil)
    P.stirDish = 1 - sm(t, 0.42, 0.55)
    P.rod = kfTips(t, [
      [0.5, ROD.stirDish], [0.62, ROD.overDish], [0.78, ROD.acrossDish],
    ])
    P.stepNote = t < 0.4 ? '出现较多固体，准备停止加热' : (t < 0.68 ? '灯帽盖灭、轻提后再盖一次；不可用嘴吹' : '余热蒸干：得到较纯的精盐')
  },
]

/** 每一步 t=0 时对上一阶段终态的“继承值”。 */
function inherit(step, P) {
  if (step >= 1) {
    P.paperSalt = step === 1 ? 1 : 0
    P.weight = step === 1 ? { ...POSE.weightPan, onPan: true } : POSE.weightHome
    P.paperMode = step === 1 ? 'pan' : 'kf'
    P.paper = step === 1 ? POSE.paperPan : POSE.paperBench
    P.cylLevel = step >= 2 ? LEVELS.cylEnd : LEVELS.cylStart
  }
  if (step >= 2) {
    P.beakerASand = 0.35
    P.beakerAMurk = 1
    P.beakerALevel = LEVELS.beakerAFull
    P.speckAmount = 1
    P.rod = ROD.leanA
  }
  if (step >= 3) {
    P.paperInFunnel = 1
    P.paperWet = 1
    P.beakerB = POSE.beakerBContact
  }
  if (step >= 4) {
    P.beakerALevel = LEVELS.beakerARemain
    P.beakerASand = 0.05
    P.speckAmount = 0
    P.residue = 1
    P.beakerBLevel = LEVELS.beakerBFull
    P.rod = ROD.nearDish
  }
  if (step >= 5) {
    P.beakerB = POSE.beakerBRest
    P.beakerBLevel = LEVELS.beakerBRemain
    P.dishLevel = LEVELS.dishMid
    P.crystal = 0.32
    P.cap = POSE.capRest
    P.flame = 1
    P.heat = 1
    P.steam = 0.72
    P.stirDish = 1
    P.rod = ROD.stirDish
  }
}

/** 主入口：步骤 i、步骤内进度 t（0..1） → 完整位姿。 */
export function pose(step, t) {
  const P = basePose()
  inherit(step, P)
  STEP_POSES[step](clamp01(t), P)
  P.step = step
  P.t = clamp01(t)
  return P
}

/* ---------- 面向界面的观测数据 ---------- */

export function metrics(P, spec) {
  const filtrateMl = Math.round((P.beakerBLevel / LEVELS.beakerBFull) * 45)
  const sample = [
    `粗盐（含泥沙）· ${(P.paperSalt * spec.sampleMassG).toFixed(1)} g`,
    P.beakerAMurk > 0.5 ? '浑浊盐水（泥沙悬浮）' : '粗盐转移入烧杯',
    '浑浊盐水 · 待过滤',
    P.beakerBLevel > 0.02 ? `澄清滤液 · ${filtrateMl} mL` : '开始过滤',
    P.flame > 0.5 ? '滤液蒸发中' : '滤液转移入蒸发皿',
    P.crystal > 0.92 ? '较纯的白色精盐' : '出现较多固体，余热蒸干',
  ][P.step]
  const heatLabel = P.flame > 0.5
    ? '酒精灯加热中'
    : (P.step >= 5 && P.t > 0.55 ? (P.heat > 0.05 ? '已盖灭 · 余热蒸干' : '已盖灭') : '未点燃')
  return {
    sample,
    filtrate: `${filtrateMl} mL`,
    heat: heatLabel,
  }
}
