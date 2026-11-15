#!/usr/bin/env node
/*
 * Take a whole course down from one session.
 *
 * The descriptor of a session names every file the course is allowed to
 * read, entry by entry.  That list is the course's own manifest, so it
 * says exactly which files exist — not only the ones a document happens
 * to mention.  Every file on the list is fetched, and the ones that are
 * already local are left alone.
 *
 *   node tools/pull-session-manifest.mjs --session <id> --id 1360
 *   node tools/pull-session-manifest.mjs --session <id> --id 1360 --entries atlas
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
const TOKEN = fs.readFileSync(path.join(SCRATCH, 'afe-token.txt'), 'utf8').trim();
const HEADERS = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const sessionId = value('--session', '');
const programId = Number(value('--id', ''));
const onlyEntries = (value('--entries', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (!sessionId || !programId) {
  console.log('用法: node tools/pull-session-manifest.mjs --session <id> --id <programId>');
  process.exit(1);
}

async function post(route, body) {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: null, text };
  }
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

const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
  programId,
});
const descriptor = resumed.json?.descriptor;
if (!descriptor) {
  console.log('resume 失败:', resumed.status, JSON.stringify(resumed.json || resumed.text).slice(0, 300));
  process.exit(1);
}
const policy = descriptor.resourcePolicy || {};
const policyEntries = policy.entries || [];
console.log(
  `会话 ${sessionId} · ${programId} · ${descriptor.entries?.length || 0} 章 · ${policyEntries.length} 条资源策略`
);

const outDir = path.join(CW, `afe-${programId}.assets`);
const srcDir = path.join(SRC, `${programId}.assets`);

let saved = 0;
let skipped = 0;
const notFound = [];

for (const policyEntry of policyEntries) {
  if (onlyEntries.length && !onlyEntries.includes(policyEntry.id)) continue;
  const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
    entry: policyEntry.id,
  });
  const prefix = mounted.json?.prefix;
  if (!prefix) {
    console.log(`  ${policyEntry.id}: 挂不上`);
    continue;
  }
  let got = 0;
  for (const rel of policyEntry.allowed || []) {
    const target = path.join(outDir, rel);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      skipped++;
      continue;
    }
    const buf = await take(prefix, rel);
    if (!buf) {
      notFound.push(`${policyEntry.id}/${rel}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
    got++;
    saved++;
  }
  console.log(`  ${policyEntry.id}: 新增 ${got} 个${got ? '' : '（清单里的文件本地都有）'}`);
}

console.log(`\n新增 ${saved} 个，已存在 ${skipped} 个，取不到 ${notFound.length} 个`);
if (notFound.length) {
  for (const item of notFound.slice(0, 20)) console.log(`  - ${item}`);
  if (notFound.length > 20) console.log(`  … 还有 ${notFound.length - 20} 个`);
}

/* Keep the source mirror in step so a rebuild does not lose the files. */
for (const entry of fs.readdirSync(outDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const rel = path.relative(outDir, path.join(entry.parentPath || entry.path, entry.name));
  const from = path.join(outDir, rel);
  const to = path.join(srcDir, rel);
  if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
console.log('源镜像已同步');
