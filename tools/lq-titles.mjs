/*
 * Give every lesson the Chinese name that the catalogue already uses.
 *
 * The catalogue knows what each lesson is called in Chinese.  The page
 * itself still carries the old English heading and the old tab title.
 * This copies the Chinese name across, so the two agree.
 *
 *   node tools/lq-titles.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');

const catalog = JSON.parse(
  fs.readFileSync('mirror/leqixiang/catalog.json', 'utf8')
);
const title = new Map();
for (const p of catalog.products) {
  if (p.title) title.set(p.id, p.title);
}

/* Where each family keeps its pages, and how the name is built. */
const FAMILIES = [
  { dir: 'mirror/lab-course/courseware', prefix: 'lab-course-', strip: null },
  { dir: 'mirror/lab-virtual/courseware', prefix: 'lab-virtual-', strip: null },
  { dir: 'mirror/lab-reaction/courseware', prefix: 'lab-reaction-', strip: null },
  { dir: 'mirror/lab-explore/courseware', prefix: 'lab-explore-', strip: null },
  { dir: 'mirror/lab-physics/courseware', prefix: 'lab-physics-', strip: null },
];

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/*
 * Some lessons keep their name in a small table inside the page and
 * put it on the screen from there.  The table is given the same name
 * the catalogue uses.
 */
const setBundleTitle = (html, name) => {
  const m = /var\s+DATA\s*=\s*/.exec(html);
  if (!m) return html;
  const start = m.index + m[0].length;
  let depth = 0;
  let end = -1;
  let inStr = null;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") inStr = c;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return html;
  let data;
  try {
    data = JSON.parse(html.slice(start, end));
  } catch (e) {
    return html;
  }
  for (const langs of Object.values(data)) {
    if (langs && typeof langs === 'object' && langs.en) {
      langs.en.ProgramTitle = name;
    }
  }
  return html.slice(0, start) + JSON.stringify(data) + html.slice(end);
};

let changed = 0;
let missing = 0;

for (const fam of FAMILIES) {
  if (!fs.existsSync(fam.dir)) continue;
  for (const f of fs.readdirSync(fam.dir)) {
    if (!f.endsWith('.html')) continue;
    const slug = f.replace(/\.html$/, '');
    const id = fam.prefix + (fam.strip ? slug.replace(fam.strip, '') : slug);
    const zh = title.get(id);
    if (!zh) {
      missing++;
      continue;
    }
    const file = path.join(fam.dir, f);
    const before = fs.readFileSync(file, 'utf8');
    let after = before;

    /* The heading of the page. */
    after = after.replace(
      /(<h1[^>]*>)([\s\S]*?)(<\/h1>)/i,
      (m, open, body, close) => {
        /* A heading that already reads as Chinese is left alone. */
        if (/[\u3400-\u9fff]/.test(body) && !/[A-Za-z]{4,}/.test(body)) return m;
        return `${open}${escape(zh)}${close}`;
      }
    );

    /* The name on the tab of the browser. */
    after = after.replace(
      /<title>([\s\S]*?)<\/title>/i,
      `<title>${escape(zh)} · 乐启享互动课件</title>`
    );

    /* The name the lesson shows on its own page. */
    after = setBundleTitle(after, zh);
    after = after.replace(
      /(<div[^>]*id\s*=\s*["']?ProgramTitle["']?[^>]*>)([\s\S]*?)(<\/div>)/i,
      (m, open, body, close) => `${open}${escape(zh)}${close}`
    );

    if (after === before) continue;
    changed++;
    if (!DRY) fs.writeFileSync(file, after);
  }
}

console.log(
  `${DRY ? 'would change' : 'changed'} ${changed} pages, ${missing} without a Chinese name`
);
