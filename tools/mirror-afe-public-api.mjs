#!/usr/bin/env node
/*
 * Mirror the public 图灵智赋 API payloads that carry site content rather
 * than account state:
 *
 *   GET /api/announcement                       the site-wide notice
 *   GET /api/creator-agreement/share-policy     the revenue split
 *   GET /api/program-file/                      the full work list
 *
 * The bytes are kept exactly as the site sent them.  The only thing the
 * local server does at serve time is point the CDN media URLs at the
 * mirrored /prod/uploads/... tree, so the browser never leaves localhost.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'api');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const ENDPOINTS = [
  { path: '/api/announcement', file: 'announcement.json' },
  { path: '/api/creator-agreement/share-policy', file: 'share-policy.json' },
  { path: '/api/program-file/', file: 'program-file.json' },
];

fs.mkdirSync(OUT, { recursive: true });

for (const ep of ENDPOINTS) {
  const res = await fetch(ORIGIN + ep.path, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
  });
  if (!res.ok) {
    console.log(`[${res.status}] ${ep.path}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(OUT, ep.file), buf);
  console.log(`[200] ${ep.path} -> api/${ep.file} (${buf.length} b)`);
}

/* The crawler also dropped the work list under assets/api/program-file/;
 * that copy is now redundant. */
const stray = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets', 'api');
if (fs.existsSync(stray)) {
  fs.rmSync(stray, { recursive: true, force: true });
  console.log('removed redundant assets/api/');
}
