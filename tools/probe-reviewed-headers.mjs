#!/usr/bin/env node
/*
 * Find out how the site expects a chapter document to be asked for.
 *
 * The chapter runs in a sandboxed frame: no referrer, a null origin and a
 * navigation request from the page itself.  This tries the plausible
 * header shapes against one chapter and prints which one the server lets
 * through.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const programId = Number(args.find((a) => /^\d+$/.test(a)) || 1387);
const tokenFile = args.includes('--token')
  ? args[args.indexOf('--token') + 1]
  : 'afe-token-account1.txt';
const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenFile), 'utf8').trim();

const BASE = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

const post = async (route, body) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: BASE,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, res };
};

const jar = new Map();
const cookieHeader = () =>
  [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
const store = (res) => {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';');
    const at = pair.indexOf('=');
    jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
};

const requestId = Array.from({ length: 24 }, () =>
  Math.floor(Math.random() * 256)
    .toString(16)
    .padStart(2, '0')
).join('');

const opened = await post(`/api/reviewed-course-session/${programId}/open`, { requestId });
store(opened.res);
console.log('open', opened.status, opened.json?.id, '剩余', opened.json?.trialRemaining);
console.log('  open 头:', [...opened.res.headers.entries()].map(([k, v]) => `${k}=${v}`).join(' | ').slice(0, 400));
if (!opened.json?.id) {
  console.log(opened.text.slice(0, 200));
  process.exit(1);
}
const session = opened.json;
const entryId = session.allowedEntryIds?.[0];
const entry = session.descriptor.entries.find((e) => e.id === entryId);
console.log('章节', entryId, entry?.title, entry?.path);

const mount = await post(`/api/reviewed-course-session/session/${session.id}/mount`, {
  entry: entryId,
});
store(mount.res);
const prefix = mount.json?.prefix;
console.log('prefix', prefix, 'mount', mount.status);
console.log('  mount 头:', [...mount.res.headers.entries()].map(([k, v]) => `${k}=${v}`).join(' | ').slice(0, 400));
console.log('  cookie:', cookieHeader() || '(无)');
const base = prefix.startsWith('http') ? prefix : ORIGIN + prefix;
const url = base.replace(/\/+$/, '') + '/' + entry.path;

const variants = [
  ['裸请求', {}],
  ['带 Origin', { Origin: ORIGIN }],
  ['iframe 头', { 'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin' }],
  ['iframe 头 + Origin', { Origin: ORIGIN, 'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin' }],
  ['iframe 头 + Referer', { Referer: `${ORIGIN}/play/${programId}`, 'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin' }],
  ['Accept html', { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin' }],
  ['带令牌', { Authorization: `Bearer ${TOKEN}`, 'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin' }],
];

for (const [name, headers] of variants) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  const text = await res.text();
  console.log(
    `  ${name}: ${res.status} len=${text.length} ${text.slice(0, 90).replace(/\n/g, ' ')}`
  );
}

await post(`/api/reviewed-course-session/session/${session.id}/close`, { programId });
console.log('已关闭');

