/*
 * 上线前查一遍：把课件库挂到官网目录下以后，nginx 到底会把哪些文件
 * 挡掉、拿错。
 *
 * 这台机器上没有 nginx 可跑，所以这里按 nginx 的定位匹配规则重演一遍：
 *
 *   1. 完全匹配（location = /x）先命中，直接用它；
 *   2. 再找最长前缀匹配，记住它；
 *   3. 这个前缀带 ^~ 就不再看正则；
 *   4. 否则按配置里出现的先后顺序试正则，命中第一个就用它；
 *   5. 都没命中就用第 2 步记住的前缀。
 *
 * 课件打包下载是浏览器照着清单一个文件一个文件去取的。清单里的文件要是
 * 被 deny all 挡成 403，或者被 try_files 拿首页顶上来（200），浏览器
 * 都不会报错，只会把拿回来的东西照原样收进压缩包——包就坏了。
 * 这个把 dist 下每一个文件都过一遍，报出挡掉的和顶掉的。
 *
 * 用法：
 *   node tools/check-nginx-mount.mjs --site C:\kaifa\my_website\nginx.conf
 *   node tools/check-nginx-mount.mjs --conf deploy/nginx-static-subfolder.conf \
 *        --site C:\kaifa\my_website\nginx.conf
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SITE = arg('--site', 'C:/kaifa/my_website/nginx.conf');
const MOUNT = arg('--mount', '/leqixiang');
const ROOT = path.resolve(arg('--root', 'dist'));
const CONF = arg('--conf', 'deploy/nginx-static-subfolder.conf');
const OUT = arg('--out', 'receipts/nginx-mount.json');

/* ---------------------------------------------------------------- 解析 */

function parseBlock(src, pos) {
  const directives = [];
  const locations = [];
  const servers = [];

  while (pos < src.length) {
    while (pos < src.length) {
      if (/\s/.test(src[pos])) { pos += 1; continue; }
      if (src[pos] === '#') {
        while (pos < src.length && src[pos] !== '\n') pos += 1;
        continue;
      }
      break;
    }
    if (pos >= src.length) break;
    if (src[pos] === '}') { pos += 1; break; }

    let chunk = '';
    while (pos < src.length && src[pos] !== '{' && src[pos] !== ';') {
      chunk += src[pos];
      pos += 1;
    }
    if (pos >= src.length) break;
    if (src[pos] === ';') {
      pos += 1;
      directives.push(chunk.trim().split(/\s+/));
      continue;
    }

    pos += 1; // 吃掉 '{'
    const head = chunk.trim();
    const sub = parseBlock(src, pos);
    pos = sub.pos;

    if (/^location\b/.test(head)) {
      const parts = head.split(/\s+/);
      const loc = {
        modifier: '',
        uri: '',
        directives: sub.directives,
        locations: sub.locations,
      };
      if (['=', '^~', '~', '~*'].includes(parts[1])) {
        loc.modifier = parts[1];
        loc.uri = parts[2];
      } else {
        loc.uri = parts[1];
      }
      locations.push(loc);
    } else if (/^server\b/.test(head)) {
      locations.push(...sub.locations);
      directives.push(...sub.directives);
      servers.push({ head: head.trim(), ...sub });
    } else {
      directives.push(...sub.directives);
    }
  }

  return { directives, locations, servers, pos };
}

function readLocations(file) {
  const text = fs.readFileSync(file, 'utf8');
  const parsed = parseBlock(text, 0);
  const servers = parsed.servers;
  if (!servers.length) {
    // 挂载配置本身是一堆 location，没有 server 包裹，直接用。
    return parsed.locations;
  }
  const https = servers.filter((s) =>
    s.directives.some((d) => d[0] === 'listen' && (d[1] || '').startsWith('443')),
  );
  return (https[0] || servers[0]).locations;
}

/* ------------------------------------------------------------ 匹配规则 */

const REGEX_MOD = new Set(['~', '~*']);

function matchIn(locations, uri) {
  for (const l of locations) {
    if (l.modifier === '=' && l.uri === uri) return { loc: l, how: 'exact' };
  }

  let best = null;
  for (const l of locations) {
    if (REGEX_MOD.has(l.modifier) || l.modifier === '=') continue;
    if (!uri.startsWith(l.uri)) continue;
    if (!best || l.uri.length > best.uri.length) best = l;
  }

  if (best && best.modifier === '^~') {
    return { loc: best, how: 'prefix ^~' };
  }

  for (const l of locations) {
    if (!REGEX_MOD.has(l.modifier)) continue;
    const re = new RegExp(l.uri, l.modifier === '~*' ? 'i' : '');
    if (re.test(uri)) return { loc: l, how: `regex ${l.modifier}` };
  }

  if (best) return { loc: best, how: 'prefix' };
  return null;
}

function resolve(loc, uri) {
  if (!loc.locations.length) return loc;
  const inner = matchIn(loc.locations, uri);
  return inner ? resolve(inner.loc, uri) : loc;
}

function directiveValue(loc, name) {
  const hit = loc.directives.find((d) => d[0] === name);
  return hit ? hit.slice(1) : null;
}

/* -------------------------------------------------------------- 判定 */

function outcomeFor(loc, uri, onDisk) {
  const deny = directiveValue(loc, 'deny');
  if (deny && deny[0] === 'all') return { status: 403, why: 'deny all' };

  const ret = directiveValue(loc, 'return');
  if (ret) return { status: Number(ret[0]) || 302, why: `return ${ret.join(' ')}` };

  const proxy = directiveValue(loc, 'proxy_pass');
  if (proxy) return { status: 200, why: 'proxy_pass' };

  const tryFiles = directiveValue(loc, 'try_files');
  if (tryFiles) {
    const last = tryFiles[tryFiles.length - 1];
    const onDiskHere = onDisk(uri);
    if (onDiskHere) return { status: 200, why: 'file' };
    if (last && last.startsWith('/')) {
      return { status: 200, why: `fallback ${last}`, wrongBody: true };
    }
    return { status: Number(last) || 404, why: 'try_files 404', wrongBody: false };
  }

  return onDisk(uri)
    ? { status: 200, why: 'file' }
    : { status: 404, why: 'missing' };
}

/* -------------------------------------------------------------- 跑一遍 */

const siteLocations = readLocations(SITE);
const mountLocations = readLocations(CONF);

if (!siteLocations.length) {
  console.error(`没能从 ${SITE} 里读出定位规则。`);
  process.exit(2);
}
if (!mountLocations.length) {
  console.error(`没能从 ${CONF} 里读出定位规则。`);
  process.exit(2);
}

// 官网原有的规则排在前面，课件库挂载规则接在后面——
// 顺序只影响正则之间，正则被 ^~ 挡掉以后顺序不影响。
const allLocations = [...siteLocations, ...mountLocations];

const disk = new Set();
const walk = (dir, rel) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(full, r);
    else disk.add(r);
  }
};
walk(ROOT, '');

const onDisk = (uri) => {
  const rel = decodeURIComponent(uri.slice(MOUNT.length + 1));
  return disk.has(rel);
};

const files = [...disk].map((rel) => `${MOUNT}/${rel}`);

const denied = [];
const wrongBody = [];
const missing = [];
const dotfiles = [];
let dotfileTotal = 0;

// 这些点开头的名字是配置和版本库的东西，不该露出去。
const SENSITIVE_DOT = /^\.(ht|htaccess|git|gitignore|env|svn|DS_Store|idea|vscode)/i;
const byLocation = new Map();

for (const uri of files) {
  const hit = matchIn(allLocations, uri);
  if (!hit) { missing.push({ uri, why: 'no location' }); continue; }
  const loc = resolve(hit.loc, uri);
  const out = outcomeFor(loc, uri, onDisk);
  const key = `${hit.how}  ${loc.uri}`;
  byLocation.set(key, (byLocation.get(key) || 0) + 1);
  // 隐藏文件被挡掉是对的，挡住课件里的正经文件才是问题。
  const base = uri.slice(uri.lastIndexOf('/') + 1);
  if (base.startsWith('.')) {
    dotfileTotal += 1;
    if (SENSITIVE_DOT.test(base)) {
      // 该挡的没挡住。
      if (out.status !== 403) {
        dotfiles.push({ uri, loc: loc.uri, why: '该挡的没挡住' });
      }
    } else if (out.status === 403) {
      // 正常的素材被当成隐藏文件挡掉了，图片会裂。
      denied.push({ uri, loc: loc.uri, how: '被当隐藏文件挡了' });
    }
    continue;
  }
  if (out.status === 403) denied.push({ uri, loc: loc.uri, how: hit.how });
  else if (out.wrongBody) wrongBody.push({ uri, loc: loc.uri, how: hit.how, why: out.why });
  else if (out.status === 404) missing.push({ uri, loc: loc.uri, how: hit.how, why: out.why });
}

// 官网自己的页面还得照旧走
const siteChecks = ['/', '/index.html', '/api/ping', '/ai-proxy/chat'];
const siteResults = siteChecks.map((uri) => {
  const hit = matchIn(allLocations, uri);
  const loc = hit ? resolve(hit.loc, uri) : null;
  return { uri, how: hit?.how || '-', loc: loc?.uri || '-' };
});

const report = {
  checkedAt: new Date().toISOString(),
  site: SITE,
  mount: CONF,
  mountPath: MOUNT,
  files: files.length,
  denied: denied.length,
  wrongBody: wrongBody.length,
  missing: missing.length,
  dotfileTotal,
  dotfileExposed: dotfiles.length,
  byLocation: Object.fromEntries([...byLocation].sort((a, b) => b[1] - a[1])),
  siteResults,
  samples: {
    denied: denied.slice(0, 5),
    wrongBody: wrongBody.slice(0, 5),
    missing: missing.slice(0, 5),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`官网配置：${SITE}`);
console.log(`挂载配置：${CONF}`);
console.log(`逐个文件过一遍：${files.length} 个`);
console.log('');
for (const [k, v] of [...byLocation].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(7)}  ${k}`);
}
console.log('');
console.log(`被挡成 403 的：${denied.length}`);
console.log(`拿错内容（主页顶上来）的：${wrongBody.length}`);
console.log(`取不到的：${missing.length}`);
console.log(`隐藏文件：${dotfileTotal} 个，挡住 ${dotfileTotal - dotfiles.length} 个，露出 ${dotfiles.length} 个`);
console.log('');
for (const r of siteResults) {
  console.log(`  官网自己的 ${r.uri.padEnd(16)} → ${r.how} ${r.loc}`);
}

if (denied.length || wrongBody.length || missing.length || dotfiles.length) {
  console.log('');
  console.log('有问题，前几条例子：');
  for (const x of [...denied, ...wrongBody, ...missing].slice(0, 10)) {
    console.log(`  ${x.uri}  (${x.loc})  ${x.why || ''}`);
  }
  process.exitCode = 1;
} else {
  console.log('');
  console.log('全部通过：每个文件都按原样送到浏览器。');
}
