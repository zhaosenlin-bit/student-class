#!/usr/bin/env node
/*
 * Give the 长征 course a page of its own.
 *
 * The document of that course is a wrapper: it asks the page around it
 * for the saved progress before it draws anything, and gives up after
 * ten seconds when nobody answers.  Opened on its own it shows nothing
 * but a spinner.  Here a small page is written that holds the course
 * in a frame and answers the handshake out of the browser's storage.
 *
 *   node tools/rebuild-longmarch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const HOST = fs.readFileSync(path.join(ROOT, 'tools', 'lq-longmarch-host.js'), 'utf8');

const STYLE = [
  'html,body{margin:0;height:100%;background:#17150f;overflow:hidden}',
  '#frame{display:block;width:100%;height:100%;border:0}',
].join('\n');

/* The wrapper carries its own settings as a JSON blob; read them out. */
function settingsOf(file) {
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf('({"protocol"');
  if (at < 0) return null;
  const end = text.indexOf('},', at);
  const blob = text.slice(at + 1, end + 1);
  try {
    return JSON.parse(blob);
  } catch {
    return null;
  }
}

let done = 0;
for (const name of fs.readdirSync(CW)) {
  if (!name.endsWith('.assets')) continue;
  const id = name.replace(/\.assets$/, '');
  if (!/^\d+$/.test(id)) continue;
  const wrapper = path.join(CW, name, 'index.html');
  if (!fs.existsSync(wrapper)) continue;
  const settings = settingsOf(wrapper);
  if (!settings || !/long-march-save/.test(settings.protocol || '')) continue;

  const body = path.join(CW, `${id}.html`);
  const title = settings.programId ? `长征 · ${id}` : `长征`;
  const script = HOST.replaceAll('%%PROGRAM%%', id)
    .replaceAll('%%PROTOCOL%%', settings.protocol)
    .replaceAll('%%KEYS%%', JSON.stringify(settings.keys || []));

  const page = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${title}</title>`,
    `<style>${STYLE}</style>`,
    '</head>',
    '<body>',
    `<iframe id="frame" title="课件画面" allow="autoplay; fullscreen" src="/api/program-assets/${id}/index.html"></iframe>`,
    `<script>${script}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');

  fs.writeFileSync(body, page, 'utf8');
  console.log(`${id}: 长征宿主页已写入（${(settings.keys || []).length} 个存档键）`);
  done++;
}

console.log(`\n${done} 门长征课件已处理`);
