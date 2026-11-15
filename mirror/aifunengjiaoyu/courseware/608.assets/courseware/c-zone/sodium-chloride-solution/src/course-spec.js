/**
 * 一定溶质质量分数的氯化钠溶液配制：课程事实唯一来源。
 * 场景、界面和动画只消费这份规格，不在别处改写实验数值。
 */
window.__SOLUTION_PREPARATION_SPEC__ = Object.freeze({
  id: 'sodium-chloride-solution-preparation',
  title: '一定溶质质量分数的氯化钠溶液配制',
  target: Object.freeze({
    solutionMassG: 50,
    massFractionPercent: 6,
    soluteMassG: 3.0,
    waterMassG: 47.0,
    waterDensityGPerMl: 1,
    waterVolumeMl: 47,
  }),
  apparatus: Object.freeze([
    '电子天平与称量纸',
    '药匙与装有白色晶体的广口试剂瓶',
    '50 mL 量筒',
    '胶头滴管',
    '烧杯与玻璃棒',
    '蒸馏水洗瓶',
    '细口试剂瓶（成品瓶）与标签纸',
  ]),
  steps: Object.freeze([
    { id: 'calculate', name: '计算', copy: 'NaCl 3.0 g · 水约 47 mL', duration: 4.2 },
    { id: 'weigh', name: '称量', copy: '称量纸去皮，逐步加至 3.0 g', duration: 6.4 },
    { id: 'measure', name: '量取', copy: '先粗倒接近，再滴至约 47 mL', duration: 7.2 },
    { id: 'transfer', name: '转移', copy: '先盐后水，水沿烧杯内壁倒入', duration: 7.4 },
    { id: 'dissolve', name: '溶解', copy: '玻璃棒轻搅至晶体完全消失', duration: 6.4 },
    { id: 'bottle', name: '装瓶贴签', copy: '装瓶 · 贴 6% 标签 · 盖塞', duration: 7.2 },
  ]),
  errorAnalysis: Object.freeze([
    ['仰视量水', '实际取水偏多，质量分数偏小'],
    ['俯视量水', '实际取水偏少，质量分数偏大'],
    ['氯化钠洒出', '溶质减少，质量分数偏小'],
    ['烧杯预留少量水', '溶剂增加，质量分数偏小'],
  ]),
})
