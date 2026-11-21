#!/usr/bin/env node
/*
 * Does a lesson reach out to somebody else's server while it runs?
 *
 * A lesson that pulls a script from somewhere else is a lesson that stops
 * working the moment the network is gone, and it tells the other side
 * who opened it.  The body of every course is checked for a script, an
 * iframe, an image or a stylesheet that points off this machine.
 *
 *   node tools/audit-lq-course-externals.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CW = path.join(ROOT, "mirror", "leqixiang", "courseware");

const LOCAL = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i;
const OWN = /aifunengjiaoyu|xbjiaoyu/i;

const ATTR =
  /\b(?:src|href|data-src|data-href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
const CSS_URL = /url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi;

const hits = new Map();
const files = fs
  .readdirSync(CW)
  .filter((f) => f.endsWith(".html"))
  .map((f) => path.join(CW, f));

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const found = new Set();
  for (const m of text.matchAll(ATTR)) found.add(m[1]);
  for (const m of text.matchAll(CSS_URL)) found.add(m[1]);
  for (const url of found) {
    if (LOCAL.test(url) || OWN.test(url)) continue;
    const host = new URL(url).host;
    if (!hits.has(host)) hits.set(host, new Set());
    hits.get(host).add(path.basename(file));
  }
}

if (!hits.size) {
  console.log(`没有一门课件在运行时去请求别家服务器（查了 ${files.length} 份正文）。`);
  process.exit(0);
}

console.log(`查了 ${files.length} 份正文，以下主机被请求过：\n`);
for (const [host, list] of [...hits].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`${host}  (${list.size} 门)`);
  for (const f of [...list].slice(0, 12)) console.log(`    ${f}`);
}
