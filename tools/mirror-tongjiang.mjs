#!/usr/bin/env node
/*
 * Mirrors the 铜匠实验室 lessons.
 *
 * Upstream ships every lesson as one self-contained HTML file that bundles
 * its own three.js build, plus a cover image and a catalogue that maps the
 * lesson to the textbook chapter it belongs to.  Nothing here reaches for
 * the network, so the copy is taken as it is: the point of the mirror is to
 * put the lessons on disk next to the other courseware and to record where
 * they came from.
 *
 *   node tools/mirror-tongjiang.mjs [--src recon/vendor/tongjiang]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SRC = path.resolve(ROOT, arg('src', path.join('recon', 'vendor', 'tongjiang')));
const OUT = path.join(ROOT, 'mirror', 'tongjiang');
const CW = path.join(OUT, 'courseware');
const BRAND = path.join(OUT, 'brand');

if (!fs.existsSync(path.join(SRC, 'catalog.json'))) {
  console.error(`no catalogue under ${SRC}`);
  process.exit(1);
}

const upstream = JSON.parse(fs.readFileSync(path.join(SRC, 'catalog.json'), 'utf8'));

/* The subject code upstream uses, in the words the rest of the library uses. */
const SUBJECT = { chem: '化学', geo: '地理', phys: '物理', bio: '生物' };

/*
 * The catalogue points at the textbook chapter of every lesson; those
 * strings name the grade as well, and the grade is what the library
 * filters on.
 */
const stageOf = (textbook) => {
  const all = [].concat(textbook || []).join(' ');
  if (/必修|选择性必修/.test(all)) return '高中';
  if (/初中/.test(all)) return '初中';
  if (/小学/.test(all)) return '小学';
  return '通用';
};

fs.mkdirSync(CW, { recursive: true });
fs.mkdirSync(BRAND, { recursive: true });

const catalog = [];
let copied = 0;
const missing = [];

for (const lesson of upstream) {
  const file = path.join(SRC, lesson.file);
  if (!fs.existsSync(file)) {
    missing.push(lesson.slug);
    continue;
  }
  const slug = lesson.slug;
  fs.copyFileSync(file, path.join(CW, `${slug}.html`));

  let cover = '';
  const coverSrc = path.join(SRC, lesson.cover);
  if (fs.existsSync(coverSrc)) {
    const ext = path.extname(lesson.cover) || '.webp';
    fs.copyFileSync(coverSrc, path.join(BRAND, `${slug}${ext}`));
    cover = `/brand/tongjiang/${slug}${ext}`;
  }

  const subject = SUBJECT[lesson.subject] || '科学';
  const stage = stageOf(lesson.textbook);

  catalog.push({
    slug,
    title: lesson.title,
    subject,
    stage,
    stages: [stage],
    type: lesson.type,
    question: lesson.question || '',
    textbook: [].concat(lesson.textbook || []),
    steps: lesson.steps || [],
    cover,
    license: 'CC BY-NC 4.0',
    sourceUrl: lesson.online || `https://lab.tongjiang.app/c/${slug}/`,
    author: '铜匠实验室',
  });
  copied++;
}

fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 1));

/* Attribution matters here: the lessons are CC BY-NC, so say where they are from. */
fs.writeFileSync(
  path.join(OUT, 'NOTICE.md'),
  [
    '# 铜匠实验室（tongjiang-lab）',
    '',
    '这批课件来自 [sdvch/tongjiang-lab](https://github.com/sdvch/tongjiang-lab)，',
    '作者「铜匠十点睡觉」，原站 <https://lab.tongjiang.app>。',
    '',
    '许可：Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)。',
    '课件文件内嵌 three.js（MIT，版权归 three.js 作者）。',
    '',
    '## 乐启享的改编与再创作',
    '',
    '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
    '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
    '脚本与样式表与字体与模型与贴图的本地化改写、离线打包与本地服务，',
    '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
    '课件本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
    '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
    '',
    '每门课件是一个自包含的 HTML 文件，复制到本地后可以离线打开；',
    '本目录未改动课件内容，只做了归档与品牌化接入。',
    '',
    `共收录 ${copied} 门。`,
    '',
  ].join('\n')
);

console.log(`tongjiang: ${copied} lessons mirrored, ${missing.length} missing`);
if (missing.length) console.log('missing:', missing.join(' '));
