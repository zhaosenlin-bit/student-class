#!/usr/bin/env node
/*
 * 每一处指向本地文件的名字，都要真的找得到那个文件。
 *
 * 页面上写着的名字、样式表里写着的名字、脚本里写着的名字，还有运行
 * 的时候拼出来的目录——都按它们各自的方式去找一遍。找不到的，就是
 * 走不通的地方，一处都不许有。
 *
 *   node tools/check-static-refs.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const LESSON = arg('lesson', '');

const posix = path.posix;
const LOOKS_LOCAL =
  /^[\w.\-\/\\ ()\u4e00-\u9fa5]+?\.(?:png|jpe?g|gif|svg|webp|bmp|ico|mp3|wav|ogg|m4a|mp4|webm|mov|glb|gltf|bin|json|js|mjs|css|html?|wasm|ttf|otf|woff2?|ktx2?|basis|txt|md|glsl|wgsl|vert|frag|obj|mtl|ply|csv|xml)$/i;

function cleanRef(raw) {
  let s = String(raw).trim();
  if (s.length > 400) return null;
  s = s.replace(/^["'`]|["'`]$/g, '');
  if (!s) return null;
  if (/^(?:[a-z][a-z0-9+.\-]*:|\/\/)/i.test(s)) return null;
  if (s.startsWith('#') || s.startsWith('/')) return null;
  return s;
}

function patternsOf(kind) {
  if (kind === 'page') {
    return [
      [/\b(?:src|href|poster|data-src|data-poster|data-url|action|formaction|xlink:href|data-background-image)\s*=\s*(["'])([^"']{1,600})\1/gi, 2, 'self'],
      [/\burl\(\s*(["']?)([^)"']{1,400})\1\s*\)/gi, 2, 'self'],
      [/\bimport\s+(?:[^'";]*?\sfrom\s*)?(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bimport\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\brequire\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bfetch\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*import\.meta\.url/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*document\.currentScript\.src/g, 2, 'self'],
      [/\bnew\s+(?:Worker|SharedWorker|Audio|Video)\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\.(?:src|href)\s*=\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
    ];
  }
  if (kind === 'style') {
    return [
      [/\burl\(\s*(["']?)([^)"']{1,400})\1\s*\)/gi, 2, 'self'],
      [/@import\s+(?:url\()?\s*(["'])([^"']{1,400})\1/gi, 2, 'self'],
    ];
  }
  if (kind === 'script') {
    return [
      [/\bimport\s+(?:[^'";]*?\sfrom\s*)?(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bimport\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\brequire\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bfetch\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*import\.meta\.url/g, 2, 'self'],
      [/\bimport\.meta\.resolve\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*document\.currentScript\.src/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*(?:window\.)?document\.baseURI/g, 2, 'page'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*(?:window\.)?location\.href/g, 2, 'page'],
      [/\bnew\s+(?:Worker|SharedWorker|Audio|Video)\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\.open\s*\(\s*(["'])[A-Za-z]+["']\s*,\s*(["'])([^'"]{1,400})\2/g, 3, 'self'],
      [/\.(?:src|href)\s*=\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\.setAttribute\s*\(\s*(["'])(?:src|href|data-src)["']\s*,\s*(["'])([^'"]{1,400})\2/g, 3, 'self'],
    ];
  }
  return [];
}

function kindOf(rel) {
  if (/\.(?:html?|svg)$/i.test(rel)) return 'page';
  if (/\.css$/i.test(rel)) return 'style';
  if (/\.(?:js|mjs)$/i.test(rel)) return 'script';
  return 'other';
}

/* 课件里每一个文件，连同它在站点里的位置。 */
const files = new Map(); // 站点相对 -> 绝对
const walk = (dir, rel) => {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, it.name);
    const r = rel ? rel + '/' + it.name : it.name;
    if (it.isDirectory()) walk(p, r);
    else files.set(r, p);
  }
};

const lessonsRoot = path.join(ROOT, 'courseware');
walk(ROOT, '');
const ids = fs.existsSync(lessonsRoot)
  ? fs
      .readdirSync(lessonsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((id) => !LESSON || id === LESSON)
  : [];

const problems = [];
let checked = 0;
let outer = 0;

for (const id of ids) {
  const root = path.join(lessonsRoot, id);
  const lessonFiles = new Set();
  const lessonDirs = new Set();
  const collect = (dir, rel) => {
    for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, it.name);
      const r = rel ? rel + '/' + it.name : it.name;
      if (it.isDirectory()) {
        lessonDirs.add(r);
        collect(p, r);
      } else lessonFiles.add(r);
    }
  };
  collect(root, '');

  const pageFile = path.join(root, 'index.html');
  let pageBase = '';
  if (fs.existsSync(pageFile)) {
    const html = fs.readFileSync(pageFile, 'utf8');
    const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(html);
    pageBase = m ? posix.normalize(posix.join('.', m[1])) : '.';
  }

  const scan = (dir, rel) => {
    for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, it.name);
      const r = rel ? rel + '/' + it.name : it.name;
      if (it.isDirectory()) {
        scan(p, r);
        continue;
      }
      const kind = kindOf(r);
      if (kind === 'other' && !/\.(?:json|txt|md|csv|xml)$/i.test(r)) continue;
      if (fs.statSync(p).size > 12 * 1024 * 1024) continue;
      let text;
      try {
        text = fs.readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      let base = posix.dirname(r);
      if (kind === 'page') {
        const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(text);
        if (m) base = posix.normalize(posix.join(base, m[1]));
      }
      const report = (raw, fromBase) => {
        const clean = cleanRef(raw);
        if (!clean) return;
        if (!LOOKS_LOCAL.test(clean)) return;
        const bare = clean.split('#')[0].split('?')[0];
        if (!bare) return;
        const target = posix.normalize(posix.join(fromBase, bare));
        if (target.startsWith('..')) return;
        checked += 1;
        const siteRel = 'courseware/' + id + '/' + target;
        const exists =
          lessonFiles.has(target) || files.has(siteRel) || fs.existsSync(path.join(ROOT, siteRel));
        if (!exists) {
          problems.push({ id, file: r, ref: clean, target });
        }
      };
      for (const [re, pick, mode] of patternsOf(kind)) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text))) {
          const raw = cleanRef(m[pick]);
          if (!raw) continue;
          if (/^(?:[a-z][a-z0-9+.\-]*:|\/\/)/i.test(raw)) {
            outer += 1;
            continue;
          }
          report(raw, mode === 'page' ? pageBase : base);
        }
      }
      /* 模块映射表里的名字。 */
      if (kind === 'page') {
        const I = /<script[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi;
        let m;
        while ((m = I.exec(text))) {
          const J = /"[^"]*"\s*:\s*"([^"]{1,300})"/g;
          let j;
          while ((j = J.exec(m[1]))) report(j[1], base);
        }
      }
      /* 运行的时候拼出来的目录：目录本身要在，目录里的东西也要在。 */
      const D = /(["'])(\.{1,2}\/[^"']{1,300}?\/)\1/g;
      let m;
      while ((m = D.exec(text))) {
        const raw = m[2];
        const target = posix.normalize(posix.join(base, raw)).replace(/\/+$/, '');
        if (target.startsWith('..')) continue;
        if (!lessonDirs.has(target)) continue;
        checked += 1;
        if (!lessonDirs.has(target)) {
          problems.push({ id, file: r, ref: raw, target });
        }
      }
    }
  };
  scan(root, '');
}

console.log(`课件 ${ids.length} 门，看了 ${checked} 处本地名字，站外 ${outer} 处`);
const OUT = arg('out', '');
if (OUT) {
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        root: ROOT,
        lessons: ids.length,
        checked,
        problems: problems.map((p) => `${p.id}|${p.file}|${p.ref}`),
      },
      null,
      1
    )
  );
}
if (!problems.length) {
  console.log('每一处本地名字都找得到文件。');
} else {
  console.log(`走不通 ${problems.length} 处：`);
  const seen = new Set();
  for (const p of problems) {
    const key = p.id + '|' + p.file + '|' + p.ref;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size <= 30) console.log(`   ${p.id} ${p.file} -> ${p.ref}`);
  }
}
process.exitCode = problems.length ? 1 : 0;
