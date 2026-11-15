#!/usr/bin/env node
// Ground truth for every API path the 小白教育 front-end can reach:
// what the live site answers for GET and for POST (the browser's POST, i.e.
// with a matching Origin and X-Requested-With: studio).
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
  '/api/auth/phone/safety',
  '/api/auth/phone/rebind-old',
  '/api/auth/logout',
  '/api/access/mirror',
  '/api/launch/mirror',
  '/api/classroom/viewer-check',
  '/api/classroom/heartbeat',
  '/api/classroom/release',
  '/api/creator',
  '/api/creator/profile',
  '/api/creator/submissions/mirror/cover',
  '/api/orders',
  '/api/feedback',
  '/api/downloads/prepare',
  '/api/downloads/bulk',
  '/api/downloads/bulk/prepare',
  '/api/downloads/bulk/jobs/1',
  '/api/service-requests',
  '/api/refund-requests',
  '/api/admin',
  '/api/admin/account-safety',
  '/api/admin/marketplace',
  '/api/admin/marketplace/rules',
  '/api/admin/products',
  '/api/admin/refunds',
  '/api/admin/refund-requests',
  '/api/admin/service-requests',
  '/api/admin/content-deliveries',
  '/api/admin/download-bulk-records',
  '/api/admin/download-block',
  '/api/admin/resource-covers',
  '/api/admin/download-trace',
  '/api/nonexistent-xyz',
];

const probe = async (method, url) => {
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
  return { status: res.status, body: body.slice(0, 120) };
};

const out = {};
for (const p of PATHS) {
  await new Promise((r) => setTimeout(r, 800));
  const get = await probe('GET', p);
  await new Promise((r) => setTimeout(r, 800));
  const post = await probe('POST', p);
  out[p] = { get, post };
  console.log(`${p}\n  GET  ${get.status}  ${get.body}\n  POST ${post.status}  ${post.body}`);
}

const file = path.join(ROOT, 'recon', 'xb-live-method-matrix.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('\nwritten', path.relative(ROOT, file));
