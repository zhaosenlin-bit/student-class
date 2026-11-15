// Trusted parent only. A lease refresh never changes the original course,
// policy or access class, and never remounts the course's running iframe.
const keys=['programId','revision','checkpointSha256','policyDigest','policyVersion','accessType','expiresAt'];
const fail=()=>{throw Error('PUBLIC_LEASE');};
function capture(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)fail();
 const ds=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(ds).length!==keys.length||keys.some(k=>!Object.hasOwn(ds[k]||{},'value')))fail();
 const result=Object.fromEntries(keys.map(k=>[k,ds[k].value]));
 if(!Number.isSafeInteger(result.expiresAt)||result.expiresAt<1||!['full','trial'].includes(result.accessType))fail();
 return Object.freeze(result);
}
export function createPublicLease({binding,renew,onStatus=()=>{},now=Date.now,schedule=setTimeout,cancel=clearTimeout}){
 let grant=capture(binding),closed=false,timer=null,tail=Promise.resolve();
 function live(){if(closed)fail();}
 function enqueue(work){const result=tail.then(()=>{live();return work();});tail=result.catch(()=>{});return result;}
 function arm(delay){cancel(timer);if(!closed)timer=schedule(()=>refresh().catch(()=>{}),delay);}
 async function update(){
  live();
  try{
   const response=await renew();live();const next=capture(response.binding);
   if(keys.some(k=>k!=='expiresAt'&&next[k]!==grant[k])||next.expiresAt<grant.expiresAt||next.expiresAt*1000<=now())fail();
   grant=next;onStatus(true);arm(Math.max(1000,grant.expiresAt*1000-now()-120000));return grant;
  }catch(error){if(!closed){
   const revoked=['PUBLIC_LEASE','REVIEWED_PUBLIC_DENIED','REVIEWED_PUBLIC_ORIGIN','访问权限已变化，请重新打开课件'].includes(error?.message);
   if(revoked){closed=true;cancel(timer);}else arm(5000);
   onStatus(false,revoked);
  }throw error;}
 }
 function refresh(){return enqueue(update);}
 arm(Math.max(1000,grant.expiresAt*1000-now()-120000));
 return Object.freeze({
  refresh,
  withBinding(work){return enqueue(async()=>{
   if(grant.expiresAt*1000-now()<90000)await update();
   live();if(grant.expiresAt*1000<=now())fail();return work(grant);
  });},
  close(){closed=true;cancel(timer);}
 });
}
