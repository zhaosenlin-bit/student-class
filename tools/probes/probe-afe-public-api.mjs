#!/usr/bin/env node
/*
 * Probe every API path the mirrored front-end can call and report which
 * ones the live site answers for an anonymous visitor.
 *
 * A 200 means the payload is public and therefore belongs in the replica;
 * 401/403 means it is bound to a login, and anything else is a route the
 * site does not have.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const ORIGIN = 'https://aifunengjiaoyu.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Referer: `${ORIGIN}/`,
  Origin: ORIGIN,
  'X-Premium-Catalogue-Intent': 'cataloguing',
};

/* Collect every /api/... path out of the mirrored front-end. */
const paths = new Set();
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs|html)$/i.test(e.name)) files.push(p);
  }
})(AFE);

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/["'`](\/api\/[A-Za-z0-9_\-./$]*)["'`]/g)) paths.add(m[1]);
}

/* The decoded string table knows paths that were concatenated at runtime. */
const table = path.join(ROOT, 'recon', 'scratch', 'afe-strings.txt');
if (fs.existsSync(table)) {
  for (const line of fs.readFileSync(table, 'utf8').split(/\r?\n/)) {
    const m = line.match(/\s(\/api\/[A-Za-z0-9_\-./$]*)/);
    if (m) paths.add(m[1]);
  }
}

const list = [...paths].sort();
console.log(`probing ${list.length} api paths on ${ORIGIN}\n`);

const rows = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const p of list) {
  if (p.includes('$') || p.endsWith('/')) continue;
  for (const method of ['GET', 'POST']) {
    let res;
    let size = 0;
    let type = '';
    let head = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        res = await fetch(ORIGIN + p, {
          method,
          headers: { ...HEADERS, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
          body: method === 'POST' ? '{}' : undefined,
          redirect: 'manual',
        });
        type = (res.headers.get('content-type') || '').split(';')[0];
        const buf = Buffer.from(await res.arrayBuffer());
        size = buf.length;
        head = buf.toString('utf8').slice(0, 160).replace(/\s+/g, ' ');
      } catch (error) {
        head = 'ERR ' + error.message;
      }
      /* The site throttles bursts; back off and try the same call again. */
      if (res?.status === 429) {
        await sleep(2500 * (attempt + 1));
        continue;
      }
      break;
    }
    rows.push({ method, path: p, status: res?.status ?? 0, type, size, head });
    const flag = res?.status === 200 ? 'PUBLIC' : '';
    console.log(
      `${String(res?.status ?? 0).padEnd(4)} ${method.padEnd(4)} ${String(size).padStart(8)} ${flag.padEnd(7)} ${p}`,
    );
    await sleep(700);
  }
}

fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'afe-public-api.json'),
  JSON.stringify(rows, null, 1),
);

const publicRows = rows.filter((r) => r.status === 200);
console.log(`\npublic: ${publicRows.length}/${rows.length}`);
for (const r of publicRows) console.log(`  ${r.method} ${r.path} (${r.size} B)`);
