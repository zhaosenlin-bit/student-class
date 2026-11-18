#!/usr/bin/env node
/*
 * 把课件里那些从网上现取的头像图存到本机。
 *
 * 有一门课给"历史人物"配头像，地址是在页面脚本里一段一段拼出来的，
 * 拼好之前谁也看不出它要从哪儿取。页面跑起来以后才能看见那些地址，
 * 所以这里先在浏览器里把课打开一次，把真正用到的头像地址收齐，再
 * 一趟取回本机。
 *
 *   node tools/fetch-lq-avatars.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const CW = 'mirror/leqixiang/courseware';
const OUT = path.join('mirror', 'leqixiang', '_shared-ext', 'api.dicebear.com');

/* 课里的脚本把地址拆成几段拼起来，拆开以后认不出是头像服务，
 * 只剩一个 "ebear" 的残片。这里就拿这个残片当记号。 */
const SIGN = "'ebear'";

const lessons = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.html'))
  .filter((n) => {
    try {
      return fs.readFileSync(path.join(CW, n), 'utf8').includes(SIGN);
    } catch {
      return false;
    }
  })
  .map((n) => n.replace(/\.html$/, ''));

console.log(`用到头像服务的课 ${lessons.length} 门：${lessons.join(' ')}`);
if (!lessons.length) process.exit(0);

const browser = await connect(CDP);
const sid = browser.pageSession;
await browser.raw('Page.enable', {}, sid);
await browser.raw('Runtime.enable', {}, sid);

const urls = new Set();
for (const lesson of lessons) {
  await browser.raw('Page.navigate', { url: `http://localhost:${PORT}/courseware/${lesson}?local=1` }, sid).catch(() => {});
  await sleep(3500);
  const found = await browser
    .evaluate(`(() => [...document.querySelectorAll('img')]
      .map(i => i.currentSrc || i.src || '')
      .filter(u => /dicebear\\.com/.test(u))
      .slice(0, 80))()`)
    .catch(() => []);
  for (const u of found) urls.add(u);
  console.log(`  ${lesson}：看见 ${found.length} 张`);
}

console.log(`一共 ${urls.size} 张头像`);

let got = 0;
let missed = 0;
for (const url of urls) {
  const u = new URL(url);
  const m = /\/([\w-]+)\/svg\?seed=([^&]+)&backgroundColor=([^&]+)/.exec(u.pathname + u.search);
  if (!m) {
    missed++;
    continue;
  }
  const [, style, seed, color] = m;
  const dest = path.join(OUT, style, `${seed}-${color}.svg`);
  if (fs.existsSync(dest)) {
    got++;
    continue;
  }
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) {
      missed++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    got++;
    console.log(`+ ${style}/${seed}-${color}.svg  ${Math.round(buf.length / 1024)}KB`);
  } catch {
    missed++;
  }
}

console.log(`\n取回 ${got}，取不到 ${missed}`);

/* 浏览器最后再关：关掉它，这段脚本也就跟着结束了。 */
await browser.close();
