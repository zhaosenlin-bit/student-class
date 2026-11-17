#!/usr/bin/env node
/*
 * The pages that are not pages.
 *
 * A few cached pages are what a firewall says when it turns a reader
 * away: "Request unsuccessful", with an incident number attached.
 * They carry nothing a lesson could use, and the number they carry
 * belongs to somebody else's system.  They go.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const EMPTY = [
  /Request unsuccessful/i,
  /Incapsula incident ID/i,
  /Access Denied/i,
  /Enable JavaScript and cookies to continue/i,
];

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.html')) out.push(f);
  }
  return out;
};

let dropped = 0;
for (const mirror of fs.readdirSync(path.join(ROOT, 'mirror'), { withFileTypes: true })) {
  if (!mirror.isDirectory() || mirror.name === 'leqixiang') continue;
  const folder = path.join(ROOT, 'mirror', mirror.name, 'courseware');
  if (!fs.existsSync(folder)) continue;
  for (const file of walk(folder)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!rel.includes('/_ext/')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const empty = text.trim().length < 40;
    if (!empty && !EMPTY.some((re) => re.test(text))) continue;
    console.log('  ' + rel);
    if (!CHECK) fs.rmSync(file, { force: true });
    dropped++;
  }
}
console.log((CHECK ? '（检查模式）' : '') + '空页面 ' + dropped + ' 份');
