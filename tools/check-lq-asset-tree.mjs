#!/usr/bin/env node
/*
 * 顺着课件的正文往下爬，把每一层引到的文件都问一遍。
 *
 * 课件不止一页：外层是章节目录，点开才是真正的画面，而画面里还有图、
 * 有声音。只看外层那一页，看不见真正缺的东西。
 *
 *   node tools/check-lq-asset-tree.mjs
 *   node tools/check-lq-asset-tree.mjs --only afe-842,afe-1016
 */
import fs from 'node:fs';

const PORT = Number(process.env.LQ_PORT || 4173);
const BASE = 'http://127.0.0.1:' + PORT;

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const ONLY = argOf('--only', '');
const CONC = Number(argOf('--conc', '10'));
const DEPTH = Number(argOf('--depth', '4'));

const REF = /(?:src|poster|data-src|data-bg|xlink:href)\s*=\s*["']([^"'<>]{1,400})["']|<link[^>]+href\s*=\s*["']([^"'<>]{1,400})["']|url\(\s*["']?([^"'()\s]{1,400})["']?\s*\)|<iframe[^>]+src\s*=\s*["']([^"'<>]{1,400})["']|<option[^>]+value\s*=\s*["']([^"'<>]{1,400})["']/g;
const COMMENTS = /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g;

const skipUrl = (u) =>
  !u ||
  /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(u) ||
  /^https?:\/\//i.test(u) ||
  /^\/\//.test(u) ||
  /[${}<>*]/.test(u) ||
  /^(blank|\/|\.\.\.|\/t\.gif|\/%%URL%%\/.*)$/i.test(u.trim());

async function pool(items, size, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = [];
  for (let i = 0; i < Math.min(size, items.length); i++) {
    runners.push(
      (async () => {
        while (next < items.length) {
          const i = next++;
          out[i] = await worker(items[i], i);
        }
      })()
    );
  }
  await Promise.all(runners);
  return out;
}

const catalogue = await (await fetch(BASE + '/api/catalog')).json();
let ids = catalogue.products.map((p) => p.id);
if (ONLY) {
  const wanted = new Set(ONLY.split(',').map((s) => s.trim()).filter(Boolean));
  ids = ids.filter((id) => wanted.has(id));
}
console.log('乐启享课件库 · 素材树检查：' + ids.length + ' 门（深度 ' + DEPTH + '，并发 ' + CONC + '）');

const started = Date.now();

const results = await pool(ids, CONC, async (id) => {
  const missing = [];
  const seenPage = new Set();
  const queue = [BASE + '/courseware/' + encodeURIComponent(id) + '?local=1'];
  let depth = 0;

  while (queue.length) {
    const pageUrl = queue.shift();
    if (seenPage.has(pageUrl) || depth > DEPTH) continue;
    seenPage.add(pageUrl);
    let body = '';
    try {
      const res = await fetch(pageUrl);
      if (!res.ok) {
        missing.push({ u: pageUrl.replace(BASE, ''), why: '页面 ' + res.status });
        continue;
      }
      body = await res.text();
    } catch (e) {
      missing.push({ u: pageUrl.replace(BASE, ''), why: e.message });
      continue;
    }
    const refs = new Set();
    for (const m of body.replace(COMMENTS, ' ').matchAll(REF)) {
      const u = m[1] || m[2] || m[3] || m[4] || m[5];
      if (!skipUrl(u)) {
        /* 下拉框里的值多半是"左边/右边"这种选项，不是文件；
           只有看着像文件的才去追。 */
        if (m[5] && !/\.[a-z0-9]{2,5}(\?|$)/i.test(u)) continue;
        refs.add(u.trim());
      }
    }
    for (const raw of refs) {
      let abs;
      try {
        abs = new URL(raw, pageUrl);
      } catch {
        continue;
      }
      if (abs.origin !== 'http://127.0.0.1:' + PORT) continue;
      const key = abs.pathname + abs.search;
      if (seenPage.has(key)) continue;
      try {
        const res = await fetch(abs.href, { method: 'GET', redirect: 'follow' });
        const type = res.headers.get('content-type') || '';
        const buf = Buffer.from(await res.arrayBuffer());
        if (!res.ok) {
          missing.push({ u: key, why: 'HTTP ' + res.status });
          continue;
        }
        if (!buf.length) {
          missing.push({ u: key, why: '空文件' });
          continue;
        }
        if (/text\/html/i.test(type) && depth < DEPTH) {
          seenPage.add(key);
          queue.push(abs.href);
        }
      } catch (e) {
        missing.push({ u: key, why: e.message });
      }
    }
    depth++;
  }
  return { id, missing };
});

const bad = results.filter((r) => r.missing.length);
const totalMissing = bad.reduce((n, r) => n + r.missing.length, 0);

const byFile = new Map();
for (const r of bad) {
  for (const m of r.missing) {
    if (!byFile.has(m.u)) byFile.set(m.u, { why: m.why, ids: [] });
    byFile.get(m.u).ids.push(r.id);
  }
}

console.log('');
console.log('有缺口的课件 ' + bad.length + ' 门，缺 ' + totalMissing + ' 处，涉及 ' + byFile.size + ' 个不同的文件。');
console.log('\n--- 同一个文件被多少门课件共用');
for (const [u, info] of [...byFile].sort((a, b) => b[1].ids.length - a[1].ids.length).slice(0, 25)) {
  console.log('   ' + String(info.ids.length).padStart(4) + ' 门  ' + u + '  (' + info.why + ')');
}
console.log('\n--- 有缺口的课件（前 60 门）');
for (const r of bad.slice(0, 60)) {
  console.log('   ! ' + r.id + '  缺 ' + r.missing.length + ' 个：' + r.missing.slice(0, 3).map((m) => m.u).join('  '));
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log('\n用时 ' + elapsed + 's。');

if (process.env.LQ_REPORT) {
  fs.writeFileSync(
    process.env.LQ_REPORT,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), bad: bad.map((r) => ({ id: r.id, missing: r.missing })) },
      null,
      1
    )
  );
  console.log('报告写入 ' + process.env.LQ_REPORT);
}

process.exit(bad.length ? 1 : 0);
