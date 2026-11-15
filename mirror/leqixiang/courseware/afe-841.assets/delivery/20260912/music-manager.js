// One Web Audio owner for the entire project. Scene code never creates BGM players.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
function curve(up,count=64){return Float32Array.from({length:count},(_,i)=>Math[up?'sin':'cos'](i/(count-1)*Math.PI/2));}
export class AudioManager{
 constructor(config,{onChange=()=>{}}={}){
  this.config=config;this.onChange=onChange;this.context=null;this.master=null;this.analyser=null;this.buffers=new Map();this.groups=new Set();this.current=null;this.desired=null;this.serial=0;this.pending=null;this.enabled=true;this.userVolume=1;this.paused=false;this.unlocked=false;this.events=[];this.starts=0;this.loopCount=0;this.error=null;this.disposed=false;
  this.outputGainDb=clamp(config.defaults.outputGainDb??0,-24,12);this.outputGain=10**(this.outputGainDb/20);
  this.timer=setInterval(()=>this.schedule(),250);
 }
 event(type,detail={}){this.events.push({type,time:this.context?.currentTime||0,...detail});if(this.events.length>160)this.events.shift();this.onChange();}
 createContext(){if(this.context)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('浏览器不支持背景音乐');this.context=new C();this.master=this.context.createGain();this.master.gain.value=this.userVolume*this.outputGain;this.analyser=this.context.createAnalyser();this.analyser.fftSize=2048;this.meter=new Float32Array(this.analyser.fftSize);this.master.connect(this.analyser);this.analyser.connect(this.context.destination);this.context.onstatechange=()=>{if((this.paused||!this.enabled)&&this.context.state==='running')this.context.suspend().catch(()=>{});this.onChange();};}
 async unlock(){if(this.disposed)return;try{this.createContext();this.unlocked=true;if(this.enabled&&!this.paused)await this.context.resume();if(this.disposed)return;this.updateSuspension();this.event('unlock');this.realize();}catch(e){this.error=e.message;this.event('error',{message:e.message});}}
 setEnabled(enabled){this.enabled=!!enabled;this.updateSuspension();if(this.enabled)this.realize();this.onChange();}
 setUserVolume(value){this.userVolume=clamp(value,0,1);if(this.master)this.ramp(this.master.gain,this.userVolume*this.outputGain,.15);this.onChange();}
 setPaused(paused){const next=!!paused;if(this.paused===next)return;this.paused=next;this.updateSuspension();}
 updateSuspension(){if(!this.context)return;if(!this.enabled||this.paused)this.context.suspend().catch(()=>{});else if(this.unlocked)this.context.resume().catch(()=>{});}
 ramp(param,value,seconds){const now=this.context.currentTime,held=param.value;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else param.cancelScheduledValues(now);/* Anchor even a constant gain: cancelAndHold alone may schedule no event. */param.setValueAtTime(held,now);param.linearRampToValueAtTime(value,now+Math.max(.015,seconds));}
 select(cue,offset=0){
  this.desired={...cue,offset};if(this.current?.id===cue.clipId){if(this.pending){++this.serial;this.pending=null;}this.current.cue=this.desired;this.adjust(this.current,cue);return;}this.realize();
 }
 adjust(group,cue){if(group.target===cue.volume)return;const down=cue.volume<(group.target??0),seconds=down?(cue.ducked?Math.min(cue.fadeOut??1.4,this.config.defaults.duckAttack):cue.fadeOut??1.4):(cue.fadeIn??1.4);group.target=cue.volume;this.ramp(group.level.gain,cue.volume,seconds);this.event('level',{clipId:group.id,volume:cue.volume,seconds,sceneId:cue.sceneId});}
 async buffer(id){if(this.buffers.has(id))return this.buffers.get(id);const clip=this.config.clips[id];if(!clip)throw Error('找不到音乐片段：'+id);const promise=fetch(new URL(clip.asset,document.baseURI)).then(r=>{if(!r.ok)throw Error('音乐加载失败：'+r.status);return r.arrayBuffer();}).then(b=>this.context.decodeAudioData(b));this.buffers.set(id,promise);try{return await promise;}catch(e){this.buffers.delete(id);throw e;}}
 async realize(){
  if(!this.unlocked||!this.enabled||!this.context||!this.desired||this.disposed)return;
  const id=this.desired.clipId;if(this.current?.id===id)return;
  if(this.pending===id)return;const token=++this.serial;this.pending=id;
  try{const buffer=await this.buffer(id);if(token!==this.serial||this.disposed||this.desired.clipId!==id)return;
   this.pending=null;const cue=this.desired,now=this.context.currentTime,group={id,buffer,cue,target:cue.volume,voices:[],level:this.context.createGain(),fade:this.context.createGain(),retiring:false,nextStart:0};
   group.level.gain.value=cue.volume;group.fade.gain.value=0;group.level.connect(group.fade);group.fade.connect(this.master);
   const previous=this.current;this.current=group;this.groups.add(group);const offset=clamp(cue.offset,0,buffer.duration-.05);this.voice(group,now+.025,offset,true);this.scheduleGroup(group,now);this.ramp(group.fade.gain,1,cue.fadeIn??1.4);this.starts++;
   if(previous)this.retire(previous,cue.fadeOut??1.4);
   this.error=null;this.event('start',{clipId:id,offset,sceneId:cue.sceneId,previous:previous?.id||null});this.trimCache();
  }catch(e){if(token===this.serial){this.pending=null;this.error=e.message;this.event('error',{clipId:id,message:e.message});}}
 }
 voice(group,start,offset=0,first=false){
  const source=this.context.createBufferSource(),gain=this.context.createGain(),clip=this.config.clips[group.id],duration=group.buffer.duration-offset,overlap=Math.min(clip.loopCrossfade??1.6,duration/3);source.buffer=group.buffer;source.connect(gain);gain.connect(group.level);gain.gain.setValueAtTime(first?1:0,start);
  if(!first)gain.gain.setValueCurveAtTime(curve(true),start,overlap);
  const end=start+duration;
  if(group.cue.loop)gain.gain.setValueCurveAtTime(curve(false),end-overlap,overlap);else gain.gain.setValueCurveAtTime(curve(false),Math.max(start,end-1.2),Math.min(1.2,duration));
  source.start(start,offset);source.stop(end+.015);const voice={source,gain,start,offset,end};group.voices.push(voice);group.nextStart=end-overlap;
  source.onended=()=>{gain.disconnect();source.disconnect();group.voices=group.voices.filter(v=>v!==voice);};
 }
 scheduleGroup(group,now){if(!group.cue.loop||group.retiring)return;let scheduled=0;while(group.nextStart<now+group.buffer.duration+2&&scheduled++<3){this.voice(group,Math.max(now+.015,group.nextStart));this.loopCount++;}}
 schedule(){if(this.disposed||!this.context)return;const now=this.context.currentTime;if(this.current)this.scheduleGroup(this.current,now);for(const group of [...this.groups])if(group.retiring&&now>=group.retireAt)this.stopGroup(group);}
 retire(group,seconds){if(group.retiring)return;group.retiring=true;group.retireAt=this.context.currentTime+Math.max(.02,seconds)+.03;this.ramp(group.fade.gain,0,seconds);for(const v of group.voices){try{v.source.stop(Math.min(v.end+.015,group.retireAt));}catch{}}this.event('crossfade',{from:group.id,to:this.current?.id,seconds});}
 stopGroup(group){for(const v of group.voices){try{v.source.stop();v.source.disconnect();v.gain.disconnect();}catch{}}group.voices=[];group.level.disconnect();group.fade.disconnect();this.groups.delete(group);if(this.current===group)this.current=null;}
 position(){const g=this.current;if(!g||!this.context)return 0;const now=this.context.currentTime,voices=g.voices.filter(v=>v.start<=now&&now<v.end).sort((a,b)=>b.start-a.start);const v=voices[0]||g.voices[0];return v?clamp(v.offset+Math.max(0,now-v.start),0,g.buffer.duration):0;}
 rewind(){++this.serial;this.pending=null;for(const g of [...this.groups])this.stopGroup(g);if(this.desired)this.desired.offset=0;this.realize();this.event('reset');}
 trimCache(){const active=new Set([...this.groups].map(g=>g.id));for(const id of [...this.buffers.keys()])if(this.buffers.size>4&&!active.has(id))this.buffers.delete(id);}
 inspect(){let rms=0,peak=0;if(this.analyser&&this.context?.state==='running'){this.analyser.getFloatTimeDomainData(this.meter);for(const v of this.meter){rms+=v*v;peak=Math.max(peak,Math.abs(v));}rms=Math.sqrt(rms/this.meter.length);}return {unlocked:this.unlocked,enabled:this.enabled,volume:this.userVolume,paused:this.paused,context:this.context?.state||'locked',clipId:this.current?.id||null,requestedClipId:this.desired?.clipId||null,sceneId:this.desired?.sceneId||null,position:this.position(),duration:this.current?.buffer.duration||0,targetVolume:this.current?.target||0,gain:this.current?.level.gain.value||0,starts:this.starts,scheduledLoops:this.loopCount,activeGroups:this.groups.size,voices:[...this.groups].flatMap(g=>g.voices.map(v=>({clipId:g.id,start:v.start,end:v.end,offset:v.offset}))),outputRms:rms,outputPeak:peak,error:this.error,events:[...this.events]};}
 dispose(){this.disposed=true;++this.serial;clearInterval(this.timer);for(const g of [...this.groups])this.stopGroup(g);this.context?.close();}
}
