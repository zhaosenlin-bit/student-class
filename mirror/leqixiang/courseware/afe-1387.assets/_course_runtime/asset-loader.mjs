// Pace only course audio/MIDI GETs. Never retry entitlement failures.
export function createPacedAssetFetch(fetcher,{interval=200,maxConcurrent=2,schedule=setTimeout,cancel=clearTimeout,now=Date.now}={}){
 let active=0,last=-Infinity,timer=null,closed=false;const queue=[];
 const abortError=()=>Object.assign(new Error('Course asset loading stopped'),{name:'AbortError'});
 function pump(){
  if(closed||timer!==null||!queue.length||active>=maxConcurrent)return;
  const wait=interval-(now()-last);
  if(wait>0){timer=schedule(()=>{timer=null;pump();},wait);return;}
  const job=queue.shift();
  if(job.signal?.aborted){job.reject(job.signal.reason||abortError());pump();return;}
  active++;last=now();
  Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{active--;pump();});pump();
 }
 function enqueue(run,signal){return new Promise((resolve,reject)=>{if(closed||signal?.aborted){reject(signal?.reason||abortError());return;}queue.push({run,signal,resolve,reject});pump();});}
 async function fetchAsset(url,options={}){
  if(options.method&&options.method.toUpperCase()!=='GET')throw Error('COURSE_ASSET_GET_ONLY');
  for(let attempt=0;attempt<3;attempt++){
   const response=await enqueue(async()=>{
    const result=await fetcher(url,options);
    // Keep the slot until media bytes arrive, not merely until headers arrive.
    const bytes=await result.arrayBuffer();
    return new Response(bytes,{status:result.status,statusText:result.statusText,headers:result.headers});
   },options.signal);
   if(response.status!==429||attempt===2)return response;
   const seconds=Number(response.headers.get('retry-after'));
   const backoff=Number.isFinite(seconds)&&seconds>0?Math.min(5000,seconds*1000):500*(attempt+1);
   await new Promise((resolve,reject)=>{
    if(closed||options.signal?.aborted){reject(options.signal?.reason||abortError());return;}
    const id=schedule(()=>{options.signal?.removeEventListener('abort',stop);resolve();},backoff);
    function stop(){cancel(id);reject(options.signal.reason||abortError());}
    options.signal?.addEventListener('abort',stop,{once:true});
   });
  }
 }
 return {fetch:fetchAsset,close(){closed=true;if(timer!==null)cancel(timer);timer=null;for(const j of queue.splice(0))j.reject(abortError());}};
}
