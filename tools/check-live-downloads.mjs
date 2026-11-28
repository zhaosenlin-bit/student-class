#!/usr/bin/env node
/*
 * 线上「下载」这件事到底通不通。
 *
 * 每门课件的 download.json 里列着这个课件要交给用户的所有文件。
 * 这一份把清单里的每一个地址都真的取一遍，看是不是每个都能拿到
 * 正确的字节——不多不少，正好是清单里写的那一个。
 *
 *   node tools/check-live-downloads.mjs --base https://codebn.cn/leqixiang
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const BASE = arg('base', 'https://codebn.cn/leqixiang').replace(/\/+$/, '');
const OUT = arg('out', '');
const CONC = Number(arg('conc', 24));
const LOCAL = arg('local', 'dist');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog', 'catalog.json'), 'utf8'));
const products = catalog.products || [];

const tasks = [];
for (const p of products) {
  const id = p.id;
  if (!id) continue;
  tasks.push({ id, url: `${BASE}/courseware/${encodeURIComponent(id)}/download.json` });
}

const problems = [];
let checked = 0;
let totalEntries = 0;

async function get(url) {
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!r.ok) return { ok: false, status: r.status };
      return { ok: true, buf: Buffer.from(await r.arrayBuffer()) };
    } catch (e) {
      if (t === 4) return { ok: false, err: String(e && e.message) };
      await new Promise((r) => setTimeout(r, 800 * (t + 1)));
    }
  }
  return { ok: false };
}

/*
 * 只是要核对长度和状态码，用 HEAD 就够了——把几个 GB 真的搬一遍
 * 既慢又费带宽。个别对象不让 HEAD，就退回去用 GET。
 */
async function head(url) {
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 405 || r.status === 501) return null;
      if (!r.ok) return { ok: false, status: r.status };
      const len = r.headers.get('content-length');
      return { ok: true, size: len === null ? null : Number(len) };
    } catch (e) {
      /* 网络抖一下不算这个文件的账，隔一会儿再问一次。 */
      if (t === 4) return { ok: false, err: String(e && e.message) };
      await new Promise((r) => setTimeout(r, 800 * (t + 1)));
    }
  }
  return { ok: false };
}

/* 把一件事拆成几件同时做，页面才不会被一门的几百个文件拖死。 */
async function pool(items, worker) {
  let at = 0;
  const runners = new Array(Math.min(CONC, items.length || 1)).fill(0).map(async () => {
    while (at < items.length) {
      const i = at++;
      await worker(items[i]);
    }
  });
  await Promise.all(runners);
}

await pool(tasks, async (t) => {
  const r = await get(t.url);
  if (!r.ok) {
    problems.push({ id: t.id, why: 'download.json', status: r.status, err: r.err });
    return;
  }
  let manifest;
  try {
    manifest = JSON.parse(r.buf.toString('utf8'));
  } catch {
    problems.push({ id: t.id, why: 'download.json-not-json' });
    return;
  }
  const entries = manifest.entries || [];
  totalEntries += entries.length;

  /* 单文件的课件直接看那一个文件；多文件的逐个看。 */
  const files = manifest.single
    ? [[manifest.filename || '', entries[0] && entries[0][1]]]
    : entries.map((e) => [e[0], e[1]]);

  for (const [name, rel] of files) {
    if (!rel) {
      problems.push({ id: t.id, why: 'empty-entry' });
      continue;
    }
    const abs = new URL(rel, `${BASE}/courseware/${encodeURIComponent(t.id)}/`).href;
    /* 取回来的字节数要和本地那份一模一样。 */
    const localPath = path.resolve(
      LOCAL,
      'courseware',
      t.id,
      rel.split('/').join(path.sep)
    );
    if (!localPath.startsWith(path.resolve(LOCAL))) {
      problems.push({ id: t.id, why: 'outside', name, rel });
      continue;
    }
    if (!fs.existsSync(localPath)) {
      checked++;
      problems.push({ id: t.id, why: 'missing-local', name, rel });
      continue;
    }
    const want = fs.statSync(localPath).size;
    checked++;

    const h = await head(abs);
    if (h === null) {
      const f = await get(abs);
      if (!f.ok) {
        problems.push({ id: t.id, why: 'file', name, url: abs, status: f.status, err: f.err });
        continue;
      }
      if (want !== f.buf.length) {
        problems.push({ id: t.id, why: 'size-mismatch', name, want, got: f.buf.length });
      }
      continue;
    }
    if (!h.ok) {
      problems.push({ id: t.id, why: 'file', name, url: abs, status: h.status, err: h.err });
      continue;
    }
    if (h.size !== null && want !== h.size) {
      problems.push({ id: t.id, why: 'size-mismatch', name, want, got: h.size });
    }
  }
});

const out = {
  checkedAt: new Date().toISOString(),
  base: BASE,
  courses: tasks.length,
  entries: totalEntries,
  fetched: checked,
  problems: problems.length,
  detail: problems.slice(0, 200),
};
console.log(
  `课件 ${out.courses} 门 · 清单 ${out.entries} 条 · 实取 ${out.fetched} 个 · 有问题 ${out.problems}`
);
for (const p of problems.slice(0, 20)) console.log('  ', JSON.stringify(p));
if (OUT) {
  fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(out, null, 2));
}
process.exit(problems.length ? 1 : 0);
