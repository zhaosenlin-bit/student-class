#!/usr/bin/env node
/*
 * Ask the live sites about every course that is not on this machine yet.
 *
 * The library only lists what it holds.  The rest of the catalogue sits
 * behind a wall on the two platforms — but a wall is not always where
 * the catalogue says it is.  Some entries are marked free and can be
 * opened without an account; some are free but only after a download;
 * some need a purchase.  This asks every one of them, sorts the
 * answers, and writes down the ones that turned out to be free.
 *
 *   node tools/sweep-missing-free.mjs
 *   SAMPLE=40 node tools/sweep-missing-free.mjs
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const XB = 'https://xbjiaoyu.com';
const AFE = 'https://aifunengjiaoyu.com';

let token = '';
try {
  token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
} catch {}

const catalog = JSON.parse(
  fs.readFileSync('mirror/leqixiang/catalog.json', 'utf8')
);
const missing = catalog.products.filter((p) => !p.accessible);
const sample = Number(process.env.SAMPLE || 0);
const list = sample ? missing.slice(0, sample) : missing;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(id) {
  try {
    const r = await fetch(`${XB}/api/launch/${id}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Referer: `${XB}/`,
        Origin: XB,
        'X-Requested-With': 'studio',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const text = await r.text();
    return { status: r.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: 'ERR ' + e.message };
  }
}

async function premium(programId) {
  try {
    const r = await fetch(`${AFE}/api/premium/playback/launch`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Referer: `${AFE}/`,
        Origin: AFE,
        'Content-Type': 'application/json',
        'X-Premium-Catalogue-Intent': 'cataloguing',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ programId, useId: crypto.randomUUID() }),
    });
    const text = await r.text();
    return { status: r.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: 'ERR ' + e.message };
  }
}

/*
 * What the answers mean.
 *
 * "free"        the course opens for anybody — take it home.
 * "download"    it opens only after a download, which needs an account.
 * "account"     an account is needed before anything else is said.
 * "paid"        it is for sale.
 * "gone"        the platform no longer has it.
 */
function read(status, body) {
  if (status === 200) return 'free';
  if (status === 410) return 'download';
  if (status === 401) return 'account';
  if (status === 402 || status === 403) return 'paid';
  if (status === 404) return 'gone';
  if (status === 429) return 'slow';
  if (/premium_required|需要购买|付费/.test(body)) return 'paid';
  if (/login_required|请先登录/.test(body)) return 'account';
  if (/trial_exhausted/.test(body)) return 'trial';
  return `other-${status}`;
}

const out = [];
const tally = {};
let n = 0;
for (const p of list) {
  const r =
    p.source === 'xbjiaoyu'
      ? await launch(p.id)
      : await premium(Number(String(p.id).replace('afe-', '')));
  const kind = read(r.status, r.body);
  tally[kind] = (tally[kind] || 0) + 1;
  out.push({ id: p.id, title: p.title, source: p.source, status: r.status, kind, body: r.body });
  n += 1;
  if (n % 40 === 0) console.log(`[${n}/${list.length}] ${JSON.stringify(tally)}`);
  /* The platform does not like being asked quickly. */
  if (n % 25 === 0) await sleep(400);
}

fs.writeFileSync(
  'recon/scratch/missing-free-sweep.json',
  JSON.stringify({ at: new Date().toISOString(), tally, rows: out }, null, 1)
);

console.log(`\n查了 ${out.length} 门：`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}：${v}`);
}
const free = out.filter((r) => r.kind === 'free');
console.log(`\n白捡的：${free.length} 门`);
for (const f of free.slice(0, 40)) console.log(`  ${f.id} ${f.title}`);
