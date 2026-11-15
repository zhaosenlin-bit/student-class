// Trusted website host only. No credentials or account identifier cross the port.
export function browserAccount() {
  try { return localStorage.getItem('aiedu_token') ? String(JSON.parse(localStorage.getItem('aiedu_user') || 'null')?.wechatId || '') : ''; }
  catch { return ''; }
}
export function validReady(event, frame, policy, programId) {
  const d = event.data;
  return event.source === frame.contentWindow && event.origin === 'null' &&
    d?.type === policy.protocol + ':ready' && d.programId === programId &&
    [policy.revision,...(policy.compatibleRevisions||[])].includes(d.revision) && d.entry === 'index.html' && /^[a-f0-9]{32}$/.test(d.nonce || '');
}
export function applySavePatch(values, patch, keys) {
  if (!patch || !keys.includes(patch.key) || !['set','remove'].includes(patch.op) ||
      (patch.op === 'set' && (typeof patch.value !== 'string' || patch.value.length > 4096))) throw Error('INVALID_SAVE');
  const next = {...values};
  if (patch.op === 'remove') delete next[patch.key]; else next[patch.key] = patch.value;
  return next;
}
export function validWrite(message, serial) {
  try { return message && Number.isSafeInteger(message.id) && message.id === serial + 1 && message.id <= 20000 && JSON.stringify(message).length <= 6000; }
  catch { return false; }
}
export async function mountLongMarchSaveHost(frame, account, getAccount = browserAccount, versionSession = null) {
  const initialSrc = frame.getAttribute('src'), url = new URL(initialSrc, location.href);
  const versioned=versionSession!==null;
  const match = versioned ? /^\/api\/reviewed-course-assets\/[a-f0-9]{48}\/[a-f0-9]{48}\/index.html$/.test(url.pathname)&&[498,754].includes(versionSession.programId)&&url.pathname===versionSession.prefix+'index.html'?[null,String(versionSession.programId)]:null : /^\/api\/program-file\/(498|754)(?:\/body)?$/.exec(url.pathname);
  if (!match || url.origin !== location.origin || frame.sandbox.contains('allow-same-origin') || !account || getAccount() !== account) throw Error('SAVE_HOST_SCOPE');
  const programId = Number(match[1]);
  const [response, module] = await Promise.all([fetch('/course-compat/long-march-save-policy.json', {cache:'no-store'}), import('/admin-large/runtime/local-store.mjs')]);
  if (!response.ok) throw Error('SAVE_HOST_POLICY');
  let policy = await response.json();
  if(versioned){
    if(typeof versionSession.authorize!=='function'||!/^[a-f0-9]{32}$/.test(versionSession.revision)||
      versionSession.policy?.schema!==policy.schema||versionSession.policy?.revision!==policy.revision||versionSession.policy?.protocol!==policy.protocol||
      JSON.stringify(versionSession.policy?.keys)!==JSON.stringify(policy.keys))throw Error('SAVE_HOST_POLICY');
    policy={...policy,compatibleRevisions:[versionSession.revision]};
    await versionSession.authorize();
  }
  // policy.revision is the stable save family. Compatible content revisions
  // share these exact legacy keys, including when reverting the content selector.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([account, programId, policy.schema, policy.revision])));
  const namespace = 'turing.longMarch.save.v1:' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
  const store = module.createLocalStore({storage:localStorage, locks:navigator.locks, namespace, keys:policy.keys, initial:{}});
  let stopped = false, port, connected = false, nonce, epoch = 0, version, serial = 0, chain = Promise.resolve(), checkpoint, fault;
  const session = crypto.randomUUID(), generation = crypto.randomUUID(), seenNonces = new Set();
  const current = () => !stopped && frame.isConnected && frame.getAttribute('src') === initialSrc && !frame.sandbox.contains('allow-same-origin') && getAccount() === account;
  function close() {
    stopped = true; port?.close(); observer.disconnect();
    if(checkpoint){clearTimeout(checkpoint.timer);checkpoint.reject(Error('SESSION_CHANGED'));checkpoint=null;}
    window.removeEventListener('message', ready); window.removeEventListener('storage', changed); window.removeEventListener('pagehide', close);
  }
  function changed(e) { if (['aiedu_user','aiedu_token'].includes(e.key) && !current()) close(); }
  const observer = new MutationObserver(() => { if (!current()) close(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  observer.observe(frame,{attributes:true,attributeFilter:['src','sandbox']});
  function ready(event) {
    if (!current() || fault || !validReady(event,frame,policy,programId) || versioned&&event.data.revision!==versionSession.revision || seenNonces.has(event.data.nonce) || seenNonces.size >= 64) return;
    seenNonces.add(event.data.nonce);
    const hadDocument = nonce !== undefined;
    nonce = event.data.nonce;
    const attempt = ++epoch;
    connected = false;
    if (port) { port.onmessage = null; port.close(); }
    if (checkpoint) { clearTimeout(checkpoint.timer); checkpoint.reject(Error('SESSION_CHANGED')); checkpoint = null; }
    const hydrate = () => {
    if (!current() || fault || attempt !== epoch) return;
    connected = true; serial = 0;
    const channel = new MessageChannel(); const activePort = channel.port1; port = activePort;
    activePort.onmessage = e => {
      if (attempt !== epoch) return;
      const d = e.data;
      if (!current()) { close(); return; }
      if(d?.control==='checkpoint-result'){
        // A timed-out request can still reply later. It is control traffic,
        // never a numbered save write and must not revoke the active bridge.
        if(checkpoint&&d.id===checkpoint.id){clearTimeout(checkpoint.timer);d.ok?checkpoint.resolve():checkpoint.reject(Error(['VERSION_CONFLICT','SAVE_TIMEOUT'].includes(d.error)?d.error:'SAVE_UNAVAILABLE'));checkpoint=null;}
        return;
      }
      if (!validWrite(d,serial)) { close(); return; }
      serial = d.id;
      chain = chain.then(async () => {
        if (!current()) throw Error('SESSION_CHANGED');
        const before = store.read();
        const values = applySavePatch(before.values,d,policy.keys);
        if (before.version !== version) {
          // A stale viewer may acknowledge bytes already durable in the current
          // record. Do not advance its version: subsequent changes must still
          // conflict, rather than gaining authority over unseen newer progress.
          const unchanged = d.op === 'remove' ? !Object.hasOwn(before.values,d.key) :
            Object.hasOwn(before.values,d.key) && before.values[d.key] === d.value;
          if (!unchanged) throw Error('VERSION_CONFLICT');
          if(versioned)await versionSession.authorize();
          if (current() && attempt === epoch) activePort.postMessage({id:d.id,ok:true});
          return;
        }
        const next = await store.commit(values, {
          expectedVersion:version,writer:{session,generation},isCurrent:current,
          ...(versioned?{beforeCommit:()=>versionSession.authorize()}: {})
        });
        version = next.version;
        if (current() && attempt === epoch) activePort.postMessage({id:d.id,ok:true});
      }).catch(error => { fault = error; if (current() && attempt === epoch) activePort.postMessage({id:d.id,ok:false,error:['VERSION_CONFLICT','INVALID_SAVE'].includes(error.message)?error.message:'SAVE_UNAVAILABLE'}); close(); });
    };
    try {
      const state = store.read(); version = state.version;
      event.source.postMessage({type:policy.protocol+':connect',nonce:event.data.nonce,values:state.values},'*',[channel.port2]);
    } catch { event.source.postMessage({type:policy.protocol+':unavailable',nonce:event.data.nonce},'*'); close(); }
    };
    // Only writes already accepted by the host can be drained after document
    // replacement. Hydrate from the durable record, without copying stale values.
    if(versioned)chain.then(()=>versionSession.authorize()).then(hydrate).catch(()=>close());
    else if (hadDocument) chain.then(hydrate).catch(() => close()); else hydrate();
  }
  if (!current()) { close(); throw Error('SESSION_CHANGED'); }
  window.addEventListener('message',ready); window.addEventListener('storage',changed); window.addEventListener('pagehide',close);
  function requestCheckpoint(){
    if(!current())return Promise.reject(Error('SAVE_UNAVAILABLE'));
    if(checkpoint)return checkpoint.promise;
    if(!connected)return Promise.resolve();
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const id=crypto.randomUUID(),timer=setTimeout(()=>{checkpoint=null;reject(Error('SAVE_TIMEOUT'));},5000);
    checkpoint={id,timer,resolve,reject,promise};port.postMessage({control:'checkpoint',id});return promise;
  }
  return {close,flush:async()=>{await chain;if(fault)throw fault;},checkpoint:requestCheckpoint};
}
