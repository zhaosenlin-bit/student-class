#!/usr/bin/env node
/*
 * Pull the chapter courses over plain HTTP.
 *
 * A chapter course does not answer the whole-program token.  The player
 * opens a reviewed session, asks the site to mount one chapter, and gets
 * back the address of a sandboxed frame that is allowed to read only the
 * files that chapter names.  Every step of that exchange is an ordinary
 * authenticated request, so the same files can be fetched without a
 * browser:
 *
 *   POST /api/reviewed-course-session/<id>/open        -> session id, chapters
 *   POST /api/reviewed-course-session/session/<sid>/mount {entry} -> prefix
 *   GET  <prefix><chapter path>                        -> the chapter document
 *
 * The chapter documents then point at their own assets, which are crawled
 * the same way as any other course body.
 *
 *   node tools/pull-afe-reviewed-http.mjs --ids 1387
 *   node tools/pull-afe-reviewed-http.mjs --ids 1387 --token afe-token-account1.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const tokenFile = arg('token', 'afe-token.txt');
const onlyIds = arg('ids');
const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenFile), 'utf8').trim();

const HEADERS = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

const FILE_EXT =
  /\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|json|txt|wasm|ktx2?|basis)(?:\?|$)/i;

async function post(route, body) {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf, type: res.headers.get('content-type') || '' };
}

function refsOf(html) {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const clean = raw.split('#')[0].split('?')[0].trim();
    if (!clean || clean.startsWith('data:') || clean.startsWith('blob:')) return;
    if (/^(https?:)?\/\//i.test(clean)) return;
    if (clean.startsWith('/')) return;
    if (!FILE_EXT.test(clean)) return;
    out.add(clean.replace(/^\.\//, ''));
  };
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of html.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of html.matchAll(
    /["'`]([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|js|mjs|css|wasm|bin|woff2?|ttf))["'`]/g
  ))
    add(m[1]);
  return out;
}

const all = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);
let targets = all;
/* The chapter courses of the premium catalogue are filed under their own
   programme numbers, which the work list never reaches. */
const premium = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'premium', 'catalogue.json'), 'utf8')
);
const byId = new Map(all.map((p) => [String(p.id), p]));
for (const c of premium.courses || []) {
  if (!c.programId) continue;
  const key = String(c.programId);
  if (!byId.has(key)) byId.set(key, { id: c.programId, title: c.title });
}
targets = [...byId.values()];
if (onlyIds) {
  const wanted = onlyIds.split(',').map((s) => s.trim());
  targets = targets.filter((p) => wanted.includes(String(p.id)));
}

const report = [];

for (const program of targets) {
  const id = program.id;
  console.log(`\n=== ${id} ${program.title}`);

  const requestId = Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');

  const opened = await post(`/api/reviewed-course-session/${id}/open`, { requestId });
  if (opened.status !== 200 || !opened.json?.id) {
    const why = opened.json?.error || opened.json?.msg || opened.text.slice(0, 120);
    console.log('  开不出来:', opened.status, why);
    report.push({ id, ok: false, reason: why });
    continue;
  }
  const session = opened.json;
  console.log(
    `  会话 ${session.id} 适配器 ${session.adapter} 权益 ${session.binding?.accessType}` +
      ` 剩余 ${session.trialRemaining} 章节 ${session.allowedEntryIds?.length}/${session.descriptor?.entries?.length}`
  );

  const outDir = path.join(CW, `${id}.assets`);
  let files = 0;
  let missing = 0;
  const written = [];

  const entries = session.descriptor?.entries || [];
  for (const entry of entries) {
    if (!session.allowedEntryIds?.includes(entry.id)) continue;
    const mount = await post(`/api/reviewed-course-session/session/${session.id}/mount`, {
      entry: entry.id,
    });
    const prefix = mount.json?.prefix;
    if (!prefix) {
      console.log(`  ${entry.id}: 拿不到地址`, mount.status, mount.text.slice(0, 100));
      missing++;
      continue;
    }
    /* The address comes back relative to the site root. */
    const base = prefix.startsWith('http') ? prefix : ORIGIN + prefix;
    const url =
      base.replace(/\/+$/, '') + '/' + entry.path.split('/').map(encodeURIComponent).join('/');
    const page = await get(url, { Referer: `${ORIGIN}/play/${id}` });
    if (page.status !== 200 || !page.buf.length) {
      console.log(`  ${entry.id}: ${page.status} ${page.path || ''}`);
      missing++;
      continue;
    }
    const html = page.buf.toString('utf8');
    const rel = entry.path.replace(/\.html?$/i, '');
    const dest = path.join(outDir, `${rel}.html`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, page.buf);
    written.push(dest);
    files++;
    console.log(`  ${entry.id} ${entry.title} -> ${rel}.html (${page.buf.length})`);

    /* The chapter document names its own files; they live beside it. */
    for (const ref of refsOf(html)) {
      const assetUrl = new URL(ref, base + '/').href;
      const assetRel = ref.replace(/^\.\//, '');
      const assetDest = path.join(outDir, assetRel);
      if (fs.existsSync(assetDest) && fs.statSync(assetDest).size > 0) continue;
      try {
        const res = await get(assetUrl, { Referer: `${ORIGIN}/play/${id}` });
        if (res.status !== 200 || !res.buf.length) {
          missing++;
          continue;
        }
        fs.mkdirSync(path.dirname(assetDest), { recursive: true });
        fs.writeFileSync(assetDest, res.buf);
        files++;
      } catch {
        missing++;
      }
    }
  }

  /* Put the opening back so the account keeps its trials. */
  await post(`/api/reviewed-course-session/session/${session.id}/close`, { programId: id });

  console.log(`  取到 ${files} 个文件，缺 ${missing} 个`);
  report.push({ id, title: program.title, ok: files > 0, files, missing, written });
}

fs.writeFileSync(
  path.join(SCRATCH, 'pull-reviewed-http-report.json'),
  JSON.stringify(report, null, 1)
);

