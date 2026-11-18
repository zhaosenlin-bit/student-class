#!/usr/bin/env node
/*
 * 把课件要不到的文件照原样取回来。
 *
 * 这些课来自一批自建的实验室，它们把贴图、模型放在站点的根目录上，
 * 所以本地打开的时候，浏览器会来问
 *
 *   /courseware/textures/pos-plane.png
 *   /models/rheostat/RHS750.stl
 *
 * 这样的地址。这些地址在页面的文字里是看不出来的 —— 有几门课是运行
 * 的时候才把它们拼出来的。所以办法是：等课件在浏览器里开过一遍，
 * 从体检报告里读出它到底问了哪些文件，再照着站点上的样子取回来，
 * 放进共享库里课件自己的那一族文件夹。
 *
 *   node tools/fill-courseware-assets.mjs --report recon/scratch/lq-par-all6.json
 *   node tools/fill-courseware-assets.mjs --report … --apply
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const APPLY = argv.includes('--apply');
const REPORT = argOf('--report', 'recon/scratch/lq-par-all6.json');

const ROOTS = [
  'mirror/leqixiang/_shared-ext/vendor',
  'mirror/3jcn/shared/vendor',
];
/* The shared libraries of the two mirrors, where an outside site lives. */
const EXT_ROOTS = [
  'mirror/leqixiang/_shared-ext',
  'mirror/3jcn/shared',
];

/*
 * 站点上摆着这批课件的地方。课的名字里带着它属于哪一族，站点上
 * 就是照着这个族分文件夹的。
 */
const FAMILIES = [
  { match: /phyc140/i, name: 'Phyc140' },
  { match: /phyc240/i, name: 'Phyc240' },
  { match: /simulation/i, name: 'Simulation' },
  { match: /labs?-/i, name: '3jcn-labs' },
];
const SITE = 'www.new3jcn.com';

/* 文件名在站点上偶尔写法不同，挨个试过去。 */
const OTHER_EXT = ['jpg', 'jpeg', 'png', 'gif', 'jfif', 'webp', 'svg'];

function nameVariants(rel) {
  const slash = rel.lastIndexOf('/');
  const dir = slash >= 0 ? rel.slice(0, slash) : '';
  const base = slash >= 0 ? rel.slice(slash + 1) : rel;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot + 1) : '';
  const out = [rel];
  const add = (v) => {
    if (v && !out.includes(v)) out.push(v);
  };
  add(dir + '/' + stem.replace(/-/g, '_') + (ext ? '.' + ext : ''));
  add(dir + '/' + stem.replace(/_/g, '-') + (ext ? '.' + ext : ''));
  add(dir + '/' + stem.replace(/[-_]/g, '') + (ext ? '.' + ext : ''));
  if (ext) {
    for (const other of OTHER_EXT) add(dir + '/' + stem + '.' + other);
  }
  return out;
}

function familyOf(id) {
  for (const f of FAMILIES) if (f.match.test(id)) return f.name;
  return null;
}

/* 本机上已经有的，就不必再去站点上取。 */
function localHit(rel) {
  for (const root of ROOTS) {
    for (const name of [rel, ...nameVariants(rel)]) {
      const file = path.join(root, name);
      if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
    }
  }
  return null;
}

async function grab(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return buf;
  } catch {
    return null;
  }
}

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const results = report.results || [];

const wanted = new Map();
for (const r of results) {
  for (const f of r.failed || []) {
    const url = String(f.url || '');
    if (!url.startsWith('/')) continue;
    /*
     * A path that goes through the outside site it was mirrored from:
     *   /api/program-assets/<id>/_ext/threejs.org/examples/…/disc.png
     * The name of the site is in the path, so the file is simply asked of
     * that site and kept next to the rest of its mirror.
     */
    const ext = url.match(/^\/api\/program-assets\/[^/]+\/_ext\/([^/]+)\/(.+)$/);
    if (ext) {
      const rel = `${ext[1]}/${ext[2]}`;
      if (!wanted.has(rel)) wanted.set(rel, new Set());
      wanted.get(rel).add(r.id);
      continue;
    }
    const rel = url.startsWith('/courseware/') ? url.slice('/courseware/'.length) : url.slice(1);
    if (!rel || rel.includes('..')) continue;
    if (!wanted.has(rel)) wanted.set(rel, new Set());
    wanted.get(rel).add(r.id);
  }
}

console.log('课件要不到的文件：' + wanted.size + ' 个');

let fetched = 0;
let had = 0;
let missed = 0;

for (const [rel, ids] of wanted) {
  const sample = [...ids][0];
  /*
   * A file of an outside site: it is asked of that site by its own address
   * and kept in the mirror of that site.
   */
  const outside = rel.match(/^([^/]+)\/(.+)$/);
  if (outside && (rel.startsWith('threejs.org/') || rel.startsWith('www.') || rel.startsWith('cdn.'))) {
    const file = path.join(EXT_ROOTS[0], rel);
    const alt = path.join(EXT_ROOTS[1], rel);
    if ((fs.existsSync(file) && fs.statSync(file).size > 0) || (fs.existsSync(alt) && fs.statSync(alt).size > 0)) {
      had++;
      console.log('  已有  ' + rel);
      continue;
    }
    const buf = await grab(`https://${rel}`);
    if (!buf) {
      missed++;
      console.log('  取不到  ' + rel + '  （' + [...ids].join(', ') + '）');
      continue;
    }
    console.log('  取到了  ' + rel + '（' + buf.length + ' 字节）');
    if (APPLY) {
      for (const root of EXT_ROOTS) {
        const target = path.join(root, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buf);
      }
    }
    fetched++;
    continue;
  }
  const family = familyOf(sample);

  const hit = localHit(rel);
  if (hit) {
    had++;
    console.log('  已有  ' + rel + '  ->  ' + hit);
    continue;
  }

  /* 站点上的几种写法：先带族名，再不带。 */
  const bases = [];
  if (family) bases.push(`https://${SITE}/${family}/`);
  bases.push(`https://${SITE}/`);

  let done = null;
  for (const base of bases) {
    for (const name of nameVariants(rel)) {
      const buf = await grab(base + name);
      if (!buf) continue;
      done = { buf, name, base };
      break;
    }
    if (done) break;
  }

  if (!done) {
    missed++;
    console.log('  取不到  ' + rel + '  （' + [...ids].join(', ') + '）');
    continue;
  }

  /* 站点上带族名的，放在族里；不带的，放在根上。 */
  const inFamily = done.base.includes('/' + family + '/') && family;
  const stored = inFamily ? family + '/' + done.name : done.name;
  console.log('  取到了  ' + rel + '  ->  ' + stored + '（' + done.buf.length + ' 字节）');
  fetched++;
  if (!APPLY) continue;
  for (const root of ROOTS) {
    const file = path.join(root, stored);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, done.buf);
  }
}

console.log(
  '\n本机已有 ' + had + ' 个，新取 ' + fetched + ' 个，仍旧取不到 ' + missed + ' 个。' +
    (APPLY ? '' : '（这是试算，加上 --apply 才真的写文件）')
);
