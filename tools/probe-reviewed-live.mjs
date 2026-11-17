#!/usr/bin/env node
/*
 * Check whether a session that was opened earlier is still usable, and
 * which host serves the chapter files under a mount address.
 *
 *   node tools/probe-reviewed-live.mjs <sessionId> [sessionId...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const sessions = process.argv.slice(2).filter((a) => /^[a-f0-9]{48}$/.test(a));
if (!sessions.length) {
  console.log('用法: node tools/probe-reviewed-live.mjs <sessionId>...');
  process.exit(1);
}

const TOKENS = {};
for (const name of ['afe-token-account1.txt', 'afe-token-account3.txt']) {
  TOKENS[name] = fs.readFileSync(path.join(SCRATCH, name), 'utf8').trim();
}

const ORIGINS = [
  'https://aifunengjiaoyu.com',
  'https://play.aifunengjiaoyu.com',
];

for (const sessionId of sessions) {
  for (const [name, TOKEN] of Object.entries(TOKENS)) {
    const headers = {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      Origin: ORIGINS[0],
      Referer: `${ORIGINS[0]}/`,
    };
    const res = await fetch(`${ORIGINS[0]}/api/reviewed-course-session/session/${sessionId}/resume`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ programId: 1387 }),
    });
    const text = await res.text();
    console.log(`resume ${sessionId.slice(0, 8)} ${name}: ${res.status} ${text.slice(0, 160).replace(/\n/g, ' ')}`);
    if (res.status !== 200) continue;

    const descriptor = JSON.parse(text);
    const entryId = descriptor.allowedEntryIds?.[0];
    const entry = descriptor.descriptor?.entries?.find((e) => e.id === entryId);
    if (!entry) continue;

    const mount = await fetch(
      `${ORIGINS[0]}/api/reviewed-course-session/session/${sessionId}/mount`,
      { method: 'POST', headers, body: JSON.stringify({ entry: entryId }) }
    );
    const mountJson = await mount.json().catch(() => ({}));
    console.log('  mount', mount.status, mountJson.prefix || JSON.stringify(mountJson).slice(0, 120));
    if (!mountJson.prefix) continue;

    for (const origin of ORIGINS) {
      const url = origin + mountJson.prefix + entry.path;
      for (const extra of [
        {},
        {
          'Sec-Fetch-Dest': 'iframe',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'upgrade-insecure-requests': '1',
        },
      ]) {
        const r = await fetch(url, {
          headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', ...extra },
        });
        const body = await r.text();
        console.log(`  ${origin} ${Object.keys(extra).length ? '+frame 头' : '裸      '} ${r.status} ${body.length} ${body.slice(0, 60).replace(/\n/g, ' ')}`);
      }
    }
  }
}

