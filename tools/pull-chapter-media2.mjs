#!/usr/bin/env node
/*
 * Fetch the chapter media that is still missing.
 *
 * A chapter document names its pictures under the platform's own asset
 * address — /api/program-assets/<program>/assets/… — while the files
 * themselves are handed out under the address of the session that opened
 * the chapter.  The two do not match, so the address is taken apart and
 * put back together under the session before it is asked for.
 *
 *   node tools/pull-chapter-media2.mjs 842
 *   node tools/pull-chapter-media2.mjs 842 1016 --token afe-token-account1.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const tokenFile = args.includes('--token')
  ? args[args.indexOf('--token') + 1]
  : 'afe-token.txt';
const TOKEN = fs
  .readFileSync(path.join(ROOT, 'recon', 'scratch', tokenFile), 'utf8')
  .trim();
const ids = args.map(Number).filter((n) => n > 100);

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

/* Every file the documents of a course point at. */
function refsOf(html) {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const ref = raw.split('?')[0].split('#')[0];
    if (!ref || /^(https?:|data:|\/\/)/i.test(ref)) return;
    if (!/\.(png|jpe?g|gif|svg|webp|avif|mp3|mp4|wav|ogg|m4a|glb|gltf|json|js|mjs|css|wasm|bin|woff2?|ttf)$/i.test(ref))
      return;
    out.add(ref);
  };
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1]);
  for (const m of html.matchAll(/["'`]([^"'`\s]+\.(?:png|jpe?g|gif|svg|webp|mp3|mp4|wav|ogg|glb|json|js|mjs|css|wasm))["'`]/gi))
    add(m[1]);
  return out;
}

/* Where a reference points, once the platform's own prefix is removed. */
function candidates(ref, programId) {
  const out = new Set();
  const marker = `/api/program-assets/${programId}/`;
  let rel = ref;
  const at = ref.indexOf(marker);
  if (at >= 0) rel = ref.slice(at + marker.length);
  else if (ref.startsWith('./')) rel = ref.slice(2);
  else if (ref.startsWith('/')) rel = ref.slice(1);
  out.add(rel);
  out.add(rel.replace(/^assets\//, ''));
  out.add(path.posix.basename(rel));
  return [...out];
}

async function fetchUnder(prefix, rel) {
  const url = ORIGIN + prefix + rel.split('/').map(encodeURIComponent).join('/');
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
      redirect: 'manual',
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

for (const id of ids) {
  const outDir = path.join(CW, `${id}.assets`);
  /* What the documents want and what is on disk. */
  const wanted = new Set();
  for (const name of fs.readdirSync(outDir)) {
    if (!name.endsWith('.html')) continue;
    for (const ref of refsOf(fs.readFileSync(path.join(outDir, name), 'utf8'))) {
      if (/^https?:/i.test(ref)) continue;
      wanted.add(ref);
    }
  }
  const missing = new Map();
  for (const ref of wanted) {
    const rel = candidates(ref, id).find((c) => {
      const target = path.join(outDir, c);
      return fs.existsSync(target) && fs.statSync(target).size > 0;
    });
    if (!rel) {
      const list = candidates(ref, id);
      const key = list[0];
      if (!missing.has(key)) missing.set(key, list);
    }
  }
  console.log(`\n=== ${id}: 缺 ${missing.size} 个素材`);
  if (!missing.size) continue;

  const opened = await post(`/api/reviewed-course-session/${id}/open`, {});
  if (!opened?.id) {
    console.log(`${id}: 开不了会话（额度用完）`);
    continue;
  }
  const sessionId = opened.id;
  const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
    programId: id,
  });
  const entries = resumed?.descriptor?.entries || [];
  console.log(`${id}: ${entries.length} 个章节`);

  /* One session hands out a few mounts; each mount is a doorway to the
     same shared folder, so one mount is enough to reach every file. */
  let prefix = null;
  for (const entry of entries) {
    const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
      entry: entry.id,
    });
    if (mounted?.prefix) {
      prefix = mounted.prefix;
      console.log(`${id}: 挂载 ${entry.id} -> ${prefix.slice(0, 60)}…`);
      break;
    }
  }
  if (!prefix) {
    console.log(`${id}: 没有拿到挂载地址`);
    continue;
  }

  let saved = 0;
  let stillMissing = 0;
  for (const [rel, list] of missing) {
    let done = false;
    for (const candidate of list) {
      const buf = await fetchUnder(prefix, candidate);
      if (!buf || !buf.length) continue;
      const target = path.join(outDir, candidate);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      console.log(`  + ${candidate}  (${(buf.length / 1024).toFixed(0)} KB)`);
      saved++;
      done = true;
      break;
    }
    if (!done) stillMissing++;
  }
  console.log(`${id}: 补回 ${saved} 个，仍缺 ${stillMissing} 个`);
}
