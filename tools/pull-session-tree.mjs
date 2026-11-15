#!/usr/bin/env node
/*
 * Open one session for a course and take everything it still misses.
 *
 * Opening a chapter session spends one of the account's openings for
 * that course, and the session that comes with it reaches the whole
 * course tree.  So the session is used for everything at once: the
 * files that are named explicitly, and every file the local documents
 * ask for but do not have.
 *
 *   node tools/pull-session-tree.mjs --ids 1360
 *   node tools/pull-session-tree.mjs --ids 842 --tokens afe-token-account1.txt
 *   node tools/pull-session-tree.mjs --ids 1360 --paths _course_runtime/background.png,_course_runtime/adapter.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const SRC = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const ids = (value('--ids', '') || '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const tokenNames = (value('--tokens', 'afe-token.txt') || '').split(',');
const explicit = (value('--paths', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const accounts = tokenNames.map((name) => ({
  name,
  token: fs.readFileSync(path.join(SCRATCH, name), 'utf8').trim(),
}));

const FILE_EXT =
  /\.(png|jpe?g|gif|svg|webp|avif|mp3|mp4|wav|ogg|m4a|glb|gltf|json|js|mjs|css|wasm|bin|woff2?|ttf|txt)$/i;

async function post(account, route, body) {
  try {
    const res = await fetch(ORIGIN + route, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.token}`,
        Origin: ORIGIN,
        Referer: `${ORIGIN}/`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      return { status: res.status, json: JSON.parse(text) };
    } catch {
      return { status: res.status, json: null, text };
    }
  } catch (e) {
    return { status: 0, json: null, text: String(e) };
  }
}

/* Every file the local documents of a course ask for. */
function refsOf(text) {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const ref = raw.split('?')[0].split('#')[0].trim();
    if (!ref || /^(https?:|data:|blob:|\/\/|#)/i.test(ref)) return;
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1]);
  for (const m of text.matchAll(
    /["'`]([^"'`\s]+\.(?:png|jpe?g|gif|svg|webp|avif|mp3|mp4|wav|ogg|m4a|glb|gltf|json|js|mjs|css|wasm|bin|woff2?|ttf|txt))["'`]/gi
  ))
    add(m[1]);
  return out;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/* What the course asks for, and what it has. */
function gapsOf(dirName) {
  const dir = path.join(CW, dirName);
  const files = walk(dir);
  const have = new Set(files.map((p) => path.relative(dir, p).replace(/\\/g, '/')));
  const byBase = new Set(files.map((p) => path.basename(p)));
  const wanted = new Set();
  for (const p of files) {
    if (!/\.(html?|js|mjs|css)$/i.test(p)) continue;
    for (const ref of refsOf(fs.readFileSync(p, 'utf8'))) wanted.add(ref);
  }
  const gaps = new Map();
  for (const ref of wanted) {
    const marker = `/api/program-assets/${dirName.replace(/\.assets$/, '')}/`;
    let rel = ref;
    const at = ref.indexOf(marker);
    if (at >= 0) rel = ref.slice(at + marker.length);
    else if (rel.startsWith('./')) rel = rel.slice(2);
    else if (rel.startsWith('/')) rel = rel.slice(1);
    const list = [...new Set([rel, rel.replace(/^assets\//, ''), path.posix.basename(rel)])];
    if (list.some((c) => have.has(c)) || list.some((c) => byBase.has(path.posix.basename(c)))) continue;
    gaps.set(list[0], list);
  }
  return gaps;
}

async function take(prefix, rel) {
  const url = ORIGIN + prefix.replace(/\/$/, '') + '/' + rel.split('/').map(encodeURIComponent).join('/');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

for (const id of ids) {
  const dirName = `afe-${id}.assets`;
  const outDir = path.join(CW, dirName);
  const srcDir = path.join(SRC, `${id}.assets`);
  console.log(`\n===== ${id} =====`);

  const wanted = new Map(gapsOf(dirName));
  for (const rel of explicit) {
    if (!wanted.has(rel)) wanted.set(rel, [rel, rel.replace(/^assets\//, ''), path.posix.basename(rel)]);
  }
  console.log(`  本地还缺 ${wanted.size} 个文件`);

  let session = null;
  let account = null;
  for (const candidate of accounts) {
    const opened = await post(candidate, `/api/reviewed-course-session/${id}/open`, {});
    if (opened.status === 200 && opened.json?.id) {
      session = opened.json.id;
      account = candidate;
      console.log(`  ${candidate.name}: 开会话 ${session}`);
      break;
    }
    console.log(`  ${candidate.name}: ${opened.status} ${opened.json?.error || opened.text?.slice(0, 60) || ''}`);
  }
  if (!session) {
    console.log('  没有账号还有额度');
    continue;
  }

  const resumed = await post(account, `/api/reviewed-course-session/session/${session}/resume`, {
    programId: id,
  });
  const entries = resumed.json?.descriptor?.entries || [];
  console.log(`  ${entries.length} 个章节`);

  const prefixes = [];
  for (const entry of entries) {
    const mounted = await post(account, `/api/reviewed-course-session/session/${session}/mount`, {
      entry: entry.id,
    });
    if (mounted.json?.prefix) {
      prefixes.push(mounted.json.prefix);
      console.log(`  挂载 ${entry.id}: ${mounted.json.prefix.slice(0, 70)}…`);
    }
  }
  if (!prefixes.length) {
    console.log('  没有拿到挂载地址');
    continue;
  }

  let saved = 0;
  const still = [];
  for (const [key, list] of wanted) {
    let done = false;
    for (const candidate of list) {
      for (const prefix of prefixes) {
        const buf = await take(prefix, candidate);
        if (!buf) continue;
        const target = path.join(outDir, candidate);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buf);
        console.log(`  + ${candidate}  (${(buf.length / 1024).toFixed(0)} KB)`);
        saved++;
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) still.push(key);
  }
  console.log(`  补回 ${saved} 个，仍缺 ${still.length} 个`);
  if (still.length) console.log(`  未取到: ${still.slice(0, 12).join(', ')}`);

  /* The source mirror keeps the same tree so a rebuild does not lose it. */
  for (const [rel] of wanted) {
    const from = path.join(outDir, rel);
    if (!fs.existsSync(from)) continue;
    const to = path.join(srcDir, rel);
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}
