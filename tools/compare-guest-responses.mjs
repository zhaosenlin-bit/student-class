#!/usr/bin/env node
/*
 * Compare the local guest responses with the live site's.
 *
 * The local server answers a signed-out visitor for a list of endpoints.
 * This walks that list, asks both the live site and the local copy, and
 * prints where the status codes disagree — so the front-end takes the same
 * branch online and offline.
 */
import fs from 'node:fs';

const LIVE = 'https://aifunengjiaoyu.com';
const LOCAL = 'http://localhost:4174';

const server = fs.readFileSync('server/server.mjs', 'utf8');
const block = server.slice(server.indexOf('const guest = {'));
const paths = [...new Set([...block.matchAll(/'(\/api\/[a-z0-9/_-]+)'\s*:/g)].map((m) => m[1]))];
console.log(`${paths.length} guest endpoints declared in server.mjs\n`);

const probe = async (base, path, method) => {
  // The live site rate-limits bursts; back off and try again so a 429 from
  // our own probing is not mistaken for a behavioural difference.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? '{}' : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(25000),
      });
      const text = await r.text();
      let ok = null;
      try {
        ok = JSON.parse(text).success;
      } catch {
        /* not json */
      }
      if (r.status !== 429 || attempt === 3) return { status: r.status, ok };
    } catch (e) {
      if (attempt === 3) return { status: -1, ok: null, error: e.message };
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  return { status: -1, ok: null };
};

let same = 0;
let diff = 0;

for (const path of paths) {
  for (const method of ['GET', 'POST']) {
    await new Promise((r) => setTimeout(r, 1200));
    const live = await probe(LIVE, path, method);
    const local = await probe(LOCAL, path, method);
    const match = live.status === local.status;
    if (match) same++;
    else diff++;
    const mark = match ? 'ok  ' : 'DIFF';
    console.log(
      `${mark} ${method.padEnd(4)} ${path.padEnd(38)} live=${live.status}` +
        ` local=${local.status}` +
        (match ? '' : `   live.ok=${live.ok} local.ok=${local.ok}`)
    );
  }
}

console.log(`\nmatching ${same}, different ${diff}`);
