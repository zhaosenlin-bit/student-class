#!/usr/bin/env node
/*
 * 课件里的「导入表」写错了路径，课件就整个起不来。
 *
 * 有的课件在页面里放了一张导入表，把 three 这类库的名字指到自己的一个
 * 文件上。那个地址要是写错了，浏览器就找不到库，课件从头到尾不动，
 * 屏幕上只剩一片空。这里把每门课件的导入表都翻出来，对着本地磁盘核对
 * 一遍；确实指错了的，按真实存在的那个文件改过来。
 *
 *   node tools/fix-lq-importmaps.mjs            只看，不改
 *   node tools/fix-lq-importmaps.mjs --fix      改
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  ['mirror/leqixiang/courseware', 'mirror/leqixiang/_shared-ext'],
  ['mirror/aifunengjiaoyu/courseware', 'mirror/aifunengjiaoyu/_shared-ext']
];
const fix = process.argv.includes('--fix');

function baseOf(text) {
  const m = text.match(/<base[^>]+href=["']([^"']+)/i);
  return m ? m[1] : '';
}

/* 把导入表里写的地址还原成课件目录里的相对路径。 */
function localOf(base, value) {
  if (/^https?:\/\//i.test(value)) return null;
  const m = base.match(/\/api\/program-assets\/([^/]+)\//);
  const own = value.match(/^\/api\/program-assets\/([^/]+)\/(.*)$/);
  if (own) return own[2];
  const root = m ? '/api/program-assets/' + m[1] + '/' : '/';
  let p = value;
  if (p.startsWith('/')) {
    p = p.slice(root.length);
  } else {
    const dir = base.slice(0, base.lastIndexOf('/') + 1);
    p = dir + p;
  }
  return p.replace(/^\.\//, '').split('?')[0];
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let total = 0;
let changed = 0;

for (const [root, shared] of ROOTS) {
  if (!fs.existsSync(root)) continue;
  const files = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
  for (const name of files) {
    const file = path.join(root, name);
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!m) continue;
    let map;
    try {
      map = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (!map || !map.imports) continue;

    const base = baseOf(text);
    const id = name.replace(/\.html$/, '');
    const assets = path.join(root, id + '.assets');
    const all = walk(assets);
    const sharedAll = walk(shared);
    let dirty = false;

    for (const key of Object.keys(map.imports)) {
      const value = map.imports[key];
      if (typeof value !== 'string') continue;
      const rel = localOf(base, value);
      if (!rel) continue;
      /* 课件自己的目录，或者共用的那一份外站，都算数。 */
      const ext = /(^|\/)_ext\//.test(value);
      const extRel = ext ? rel.replace(/^_ext\//, '') : rel;
      const pool = ext ? sharedAll : all;
      const abs = ext ? path.join(shared, extRel) : path.join(assets, rel);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) continue;
      /* 以斜杠结尾的，是一整个目录的映射，只要里面还有东西就行。 */
      if (value.endsWith('/')) {
        const prefix = extRel.replace(/^\//, '').replace(/\/$/, '');
        const hit = pool.some((f) => f.replace(/\\/g, '/').includes('/' + prefix + '/'));
        if (hit) continue;
      }

      /* 找真正的那一个：只看路径尾巴。 */
      const segs = rel.split('/').filter(Boolean);
      const tail = segs.slice(-3).join('/');
      const cands = pool.filter((f) => f.replace(/\\/g, '/').endsWith('/' + tail));
      total++;
      if (cands.length !== 1) {
        console.log('! ' + id + '  ' + key + ' 指不到本地文件：' + value);
        if (cands.length > 1) {
          console.log('     同样尾巴的文件有 ' + cands.length + ' 个，不敢乱改');
        }
        continue;
      }
      /* 共用库里那份，地址要写成绝对路径，课件自己那份才是相对的。 */
      const good = ext
        ? '/api/program-assets/' +
          id.replace(/^afe-/, '') +
          '/_ext/' +
          path.relative(shared, cands[0]).replace(/\\/g, '/')
        : './' + path.relative(assets, cands[0]).replace(/\\/g, '/');
      console.log('* ' + id + '  ' + key + '：' + value + '  ->  ' + good);
      map.imports[key] = good;
      dirty = true;
    }

    if (dirty && fix) {
      const fresh = text.replace(
        m[0],
        '<script type="importmap">\n' + JSON.stringify(map, null, 2) + '\n  </script>'
      );
      fs.writeFileSync(file, fresh);
      changed++;
    }
  }
}

console.log('\n共 ' + total + ' 处，' + (fix ? '改了 ' + changed + ' 门' : '（只查未改）'));
