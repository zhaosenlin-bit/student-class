#!/usr/bin/env node
/*
 * 拉取"登录之后才露出来"的新作品。
 *
 * 游客看到的作品表只有 12 条；用扫码登录的账号再问 /api/programs，
 * 线上会给出一份更长的清单（现在 469 条）。清单里有一部分是本地还
 * 没有正文的，它们就是这一版要补的货。
 *
 * 取正文有两道门。普通作品走 /api/programs/<id>：它回一个只有一行
 * 脚本的页面，脚本里 window.location.replace 指向带租约令牌的正文
 * 地址。摄像头运行时的作品走 /api/programs/<id>/camera-launch：它给
 * 一个 play.aifunengjiaoyu.com 的启动地址，跟过去才是正文。令牌和
 * 素材目录都是短命的，所以正文一到手就顺着引用链把素材抓完。
 *
 *   node tools/pull-afe-new.mjs            # 补齐本地缺正文的作品
 *   node tools/pull-afe-new.mjs --ids 1393 # 只补指定作品
 *   node tools/pull-afe-new.mjs --refresh  # 已经有的也重抓一遍
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlAssets } from './afe-crawl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const PLAY = 'https://play.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();

const args = process.argv.slice(2);
const onlyIds = args.includes('--ids')
  ? args[args.indexOf('--ids') + 1].split(',').map((s) => s.trim())
  : null;
const refresh = args.includes('--refresh');

const HEADERS = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
};

const GAP = Number(process.env.AFE_GAP || 400);
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function get(url, extra = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace();
    try {
      const res = await fetch(url, {
        ...extra,
        headers: { ...HEADERS, ...(extra.headers || {}) },
        redirect: 'manual',
      });
      if (res.status !== 429) return res;
    } catch {
      /* 网络抖一下就再来 */
    }
    await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
  }
  return null;
}

/*
 * 素材有时挂在另一个域名上，那一跳会带一个会话 cookie。
 * 这里自己记住 cookie 跟着跳，不让 fetch 自动跳。
 */
function makeSession() {
  const jar = new Map();
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    remember(res) {
      for (const c of res.headers.getSetCookie?.() || []) {
        const [pair] = c.split(';');
        const at = pair.indexOf('=');
        if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
      }
    },
  };
}

const fetchBuffer = async (url, session) => {
  const cookie = session?.header();
  const tryFetch = async (target) => {
    const res = await get(target, {
      headers: cookie ? { Cookie: cookie } : {},
    });
    if (!res || !res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  };
  let buf = await tryFetch(url).catch(() => null);
  if (!buf && url.startsWith('https://cdn.jsdelivr.net/')) {
    buf = await tryFetch(url.replace('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/')).catch(
      () => null
    );
  }
  return buf;
};

async function pullOne(program) {
  const id = String(program.id);
  const bodyFile = path.join(CW, `${id}.html`);
  const session = makeSession();

  let html = '';
  let target = `${ORIGIN}/api/programs/${id}`;
  /* 素材从哪个主机取，正文就写在哪个主机下。 */
  let origin = ORIGIN;
  for (let hop = 0; hop < 6; hop++) {
    const res = await get(target, {
      headers: session.header() ? { Cookie: session.header() } : {},
    });
    if (!res) return { id, ok: false, reason: 'unreachable' };
    session.remember(res);
    if (process.env.AFE_VERBOSE) {
      const peek = await res.clone().text().catch(() => '');
      console.log(
        `   hop ${hop} ${res.status} ${target.slice(0, 90)} ${JSON.stringify(
          peek.replace(/\s+/g, ' ').slice(0, 120)
        )}`
      );
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return { id, ok: false, reason: 'redirect without location' };
      target = new URL(location, target).href;
      continue;
    }
    if (!res.ok) {
      /*
       * 正文的门对这类作品是关着的（回 "Private courseware unavailable"），
       * 但摄像头运行时那道门是开的。关着的门换一道门再问一次。
       */
      const launched = await launchViaCamera(program, session);
      if (!launched) return { id, ok: false, reason: res.status };
      html = launched.html;
      origin = launched.origin;
      break;
    }
    html = await res.text();
    const next = html.match(/window\.location\.replace\(["']([^"']+)["']\)/)?.[1];
    if (!next) {
      /* 正文就是这一页（摄像头运行时的作品会走到这里之外的一条路）。 */
      if (html.includes('正在加载程序')) {
        const launched = await launchViaCamera(program, session);
        if (!launched) return { id, ok: false, reason: 'camera launch refused' };
        html = launched.html;
        origin = launched.origin;
      }
      break;
    }
    target = next.startsWith('http') ? next : ORIGIN + next;
  }
  if (!html) return { id, ok: false, reason: 'empty body' };

  fs.mkdirSync(CW, { recursive: true });
  fs.writeFileSync(bodyFile, html, 'utf8');

  const r = await crawlAssets({
    origin,
    cwDir: CW,
    id,
    html,
    fetchBuffer: (url) => fetchBuffer(url, session),
  });
  return { id, title: program.title, ok: true, bytes: html.length, files: r.files, missing: r.missing };
}

/*
 * 摄像头运行时的作品：先换一个启动地址，再跟到真正的那一页。
 */
async function launchViaCamera(program, session) {
  const id = String(program.id);
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
  let launchUrl = null;
  try {
    launchUrl = JSON.parse(text).launchUrl || null;
  } catch {
    /* 不是 JSON 就是没有启动地址 */
  }
  if (!launchUrl) return null;

  let target = launchUrl;
  for (let hop = 0; hop < 6; hop++) {
    const r = await get(target, {
      headers: session.header() ? { Cookie: session.header() } : {},
    });
    if (!r) return null;
    session.remember(r);
    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get('location');
      if (!location) return null;
      target = new URL(location, target).href;
      continue;
    }
    if (!r.ok) return null;
    const html = await r.text();
    if (!/<base\s/i.test(html)) return null;
    return { html, origin: new URL(target).origin };
  }
  return null;
}

const all = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);

let targets = all;
if (onlyIds) targets = all.filter((p) => onlyIds.includes(String(p.id)));
else
  targets = all.filter(
    (p) => refresh || !fs.existsSync(path.join(CW, `${p.id}.html`))
  );

console.log(`要补的作品 ${targets.length} 门`);

const rows = [];
for (const program of targets) {
  const r = await pullOne(program);
  rows.push(r);
  const label = `${r.title || ''}`.slice(0, 26);
  if (r.ok) console.log(`ok   ${r.id} ${label}  ${r.bytes}B files=${r.files} miss=${r.missing}`);
  else console.log(`FAIL ${r.id} ${label}  ${r.reason}`);
}

const ok = rows.filter((r) => r.ok);
console.log(`\n成功 ${ok.length} / ${rows.length}`);
if (ok.length) {
  console.log('新补上的：' + ok.map((r) => r.id).join(','));
}
