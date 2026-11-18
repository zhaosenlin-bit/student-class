#!/usr/bin/env node
/*
 * 在课件库里面实地看一门课。
 *
 * 有几门课带着"必须从课件库打开"的门禁。单独打开它的地址，门禁会挡住，
 * 看上去像空白，其实是误判。真正要看的，是从课件库点进去以后的样子。
 *
 *   node tools/check-lq-in-app.mjs afe-754 afe-11
 *   node tools/check-lq-in-app.mjs --all
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
const WAIT = Number(argOf('--wait', '2600'));
const REPORT = argOf('--report', '');
const ONLY = argOf('--only', '');

const catalogue = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
let products = catalogue.products.filter((p) => p.localInstalled !== false);
if (ONLY) {
  const want = new Set(ONLY.split(',').map((s) => s.trim()));
  products = products.filter((p) => want.has(p.id));
} else if (!argv.includes('--all')) {
  products = products.filter((p) => argv.includes(p.id));
}

console.log(
  `乐启享课件库 · 从课件库里看：${products.length} 门，每门等 ${WAIT}ms`
);

const browser = await connect(CDP);

const sessionOf = new Map();
const remember = () => {
  for (const [sid, s] of browser.sessions) {
    sessionOf.set(s.targetInfo.targetId, sid);
  }
};
remember();

const t = await browser.raw('Target.createTarget', { url: 'about:blank' });
await sleep(600);
remember();
const sid = sessionOf.get(t.targetId);

await browser.raw('Page.enable', {}, sid).catch(() => {});
await browser.raw('Network.enable', {}, sid).catch(() => {});
await browser.raw('Runtime.enable', {}, sid).catch(() => {});
/*
 * 课件自己会告诉外壳"我好了"或者"我起不来"。这一段在文档一开始就在听，
 * 所以连一句提示都不会漏掉。
 */
await browser
  .raw('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      window.__lqStartup = { phase: '', error: '', detail: null };
      window.addEventListener('message', e => {
        const d = e.data;
        if (!d || d.type !== 'leqixiang:courseware-startup') return;
        window.__lqStartup.phase = d.phase || '';
        if (d.detail) window.__lqStartup.detail = d.detail;
        if (d.phase === 'error') {
          window.__lqStartup.error = (d.detail && d.detail.message) || '课件启动失败';
        }
      });
    })();`,
  })
  .catch(() => {});
await browser
  .raw(
    'Emulation.setDeviceMetricsOverride',
    { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
    sid
  )
  .catch(() => {});

const netFails = [];
browser.on((m) => {
  if (m.sessionId !== sid) return;
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    netFails.push({ url: m.params.response.url, status: m.params.response.status });
  }
  if (m.method === 'Network.loadingFailed') {
    netFails.push({ url: '', status: 0, error: m.params.errorText });
  }
});

const PROBE = `(() => {
  const docs = [document];
  for (const f of Array.from(document.querySelectorAll('iframe'))) {
    try {
      if (f.contentDocument && f.contentDocument.body) docs.push(f.contentDocument);
    } catch (e) {}
  }
  const imgs = [];
  for (const d of docs) imgs.push(...Array.from(d.querySelectorAll('img')));
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src'));
  let text = '';
  for (const d of docs) text += ' ' + (d.body ? d.body.innerText || '' : '');
  text = text.replace(/\\s+/g, ' ').trim();
  let nodes = 0, canvas = 0, svg = 0;
  for (const d of docs) {
    if (!d.body) continue;
    nodes += d.body.querySelectorAll('*').length;
    canvas += d.querySelectorAll('canvas').length;
    svg += d.querySelectorAll('svg').length;
  }
  return {
    list: broken.map((i) => (i.currentSrc || i.src).slice(-150)),
    total: imgs.length,
    nodes, canvas, svg,
    textLen: text.length,
    head: text.slice(0, 110),
    frames: document.querySelectorAll('iframe').length
  };
})()`;

const results = [];
for (const p of products) {
  const mark = netFails.length;
  const url = `http://localhost:${PORT}/#play/${encodeURIComponent(p.id)}`;
  await browser.raw('Page.navigate', { url }, sid).catch(() => {});
  await sleep(WAIT);

  let r = { list: [], total: 0, nodes: 0, canvas: 0, svg: 0, textLen: 0, head: '', frames: 0 };
  try {
    r = await browser.evaluate(PROBE, undefined, sid);
  } catch {
    /* 页面还在跳，按没跑起来算 */
  }

  const failed = [];
  for (const f of netFails.slice(mark)) {
    const u = String(f.url || '');
    if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith(`http://127.0.0.1:${PORT}`)) {
      continue;
    }
    failed.push({
      url: u.replace(`http://localhost:${PORT}`, '').replace(`http://127.0.0.1:${PORT}`, ''),
      status: f.status || 0,
      error: f.error || ''
    });
  }

  const blank = r.textLen < 12 && r.canvas === 0 && r.svg === 0 && r.total === 0 && r.nodes < 12;
  /*
   * 外壳上那一层"正在打开课件…"有没有收起来。收起来了，说明课件在框架
   * 里真的画出了画面；没收起来，就是还卡在打开的过程中 —— 这种一眼
   * 就看得出来，正是"点进去一直转圈"的那些课。
   */
  let shell = { loadingHidden: true, loadingError: false, loadingText: '', phase: '', error: '' };
  try {
    const s = await browser.raw(
      'Runtime.evaluate',
      {
        expression: `(() => {
          const el = document.querySelector('#lesson-loading');
          const st = window.__lqStartup || {};
          return {
            loadingHidden: !el || el.hidden !== false,
            loadingError: !!(el && el.classList.contains('error-state')),
            loadingText: el ? (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80) : '',
            phase: st.phase || '',
            error: st.error || '',
          };
        })()`,
        returnByValue: true,
      },
      sid
    );
    if (s && s.result && s.result.value) shell = s.result.value;
  } catch {
    /* 页面还在跳，按没跑起来算。 */
  }
  const stuck = !shell.loadingHidden || shell.loadingError || !!shell.error;
  const bad = r.list.length || failed.length || blank || stuck;
  results.push({
    id: p.id,
    broken: r.list,
    imgs: r.total,
    canvas: r.canvas,
    svg: r.svg,
    textLen: r.textLen,
    nodes: r.nodes,
    frames: r.frames,
    head: r.head,
    failed,
    shell
  });
  console.log(
    `${bad ? 'BAD ' : ' ok '} ${p.id.padEnd(34)} 裂 ${r.list.length} 失败 ${failed.length} 字 ${r.textLen} 画 ${r.canvas} 框 ${r.frames} 起 ${shell.phase || '-'} ${shell.loadingHidden ? '' : '还在转圈'}  ${r.head.slice(0, 50)}`
  );
  for (const b of r.list.slice(0, 3)) console.log(`        裂图 ${b}`);
  for (const f of failed.slice(0, 3)) console.log(`        取不到 ${f.status || f.error} ${f.url.slice(0, 120)}`);
  if (shell.error) console.log(`        起不来 ${shell.error}`);
  if (!shell.loadingHidden) console.log(`        还停在外壳上 ${shell.loadingText}`);
}

const bad = results.filter(
  (r) =>
    r.broken.length ||
    r.failed.length ||
    (r.textLen < 12 && r.canvas === 0 && r.svg === 0 && r.imgs === 0 && r.nodes < 12) ||
    !r.shell.loadingHidden ||
    r.shell.loadingError ||
    !!r.shell.error
);
console.log(`\n看完 ${results.length} 门，有问题 ${bad.length} 门。`);
if (REPORT) {
  fs.writeFileSync(REPORT, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 1));
  console.log('报告写入 ' + REPORT);
}

await browser.close();
process.exit(bad.length ? 1 : 0);
