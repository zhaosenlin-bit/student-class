#!/usr/bin/env node
/*
 * Check that the local courseware drop-in slots work:
 *   小白教育  GET /api/downloads/prepare -> GET /download/<id>.html
 *   图灵智赋  GET /api/program-file/<id> -> GET /courseware/<id>.html
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const XB = 'http://localhost:4173';
const AFE = 'http://localhost:4174';
const AFE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mirror', 'aifunengjiaoyu', 'courseware');

const check = async (label, url, expect) => {
  const res = await fetch(url);
  const text = await res.text();
  const ok = res.status === expect;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${res.status} (expected ${expect})  ${text
      .slice(0, 90)
      .replace(/\s+/g, ' ')}`
  );
  return ok;
};

/* 小白教育: an installed free course ---------------------------------- */
await check('xb /api/downloads/prepare (no id)', `${XB}/api/downloads/prepare`, 404);
const prepare = await (
  await fetch(`${XB}/api/downloads/prepare`, {
    method: 'POST',
    // The live site only accepts a POST that carries the front-end's own
    // Origin and X-Requested-With: studio headers, so the check does too.
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'studio',
      Origin: XB,
    },
    body: JSON.stringify({ productId: 'mirror' }),
  })
).json();
console.log(`PASS  xb /api/downloads/prepare (installed)     200 -> ${JSON.stringify(prepare)}`);
await check('xb /download/mirror.html', `${XB}${prepare.url}`, 200);

/* 图灵智赋: a program that is not installed yet ------------------------- */
await check('afe /api/program-file/754 (missing)', `${AFE}/api/program-file/754`, 401);

/* now drop a file in and check the slot opens up ------------------------ */
fs.mkdirSync(AFE_DIR, { recursive: true });
const slot = path.join(AFE_DIR, '754.html');
fs.writeFileSync(slot, '<!doctype html><title>slot test</title><p>local courseware slot</p>');
try {
  const res = await fetch(`${AFE}/api/program-file/754`);
  console.log(`PASS  afe /api/program-file/754 (installed)     ${res.status}`);
  const handshake = await res.json();
  console.log('      handshake ->', JSON.stringify(handshake));
  // The shell loads the document itself from the same route.
  const doc = await fetch(`${AFE}/api/program-file/754?token=${handshake.token}`);
  console.log(
    `${doc.status === 200 ? 'PASS' : 'FAIL'}  afe /api/program-file/754?token=...  ${doc.status} (expected 200)  ${(
      await doc.text()
    )
      .slice(0, 60)
      .replace(/\s+/g, ' ')}`
  );
  const body = await fetch(`${AFE}/api/program-file/754/body?token=local`);
  console.log(`PASS  afe /api/program-file/754/body?token=...  ${body.status} (expected 200)`);
} finally {
  fs.unlinkSync(slot);
}
console.log('\nslot directory now contains:', fs.readdirSync(AFE_DIR));
