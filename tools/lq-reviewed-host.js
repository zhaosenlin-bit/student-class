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
 *   %%SHARED%%    the address of the shared runtime folder
 */
import { registerFrame } from '%%SHARED%%message-bridge.mjs';
import { prepareReviewedSession } from '%%SHARED%%reviewed-session.mjs';

const PROGRAM = '%%PROGRAM%%';
const select = document.getElementById('chapter');
const openButton = document.getElementById('open');
const stage = document.getElementById('stage');

/* The folder that holds the lesson's own files. */
const root = new URL('./assets/', location.href);

/* A short trace of the handshake, for when the bridge misbehaves. */
const debug = new URLSearchParams(location.search).has('lqdebug');
const trace = (...args) => {
  if (debug) console.log('[lq-host]', ...args);
};
if (debug) {
  window.addEventListener('message', (event) => {
    trace('message', event.data && event.data.type, event.data && event.data.v);
  });
}

/* The adapter names every chapter of the course and where it lives. */
let adapter = null;
try {
  adapter = await (await fetch(new URL('./_course_runtime/adapter.json', root).href)).json();
} catch {
  adapter = null;
}

const chapters = (adapter?.entries || []).map((entry) => ({
  id: entry.id,
  path: entry.path,
  keys: entry.keys || [],
  title: entry.title || entry.id,
}));
const declaration = {
  schema: 'leqixiang-reviewed-runtime/v1',
  entries: chapters.map((entry) => ({
    id: entry.id,
    path: entry.path,
    keys: entry.keys,
    destinations: chapters.map((other) => other.id),
  })),
};

/*
 * One address for a chapter, whichever way it was written.
 *
 * The adapter names a chapter by its place in the folder of the lesson
 * — "index.html", "delivery/20260912/index.html".  The page names it by
 * the address it is opened under, which on the published site is an
 * address of the platform and in a copy of the library is a path next to
 * the page.  Both are turned into one address here, so that a chapter
 * written either way is found.
 */
function chapterUrl(value) {
  const raw = String(value || '');
  const served = raw.match(/\/api\/program-assets\/[^/]+\/(.+)$/);
  if (served) return new URL(served[1], root).href;
  return new URL(raw, document.baseURI).href;
}

const byUrl = new Map();
for (const entry of chapters) {
  byUrl.set(new URL(entry.path, root).href, entry);
}
const byPath = new Map(chapters.map((entry) => [entry.path, entry]));

const digest = String(adapter?.runtimeDigest || '');
const policyDigest = /^[0-9a-f]{64}$/i.test(digest) ? digest : '0'.repeat(64);
const revision = /^[a-zA-Z0-9_.:-]{1,96}$/.test(digest) ? digest.slice(0, 64) : 'local';

let host = null;
let opening = null;
let session = null;

/*
 * The frame is built again for every chapter.
 *
 * A frame that already sits in the page starts on about:blank, and the
 * bridge spends its single handshake on the first load event — which is
 * that empty document, not the course.  The course then waits for an
 * answer that never comes and the screen stays black.  A frame that is
 * not in the page yet has no load event at all, so the handshake is spent
 * on the document that matters.  This is the order the published site
 * uses: build it, let it in, point it at the chapter, then show it.
 */
function freshFrame() {
  const element = document.createElement('iframe');
  element.id = 'frame';
  element.title = '课件画面';
  element.allow = 'autoplay; fullscreen';
  if (debug) {
    element.addEventListener('load', () =>
      trace('frame load', Math.round(performance.now()))
    );
  }
  return element;
}

/* Let go of the chapter that is on screen. */
function retire() {
  if (host) {
    host.close();
    host = null;
  }
  if (session) {
    session.close();
    session = null;
  }
  stage.replaceChildren();
}

/* Answer the frame that asks to be let in, and keep its progress here. */
async function prepare(chapter, element) {
  trace('prepare', chapter.id, Math.round(performance.now()));
  const prepared = await prepareReviewedSession({
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
      await show(target.path);
    },
  });
  session = prepared;
  host = registerFrame(window, element, { ...prepared.hostOptions });
  trace('prepared', chapter.id, Math.round(performance.now()));
}

/* Show a chapter. The frame is only told to load once the host is ready
   for it, so the handshake is never missed. */
async function show(url) {
  const chapter = byUrl.get(chapterUrl(url));
  const target = chapter ? new URL(chapter.path, root).href : chapterUrl(url);
  if (!chapter) {
    retire();
    const element = freshFrame();
    element.src = target;
    stage.replaceChildren(element);
    return;
  }
  const element = freshFrame();
  opening = (opening || Promise.resolve())
    .then(() => {
      retire();
      return prepare(chapter, element);
    })
    .catch((error) => {
      trace('prepare failed', error && error.message);
    })
    .then(() => {
      trace('set src', target, Math.round(performance.now()));
      element.src = target;
      stage.replaceChildren(element);
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
