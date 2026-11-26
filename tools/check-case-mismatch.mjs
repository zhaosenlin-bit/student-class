#!/usr/bin/env node
/*
 * 找出名字对不上的地方。
 *
 * 在 Windows 上，Audio 和 audio 是同一个地方；在对象存储上不是。
 * 本地试的时候好好的，传上去就少文件——原因常常在这里。
 *
 * 这个工具把课件里每一处指向自己文件的名字都拿出来，按浏览器真正的
 * 算法（页面的 <base>、脚本的来源页面、样式表自己的位置）算一遍落在
 * 哪儿。找得到就是好的；找得到但大小写不一样，或者退的层数不对，
 * 那就是上线以后会走不通。
 *
   node tools/check-case-mismatch.mjs --root dist
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
const OUT = arg('out', '');

const index = buildIndex(ROOT);
const lessons = path.join(ROOT, 'courseware');
const ids = fs.existsSync(lessons)
  ? fs.readdirSync(lessons, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

const problems = [];
let checked = 0;

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
      /*
       * 名字是按哪个目录去找的？
       * 页面：按它自己的基准（有 <base> 就用 <base>）。
       * 样式表：按样式表自己所在的地方。
       * 脚本：按带它的那个页面的基准——这一门课件里每个页面的基准都算上。
       */
      let bases;
      if (kind === 'html') {
        bases = [pageBase(ownDir, text)];
      } else if (kind === 'css') {
        bases = [ownDir];
      } else {
        bases = [...new Set([ownDir, ...pageBases])];
      }

      const seen = new Set();
      for (const ref of collectRefs(text)) {
        if (!looksLocal(ref.value)) continue;
        const bare = ref.value.split('#')[0].split('?')[0];
        if (!bare) continue;
        if (seen.has(bare)) continue;
        seen.add(bare);
        checked++;

        const hit = resolveRef(ref.value, bases, index);
        if (hit.kind === 'ok') continue;
        problems.push({
          id,
          file: r,
          ref: ref.value,
          kind: hit.kind,
          base: hit.base || bases[0],
          real: hit.real || null,
          fix: hit.rel ? hit.rel + (ref.value.match(/[?#].*$/) || [''])[0] : null,
        });
      }
    }
  }
}

const byKind = (k) => problems.filter((m) => m.kind === k).length;
console.log(
  `看了 ${checked} 处名字，对不上的 ${problems.length} 处（大小写 ${byKind('case')}、层数 ${byKind('depth')}、找不到 ${byKind('missing')}），涉及 ${new Set(problems.map((m) => m.id)).size} 门课件。`
);
for (const m of problems.slice(0, 30)) {
  console.log(`  [${m.kind}] ${m.id}/${m.file}`);
  console.log(`     写的是 ${m.ref}`);
  if (m.real) console.log(`     实际在 ${m.real}`);
  if (m.fix) console.log(`     应写成 ${m.fix}`);
}

if (OUT) {
  /*
   * 报告只留真正对不上的那几处。"找不到"的多半是目录名、
   * 模块名一类的字面量，不是文件，记个数和样例就够了。
   */
  const real = problems.filter((m) => m.kind !== 'missing');
  const missing = problems.filter((m) => m.kind === 'missing');
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        checked: checked,
        mismatched: real.length,
        problems: real,
        notAFile: { count: missing.length, samples: missing.slice(0, 20).map((m) => m.ref) },
      },
      null,
      1
    )
  );
  console.log(`\n报告写入 ${OUT}`);
}
process.exit(problems.length ? 1 : 0);
