#!/usr/bin/env node
/*
 * Give a course that has an adapter but no host the host it is missing.
 *
 * The chapter pages of a lesson wait for the page around them to answer
 * before they draw anything.  A lesson that was written out without
 * that answer waits for ever, and the screen stays on a turning circle.
 * This puts the answer into the entry page of such a lesson.
 *
 *   node tools/inject-course-host.mjs --root dist --course lq-1016
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
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const COURSES = arg('course', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const SHARED = '../../../shared/assets/_course_runtime/';
const TEMPLATE = fs.readFileSync(path.join(HERE, 'lq-reviewed-host.js'), 'utf8');

/*
 * The old entry page set the frame straight to the chapter.  That
 * leaves the chapter waiting for an answer that never comes, so the
 * whole of that block is taken out.
 */
const OLD = /<script>\s*const select=document\.getElementById\('chapter'\);[\s\S]*?<\/script>/;

let done = 0;
for (const id of COURSES) {
  const file = path.join(ROOT, 'courseware', id, 'index.html');
  if (!fs.existsSync(file)) {
    console.log(`  ${id}: 没有这个课件`);
    continue;
  }
  let html = fs.readFileSync(file, 'utf8');
  if (/registerFrame/.test(html)) {
    console.log(`  ${id}: 已经有主控脚本了`);
    continue;
  }
  const program = (html.match(/const PROGRAM = '([^']+)'/) || [, id.replace(/^lq-/, '')])[1];
  const script = TEMPLATE.split('%%PROGRAM%%').join(program).split('%%SHARED%%').join(SHARED);
  const without = html.replace(OLD, '');
  if (without !== html) html = without;
  const at = html.lastIndexOf('</body>');
  if (at < 0) {
    console.log(`  ${id}: 找不到 body 的收尾`);
    continue;
  }
  html =
    html.slice(0, at) +
    '<script type="module">\n' +
    script +
    '</script>\n' +
    html.slice(at);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`  ${id}: 主控脚本补好了`);
  done += 1;
}

console.log(`\n补好 ${done} 门。`);
