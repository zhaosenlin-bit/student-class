// Stream long environmental recordings; keep one active layer across dialogue changes.
export class AmbiencePlayer{
 constructor(){this.cache=new Map();this.current=null;this.enabled=true;this.paused=false;this.unlocked=false;this.blocked=false;this.starts=0;this.error=null;this.disposed=false;}
 select(cue,paused=false){
  this.paused=paused;
  if(this.current?.id!==cue?.clipId){
   this.current?.audio.pause();this.current=null;this.blocked=false;this.error=null;
   if(cue){let audio=this.cache.get(cue.clipId);if(!audio){audio=new Audio(new URL(cue.asset,document.baseURI));audio.preload='metadata';audio.loop=cue.loop!==false;audio.dataset.ambience=cue.clipId;this.cache.set(cue.clipId,audio);audio.addEventListener('error',()=>{if(this.current?.audio===audio)this.error='环境声未能加载';});}this.current={id:cue.clipId,audio};}
  }
  if(cue&&this.current)this.current.audio.volume=cue.volume;
  this.sync();
 }
 setEnabled(enabled){this.enabled=!!enabled;this.sync();}
 unlock(){this.unlocked=true;this.blocked=false;if(this.error){this.error=null;this.current?.audio.load();}this.sync();}
 shouldPlay(audio){return !this.disposed&&this.current?.audio===audio&&this.enabled&&!this.paused&&this.unlocked;}
 sync(){
  const audio=this.current?.audio;if(!audio)return;
  if(!this.shouldPlay(audio)){audio.pause();return;}
  if(!audio.paused||this.blocked||this.pending===audio)return;
  this.pending=audio;audio.play().then(()=>{if(!this.shouldPlay(audio))audio.pause();else{this.starts++;this.error=null;}}).catch(error=>{if(this.current?.audio!==audio)return;if(error.name==='NotAllowedError')this.blocked=true;else if(error.name!=='AbortError')this.error='环境声未能播放';}).finally(()=>{if(this.pending===audio)this.pending=null;});
 }
 rewind(){for(const audio of this.cache.values())audio.currentTime=0;}
 inspect(){const audio=this.current?.audio;return {clipId:this.current?.id||null,enabled:this.enabled,paused:this.paused,unlocked:this.unlocked,blocked:this.blocked,playing:!!audio&&!audio.paused,position:audio?.currentTime||0,duration:Number.isFinite(audio?.duration)?audio.duration:0,volume:audio?.volume||0,src:audio?.currentSrc||'',loop:!!audio?.loop,starts:this.starts,error:this.error,activeLayers:[...this.cache.values()].filter(a=>!a.paused).length};}
 dispose(){this.disposed=true;for(const audio of this.cache.values()){audio.pause();audio.removeAttribute('src');audio.load();}this.cache.clear();this.current=null;}
}
