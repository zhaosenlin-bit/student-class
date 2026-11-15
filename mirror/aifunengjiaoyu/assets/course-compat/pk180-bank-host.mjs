import { PROTOCOL, SOURCE_SHA, MAX_BYTES, cleanState, emptyState, transition } from './pk180-bank-model.mjs';

export function openBankStore(indexedDB) {
  let closed = false;
  const opening = new Promise((resolve, reject) => {
    const request = indexedDB.open('turing-course-question-banks-v1', 1);
    const timeout = setTimeout(() => { closed = true; reject(new Error('STORAGE_UNAVAILABLE')); }, 8000);
    request.onupgradeneeded = () => request.result.createObjectStore('banks');
    request.onerror = () => { clearTimeout(timeout); reject(new Error('STORAGE_UNAVAILABLE')); };
    request.onblocked = () => { clearTimeout(timeout); closed = true; reject(new Error('STORAGE_UNAVAILABLE')); };
    request.onsuccess = () => {
      clearTimeout(timeout);
      if (closed) { request.result.close(); return; }
      request.result.onversionchange = () => { closed = true; request.result.close(); };
      resolve(request.result);
    };
  });
  // Transactions serialize compare-and-write across tabs, unlike localStorage.
  async function transact(key, change, stillCurrent = () => true) {
    const db = await opening;
    if (closed || !stillCurrent()) throw Error('SESSION_CHANGED');
    return new Promise((resolve, reject) => {
      const tx = db.transaction('banks', change ? 'readwrite' : 'readonly');
      const store = tx.objectStore('banks');
      let result, failure;
      const read = store.get(key);
      read.onsuccess = () => {
        try {
          if (!stillCurrent()) throw Error('SESSION_CHANGED');
          const current = read.result === undefined ? emptyState() : cleanState(read.result);
          result = change ? transition(current, change) : current;
          if (change) store.put(result, key);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || new Error(tx.error?.name === 'QuotaExceededError' ? 'STORAGE_FULL' : 'STORAGE_UNAVAILABLE'));
      tx.onerror = () => {};
    });
  }
  return { read: key => transact(key), mutate: transact, close() { closed = true; opening.then(db => db.close(), () => {}); } };
}

export function isReadyFromCourse(event, frame) {
  return event.source === frame.contentWindow && event.origin === 'null' &&
    event.data?.type === PROTOCOL + ':ready' && event.data?.source === SOURCE_SHA &&
    typeof event.data?.nonce === 'string' && /^[a-f0-9]{32}$/.test(event.data.nonce);
}

export function currentBrowserAccount() {
  try {
    if (!localStorage.getItem('aiedu_token')) return '';
    return String(JSON.parse(localStorage.getItem('aiedu_user') || 'null')?.wechatId || '');
  } catch { return ''; }
}

export async function mountPk180BankHost(frame, account, getAccount = currentBrowserAccount) {
  if (!frame?.isConnected || !account || account !== getAccount()) throw Error('SESSION_CHANGED');
  const url = new URL(frame.getAttribute('src'), location.href);
  if (url.origin !== location.origin || !/^\/api\/program-file\/180(?:\/body)?$/.test(url.pathname) ||
      frame.sandbox.contains('allow-same-origin')) throw Error('INVALID_FRAME');
  // Storage attachment must not change navigation/loading attributes while
  // the player is already navigating its protected loader.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pk180:' + account));
  const key = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
  if (!frame.isConnected || getAccount() !== account) throw Error('SESSION_CHANGED');
  let store, port, connected = false, stopped = false, armed = false, busy = false, requestCount = 0;
  const current = () => !stopped && frame.isConnected && getAccount() === account;
  function close() {
    stopped = true; window.removeEventListener('message', ready); window.removeEventListener('pagehide', close);
    window.removeEventListener('storage', identityChanged); frame.removeEventListener('load', navigated);
    observer.disconnect(); clearTimeout(armTimer); port?.close(); store?.close();
  }
  function identityChanged(event) { if (event.key === 'aiedu_user' || event.key === 'aiedu_token') { if (!current()) close(); } }
  function navigated() { if (armed) close(); }
  let armTimer;
  function ready(event) {
    if (!current() || connected || !isReadyFromCourse(event, frame)) return;
    connected = true;
    window.removeEventListener('message', ready);
    const channel = new MessageChannel(); port = channel.port1;
    try { store = openBankStore(window.indexedDB); } catch { store = null; }
    port.onmessage = async message => {
      const data = message.data;
      if (!current()) { close(); return; }
      if (!data || !Number.isSafeInteger(data.id) || data.id <= 0 || busy || ++requestCount > 2000) return;
      if (data.op === 'reopen') {
        // An old frame URL expires during a normal lesson. Re-enter the fixed
        // player so the existing login/entitlement flow issues a fresh token;
        // never reuse or pass a platform token through this storage channel.
        close();
        window.location.assign('/play/180');
        return;
      }
      busy = true;
      let reply;
      try {
        if (JSON.stringify(data).length > MAX_BYTES + 8192) throw Error('BANK_TOO_LARGE');
        if (!store) throw Error('STORAGE_UNAVAILABLE');
        const state = data.op === 'read' ? await store.read(key) : await store.mutate(key, data, current);
        reply = { id: data.id, ok: true, state };
      } catch (error) {
        const codes = ['CONFLICT','INVALID_BANK','STORAGE_CORRUPT','BANK_TOO_LARGE','SLOT_OCCUPIED','EMPTY_SLOT','TRASH_FULL','SLOTS_FULL','INVALID_OPERATION','STORAGE_UNAVAILABLE','STORAGE_FULL','SESSION_CHANGED'];
        reply = {id: data.id, ok: false, error: codes.includes(error.message) ? error.message : 'STORAGE_UNAVAILABLE'};
      }
      busy = false;
      if (current()) port.postMessage(reply); else close();
    };
    // The port is sent only to this exact opaque frame; no token, account ID or
    // arbitrary storage-key API is exposed to uploaded HTML.
    event.source.postMessage({type: PROTOCOL + ':connect', nonce: event.data.nonce}, '*', [channel.port2]);
    // The client announces ready after its document load. Subsequent navigation
    // revokes this capability; reopening creates a fresh host connection.
    armTimer = setTimeout(() => { armed = true; }, 0);
  }
  const observer = new MutationObserver(() => { if (!current()) close(); });
  observer.observe(document.documentElement, {childList: true, subtree: true});
  frame.addEventListener('load', navigated); window.addEventListener('message', ready);
  window.addEventListener('pagehide', close); window.addEventListener('storage', identityChanged);
  return close;
}
