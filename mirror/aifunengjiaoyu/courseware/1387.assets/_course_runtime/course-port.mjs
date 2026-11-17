// Generic compatibility port; authored naming aliases stay in the course adapter.
export function createCoursePort(client,{controller,resolveDestination,returnDestination,report,schedule=setTimeout,cancel=clearTimeout}){
 let timer=null,ending=false,departure=null,target=null,lastError=null;
 const show=error=>{lastError=error.message;report(lastError);};
 const flush=async()=>{try{await client.flush();lastError=null;report('saved');}catch(error){show(error);}};
 const changed=()=>{if(ending||client.status()==='closed')return;if(timer!==null)cancel(timer);timer=schedule(()=>{timer=null;void flush();},250);};
 const storage=Object.freeze({
  getItem:key=>client.storage.getItem(key),key:index=>client.storage.key(index),get length(){return client.storage.length;},
  setItem(key,value){client.storage.setItem(key,value);changed();},
  removeItem(key){client.storage.removeItem(key);changed();},clear(){client.storage.clear();changed();}
 });
 function leave(destination){
  if(departure)return departure;
  ending=true;target=destination;if(timer!==null){cancel(timer);timer=null;}
  departure=Promise.resolve().then(async()=>{
   controller().dispose(); // Final authored checkpoint and terminal cleanup happen while storage is live.
   await client.navigate(destination); // Flush final writes, then receive host navigation acknowledgement.
   lastError=null;client.close(); // Parent may detach only after the acknowledged departure closes.
  }).catch(show).finally(()=>{departure=null;});
  return departure;
 }
 return Object.freeze({
  storage,settings:()=>client.status()==='closed'?{volume:0,muted:true}:client.settings(),paused:()=>false,
  navigate(raw){try{return leave(resolveDestination(raw));}catch(error){show(error);return Promise.resolve();}},
  returnToMap:()=>leave(returnDestination),
  updateSettings(){report('HOST_AUDIO_ONLY');},
  ready:()=>report('chapter-ready'),error:message=>report('CHAPTER_ERROR: '+String(message).slice(0,500)),
  async retry(){
   if(['TIMEOUT','OUTCOME_UNKNOWN'].includes(lastError))throw Error('RECONCILE_REQUIRED');
   if(ending)return leave(target);return flush();
  }
 });
}
