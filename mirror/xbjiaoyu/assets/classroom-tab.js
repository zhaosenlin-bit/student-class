// A stable refresh identity, with a live-document handshake for duplicated tabs.
// This identifier is not an authorization token; the server owns the lease.
export function createClassroomTab({makeId,sessionStore,transportFactory,settleMs=180}={}){
  const key='classroom-tab';
  if(!sessionStore){try{sessionStore=globalThis.sessionStorage;}catch{}}
  const read=()=>{try{return sessionStore?.getItem(key);}catch{return null;}};
  const save=()=>{try{sessionStore?.setItem(key,id);}catch{}};
  const instance=makeId();let id=read()||makeId(),transport=null,stable=false,suspended=false;
  let timer=null,retryTimer=null,pendingResolve=null,ready;
  const send=message=>transport?.send({...message,id,instance});
  const finish=()=>{clearTimeout(timer);clearTimeout(retryTimer);stable=true;save();pendingResolve?.(id);pendingResolve=null;};
  const settle=()=>{clearTimeout(timer);timer=setTimeout(finish,settleMs);};
  function receive(message){
    if(suspended||!message||message.instance===instance||message.id!==id)return;
    if(message.type==='claim'){
      // In simultaneous startup, only one contender keeps the inherited ID.
      if(stable||instance<message.instance)send({type:'occupied',target:message.instance});
    }else if(message.type==='occupied'&&message.target===instance&&!stable){id=makeId();save();send({type:'claim'});settle();}
  }
  function defaultTransport(callback){
    if(typeof globalThis.BroadcastChannel==='function'){
      try{const channel=new BroadcastChannel('xiaobai-classroom-documents');channel.onmessage=e=>callback(e.data);return{send:value=>channel.postMessage(value),close:()=>channel.close()};}catch{}
    }
    try{
      const signal='xiaobai-classroom-signal',storage=globalThis.localStorage;
      storage.setItem(signal,'{}');storage.removeItem(signal);
      const listener=e=>{if(e.key===signal&&e.newValue){try{callback(JSON.parse(e.newValue));}catch{}}};
      globalThis.addEventListener('storage',listener);
      return{send:value=>{try{storage.setItem(signal,JSON.stringify({...value,stamp:makeId()}));storage.removeItem(signal);}catch{}},close:()=>globalThis.removeEventListener('storage',listener)};
    }catch{return null;}
  }
  function resume(){
    transport?.close();clearTimeout(timer);clearTimeout(retryTimer);suspended=false;stable=false;
    transport=(transportFactory||defaultTransport)(receive);
    ready=new Promise(resolve=>{pendingResolve=resolve;});
    if(!transport){id=makeId();finish();return ready;}
    send({type:'claim'});retryTimer=setTimeout(()=>send({type:'claim'}),Math.floor(settleMs/2));settle();return ready;
  }
  function suspend(){suspended=true;stable=false;clearTimeout(timer);clearTimeout(retryTimer);transport?.close();transport=null;pendingResolve?.(id);pendingResolve=null;}
  resume();
  return{get id(){return id;},get ready(){return ready;},resume,suspend};
}
