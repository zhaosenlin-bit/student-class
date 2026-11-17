#!/usr/bin/env node
/*
 * Download specific files of one course straight from its lease.
 *
 * The platform answers with a "loading" page; following its jump gives the
 * real body and, in its <base href>, a short-lived folder address.  From
 * there every file of that course can be fetched by name.
 *
 *   node tools/pull-afe-files.mjs 616 src/core/PageTurner.js
 *   node tools/pull-afe-files.mjs 581 --list          # 只看正文引用了哪些文件
 *   node tools/pull-afe-files.mjs 581 --list --json   # 机器可读
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
/* The camera runtime serves its own files from a second host. */
const ASSET_HOST = 'https://play.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const tokenName = args.includes('--token')
  ? args[args.indexOf('--token') + 1]
  : 'afe-token.txt';
const programId = Number(args.find((a) => /^\d+$/.test(a)) || 0);
const wantList = args.includes('--list');
const wantJson = args.includes('--json');
const names = args.filter((a) => /\.[a-z0-9]+$/i.test(a) && !a.startsWith('--'));
if (!programId) {
  console.log('用法: node tools/pull-afe-files.mjs <课程号> [文件名...] [--list] [--token 文件]');
  process.exit(1);
}

const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenName), 'utf8').trim();
const HEADERS = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
};

async function text(url) {
  const res = await fetch(url, { headers: HEADERS });
  return { status: res.status, body: await res.text() };
}

/* The lease folder address lives in the <base href> of the real body. */
const access = await text(`${ORIGIN}/api/programs/${programId}/access-token`);
let token = '';
try {
  token = JSON.parse(access.body).token || '';
} catch {}
if (!token) {
  console.log(`拿不到访问令牌: ${access.status} ${access.body.slice(0, 160)}`);
  process.exit(1);
}

let body = await text(
  `${ORIGIN}/api/program-file/${programId}?token=${encodeURIComponent(token)}`
);
let base = (body.body.match(/<base[^>]*href=["']([^"']+)["']/i) || [])[1];
if (!base) {
  const jump = (body.body.match(/window\.location\.replace\(["']([^"']+)["']/i) || [])[1];
  if (jump) {
    body = await text(ORIGIN + jump);
    base = (body.body.match(/<base[^>]*href=["']([^"']+)["']/i) || [])[1];
  }
}
/* A body already on disk carries its own lease, and that lease keeps
   serving the files for a while.  Use it when the platform will not hand
   the body out again. */
if (!base) {
  const stored = path.join(CW, `${programId}.html`);
  if (fs.existsSync(stored)) {
    const onDisk = fs.readFileSync(stored, 'utf8');
    base = (onDisk.match(/<base[^>]*href=["']([^"']+)["']/i) || [])[1];
    if (base) console.log('  用本地正文里那条租约');
  }
}
if (!base) {
  console.log(`正文里没有 base 标签（${body.status}）：${body.body.slice(0, 200)}`);
  process.exit(1);
}
const prefix = (base.startsWith('http') ? base : ORIGIN + base).replace(/\/+$/, '');

/* Files the body points at, relative to the lease folder. */
const referenced = new Set();
for (const m of body.body.matchAll(
  /["'`]([A-Za-z0-9_./@-]{2,80}\.(?:png|jpe?g|gif|svg|webp|glb|gltf|mp3|mp4|wav|ogg|m4a|json|txt|wasm|css|js|mjs))["'`]/gi
)) {
  const rel = m[1].replace(/^\.?\//, '');
  if (!rel.startsWith('/')) referenced.add(rel);
}

if (wantList) {
  const list = [...referenced].sort();
  if (wantJson) {
    console.log(JSON.stringify({ programId, prefix, files: list }, null, 1));
  } else {
    console.log(`#${programId} 引用了 ${list.length} 个文件`);
    for (const f of list) console.log('  ' + f);
  }
  process.exit(0);
}

if (!names.length) {
  console.log('没有指定文件名。用 --list 先看正文引用了哪些文件。');
  process.exit(1);
}

const destRoot = path.join(CW, `${programId}.assets`);
let got = 0;
let missed = 0;
for (const name of names) {
  const tail = name.split('/').map(encodeURIComponent).join('/');
  /* The camera runtime serves its files from a second host. */
  const urls = [
    `${prefix}/${tail}`,
    `${ASSET_HOST}${base.replace(/\/+$/, '')}/${tail}`,
  ];
  let done = false;
  for (const url of urls) {
    if (done) break;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: `${ASSET_HOST}/` },
      });
      if (!res.ok) {
        console.log(`  ${res.status} ${name}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) {
        console.log(`  空文件 ${name}`);
        continue;
      }
      const dest = path.join(destRoot, name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`  ok ${String(buf.length).padStart(9)}  ${name}`);
      got++;
      done = true;
    } catch (err) {
      console.log(`  ERR ${name}: ${err.message}`);
    }
  }
  if (done) continue;
  missed++;
}
console.log(`取到 ${got} 个，缺 ${missed} 个 → ${destRoot}`);
