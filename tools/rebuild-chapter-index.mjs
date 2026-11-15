#!/usr/bin/env node
/*
 * Rebuild the chapter list of a chapter course from what is on disk.
 *
 * The switcher of a chapter course used to be written from the list of
 * chapters that happened to be mounted when the quota ran out, so a
 * course with seven chapters could offer only four of them even though
 * the other pages were sitting on the disk.
 *
 * The adapter that the runtime reads is the better list: it names every
 * chapter, in order, with its title.  When a course has no adapter yet,
 * the pages on the disk are used and their own titles name them.
 *
 *   node tools/rebuild-chapter-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const MANIFEST = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'chapters.json');
const WORKS = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json');

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const works = fs.existsSync(WORKS) ? JSON.parse(fs.readFileSync(WORKS, 'utf8')) : [];
const titleOf = new Map(works.map((w) => [String(w.id), String(w.title || '')]));

const ASSET = (id) => `/api/program-assets/${id}/`;

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

/*
 * The host side of the chapter runtime.  It is written into the entry
 * page itself, so the page keeps working on its own when the course is
 * downloaded and opened away from the local server.
 */
const HOST = fs.readFileSync(path.join(ROOT, 'tools', 'lq-reviewed-host.js'), 'utf8');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/* Compare names so that "第2章" comes before "第10章". */
const natural = (a, b) =>
  a.localeCompare(b, 'zh', { numeric: true, sensitivity: 'base' });

/* The title a chapter document carries. */
function titleOfFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (!title) return '';
  /* "《简爱：桑菲尔德庄园的秘密》第一章" -> "第一章" */
  const tail = title.match(/(第[^\s]{0,12}章.*|序章.*|全国山河.*)$/)?.[1];
  return tail || title;
}

for (const id of Object.keys(manifest)) {
  const dir = path.join(CW, `${id}.assets`);
  if (!fs.existsSync(dir)) continue;

  const adapter = path.join(dir, '_course_runtime', 'adapter.json');
  const entries = [];

  if (fs.existsSync(adapter)) {
    const parsed = JSON.parse(fs.readFileSync(adapter, 'utf8'));
    for (const entry of parsed.entries || []) {
      const rel = entry.path;
      if (!fs.existsSync(path.join(dir, rel))) continue;
      entries.push({ id: entry.id, title: entry.title || entry.id, path: rel });
    }
  }

  if (!entries.length) {
    /* No adapter: use the pages on the disk, keeping the order and the
       names the earlier list already had. */
    const known = new Map((manifest[id].entries || []).map((e) => [e.path, e.title]));
    const files = walk(dir)
      .filter((f) => /\.html?$/i.test(f))
      .map((f) => path.relative(dir, f).replace(/\\/g, '/'))
      .filter((rel) => !rel.startsWith('_course_runtime/'));
    /* The index of the course comes first, then the chapters in order. */
    files.sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      /* A folder's own index is the first chapter of that folder. */
      const folder = (rel) => path.posix.dirname(rel) + '/';
      if (folder(a) !== folder(b)) return natural(folder(a), folder(b));
      const isIndex = (rel) => path.posix.basename(rel).startsWith('index');
      if (isIndex(a) !== isIndex(b)) return isIndex(a) ? -1 : 1;
      return natural(a, b);
    });
    for (const rel of files) {
      entries.push({
        id: rel,
        title: known.get(rel) || titleOfFile(path.join(dir, rel)) || rel,
        path: rel,
      });
    }
  }

  if (!entries.length) continue;
  manifest[id] = { entries };

  const title = titleOf.get(String(id)) || `课件 ${id}`;
  const options = entries
    .map((e) => `<option value="${ASSET(id)}${e.path}">${e.title}</option>`)
    .join('');
  const hasAdapter = fs.existsSync(adapter);
  const host = HOST.replaceAll('%%PROGRAM%%', id).replaceAll('%%RUNTIME%%', `${ASSET(id)}_course_runtime/`);
  const shell = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${title}</title>`,
    `<style>${STYLE}</style>`,
    '</head>',
    '<body>',
    '<div id="bar">',
    `<select id="chapter" aria-label="选择课件章节">${options}</select>`,
    '<button type="button" id="open">打开章节</button>',
    '</div>',
    '<div id="stage"><iframe id="frame" title="课件画面" allow="autoplay; fullscreen"></iframe></div>',
    '<div id="note">本课件为乐启享本地课件库中的离线副本，章节内容来自公开试用。</div>',
    hasAdapter ? `<script type="module">\n${host}\n</script>` : `<script>${SCRIPT}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(CW, `${id}.html`), shell);
  console.log(
    `${id}: ${entries.length} 章${hasAdapter ? '（含运行时宿主）' : ''} -> ${entries.map((e) => e.title).join(' / ')}`
  );
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log('章节清单已写入 chapters.json');
