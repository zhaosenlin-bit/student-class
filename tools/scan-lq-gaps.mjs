#!/usr/bin/env node
/*
 * List every file a course asks for but does not have.
 *
 * The documents of a course name their pictures, sounds and scripts by
 * the platform's own address.  This walks the served copy, collects
 * every file reference, and compares it with what is on disk, so the
 * remaining work is a list and not a feeling.
 *
 *   node tools/scan-lq-gaps.mjs                 # every course
 *   node tools/scan-lq-gaps.mjs 842 1016        # only these
 *   node tools/scan-lq-gaps.mjs --json gaps.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const args = process.argv.slice(2);
const only = args.filter((a) => /^\d+$/.test(a)).map(Number);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const FILE_EXT =
  /\.(png|jpe?g|gif|svg|webp|avif|mp3|mp4|wav|ogg|m4a|glb|gltf|json|js|mjs|css|wasm|bin|woff2?|ttf|txt|xml|csv|pdf)$/i;

/* Every relative file name a document mentions. */
function refsOf(text) {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const ref = raw.split('?')[0].split('#')[0].trim();
    if (!ref) return;
    if (/^(https?:|data:|blob:|\/\/|javascript:|#)/i.test(ref)) return;
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1]);
  for (const m of text.matchAll(
    /["'`]([^"'`\s]+\.(?:png|jpe?g|gif|svg|webp|avif|mp3|mp4|wav|ogg|m4a|glb|gltf|json|js|mjs|css|wasm|bin|woff2?|ttf))["'`]/gi
  ))
    add(m[1]);
  return out;
}

/* The names a document may use for the same file. */
function candidates(ref, dirName) {
  const out = new Set();
  const marker = `/api/program-assets/${dirName}/`;
  let rel = ref;
  const at = ref.indexOf(marker);
  if (at >= 0) rel = ref.slice(at + marker.length);
  else if (rel.startsWith('./')) rel = rel.slice(2);
  else if (rel.startsWith('/')) rel = rel.slice(1);
  out.add(rel);
  out.add(rel.replace(/^assets\//, ''));
  out.add(path.posix.basename(rel));
  /* A document that sits in a chapter folder reaches its files through
     the folder above it. */
  const parts = rel.split('/');
  if (parts.length > 1) {
    out.add(parts.slice(1).join('/'));
    out.add(path.posix.basename(rel));
  }
  return [...out];
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const report = [];
const dirs = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.assets'))
  .filter((n) => !only.length || only.includes(Number(n.replace(/\.assets$/, '').replace(/^afe-/, ''))));

for (const name of dirs) {
  const dir = path.join(CW, name);
  const files = walk(dir);
  const have = new Set(files.map((p) => path.relative(dir, p).replace(/\\/g, '/')));
  /* A file that exists counts under every name it could be reached by. */
  const byBase = new Set(files.map((p) => path.basename(p)));

  const wanted = new Set();
  for (const p of files) {
    if (!/\.(html?|js|mjs|css)$/i.test(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const ref of refsOf(text)) {
      if (/^https?:/i.test(ref)) continue;
      wanted.add(ref);
    }
  }

  const missing = new Map();
  for (const ref of wanted) {
    const list = candidates(ref, name);
    const ok = list.some((c) => have.has(c)) || list.some((c) => byBase.has(path.posix.basename(c)));
    if (ok) continue;
    missing.set(list[0], list);
  }
  if (missing.size) {
    report.push({
      course: name.replace(/\.assets$/, ''),
      count: missing.size,
      files: [...missing.entries()].map(([key, list]) => ({ key, try: list })),
    });
  }
}

report.sort((a, b) => b.count - a.count);
let total = 0;
for (const r of report) {
  total += r.count;
  console.log(`${r.course}: 缺 ${r.count}`);
  for (const f of r.files.slice(0, Number(process.env.SHOW || 6))) console.log(`   - ${f.key}`);
}
console.log(`\n合计 ${report.length} 门课件缺 ${total} 个文件`);

if (jsonOut) {
  fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify(report, null, 2));
  console.log(`报告写入 ${jsonOut}`);
}
