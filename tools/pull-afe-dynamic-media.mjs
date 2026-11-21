#!/usr/bin/env node
/*
 * 把"运行时才算出来的"素材也搬回本地。
 *
 * 这批英语情景课的画面不是写在正文里的，是运行的时候拼出来的：
 *
 *   director.play('assets/video/' + scene.scene + '-idle.mp4')
 *   audio.src   = 'assets/audio/' + id + '.wav'
 *
 * 静态爬虫看不见这种地址，于是本地少了视频和声音，课件打开就是一片
 * 安静。这个工具分两步把它们找齐：
 *
 *   一、用真浏览器打开本地课件，把它真正会要的地址一条条记下来；
 *   二、拿一份新的租约，到线上把这些地址按原样取回来。
 *
 *   node tools/pull-afe-dynamic-media.mjs --ids 1393,1394
 *   node tools/pull-afe-dynamic-media.mjs --all
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './cdp.mjs';

const ROOT = path.resolve('.');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const PLAY = 'https://play.aifunengjiaoyu.com';
const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9227);
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const WAIT = Number(argOf('wait', 9000));

const HEADERS = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
};

const GAP = Number(process.env.AFE_GAP || 250);
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function get(url, extra = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    /* The static host is a plain file server: no need to knock on its door
       politely for every single file. */
    if (!extra.noPace) await pace();
    try {
      const headers = { ...HEADERS, ...(extra.headers || {}) };
      /* The playback host does not know the account; it does not want it. */
      if (extra.noAuth) delete headers.Authorization;
      const res = await fetch(url, {
        ...extra,
        headers,
        redirect: 'manual',
      });
      if (res.status !== 429) return res;
    } catch {
      /* 网络抖一下就再来 */
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  return null;
}

/* 换一份租约，拿到正文，也就拿到了素材的根。 */
async function freshLease(id) {
  const res = await get(`${ORIGIN}/api/programs/${id}/camera-launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      'X-Requested-With': 'studio',
    },
    body: '{}',
  });
  if (!res) return null;
  const text = await res.text();
  if (process.env.AFE_VERBOSE) console.log(`   lease ${res.status} ${text.slice(0, 120)}`);
  let launchUrl = null;
  try {
    launchUrl = JSON.parse(text).launchUrl || null;
  } catch {
    /* 不是 JSON 就是没有启动地址 */
  }
  if (!launchUrl) return null;

  let target = launchUrl;
  /* 播放主机在跳转时会带一个会话 cookie，下一跳要带着它。 */
  const jar = new Map();
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  for (let hop = 0; hop < 6; hop++) {
    const r = await get(target, {
      noAuth: target.startsWith(PLAY),
      headers: cookieHeader() ? { Cookie: cookieHeader() } : {},
    });
    if (!r) return null;
    for (const c of r.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const at = pair.indexOf('=');
      if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
    }
    if (process.env.AFE_VERBOSE)
      console.log(`   hop ${hop} ${r.status} ${target.slice(0, 80)}`);
    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get('location');
      if (!location) return null;
      target = new URL(location, target).href;
      continue;
    }
    if (!r.ok) return null;
    const html = await r.text();
    const base = html.match(/<base[^>]*href=["']([^"']+)["']/i)?.[1];
    if (!base) {
      if (process.env.AFE_VERBOSE)
        console.log(`   没有 base：${JSON.stringify(html.replace(/\s+/g, ' ').slice(0, 300))}`);
      return null;
    }
    return { base, origin: new URL(target).origin, cookie: cookieHeader() };
  }
  return null;
}

/* 浏览器打开本地课件，把它会要的地址一条条记下来。 */
async function capture(id) {
  const page = await connect(CDP);
  try {
    await page.send('Network.enable');
    await page.send('Page.enable');
    /* 课件正文自己就是一个页面，直接打开它，地址一条条都在。 */
    await page.send('Page.navigate', {
      url: `http://127.0.0.1:${PORT}/courseware/afe-${id}?local=1&t=${Date.now()}`,
    });
    await new Promise((r) => setTimeout(r, WAIT));
    const wanted = new Set();
    for (const ev of page.events) {
      if (ev.method !== 'Network.requestWillBeSent') continue;
      const url = ev.params?.request?.url || '';
      const m = url.match(/\/api\/program-assets\/afe-(\d+)\/(.+)$/);
      if (!m) continue;
      if (m[1] !== String(id)) continue;
      wanted.add(decodeURIComponent(m[2]));
    }
    return [...wanted];
  } finally {
    page.close();
  }
}

/*
 * 素材的名字是数据表里的场景、片段和音频拼出来的。浏览器只肯要第一个
 * 场景的那一份，剩下的要照着数据表推出来。
 */
const DATA_KEYS =
  'id|scene|clip|audio|kind|name|bg|image|img|poster|thumb|role|person|char|actor|bgm|sound|file|video|line|variant';

function mediaCandidates(assetDir) {
  const ids = new Set();
  const folders = new Set();
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:js|mjs|json)$/i.test(entry.name)) files.push(full);
    }
  };
  if (fs.existsSync(assetDir)) walk(assetDir);

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/assets\/([a-z0-9_-]+)\//gi)) folders.add(m[1]);
    const keyRe = new RegExp(
      `(?:^|[{,\\s])(?:${DATA_KEYS})\\s*:\\s*'([a-z0-9][\\w.-]{1,48})'`,
      'gi'
    );
    for (const m of text.matchAll(keyRe)) ids.add(m[1]);
    /* The audio table is a list of tuples: [name, voice, text, note]. */
    for (const m of text.matchAll(/\[\s*'([a-z0-9][\w.-]{1,48})'\s*,\s*'[a-z0-9][\w.-]{1,48}'/gi))
      ids.add(m[1]);
  }
  return { ids: [...ids], folders: [...folders] };
}

/* 文件夹决定后缀：视频是 mp4，场景图是图片，录音是 wav。 */
function suffixesFor(folder) {
  if (/video|clip|movie/i.test(folder)) return ['.mp4', '-idle.mp4', '-arrival.mp4'];
  if (/audio|sound|voice|bgm/i.test(folder)) return ['.wav', '.mp3'];
  if (/scene|image|img|picture|bg|poster|player/i.test(folder))
    return ['.webp', '.jpg', '.png', '.mp4'];
  return ['.webp', '.png', '.mp4', '.mp3'];
}

/*
 * 一次开一个租约：租约只有几分钟的寿命，所以拿到租约以后要马上去取
 * 那些"运行时才算出来"的素材。名字是本地跑一遍记下来的，地址是
 * 租约给的，两者拼在一起才是完整的地址。
 */
async function pullDynamic(id, wanted) {
  const lease = await freshLease(id);
  if (!lease) return { added: 0, missing: wanted };

  /* 取一个文件，顺着跳转走到真正存放它的那台机器上。 */
  const fetchAsset = async (url, cookie) => {
    let target = url;
    for (let hop = 0; hop < 5; hop++) {
      const res = await get(target, {
        noAuth: true,
        noPace: target.includes('protected-static.'),
        headers: cookie ? { Cookie: cookie } : {},
      });
      if (!res) return null;
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        target = new URL(location, target).href;
        continue;
      }
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    return null;
  };

  let added = 0;
  const stillMissing = [];
  const todo = wanted.filter((rel) => {
    const out = path.join(CW, `${id}.assets`, rel);
    return !(fs.existsSync(out) && fs.statSync(out).size > 0);
  });

  /*
   * Several files at a time.  Every address goes through the playback
   * host, because the signature on the static address belongs to one
   * file only: it hands out a fresh signed address for each request.
   */
  const queue = [...todo];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const rel = queue.shift();
      const out = path.join(CW, `${id}.assets`, rel);
      const buf = await fetchAsset(lease.origin + lease.base + rel, lease.cookie);
      if (!buf) {
        stillMissing.push(rel);
        continue;
      }
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, buf);
      added++;
    }
  });
  await Promise.all(workers);
  return { added, missing: stillMissing };
}

/* 目标作品号。 */
let ids = [];
if (args.includes('--ids'))
  ids = argOf('--ids', '').split(',').map((s) => s.trim()).filter(Boolean);
else if (args.includes('--all')) {
  const works = JSON.parse(
    fs.readFileSync(path.join(CW, '..', 'programs-all.json'), 'utf8')
  );
  ids = works
    .filter((w) => Number(w.id) >= 1390 && fs.existsSync(path.join(CW, `${w.id}.html`)))
    .map((w) => String(w.id));
}
if (!ids.length) {
  console.log('用法：node tools/pull-afe-dynamic-media.mjs --ids 1393,1394');
  process.exit(0);
}

const report = {};
for (const id of ids) {
  const wanted = await capture(id);
  const assetDir = path.join(CW, `${id}.assets`);
  const missing = wanted.filter((rel) => {
    const file = path.join(assetDir, rel);
    return !(fs.existsSync(file) && fs.statSync(file).size > 0);
  });
  /*
   * 除了浏览器点名的那些，数据表里还有别的场景、片段和音频。它们的
   * 地址是照着同样的规矩拼出来的，一次租约里一并取回来。
   */
  const { ids, folders } = mediaCandidates(assetDir);
  const candidates = new Set(missing);
  for (const folder of folders) {
    for (const suffix of suffixesFor(folder)) {
      for (const one of ids) candidates.add(`assets/${folder}/${one}${suffix}`);
    }
  }

  /* 本地已经有的不再去要。 */
  const todo = [...candidates].filter((rel) => {
    const file = path.join(assetDir, rel);
    return !(fs.existsSync(file) && fs.statSync(file).size > 0);
  });
  if (!todo.length) {
    console.log(`${id}: 浏览器要的 ${wanted.length} 个素材，本地都在`);
    report[id] = { wanted: wanted.length, added: 0 };
    continue;
  }

  const { added, missing: stillMissing } = await pullDynamic(id, todo);
  /* Only the ones the browser really asked for are worth reporting. */
  const wantedMissing = stillMissing.filter((rel) => missing.includes(rel));
  console.log(`${id}: 补了 ${added} 个素材，还缺 ${wantedMissing.length}`);
  for (const m of wantedMissing) console.log(`   还是缺 ${m}`);
  report[id] = { wanted: wanted.length, added, missing: wantedMissing };
}

fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'afe-dynamic-media.json'),
  JSON.stringify(report, null, 1)
);
