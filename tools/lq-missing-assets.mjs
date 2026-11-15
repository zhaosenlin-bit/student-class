#!/usr/bin/env node
/*
 * 课件素材缺口清单。
 *
 * 口径分两层：
 *
 *   确认缺口 —— 验收时浏览器真的报了 404 的路径。这是权威依据，页面里
 *                真的去要而本地没有的文件。
 *   疑似缺口 —— 正文里写到的、但本地找不到的文件。里面混着不少死代码
 *                和运行时才拼出来的路径，所以单独一栏，只作提示。
 *
 * 用法：
 *   node tools/lq-missing-assets.mjs            两层都列
 *   node tools/lq-missing-assets.mjs --confirmed 只列确认缺口
 *   node tools/lq-missing-assets.mjs --possible  只列疑似缺口
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');

const args = process.argv.slice(2);
const onlyConfirmed = args.includes('--confirmed');
const onlyPossible = args.includes('--possible');

/* ---------- 第一层：验收报告里的真实 404 ---------- */
function confirmedGaps() {
  const files = fs
    .readdirSync(SCRATCH)
    .filter((x) => /^lq-(batch|gap)-report.*\.json$/.test(x))
    .sort(
      (a, b) =>
        fs.statSync(path.join(SCRATCH, b)).mtimeMs - fs.statSync(path.join(SCRATCH, a)).mtimeMs
    )
    .slice(0, Number(process.env.LQ_REPORT_COUNT || 1));
  const map = new Map();
  for (const f of files) {
    let rows = [];
    try {
      rows = JSON.parse(fs.readFileSync(path.join(SCRATCH, f), 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      for (const line of row.failed || []) {
        const m = /^\d{3} \/api\/program-assets\/([^/]+)\/(.+)$/.exec(line);
        if (!m) continue;
        const [, id, rel] = m;
        if (rel.startsWith('_ext/')) continue;
        if (!map.has(id)) map.set(id, new Set());
        map.get(id).add(rel);
      }
    }
  }
  return map;
}

/* ---------- 第二层：正文里写了、本地却找不到的路径 ---------- */
const REF = [
  /\b(?:src|href)\s*=\s*["']([^"']+)["']/g,
  /\burl\(\s*["']?([^"')]+)["']?\s*\)/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\bfetch\(\s*["']([^"']+)["']/g,
  /["']([^"']*\.(?:glb|gltf|fbx|obj|mp3|wav|ogg|m4a|png|jpe?g|gif|webp|svg|woff2?|ttf|css|js|mjs|json|xlsx|pdf|wasm))["']/g,
];

const LOCAL_EXT_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'unpkg.com',
  'esm.sh',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com',
]);

/* 模块说明符、路径片段或者模板拼出来的片段，都不是文件。 */
function isNoise(rel) {
  if (!rel || rel.length < 2) return true;
  if (/^[\s.]*$/.test(rel)) return true;
  if (rel.includes('${')) return true;
  if (rel.endsWith('/')) return true;
  if (/^[a-z@][\w@/-]*$/.test(rel) && !/\.[a-z0-9]{2,4}$/i.test(rel)) return true;
  return false;
}

function resolveLocal(id, raw) {
  let rel = raw;
  if (rel.startsWith('/api/program-assets/')) {
    const rest = rel.slice('/api/program-assets/'.length);
    const cut = rest.indexOf('/');
    const owner = cut < 0 ? rest : rest.slice(0, cut);
    let tail = cut < 0 ? '' : rest.slice(cut + 1);
    if (tail.startsWith('t/')) {
      const after = tail.slice(2);
      const c2 = after.indexOf('/');
      tail = c2 < 0 ? '' : after.slice(c2 + 1);
    } else if (tail.startsWith('_ext/')) {
      tail = tail.slice('_ext/'.length);
    }
    if (owner !== id && owner !== id.slice(4)) return null;
    rel = tail;
  } else if (/^https?:\/\//i.test(rel)) {
    let u;
    try {
      u = new URL(rel);
    } catch {
      return null;
    }
    if (!LOCAL_EXT_HOSTS.has(u.hostname)) return null;
    rel = `${u.hostname}${u.pathname}`;
  } else {
    rel = rel.replace(/^\.\//, '').replace(/^\//, '');
  }
  rel = rel.split('?')[0];
  if (!rel) return null;
  let decoded = rel;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    /* 保留原样 */
  }
  const candidates = [
    path.join(CW, `${id}.assets`, decoded),
    path.join(CW, `${id}.assets`, '_ext', decoded),
    path.join(SHARED, decoded),
  ];
  const slash = decoded.indexOf('/');
  if (slash > 0) {
    const host = decoded.slice(0, slash);
    const tail = decoded.slice(slash + 1);
    candidates.push(
      path.join(SHARED, host, tail),
      path.join(CW, `${id}.assets`, '_ext', host, tail)
    );
  }
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return { ok: true };
    } catch {
      /* 忽略 */
    }
  }
  return { ok: false, rel: decoded };
}

function possibleGaps(ids) {
  const map = new Map();
  for (const id of ids) {
    const body = path.join(CW, `${id}.html`);
    if (!fs.existsSync(body)) continue;
    const text = fs.readFileSync(body, 'utf8');
    const refs = new Set();
    for (const rx of REF) {
      for (const m of text.matchAll(rx)) {
        const raw = (m[1] || '').trim();
        if (raw) refs.add(raw);
      }
    }
    const missing = new Set();
    for (const raw of refs) {
      if (raw.startsWith('data:') || raw.startsWith('#') || raw.startsWith('javascript:')) continue;
      const r = resolveLocal(id, raw);
      if (r && r.ok === false && !isNoise(r.rel)) missing.add(r.rel);
    }
    if (missing.size) map.set(id, missing);
  }
  return map;
}

const ids = fs
  .readdirSync(CW)
  .filter((f) => /^afe-\d+\.html$/.test(f))
  .map((f) => f.replace('.html', ''));

if (!onlyPossible) {
  const confirmed = confirmedGaps();
  console.log(`确认缺口（验收时真的 404）：${confirmed.size} 门`);
  for (const [id, rels] of [...confirmed].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`\n== ${id}: ${rels.size}`);
    for (const r of rels) console.log(`   404 ${r}`);
  }
}

if (!onlyConfirmed) {
  const possible = possibleGaps(ids);
  console.log(`\n疑似缺口（正文写了、本地没有）：${possible.size} 门`);
  for (const [id, rels] of [...possible].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`\n~ ${id}: ${rels.size}`);
    for (const r of rels) console.log(`   ?   ${r}`);
  }
}
