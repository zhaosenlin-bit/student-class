#!/usr/bin/env node
/*
 * Ask the platform a handful of questions and print what it answers.
 *
 * Every answer is a small step of the mirroring work: which routes a
 * course opens, which of them the signed-in account may use, and what
 * the body of a course says about the files it needs.
 *
 *   node tools/probe-afe.mjs 849 850 1000
 *   node tools/probe-afe.mjs --all
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const tokenFile = process.argv.includes('--token')
  ? process.argv[process.argv.indexOf('--token') + 1]
  : 'afe-token.txt';
const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenFile), 'utf8').trim();
const HEADERS = {
  'User-Agent': UA,
  Authorization: `Bearer ${TOKEN}`,
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

const ids = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);

async function get(url, extra = {}) {
  try {
    const res = await fetch(url, { headers: { ...HEADERS, ...extra } });
    return res;
  } catch {
    return null;
  }
}

async function post(route, body) {
  try {
    const res = await fetch(ORIGIN + route, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* the answer was not json */
    }
    return { status: res.status, text, json };
  } catch (e) {
    return { status: 0, text: String(e), json: null };
  }
}

for (const id of ids) {
  console.log(`\n===== ${id} =====`);
  const page = await get(`${ORIGIN}/api/programs/${id}`);
  if (!page) {
    console.log('  page: no answer');
    continue;
  }
  const text = await page.text();
  const next = text.match(/window\.location\.replace\(["']([^"']+)["']\)/)?.[1];
  console.log(`  page: ${page.status} next=${next ? next.slice(0, 80) : 'none'}`);

  if (next) {
    const body = await get(ORIGIN + next);
    if (body) {
      const bt = await body.text();
      console.log(`  body: ${body.status} len=${bt.length}`);
      if (body.status !== 200) console.log(`        ${bt.slice(0, 160).replace(/\s+/g, ' ')}`);
    }
  }

  const open = await post(`/api/reviewed-course-session/${id}/open`, {});
  console.log(
    `  open: ${open.status} ${open.json?.id ? 'session=' + open.json.id : (open.text || '').slice(0, 160).replace(/\s+/g, ' ')}`
  );
  if (open.json?.id) {
    const sid = open.json.id;
    const res = await post(`/api/reviewed-course-session/session/${sid}/resume`, { programId: id });
    const entries = res.json?.descriptor?.entries || [];
    console.log(`  resume: ${res.status} entries=${entries.length}`);
    for (const entry of entries.slice(0, 20)) {
      const mounted = await post(`/api/reviewed-course-session/session/${sid}/mount`, { entry: entry.id });
      console.log(
        `    entry ${entry.id} ${entry.title || ''} locked=${entry.locked} mount=${mounted.status} ${
          mounted.json?.prefix ? mounted.json.prefix.slice(0, 90) : (mounted.text || '').slice(0, 90)
        }`
      );
    }
  }
}
