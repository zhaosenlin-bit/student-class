// Package-only performance helpers. No authority, persistence or color processing.
const same = (a,b) => a && b && a.length===b.length && a.every((v,i)=>Object.is(v,b[i]));
export class FrameGate {
 constructor(){this.video=null;this.frame=null;this.epoch=0;this.dirty=true;this.visible=false;this.disposed=false;this.stats={draws:0,projections:0,ticks:0};}
 watch(video){
  if(video===this.video)return;
  if(this.frame!==null)this.video?.cancelVideoFrameCallback?.(this.frame);
  this.frame=null;this.video=video;this.epoch++;this.dirty=true;this.fallback=-1;
  const epoch=this.epoch;
  if(video?.requestVideoFrameCallback){
   const frame=()=>{if(this.disposed||epoch!==this.epoch)return;this.dirty=true;this.frame=video.requestVideoFrameCallback(frame);};
   this.frame=video.requestVideoFrameCallback(frame);
  }
 }
 sample({visible,video,pose,overlay}){
  this.stats.ticks++;
  this.watch(video);
  if(!visible){this.visible=false;return {draw:false,project:false};}
  if(video&&!video.requestVideoFrameCallback&&!video.paused&&video.readyState>=2){const tick=Math.floor(video.currentTime*30);if(tick!==this.fallback){this.fallback=tick;this.dirty=true;}}
  const moved=!same(this.pose,pose),project=!this.visible||moved||!same(this.overlay,overlay);
  const draw=!this.visible||moved||this.dirty;
  this.visible=true;this.pose=[...pose];this.overlay=[...overlay];this.dirty=false;
  if(draw)this.stats.draws++;if(project)this.stats.projections++;
  return {draw,project};
 }
 dispose(){this.disposed=true;this.epoch++;if(this.frame!==null)this.video?.cancelVideoFrameCallback?.(this.frame);this.frame=null;this.video=null;}
}

// Bounded chapter-local cache. Pending and currently displayed media are never evicted.
// Videos in old hidden scenes release decoder buffers; re-entry loads them normally.
export class MediaCache extends Map {
 constructor({limit=4,active=()=>null,release=releaseMedia}={}){super();this.limit=limit;this.active=active;this.release=release;this.ready=new Map();this.evictions=0;this.closed=false;}
 get(key){const value=super.get(key);if(super.has(key)){super.delete(key);super.set(key,value);}return value;}
 set(key,value){
  if(this.closed){if(value?.then)Promise.resolve(value).then(asset=>this.release(asset),()=>{});else if(value)this.release(value);return this;}
  super.delete(key);super.set(key,value);this.ready.delete(key);
  if(value?.then)Promise.resolve(value).then(asset=>{if(this.closed){this.release(asset);return;}if(super.get(key)===value){this.ready.set(key,asset);this.trim();}},()=>{});
  else{this.ready.set(key,value);this.trim();}
  return this;
 }
 delete(key){this.ready.delete(key);return super.delete(key);}
 trim(){
  const newest=[...this.keys()].at(-1);
  for(const [key]of this){if(this.size<=this.limit)break;const asset=this.ready.get(key);if(key===newest||!asset||this.pinned(asset))continue;super.delete(key);this.ready.delete(key);this.release(asset);this.evictions++;}
 }
 pinned(asset){
  if(asset===this.active())return true;
  for(const element of [asset.video,asset.audio,asset.image]){
   if(!element)continue;
   if(element.isConnected&&!element.hidden)return true;
   if('paused'in element&&!element.paused&&!element.ended)return true;
  }
  return false;
 }
 dispose(){if(this.closed)return;this.closed=true;for(const asset of this.ready.values())this.release(asset);this.ready.clear();super.clear();}
}
export function releaseMedia(asset){
 asset.texture?.dispose?.();
 for(const item of [asset.video,asset.audio])if(item){item.pause();item.removeAttribute('src');item.load();item.remove?.();}
}
export function bufferedForLookahead(video){
 if(!video||video.ended)return true;
 if(video.readyState<3||!Number.isFinite(video.duration))return false;
 for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime+.05&&video.buffered.end(i)>=Math.min(video.duration-.05,video.currentTime+2))return true;
 return false;
}

// Only the author-selected next media, never another chapter. One preparation at a time.
// No play(), no changed progress, and failures stay silent until actual navigation retries.
export function createLookahead(prepare,{schedule=setTimeout,cancel=clearTimeout,visible=()=>!document.hidden,allow=()=>!navigator.connection?.saveData}={}){
 let timer=null,epoch=0,closed=false,running=false,pending=[];
 const pump=()=>{
  if(closed||running||!pending.length||!visible()||!allow())return;
  const key=pending.shift();running=true;
  Promise.resolve().then(()=>prepare(key)).catch(()=>{}).finally(()=>{running=false;if(!closed&&pending.length)timer=schedule(pump,350);});
 };
 return {
  next(keys){epoch++;if(timer!==null)cancel(timer);pending=[...new Set(keys.filter(Boolean))].slice(0,1);const ticket=epoch;timer=schedule(()=>{timer=null;if(ticket===epoch)pump();},800);},
  dispose(){closed=true;epoch++;pending=[];if(timer!==null)cancel(timer);}
 };
}
