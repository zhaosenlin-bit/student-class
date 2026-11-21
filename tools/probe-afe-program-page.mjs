/*
 * 看看某个作品的"入口页"到底回什么。
 *
 *   node tools/probe-afe-program-page.mjs 1393
 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const id = process.argv[2] || '1393';
const variants = [
  { label: '带 Bearer', headers: { Authorization: `Bearer ${TOKEN}` } },
  { label: '不带令牌', headers: {} },
  {
    label: '带令牌 + XHR 头',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'text/html,*/*',
    },
  },
];

for (const v of variants) {
  const res = await fetch(`${ORIGIN}/api/programs/${id}`, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/`, ...v.headers },
    redirect: 'manual',
  });
  const text = await res.text();
  console.log(
    `${v.label}: ${res.status}  ${text.length}B  ${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 150))}`
  );
  await new Promise((r) => setTimeout(r, 400));
}

/* 跟着入口页里的跳转走一遍，每一跳都记下来。 */
{
  const jar = new Map();
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  let target = `${ORIGIN}/api/programs/${id}`;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(target, {
      headers: {
        'User-Agent': UA,
        Referer: `${ORIGIN}/`,
        Authorization: `Bearer ${TOKEN}`,
        ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
      },
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const at = pair.indexOf('=');
      if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
    }
    const text = await res.text();
    console.log(
      `\nhop ${hop}: ${res.status}  ${res.headers.get('location') || '(no location)'}`
    );
    console.log(`  ${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 220))}`);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) break;
      target = new URL(location, target).href;
      continue;
    }
    const next = text.match(/window\.location\.replace\(["']([^"']+)["']\)/)?.[1];
    if (!next) break;
    target = next.startsWith('http') ? next : ORIGIN + next;
  }
}

/* 播放器自己用的两道门：整包令牌，和摄像头运行时的启动地址。 */
for (const route of [`/api/programs/${id}/access-token`, `/api/programs/${id}/camera-launch`]) {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: `${ORIGIN}/`,
      Origin: ORIGIN,
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'studio',
    },
    body: '{}',
  });
  const text = await res.text();
  console.log(`\nPOST ${route}: ${res.status}  ${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 220))}`);
  if (route.includes('camera-launch')) {
    let url = null;
    try {
      url = JSON.parse(text).launchUrl || null;
    } catch {
      /* 不是 JSON 就没有启动地址 */
    }
    if (url) {
      const jar = new Map();
      const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
      let target = url;
      for (let hop = 0; hop < 6; hop++) {
        const r = await fetch(target, {
          headers: {
            'User-Agent': UA,
            ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
          },
          redirect: 'manual',
        });
        for (const c of r.headers.getSetCookie?.() || []) {
          const [pair] = c.split(';');
          const at = pair.indexOf('=');
          if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
        }
        const body = await r.text();
        console.log(
          `\n  launch hop ${hop}: ${r.status}  ${r.headers.get('location') || '(no location)'}  ${body.length}B`
        );
        console.log(`    ${JSON.stringify(body.replace(/\s+/g, ' ').slice(0, 200))}`);
        if (r.status >= 300 && r.status < 400) {
          const location = r.headers.get('location');
          if (!location) break;
          target = new URL(location, target).href;
          continue;
        }
        break;
      }
    }
  }
}
