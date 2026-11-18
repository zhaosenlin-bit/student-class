#!/usr/bin/env node
/*
 * 把课件正文里的广告与统计代码摘掉。
 *
 * 有些课件是把外面某个站点整站存进来的，那些页面里留着广告位和统计
 * 脚本：读者打开一门课，浏览器就替我们往广告交易所、统计服务那边跑
 * 几十次，既慢又把访问情况交给了别人，还让页面里出现别人的名字。
 *
 * 课件自己的内容一点不动，摘掉的只是那些广告和统计的片段。
 *
 *   node tools/strip-course-trackers.mjs        # 报告
 *   node tools/strip-course-trackers.mjs --fix  # 改文件
 */
import fs from 'node:fs';
import path from 'node:path';

const FIX = process.argv.includes('--fix');
const ROOTS = [
  'mirror/leqixiang/courseware',
  /*
   * The pages that every lesson shares live in their own folder next to
   * it.  They are shown to the reader just like the ones that sit with a
   * lesson, so the ads and the counters have to be taken out of them
   * as well.
   */
  'mirror/leqixiang/_shared-ext',
  'mirror/aviary',
  'mirror/phet',
  'mirror/labsims',
  'mirror/openlab',
  'mirror/tongjiang',
  'mirror/blocklygames'
];

/* 广告与统计的站点。放行的是正经的库，拦下的是盯着读者看的那一类。 */
const BLOCK_HOSTS = [
  'googletagmanager.com',
  'googlesyndication.com',
  'google-analytics.com',
  'googleadservices.com',
  'doubleclick.net',
  'amazon-adsystem.com',
  'thisiswaldo.com',
  'prebid',
  'teads',
  'pubmatic.com',
  'confiant',
  'newormedia.com',
  'fbcontent.cn',
  'facebook.net',
  'feixianglaoshi.com',
  'quantserve',
  'scorecardresearch',
  'hotjar',
  'clarity.ms',
  'adservice',
  'adsrvr',
  'adnxs',
  'bidswitch',
  '33across',
  'taboola',
  'outbrain',
  'criteo',
  'openx.net',
  'rubiconproject',
  'smartadserver',
  'casalemedia',
  'adform',
  'yieldmo',
  'mathtag',
  'moatads',
  'newrelic.com',
  'sentry.io',
  'mixpanel.com',
  'segment.io',
  'fullstory.com',
  'mouseflow.com',
  'hm.baidu.com',
  'missena.io',
  '4dex.io',
  'adtrafficquality',
  'sodar',
  'googleadservices',
  'recaptcha',
  'pagead2',
  'googlesyndication',
  'doubleclick',
  'mi2f.com',
  'amazingcounters',
  'cgi-bin/Count.cgi',
  'hit-counter',
  'cookie-consent.js'
];

/*
 * 有些页面把一个"计数器"的小图放在页脚里。那张图是别人的统计，
 * 本机取不到，页面上就留下一个裂开的叉。把这张图整个拿掉，
 * 页脚干净了，读者也看不见那个叉。
 */
const TRACKER_IMG = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/*
 * 别人的视频是嵌在别人家的页面里的。本机放不下那个视频，也不该把
 * 别人的牌子摆在这儿，所以那个框换成一句话，说明这里原本是什么。
 */
const VIDEO_IFRAME =
  /<iframe\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\/[^"']*["'][^>]*>(?:\s*<\/iframe\s*>)?/gi;

const VIDEO_NOTICE =
  '<p class="lq-video-note" style="margin:1em 0;padding:.8em 1em;border:1px dashed #b9c3e0;border-radius:8px;color:#3a4a86;background:#f6f8fd">这里原本是一段动画视频，在原站上由第三方网站提供，为了让课件完全离线可用，这里没有放进来。</p>';

/* 挡住机器人的一段脚本，它在这里什么也做不成。 */
const INCAPSULA = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*_Incapsula_Resource[^"']*["'][^>]*>[\s\S]*?<\/script\s*>/gi;

/* 内联的统计片段。 */
const INLINE_MARKERS = [
  'dataLayer',
  'gtag(',
  '_gaq',
  'GA_ga',
  'google-analytics',
  'GoogleAnalyticsObject',
  'hm.baidu.com',
  'baidu.com/h.js',
  'missena',
  '4dex.io',
  'recaptcha',
  'adtrafficquality',
  'sodar',
  'googleadservices',
  'pagead2',
  'adsbygoogle.js',
  'gtag/js',
  'adsbygoogle',
  'googlesyndication',
  'quantserve',
  'scorecardresearch',
  '_paq',
  'clarity.ms',
  'hotjar',
  'fbq(',
  'mixpanel',
  'newrelic'
];

const blocked = (url) => {
  const low = url.toLowerCase();
  return BLOCK_HOSTS.some((h) => low.includes(h.toLowerCase()));
};

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(e.name)) out.push(full);
  }
  return out;
}

/*
 * 一段文字里的外链脚本地址。
 *
 * 协议省掉 "//cdn.xxx.com/a.js" 这种写法也要认出来，
 * 不然广告脚本会从缝里钻过去。
 */
const SCRIPT_SRC = /<script\b[^>]*\bsrc\s*=\s*["']((?:https?:)?\/\/[^"']+)["'][^>]*>[\s\S]*?<\/script\s*>/gi;
/* 一段没有地址的脚本。 */
const INLINE_BLOCK = /<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script\s*>/gi;
/* 统计脚本在页面里插的占位。 */
const NOSCRIPT_AD = /<noscript\b[^>]*>[\s\S]{0,2000}?<\/noscript\s*>/gi;

/*
 * 只摘"整段都是统计"的小片段。
 *
 * PhET 把整门课打包成一大段脚本放在页面里，那一大段里也带着统计
 * 库（require.js 把 analytics 那个模块一起打进去了），它比任何一段
 * 统计片段都大得多，是课件本体，不能动。这里按大小把两种分开。
 */
const INLINE_LIMIT = 20000;

const files = ROOTS.flatMap((r) => walk(r));
const touched = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let out = raw;
  let n = 0;

  /* 外链的广告 / 统计脚本。 */
  out = out.replace(SCRIPT_SRC, (all, url) => {
    if (!blocked(url)) return all;
    n++;
    return '';
  });

  /* 内联的统计片段。 */
  out = out.replace(INLINE_BLOCK, (all) => {
    if (all.length > INLINE_LIMIT) return all;
    const body = all.replace(/<script\b[^>]*>/i, '').replace(/<\/script\s*>/i, '');
    if (!INLINE_MARKERS.some((m) => body.includes(m))) return all;
    n++;
    return '';
  });

  /* 统计脚本在关掉脚本时留的占位。 */
  out = out.replace(NOSCRIPT_AD, (all) => {
    if (!INLINE_MARKERS.some((m) => all.includes(m))) return all;
    n++;
    return '';
  });

  /* 计数器的小图。 */
  out = out.replace(TRACKER_IMG, (all, url) => {
    if (!blocked(url)) return all;
    n++;
    return '';
  });

  /* 别人家的视频。 */
  out = out.replace(VIDEO_IFRAME, () => {
    n++;
    return VIDEO_NOTICE;
  });

  /* 挡机器人的脚本。 */
  out = out.replace(INCAPSULA, () => {
    n++;
    return '';
  });

  if (n && out !== raw) {
    touched.push({ rel: file.replace(/\\/g, '/'), n });
    if (FIX) {
      fs.writeFileSync(file, out, 'utf8');
      console.log(`+ ${file.replace(/\\/g, '/')}  摘掉 ${n} 处`);
    }
  }
}

console.log(`看过 ${files.length} 个课件页面，带广告 / 统计代码的 ${touched.length} 个：`);
for (const t of touched.slice(0, 30)) console.log(`  ${t.rel}  ×${t.n}`);
if (touched.length > 30) console.log(`  …… 还有 ${touched.length - 30} 个`);
if (!FIX && touched.length) {
  console.log('\n加 --fix 可以把它们摘掉。');
  process.exitCode = 1;
}
