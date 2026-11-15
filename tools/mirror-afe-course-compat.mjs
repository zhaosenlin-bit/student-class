#!/usr/bin/env node
// Mirror the course-compat static JSON the 图灵智赋 bundle asks for at
// runtime (the long-march save policy), so the page loads its policy
// instead of 404ing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = 'https://aifunengjiaoyu.com';
const FILES = ['/course-compat/long-march-save-policy.json'];

for (const rel of FILES) {
  const res = await fetch(LIVE + rel, { redirect: 'manual' });
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets', rel.replace(/^\/+/, ''));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log(`${rel}  ${res.status}  ${buf.length} bytes  ->  ${path.relative(ROOT, out)}`);
}
