import {createLocalStore} from './local-store.mjs';

// Trusted parent composition only, never an endpoint accepting course-authored policy.
// A valid declaration is not resource review, entitlement, or upload approval.
const fail = code => { throw Error(code); };
const nativeTimeout=globalThis.setTimeout.bind(globalThis),nativeClearTimeout=globalThis.clearTimeout.bind(globalThis);
export function awaitAbortable(work,signal){
 if(signal?.aborted)return Promise.reject(Error('REVOKED'));
 let cancel;
 const aborted=new Promise((_,reject)=>{cancel=()=>reject(Error('REVOKED'));signal?.addEventListener('abort',cancel,{once:true});});
 return Promise.race([Promise.resolve().then(()=>{if(signal?.aborted)fail('REVOKED');return work();}),aborted])
  .finally(()=>signal?.removeEventListener('abort',cancel));
}
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,96}$/.test(value);
const entryId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
function exact(value, keys) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) fail('DECLARATION');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length || keys.some(key =>
    !Object.hasOwn(descriptors, key) || !Object.hasOwn(descriptors[key], 'value'))) fail('DECLARATION');
  return value;
}
function list(value, max) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) fail('DECLARATION');
  for (let i = 0; i < value.length; i++) {
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, String(i)) || {}, 'value')) fail('DECLARATION');
  }
  return value;
}
function path(value) {
  return typeof value === 'string' && value.length <= 512 && value.normalize('NFC') === value &&
    !/[\\%?#:\u0000-\u0020\u007f-\u009f]/.test(value) &&
    value.split('/').every(part => part && part !== '.' && part !== '..') && /\.html?$/.test(value);
}
export function captureDeclaration(value) {
  exact(value, ['schema', 'entries']);
  if (value.schema !== 'leqixiang-reviewed-runtime/v1') fail('DECLARATION');
  const entries = list(value.entries, 201).map(row => {
    exact(row, ['id', 'path', 'keys', 'destinations']);
    if (!entryId(row.id) || !path(row.path)) fail('ENTRY');
    const keys = [...list(row.keys, 64)], destinations = [...list(row.destinations, 201)];
    if (keys.some(key => !id(key) || forbiddenKeys.has(key)) || new Set(keys).size !== keys.length) fail('KEY');
    if (destinations.some(key => !entryId(key)) || new Set(destinations).size !== destinations.length) fail('DESTINATION');
    return Object.freeze({id: row.id, path: row.path, keys: Object.freeze(keys), destinations: Object.freeze(destinations)});
  });
  if (!entries.length || new Set(entries.map(row => row.id)).size !== entries.length ||
      new Set(entries.map(row => row.path.toLowerCase())).size !== entries.length) fail('ENTRY');
  if (entries.some(row => row.destinations.some(target => !entries.some(entry => entry.id === target)))) fail('DESTINATION');
  return Object.freeze({schema: value.schema, entries: Object.freeze(entries)});
}

function captureContext(value) {
  const keys = ['environment', 'principalId', 'programId', 'revision', 'policyDigest', 'chapter', 'session'];
  exact(value, keys);
  if (keys.some(key => !id(value[key])) || !['local', 'test', 'prod'].includes(value.environment) ||
      !entryId(value.chapter) || !/^[a-f0-9]{64}$/.test(value.policyDigest)) fail('CONTEXT');
  return Object.freeze({...value});
}

export async function prepareReviewedSession({declaration, context, storage, locks, authorize,
  isCurrent, onNavigate, projectSnapshot, settings = {volume: 1, muted: false}, saveDeadlineMs = 3000}) {
  if(!Number.isSafeInteger(saveDeadlineMs)||saveDeadlineMs<1||saveDeadlineMs>3000)fail('SAVE_DEADLINE');
  const captured = captureDeclaration(declaration), owner = captureContext(context);
  const entry = captured.entries.find(row => row.id === owner.chapter);
  if (!entry || [authorize, isCurrent, onNavigate].some(fn => typeof fn !== 'function')) fail('ADAPTER_REQUIRED');
  exact(settings, ['volume', 'muted']);
  if (!Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1 || typeof settings.muted !== 'boolean') fail('SETTINGS');
  settings = Object.freeze({...settings});
  const abort = new AbortController();
  // Delimited JSON prevents aliasing; no raw identity is sent to the child.
  // Revision and policy changes intentionally start a separate local record.
  const namespace = 'leqixiang.course.runtime.v1:' + JSON.stringify([
    owner.environment, owner.principalId, owner.programId, owner.revision, owner.policyDigest, owner.chapter
  ]);
  const current = signal => {
    if (abort.signal.aborted || signal?.aborted || isCurrent(owner) !== true) fail('REVOKED');
  };
  async function operation(signal, work, boundedSave = false) {
    current(signal);
    const combined = new AbortController(), cancel = () => combined.abort();
    abort.signal.addEventListener('abort', cancel, {once: true});
    signal.addEventListener('abort', cancel, {once: true});
    let timer;
    try {
      const pending=work(combined.signal);
      if(!boundedSave)return await pending;
      // Refuse a still-pending lock/authority check before the child's 5s save
      // timeout. The same signal is checked immediately before synchronous write,
      // so late authorization cannot commit after this explicit negative reply.
      const deadline=new Promise((_,reject)=>{timer=nativeTimeout(()=>{combined.abort();reject(Error('SAVE_DEADLINE'));},saveDeadlineMs);});
      return await Promise.race([pending,deadline]);
    }
    finally {nativeClearTimeout(timer);abort.signal.removeEventListener('abort', cancel); signal.removeEventListener('abort', cancel);}
  }
  async function check(operation, target, signal) {
    current(signal);
    if (await awaitAbortable(()=>authorize(Object.freeze({operation, target, context: owner, signal: signal || abort.signal})),signal||abort.signal) !== true) fail('ACCESS_DENIED');
    current(signal);
  }
  await check('open', entry.id);
  const store = createLocalStore({storage, locks, namespace, keys: entry.keys, initial: {}});
  let record = store.read();
  current();
  let snapshot=record.values;
  if(projectSnapshot!==undefined){
    if(typeof projectSnapshot!=='function')fail('ADAPTER_REQUIRED');
    snapshot=await projectSnapshot(Object.freeze({...snapshot}));
    await check('open',entry.id);
    // Reuse the same key/value/byte validator. Projection never writes peer records.
    createLocalStore({storage,locks,namespace,keys:entry.keys,initial:snapshot});
    snapshot={...snapshot};
  }
  const binding = Object.freeze({programId: owner.programId, revision: owner.revision,
    chapter: entry.id, session: owner.session, generation: 'pending'});
  function checkBinding(incoming, signal) {
    current(signal);
    if (!incoming || ['programId', 'revision', 'chapter', 'session'].some(key => incoming[key] !== binding[key]) ||
        !id(incoming.generation)) fail('BINDING');
  }
  return Object.freeze({
    namespace,
    close() { abort.abort(); },
    // Pass these trusted options to registerFrame/createHost. Those own the port
    // and generation. The child cannot select the policy, principal or namespace.
    hostOptions: Object.freeze({
      binding, keys: entry.keys, snapshot: Object.freeze({...snapshot}), settings,
      destinations: entry.destinations,
      async persist(values, {binding: incoming, signal}) {
        return operation(signal, async liveSignal => {
          checkBinding(incoming, liveSignal);
          record = await store.commit(values, {expectedVersion: record.version,
            writer: {session: incoming.session, generation: incoming.generation}, signal: liveSignal,
            beforeCommit: () => check('save', entry.id, liveSignal),
            isCurrent: () => !abort.signal.aborted && isCurrent(owner) === true});
        },true);
      },
      async onNavigate(destination, {binding: incoming, signal}) {
        return operation(signal, async liveSignal => {
          checkBinding(incoming, liveSignal);
          if (!entry.destinations.includes(destination)) fail('DESTINATION');
          const target = captured.entries.find(row => row.id === destination);
          await check('navigate', destination, liveSignal);
          // Adapter stages this declaration, never an authored URL. Detach only
          // after the bridge acknowledges navigation and the child closes. The
          // next mount must call prepareReviewedSession (and authorize open) again.
          await onNavigate(target, Object.freeze({context: owner, signal: liveSignal}));
          current(liveSignal);
        });
      }
    })
  });
}
