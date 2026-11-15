#!/usr/bin/env node
/*
 * Make the chapter coursework runnable from the local server.
 *
 * The documents were served from a session address that no longer exists.
 * Every path they name is rewritten to the local asset endpoint, and the
 * entry becomes a small player with the chapter switcher the site uses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const MANIFEST = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'chapters.json');
const WORKS = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json');

/*
 * The chapter list comes from what the pull actually managed to mount, so
 * a course that the platform opens in more or fewer parts is written as it
 * really is instead of as a hand-written list.
 */
const courses = {};
if (fs.existsSync(MANIFEST)) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const works = fs.existsSync(WORKS) ? JSON.parse(fs.readFileSync(WORKS, 'utf8')) : [];
  const titleOf = new Map(works.map((w) => [String(w.id), String(w.title || '')]));
  for (const [id, info] of Object.entries(manifest)) {
    const chapters = (info.entries || []).map((e) => [e.title || e.id, e.path]);
    if (!chapters.length) continue;
    courses[id] = {
      title: titleOf.get(String(id)) || `课件 ${id}`,
      home: chapters[0][1],
      chapters,
    };
  }
}

const ASSET = (id) => `/api/program-assets/${id}/`;

/* Rewrite every relative path in a document to the local asset endpoint. */
const localise = (html, id, dir) => {
  const toLocal = (rel) => {
    const clean = rel.replace(/^\.?\//, '');
    /*
     * A "./" reference inside a chapter can point at that chapter's own
     * folder or at the course root — the platform mixes the two.  The file
     * that is actually on disk decides which spelling is the right one.
     */
    const inChapter = dir ? path.posix.join(dir, clean) : clean;
    const root = path.posix.join(CW, `${id}.assets`, clean);
    const inChapterFile = dir ? path.join(CW, `${id}.assets`, inChapter) : null;
    const useChapter =
      inChapterFile && fs.existsSync(inChapterFile) ? true : fs.existsSync(root);
    return `${ASSET(id)}${useChapter ? inChapter : clean}`;
  };
  let out = html;
  out = out.replace(/(["'])\.\/([^"']+?)\1/g, (m, quote, rest) => `${quote}${toLocal(rest)}${quote}`);
  out = out.replace(
    /(["'])(?!https?:|\/api\/|\/)([A-Za-z0-9_][^"':]*?\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|woff2?|ttf))\1/g,
    (m, quote, rel) => `${quote}${toLocal(rel)}${quote}`
  );
  return out;
};

const STYLE = [
  'html,body{margin:0;height:100%;background:#101418;color:#f2e9d8;font:15px/1.6 system-ui,sans-serif}',
  '#bar{display:flex;gap:10px;align-items:center;padding:10px 14px;background:#1b2027;border-bottom:1px solid #3a3f47}',
  '#bar select{flex:1;max-width:320px;padding:8px 10px;border-radius:8px;border:1px solid #4b535d;background:#232a32;color:#f2e9d8;font:inherit}',
  '#bar button{padding:9px 18px;border:0;border-radius:8px;background:#e5c98f;color:#282119;font:inherit;cursor:pointer}',
  '#bar button:hover{background:#f0d9a8}',
  '#stage{height:calc(100% - 92px)}',
  '#stage iframe{width:100%;height:100%;border:0;display:block}',
  '#note{padding:6px 14px;font-size:13px;color:#9aa4b0;background:#161a20}',
].join('\n');

const SCRIPT = [
  "const select=document.getElementById('chapter');",
  "const frame=document.getElementById('frame');",
  "const open=document.getElementById('open');",
  "const show=()=>{frame.src=select.value;};",
  "open.addEventListener('click',show);",
  "select.addEventListener('change',show);",
  'show();',
].join('\n');

for (const [id, course] of Object.entries(courses)) {
  const dir = path.join(CW, `${id}.assets`);
  if (!fs.existsSync(dir)) continue;

  /* Every chapter document gets its own paths. */
  for (const [, rel] of course.chapters) {
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) continue;
    const folder = path.posix.dirname(rel);
    fs.writeFileSync(file, localise(fs.readFileSync(file, 'utf8'), id, folder));
  }

  /* The course map keeps its own paths. */
  const homeFile = path.join(dir, course.home);
  if (fs.existsSync(homeFile)) {
    let home = localise(fs.readFileSync(homeFile, 'utf8'), id, '');
    /* The lock script belongs to the trial session. */
    home = home.replace(
      /<script[^>]*src=["'][^"']*_turing_trial_locks\.js["'][^>]*>\s*<\/script>/gi,
      ''
    );
    fs.writeFileSync(homeFile, home);
  }

  const options = course.chapters
    .map(([title, rel]) => `<option value="${ASSET(id)}${rel}">${title}</option>`)
    .join('');

  const shell = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${course.title}</title>`,
    `<style>${STYLE}</style>`,
    '</head>',
    '<body>',
    '<div id="bar">',
    `<select id="chapter" aria-label="选择课件章节">${options}</select>`,
    '<button type="button" id="open">打开章节</button>',
    '</div>',
    '<div id="stage"><iframe id="frame" title="课件画面" allow="autoplay; fullscreen"></iframe></div>',
    '<div id="note">本课件为乐启享本地课件库中的离线副本，章节内容来自公开试用。</div>',
    `<script>${SCRIPT}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(CW, `${id}.html`), shell);
  console.log(`${id}: entry written, ${shell.length} chars`);
}
