#!/usr/bin/env node
/*
 * 把课件里引用了、但本地还没有的文件，从原来的网站再取回来。
 *
 * 镜像里每个 _ext/<网址>/ 都是照着原站的地址摆的，所以本地缺一个
 * 文件，原站上多半就有一个同样的：照着引用所在页面的位置算出它在
 * 原站的地址，去要一次，存回同一个位置，之后离线也能看。
 *
 *   node tools/fill-missing-assets.mjs --scan    # 只列出缺口
 *   node tools/fill-missing-assets.mjs --fetch   # 去取回来
 *   node tools/fill-missing-assets.mjs --fetch afe-969
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const argv = process.argv.slice(2);
const FETCH = argv.includes('--fetch');
const ONLY = argv.find((a) => !a.startsWith('--')) || '';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const REF = /["'(]([^"'()\s]{1,300}\.(?:gif|png|jpe?g|svg|webp|bmp|ico|css|js|mp3|mp4|wav|ogg|woff2?|ttf|eot|json|txt|glb|gltf|bin|dll|exe|pdf|docx?|xlsx?))["')]/gi;

const listFiles = (dir, out = []) => {
  let es;
  try {
    es = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
};

const courses = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.assets'))
  .map((n) => n.replace(/\.assets$/, ''))
  .filter((id) => !ONLY || id === ONLY);

/* A page inside _ext asks for a neighbour; work out where it lands. */
function resolveRef(fromFile, ref) {
  const m = fromFile.match(/[\\/]_ext[\\/]([^\\/]+)[\\/](.*)$/);
  if (!m) return null;
  const host = m[1];
  const rel = m[2].split(/[\\/]/).join('/');
  if (/^https?:/i.test(ref) || /^data:/i.test(ref) || /^mailto:/i.test(ref)) return null;
  let clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {}
  let target;
  if (decoded.startsWith('/')) {
    /* An absolute path inside the mirrored site. */
    target = decoded.replace(/^\/+/, '');
  } else {
    target = path.posix.join(path.posix.dirname(rel), decoded);
  }
  target = path.posix.normalize(target);
  if (target.startsWith('..')) return null;
  return { host, target };
}

const gaps = new Map();

for (const id of courses) {
  const dir = path.join(CW, id + '.assets');
  for (const file of listFiles(dir)) {
    if (!/\.(?:html?|css|js|mjs|json)$/i.test(file)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(REF)) {
      const hit = resolveRef(file, m[1]);
      if (!hit) continue;
      const abs = path.join(dir, '_ext', hit.host, ...hit.target.split('/'));
      if (fs.existsSync(abs)) continue;
      /* The shared library already answers for this one. */
      const shared = path.join('mirror/leqixiang/_shared-ext', hit.host, ...hit.target.split('/'));
      if (fs.existsSync(shared)) continue;
      const key = abs;
      if (!gaps.has(key)) gaps.set(key, { host: hit.host, target: hit.target, id, from: [] });
      const g = gaps.get(key);
      if (g.from.length < 3) g.from.push(path.relative(CW, file));
    }
  }
}

console.log(`缺口 ${gaps.size} 个`);
if (!FETCH) {
  const byHost = new Map();
  for (const g of gaps.values()) byHost.set(g.host, (byHost.get(g.host) || 0) + 1);
  for (const [h, n] of [...byHost].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${h}`);
  process.exit(0);
}

let ok = 0;
let no = 0;
const queue = [...gaps.entries()];

async function worker() {
  while (queue.length) {
    const [abs, g] = queue.shift();
    const url = `https://${g.host}/${g.target}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        no++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) {
        no++;
        continue;
      }
      /*
       * Some servers answer a missing picture with a page of text and a
       * 200 on top.  A picture has to stay a picture.
       */
      const type = String(res.headers.get('content-type') || '');
      const ext = path.extname(abs).toLowerCase();
      const looksBinary = /^(image|audio|video|font)\//i.test(type);
      if (/^text\/html/i.test(type) && !/\.html?$/i.test(ext)) {
        no++;
        continue;
      }
      if (looksBinary && buf[0] === 0x3c) {
        /* Looks like a picture but starts with "<" — it is a page. */
        no++;
        continue;
      }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
      ok++;
      if (ok % 25 === 0) console.log(`  取回 ${ok}，取不到 ${no}`);
    } catch {
      no++;
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
console.log(`\n取回 ${ok}，取不到 ${no}`);
