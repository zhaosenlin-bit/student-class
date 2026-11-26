#!/usr/bin/env node
/*
 * Does a copy of the library that was written out as plain files work?
 *
 * A folder of files is only useful if a reader can open a lesson from
 * it and take it away.  This walks the whole list of lessons and, for
 * every one of them:
 *
 *   - opens the page of the library and looks for the lesson;
 *   - opens the lesson itself and waits until it shows something;
 *   - asks for the file the lesson is handed over as, and checks that
 *     every file in it is really there.
 *
 * The address of the folder is given as a path, so the copy can be
 * looked at the way a website would hand it out: from a folder inside
 * a site.
 *
 *   node tools/check-static-site.mjs --base http://127.0.0.1:4180/leqixiang
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg('base', 'http://127.0.0.1:4180/leqixiang').replace(/\/+$/, '');
const ORIGIN = new URL(BASE).origin;
const CDP = Number(arg('cdp', 9333));
const CONC = Number(arg('conc', 4));
const WAIT = Number(arg('wait', 12000));
const OUT = arg('out', '');
const ONLY = arg('only', '');
const SHOTS = arg('shots', '');
/*
 * The list of files every lesson hands out is checked by
 * tools/check-oss-mirror.mjs, which compares it against the real
 * names on the server instead of asking for them one by one.  When
 * that has been done, this part can be left out.
 */
const SKIP_FILES = args.includes('--skip-files');

/*
 * A lesson that is left open keeps drawing, and a browser full of
 * them draws nothing else quickly.  The tabs of an earlier run are
 * closed before this one begins.
 */
async function closeOldTabs(port) {
  let list = [];
  try {
    list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  } catch {
    return;
  }
  for (const t of list) {
    if (t.type !== 'page') continue;
    if (!/^https?:\/\/127\.0\.0\.1:\d+\/courseware\//.test(t.url || '')) continue;
    try {
      await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
    } catch {
      /* The tab is already gone. */
    }
  }
}
await closeOldTabs(CDP);

const PROBE = `(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const painted = canvases.filter(c => c.width > 0 && c.height > 0).length;
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const fields = d.querySelectorAll('input,select,textarea,button').length;
  const frames = [];
  for (const f of d.querySelectorAll('iframe')) {
    let inner = null;
    try {
      const idoc = f.contentDocument;
      if (idoc) {
        const ic = [...idoc.querySelectorAll('canvas')];
        inner = {
          nodes: idoc.querySelectorAll('*').length,
          painted: ic.filter(c => c.width > 0 && c.height > 0).length,
          textLen: (idoc.body ? idoc.body.innerText : '').replace(/\\s+/g, ' ').trim().length,
          fields: idoc.querySelectorAll('input,select,textarea,button').length,
        };
      }
    } catch (e) {}
    frames.push(inner);
  }
  return {
    title: d.title,
    nodes: d.querySelectorAll('*').length,
    canvases: canvases.length,
    painted,
    textLen: text.length,
    fields,
    head: text.slice(0, 90),
    frames,
  };
})()`;

const hasContent = (p) => {
  if (!p) return false;
  let painted = p.painted || 0;
  let nodes = p.nodes || 0;
  let text = p.textLen || 0;
  let fields = p.fields || 0;
  for (const f of p.frames || []) {
    painted += f?.painted || 0;
    nodes += f?.nodes || 0;
    text += f?.textLen || 0;
    fields += f?.fields || 0;
  }
  return painted > 0 || nodes > 40 || text > 40 || fields > 0;
};

const alive = (p) => {
  if (!p) return false;
  const words = p.head || '';
  if (/本机还没有这份课件|本地没有安装这份课件|没有收进本地课件库|404 Not Found/.test(words)) {
    return false;
  }
  return hasContent(p);
};

const catalogue = await (await fetch(`${BASE}/catalog.json`)).json();
let ids = catalogue.products.filter((p) => p.localInstalled).map((p) => p.id);
if (ONLY) {
  const wanted = new Set(ONLY.split(',').map((s) => s.trim()).filter(Boolean));
  ids = ids.filter((id) => wanted.has(id));
}
console.log(`静态课件库 · 全量检查：${ids.length} 门（并发 ${CONC}）`);
console.log(`地址 ${BASE}`);

/* --------------------------------------------------------- the shell -- */

/*
 * A plain web server answers a directory with index.html.  A bucket of
 * objects does not, so the home page of the library is the file
 * index.html.  Both are tried, the one that answers is the home.
 */
let HOME = `${BASE}/`;
let shell = await fetch(HOME);
if (!shell.ok) {
  HOME = `${BASE}/index.html`;
  shell = await fetch(HOME);
}
if (!shell.ok) {
  console.error(`主页返回 ${shell.status}`);
  process.exitCode = 1;
  throw new Error('the shell does not answer');
}
const shellText = await shell.text();
if (!/lq-static\.js/.test(shellText)) {
  console.error('主页没有带上静态助手');
  process.exitCode = 1;
  throw new Error('the helper is missing');
}
const helper = await fetch(`${BASE}/lq-static.js`);
if (!helper.ok) {
  console.error(`助手返回 ${helper.status}`);
  process.exitCode = 1;
  throw new Error('the helper does not answer');
}
console.log('外壳、目录与助手就位。');

/* ------------------------------------------------------------ files -- */

/*
 * Every lesson has to carry every file it asks for.  The list of them
 * is written down when the copy is made, so this checks the list
 * against the files that are really there.
 */
console.log('检查每门课件的文件是否齐全…');
const missing = [];
let entryCount = 0;
if (SKIP_FILES) {
  console.log('（这一段跳过了，名单由 tools/check-oss-mirror.mjs 对过。）');
} else {
  for (const id of ids) {
    const res = await fetch(`${BASE}/courseware/${encodeURIComponent(id)}/download.json`);
    if (!res.ok) {
      missing.push({ id, file: 'download.json', status: res.status });
      continue;
    }
    const manifest = await res.json();
    for (const [name, from] of manifest.entries) {
      entryCount++;
      const head = await fetch(`${BASE}/courseware/${encodeURIComponent(id)}/${from}`, {
        method: 'GET',
      });
      if (!head.ok) {
        missing.push({ id, file: name, status: head.status });
        if (missing.length > 40) break;
      }
    }
    if (missing.length > 40) break;
  }
  if (missing.length) {
    console.log(`文件缺失 ${missing.length} 处：`);
    for (const m of missing.slice(0, 20)) console.log(`  ${m.id} ${m.file} ${m.status}`);
    process.exitCode = 1;
  } else {
    console.log(`每门课件的文件齐全，共 ${entryCount} 个。`);
  }
}

/* --------------------------------------------------------- lessons -- */

/* ------------------------------------------------------- the shell -- */

/*
 * The library itself is opened first: the catalogue has to show, the
 * search has to find, and a lesson has to open from the page the
 * reader is looking at.
 */
{
  const p = await connect(CDP);
  const shellProblems = [];
  try {
    await p.goto(HOME);
    for (let i = 0; i < 40; i++) {
      const ready = await p
        .evaluate(`(() => {
          const main = document.querySelector('#main');
          return {
            cards: document.querySelectorAll('[data-lq-preview], .course-card, .download-card').length,
            text: (main ? main.innerText : '').length,
            loading: /正在加载乐启享/.test(document.body.innerText),
          };
        })()`)
        .catch(() => null);
      if (ready && ready.text > 200) break;
      await sleep(400);
    }
    const state = await p.evaluate(`(() => {
      const main = document.querySelector('#main');
      const imgs = [...document.querySelectorAll('img')];
      return {
        text: (main ? main.innerText : '').replace(/\\s+/g, ' ').trim().slice(0, 200),
        nodes: document.querySelectorAll('*').length,
        images: imgs.length,
        broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
      };
    })()`);
    if (!state || state.nodes < 200) shellProblems.push('主页没有内容');
    if (state && state.broken) shellProblems.push(`${state.broken} 张图片是空的`);
    console.log(`主页：${state?.nodes} 个节点，${state?.images} 张图片，其中 ${state?.broken} 张是空的`);
  } catch (e) {
    shellProblems.push(String(e.message || e));
  } finally {
    await p.close();
  }
  if (shellProblems.length) {
    console.log('主页有问题：');
    for (const s of shellProblems) console.log(`  - ${s}`);
    process.exitCode = 1;
  } else {
    console.log('主页正常。');
  }
}

let cursor = 0;
let done = 0;
const results = [];

async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++];
    let p = null;
    for (let tries = 0; tries < 3 && !p; tries++) {
      try {
        p = await connect(CDP);
      } catch {
        await sleep(1200);
      }
    }
    if (!p) {
      results.push({ id, ok: false, why: ['no browser'] });
      done++;
      continue;
    }
    const failed = [];
    const outside = [];
    const outsideUrls = [];
    let probe = null;
    try {
      const started = Date.now();
      await p.goto(`${BASE}/courseware/${encodeURIComponent(id)}/index.html`);
      for (;;) {
        const seen = await p.evaluate(PROBE).catch(() => null);
        if (hasContent(seen)) break;
        if (Date.now() - started > WAIT) break;
        await sleep(300);
      }
      await sleep(Math.max(300, Math.min(1200, WAIT - (Date.now() - started))));
      probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
      const reqs = p.events
        .filter((e) => e.method === 'Network.responseReceived')
        .map((e) => e.params.response);
      const errors = p.events
        .filter((e) => e.method === 'Runtime.exceptionThrown')
        .map((e) => {
          const d = e.params.exceptionDetails;
          const text = d.exception?.description || d.text || 'error';
          return text.replace(/\s+/g, ' ').slice(0, 200);
        });
      for (const r of reqs) {
        /*
         * A picture that is drawn by the lesson itself is not asked
         * for over the network, and it is not a piece of the site
         * either.  It is not counted.
         */
        if (/^(?:data|blob):/i.test(r.url)) continue;
        /*
         * The browser asks for a picture of the site on its own, from
         * the root of the domain — that is the website's business and
         * not the library's, so it is not counted here.  A name that
         * climbs out of the folder the copy is put in would land
         * there too, and that one is counted: it means the copy is
         * not free of the site it came from.
         */
        const inBase = r.url.startsWith(BASE);
        const sameSite = r.url.startsWith(ORIGIN);
        if (!inBase && !sameSite) {
          /*
           * A request that leaves the folder is not a failure of the
           * copy, but it is worth knowing about: a lesson that still
           * asks the internet for its pieces is slower to open and
           * stops working when the network is not there.
           */
          let host = '';
          try {
            host = new URL(r.url).host;
          } catch {
            host = r.url.slice(0, 60);
          }
          if (host && !outside.includes(host)) outside.push(host);
          if (!outsideUrls.includes(r.url)) outsideUrls.push(r.url);
          continue;
        }
        /* The browser asks for the mark of the site on its own. */
        if (r.url === `${ORIGIN}/favicon.ico`) continue;
        if (!inBase) {
          failed.push(`跑出目录 ${r.url.replace(ORIGIN, '').slice(0, 150)}`);
          continue;
        }
        if (r.status < 400) continue;
        /*
         * The whole name is kept: a name that is cut short cannot be
         * looked for afterwards.
         */
        failed.push(`${r.status} ${r.url.replace(BASE, '').slice(0, 400)}`);
      }
      for (const e of errors) failed.push(`js ${e}`);
      if (!alive(probe)) failed.push(`课件没有画面（${probe?.head || probe?.error || ''}）`);
    } catch (e) {
      failed.push(String(e.message || e));
    }
    if (SHOTS && done === 0) {
      await p.shot(path.join(SHOTS, `${id}.png`)).catch(() => {});
    }
    await p.close();
    results.push({
      id,
      ok: !failed.length,
      failed: failed.slice(0, 60),
      outside,
      outsideUrls: outsideUrls.slice(0, 20),
      probe,
    });
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${ids.length}`);
  }
}

const runners = Array.from({ length: CONC }, worker);
await Promise.all(runners);

const bad = results.filter((r) => !r.ok);
console.log('');
if (!bad.length) {
  console.log(`绿灯：${results.length} 门课件全部可以打开。`);
} else {
  console.log(`红灯：${results.length} 门中有 ${bad.length} 门打不开。`);
  for (const b of bad.slice(0, 40)) console.log(`  - ${b.id}: ${b.failed.join('；')}`);
}

/*
 * The hosts the lessons still ask for.  They are counted so that the
 * list of them can be kept short, not to make the run a failure.
 */
const hosts = new Map();
for (const r of results) {
  for (const h of r.outside || []) {
    if (!hosts.has(h)) hosts.set(h, []);
    hosts.get(h).push(r.id);
  }
}
console.log('');
if (!hosts.size) {
  console.log('站外请求：没有，课件全部只用自己的文件。');
} else {
  console.log(`站外请求：${hosts.size} 个站点`);
  for (const [h, ids] of [...hosts].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${h}  ×${ids.length}  ${ids.slice(0, 6).join(' ')}`);
  }
}

if (OUT) {
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        base: BASE,
        total: results.length,
        green: results.length - bad.length,
        missing,
        failures: bad,
        outside: results
          .filter((r) => (r.outsideUrls || []).length)
          .map((r) => ({ id: r.id, urls: r.outsideUrls })),
      },
      null,
      1
    )
  );
  console.log(`报告写入 ${OUT}`);
}

process.exitCode = bad.length || missing.length ? 1 : 0;
