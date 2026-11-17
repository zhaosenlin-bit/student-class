// Generic local candidate, extracted from the reviewed 2026-09-24 bridge baseline.
// Historical course-specific experiments stay frozen; this module has no course-name dependency.
const nativeTimeout=globalThis.setTimeout.bind(globalThis),nativeClearTimeout=globalThis.clearTimeout.bind(globalThis);
// Local candidate only. No entitlement, URL proxy, production storage or source-course patching.
const VERSION=1,MAX_KEYS=64,MAX_VALUE=4096,MAX_STATE=32768,MAX_MESSAGE=65536;
const encoder=new TextEncoder();
const fail=code=>{throw Error(code);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function exact(value,keys){return object(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));}
function bounded(value,max=MAX_MESSAGE){
 const seen=new Set();
 function visit(v,depth){
  if(depth>6)fail('SIZE');
  if(v===null||['string','number','boolean'].includes(typeof v))return;
  if(!object(v)&&!Array.isArray(v)||seen.has(v))fail('SHAPE');
  seen.add(v);if(Object.keys(v).length>128)fail('SIZE');for(const x of Object.values(v))visit(x,depth+1);
 }
 visit(value,0);if(encoder.encode(JSON.stringify(value)).length>max)fail('SIZE');return value;
}
function identity(value){
 if(!exact(value,['programId','revision','chapter','session','generation'])||
  Object.values(value).some(v=>typeof v!=='string'||!/^[a-zA-Z0-9_.:-]{1,96}$/.test(v)))fail('BINDING');
 return Object.freeze({...value});
}
function keyList(keys){
 if(!Array.isArray(keys)||keys.length>MAX_KEYS||new Set(keys).size!==keys.length||
  keys.some(k=>typeof k!=='string'||!/^[a-zA-Z0-9_.:-]{1,96}$/.test(k)||['__proto__','constructor','prototype'].includes(k)))fail('KEY');
 return Object.freeze([...keys]);
}
function values(value,keys){
 if(!object(value))fail('STATE');const result=Object.create(null);
 for(const [key,item]of Object.entries(value)){
  if(!keys.includes(key))fail('KEY');
  if(typeof item!=='string'||item.length>MAX_VALUE)fail('VALUE');result[key]=item;
 }
 bounded(result,MAX_STATE);return result;
}
function audioSettings(value){
 if(!exact(value,['volume','muted'])||!Number.isFinite(value.volume)||value.volume<0||value.volume>1||typeof value.muted!=='boolean')fail('SETTINGS');
 return Object.freeze({...value});
}
function requestId(value){if(!Number.isSafeInteger(value)||value<1)fail('REQUEST');}
function peer(port,{generation,receive,onClose,now=()=>Date.now()}){
 let active=true,out=0,input=0,start=now(),count=0;const listeners=new Set();
 function close(reason='REVOKED',notify=true){
  if(!active)return;
  if(notify&&generation!==undefined)try{port.postMessage({v:VERSION,generation,seq:++out,type:'closed',payload:{}});}catch{}
  active=false;port.onmessage=null;port.onmessageerror=null;port.close();
  onClose(reason);for(const listener of listeners)listener(reason);listeners.clear();
 }
 port.onmessage=event=>{
  if(!active)return;
  try{
   if(now()-start>=1000){start=now();count=0;}if(++count>40)fail('RATE');
   const m=bounded(event.data);
   if(!exact(m,['v','generation','seq','type','payload'])||m.v!==VERSION||
      (generation!==undefined&&m.generation!==generation)||!Number.isSafeInteger(m.seq)||m.seq!==input+1)fail('PROTOCOL');
   if(generation===undefined){if(m.type!=='init')fail('INIT');generation=identity(m.payload.binding).generation;if(m.generation!==generation)fail('BINDING');}
   input=m.seq;if(m.type==='closed'){if(!exact(m.payload,[]))fail('PAYLOAD');close('REVOKED',false);return;}receive(m.type,m.payload);
  }catch{close('PROTOCOL');}
 };
 port.onmessageerror=()=>close('PROTOCOL');port.start?.();
 return {
  send(type,payload){if(!active)fail('CLOSED');const message={v:VERSION,generation,seq:++out,type,payload};bounded(message);port.postMessage(message);},
  close,get active(){return active;},
  onClosed(fn){if(!active)fn('CLOSED');else listeners.add(fn);}
 };
}
function pendingRequests(send,timeoutMs){
 let next=0;const pending=new Map();
 return {
  request(type,payload){
   if(pending.size>=16)return Promise.reject(Error('PENDING_LIMIT'));
   const id=++next;
   return new Promise((resolve,reject)=>{
    const timer=nativeTimeout(()=>{pending.delete(id);reject(Error('TIMEOUT'));},timeoutMs);
    pending.set(id,{resolve,reject,timer});
    try{send(type,{requestId:id,...payload});}catch(e){nativeClearTimeout(timer);pending.delete(id);reject(e);}
   });
  },
  reply(payload){
   if(!exact(payload,['requestId','ok'])&&!exact(payload,['requestId','ok','error']))fail('REPLY');
   requestId(payload.requestId);if(typeof payload.ok!=='boolean'||(payload.ok&&'error'in payload)||(!payload.ok&&payload.error!=='SAVE_FAILED'&&payload.error!=='OPERATION_FAILED'))fail('REPLY');
   const p=pending.get(payload.requestId);if(!p)fail('STALE_REPLY');nativeClearTimeout(p.timer);pending.delete(payload.requestId);
   payload.ok?p.resolve():p.reject(Error(payload.error));
  },
  close(reason){for(const p of pending.values()){nativeClearTimeout(p.timer);p.reject(Error(reason));}pending.clear();}
 };
}
export function createHost({port,binding,keys,snapshot,settings,persist,destinations=[],onNavigate=async()=>{},onStatus=()=>{},timeoutMs=5000,controlTimeoutMs=timeoutMs,now}){
 if(!Number.isSafeInteger(controlTimeoutMs)||controlTimeoutMs<1||controlTimeoutMs>60000)fail('CONTROL_TIMEOUT');
 binding=identity(binding);keys=keyList(keys);snapshot=values(snapshot,keys);settings=audioSettings(settings);
 const allowed=new Set(destinations);if([...allowed].some(v=>typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(v)))fail('DESTINATION');
 if(typeof persist!=='function')fail('PERSIST');
 const abort=new AbortController();let state='initializing',busy=false,lastRequest=0;
 const notify=s=>{state=s;onStatus(s);};
 const requests=pendingRequests((...args)=>wire.send(...args),controlTimeoutMs);
 const wire=peer(port,{generation:binding.generation,now,
  onClose(reason){nativeClearTimeout(initTimer);abort.abort();requests.close(reason);notify('closed');},
  receive(type,payload){
   if(type==='ready'){
    if(state!=='initializing'||!exact(payload,[]))fail('READY');nativeClearTimeout(initTimer);notify('ready');wire.send('accepted',{});return;
   }
   if(type==='reply'){if(state!=='ready')fail('NOT_READY');requests.reply(payload);return;}
   if(state!=='ready'||!['save','navigate'].includes(type))fail('OPERATION');
   if(!exact(payload,type==='save'?['requestId','values']:['requestId','destination']))fail('PAYLOAD');
   requestId(payload.requestId);if(payload.requestId!==lastRequest+1||busy)fail('REQUEST');lastRequest=payload.requestId;
   const data=type==='save'?values(payload.values,keys):payload.destination;
   if(type==='navigate'&&!allowed.has(data))fail('DESTINATION');
   busy=true;
   // The persistence adapter must check signal/binding immediately before its own atomic commit.
   Promise.resolve().then(()=>{if(!wire.active)throw Error('REVOKED');return type==='save'?persist(data,{binding,signal:abort.signal}):onNavigate(data,{binding,signal:abort.signal});})
    .then(()=>{if(wire.active)wire.send('reply',{requestId:payload.requestId,ok:true});},
      ()=>{if(wire.active)wire.send('reply',{requestId:payload.requestId,ok:false,error:type==='save'?'SAVE_FAILED':'OPERATION_FAILED'});})
    .finally(()=>{busy=false;});
  }
 });
 const initTimer=nativeTimeout(()=>wire.close('TIMEOUT'),timeoutMs);
 wire.send('init',{binding,keys,snapshot,settings,destinations:[...allowed]});
 return Object.freeze({
  control(command){if(!['pause','resume','checkpoint'].includes(command))fail('CONTROL');if(state!=='ready')fail('NOT_READY');return requests.request('control',{command});},
  audio(value){value=audioSettings(value);if(state!=='ready')fail('NOT_READY');return requests.request('audio',{settings:value});},
  revoke(){if(wire.active){wire.send('revoke',{});wire.close('REVOKED');}},
  onClosed:wire.onClosed,status:()=>state
 });
}
export function createChild({port,timeoutMs=5000,onControl=async()=>{},onSettings=()=>{},onStatus=()=>{}}){
 const controlAbort=new AbortController(),failedSaveReplies=new WeakSet();let lastControl=0,queuedControls=0;
 let binding,keys=[],cache=Object.create(null),settings,allowed=[],state='initializing',version=0,savedVersion=0,paused=false,controlChain=Promise.resolve(),disposed=false;
 let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const notify=value=>{state=value;onStatus(value);};
 const requests=pendingRequests((...args)=>wire.send(...args),timeoutMs);
 const dispose=()=>{if(!disposed){disposed=true;return Promise.resolve(onControl('dispose',{signal:controlAbort.signal}));}};
 const wire=peer(port,{receive(type,payload){
  if(type==='init'){
   if(binding||!exact(payload,['binding','keys','snapshot','settings','destinations']))fail('INIT');
   binding=identity(payload.binding);keys=keyList(payload.keys);cache=values(payload.snapshot,keys);settings=audioSettings(payload.settings);
   if(!Array.isArray(payload.destinations)||payload.destinations.some(v=>typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(v)))fail('DESTINATION');
   allowed=[...payload.destinations];wire.send('ready',{});return;
  }
  if(!binding)fail('NOT_READY');
  if(type==='accepted'){if(state!=='initializing'||!exact(payload,[]))fail('READY');nativeClearTimeout(initTimer);notify('saved');resolveReady();return;}
  if(type==='revoke'){if(!exact(payload,[]))fail('PAYLOAD');wire.close('REVOKED');return;}
  if(type==='reply'){requests.reply(payload);return;}
  if(type!=='control'&&type!=='audio')fail('OPERATION');
  if(!exact(payload,type==='control'?['requestId','command']:['requestId','settings']))fail('PAYLOAD');
  requestId(payload.requestId);if(payload.requestId!==lastControl+1||++queuedControls>16)fail('REQUEST');lastControl=payload.requestId;
  if(type==='control'&&!['pause','resume','checkpoint'].includes(payload.command))fail('CONTROL');
  const nextSettings=type==='audio'?audioSettings(payload.settings):null;
  controlChain=controlChain.then(async()=>{
   if(!wire.active)return;
   if(type==='audio'){settings=nextSettings;await onSettings({...settings},{signal:controlAbort.signal});}
   else if(payload.command==='checkpoint')await onControl('checkpoint',{signal:controlAbort.signal});
   else if(payload.command==='pause'&&!paused){await onControl('pause',{signal:controlAbort.signal});paused=true;}
   else if(payload.command==='resume'&&paused){await onControl('resume',{signal:controlAbort.signal});paused=false;}
   if(wire.active)wire.send('reply',{requestId:payload.requestId,ok:true});
  }).catch(error=>{
   // Only a validated negative save reply from this child may keep checkpoint alive.
   // Callback errors with the same text, timeout/unknown outcomes and revocation stay terminal.
   if(type==='control'&&payload.command==='checkpoint'&&wire.active&&!controlAbort.signal.aborted&&!outcomeUnknown&&failedSaveReplies.has(error)){
    failedSaveReplies.delete(error);wire.send('reply',{requestId:payload.requestId,ok:false,error:'SAVE_FAILED'});
   }else wire.close('CONTROL_FAILED');
  }).finally(()=>{queuedControls--;});
 },onClose(reason){nativeClearTimeout(initTimer);controlAbort.abort();requests.close(reason);notify('closed');rejectReady(Error(reason));Promise.resolve().then(dispose).catch(()=>{});}});
 const initTimer=nativeTimeout(()=>wire.close('TIMEOUT'),timeoutMs);
 function usable(){if(!wire.active)fail('CLOSED');if(!binding||state==='initializing')fail('NOT_READY');}
 function edit(next){usable();cache=values(next,keys);version++;notify('dirty');}
 const storage=Object.freeze({
  getItem(key){usable();return Object.hasOwn(cache,String(key))?cache[String(key)]:null;},
  setItem(key,value){usable();edit({...cache,[String(key)]:String(value)});},
  removeItem(key){usable();key=String(key);if(!keys.includes(key))fail('KEY');const next={...cache};delete next[key];edit(next);},
  clear(){edit({});},
  key(index){usable();return Object.keys(cache)[Number(index)]??null;},
  get length(){usable();return Object.keys(cache).length;}
 });
 // One bounded API lane for both saves and navigation. Wire-side busy/replay checks stay strict.
 let operationTail=Promise.resolve(),operationCount=0,lastOperation=null,outcomeUnknown=false;
 function enqueue(run,kind,destination){
  try{usable();if(outcomeUnknown)fail('OUTCOME_UNKNOWN');if(operationCount>=16)fail('OPERATION_LIMIT');}
  catch(error){return Promise.reject(error);}
  const entry={kind,destination,promise:null};operationCount++;
  entry.promise=operationTail.then(()=>{
   usable();if(outcomeUnknown)fail('OUTCOME_UNKNOWN');return run();
  }).catch(error=>{if(error.message==='TIMEOUT')outcomeUnknown=true;throw error;})
   .finally(()=>{operationCount--;if(lastOperation===entry)lastOperation=null;});
  operationTail=entry.promise.catch(()=>{});lastOperation=entry;return entry.promise;
 }
 async function flushNow(){
  usable();
  while(version!==savedVersion){
   const current=version;notify('saving');
   try{await requests.request('save',{values:{...cache}});savedVersion=current;if(wire.active)notify(version===current?'saved':'dirty');}
   catch(error){if(error.message==='SAVE_FAILED')failedSaveReplies.add(error);if(wire.active)notify('save-failed');throw error;}
  }
 }
 function navigate(destination){
  try{usable();if(!allowed.includes(destination))fail('DESTINATION');}
  catch(error){return Promise.reject(error);}
  // Only adjacent outstanding navigation intents coalesce; an intervening flush or
  // different destination establishes a new position in API call order.
  if(lastOperation?.kind==='navigate'&&lastOperation.destination===destination)return lastOperation.promise;
  return enqueue(async()=>{await flushNow();await requests.request('navigate',{destination});},'navigate',destination);
 }
 return Object.freeze({
  ready,storage,flush:()=>enqueue(flushNow,'flush'),get binding(){return binding;},settings(){usable();return {...settings};},
  navigate,
  close(){wire.close('REVOKED');},status:()=>state,onClosed:wire.onClosed
 });
}
// Install before setting iframe.src. A frame load retires its old generation and
// sends only a random challenge. Snapshot/port transfer occurs after source+challenge match.
export function registerFrame(win,frame,options){
 let session=null,challenge=null,used=false,closed=false,loaded=false;
 const load=()=>{
  session?.revoke();session=null;challenge=null;if(loaded)return;loaded=true;used=false;
  challenge=win.crypto.randomUUID();frame.contentWindow.postMessage({v:VERSION,type:'hello',challenge},'*');
 };
 const receive=event=>{
  if(closed||used||!challenge||event.source!==frame.contentWindow||event.ports?.length||
   !exact(event.data,['v','type','challenge'])||event.data.v!==VERSION||event.data.type!=='ready'||event.data.challenge!==challenge)return;
  used=true;const channel=new win.MessageChannel();
  session=createHost({...options,port:channel.port1,binding:{...options.binding,generation:win.crypto.randomUUID()}});
  frame.contentWindow.postMessage({v:VERSION,type:'init',challenge},'*',[channel.port2]);
  options.onSession?.(session);
 };
 win.addEventListener('message',receive);frame.addEventListener('load',load);
 return Object.freeze({
  close(){if(closed)return;closed=true;session?.revoke();session=null;challenge=null;win.removeEventListener('message',receive);frame.removeEventListener('load',load);},
  session:()=>session
 });
}
export function connectFrame(win,options={}){
 const timeoutMs=options.timeoutMs??5000;
 return new Promise((resolve,reject)=>{
  let challenge=null,done=false;
  const cleanup=()=>{nativeClearTimeout(timer);win.removeEventListener('message',receive);};
  const receive=event=>{
   if(done||event.source!==win.parent||!exact(event.data,['v','type','challenge'])||event.data.v!==VERSION||
      typeof event.data.challenge!=='string'||event.data.challenge.length>96)return;
   if(event.data.type==='hello'&&!challenge&&!event.ports?.length){
    challenge=event.data.challenge;win.parent.postMessage({v:VERSION,type:'ready',challenge},'*');
   }else if(event.data.type==='init'&&challenge===event.data.challenge&&event.ports?.length===1){
    done=true;cleanup();const client=createChild({...options,port:event.ports[0]});client.ready.then(()=>resolve(client),reject);
   }
  };
  const timer=nativeTimeout(()=>{done=true;cleanup();reject(Error('TIMEOUT'));},timeoutMs);
  win.addEventListener('message',receive);
 });
}
