#!/usr/bin/env node
/*
 * Compare the local 精品课 (premium catalogue) surface with the live site:
 * status, Content-Type and body bytes, for every method and gate variant.
 */
import crypto from 'node:crypto';

const LIVE = 'https://aifunengjiaoyu.com';
const LOCAL = 'http://localhost:4174';
const UA = { 'User-Agent': 'Mozilla/5.0' };

const cases = [
  ['GET', '/api/premium/catalogue', []],
  ['POST', '/api/premium/catalogue', []],
  ['GET', '/api/premium/prices', []],
  ['POST', '/api/premium/prices', []],
  ['GET', '/api/pay/vip-prices', []],
  ['POST', '/api/pay/vip-prices', []],
  ['GET', '/api/premium/account', []],
  ['POST', '/api/premium/account', []],
  ['GET', '/api/premium/capabilities', []],
  ['GET', '/api/premium/admin/programs', []],
  ['POST', '/api/premium/admin/programs', []],
  ['POST', '/api/premium/admin/programs', ['gate']],
  ['GET', '/api/premium/admin/draft', []],
  ['POST', '/api/premium/admin/draft', ['gate']],
  ['GET', '/api/premium/playback/launch', []],
  ['POST', '/api/premium/playback/launch', []],
  ['POST', '/api/premium/playback/launch', ['gate']],
  ['POST', '/api/premium/playback/close', ['gate']],
  ['POST', '/api/premium/playback/renew', ['gate']],
  ['GET', '/premium-catalogue/style.css', []],
  ['GET', '/premium-catalogue/membership.mjs', []],
  ['GET', '/premium-catalogue/purchase.mjs', []],
  ['GET', '/premium-catalogue/client.mjs', []],
  ['GET', '/premium-catalogue/account.mjs', []],
  ['GET', '/premium-catalogue/promotion.mjs', []],
  ['GET', '/premium-catalogue/uploads.mjs', []],
  ['GET', '/premium-catalogue/covers.mjs', []],
];

const coverSamples = [
  '/premium-catalogue/covers/b017b74d18533067124e350d5b626c0cf9b425e9496e0ba7aa6b12f8897311e5.jpg',
  '/uploads/public/users/oHsVr2zx5I6Bl-_nk4VjGmCwuet4/upload-f120c14f58c974b53e85ed422ec1ce62/image-0.jpg',
];

const digest = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

async function fetchOne(base, method, path, gate) {
  const headers = { ...UA };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  if (gate) {
    headers.Origin = base;
    headers['X-Premium-Catalogue-Intent'] = 'cataloguing';
  }
  const res = await fetch(base + path, {
    method,
    headers,
    body: method !== 'GET' ? '{}' : undefined,
  });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type'), len: body.length, body };
}

let same = 0;
let diff = 0;

for (const [method, path, flags] of cases) {
  const gate = flags.includes('gate');
  const live = await fetchOne(LIVE, method, path, gate);
  const local = await fetchOne(LOCAL, method, path, gate);
  const equal =
    live.status === local.status &&
    (live.type || '').split(';')[0] === (local.type || '').split(';')[0] &&
    digest(live.body) === digest(local.body);
  console.log(
    `${equal ? 'ok  ' : 'DIFF'} ${method.padEnd(4)} ${path.padEnd(52)} ` +
      `${gate ? '[gate] ' : ''}live=${live.status}/${live.len}B local=${local.status}/${local.len}B`,
  );
  if (!equal) {
    diff++;
    console.log('     live :', live.body.toString('utf8').slice(0, 200).replace(/\s+/g, ' '));
    console.log('     local:', local.body.toString('utf8').slice(0, 200).replace(/\s+/g, ' '));
  } else same++;
}

for (const path of coverSamples) {
  const live = await fetchOne(LIVE, 'GET', path, false);
  const local = await fetchOne(LOCAL, 'GET', path, false);
  const equal = live.status === local.status && digest(live.body) === digest(local.body);
  console.log(
    `${equal ? 'ok  ' : 'DIFF'} GET  ${path.slice(0, 52).padEnd(52)} ` +
      `live=${live.status}/${live.len}B local=${local.status}/${local.len}B`,
  );
  if (equal) same++;
  else diff++;
}

console.log(`\nmatching ${same}, different ${diff}`);
process.exit(diff ? 1 : 0);
