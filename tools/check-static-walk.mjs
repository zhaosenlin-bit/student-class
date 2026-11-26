#!/usr/bin/env node
/*
 * A short walk through the written-out site, the way a reader walks
 * through it: the front page, a search, a lesson, and a download.
 *
 * Every request that fails or comes back with an error is written
 * down, so that a page which looks fine but asks for something that
 * is not there does not pass unnoticed.
 *
 *   node tools/check-static-walk.mjs --base http://127.0.0.1:4180/leqixiang
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
const BASE = arg('base', 'http://127.0.0.1:4180/leqixiang').replace(/\/+$/, '');
const CDP = Number(arg('cdp', 9333));

const browser = await connect(CDP, null, { quiet: false });
const bad = [];
browser.on((m) => {
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.status >= 400) bad.push(`${r.status} ${r.url}`);
  }
  if (m.method === 'Network.loadingFailed') {
    bad.push(`失败 ${m.params.errorText} ${m.params.type}`);
  }
});

await browser.goto(`${BASE}/`);
await sleep(2500);

const home = await browser.evaluate(`(() => {
  const cards = document.querySelectorAll('.catalog-products [data-product-id], .course-card, .product-card');
  return {
    title: document.title,
    cards: cards.length,
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 160),
  };
})()`);
console.log('首页：', JSON.stringify(home));

const searched = await browser.evaluate(`(async () => {
  const box = document.querySelector('input[type=search], #course-search, [data-search]');
  if (!box) return { why: '没有搜索框' };
  box.value = '光';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 900));
  const cards = document.querySelectorAll('.catalog-products [data-product-id], .course-card, .product-card');
  return { cards: cards.length };
})()`);
console.log('搜索“光”：', JSON.stringify(searched));

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'dist', 'catalog.json'), 'utf8')
);
const pick = catalog.products.find((p) => p.localInstalled) || catalog.products[0];

await browser.goto(`${BASE}/#course/${pick.id}`);
await sleep(2000);
const detail = await browser.evaluate(`(() => {
  const img = [...document.querySelectorAll('img')].find(i => (i.currentSrc || i.src || '').includes('prod/uploads'))
    || [...document.querySelectorAll('img')][0];
  return {
    id: ${JSON.stringify(pick.id)},
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 90),
    cover: img ? (img.currentSrc || img.src) : null,
    coverOk: img ? img.complete && img.naturalWidth > 0 : false,
  };
})()`);
console.log('课件详情页：', JSON.stringify(detail));

await browser.goto(`${BASE}/#play/${pick.id}`);
await sleep(6000);
const lesson = await browser.evaluate(`(() => {
  const frames = [...document.querySelectorAll('iframe')];
  let inner = null;
  for (const f of frames) {
    try {
      const d = f.contentDocument;
      if (!d) continue;
      const canvas = [...d.querySelectorAll('canvas')].filter(c => c.width > 0 && c.height > 0).length;
      inner = {
        url: (f.getAttribute('src') || '').slice(0, 60),
        canvas,
        text: (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim().length,
      };
      break;
    } catch (e) {}
  }
  return { frames: frames.length, inner, top: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 80) };
})()`);
console.log('课件正文：', JSON.stringify(lesson));

const listed = await browser.evaluate(`(async () => {
  const res = await fetch('./catalog.json');
  const data = await res.json();
  return { ok: res.ok, products: (data.products || []).length };
})()`);
console.log('目录数据：', JSON.stringify(listed));

await sleep(500);
console.log(`失败或出错的请求：${bad.length}`);
const unique = [...new Set(bad)];
for (const b of unique.slice(0, 20)) console.log('   ! ' + b);

await browser.close();
process.exit(bad.length ? 1 : 0);
