#!/usr/bin/env node
/*
 * Mirrors the Blockly Games: Google's block-programming lessons, offered
 * under the Apache licence and available in Chinese.
 *
 * Every game is a small application: one page, one script bundle, one
 * language pack and a handful of pictures and sounds.  All of it is
 * fetched and kept beside the game, so the game runs from the disk with
 * no connection at all.
 *
 *   node tools/mirror-blockly.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'mirror', 'blocklygames');
const HOST = 'https://blockly.games';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/* The games the index page offers, with their Chinese names. */
const GAMES = [
  { slug: 'puzzle', dir: 'puzzle', title: '拼图', titleEn: 'Puzzle' },
  { slug: 'maze', dir: 'maze', title: '迷宫', titleEn: 'Maze' },
  { slug: 'bird', dir: 'bird', title: '小鸟', titleEn: 'Bird' },
  { slug: 'turtle', dir: 'turtle', title: '小龟', titleEn: 'Turtle' },
  { slug: 'movie', dir: 'movie', title: '动画电影', titleEn: 'Movie' },
  { slug: 'music', dir: 'music', title: '音乐盒', titleEn: 'Music' },
  { slug: 'pond-tutor', dir: 'pond/tutor', title: '池塘向导', titleEn: 'Pond Tutor' },
  { slug: 'pond-duck', dir: 'pond/duck', title: '池塘小鸭', titleEn: 'Pond Duck' },
];

const EXT =
  /\.(?:html?|js|mjs|css|json|txt|xml|png|jpe?g|gif|svg|webp|avif|wav|mp3|ogg|m4a|ico|woff2?)$/i;

/*
 * A few files of the games are asked for by the program while it runs,
 * not by the page while it loads, so the crawl never sees them.  They
 * are named here, and they are fetched for every game.
 */
const RUNNING_FILES = [
  'common/icons.png',
  'third-party/ace/mode-javascript.js',
  'third-party/ace/theme-chrome.js',
  'third-party/blockly/media/sprites.png',
  'third-party/blockly/media/click.mp3',
  'third-party/blockly/media/delete.mp3',
  'third-party/blockly/media/disconnect.wav',
];

/* The music game plays a note of a chosen instrument. */
const SOUND_FONT_INSTRUMENTS = [
  'banjo',
  'choir',
  'drum',
  'flute',
  'guitar',
  'piano',
  'trumpet',
  'violin',
];
const SOUND_FONT_NOTES = [
  'A3', 'A4', 'B3', 'C3', 'C4', 'D3', 'D4', 'E3', 'E4', 'F3', 'F4', 'G3', 'G4',
];

const RUNNING_FILES_BY_GAME = {
  puzzle: ['puzzle/bee.jpg', 'puzzle/cat.jpg', 'puzzle/duck.jpg', 'puzzle/snail.jpg'],
  music: [
    'music/note0.25.png',
    ...SOUND_FONT_INSTRUMENTS.flatMap((i) =>
      SOUND_FONT_NOTES.map((n) => `third-party/soundfonts/${i}/${n}.mp3`)
    ),
  ],
};

const cache = new Map();
async function grab(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const c = new AbortController();
        const timer = setTimeout(() => c.abort(), 45000);
        const res = await fetch(url, {
          headers: { 'User-Agent': UA, Referer: HOST + '/' },
          signal: c.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return { buf, type: res.headers.get('content-type') || '' };
      } catch {
        await new Promise((r) => setTimeout(r, 700 * (i + 1)));
      }
    }
    return null;
  })();
  cache.set(url, p);
  return p;
}

const refsIn = (text, base) => {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    let clean = raw.trim();
    if (!clean || clean.startsWith('data:') || clean.startsWith('#')) return;
    if (/^(https?:)?\/\//i.test(clean)) return;
    clean = clean.split('#')[0].split('?')[0];
    if (!clean || !EXT.test(clean)) return;
    try {
      out.add(new URL(clean, base).href);
    } catch {
      /* a name that is not a path */
    }
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of text.matchAll(/["'`]([^"'`\s]+\/[A-Za-z0-9_\-./]+)["'`]/g)) add(m[1]);
  return out;
};

fs.mkdirSync(OUT, { recursive: true });

const results = [];

for (const game of GAMES) {
  const dir = path.join(OUT, game.slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const pageUrl = `${HOST}/${game.slug}.html`;
  const page = await grab(pageUrl);
  if (!page) {
    console.log(`  ${game.slug}: page not reachable`);
    continue;
  }
  let html = page.buf.toString('utf8');
  html = html.replace(
    /<title>([\s\S]*?)<\/title>/i,
    `<title>乐启享 · ${game.title}（Blockly 积木编程）</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="乐启享 · ${game.title}：用积木编程学会循环与判断。">`
  );

  /* Collect every file the game needs.  The queue starts with the files
     the game is made of, so the bundle is read as well and the pictures
     it names are found. */
  const seeds = [
    pageUrl,
    `${HOST}/common/common.css`,
    `${HOST}/${game.dir}/style.css`,
    `${HOST}/${game.dir}/generated/compressed.js`,
    `${HOST}/${game.dir}/generated/msg/zh-hans.js`,
    ...RUNNING_FILES.map((f) => `${HOST}/${f}`),
    ...(RUNNING_FILES_BY_GAME[game.slug] || []).map((f) => `${HOST}/${f}`),
  ];
  const wanted = new Set();
  const queue = [pageUrl];
  const seen = new Set();
  queue.length = 0;
  queue.push(...seeds);
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    wanted.add(url);
    const file = await grab(url);
    if (!file) continue;
    const text = file.buf.toString('utf8');
    /* The names inside a bundle are written against the root of the
       site, not against the place the bundle itself sits. */
    for (const ref of refsIn(text, HOST + '/')) {
      if (!seen.has(ref)) {
        wanted.add(ref);
        queue.push(ref);
      }
    }
  }
  let bytes = 0;
  let count = 0;
  for (const url of wanted) {
    const rel = new URL(url).pathname.replace(/^\/+/, '');
    const dest = path.join(dir, 'assets', rel);
    const file = await grab(url);
    if (!file) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.buf);
    bytes += file.buf.length;
    count++;
  }

  /* The page starts the game through a small loader that reads the
     language out of the address.  The local copy says the language
     outright and names the files that sit next to it. */
  html = html.replace(
    /<link rel="stylesheet" href="common\/common.css">/i,
    '<base href="/api/program-assets/blocklygames-' +
      game.slug +
      '/">\n  <link rel="stylesheet" href="common/common.css">'
  );
  html = html.replace(
    /<link rel="stylesheet" href="[^"]*style\.css">/i,
    `<link rel="stylesheet" href="${game.dir}/style.css">`
  );
  html = html.replace(
    /<script src="common\/boot\.js"><\/script>/i,
    `<script>
    window.BlocklyGamesLang = 'zh-hans';
    window.BlocklyGamesLanguages = ['zh-hans'];
    document.cookie = 'lang=zh-hans; path=/';
    </script>
  <script src="${game.dir}/generated/msg/zh-hans.js"></script>
  <script>
    /* The games speak with their own message book.  Put our name in it
       before the bundle draws the header. */
    try {
      if (window.BlocklyGamesMsg) window.BlocklyGamesMsg['Games.name'] = '乐启享';
    } catch (e) {}
  </script>
  <script src="${game.dir}/generated/compressed.js"></script>`
  );
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/i,
    '<noscript>请开启 JavaScript 才能运行这门积木编程课。</noscript>'
  );
  /* The bundle builds a header whose first part is a link back to the
     games index.  There is no such index here, so the name is left as
     plain text and a link to the course library is put in its place. */
  html = html.replace(
    /<\/head>/i,
    `<script>
  (function () {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var box = document.getElementById('title');
      if (box) {
        var link = box.querySelector('a');
        if (link) {
          var text = document.createElement('span');
          text.textContent = '乐启享';
          link.parentNode.replaceChild(text, link);
        }
      }
      if (tries > 60) clearInterval(timer);
    }, 120);
  })();
</script>
</head>`
  );
  html = html.replace(
    /<title>([\s\S]*?)<\/title>/i,
    `<title>乐启享 · ${game.title}（Blockly 积木编程）</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="乐启享 · ${game.title}：用积木编程学会循环与判断。">`
  );
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  fs.writeFileSync(
    path.join(dir, 'game.json'),
    JSON.stringify(
      {
        slug: game.slug,
        title: game.title,
        titleEn: game.titleEn,
        subject: '编程',
        subjects: ['编程'],
        stages: ['小学', '初中'],
        stage: '小学',
        description: `${game.title}：用积木拼出程序，练习循环、条件与变量，英文原版可直接使用。`,
        credits: 'Blockly Games · Google',
        cover: `/brand/blocklygames/${game.slug}.png`,
        sourceUrl: `${HOST}/${game.slug}.html`,
        license: 'Apache-2.0 (Google)',
      },
      null,
      2
    ),
    'utf8'
  );

  results.push({ ...game, files: count, bytes });
  console.log(`  ${game.slug}: ${count} files, ${(bytes / 1048576).toFixed(1)}MB`);
}

const catalog = results.map((g) => ({
  slug: g.slug,
  title: g.title,
  titleEn: g.titleEn,
  subject: '编程',
  subjects: ['编程'],
  stages: g.stages,
  stage: '小学',
  description: `${g.title}：用积木拼出程序，练习循环、条件与变量，英文原版可直接使用。`,
  credits: 'Blockly Games · Google',
  cover: `/brand/blocklygames/${g.slug}.png`,
  sourceUrl: g.sourceUrl,
  license: 'Apache-2.0 (Google)',
}));

fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
fs.writeFileSync(
  path.join(OUT, 'NOTICE.md'),
  [
    '# Blockly Games',
    '',
    '这些积木编程课来自 [Blockly Games](https://blockly.games)，',
    '由 Google 编写，以 Apache 2.0 许可发布。',
    '',
    '## 乐启享的改编与再创作',
    '',
    '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
    '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
    '脚本与样式表与语言包与图片的本地化改写、离线打包与本地服务，',
    '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
    '课件本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
    '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
    '',
    '- 每一门游戏都是网页程序：页面、脚本、语言包和图片都收在本地目录里。',
    '- 中文界面用的是官方自带的简体语言包。',
    '- 打开该目录里的 index.html 即可离线使用，不需要联网。',
    '',
  ].join('\n'),
  'utf8'
);
console.log(`done: ${results.length} games`);
