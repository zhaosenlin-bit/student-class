#!/usr/bin/env node
/*
 * Pull the works that are filed as chapter courses.
 *
 * They are not served as one file. The platform opens a session, hands out
 * a mount address, and then serves the course from under that address:
 *
 *   /api/reviewed-course-assets/<session>/<mount>/<entry path>
 *
 * The documents under that address only open for a browser frame, while the
 * files they point at can be fetched straight away. So the documents are
 * read out of the frame, and everything else is fetched directly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const onlyIds = args.includes('--ids') ? args[args.indexOf('--ids') + 1] : null;

/* The chapter courses that are filed as chapters rather than as one file. */
const CHAPTER_COURSES = [1360, 1016, 842, 841, 1387];

/* Sessions that are still alive are kept here, so a run does not have to
   spend another trial opening a new one. */
const SESSIONS_FILE = path.join(ROOT, 'recon', 'scratch', 'reviewed-sessions.json');
const knownSessions = fs.existsSync(SESSIONS_FILE)
  ? JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'))
  : {};
const saveSession = (programId, id) => {
  knownSessions[String(programId)] = id;
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(knownSessions, null, 1));
};

/* Sessions expire, so a new one is opened for every course on every run. */
const openSession = async (programId) => {
  const opened = await post(`/api/reviewed-course-session/${programId}/open`, {});
  if (opened?.id) {
    saveSession(programId, opened.id);
    return opened.id;
  }
  /* The account may have no trials left; a session opened earlier still
     works until the site retires it. */
  const stored = knownSessions[String(programId)];
  if (!stored) return null;
  const resumed = await post(`/api/reviewed-course-session/session/${stored}/resume`, {
    programId: Number(programId),
  });
  if (!resumed?.descriptor?.entries) return null;
  console.log(`${programId}: reusing session ${stored}`);
  return stored;
};

const post = async (route, body) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const FILE_EXT =
  /\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|eot|json|txt|wasm|ktx2?|basis)(?:\?|$)/i;

const refsOf = (text) => {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const ref = raw.split('?')[0].split('#')[0];
    if (!ref || ref.startsWith('data:') || ref.startsWith('mailto:') || ref.startsWith('//')) return;
    if (/^https?:\/\//i.test(ref)) {
      if (FILE_EXT.test(ref)) out.add(ref);
      return;
    }
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) add(m[1]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of text.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of text.matchAll(
    /["'`]([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|js|mjs|css|wasm|bin|woff2?|ttf))["'`]/g
  ))
    add(m[1]);
  /* A path that is built at run time: new URL('./adapter.json', import.meta.url). */
  for (const m of text.matchAll(/new\s+URL\(\s*["']([^"']+)["']/g)) add(m[1]);
  for (const m of text.matchAll(
    /["'`]([A-Za-z0-9_\-./]+\.(?:mjs|js|css|json|html?|txt|wasm|glb|gltf|png|jpe?g|webp|svg|mp3|wav|ogg|woff2?|ttf))["'`]/g
  ))
    add(m[1]);
  return out;
};

/* Download a file that lives under the mount address. */
const fetchUnder = async (prefix, rel) => {
  const url = ORIGIN + prefix + rel.split('/').map(encodeURIComponent).join('/');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
      });
      if (!res.ok) {
        if (process.env.AFE_DEBUG) console.log(`        ${res.status} ${rel}`);
        return null;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch {
      await sleep(600);
    }
  }
  return null;
};

/* A reference inside the course can be relative to the file that names it,
   to the chapter, or to the course root; the platform mixes all three. */
const candidatesFor = (rel, fromDir, chapterDir) => {
  const clean = rel.replace(/^\/+/, '');
  const list = [];
  const add = (p) => {
    const norm = path.posix.normalize(p).replace(/^(\.\.\/)+/, '');
    if (norm && !norm.startsWith('..') && !list.includes(norm)) list.push(norm);
  };
  add(path.posix.join(fromDir, clean));
  add(path.posix.join(chapterDir, clean));
  add(clean);
  return list;
};

const browser = await connect(9222);
/* The site keeps its sign-in in localStorage, and the frame that serves a
   chapter checks it.  Seed it before any chapter is opened. */
await browser.goto(`${ORIGIN}/play/${CHAPTER_COURSES[0]}`);
await browser
  .evaluate(
    `try{localStorage.setItem('aiedu_token', ${JSON.stringify(TOKEN)});
        if(!localStorage.getItem('aiedu_user'))
          localStorage.setItem('aiedu_user', JSON.stringify({wechatId:'local-preview',name:'本地预览',role:'teacher'}));
      }catch(e){}; true`
  )
  .catch(() => {});
await sleep(1200);

/* What was pulled, so the entry shell can be built without guessing. */
const manifestPath = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'chapters.json');
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

for (const programId of CHAPTER_COURSES) {
  if (onlyIds && !onlyIds.split(',').map((s) => s.trim()).includes(String(programId))) continue;
  const sessionId = await openSession(programId);
  if (!sessionId) {
    console.log(`${programId}: cannot open a session`);
    continue;
  }
  console.log(`${programId}: session ${sessionId}`);
  const outDir = path.join(CW, `${programId}.assets`);
  fs.mkdirSync(outDir, { recursive: true });

  const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
    programId: Number(programId),
  });
  if (!resumed?.descriptor?.entries) {
    console.log(`${programId}: cannot resume`);
    continue;
  }
  const entries = resumed.descriptor.entries;
  const allowed = new Set(resumed.allowedEntryIds || []);
  console.log(`${programId}: ${entries.length} entries, allowed ${[...allowed].join(',')}`);
  const pulled = [];

  for (const entry of entries) {
    const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
      entry: entry.id,
    });
    if (!mounted?.prefix) {
      console.log(`  ${entry.id}: no grant (${allowed.has(entry.id) ? 'open' : 'locked'})`);
      continue;
    }
    pulled.push({ id: entry.id, title: entry.title || entry.id, path: entry.path });
    const prefix = mounted.prefix;
    const rel = entry.path.split('/').map(encodeURIComponent).join('/');
    const url = ORIGIN + prefix + rel;

    /* Open the document in a frame and read it from the inside. */
    await browser.evaluate(`(() => {
      document.querySelectorAll('iframe[data-pull]').forEach(f => f.remove());
      const frame = document.createElement('iframe');
      frame.setAttribute('data-pull', '1');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.style.cssText = 'width:1200px;height:800px;border:0;position:fixed;left:0;top:0;z-index:99999';
      document.body.append(frame);
      window.__pullFrame = frame;
      frame.src = ${JSON.stringify(url)};
      return true;
    })()`);
    await sleep(8000);

    const frameEntry = [...browser.sessions.entries()]
      .reverse()
      .find(([, s]) => s.targetInfo.type === 'iframe');
    if (!frameEntry) {
      console.log(`  ${entry.id}: no frame target`);
      continue;
    }
    const [frameSession] = frameEntry;

    let html = '';
    try {
      html = await browser.evaluateIn(
        frameSession,
        `document.documentElement ? document.documentElement.outerHTML : ''`
      );
    } catch (e) {
      console.log(`  ${entry.id}: read failed ${e.message}`);
    }
    if (!html) continue;

    /* Point the local copy at its own folder. */
    const local = html
      .split(prefix)
      .join('./')
      .replace(/\/api\/reviewed-course-assets\/[A-Za-z0-9]+\/[A-Za-z0-9]+\//g, './');
    const docPath = path.join(outDir, entry.path);
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    fs.writeFileSync(docPath, '<!DOCTYPE html>\n' + local);
    console.log(`  ${entry.id} ${entry.path}: ${local.length} chars`);

    /* Walk what the document names and fetch it from the mount address. */
    const queue = [];
    const seenRel = new Set();
    const chapterDir = entry.path.split('/').slice(0, -1).join('/');
    const push = (rel, fromDir) => {
      if (!rel) return;
      for (const candidate of candidatesFor(rel, fromDir, chapterDir)) {
        if (seenRel.has(candidate)) continue;
        seenRel.add(candidate);
        queue.push(candidate);
      }
    };
    for (const r of refsOf(local)) {
      if (/^https?:\/\//i.test(r)) continue;
      push(r, chapterDir);
    }
    /* Files already on disk may name more files. */
    for (const e of fs.readdirSync(outDir, { withFileTypes: true, recursive: true })) {
      if (!e.isFile() || !/\.(?:js|mjs|css|html?|json|txt)$/i.test(e.name)) continue;
      const rel = path.relative(outDir, path.join(e.parentPath || e.path, e.name)).split(path.sep).join('/');
      const dir = path.posix.dirname(rel);
      for (const r of refsOf(fs.readFileSync(path.join(outDir, rel), 'utf8'))) {
        if (/^https?:\/\//i.test(r)) continue;
        push(r, dir === '.' ? '' : dir);
      }
    }

    let fetched = 0;
    while (queue.length) {
      const rel = queue.shift();
      if (process.env.AFE_DEBUG) console.log(`      ? ${rel}`);
      const target = path.join(outDir, rel);
      if (fs.existsSync(target) && fs.statSync(target).size > 0) {
        /* A file that is already here may still name files we do not have. */
        if (!/\.(?:js|mjs|css|html?|json|txt)$/i.test(rel)) continue;
        const dir = path.posix.dirname(rel);
        for (const r of refsOf(fs.readFileSync(target, 'utf8'))) {
          if (/^https?:\/\//i.test(r)) continue;
          push(r, dir === '.' ? '' : dir);
        }
        continue;
      }
      const buf = await fetchUnder(prefix, rel);
      if (!buf) continue;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      fetched++;
      if (/\.(?:js|mjs|css|html?|json|txt)$/i.test(rel)) {
        const dir = path.posix.dirname(rel);
        for (const r of refsOf(buf.toString('utf8'))) {
          if (/^https?:\/\//i.test(r)) continue;
          push(r, dir === '.' ? '' : dir);
        }
      }
    }
    console.log(`    direct fetch added ${fetched}`);
  }

  if (pulled.length) {
    manifest[programId] = { entries: pulled };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
    console.log(`${programId}: manifest written, ${pulled.length} entries`);
  }
}

await browser.close();
