#!/usr/bin/env node
/*
 * 逐个打开镜像下来的那些网页，看它们是不是真的能看。
 *
 * 课件正文体检只管课件自己那一页。课件里引用到的、由外面某个站点
 * 存下来的页面（"_ext" 目录里那些）另算：那些页面自己会写图、样式表、
 * 兄弟页面，有的要求站点根目录，有的还留着广告和统计脚本。
 *
 * 每一页看三件事：裂了几张图、请求了几次外网、有没有报错的脚本。
 *
 *   node tools/check-lq-ext-pages.mjs --tabs 6
 *   node tools/check-lq-ext-pages.mjs --only www.mathopenref.com
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const CW = 'mirror/leqixiang/courseware';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const TABS = Math.max(1, Number(argOf('--tabs', '6')));
const WAIT = Number(argOf('--wait', '2600'));
const ONLY = argOf('--only', '');
const REPORT = argOf('--report', 'recon/scratch/lq-ext-pages.json');

/* 找出每一门课镜像里存下来的那些页面。 */
function pages() {
  const out = [];
  for (const id of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
    /*
     * The name of the file ends in ".html"; the address of the lesson
     * does not.  Keeping the suffix here would ask for a lesson that
     * has no such name, and every page would come back empty.
     */
    const lesson = id.replace(/\.html$/, '');
    /*
     * The address the lesson is asked for is the number of the program,
     * the same way the lesson itself asks for its own files.  The number
     * is what the server knows the lesson by.
     */
    const program = lesson.replace(/^afe-/, '');
    const ext = path.join(CW, id.replace(/\.html$/, '.assets'), '_ext');
    if (!fs.existsSync(ext)) continue;
    for (const host of fs.readdirSync(ext)) {
      const hostDir = path.join(ext, host);
      let st;
      try {
        st = fs.statSync(hostDir);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) walk(full);
          else if (/\.html?$/i.test(e.name)) {
            out.push({
              id: lesson,
              host,
              rel: path.relative(hostDir, full).split(path.sep).join('/'),
              url: `/api/program-assets/${program}/_ext/${host}/${path.relative(hostDir, full).split(path.sep).join('/')}`
            });
          }
        }
      };
      walk(hostDir);
    }
  }
  return out;
}

let list = pages();
if (ONLY) list = list.filter((p) => p.host.includes(ONLY));
console.log(`镜像页面 ${list.length} 个，开 ${TABS} 个标签并行，每页等 ${WAIT}ms`);

const browser = await connect(CDP);

const sessionOf = new Map();
const remember = () => {
  for (const [sid, s] of browser.sessions) sessionOf.set(s.targetInfo.targetId, sid);
};
remember();

const pageSessions = [];
for (let i = 0; i < TABS; i++) {
  if (i === 0) {
    pageSessions.push(browser.pageSession);
    continue;
  }
  const t = await browser.raw('Target.createTarget', { url: 'about:blank' });
  await sleep(500);
  remember();
  const sid = sessionOf.get(t.targetId);
  if (sid) pageSessions.push(sid);
}

for (const sid of pageSessions) {
  await browser.raw('Page.enable', {}, sid).catch(() => {});
  await browser.raw('Network.enable', {}, sid).catch(() => {});
  await browser.raw('Runtime.enable', {}, sid).catch(() => {});
  await browser.raw('Log.enable', {}, sid).catch(() => {});
}

const netFails = new Map();
const external = new Map();
const blocked = new Map();
/*
 * Every answer belongs to the page that asked for it.  The browser says
 * which page that is with the number it calls the loader, so a page that
 * answered late is not counted against the page that came after it.
 */
const loaderOf = new Map();
const requestOf = new Map();
browser.on((m) => {
  const sid = m.sessionId || '';
  if (m.method === 'Network.requestWillBeSent') {
    loaderOf.set(m.params.requestId, m.params.loaderId);
    requestOf.set(m.params.request.url || '', m.params.requestId);
  }
  if (m.method === 'Network.requestWillBeSent') {
    const u = m.params.request.url || '';
    if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:') && !u.startsWith('blob:')) {
      if (!external.has(sid)) external.set(sid, []);
      external.get(sid).push({ url: u, requestId: m.params.requestId });
    }
  }
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    if (!netFails.has(sid)) netFails.set(sid, []);
    netFails.get(sid).push({
      url: m.params.response.url,
      status: m.params.response.status,
      requestId: m.params.requestId
    });
  }
  /*
   * The policy on a mirrored page stops it from reaching the network.  A
   * request it was not allowed to make shows up here — that is how we
   * find out a page is missing something it really needed.
   */
  if (m.method === 'Log.entryAdded') {
    const e = m.params.entry || {};
    const text = e.text || '';
    if (/Content Security Policy|Refused to/i.test(text)) {
      if (!blocked.has(sid)) blocked.set(sid, []);
      blocked.get(sid).push({ text: text.replace(/\s+/g, ' ').slice(0, 220), url: e.url || '' });
    }
  }
});

const PROBE = `(() => {
  const imgs = [...document.querySelectorAll('img')];
  const broken = imgs.filter(i => i.complete && i.naturalWidth === 0 && (i.getAttribute('src') || i.getAttribute('data-src')));
  return {
    imgs: imgs.length,
    broken: broken.map(i => (i.currentSrc || i.src || i.getAttribute('data-src') || '').slice(-120)),
    text: (document.body ? document.body.innerText || '' : '').replace(/\\s+/g, ' ').trim()
  };
})()`;

const results = [];
let cursor = 0;

const worker = async (sid) => {
  for (;;) {
    const at = cursor++;
    if (at >= list.length) return;
    const p = list[at];
    const extMark = (external.get(sid) || []).length;
    const failMark = (netFails.get(sid) || []).length;
    const blockMark = (blocked.get(sid) || []).length;
    let loader = '';
    try {
      const nav = await browser.raw(
        'Page.navigate',
        { url: `http://localhost:${PORT}${p.url}` },
        sid
      );
      loader = nav && nav.loaderId ? nav.loaderId : '';
    } catch {
      /* The page did not open; it counts as a page that did not run. */
    }
    await sleep(WAIT);

    let r = { imgs: 0, broken: [], text: '' };
    try {
      r = await browser.evaluate(PROBE, undefined, sid);
    } catch {
      /* 页面还在动，按没跑起来算 */
    }
    /*
     * Only the answers of this very page are counted.  A page that
     * answered late belongs to the page before it.
     */
    const ext = [
      ...new Set(
        (external.get(sid) || [])
          .slice(extMark)
          .filter((f) => !loader || loaderOf.get(f.requestId) === loader)
          .map((f) => f.url)
      )
    ];
    const fails = (netFails.get(sid) || []).slice(failMark).filter((f) => {
      if (!loader) return true;
      return loaderOf.get(f.requestId) === loader;
    });
    const csp = [
      ...new Set(
        (blocked.get(sid) || [])
          .slice(blockMark)
          .filter((b) => {
            if (!loader) return true;
            const rid = requestOf.get(b.url);
            return !rid || loaderOf.get(rid) === loader;
          })
          .map((b) => b.text)
      )
    ];
    results.push({
      id: p.id,
      host: p.host,
      rel: p.rel,
      imgs: r.imgs,
      broken: r.broken,
      textLen: r.text.length,
      external: ext,
      failed: fails,
      csp
    });
    if (r.broken.length || ext.length || fails.length || csp.length) {
      console.log(
        `BAD  ${p.host}/${p.rel}  裂 ${r.broken.length} 外网 ${ext.length} 失败 ${fails.length} 拦 ${csp.length}`
      );
    }
    if (results.length % 100 === 0) console.log(`... ${results.length}/${list.length}`);
  }
};

await Promise.all(pageSessions.map((sid) => worker(sid)));

const bad = results.filter(
  (r) => r.broken.length || r.external.length || r.failed.length || r.csp.length
);
console.log('');
console.log(`看完 ${results.length} 个镜像页面，有问题 ${bad.length} 个。`);

const byHost = new Map();
for (const r of bad) {
  const e = byHost.get(r.host) || { pages: 0, broken: 0, ext: 0, fail: 0 };
  e.pages++;
  e.broken += r.broken.length;
  e.ext += r.external.length;
  e.fail += r.failed.length;
  byHost.set(r.host, e);
}
for (const [h, e] of [...byHost].sort((a, b) => b[1].pages - a[1].pages)) {
  console.log(`   ${h}: ${e.pages} 页，裂图 ${e.broken}，外网 ${e.ext}，取不到 ${e.fail}`);
}

if (REPORT) {
  fs.writeFileSync(REPORT, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 1));
  console.log('\n报告写入 ' + REPORT);
}

await browser.close();
process.exit(bad.length ? 1 : 0);
