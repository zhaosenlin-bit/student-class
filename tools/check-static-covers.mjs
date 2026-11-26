#!/usr/bin/env node
/*
 * Do the pictures of the lessons really come back?
 *
 * A picture that is missing only shows up as an empty frame, so this
 * asks a real browser to fetch every picture the catalogue names and
 * to say whether it could be shown, and then opens a handful of
 * lesson pages to look at the picture that is really on the page.
 *
 *   node tools/check-static-covers.mjs --base http://127.0.0.1:4180/leqixiang
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
const PAGES = Number(arg('pages', 10));

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'catalog.json'), 'utf8'));
const products = catalog.products || [];

const browser = await connect(CDP);
await browser.goto(`${BASE}/`);
await sleep(1200);

/*
 * Every picture the catalogue names, fetched the way a page fetches
 * it: the browser decides whether it can be shown.
 */
const urls = [...new Set(products.map((p) => String(p.cover || '')).filter(Boolean))];
const probe = `(async () => {
  const urls = ${JSON.stringify(urls)};
  const bad = [];
  let ok = 0;
  const one = (u) => new Promise((done) => {
    const img = new Image();
    img.onload = () => done(img.naturalWidth > 0 ? null : 'empty');
    img.onerror = () => done('cannot load');
    img.src = u;
    setTimeout(() => done('timeout'), 25000);
  });
  for (const u of urls) {
    const why = await one(u);
    if (why) bad.push(u + ' — ' + why);
    else ok++;
  }
  return { ok, bad };
})()`;
const result = await browser.evaluate(probe);
console.log(`目录里的图片 ${urls.length} 张，能显示 ${result.ok} 张，有问题 ${result.bad.length} 张`);
for (const b of result.bad.slice(0, 20)) console.log('   ! ' + b);

/*
 * And a few lesson pages, opened for real, to see the picture that is
 * really in the page.
 */
const sample = products.filter((p) => String(p.cover || '').includes('prod/uploads')).slice(0, PAGES);
let pageOk = 0;
const pageBad = [];
for (const p of sample) {
  await browser.goto(`${BASE}/#course/${p.id}`);
  await sleep(1400);
  const shot = await browser.evaluate(`(() => {
    const imgs = [...document.querySelectorAll('img')];
    const main = imgs.find(i => (i.currentSrc || i.src || '').includes('prod/uploads')) || imgs[0];
    if (!main) return { why: 'no image on the page' };
    const src = main.currentSrc || main.src || '';
    return {
      src,
      ok: main.complete && main.naturalWidth > 0,
      w: main.naturalWidth,
      h: main.naturalHeight,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src),
    };
  })()`);
  if (shot.ok && !(shot.broken || []).length) pageOk += 1;
  else pageBad.push(`${p.id} — ${JSON.stringify(shot)}`);
}
console.log(`打开课件详情页 ${sample.length} 个，封面正常的 ${pageOk} 个`);
for (const b of pageBad.slice(0, 10)) console.log('   ! ' + b);

await browser.close();
process.exit(result.bad.length + pageBad.length ? 1 : 0);
