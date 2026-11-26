/*
 * 课件里"指向自己文件的名字"，怎么找、怎么算它落在哪儿。
 *
 * 浏览器解析相对地址，认的是"文档基准"：
 *   - 页面写了 <base href="…"> 的，就按它指的那个目录算；
 *   - 没写的，就按页面自己所在的目录算；
 *   - 样式表里的 url()，按样式表自己所在的目录算；
 *   - 脚本里写出来的地址，按打开它的那个页面的基准算。
 *
 * 算错了，名字就会落到别的地方去——本地 Windows 不分大小写，
 * 传上对象存储就分大小写了，于是一部分看着好好的，一上线就 404。
 */
import fs from 'node:fs';
import path from 'node:path';

export const posix = path.posix;

/* 站点里每一个文件：真的名字一份，放开大小写的名字一份。 */
export function buildIndex(root) {
  const exact = new Set();
  const loose = new Map();
  (function walk(dir, rel = '') {
    for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? rel + '/' + it.name : it.name;
      const abs = path.join(dir, it.name);
      if (it.isDirectory()) walk(abs, r);
      else {
        exact.add(r);
        const k = r.toLowerCase();
        if (!loose.has(k)) loose.set(k, r);
      }
    }
  })(root);
  return { exact, loose };
}

/* 页面里写的 <base href> 落在哪儿；没写就是页面自己所在的目录。 */
export function pageBase(ownDir, text) {
  const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(text);
  if (!m) return ownDir;
  return posix.normalize(posix.join(ownDir, m[1]));
}

/*
 * 把文件里写出来的名字都捡出来。
 * 引号里的（属性值、url()、脚本里的字符串）算一处；
 * 属性上没引号的也算一处。
 */
export function collectRefs(text) {
  const out = [];
  const push = (value, index) => {
    const s = String(value).trim();
    if (!s || s.length > 400) return;
    if (/^(?:[a-z][a-z0-9+.\-]*:|\/\/)/i.test(s)) return;
    if (s.startsWith('#') || s.startsWith('/')) return;
    if (!s.includes('/')) return;
    out.push({ value: s, index });
  };

  const LITERAL = /(["'`])((?:[^"'`\\\n]|\\.)*?)\1/g;
  let m;
  while ((m = LITERAL.exec(text))) push(m[2], m.index);

  const ATTR = /\b(?:src|href|data-src|poster)\s*=\s*([^\s"'`=<>]+)/gi;
  while ((m = ATTR.exec(text))) push(m[1], m.index);

  return out;
}

/* 像不像一个站内的文件名字。 */
const LOOKS_LOCAL =
  /^[\w.\-\/\\ ()一-龥]+?\.(?:png|jpe?g|gif|svg|webp|bmp|ico|mp3|wav|ogg|m4a|mp4|webm|mov|glb|gltf|bin|json|js|mjs|css|html?|wasm|ttf|otf|woff2?|ktx2?|basis|txt|md|glsl|wgsl|vert|frag|obj|mtl|ply|csv|xml|gz|tflite|task|terrain|dat|frag|vert|glsl|spv|ktx|env|map|jsonl)$/i;

export function looksLocal(s) {
  return LOOKS_LOCAL.test(s);
}

/*
 * 一门课件里，所有可能当基准的目录。
 * 脚本是哪个页面带出来的说不准，就把这一门课件里所有页面的基准都算上。
 */
export function courseBases(courseDir, courseId) {
  const pages = [];
  const stack = [[courseDir, '']];
  while (stack.length) {
    const [here, rel] = stack.pop();
    for (const it of fs.readdirSync(here, { withFileTypes: true })) {
      const p = path.join(here, it.name);
      const r = rel ? rel + '/' + it.name : it.name;
      if (it.isDirectory()) {
        stack.push([p, r]);
        continue;
      }
      if (!/\.html?$/i.test(it.name)) continue;
      let text;
      try {
        text = fs.readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      const ownDir = posix.join('courseware/' + courseId, posix.dirname(r));
      pages.push({ file: r, ownDir, base: pageBase(ownDir, text) });
    }
  }
  return pages;
}

/*
 * 一处名字，在这些基准里，哪一个能真的找到文件？
 *
 * 找到的写法：
 *   { kind: 'ok' }                 —— 正好在，不用动
 *   { kind: 'case', base, real }   —— 名字对不上，改大小写
 *   { kind: 'depth', base, real }  —— 退的层数不对，重算
 */
export function resolveRef(ref, bases, index) {
  const hashIdx = ref.search(/[?#]/);
  const bare = hashIdx >= 0 ? ref.slice(0, hashIdx) : ref;
  const tail = hashIdx >= 0 ? ref.slice(hashIdx) : '';

  let caseHit = null;
  let depthHit = null;

  for (const base of bases) {
    const want = posix.normalize(posix.join(base, bare));
    if (index.exact.has(want)) return { kind: 'ok' };
    const looseReal = index.loose.get(want.toLowerCase());
    if (looseReal && !caseHit) {
      /* 名字对不上，但地方是对的：只把大小写改回来。 */
      caseHit = { kind: 'case', base, real: looseReal, rel: posix.relative(base, looseReal) };
    }

    /*
     * 退的层数可能不对。把后面那一段单独拎出来看看它在不在，
     * 在的话说明目标找得到，只是层数写歪了。
     */
    const ups = bare.match(/^(?:(?:\.\.\/)|(?:\.\/))+/);
    if (ups && !depthHit) {
      const rest = bare.slice(ups[0].length);
      if (rest && !rest.startsWith('..') && rest.includes('/')) {
        /*
         * 目标可能在站点根上，也可能在收拢过的共享目录里——
         * 两种都试一遍，找到哪个算哪个。
         */
        const tries = [rest, 'shared/assets/' + rest];
        for (const t of tries) {
          const exactRest = index.exact.has(t);
          const looseRest = index.loose.get(t.toLowerCase());
          if (!exactRest && !looseRest) continue;
          const real = exactRest ? t : looseRest;
          /*
           * 只改退的层数，别把路径形状改了：
           * 后面那一段原样照抄，层数按基准重新算。
           */
          const rel = posix.relative(base, real);
          if (rel && rel !== bare) {
            depthHit = { kind: 'depth', base, real, rel };
            break;
          }
        }
      }
    }
  }

  return caseHit || depthHit || { kind: 'missing' };
}

/* 把算好的名字写回文件里。只换名字那一段，别的原样留着。 */
export function rewriteIn(text, from, to) {
  return text.split(from).join(to);
}
