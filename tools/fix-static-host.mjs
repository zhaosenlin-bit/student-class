#!/usr/bin/env node
/*
 * Put the host side of the chapter runtime back into the entry pages of
 * the chapter courses.
 *
 * A chapter course boots inside a frame and waits for the page around
 * it to answer.  The answer names the chapter by its place in the
 * folder of the lesson, while the copy that is written out for a
 * website names it by a path next to the page.  The page has to
 * understand both, or the course waits for ever on a black screen.
 *
 * This rewrites the host script of every course that has one, and says
 * which courses have an adapter but no host at all.
 *
 *   node tools/fix-static-host.mjs --root dist
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
const DRY = args.includes('--dry');
const SHARED = '../../../shared/assets/_course_runtime/';

const TEMPLATE = fs.readFileSync(path.join(HERE, 'lq-reviewed-host.js'), 'utf8');

const COURSEWARE = path.join(ROOT, 'courseware');
const dirs = fs
  .readdirSync(COURSEWARE, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let patched = 0;
let missing = [];

for (const id of dirs) {
  const file = path.join(COURSEWARE, id, 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const adapter = path.join(COURSEWARE, id, 'assets', '_course_runtime', 'adapter.json');
  const hasAdapter = fs.existsSync(adapter);

  if (!/registerFrame/.test(html)) {
    if (hasAdapter) missing.push(id);
    continue;
  }

  /* The number of the course is the one the page already carries. */
  const program = (html.match(/const PROGRAM = '([^']+)'/) || [, id.replace(/^lq-/, '')])[1];
  const script = TEMPLATE.split('%%PROGRAM%%').join(program).split('%%SHARED%%').join(SHARED);

  /*
   * The host lives in the one module script of the page that speaks of
   * the frame bridge.
   */
  const start = html.indexOf('<script type="module">');
  let done = false;
  if (start >= 0) {
    const end = html.indexOf('</script>', start);
    const block = html.slice(start, end);
    if (/registerFrame/.test(block)) {
      const next = html.slice(0, start) + '<script type="module">\n' + script + '</script>' + html.slice(end + '</script>'.length);
      if (next !== html) {
        if (!DRY) fs.writeFileSync(file, next, 'utf8');
        patched++;
        done = true;
      }
    }
  }
  if (!done) {
    console.log(`  ${id}: 找不到那段主控脚本，没有改`);
  }
}

console.log(`主控脚本改好了 ${patched} 门。`);
if (missing.length) {
  console.log(`有适配器却没有主控脚本的课程 ${missing.length} 门：${missing.join(', ')}`);
}
