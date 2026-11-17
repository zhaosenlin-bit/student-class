// A frame load event confirms delivery, not a rendered lesson. Keep the outer
// loading/error surface available even when the child cannot execute scripts.
let active=null;
const isActive=ctx=>active===ctx&&ctx.frame.isConnected&&ctx.stillActive();
const clean=value=>String(value??'').replace(/(?:https?:\/\/|file:\/\/)[^\s)]+/g,url=>url.split(/[?#]/)[0]).slice(0,2400);
function stopTimer(ctx){clearTimeout(ctx.timer);ctx.timer=null;}
function fail(ctx,detail={}){
 if(!isActive(ctx))return;
 stopTimer(ctx);ctx.failed=true;
 ctx.onError({code:detail.code||'XB-L002',message:clean(detail.message||'未收到课件画面完成的信息。'),phase:ctx.phase,courseId:ctx.courseId,retried:ctx.fallbackUsed,delivery:ctx.accelerated?'accelerated':'direct',browser:navigator.userAgent,diagnostics:detail.diagnostics||null});
}
function watch(ctx){
 stopTimer(ctx);ctx.timer=setTimeout(()=>{
  if(!isActive(ctx)||ctx.ready||ctx.failed)return;
  if(!ctx.scriptStarted&&!ctx.fallbackUsed)retry(ctx);
  else fail(ctx,{message:'课件未能完成启动。'});
 },30000);
}
async function retry(ctx){
 if(!isActive(ctx)||ctx.fallbackUsed||ctx.retrying||ctx.ready||ctx.failed)return;
 ctx.fallbackUsed=true;ctx.retrying=true;stopTimer(ctx);ctx.phase='reconnecting';ctx.onStage?.('reconnecting');
 // Bound authorization too. Late responses cannot navigate a different lesson.
 ctx.timer=setTimeout(()=>fail(ctx,{code:'XB-N001',message:'课件连接未能完成。'}),15000);
 try{
  const launch=await ctx.requestLaunch();
  if(!isActive(ctx)||ctx.failed)return;
  stopTimer(ctx);ctx.onLaunch(launch);ctx.retrying=false;ctx.scriptStarted=false;ctx.phase='requesting';ctx.accelerated=false;
  ctx.frame.src=launch.url;watch(ctx);
 }catch(error){fail(ctx,{code:'XB-N001',message:error?.message||'课件连接未能完成。'});}
}
window.addEventListener('message',event=>{
 const ctx=active,data=event.data;
 if(!ctx||!isActive(ctx)||event.source!==ctx.frame.contentWindow||!data||data.version!==1||ctx.retrying)return;
 if(data.type==='leqixiang:cdn-fallback'&&data.courseId===ctx.courseId){retry(ctx);return;}
 if(data.type!=='leqixiang:courseware-startup'||![ctx.courseId,ctx.seriesId].includes(data.courseId))return;
 if(data.phase==='error'){fail(ctx,data.detail||{});return;}
 if(ctx.failed||ctx.ready)return;
 if(data.phase==='ready'){
  ctx.ready=true;ctx.phase='ready';stopTimer(ctx);ctx.onReady();return;
 }
 if(['script-started','document-loaded','graphics-created'].includes(data.phase)){
  ctx.scriptStarted=true;ctx.phase=data.phase;ctx.onStage?.(data.phase);
 }
});
export function detachCoursewareDelivery(){if(active)stopTimer(active);active=null;}
export function attachCoursewareDelivery(options){
 detachCoursewareDelivery();
 // Apple uses the same authorized HTML directly, avoiding the extra in-frame
 // decrypt/decompress/document.write path. Renderer and assets remain identical.
 const apple=/Mac|iPhone|iPad|iPod/.test((navigator.platform||'')+' '+navigator.userAgent);
 const supported=!!(window.crypto?.subtle&&window.DecompressionStream&&window.fetch&&window.TextDecoder);
 const ctx=active={...options,fallbackUsed:false,retrying:false,ready:false,failed:false,scriptStarted:false,phase:'requesting',accelerated:!apple&&supported,plain:options.plain===true,timer:null};
 if(ctx.plain){
  // A plain document has no start-up handshake: the frame load event is the
  // only signal there is. It still gets a watchdog, so a broken document
  // reports an error instead of loading forever.
  ctx.phase='loading';
  ctx.timer=setTimeout(()=>{if(isActive(ctx)&&!ctx.ready&&!ctx.failed)fail(ctx,{message:'课件加载超时，请检查资源是否完整。'});},45000);
  ctx.frame.addEventListener('load',()=>{
   if(!isActive(ctx)||ctx.ready||ctx.failed)return;
   ctx.ready=true;ctx.phase='ready';stopTimer(ctx);ctx.onReady();
  });
  ctx.frame.src=options.launch.url;
  return;
 }
 ctx.frame.addEventListener('load',()=>{if(isActive(ctx)&&!ctx.ready&&!ctx.failed&&!ctx.scriptStarted){ctx.phase='frame-loaded';ctx.onStage?.('frame-loaded');}});
 ctx.frame.src=options.launch.url+(ctx.accelerated?'&accelerated=1':'');watch(ctx);
}
