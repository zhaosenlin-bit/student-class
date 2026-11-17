#!/usr/bin/env node
/*
 * Ask the mount address for a list of paths and print what it answers.
 *
 *   node tools/probe-mount-files.mjs 1387 _course_runtime/adapter.json ...
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
const programId = Number(args.find((a) => /^\d+$/.test(a)) || 0);
const paths = args.filter((a) => !/^\d+$/.test(a) && !a.startsWith('--'));
const tokenFile = args.includes('--token')
  ? args[args.indexOf('--token') + 1]
  : 'afe-token.txt';
const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenFile), 'utf8').trim();
const sessions = JSON.parse(
  fs.existsSync(path.join(SCRATCH, 'reviewed-sessions.json'))
    ? fs.readFileSync(path.join(SCRATCH, 'reviewed-sessions.json'), 'utf8')
    : '{}'
);

const headers = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

const sessionId = sessions[String(programId)];
if (!sessionId) {
  console.log('没有可用会话');
  process.exit(1);
}

const resumed = await (
  await fetch(`${ORIGIN}/api/reviewed-course-session/session/${sessionId}/resume`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ programId }),
  })
).json();
const entryId = resumed.allowedEntryIds?.[0];
const entry = resumed.descriptor.entries.find((e) => e.id === entryId);
console.log('章节', entryId, entry?.path, '前缀前缀');

const mounted = await (
  await fetch(`${ORIGIN}/api/reviewed-course-session/session/${sessionId}/mount`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ entry: entryId }),
  })
).json();
console.log('prefix', mounted.prefix);

for (const p of paths) {
  const url = ORIGIN + mounted.prefix + p.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` } });
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  ${res.status} ${String(buf.length).padStart(8)}  ${p}`);
}

