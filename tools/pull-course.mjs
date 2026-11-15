#!/usr/bin/env node
/*
 * Take one whole course down, in one command.
 *
 * Opening a session gives a list of every file the course is allowed to
 * read; the files are then fetched under the mount address and written
 * into the local course folder.  The session is closed afterwards, so the
 * opening is given back.
 *
 *   node tools/pull-course.mjs 841
 *   node tools/pull-course.mjs 841 --token afe-token-account1.txt
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
const programId = Number(args.find((a) => /^\d+$/.test(a)) || 0);
const tokenName = value('--token', 'afe-token.txt');
if (!programId) {
  console.log('用法: node tools/pull-course.mjs <课程号> [--token 文件]');
  process.exit(1);
}

const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenName), 'utf8').trim();
const HEADERS = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

async function post(route, body) {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text), text };
  } catch {
    return { status: res.status, json: null, text };
  }
}

async function take(prefix, rel) {
  const url =
    ORIGIN + prefix.replace(/\/$/, '') + '/' + rel.split('/').map(encodeURIComponent).join('/');
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` } });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length ? buf : null;
    } catch {}
  }
  return null;
}

const opened = await post(`/api/reviewed-course-session/${programId}/open`);
const sessionId = opened.json?.id;
if (!sessionId) {
  console.log(`开不了会话：${opened.status} ${opened.json?.error || opened.text?.slice(0, 200)}`);
  process.exit(1);
}
console.log(`会话 ${sessionId}`);

const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
  programId,
});
const descriptor = resumed.json?.descriptor;
if (!descriptor) {
  console.log('resume 失败:', resumed.status, JSON.stringify(resumed.json || resumed.text).slice(0, 300));
  process.exit(1);
}
const entries = descriptor.resourcePolicy?.entries || [];
console.log(`章节 ${descriptor.entries?.length || 0} · 资源条目 ${entries.length}`);

const outDir = path.join(CW, `afe-${programId}.assets`);
const srcDir = path.join(SRC, `${programId}.assets`);
let saved = 0;
let skipped = 0;
const missing = [];

for (const entry of entries) {
  const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
    entry: entry.id,
  });
  const prefix = mounted.json?.prefix;
  if (!prefix) {
    console.log(`  ${entry.id}: 挂不上 (${mounted.status})`);
    continue;
  }
  let got = 0;
  for (const rel of entry.allowed || []) {
    const target = path.join(outDir, rel);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      skipped++;
      continue;
    }
    const buf = await take(prefix, rel);
    if (!buf) {
      missing.push(`${entry.id}/${rel}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
    got++;
    saved++;
  }
  console.log(`  ${entry.id}: 新增 ${got}${got ? '' : '（本地已有）'}`);
}

/* The body of the course comes from the same place as its files. */
const bodyUrl = `${ORIGIN}/api/programs/${programId}`;
try {
  const res = await fetch(bodyUrl, { headers: { 'User-Agent': UA, Authorization: `Bearer ${TOKEN}` } });
  const text = await res.text();
  const next = text.match(/window\.location\.replace\(["']([^"']+)["']\)/)?.[1];
  if (next) {
    const bodyRes = await fetch(ORIGIN + next, { headers: { 'User-Agent': UA } });
    const body = await bodyRes.text();
    const bodyFile = path.join(CW, `afe-${programId}.html`);
    const srcFile = path.join(SRC, `${programId}.html`);
    if (body.length && bodyRes.ok) {
      fs.writeFileSync(bodyFile, body, 'utf8');
      fs.mkdirSync(path.dirname(srcFile), { recursive: true });
      fs.writeFileSync(srcFile, body, 'utf8');
      console.log(`正文已更新（${(body.length / 1024).toFixed(0)}KB）`);
    }
  }
} catch (e) {
  console.log('正文取不到:', e.message);
}

/* Hand the opening back. */
await post(`/api/reviewed-course-session/session/${sessionId}/close`, { programId });

/* Keep the source mirror in step so a rebuild does not lose the files. */
let synced = 0;
for (const entry of fs.readdirSync(outDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const rel = path.relative(outDir, path.join(entry.parentPath || entry.path, entry.name));
  const from = path.join(outDir, rel);
  const to = path.join(srcDir, rel);
  if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  synced++;
}

console.log(`\n新增 ${saved} 个，已有 ${skipped} 个，取不到 ${missing.length} 个，源镜像同步 ${synced} 个`);
for (const item of missing.slice(0, 20)) console.log(`  - ${item}`);
if (missing.length > 20) console.log(`  … 还有 ${missing.length - 20} 个`);
