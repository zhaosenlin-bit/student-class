#!/usr/bin/env node
/*
 * 找出课件里坏掉的图。
 *
 * 打开一页课件，等它加载完，然后把每张 <img> 的地址和它到底有没有画
 * 出来对一遍。坏图常常是作者留在正文里的外链地址，或者一处放错的
 * 相对路径。
 *
 *   node tools\lq-broken-images.mjs mirror lens lq-831
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const browser = await connect(CDP);

for (const id of targets) {
  await browser.goto(`http://localhost:${PORT}/courseware/${encodeURIComponent(id)}`);
  await sleep(6000);
  const out = await browser.evaluate(`(() => {
    const imgs = [...document.querySelectorAll('img')];
    return {
      total: imgs.length,
      broken: imgs
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => ({
          src: i.currentSrc || i.src,
          cls: i.className,
          /* 没有 src 的 <img> 是导出画面的暂存位，不是坏图。 */
          placeholder: !i.getAttribute('src'),
        })),
    };
  })()`);
  const real = out.broken.filter((b) => !b.placeholder);
  const ph = out.broken.length - real.length;
  console.log(`\n${id}: 图 ${out.total} 张，坏 ${real.length}${ph ? `（另有 ${ph} 张是导出画面的暂存位，不算）` : ''}`);
  for (const b of real) console.log(`   ! ${b.src.slice(0, 160)}  (${b.cls || '无 class'})`);
}

await browser.close();
