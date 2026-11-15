#!/usr/bin/env node
/*
 * 把本地课件里缺失的素材补回来。
 *
 * 批量验收时记录下了每个课件 404 的素材路径。这里对每一门重新从线上拿
 * 一份新租约（正文里的 <base href> 指向的目录），再把缺的那些文件按站点
 * 的真实路径取回。取回的仍然 404 的，说明是作者在站上就缺的文件，单独
 * 记下来，不去伪造。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LQ_CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const AFE_CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` };

const GAP = Number(process.env.AFE_GAP || 300);
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}
async function request(url, options = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace();
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}

/* 读验收报告，收集每个课件 404 的素材路径（公共 CDN 已经在别处补过了） */
function collectMissing() {
  const dir = path.join(ROOT, 'recon', 'scratch');
  const map = new Map();
  /*
   * 只读最新的那份报告。目录里还留着几分早先分片跑的旧报告，把它们
   * 一起算进来会得到一份已经不存在的缺口清单。
   */
  const files = fs
    .readdirSync(dir)
    .filter((x) => /^lq-(batch|gap)-report.*\.json$/.test(x))
    .sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs)
    .slice(0, Number(process.env.LQ_REPORT_COUNT || 2));
  for (const f of files) {
    const rows = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const row of rows) {
      if (!row.failed?.length) continue;
      for (const line of row.failed) {
        const m = /^\d{3} \/api\/program-assets\/([^/]+)\/(.+)$/.exec(line);
        if (!m) continue;
        const [, localId, rel] = m;
        if (rel.startsWith('_ext/')) continue;
        if (!map.has(localId)) map.set(localId, new Set());
        map.get(localId).add(rel);
      }
    }
  }
  return map;
}

/* 拿一份新租约，返回正文的 base 目录 */
async function freshLease(programId) {
  const access = await request(`${ORIGIN}/api/programs/${programId}/access-token`);
  const text = access ? await access.text() : '';
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 非 JSON */
  }
  if (!json?.token) return { error: json?.msg || `access ${access ? access.status : 'fail'}` };
  let url = `${ORIGIN}/api/program-file/${programId}?token=${encodeURIComponent(json.token)}`;
  for (let hop = 0; hop < 4; hop++) {
    const res = await request(url);
    if (!res) return { error: 'body fetch failed' };
    if (!res.ok) return { error: `body ${res.status}` };
    const body = await res.text();
    const next = body.match(/window\.location\.replace\(["']([^"']+)["']\)/);
    if (!next) {
      const base = body.match(/<base[^>]*href="([^"]+)"/i)?.[1] || null;
      return { base, html: body };
    }
    url = next[1].startsWith('http') ? next[1] : ORIGIN + next[1];
  }
  return { error: 'redirect-loop' };
}

const only = process.argv.includes('--ids')
  ? process.argv[process.argv.indexOf('--ids') + 1].split(',').map((s) => s.trim())
  : null;

const missingMap = collectMissing();
console.log('有缺失素材的课件：', missingMap.size);
let totalFixed = 0;
let totalUpstreamMissing = 0;
const summary = [];

for (const [localId, rels] of missingMap) {
  if (only && !only.includes(localId)) continue;
  const programId = localId.startsWith('afe-') ? localId.slice(4) : localId;
  const lease = await freshLease(programId);
  if (lease.error) {
    console.log(`SKIP ${localId}: ${lease.error}`);
    summary.push({ localId, error: lease.error });
    continue;
  }
  const root = lease.base || `/api/program-assets/${programId}/`;
  const outDir = path.join(LQ_CW, `${localId}.assets`);
  /* The source copy is the one a rebuild copies from, so both are written. */
  const sourceDir = path.join(AFE_CW, `${programId}.assets`);
  const fixed = [];
  const upstreamMissing = [];
  for (const rel of rels) {
    /* 地址里的 ? 是查询串，不是文件名的一部分。 */
    const clean = rel.split('?')[0];
    const query = rel.slice(clean.length);
    const target = path.join(outDir, clean);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
    /*
     * The body says where its files live, but a few bodies point at the
     * site root instead of their own folder. Try the place the body names
     * first, then the folder the platform keeps the assets in.
     */
    const roots = [root, `/api/program-assets/${programId}/`, `/api/program-assets/${programId}/_ext/`];
    let done = false;
    for (const base of roots) {
      if (done) break;
      const url =
        ORIGIN +
        base.replace(/\/$/, '') +
        '/' +
        clean.split('/').map(encodeURIComponent).join('/') +
        query;
      const res = await request(url);
      if (!res || !res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      const source = path.join(sourceDir, clean);
      fs.mkdirSync(path.dirname(source), { recursive: true });
      fs.writeFileSync(source, buf);
      fixed.push(rel);
      done = true;
    }
    if (!done) upstreamMissing.push(`${rel} (线上也取不到)`);
  }
  totalFixed += fixed.length;
  totalUpstreamMissing += upstreamMissing.length;
  console.log(`FIX  ${localId}: 补回 ${fixed.length} 个，仍缺 ${upstreamMissing.length} 个`);
  for (const f of fixed) console.log(`     + ${f}`);
  for (const m of upstreamMissing) console.log(`     - ${m} (线上也缺)`);
  summary.push({ localId, fixed, upstreamMissing, root });
}

fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'lq-asset-repair.json'),
  JSON.stringify(summary, null, 1)
);
console.log(`\n补回 ${totalFixed} 个，线上也缺 ${totalUpstreamMissing} 个`);
