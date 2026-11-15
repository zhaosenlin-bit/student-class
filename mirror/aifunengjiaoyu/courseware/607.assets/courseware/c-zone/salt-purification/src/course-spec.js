/**
 * AI 阅读入口：课程事实与母版约束（粗盐中难溶性杂质的去除）。
 *
 * 新课程先改这里；scene 侧从这份规格读取步骤、时长与观察证据。
 * 不要从 vendor 第三方库猜教学目标。
 */
window.__SALT_PURIFICATION_SPEC__ = Object.freeze({
  id: 'salt-purification',
  title: '粗盐中难溶性杂质的去除',
  flow: '粗盐固体 → 浑浊盐水 → 澄清滤液 → 较纯的精盐',
  primarySurface: 'macro-scene',
  sampleMassG: 5.0,
  waterMl: 50,
  apparatus: [
    '托盘天平、称量纸与药匙',
    '粗盐试剂瓶（瓶塞倒放）',
    '烧杯、量筒、胶头滴管、玻璃棒',
    '铁架台、铁圈与玻璃漏斗',
    '正确折叠的圆形滤纸',
    '接收滤液的烧杯',
    '蒸发皿与酒精灯',
  ],
  steps: [
    { id: 'weigh',     name: '称量粗盐',   copy: '称量纸上称取 5 g 粗盐', duration: 8,
      evidence: '药品放在称量纸上，指针回摆至分度盘中央',
      safety: '药品不得直接接触托盘；药匙不放在托盘上。' },
    { id: 'dissolve',  name: '加水溶解',   copy: '量筒取水，玻璃棒搅拌', duration: 10.5,
      evidence: '氯化钠溶解，泥沙悬浮使液体浑浊',
      safety: '搅拌时玻璃棒不要碰击烧杯内壁。' },
    { id: 'assemble',  name: '组装过滤',   copy: '滤纸润湿贴壁，尖嘴靠壁', duration: 9,
      evidence: '一贴：滤纸紧贴漏斗内壁；二低：滤纸低于漏斗边缘',
      safety: '滤纸边缘必须低于漏斗边缘，漏斗尖嘴紧靠烧杯内壁。' },
    { id: 'filter',    name: '过滤混合物', copy: '沿玻璃棒缓慢倾倒', duration: 11,
      evidence: '滤液澄清流入烧杯，泥沙留在滤纸上',
      safety: '液面始终低于滤纸边缘；玻璃棒轻靠三层滤纸一侧。' },
    { id: 'evaporate', name: '蒸发结晶',   copy: '边加热边用玻璃棒搅拌', duration: 11,
      evidence: '液体减少，蒸发皿边缘析出白色精盐晶体（仍可能含可溶性杂质）',
      safety: '不断搅拌，防止局部过热造成液滴飞溅。' },
    { id: 'stop',      name: '停止加热',   copy: '余热蒸干剩余水分', duration: 8.5,
      evidence: '出现较多固体即停止加热，余热蒸干',
      safety: '不得加热到完全干涸；用灯帽盖灭酒精灯。' },
  ],
  templateRules: [
    '同一份样品连续完成称量、溶解、过滤、蒸发全过程',
    '过滤必须表现一贴、二低、三靠',
    '蒸发容器必须是蒸发皿，且玻璃棒持续搅拌',
    '每一步必须改变可观察的三维状态',
    '不默认添加微观看板、数据大屏或完整实验室家具',
  ],
})
