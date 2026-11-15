import {MediaCache,createLookahead,bufferedForLookahead,releaseMedia} from './performance.mjs';
import {createSceneLoadingNotice,hasPlayingFrame} from '../../_course_runtime/scene-transition.mjs';
const sceneLoading=createSceneLoadingNotice(document.querySelector('#loading'));
import './i18n.js';
import './music-runtime.js';
import {ChapterTwoRoom} from './chapter02-room.js';
import {scenes,questions,histories,summary,memories,finalChain,platformSpeech} from './chapter02-content.js';

const $=s=>document.querySelector(s),T=window.THREE;
const flags=['whyNotDisband','nationalAssemblyMeaning','constitutionUnderstood','constitutionChoice','stayed','oathReviewed','parisPressure','weaponsNeeded','bastilleMeaning','parisJudged','negotiationHeard','tensionHeard','symbolHeard','bastilleReviewed','knowledgeCorrect','summaryViewed','completed'];
const fresh=()=>({revision:1,node:'title',page:0,seen:{},directions:{},videos:{},videoTimes:{},missingAcknowledged:{},chainStep:0,chainAnswers:[],action:null,originalMuted:false,...Object.fromEntries(flags.map(k=>[k,false]))});
const assets=new MediaCache({limit:5,active:()=>active});const preparations=new Map();let config,room,p=fresh(),state='boot',currentScene=null,active=null,busy=false,epoch=0,retryAction=null,muted=true,userPaused=false,resetResume=false,dialogue=null;
const lookahead=createLookahead(prepare,{allow:()=>!navigator.connection?.saveData&&bufferedForLookahead(active?.video)});
window.frDelivery.registerLifecycle({dispose(){lookahead.dispose();assets.dispose();}});
const mediaLog=[];let pendingNavigation=null;

function save(){try{localStorage.setItem(config.storageKey,JSON.stringify(p));}catch{$('#saved-note').textContent='本次进度暂时无法保存；仍可继续体验。';}}
function gate(id){if(id==='tennis')return p.constitutionUnderstood&&(p.whyNotDisband||p.nationalAssemblyMeaning);if(id==='paris')return p.weaponsNeeded&&p.parisPressure&&p.bastilleMeaning;return p.negotiationHeard&&p.tensionHeard&&p.symbolHeard;}
function load(){
 try{const s=JSON.parse(localStorage.getItem(config.storageKey)||'null');if(s?.revision!==1)return;
  for(const f of flags)p[f]=s[f]===true;
  p.originalMuted=s.originalMuted===true;
  for(const k of ['seen','videos','missingAcknowledged'])if(s[k]&&typeof s[k]==='object')for(const [id,v] of Object.entries(s[k]))if(v===true)p[k][id]=true;
  if(s.directions&&typeof s.directions==='object')for(const id of Object.keys(scenes)){const d=s.directions[id];if(Number.isFinite(d?.yaw)&&Number.isFinite(d?.pitch))p.directions[id]={yaw:d.yaw,pitch:d.pitch};}
  for(const [id,t] of Object.entries(s.videoTimes||{}))if(config.media[id]?.type==='video'&&Number.isFinite(t)&&t>=0)p.videoTimes[id]=t;
  p.node=typeof s.node==='string'?s.node:'title';p.page=Number.isInteger(s.page)?Math.max(0,s.page):0;
  p.chainAnswers=[];if(Array.isArray(s.chainAnswers))for(let i=0;i<4&&s.chainAnswers[i]===memories[i].answer;i++)p.chainAnswers.push(s.chainAnswers[i]);
  p.chainStep=p.chainAnswers.length;p.action=['messages','water'].includes(s.action)?s.action:null;
  if(s.dialogue?.scene===p.node&&scenes[s.dialogue.scene]?.people.some(x=>x.id===s.dialogue.person))p.dialogue={scene:s.dialogue.scene,person:s.dialogue.person,index:Math.max(0,Math.min(3,Math.floor(Number(s.dialogue.index)||0)))};
  // Completed facts, rather than a shared dialogue index, authorize later checkpoints.
  const nodes=['title','opening','tennis','follow','platform','constitution-question','look','invitation','raise','stay','oath','oath-history','situation','paris-transition','paris','paris-question','paris-call','weapons','invalides-entry','invalides-arms','invalides','bastille','bastille-choice','action-feedback','attack1','attack2','attack3','bastille-history','knowledge','summary','causal','ending','chapter3'];
  if(!nodes.includes(p.node))p.node='title';let n=nodes.indexOf(p.node);
  if(n>=nodes.indexOf('follow')&&!gate('tennis'))p.node='tennis';
  else if(n>=nodes.indexOf('look')&&!p.constitutionChoice)p.node='constitution-question';
  else if(n>=nodes.indexOf('oath')&&!p.stayed)p.node='stay';
  else if(n>=nodes.indexOf('situation')&&!p.oathReviewed)p.node='oath-history';
  // Keep already-answered legacy saves; unanswered Paris questions now require all three conversations.
  else if(p.node==='paris-question'&&!p.parisJudged&&!gate('paris'))p.node='paris';
  else if(n>=nodes.indexOf('paris-call')&&!p.parisJudged)p.node='paris';
  else if(n>=nodes.indexOf('attack1')&&!p.action)p.node='bastille';
  else if(n>=nodes.indexOf('knowledge')&&!p.bastilleReviewed)p.node='bastille-history';
  else if(n>=nodes.indexOf('summary')&&!p.knowledgeCorrect)p.node='knowledge';
  else if(n>=nodes.indexOf('ending')&&p.chainStep<4)p.node='causal';
 }catch{p=fresh();}
}
function el(tag,text='',cls=''){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function button(text,fn,attr={}){const b=el('button',text);for(const [k,v] of Object.entries(attr))b.setAttribute(k,v);b.onclick=()=>{if(!busy&&!$('#reset-dialog').open&&$('#error').hidden)fn();};return b;}
function actions(panel,buttons){const row=el('div','','actions');row.append(...buttons);panel.append(row);return row;}
function panel(cls){const q=el('section','',cls);q.dataset.ui='';$('#ui').replaceChildren(q);return q;}
function setState(s){state=s;document.body.dataset.state=s;room.enabled=s==='explore';room.clearDrag();room.projectHotspots();$('#explore-note').hidden=s!=='explore';}
function pauseAll(){for(const a of assets.values()){a.video?.pause();a.audio?.pause();}}
function remember(){if(currentScene)p.directions[currentScene]=room.direction();if(active?.video&&!active.video.loop&&!active.video.ended)p.videoTimes[active.key]=active.video.currentTime;}
function mode(m){document.body.dataset.mode=m;room.flat=m==='flat';room.enabled=false;room.clearDrag();$('#panorama').hidden=m==='flat';$('#flat-stage').hidden=m!=='flat';room.projectHotspots();}
function mediaMuted(key){const m=config.media[key];return m.loop&&!m.audio?true:m.originalAudio?p.originalMuted:muted;}
function updateControls(){const v=active?.video,sound=active?.audio||v;$('#pause').hidden=!v||v.ended;$('#pause').textContent=v?.paused?'继续播放':'暂停画面';$('#sound-toggle').textContent=!sound||sound.muted?'声音：关':'声音：开';$('#sound-toggle').disabled=!v||(v.loop&&!active.audio)||v.ended;}
async function resumeActive(){
 if(document.hidden||$('#reset-dialog').open||!$('#error').hidden)return;
 await active?.video?.play();
 if(!document.hidden&&!$('#reset-dialog').open&&$('#error').hidden)await active?.audio?.play();
 updateControls();
}
async function run(fn){
 if(busy){pendingNavigation=fn;return;}busy=true;room.suspended=true;sceneLoading.start();
 try{await fn();}catch(e){pauseAll();retryAction=fn;const needsGesture=e.name==='NotAllowedError';$('#error-text').textContent=needsGesture?'点击播放，继续观看这段带有原声的视频。':e.message;$('#retry').textContent=needsGesture?'播放原声视频':'重试';$('#error').hidden=false;}
 finally{busy=false;sceneLoading.stop();room.suspended=!$('#error').hidden||$('#reset-dialog').open;room.projectHotspots();updateControls();if(pendingNavigation&&$('#error').hidden&&!$('#reset-dialog').open){const next=pendingNavigation;pendingNavigation=null;queueMicrotask(()=>run(next));}}
}
async function prepare(key){if(assets.has(key))return assets.get(key);if(preparations.has(key))return preparations.get(key);const pending=loadAsset(key);preparations.set(key,pending);try{return await pending;}finally{if(preparations.get(key)===pending)preparations.delete(key);}}
async function loadAsset(key){
 if(assets.has(key))return assets.get(key);const m=config.media[key];if(!m?.path)throw Error(`未接入素材：${key}`);
 const a={key,mode:m.mode};try{
 if(m.type==='video'){
  const v=document.createElement('video');v.preload='auto';v.playsInline=true;v.muted=m.audio?true:mediaMuted(key);v.loop=!!m.loop;v.src=m.path;v.dataset.media=key;a.video=v;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('视频加载超时：'+m.path)),20000);v.onloadeddata=()=>{clearTimeout(timer);resolve();};v.onerror=()=>{clearTimeout(timer);reject(Error('视频无法加载：'+m.path));};});
  a.aspect=v.videoWidth/v.videoHeight;
  if(m.mode==='cylindrical_180')a.texture=room.configureTexture(new T.VideoTexture(v));
  if(m.audio){
   // The visual pingpong stays silent. Its original sound is an independent,
   // forward-only track, so no reversed speech or sound effects are played.
   const audio=new Audio();audio.preload='auto';audio.loop=m.audio.loop===true;audio.muted=mediaMuted(key);audio.dataset.media=key+'-original';a.audio=audio;
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(Error('原声音轨无法加载：'+m.audio.path)),20000);
    const loaded=()=>finish(),failed=()=>finish(Error('原声音轨无法加载：'+m.audio.path));
    function finish(error){clearTimeout(timer);audio.removeEventListener('loadeddata',loaded);audio.removeEventListener('error',failed);error?reject(error):resolve();}
    audio.addEventListener('loadeddata',loaded);audio.addEventListener('error',failed);audio.src=m.audio.path;audio.load();
   });
   audio.addEventListener('error',()=>{if(active===a){pauseAll();retryAction=()=>showNode(p.node,p.page);$('#error-text').textContent='原声音轨播放中断：'+m.audio.path;$('#error').hidden=false;room.suspended=true;assets.delete(key);}});
  }
  v.addEventListener('pause',()=>{a.audio?.pause();updateControls();});v.addEventListener('play',updateControls);
  v.addEventListener('error',()=>{if(active===a){pauseAll();retryAction=()=>showNode(p.node,p.page);$('#error-text').textContent='视频播放中断：'+m.path;$('#error').hidden=false;room.suspended=true;assets.delete(key);}});
 }else{const img=new Image();img.src=m.path;await img.decode().catch(()=>{throw Error('图片无法加载：'+m.path);});a.image=img;a.aspect=img.naturalWidth/img.naturalHeight;}
 assets.set(key,a);return a;}catch(error){releaseMedia(a);throw error;}
}
async function firstFrame(v){if(hasPlayingFrame(v))return;await v.play();if(v.requestVideoFrameCallback)await new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;resolve();}};v.requestVideoFrameCallback(finish);setTimeout(finish,600);});}
async function activate(key,{still=false}={}){
 const m=config.media[key];if(still&&m.type==='video')return hold(key);
 const a=await prepare(key);if(active!==a)pauseAll();active=a;currentScene=null;mode(m.mode==='cylindrical_180'?'cylindrical_180':'flat');
 if(a.video){a.video.muted=a.audio?true:mediaMuted(key);if(a.audio)a.audio.muted=mediaMuted(key);if(!userPaused){await firstFrame(a.video);if(a.audio&&!document.hidden)await a.audio.play();}}
 if(m.mode==='cylindrical_180'){room.setMedia(a);$('#flat-frame').replaceChildren();}
 else{const frame=$('#flat-frame');frame.style.setProperty('--ratio',m.type==='image'?'1.7777777778':String(a.aspect));frame.replaceChildren(a.video||a.image);if(a.image)a.image.className='history-image';}
 document.body.dataset.media=key;mediaLog.push({key,mode:m.mode,time:performance.now(),node:p.node});updateControls();assets.trim();lookahead.next([({doorBG:"tennis",tennis:"follow",follow:"look",look:"raise",raise:"oath",oath:"oathBG",documentsBG:"paris",paris:"weapons",weapons:"invalides-entry","invalides-entry":"invalides-arms","invalides-arms":"invalidesBG",bastille:"attack1",attack1:"attack2",attack2:"attack3",attack3:"bastilleBG",summaryBG:"eveningBG"})[key]]);return a;
}
async function hold(key){
 const a=assets.get(key),m=config.media[key];pauseAll();mode('flat');currentScene=null;
 if(a?.video?.ended){active=a;$('#flat-frame').style.setProperty('--ratio',String(a.aspect));$('#flat-frame').replaceChildren(a.video);}
 else{const img=new Image();img.src=m.end;await img.decode().catch(()=>{throw Error('定格画面无法加载：'+m.end);});active={key,image:img,aspect:img.naturalWidth/img.naturalHeight};$('#flat-frame').style.setProperty('--ratio',String(active.aspect));$('#flat-frame').replaceChildren(img);}
 document.body.dataset.media=key+'-end';updateControls();
}
function checkpoint(node,page=0){remember();p.node=node;p.page=page;delete p.dialogue;dialogue=null;epoch++;setState(node);$('#ui').replaceChildren();$('#ui').classList.remove('fade-away');save();}
function go(node,page=0){return run(()=>showNode(node,page));}
async function explore(id,resumeDialogue=null){
 const scene=scenes[id];await activate(scene.media);currentScene=id;room.setDirection(p.directions[id]||{yaw:0,pitch:0});
 $('#chapter-title').textContent=scene.title;$('#scene-date').textContent=scene.place;setState('explore');$('#ui').replaceChildren();
 if(scene.autoAdvance&&gate(id)&&!resumeDialogue)return showNode(scene.next);
 refresh();save();if(resumeDialogue)talk(resumeDialogue.person,resumeDialogue.index);
}
function refresh(){
 if(!currentScene)return;const scene=scenes[currentScene],items=scene.people.map(x=>({...x}));
 if(!scene.autoAdvance&&gate(currentScene)){const {u,v}=scene.exit;items.push({id:'advance',label:scene.advance,u,v,bounds:{left:u-.03,right:u+.03,top:v-.035,bottom:v+.035}});}
 room.setHotspots(items,p.seen);room.projectHotspots();$('#explore-note').textContent=!scene.autoAdvance&&gate(currentScene)?'还可以交谈 · 也可以点击远处的热点继续':'拖动画面 · 自由选择人物交谈';
}
function onPick(id){if(busy||state!=='explore')return;if(id==='advance'){if(gate(currentScene))go(scenes[currentScene].next);return;}talk(id,0);}
function marked(text,keywords,tag='p'){const q=el(tag);const words=[...new Set(keywords)].sort((a,b)=>b.length-a.length);if(!words.length){q.textContent=text;return q;}const re=new RegExp('('+words.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');for(const s of text.split(re)){q.append(words.includes(s)?el('mark',s,'knowledge-highlight'):document.createTextNode(s));}return q;}
function talk(id,index=0){
 const person=scenes[currentScene].people.find(x=>x.id===id);if(!person)return;
 const i=Math.min(index,person.lines.length);dialogue={scene:currentScene,person:id,index:i};p.dialogue=dialogue;save();setState('dialogue');
 const q=panel('dialogue');
 if(i<person.lines.length){q.append(el('div',person.label,'speaker'),el('p',person.lines[i]));const footer=actions(q,[button(i===person.lines.length-1?'记下这句话':'继续',()=>talk(id,i+1))]);footer.prepend(el('small','人物对白为教学情境重建。','note'));}
 else if(person.knowledge){q.classList.add('knowledge-pulse');const keywords=person.knowledgeKeywords||[person.knowledge[0]];q.append(marked(person.knowledge[0],keywords,'h2'),marked(person.knowledge[1],keywords));actions(q,[button('回到现场',()=>finishTalk(person))]);}
 else finishTalk(person);
}
function finishTalk(person){p[person.flag]=true;p.seen[person.id]=true;delete p.dialogue;dialogue=null;save();if(scenes[currentScene].autoAdvance&&gate(currentScene)){go(scenes[currentScene].next);return;}setState('explore');$('#ui').replaceChildren();refresh();}
function line(speaker,text,next,label='继续'){
 setState('dialogue');const q=panel('dialogue');q.append(el('div',speaker,'speaker'),el('p',text));actions(q,[button(label,next)]);return q;
}
async function movie(key,next){
 const m=config.media[key];if(!m.path)return missingMovie(key,next);
 if(p.videos[key])return showNode(next);
 const a=await prepare(key),v=a.video;
 if(v.ended||v.currentTime>=v.duration-.025)v.currentTime=0;
 if(p.videoTimes[key]>0&&p.videoTimes[key]<v.duration-.08){v.currentTime=p.videoTimes[key];await new Promise(r=>{if(!v.seeking)r();else v.addEventListener('seeked',r,{once:true});});}
 const token=epoch;v.onended=()=>{if(token!==epoch)return;p.videos[key]=true;delete p.videoTimes[key];save();go(next);};
 await activate(key);setState('movie');$('#ui').replaceChildren();
}
async function missingMovie(key,next){
 const m=config.media[key];await activate(m.background);setState('pending-media');const q=historyPanel();q.append(el('p',m.pending));q.append(el('p','这一段影像尚未接入。','pending-media'));
 actions(q,[button('继续查看后续剧情',()=>{p.missingAcknowledged[key]=true;save();go(next);})]);
}
function historyPanel(cls=''){const screen=panel('history-screen '+cls),inner=el('div','','history-inner');screen.append(inner);return inner;}
async function history(id,page=0){
 const h=histories[id],i=Math.min(page,h.pages.length-1);p.page=i;save();await activate(h.background);setState('history');
 const inner=historyPanel();const lines=el('div','','history-lines');h.pages[i].forEach((text,n)=>{const line=el('p',text);line.style.animationDelay=n*.35+'s';lines.append(line);});inner.append(lines);
 const next=button(i===h.pages.length-1?(h.lastButton||'继续'):'继续',()=>{
  if(i<h.pages.length-1)go(id,i+1);else{if(id==='oath-history')p.oathReviewed=true;if(id==='bastille-history')p.bastilleReviewed=true;save();go(h.next);}
 });actions(inner,[next]);
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){next.disabled=true;const token=epoch;setTimeout(()=>{if(token===epoch&&next.isConnected)next.disabled=false;},(h.pages[i].length-1)*350+650);}
}
function ask(kind,next,flag){
 setState('question');const q=questions[kind],screen=panel('dialogue question');screen.append(el('h2',q.title));const opts=el('div','','options');
 q.options.forEach((text,i)=>{const b=button('',()=>{
  if(i===q.correct){p[flag]=true;save();if(kind==='constitution'){// Feedback appears briefly over the requested immediately starting film.
    go(next);return;
   }}
  const feedback=panel('dialogue');feedback.dataset.answer=String(i);feedback.append(el('p',q.feedback[i],'feedback'));actions(feedback,[button(i===q.correct?'继续':'重新选择',()=>i===q.correct?go(next):ask(kind,next,flag))]);
 },{'data-answer':String(i)});b.append(el('span',String.fromCharCode(65+i)+'.','option-letter'),document.createTextNode(text));opts.append(b);});screen.append(opts);
}
async function platform(){
 await hold('follow');line('代表',platformSpeech,()=>go('constitution-question'));
}
async function situation(){
 await activate('documentsBG');const q=historyPanel();q.append(el('small','当前局势'));
 const timeline=el('div','','timeline-strip');for(const [date,label] of [['6月17日','国民议会形成'],['6月20日','网球场宣誓']]){if(timeline.children.length)timeline.append(el('span','→','arrow'));const card=el('article');card.append(el('strong',date),el('p',label));timeline.append(card);}q.append(timeline);
 const demand=el('div','','current-demand');demand.append(el('small','现在的核心要求'),el('div','制定宪法'),el('div','重新规定国家权力'));q.append(demand);actions(q,[button('继续看看巴黎发生了什么',()=>go('paris-transition'))]);
}
async function showSummary(){
 await activate('summaryBG');setState('summary');const screen=panel('history-screen summary-screen'),inner=el('div','','summary-inner');screen.append(inner);inner.append(el('h1','第二章知识小结'),el('p','从国民议会，到巴黎街头','subtitle'));
 const grid=el('div','','summary-nodes');summary.forEach(([title,text,image],i)=>{const card=el('article','','summary-node'),img=el('img');img.src=config.media[image].path;img.alt='';const copy=el('div','','copy');copy.append(el('small','0'+(i+1)),el('h2',title),el('p',text));card.append(img,copy);grid.append(card);});inner.append(grid);actions(inner,[button('回看：为什么会走到下一步？',()=>{p.summaryViewed=true;save();go('causal');})]);
}
async function causal(){
 await activate('summaryBG');setState('causal');const q=historyPanel();q.classList.add('causal-inner');q.append(el('small','把见闻连起来'),el('h1','为什么，下一件事发生了？'));
 const strip=el('nav','','memory-strip');strip.setAttribute('aria-label','本章场景记忆');
 memories.forEach((m,i)=>{const b=button('',()=>{if(i===p.chainStep+1)causalQuestion(q,p.chainStep);else if(i<=p.chainStep)showMemory(q,i);},{'data-memory':String(i)});const img=el('img');img.src=config.media[m.image].path;img.alt='';b.append(img,el('span',m.label));b.className='memory'+(i>p.chainStep+1?' locked':'');b.disabled=i>p.chainStep+1;if(i===p.chainStep)b.setAttribute('aria-current','step');strip.append(b);});q.append(strip);
 const body=el('div','','causal-question');q.append(body);if(p.chainStep>=4){body.style.textAlign='center';body.append(el('h2','国民议会的坚持，与巴黎群众的行动'));const chain=el('ol','','chain');finalChain.forEach(s=>chain.append(el('li',s)));body.append(chain);actions(body,[button('继续',()=>go('ending'))]);}
 else{body.append(el('p',`从“${memories[p.chainStep].label}”出发，点击下一格，想一想它为什么发生。`));actions(body,[button('为什么会走到“'+memories[p.chainStep+1].label+'”？',()=>causalQuestion(q,p.chainStep))]);}
}
function showMemory(q,i){const body=q.querySelector('.causal-question');body.replaceChildren(el('h2',memories[i].label));if(i<4&&i<p.chainStep){body.append(el('p',memories[i].options[memories[i].answer]));actions(body,[button('继续连接下一步',()=>go('causal'))]);}else if(p.chainStep>=4)go('causal');else causalQuestion(q,p.chainStep);}
function causalQuestion(q,i){
 const m=memories[i],body=q.querySelector('.causal-question');body.replaceChildren(el('h2',m.question));const opts=el('div','','options');m.options.forEach((text,answer)=>opts.append(button(text,()=>{
  body.replaceChildren(el('h2',m.question),el('p',m.explanation));if(answer===m.answer){p.chainAnswers[i]=answer;p.chainStep=i+1;save();actions(body,[button('连接下一步',()=>go('causal'))]);}else actions(body,[button('再想一想',()=>causalQuestion(q,i))]);
 },{'data-cause-answer':String(answer)})));body.append(opts);
}
async function title(){await activate('doorBG');const q=historyPanel();q.append(el('small','第二章'),el('h1','门关了，会议没有结束'),el('p','1789年6月20日 · 凡尔赛','title-date'));actions(q,[button('进入现场',()=>go('tennis'))]);}
async function showNode(node,page=0){
 const resume=p.dialogue&&p.node===node?{...p.dialogue}:null;checkpoint(node,page);userPaused=false;
 if(scenes[node])return explore(node,resume);
 if(histories[node])return history(node,page);
 switch(node){
  case'title':return title();
  case'opening':return showNode('tennis'); // Compatibility with saves at the removed opening.
  case'follow':return movie('follow','platform');
  case'platform':return platform();
  case'constitution-question':await hold('follow');return ask('constitution','look','constitutionChoice');
  case'look':await movie('look','invitation');if(state==='movie'){const q=panel('dialogue');q.append(el('p',questions.constitution.feedback[1]));}return;
  case'invitation':await hold('look');return line('代表','愿意留下的人，就站在这里举手。',()=>go('raise'));
  case'raise':return movie('raise','stay');
  case'stay':await hold('raise');setState('stay');{const row=panel('stay-actions');row.append(button('我也愿意留下！',()=>{p.stayed=true;save();$('#ui').classList.add('fade-away');const token=epoch;setTimeout(()=>{if(token===epoch)go('oath');},400);}));}return;
  case'oath':return movie('oath','oath-history');
  case'situation':return situation();
  case'paris-question':await activate('paris');return ask('paris','paris-call','parisJudged');
  case'paris-call':await activate('paris');return line('街区成员','光担心没有用。有人已经往荣军院去了。',()=>go('weapons'),'跟随人群去荣军院');
  case'weapons':return movie('weapons','invalides-entry');
  case'invalides-entry':return movie('invalides-entry','invalides-arms');
  case'invalides-arms':return movie('invalides-arms','invalides');
  case'bastille-choice':await activate('bastille');setState('question');{const q=panel('dialogue question');q.append(el('h2','人群越来越拥挤。你准备先做什么？'));const opts=el('div','','options');[['messages','帮忙把前面的消息往后传'],['water','把水和布送给附近需要的人']].forEach(([id,label])=>opts.append(button(label,()=>{p.action=id;save();go('action-feedback');},{'data-action-choice':id})));q.append(opts);}return;
  case'action-feedback':await activate('bastille');return line(p.action==='messages'?'我·心声':'街坊',p.action==='messages'?'就这样。后面的人知道前面发生什么，就不会只顾着继续往前挤。':'放这里。前面已经有人需要了。',()=>go('attack1'));
  case'attack1':return movie('attack1','attack2');case'attack2':return movie('attack2','attack3');case'attack3':return movie('attack3','bastille-history');
  case'knowledge':await activate('bastilleBG');return ask('significance','summary','knowledgeCorrect');
  case'summary':return showSummary();case'causal':return causal();
  case'chapter3':await activate('eveningBG');p.completed=true;save();{const q=historyPanel();q.append(el('small','第三章'),el('h1','把权利写下来'));actions(q,[button('进入第三章',()=>window.frDelivery.navigate('chapter03.html'))]);}return;
  default:return showNode('title');
 }
}
function resetPrompt(){resetResume=!!active?.video&&!active.video.paused&&!active.video.ended;pauseAll();room.suspended=true;$('#reset-dialog').showModal();}
function cancelReset(){if(!$('#reset-dialog').open)return;$('#reset-dialog').close();room.suspended=false;if(resetResume&&!document.hidden)run(resumeActive);updateControls();}
async function init(){
 config=await fetch('config/chapter02.json').then(r=>{if(!r.ok)throw Error('章节配置无法读取');return r.json();});
 room=new ChapterTwoRoom($('#viewport'),config.panorama,onPick,()=>{remember();save();});load();
 $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#viewport').requestFullscreen();}catch{$('#saved-note').textContent='此窗口暂不支持全屏，可扩大浏览器窗口继续。';}};
 $('#pause').onclick=()=>{const v=active?.video;if(!v||v.ended)return;userPaused=!v.paused;if(v.paused)run(resumeActive);else{v.pause();active.audio?.pause();}updateControls();};
 $('#sound-toggle').onclick=()=>{const v=active?.video,sound=active?.audio||v;if(!v||(v.loop&&!active.audio)||v.ended)return;if(config.media[active.key].originalAudio){p.originalMuted=!sound.muted;save();}else muted=!sound.muted;for(const a of assets.values()){if(a.video)a.video.muted=a.audio?true:mediaMuted(a.key);if(a.audio)a.audio.muted=mediaMuted(a.key);}updateControls();};
 $('#reset').onclick=resetPrompt;$('#cancel-reset').onclick=cancelReset;$('#reset-dialog').addEventListener('cancel',e=>{e.preventDefault();cancelReset();});
 $('#confirm-reset').onclick=()=>{epoch++;pauseAll();$('#reset-dialog').close();p=fresh();dialogue=null;currentScene=null;for(const a of assets.values()){if(a.video){a.video.onended=null;a.video.currentTime=0;}if(a.audio)a.audio.currentTime=0;}localStorage.removeItem(config.storageKey);go('title');};
 $('#retry').onclick=()=>{const fn=retryAction;$('#error').hidden=true;run(fn);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){remember();save();resetResume=!!active?.video&&!active.video.paused;pauseAll();}else if(resetResume&&!userPaused&&!$('#reset-dialog').open&&$('#error').hidden&&!active?.video?.ended)run(resumeActive);});
 window.addEventListener('pagehide',()=>{remember();save();pauseAll();});
 window.chapterTwo={inspect:()=>({state,paused:userPaused,node:p.node,page:p.page,progress:JSON.parse(JSON.stringify(p)),mode:document.body.dataset.mode,media:document.body.dataset.media,scene:currentScene,room:room.diagnostics(),hotspots:room.hotspots.map(({id,u,v})=>({id,u,v,...room.project(u,v)})),videos:[...assets.values()].filter(a=>a.video).map(a=>({key:a.key,paused:a.video.paused,ended:a.video.ended,time:a.video.currentTime,duration:a.video.duration,loop:a.video.loop,muted:a.video.muted,volume:a.video.volume,playbackRate:a.video.playbackRate,src:a.video.currentSrc,width:a.video.videoWidth,height:a.video.videoHeight})),audios:[...assets.values()].filter(a=>a.audio).map(a=>({key:a.key,paused:a.audio.paused,time:a.audio.currentTime,duration:a.audio.duration,loop:a.audio.loop,muted:a.audio.muted,volume:a.audio.volume,rate:a.audio.playbackRate,src:a.audio.currentSrc})),mediaLog:[...mediaLog]}),config};
 await run(()=>showNode(p.node,p.page));
}
init().catch(e=>{sceneLoading.stop();$('#error-text').textContent=e.message;$('#error').hidden=false;$('#retry').onclick=()=>window.frDelivery.reload();});
