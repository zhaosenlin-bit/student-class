// Generic local candidate, extracted from the reviewed 2026-09-24 bridge baseline.
// Historical course-specific experiments stay frozen; this module has no course-name dependency.
// Local review persistence only. Cooperating tabs serialize CAS through Web Locks.
export function createLocalStore({storage,locks,namespace,keys,initial}){
 if(!locks||typeof locks.request!=='function')throw Error('LOCKS_UNAVAILABLE');
 const encoder=new TextEncoder();
 const exact=(value,names)=>value&&Object.getPrototypeOf(value)===Object.prototype&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
 const writerValid=value=>exact(value,['session','generation'])&&Object.values(value).every(v=>typeof v==='string'&&/^[a-zA-Z0-9_.:-]{1,96}$/.test(v));
 const allowed=new Set(keys);
 function valuesCopy(values){
  if(!values||Array.isArray(values)||typeof values!=='object')throw Error('LOCAL_RECORD_REVIEW_REQUIRED');
  const entries=Object.entries(values);
  if(entries.length>64||entries.some(([key,value])=>!allowed.has(key)||typeof value!=='string'||value.length>4096)||encoder.encode(JSON.stringify(values)).length>32768)throw Error('LOCAL_RECORD_REVIEW_REQUIRED');
  return Object.fromEntries(entries);
 }
 const initialCopy=valuesCopy(initial);
 function read(){
  const raw=storage.getItem(namespace);
  if(raw===null)return {version:0,values:{...initialCopy},writer:null};
  if(typeof raw!=='string'||encoder.encode(raw).length>33792)throw Error('LOCAL_RECORD_REVIEW_REQUIRED');
  let record;try{record=JSON.parse(raw);}catch{throw Error('LOCAL_RECORD_REVIEW_REQUIRED');}
  if(!exact(record,['version','values','writer'])||!writerValid(record.writer)||!Number.isSafeInteger(record.version)||record.version<1)throw Error('LOCAL_RECORD_REVIEW_REQUIRED');
  return {...record,values:valuesCopy(record.values)};
 }
 function checkContext(context){
  if(context.signal?.aborted||!context.isCurrent?.())throw Error('REVOKED');
  if(!Number.isSafeInteger(context.expectedVersion)||context.expectedVersion<0)throw Error('EXPECTED_VERSION_REQUIRED');
  if(!writerValid(context.writer))throw Error('WRITER_REQUIRED');
 }
 return {
  read,
  async commit(values,context){
   const copy=valuesCopy(values);checkContext(context);
   return locks.request(namespace,{mode:'exclusive',signal:context.signal},async()=>{
    if(context.beforeCommit)await context.beforeCommit();
    checkContext(context);const prior=read();
    if(prior.version!==context.expectedVersion)throw Error('VERSION_CONFLICT');
    if(Object.keys(prior.values).length===Object.keys(copy).length&&Object.entries(copy).every(([k,v])=>prior.values[k]===v))return prior;
    if(!Number.isSafeInteger(prior.version+1))throw Error('VERSION_LIMIT');
    const next={version:prior.version+1,values:copy,writer:context.writer};
    checkContext(context);storage.setItem(namespace,JSON.stringify(next));return next;
   });
  },
  preserve(values,{session,expectedVersion}){
   if(!/^[a-zA-Z0-9-]{1,80}$/.test(session)||!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw Error('RECOVERY_CONTEXT');
   storage.setItem(namespace+'.pending.'+session,JSON.stringify({expectedVersion,values:valuesCopy(values)}));
  }
 };
}
