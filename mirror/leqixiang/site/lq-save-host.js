/*
 * Host side of the storage protocols the 乐启享 courseware uses.
 *
 * Two of the mirrored works keep their state in the page that hosts them:
 * 长征 stores one checkpoint per chapter, 高考题库 stores five question
 * banks. Both announce themselves with a "<protocol>:ready" message and
 * wait for a "<protocol>:connect" answer that carries a MessagePort.
 *
 * The published site hands this job to a hosted module; the local copy
 * keeps the same contract and stores everything in localStorage.
 */
const LONG_MARCH = 'turing-long-march-save-v1';
const PK180 = 'turing-pk180-banks-v1';
const BANK_KEY = 'leqixiang.pk180.banks';
const SAVE_KEY = 'leqixiang.turing.save';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* A full or blocked storage must not break the lesson. */
  }
}

/* ------------------------------------------------- 长征 lesson state --- */

function longMarchValues(allowed) {
  const stored = readJson(SAVE_KEY, {});
  const values = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!allowed || allowed.includes(key)) {
      if (typeof value === 'string') values[key] = value;
    }
  }
  return values;
}

function applySavePatch(values, patch, allowed) {
  if (!patch || !allowed.includes(patch.key) || !['set', 'remove'].includes(patch.op)) {
    throw Error('INVALID_SAVE');
  }
  if (patch.op === 'set' && (typeof patch.value !== 'string' || patch.value.length > 4096)) {
    throw Error('INVALID_SAVE');
  }
  const next = { ...values };
  if (patch.op === 'remove') delete next[patch.key];
  else next[patch.key] = patch.value;
  return next;
}

/* --------------------------------------------------- 高考题库 state --- */

const MAX_BYTES = 8 * 1024 * 1024;
const fail = (code) => {
  throw Error(code);
};
const text = (value, max) => (typeof value === 'string' && value.length <= max ? value : fail('INVALID_BANK'));
const record = (v) => v && typeof v === 'object' && !Array.isArray(v);

function cleanBank(value) {
  if (!record(value) || !Array.isArray(value.questions) || !value.questions.length || value.questions.length > 500) {
    fail('INVALID_BANK');
  }
  const name = text(value.name, 80).trim();
  if (!name) fail('INVALID_BANK');
  const questions = value.questions.map((q) => {
    if (!record(q) || !['mc', 'fitb'].includes(q.type) || !Array.isArray(q.options) || q.options.length > 8) {
      fail('INVALID_BANK');
    }
    const result = { type: q.type, q: text(q.q, 4000), options: q.options.map((v) => text(v, 2000)) };
    if (q.type === 'mc') {
      if (q.options.length < 2 || !Number.isInteger(q.ans) || q.ans < 0 || q.ans >= q.options.length) {
        fail('INVALID_BANK');
      }
      result.ans = q.ans;
    } else result.ansText = text(q.ansText, 4000);
    return result;
  });
  const images = {};
  if (value.images !== undefined) {
    if (!record(value.images) || Object.keys(value.images).length > questions.length) fail('INVALID_BANK');
    for (const [key, image] of Object.entries(value.images)) {
      if (!/^(0|[1-9]\d{0,2})$/.test(key) || Number(key) >= questions.length ||
          typeof image !== 'string' || image.length > 2 * 1024 * 1024 ||
          !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) fail('INVALID_BANK');
      images[key] = image;
    }
  }
  const bank = { name, questions, images };
  if (JSON.stringify(bank).length > MAX_BYTES) fail('BANK_TOO_LARGE');
  return bank;
}

const emptyBankState = () => ({ version: 1, revision: 0, slots: Array(5).fill(null), trash: [] });

function cleanBankState(value) {
  if (!record(value) || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
      !Array.isArray(value.slots) || value.slots.length !== 5 || !Array.isArray(value.trash) || value.trash.length > 5) {
    fail('STORAGE_CORRUPT');
  }
  const result = {
    version: 1,
    revision: value.revision,
    slots: value.slots.map((v) => (v === null ? null : cleanBank(v))),
    trash: value.trash.map(cleanBank),
  };
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_BYTES) fail('BANK_TOO_LARGE');
  return result;
}

function bankTransition(current, request) {
  const state = cleanBankState(current);
  if (!record(request) || request.revision !== state.revision) fail('CONFLICT');
  const index = request.slot;
  const slot = () => {
    if (!Number.isInteger(index) || index < 0 || index >= 5) fail('INVALID_BANK');
    return index;
  };
  switch (request.op) {
    case 'save':
      if (state.slots[slot()] !== null) fail('SLOT_OCCUPIED');
      state.slots[index] = cleanBank(request.bank);
      break;
    case 'rename':
      if (!state.slots[slot()]) fail('EMPTY_SLOT');
      state.slots[index] = cleanBank({ ...state.slots[index], name: request.name });
      break;
    case 'delete':
      if (!state.slots[slot()]) fail('EMPTY_SLOT');
      if (state.trash.length >= 5) fail('TRASH_FULL');
      state.trash.push(state.slots[index]);
      state.slots[index] = null;
      break;
    case 'restore': {
      const free = state.slots.indexOf(null);
      if (free < 0) fail('SLOTS_FULL');
      if (!Number.isInteger(request.trashIndex) || !state.trash[request.trashIndex]) fail('INVALID_BANK');
      state.slots[free] = state.trash.splice(request.trashIndex, 1)[0];
      break;
    }
    case 'emptyTrash':
      state.trash = [];
      break;
    case 'import': {
      if (!Array.isArray(request.banks) || !request.banks.length || request.banks.length > 5) fail('INVALID_BANK');
      if (state.slots.filter((v) => v === null).length < request.banks.length) fail('SLOTS_FULL');
      for (const bank of request.banks) state.slots[state.slots.indexOf(null)] = cleanBank(bank);
      break;
    }
    default:
      fail('INVALID_OPERATION');
  }
  state.revision++;
  return cleanBankState(state);
}

/* --------------------------------------------------------------- host --- */

export function mountSaveHost(frame, id) {
  let stopped = false;
  const seen = new Set();

  const close = () => {
    stopped = true;
    window.removeEventListener('message', ready);
  };

  function handleLongMarch(event, data) {
    const channel = new MessageChannel();
    const allowed = Array.isArray(data.keys) ? data.keys : [];
    const values = longMarchValues(allowed);
    const port = channel.port1;
    port.onmessage = (message) => {
      const d = message.data;
      if (stopped) return;
      if (d && d.control === 'checkpoint') {
        port.postMessage({ control: 'checkpoint-result', id: d.id, ok: true });
        return;
      }
      if (!d || !Number.isSafeInteger(d.id)) return;
      try {
        const stored = readJson(SAVE_KEY, {});
        const next = applySavePatch(stored, d, allowed.length ? allowed : Object.keys(stored));
        writeJson(SAVE_KEY, next);
        port.postMessage({ id: d.id, ok: true });
      } catch (error) {
        port.postMessage({ id: d.id, ok: false, error: error.message === 'INVALID_SAVE' ? 'INVALID_SAVE' : 'SAVE_UNAVAILABLE' });
      }
    };
    event.source.postMessage(
      { type: LONG_MARCH + ':connect', nonce: data.nonce, values },
      '*',
      [channel.port2]
    );
  }

  function handlePk180(event, data) {
    const channel = new MessageChannel();
    const port = channel.port1;
    port.onmessage = (message) => {
      const d = message.data;
      if (stopped || !d || !Number.isSafeInteger(d.id)) return;
      if (d.op === 'reopen') {
        window.location.reload();
        return;
      }
      try {
        const current = readJson(BANK_KEY, null);
        const state = cleanBankState(current || emptyBankState());
        const next = d.op === 'read' ? state : bankTransition(state, d);
        if (d.op !== 'read') writeJson(BANK_KEY, next);
        port.postMessage({ id: d.id, ok: true, state: next });
      } catch (error) {
        port.postMessage({ id: d.id, ok: false, error: error.message || 'STORAGE_UNAVAILABLE' });
      }
    };
    event.source.postMessage({ type: PK180 + ':connect', nonce: data.nonce }, '*', [channel.port2]);
  }

  function ready(event) {
    if (stopped || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;
    if (data.type !== LONG_MARCH + ':ready' && data.type !== PK180 + ':ready') return;
    if (typeof data.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(data.nonce)) return;
    if (seen.has(data.nonce)) return;
    seen.add(data.nonce);
    if (seen.size > 64) return;
    if (data.type === LONG_MARCH + ':ready') handleLongMarch(event, data);
    else handlePk180(event, data);
  }

  window.addEventListener('message', ready);
  return close;
}
