#!/usr/bin/env node
/*
 * 一个分类一个分类地走一遍。
 *
 * 目录里点了分类之后，课件卡片是画出来的，卡片上的封面也是那时候才
 * 去要的。所以"图片是裂的"这件事只有真的点一遍分类才看得见 ——
 * 静态看目录是看不出来的。
 *
 * 这一页走完：每个版本、每个学科、每一页课件都点过，坏的封面记下名字；
 * 顺带把每一门课件的预览打开一次，看里面有没有裂的图。
 *
 *   node tools/check-lq-categories.mjs
 *   node tools/check-lq-categories.mjs --preview 12
 */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const PREVIEW = Number(argOf('--preview', '0'));

const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);

/* 把浏览器真正失败的请求记下来。 */
let failures = [];
let watching = false;
const watch = (e) => {
  if (!watching) return;
  if (e.method === 'Network.responseReceived') {
    const r = e.params.response || {};
    if (r.status >= 400) failures.push({ url: r.url, status: r.status });
  }
  if (e.method === 'Network.loadingFailed' && !e.params.canceled) {
    failures.push({ url: '(failed)', status: e.params.errorText, type: e.params.type });
  }
};
setInterval(() => {
  for (const e of browser.events.splice(0)) watch(e);
}, 120).unref();
await browser.raw('Network.enable', {}, browser.pageSession);

await browser.goto(`http://localhost:${PORT}/#catalog`);
await sleep(3000);

const groups = await browser.evaluate(`(() => {
  const out = [];
  document.querySelectorAll('[data-action=download-edition]').forEach(b =>
    out.push({ action: 'download-edition', kind: '版本', value: b.dataset.value, text: b.textContent.trim() }));
  document.querySelectorAll('[data-action=filter]').forEach(b =>
    out.push({ action: 'filter', kind: '学科', value: b.dataset.value, text: b.textContent.trim() }));
  document.querySelectorAll('[data-action=stage]').forEach(b =>
    out.push({ action: 'stage', kind: '学段', value: b.dataset.value, text: b.textContent.trim() }));
  return out;
})()`);

console.log(`分类共 ${groups.length} 个，开始一个一个走。`);

const brokenCovers = [];
const seenCards = new Set();
const emptyGroups = [];

/*
 * 每一组都要单独看。
 *
 * 上一版是挨个点过去的，学段一点就清掉学科，版本又一直挂着，所以后面
 * 那几十个学科看着一个门课都没有 —— 那是筛选叠在一起的结果，不是真的
 * 空。这里每组之前先把筛选全部放回"全部"，再点这一组。
 */
async function resetFilters() {
  const steps = [
    '[data-action=filter][data-value="全部"]',
    '[data-action=stage][data-value="全部"]',
    '[data-action=download-edition][data-value="all"]'
  ];
  for (const sel of steps) {
    const changed = await browser.evaluate(`(() => {
      const b = document.querySelector(${JSON.stringify(sel)});
      if (!b) return false;
      if (b.getAttribute('aria-pressed') === 'true' || b.classList.contains('active')) return false;
      b.click();
      return true;
    })()`);
    if (changed) await sleep(700);
  }
  await sleep(600);
}

for (const g of groups) {
  failures = [];
  watching = true;
  await resetFilters();
  const picked = await browser.evaluate(`(() => {
    const btn = [...document.querySelectorAll('[data-action="${g.action}"]')]
      .find(b => b.dataset.value === ${JSON.stringify(g.value)});
    if (!btn) return null;
    btn.click();
    return btn.textContent.trim();
  })()`);
  if (!picked) {
    watching = false;
    console.log(`  ? ${g.kind} ${g.value} —— 按钮不在了`);
    continue;
  }
  await sleep(1400);

  /* 一页一页地往下点，直到所有课件都画出来。 */
 let rounds = 0;
  for (;;) {
    const more = await browser.evaluate(`(() => {
      const b = document.querySelector('[data-action=catalog-more]');
      if (!b) return null;
      b.click();
      return b.textContent.trim();
    })()`);
    if (!more) break;
    await sleep(900);
    if (++rounds > 60) break;
  }

  const state = await browser.evaluate(`(() => {
    /* 封面是懒加载的：没滚到的不算"加载过"，也看不出它是裂的。
       这里让它们都去要一次，再看结果。 */
    document.querySelectorAll('#grid img[loading]').forEach(i => { i.loading = 'eager'; });
    const imgs = [...document.querySelectorAll('#grid img')];
    const cards = [...document.querySelectorAll('#grid .product-card')];
    const broken = imgs
      .filter(i => i.complete && i.naturalWidth === 0)
      .map(i => {
        const card = i.closest('[data-product-id], article');
        return { src: i.currentSrc || i.src, id: card ? card.dataset.productId : '' };
      });
    return {
      cards: cards.length,
      imgs: imgs.length,
      broken,
      ids: cards.map(c => c.querySelector('[data-lq-preview-start]')?.dataset.lqPreviewStart || ''),
      title: document.querySelector('.download-gallery-heading h1')?.textContent.trim() || '',
      count: document.querySelector('#result-count')?.textContent.trim() || '',
    };
  })()`);

  /* 让懒加载的封面都去要一次，等它们回来再数。 */
  await browser.evaluate(`(() => {
    document.querySelectorAll('#grid img[loading]').forEach(i => { i.loading = 'eager'; });
  })()`);
  await sleep(2500);
  const coverState = await browser.evaluate(`(() => {
    const imgs = [...document.querySelectorAll('#grid img')];
    return {
      imgs: imgs.length,
      broken: imgs
        .filter(i => i.complete && i.naturalWidth === 0)
        .map(i => ({
          src: i.currentSrc || i.src,
          id: i.closest('article')?.querySelector('[data-lq-preview-start]')?.dataset.lqPreviewStart || '',
        })),
    };
  })()`);

  watching = false;
  const netFail = failures.filter((f) => !/favicon/.test(f.url));
  for (const b of coverState.broken) brokenCovers.push({ group: `${g.kind}:${g.value}`, ...b });
  for (const id of state.ids) if (id) seenCards.add(id);
  if (!state.cards) emptyGroups.push(`${g.kind} ${g.value}`);

  console.log(
    `  ${g.kind} ${g.value}（${picked}） 卡片 ${state.cards} 图 ${coverState.imgs} 裂 ${coverState.broken.length} 请求失败 ${netFail.length}`
  );
  for (const b of coverState.broken.slice(0, 5)) console.log(`      ! 封面裂了 ${b.id} ${b.src.slice(-90)}`);
  for (const f of netFail.slice(0, 5)) console.log(`      ! 请求失败 ${f.status} ${String(f.url).slice(-90)}`);
}

console.log('');
console.log(`走过的课件卡片 ${seenCards.size} 张，封面裂了 ${brokenCovers.length} 张。`);
if (emptyGroups.length) {
  console.log(`一个课件都没有的分类 ${emptyGroups.length} 个：`);
  for (const g of emptyGroups) console.log(`    ${g}`);
}

if (PREVIEW) {
  console.log('');
  console.log(`抽查 ${PREVIEW} 门课件的预览，看里面有没有裂的图。`);
  const ids = [...seenCards].slice(0, PREVIEW);
  for (const id of ids) {
    failures = [];
    watching = true;
    await browser.goto(`http://localhost:${PORT}/courseware/${encodeURIComponent(id)}?local=1`);
    await sleep(4500);
    const out = await browser.evaluate(`(() => {
      const imgs = [...document.querySelectorAll('img')];
      return {
        total: imgs.length,
        broken: imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src'))
          .map(i => (i.currentSrc || i.src)),
        text: document.body.innerText.slice(0, 120),
      };
    })()`);
    watching = false;
    const netFail = failures.filter((f) => !/favicon|t\.gif/.test(String(f.url)));
    const ok = out.broken.length === 0 && netFail.length === 0;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${id}  图 ${out.total} 裂 ${out.broken.length} 请求失败 ${netFail.length}`);
    for (const b of out.broken.slice(0, 4)) console.log(`       ! ${b.slice(-100)}`);
    for (const f of netFail.slice(0, 4)) console.log(`       ! ${f.status} ${String(f.url).slice(-100)}`);
  }
}

if (process.env.LQ_REPORT) {
  fs.writeFileSync(process.env.LQ_REPORT, JSON.stringify({ brokenCovers, seen: [...seenCards] }, null, 1));
  console.log(`\n报告写入 ${process.env.LQ_REPORT}`);
}

await browser.close();
