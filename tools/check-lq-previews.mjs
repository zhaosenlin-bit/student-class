#!/usr/bin/env node
/*
 * 一门一门地把课件打开，看它在浏览器里到底出了什么事。
 *
 * 页面能打开（200）不等于课件能看：脚本可能报错，图片可能裂，控件可能
 * 一个也没有。这一页真的把课件放进浏览器里跑一遍，把裂的图、报的错、
 * 空的正文都记下来，按分类汇总。
 *
 *   node tools/check-lq-previews.mjs --sample 80
 *   node tools/check-lq-previews.mjs --only afe-206,afe-20
 *   node tools/check-lq-previews.mjs --all
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
const SAMPLE = Number(argOf('--sample', '60'));
const ONLY = argOf('--only', '');
const ALL = argv.includes('--all');
const WAIT = Number(argOf('--wait', '2600'));
const REPORT = argOf('--report', '');

const catalogue = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
const products = catalogue.products.filter((p) => p.localInstalled !== false);

/* 每个版本各取一些，分类里出的问题才看得出来。 */
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
  `乐启享课件库 · 预览实跑：${targets.length} 门（每个版本轮流取样，每门等 ${WAIT}ms）`
);

const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);
await browser.raw('Runtime.enable', {}, browser.pageSession);
await browser.raw('Log.enable', {}, browser.pageSession).catch(() => {});

let consoleErrors = [];
const drain = () => {
  for (const e of browser.events.splice(0)) {
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
setInterval(drain, 100).unref();

const results = [];
let n = 0;
for (const p of targets) {
  consoleErrors = [];
  await browser.goto(
    `http://localhost:${PORT}/courseware/${encodeURIComponent(p.id)}?local=1`
  );
  await sleep(WAIT);
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
      canvas: document.querySelectorAll('canvas').length,
      svg: document.querySelectorAll('svg').length,
    };
  })()`);
  const errs = consoleErrors.filter(Boolean).slice(0, 4);
  results.push({
    id: p.id,
    edition: p.edition || 'all',
    subject: p.subject,
    broken: out.broken,
    imgs: out.imgs,
    textLen: out.textLen,
    nodes: out.nodes,
    errors: errs,
  });
  n++;
  const bad = out.broken.length || errs.length || out.nodes < 5;
  if (bad || n % 25 === 0) {
    console.log(
      `${bad ? 'BAD ' : 'ok  '} ${p.id}  图 ${out.imgs} 裂 ${out.broken.length} 节点 ${out.nodes} 字 ${out.textLen}` +
        (errs.length ? `  错: ${errs[0].slice(0, 120)}` : '')
    );
    for (const b of out.broken.slice(0, 4)) console.log(`       裂图 ${String(b).slice(-110)}`);
  }
}

drain();
await browser.close();

const bad = results.filter((r) => r.broken.length || r.errors.length || r.nodes < 5);
console.log('');
console.log(`跑完 ${results.length} 门，有问题 ${bad.length} 门。`);
const byEdition = new Map();
for (const r of results) {
  const e = r.edition;
  if (!byEdition.has(e)) byEdition.set(e, { total: 0, bad: 0 });
  const s = byEdition.get(e);
  s.total++;
  if (r.broken.length || r.errors.length || r.nodes < 5) s.bad++;
}
for (const [e, s] of byEdition) console.log(`   ${e}: ${s.total} 门，${s.bad} 门有问题`);

if (REPORT) {
  fs.writeFileSync(
    REPORT,
    JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 1)
  );
  console.log(`报告写入 ${REPORT}`);
}
