// Screen book UI and learning state share the existing CylinderRoom.
import {AssemblyAct} from './chapter01-assembly.js';
const KEY='frenchRevolution.chapter1.continuation.v1';
const FLAGS=['readingVideoComplete','fatherGuidanceComplete','estatesGeneralVideoComplete','nobleHeard','clergyStarted','clergyVideoComplete','clergyDialogueComplete','exitVideoComplete','nationalAssemblyHistoryComplete','chapter1SummaryViewed','chapter1Complete','arrivalStarted'];
const fresh=()=>({revision:3,started:false,scene:'reading',stage:'reading',read:{voltaire:false,montesquieu:false,rousseau:false},authorBooks:{},bookIdeas:{},notesCorrect:false,applicationCorrect:false,...Object.fromEntries(FLAGS.map(k=>[k,false])),clergyStep:0,historyStep:0,suspenseStep:0,directions:{}});
const validDirection=d=>Number.isFinite(d?.yaw)&&Number.isFinite(d?.pitch);
export const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export class ContinuationAct{
 constructor(host,data,assemblyData){
  this.host=host;this.data=data;Object.assign(data.scenes,assemblyData.scenes);this.progress=fresh();this.resetting=false;this.currentScene=null;this.context=null;this.notebookPanel=null;this.selected=null;this.checked=false;this.timer=null;
  this.load();this.assembly=new AssemblyAct(this,assemblyData);
  this.resizeLines=()=>requestAnimationFrame(()=>this.drawConnections());window.addEventListener('resize',this.resizeLines);document.addEventListener('fullscreenchange',this.resizeLines);
  document.addEventListener('app-languagechange',this.resizeLines);
 }
 load(){try{
  const p=JSON.parse(localStorage.getItem(KEY));if(!p?.started)return;this.progress.started=true;
  for(const id of Object.keys(this.progress.read))this.progress.read[id]=p.read?.[id]===true;
  for(const [scene,d] of Object.entries(p.directions||{}))if(this.data.scenes[scene]&&validDirection(d))this.progress.directions[scene]={...d};
  if(validDirection(p.transitionDirection))this.progress.transitionDirection={...p.transitionDirection};
  if(p.revision===3){
   for(const flag of FLAGS)this.progress[flag]=p[flag]===true;
   for(const [field,targets] of [['authorBooks',this.data.notebook.books],['bookIdeas',this.data.notebook.ideas]]){
    const sources=field==='authorBooks'?this.data.notebook.authors:this.data.notebook.books,used=new Set();
    for(const source of sources){const id=p[field]?.[source.id];if(targets.some(t=>t.id===id)&&!used.has(id)){this.progress[field][source.id]=id;used.add(id);}}
   }
   this.progress.notesCorrect=p.notesCorrect===true&&this.readingReady()&&this.matchesCorrect();
   this.progress.applicationCorrect=p.applicationCorrect===true&&this.progress.notesCorrect;
   for(const key of ['clergyStep','historyStep','suspenseStep'])this.progress[key]=Number.isInteger(p[key])?Math.max(0,p[key]):0;
   if(typeof p.stage==='string')this.progress.stage=p.stage;
   if(this.data.scenes[p.scene])this.progress.scene=p.scene;
   // Completed later work is never inferred from a line index or an old indoor completed flag.
   this.progress.clergyDialogueComplete&&=this.progress.applicationCorrect&&this.progress.estatesGeneralVideoComplete&&this.progress.nobleHeard&&this.progress.clergyVideoComplete;
   this.progress.nationalAssemblyHistoryComplete&&=this.progress.clergyDialogueComplete;
   this.progress.chapter1SummaryViewed&&=this.progress.nationalAssemblyHistoryComplete;
   this.progress.chapter1Complete&&=this.progress.chapter1SummaryViewed;
  }
  // Legacy read confirmations survive, but a two-column match cannot complete the new three-column task.
 }catch{this.progress=fresh();}}
 save(){if(this.resetting)return;try{localStorage.setItem(KEY,JSON.stringify(this.progress));}catch{this.host.hint('浏览器无法保存本章进度，本次体验仍可继续。');}}
 active(){return this.host.state().startsWith('continuation-');}
 readingReady(){return Object.values(this.progress.read).every(Boolean);}
 matchesCorrect(){const n=this.data.notebook;return ['authorBooks','bookIdeas'].every(field=>Object.entries(n[field]).every(([id,answer])=>this.progress[field][id]===answer));}
 direction(d){if(this.active()&&validDirection(d)){if(this.currentScene)this.progress.directions[this.currentScene]={...d};else if(this.progress.transitionDirection)this.progress.transitionDirection={...d};this.save();}}
 rememberDirection(){if(this.active()&&this.currentScene)this.direction(this.host.room.direction());}
 setState(name){clearTimeout(this.timer);this.host.setState('continuation-'+name);if(this.currentScene)this.caption(this.currentScene);this.progress.stage=name;this.context=null;this.notebookPanel=null;}
 async scene(name){
  this.rememberDirection();const scene=this.data.scenes[name];this.currentScene=name;this.progress.scene=name;this.progress.started=true;
  this.host.setUserPaused(false);
  await this.host.activateOnce(scene,this.progress[scene.completeFlag],()=>{this.progress[scene.completeFlag]=true;this.save();this.assembly.mediaEnded(name);},this.progress.directions[name]||this.host.room.direction());
  this.save();
 }
 caption(name){const scene=this.data.scenes[name];document.querySelector('.scene-caption small').textContent=name==='reading'?'1789 · 巴黎':'1789 · 凡尔赛';document.querySelector('.scene-caption h1').textContent=scene.title;document.querySelector('.scene-caption span').textContent='第一章 · '+scene.subtitle;}
 async start(){
  const p=this.progress;
  if(p.chapter1Complete)return this.assembly.completed();
  if(p.chapter1SummaryViewed)return this.assembly.suspense(p.suspenseStep);
  if(p.nationalAssemblyHistoryComplete){this.assembly.summary();return;}
  if(p.clergyDialogueComplete){if(!p.exitVideoComplete&&this.data.scenes.exit.available)return this.assembly.exit();return this.assembly.history(p.historyStep);}
  if(p.applicationCorrect){
   if(p.clergyStarted){await this.assembly.clergy();return;}
   if(p.estatesGeneralVideoComplete||p.stage==='noble'||p.scene==='hall'){await this.assembly.hall();return;}
   if(p.arrivalStarted)return this.assembly.arrival();
   this.assembly.departure();return;
  }
  await this.explore();
  if(p.fatherGuidanceComplete&&this.readingReady()){if(p.notesCorrect)this.question();else this.notebook();}
 }
 async explore(){
  await this.scene('reading');this.setState('explore');this.caption('reading');
  const scene=this.data.scenes.reading,items=scene.items.filter(i=>i.id==='reading-father'||this.progress.fatherGuidanceComplete),seen={...this.progress.read,'reading-father':this.progress.fatherGuidanceComplete};
  this.host.room.setHotspots(items,seen);for(const item of items)if(this.progress.read[item.id]){item.element?.setAttribute('aria-label',item.label+'，已读');const badge=item.element?.querySelector('.seen');if(badge)badge.textContent='已读';}
  document.querySelector('#ui').replaceChildren();this.direction(this.host.room.direction());
  this.host.hint(this.progress.fatherGuidanceComplete?'点击桌上的三本书。全部读完后，整理思想笔记。':scene.hint,7500);
 }
 pick(id){
  if(this.host.state()!=='continuation-explore')return;
  if(this.currentScene==='hall'){this.assembly.pick(id);return;}
  if(this.currentScene!=='reading')return;
  if(id==='reading-father'){this.father(0);return;}
  if(this.progress.fatherGuidanceComplete&&this.data.books[id])this.book(id);
 }
 father(index){
  this.setState('father');const last=index===this.data.father.length-1;
  this.host.showLine(this.data.father[index],last?'翻阅书籍':'继续',()=>{if(!last){this.father(index+1);return;}this.progress.fatherGuidanceComplete=true;this.save();this.host.run(()=>this.explore());});
 }
 book(id){
  this.rememberDirection();this.setState('book');this.context={id,kind:'book'};const h=this.host,b=this.data.books[id],p=h.panel('parchment book-page');p.setAttribute('role','region');p.setAttribute('aria-label',b.author+'《'+b.title+'》');
  p.append(el('small',b.author+' · '+b.year,'paper-byline'),el('h2','《'+b.title+'》'),el('p',b.sourceLabel,'paper-source'));
  const content=el('div',undefined,'book-content');for(const text of b.content){const para=el('p');h.renderDialogueText(para,text,true,b.keywords);content.append(para);}p.append(content);
  h.actions(p,[h.button('合上书',()=>{this.progress.read[id]=true;this.save();h.run(async()=>{await this.explore();if(this.readingReady()){if(this.progress.notesCorrect)this.question();else this.notebook();}});},true)]);
 }
 notebook(){
  if(!this.readingReady())return;this.setState('notes');this.save();this.selected=null;this.checked=false;
  const h=this.host,n=this.data.notebook,p=h.panel('parchment matching-page');this.notebookPanel=p;p.append(el('h2',n.title),el('p',n.instruction,'matching-instruction'));
  const board=el('div',undefined,'matching-board');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('matching-lines');svg.setAttribute('aria-hidden','true');board.append(svg);
  for(const [kind,title,items] of [['author','人',n.authors],['book','书',n.books],['idea','观点',n.ideas]]){
   const column=el('section',undefined,'matching-column matching-'+kind+'s');column.append(el('h3',title));
   for(const item of items){const b=h.button('',()=>this.selectMatch(kind,item.id));b.dataset[kind]=item.id;b.append(el('strong',item.label));if(item.detail)b.append(el('span',item.detail));column.append(b);}
   board.append(column);
  }
  p.append(board);const feedback=el('p',undefined,'matching-feedback');feedback.setAttribute('aria-live','polite');p.append(feedback);
  const verify=h.button('核对笔记',()=>{
   this.checked=true;
   if(!this.matchesCorrect()){this.updateNotes();return;}
   this.progress.notesCorrect=true;this.save();this.updateNotes();for(const b of board.querySelectorAll('button'))b.disabled=true;
   feedback.textContent='对应正确。'+n.connection;
   controls.replaceChildren(h.button('把想法写进意见页',()=>this.question(),true));
  },true);verify.dataset.verifyNotes='';
  const controls=h.actions(p,[h.button('回看三本书',()=>h.run(()=>this.explore())),verify]);this.updateNotes();requestAnimationFrame(()=>this.drawConnections());
 }
 selectMatch(kind,id){
  if(this.progress.notesCorrect)return;
  const s=this.selected;
  if(s&&((s.kind==='author'&&kind==='book')||(s.kind==='book'&&kind==='idea'))){
   const field=s.kind==='author'?'authorBooks':'bookIdeas',map=this.progress[field];
   for(const key of Object.keys(map))if(map[key]===id)delete map[key];map[s.id]=id;
   this.selected=kind==='book'?{kind,id}:null;this.checked=false;this.save();
  }else this.selected={kind,id};
  this.updateNotes();
 }
 updateNotes(){
  const p=this.notebookPanel;if(!p?.isConnected)return;const n=this.data.notebook;
  for(const kind of ['author','book','idea'])for(const b of p.querySelectorAll('[data-'+kind+']')){
   const id=b.dataset[kind];b.setAttribute('aria-pressed',String(this.selected?.kind===kind&&this.selected.id===id));
   const field=kind==='author'?'authorBooks':'bookIdeas',map=this.progress[field];
   b.dataset.connected=String(kind==='idea'?Object.values(this.progress.bookIdeas).includes(id):!!map[id]);
   b.dataset.incorrect=String(this.checked&&kind!=='idea'&&map[id]!==n[field][id]);
  }
  const count=Object.keys(this.progress.authorBooks).length+Object.keys(this.progress.bookIdeas).length;
  const verify=p.querySelector('[data-verify-notes]');if(verify)verify.disabled=count!==6;
  p.querySelector('.matching-feedback').textContent=this.checked?'还有对应需要调整。重新选择相邻两列，即可修改。':this.selected?.kind==='author'?'请选择中间对应的书。':this.selected?.kind==='book'?'请选择右侧对应的观点。':'已连接 '+count+' / 6';
  this.drawConnections();
 }
 drawConnections(){
  const p=this.notebookPanel;if(!p?.isConnected)return;const board=p.querySelector('.matching-board'),svg=p.querySelector('svg'),r=board.getBoundingClientRect();svg.setAttribute('viewBox','0 0 '+r.width+' '+r.height);svg.replaceChildren();
  for(const [field,from,to] of [['authorBooks','author','book'],['bookIdeas','book','idea']])for(const [source,target] of Object.entries(this.progress[field])){
   const a=p.querySelector('[data-'+from+'="'+source+'"]').getBoundingClientRect(),b=p.querySelector('[data-'+to+'="'+target+'"]').getBoundingClientRect(),x1=a.right-r.left,y1=a.top+a.height/2-r.top,x2=b.left-r.left,y2=b.top+b.height/2-r.top,bend=(x2-x1)*.48;
   const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d','M'+x1+','+y1+' C'+(x1+bend)+','+y1+' '+(x2-bend)+','+y2+' '+x2+','+y2);line.dataset.connection=field+':'+source;
   if(this.checked&&this.data.notebook[field][source]!==target)line.classList.add('incorrect');svg.append(line);
  }
 }
 question(){
  if(!this.readingReady()||!this.progress.notesCorrect)return;this.setState('choice');this.save();const h=this.host,p=h.panel('dialogue question continuation-question'),a=this.data.application;p.append(el('h2',a.question));const options=el('div',undefined,'options response-choices');p.append(options);let answered=false;
  for(const option of a.options){const b=h.button(option.id+'. '+option.text,()=>{if(answered)return;answered=true;for(const button of options.children)button.disabled=true;
   h.showLine(option.feedback,option.id===a.correct?'写入意见页':'再想一想',()=>{if(option.id!==a.correct){this.question();return;}this.progress.applicationCorrect=true;this.save();this.assembly.departure();});
  });b.dataset.answer=option.id;options.append(b);}
 }
 clearProgress(){this.resetting=true;clearTimeout(this.timer);localStorage.removeItem(KEY);}
 inspect(){return {...JSON.parse(JSON.stringify(this.progress)),streetIntroComplete:this.host.streetProgress().introComplete,printshopDialogueComplete:Object.values(this.host.priorProgress().heard).every(Boolean),voteDemoComplete:this.host.priorProgress().voting.complete,currentScene:this.currentScene,context:this.context?{...this.context}:null,readingReady:this.readingReady(),nextChapterAvailable:this.progress.chapter1Complete};}
}
