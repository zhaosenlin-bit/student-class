window.YM={
key:'pep7a-u1-youandme-v1',
scenes:[
{id:'gate',label:'校门初识',tag:'SAY HELLO',title:'A new face at the school gate',cn:'从一句问候开始',page:'19–20',scene:'gate',person:'Peter',clip:'peter-origin',question:'May I have your name? Where are you from?',answer:"I'm Peter Brown. I'm from the UK. Nice to meet you!",hint:'先听他怎样介绍自己，再为新同学核对姓名和来自哪里。',hotspots:[{name:'Peter',x:.562,y:.60}]},
{id:'corridor',label:'走廊介绍',tag:'INTRODUCE SOMEONE',title:'Meet our English teacher',cn:'让两位新朋友认识彼此',page:'21–22',scene:'corridor',person:'Mr Smith',clip:'smith-intro',question:'Are you our English teacher? Where are you from?',answer:"I'm Mr Smith, your English teacher. I'm from the US.",hint:'Chen Jie 介绍 Peter 认识 Mr Smith。留意 English teacher 和 class teacher 的区别。',hotspots:[{name:'Mr Smith',x:.373,y:.55},{name:'Chen Jie',x:.512,y:.60,supplement:'chen-intro'}]},
{id:'classroom',label:'同班同学',tag:'BE & SPEAK',title:'We are in the same class',cn:'把“我”换成“她们”',page:'21–23',scene:'classroom-v2',person:'Ella',clip:'ella-twins-v2',question:'Are you twins? Where are you from?',answer:"We're twins. We're from the US. Are you in our class?",hint:'在班级里核对信息，练 am / is / are，再听短元音、长元音和缩略形式。',hotspots:[{name:'Ella',x:.496,y:.582},{name:'Emma',x:.603,y:.582,supplement:'emma-intro'}]},
{id:'library',label:'阅读交友帖',tag:'READ WITH EVIDENCE',title:'More than a name',cn:'找到朋友的兴趣线索',page:'24–25',scene:'library',person:'Peter',clip:'peter-hobby',question:'What is your hobby?',answer:'I play the guitar. Music is my hobby. What about you?',hint:'读 Pauline 和 Peter 的信息，区分来自哪里与现在住在哪里；没有写出的信息不能猜。',hotspots:[{name:'Peter',x:.536,y:.55}]},
{id:'reply',label:'写给新朋友',tag:'COMPARE & REPLY',title:'Something we share',cn:'不只写介绍，还要回应对方',page:'25',scene:'pavilion',hint:'比较你与新朋友的相同点和不同点，再写一条让对方愿意继续聊的回复。',hotspots:[]},
{id:'profile',label:'班级名片墙',tag:'CREATE & PRESENT',title:'This is my new friend',cn:'留下自己的介绍，再介绍别人',page:'26',scene:'pavilion',hint:'做一张自己的个人简介。介绍同学时先藏住名字，让大家根据线索猜是谁。',hotspots:[]},
{id:'extension',label:'拓展继续',tag:'BEYOND THE BOOK',title:'The welcome afternoon',cn:'第一次邀请，会发生什么？',page:'原创迁移',scene:'court',hint:'新剧情：迎新活动要组队。先读消息，再决定邀请谁；意见不同也能继续做朋友。',hotspots:[]}
],
quiz:{
gate:[
['Which name belongs to the boy you heard?',['Peter Green','Peter Brown','Mr Brown'],1,'对白中他说 Peter Brown。Peter 是名，Brown 是姓。'],
['Where is Peter from?',['The US','China','The UK'],2,'他说 from the UK；来自哪里不等于目前居住在哪里。'],
['You are meeting someone for the first time. Which reply fits?',['Nice to meet you, too.','Goodbye forever.','You are welcome.'],0,'初次见面可用 Nice to meet you, too 回应。']
],
corridor:[
['Which introduction agrees with the information here?',['Mr Smith is their English teacher.','Mr Smith is Peter’s class teacher.','Mr Smith is from the UK.'],0,'Mr Smith 的学科、国籍由视频介绍；Peter 的班主任另为 Ms Gao。'],
['Peter’s class teacher is Gao Hui. What is the correct title?',['Ms Hui','Mr Hui','Ms Gao'],2,'Gao 是姓，Hui 是名；Ms / Mr 通常接姓。'],
['“___ is my friend. ___ name is Peter.”',['His / He','He / His','He / He'],1,'He 作主语；His 修饰 name。I / my、she / her 也要分清。']
],
classroom:[
['Ella and Emma ___ twins.',['am','is','are'],2,'两个并列的人作主语，用 are。'],
['“Are you Peter?” — Which short answer is correct?',['Yes, I’m.','Yes, I am.','Yes, you are.'],1,'肯定简短回答不写成 Yes, I’m。回答者说 I am。'],
['My favourite colour ___ green.',['are','am','is'],2,'主语是单数 colour，不是 favourite，也不是 my。'],
['Choose the correct question.',['Do you are in Class 1?','Are you in Class 1?','Is you in Class 1?'],1,'含 be 的一般疑问句把 be 放在主语前，不再加 do。']
],
library:[
['Peter is from London. Where does he live now?',['Singapore','Beijing','London'],1,'来自英国伦敦，目前与家人在北京生活。用现在居住地的句子作证据。'],
['Which statement is supported by Pauline’s post?',['Coco is a boy.','Coco is a parrot.','Coco plays tennis.'],1,'Pauline 的宠物是雌性鹦鹉 Coco。网球是 Pauline 的兴趣。'],
['What is Pauline’s favourite food?',['Beijing roast duck','Beef noodles','Not stated'],2,'她的帖子没有提供最喜欢的食物。不能把 Peter 或 Andre 的信息移给她。']
]
},
posts:{
Pauline:{name:'Pauline Lee',lines:[
['pa-age','Pauline is fourteen. Her home is in Singapore, where she lives with her family.'],
['pa-pet','Her pet, Coco, is a female parrot. Coco knows a few words in Chinese.'],
['pa-sport','Tennis is Pauline’s favourite sport. After school, she enjoys playing with friends.']
],icon:'P',color:'purple'},
Peter:{name:'Peter Brown',lines:[
['pe-age','Peter is thirteen. He comes from London in the UK; his family now lives in Beijing.'],
['pe-food','He enjoys Beijing roast duck most, and the Great Wall is his favourite place.'],
['pe-hobby','He loves music and plays the guitar. He would like to meet new friends.']
],icon:'P',color:'green'}
},
audios:[
['chen-intro','af_heart','This is Peter, my new friend. Mr Smith is our English teacher.','示范 · Chen Jie 介绍他人'],
['emma-intro','af_bella',"Ella is my sister. She and I are twins. We are from the US.",'示范 · 人称转换'],
['gao-correction','af_heart',"Gao is her family name. Hui is her given name. We call her Ms Gao.",'示范 · 纠正称呼'],
['sheep','af_heart','Sheep. Sheep.','sheep'],
['ship','af_heart','Ship. Ship.','ship'],
['bed','af_heart','Bed. Bed.','bed'],
['bad','af_heart','Bad. Bad.','bad'],
['contraction','af_heart',"I'm thirteen. He's my friend. We're in the same class.",'缩略形式示范'],
['fullform','af_heart','I am thirteen. He is my friend. We are in the same class.','完整形式示范'],
['speak-intro','af_heart',"Hello, I'm Alex. This is my friend. Her name is Mei. We like music.",'原创介绍示范'],
['emma-extension','af_bella',"I like drawing. My sister likes music. We're different, and we're good friends.",'原创拓展 · Emma 的新消息'],
['music-result','am_michael',"I like your picture. Let's make a welcome card together.",'音乐路线 · Peter 的回应'],
['sport-result','af_bella',"You can draw the team sign. We can try the game together.",'运动路线 · Emma 的回应'],
['extension-invite','af_heart',"Would you like to join us? What do you like doing?",'拓展邀请示范']
],
branches:{
music:{name:'音乐角 · Welcome card',title:'A picture for a song',body:'Peter brings his guitar to the welcome afternoon. Emma carries a sketchbook. “I do not play the guitar,” she says. Peter shows her a blank welcome card. “Your picture can be on the card. My song can welcome everyone.” Emma smiles and opens her sketchbook.',question:['Why can Emma join Peter?',['She can draw a picture for the card.','She is already a guitar teacher.','They are both from the UK.'],0,'她可以画卡片；合作不要求两个人有完全相同的技能或国籍。'],end:'They make a welcome card with a picture and a short song. Emma feels included. You can help by writing a greeting.',audio:'music-result'},
sport:{name:'活动场 · Team sign',title:'A different way to join',body:'At the activity court, Emma wants to draw a team sign before trying a new game. One student says, “Only good players can join.” You read the welcome note: “Everyone is welcome. You can draw, play, or cheer.” You show the note to the group.',question:['Which reply follows the welcome note?',['You cannot join if you cannot play well.','You can draw first, and try the game with us.','Only students from our class can join.'],1,'公告允许 draw、play 或 cheer。用阅读信息改变小组的决定。'],end:'The group makes space for Emma. She draws the sign and then tries the game with a partner. You can welcome someone else, too.',audio:'sport-result'}
}
};