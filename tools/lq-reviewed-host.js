/*
 * The host side of the chapter runtime, written into the entry page of a
 * chapter course.
 *
 * A chapter course boots inside a frame and talks to the page around it
 * over a message port: the frame asks to be let in, the page answers with
 * a snapshot of the saved progress and a list of the places the chapter
 * may go.  On the published site that answer comes from a session server.
 * Here there is no server, so the page answers for itself: it reads the
 * adapter that ships with the course, keeps the progress in the browser's
 * own storage, and lets the chapter change to another chapter of the same
 * course.
 *
 * The placeholders are filled in when the entry page is written:
 *   %%PROGRAM%%   the number of the course
 *   %%RUNTIME%%   the address of the course's own runtime folder
 */
import { registerFrame } from '%%RUNTIME%%message-bridge.mjs';
import { prepareReviewedSession } from '%%RUNTIME%%reviewed-session.mjs';

const PROGRAM = '%%PROGRAM%%';
const select = document.getElementById('chapter');
const frame = document.getElementById('frame');
const openButton = document.getElementById('open');

/* A short trace of the handshake, for when the bridge misbehaves. */
const debug = new URLSearchParams(location.search).has('lqdebug');
const trace = (...args) => {
  if (debug) console.log('[lq-host]', ...args);
};
if (debug) {
  window.addEventListener('message', (event) => {
    trace('message', event.data && event.data.type, event.data && event.data.v);
  });
  frame.addEventListener('load', () => trace('frame load', Math.round(performance.now())));
}

/* The adapter names every chapter of the course and where it lives. */
let adapter = null;
try {
  adapter = await (await fetch('%%RUNTIME%%adapter.json')).json();
} catch {
  adapter = null;
}

const chapters = (adapter?.entries || []).map((entry) => ({
  id: entry.id,
  path: entry.path,
  keys: entry.keys || [],
  title: entry.title || entry.id,
}));
const byPath = new Map(chapters.map((entry) => [entry.path, entry]));
const declaration = {
  schema: 'turing-reviewed-runtime/v1',
  entries: chapters.map((entry) => ({
    id: entry.id,
    path: entry.path,
    keys: entry.keys,
    destinations: chapters.map((other) => other.id),
  })),
};

const digest = String(adapter?.runtimeDigest || '');
const policyDigest = /^[0-9a-f]{64}$/i.test(digest) ? digest : '0'.repeat(64);
const revision = /^[a-zA-Z0-9_.:-]{1,96}$/.test(digest) ? digest.slice(0, 64) : 'local';

let host = null;
let opening = null;

/* Answer the frame that asks to be let in, and keep its progress here. */
async function prepare(chapter) {
  const previous = host;
  trace('prepare', chapter.id, Math.round(performance.now()));
  const session = await prepareReviewedSession({
    declaration,
    context: {
      environment: 'local',
      principalId: 'leqixiang',
      programId: PROGRAM,
      revision,
      policyDigest,
      chapter: chapter.id,
      session: crypto.randomUUID(),
    },
    storage: localStorage,
    locks: navigator.locks,
    authorize: async () => true,
    isCurrent: () => true,
    onNavigate: async (target) => {
      if (!target || !byPath.has(target.path)) return;
      await show(`/api/program-assets/${PROGRAM}/${target.path}`);
    },
  });
  host = registerFrame(window, frame, {
    ...session.hostOptions,
    onSession: () => {
      /* The old frame has been replaced; let go of its port. */
      if (previous && previous !== host) previous.close();
    },
  });
  trace('prepared', chapter.id, Math.round(performance.now()));
}

/* Show a chapter. The frame is only told to load once the host is ready
   for it, so the handshake is never missed. */
async function show(url) {
  const rel = url.replace(/^.*\/api\/program-assets\/[^/]+\//, '');
  const chapter = byPath.get(rel);
  if (!chapter) {
    frame.src = url;
    return;
  }
  opening = (opening || Promise.resolve())
    .then(() => prepare(chapter))
    .catch(() => {})
    .then(() => {
      trace('set src', url, Math.round(performance.now()));
      frame.src = url;
    });
  return opening;
}

select.addEventListener('change', () => {
  void show(select.value);
});
openButton.addEventListener('click', () => {
  void show(select.value);
});

void show(select.value);
