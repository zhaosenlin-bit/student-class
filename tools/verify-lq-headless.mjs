#!/usr/bin/env node
/*
 * Second opinion for the courses that the debugger-driven check calls bad.
 *
 * A few of the mirrored courses ship an anti-debug guard: they notice that
 * a devtools protocol client is attached and stop drawing.  The course
 * itself is fine — a teacher opening it in a normal browser sees the whole
 * thing — so judging it by the debugger would throw away good courseware.
 * This tool looks at those courses with a plain headless browser, which is
 * attached to nothing, and reads the pixels of the screenshot it takes.
 *
 *   node tools/verify-lq-headless.mjs afe-180 afe-470
 *   node tools/verify-lq-headless.mjs --from recon/scratch/lq-verify.json
 *   node tools/verify-lq-headless.mjs --all          # every course
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { decodePNG, pictureStats } from './png.mjs';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(arg('lq', 4173));
const WAIT = Number(arg('wait', 15000));
const OUT = arg('out', '');
const SHOTS = path.join(ROOT, 'recon', 'scratch', 'headless-verify');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(ROOT, 'tools', 'chrome-recon', 'chrome.exe'),
];
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));

/* -------------------------------------------------------------- driver --- */

async function shoot(id) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const shot = path.join(SHOTS, `${id}.png`);
  const profile = path.join(os.tmpdir(), 'lq-headless-profile');
  const url = `http://localhost:${PORT}/courseware/${id}.html`;
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1280,900',
    `--virtual-time-budget=${WAIT}`,
    `--user-data-dir=${profile}`,
    `--screenshot=${shot}`,
    url,
  ];
  await execFileAsync(CHROME, chromeArgs, {
    timeout: WAIT * 4 + 30000,
    windowsHide: true,
  });
  const buf = fs.readFileSync(shot);
  const stats = pictureStats(decodePNG(buf));
  return { shot: path.relative(ROOT, shot), bytes: buf.length, ...stats };
}

let ids = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!ids.length) {
  const from = arg('from', '');
  if (from) {
    const report = JSON.parse(fs.readFileSync(path.resolve(ROOT, from), 'utf8'));
    ids = report.bad || (report.results || []).filter((r) => !r.ok).map((r) => r.id);
  } else if (args.includes('--all')) {
    const cat = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
    );
    ids = cat.products.filter((p) => p.localInstalled).map((p) => p.id);
  }
}
if (!ids.length) {
  console.error('no courses given');
  process.exit(1);
}
if (!CHROME) {
  console.error('no chrome found');
  process.exit(1);
}

const results = [];
for (const id of ids) {
  let stats = null;
  let error = '';
  try {
    stats = await shoot(id);
  } catch (e) {
    error = e.message.split('\n')[0];
  }
  const ok = !!stats && stats.colors > 3 && stats.offRatio > 0.02;
  results.push({ id, ok, stats, error });
  console.log(
    `${ok ? 'ok  ' : 'BAD '} ${id}  colors=${stats?.colors ?? '-'} off=${(
      (stats?.offRatio ?? 0) * 100
    ).toFixed(1)}%  ${stats?.width}x${stats?.height}  ${error}`
  );
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} ok`);
if (bad.length) console.log('bad:', bad.map((b) => b.id).join(' '));
if (OUT) {
  fs.writeFileSync(
    path.resolve(ROOT, OUT),
    JSON.stringify({ results, bad: bad.map((b) => b.id) }, null, 1)
  );
}
