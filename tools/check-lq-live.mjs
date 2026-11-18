#!/usr/bin/env node
/*
 * 一门一门地把课件真正打开，抓下浏览器发出的每一个请求，看哪一个失败。
 *
 * 之前的检查是照着 HTML 猜地址，猜错了就把 <base> 忽略了，于是把上百门
 * 没坏的课件说成坏的。这一页不猜：它让浏览器自己去要每一个文件，然后把
 * 失败的那些原样记下来。裂开的图、报错的脚本、空白的画面，都在这里面。
 *
 *   node tools/check-lq-live.mjs --sample 120
 *   node tools/check-lq-live.mjs --all
 *   node tools/check-lq-live.mjs --only afe-842,afe-1016
 */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const SAMPLE = Number(argOf('--sample', '120'));
const ONLY = argOf('--only', '');
const ALL = argv.includes('--all');
const WAIT = Number(argOf('--wait', '2600'));
const REPORT = argOf('--report', '');

const catalogue = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
const products = catalogue.products.filter((p) => p.localInstalled !== false);

function pickSample() {
  const byEdition = new Map();
  for (const p of products) {
    const e = p.edition || 'all';
    if (!byEdition.has(e)) byEdition.set(e, []);
    byEdition.get(e).push(p);
  }
  const out = [];
  const per = Math.max(1, Math.floor(SAMPLE / byEdition.size));
  let round = 0;
  while (out.length < SAMPLE) {
    let added = 0;
    for (const list of byEdition.values()) {
      if (out.length >= SAMPLE) break;
      const p = list[round];
      if (p) {
        out.push(p);
        added++;
      }
    }
    if (!added) break;
    round++;
  }
  return out;
}

const targets = ONLY
  ? products.filter((p) => ONLY.split(',').map((s) => s.trim()).includes(p.id))
  : ALL
    ? products
    : pickSample();

console.log(
  `乐启享课件库 · 浏览器实测：${targets.length} 门（每门等 ${WAIT}ms，失败请求逐个记下）`
);

const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);
await browser.raw('Network.enable', {}, browser.pageSession);
await browser.raw('Runtime.enable', {}, browser.pageSession);
await browser.raw('Log.enable', {}, browser.pageSession).catch(() => {});

let failedRequests = [];
let consoleErrors = [];

const drain = () => {
  for (const e of browser.events.splice(0)) {
    if (e.method === 'Network.loadingFailed') {
      failedRequests.push({
        url: e.params.requestId,
        error: e.params.errorText,
        type: e.params.type,
      });
    }
    if (e.method === 'Network.responseReceived') {
      const r = e.params.response;
      if (r.status >= 400) {
        failedRequests.push({ url: r.url, status: r.status, type: e.params.type });
      }
    }
    if (e.method === 'Runtime.exceptionThrown') {
      const d = e.params.exceptionDetails || {};
      consoleErrors.push(d.exception?.description || d.text || 'exception');
    }
    if (e.method === 'Log.entryAdded' && e.params.entry?.level === 'error') {
      consoleErrors.push(e.params.entry.text);
    }
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
      consoleErrors.push(
        (e.params.args || [])
          .map((a) => a.value ?? a.description ?? '')
          .join(' ')
          .slice(0, 300)
      );
    }
  }
};
setInterval(drain, 80).unref();

const results = [];
let n = 0;
for (const p of targets) {
  failedRequests = [];
  consoleErrors = [];
  await browser.goto(
    `http://localhost:${PORT}/courseware/${encodeURIComponent(p.id)}?local=1`
  );
  await sleep(WAIT);
  drain();

  const out = await browser.evaluate(`(() => {
    const imgs = [...document.querySelectorAll('img')];
    const broken = imgs
      .filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src'))
      .map(i => i.currentSrc || i.src);
    const text = (document.body.innerText || '').replace(/\\s+/g, ' ').trim();
    return {
      broken,
      imgs: imgs.length,
      textLen: text.length,
      nodes: document.body.querySelectorAll('*').length,
      frames: document.querySelectorAll('iframe').length,
    };
  })()`);

  /* 只有真正指向本机的失败才算数；第三方地址不算。 */
  const localFails = failedRequests.filter((f) => {
    const u = String(f.url || '');
    return u.startsWith('http://localhost:' + PORT) || u.startsWith('http://127.0.0.1:' + PORT);
  });
  const errs = consoleErrors.filter(Boolean).slice(0, 4);
  results.push({
    id: p.id,
    edition: p.edition || 'all',
    subject: p.subject,
    broken: out.broken,
    imgs: out.imgs,
    textLen: out.textLen,
    nodes: out.nodes,
    frames: out.frames,
    failed: localFails.map((f) => ({
      url: String(f.url || '').replace(`http://localhost:${PORT}`, '').replace(`http://127.0.0.1:${PORT}`, ''),
      status: f.status || 0,
      error: f.error || '',
    })),
    errors: errs,
  });
  n++;
  const bad = out.broken.length || localFails.length || errs.length || out.nodes < 5;
  if (bad || n % 40 === 0) {
    console.log(
      `${bad ? 'BAD ' : 'ok  '} ${p.id}  图 ${out.imgs} 裂 ${out.broken.length} 失败 ${localFails.length} 节点 ${out.nodes}`
    );
    for (const f of localFails.slice(0, 5)) {
      console.log(`       失败 ${f.status || f.error}  ${String(f.url).slice(0, 130)}`);
    }
    for (const b of out.broken.slice(0, 4)) console.log(`       裂图 ${String(b).slice(-110)}`);
    for (const e of errs.slice(0, 2)) console.log(`       报错 ${String(e).slice(0, 140)}`);
  }
}

drain();
await browser.close();

const bad = results.filter((r) => r.broken.length || r.failed.length || r.errors.length || r.nodes < 5);
console.log('');
console.log(`跑完 ${results.length} 门，有问题 ${bad.length} 门。`);

const byFile = new Map();
for (const r of bad) {
  for (const f of r.failed) {
    if (!byFile.has(f.url)) byFile.set(f.url, { count: 0, ids: [] });
    const e = byFile.get(f.url);
    e.count++;
    e.ids.push(r.id);
  }
}
console.log('\n--- 同一个地址被多少门课件问坏');
for (const [u, e] of [...byFile].sort((a, b) => b[1].count - a[1].count).slice(0, 30)) {
  console.log(`   ${String(e.count).padStart(4)} 门  ${u}  例: ${e.ids.slice(0, 3).join(', ')}`);
}

const byEdition = new Map();
for (const r of results) {
  const e = r.edition;
  if (!byEdition.has(e)) byEdition.set(e, { total: 0, bad: 0 });
  const s = byEdition.get(e);
  s.total++;
  if (r.broken.length || r.failed.length || r.errors.length || r.nodes < 5) s.bad++;
}
console.log('');
for (const [e, s] of byEdition) console.log(`   ${e}: ${s.total} 门，${s.bad} 门有问题`);

if (REPORT) {
  fs.writeFileSync(REPORT, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 1));
  console.log('\n报告写入 ' + REPORT);
}

process.exit(bad.length ? 1 : 0);
