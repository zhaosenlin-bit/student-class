(function(root){
const C={key:'here-now-7b-u5-v1',version:1,steps:['observe','phone','grammar','read','write','flats','broadcast','extend'],titles:['此刻的校园','电话那一端','句子正在发生','同一时刻，不同地方','写一段现场报道','我们的公寓','准备播报','拓展继续'],pages:['P34 / P39','P35–36','P37','P36 / P38–39','P39','P40','P39–40 迁移','原创拓展'],sceneFor:['garden','festival','garden','studio','studio','garden','studio','studio'],scenes:{garden:{zh:'校园花园 · 阅读与画画',people:[{id:'peter',name:'Peter',yaw:-11,pitch:-8},{id:'ella',name:'Ella',yaw:13,pitch:-8}]},festival:{zh:'文化体验工坊 · 包粽子',people:[{id:'jane',name:'Jane',yaw:-13,pitch:-3},{id:'hao',name:'Hao Yi',yaw:9,pitch:-3}]},studio:{zh:'校园播报角 · 记录此刻',people:[{id:'teng',name:'Teng Fei',yaw:2,pitch:-14}]}},talks:{
'peter-reading':{person:'peter',scene:'garden',q:'What are you doing right now?',line:"I'm reading a book. Ella is drawing the school garden.",zh:'我正在看书。Ella正在画校园花园。'},
'ella-drawing':{person:'ella',scene:'garden',q:'Are you drawing the garden?',line:"I'm drawing the garden. Peter is reading beside me.",zh:'我正在画花园。Peter正在我旁边看书。'},
'jane-making':{person:'jane',scene:'festival',q:'What are you making for the festival?',line:"We're making zongzi for the festival. Hao Yi is helping.",zh:'我们正在为节日包粽子。Hao Yi正在帮忙。'},
'hao-message':{person:'hao',scene:'festival',q:'Could I speak to Jane, please?',line:'Jane is busy right now. Can I take a message?',zh:'Jane现在正忙。我可以帮你留言吗？'},
'teng-live':{person:'teng',scene:'studio',q:'What are we sharing today?',line:"This is Teng Fei. We're sharing our school life today.",zh:'我是Teng Fei。我们今天正在分享校园生活。'},
'teng-update':{person:'teng',scene:'studio',q:'What is happening to the camera?',line:"The camera isn't working. Please check the latest messages.",zh:'摄像机无法正常工作了。请核对最新消息。'}},
actions:[['reading','reading a book'],['drawing','drawing the garden'],['running','running'],['making','making zongzi'],['cleaning','cleaning a table'],['cooking','cooking'],['playing','playing the piano']],
quiz:[
{id:'be',q:'Look! Peter ____ reading a book.',options:['am','is','are'],answer:1,why:'现在进行时用be + 动词-ing；Peter是单数，用is。',transfer:{q:'Look! The children ____ reading.',options:['is','am','are'],answer:2}},
{id:'question',q:'____ Jane and Hao Yi making zongzi?',options:['Do','Are','Is'],answer:1,why:'现在进行时一般疑问句把be提到主语前；两个人用are。',transfer:{q:'____ Ella drawing?',options:['Is','Does','Are'],answer:0}},
{id:'negative',q:'根据画面，Ella在画画，没有跑步：',options:["Ella doesn't running.","Ella isn't running.",'Ella not running.'],answer:1,why:'否定结构为主语 + be not + 动词-ing。',transfer:{q:'They ____ playing football now.',options:['not','is not','are not'],answer:2}},
{id:'what',q:'What ____ you doing right now?',options:['do','are','is'],answer:1,why:'特殊疑问句：What + be + 主语 + doing?',transfer:{q:'What ____ Teng Fei doing?',options:['is','does','are'],answer:0}},
{id:'write',q:'write 的现在分词是：',options:['writeing','writing','writting'],answer:1,why:'write去掉词尾不发音的e再加-ing；make→making。',transfer:{q:'make →',options:['makeing','making','makking'],answer:1}},
{id:'run',q:'run 的现在分词是：',options:['runing','running','runs'],answer:1,why:'run重读闭音节末尾为一个辅音字母，双写n再加-ing。',transfer:{q:'swim →',options:['swiming','swims','swimming'],answer:2}},
{id:'regular',q:'They are ____ volleyball.',options:['playing','playying','plays'],answer:0,why:'play直接加-ing，不双写y。',transfer:{q:'read →',options:['reading','readding','reads'],answer:0}},
{id:'contrast',q:'复习迁移：I usually read here, but now I ____ a picture.',options:['draw','am drawing','drawing'],answer:1,why:'usually表示习惯；now强调此刻正在进行。与上一单元已学表达比较。',transfer:{q:'She reads every day. Look! She ____ now.',options:['is reading','read','reading'],answer:0}}
],
reading:{title:'Three Messages, One Moment',sentences:[
'In this classroom example, it is 8 p.m. in Chongqing, 3 p.m. in Nairobi, and 8 a.m. in New York. The messages describe one moment.',
'Chongqing — Mei: I am eating dinner with my family. My brother is taking photos of the river.',
'Nairobi — Nia: I am reading under a tree. Two friends are walking in the park.',
'New York — Sam: I am waiting for a bus. My sister is having breakfast at home.'
],questions:[{q:"Mei's brother is taking photos.",answer:'T',evidence:'1'},{q:'Nia is running in the park.',answer:'F',evidence:'2'},{q:'Sam takes this bus every day.',answer:'NG',evidence:'none'},{q:'All three places have the same local clock time.',answer:'F',evidence:'0'},{q:"Sam's sister is having breakfast.",answer:'T',evidence:'3'}]},
cities:[{id:'chongqing',name:'Chongqing',offset:8},{id:'nairobi',name:'Nairobi',offset:3},{id:'newyork',name:'New York',offset:-4}],
updates:[{id:'old',time:'15:00',text:'Garden camera: Peter is reading a book. Ella is drawing the garden.',kind:'earlier'},
{id:'ella',time:'15:10',text:'Ella: We are carrying our books into the library. The garden activity is over.',kind:'confirmed'},
{id:'hao',time:'15:11',text:'Hao Yi: We are cleaning the workshop table now. Jane is putting the leaves away.',kind:'confirmed'},
{id:'teng',time:'15:12',text:'Teng Fei: Record at 15:20. Please report the newest confirmed activities.',kind:'confirmed'},
{id:'rumour',time:'无时间',text:'Unverified comment: Everyone is playing volleyball outside.',kind:'unverified'}],
fiction:'校园活动、消息和对话均为原创迁移情境；人物姓名、服饰参考与教材页码在教师备课页单独列明。'};
C.norm=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();C.words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
C.intent=(text,person,extension)=>{const n=C.norm(text);if(person==='peter'&&/what.*doing|are.*reading|what.*read/.test(n))return 'peter-reading';if(person==='ella'&&/what.*doing|are.*drawing/.test(n))return 'ella-drawing';if(person==='jane'&&/what.*(making|doing)|making.*zongzi/.test(n))return 'jane-making';if(person==='hao'&&/jane/.test(n)&&/speak|talk|there|call/.test(n))return 'hao-message';if(person==='teng'){if(extension&&/camera|happening|messages|wrong/.test(n))return 'teng-update';if(!extension&&/sharing|share|today|doing/.test(n))return 'teng-live'}return null};
C.messageValid=s=>{const n=C.norm(s);return C.words(s)>=10&&/call (me )?back/.test(n)&&/three ten|3 10|15 10/.test(n)&&!/\b(no|not|dont|never)\b/.test(n)};
C.clock=(utc,offset)=>{const t=Number(utc)+offset;return{hour:((t%24)+24)%24,day:Math.floor(t/24)}};
C.readingValid=rows=>C.reading.questions.every((q,i)=>rows[i]?.answer===q.answer&&rows[i]?.evidence===q.evidence);
C.flatValid=f=>f.rows.length===3&&f.rows.every(r=>r.name.trim().length>0&&r.name.trim().length<=24&&C.actions.some(a=>a[0]===r.action)&&r.be===(r.number==='many'?'are':'is'))&&[0,1,2].every(room=>f.strokes.some(s=>s.room===room&&s.points.length>=2))&&f.review===true;
C.extensionValid=e=>['ella','hao','teng'].every(id=>e.evidence.includes(id))&&e.evidence.length===3&&e.garden==='carrying'&&e.workshop==='cleaning'&&e.source==='latest'&&C.words(e.correction)>=18&&e.review===true;
C.initial=()=>({version:1,name:'',step:0,done:{},heard:{},log:[],observe:{peter:'',ella:'',reply:''},phoneMode:true,phone:{activity:'',recipient:'',message:''},quiz:{},transfers:{},builder:{subject:'Peter',action:'reading'},clockUTC:12,clockTouched:false,reading:{},draft:'',writeChecks:{},flats:{name:'',rows:[{name:'',number:'one',be:'',action:''},{name:'',number:'one',be:'',action:''},{name:'',number:'many',be:'',action:''}],strokes:[],review:false},broadcast:{order:['','',''],reply:'',review:false},extension:{evidence:[],garden:'',workshop:'',source:'',correction:'',review:false}});
if(typeof module==='object'&&module.exports)module.exports=C;root.HereNow=C;
})(typeof globalThis!=='undefined'?globalThis:this);
