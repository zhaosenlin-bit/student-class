import * as THREE from '../vendor/three.module.js';
import { SceneManager } from './core/SceneManager.js';
import { PerformanceSettings } from './core/PerformanceSettings.js';
import { AudioManager } from './core/AudioManager.js?v=60';
import { ProgressManager } from './core/ProgressManager.js?v=65';
import { CameraControls } from './core/CameraControls.js';
import { MaterialSystem } from './core/MaterialSystem.js';
import { ChapterSystem } from './core/ChapterSystem.js';
import { QuestionBank } from './core/QuestionBank.js?v=64';
import { QuestionSystem } from './core/QuestionSystem.js?v=60';
import { BookModel } from './book/BookModel.js?v=63';
import { CloudSystem } from './ui/CloudSystem.js?v=60';
import { introQuestions } from './data/questions.js';
import { chapterRegistry } from './data/chapters.js?v=60';
import { quizPlans } from './data/quizPlans.js?v=60';

document.documentElement.dataset.appBoot='started';

const $=s=>document.querySelector(s), sceneEl=$('#scene'), ui=$('#book-ui'), hint=$('#hint');
const performanceSettings=new PerformanceSettings(),audio=new AudioManager(),progress=new ProgressManager();
const world=new SceneManager(sceneEl,performanceSettings),[materials,questionBank]=await Promise.all([new MaterialSystem(world.renderer).load(),new QuestionBank().load()]),book=new BookModel(materials),controls=new CameraControls(world.camera,world.renderer.domElement);
const clouds=new CloudSystem($('#cloud-layer'),audio,performanceSettings.particles),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const questionSystem=new QuestionSystem(questionBank,clouds,progress,audio,quizPlans);
const chapterSystem=new ChapterSystem(chapterRegistry,{book,progress,ui,controls,audio});
world.scene.add(book.group);let mode='cover',chapter=null,currentChapterId=progress.data.currentChapterId||'shuowen',busy=false,toastTimer,pageDragging=false;

book.cover.userData.cover=true;book.coverArt.userData.cover=true;
if(progress.introComplete())book.unlock();book.applyGrowth(progress.completedChapters().length);

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}
function updateStatus(){const n=progress.introCount(),registration=chapterSystem?.getRegistration(currentChapterId),state=progress.data[currentChapterId]||{},done=Object.entries(state).filter(([key,value])=>key!=='sceneRaised'&&value===true).length;$('#progress-text').textContent=mode==='chapter'?`${registration?.shortTitle||'章节'} · ${done} / ${registration?.taskCount||3}`:`序言机关 ${n} / 3`;$('#doubt-book').textContent=`疑义册 ${progress.data.doubts.length}`;$('#restart-chapter').classList.toggle('hidden',mode!=='chapter');}
document.addEventListener('jdc-progress',()=>{updateStatus();book.applyGrowth(progress.completedChapters().length);});
function cast(e){const r=world.renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(pointer,world.camera);return raycaster.intersectObjects(book.group.children,true);}
world.renderer.domElement.addEventListener('pointermove',e=>{if(mode==='cover'){const hit=cast(e).find(x=>x.object.userData.hotspot);book.setHover(hit?.object);world.renderer.domElement.style.cursor=hit?'pointer':'grab';return;}if(mode==='directory'&&!pageDragging){const hit=cast(e).find(x=>x.object.userData.directoryPage),corner=book.isDirectoryCorner(hit);book.setCornerHover(corner);world.renderer.domElement.style.cursor=corner?'grab':hit?'pointer':'grab';return;}if(mode==='chapter'){world.renderer.domElement.style.cursor=chapter?.isInteractiveHit?.(cast(e))?'grab':'default';}});
controls.onClick=e=>{if(busy)return;const hits=cast(e);if(mode==='chapter'){const seal=hits.find(item=>item.object.userData.quizSeal);if(seal){if(chapter?.canQuiz?.()===false)toast('先完成本章纸面机关，金色题印才会苏醒');else launchChapterQuiz(seal.object.userData.quizSeal,shouldReplayChapter(seal.object.userData.quizSeal));}return;}if(mode!=='cover')return;const hot=hits.find(x=>x.object.userData.hotspot)?.object;if(hot){openIntro(hot.userData.hotspot);return;}const cover=hits.find(x=>x.object.userData.cover);if(cover){if(progress.introComplete())openBook();else toast('先从三个方向观察，解开序言机关');}};

world.renderer.domElement.addEventListener('pointerdown',e=>{audio.unlock();if(mode==='chapter'&&!busy){const hits=cast(e);if(chapter?.handlePointerDown?.(e,hits)){e.preventDefault();e.stopImmediatePropagation();return;}const seal=hits.find(item=>item.object.userData.quizSeal);if(seal){e.preventDefault();e.stopPropagation();if(chapter?.canQuiz?.()===false)toast('先完成本章纸面机关，金色题印才会苏醒');else launchChapterQuiz(seal.object.userData.quizSeal,shouldReplayChapter(seal.object.userData.quizSeal));return;}}if(mode!=='directory'||busy)return;const hit=cast(e).find(item=>item.object.userData.directoryPage);if(!hit)return;e.preventDefault();e.stopPropagation();if(book.isDirectoryCorner(hit)){startPageDrag(e);return;}const start={x:e.clientX,y:e.clientY},move=event=>{if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>7)start.moved=true;},up=event=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(start.moved)return;const released=cast(event).find(item=>item.object.userData.directoryPage),entry=book.chapterAtIntersection(released);if(entry?.enabled)enterChapter(true,false,entry.id);else if(entry)toast('这一章尚未解锁');else if(!controls.reading)setReading(true);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);},{capture:true});

function startPageDrag(e){if(!book.turner.startDrag(1))return;const startX=e.clientX;busy=pageDragging=true;controls.enabled=false;audio.startFriction();hint.textContent='拖动书页 · 松手后将按翻页进度完成或回弹';const move=event=>{if(!pageDragging)return;book.turner.dragTo((startX-event.clientX)/(sceneEl.clientWidth*.38));},end=async()=>{if(!pageDragging)return;pageDragging=false;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);const completed=await book.turner.endDrag();audio.stopFriction(completed);if(completed)await enterChapter(false,true);else{controls.enabled=true;busy=false;hint.textContent=controls.reading?'阅读模式 · 目录已印在纸页上':'拖动观察整本书 · 拖动右下页角翻页';}};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);}

function openIntro(id){if(progress.data.intro[id]){toast('这个机关已经完成');return;}clouds.question(introQuestions[id],{onCorrect:()=>{progress.set(`intro.${id}`);updateStatus();if(progress.introComplete()){book.unlock();toast('金线已亮起，现在可以打开古籍');hint.textContent='点击封面，开启《经典常谈》';}}});}

async function openBook(){const resume=progress.data.bookOpened?progress.data.currentPage:'directory';busy=true;controls.enabled=false;controls.focusOpenBook();await new Promise(r=>setTimeout(r,550));await book.open();audio.play('bookOpen');progress.set('bookOpened');if(resume!=='chapter')progress.set('currentPage','directory');mode='directory';controls.enabled=true;$('#reading-mode').classList.remove('hidden');$('#doubt-book').classList.remove('hidden');showDirectory();busy=false;if(resume==='chapter')enterChapter();}

function setReading(on){if(on){controls.enterReading();document.body.classList.add('reading-mode');$('#reading-mode').textContent='退出阅读';$('#reading-mode').setAttribute('aria-pressed','true');hint.textContent='阅读模式 · 点击“退出阅读”回到立体观察';}else{controls.exitReading();document.body.classList.remove('reading-mode');$('#reading-mode').textContent='进入阅读';$('#reading-mode').setAttribute('aria-pressed','false');hint.textContent=mode==='directory'?'拖动观察整本书 · 点击目录内容进入阅读模式':'立体观察模式';}}
$('#reading-mode').onclick=()=>setReading(!controls.reading);
$('#doubt-book').onclick=()=>clouds.showDoubts(progress.data.doubts);
ui.addEventListener('click',e=>{if(mode==='directory'&&!controls.reading&&e.target.closest('.directory')&&!e.target.closest('button'))setReading(true);});

function showDirectory(){mode='directory';audio.enterChapter(null);if(book.state==='open')progress.set('currentPage','directory');chapterSystem.hideCurrent();ui.innerHTML='';ui.classList.add('hidden');book.showDirectory(chapterRegistry,progress);$('#page-nav').classList.remove('hidden');$('#folio').textContent='目录';$('#prev-page').disabled=true;$('#next-page').disabled=false;hint.textContent=controls.reading?'阅读模式 · 目录文字已印在纸页上':'拖动观察整本书 · 点击纸面阅读 · 拖动右下页角翻页';updateStatus();}

async function enterChapter(animate=true,fromDrag=false,id=currentChapterId){if(busy&&!fromDrag)return;if(!fromDrag)busy=true;currentChapterId=id;controls.enabled=false;book.hideDirectory();ui.classList.add('hidden');if(animate){await book.turner.turn(1);audio.play('pageTurn');}progress.set('currentPage','chapter');progress.set('currentChapterId',id);audio.enterChapter(id);mode='chapter';const registration=chapterSystem.getRegistration(id);$('#folio').textContent=registration?.title||'章节';$('#prev-page').disabled=false;$('#next-page').disabled=true;await ensureChapter(id);chapter.group.visible=true;showChapter();controls.enabled=true;busy=false;updateStatus();}

async function ensureChapter(id){chapter=await chapterSystem.open(id,{onComplete:()=>launchChapterQuiz(id)});}

function shouldReplayChapter(id){return Boolean(progress.data[id]?.question||progress.data.quizProgress?.[id]?.completed);}
function installQuizHit(){if(mode!=='chapter'||ui.querySelector('.quiz-hit')||chapter?.canQuiz?.()===false)return;const hit=document.createElement('button');hit.className='quiz-hit';hit.setAttribute('aria-label','打开章节金色题印');hit.onclick=()=>launchChapterQuiz(currentChapterId,shouldReplayChapter(currentChapterId));ui.append(hit);}

function launchChapterQuiz(id=currentChapterId,force=false){questionSystem.startChapter(id,()=>{progress.addBookmark(id);const index=chapterRegistry.findIndex(item=>item.id===id),next=chapterRegistry[index+1];if(next?.enabled)progress.unlock(next.id);book.showDirectory(chapterRegistry,progress);if(mode!=='directory')book.hideDirectory();chapter?.renderTasks?.();installQuizHit();updateStatus();toast('本章学习组合完成，章节印章已点亮');},force);}

function showChapter(){const registration=chapterSystem.getRegistration(currentChapterId),state=progress.data[currentChapterId]||{};ui.classList.remove('hidden');hint.textContent='点击章首页印记，让纸上文明缓缓立起';if(state.sceneRaised){chapter.group.scale.y=1;hint.textContent=state.question?'本章已完成 · 点击金色题印可重新练习':chapter?.canQuiz?.()===false?'完成纸面机关，唤醒章节题印':'纸面机关已完成 · 点击金色题印开始章节练习';chapter.renderTasks();installQuizHit();return;}ui.innerHTML=`<div class="chapter-title"><h2>${registration.shortTitle}</h2><p>${registration.subtitle||''}</p><button class="seal-action" aria-label="升起立体书景">开卷</button></div>`;ui.querySelector('.seal-action').onclick=()=>{ui.innerHTML='';chapter.raise();setTimeout(installQuizHit,0);hint.textContent='完成纸面机关，唤醒章节题印';};}

$('#prev-page').onclick=async()=>{if(mode==='chapter'&&!busy){busy=true;controls.enabled=false;ui.classList.add('hidden');await book.turner.turn(-1);audio.play('pageTurn');showDirectory();controls.enabled=true;busy=false;}};
$('#next-page').onclick=()=>{if(mode==='directory')enterChapter();};
$('#restart-chapter').onclick=()=>{if(confirm('只重置当前章节任务，保留三个序言机关，确定继续吗？')){progress.restartChapter(currentChapterId);chapterSystem.remove(currentChapterId);chapter=null;enterChapter(false,false,currentChapterId);}};
$('#reset-all').onclick=()=>{if(confirm('将清除序言机关、十三章答题、书签、疑义册和解锁状态。此操作无法撤销，确定全部重置吗？')){progress.resetAll();location.reload();}};
$('#quality').onclick=()=>{performanceSettings.toggle();world.setQuality(performanceSettings);clouds.particleCount=performanceSettings.particles;$('#quality').textContent=performanceSettings.low?'精致模式':'流畅模式';toast(performanceSettings.low?'已降低阴影、像素密度和云雾粒子':'已恢复精致效果');};
$('#sound').onclick=()=>{const on=audio.toggle();$('#sound').textContent=`声音：${on?'开':'关'}`;$('#sound').setAttribute('aria-pressed',on);if(on)audio.play('success');};
$('#music').onclick=()=>{const on=audio.toggleMusic();$('#music').textContent=`音乐：${on?'开':'关'}`;$('#music').setAttribute('aria-pressed',on);};
$('#volume').value=audio.volume;$('#volume').oninput=event=>audio.setVolume(event.target.value);
$('#quality').textContent=performanceSettings.low?'精致模式':'流畅模式';$('#sound').textContent=`声音：${audio.enabled?'开':'关'}`;updateStatus();
$('#music').textContent=`音乐：${audio.musicEnabled?'开':'关'}`;$('#music').setAttribute('aria-pressed',audio.musicEnabled);

if(progress.data.bookOpened&&progress.introComplete())hint.textContent='进度已恢复 · 点击金线封面继续阅读';
function loop(){requestAnimationFrame(loop);controls.update();book.update();chapter?.update();world.render();}loop();
