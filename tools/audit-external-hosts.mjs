#!/usr/bin/env node
/*
 * Inventory of the addresses the library points at.
 *
 * A course that runs on this disk must not walk the reader off to
 * somebody else's site, and it must not phone anybody's server while
 * it is running.  Every absolute address in a body is therefore worth
 * knowing about.  This tool lists them and says which ones the page
 * actually asks for.
 *
 *   node tools/audit-external-hosts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(html?|js|mjs|css|json)$/i.test(e.name)) out.push(full);
  }
  return out;
};

/* An address that is only written down inside a piece of data is a note. */
const ASKED = /(?:src|href|data-src|poster|action)\s*=\s*["']?[^"']*$/i;
const CALLED = /\b(?:fetch|importScripts|import|open|assign)\s*\(\s*["'`][^"'`]*$/i;

const files = [
  ...walk(path.join(ROOT, 'mirror', 'leqixiang', 'site')),
  ...walk(path.join(ROOT, 'mirror', 'leqixiang', 'courseware')),
];

const hosts = new Map();
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  /* A comment is a note about the licence, not a request. */
  const live = raw.replace(/<!--[\s\S]*?-->/g, ' ');
  for (const m of live.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const host = m[0].replace(/^https?:\/\//, '').toLowerCase();
    const before = live.slice(Math.max(0, m.index - 90), m.index);
    const asked = ASKED.test(before) || CALLED.test(before);
    const entry = hosts.get(host) || { asked: 0, noted: 0, files: new Set() };
    if (asked) entry.asked++;
    else entry.noted++;
    entry.files.add(path.relative(ROOT, file).replace(/\\/g, '/'));
    hosts.set(host, entry);
  }
}

const rows = [...hosts.entries()].sort(
  (a, b) => b[1].asked - a[1].asked || b[1].noted - a[1].noted
);

console.log(`审计文件：${files.length}`);
console.log(`外部域名：${rows.length}\n`);
for (const [host, e] of rows) {
  const mark = e.asked ? '请求' : '仅记录';
  console.log(
    `  ${mark}  ${host.padEnd(46)} 请求 ${String(e.asked).padStart(4)} · 记录 ${String(e.noted).padStart(5)} · 文件 ${e.files.size}`
  );
}

const askedHosts = rows.filter(([, e]) => e.asked);
console.log(`\n页面真的会去请求的域名：${askedHosts.length}`);
for (const [host, e] of askedHosts) {
  console.log(`  ${host}  ×${e.asked}`);
  for (const f of [...e.files].slice(0, 3)) console.log(`      ${f}`);
}

