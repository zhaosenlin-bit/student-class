#!/usr/bin/env node
/*
 * Ask again the ones the platform was too busy to answer.
 *
 * The sweep reads a report the sweep wrote and asks only about the rows
 * that came back "too busy", one at a time and slowly enough to be
 * answered.  Then it writes the answers back into the report.
 *
 *   node tools/sweep-missing-retry.mjs
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const XB = 'https://xbjiaoyu.com';
const AFE = 'https://aifunengjiaoyu.com';
const FILE = 'recon/scratch/missing-free-sweep.json';

let token = '';
try {
  token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
} catch {}

const report = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const busy = report.rows.filter((r) => r.kind === 'slow');
console.log(`要重问 ${busy.length} 门。`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(row) {
  try {
    const r =
      row.source === 'xbjiaoyu'
        ? await fetch(`${XB}/api/launch/${row.id}`, {
            method: 'POST',
            headers: {
              'User-Agent': UA,
              Referer: `${XB}/`,
              Origin: XB,
              'X-Requested-With': 'studio',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          })
        : await fetch(`${AFE}/api/premium/playback/launch`, {
            method: 'POST',
            headers: {
              'User-Agent': UA,
              Referer: `${AFE}/`,
              Origin: AFE,
              'Content-Type': 'application/json',
              'X-Premium-Catalogue-Intent': 'cataloguing',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              programId: Number(String(row.id).replace('afe-', '')),
              useId: crypto.randomUUID(),
            }),
          });
    const text = await r.text();
    return { status: r.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: 'ERR ' + e.message };
  }
}

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

const tally = { ...report.tally };
let n = 0;
for (const row of busy) {
  const r = await ask(row);
  const kind = read(r.status, r.body);
  tally[row.kind] = (tally[row.kind] || 0) - 1;
  if (!tally[row.kind]) delete tally[row.kind];
  tally[kind] = (tally[kind] || 0) + 1;
  row.status = r.status;
  row.kind = kind;
  row.body = r.body;
  n += 1;
  if (n % 20 === 0) console.log(`[${n}/${busy.length}] ${JSON.stringify(tally)}`);
  await sleep(1400);
}

report.tally = tally;
report.rows.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(FILE, JSON.stringify(report, null, 1));

console.log(`\n问完了 ${busy.length} 门：`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}：${v}`);
}
const free = report.rows.filter((r) => r.kind === 'free');
console.log(`\n白捡的：${free.length} 门`);
for (const f of free) console.log(`  ${f.id} ${f.title}`);
