/**
 * [INPUT]: 无（静态课程叙事与微观数据配置）。
 * [OUTPUT]: window.__B_ZONE_COURSE__，供 ../b-zone-lab-overlay.js 渲染
 *           左侧安全状态看板，并驱动 ../b-zone-reaction-canvas.js 的
 *           二维微观反应场。场景切换（#metricPrinciple）联动灭火方式。
 * [POS]: 灭火原理课专属内容：代表性燃烧模型 C + O₂ → CO₂，
 *        分别演示隔绝氧气、降低温度、切断可燃物与安全前置。
 */

(() => {
  'use strict'

  // ---- 微观坐标助手：只生成数据，不包含渲染逻辑。 ----
  const o2 = (id, x, y, z, opts) => [
    [id + 'a', 'O', x - 0.43, y - 0.05, z, opts],
    [id + 'b', 'O', x + 0.43, y + 0.05, z, opts],
  ]
  const o2b = (id) => [id + 'a', id + 'b', 2]
  const co2 = (idC, idO, x, y, z, opts) => [
    [idC, 'C', x, y, z, opts],
    [idO + 'a', 'O', x - 0.85, y, z, opts],
    [idO + 'b', 'O', x + 0.85, y, z, opts],
  ]
  const co2b = (idC, idO) => [[idC, idO + 'a', 2], [idC, idO + 'b', 2]]
  const dim = { o: 0.4 }

  // 燃料簇（碳簇简化）与已生成的 CO₂ 产物。
  const FUEL = [
    ['c1', 'C', -0.85, -0.95, 0, { e: 1 }],
    ['c2', 'C', -1.4, -1.25, 0.2, { e: 1 }],
    ['c3', 'C', -0.3, -1.25, -0.2, { e: 1 }],
  ]
  const FUEL_BONDS = [['c1', 'c2', 1], ['c1', 'c3', 1], ['c2', 'c3', 1]]
  const FUEL_REMAIN = [
    ['c1', 'C', -0.85, -0.95, 0],
    ['c2', 'C', -1.4, -1.25, 0.2],
  ]
  const FUEL_REMAIN_BONDS = [['c1', 'c2', 1]]

  const PRODUCT_1 = co2('pc', 'po', -0.3, 0.75, -0.3, dim)
  const PRODUCT_1_BONDS = co2b('pc', 'po')
  // c3 + oA → 第二个 CO₂（燃烧进行中的主反应单元）。
  const PRODUCT_2 = [
    ['c3', 'C', 0.85, -0.35, 0, { e: 1 }],
    ['oAa', 'O', 0.0, -0.35, 0, { e: 1 }],
    ['oAb', 'O', 1.7, -0.35, 0, { e: 1 }],
  ]
  const PRODUCT_2_BONDS = [['c3', 'oAa', 2], ['c3', 'oAb', 2]]

  const O2_A = o2('oA', 1.5, 0.6, 0.1, { e: 1 })
  const O2_B = o2('oB', 2.0, 1.3, -0.3, dim)

  const OXYGEN_PATH = { pts: [[2.2, 0.75, 0], [1.4, 0.15, 0.05], [0.3, -0.6, 0.1], [-0.5, -0.95, 0.05]], style: 'flow', color: '#dc433c', n: 8, speed: 0.00013, o: 0.85 }
  const FUEL_PATH = { pts: [[-2.4, -1.7, 0.1], [-1.9, -1.5, 0.12], [-1.5, -1.3, 0.15]], style: 'flow', color: '#6f6f78', n: 5, speed: 0.00009, o: 0.7 }

  // 共享的前三步：识别火源 → 核对三要素 → 匹配方法。
  const STAGE_IDENTIFY = {
    atoms: [...FUEL, ...O2_A, ...O2_B, ...PRODUCT_1],
    bonds: [...FUEL_BONDS, o2b('oA'), o2b('oB'), ...PRODUCT_1_BONDS],
    paths: [OXYGEN_PATH, FUEL_PATH],
    labels: [
      ['可燃物（碳簇简化）', -0.85, -1.75, 0],
      ['O₂ 接触路径', 1.55, 0.05, 0.05],
      ['已生成的 CO₂ · O=C=O', -0.3, 1.25, -0.3],
    ],
    conserve: '燃烧进行中：燃料持续供给，O₂ 不断被消耗为 CO₂。',
    heat: 0.85,
  }
  const STAGE_CHECK = {
    atoms: [...FUEL.map(([id, el, x, y, z, o]) => [id, el, x, y, z, { ...o, h: 0.8 }]), ...O2_A, ...O2_B, ...PRODUCT_1],
    bonds: [...FUEL_BONDS, o2b('oA'), o2b('oB'), ...PRODUCT_1_BONDS],
    paths: [OXYGEN_PATH, FUEL_PATH],
    labels: [
      ['① 可燃物', -0.85, -1.75, 0],
      ['② 与氧气接触', 1.55, 0.05, 0.05],
      ['③ 温度≥着火点（热运动）', -0.1, 1.95, 0],
    ],
    conserve: '三项条件同时存在，火焰才能持续；破坏任意一项即可灭火。',
    heat: 1,
  }
  const STAGE_REACT = {
    atoms: [...FUEL_REMAIN.map(([id, el, x, y, z]) => [id, el, x, y, z, { e: 1, h: 0.6 }]), ...PRODUCT_2, ...O2_B, ...PRODUCT_1],
    bonds: [...FUEL_REMAIN_BONDS, ...PRODUCT_2_BONDS, o2b('oB'), ...PRODUCT_1_BONDS],
    paths: [OXYGEN_PATH, FUEL_PATH],
    labels: [
      ['O=O 断裂 → O=C=O 生成', 0.85, 0.25, 0],
      ['选择破坏哪一项条件？', -0.1, 1.95, 0],
    ],
    conserve: '主反应单元：1 个 C 与 1 个 O₂ 结合成 CO₂，原子一一对应。',
    heat: 1,
  }

  // 灭火后的公共基底：反应产物与剩余粒子全部保留。
  const AFTER_ATOMS = [...FUEL_REMAIN, ...PRODUCT_2.map(([id, el, x, y, z]) => [id, el, x, y, z, {}]), ...O2_B, ...PRODUCT_1]
  const AFTER_BONDS = [...FUEL_REMAIN_BONDS, ...PRODUCT_2_BONDS, o2b('oB'), ...PRODUCT_1_BONDS]

  const stagesWith = (extinguish, principle) => ({
    stages: [STAGE_IDENTIFY, STAGE_CHECK, STAGE_REACT, extinguish, principle],
  })

  // ① 隔绝氧气（酒精灯灯帽 / 油锅锅盖）。
  const COVER = { type: 'slab', at: [-0.6, -0.55, 0], size: [1.6, 0.65, 1.15], color: '#8f9a94', o: 0.3 }
  const smother = stagesWith(
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      shapes: [COVER],
      paths: [{ pts: [[2.2, 0.75, 0], [1.4, 0.3, 0.05], [0.85, 0.05, 0.08]], style: 'blocked', color: '#dc433c', n: 6, o: 0.7 }],
      labels: [['覆盖层阻断 O₂ 通道（O₂ 并未消失）', 1.3, 0.6, 0], ['新的成键停止', -0.6, -1.8, 0]],
      conserve: '隔氧不是删除 O₂：分子仍在覆盖层外，只是无法接触可燃物。',
      heat: 0.35,
    },
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      shapes: [COVER],
      labels: [['被破坏的条件：与氧气接触', -0.1, 1.95, 0], ['已有 CO₂ 与剩余粒子保留', -0.3, 1.25, -0.3]],
      conserve: '反应速率降为零；所有已生成的键保持不变。',
      heat: 0.1,
    },
  )

  // ② 降低温度（普通固体安全用水冷却）。
  const cool = stagesWith(
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      paths: [
        { pts: [[-0.6, 1.9, 0.3], [-0.7, 0.6, 0.2], [-0.85, -0.5, 0.1]], style: 'flow', color: '#4aa3d8', n: 8, speed: 0.00016, o: 0.9 },
        { pts: [[2.2, 0.75, 0], [1.6, 0.45, 0.05], [1.2, 0.3, 0.08]], style: 'blocked', color: '#dc433c', n: 5, o: 0.6 },
      ],
      labels: [['水吸热：热运动显著减弱', -0.75, 1.5, 0.2], ['温度低于着火点 · 不再断键成键', -0.3, -1.8, 0]],
      conserve: '降温不拆已有的键：CO₂ 与剩余 O₂ 的结构原样保留。',
      heat: 0.15,
    },
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      labels: [['被破坏的条件：温度降至着火点以下', -0.1, 1.95, 0]],
      conserve: '反应速率降为零；燃料与 O₂ 都还在，只是碰撞不再有效。',
      heat: 0.05,
    },
  )

  // ③ 切断可燃物（燃气关阀）。
  const starve = stagesWith(
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      paths: [
        { pts: [[-2.4, -1.7, 0.1], [-2.1, -1.6, 0.12]], style: 'blocked', color: '#6f6f78', n: 4, o: 0.7 },
        { pts: [[2.2, 0.75, 0], [1.5, 0.35, 0.05], [1.0, 0.1, 0.08]], style: 'blocked', color: '#dc433c', n: 5, o: 0.5 },
      ],
      labels: [['阀门关闭：燃料供给中断', -2.0, -2.05, 0.1], ['存量燃料耗尽后火焰熄灭', -0.6, -1.8, 0]],
      conserve: '切断的是供给：已有产物与未反应粒子一个都不少。',
      heat: 0.3,
    },
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      labels: [['被破坏的条件：可燃物（燃料来源）', -0.1, 1.95, 0]],
      conserve: '反应速率降为零；O₂ 与 CO₂ 保持原有键级。',
      heat: 0.05,
    },
  )

  // ④ 安全前置（带电电器：先断电，再用 CO₂ 等隔氧器材）。
  const power = stagesWith(
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      shapes: [COVER],
      paths: [
        { pts: [[-2.4, -1.7, 0.1], [-2.1, -1.6, 0.12]], style: 'blocked', color: '#6f6f78', n: 4, o: 0.7 },
        { pts: [[2.2, 0.75, 0], [1.4, 0.3, 0.05], [0.85, 0.05, 0.08]], style: 'blocked', color: '#dc433c', n: 6, o: 0.7 },
      ],
      labels: [['① 先切断电源（能量输入停止）', -2.0, -2.05, 0.1], ['② 二氧化碳灭火剂覆盖 · 隔绝 O₂', 1.3, 0.6, 0]],
      conserve: '带电火灾严禁直接用水：先断电，再破坏氧气接触条件。',
      heat: 0.25,
    },
    {
      atoms: AFTER_ATOMS,
      bonds: AFTER_BONDS,
      shapes: [COVER],
      labels: [['安全前置 ＋ 隔绝氧气', -0.1, 1.95, 0]],
      conserve: '反应速率降为零；所有粒子与键保持灭火前的状态。',
      heat: 0.05,
    },
  )

  window.__B_ZONE_COURSE__ = {
    id: 'fire-extinguishing',
    overview: {
      ariaLabel: '灭火场景的实时安全状态与操作提示',
      checklistTitle: '安全底线',
      checklist: [
        ['先识别火源与燃料', 0],
        ['核对三项燃烧条件', 1],
        ['选择匹配的安全操作', 2],
        ['执行操作并观察', 3],
        ['说出被破坏的条件', 4],
      ],
      observations: [
        '观察火源：判断燃料类型与周边风险。',
        '火焰持续，说明三项燃烧条件同时存在。',
        '不同场景对应不同操作：盖灭、冷却、断源各有适用。',
        '执行安全操作，火焰因条件被破坏而减弱。',
        '火焰熄灭：明确指出是哪一项条件被破坏。',
      ],
    },
    panel: {
      ariaLabel: '灭火原理的二维微观反应场（代表性燃烧模型）',
      kicker: '原理映射',
      title: '破坏一项即可灭火',
      subtitle: '燃烧条件 · 安全操作 · 灭火原理联动',
      boardLabel: '燃烧条件被破坏过程的二维原子与化学键示意',
      liveLabel: '条件证据 · 实时',
      formula: '代表性模型：C(s) + O₂(g)  点燃  →  CO₂(g)',
      legend: [
        { cls: 'atom-key--c', label: 'C' },
        { cls: 'atom-key--o', label: 'O' },
      ],
      stages: [
        { name: '识别火源', copy: '燃烧进行中：燃料、O₂ 通道与热量同时存在。', field: '识别 · 评估风险' },
        { name: '核对三要素', copy: '可燃物、氧气接触、温度达标——三者同时成立。', field: '三条件同时存在' },
        { name: '匹配方法', copy: '主反应单元持续成键；选择破坏哪一项条件。', field: '方法 ↔ 条件' },
        { name: '执行灭火', copy: '按场景执行：隔氧 / 降温 / 断料 / 先断电。', field: '执行 · 观察' },
        { name: '映射原理', copy: '反应速率降为零，明确被破坏的燃烧条件。', field: '解释 · 归纳' },
      ],
    },
    micro: {
      renderer: 'reaction-canvas',
      canvas: {
        atomSize: { hero: 1.1, batch: 1, symbol: 1.05 },
        heroLabel: '燃烧反应与条件破坏',
        heroMeta: '代表模型 C + O₂ → CO₂',
        heroZoom: 1.22,
        groupLabels: ['燃烧持续', '执行灭火'],
        batchLabel: '燃烧条件证据',
        evidenceItemsByStage: [
          [{ label: '可燃物存在', state: 'on' }, { label: '接触氧气', state: 'on' }, { label: '温度已达标', state: 'on' }],
          [{ label: '可燃物存在', state: 'on' }, { label: '接触氧气', state: 'on' }, { label: '温度已达标', state: 'on' }],
          [{ label: '选择目标条件' }, { label: '匹配安全方法' }, { label: '预测可见证据' }],
          [{ label: '目标条件破坏', state: 'off' }, { label: '新反应已停止', state: 'off' }, { label: '安全操作已执行', state: 'on' }],
          [{ label: '条件映射完成', state: 'on' }, { label: '已有产物保留' }, { label: '反应速率为 0', state: 'off' }],
        ],
        conclusion: '破坏任意一项燃烧条件即可灭火',
        conclusions: [
          '燃料、O₂ 通道与热量同时存在',
          '可燃物 + 氧气接触 + 温度达标',
          '选择与火源类型匹配的安全方法',
          '执行灭火：新的断键与成键停止',
          '破坏任意一项燃烧条件即可灭火',
        ],
      },
      caption: '示意图 · 非真实比例',
      note: '该模型用于解释燃烧条件，不代表酒精、油、燃气或电器火灾的完整反应式。',
      camera: { dist: 8.0, pitch: 0.2, yaw: -0.26 },
      defaultContext: 'smother',
      contextFrom: {
        selector: '#metricPrinciple',
        map: { '隔绝氧气': 'smother', '降低温度': 'cool', '切断可燃物': 'starve', '安全前置': 'power' },
      },
      contexts: { smother, cool, starve, power },
    },
  }
})()
