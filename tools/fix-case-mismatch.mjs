#!/usr/bin/env node
/*
 * 把对不上的名字改成真的那一个。
 *
 * 在 Windows 上，Audio 和 audio 是同一个地方；在对象存储上不是。
 * 本地试的时候好好的，传上去就少东西——原因常常在这里。
 *
 * 往上面退了几层，是不能改的：退的层数不对，名字就指到别的地方去
 * 了。所以这里按浏览器真正的基准重算——页面写了 <base> 的就按 <base>
 * 算，脚本按带它的页面算，改的是名字本身和层数。
 *
   node tools/fix-case-mismatch.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, collectRefs, courseBases, looksLocal, pageBase, posix, resolveRef } from './lq-refs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');

const index = buildIndex(ROOT);
const lessons = path.join(ROOT, 'courseware');
const ids = fs.existsSync(lessons)
  ? fs.readdirSync(lessons, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

let patched = 0;
let unfixable = 0;
const touched = [];

for (const id of ids) {
  const courseDir = path.join(lessons, id);
  const pages = courseBases(courseDir, id);
  const pageBases = [...new Set(pages.map((p) => p.base))];

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
      const ext = path.extname(it.name).toLowerCase();
      if (!['.html', '.htm', '.css', '.js', '.mjs'].includes(ext)) continue;
      const kind = ext === '.css' ? 'css' : ext === '.js' || ext === '.mjs' ? 'js' : 'html';

      let text;
      try {
        text = fs.readFileSync(p, 'utf8');
      } catch {
        continue;
      }

      const ownDir = posix.join('courseware/' + id, posix.dirname(r));
      let bases;
      if (kind === 'html') {
        bases = [pageBase(ownDir, text)];
      } else if (kind === 'css') {
        bases = [ownDir];
      } else {
        bases = [...new Set([ownDir, ...pageBases])];
      }

      /* 同一处名字只算一次，改的时候一次改掉。 */
      const jobs = new Map();
      for (const ref of collectRefs(text)) {
        if (!looksLocal(ref.value)) continue;
        const bare = ref.value.split('#')[0].split('?')[0];
        if (!bare || jobs.has(bare)) continue;
        const hit = resolveRef(ref.value, bases, index);
        if (hit.kind === 'ok') continue;
        /*
         * 脚本里的地址，基准不好说：运行起来写的地址按打开它的页面算，
         * import 进来的按脚本自己所在的地方算。层数不敢乱动，只改大小写——
         * 改大小写不会动层数，怎么算都还指得到地方。
         */
        if (kind === 'js' && hit.kind !== 'case') continue;
        if (!hit.rel) {
          unfixable++;
          continue;
        }
        const tail = (ref.value.match(/[?#].*$/) || [''])[0];
        const to = hit.rel + tail;
        if (to === ref.value) continue;
        jobs.set(ref.value, to);
      }
      if (!jobs.size) continue;

      let next = text;
      for (const [from, to] of jobs) next = next.split(from).join(to);
      if (!DRY) fs.writeFileSync(p, next);
      patched += jobs.size;
      touched.push(`${id}/${r}`);
    }
  }
}

console.log(DRY ? `会改 ${patched} 处，涉及 ${touched.length} 个文件` : `改了 ${patched} 处，涉及 ${touched.length} 个文件`);
if (unfixable) console.log(`有 ${unfixable} 处找不到对应的文件，改不了。`);
for (const t of touched.slice(0, 20)) console.log('  ' + t);
if (touched.length > 20) console.log(`  ……还有 ${touched.length - 20} 个文件`);
