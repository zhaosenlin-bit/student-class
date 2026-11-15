import {MediaCache,createLookahead,bufferedForLookahead} from './performance.mjs';
import {createSceneLoadingNotice,hasPlayingFrame} from '../../_course_runtime/scene-transition.mjs';
const sceneLoading=createSceneLoadingNotice(document.querySelector('#loading'));
import './i18n.js';
import {CylinderRoom} from './scene.js';
import {StreetAct} from './street.js';
import {VotingDemo} from './voting.js';
import {ContinuationAct} from './continuation.js';
const $=s=>document.querySelector(s), KEY='frenchRevolution.chapter1.act1.v1';
const defaultProgress=()=>({openingComplete:false,heard:{father:false,pierre:false,julien:false,merchant:false},voting:{estate:false,person:false,complete:false},threeEstatesKnown:false,identityCorrect:false,draftSigned:false,summaryConfirmed:false,completed:false,lastSafeStage:'room',direction:{yaw:0,pitch:0},freeDirection:{yaw:0,pitch:0}});
let progress=defaultProgress(),room,media,dialogues,hotspotConfig,street,continuation,state='prologue',busy=false,activeAsset=null,retryAction=null,dialogueContext=null,hintTimer;
const cache=new MediaCache({limit:5,active:()=>activeAsset});
const lookahead=createLookahead(prepare,{allow:()=>!navigator.connection?.saveData&&bufferedForLookahead(activeAsset?.video)});
window.frDelivery.registerLifecycle({dispose(){lookahead.dispose();cache.dispose();}});let introStarted=0,introEnded=0,sound=true,userPaused=false,resetting=false,voting,knowledgeHighlights=[];
function save(){if(resetting)return;try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{hint('浏览器无法保存进度，本次体验仍可继续。');}}
function load(){try{const p=JSON.parse(localStorage.getItem(KEY));if(!p)return;for(const k of ['openingComplete','identityCorrect','draftSigned','summaryConfirmed','completed'])progress[k]=p[k]===true;
 for(const id of Object.keys(progress.heard))progress.heard[id]=p.heard?.[id]===true;
 for(const id of ['estate','person','complete'])progress.voting[id]=p.voting?.[id]===true;
 progress.voting.complete=progress.voting.complete&&progress.voting.estate&&progress.voting.person;
 progress.lastSafeStage=['room','continuation','draft'].includes(p.lastSafeStage)?p.lastSafeStage:(p.completed?'draft':'room');
 progress.threeEstatesKnown=progress.heard.julien;for(const k of ['direction','freeDirection'])if(Number.isFinite(p[k]?.yaw)&&Number.isFinite(p[k]?.pitch))progress[k]=p[k];
 if(!progress.openingComplete)progress=defaultProgress();if(!progress.identityCorrect){progress.completed=false;progress.summaryConfirmed=false;progress.draftSigned=false;}
 }catch{progress=defaultProgress();}}
function hint(text,ms=5500){clearTimeout(hintTimer);$('#hint').textContent=text;hintTimer=setTimeout(()=>$('#hint').textContent='',ms);}
function setState(next){state=next;if(!['explore','street-explore','continuation-explore'].includes(next)){clearTimeout(hintTimer);$('#hint').textContent='';}document.body.dataset.state=next;room.enabled=['explore','street-explore','continuation-explore'].includes(next);$('#prologue').hidden=!['prologue','street-prologue'].includes(next);
 const safeStage=next.startsWith('continuation-')?'continuation':['draft','draft-guidance'].includes(next)?'draft':['explore','person','identity','decision','opening'].includes(next)?'room':null;if(safeStage&&progress.lastSafeStage!==safeStage){progress.lastSafeStage=safeStage;save();}
 const outside=next.startsWith('street-'),continued=next.startsWith('continuation-');$('.scene-caption h1').textContent=outside?'法国大革命前的危机':continued?'我们的意见也要算数':'革命前的法国';$('.scene-caption span').textContent=outside?'第一章 · 巴黎街道':continued?'第一章 · 诉求、思想与规则':'第一章 · 印刷店';$('#reset').textContent='重置此章';
 $('#summary-button').hidden=true;$('#continue-chapter').hidden=true;$('#pause').hidden=continued?!activeAsset?.video:!['intro','explore','person','street-explore','street-person','street-summary'].includes(next);$('#sound').hidden=next!=='intro';$('#volume-control').hidden=next!=='intro';
 updatePause();room.projectHotspots();}
function fail(error,retry){$('#error-text').textContent=error.message||String(error);$('#error').hidden=false;retryAction=retry;room&&(room.suspended=true);}
$('#retry').onclick=()=>{const action=retryAction;$('#error').hidden=true;room&&(room.suspended=false);action?.();};
async function run(action){if(busy||$('#ui .confirm'))return;busy=true;sceneLoading.start();room&&(room.suspended=true);try{await action();}catch(e){fail(e,()=>run(action));}finally{busy=false;sceneLoading.stop();if(room)room.suspended=!$('#error').hidden;}}
function button(label,handler,primary=false){const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=()=>{const modal=$('#ui .confirm');if(!busy&&$('#error').hidden&&(!modal||modal.contains(b)))handler();};return b;}
function panel(className){const p=document.createElement('div');p.className=className;$('#ui').replaceChildren(p);return p;}
function actions(parent,buttons){const a=document.createElement('div');a.className='actions';for(const b of buttons)a.append(b);parent.append(a);return a;}
function renderDialogueText(element,text,knowledge=false,keywords){
 element.replaceChildren();if(!knowledge){element.textContent=text;return;}
 const phrases=[...new Set(keywords||knowledgeHighlights)].filter(p=>typeof p==='string'&&p.length>0&&p.length<=12&&p!==text),used=new Set();let offset=0;
 while(offset<text.length){let start=text.length,match='';if(used.size<2)for(const phrase of phrases){if(used.has(phrase))continue;const at=text.indexOf(phrase,offset);if(at>=0&&(at<start||(at===start&&phrase.length>match.length))){start=at;match=phrase;}}
  if(start>offset)element.append(document.createTextNode(text.slice(offset,start)));if(!match)break;const mark=document.createElement('mark');mark.className='knowledge-highlight';mark.textContent=match;element.append(mark);used.add(match);offset=start+match.length;
 }
}
function showLine(line,label,next,meta=''){const p=panel('dialogue');const s=document.createElement('div');s.className='speaker';s.textContent=line[0];const t=document.createElement('p');renderDialogueText(t,line[1],line[0]==='我了解到');p.append(s,t);const a=actions(p,[button(label,next,true)]);if(meta){const m=document.createElement('span');m.className='dialogue-meta';m.textContent=meta;a.prepend(m);}}
async function prepare(key){if(cache.has(key))return cache.get(key);const promise=(async()=>{
 const source=media[key];if(!source)throw Error('缺少素材配置：'+key);
 if(key.endsWith('Video')){
  const video=document.createElement('video');video.hidden=true;video.playsInline=true;video.preload='auto';video.muted=true;video.defaultMuted=true;video.loop=['conversationVideo','streetVideo'].includes(key);video.dataset.media=key;document.body.append(video);
  try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('素材加载超时：'+source)),20000);
   const finish=e=>{clearTimeout(timer);video.onloadeddata=null;video.onerror=null;e?reject(e):resolve();};video.onloadeddata=()=>finish();video.onerror=()=>finish(Error('视频缺失或无法解码：'+source));video.src=source;video.load();});}
  catch(e){video.removeAttribute('src');video.load();video.remove();throw e;}
  const asset={key,video,aspect:video.videoWidth/video.videoHeight,texture:room.configureTexture(new THREE.VideoTexture(video))};
  video.addEventListener('error',()=>{if(activeAsset===asset){video.pause();fail(Error('视频播放中断或解码失败：'+source),()=>run(async()=>{cache.delete(key);asset.texture.dispose();video.removeAttribute('src');video.load();video.remove();if(asset.resumeScene)await asset.resumeScene();else await activate(key);if(state==='intro')bindIntro(activeAsset.video);}));}});
  if(key==='introVideo')bindIntro(video);return asset;
 }
 const image=new Image();image.src=source;try{await image.decode();}catch{throw Error('图片缺失或无法解码：'+source);}
 return {key,image,aspect:image.naturalWidth/image.naturalHeight,texture:room.configureTexture(new THREE.Texture(image))};
 })();cache.set(key,promise);try{return await promise;}catch(e){cache.delete(key);throw e;}}
async function playDecoded(video){
 if(hasPlayingFrame(video))return;
 let callback,timer;const frame=new Promise((resolve,reject)=>{
  timer=setTimeout(()=>reject(Error('视频没有呈现可绘制画面，请重试。')),15000);
  if(video.requestVideoFrameCallback)callback=video.requestVideoFrameCallback(()=>resolve());else{const check=()=>video.readyState>=2?resolve():requestAnimationFrame(check);check();}
 });
 try{await video.play();await frame;}catch(e){frame.catch(()=>{});throw Error('视频播放未成功，请点击重试。'+e.message);}finally{clearTimeout(timer);if(callback)video.cancelVideoFrameCallback(callback);}
}
async function activate(key,direction){const next=await prepare(key);if(next.video){next.video.muted=key!=='introVideo'||!sound;next.video.volume=Number($('#volume').value);await playDecoded(next.video);}
 const flat=media.flatMedia?.includes(key)===true;
 // Reuse the decoded media. CSS covers the viewport at its original aspect,
 // cropping overflow instead of stretching the picture or adding letterboxes.
 for(const child of [...$('#flat-frame').children]){child.hidden=true;if(child.tagName==='VIDEO')document.body.append(child);else child.remove();}
 room.flat=flat;room.clearDrag();$('#flat-screen').hidden=!flat;room.canvas.hidden=flat;
 if(flat){const element=next.video||next.image;element.hidden=false;$('#flat-frame').replaceChildren(element);}else room.setMedia(next);
 const old=activeAsset;activeAsset=next;if(old?.video&&old!==next)old.video.pause();
 if(direction)room.setDirection(direction);if(next.video&&userPaused&&key!=='introVideo')next.video.pause();updatePause();cache.trim();lookahead.next([({streetVideo:"introVideo",introVideo:"introEndFrame",introEndFrame:"conversationVideo",conversationVideo:"identityImage",identityImage:"chapter01ReadingVideo",chapter01ReadingVideo:"chapter01EstatesVideo",chapter01EstatesVideo:"chapter01ClergyVideo",chapter01ClergyVideo:"chapter01ExitVideo",chapter01ExitVideo:"chapter01ClosedDoorImage"})[key]]);}
function bindIntro(video){if(video.dataset.bound)return;video.dataset.bound='true';video.addEventListener('ended',()=>{
 if(state!=='intro'||activeAsset?.video!==video||$('#ui .confirm'))return;introEnded++;run(async()=>{await activate('introEndFrame');setState('opening');openingLine(0);});});}
async function beginIndoorIntro(){userPaused=false;await activate('introVideo');introStarted++;setState('intro');$('#ui').replaceChildren();}
async function startIntro(){await run(beginIndoorIntro);}
function openingLine(index){showLine(dialogues.opening[index],index===dialogues.opening.length-1?'开始交谈':'继续',()=>{
 if(index<dialogues.opening.length-1)openingLine(index+1);else{progress.openingComplete=true;save();run(async()=>{await enterExplore();hint('拖动画面查看，点击人物交谈；想清楚后，点击桌上的纸。',7500);});}
 },`开场 · ${index+1} / ${dialogues.opening.length}`);}
async function enterExplore(restore){await activate('conversationVideo',restore);setState('explore');$('#ui').replaceChildren();dialogueContext=null;refreshHotspots();progress.direction=room.direction();progress.freeDirection=room.direction();save();}
function printshopReady(){return Object.values(progress.heard).every(Boolean)&&progress.voting.complete;}
function refreshHotspots(){room.setHotspots(hotspotConfig.items.filter(item=>item.id!=='paper'||printshopReady()),progress.heard);}
function pick(id){if(busy)return;if(continuation?.active()){continuation.pick(id);return;}if(street?.active()){street.pick(id);return;}if(state!=='explore')return;if(id==='paper'){if(progress.identityCorrect){run(openSummary);return;}
 if(!progress.openingComplete||!printshopReady()){hint('先听完四位街坊的话，也看完皮埃尔的两种计票方式。');return;}
 progress.freeDirection=room.direction();save();run(async()=>{await activate('identityImage');setState('identity');showQuestion();});return;}
 if(!dialogues.people[id])return;setState('person');dialogueContext={id,index:0};personLine();}
function personLine(){const {id,index}=dialogueContext;const pages=dialogues.people[id],last=index===pages.length-1;showLine(pages[index],last?(id==='pierre'?'看看票怎么算':'返回场景'):'继续',()=>{
 if(!last){dialogueContext.index+=1;personLine();}else if(id==='pierre'){progress.freeDirection=room.direction();save();run(()=>voting.start());}else{progress.heard[id]=true;progress.threeEstatesKnown=progress.heard.julien;save();dialogueContext=null;setState('explore');$('#ui').replaceChildren();refreshHotspots();}
 },`${index+1} / ${pages.length}`);}
function showQuestion(){const p=panel('dialogue question');const q=document.createElement('h2');q.textContent=dialogues.question;p.append(q);const options=document.createElement('div');options.className='options response-choices';p.append(options);
 for(const o of dialogues.options){const b=button(o.id+'. '+o.text,()=>{for(const item of options.children)item.disabled=true;answer(o);});b.dataset.answer=o.id;options.append(b);}
 actions(p,[button('返回交谈',()=>run(()=>enterExplore(progress.freeDirection)))]);}
function answer(option){showLine(option.feedback,option.id===dialogues.correct?'继续':'再想一想',()=>{
 if(option.id!==dialogues.correct){showQuestion();return;}
 progress.identityCorrect=true;save();setState('decision');showLine(dialogues.decision,'动笔',()=>run(openSummary));
 });}
async function openSummary(){
 if(['explore','person'].includes(state)){progress.freeDirection=room.direction();save();}await activate('identityImage');setState('draft');
 const s=dialogues.summary,p=panel('parchment draft-page');p.setAttribute('role','region');p.setAttribute('aria-label','意见草稿');
 const grid=document.createElement('div');grid.className='draft-columns';p.append(grid);
 for(const section of s.sections){const block=document.createElement('section'),h=document.createElement('h3');h.textContent=section.title;block.append(h);for(const line of section.lines){const text=document.createElement('p');text.textContent=line;block.append(text);}grid.append(block);}
 const connection=document.createElement('p');connection.className='draft-connection';connection.textContent=s.connection;p.append(connection);
 const signature=document.createElement('footer');signature.className='draft-signature';signature.setAttribute('aria-live','polite');p.append(signature);
 const sign=()=>{progress.draftSigned=true;progress.summaryConfirmed=true;progress.completed=true;save();setState('draft-guidance');p.classList.add('draft-signed');signature.textContent=s.signature.date+' · '+s.signature.place;p.querySelector('.actions')?.remove();actions(p,[button('到书桌前',()=>run(()=>continuation.start()),true)]);};
 if(progress.draftSigned)sign();else actions(p,[button('落款',sign,true)]);
}
function resetPrompt(){
 if(busy||$('#ui .confirm'))return;
 const wasSuspended=room.suspended,video=activeAsset?.video,wasPlaying=video&&!video.paused,errorWasVisible=!$('#error').hidden;
 room.clearDrag();room.suspended=true;video?.pause();$('#error').hidden=true;
 const background=[$('#toolbar'),$('#prologue'),$('#calibration'),...$('#ui').children].map(element=>({element,inert:element.inert}));for(const {element} of background)element.inert=true;
 const restoreBackground=()=>{for(const {element,inert} of background)element.inert=inert;};
 const p=document.createElement('div');p.className='confirm';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','重置此章');const t=document.createElement('p');t.textContent='重置第一章？将清除巴黎街道、印刷店和投票、读书、意见页的学习进度，从最初的黑屏导语重新开始。其他章节不受影响。';p.append(t);
 actions(p,[button('取消',()=>{p.remove();restoreBackground();$('#error').hidden=!errorWasVisible;room.suspended=wasSuspended;if(!errorWasVisible&&video?.ended&&state==='intro')video.dispatchEvent(new Event('ended'));else if(wasPlaying&&!errorWasVisible)run(async()=>{await playDecoded(video);updatePause();});}),button('确认重置',()=>{resetting=true;try{street.clearProgress();continuation?.clearProgress();localStorage.removeItem(KEY);}catch(e){resetting=false;street.resetting=false;if(continuation)continuation.resetting=false;p.remove();restoreBackground();fail(Error('无法清除本章存档，请重试：'+e.message),resetPrompt);return;}window.frDelivery.reload();},true)]);
 $('#ui').append(p);p.querySelector('button').focus();
}
function updatePause(){$('#pause').textContent=activeAsset?.video?.paused?'继续视频':'暂停视频';if(state.startsWith('continuation-'))$('#pause').hidden=!activeAsset?.video||activeAsset.video.ended||['continuation-transition','continuation-summary','continuation-recap','continuation-complete','continuation-exit-pending'].includes(state);}
async function activateOnce(scene,complete,onEnd,direction){
 if(scene.playback==='loop'){
  const asset=await prepare(scene.media),video=asset.video;video.loop=true;asset.resumeScene=()=>activateOnce(scene,complete,onEnd,room.direction());
  // A ping-pong asset contains a forward pass plus its reverse. Credit the first
  // forward pass; the ambient reverse half must not add another learning gate.
  if(asset.passObserver)video.removeEventListener('timeupdate',asset.passObserver);
  let previous=video.currentTime,credited=complete;
  const forwardSeconds=media.pingPongLoops?.[scene.media]?.forwardSeconds;
  asset.passObserver=()=>{const now=video.currentTime,wrapped=previous-now>.25;if(wrapped)video.dataset.loopPasses=String(Number(video.dataset.loopPasses||0)+1);if(!credited&&(wrapped||(Number.isFinite(forwardSeconds)&&now>=forwardSeconds))){credited=true;onEnd();}previous=now;};
  video.addEventListener('timeupdate',asset.passObserver);await activate(scene.media,direction);return;
 }
 if(complete){await activate(scene.endFrame,direction);return;}
 const asset=await prepare(scene.media),video=asset.video;
 video.loop=false;asset.resumeScene=()=>activateOnce(scene,complete,onEnd,room.direction());
 if(asset.onceListener)video.removeEventListener('ended',asset.onceListener);
 asset.onceListener=()=>{onEnd();updatePause();};video.addEventListener('ended',asset.onceListener);
 if(video.ended){onEnd();await activate(scene.endFrame,direction);return;}
 await activate(scene.media,direction);
 // The ended video retains its real last decoded frame. Restores use the extracted matching PNG.
 prepare(scene.endFrame).catch(()=>{});
}
$('#pause').onclick=()=>{if(busy||!activeAsset?.video||activeAsset.video.ended)return;const v=activeAsset.video;if(v.paused){userPaused=false;run(async()=>{await playDecoded(v);updatePause();});}else{v.pause();userPaused=true;updatePause();}};
$('#sound').onclick=()=>{sound=!sound;if(activeAsset?.key==='introVideo')activeAsset.video.muted=!sound;$('#sound').textContent='进门原声：'+(sound?'开':'关');};
$('#volume').oninput=()=>{if(activeAsset?.key==='introVideo')activeAsset.video.volume=Number($('#volume').value);};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#viewport').requestFullscreen();}catch(e){hint('无法进入全屏：'+e.message);}};
$('#reset').onclick=()=>room&&resetPrompt();$('#summary-button').onclick=()=>run(openSummary);$('#continue-chapter').onclick=()=>run(()=>continuation.start());
document.addEventListener('visibilitychange',()=>{if(document.hidden){room?.clearDrag();activeAsset?.video?.pause();if(continuation?.active())continuation.direction(room.direction());else if(street?.active())street.direction(room.direction());else save();}else if(!resetting&&!$('#ui .confirm')&&activeAsset?.video&&!activeAsset.video.ended&&!userPaused&&(['continuation-explore','continuation-book','continuation-father','continuation-noble','continuation-clergy','continuation-exit','intro','explore','person','street-explore','street-person','street-thought','street-summary'].includes(state))){run(async()=>{await playDecoded(activeAsset.video);updatePause();});}});
window.addEventListener('pagehide',()=>{if(room){if(continuation?.active()){continuation.direction(room.direction());return;}if(street?.active()){street.direction(room.direction());return;}progress.direction=room.direction();if(['explore','person'].includes(state))progress.freeDirection=room.direction();save();}});
async function fetchJson(path){const r=await fetch(path);if(!r.ok)throw Error('配置加载失败：'+path+'（HTTP '+r.status+'）');return r.json();}
function setupCalibration(){let selected=hotspotConfig.items[0];const box=$('#calibration');
 function render(){const continued=continuation?.active()&&continuation.currentScene;const config=continued?continuation.data.scenes[continuation.currentScene]:street?.active()?street.hotspots:hotspotConfig;if(!config.items.includes(selected))selected=config.items[0];box.replaceChildren();const title=document.createElement('strong');title.textContent='热点校准 · 开发模式';box.append(title);const select=document.createElement('select');for(const h of config.items){const o=document.createElement('option');o.value=h.id;o.textContent=h.label;select.append(o);}select.value=selected.id;select.onchange=()=>{selected=config.items.find(x=>x.id===select.value);render();};box.append(select);
 for(const key of ['u','v','left','right','top','bottom']){const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.type='number';input.min=0;input.max=1;input.step=.005;input.value=key in selected?selected[key]:selected.bounds[key];input.oninput=()=>{const value=Math.max(0,Math.min(1,Number(input.value)));if(key in selected)selected[key]=value;else selected.bounds[key]=value;};label.append(input);box.append(label);}
 const filename=continued?'chapter01-continuation.json':street?.active()?'street-hotspots.json':'hotspots.json';const note=document.createElement('p');note.textContent='选择人物或书本后调整 UV/边界，或在场景取点。H 关闭；坐标导出后替换 config/'+filename+'。';box.append(note);
 box.append(button('在场景取点',()=>{room.calibrationPick=uv=>{selected.u=uv.u;selected.v=uv.v;room.calibrationPick=null;render();};}),button('导出坐标',()=>{const clean=continued?continuation.data:{...config,items:config.items.map(({element,...h})=>h)};const blob=new Blob([JSON.stringify(clean,(key,value)=>key==='element'?undefined:value,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));}
 function toggle(){box.hidden=!box.hidden;room.calibrationPick=null;if(!box.hidden)render();}
 document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&!e.target.matches('input,select,textarea'))toggle();});if(new URLSearchParams(location.search).has('calibrate'))toggle();}
async function boot(){try{
 let streetData,streetHotspots;[media,dialogues,hotspotConfig,streetData,streetHotspots,knowledgeHighlights]=await Promise.all([fetchJson('config/media.json'),fetchJson('config/dialogue.json'),fetchJson('config/hotspots.json'),fetchJson('config/street.json'),fetchJson('config/street-hotspots.json'),fetchJson('config/knowledge-highlights.json')]);
 if(media.missing?.length)throw Error('缺少素材：'+media.missing.join('、'));
 room=new CylinderRoom($('#viewport'),media.panorama,pick,d=>{if(continuation?.active()){continuation.direction(d);return;}if(street?.active()){street.direction(d);return;}progress.direction=d;if(['explore','person'].includes(state))progress.freeDirection=d;save();});
 load();street=new StreetAct({room,activate,prepare,run,showLine,panel,actions,button,setState,hint,state:()=>state,startIntro:beginIndoorIntro,setUserPaused:v=>userPaused=v},streetData,streetHotspots);if(!progress.openingComplete)progress.direction.pitch=media.panorama.initialPitchDegrees*Math.PI/180;room.setDirection(progress.direction);refreshHotspots();
 voting=new VotingDemo({prepare,panel,actions,button,renderDialogueText,run,setState,save,progress:()=>progress.voting,pause:()=>activeAsset?.video?.pause(),finish:()=>{progress.heard.pierre=true;save();run(()=>enterExplore(progress.freeDirection));}},await fetchJson('config/voting.json'));
 const continuationData=await fetchJson('config/chapter01-continuation.json');knowledgeHighlights.push(...(continuationData.highlights||[]));
 const parchment=new Image();parchment.src=media.parchmentImage;await parchment.decode();document.documentElement.style.setProperty('--parchment-image','url("'+media.parchmentImage+'")');
 const assemblyData=await fetchJson('config/chapter01-assembly.json');
 continuation=new ContinuationAct({room,activate,activateOnce,prepare,run,showLine,panel,actions,button,renderDialogueText,setState,hint,state:()=>state,priorProgress:()=>progress,streetProgress:()=>street.progress,returnToRoom:()=>enterExplore(progress.freeDirection),setUserPaused:v=>userPaused=v,pauseMedia:()=>{activeAsset?.video?.pause();updatePause();},resetChapter:resetPrompt},continuationData,assemblyData);
 $('#prologue-lines').replaceChildren(...dialogues.prologue.map(line=>{const p=document.createElement('p');p.textContent=line;return p;}));
 $('#enter').onclick=()=>{if(!busy)startIntro();};
 if(!street.progress.enteredShop){await run(()=>street.start());}
 else if(progress.openingComplete){$('#prologue').hidden=true;await run(async()=>{if(continuation.inspect().started&&progress.lastSafeStage==='continuation'){await continuation.start();}else if(progress.identityCorrect&&progress.lastSafeStage==='draft'){await openSummary();}else await enterExplore(progress.freeDirection);});}
 else{setState('prologue');prepare('introVideo').catch(()=>{});prepare('introEndFrame').catch(()=>{});}
 window.franceAct={inspect:()=>({state,paused:userPaused,progress:JSON.parse(JSON.stringify(progress)),voting:voting.inspect(),street:street.inspect(),continuation:continuation.inspect(),...room.diagnostics(),presentation:room.flat?'flat-16:9':'cylinder-180',introStarted,introEnded,activeMedia:activeAsset?.key,videos:[...document.querySelectorAll('video')].map(v=>({key:v.dataset.media,paused:v.paused,time:v.currentTime,duration:v.duration,loop:v.loop,muted:v.muted})),hotspots:room.hotspots.map(({element,...h})=>({...h,projected:room.project(h.u,h.v)}))})};
 }catch(e){fail(e,()=>window.frDelivery.reload());}}
boot();
