/* Original teaching activities aligned to PEP Grade 7, Unit 6, pp.41–48. */
const RainShine=(()=>{
const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim();
const words=s=>(String(s||'').match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[]).length;
const scenes={sunny:{zh:'晴天 · 校园天气观测角',people:[{id:'ella',name:'Ella',yaw:-4.5,pitch:7},{id:'teng',name:'Teng Fei',yaw:4,pitch:9}]},mountain:{zh:'假日片段 · 黄山休息区',people:[{id:'peter',name:'Peter',yaw:-4.5,pitch:5},{id:'helen',name:'Helen',yaw:3,pitch:7}]},library:{zh:'雨天 · 校园图书馆',people:[{id:'ella',name:'Ella',yaw:-3.5,pitch:14},{id:'teng',name:'Teng Fei',yaw:9,pitch:14}]}};
const talks={
'ella-weather':{scene:'sunny',person:'ella',q:"What's the weather like?",line:"It's warm and sunny. It's about twenty-two degrees.",zh:'温暖晴朗，大约22摄氏度。',intent:'weather'},
'teng-usually':{scene:'sunny',person:'teng',q:'What do you usually do, and what are you doing now?',line:"We usually play outside. Today, we're checking the weather.",zh:'我们平时在外面玩，今天正在查看天气。',intent:'activity'},
'peter-feeling':{scene:'mountain',person:'peter',q:'How are you feeling?',line:"It's foggy, and my shoes are wet. I'm feeling tired.",zh:'雾蒙蒙的，鞋子也湿了。我觉得累。',intent:'feeling'},
'helen-view':{scene:'mountain',person:'helen',q:'What do you think of the view?',line:"The clouds look amazing! Let's rest here and enjoy the view.",zh:'云景真美！我们在这里休息，欣赏风景吧。',intent:'view'},
'ella-rain':{scene:'library',person:'ella',q:"What's the weather like, and what are you doing?",line:"It's raining heavily. We're making our weather report indoors.",zh:'外面雨下得很大，我们正在室内做天气报道。',intent:'weather'},
'teng-change':{scene:'library',person:'teng',q:'What is the new plan?',line:"The playground is closed. Let's move our activities to the library.",zh:'操场关闭了。我们把活动转移到图书馆吧。',intent:'plan'}
};
function match(person,scene,text){const n=norm(text);return Object.entries(talks).find(([,t])=>t.person===person&&t.scene===scene&&(n===norm(t.q)||({weather:/\b(weather|temperature|rain|raining|sunny|degrees)\b/,activity:/\b(doing|usually|normally|often|activity|activities)\b/,feeling:/\b(feel|feeling|tired|shoes|foggy)\b/,view:/\b(view|clouds|think|scenery|mountain)\b/,plan:/\b(plan|playground|closed|move|library|activities)\b/}[t.intent]).test(n)))?.[0]||null}
const quiz=[
{id:'habit',q:'Ella usually ___ outside, but she ___ in the library now.',options:['reads; is reading','is reading; reads','read; reading'],answer:0,why:'usually描述习惯，用一般现在时；now描述此刻动作，用be + -ing。',transfer:{q:'Look! Teng Fei ___ a report. He often ___ reports on Fridays.',options:['writes; is writing','is writing; writes','writing; write'],answer:1}},
{id:'rain',q:'Choose the correct question about the weather.',options:["How's the weather like?","What's the weather like?","What's weather doing?"],answer:1,why:'常见问法是What’s the weather like?或How’s the weather?，不混合两种结构。',transfer:{q:'另一种正确问法是…',options:["How's the weather?","How does the weather like?","What weather is like?"],answer:0}},
{id:'form',q:'Listen! It ___ heavily outside.',options:['rain','is rainy','is raining'],answer:2,why:'此处强调正在下雨：is raining。rainy是形容词，可说It is rainy，但不用is rainy heavily。',transfer:{q:'It often ___ here in spring.',options:['rains','is raining','raining'],answer:0}},
{id:'state',q:'用一般现在时描述景物：The mountain ___ beautiful in the sunlight.',options:['is looking','looks','look'],answer:1,why:'look在这里表示“看起来”的状态，通常用一般现在时；不能见到画面就把所有动词都写成进行时。',transfer:{q:'用一般现在时描述味道：The soup ___ good.',options:['is tasting','taste','tastes'],answer:2}},
{id:'agreement',q:'What ___ your friends doing at the moment?',options:['do','is','are'],answer:2,why:'friends为复数，现在进行时疑问句用are + 主语 + -ing。',transfer:{q:'___ Peter wearing a green hoodie now?',options:['Is','Are','Does'],answer:0}},
{id:'negative',q:"It ___ snow here in summer, but look—it ___ snowing in this film!",options:["doesn't; is","isn't; does","don't; are"],answer:0,why:'习惯/通常情况的否定用doesn’t + 动词原形；影片此刻的动作使用is snowing。',transfer:{q:'Helen ___ stay indoors every weekend.',options:["isn't","doesn't","don't"],answer:1}}
];
// Concise rewritten summaries, not a reproduction of the textbook posts.
const posts=[
{id:'p1',person:'Peter',time:'06:35',place:'登山途中',text:'Fog hides much of the mountain. The wet path slows our family down. I am not enjoying the walk.',feeling:'unhappy'},
{id:'h1',person:'Helen',time:'07:22',place:'登山途中',text:'The mountain seems magical to me. I love the clouds, trees and rocks.',feeling:'happy'},
{id:'p2',person:'Peter',time:'09:15',place:'休息区',text:'My shoes are wet and dirty. I feel tired, but other visitors are laughing. Helen is cheerful too.',feeling:'unhappy'},
{id:'h2',person:'Helen',time:'09:18',place:'休息区',text:'We are taking a break and making progress. I want to encourage Peter, who is not enjoying the trip much.',feeling:'happy'},
{id:'h3',person:'Helen',time:'10:36',place:'光明顶',text:'Sunlight is coming through the clouds. I am glad to see the view from Bright Peak.',feeling:'happy'},
{id:'p3',person:'Peter',time:'10:41',place:'光明顶',text:'I am still tired and hungry, but reaching the top feels good. The sunlight makes the mountain beautiful.',feeling:'better'}
];
const readingQuestions=[{q:'刚开始，谁更享受这次旅行？',options:[['helen','Helen'],['peter','Peter'],['same','两人感受完全相同']],answer:'helen',evidence:'h1',why:'Helen使用积极评价；Peter的首帖表达不喜欢当时的行程。'},
{q:'Peter在休息区为什么感到不舒服？',options:[['wet','鞋子湿脏，而且很累'],['alone','找不到家人'],['hot','天气太热']],answer:'wet',evidence:'p2',why:'休息区帖子说明了鞋子和疲劳；没有提到迷路。'},
{q:'到山顶后，Peter的感受怎样变化？',options:[['worse','只剩下不开心'],['better','仍累，但感到登顶值得'],['none','完全不累也不饿']],answer:'better',evidence:'p3',why:'身体状态和心情可以同时不同：仍然累、饿，同时感觉很好。'},
{q:'Helen想怎样帮助Peter？',options:[['leave','让他独自返回'],['encourage','鼓励他'],['buy','为他买鞋']],answer:'encourage',evidence:'h2',why:'09:18的信息明确说明想鼓励Peter。'}];
const cities=[{id:'school',name:'Our school',zh:'校园',x:53,y:36,weather:'sunny',temp:22,season:'spring',month:'May',activity:'checking the weather',advice:'take a hat',origin:'原创教学样例'},
{id:'sanya',name:'Sanya',zh:'三亚',x:78,y:71,weather:'sunny',temp:28,season:'spring',month:'May',activity:'playing beach volleyball',advice:'drink water',origin:'温度与活动对应P43—44，日期为练习设定'},
{id:'stockholm',name:'Stockholm',zh:'斯德哥尔摩',x:26,y:21,weather:'snowy',temp:-3,season:'winter',month:'January',activity:'building a snowman',advice:'wear a warm coat',origin:'温度与活动对应P43—44，日期为练习设定'},
{id:'chengdu',name:'Chengdu',zh:'成都',x:65,y:53,weather:'rainy',temp:20,season:'spring',month:'April',activity:'doing indoor activities',advice:'carry an umbrella',origin:'对应P48的教材示例'},
{id:'huangshan',name:'Mount Huangshan',zh:'黄山',x:76,y:40,weather:'foggy',temp:16,season:'spring',month:'May',activity:'resting at a rest area',advice:'walk slowly on wet paths',origin:'结合P46场景的原创天气数据'}];
const weather=[['sunny','sunny · 晴朗'],['rainy','rainy · 下雨'],['snowy','snowy · 下雪'],['cloudy','cloudy · 多云'],['windy','windy · 有风'],['foggy','foggy · 有雾'],['stormy','stormy · 暴风雨'],['dry','dry · 干燥']];
const updates=[{id:'old',time:'08:30',source:'Earlier plan',text:'Twenty students are meeting on the playground at 2 p.m. for the weather project.'},
{id:'rain',time:'12:20',source:'School notice',text:'It is raining heavily. The playground is closed this afternoon.'},
{id:'library',time:'12:25',source:'Librarian',text:'The library project room has 24 seats. It is open from 1:30 to 3:30 p.m. Students can make posters and read weather stories there.'},
{id:'art',time:'12:28',source:'Art teacher',text:'The art room has 12 seats. It is open from 2 to 4 p.m.'},
{id:'rumour',time:'12:30',source:'Unconfirmed comment',text:'Someone says the playground may open soon. There is no new school notice.'}];
const initial=()=>({version:1,name:'',step:0,done:{},heard:{},log:[],weather:{condition:'',temp:'',reply:''},call:{habit:'',now:'',reply:'',phoneMode:true},quiz:{},transfers:{},builder:{subject:'I',time:'now',activity:'read'},reading:readingQuestions.map(()=>({answer:'',evidence:''})),timeline:0,plan:{city:'chengdu',weather:'',temp:'',activity:'',advice:''},report:{draft:'',checks:{facts:false,tenses:false,review:false},reply:''},postcard:{weather:'sunny',caption:'',strokes:[],review:false},extension:{evidence:[],venue:'',reason:'',message:'',review:false},reflection:'',attempts:{}});
return {key:'rain-shine-7b-u6-v1',norm,words,scenes,talks,match,quiz,posts,readingQuestions,cities,weather,updates,initial,steps:['weather','call','grammar','read','plan','report','postcard','extend'],titles:['天气采访','平时与现在','时态实验','黄山心情','天气信息板','我的播报','天气体验卡','拓展继续'],sceneFor:['sunny','sunny','sunny','mountain','library','library','mountain','library'],fiction:'校园情节与对话为原创教学迁移；天气数据是教学样例，并非实时预报。'};
})();
if(typeof module!=='undefined')module.exports=RainShine;
