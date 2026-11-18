import {createDownloadUI,matchesDownloadEdition,validDownloadEdition} from './download-store.js?v=lq-202611180327';
import {createCourseTools,pptMarkup} from './course-tools.js?v=lq-202611180327';
const promotionNow=()=>Date.now();const syncPromotionClock=()=>{};const startPromotionCountdowns=()=>{};
import {browseCatalog,courseAuthors,isTeacherCourse,matchesOrigin} from './catalog-browse.js?v=delivery-parity-20261023.1';
const classroomReply=async()=>{};const isClassroomRequest=()=>false;
import {showHome} from './home.js?v=mobile-20261019';
import {createCourseNavigation} from './course-navigation.js?v=mobile-20261019';
import {prepareSiteEntry} from './site-entry.js?v=download-cdn-20261020.1';
import {attachCoursewareDelivery,detachCoursewareDelivery} from './courseware-load.js?v=apple-startup-20261026.1';
import {mountSaveHost} from './lq-save-host.js?v=lq-20261113';
import './course-operation-guides.js?v=20261002';
prepareSiteEntry({location,history});
// Wait for the catalogue mode before starting the optional home animation.
showHome(false);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const richText=value=>{const raw=String(value??"");if(!raw)return "";const allowed=/^(?:p|br|b|strong|i|em|u|h3|h4|h5|ul|ol|li|div|span|small|sup|sub)$/;const open=whole=>whole.replace(/&lt;/g,"<").replace(/&gt;/g,">");if(/&lt;[a-z]/i.test(raw))return raw.replace(/&lt;(\/?)([a-z][a-z0-9]*)&gt;/gi,(whole,slash,tag)=>allowed.test(tag.toLowerCase())?open(whole):whole);if(!/<[a-z][a-z0-9]*>/i.test(raw))return esc(raw);return esc(raw).replace(/&lt;(\/?)([a-z][a-z0-9]*)&gt;/gi,(whole,slash,tag)=>allowed.test(tag.toLowerCase())?open(whole):whole);};
let authSerial=0;
let catalog=[],info={},user=null,filter='全部',stage='全部',search='',timer=null,toastTimer=null,currentLesson=null,routeSerial=0,frameTimer=null,activePage='works',originFilter='全部',sortBy='default',authorFilter='',subjectsOpen=false;
/*
 * The catalogue holds well over a thousand lessons.  Drawing all of them
 * at once makes the page heavy to open and heavy to scroll, so the grid
 * is drawn in batches and the reader asks for the next one.
 */
const GRID_BATCH=48;
let gridShown=GRID_BATCH;
const store={bundle:()=>null,courseBundles:()=>[],bundleSummary:()=>'',purchaseOptions:()=>[],bundlePricing:()=>'',bundlesPage:()=>{history.replaceState(null,'','#catalog');},feedbackAdmin:()=>{}};
const courseTools=createCourseTools({modal,toast,getProduct:id=>product(id),origin:location.origin});
const downloadUI=createDownloadUI({api,esc,product:id=>product(id),main:()=>$('#main'),modal,close,toast});
const downloadBulk={mount:()=>{},invalidate:()=>{}};
const phone={cancel:()=>{},phoneMasked:()=>'',refresh:async()=>{},open:async()=>{toast('本地版无需登录，课件可直接在线使用或下载。');}};
const courseNavigation=createCourseNavigation({location,history,getBundles:()=>info.bundles||[],getScrollY:()=>window.scrollY,getViewState:captureBrowseView,restoreViewState:restoreBrowseView,render:()=>route()});
let chapterFilter='',editionFilter='all',lease=null,heartbeatTimer=null,heartbeatPromise=null,leaseDeadlineTimer=null,leaseExpired=false;

let restoringBrowse=null,lockedScroll=null;
function captureBrowseView(){return {filter,stage,search,originFilter,sortBy,authorFilter,chapterFilter,editionFilter,bundleChapter:document.querySelector('[data-bundle-chapter][aria-pressed="true"]')?.dataset.bundleChapter||'',libraryChapter:document.querySelector('[data-library-chapter][aria-pressed="true"]')?.dataset.libraryChapter||'',details:[...document.querySelectorAll('#main details')].map(d=>({key:d.querySelector('summary')?.textContent.trim(),open:d.open})),directory:[...document.querySelectorAll('.curriculum-body,.library-directory-body')].map(d=>d.scrollTop)};}
function restoreBrowseView(v){restoringBrowse=v;if(!v||typeof v!=='object')return;filter=v.filter||'全部';stage=v.stage||'全部';search=v.search||'';originFilter=v.originFilter||'全部';sortBy=v.sortBy||'default';authorFilter=v.authorFilter||'';chapterFilter=v.chapterFilter||'';editionFilter=validDownloadEdition(v.editionFilter);}
function restoreBrowseDOM(){const v=restoringBrowse;restoringBrowse=null;if(!v)return;for(const d of document.querySelectorAll('#main details')){const saved=v.details?.find(item=>item.key===d.querySelector('summary')?.textContent.trim());if(saved)d.open=!!saved.open;}[...document.querySelectorAll('.curriculum-body,.library-directory-body')].forEach((d,i)=>{d.scrollTop=v.directory?.[i]||0;});}
function restoreScroll(top){const style=document.documentElement.style,previous=style.scrollBehavior;style.scrollBehavior='auto';window.scrollTo({top,behavior:'auto'});style.scrollBehavior=previous;}
function lockClassroomScroll(){if(lockedScroll!==null)return;lockedScroll=window.scrollY;document.body.style.position='fixed';document.body.style.top=-lockedScroll+'px';document.body.style.width='100%';document.body.style.overflow='hidden';}
function unlockClassroomScroll(){if(lockedScroll===null)return;const y=lockedScroll;lockedScroll=null;for(const key of ['position','top','width','overflow'])document.body.style[key]='';restoreScroll(y);}
// Plain links from package cards and the purchased library use the same history
// path as buttons. Modified clicks still open independent tabs normally.
document.addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const a=e.target.closest('a[href]');if(!a||a.dataset.action||a.target==='_blank'||a.hasAttribute('download'))return;const m=/^#(course|play|classroom)\/([a-z0-9-]+)$/.exec(a.getAttribute('href'));if(!m)return;e.preventDefault();courseNavigation.navigate(m[1],m[2]);});

const newTabId=()=>{if(globalThis.crypto?.randomUUID)return crypto.randomUUID();if(globalThis.crypto?.getRandomValues)return [...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);};
const tabIdentity={id:newTabId(),ready:Promise.resolve(newTabId()),suspend:()=>{},resume:()=>{}};
let tabId=tabIdentity.id;
const viewerChecks=new WeakMap();
const freeViewerDeadline=courseId=>{const end=product(courseId)?.timedFree?.endsAt;return Date.now()+(Number.isSafeInteger(end)?Math.max(0,Math.min(600000,end-promotionNow())):600000);};
async function replyViewer(event,frame,courseId,kind){
 if(!isClassroomRequest(event,frame,courseId))return;
 let check=viewerChecks.get(frame);if(!check||check.courseId!==courseId){check={courseId,expiresAt:freeViewerDeadline(courseId),checkedAt:0,pending:null,revoked:false};viewerChecks.set(frame,check);}
 check.expiresAt=Math.min(check.expiresAt,freeViewerDeadline(courseId));
 if(Date.now()-check.checkedAt>=30000&&!check.pending){
  check.checkedAt=Date.now();check.pending=api('/api/classroom/viewer-check',{productId:courseId,kind}).then(result=>{check.expiresAt=result.expiresAt;check.revoked=false;}).catch(error=>{if([401,403,404,409].includes(error.status)){check.revoked=true;check.expiresAt=0;}}).finally(()=>{check.pending=null;});
 }
 // The already authorized response remains usable during short outages. Never
 // await an unbounded network request before acknowledging this existing grace.
 const reply=()=>{if(frame.isConnected&&viewerChecks.get(frame)===check)classroomReply(event,{frame,courseId,expiresAt:check.expiresAt,active:!check.revoked});};
 if(check.pending)check.pending.then(()=>{if(frame.isConnected&&check.revoked)frame.contentWindow.postMessage({type:'leqixiang:classroom-access',version:1,courseId,deliveryId:event.data.deliveryId,requestId:event.data.requestId,state:'blocked',ttlMs:0},'*');});
 reply();
}
window.addEventListener('message',event=>{
 if(event.data?.type!=='leqixiang:classroom-access')return;
 const frame=$('#lesson-frame iframe'),time=Date.now();
 if(isClassroomRequest(event,frame,currentLesson)){
  if(lease)classroomReply(event,{frame,courseId:currentLesson,expiresAt:lease.expiresAt,active:!leaseExpired&&!$('#classroom').hidden,now:time});
  else if(currentLesson&&!$('#classroom').hidden)replyViewer(event,frame,currentLesson,'classroom');return;
 }
 const preview=$('.creator-preview iframe');if(!preview||!user)return;
 const match=/^\/creator-preview\/(teacher-[a-z0-9]+)$/.exec(new URL(preview.src,location.href).pathname);if(!match)return;
 replyViewer(event,preview,match[1],'preview');
});
let libraryProducts=[];
const product=id=>catalog.find(p=>p.id===id)||libraryProducts.find(p=>p.id===id)||(info.courseReplacements?.[id]?{id,title:info.courseReplacements[id].title,retired:true}:null);
async function resolveLibraryProduct(id){return product(id);}
const showCatalogUse=p=>p.accessible===true||p.mode==='free';
const priceText=p=>'本地可用';
const catalogBuyText=p=>'本地已收录';
const size=n=>`${(n/1024/1024).toFixed(1)} MB`;
async function api(url,body){const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Requested-With':'studio'}:undefined,body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok){const error=Error(data.error||'暂时无法完成，请稍后重试');Object.assign(error,{status:r.status,code:data.code,canTakeover:data.canTakeover,phoneMasked:data.phoneMasked,bound:data.bound,support:data.support,currentAmount:data.currentAmount});throw error;}return data;}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4300);}
function modal(html){clearInterval(timer);timer=null;$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function close(){authSerial++;phone.cancel();clearInterval(timer);timer=null;$('#dialog').close();}
function legalFooter(){for(const [id,key]of [['business','seller'],['icp','icp'],['home-icp','icp'],['security-filing','securityNumber']]){const el=$('#'+id);if(!el)continue;el.hidden=!info[key];if(id!=='business')el.textContent=info[key]||'';}}
const accountDisplay=()=>/^phone_[a-f0-9]+$/.test(user?.username||'')?(phone.phoneMasked||'我的账号'):user?.username;
function accountLabel(){const el=$('#account');if(el)el.textContent='乐启享';}
function coverAlt(p){return `${p.title}课件画面`;}
const lessonSubject=p=>stage!=='全部'?(p.stageSubjects?.[stage]||p.subject):p.subject;
const stageLabel=p=>(p.stages||[]).join(' · ');
function detail(id){if(!product(id))return;close();return courseNavigation.navigate('course',id);}
function trial(id){close();return courseNavigation.navigate('play',id);}
function releaseLease(){clearInterval(heartbeatTimer);clearTimeout(leaseDeadlineTimer);leaseDeadlineTimer=null;heartbeatTimer=null;leaseExpired=false;const previous=lease;lease=null;if(previous)fetch('/api/classroom/release',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'studio'},body:JSON.stringify({tabId,leaseToken:previous.token}),keepalive:true}).catch(()=>{});}
function stopTrial(){detachCoursewareDelivery();releaseLease();clearTimeout(frameTimer);$('#lesson-frame').replaceChildren();$('#classroom').hidden=true;unlockClassroomScroll();document.body.classList.remove('classroom-active');currentLesson=null;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});document.title='乐启享 · 互动课件';}
function classroomOccupied(id,replaced=false){modal(`<div class="dialog-content"><h2>${replaced?'课件已在其他窗口打开':'账号正在使用课件'}</h2><p>${replaced?'当前窗口已停止。需要继续在这里上课时，可将课堂切换回来。':'可以将课堂切换到当前窗口，原窗口将停止使用。'}</p><div class="actions"><button class="button" data-action="takeover" data-id="${esc(id)}">在这里继续</button><button class="button secondary" data-action="close">暂不切换</button></div></div>`);}
function stopExpiredLesson(){
 if(!lease||!currentLesson||leaseExpired)return;detachCoursewareDelivery();leaseExpired=true;clearTimeout(frameTimer);$('#lesson-frame').replaceChildren();$('#lesson-loading').hidden=false;$('#lesson-loading').classList.add('error-state');$('#lesson-loading').innerHTML='<span>连接已中断，请重新连接后继续。</span><small>重新打开后，实验将回到初始状态。</small><button class="button" data-action="reconnect-classroom">重新连接</button>';
}
function checkLeaseDeadline(){if(lease&&Date.now()>=Number(lease.expiresAt))stopExpiredLesson();}
function armLeaseDeadline(){clearTimeout(leaseDeadlineTimer);if(!lease)return;const active=lease;leaseDeadlineTimer=setTimeout(()=>{if(lease!==active)return;if(Date.now()>=Number(active.expiresAt))stopExpiredLesson();else armLeaseDeadline();},Math.max(0,Number(active.expiresAt)-Date.now()));}
function renewLease(){
 if(!lease)return Promise.resolve(false);checkLeaseDeadline();if(heartbeatPromise)return heartbeatPromise;const active=lease,id=currentLesson;
 heartbeatPromise=(async()=>{try{const result=await api('/api/classroom/heartbeat',{tabId,leaseToken:active.token});if(lease!==active)return false;active.expiresAt=result.expiresAt;armLeaseDeadline();return true;}catch(error){
  if(lease===active&&['CLASSROOM_REPLACED','LEASE_EXPIRED'].includes(error.code)){stopTrial();classroomOccupied(id,true);}else if(lease===active&&error.code==='ACCESS_REVOKED'){stopTrial();toast('此课件的使用权限已更新');location.hash='course/'+id;}else if(lease===active&&error.status===401){stopTrial();auth();}else if(lease===active)checkLeaseDeadline();return false;
 }finally{heartbeatPromise=null;}})();return heartbeatPromise;
}
function showLessonError(report){
 const layer=$('#lesson-loading');layer.hidden=false;layer.classList.add('error-state');
 const details='课件启动错误\n错误编号：'+report.code+'\n课件：'+report.courseId+'\n说明：'+report.message+'\n启动阶段：'+report.phase+'\n自动重连：'+(report.retried?'是':'否')+'\n加载方式：'+report.delivery+'\n浏览器：'+report.browser+'\n启动信息：'+JSON.stringify(report.diagnostics||{});
 layer.innerHTML=`<div style="box-sizing:border-box;width:min(540px,calc(100vw - 40px));max-height:calc(100vh - 130px);max-height:calc(100dvh - 130px);margin:auto;overflow:auto;text-align:left"><strong>课件未能启动</strong><p>错误编号：${esc(report.code)}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace;max-height:160px;overflow:auto">${esc(report.message)}</pre><button class="button secondary" data-copy-startup>复制错误信息</button> <button class="button secondary" data-action="restart">重新打开</button><p role="status" data-copy-status style="font-size:12px"></p><textarea aria-label="错误信息" readonly hidden style="box-sizing:border-box;width:100%;height:130px"></textarea></div>`;
 layer.querySelector('[data-copy-startup]').onclick=async()=>{const status=layer.querySelector('[data-copy-status]');try{await navigator.clipboard.writeText(details);status.textContent='已复制错误信息';}catch{const box=layer.querySelector('textarea');box.hidden=false;box.value=details;box.focus();box.select();let copied=false;try{copied=document.execCommand('copy');}catch{}status.textContent=copied?'已复制错误信息':'错误信息已选中，可直接复制。';}};
}
async function openLesson(id,serial,takeover=false){
 tabId=await tabIdentity.ready;if(serial!==routeSerial)return;
 const p=await resolveLibraryProduct(id);if(serial!==routeSerial)return;
 if(p?.retired){stopTrial();splitCoursePage(id);return;}
 if(!p){stopTrial();$('#main').innerHTML='<div class="empty"><h2>未找到这个课件</h2><a class="button" href="#catalog">返回课件库</a></div>';return;}
 if(currentLesson===id&&!$('#classroom').hidden&&!takeover&&!leaseExpired)return;
 
 const access=await api(`/api/access/${encodeURIComponent(id)}`);if(serial!==routeSerial)return;Object.assign(p,access);
 if(!(info.downloadMode?access.onlineAccessible:access.accessible)){stopTrial();if(!user){auth();return;}detail(id);return;}
 stopTrial();let launch;
 try{launch=await api(`/api/launch/${encodeURIComponent(id)}`,{tabId,...(takeover?{takeover:true}:{})});}catch(error){if(serial!==routeSerial)return;if(error.code==='CLASSROOM_IN_USE'){introPage(id);classroomOccupied(id);return;}if(error.code==='PHONE_VERIFICATION_REQUIRED'){introPage(id);await phone.open('safety',{target:{id,takeover}});return;}if(error.code==='PHONE_BINDING_REQUIRED'){introPage(id);await phone.open('bind');return;}throw error;}
 if(serial!==routeSerial){if(launch.lease)fetch('/api/classroom/release',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'studio'},body:JSON.stringify({tabId,leaseToken:launch.lease.token}),keepalive:true}).catch(()=>{});return;}
 lease=launch.lease||null;leaseExpired=false;if(lease){armLeaseDeadline();heartbeatTimer=setInterval(renewLease,Math.max(15,Number(lease.heartbeatSeconds)||45)*1000);}
 currentLesson=id;document.title=`${p.title} · 乐启享`;$('#classroom').hidden=false;lockClassroomScroll();document.body.classList.add('classroom-active');const back=courseNavigation.target(id,true);$('#player-back').href=back.href;$('#player-back').textContent='← '+back.label;$('#player-back').dataset.action='course-return';$('#lesson-loading').hidden=false;$('#lesson-loading').classList.remove('error-state');$('#lesson-loading').textContent='正在打开课件…';
 const frame=document.createElement('iframe');frame.title=`${p.title}在线课件`;frame.setAttribute('sandbox','allow-scripts allow-forms allow-pointer-lock allow-downloads'+(launch.allowSameOrigin===true?' allow-same-origin':''));frame.setAttribute('allow','autoplay; fullscreen');frame.allowFullscreen=true;
 const plain=/^(afe-|openlab-|phet-|tongjiang-|labsims-|aviary-|lab-|blocklygames-)/.test(id);attachCoursewareDelivery({frame,courseId:id,seriesId:p.splitFrom||id,launch,plain,stillActive:()=>currentLesson===id&&serial===routeSerial&&!leaseExpired,
  requestLaunch:()=>api(`/api/launch/${encodeURIComponent(id)}`,{tabId}),
  onLaunch:next=>{lease=next.lease||null;if(lease)armLeaseDeadline();},
  onStage:stage=>{$('#lesson-loading').textContent=stage==='reconnecting'?'正在重新连接课件…':'正在打开课件…';},
  onReady:()=>{$('#lesson-loading').hidden=true;},onError:showLessonError});
 $('#lesson-frame').append(frame);
 if(plain)mountSaveHost(frame,id);
  let dismissed=false;try{dismissed=sessionStorage.getItem('orientation-hint')==='1';}catch{}$('#orientation-hint').hidden=dismissed||!matchMedia('(max-width:600px) and (orientation:portrait)').matches;
}
window.addEventListener('pagehide',()=>{releaseLease();tabIdentity.suspend();});
window.addEventListener('online',()=>{if(currentLesson)renewLease();});
window.addEventListener('pageshow',e=>{if(!e.persisted)return;tabIdentity.resume();if(currentLesson){const id=currentLesson;stopTrial();openLesson(id,++routeSerial).catch(error=>toast(error.message));}});
function operationGuide(p,{heading='h2',id='',compact=false}={}){
 const legacyGuide=window.XBCourseOperationGuides?.[p.splitFrom||p.id];
 const guide=p.operationGuide?{...legacyGuide,...p.operationGuide}:legacyGuide;
 const labels={left:'鼠标左键',right:'鼠标右键',wheel:'鼠标滚轮',space:'空格键'};
 const icons={left:'<path d="M12 3v8H5V9a7 7 0 0 1 7-6Z" fill="currentColor" opacity=".65"/>',right:'<path d="M12 3v8h7V9a7 7 0 0 0-7-6Z" fill="currentColor" opacity=".65"/>',wheel:'<path d="M12 6v5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'};
 const icon=key=>key==='space'?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M7 11v3h10v-3"/></svg>':`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="19" rx="7"/><path d="M5 11h14M12 3v8"/>${icons[key]}</svg>`;
 const missing={left:'点击课件中的按钮进行操作。此作品尚未提供鼠标拖动的具体说明，请先查看课件内的操作帮助。',right:'此作品尚未提供右键操作说明，请不要将右键拖动作为必需操作。',wheel:'此作品尚未提供滚轮操作说明，请先使用课件内可见的视角按钮。',space:'此作品尚未提供空格键操作说明，请使用课件中的播放或暂停按钮。'};
 return `<section ${id?`id="${esc(id)}"`:''} class="course-operation-guide${compact?' is-compact':''}" aria-label="操作指南"><${heading}>操作指南</${heading}><dl class="operation-guide-keys">${Object.entries(labels).map(([key,label])=>`<div class="operation-guide-key"><dt>${icon(key)}<span>${label}</span></dt><dd>${esc(guide?.[key]||missing[key])}</dd></div>`).join('')}</dl>${guide?.extra?.length?`<ul class="operation-guide-extra">${guide.extra.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}<p class="operation-guide-browser">如果 Edge 浏览器的右键拖动触发后退、前进或刷新，请在浏览器设置中搜索“鼠标手势”，将当前网站加入手势阻止列表。网页无法代替你关闭浏览器手势。</p></section>`;
}
function classroomHelp(){const p=product(currentLesson);if(!p)return;modal(`<div class="dialog-content classroom-operation-help"><p class="eyebrow">${esc(p.title)}</p>${operationGuide(p)}<p class="subtle"></p></div>`);}

function authorMarkup(p){
 const name=p.creatorName||'乐启享机器人',content=`<span class="author-dot" aria-hidden="true">${esc(name.slice(0,1))}</span>${esc(name)}`;
 return isTeacherCourse(p)&&p.creatorId!=null?`<button class="author-name author-filter-button" data-action="author-filter" data-value="${esc(p.creatorId)}" aria-label="查看${esc(name)}的课件">${content}</button>`:`<span class="author-name">${content}</span>`;
}
function card(p){return downloadUI.card(p);}
function availableSubjects(){return ['全部',...new Set(catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter)).filter(p=>true).filter(p=>stage==='全部'||p.stages?.includes(stage)).map(lessonSubject))];}
function filtersMarkup(){
 const authors=courseAuthors(catalog),teacher=originFilter==='教师课件';
 const authorOptions=authors.map(a=>{const sameName=authors.filter(x=>x.name===a.name).length>1;return `<option value="${esc(a.id)}" ${authorFilter===a.id?'selected':''}>${esc(a.name)} · ${a.count} 份${sameName?' · '+esc(a.firstTitle):''}</option>`;}).join('');
 return `<div class="catalog-panel teacher-search-panel"><div class="filter-row"><span class="filter-label">来源</span><div class="filters" role="group" aria-label="按课件来源筛选">${['全部','官方课件','教师课件'].map(x=>`<button class="filter ${originFilter===x?'active':''}" data-action="origin-filter" data-value="${x}" aria-pressed="${originFilter===x}">${x}</button>`).join('')}</div></div><div class="filter-row"><span class="filter-label">学段</span><div class="filters" role="group" aria-label="按学段筛选">${['全部','小学','初中','高中'].map(x=>`<button class="filter ${stage===x?'active':''}" data-action="stage" data-value="${x}" aria-pressed="${stage===x}">${x}</button>`).join('')}</div><label class="search-wrap"><span aria-hidden="true">⌕</span><input class="search" id="search" type="search" placeholder="课件、知识点或作者" aria-label="搜索课件、知识点或作者" aria-describedby="search-hint" value="${esc(search)}"></label></div><div class="filter-row"><span class="filter-label">学科</span><div id="subject-filters" class="filters" role="group" aria-label="按学科筛选">${subjectMarkup()}</div></div>${originFilter!=='官方课件'?`<div class="filter-row author-filter-row"><span class="filter-label">作者</span><label class="catalog-author-select"><span class="sr-only">按作者筛选</span><select id="course-author" aria-label="按作者筛选" ${!authors.length?'disabled':''}><option value="">全部作者</option>${authorOptions}</select></label>${teacher?'<span class="catalog-filter-note">点击课件上的作者，可查看该作者的全部作品。</span>':''}</div>`:''}<label class="sort-label">排序 <select id="course-sort" aria-label="课件排序"><option value="default" ${sortBy==='default'?'selected':''}>${search.trim()?'相关度':'目录顺序'}</option><option value="newest" ${sortBy==='newest'?'selected':''}>最近更新</option></select></label></div><p id="search-hint" class="catalog-search-hint">多个关键词用空格分开，可组合查找课件、知识点、学科和作者。</p></div>`;
}
function subjectMarkup(){return availableSubjects().map(x=>`<button class="filter ${filter===x?'active':''}" data-action="filter" data-value="${x}" aria-pressed="${filter===x}">${x}</button>`).join('');}
/*
 * The catalogue filter row of the 乐启享 courseware library.
 *
 * The row is a toolbar, not a wall. What a teacher reaches for first is
 * a word and a sort order, so those stay on the surface; the facets
 * (stage, subject) sit behind one disclosure that names the choice in
 * force, so the catalogue is visible the moment the page opens.
 *
 * There is no availability facet and no price facet. Every course in the
 * list can be opened and taken away, so a filter that separates them
 * would only promise something the library does not have to deliver.
 *
 * The fold is a button and a data attribute rather than a <details>
 * element, because the stylesheet has to decide the open state on its
 * own, and a remembered state is not what a reader who just arrived
 * should see.
 */
function downloadGalleryFilters(){
  const stages=['全部',...['小学','初中','高中'].filter(s=>catalog.some(p=>p.stages?.includes(s)))];
  const subjects=availableSubjects(),symbols={'全部':'◈','物理':'Φ','化学':'H₂','数学':'π','生物':'◎','地理':'⌁','科学':'❋'};
  const counts=new Map();
  for(const p of catalog){
    if(!matchesOrigin(p,originFilter))continue;
    if(authorFilter&&String(p.creatorId)!==authorFilter)continue;
    if(stage!=='全部'&&!p.stages?.includes(stage))continue;
    const key=lessonSubject(p);counts.set(key,(counts.get(key)||0)+1);
  }
  const ranked=subjects.slice(1).map((name,index)=>({name,index}));
  ranked.sort((a,b)=>(counts.get(b.name)||0)-(counts.get(a.name)||0)||a.index-b.index);
  const picked=ranked.map(x=>x.name);
  const common=picked.slice(0,7);
  if(filter!=='全部'&&!common.includes(filter))common.unshift(filter);
  const extra=picked.filter(name=>!common.includes(name));
  const chip=s=>`<button type="button" data-action="filter" data-value="${esc(s)}" aria-pressed="${filter===s}"><span class="download-subject-symbol" aria-hidden="true">${symbols[s]||'◇'}</span><strong>${s==='全部'?'全部学科':esc(s)}</strong></button>`;
  /* The folded line names what is folded away — stage and subject. */
  const chosen=[
    stage==='全部'?'':'学段 '+stage,
    filter==='全部'?'':'学科 '+filter
  ].filter(Boolean).join(' · ');
  const summaryText=chosen||'全部学段 · 全部学科';
  const open=window.lqFiltersOpen===true;
  return `<section class="download-gallery-filters" data-collapsed="${open?'false':'true'}"><div class="download-gallery-toolbar"><label class="download-gallery-search"><span aria-hidden="true">⌕</span><input class="search" id="search" type="search" placeholder="搜索课件或知识点" aria-label="搜索课件或知识点" value="${esc(search)}"></label><button type="button" class="download-gallery-filters-toggle" data-lq-fold-toggle aria-expanded="${open?'true':'false'}"><span>筛选</span><small>${esc(summaryText)}</small></button><label class="download-sort">排序 <select id="course-sort" aria-label="课件排序"><option value="default" ${sortBy==='default'?'selected':''}>${search.trim()?'相关度':'目录顺序'}</option><option value="newest" ${sortBy==='newest'?'selected':''}>最近更新</option></select></label></div><div class="download-gallery-controls"><div class="download-stage-tabs" role="group" aria-label="按学段筛选">${stages.map(s=>`<button type="button" data-action="stage" data-value="${s}" aria-pressed="${stage===s}">${s==='全部'?'全部学段':s}</button>`).join('')}</div><div class="download-subject-options" role="group" aria-label="按学科筛选">${chip('全部')}${common.map(chip).join('')}</div>${extra.length?`<details class="download-subject-more" ${subjectsOpen?'open':''}><summary><span>更多学科</span><small>${extra.length}</small></summary><div class="download-subject-options" role="group" aria-label="更多学科筛选">${extra.map(chip).join('')}</div></details>`:''}</div></section>`;
}function curriculumChapters(){
 const fixed=(info.downloadMode&&editionFilter!=='standalone'?[]:info.curriculum?.chapters||[]).map(ch=>({...ch,subject:'物理',stage:'初中'}));
 let chapters=originFilter!=='教师课件'&&(stage==='全部'||stage==='初中')&&(filter==='全部'||filter==='物理')?[...fixed]:[];
 const derived=new Map();
 for(const p of catalog){if(info.downloadMode&&!matchesDownloadEdition(p,editionFilter))continue;if(!matchesOrigin(p,originFilter)||authorFilter&&String(p.creatorId)!==authorFilter)continue;if(stage!=='全部'&&!p.stages?.includes(stage))continue;const subject=stage!=='全部'?(p.stageSubjects?.[stage]||p.subject):p.subject;if(filter!=='全部'&&subject!==filter)continue;
  const mappings=p.taxonomy?.length?p.taxonomy:[{domain:subject,chapter:p.title,topics:p.features||[p.title]}];
  for(const item of mappings){const common=/初高中通用/.test(item.domain||''),senior=!common&&/高中|必修|选择性/.test(item.domain||'');if(stage==='高中'&&!senior&&!common||stage==='初中'&&senior)continue;if(subject==='物理'&&fixed.length&&!senior&&!common&&stage!=='高中')continue;const key=`${subject}|${item.domain}|${item.chapter}`;let chapter=derived.get(key);if(!chapter){chapter={id:'extra-'+key,domain:item.domain||subject,title:item.chapter||p.title,subject,topics:[]};derived.set(key,chapter);}
   for(const title of item.topics||[]){let topic=chapter.topics.find(t=>t.title===title);if(!topic){topic={id:'extra-'+key+'|'+title,title,courseIds:[],status:'available'};chapter.topics.push(topic);}if(!topic.courseIds.includes(p.id))topic.courseIds.push(p.id);}
  }
 }
 return chapters.concat([...derived.values()]);
}
function treeMarkup(){const chapters=curriculumChapters(),groups=new Map();for(const c of chapters){const key=`${c.subject} · ${c.domain}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
 return `<details class="curriculum-panel" ${matchMedia('(min-width:901px)').matches?'open':''}><summary class="curriculum-mobile-toggle"><span>章节目录</span><span aria-hidden="true">⌄</span></summary><div class="curriculum-body"><div class="curriculum-title"><h2>章节目录</h2><button class="text-button" data-action="clear-chapter">全部课件</button></div>${[...groups.entries()].map(([name,list],index)=>`<details class="curriculum-volume" ${(index===0||list.some(c=>c.id===chapterFilter))?'open':''}><summary>${esc(name)}</summary><div class="curriculum-chapters">${list.map(ch=>{const ids=[...new Set(ch.topics.flatMap(t=>t.courseIds||[]))];return `<button class="curriculum-chapter-button ${ch.id===chapterFilter?'selected':''}" data-action="chapter" data-value="${esc(ch.id)}" aria-pressed="${ch.id===chapterFilter}"><span>${esc(ch.title)}</span><small>${ids.length?ids.length:'暂无'}</small></button>`;}).join('')}</div></details>`).join('')||'<p class="subtle">本学科暂无章节目录。</p>'}</div></details>`;
}
function renderTree(){
 const host=$('#curriculum');if(!host)return;
 const scroll=host.querySelector('.curriculum-body')?.scrollTop||0;
 const volumes=new Map([...host.querySelectorAll('.curriculum-volume')].map(v=>[v.querySelector('summary')?.textContent.trim(),v.open]));
 host.innerHTML=treeMarkup();
 for(const volume of host.querySelectorAll('.curriculum-volume')){
  const name=volume.querySelector('summary')?.textContent.trim();
  if(volumes.has(name))volume.open=volumes.get(name)||!!volume.querySelector('.selected');
 }
 const body=host.querySelector('.curriculum-body');if(body)body.scrollTop=scroll;
}
function selectedKnowledge(){if(!chapterFilter)return null;const chapter=curriculumChapters().find(c=>c.id===chapterFilter);if(!chapter)return null;const ids=[...new Set(chapter.topics.flatMap(t=>t.courseIds||[]))];return{ids,title:chapter.title,domain:chapter.domain,empty:!ids.length};}
function chapterCourse(p){
 if(info.downloadMode)return downloadUI.card(p);
 const modules=p.modules?.length?p.modules:(p.features||[]).map(title=>({title,description:''}));
 const moduleMarkup=m=>`<section class="chapter-course-module"><h5>${esc(m.title)}</h5>${m.description?`<p>${richText(m.description)}</p>`:''}${m.operation?`<p class="module-operation">${esc(m.operation)}</p>`:''}</section>`;
 const visibleModules=modules.length>8?modules.slice(0,6):modules;
 return `<article class="chapter-course" data-product-id="${esc(p.id)}"><header class="chapter-course-heading"><div class="chapter-course-meta"><span>${esc(stageLabel(p))} · ${esc(p.subject)}</span><span class="${p.mode==='paid'?'paid-label':''}">${priceText(p)}</span></div><h3>${esc(p.title)}</h3></header>${operationGuide(p,{heading:'h4',compact:true})}<button class="chapter-course-cover" data-action="detail" data-id="${esc(p.id)}" aria-label="查看${esc(p.title)}的介绍"><img src="${esc(p.cover||'/images/community-cover.svg')}" alt="${esc(coverAlt(p))}" loading="lazy" decoding="async" width="720" height="390"></button><div class="chapter-course-body"><p class="chapter-course-description">${richText(p.description)}</p><div class="chapter-course-actions">${showCatalogUse(p)?`<button class="button" data-action="trial" data-id="${esc(p.id)}">在线使用 ↗</button>`:`<button class="button" ${p.canPurchase?`data-action="detail" data-id="${esc(p.id)}"`:'disabled'}>${p.canPurchase?catalogBuyText(p):'本地已收录'}</button>`}<button class="button secondary" data-action="detail" data-id="${esc(p.id)}">介绍</button></div>${showCatalogUse(p)?pptMarkup(p.id):''}</div>${modules.length?`<section class="chapter-course-content"><h4>包含内容</h4><div class="chapter-course-modules">${visibleModules.map(moduleMarkup).join('')}</div>${modules.length>8?`<details class="chapter-course-more"><summary>其他 ${modules.length-visibleModules.length} 项内容</summary><div class="chapter-course-modules">${modules.slice(visibleModules.length).map(moduleMarkup).join('')}</div></details>`:''}</section>`:''}</article>`;
}
function renderGrid(fresh=true){
 if(!$('#grid'))return;if(fresh)gridShown=GRID_BATCH;const knowledge=originFilter==='教师课件'?null:selectedKnowledge();
 const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,author:authorFilter,query:search,sortBy,courseIds:knowledge?.ids||null});
 // browseCatalog applies the same free-first, integrated-first order to every listing.
 const defaultSort=$('#course-sort option[value="default"]');if(defaultSort)defaultSort.textContent=search.trim()?'相关度':'目录顺序';
 const result=$('#result-count');if(knowledge)result.innerHTML=`<div class="chapter-results-heading"><div class="chapter-results-title"><p class="eyebrow">本章课件</p><h2>${esc(knowledge.title)}</h2></div><span class="chapter-results-count">${shown.length} 份课件</span></div>`;else result.textContent=`${shown.length} 份课件`;
 const reset=$('#catalog-reset');if(reset)reset.hidden=!(knowledge||search||authorFilter||stage!=='全部'||filter!=='全部'||(activePage!=='teachers'&&originFilter!=='全部'));
 $('#grid').classList.toggle('chapter-grid',!!knowledge);$('#grid').innerHTML=shown.length?shown.slice(0,gridShown).map(knowledge?chapterCourse:card).join('')+(shown.length>gridShown?`<button class="catalog-more" type="button" data-action="catalog-more">继续加载 · 还有 ${shown.length-gridShown} 份课件</button>`:''):`<div class="empty"><span class="empty-graphic" aria-hidden="true">○</span><h3>${knowledge?.empty?'本章暂无课件':originFilter==='教师课件'&&!catalog.some(isTeacherCourse)?'暂无已上架的教师课件':'没有符合条件的课件'}</h3>${originFilter==='教师课件'&&!catalog.some(isTeacherCourse)?'<p>教师作品审核通过后，会出现在这里。</p><a class="button secondary" href="#creator">发布课件</a>':'<button class="button secondary" data-action="clear-filters">清除筛选</button>'}</div>`;observeReveals();
}
function works(){
 const home=activePage==='works'&&!info.downloadMode,teacher=originFilter==='教师课件';$('#main').className=home?'home-page':teacher?'catalog-page':'catalog-page catalog-with-directory';
 if(home){$('#main').replaceChildren();return;}
 if(info.downloadMode&&!teacher){
  $('#main').classList.add('download-gallery');
  $('#main').innerHTML=`<section class="catalog-section download-gallery-section" id="course-catalog" aria-label="课件目录"><div class="download-gallery-heading"><h1>课件库</h1><span>${catalog.filter(p=>matchesOrigin(p,originFilter)).length} 份课件</span></div>${downloadUI.editionTabs(browseCatalog(catalog,{origin:originFilter,stage,subject:filter}),editionFilter)}${downloadGalleryFilters()}<div class="download-gallery-layout"><aside id="curriculum" aria-label="章节目录">${treeMarkup()}</aside><div class="catalog-products"><div class="catalog-result-row"><div class="result-count" id="result-count" aria-live="polite"></div><button class="text-button" id="catalog-reset" data-action="clear-filters" hidden>清除筛选</button></div><div class="grid" id="grid"></div></div></div></section>`;
  
  renderGrid();observeReveals();return;
 }
 $('#main').innerHTML=`<section class="catalog-section ${teacher?'teacher-catalog':''}" id="course-catalog" aria-label="${teacher?'教师课件检索':'课件目录'}"><div class="section-top catalog-page-heading"><div><h1>${teacher?'教师课件':'课件库'}</h1>${teacher?'<p class="subtle">按学段、学科、作者与知识点查找</p>':''}</div>${teacher?'<a class="button secondary small" href="#catalog">全部课件</a>':''}</div>${filtersMarkup()}<div class="catalog-layout ${teacher?'teacher-catalog-layout':''}">${teacher?'':`<aside id="curriculum" aria-label="章节目录">${treeMarkup()}</aside>`}<div class="catalog-products"><div class="catalog-result-row"><div class="result-count" id="result-count" aria-live="polite"></div><button class="text-button" id="catalog-reset" data-action="clear-filters" hidden>清除筛选</button></div><div class="grid" id="grid"></div></div></div></section>`;
 if(!teacher){
  const section=$('#course-catalog'),browser=document.createElement('div');
  browser.className='catalog-browser';
  for(const element of [...section.children].slice(1))browser.appendChild(element);
  section.appendChild(browser);
  browser.classList.toggle('has-bundle-offers',!!browser.querySelector('.catalog-bundle-grid'));
  const panel=browser.querySelector('.catalog-panel');
  panel?.classList.toggle('has-catalog-authors',!!panel.querySelector('.author-filter-row')&&courseAuthors(catalog).length>0);
 }
 const filters=$('#main .catalog-panel');if(filters){const box=document.createElement('details');box.id='mobile-catalog-filters';box.open=matchMedia('(min-width:901px)').matches;box.innerHTML='<summary>筛选与搜索</summary>';filters.before(box);box.append(filters);}
 renderGrid();observeReveals();
}

let revealObserver;
function observeReveals(){revealObserver?.disconnect();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const elements=document.querySelectorAll('.reveal');if(reduced||!('IntersectionObserver' in window)){elements.forEach(e=>e.classList.add('revealed'));return;}revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target);}}),{threshold:.08});elements.forEach(e=>revealObserver.observe(e));}
function browseCourses(){if(!$('#course-catalog')){location.hash='works';return;}$('#course-catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}
window.addEventListener('scroll',()=>document.body.classList.toggle('has-scrolled',scrollY>20),{passive:true});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('motion-paused',document.hidden));
document.addEventListener('change',e=>{if(e.target.id==='course-sort'){sortBy=e.target.value;renderGrid();}else if(e.target.id==='course-author'){authorFilter=e.target.value;chapterFilter='';if(authorFilter)originFilter='教师课件';if(!availableSubjects().includes(filter))filter='全部';if(authorFilter&&location.hash!=='#teachers')location.hash='teachers';else works();}});
const catalogViewport=matchMedia('(min-width:901px)');
const syncCatalogViewport=()=>{const panel=$('#curriculum .curriculum-panel');if(panel)panel.open=catalogViewport.matches;const filters=$('#mobile-catalog-filters');if(filters)filters.open=catalogViewport.matches;};
if(catalogViewport.addEventListener)catalogViewport.addEventListener('change',syncCatalogViewport);else catalogViewport.addListener(syncCatalogViewport);

function introPage(id){if(info.courseReplacements?.[id]&&product(id)?.edition!=='integrated'){splitCoursePage(id);return;}const p=product(id);if(!p){$('#main').innerHTML='<div class="empty"><h1>未找到这个课件</h1><a class="button" href="#catalog">返回课件目录</a></div>';return;}downloadUI.detail(p);}
function splitCoursePage(id){
 const replaced=info.courseReplacements?.[id];
 if(!replaced)return;
 const items=replaced.productIds.map(product).filter(p=>p&&!p.retired);
 document.title='选择课件 · 乐启享';
 $('#main').className='';
 $('#main').innerHTML=`<section class="course-intro"><a class="intro-back" href="#catalog">← 课件目录</a><div class="course-heading"><h1>选择课件</h1><p class="subtle">此入口已拆分为以下独立课件，每一份都可以在线使用或下载。</p></div><div class="library-course-grid">${items.map(p=>`<article class="library-course-card"><a class="library-card-cover" href="#course/${esc(p.id)}"><img src="${esc(p.cover||'/images/community-cover.svg')}" alt="${esc(p.title)}" loading="lazy" width="720" height="390"></a><div class="library-card-body"><h2><a href="#course/${esc(p.id)}">${esc(p.title)}</a></h2><p>${richText(p.description)}</p><div class="library-card-actions">${p.accessible?`<button class="button small" data-action="trial" data-id="${esc(p.id)}">在线使用 ↗</button>`:`<a class="button secondary small" href="#course/${esc(p.id)}">查看课件</a>`}</div>${p.accessible?pptMarkup(p.id):''}</div></article>`).join('')}</div></section>`;
}


async function auth(){toast('本地版无需登录，课件可直接在线使用或下载。');}




async function account(){about();}

async function admin(){history.replaceState(null,'','#catalog');works();}
const policies={
  guide:['使用帮助','<p>在课件库按学段、学科与章节选择课件，打开详情页即可在线预览，或直接下载到本机。</p><p>在线预览与下载都不需要账号，也不需要付费：课件文件已经收在这台机器上，看和拿都是免费的。</p><p>下载得到的就是课件本身（HTML，或打包好的 ZIP），双击即可在浏览器里打开，也可以在没有网络的教学电脑上使用。</p><p>预览时如果画面是空的，多半是课件还在加载，等一会儿或刷新一次即可。</p>'],
  privacy:['隐私说明','<p>这是一个本地应用：课件、封面与说明文件都保存在你自己的电脑上，不会上传到任何服务器。</p><p>课件库没有账号、没有手机号，也没有订单，因此不会收集姓名、学校、联系方式或设备信息。</p><p>页面里没有广告追踪，也没有第三方统计。浏览器自己留下的本地存储（例如已下载记录）只保存在本机。</p>'],
  terms:['使用说明','<p>课件仅供课堂教学与个人学习使用，请勿公开传播、转售，或用于对外的商业培训分发。</p><p>课件正文保留原作者的署名与许可协议，说明见「许可与署名」页面。</p><p>本课件库不对课件内容作担保；如发现内容有误，或与许可要求不符，请以原作者的说明为准。</p>']};
function policyBody(name){return policies[name][1];}function policy(name){const title=policies[name][0],body=policyBody(name);modal(`<div class="dialog-content policy"><h2>${title}</h2>${body}${info.seller?`<p>经营主体：${esc(info.seller)}</p>`:''}${info.support?`<p>联系邮箱：${esc(info.support)}</p>`:''}</div>`);}
function about(){modal('<div class="dialog-content"><div class="profile"><img src="/brand/brand-mark.png" alt="乐启享机器人 Logo" width="56" height="56"><div><p class="eyebrow">关于我们</p><h2>乐启享机器人</h2></div></div><p>乐启享机器人专注 3-16 岁少儿科技素养教育，以工程实践与项目制学习，让孩子在搭建、调试、协作、展示中真正学会创造。</p><p class="subtle">从乐高启蒙 到 AI 创造</p><p><a class="button secondary small" href="https://codebn.cn/" target="_blank" rel="noreferrer">官网 codebn.cn ↗</a></p></div>');}
async function refreshCatalog(){info=await api('/api/catalog');syncPromotionClock(info.serverTime);catalog=info.products;downloadBulk.invalidate();legalFooter();}
async function route(){const serial=++routeSerial;let [page,id]=(location.hash.slice(1)||'works').split('/');if(page==='purchase'&&id){history.replaceState(null,'','#course/'+id);page='course';}else if(page==='purchase'){history.replaceState(null,'','#catalog');page='catalog';id='';}else if(['unlocked','purchases','admin','moderation','creator','owner-login','refunds','refund-admin','feedback-admin','account-safety','bulk-download-admin','teachers'].includes(page)){history.replaceState(null,'','#catalog');page='catalog';id='';}document.body.classList.toggle('download-mode',info.downloadMode===true);
 if(info.downloadMode&&['purchase','bundle','play','classroom','unlocked'].includes(page)&&!(['play','classroom'].includes(page)&&id&&product(id)?.onlineAccessible)){
   showHome(false);stopTrial();document.body.dataset.page=page;$('#main').className='';
   if(page==='purchase'){downloadUI.purchase(id);return;}
   if(page==='unlocked'){history.replaceState(null,'','#purchases');return downloadUI.library();}
   if(['play','classroom'].includes(page)&&id){history.replaceState(null,'','#course/'+id);introPage(id);return;}
   if(page==='bundle'){if(id){const scope=info.downloadScopes.find(s=>s.id===id);stage=scope?.stage||'全部';filter=scope?.subject||'全部';}history.replaceState(null,'','#catalog');page='catalog';id='';}
 }

 if(['downloads','free','paid'].includes(page)){page='catalog';history.replaceState(null,'','#catalog');}
 if(page==='membership'){page='bundle';id='physics-complete';history.replaceState(null,'','#bundle/physics-complete');}
 courseNavigation.restore(location.hash);
 if(page==='works'&&!restoringBrowse||page==='catalog'&&originFilter==='教师课件'){originFilter=stage=filter='全部';authorFilter=search=chapterFilter='';sortBy='default';editionFilter='all';}
 if(page==='teachers'){originFilter='教师课件';chapterFilter='';}
 activePage=['works','catalog','teachers','creator','purchases','bundle','admin','moderation','feedback-admin','account-safety','refunds','refund-admin','bulk-download-admin'].includes(page)?page:'works';document.body.dataset.page=page;showHome(!info.downloadMode&&activePage==='works'&&!['play','classroom','course'].includes(page));
 try{if((page==='play'||page==='classroom')&&id){await openLesson(id,serial);return;}stopTrial();$('#main').className='';if(page==='classroom'){location.hash='catalog';return;}
 if(page==='owner-login'){if(user?.role==='owner'){history.replaceState(null,'','#admin');return route();}works();await auth('owner');return;}
 if(page==='course'){await resolveLibraryProduct(id);if(serial!==routeSerial)return;introPage(id);}else works();
 if(serial!==routeSerial)return;document.querySelectorAll('.header .nav-link,.header .publish-link').forEach(a=>{if(a.hash==='#'+(page==='course'?'catalog':activePage))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});restoreBrowseDOM();restoreScroll(courseNavigation.takePosition(location.hash));
 }catch(e){if(serial!==routeSerial)return;stopTrial();$('#main').innerHTML=`<div class="empty"><h3>暂时没有打开</h3><p>${esc(e.message)}</p><button class="button" data-action="reload">重新加载</button></div>`;}}
document.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;renderGrid();}});

document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const {action,id,value,channel}=b.dataset;try{
if(action==='browse-courses'){browseCourses();}else if(action==='origin-filter'){originFilter=value;authorFilter=chapterFilter='';if(!availableSubjects().includes(filter))filter='全部';const target=value==='教师课件'?'teachers':'catalog';if(location.hash==='#'+target)works();else location.hash=target;}else if(action==='author-filter'){authorFilter=String(value);originFilter='教师课件';stage=filter='全部';search=chapterFilter='';if(location.hash==='#teachers')works();else location.hash='teachers';}else if(action==='intro-section'){document.getElementById(value)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}else if(action==='close')close();else if(action==='detail')detail(id);else if(action==='trial')trial(id);
else if(action==='stage'||action==='filter'){if(action==='stage'){stage=value;filter='全部';}else filter=value;chapterFilter='';works();}
else if(action==='download-edition'){editionFilter=validDownloadEdition(value);chapterFilter='';works();}
else if(action==='chapter'){chapterFilter=value;renderTree();renderGrid();if(matchMedia('(max-width:900px)').matches)$('#curriculum details').open=false;$('.catalog-products')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}
else if(action==='clear-chapter'){chapterFilter='';renderTree();renderGrid();}
else if(action==='catalog-more'){gridShown+=GRID_BATCH;renderGrid(false);}
else if(action==='clear-filters'){stage=filter='全部';originFilter=activePage==='teachers'?'教师课件':'全部';search=chapterFilter=authorFilter='';works();}
else if(action==='course-return'){close();await courseNavigation.returnTo(currentLesson||id,!!currentLesson);}
else if(action==='takeover'){close();await openLesson(id,++routeSerial,true);}
else if(action==='reconnect-classroom'){const id=currentLesson;if(!id)return;b.disabled=true;try{const renewed=await renewLease();if(renewed&&id===currentLesson){stopTrial();await openLesson(id,++routeSerial);}else if(id===currentLesson)toast('尚未恢复连接，请检查网络后重试');}finally{if(b.isConnected)b.disabled=false;}}
else if(action==='restart'){const p=currentLesson;if(p){stopTrial();await openLesson(p,++routeSerial);}}
else if(action==='hide-toolbar'){$('#classroom').classList.add('toolbar-hidden');$('#show-toolbar').hidden=false;}
else if(action==='show-toolbar'){$('#classroom').classList.remove('toolbar-hidden');$('#show-toolbar').hidden=true;}
else if(action==='fullscreen'){if(document.fullscreenElement)await document.exitFullscreen();else if($('#classroom').requestFullscreen)await $('#classroom').requestFullscreen().catch(()=>toast('请横屏使用；此浏览器未开放全屏功能'));else toast('请横屏使用，浏览器会自动调整观察空间');}
else if(action==='classroom-help')classroomHelp();
else if(action==='dismiss-orientation'){$('#orientation-hint').hidden=true;try{sessionStorage.setItem('orientation-hint','1');}catch{}}
else if(action==='account')account();
else if(action==='business')modal(`<div class="dialog-content"><h2>经营信息</h2><p>${esc(info.seller)}</p>${info.creditCode?`<p class="subtle">统一社会信用代码：${esc(info.creditCode)}</p>`:''}${info.support?`<p>联系邮箱：${esc(info.support)}</p>`:''}</div>`);else if(action==='about')about();else if(policies[action])policy(action);
else if(action==='ppt-link')courseTools.open(id);
else if(action==='copy-ppt-link')await courseTools.copy(id);
else if(action==='reload'){await refreshCatalog();route();}
}catch(error){toast(error.message);}});
document.addEventListener('submit',e=>{e.preventDefault();});
$('#dialog').addEventListener('close',()=>{authSerial++;phone.cancel();clearInterval(timer);timer=null;});
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#works"]');if(a&&(!location.hash||location.hash==='#works')){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}});
window.addEventListener('hashchange',()=>{close();route();});

window.addEventListener('message',e=>{
 if(e.data?.type!=='leqixiang:content-guard'||e.data.version!==1||e.data.state!=='return'||e.data.reason!=='user-request')return;
 const classroomFrame=$('#lesson-frame iframe'),previewFrame=$('.creator-preview iframe');
 if((classroomFrame&&e.source===classroomFrame.contentWindow)||(previewFrame&&e.source===previewFrame.contentWindow)){
  if(classroomFrame&&e.source===classroomFrame.contentWindow){const id=currentLesson;close();courseNavigation.returnTo(id,true);}else{stopTrial();close();location.hash='catalog';}
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#dialog').open&&!$('#classroom').hidden&&!document.fullscreenElement){$('#classroom').classList.remove('toolbar-hidden');$('#show-toolbar').hidden=true;}});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState!=='visible'||!currentLesson)return;renewLease();const id=currentLesson;try{const access=await api(`/api/access/${id}`);if(id===currentLesson&&!access.accessible){stopTrial();toast('使用权限已更新，请重新打开课件');await refreshCatalog();location.hash='#catalog';}}catch{}});
startPromotionCountdowns({onExpire:async()=>{await refreshCatalog();if(info.downloadMode)await downloadUI.refreshPricing();if(!currentLesson&&!$('#dialog').open)await route();}});
try{const results=await Promise.all([api('/api/catalog'),api('/api/session')]);info=results[0];syncPromotionClock(info.serverTime);catalog=info.products;user=results[1].user;await phone.refresh();accountLabel();legalFooter();await route();}catch(e){$('#main').innerHTML='<div class="empty"><h3>暂时无法连接课件网站</h3><p>请检查连接后重新加载。</p><button class="button" data-action="reload">重新加载</button></div>';}

/* The disclosures keep their state across the re-render. */
document.addEventListener('toggle',e=>{const el=e.target;if(!el||!el.classList)return;if(el.classList.contains('download-subject-more'))subjectsOpen=el.open;},true);
