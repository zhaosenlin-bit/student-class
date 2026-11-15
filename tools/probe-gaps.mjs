#!/usr/bin/env node
/*
 * Re-check, against the live sites, what the catalogue entries that are not
 * mirrored yet actually say.
 *   xbjiaoyu  POST /api/launch/<id>
 *   图灵智赋   POST /api/premium/playback/launch {programId, useId}
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const XB = 'https://xbjiaoyu.com';
const AFE = 'https://aifunengjiaoyu.com';
let token = '';
try { token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim(); } catch {}

const catalog = JSON.parse(fs.readFileSync('mirror/leqixiang/catalog.json', 'utf8'));
const missing = catalog.products.filter((p) => !p.accessible);
const xb = missing.filter((p) => p.source === 'xbjiaoyu');
const afe = missing.filter((p) => p.source === 'aifunengjiaoyu');
const sample = Number(process.env.SAMPLE || 12);

async function launch(id) {
  try {
    const r = await fetch(`${XB}/api/launch/${id}`, {
      method: 'POST',
      headers: { 'User-Agent': UA, Referer: `${XB}/`, Origin: XB, 'X-Requested-With': 'studio', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return { status: r.status, body: (await r.text()).slice(0, 160) };
  } catch (e) { return { status: 0, body: 'ERR ' + e.message }; }
}

async function premium(programId) {
  try {
    const r = await fetch(`${AFE}/api/premium/playback/launch`, {
      method: 'POST',
      headers: {
        'User-Agent': UA, Referer: `${AFE}/`, Origin: AFE,
        'Content-Type': 'application/json',
        'X-Premium-Catalogue-Intent': 'cataloguing',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ programId, useId: crypto.randomUUID() }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 160) };
  } catch (e) { return { status: 0, body: 'ERR ' + e.message }; }
}

const out = { xb: [], afe: [] };
for (const p of xb.slice(0, sample)) out.xb.push({ id: p.id, ...(await launch(p.id)) });
for (const p of afe.slice(0, sample)) {
  const num = Number(String(p.id).replace('afe-', ''));
  out.afe.push({ id: p.id, ...(await premium(num)) });
}
const tally = (arr) => arr.reduce((m, x) => ((m[x.status] = (m[x.status] || 0) + 1), m), {});
console.log('xb  sample', tally(out.xb));
console.log('afe sample', tally(out.afe));
for (const x of out.xb.slice(0, 2)) console.log('  xb ', x.id, x.status, x.body);
for (const x of out.afe.slice(0, 4)) console.log('  afe', x.id, x.status, x.body);
fs.writeFileSync('recon/scratch/gap-probe.json', JSON.stringify(out, null, 1));
