/**
 * 空气组成课的叙事与二维计量场配置。
 * 粒子布局和连续轨迹由 air-composition-metering-canvas.js 独立维护。
 */
(() => {
  'use strict'

  window.__B_ZONE_COURSE__ = {
    id: 'air-composition',
    overview: {
      ariaLabel: '空气组成实验的实时状态与操作提示',
      checklistTitle: '装置检查',
      checklist: [
        ['装置气密性良好', 0],
        ['止水夹已关闭', 0],
        ['燃烧匙内红磷足量', 0],
        ['完全冷却后再开夹', 4],
        ['读取 ΔV 并计算占比', 4],
      ],
      observations: [
        '容器密闭且刻度清晰，止水夹保持关闭。',
        '电热丝点燃红磷，避免开盖引入外界空气。',
        '红磷剧烈燃烧，产生大量白烟（P₂O₅ 固体微粒）。',
        '烟雾渐散，容器降温回到室温，读数趋于稳定。',
        '打开止水夹后水被压入容器，约占 V₀ 的 1/5。',
      ],
    },
    panel: {
      ariaLabel: '空气组成测定的二维教学计量场',
      kicker: '微观反应示意',
      title: '微观结构变化',
      subtitle: '3 组重点观察 · 6 组固定空气模型',
      boardLabel: '三组空气代表单元和六组固定空气模型的二维连续反应示意',
      liveLabel: '动态演示 · 6 组',
      formula: '4P + 5O₂ → 2P₂O₅（固体，不计入反应后气体体积）',
      legend: [
        { cls: 'atom-key--n', label: 'N — 氮原子' },
        { cls: 'atom-key--o', label: 'O — 氧原子' },
        { cls: 'atom-key--p', label: 'P — 磷原子' },
      ],
      stages: [
        { name: '气密检查', copy: '每组完整空气代表单元均为 4N₂ + 1O₂，密闭容器内均匀热运动。', field: '5 份气体 · 密闭' },
        { name: '电热点燃', copy: '红磷固体升温，O₂ 向底部反应区移动；N₂ 的数量和结构不变。', field: 'O₂ 向反应区移动' },
        { name: '充分燃烧', copy: 'O=O 断裂，氧原子进入底部磷氧固体；N≡N 全程保留。', field: 'O₂ 进入固体' },
        { name: '完全冷却', copy: '气相只剩 4 个 N₂，运动减慢，气体数量约为初始的 4/5。', field: '气相剩余 4/5' },
        { name: '开夹测量', copy: '液面推进一格，明确补入被消耗的约 1/5 气体体积。', field: '体积减少约 1/5' },
      ],
    },
    micro: {
      renderer: 'air-metering-canvas',
      canvas: {
        atomSize: { hero: 1.1, batch: 1.1, symbol: 1.45 },
        bondLength: 1.5,
      },
    },
  }
})()
