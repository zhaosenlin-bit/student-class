#!/usr/bin/env node
/*
 * The parts of a model that the scene does not carry.
 *
 * A three-dimensional model is two files: the scene that describes it
 * and the buffer of numbers it points at, plus the textures it wears.
 * The mirror holds the scenes, because those are the files the pages
 * name; the buffers and the textures were never asked for by name, so
 * nobody fetched them.  A model without its buffer draws nothing and
 * says so in the console.
 *
 * This tool finds the missing parts and takes them from the site they
 * came from.  It writes into the mirror of that site and into the copy
 * the library serves, so the preview and the download both hold them.
 *
 *   node tools/fetch-3jcn-model-parts.mjs           # fetch what is missing
 *   node tools/fetch-3jcn-model-parts.mjs --check   # only report
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const HOST = 'https://www.new3jcn.com';
const SOURCE = path.join(ROOT, 'mirror', '3jcn', 'shared', 'vendor');
const SERVED = path.join(
  ROOT,
  'mirror',
  'leqixiang',
  '_shared-ext',
  'vendor'
);

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
    else out.push(full);
  }
  return out;
};

const wanted = [];
for (const scene of walk(SOURCE).filter((f) => /\.gltf$/i.test(f))) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(scene, 'utf8'));
  } catch {
    continue;
  }
  const parts = [...(doc.buffers || []), ...(doc.images || [])];
  for (const part of parts) {
    const uri = part && part.uri;
    if (!uri || /^[a-z]+:\/\//i.test(uri)) continue;
    const sibling = path.join(path.dirname(scene), uri);
    if (fs.existsSync(sibling)) continue;
    wanted.push({
      file: sibling,
      url: HOST + '/' + path.relative(SOURCE, sibling).replace(/\\/g, '/'),
    });
  }
}

const seen = new Set();
const missing = wanted.filter((w) => {
  if (seen.has(w.file)) return false;
  seen.add(w.file);
  return true;
});

console.log(`模型缺件：${missing.length}`);
if (!missing.length) process.exit(0);

let taken = 0;
let missed = 0;
for (const item of missing) {
  if (CHECK) {
    console.log(`  缺 ${path.relative(SOURCE, item.file)}`);
    continue;
  }
  let res;
  try {
    res = await fetch(item.url);
  } catch (err) {
    console.log(`  取不到 ${item.url}：${err.message}`);
    missed++;
    continue;
  }
  if (!res.ok) {
    console.log(`  ${res.status} ${item.url}`);
    missed++;
    continue;
  }
  const data = Buffer.from(await res.arrayBuffer());
  if (!data.length) {
    missed++;
    continue;
  }
  for (const dir of [SOURCE, SERVED]) {
    const target = path.join(dir, path.relative(SOURCE, item.file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  }
  taken++;
  console.log(`  已取 ${path.relative(SOURCE, item.file)}（${data.length} 字节）`);
}

console.log(`取回 ${taken} 个，缺 ${missed} 个`);
if (missed) process.exitCode = 1;
