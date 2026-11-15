#!/usr/bin/env node
/*
 * Show what a session actually holds.
 *
 * Resuming a session and mounting its entries costs nothing, so this is
 * the cheap way to look at the tree: the full address of every mount,
 * the files the descriptor names, and whether a file can be asked for
 * under that address.
 *
 *   node tools/inspect-session.mjs <sessionId> <programId>
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
const TOKEN = fs.readFileSync(path.join(SCRATCH, 'afe-token.txt'), 'utf8').trim();

const [sessionId, programId] = process.argv.slice(2);
if (!sessionId) {
  console.log('用法: node tools/inspect-session.mjs <sessionId> <programId>');
  process.exit(1);
}

async function post(route, body) {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: null, text };
  }
}

const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
  programId: Number(programId),
});
console.log('resume:', resumed.status);
const descriptor = resumed.json?.descriptor;
if (!descriptor) {
  console.log(JSON.stringify(resumed.json || resumed.text).slice(0, 800));
  process.exit(1);
}
console.log('descriptor keys:', Object.keys(descriptor).join(', '));
for (const [k, v] of Object.entries(descriptor)) {
  if (k === 'entries') continue;
  console.log(`  ${k}:`, JSON.stringify(v, null, 1).slice(0, Number(process.env.POLICY || 400)));
}
const entries = descriptor.entries || [];
console.log(`entries: ${entries.length}`);
console.log('first entry:', JSON.stringify(entries[0]).slice(0, 600));

const mounts = [];
const wanted = (process.env.ENTRY || '').split(',').map((s) => s.trim()).filter(Boolean);
const toMount = wanted.length ? entries.filter((e) => wanted.includes(e.id)) : entries.slice(0, Number(process.env.ENTRIES || 3));
for (const entry of toMount) {
  const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
    entry: entry.id,
  });
  console.log(`\nmount ${entry.id}:`, JSON.stringify(mounted.json).slice(0, 700));
  if (mounted.json?.prefix) mounts.push(mounted.json.prefix);
}

for (const prefix of mounts) {
  console.log(`\n--- 试取 ${prefix} ---`);
  for (const rel of (process.env.TRY || 'index.html,adapter.json,_course_runtime/adapter.json').split(',')) {
    const url = ORIGIN + prefix.replace(/\/$/, '') + '/' + rel;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` } });
    console.log(`  ${rel} -> ${res.status} ${res.headers.get('content-type') || ''}`);
    if (res.status === 200 && rel.endsWith('.html')) {
      const text = await res.text();
      console.log('    ', text.slice(0, 400).replace(/\s+/g, ' '));
    }
  }
}
