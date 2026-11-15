// Chapter 2 only. Dialogue is a teaching reconstruction, not a verbatim historical quotation.
export const scenes = {
 tennis:{title:'会议不能就这么散',place:'1789年6月20日 · 凡尔赛 · 临时会场附近',media:'tennis',gate:'tennis',advance:'跟上代表们',next:'follow',exit:{u:.74,v:.59},people:[
  {id:'clergy',label:'教士代表',u:.375,v:.60,bounds:{left:.34,right:.414,top:.48,bottom:.83},flag:'whyNotDisband',lines:[
   '别回去。我们已经和第三等级一起组成了国民议会。',
   '今天如果又各自回到原来的等级里，前面争取来的东西，就又退回去了。',
   '门可以关。会议不能就这么散。']},
  {id:'third',label:'第三等级代表',u:.491,v:.60,bounds:{left:.465,right:.53,top:.50,bottom:.78},flag:'nationalAssemblyMeaning',lines:[
   '三天前，我们已经宣布组成国民议会。我们现在要讨论的，已经不只是第三等级自己的事情。',
   '税怎么收，法律怎么定，法国以后怎么治理——这些都关系到整个国家。',
   '所以我们认为，自己代表的是“国民”，而不只是三个等级中的一个等级。'],knowledge:['国民议会','代表们开始主张：自己代表整个国民，而不仅是第三等级。'],knowledgeKeywords:['国民议会','整个国民','第三等级']},
  {id:'lawyer',label:'懂法律的代表',u:.635,v:.60,bounds:{left:.606,right:.668,top:.49,bottom:.81},flag:'constitutionUnderstood',lines:[
   '光是继续开会，还不够。法国以后怎么治理，必须真正写清楚。',
   '国王能做什么，代表机构能做什么，权力受到什么限制——不能再只靠谁临时说了算。',
   '我们要制定一部宪法。'],knowledge:['宪法','规定国家基本制度和国家权力运行的基本规则。'],knowledgeKeywords:['宪法','国家基本制度','国家权力','基本规则']}
 ]},
 // Anchors checked against the first, middle and last frames of the supplied 6121 clip.
 paris:{title:'巴黎为什么越来越紧张？',place:'1789年7月 · 巴黎街道',media:'paris',gate:'paris',autoAdvance:true,next:'paris-question',people:[
  {id:'district1',label:'街区成员',u:.119,v:.601,bounds:{left:.088,right:.141,top:.413,bottom:.86},flag:'parisPressure',lines:[
   '巴黎周围，集结着越来越多的军队。很多人担心，国民议会和现在的改革，会被强行压下去。',
   '内克尔又被国王撤掉了。街上的人都觉得，这不是一个好信号。']},
  {id:'district2',label:'街区成员',u:.470,v:.647,bounds:{left:.432,right:.50,top:.527,bottom:.896},flag:'weaponsNeeded',lines:[
   '现在大家最怕的，是军队真的进城。',
   '有人已经开始找武器。荣军院那边有枪。',
   '可有了枪，还得有火药。']},
  {id:'district3',label:'街区成员',u:.899,v:.603,bounds:{left:.88,right:.926,top:.516,bottom:.788},flag:'bastilleMeaning',lines:[
   '有人说，巴士底狱里储着火药。',
   '那地方不只是监狱。对很多巴黎人来说，它一直是国王专制权力的象征。']}
 ]},
 bastille:{title:'巴士底狱门前',place:'1789年7月14日 · 巴黎',media:'bastille',gate:'bastille',autoAdvance:true,next:'bastille-choice',people:[
  {id:'negotiation',label:'传递消息的人',u:.148,v:.70,bounds:{left:.111,right:.192,top:.58,bottom:.91},flag:'negotiationHeard',lines:[
   '别往前挤。已经有人进去交涉了。',
   '大家想要里面的火药。也有人要求，别让堡垒里的炮口继续对着街道。']},
  {id:'tension',label:'等候的街坊',u:.79,v:.73,bounds:{left:.745,right:.85,top:.64,bottom:.99},flag:'tensionHeard',lines:[
   '前面已经谈了几轮。可里面和外面，越来越不信任对方。',
   '人群还在增加。再拖下去，谁也不知道会发生什么。']},
  {id:'symbol',label:'附近的居民',u:.874,v:.61,bounds:{left:.85,right:.903,top:.50,bottom:.71},flag:'symbolHeard',lines:[
   '我来这里，不只是为了火药。',
   '这座堡垒一直提醒着我们——国王的权力，可以压在普通人的头上。']}
 ]}
};

export const platformSpeech='各位代表！今天，会场的大门关上了，我们却没有散去。既然在这里重新聚到了一起，我们就要作出一个共同的决定。';

export const questions={
 constitution:{title:'各位代表，接下来，我们应当以什么身份、为了什么目标继续行动？',correct:1,options:[
  '各自回到原来的三个等级，等待国王重新安排',
  '继续以国民议会的身份开会，直到制定出宪法',
  '现在就废除国王，建立共和国'],feedback:[
  '这样做，就意味着重新接受三个等级分开议事。刚刚形成的国民议会，很可能退回原来的状态。',
  '这正是代表们现在坚持的方向。他们不愿因为会场关闭，就放弃已经开始的政治改变。',
  '现在是1789年6月。代表们当前争取的核心仍然是制定宪法、重新规定国家权力、限制旧有的专断权力。法国还没有走到共和国阶段。']},
 paris:{title:'为什么1789年7月的巴黎越来越紧张？',correct:1,options:[
  '只是因为面包还很贵',
  '生活压力没有消失，同时人们又担心军队镇压改革',
  '因为共和国刚刚建立，国王准备夺回政权'],feedback:[
  '生活困难仍然存在。但现在还多了一层新的问题：人们担心军队会镇压正在发生的政治改革。',
  '生活压力与政治危机交织在一起。人们担心，正在发生的改革会被军队压下去。',
  '共和国还没有建立。现在仍然是1789年。']},
 significance:{title:'为什么攻占巴士底狱通常被看作法国大革命开始的重要标志？',correct:1,options:[
  '因为法国当天建立了共和国',
  '因为巴黎民众直接行动，打击了专制王权的象征，并推动革命进一步发展',
  '因为巴士底狱里关着成千上万名革命领袖'],feedback:[
  '共和国的建立发生在更晚的1792年。',
  '群众行动与政治象征，使这一天成为法国大革命开始的重要标志。',
  '不能把巴士底狱事件理解成“救出成千上万革命领袖”。它的重要性更多来自政治象征和群众行动。']}
};

export const histories={
 'oath-history':{background:'oathBG',next:'situation',pages:[
  ['1789年6月20日','网球场宣誓'],
  ['国民议会代表宣誓：','在法国制定出宪法以前，','不解散。'],
  ['第三等级的政治要求，正在发生变化。','从“让我们的声音被听见”','走向“重新规定法国的权力规则”']
 ]},
 'paris-transition':{background:'parisBG',next:'paris',lastButton:'进入街区',pages:[
  ['国民议会没有解散。越来越多代表加入共同议事。','但是——','巴黎周围，越来越多军队正在集结。'],
  ['1789年7月 · 巴黎']
 ]},
 invalides:{background:'invalidesBG',next:'bastille',lastButton:'前往巴士底狱',pages:[
  ['巴黎民众从荣军院取得了枪支。','枪有了。','火药还不够。'],
  ['有人想起了——','巴士底狱。']
 ]},
 'bastille-history':{background:'bastilleBG',next:'knowledge',pages:[
  ['1789年7月14日','巴黎民众攻占巴士底狱。'],
  ['巴士底狱不仅储存武器和火药，','也长期被看作','专制王权的象征。'],
  ['巴黎民众直接参与行动，','使革命从议会里的政治斗争，','进一步发展为广泛的群众行动。']
 ]},
 ending:{background:'eveningBG',next:'chapter3',pages:[
  ['巴士底狱的大门已经打开。','但是——打破旧规则以后，','新的法国，应该按照什么规则运行？'],
  ['1789年8月。','人们开始把一些新的原则，','正式写下来。'],
  ['自由','平等','权利']
 ]}
};

export const summary=[
 ['国民议会坚持继续开会','6月20日，原来的会场关闭。代表们转移到网球场。','doorBG'],
 ['要求制定宪法','用宪法重新规定国家权力，限制旧有的专断权力。','documentsBG'],
 ['网球场宣誓','1789年6月20日。代表们表示：在制定宪法以前，不解散。','oathBG'],
 ['巴黎政治危机升级','军队集结和政治变化，使巴黎人担心改革受到镇压。','parisBG'],
 ['攻占巴士底狱','1789年7月14日，巴黎民众攻占巴士底狱，成为法国大革命开始的重要标志。','bastilleBG']
];

export const memories=[
 {label:'关闭的大门',image:'doorBG',question:'为什么还要继续？',answer:1,options:['会场的关闭意味着改革已经完成。','国民议会不愿退回三个等级分开议事。'],explanation:'门被关上，并不意味着国民议会愿意放弃已经争取来的政治改变。'},
 {label:'网球场',image:'oathBG',question:'为什么要宣誓？',answer:0,options:['为了坚持制宪，在宪法完成前不解散。','为了宣布法国已经成为共和国。'],explanation:'代表们坚持的是制定宪法、重新规定国家权力。'},
 {label:'巴黎公告与人群',image:'parisBG',question:'为什么局势越来越紧张？',answer:1,options:['生活已经好转，人们只是在庆祝。','军队集结，民众担心改革遭到镇压。'],explanation:'议会中的改革遇到压力，巴黎人的担忧开始转化为行动。'},
 {label:'寻找武器',image:'invalidesBG',question:'为什么去巴士底狱？',answer:0,options:['既需要火药，也因为它象征专制王权。','只是为了释放成千上万名革命领袖。'],explanation:'火药是直接需求；专制王权的象征赋予行动更深的政治意义。'},
 {label:'7月14日 · 攻占巴士底狱',image:'bastilleBG'}
];
export const finalChain=['国民议会坚持改革','要求制定宪法','王权与改革矛盾升级','巴黎群众开始行动','攻占巴士底狱'];
