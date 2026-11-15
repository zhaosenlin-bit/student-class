#!/usr/bin/env node
// Ask the live 小白教育 site what each API path answers for GET and for POST
// (POST carries the X-Requested-With: studio header the original front-end
// sends).  The result is the ground truth the local server is matched against.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = 'https://xbjiaoyu.com';

const PATHS = [
  '/api/catalog',
  '/api/session',
  '/api/library',
  '/api/auth/phone/status',
  '/api/auth/phone/send',
  '/api/auth/phone/login',
  '/api/auth/logout',
  '/api/access/mirror',
  '/api/launch/mirror',
  '/api/classroom/viewer-check',
  '/api/classroom/heartbeat',
  '/api/classroom/release',
  '/api/creator',
  '/api/creator/profile',
  '/api/orders',
  '/api/feedback',
  '/api/downloads/prepare',
  '/api/downloads/bulk',
  '/api/downloads/bulk/prepare',
  '/api/service-requests',
  '/api/refund-requests',
  '/api/admin',
  '/api/nonexistent-xyz',
];

const probe = async (method, url) => {
  // The live site refuses a POST unless the browser sent a matching Origin
  // and the front-end's own X-Requested-With: studio header.
  const headers = { 'Content-Type': 'application/json' };
  if (method === 'POST') {
    headers['X-Requested-With'] = 'studio';
    headers['Origin'] = LIVE;
    headers['Referer'] = `${LIVE}/`;
  }
  const res = await fetch(LIVE + url, {
    method,
    headers,
    body: method === 'POST' ? '{}' : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(25000),
  });
  const body = (await res.text()).replace(/\s+/g, ' ');
  return { status: res.status, body: body.slice(0, 90) };
};

const out = {};
for (const p of PATHS) {
  await new Promise((r) => setTimeout(r, 900));
  const get = await probe('GET', p);
  await new Promise((r) => setTimeout(r, 900));
  const post = await probe('POST', p);
  out[p] = { get, post };
  console.log(`${p}\n  GET  ${get.status}  ${get.body}\n  POST ${post.status}  ${post.body}`);
}

const file = path.join(ROOT, 'recon', 'xb-live-method-matrix.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('\nwritten', path.relative(ROOT, file));
