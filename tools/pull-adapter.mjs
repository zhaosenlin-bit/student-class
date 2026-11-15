#!/usr/bin/env node
/*
 * Fetch the adapter file the course runtime reads at start-up.
 *
 * The chapter courses boot through a small runtime that first asks for
 * adapter.json.  That file says which chapters exist, where their
 * scripts live and how navigation is wired, so without it the whole
 * bridge fails even though the pages themselves look fine.
 *
 *   node tools/pull-adapter.mjs 842 1016 841 1360
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const HEADERS = { 'User-Agent': UA, Referer: `${ORIGIN}/` };

const ids = process.argv.slice(2).map(Number).filter(Boolean);

/* The places the file may be handed out from. */
const bases = (id) => [
  `/api/program-assets/${id}/_course_runtime/`,
  `/api/program-assets/${id}/`,
  `/api/program-assets/${id}/assets/`,
];

for (const id of ids) {
  const outDir = path.join(CW, `afe-${id}.assets`, '_course_runtime');
  fs.mkdirSync(outDir, { recursive: true });
  const target = path.join(outDir, 'adapter.json');
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log(`${id}: 已有 adapter.json`);
    continue;
  }
  let done = false;
  for (const base of bases(id)) {
    if (done) break;
    for (const auth of [true, false]) {
      const url = ORIGIN + base + 'adapter.json';
      try {
        const res = await fetch(url, {
          headers: auth ? { ...HEADERS, Authorization: `Bearer ${TOKEN}` } : HEADERS,
        });
        if (!res.ok) {
          console.log(`  ${id} ${url.replace(ORIGIN, '')} -> ${res.status}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) continue;
        fs.writeFileSync(target, buf);
        console.log(`${id}: + adapter.json (${buf.length} bytes) via ${url.replace(ORIGIN, '')}`);
        done = true;
        break;
      } catch (e) {
        console.log(`  ${id} ${url.replace(ORIGIN, '')} -> ${e.message}`);
      }
    }
  }
  if (!done) console.log(`${id}: 取不到 adapter.json`);
}
