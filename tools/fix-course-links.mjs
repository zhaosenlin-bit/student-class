#!/usr/bin/env node
/*
 * Put back the local addresses of a lesson that point at nothing.
 *
 * A lesson keeps its pages, scripts, styles and pictures in its own
 * folder.  Some of the addresses in those pages were counted from
 * where the lesson sat on the published site, and after the lesson was
 * moved into its own folder they point at a place where there is
 * nothing.  The browser says nothing about it; the piece simply does
 * not arrive, and the lesson looks like it is missing a part.
 *
 * Every local address is counted the way the browser counts it:
 *
 *   - in a page, from the base of the page (a page may name one);
 *   - in a style sheet, from the place the style sheet stands.
 *
 * If what comes out is there, nothing is touched.  If it is not, the
 * few places the address could have been counted from are all tried,
 * and the one that does give a real file is used.
 *
 *   node tools/fix-course-links.mjs --root dist [--dry] [--report]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const DIST = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');
const REPORT = args.includes('--report');
const COURSE = path.join(DIST, 'courseware');

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

const relativeTo = (from, to) => {
  const a = from.replace(/[\\/]+$/, '').split(/[\\/]/);
  const b = to.replace(/[\\/]+$/, '').split(/[\\/]/);
  let i = 0;
  while (i < a.length - 1 && i < b.length - 1 && a[i] === b[i]) i += 1;
  const rel = [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
};

const PATTERNS = [
  [/\b(?:src|href|poster|data-src|data-poster)\s*=\s*(["'])([^"']{1,600})\1/gi, 2],
  [/\burl\(\s*(["']?)([^)"']{1,400})\1\s*\)/gi, 2],
];

/*
 * 样式表里的 url(...) 是真的地址。可是在页面里，`new URL(x)` 这种
 * 写法里的 URL 也是 url(——那不是地址，是在代码里提到一个地址。
 * 改到它上面去，页面就坏了。
 *
 * 所以：样式表文件里照看；在页面里，只看 <style> 块里面的。
 */
function styleRanges(file, text) {
  if (/\.css$/i.test(file)) return [[0, text.length]];
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(text))) {
    out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

const inStyle = (ranges, at) => ranges.some(([a, b]) => at >= a && at < b);

/* The place an address in this file is counted from. */
function baseOf(file) {
  if (!/\.html?$/i.test(file)) return path.dirname(file);
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return path.dirname(file);
  }
  const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(text);
  if (!m) return path.dirname(file);
  return path.resolve(path.dirname(file), m[1]);
}

let fixedFiles = 0;
let fixedRefs = 0;
const stillBroken = [];

for (const id of fs.readdirSync(COURSE, { withFileTypes: true })) {
  if (!id.isDirectory()) continue;
  const lessonDir = path.join(COURSE, id.name);
  const all = walk(lessonDir);

  /* The base of the page that opens the lesson. */
  const indexFile = path.join(lessonDir, 'index.html');
  const courseBase = fs.existsSync(indexFile) ? baseOf(indexFile) : lessonDir;

  for (const file of all) {
    if (!/\.(?:html?|css|svg)$/i.test(file)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const ownDir = path.dirname(file);
    const base = baseOf(file);
    const styles = styleRanges(file, text);
    let changed = false;

    for (const [re, pick] of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        /* 页面里，只有 <style> 块里面的 url(...) 才是地址。 */
        if (re !== PATTERNS[1][0] || !inStyle(styles, m.index)) continue;
        /*
         * The base of a page is counted from the page itself, not from
         * the base it names, so it is never moved.
         */
        if (/<base\b/i.test(text.slice(Math.max(0, m.index - 40), m.index + 6))) continue;
        const raw = m[pick];
        if (!raw) continue;
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(raw)) continue;
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) continue;
        const asBase = path.resolve(base, clean);
        if (asBase.startsWith(DIST + path.sep) && fs.existsSync(asBase)) continue;

        /*
         * The few places the address could have been counted from:
         * its own base, the folder of this file, the lesson, the base of
         * the lesson, and every layer from this file up to the lesson.
         */
        const candidates = [base, ownDir, lessonDir, courseBase];
        let up = ownDir;
        while (up.startsWith(lessonDir) && up !== lessonDir) {
          up = path.dirname(up);
          candidates.push(up);
        }
        let target = null;
        for (const candidate of candidates) {
          const found = path.resolve(candidate, clean);
          if (!found.startsWith(DIST + path.sep)) continue;
          if (!fs.existsSync(found)) continue;
          target = found;
          break;
        }
        if (!target) {
          /*
           * 报告里要的是「地址」。可是脚本里写着
           * `new URL(win.location.href)` 这种话，它不是地址，
           * 只是在代码里提到一个地址。混进来会让这份报告看不出
           * 真正的问题。这里只留像是路径的东西。
           */
          if (!/^[\w@~%+.,;=$&*()\[\]'"?!#-]+\/[\w@~%+.,;=$&*()\[\]'"?!#-]*$/.test(clean)) continue;
          if (!/\.[a-z0-9]{1,6}($|[?#])/i.test(clean)) continue;
          stillBroken.push({
            id: id.name,
            file: path.relative(DIST, file),
            raw,
          });
          continue;
        }

        const next = relativeTo(base, target) + raw.slice(clean.length);
        if (next === raw) continue;
        if (REPORT) {
          console.log(`      ${path.relative(DIST, file)}: ${raw}  ->  ${next}`);
        }
        const at = m.index + m[0].indexOf(raw);
        text = text.slice(0, at) + next + text.slice(at + raw.length);
        changed = true;
        fixedRefs += 1;
        re.lastIndex = at + next.length;
      }
    }

    if (changed) {
      fixedFiles += 1;
      if (!DRY) fs.writeFileSync(file, text, 'utf8');
      console.log(`  fixed ${path.relative(DIST, file)}`);
    }
  }
}

console.log('');
console.log(`fixed addresses: ${fixedRefs} in ${fixedFiles} files.`);
if (stillBroken.length) {
  console.log(`still pointing at nothing: ${stillBroken.length}`);
  for (const s of stillBroken.slice(0, 60)) {
    console.log(`  ${s.id}  ${s.file}  ${s.raw}`);
  }
}
