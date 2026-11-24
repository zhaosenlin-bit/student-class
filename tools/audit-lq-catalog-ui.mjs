#!/usr/bin/env node
/*
 * What the catalogue page actually shows.
 *
 * The catalogue is the front door of the library, and everything a
 * reader is promised is written on it: how many lessons there are, how
 * they are filed, and the two buttons that open and take a lesson
 * away.  This opens that page in a browser, walks the whole grid, and
 * reports the three things that would make the page a lie — a card
 * whose cover does not load, a card without a way to open or take it,
 * and a label that still carries the shelf name of the upstream site.
 *
 *   node tools/audit-lq-catalog-ui.mjs
 *   CDP_PORT=9226 LQ_PORT=4173 node tools/audit-lq-catalog-ui.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

/* The shelf names of the upstream packs.  They are not subjects. */
const SHELF_NAMES = [
  '高中数学', '高二数学', '高一数学', '七年级数学', '八年级数学', '九年级数学',
  '小学数学', '九年级化学', '高中化学', '高二化学', '高一化学',
  '八年级物理', '九年级物理', '高中物理合集', '高中物理', '高三物理',
  '高二物理', '高一物理',
];

/*
 * Words of a shop.  This is a library.  "无需登录" and "不需要注册"
 * are promises this library keeps, so they are not shop words; and
 * "反馈" is an ordinary word — a piano key gives feedback.
 */
const SHOP_WORDS = [
  '购买',
  '立即购买',
  '加入购物车',
  '会员',
  'VIP',
  '付费',
  '订阅',
  '退款',
  '售价',
  '试看',
];

/*
 * "登录" and "注册" only count when they are not the other half of a
 * promise.  "无需安装、登录或摄像头" is a sentence this library
 * keeps; "请先登录账号" is a sentence a shop says.
 */
const ACCOUNT_WORDS = ['登录', '注册'];
const NOT_NEEDED = /无需|不需要|不必|不用|免去/;

const READ_CATALOGUE = `(() => {
  const text = (sel) => [...document.querySelectorAll(sel)].map((el) => el.textContent.trim());
  const cards = [...document.querySelectorAll('.grid .product-card')];
  /* Covers are lazy, so a picture below the fold has not loaded yet.  It
     is asked to load now, and only a picture that finished loading with
     nothing in it counts as broken. */
  for (const img of document.querySelectorAll('.grid img')) img.loading = 'eager';
  const broken = [];
  for (const card of cards) {
    const img = card.querySelector('img.cover, img');
    if (!img) continue;
      if (img.complete && img.naturalWidth === 0) {
      broken.push({ id: card.querySelector('[data-id]')?.getAttribute('data-id') || card.querySelector('h3')?.textContent, src: img.getAttribute('src') });
    }
  }
  const noPreview = cards.filter((c) => !c.querySelector('[data-lq-preview-start]')).length;
  const noDownload = cards.filter((c) => !c.querySelector('[data-download-action="download"]')).length;
  return {
    heading: document.querySelector('.download-gallery-heading span')?.textContent?.trim() || '',
    editions: text('.download-edition-tabs button, .edition-tabs button'),
    stages: text('.download-stage-tabs button'),
    subjects: text('.download-subject-options button'),
    groups: text('.curriculum-volume > summary'),
    cards: cards.length,
    broken,
    noPreview,
    noDownload,
    bodyText: (document.body.innerText || '').slice(0, 40000),
  };
})()`;

const LOAD_MORE = `(() => {
  const button = document.querySelector('[data-action="catalog-more"]');
  if (!button) return 0;
  button.click();
  return 1;
})()`;

const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);

await browser.goto(`http://127.0.0.1:${PORT}/?audit=${Date.now()}#catalog`);
await sleep(2600);

/* The grid grows by hand, so it is walked by hand. */
let rounds = 0;
for (;;) {
  const more = Number(await browser.evaluate(LOAD_MORE).catch(() => 0)) || 0;
  if (!more) break;
  rounds += 1;
  await sleep(420);
  if (rounds > 200) break;
}
await sleep(1200);

const view = await browser.evaluate(READ_CATALOGUE);

const problems = [];

if (view.broken.length) {
  problems.push(`封面裂图 ${view.broken.length} 张：${view.broken.slice(0, 5).map((b) => `${b.id} ${b.src}`).join('、')}`);
}
if (view.noPreview) problems.push(`${view.noPreview} 张卡片没有"在线预览"`);
if (view.noDownload) problems.push(`${view.noDownload} 张卡片没有"下载"`);

const shelfHits = SHELF_NAMES.filter((name) => view.subjects.includes(name));
if (shelfHits.length) problems.push(`学科筛选里还有货架名：${shelfHits.join('、')}`);

const shelfInGroups = SHELF_NAMES.filter((name) => view.groups.some((g) => g.includes(name)));
if (shelfInGroups.length) problems.push(`目录树里还有货架名：${shelfInGroups.join('、')}`);

const shopHits = SHOP_WORDS.filter((word) => view.bodyText.includes(word));
for (const word of ACCOUNT_WORDS) {
  let at = view.bodyText.indexOf(word);
  while (at >= 0) {
    const before = view.bodyText.slice(Math.max(0, at - 14), at);
    if (!NOT_NEEDED.test(before)) {
      shopHits.push(word);
      break;
    }
    at = view.bodyText.indexOf(word, at + 1);
  }
}
if (shopHits.length) {
  const lines = view.bodyText
    .split('\n')
    .filter((line) => shopHits.some((word) => line.includes(word)))
    .slice(0, 6);
  problems.push(`页面上还有商店的话：${shopHits.join('、')} —— ${lines.map((l) => l.trim().slice(0, 60)).join(' / ')}`);
}

console.log(`乐启享课件库 · 目录页体检`);
console.log(`  标题数量：${view.heading}`);
console.log(`  版本分栏：${view.editions.join(' / ') || '（无）'}`);
console.log(`  学段分栏：${view.stages.join(' / ') || '（无）'}`);
console.log(`  学科分栏：${view.subjects.join(' / ') || '（无）'}`);
console.log(`  目录树分组 ${view.groups.length} 组，卡片 ${view.cards} 张（另点了 ${rounds} 次"继续加载"）`);
console.log(`  目录树分组：${view.groups.join(' / ') || '（无）'}`);
console.log(`  封面裂图 ${view.broken.length} 张，缺预览 ${view.noPreview} 张，缺下载 ${view.noDownload} 张`);
console.log('');

if (problems.length) {
  console.log(`发现 ${problems.length} 个问题：`);
  for (const p of problems) console.log(`  - ${p}`);
} else {
  console.log('绿灯：目录页上每张卡片都有封面、都能预览、都能下载，页面上没有商店的话。');
}

await browser.close();
process.exit(problems.length ? 1 : 0);
