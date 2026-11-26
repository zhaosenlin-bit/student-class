#!/usr/bin/env node
/*
 * Walks through the shell of the site the way a reader does.
 *
 * The lessons themselves are checked by tools/check-static-site.mjs,
 * which opens all of them.  This one looks at the part around them:
 * the catalogue, the filters, the search box, the page of a lesson and
 * the routes that are not part of this site.
 *
 *   node tools/check-shell-ui.mjs --base http://127.0.0.1:4180 --cdp 9333
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg('base', 'http://127.0.0.1:4180').replace(/\/+$/, '');
const CDP = Number(arg('cdp', 9333));
const OUT = arg('out', 'receipts/shell-ui.json');

const problems = [];
const steps = [];
const note = (name, ok, detail) => {
  steps.push({ name, ok, detail });
  if (!ok) problems.push(`${name}: ${detail}`);
  console.log(`${ok ? '好' : '不通'}  ${name}${detail ? ' · ' + detail : ''}`);
};

const browser = await connect(CDP);
const errors = [];
browser.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description || 'exception');
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push((m.params.args || []).map((a) => a.value ?? a.description).join(' '));
  }
});

const evalIn = async (expr) => browser.evaluate(expr);
const waitFor = async (expr, tries = 40) => {
  for (let i = 0; i < tries; i++) {
    try {
      if (await evalIn(expr)) return true;
    } catch {
      /* the page may still be swapping documents */
    }
    await sleep(250);
  }
  return false;
};

await browser.goto(`${BASE}/#catalog`);
await waitFor("document.querySelectorAll('.product-card,.chapter-course').length>0");

const cards = await evalIn("document.querySelectorAll('.product-card,.chapter-course').length");
note('目录出卡片', cards > 10, `${cards} 张`);

const title = await evalIn("document.title");
note('页面标题', /乐启享/.test(title || ''), title);

/* The list of chapters on the left narrows the grid down. */
const beforeChapter = await evalIn("document.querySelectorAll('.product-card').length");
await evalIn("document.querySelectorAll('[data-action=\"chapter\"]')[2]?.click(),1");
await sleep(1200);
const afterChapter = await evalIn(
  "({count:document.querySelectorAll('.product-card').length,text:(document.querySelector('#result-count')||{}).textContent||''})"
);
note(
  '章节筛选',
  afterChapter.count > 0,
  `${beforeChapter} 张 -> ${afterChapter.count} 张 · ${afterChapter.text.trim().slice(0, 40)}`
);
await evalIn("document.querySelector('[data-action=\"clear-chapter\"]')?.click(),1");
await sleep(800);

/* The search box has to find a lesson. */
await evalIn(
  "location.hash='#catalog';(async()=>{await new Promise(r=>setTimeout(r,800));const s=document.querySelector('#search');s.value='力学';s.dispatchEvent(new Event('input',{bubbles:true}));})(),1"
);
await sleep(1200);
const searched = await evalIn("document.querySelectorAll('.product-card,.chapter-course').length");
note('关键词搜索', searched > 0 && searched < cards, `命中 ${searched} 张`);

await evalIn(
  "location.hash='#catalog';(async()=>{await new Promise(r=>setTimeout(r,800));const s=document.querySelector('#search');s.value='';s.dispatchEvent(new Event('input',{bubbles:true}));})(),1"
);
await sleep(800);

/* The page of a lesson. */
await evalIn("document.querySelector('.product-card a.cover')?.click(),1");
await sleep(1500);
const intro = await evalIn(
  "({hash:location.hash,heading:(document.querySelector('.course-intro h1,.course-intro h2,#main h1,#main h2')||{}).textContent||'',use:document.querySelectorAll('[data-action=\"open-course\"]').length})"
);
note('课件详情页', /#course\//.test(intro.hash) && intro.heading.length > 0, `hash=${intro.hash} 标题=${intro.heading}`);

/* Opening the lesson itself from the grid. */
await evalIn("location.hash='#catalog'", 1);
await sleep(1200);
await evalIn("document.querySelector('[data-lq-preview-start]')?.click(),1");
const opened = await waitFor(
  "(()=>{const f=document.querySelector('[data-lq-preview-host] iframe');return !!(f&&f.src);})()",
  60
);
const frame = await evalIn(
  "(()=>{const f=document.querySelector('[data-lq-preview-host] iframe');return f?f.src:'';})()"
);
note('打开课件', opened && /courseware\//.test(frame), frame);
await evalIn("document.querySelector('[data-lq-preview-close]')?.click(),1");
await sleep(600);

/* Routes that are not part of this site have to lead back to the list. */
for (const hash of ['#purchase', '#admin', '#owner-login', '#refunds', '#membership']) {
  await evalIn(`location.hash='${hash}'`, 1);
  await sleep(700);
  const now = await evalIn('location.hash');
  note(`挡掉 ${hash}`, now === '#catalog' || now.startsWith('#course'), now);
}

note('没有脚本报错', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

const report = {
  checkedAt: new Date().toISOString(),
  base: BASE,
  steps,
  problems,
};
fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(report, null, 2));
console.log(`\n${problems.length ? '不通 ' + problems.length + ' 处' : '全部通过'} · 报告写入 ${OUT}`);
process.exit(problems.length ? 1 : 0);
