#!/usr/bin/env node
/*
 * Takes the picture of every open simulation for the gallery.
 *
 * The simulations have no cover of their own, so the cover is what the
 * simulation actually looks like — a plain browser, pointed at the local
 * copy, and a screenshot of it.
 *
 *   node tools/shot-labsims-covers.mjs [--port 4173] [--only slug]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(arg('port', 4173));
const WAIT = Number(arg('wait', 18000));
const ONLY = arg('only', '');
const BRAND = path.join(ROOT, 'mirror', 'labsims', 'brand');

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(ROOT, 'tools', 'chrome-recon', 'chrome.exe'),
].find((p) => fs.existsSync(p));

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'labsims', 'catalog.json'), 'utf8')
);

fs.mkdirSync(BRAND, { recursive: true });

const profile = path.join(os.tmpdir(), 'lq-cover-profile');
let done = 0;
let failed = 0;

for (const lesson of catalog) {
  if (ONLY && lesson.slug !== ONLY) continue;
  const file = path.join(BRAND, `${lesson.slug}.png`);
  if (fs.existsSync(file) && fs.statSync(file).size > 2000 && !ONLY) {
    done++;
    continue;
  }
  const url = `http://localhost:${PORT}/courseware/labsims-${lesson.slug}.html`;
  try {
    await execFileAsync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--window-size=600,394',
        `--virtual-time-budget=${WAIT}`,
        `--user-data-dir=${profile}`,
        `--screenshot=${file}`,
        url,
      ],
      { timeout: WAIT * 4 + 30000, windowsHide: true }
    );
    const size = fs.statSync(file).size;
    console.log(`ok   ${lesson.slug}  ${(size / 1024).toFixed(0)} KB`);
    if (size < 2000) {
      failed++;
      fs.rmSync(file, { force: true });
    }
  } catch (e) {
    failed++;
    console.log(`BAD  ${lesson.slug}  ${e.message.split('\n')[0]}`);
  }
  done++;
}

console.log(`\ncovers: ${done - failed}/${done}`);
