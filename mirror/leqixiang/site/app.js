import {createDownloadUI,matchesDownloadEdition,validDownloadEdition} from './download-store.js?v=lq-20261115';
import {createCourseTools,pptMarkup,requiresPptLogin,purchaseNotice} from './course-tools.js?v=ppt-refund-20261020';
const promotionNow=()=>Date.now();const syncPromotionClock=()=>{};const startPromotionCountdowns=()=>{};
const organizeLibrary=()=>[];
const mountPurchaseLibrary=()=>{};
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
let authSerial=0,pendingPurchase=null;
let catalog=[],info={},user=null,filter='全部',stage='全部',search='',timer=null,toastTimer=null,authMode='login',currentLesson=null,routeSerial=0,frameTimer=null,activePage='works',originFilter='全部',sortBy='default',priceFilter='全部',authorFilter='',subjectsOpen=false;
const store={bundle:()=>null,courseBundles:()=>[],bundleSummary:()=>'',purchaseOptions:()=>[],bundlePricing:()=>'',bundlesPage:()=>{history.replaceState(null,'','#catalog');},feedbackAdmin:()=>{}};
const courseTools=createCourseTools({modal,toast,getProduct:id=>product(id),origin:location.origin});
const refundUI={orderMarkup:()=>'',loginMarkup:()=>'',adminPageMarkup:()=>'',customerMarkup:()=>'',adminMarkup:()=>'',open:async()=>{},review:()=>{},submit:async()=>{}};
const downloadUI=createDownloadUI({api,esc,money:n=>money(n),getInfo:()=>info,getUser:()=>user,product:id=>product(id),main:()=>$('#main'),modal,close,toast,login:id=>{pendingPurchase=id||null;auth();},refresh:refreshCatalog,showPayment,refundUI});
const downloadBulk={mount:()=>{},invalidate:()=>{}};
const downloadBulkAdmin={render:async()=>{}};
const accountSafety={render:async()=>{}};
const phone={cancel:()=>{},phoneMasked:()=>'',refresh:async()=>{},open:async()=>{toast('本地版无需登录，课件可直接在线使用或下载。');}};
const courseNavigation=createCourseNavigation({location,history,getBundles:()=>info.bundles||[],getScrollY:()=>window.scrollY,getViewState:captureBrowseView,restoreViewState:restoreBrowseView,render:()=>route()});
const updateAnnouncement={show:async()=>{}};
let chapterFilter='',editionFilter='all',lease=null,heartbeatTimer=null,heartbeatPromise=null,leaseDeadlineTimer=null,leaseExpired=false;

let restoringBrowse=null,lockedScroll=null;
function captureBrowseView(){return {filter,stage,search,originFilter,sortBy,priceFilter,authorFilter,chapterFilter,editionFilter,bundleChapter:document.querySelector('[data-bundle-chapter][aria-pressed="true"]')?.dataset.bundleChapter||'',libraryChapter:document.querySelector('[data-library-chapter][aria-pressed="true"]')?.dataset.libraryChapter||'',details:[...document.querySelectorAll('#main details')].map(d=>({key:d.querySelector('summary')?.textContent.trim(),open:d.open})),directory:[...document.querySelectorAll('.curriculum-body,.library-directory-body')].map(d=>d.scrollTop)};}
function restoreBrowseView(v){restoringBrowse=v;if(!v||typeof v!=='object')return;filter=v.filter||'全部';stage=v.stage||'全部';search=v.search||'';originFilter=v.originFilter||'全部';sortBy=v.sortBy||'default';priceFilter=v.priceFilter||'全部';authorFilter=v.authorFilter||'';chapterFilter=v.chapterFilter||'';editionFilter=validDownloadEdition(v.editionFilter);}
function restoreBrowseDOM(){const v=restoringBrowse;restoringBrowse=null;if(!v)return;for(const d of document.querySelectorAll('#main details')){const saved=v.details?.find(item=>item.key===d.querySelector('summary')?.textContent.trim());if(saved)d.open=!!saved.open;}[...document.querySelectorAll('.curriculum-body,.library-directory-body')].forEach((d,i)=>{d.scrollTop=v.directory?.[i]||0;});}
function restoreScroll(top){const style=document.documentElement.style,previous=style.scrollBehavior;style.scrollBehavior='auto';window.scrollTo({top,behavior:'auto'});style.scrollBehavior=previous;}
function lockClassroomScroll(){if(lockedScroll!==null)return;lockedScroll=window.scrollY;document.body.style.position='fixed';document.body.style.top=-lockedScroll+'px';document.body.style.width='100%';document.body.style.overflow='hidden';}
function unlockClassroomScroll(){if(lockedScroll===null)return;const y=lockedScroll;lockedScroll=null;for(const key of ['position','top','width','overflow'])document.body.style[key]='';restoreScroll(y);}
// Plain links from package cards and the purchased library use the same history
// path as buttons. Modified clicks still open independent tabs normally.
document.addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const a=e.target.closest('a[href]');if(!a||a.dataset.action||a.target==='_blank'||a.hasAttribute('download'))return;const m=/^#(course|play|classroom)\/([a-z0-9-]+)$/.exec(a.getAttribute('href'));if(!m)return;e.preventDefault();courseNavigation.navigate(m[1],m[2]);});

const newTabId=()=>{if(globalThis.crypto?.randomUUID)return crypto.randomUUID();if(globalThis.crypto?.getRandomValues)return [...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);};
const tabIdentity={id:newTabId(),ready:Promise.resolve(newTabId())};
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
 if(check.pending)check.pending.then(()=>{if(frame.isConnected&&check.revoked)frame.contentWindow.postMessage({type:'xiaobai:classroom-access',version:1,courseId,deliveryId:event.data.deliveryId,requestId:event.data.requestId,state:'blocked',ttlMs:0},'*');});
 reply();
}
window.addEventListener('message',event=>{
 if(event.data?.type!=='xiaobai:classroom-access')return;
 const frame=$('#lesson-frame iframe'),time=Date.now();
 if(isClassroomRequest(event,frame,currentLesson)){
  if(lease)classroomReply(event,{frame,courseId:currentLesson,expiresAt:lease.expiresAt,active:!leaseExpired&&!$('#classroom').hidden,now:time});
  else if(currentLesson&&!$('#classroom').hidden)replyViewer(event,frame,currentLesson,'classroom');return;
 }
 const preview=$('.creator-preview iframe');if(!preview||!user)return;
 const match=/^\/creator-preview\/(teacher-[a-z0-9]+)$/.exec(new URL(preview.src,location.href).pathname);if(!match)return;
 replyViewer(event,preview,match[1],'preview');
});
const money=n=>n?`¥${(n/100).toFixed(2).replace(/\.?0+$/,'')}`:'价格待公布';
let libraryProducts=[];
const product=id=>catalog.find(p=>p.id===id)||libraryProducts.find(p=>p.id===id)||(info.courseReplacements?.[id]?{id,title:info.courseReplacements[id].title,retired:true}:null);
async function resolveLibraryProduct(id){if(!product(id)&&user){libraryProducts=(await api('/api/library')).products||[];}return product(id);}
const showCatalogUse=p=>p.accessible===true||p.mode==='free';
const freePeriodText=p=>`限时免费至 ${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(p.timedFree.endsAt))}（北京时间），到期结束免费访问。`;
const priceText=p=>info.downloadMode?(p.mode==='free'?'免费下载':p.canDownload?'可下载':'下载资源'):p.timedFree?.active?'限时免费':p.mode==='preview'&&!p.accessible&&!p.owned?'暂未开放':p.mode==='free'?'免费':p.owned?'已解锁':store.courseBundles(p).length?'课件包内':'暂未开放授权';
const catalogBuyText=p=>info.downloadMode?'下载资源':p.mode==='preview'&&!p.accessible&&!p.owned?'暂未开放':store.courseBundles(p).length?'查看所属课件包':'暂未开放授权';
const size=n=>`${(n/1024/1024).toFixed(1)} MB`;
const statusLabel={pending:'等待付款',paid:'已购买',expired:'已过期',refunded:'已退款',payment_review:'已收款 · 待人工处理'};
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
 if(requiresPptLogin(location,user)){stopTrial();introPage(id);await auth();return;}
 const access=await api(`/api/access/${encodeURIComponent(id)}`);if(serial!==routeSerial)return;Object.assign(p,access);
 if(!(info.downloadMode?access.onlineAccessible:access.accessible)){stopTrial();if(!user){auth();return;}detail(id);return;}
 stopTrial();let launch;
 try{launch=await api(`/api/launch/${encodeURIComponent(id)}`,{tabId,...(takeover?{takeover:true}:{})});}catch(error){if(serial!==routeSerial)return;if(error.code==='CLASSROOM_IN_USE'){introPage(id);classroomOccupied(id);return;}if(error.code==='PHONE_VERIFICATION_REQUIRED'){introPage(id);await phone.open('safety',{target:{id,takeover}});return;}if(error.code==='PHONE_BINDING_REQUIRED'){introPage(id);await phone.open('bind');return;}throw error;}
 if(serial!==routeSerial){if(launch.lease)fetch('/api/classroom/release',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'studio'},body:JSON.stringify({tabId,leaseToken:launch.lease.token}),keepalive:true}).catch(()=>{});return;}
 lease=launch.lease||null;leaseExpired=false;if(lease){armLeaseDeadline();heartbeatTimer=setInterval(renewLease,Math.max(15,Number(lease.heartbeatSeconds)||45)*1000);}
 currentLesson=id;document.title=`${p.title} · 乐启享`;$('#classroom').hidden=false;lockClassroomScroll();document.body.classList.add('classroom-active');const back=courseNavigation.target(id,true);$('#player-back').href=back.href;$('#player-back').textContent='← '+back.label;$('#player-back').dataset.action='course-return';$('#lesson-loading').hidden=false;$('#lesson-loading').classList.remove('error-state');$('#lesson-loading').textContent='正在打开课件…';
 const frame=document.createElement('iframe');frame.title=`${p.title}在线课件`;frame.setAttribute('sandbox','allow-scripts allow-forms allow-pointer-lock allow-downloads'+(launch.allowSameOrigin===true?' allow-same-origin':''));frame.setAttribute('allow','autoplay; fullscreen');frame.allowFullscreen=true;
 const plain=/^afe-/.test(id);attachCoursewareDelivery({frame,courseId:id,seriesId:p.splitFrom||id,launch,plain,stillActive:()=>currentLesson===id&&serial===routeSerial&&!leaseExpired,
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
function card(p){if(info.downloadMode)return downloadUI.card(p);return `<article class="product-card reveal"><button class="cover" data-action="detail" data-id="${esc(p.id)}" aria-label="查看${esc(p.title)}"><img src="${esc(p.cover||'/images/community-cover.svg')}" alt="${esc(coverAlt(p))}" loading="lazy" decoding="async" width="720" height="390"><span class="cover-badge">${esc(lessonSubject(p))}</span><span class="cover-arrow" aria-hidden="true">↗</span></button><div class="card-body"><div class="card-meta"><span>${esc(stageLabel(p))}</span><span class="${p.mode==='paid'?'paid-label':''}">${priceText(p)}</span></div><button class="card-title" data-action="detail" data-id="${esc(p.id)}"><h3>${esc(p.title)}</h3></button><p class="card-description">${esc(p.description)}</p><div class="card-community">${authorMarkup(p)}</div><div class="card-actions">${showCatalogUse(p)?`<button class="button" data-action="trial" data-id="${esc(p.id)}">在线使用 ↗</button><button class="button secondary" data-action="detail" data-id="${esc(p.id)}">查看介绍</button>`:`<button class="button" data-action="detail" data-id="${esc(p.id)}">查看介绍 ↗</button><span class="card-sale-status">${catalogBuyText(p)}</span>`}</div>${showCatalogUse(p)?pptMarkup(p.id):''}</div></article>`;}
function availableSubjects(){return ['全部',...new Set(catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter)).filter(p=>true).filter(p=>stage==='全部'||p.stages?.includes(stage)).map(lessonSubject))];}
function filtersMarkup(){
 const authors=courseAuthors(catalog),teacher=originFilter==='教师课件';
 const authorOptions=authors.map(a=>{const sameName=authors.filter(x=>x.name===a.name).length>1;return `<option value="${esc(a.id)}" ${authorFilter===a.id?'selected':''}>${esc(a.name)} · ${a.count} 份${sameName?' · '+esc(a.firstTitle):''}</option>`;}).join('');
 return `<div class="catalog-panel teacher-search-panel"><div class="filter-row"><span class="filter-label">来源</span><div class="filters" role="group" aria-label="按课件来源筛选">${['全部','官方课件','教师课件'].map(x=>`<button class="filter ${originFilter===x?'active':''}" data-action="origin-filter" data-value="${x}" aria-pressed="${originFilter===x}">${x}</button>`).join('')}</div></div><div class="filter-row"><span class="filter-label">学段</span><div class="filters" role="group" aria-label="按学段筛选">${['全部','小学','初中','高中'].map(x=>`<button class="filter ${stage===x?'active':''}" data-action="stage" data-value="${x}" aria-pressed="${stage===x}">${x}</button>`).join('')}</div><label class="search-wrap"><span aria-hidden="true">⌕</span><input class="search" id="search" type="search" placeholder="课件、知识点或作者" aria-label="搜索课件、知识点或作者" aria-describedby="search-hint" value="${esc(search)}"></label></div><div class="filter-row"><span class="filter-label">学科</span><div id="subject-filters" class="filters" role="group" aria-label="按学科筛选">${subjectMarkup()}</div></div>${originFilter!=='官方课件'?`<div class="filter-row author-filter-row"><span class="filter-label">作者</span><label class="catalog-author-select"><span class="sr-only">按作者筛选</span><select id="course-author" aria-label="按作者筛选" ${!authors.length?'disabled':''}><option value="">全部作者</option>${authorOptions}</select></label>${teacher?'<span class="catalog-filter-note">点击课件上的作者，可查看该作者的全部作品。</span>':''}</div>`:''}<div class="filter-row"><span class="filter-label">使用</span><div class="filters" role="group" aria-label="按使用方式筛选">${['全部','免费','付费'].map(x=>`<button class="filter ${priceFilter===x?'active':''}" data-action="price-filter" data-value="${x}" aria-pressed="${priceFilter===x}">${x}</button>`).join('')}</div><label class="sort-label">排序 <select id="course-sort" aria-label="课件排序"><option value="default" ${sortBy==='default'?'selected':''}>${search.trim()?'相关度':'目录顺序'}</option><option value="newest" ${sortBy==='newest'?'selected':''}>最近更新</option></select></label></div><p id="search-hint" class="catalog-search-hint">多个关键词用空格分开，可组合查找课件、知识点、学科和作者。</p></div>`;
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
  const subjects=availableSubjects(),symbols={'全部':'◈','物理':'Φ','化学':'H₂','数学':'π','生物':'◎','地理':'⌁'};
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
 const moduleMarkup=m=>`<section class="chapter-course-module"><h5>${esc(m.title)}</h5>${m.description?`<p>${esc(m.description)}</p>`:''}${m.operation?`<p class="module-operation">${esc(m.operation)}</p>`:''}</section>`;
 const visibleModules=modules.length>8?modules.slice(0,6):modules;
 return `<article class="chapter-course" data-product-id="${esc(p.id)}"><header class="chapter-course-heading"><div class="chapter-course-meta"><span>${esc(stageLabel(p))} · ${esc(p.subject)}</span><span class="${p.mode==='paid'?'paid-label':''}">${priceText(p)}</span></div><h3>${esc(p.title)}</h3></header>${operationGuide(p,{heading:'h4',compact:true})}<button class="chapter-course-cover" data-action="detail" data-id="${esc(p.id)}" aria-label="查看${esc(p.title)}的介绍"><img src="${esc(p.cover||'/images/community-cover.svg')}" alt="${esc(coverAlt(p))}" loading="lazy" decoding="async" width="720" height="390"></button><div class="chapter-course-body"><p class="chapter-course-description">${esc(p.description)}</p><div class="chapter-course-actions">${showCatalogUse(p)?`<button class="button" data-action="trial" data-id="${esc(p.id)}">在线使用 ↗</button>`:`<button class="button" ${p.canPurchase?`data-action="checkout" data-id="${esc(p.id)}"`:'disabled'}>${p.canPurchase?catalogBuyText(p):'暂未开放购买'}</button>`}<button class="button secondary" data-action="detail" data-id="${esc(p.id)}">介绍</button>${!p.accessible&&p.mode!=='preview'&&!user?'<button class="text-button" data-action="login">已购买？登录</button>':''}</div>${showCatalogUse(p)?pptMarkup(p.id):''}</div>${modules.length?`<section class="chapter-course-content"><h4>包含内容</h4><div class="chapter-course-modules">${visibleModules.map(moduleMarkup).join('')}</div>${modules.length>8?`<details class="chapter-course-more"><summary>其他 ${modules.length-visibleModules.length} 项内容</summary><div class="chapter-course-modules">${modules.slice(visibleModules.length).map(moduleMarkup).join('')}</div></details>`:''}</section>`:''}</article>`;
}
function renderGrid(){
 if(!$('#grid'))return;const knowledge=originFilter==='教师课件'?null:selectedKnowledge();
 const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:'全部',author:authorFilter,query:search,sortBy,courseIds:knowledge?.ids||null});
 // browseCatalog applies the same free-first, integrated-first order to every listing.
 const defaultSort=$('#course-sort option[value="default"]');if(defaultSort)defaultSort.textContent=search.trim()?'相关度':'目录顺序';
 const result=$('#result-count');if(knowledge)result.innerHTML=`<div class="chapter-results-heading"><div class="chapter-results-title"><p class="eyebrow">本章课件</p><h2>${esc(knowledge.title)}</h2></div><span class="chapter-results-count">${shown.length} 份课件</span></div>`;else result.textContent=`${shown.length} 份课件`;
 const reset=$('#catalog-reset');if(reset)reset.hidden=!(knowledge||search||authorFilter||stage!=='全部'||filter!=='全部'||priceFilter!=='全部'||(activePage!=='teachers'&&originFilter!=='全部'));
 $('#grid').classList.toggle('chapter-grid',!!knowledge);$('#grid').innerHTML=shown.length?shown.map(knowledge?chapterCourse:card).join(''):`<div class="empty"><span class="empty-graphic" aria-hidden="true">○</span><h3>${knowledge?.empty?'本章暂无课件':originFilter==='教师课件'&&!catalog.some(isTeacherCourse)?'暂无已上架的教师课件':'没有符合条件的课件'}</h3>${originFilter==='教师课件'&&!catalog.some(isTeacherCourse)?'<p>教师作品审核通过后，会出现在这里。</p><a class="button secondary" href="#creator">发布课件</a>':'<button class="button secondary" data-action="clear-filters">清除筛选</button>'}</div>`;observeReveals();
}
function works(){
 const home=activePage==='works'&&!info.downloadMode,teacher=originFilter==='教师课件';$('#main').className=home?'home-page':teacher?'catalog-page':'catalog-page catalog-with-directory';
 if(home){$('#main').replaceChildren();return;}
 if(info.downloadMode&&!teacher){
  $('#main').classList.add('download-gallery');
  $('#main').innerHTML=`<section class="catalog-section download-gallery-section" id="course-catalog" aria-label="课件目录"><div class="download-gallery-heading"><h1>课件库</h1><span>${catalog.filter(p=>matchesOrigin(p,originFilter)).length} 份课件</span></div>${downloadUI.editionTabs(browseCatalog(catalog,{origin:originFilter,stage,subject:filter}),editionFilter)}${downloadGalleryFilters()}<div class="download-gallery-layout"><aside id="curriculum" aria-label="章节目录">${treeMarkup()}</aside><div class="catalog-products"><div class="catalog-result-row"><div class="result-count" id="result-count" aria-live="polite"></div><button class="text-button" id="catalog-reset" data-action="clear-filters" hidden>清除筛选</button></div><div class="grid" id="grid"></div></div></div></section>`;
  
  renderGrid();observeReveals();return;
 }
 $('#main').innerHTML=`<section class="catalog-section ${teacher?'teacher-catalog':''}" id="course-catalog" aria-label="${teacher?'教师课件检索':'课件目录'}"><div class="section-top catalog-page-heading"><div><h1>${teacher?'教师课件':'课件库'}</h1>${teacher?'<p class="subtle">按学段、学科、作者与知识点查找</p>':''}</div>${teacher?'<a class="button secondary small" href="#catalog">全部课件</a>':''}</div>${teacher||info.downloadMode?'':store.bundleSummary({stage,subject:filter})}${filtersMarkup()}<div class="catalog-layout ${teacher?'teacher-catalog-layout':''}">${teacher?'':`<aside id="curriculum" aria-label="章节目录">${treeMarkup()}</aside>`}<div class="catalog-products"><div class="catalog-result-row"><div class="result-count" id="result-count" aria-live="polite"></div><button class="text-button" id="catalog-reset" data-action="clear-filters" hidden>清除筛选</button></div><div class="grid" id="grid"></div></div></div></section>`;
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

function introActions(p){
 const offers=store.purchaseOptions(p);
 const primary=p.accessible?`<button class="button wide" data-action="trial" data-id="${esc(p.id)}">在线使用 ↗</button>`:offers?'':'<button class="button wide" disabled>暂未开放授权</button>';
 return primary+(p.accessible?pptMarkup(p.id):'')+offers+(!p.accessible&&p.mode!=='preview'&&!user?'<button class="text-button" data-action="login">已购买？登录使用</button>':'');
}
function introPage(id){
 if(info.courseReplacements?.[id]&&product(id)?.edition!=='integrated'){splitCoursePage(id);return;}
 const p=product(id);if(info.downloadMode&&p){downloadUI.detail(p);return;}if(!p){$('#main').innerHTML='<div class="empty"><h1>未找到这个课件</h1><a class="button" href="#catalog">返回课件目录</a></div>';return;}
 const modules=p.modules?.length?p.modules:(p.features||[]).map(title=>({title,description:''}));
 const back=courseNavigation.target(id);
 document.title=`${p.title} · 课件介绍 · 乐启享`;
 $('#main').innerHTML=`<article class="course-intro"><a class="intro-back" data-action="course-return" data-id="${esc(id)}" href="${esc(back.href)}">← ${back.label}</a><div class="course-heading"><p class="eyebrow">${esc(stageLabel(p))} · ${esc(p.subject)}</p><h1 tabindex="-1">${esc(p.title)}</h1><div class="course-byline"><span>课件制作者：${esc(p.creatorName||'乐启享机器人')}</span></div></div>
 ${operationGuide(p,{id:'course-operations'})}<p class="course-lead course-introduction-lead">${esc(p.description)}</p>
 <div class="course-overview"><figure class="course-poster"><img src="${esc(p.cover||'/images/community-cover.svg')}" alt="${esc(p.title)}课件画面" width="1600" height="900" fetchpriority="high"><figcaption><span>课件画面</span><span>${esc(stageLabel(p))}</span></figcaption></figure><aside class="course-purchase" id="course-unlock" aria-label="课件使用方式"><span class="course-access-label">${p.mode==='preview'&&!p.accessible&&!p.owned?'课件介绍':p.owned?'已授权':p.mode==='free'?(p.timedFree?.active?'限时免费课件':'免费课件'):'课件包授权'}</span><h2>${p.mode==='preview'&&!p.accessible&&!p.owned?'暂未开放':p.owned?'已解锁':p.mode==='free'?(p.timedFree?.active?'限时免费':'免费使用'):store.courseBundles(p).length?'随包使用':'暂未开放'}</h2><p>${p.mode==='preview'&&!p.accessible&&!p.owned?'此课件尚未开放购买与在线使用，可先查看教学内容。':p.mode==='free'?(p.timedFree?.active?freePeriodText(p):'无需购买，可直接在线使用。'):p.accessible?'在当前账号下在线使用，正常更换教学电脑即可。':store.courseBundles(p).length?'购买所属课件包，解锁清单中的全部课件。':'此课件尚未开放新的授权，已有合法权限继续有效。'}</p><ul><li><strong>在线使用</strong><span>在浏览器中打开，按课件内的说明操作</span></li><li><strong>适用设备</strong><span>${esc(p.device||'电脑、平板与手机浏览器')}</span></li></ul><div class="course-cta">${introActions(p)}</div>${!p.accessible&&store.courseBundles(p).length&&!store.courseBundles(p).some(b=>b.canPurchase)?'<p class="course-status" role="status">课件包购买尚未开放。</p>':''}</aside></div>
 <nav class="course-jump" aria-label="课件介绍导航"><button data-action="intro-section" data-value="course-operations">操作指南</button><button data-action="intro-section" data-value="course-content">教学内容</button><button data-action="intro-section" data-value="course-questions">使用说明</button></nav>
 <section id="course-content" class="course-section"><div class="course-section-heading"><h2>教学内容</h2></div>${p.taxonomy?.length?`<div class="course-taxonomy">${p.taxonomy.map(t=>`<div><strong>${esc(t.domain)} · ${esc(t.chapter)}</strong><p>${(t.topics||[]).map(esc).join(' / ')}</p></div>`).join('')}</div>`:''}<div class="course-modules">${modules.map((m,i)=>`<section class="course-module"><span class="module-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(m.title)}</h3>${m.description?`<p>${esc(m.description)}</p>`:''}${m.operation?`<p class="module-operation">${esc(m.operation)}</p>`:''}</div></section>`).join('')}</div></section>
 <section id="course-questions" class="course-section"><div class="course-section-heading"><h2>使用说明</h2></div><div class="course-faq"><details open><summary>如何打开课件？</summary><p>${p.mode==='preview'&&!p.accessible&&!p.owned?'此课件暂未开放在线使用。':p.mode==='free'?'点击“在线使用”即可打开，无需购买。':'登录购买时使用的账号，在本页或“我的课件”中点击“在线使用”。'}网站仅提供在线使用，请在上课前确认教学电脑能够连接网站。</p></details><details><summary>手机和平板可以使用吗？</summary><p>${esc(p.device||'可以通过浏览器在线打开。')}触屏操作见课件内的说明，横屏可获得更宽的观察空间。</p></details><details><summary>学校电脑比较旧怎么办？</summary><p>${p.creatorId?'请先查看作者的设备要求及画质设置说明。':'在课件设置中选择“低画质”，减少渲染负担。'}请先使用免费课件检查学校电脑的实际显示与操作情况。</p></details>${p.mode==='paid'?'<details><summary>更换教学电脑后如何使用？</summary><p>在新电脑登录同一账号即可。一个账号同时保留一个付费课堂；需要切换时，点击“在这里继续”，原窗口停止使用。</p></details>':''}</div></section>
 <div class="course-end"><span>课件制作者：${esc(p.creatorName||'乐启享机器人')}</span><a data-action="course-return" data-id="${esc(id)}" href="${esc(back.href)}">${back.label} ↗</a></div></article>`;
 $('#main h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});
}

function splitCoursePage(id){
 const replaced=info.courseReplacements?.[id];
 if(!replaced)return;
 const items=replaced.productIds.map(product).filter(p=>p&&!p.retired);
 document.title='选择课件 · 乐启享';
 $('#main').className='';
 $('#main').innerHTML=`<section class="course-intro"><a class="intro-back" href="#catalog">← 课件目录</a><div class="course-heading"><h1>选择课件</h1><p class="subtle">此入口已拆分为以下独立课件，原有授权继续有效。</p></div><div class="library-course-grid">${items.map(p=>`<article class="library-course-card"><a class="library-card-cover" href="#course/${esc(p.id)}"><img src="${esc(p.cover||'/images/community-cover.svg')}" alt="${esc(p.title)}" loading="lazy" width="720" height="390"></a><div class="library-card-body"><h2><a href="#course/${esc(p.id)}">${esc(p.title)}</a></h2><p>${esc(p.description)}</p><div class="library-card-actions">${p.accessible?`<button class="button small" data-action="trial" data-id="${esc(p.id)}">在线使用 ↗</button>`:`<a class="button secondary small" href="#course/${esc(p.id)}">查看课件</a>`}</div>${p.accessible?pptMarkup(p.id):''}</div></article>`).join('')}</div></section>`;
}


async function auth(mode='login'){
 ++authSerial;
 if(!['owner','owner-recover'].includes(mode))return phone.open('login');
 phone.cancel();
 const recover=mode==='owner-recover';authMode=recover?'owner/recover':'owner/login';
 modal(`<form class="form" id="auth-form"><p class="eyebrow">乐启享 · 网站管理</p><h2>${recover?'找回管理账号':'站主管理登录'}</h2><label for="username">管理账号</label><input id="username" name="username" required pattern="[a-zA-Z0-9_-]{4,32}" minlength="4" maxlength="32" autocomplete="username">${recover?'<label for="recovery">恢复码</label><input id="recovery" name="recovery" required maxlength="100" autocomplete="off">':''}<label for="password">${recover?'新密码':'密码'}</label><input id="password" type="password" name="password" minlength="10" maxlength="128" required autocomplete="${recover?'new-password':'current-password'}"><p class="error" id="form-error" role="alert"></p><button class="button wide" type="submit">${recover?'重设密码':'登录管理后台'}</button><div class="form-switch"><button type="button" data-action="${recover?'owner-login':'owner-recover'}">${recover?'返回管理登录':'忘记管理密码'}</button></div></form>`);
}
async function completeAuth(result){
 user=result.user;if(user.role==='owner'&&location.hash==='#owner-login')history.replaceState(null,'','#admin');await refreshCatalog();await phone.refresh();accountLabel();
 if(result.recovery){modal(`<div class="dialog-content"><h2>保存你的恢复码</h2><p>忘记密码时，用它找回账号。请保存在你自己的安全位置，不要分享给别人。</p><p class="recovery">${esc(result.recovery)}</p><p class="subtle">账号：${esc(user.username)}。恢复码只在此处显示，本次操作后旧恢复码失效。</p><div class="actions"><button class="button" data-action="close">我已保存</button></div></div>`);}else{close();toast('已登录');}await route();if(!result.recovery){if(pendingPurchase){const id=pendingPurchase;pendingPurchase=null;checkout(id,true);}else await resumeReturnedPayment();}void updateAnnouncement.show();
}
async function submitAuth(form){const data=Object.fromEntries(new FormData(form)),submit=form.querySelector('[type="submit"]'),error=form.querySelector('#form-error');submit.disabled=true;error.textContent='';try{const result=await api(`/api/auth/${authMode}`,{...data,adult:data.adult==='on'});await completeAuth(result);}catch(e){if(error.isConnected)error.textContent=e.message;}finally{if(submit.isConnected)submit.disabled=false;}}
async function purchases(serial=routeSerial){if(info.downloadMode)return downloadUI.library();const viewerId=user?.id;$('#main').className='library-page';if(!user){$('#main').innerHTML='<div class="library-header"><h1>我的课件</h1></div><div class="empty"><h3>登录后查看课件</h3><p>查看课件包与已有授权，并逐份打开课件。</p><button class="button" data-action="login">登录</button></div>';return;}
 const result=await api('/api/library');if(serial!==routeSerial||user?.id!==viewerId||location.hash.split('/')[0]!=='#purchases')return;libraryProducts=result.products||[];const library=organizeLibrary(result);
 const ordersMarkup=result.orders?.length?`<section class="library-orders"><h2>订单记录</h2>${result.orders.map(o=>`<div class="order-row"><div><h3>${esc(product(o.productId)?.title||info.downloadPlans?.find(p=>p.id===o.productId)?.title||store.bundle(o.productId)?.title||o.productId)}</h3><div class="order-meta">${esc(o.id)} · ${new Date(o.created).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})}</div></div><div class="order-actions"><span>${money(o.amount)} · ${statusLabel[o.status]||esc(o.status)}</span>${o.status==='pending'?`<button class="button secondary small" data-action="order" data-id="${esc(o.id)}">查看付款</button>`:''}${refundUI.orderMarkup(o)}${o.status==='payment_review'?`<button class="text-button" data-action="service" data-id="${esc(o.id)}">联系人工售后</button>`:''}</div></div>`).join('')}<p class="subtle">付款后 7 天内可填写理由申请退款，由站主人工审核；超过 7 天不开放在线退款申请。</p></section>`:'';
 mountPurchaseLibrary($('#main'),library,{chapters:info.curriculum?.chapters||[],ordersMarkup,selectedChapter:restoringBrowse?.libraryChapter});
}
async function refundPage(adminMode=false,serial=routeSerial){
 const viewerId=user?.id,routeName=adminMode?'refund-admin':'refunds';$('#main').className='refund-main';
 if(!user||(adminMode&&user.role!=='owner')){$('#main').innerHTML=refundUI.loginMarkup(adminMode);return;}
 $('#main').innerHTML='<div class="refund-loading" role="status">正在读取退款与订单记录…</div>';
 const result=await api(adminMode?'/api/admin':'/api/library');
 if(serial!==routeSerial||user?.id!==viewerId||location.hash.split('/')[0]!=='#'+routeName)return;
 if(adminMode){if(user?.role!=='owner')return;$('#main').innerHTML=refundUI.adminPageMarkup(result.refundRequests||[]);}
 else{libraryProducts=result.products||[];$('#main').innerHTML=refundUI.customerMarkup(result.orders||[],{owner:user.role==='owner'});}
}
function checkout(id,confirmed=false){
 if(info.downloadMode){if(info.downloadPlans.some(p=>p.id===id)){if(!user){pendingPurchase=id;auth();return;}return downloadUI.checkout(id);}return downloadUI.purchase(id,true);}
 const b=store.bundle(id);
 if(!b){const p=product(id);if(!p){toast('未找到这个课件包');return;}const offers=store.purchaseOptions(p);modal(`<div class="dialog-content"><h2>购买所属课件包</h2><p>${esc(p.title)}通过对应课件包授权使用。</p>${offers||'<p class="subtle">此课件暂未开放新的授权。</p>'}<button class="button secondary wide" data-action="close">返回课件介绍</button></div>`);return;}
 if(!confirmed){modal(purchaseNotice(id));return;}
 if(!user){pendingPurchase=id;auth();return;}if(b.owned){toast('已拥有这个课件包');location.hash='purchases';return;}if(!b.canPurchase){toast('暂未开放购买');return;}
 const included=(b.productIds||[]).map(product).filter(Boolean);
 modal(`<div class="dialog-content bundle-checkout"><p class="eyebrow">确认购买 · ${esc([b.stage,b.subject].filter(Boolean).join(' · '))}</p><h2>${esc(b.title)}</h2><p>一次购买，永久在线使用。同一账号同时保留一个付费课堂，正常更换教学电脑即可。</p><div class="checkout-single"><span>课件包价格</span>${store.bundlePricing(b,{checkout:true})}</div><details class="checkout-scope"><summary>本次包含 ${Number(b.count??b.productIds?.length??0)} 份课件 · 查看清单</summary><ul>${included.map(p=>`<li>${esc(p.title)}${p.mode==='free'?'<span>免费体验</span>':''}</li>`).join('')}</ul></details><p class="subtle">包含范围以付款订单保存的清单为准，未来新增内容按公布范围处理。请先检查免费体验与课堂设备，并阅读<a href="#terms" data-action="terms">购买说明</a>。</p>${b.promotion?.eligible&&b.promotion?.available?`<p class="checkout-promotion-note">${b.promotion.kind==='time'&&b.promotion.earlyActive?'订单通常保留 15 分钟；限时优惠订单最晚须在北京时间 10 月 20 日 23:59:59 前完成付款。':'请在订单有效期内完成付款。'}最终金额以订单为准。</p>`:''}<div class="actions">${(info.channels||[]).map(c=>`<button class="button" data-action="pay" data-channel="${esc(c)}" data-id="${esc(b.id)}" data-price="${Number(b.price)}">${c==='wechat'?'微信支付':'支付宝'}</button>`).join('')}</div><p class="error" id="payment-error" role="alert"></p></div>`);
}
const mobileCheckout=()=>/Android|iPhone|iPad/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const readOrder=id=>api('/api/orders/'+encodeURIComponent(id)+'?mobile='+(mobileCheckout()?'1':'0'));
async function resumeReturnedPayment(){
 const id=new URL(location.href).searchParams.get('order');if(!user||!id||!/^[a-zA-Z0-9_-]+$/.test(id))return;
 try{const result=await readOrder(id);history.replaceState(null,'','/#purchases');showPayment(result);}catch(e){toast(e.message);}
}
async function pay(id,channel,button){if(!store.bundle(id)){toast('请购买所属课件包');return;}button.disabled=true;try{const r=await api('/api/orders',{productId:id,channel,expectedAmount:Number(button.dataset.price),mobile:mobileCheckout()});showPayment(r);}catch(e){if(e.code==='BUNDLE_PRICE_CHANGED'){await refreshCatalog();checkout(id);toast('优惠期限或价格已更新，请确认当前金额后再付款');return;}if($('#payment-error'))$('#payment-error').textContent=e.message;else toast(e.message);if(button.isConnected)button.disabled=false;}}
function showPayment({order,payment,paymentMessage=''}){if(order.status==='payment_review'){modal(`<div class="dialog-content center"><p class="eyebrow">${esc(order.id)}</p><h2>付款需要人工核查</h2><p>已收到付款，订单暂未解锁。请联系售后核查，我们会处理授权或退款。</p><p class="price">${money(order.amount)}</p><button class="button secondary" data-action="service" data-id="${esc(order.id)}">联系人工售后</button></div>`);return;}if(order.status==='paid'){close();if(location.hash==='#purchases')route();else location.hash='purchases';toast(info.downloadMode?(order.amount===0?'升级成功，全科永久权益已开通':'付款成功，下载权益已开通'):'付款成功，可在“我的课件”中使用');return;}modal(`<div class="dialog-content center"><p class="eyebrow">${esc(order.id)}</p><h2>${order.status==='expired'?'订单已过期':order.status==='refunded'?'订单已退款':'等待付款'}</h2><p class="price">${money(order.amount)}</p>${order.status==='pending'&&payment?.type==='qr'?`<img class="payment-qr" src="${esc(payment.image)}" alt="微信付款二维码"><p class="subtle">请用微信扫码付款。手机无法扫码时，可换用支付宝。</p>`:order.status==='pending'&&payment?.url?`<p>请在官方收银台完成付款，然后回到这里。</p><a class="button" href="${esc(payment.url)}" target="${payment.surface==='mobile'?'_self':'_blank'}" rel="noopener noreferrer">前往${order.channel==='wechat'?'微信':'支付宝'}付款</a>`:`<p class="subtle">${esc(paymentMessage||'可以返回购买页面重新下单，或稍后检查这笔订单。')}</p>`}<div class="actions"><button class="button secondary wide" data-action="order" data-id="${esc(order.id)}">刷新付款结果</button></div><p class="subtle">只有支付平台确认到账后，作品才会解锁。</p></div>`);if(order.status==='pending')timer=setInterval(async()=>{try{const r=await readOrder(order.id);if(r.order.status!=='pending')showPayment(r);}catch{clearInterval(timer);}},6000);}
async function account(){about();}
function deliveryLookup(){if(user?.role!=='owner')return;modal('<form id="delivery-form" class="form"><h2>交付核查</h2><label for="delivery-id">交付编号</label><input id="delivery-id" name="deliveryId" required minlength="24" maxlength="24" pattern="[A-Za-z0-9_-]{24}" autocomplete="off" spellcheck="false"><p class="subtle">查询近 90 天的交付记录。编号仅作核查线索。</p><button class="button" type="submit">查询</button><div id="delivery-result" role="status"></div></form>');}
async function admin(){history.replaceState(null,'','#catalog');works();}
const policies={
 guide:['使用帮助','<p>在课件库选择学段、学科和章节，查看单个课件的介绍与操作说明。免费课件无需购买；付费课件通过所属课件包授权，已有历史权限继续有效。</p><p>网站仅提供在线使用。请在上课前确认教学电脑能够连接网站，并先打开免费课件检查。手机与平板可横屏使用，具体操作见课件说明。</p><p>点击“PPT 超链接”可复制课件链接，粘贴到 PPT 的“插入 → 链接／超链接”中。使用超链接功能需要教学电脑联网并登录网站账号。</p><p>同一账号同时保留一个付费课堂。更换教学电脑后登录同一账号，按提示主动切换；日常更换设备和网络可以正常使用。</p><p>遇到使用问题可在课件介绍页提交反馈，内容仅站主可查看。付款后 7 天内，可在导航栏“退款与售后”中填写理由申请退款，由站主审核。</p><p>教师投稿可继续上传、审核与维护，教师作品的单份新销售暂停。使用手机号验证码登录，无需设置密码。</p>'],
 privacy:['隐私说明','<p>免费课件无需注册，也无需提供学生姓名、学校或联系方式。账号由成年教师或家长创建。</p><p>网站保存手机号的加密记录、验证码校验信息、订单、授权、课堂会话、投稿与历史分成、使用反馈和售后申请，用于登录、交付及处理问题。提交反馈时附带浏览器、系统和窗口大小，帮助定位兼容问题。</p><p>手机号用于验证码登录、换绑和必要的账号归属验证；短信发送与验证受次数和期限限制。首次验证码登录自动创建账号，无需设置密码。更换手机号需依次验证原号码与新号码；原号码无法使用时请联系售后核验。</p><p>发送短信前使用阿里云图形认证。验证组件会处理网络地址、浏览器及设备环境、验证操作信息，用于识别人机请求；网站服务器核验通过后才发送短信。图形认证密钥仅在服务器保存。</p><p>浏览器使用随机设备标记，用于记住常用浏览器和分析持续异常开课行为。设备标记不采集硬件指纹，改变 IP 或设备数量多不会单独认定违规；常用设备与正在进行的课堂不会因该项异常验证反复打断。设备标记与开课异常记录按保留期限清理。</p><p>每次交付生成随机核查编号，记录课件、交付时间及已登录时的账号。站主仅可查询近 90 天交付记录；编号不包含账号或登录凭据。</p><p>反馈与处理记录仅站主可查看。登录使用必要的 Cookie，不接入广告追踪。课件设置和进度不会自动同步，请保管好账号凭据。</p>'],
 terms:['购买说明','<p>官方课件包按“学段＋学科”划分，购买范围以付款订单保存的课件清单为准，不包含其他学段或学科。包内免费体验继续免费，历史合法单课权限继续有效。</p><p>一次购买，永久在线使用，不自动续费。未来新增内容是否纳入已有授权，以公布的范围为准。网站仅提供在线使用，请先通过免费体验检查学校设备。</p><p>一个账号同时保留一个付费课堂。可以正常更换教学电脑并主动切换课堂；持续明显的多人轮换共用可能需要验证账号归属，必要时由人工核查，并提供恢复渠道。请勿转售或公开传播课件内容。</p><p>只有支付平台确认到账且订单核验通过后才解锁。付款后 7 天（168 小时）内，可在导航栏“退款与售后”中填写退款理由并提交申请，由站主人工审核，并非自动退款。超过 7 天不开放在线退款申请；期限内已提交的申请继续保留。其他售后问题按实际情况、交易约定与法律要求处理；完成退款后仅撤销该订单授予的权限，其他合法授权保留。</p>']};
function policyBody(name){
 if(info.downloadMode&&name==='guide')return '<p>在课件库按学段、学科与章节选择独立版或整合版，进入介绍页下载。保存 HTML 文件后，在教学电脑浏览器中打开；手机文件预览器可能无法运行互动内容。</p><p>新购尝鲜卡可跨学科选用 2 份独立版或 1 份整合版，含 2 额度：独立版消耗 1 额度，整合版消耗 2 额度。已选 1 份独立版后，剩余 1 额度只能再选 1 份独立版。本次规则更新前已选过 1 份独立版的尝鲜卡，额外补赠 1 额度；实际余量可在“已解锁课件”查看。次卡共 20 额度，可跨学科混合选用独立版与整合版：独立版扣 1、整合版扣 2，每张卡最多选 8 份整合版。先选 8 份整合版后，还剩 4 额度可选 4 份独立版；若先选过独立版，以实际余额为准。同一资源重复下载不扣额度，也不占新的整合版名额；已有次卡同步适用新规则。对应学段与学科的年卡、永久卡同时支持独立版与整合版；有效期和剩余额度可在“已解锁课件”查看。</p><p>免费课件可直接在线使用，也可下载后离线打开，方便课前检查教学电脑。课件默认高清，卡顿时可在课件设置中调整画质。课件默认高清，卡顿时可在课件设置中调整画质。</p>';
 if(info.downloadMode&&name==='terms')return '<p>新购尝鲜卡 19.8 元，含 2 额度，可跨学科选用 2 份独立版或 1 份整合版；独立版消耗 1 额度，整合版消耗 2 额度。已选 1 份独立版后，余下 1 额度只能再选 1 份独立版。本次规则更新前已选过 1 份独立版的尝鲜卡，额外补赠 1 额度；实际余量可在“已解锁课件”查看。次卡 98 元，共 20 额度，可跨学科混合选用；独立版消耗 1 额度，整合版消耗 2 额度，每张卡最多选 8 份整合版。若先选 8 份整合版，还剩 4 额度可继续选 4 份独立版；若先选过独立版，以实际剩余额度为准。整合版名额已用满后，剩余额度仍可继续选独立版；已选资源重复下载不占新的整合版名额。已有次卡同步适用新规则。已选资源重复下载不扣额度，不设选用期限。整合版还可使用对应学段与学科的年卡或永久卡下载。年卡截至北京时间 2026 年 10 月 20 日 23:59:59 为 198 元，10 月 21 日 00:00 起为 228 元；所选学段与学科 365 天内不限次数下载；永久卡 399 元，所选学段与学科永久不限次数下载。年卡和永久卡包含对应学科的独立版、整合版及后续新增资源，不含其他学段学科，不自动续费。</p><p>年卡到期停止新的下载；已保存的文件不会远程删除。每份资源含账号关联指纹，仅限本人教学使用，禁止共享、转售和二次分发；经核实违规后，永久封禁账号并终止权益。</p><p>本产品为数字资源下载权益，已下载的资源不支持七日无理由退货。质量问题、无法正常交付、重复扣款及法律规定应退款的情形，仍可申请售后。购买时须主动确认说明；历史订单按购买时的约定处理。退款确认后仅撤销该订单提供的下载权益，其他有效权益保留。</p>';

 if(name!=='terms')return policies[name][1];
 const prices=(info.bundles||[]).map(b=>`<li>${esc(b.title)} · ${Number(b.count??b.productIds?.length??0)} 份：${store.bundlePricing(b,{compact:true})}</li>`).join('');
 return (prices?`<ul class="terms-bundles">${prices}</ul>`:'')+policies.terms[1]+(info.selling?'':'<p>当前尚未开放购买，请先体验免费课件。</p>');
}
function policy(name){const title=policies[name][0],body=policyBody(name);modal(`<div class="dialog-content policy"><h2>${title}</h2>${body}${info.seller?`<p>经营主体：${esc(info.seller)}</p>`:''}${info.support?`<p>联系邮箱：${esc(info.support)}</p>`:''}</div>`);}
function about(){modal('<div class="dialog-content"><div class="profile"><img src="/brand/brand-logo.png" alt="乐启享机器人 Logo" width="56" height="56"><div><p class="eyebrow">关于课件</p><h2>乐启享机器人</h2></div></div><p>乐启享机器人专注 3-16 岁少儿科技素养教育，以工程实践与项目制学习，让孩子在搭建、调试、协作、展示中真正学会创造。</p><p class="subtle">从乐高启蒙 到 AI 创造 · 18164173640 / 17371701272 · 宜昌市猇亭区金岭路59-1号</p><p class="subtle">统一社会信用代码 / 备案号：鄂ICP备2025149404号-1</p></div>');}
async function refreshCatalog(){info=await api('/api/catalog');syncPromotionClock(info.serverTime);catalog=info.products;downloadBulk.invalidate();legalFooter();}
async function route(){const serial=++routeSerial;let [page,id]=(location.hash.slice(1)||'works').split('/');if(page==='purchase'&&id){history.replaceState(null,'','#course/'+id);page='course';}else if(['unlocked','purchases','admin','moderation','creator','owner-login','refunds','refund-admin','feedback-admin','account-safety','bulk-download-admin','teachers'].includes(page)){history.replaceState(null,'','#catalog');page='catalog';id='';}document.body.classList.toggle('download-mode',info.downloadMode===true);
 if(info.downloadMode&&['purchase','bundle','play','classroom','unlocked'].includes(page)&&!(['play','classroom'].includes(page)&&id&&product(id)?.onlineAccessible)){
   showHome(false);stopTrial();document.body.dataset.page=page;$('#main').className='';
   if(page==='purchase'){downloadUI.purchase(id);return;}
   if(page==='unlocked'){history.replaceState(null,'','#purchases');return downloadUI.library();}
   if(['play','classroom'].includes(page)&&id){history.replaceState(null,'','#course/'+id);introPage(id);return;}
   if(page==='bundle'){if(id){const scope=info.downloadScopes.find(s=>s.id===id);stage=scope?.stage||'全部';filter=scope?.subject||'全部';}history.replaceState(null,'','#catalog');page='catalog';id='';}
 }

 if(['downloads','free','paid'].includes(page)){priceFilter=page==='paid'?'付费':page==='free'?'免费':'全部';page='catalog';history.replaceState(null,'','#catalog');}
 if(page==='membership'){page='bundle';id='physics-complete';history.replaceState(null,'','#bundle/physics-complete');}
 courseNavigation.restore(location.hash);
 if(page==='works'&&!restoringBrowse||page==='catalog'&&originFilter==='教师课件'){originFilter=stage=filter=priceFilter='全部';authorFilter=search=chapterFilter='';sortBy='default';editionFilter='all';}
 if(page==='teachers'){originFilter='教师课件';chapterFilter='';}
 activePage=['works','catalog','teachers','creator','purchases','bundle','admin','moderation','feedback-admin','account-safety','refunds','refund-admin','bulk-download-admin'].includes(page)?page:'works';document.body.dataset.page=page;showHome(!info.downloadMode&&activePage==='works'&&!['play','classroom','course'].includes(page));
 try{if((page==='play'||page==='classroom')&&id){await openLesson(id,serial);return;}stopTrial();$('#main').className='';if(page==='classroom'){location.hash='catalog';return;}
 if(page==='owner-login'){if(user?.role==='owner'){history.replaceState(null,'','#admin');return route();}works();await auth('owner');return;}
 if(page==='course'){await resolveLibraryProduct(id);if(serial!==routeSerial)return;introPage(id);}else works();
 if(serial!==routeSerial)return;document.querySelectorAll('.header .nav-link,.header .publish-link').forEach(a=>{if(a.hash==='#'+(page==='course'?'catalog':activePage))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});restoreBrowseDOM();restoreScroll(courseNavigation.takePosition(location.hash));
 }catch(e){if(serial!==routeSerial)return;stopTrial();$('#main').innerHTML=`<div class="empty"><h3>暂时没有打开</h3><p>${esc(e.message)}</p><button class="button" data-action="reload">重新加载</button></div>`;}}
document.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;renderGrid();}});

document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const {action,id,value,channel}=b.dataset;try{
if(action==='price-filter'){priceFilter=value;if(!availableSubjects().includes(filter)){filter='全部';chapterFilter='';}works();}else if(action==='browse-courses'){browseCourses();}else if(action==='origin-filter'){originFilter=value;authorFilter=chapterFilter='';if(!availableSubjects().includes(filter))filter='全部';const target=value==='教师课件'?'teachers':'catalog';if(location.hash==='#'+target)works();else location.hash=target;}else if(action==='author-filter'){authorFilter=String(value);originFilter='教师课件';stage=filter=priceFilter='全部';search=chapterFilter='';if(location.hash==='#teachers')works();else location.hash='teachers';}else if(action==='intro-section'){document.getElementById(value)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}else if(action==='close')close();else if(action==='detail')detail(id);else if(action==='trial')trial(id);
else if(action==='stage'||action==='filter'){if(action==='stage'){stage=value;filter='全部';}else filter=value;chapterFilter='';works();}
else if(action==='download-edition'){editionFilter=validDownloadEdition(value);chapterFilter='';priceFilter='全部';works();}
else if(action==='chapter'){chapterFilter=value;renderTree();renderGrid();if(matchMedia('(max-width:900px)').matches)$('#curriculum details').open=false;$('.catalog-products')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}
else if(action==='clear-chapter'){chapterFilter='';renderTree();renderGrid();}
else if(action==='clear-filters'){stage=filter=priceFilter='全部';originFilter=activePage==='teachers'?'教师课件':'全部';search=chapterFilter=authorFilter='';works();}
else if(action==='course-return'){close();await courseNavigation.returnTo(currentLesson||id,!!currentLesson);}
else if(action==='takeover'){close();await openLesson(id,++routeSerial,true);}
else if(action==='reconnect-classroom'){const id=currentLesson;if(!id)return;b.disabled=true;try{const renewed=await renewLease();if(renewed&&id===currentLesson){stopTrial();await openLesson(id,++routeSerial);}else if(id===currentLesson)toast('尚未恢复连接，请检查网络后重试');}finally{if(b.isConnected)b.disabled=false;}}
else if(action==='restart'){const p=currentLesson;if(p){stopTrial();await openLesson(p,++routeSerial);}}
else if(action==='hide-toolbar'){$('#classroom').classList.add('toolbar-hidden');$('#show-toolbar').hidden=false;}
else if(action==='show-toolbar'){$('#classroom').classList.remove('toolbar-hidden');$('#show-toolbar').hidden=true;}
else if(action==='fullscreen'){if(document.fullscreenElement)await document.exitFullscreen();else if($('#classroom').requestFullscreen)await $('#classroom').requestFullscreen().catch(()=>toast('请横屏使用；此浏览器未开放全屏功能'));else toast('请横屏使用，浏览器会自动调整观察空间');}
else if(action==='classroom-help')classroomHelp();
else if(action==='dismiss-orientation'){$('#orientation-hint').hidden=true;try{sessionStorage.setItem('orientation-hint','1');}catch{}}
else if(['login','register','recover'].includes(action))auth();else if(action==='owner-login')auth('owner');else if(action==='owner-recover')auth('owner-recover');else if(action==='account')account();
else if(action==='logout'){await api('/api/auth/logout',{});user=null;libraryProducts=[];await refreshCatalog();accountLabel();close();stopTrial();route();}
else if(action==='library'){close();if(location.hash==='#purchases')route();else location.hash='purchases';}else if(action==='admin'){close();if(location.hash==='#admin')route();else location.hash='admin';}
else if(action==='refunds'||action==='refund-admin'){close();const target='#'+action;if(location.hash===target)route();else location.hash=target;}
else if(action==='delivery-lookup')deliveryLookup();
else if(action==='phone-login')await phone.open('login');else if(action==='phone-bind')await phone.open('bind');else if(action==='phone-rebind')await phone.open('rebind_old');else if(action==='checkout')checkout(id);else if(action==='pay')await pay(id,channel,b);else if(action==='order')showPayment(await readOrder(id));
else if(action==='business')modal(`<div class="dialog-content"><h2>经营信息</h2><p>${esc(info.seller)}</p>${info.creditCode?`<p class="subtle">统一社会信用代码：${esc(info.creditCode)}</p>`:''}${info.support?`<p>联系邮箱：${esc(info.support)}</p>`:''}</div>`);else if(action==='about')about();else if(policies[action])policy(action);
else if(action==='ppt-link')courseTools.open(id);
else if(action==='copy-ppt-link')await courseTools.copy(id);
else if(action==='continue-purchase')checkout(id,true);
else if(action==='refund-request')await refundUI.open(id);
else if(action==='review-refund')refundUI.review(id,value);
else if(action==='service')modal(`<form id="service-form" class="form" data-order="${esc(id)}"><h2>联系人工售后</h2><p class="subtle">请说明遇到的问题。</p><label for="reason">问题说明</label><textarea id="reason" name="reason" required minlength="4" maxlength="500" rows="5"></textarea><p class="error" role="alert"></p><button class="button wide" type="submit">提交申请</button></form>`);
else if(action==='resolve-service'){await api('/api/admin/service-requests',{id:Number(id),status:'resolved'});toast('已标记处理');await admin();}
else if(action==='refund-record')modal(`<form id="refund-form" class="form" data-order="${esc(id)}" data-amount="${Number(value)}"><h2>登记已完成的退款</h2><p class="subtle">请先在支付商户平台完成全额退款。这里只更新订单记录与下载权益，不发起转账。</p><p>应退金额：${money(Number(value))}</p><label for="refund-reference">支付平台退款单号</label><input id="refund-reference" name="reference" required minlength="6" maxlength="100"><label class="check-label"><input type="checkbox" required name="confirmed"><span>我已核对全额退款成功，确认更新该订单的使用权限。</span></label><div class="actions"><button class="button wide" type="submit">保存退款记录</button></div></form>`);
else if(action==='reload'){await refreshCatalog();route();}
}catch(error){toast(error.message);}});
document.addEventListener('submit',async e=>{const f=e.target;if(['refund-request-form','refund-review-form'].includes(f.id)){e.preventDefault();await refundUI.submit(f);return;}if(!['auth-form','refund-form','service-form','delivery-form'].includes(f.id)&&!f.classList.contains('admin-form'))return;e.preventDefault();if(f.id==='auth-form')return submitAuth(f);const b=f.querySelector('[type="submit"]');if(b)b.disabled=true;try{
if(f.classList.contains('admin-form')){const d=Object.fromEntries(new FormData(f));await api('/api/admin/products',{id:f.dataset.product,mode:d.mode,price:null,reviewed:d.reviewed==='on'});await refreshCatalog();toast('已保存');}
else if(f.id==='refund-form'){const d=Object.fromEntries(new FormData(f));await api('/api/admin/refunds',{orderId:f.dataset.order,reference:d.reference,amount:Number(f.dataset.amount),confirmed:d.confirmed==='on'});close();toast('退款记录已保存');await route();}
else if(f.id==='service-form'){await api('/api/service-requests',{orderId:f.dataset.order,reason:new FormData(f).get('reason')});close();toast('售后申请已提交');}
else if(f.id==='delivery-form'){const viewerId=user?.id,entry=String(new FormData(f).get('deliveryId')||'').trim();const {delivery}=await api('/api/admin/content-deliveries?id='+encodeURIComponent(entry));if(!f.isConnected||user?.id!==viewerId||user?.role!=='owner')return;$('#delivery-result').innerHTML=`<p>${esc(product(delivery.productId)?.title||delivery.productId)}</p><p>账号：${esc(delivery.username||'未登录的免费访问')}</p><p>${esc(new Date(delivery.created).toLocaleString('zh-CN'))} · ${delivery.kind==='preview'?'投稿预览':'在线课堂'}</p>`;}
}catch(error){toast(error.message);}finally{if(b)b.disabled=false;}});
$('#dialog').addEventListener('close',()=>{authSerial++;phone.cancel();clearInterval(timer);timer=null;});
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#works"]');if(a&&(!location.hash||location.hash==='#works')){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}});
window.addEventListener('hashchange',()=>{close();route();});

window.addEventListener('message',e=>{
 if(e.data?.type!=='xiaobai:content-guard'||e.data.version!==1||e.data.state!=='return'||e.data.reason!=='user-request')return;
 const classroomFrame=$('#lesson-frame iframe'),previewFrame=$('.creator-preview iframe');
 if((classroomFrame&&e.source===classroomFrame.contentWindow)||(previewFrame&&e.source===previewFrame.contentWindow)){
  if(classroomFrame&&e.source===classroomFrame.contentWindow){const id=currentLesson;close();courseNavigation.returnTo(id,true);}else{stopTrial();close();location.hash='catalog';}
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#dialog').open&&!$('#classroom').hidden&&!document.fullscreenElement){$('#classroom').classList.remove('toolbar-hidden');$('#show-toolbar').hidden=true;}});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState!=='visible'||!currentLesson)return;renewLease();const id=currentLesson;try{const access=await api(`/api/access/${id}`);if(id===currentLesson&&!access.accessible){stopTrial();toast('使用权限已更新，请重新登录查看');await refreshCatalog();location.hash='purchases';}}catch{}});
startPromotionCountdowns({onExpire:async()=>{await refreshCatalog();if(info.downloadMode)await downloadUI.refreshPricing();if(!currentLesson&&!$('#dialog').open)await route();}});
try{const results=await Promise.all([api('/api/catalog'),api('/api/session')]);info=results[0];syncPromotionClock(info.serverTime);catalog=info.products;user=results[1].user;await phone.refresh();accountLabel();legalFooter();await route();await resumeReturnedPayment();void updateAnnouncement.show();}catch(e){$('#main').innerHTML='<div class="empty"><h3>暂时无法连接课件网站</h3><p>请检查连接后重新加载。</p><button class="button" data-action="reload">重新加载</button></div>';}

/* The disclosures keep their state across the re-render. */
document.addEventListener('toggle',e=>{const el=e.target;if(!el||!el.classList)return;if(el.classList.contains('download-subject-more'))subjectsOpen=el.open;},true);
