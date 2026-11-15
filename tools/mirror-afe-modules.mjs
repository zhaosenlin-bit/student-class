#!/usr/bin/env node
/*
 * Mirror the three ES modules the 图灵智赋 shell imports at runtime:
 *   /course-compat/long-march-playback-host.mjs
 *   /course-compat/long-march-save-host.mjs
 *   /admin-large/runtime/public-lease.mjs
 *
 * They implement the account-bound playback lease for the 长征 courseware.
 * We serve them verbatim so the shell reports the same honest error the
 * online site does ("请先登录后打开课件") instead of a missing-module 404.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ORIGIN = 'https://aifunengjiaoyu.com';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mirror', 'aifunengjiaoyu', 'assets');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const paths = [
  '/course-compat/long-march-playback-host.mjs',
  '/course-compat/long-march-save-host.mjs',
  '/admin-large/runtime/public-lease.mjs',
];

for (const p of paths) {
  const res = await fetch(ORIGIN + p, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
  });
  if (!res.ok) {
    console.log(`[${res.status}] ${p}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(ROOT, p.replace(/^\/+/, ''));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`[200] ${p} ${buf.length}b -> ${file}`);
}
