const configuredModule=id=>async()=>{
  const module=await import('../chapters/knowledgeChapter.js?v=60');
  return{createChapter:context=>module.createKnowledgeChapter(id,context)};
};

export const chapterRegistry=[
  {id:'shuowen',title:'《说文解字》第一',shortTitle:'说文解字',subtitle:'观字形 · 察字源 · 识六书',group:'经',enabled:true,taskCount:3,module:()=>import('../chapters/shuowen.js')},
  {id:'zhouyi',title:'《周易》第二',shortTitle:'周易',subtitle:'旋八卦 · 观阴阳 · 知变化',group:'经',enabled:true,taskCount:2,module:()=>import('../chapters/zhouyi.js?v=44')},
  {id:'shangshu',title:'《尚书》第三',shortTitle:'尚书',subtitle:'入朝堂 · 理四代 · 辨记言',group:'经',enabled:true,taskCount:2,module:configuredModule('shangshu')},
  {id:'shijing',title:'《诗经》第四',shortTitle:'诗经',subtitle:'听风雅 · 观礼乐 · 识赋比兴',group:'经',enabled:true,taskCount:2,module:configuredModule('shijing')},
  {id:'sanjia',title:'三礼第五',shortTitle:'三礼',subtitle:'登礼殿 · 分三礼 · 明制度',group:'经',enabled:true,taskCount:2,module:configuredModule('sanjia')},
  {id:'chunqiu',title:'《春秋》三传第六（《国语》附）',shortTitle:'春秋三传',subtitle:'展史卷 · 辨叙事 · 察解经',group:'史',enabled:true,taskCount:2,module:configuredModule('chunqiu')},
  {id:'sishu',title:'四书第七',shortTitle:'四书',subtitle:'入书院 · 理篇次 · 溯礼记',group:'经',enabled:true,taskCount:2,module:configuredModule('sishu')},
  {id:'zhanguo',title:'《战国策》第八',shortTitle:'战国策',subtitle:'观七国 · 合纵横 · 察游说',group:'史',enabled:true,taskCount:2,module:configuredModule('zhanguo')},
  {id:'shiji',title:'《史记》《汉书》第九',shortTitle:'史记汉书',subtitle:'筑书塔 · 分通史 · 辨断代',group:'史',enabled:true,taskCount:2,module:configuredModule('shiji')},
  {id:'zhuzi',title:'诸子第十',shortTitle:'诸子',subtitle:'听百家 · 辨思想 · 观争鸣',group:'子',enabled:true,taskCount:2,module:configuredModule('zhuzi')},
  {id:'cifu',title:'辞赋第十一',shortTitle:'辞赋',subtitle:'展长卷 · 分辞赋 · 读名篇',group:'集',enabled:true,taskCount:2,module:configuredModule('cifu')},
  {id:'shi',title:'诗第十二',shortTitle:'诗',subtitle:'行长廊 · 排诗史 · 识李杜',group:'集',enabled:true,taskCount:2,module:configuredModule('shi')},
  {id:'wen',title:'文第十三',shortTitle:'文',subtitle:'循文脉 · 排古今 · 完经典',group:'集',enabled:true,taskCount:2,module:configuredModule('wen')}
];
