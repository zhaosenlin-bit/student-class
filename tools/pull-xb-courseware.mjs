#!/usr/bin/env node
/*
 * Pull the 小白教育 courseware that the catalogue lists but that the
 * anonymous mirror cannot reach.
 *
 * The site hands out courseware only after /api/launch/<id> accepts the
 * request, and it accepts it only for a signed-in buyer.  This tool signs
 * in with the user's own account and then repeats that handshake for every
 * catalogue product, storing whatever the server grants.
 *
 *   node tools/pull-xb-courseware.mjs --phone <11 digits>   (asks for the SMS code)
 *   node tools/pull-xb-courseware.mjs --cookie "<session cookie>"
 *
 * The live site only accepts a phone number + SMS code — POST
 * /api/auth/login answers 403 "请使用手机号验证码登录".  The phone route
 * also wants a drag-the-puzzle captcha, so signing in by hand in a real
 * browser and handing over the cookie is usually easier:
 *
 *   node tools/xb-login-cookie.mjs      # opens the site, waits for you
 *   node tools/pull-xb-courseware.mjs --cookie (Get-Content recon\scratch\xb-cookie.txt)
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu');
const CW = path.join(XB, 'courseware');
const MANIFEST = path.join(XB, 'manifest.json');
const ORIGIN = 'https://xbjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const username = arg('username');
const password = arg('password');
const phone = arg('phone');
const cookieArg = arg('cookie');
const onlyIds = arg('ids');
const useDownload = args.includes('--download');

let cookie = cookieArg || '';
const jar = new Map();

function rememberCookies(res) {
  for (const raw of res.headers.getSetCookie?.() || []) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
function cookieHeader() {
  return cookie || [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(pathname, options = {}) {
  const headers = {
    'User-Agent': UA,
    Referer: `${ORIGIN}/`,
    Origin: ORIGIN,
    'X-Requested-With': 'studio',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const ck = cookieHeader();
  if (ck) headers.Cookie = ck;
  const res = await fetch(ORIGIN + pathname, { ...options, headers, redirect: 'follow' });
  rememberCookies(res);
  return res;
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text.slice(0, 200) };
  }
}

async function signIn() {
  if (cookie) {
    console.log('using the supplied cookie');
    return;
  }
  if (username && password) {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await json(res);
    /* The live site refuses password logins outright. */
    if (res.status === 403) {
      throw new Error(
        'password login is refused by the live site (403 请使用手机号验证码登录) — ' +
          'use --phone or --cookie instead'
      );
    }
    if (!res.ok) throw new Error(`password login failed: ${res.status} ${JSON.stringify(data)}`);
    console.log('signed in as', data.user?.username || username);
    return;
  }
  if (phone) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const send = await req('/api/auth/phone/send', {
      method: 'POST',
      body: JSON.stringify({ purpose: 'login', phone }),
    });
    const sent = await json(send);
    if (!send.ok) throw new Error(`send code failed: ${send.status} ${JSON.stringify(sent)}`);
    console.log(`code sent to ${sent.phoneMasked || phone}`);
    const code = (await rl.question('SMS code: ')).trim();
    const login = await req('/api/auth/phone/login', {
      method: 'POST',
      body: JSON.stringify({ challengeId: sent.challengeId, code, adult: true }),
    });
    const data = await json(login);
    rl.close();
    if (!login.ok) throw new Error(`code login failed: ${login.status} ${JSON.stringify(data)}`);
    console.log('signed in as', data.user?.username || phone);
    return;
  }
  throw new Error('no credentials: use --phone or --cookie');
}

async function pullOne(id, title) {
  /*
   * Two server paths can hand out the courseware:
   *   /api/downloads/prepare  — the download button on a bought product,
   *                              returns a short-lived file url
   *   /api/launch/<id>        — the classroom handshake
   * The download route is tried first because it is the one the site
   * itself offers for saving a course to disk — but it spends the
   * account's download quota, so it is opt-in via --download.
   */
  if (useDownload) {
    const download = await req('/api/downloads/prepare', {
      method: 'POST',
      body: JSON.stringify({ productId: id, confirmSelection: true }),
    });
    if (download.ok) {
      const data = await json(download);
      if (data.url && /^\/api\/downloads\/file\/[A-Za-z0-9_-]+$/.test(data.url)) {
        const body = await req(data.url);
        if (body.ok) {
          const buf = Buffer.from(await body.arrayBuffer());
          fs.mkdirSync(CW, { recursive: true });
          fs.writeFileSync(path.join(CW, `${id}.html`), buf);
          return {
            ok: true,
            bytes: buf.length,
            title,
            via: 'download',
            filename: data.filename,
            sha256: crypto.createHash('sha256').update(buf).digest('hex'),
            sourceUrl: ORIGIN + data.url,
          };
        }
      }
    }
  }

  const tabId = crypto.randomUUID();
  const launch = await req(`/api/launch/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ tabId }),
  });
  if (!launch.ok) {
    const text = await launch.text();
    return { ok: false, reason: `${launch.status} ${text.slice(0, 120).replace(/\s+/g, ' ')}` };
  }
  const data = await json(launch);
  const cwUrl = ORIGIN + (data.url || '');
  const body = await req(new URL(cwUrl).pathname + new URL(cwUrl).search);
  if (!body.ok) {
    return { ok: false, reason: `${body.status} courseware refused` };
  }
  const buf = Buffer.from(await body.arrayBuffer());
  fs.mkdirSync(CW, { recursive: true });
  fs.writeFileSync(path.join(CW, `${id}.html`), buf);
  return {
    ok: true,
    bytes: buf.length,
    title,
    via: 'launch',
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    sourceUrl: cwUrl.split('?')[0],
  };
}

await signIn();

const session = await json(await req('/api/session'));
console.log('session:', JSON.stringify(session).slice(0, 200));

const catalog = JSON.parse(fs.readFileSync(path.join(XB, 'catalog.json'), 'utf8'));
let products = catalog.products || [];
if (onlyIds) {
  const wanted = new Set(onlyIds.split(',').map((s) => s.trim()));
  products = products.filter((p) => wanted.has(p.id));
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const report = [];
for (const p of products) {
  if (manifest.courses?.[p.id]?.status === 'ok') continue;
  const result = await pullOne(p.id, p.title);
  report.push({ id: p.id, title: p.title, ...result });
  console.log(
    `${result.ok ? 'OK  ' : 'NO  '} ${p.id} ${p.title} ${result.bytes || ''} ${result.reason || ''}`,
  );
  if (result.ok) {
    manifest.courses = manifest.courses || {};
    manifest.courses[p.id] = {
      id: p.id,
      status: 'ok',
      bytes: result.bytes,
      file: `courseware/${p.id}.html`,
      sha256: result.sha256,
      sourceUrl: result.sourceUrl,
    };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  }
  await new Promise((r) => setTimeout(r, 200));
}

const ok = report.filter((r) => r.ok).length;
console.log(`\npulled ${ok}/${report.length}`);
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'xb-courseware-pull.json'),
  JSON.stringify(report, null, 1),
);
