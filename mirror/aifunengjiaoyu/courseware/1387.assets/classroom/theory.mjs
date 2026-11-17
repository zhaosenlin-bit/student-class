export const LETTERS=['C','D','E','F','G','A','B'];
export const SOLFEGE={0:'do',2:'re',4:'mi',5:'fa',7:'sol',9:'la',11:'si',3:'降mi'};
export function noteName(m){return ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][m%12]+(Math.floor(m/12)-1);}
export function chordNotes(quality='major',inversion=0){const a=[60,quality==='minor'?63:64,67];for(let i=0;i<inversion;i++)a.push(a.shift()+12);return a;}
export function buildEvents({lesson=0,quality='major',inversion=0,count=3,style='block',tempo=90,melody=true,meter=4,rests=[],rhythm=[1,1,1,1],tune=[60,62,64,67,69,67,62,60],expression="soft"}={}){
 const beat=60/tempo,events=[];const add=(notes,t,d,v=.66,role='harmony')=>notes.forEach(midi=>events.push({midi,time:t*beat,duration:d*beat,velocity:v,role}));
 if(lesson===3){for(let b=0;b<meter*2;b++){const n=rests.includes(b%meter)?0:rhythm[b%meter];for(let k=0;k<n;k++)add([67],b+k/n,.7/n,b%meter===0?.8:.48,'pulse');}return {events,duration:meter*2*beat,beats:meter*2};}
 if(lesson===4){tune.forEach((m,i)=>{if(m!==0)add([m],i,.85,.65,'melody');});return {events,duration:8*beat,beats:8};}
 if(lesson===5){[60,62,64,67,69,67,64,60].forEach((m,i)=>add([m],i,.85,expression==='soft'?.32:expression==='loud'?.86:.28+i*.08,'melody'));return {events,duration:8*beat,beats:8};}
 const notes=chordNotes(quality,inversion).slice(0,count);
 if(lesson<2){if(style==='broken')notes.forEach((n,i)=>add([n],i,.85));else add(notes,0,2.6);return {events,duration:(style==='broken'?notes.length:3)*beat,beats:3};}
 // A newly authored four-bar example in C major. Same melody, harmony, tempo and register in both textures.
 const chords=[[48,52,55],[53,57,60],[55,59,62],[48,52,55]];
 const melodyLine=[[72,76,79,76],[77,76,74,72],[74,79,77,74],[76,74,72,72]];
 for(let bar=0;bar<4;bar++){
  if(style==='block')add(chords[bar],bar*4,3.75,.48);
  else [0,1,2,1].forEach((ix,b)=>add([chords[bar][ix]],bar*4+b,.9,.48));
  if(melody)melodyLine[bar].forEach((n,b)=>add([n],bar*4+b,.82,.78,'melody'));
 }
 return {events:events.sort((a,b)=>a.time-b.time),duration:16*beat,beats:16};
}
export const LESSONS=[
 {title:'一个音，怎样变成和弦？',short:'从单音到和弦',tag:'听辨 · 叠加',time:'5–7分钟',goal:'听出单音与多个音的区别，搭出 C–E–G。',steps:[
 ['先听','先听 C，再加入 E、G。你能听出声音发生了什么变化吗？','点“1个音”并播放，再依次选择2个、3个音。不要急着给定义。'],
 ['猜一猜','依次弹出三个音，与同时弹出三个音，听起来一样吗？','学生可能说“一个一个”和“一起响”。认可描述，再引出先后与同时的区别。'],
 ['动手做','选“点选作答”，在琴键上找出 C4、E4、G4，然后确认。','先用黑键分组找C。音名不是指法，do/re/mi只在本课的C调示例中使用。'],
 ['说发现','C、E、G 按三度关系叠置，构成 C 大三和弦。','两音形成音程；不要把任意三个音都直接称为三和弦。可先只讲“有组织的音的组合”。'],
 ['小挑战','请从低到高指出三个音，并说明单音、音程和三和弦的区别。','参考回答：C–E–G；一个音是单音，两个音形成音程，这三个音按三度叠置构成三和弦。']
 ],quiz:[60,64,67]},
 {title:'只改一个音，听感怎样变化？',short:'改变一个音',tag:'比较 · 探究',time:'6–8分钟',goal:'比较 C 大三和弦与 C 小三和弦，找到改变的音。',steps:[
 ['先听','先听版本 A，再听版本 B。两个版本的速度、音区和音量相同。','A=C–E–G，B=C–E♭–G。先不显示答案，让学生专注声音。'],
 ['猜一猜','两个版本，有哪些音没有变？哪个音移动了？','固定C和G，只改变中间的E。不要把音色、力度变化当作和弦结构变化。'],
 ['动手做','把 E 换成 E♭。在琴键上点选 C4、E♭4、G4，然后确认。','E到E♭向下移动一个半音。半音是钢琴上相邻两个音的距离，包含黑键。'],
 ['说发现','大三和弦：4＋3个半音；小三和弦：3＋4个半音。','音程数的是距离，不是把起点也算进去的琴键数量。听感受速度、力度、音区和上下文共同影响。'],
 ['小挑战','试一试转位：把最低的音移高一个八度。和弦的组成音变了吗？','组成音类别没变，低音与排列变了。只改变排列不等于把大三和弦变成小三和弦。']
 ],quiz:[60,63,67]},
 {title:'同样的和弦，伴奏为何不同？',short:'给旋律换伴奏',tag:'欣赏 · 创编',time:'7–9分钟',goal:'比较柱式与分解和弦，为原创短旋律选择伴奏。',steps:[
 ['先听','听同一段四小节旋律的两种伴奏。哪一种更像一起落下，哪一种更像流动？','两版均使用C–F–G–C，旋律、速度、音区保持相同，比较伴奏的织体。'],
 ['猜一猜','改变的是旋律、和弦组成，还是伴奏音的先后顺序？','本例改变的是伴奏织体；柱式同时奏响，分解和弦将和弦音依次奏响。'],
 ['动手做','切换柱式与分解伴奏。关闭旋律单听伴奏，再打开旋律比较。','可让两组学生分别用手势表示“一起”和“依次”。节拍灯显示每小节的四拍。'],
 ['说发现','相同的和声材料，可以形成不同的伴奏织体。','本例不是所有柱式、分解伴奏的固定节奏公式。不要用“哪种更高级”评价。'],
 ['小挑战','为这段旋律选一种伴奏，说出理由；再改变速度，听听你的选择是否仍合适。','参考表达：我选分解伴奏，因为逐个出现的音让我感到流动；其他选择只要能解释也成立。']
 ],quiz:null},
 {title:'让节奏有呼吸',short:'节拍与节奏编创',tag:'律动 · 创编',time:'4–6分钟',goal:'跟随均拍，体验二拍、三拍和四拍的分组；休止时继续保持内心的拍子。',steps:[
 ['跟着拍','选择2拍、3拍或4拍一组，跟随亮点轻拍。','这是拍号中每小节的拍数演示，均以四分音符为一拍；先建立稳定速度。'],
 ['听重音','比较第一拍和其他拍。你能感到新一组从哪里开始吗？','本示例突出第一拍作分组提示；真实音乐中力度、切分与句法会改变听到的重音。'],
 ['留空拍','点拍子，在一音、两音和休止之间切换。声音停了，拍子还在走。','休止也占时值。亮点会继续前进，学生可以默数。'],
 ['再创造','同一拍可以弹一个音、两个等长音，也可以休止。编一小节，让同学拍出来。','每个圆点代表一拍，不是所有音符都等于一拍；不在这里评定触屏敲击的节奏准确度。'],
 ['说发现','声音可以暂停，稳定的拍子仍然向前。','请学生用自己的语言说明均拍、分组和休止的区别。']
 ],quiz:null}
];

LESSONS.push(
 {title:'用五个音，写自己的旋律',short:'五声音阶小作曲',tag:'中国音乐 · 编创',time:'6–8分钟',goal:'用 C 宫五声音阶创编两小节短句，听辨重复与变化。',quiz:null,steps:[
 ['先听','先听 C、D、E、G、A 的两小节短句。你能跟唱吗？','本例以C为宫，宫商角徵羽对应C D E G A；唱名为do re mi sol la。并非所有中国音乐都只用这五个音。'],
 ['找五音','琴键上亮出的是宫、商、角、徵、羽。它们之间的距离都一样吗？','本例按升序为2、2、3、2个半音，到高八度宫音再隔3个半音；五声音阶不是五个连续白键。'],
 ['写旋律','选一个位置，再选音符或休止，写出八拍旋律。','每格一拍，四分音符为一拍，两小节4/4拍。鼓励先哼唱，再用琴键验证。'],
 ['听变化','先重复前四拍，再改后四拍的一个音。比较重复与变化。','可以让最后一个音回到宫音C，听听收束感；也可以保留其他结束音并说明想法。'],
 ['来展示','播放你的短句，介绍最喜欢的变化，再导出 MIDI 留存。','参考：前半句重复，后半句把G换成A，最后落C。依据结构与表达讨论，不以唯一答案评分。']
 ]},
 {title:'同一旋律，不同的表达',short:'力度与音乐表情',tag:'听赏 · 表现',time:'4–6分钟',goal:'区分力度与速度，比较弱、强和渐强的听感。',quiz:null,steps:[
 ['先听','比较弱奏和强奏。是声音强弱变了，还是速度变了？','A/B保持音高、节奏、速度相同，只改变音符的演奏力度。播放时不要调系统音量。'],
 ['找证据','跟着均拍默数，两段是否一样快？','参考回答：速度一样，强弱不同。力度与速度是不同的音乐表现要素。'],
 ['做表情','选择渐强，用手势跟随八拍声音的变化。','p为弱，f为强；渐强意味着力度逐渐增加，不等于加速。触屏按压大小不代表真实钢琴力度。'],
 ['再比较','保持同样力度，只改变速度，听音乐有什么变化。','分别改变一个因素，再讨论多个要素共同作用。避免把强奏等同愤怒、弱奏等同悲伤。'],
 ['来展示','给短句选择力度和速度，说明你想表达什么。','开放回答：我用慢速弱奏表达安静；我用渐强表达期待。鼓励描述听觉证据，不判情感对错。']
 ]}
);
export const LEVELS=['3–5年级拓展','6–9年级探究','6–9年级探究','1–5年级体验','3–9年级创编','1–9年级分层'];
export function midiFile(config){
 const {events,duration}=buildEvents(config),bpm=config.tempo||90,tick=480*bpm/60,rows=[];
 const vlq=n=>{let a=[n&127];while((n>>=7)>0)a.unshift((n&127)|128);return a;};
 for(const e of events){rows.push({t:Math.round(e.time*tick),b:[0x90,e.midi,Math.max(1,Math.round(e.velocity*127))]});rows.push({t:Math.round((e.time+e.duration)*tick),b:[0x80,e.midi,0]});}
 rows.sort((a,b)=>a.t-b.t||a.b[0]-b.b[0]);const us=Math.round(60000000/bpm),track=[0,255,81,3,(us>>16)&255,(us>>8)&255,us&255,0,255,88,4,config.lesson===3?(config.meter||4):4,2,24,8];let last=0;
 for(const r of rows){track.push(...vlq(r.t-last),...r.b);last=r.t;}track.push(...vlq(Math.max(0,Math.round(duration*tick)-last)),255,47,0);
 const n=track.length;return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255,...track]);
}
