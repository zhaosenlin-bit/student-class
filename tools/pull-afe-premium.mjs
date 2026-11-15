#!/usr/bin/env node
/*
 * 把精品课（作品号 846-1346）的正文与素材拉回本地。
 *
 * 这批作品的正文不在 /api/programs 里（那是 442 个"作品"），而在
 * /api/premium/catalogue 里（480 门"精品课"），每门指向一个自己的
 * programId。线上给每个账号**每门免费体验课 10 次**的官方试看额度：
 *
 *   POST /api/premium/playback/launch   {programId, useId}
 *        -> { token, expiresAt, accessType: "premium_sample" }
 *   GET  /api/program-file/<id>/body     Authorization: Bearer <token>
 *        -> 正文（含带租约的 <base href>）
 *
 * 拿到正文后顺着引用链把素材目录抓完，再 playback/close 把租约还回去。
 *
 *   node tools\pull-afe-premium.mjs                 # 只拉免费体验的 33 门
 *   node tools\pull-afe-premium.mjs --ids 846,858   # 指定作品号
 *   node tools\pull-afe-premium.mjs --all           # 全部 480 门
 *        （需要账号本身有 VIP 会员权益；没有的话会如实报 premium_required）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlAssets, assetRootOf } from './afe-crawl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();

const args = process.argv.slice(2);
const wantAll = args.includes('--all');
const refresh = args.includes('--refresh');
const workers = Number(args.includes('--workers') ? args[args.indexOf('--workers') + 1] : 3);
const onlyIds = args.includes('--ids')
  ? args[args.indexOf('--ids') + 1].split(',').map((s) => Number(s.trim()))
  : null;

const GAP = Number(process.env.AFE_GAP || 400);
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace();
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': UA,
        Referer: `${ORIGIN}/`,
        ...(options.headers || {}),
      },
    });
    if (res.status !== 429) return res;
    const pause = 4000 * (attempt + 1) + Math.floor(Math.random() * 3000);
    console.log(`   429, 等 ${pause}ms`);
    await new Promise((r) => setTimeout(r, pause));
  }
  return fetch(url, options);
}

const catalogue = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'premium', 'catalogue.json'), 'utf8')
);

let targets = catalogue.courses.filter((c) => c.programId);
if (onlyIds) targets = targets.filter((c) => onlyIds.includes(Number(c.programId)));
else if (!wantAll) targets = targets.filter((c) => c.freeSample);

console.log(
  `精品课目标 ${targets.length} 门` +
    (wantAll ? '（全部）' : onlyIds ? '（指定）' : '（免费体验额度）')
);

const launchHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  'Content-Type': 'application/json',
  'X-Premium-Catalogue-Intent': 'cataloguing',
};

async function pullOne(course) {
  const id = Number(course.programId);
  const bodyFile = path.join(CW, `${id}.html`);
  if (fs.existsSync(bodyFile) && fs.statSync(bodyFile).size > 0 && !refresh) {
    const html = fs.readFileSync(bodyFile, 'utf8');
    const r = await crawlAssets({
      origin: ORIGIN,
      cwDir: CW,
      id,
      html,
      fetchBuffer: (url) => fetchBufferWith(url, TOKEN),
    });
    return { id, title: course.title, ok: true, cached: true, files: r.files, missing: r.missing };
  }

  const useId = crypto.randomUUID();
  const launchRes = await request(`${ORIGIN}/api/premium/playback/launch`, {
    method: 'POST',
    headers: launchHeaders,
    body: JSON.stringify({ programId: id, useId }),
  });
  const launchText = await launchRes.text();
  let launch = null;
  try {
    launch = JSON.parse(launchText);
  } catch {
    /* 非 JSON 的错误页 */
  }
  if (!launch?.token) {
    return {
      id,
      title: course.title,
      ok: false,
      reason: launch?.error || launch?.msg || `launch ${launchRes.status}`,
    };
  }

  /* 正文要带两种凭证：查询串上的租约 token，和同样的 Bearer 头。 */
  const bodyRes = await request(
    `${ORIGIN}/api/program-file/${id}/body?token=${encodeURIComponent(launch.token)}`,
    { headers: { Authorization: `Bearer ${launch.token}`, Origin: ORIGIN } }
  );
  if (!bodyRes.ok) {
    const text = await bodyRes.text();
    await closeLease(useId);
    return { id, title: course.title, ok: false, reason: `body ${bodyRes.status} ${text.slice(0, 80)}` };
  }
  const body = Buffer.from(await bodyRes.arrayBuffer());
  const html = body.toString('utf8');
  fs.mkdirSync(CW, { recursive: true });
  fs.writeFileSync(bodyFile, body);

  const r = await crawlAssets({
    origin: ORIGIN,
    cwDir: CW,
    id,
    html,
    fetchBuffer: (url) => fetchBufferWith(url, launch.token),
  });
  await closeLease(useId);

  return {
    id,
    title: course.title,
    ok: true,
    bytes: body.length,
    files: r.files,
    missing: r.missing,
    sampleRemaining: launch.sampleRemaining ?? null,
    root: assetRootOf(html),
  };
}

async function closeLease(useId) {
  await request(`${ORIGIN}/api/premium/playback/close`, {
    method: 'POST',
    headers: launchHeaders,
    body: JSON.stringify({ useId }),
  }).catch(() => {});
}

async function fetchBufferWith(url, auth) {
  const res = await request(url, { headers: { Authorization: `Bearer ${auth}` } }).catch(() => null);
  if (!res || !res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

const report = [];
let cursor = 0;
let done = 0;

async function worker() {
  while (cursor < targets.length) {
    const course = targets[cursor++];
    let result;
    try {
      result = await pullOne(course);
    } catch (e) {
      result = { id: course.programId, title: course.title, ok: false, reason: e.message };
    }
    done++;
    report.push(result);
    const mark = result.ok ? 'ok  ' : 'FAIL';
    const extra = result.ok
      ? `${String(result.bytes || 0).padStart(8)}B files=${result.files} miss=${result.missing}` +
        (result.sampleRemaining != null ? ` 余次=${result.sampleRemaining}` : '')
      : result.reason;
    console.log(`${mark} ${done}/${targets.length} ${result.id} ${String(result.title).slice(0, 26)} ${extra}`);
  }
}

await Promise.all(Array.from({ length: Math.max(1, workers) }, worker));

const ok = report.filter((r) => r.ok);
const failed = report.filter((r) => !r.ok);
console.log(`\n成功 ${ok.length} / ${report.length}`);
if (failed.length) {
  const byReason = {};
  for (const f of failed) byReason[f.reason] = (byReason[f.reason] || 0) + 1;
  console.log('失败原因：', byReason);
}
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'afe-premium-report.json'),
  JSON.stringify(report, null, 1)
);

