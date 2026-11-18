#!/usr/bin/env node
/*
 * 全库体检，多个标签同时跑。
 *
 * 一门一门地开，等于把用户等课件的时间也花在等上了：课件库有一千多门，
 * 串行扫一轮要一整天。这里开若干个标签，一门一门地分给它们，谁先空谁
 * 先接下一门，一轮下来十几分钟就能把全库过一遍。
 *
 * 每一门都看三件事：
 *   裂图    —— 页面和它里面每一层框架里，<img> 真的没画出来的那几张
 *   取不到  —— 向本机要的地址里，浏览器真的报了错的那几个
 *   空白    —— 页面和框架里都没有多少字，说明课件没跑起来
 *
 *   node tools/check-lq-parallel.mjs --tabs 8 --wait 1400
 *   node tools/check-lq-parallel.mjs --only afe-842,phet-area-builder
 *
 * 两条路：
 *   --route direct   直接打开课件的地址（默认）。这样能看见课件正文里
 *                    裂掉的图。
 *   --route app      从课件库里点进去。这样能看见"在课件库里点开"是
 *                    不是真的打开了 —— 外壳上那一层"正在打开课件…"
 *                    有没有收起来。
 *
 * 等多久不是定死的：每开一门课件都去看它自己报"我好了"没有，报了就
 * 立刻看图，马上接下一门。慢的课不会把整轮体检拖慢，快课也不用
 * 白等。--wait 只是上限。
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
const TABS = Math.max(1, Number(argOf('--tabs', '8')));
const WAIT = Number(argOf('--wait', '1400'));
const MAX_WAIT = Math.max(WAIT, Number(argOf('--max-wait', '30000')));
const ONLY = argOf('--only', '');
const REPORT = argOf('--report', 'recon/scratch/lq-parallel.json');
const ROUTE = argOf('--route', 'direct');

const catalogue = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
let products = catalogue.products.filter((p) => p.localInstalled !== false);
if (ONLY) {
  const want = new Set(ONLY.split(',').map((s) => s.trim()));
  products = products.filter((p) => want.has(p.id));
}

console.log(
  `乐启享课件库 · 全库体检：${products.length} 门，开 ${TABS} 个标签并行，每门等 ${WAIT}ms`
);

const browser = await connect(CDP);

/* ---------- 开一组标签 ---------- */
const sessionOf = new Map();
const remember = () => {
  for (const [sid, s] of browser.sessions) {
    sessionOf.set(s.targetInfo.targetId, sid);
  }
};
remember();

const pageSessions = [];
const createdTargets = [];
for (let i = 0; i < TABS; i++) {
  if (i === 0) {
    pageSessions.push(browser.pageSession);
    continue;
  }
  const t = await browser.raw('Target.createTarget', { url: 'about:blank' });
  createdTargets.push(t.targetId);
  await sleep(500);
  remember();
  const sid = sessionOf.get(t.targetId);
  if (sid) pageSessions.push(sid);
}

for (const sid of pageSessions) {
  await browser.raw('Page.enable', {}, sid).catch(() => {});
  await browser.raw('Network.enable', {}, sid).catch(() => {});
  await browser.raw('Runtime.enable', {}, sid).catch(() => {});
  /*
   * 课件自己会告诉外壳"我好了"或者"我起不来"。这一段在文档一开始就在听，
   * 所以连一句提示都不会漏掉。
   */
  await browser
    .raw(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `(() => {
          window.__lqStartup = { phase: '', error: '' };
          window.addEventListener('message', e => {
            const d = e.data;
            if (!d || d.type !== 'leqixiang:courseware-startup') return;
            window.__lqStartup.phase = d.phase || '';
            if (d.phase === 'error') {
              window.__lqStartup.error = (d.detail && d.detail.message) || '课件启动失败';
            }
          });
        })();`,
      },
      sid
    )
    .catch(() => {});
  await browser.raw(
    'Emulation.setDeviceMetricsOverride',
    { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
    sid
  ).catch(() => {});
}

/* ---------- 听网络 ---------- */
const netFails = new Map(); // sessionId -> []
const consoleErrs = new Map(); // sessionId -> []
browser.on((m) => {
  const sid = m.sessionId || '';
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.status >= 400) {
      if (!netFails.has(sid)) netFails.set(sid, []);
      netFails.get(sid).push({ url: r.url, status: r.status });
    }
  }
  if (m.method === 'Network.loadingFailed') {
    if (!netFails.has(sid)) netFails.set(sid, []);
    netFails.get(sid).push({ url: '', status: 0, error: m.params.errorText, type: m.params.type });
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    if (!consoleErrs.has(sid)) consoleErrs.set(sid, []);
    consoleErrs.get(sid).push(d.exception?.description || d.text || 'exception');
  }
});

/* 框架是课件自己的页面，也要一起看。 */
const childrenOf = (pageSid) => {
  const out = [];
  for (const [sid, s] of browser.sessions) {
    if (s.parent === pageSid) out.push(sid);
  }
  return out;
};

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
  let nodes = 0;
  let canvas = 0;
  let svg = 0;
  for (const d of docs) {
    if (!d.body) continue;
    nodes += d.body.querySelectorAll('*').length;
    canvas += d.querySelectorAll('canvas').length;
    svg += d.querySelectorAll('svg').length;
  }
  return {
    list: broken.map((i) => (i.currentSrc || i.src).slice(-150)),
    total: imgs.length,
    nodes: nodes,
    canvas: canvas,
    svg: svg,
    textLen: text.length,
    head: text.slice(0, 90)
  };
})()`;

/*
 * 课件自己报"我好了"没有。直接打开时是课件自己那份报告；从课件库里
 * 打开时是外壳上那一层"正在打开课件…"有没有收起来。
 */
const READY = `(() => {
  const startup = window.__XBStartup && window.__XBStartup.report;
  const phase = (startup && startup.phase) || (window.__lqStartup && window.__lqStartup.phase) || '';
  const layer = document.querySelector('#lesson-loading');
  const room = document.querySelector('#classroom');
  const imgs = Array.from(document.images || []);
  return {
    phase: phase,
    error: (startup && startup.phase === 'error') ? '课件启动失败' : (window.__lqStartup && window.__lqStartup.error) || '',
    shellHidden: !layer || layer.hidden !== false,
    shellError: !!(layer && layer.classList.contains('error-state')),
    started: !!(room && room.hidden === false),
    settled: imgs.every((i) => i.complete),
    state: document.readyState,
    nodes: document.body ? document.body.querySelectorAll('*').length : 0,
  };
})()`;

/*
 * 等课件自己说好了就立刻看图。慢课等它自己，慢到 --max-wait 还没好就
 * 记成没打开 —— 不然一轮体检要等到天亮。
 */
const waitForReady = async (sid) => {
  const deadline = Date.now() + MAX_WAIT;
  let last = null;
  for (;;) {
    await sleep(350);
    try {
      last = await browser.evaluate(READY, undefined, sid);
    } catch {
      last = null;
    }
    if (!last) continue;
    if (last.shellError || last.error) return last;
    if (ROUTE === 'app') {
      /*
       * From the library: the lesson has opened (the room is on screen) and
       * the layer that says "opening…" has gone away. That is what "it
       * opened" means to the reader.
       */
      if (last.started && last.shellHidden) return last;
    } else if (last.phase === 'ready' || last.phase === 'error') {
      return last;
    } else if (!last.phase && last.state === 'complete' && last.settled) {
      /*
       * An older lesson says nothing about being ready. There the page
       * itself is the answer: it is loaded and its pictures have all
       * settled — settled or not, a picture that cannot be fetched shows
       * up as broken right after.
       */
      return last;
    }
    if (Date.now() >= deadline) return last;
  }
};

const results = [];
let cursor = 0;
let done = 0;

const take = async (sid) => {
  if (cursor >= products.length) return null;
  return products[cursor++];
};

const worker = async (sid) => {
  for (;;) {
    const p = await take(sid);
    if (!p) return;
    const mark = new Map();
    for (const [s, list] of netFails) mark.set(s, list.length);
    const errMark = new Map();
    for (const [s, list] of consoleErrs) errMark.set(s, list.length);
    const url =
      ROUTE === 'app'
        ? `http://localhost:${PORT}/#play/${encodeURIComponent(p.id)}`
        : `http://localhost:${PORT}/courseware/${encodeURIComponent(p.id)}?local=1`;
    /*
     * From the library the page is not reloaded, only the part after the
     * hash changes — so the note from the previous lesson is still on the
     * page. Wipe it, or the next lesson looks finished before it starts.
     */
    await browser
      .raw(
        'Runtime.evaluate',
        { expression: 'window.__lqStartup={phase:"",error:""};' },
        sid
      )
      .catch(() => {});
    try {
      await browser.raw('Page.navigate', { url }, sid);
    } catch {
      /* 页面忙，等下面读内容时再判断 */
    }
    const ready = await waitForReady(sid);
    await sleep(WAIT);
    const kids = childrenOf(sid);
    await sleep(250);

    const broken = [];
    let imgs = 0;
    let nodes = 0;
    let textLen = 0;
    let canvas = 0;
    let svg = 0;
    let head = '';
    const sids = [sid, ...kids];
    for (const s of sids) {
      let r;
      try {
        r = await browser.evaluate(PROBE, undefined, s);
      } catch {
        continue;
      }
      broken.push(...r.list);
      imgs += r.total;
      nodes += r.nodes;
      canvas += r.canvas;
      svg += r.svg;
      textLen += r.textLen;
      if (!head && r.head) head = r.head;
    }

    const failed = [];
    for (const s of sids) {
      const list = netFails.get(s);
      if (!list) continue;
      for (const f of list.slice(mark.get(s) || 0)) {
        const u = String(f.url || '');
        if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith(`http://127.0.0.1:${PORT}`)) {
          /* 只认本机取不到的；外面的地址不算。 */
          continue;
        }
        failed.push({
          url: u.replace(`http://localhost:${PORT}`, '').replace(`http://127.0.0.1:${PORT}`, ''),
          status: f.status || 0,
          error: f.error || ''
        });
      }
    }

    const errs = (consoleErrs.get(sid) || []).slice(errMark.get(sid) || 0, 3);
    done++;
    /*
     * 从课件库里打开的时候，看外壳上那一层"正在打开课件…"有没有收起
     * 来。收起来了，才算真的打开了。直接打开时，看课件自己报的那一
     * 句"我好了"有没有来。
     */
    const shell = ready || { loadingHidden: true, loadingError: false, phase: '', error: '' };
    /*
     * 屏幕上什么都没有，才算没跑起来。画布上的课件没有字，
     * 所以字少不算坏；有画、有图、节点多，都算跑起来了。
     */
    const blank = textLen < 12 && canvas === 0 && svg === 0 && imgs === 0 && nodes < 12;
    const stuck =
      ROUTE === 'app'
        ? !shell.shellHidden || shell.shellError || !!shell.error
        : shell.phase === 'error';
    const bad = broken.length || failed.length || blank || stuck;
    results.push({
      id: p.id,
      edition: p.edition || 'all',
      subject: p.subject || '',
      broken,
      imgs,
      canvas,
      svg,
      textLen,
      nodes,
      head,
      failed,
      errors: errs,
      shell
    });
    if (bad) {
      console.log(
        `BAD  ${p.id}  裂 ${broken.length} 失败 ${failed.length} 字 ${textLen} 画 ${canvas}` +
          (stuck ? ` 起 ${shell.phase || '-'} ${shell.error || '还在转圈'}` : '')
      );
      for (const b of broken.slice(0, 3)) console.log(`        裂图 ${b}`);
      for (const f of failed.slice(0, 3)) console.log(`        取不到 ${f.status || f.error} ${f.url.slice(0, 120)}`);
      for (const e of errs.slice(0, 2)) console.log(`        报错 ${String(e).slice(0, 130)}`);
    }
    if (done % 100 === 0) console.log(`... ${done}/${products.length}`);
  }
};

await Promise.all(pageSessions.map((sid) => worker(sid)));

/* ---------- 汇总 ---------- */
const bad = results.filter(
  (r) =>
    r.broken.length ||
    r.failed.length ||
    (r.textLen < 12 && r.canvas === 0 && r.svg === 0 && r.imgs === 0 && r.nodes < 12) ||
    (ROUTE === 'app' && (!r.shell.shellHidden || r.shell.shellError || !!r.shell.error))
);
console.log('');
console.log(`跑完 ${results.length} 门，有问题 ${bad.length} 门。`);

const byUrl = new Map();
for (const r of bad) {
  for (const f of r.failed) {
    if (!byUrl.has(f.url)) byUrl.set(f.url, { count: 0, ids: [] });
    const e = byUrl.get(f.url);
    e.count++;
    e.ids.push(r.id);
  }
}
console.log('\n--- 同一个地址被多少门课件问坏');
for (const [u, e] of [...byUrl].sort((a, b) => b[1].count - a[1].count).slice(0, 40)) {
  console.log(`   ${String(e.count).padStart(4)} 门  ${u.slice(0, 120)}  例: ${e.ids.slice(0, 3).join(', ')}`);
}

const byEdition = new Map();
for (const r of results) {
  const e = r.edition;
  if (!byEdition.has(e)) byEdition.set(e, { total: 0, bad: 0 });
  const s = byEdition.get(e);
  s.total++;
  if (
    r.broken.length ||
    r.failed.length ||
    (r.textLen < 12 && r.canvas === 0 && r.svg === 0 && r.imgs === 0 && r.nodes < 12)
  )
    s.bad++;
}
console.log('');
for (const [e, s] of byEdition) console.log(`   ${e}: ${s.total} 门，${s.bad} 门有问题`);

if (REPORT) {
  fs.writeFileSync(REPORT, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 1));
  console.log('\n报告写入 ' + REPORT);
}

/*
 * 关掉这一轮开出来的标签。留着不管，下一轮体检就得多扛几门课件，
 * 机器一忙，本来能开的课件也开不出来 —— 体检自己把结论搞坏了。
 */
for (const targetId of createdTargets) {
  await browser.raw('Target.closeTarget', { targetId }).catch(() => {});
}
await browser.close();
process.exit(bad.length ? 1 : 0);
