#!/usr/bin/env node
/*
 * Every lesson in the library, opened and taken away.
 *
 * The catalogue says a lesson is there.  This walks the whole list and
 * asks for each one twice: once as a page to look at, once as a file to
 * keep.  A lesson that is only half there is reported by name, so the
 * list can be closed before the library is handed over.
 *
 *   node tools/check-lq-all-courses.mjs
 *   LQ_PORT=4173 node tools/check-lq-all-courses.mjs --conc 12
 *   node tools/check-lq-all-courses.mjs --only afe-10,phet-beers-law-lab
 */
import fs from 'node:fs';

const PORT = Number(process.env.LQ_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const CONC = Number(argOf('--conc', '10'));
const ONLY = argOf('--only', '');
const REPORT = argOf('--report', '');

const MISSING = '本机还没有这份课件的文件';

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = [];
  for (let i = 0; i < Math.min(size, items.length); i++) {
    runners.push(
      (async () => {
        while (next < items.length) {
          const index = next++;
          results[index] = await worker(items[index], index);
        }
      })()
    );
  }
  await Promise.all(runners);
  return results;
}

const catalogue = await (await fetch(BASE + '/api/catalog')).json();
let ids = catalogue.products.map((p) => p.id);
if (ONLY) {
  const wanted = new Set(ONLY.split(',').map((s) => s.trim()).filter(Boolean));
  ids = ids.filter((id) => wanted.has(id));
}
console.log(
  `乐启享课件库 · 全量检查：${ids.length} 门（并发 ${CONC}）`
);

const started = Date.now();
const failures = [];

const results = await pool(ids, CONC, async (id) => {
  const problems = [];
  let bytes = 0;

  /* 1. The lesson as a page. */
  let preview;
  try {
    preview = await fetch(`${BASE}/courseware/${encodeURIComponent(id)}?local=1`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
  } catch (e) {
    problems.push(`预览请求失败：${e.message}`);
  }
  if (preview) {
    const type = preview.headers.get('content-type') || '';
    const body = await preview.text();
    bytes += body.length;
    if (preview.status !== 200) problems.push(`预览返回 ${preview.status}`);
    if (!/text\/html/.test(type)) problems.push(`预览类型 ${type}`);
    if (body.includes(MISSING)) problems.push('预览是缺文件页');
    if (body.length < 400) problems.push('预览内容过短');
    if (/\{\s*"error"\s*:/.test(body.slice(0, 400))) problems.push('预览返回了 JSON');
  }

  /* 2. The lesson as a file. */
  let prepared = null;
  try {
    const res = await fetch(`${BASE}/api/downloads/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'studio',
        Origin: ORIGIN,
      },
      body: JSON.stringify({ productId: id }),
    });
    if (res.status !== 200) {
      problems.push(`下载准备返回 ${res.status}`);
    } else {
      prepared = await res.json();
      if (!prepared || !prepared.url) problems.push('下载地址缺失');
    }
  } catch (e) {
    problems.push(`下载准备失败：${e.message}`);
  }
  if (prepared && prepared.url) {
    try {
      const file = await fetch(BASE + prepared.url);
      const buf = Buffer.from(await file.arrayBuffer());
      bytes += buf.length;
      if (file.status !== 200) problems.push(`下载返回 ${file.status}`);
      if (!buf.length) problems.push('下载内容为空');
      const type = file.headers.get('content-type') || '';
      if (/zip/.test(type)) {
        if (buf[0] !== 0x50 || buf[1] !== 0x4b) problems.push('下载包不是 zip');
      } else if (!/text\/html/.test(type)) {
        problems.push(`下载类型 ${type}`);
      }
    } catch (e) {
      problems.push(`下载失败：${e.message}`);
    }
  }

  return { id, problems, bytes };
});

let totalBytes = 0;
for (const r of results) {
  totalBytes += r.bytes;
  if (r.problems.length) failures.push(r);
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log('');
if (!failures.length) {
  console.log(`绿灯：${results.length} 门课件，预览与下载全部通过（${elapsed}s，共 ${(totalBytes / 1048576).toFixed(1)} MB）。`);
} else {
  console.log(`红灯：${results.length} 门中有 ${failures.length} 门有问题。`);
  for (const f of failures.slice(0, 60)) {
    console.log(`  - ${f.id}: ${f.problems.join('；')}`);
  }
  if (failures.length > 60) console.log(`  …… 另有 ${failures.length - 60} 门`);
}

if (REPORT) {
  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        total: results.length,
        green: results.length - failures.length,
        failures,
      },
      null,
      1
    )
  );
  console.log(`报告写入 ${REPORT}`);
}

process.exit(failures.length ? 1 : 0);
