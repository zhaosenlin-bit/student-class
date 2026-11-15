/* Runs first, inside the reviewed delivery document. Persistence belongs to the map host. */
export function installDeliveryBridge(win,port){
 'use strict';
 const doc=win.document;
 const native={raf:win.requestAnimationFrame.bind(win),caf:win.cancelAnimationFrame.bind(win),timeout:win.setTimeout.bind(win),clear:win.clearTimeout.bind(win),now:win.performance.now.bind(win.performance),fetch:win.fetch.bind(win)};
 const frames=new Map(),timers=new Map(),media=new Set(),contexts=new Set(),rooms=new Set(),lifecycles=new Set(),resumeMedia=new Set(),resumeAudio=new Set(),volumes=new WeakMap();
 const abort=new win.AbortController();let next=1,paused=false,disposed=false,ready=false,pausedAt=0,offset=0;
 const now=()=>native.now()-offset-(paused?native.now()-pausedAt:0);
 Object.defineProperty(win.performance,'now',{configurable:true,value:now});
 Object.defineProperty(win,'localStorage',{configurable:true,value:port.storage});
 let proto=doc,hiddenDescriptor;
 while(proto&&!hiddenDescriptor){hiddenDescriptor=Object.getOwnPropertyDescriptor(proto,'hidden');proto=Object.getPrototypeOf(proto);}
 const nativeHidden=()=>hiddenDescriptor?.get?hiddenDescriptor.get.call(doc):false;
 Object.defineProperty(doc,'hidden',{configurable:true,get:()=>paused||nativeHidden()});
 Object.defineProperty(doc,'visibilityState',{configurable:true,get:()=>doc.hidden?'hidden':'visible'});
 function scheduleFrame(id,fn){const row=frames.get(id);if(!row||paused||disposed)return;row.native=native.raf(()=>{if(!frames.delete(id)||paused||disposed)return;fn(now());});}
 win.requestAnimationFrame=fn=>{const id=next++;if(!disposed){frames.set(id,{fn,native:null});scheduleFrame(id,fn);}return id;};
 win.cancelAnimationFrame=id=>{const row=frames.get(id);if(row?.native!==null)native.caf(row?.native);frames.delete(id);};
 function arm(id){const row=timers.get(id);if(!row||paused||disposed)return;row.deadline=now()+row.remaining;row.native=native.timeout(()=>{if(disposed||paused||!timers.has(id))return;if(row.interval===null)timers.delete(id);else row.remaining=row.interval;try{row.fn(...row.args);}finally{if(row.interval!==null)arm(id);}},row.remaining);}
 function timer(fn,delay,args,interval){if(typeof fn!=='function')throw Error('String timers are not supported');const id=next++;if(!disposed){timers.set(id,{fn,args,interval,remaining:Math.max(0,Number(delay)||0),native:null,deadline:0});arm(id);}return id;}
 win.setTimeout=(fn,delay,...args)=>timer(fn,delay,args,null);
 win.setInterval=(fn,delay,...args)=>timer(fn,delay,args,Math.max(1,Number(delay)||1));
 win.clearTimeout=win.clearInterval=id=>{const row=timers.get(id);if(row)native.clear(row.native);timers.delete(id);};
 win.fetch=(input,options={})=>native.fetch(input,{...options,signal:options.signal&&win.AbortSignal?.any?win.AbortSignal.any([options.signal,abort.signal]):abort.signal});
 const create=doc.createElement.bind(doc);doc.createElement=function(name,...args){const item=create(name,...args);if(item instanceof win.HTMLMediaElement){item.crossOrigin='anonymous';media.add(item);}return item;};
 if(win.Audio){const Audio=win.Audio;win.Audio=new Proxy(Audio,{construct(Type,args){const item=new Type();item.crossOrigin='anonymous';if(args[0])item.src=args[0];media.add(item);return item;}});}
 if(win.Image){const Image=win.Image;win.Image=new Proxy(Image,{construct(Type,args){const item=new Type(...args);item.crossOrigin='anonymous';return item;}});}
 const mp=win.HTMLMediaElement.prototype,originalPlay=mp.play,originalPause=mp.pause;
 const volume=Object.getOwnPropertyDescriptor(mp,'volume');
 if(volume?.get&&volume?.set)Object.defineProperty(mp,'volume',{configurable:true,get(){return volumes.get(this)??volume.get.call(this);},set(value){const v=Number(value);if(!Number.isFinite(v)||v<0||v>1)throw Error('Invalid media volume');volumes.set(this,v);volume.set.call(this,v*port.settings().volume);}});
 mp.play=function(){
  media.add(this);if(disposed)return Promise.reject(new win.DOMException('Scene disposed','AbortError'));
  if(paused){resumeMedia.add(this);return Promise.resolve();}
  if(this instanceof win.HTMLVideoElement){for(const other of media)if(other!==this&&other instanceof win.HTMLVideoElement){
   originalPause.call(other);
  }}
  const settings=port.settings();if(settings.muted)this.muted=true;if(volume?.set){const requested=volumes.get(this)??volume.get.call(this);volumes.set(this,requested);volume.set.call(this,requested*settings.volume);}
  return originalPlay.call(this).then(value=>{if(paused||disposed)originalPause.call(this);return value;});
 };
 // Route all delivered Web Audio outputs through the host volume without changing authored gains.
 const masters=new WeakMap();
 if(win.AudioNode&&win.AudioContext){
  const connect=win.AudioNode.prototype.connect;
  win.AudioNode.prototype.connect=function(destination,...args){const master=masters.get(this.context);return connect.call(this,master&&destination===this.context.destination&&this!==master?master:destination,...args);};
  const Context=win.AudioContext;
  win.AudioContext=new Proxy(Context,{construct(Type,args){const ctx=new Type(...args),master=ctx.createGain(),settings=port.settings();master.gain.value=settings.muted?0:settings.volume;connect.call(master,ctx.destination);masters.set(ctx,master);contexts.add(ctx);const resume=ctx.resume.bind(ctx);ctx.resume=()=>paused||disposed?Promise.resolve():resume();return ctx;}});
  if(win.webkitAudioContext)win.webkitAudioContext=win.AudioContext;
 }
 function checkpoint(){if(!disposed)win.dispatchEvent(new win.Event('pagehide'));}
 function syncSettings(){const s=port.settings();for(const ctx of contexts){const gain=masters.get(ctx);if(gain)gain.gain.value=s.muted?0:s.volume;}if(volume?.set)for(const item of media){const requested=volumes.get(item)??volume.get.call(item);volumes.set(item,requested);volume.set.call(item,requested*s.volume);}doc.dispatchEvent(new win.Event('fr-delivery-settingschange'));}
 function pause(){
  if(paused||disposed)return;for(const item of media)if(!item.paused&&!item.ended)resumeMedia.add(item);
  for(const ctx of contexts)if(ctx.state==='running')resumeAudio.add(ctx);
  pausedAt=native.now();paused=true;
  doc.dispatchEvent(new win.Event('visibilitychange'));
  for(const lifecycle of lifecycles)lifecycle.pause?.();
  for(const row of frames.values()){native.caf(row.native);row.native=null;}
  for(const row of timers.values()){row.remaining=Math.max(0,row.deadline-now());native.clear(row.native);row.native=null;}
  for(const item of media)originalPause.call(item);for(const ctx of contexts)ctx.suspend().catch(()=>{});
  if(doc.body)doc.body.dataset.hostPaused='true';
 }
 function resume(){
  if(!paused||disposed)return;offset+=native.now()-pausedAt;paused=false;syncSettings();
  for(const [id,row]of frames)scheduleFrame(id,row.fn);for(const id of timers.keys())arm(id);
  doc.dispatchEvent(new win.Event('visibilitychange'));
  for(const lifecycle of lifecycles)lifecycle.resume?.();
  for(const item of resumeMedia)if(!item.ended)item.play().catch(()=>{});resumeMedia.clear();
  for(const ctx of resumeAudio)ctx.resume().catch(()=>{});resumeAudio.clear();
  if(doc.body)doc.body.dataset.hostPaused='false';
 }
 function dispose(){
  if(disposed)return;checkpoint();pause();disposed=true;abort.abort();
  for(const lifecycle of [...lifecycles])lifecycle.dispose?.();lifecycles.clear();
  win.frMusic?.dispose();
  for(const row of frames.values())native.caf(row.native);frames.clear();
  for(const row of timers.values())native.clear(row.native);timers.clear();
  for(const item of media){originalPause.call(item);item.removeAttribute('src');item.load();}media.clear();
  for(const ctx of contexts)if(ctx.state!=='closed')ctx.close().catch(()=>{});contexts.clear();
  for(const room of rooms){room.clearDrag?.();room.scene?.traverse?.(obj=>{obj.geometry?.dispose?.();const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const mat of mats){mat?.map?.dispose?.();mat?.dispose?.();}});room.renderer?.dispose?.();room.renderer?.forceContextLoss?.();}rooms.clear();
  for(const canvas of doc.querySelectorAll('canvas')){const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');gl?.getExtension('WEBGL_lose_context')?.loseContext();}
  if(doc.body)doc.body.dataset.hostDisposed='true';
 }
 const navigate=raw=>{checkpoint();port.navigate(String(raw));};
 win.frDelivery=Object.freeze({navigate,reload:()=>navigate(win.location.href),registerRoom:room=>rooms.add(room),returnToMap:()=>{checkpoint();port.returnToMap();},settings:()=>({...port.settings()}),updateSettings:patch=>{if(!disposed)port.updateSettings(patch);},registerLifecycle:lifecycle=>{if(disposed){lifecycle.dispose?.();return ()=>{};}lifecycles.add(lifecycle);if(paused)lifecycle.pause?.();return ()=>lifecycles.delete(lifecycle);}});
 win.frDeliveryController=Object.freeze({pause,resume,dispose,checkpoint,syncSettings});
 doc.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link||link.target==='_blank'||link.hasAttribute('download'))return;const url=new win.URL(link.href,win.location.href);if(url.origin===new win.URL(win.location.href).origin){event.preventDefault();event.stopImmediatePropagation();navigate(url.href);}},true);
 doc.addEventListener('keydown',event=>{if(event.key?.toLowerCase()==='h'&&!event.target.matches?.('input,textarea,select'))event.stopImmediatePropagation();},true);
 win.addEventListener('pagehide',()=>{for(const item of media)originalPause.call(item);});
 function checkReady(){
  if(disposed||ready)return;
  const error=doc.querySelector('#error');
  if(error&&!error.hidden&&error.textContent.trim()&&error.checkVisibility?.()){port.error(error.textContent.slice(0,500));return;}
  const scene=win.franceAct||win.chapterTwo||win.chapterThree||win.chapterAct||win.extras;
  const snapshot=scene?.inspect?.(),loading=doc.querySelector('#loading');
  const visibleLoading=loading&&!loading.hidden&&loading.checkVisibility?.();
  if(snapshot&&!snapshot.busy&&!snapshot.loading&&!visibleLoading&&!['boot','loading','error'].includes(typeof snapshot.state==='string'?snapshot.state:snapshot.view)){
   ready=true;doc.body.dataset.deliveryReady='true';syncSettings();port.ready();return;
  }
  win.setTimeout(checkReady,80);
 }
 if(port.paused?.())pause();
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',checkReady,{once:true});else checkReady();
return win.frDeliveryController;
}
